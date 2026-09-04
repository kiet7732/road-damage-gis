import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppButton from '../../components/AppButton';
import AppIcon from '../../components/AppIcon';
import { colors, damageTypeTheme, iconSize, radius, reportStatusTheme, spacing, touchTarget } from '../../constants/theme';
import {
  fetchUnrepairedReportMapPoints,
  getDamageTypeDisplayLabel,
  getReportHistoryErrorMessage,
  type ReportMapData,
} from '../../services/reportService';
import {
  getCachedUserLocation,
  setCachedUserLocation,
} from '../../services/locationService';
import type { BottomTabParamList, RootStackParamList } from '../../types/navigation';
import type { Report } from '../../types/roadDamage';
import RoadDamageMapView from './components/RoadDamageMapView';
import type { MapRegion, RoadDamageMapHandle } from './components/RoadDamageMapView.types';
import type { DamageTypeCode, ReportStatus } from '../../constants/theme';

type MapScreenProps = CompositeScreenProps<
  BottomTabScreenProps<BottomTabParamList, 'Map'>,
  NativeStackScreenProps<RootStackParamList>
>;

const DEFAULT_REGION: MapRegion = {
  latitude: 10.7769,
  longitude: 106.7009,
  latitudeDelta: 0.045,
  longitudeDelta: 0.045,
};

const USER_REGION_DELTA = {
  latitudeDelta: 0.009,
  longitudeDelta: 0.009,
};

const SELECTED_REPORT_REGION_DELTA = {
  latitudeDelta: 0.0065,
  longitudeDelta: 0.0065,
};

const VIEWPORT_FETCH_DEBOUNCE_MS = 280;
const MAP_LOAD_TIMEOUT_MS = 12000;
const LOCATION_LOAD_TIMEOUT_MS = 10000;
const MAP_VIEWPORT_LIMIT = 200;
const STATUS_FILTERS = ['all', 'pending', 'processing', 'repaired'] as const;
const DAMAGE_TYPE_FILTERS = ['all', 'D00', 'D10', 'D20', 'D40'] as const;

type StatusFilterValue = (typeof STATUS_FILTERS)[number];
type DamageTypeFilterValue = (typeof DAMAGE_TYPE_FILTERS)[number];

const regionToBoundingBox = (region: MapRegion) => ({
  minLatitude: region.latitude - region.latitudeDelta / 2,
  maxLatitude: region.latitude + region.latitudeDelta / 2,
  minLongitude: region.longitude - region.longitudeDelta / 2,
  maxLongitude: region.longitude + region.longitudeDelta / 2,
});

const REGION_EPSILON = 0.00005;
const DELTA_EPSILON = 0.0005;

const isSameRegion = (left: MapRegion, right: MapRegion): boolean =>
  Math.abs(left.latitude - right.latitude) < REGION_EPSILON &&
  Math.abs(left.longitude - right.longitude) < REGION_EPSILON &&
  Math.abs(left.latitudeDelta - right.latitudeDelta) < DELTA_EPSILON &&
  Math.abs(left.longitudeDelta - right.longitudeDelta) < DELTA_EPSILON;

export default function MapScreen({ navigation }: MapScreenProps) {
  const initialCachedLocation = getCachedUserLocation();
  const initialRegion = initialCachedLocation
    ? {
        latitude: initialCachedLocation.latitude,
        longitude: initialCachedLocation.longitude,
        ...USER_REGION_DELTA,
      }
    : DEFAULT_REGION;
  const insets = useSafeAreaInsets();
  const mapRef = useRef<RoadDamageMapHandle | null>(null);
  const isMountedRef = useRef(true);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestReportRequestIdRef = useRef(0);
  const mapDataCacheRef = useRef<Map<string, ReportMapData>>(new Map());
  const hasHandledInitialFocusRef = useRef(false);
  const userLocationRef = useRef<{ latitude: number; longitude: number } | null>(initialCachedLocation);
  const currentRegionRef = useRef<MapRegion>(initialRegion);
  const [currentRegion, setCurrentRegion] = useState<MapRegion>(initialRegion);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(initialCachedLocation);
  const [reports, setReports] = useState<Report[]>([]);
  const [mapData, setMapData] = useState<ReportMapData | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [locationError, setLocationError] = useState('');
  const [reportsError, setReportsError] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilterValue>('all');
  const [selectedDamageType, setSelectedDamageType] = useState<DamageTypeFilterValue>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [topPanelHeight, setTopPanelHeight] = useState(0);
  const bottomOverlayOffset = Math.max(spacing.xl, insets.bottom + 84);
  const overlayTop = spacing.lg + topPanelHeight + spacing.sm;

  const hasActiveFilters = selectedStatus !== 'all' || selectedDamageType !== 'all';
  const topDamageLabel = useMemo(() => {
    if (!mapData?.topDamageType) {
      return null;
    }

    return mapData.topDamageLabel || damageTypeTheme[mapData.topDamageType]?.label || mapData.topDamageType;
  }, [mapData]);

  const selectedReportStatusTheme = selectedReport
    ? reportStatusTheme[selectedReport.status as ReportStatus] ?? reportStatusTheme.pending
    : null;
  const selectedReportDamageTheme = selectedReport
    ? damageTypeTheme[selectedReport.type as DamageTypeCode] ?? damageTypeTheme.D40
    : null;
  const selectedReportConfidence = useMemo(() => {
    if (selectedReport == null || typeof selectedReport.confidence !== 'number' || !Number.isFinite(selectedReport.confidence)) {
      return null;
    }

    return Math.round(selectedReport.confidence * 100);
  }, [selectedReport]);

  const getViewportCacheKey = useCallback(
    (region: MapRegion) => [
      region.latitude.toFixed(4),
      region.longitude.toFixed(4),
      region.latitudeDelta.toFixed(4),
      region.longitudeDelta.toFixed(4),
      selectedStatus,
      selectedDamageType,
    ].join('|'),
    [selectedDamageType, selectedStatus],
  );

  const withTimeout = useCallback(
    async <T,>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> => {
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(timeoutMessage));
        }, timeoutMs);
      });

      try {
        return await Promise.race([promise, timeoutPromise]);
      } finally {
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
        }
      }
    },
    [],
  );

  const loadReportsForRegion = useCallback(async (region: MapRegion) => {
    const requestId = latestReportRequestIdRef.current + 1;
    latestReportRequestIdRef.current = requestId;
    const cacheKey = getViewportCacheKey(region);
    const cachedMapData = mapDataCacheRef.current.get(cacheKey);

    setIsLoadingReports(true);
    setReportsError('');

    if (cachedMapData) {
      setMapData(cachedMapData);
      setReports(cachedMapData.reports);
      setIsLoadingReports(false);
      return;
    }

    try {
      const nextMapData = await withTimeout(
        fetchUnrepairedReportMapPoints({
          ...regionToBoundingBox(region),
          limit: MAP_VIEWPORT_LIMIT,
          status: selectedStatus,
          damageType: selectedDamageType,
        }),
        MAP_LOAD_TIMEOUT_MS,
        'Tải dữ liệu bản đồ quá lâu. Hãy thử lại.',
      );

      if (!isMountedRef.current || latestReportRequestIdRef.current !== requestId) {
        return;
      }

      mapDataCacheRef.current.set(cacheKey, nextMapData);
      setMapData(nextMapData);
      setReports(nextMapData.reports);
    } catch (error) {
      if (!isMountedRef.current || latestReportRequestIdRef.current !== requestId) {
        return;
      }

      setMapData(null);
      setReports([]);
      setReportsError(error instanceof Error ? error.message : getReportHistoryErrorMessage(error));
    } finally {
      if (isMountedRef.current && latestReportRequestIdRef.current === requestId) {
        setIsLoadingReports(false);
      }
    }
  }, [getViewportCacheKey, selectedDamageType, selectedStatus, withTimeout]);

  useEffect(() => {
    if (selectedReport == null) {
      return;
    }

    const stillExists = reports.some((report) => report.id === selectedReport.id);
    if (!stillExists) {
      setSelectedReport(null);
    }
  }, [reports, selectedReport]);

  const loadCurrentLocation = useCallback(async () => {
    setIsLoadingLocation(true);
    setLocationError('');

    try {
      const lastKnownLocation = await Location.getLastKnownPositionAsync();

      if (lastKnownLocation && isMountedRef.current) {
        const quickRegion: MapRegion = {
          latitude: lastKnownLocation.coords.latitude,
          longitude: lastKnownLocation.coords.longitude,
          ...USER_REGION_DELTA,
        };
        const quickUserLocation = {
          latitude: lastKnownLocation.coords.latitude,
          longitude: lastKnownLocation.coords.longitude,
        };

        currentRegionRef.current = quickRegion;
        userLocationRef.current = quickUserLocation;
        setCurrentRegion(quickRegion);
        setUserLocation(quickUserLocation);
        setCachedUserLocation(quickUserLocation);
      }

      const permission = await withTimeout(
        Location.requestForegroundPermissionsAsync(),
        LOCATION_LOAD_TIMEOUT_MS,
        'Không lấy được quyền vị trí kịp thời. Hãy thử lại.',
      );

      if (!permission.granted) {
        if (!isMountedRef.current) {
          return;
        }

        setLocationError('Ứng dụng cần quyền vị trí để hiển thị khu vực xung quanh bạn.');
        currentRegionRef.current = DEFAULT_REGION;
        setCurrentRegion(DEFAULT_REGION);
        return;
      }

      const location = await withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        }),
        LOCATION_LOAD_TIMEOUT_MS,
        'Không lấy được vị trí hiện tại. Hãy thử lại.',
      );

      if (!isMountedRef.current) {
        return;
      }

      const nextRegion: MapRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        ...USER_REGION_DELTA,
      };
      const nextUserLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      currentRegionRef.current = nextRegion;
      userLocationRef.current = nextUserLocation;
      setCurrentRegion(nextRegion);
      setUserLocation(nextUserLocation);
      setCachedUserLocation(nextUserLocation);
    } catch {
      if (!isMountedRef.current) {
        return;
      }

      setLocationError('Không lấy được vị trí hiện tại. Hãy bật định vị rồi thử lại.');
      currentRegionRef.current = DEFAULT_REGION;
      setCurrentRegion(DEFAULT_REGION);
    } finally {
      if (isMountedRef.current) {
        setIsLoadingLocation(false);
      }
    }
  }, [withTimeout]);

  useEffect(() => {
    loadCurrentLocation();

    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [loadCurrentLocation]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      loadReportsForRegion(currentRegionRef.current);
    }, VIEWPORT_FETCH_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [currentRegion, loadReportsForRegion]);

  useFocusEffect(
    useCallback(() => {
      if (!hasHandledInitialFocusRef.current) {
        hasHandledInitialFocusRef.current = true;
        return;
      }

      loadReportsForRegion(currentRegionRef.current);
    }, [loadReportsForRegion]),
  );

  const handleRegionChangeComplete = (region: MapRegion) => {
    if (isSameRegion(currentRegionRef.current, region)) {
      return;
    }

    currentRegionRef.current = region;
    setCurrentRegion(region);
  };

  const handleFocusCurrentLocation = () => {
    if (locationError) {
      loadCurrentLocation();
      return;
    }

    if (userLocationRef.current == null) {
      loadCurrentLocation();
      return;
    }

    const focusRegion = {
      latitude: userLocationRef.current.latitude,
      longitude: userLocationRef.current.longitude,
      ...USER_REGION_DELTA,
    };

    currentRegionRef.current = focusRegion;
    setCurrentRegion(focusRegion);
    mapRef.current?.animateToRegion(focusRegion, 650);
  };

  const handleSelectReport = useCallback((report: Report) => {
    const focusRegion: MapRegion = {
      latitude: report.gps.latitude - SELECTED_REPORT_REGION_DELTA.latitudeDelta * 0.32,
      longitude: report.gps.longitude,
      ...SELECTED_REPORT_REGION_DELTA,
    };

    setSelectedReport(report);
    if (isFilterOpen) {
      setIsFilterOpen(false);
    }

    currentRegionRef.current = focusRegion;
    setCurrentRegion(focusRegion);
    mapRef.current?.animateToRegion(focusRegion, 450);
  }, [isFilterOpen]);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <RoadDamageMapView
          ref={mapRef}
          reports={reports}
          region={currentRegion}
          selectedReportId={selectedReport?.id ?? null}
          showsUserLocation={!locationError}
          userLocation={userLocation}
          onRegionChangeComplete={handleRegionChangeComplete}
          onSelectReport={handleSelectReport}
          onMapPanDrag={() => {
            if (isFilterOpen) {
              setIsFilterOpen(false);
            }
            if (selectedReport) {
              setSelectedReport(null);
            }
          }}
        />

        <View
          onLayout={(event) => {
            const nextHeight = Math.ceil(event.nativeEvent.layout.height);
            setTopPanelHeight((currentHeight) => (currentHeight === nextHeight ? currentHeight : nextHeight));
          }}
          style={styles.topPanel}
        >
          <View style={styles.topPanelHeader}>
            <View style={styles.topPanelTitleWrap}>
              <Text selectable style={styles.title}>
                Bản đồ hư hỏng
              </Text>
              <Text selectable numberOfLines={1} style={styles.subtitle}>
                {isLoadingReports ? 'Đang cập nhật dữ liệu bản đồ' : `${mapData?.matchedTotal ?? reports.length} vị trí trong vùng đang xem`}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isFilterOpen ? 'Thu gọn bộ lọc bản đồ' : 'Mở bộ lọc bản đồ'}
              accessibilityState={{ expanded: isFilterOpen }}
              onPress={() => {
                setIsFilterOpen((currentValue) => !currentValue);
                if (selectedReport) {
                  setSelectedReport(null);
                }
              }}
              style={({ pressed }) => [
                styles.filterToggleButton,
                isFilterOpen && styles.filterToggleButtonActive,
                pressed && styles.filterChipPressed,
              ]}
            >
              <AppIcon
                name={isFilterOpen ? 'close-outline' : 'options-outline'}
                size={18}
                color={isFilterOpen ? colors.surface : colors.primaryDark}
                containerSize={24}
              />
            </Pressable>
          </View>

          {isFilterOpen ? (
            <>
              {!isLoadingReports && !reportsError ? (
                <View style={styles.summaryRow}>
                  <View style={styles.summaryChip}>
                    <Text selectable style={styles.summaryLabel}>
                      Trong vùng xem
                    </Text>
                    <Text selectable style={styles.summaryValue}>
                      {mapData?.matchedTotal ?? reports.length}
                    </Text>
                  </View>
                  <View style={styles.summaryChip}>
                    <Text selectable style={styles.summaryLabel}>
                      Phổ biến
                    </Text>
                    <Text selectable numberOfLines={1} style={styles.summaryValue}>
                      {topDamageLabel ?? 'Chưa có'}
                    </Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.filterWrap}>
                <View style={styles.filterBlock}>
                  <Text selectable style={styles.filterTitle}>
                    Trạng thái
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterRow}
                  >
                    {STATUS_FILTERS.map((status) => {
                      const isActive = selectedStatus === status;
                      const label =
                        status === 'all'
                          ? 'Tất cả'
                          : reportStatusTheme[status as ReportStatus].label;

                      return (
                        <Pressable
                          key={status}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isActive }}
                          onPress={() => setSelectedStatus(status)}
                          style={({ pressed }) => [
                            styles.filterChip,
                            isActive && styles.filterChipActive,
                            pressed && styles.filterChipPressed,
                          ]}
                        >
                          <Text selectable={false} style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={styles.filterBlock}>
                  <Text selectable style={styles.filterTitle}>
                    Loại hư hỏng
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterRow}
                  >
                    {DAMAGE_TYPE_FILTERS.map((damageType) => {
                      const isActive = selectedDamageType === damageType;
                      const label = damageType === 'all' ? 'Tất cả' : (getDamageTypeDisplayLabel(damageType) ?? damageType);

                      return (
                        <Pressable
                          key={damageType}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isActive }}
                          onPress={() => setSelectedDamageType(damageType)}
                          style={({ pressed }) => [
                            styles.filterChip,
                            styles.filterChipCompact,
                            isActive && styles.filterChipActive,
                            pressed && styles.filterChipPressed,
                          ]}
                        >
                          {damageType !== 'all' ? (
                            <View
                              style={[
                                styles.filterDot,
                                { backgroundColor: damageTypeTheme[damageType as DamageTypeCode].color },
                              ]}
                            />
                          ) : null}
                          <Text selectable={false} style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>

            </>
          ) : null}
        </View>

        {isLoadingReports ? (
          <View style={[styles.loadingCard, { top: overlayTop }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text selectable numberOfLines={1} style={styles.loadingText}>
              Đang tải bản đồ...
            </Text>
          </View>
        ) : null}

        {!isLoadingReports && reportsError ? (
          <View style={[styles.stateCard, { top: overlayTop }]}>
            <View style={styles.compactErrorCard}>
              <View style={styles.compactErrorTextWrap}>
                <Text selectable numberOfLines={1} style={styles.compactErrorTitle}>
                  Không tải được bản đồ
                </Text>
                <Text selectable numberOfLines={2} style={styles.compactErrorDescription}>
                  {reportsError}
                </Text>
              </View>
              <AppButton
                label="Tải lại"
                accessibilityLabel="Tải lại dữ liệu bản đồ"
                onPress={() => loadReportsForRegion(currentRegionRef.current)}
                style={styles.compactRetryButton}
              />
            </View>
          </View>
        ) : null}

        {!isLoadingReports && !reportsError && (mapData?.matchedTotal ?? reports.length) === 0 ? (
          <View style={[styles.stateCard, styles.stateBannerWrap, { top: overlayTop }]}>
            <View style={styles.compactEmptyBanner}>
              <Text selectable numberOfLines={1} style={styles.compactEmptyBannerTitle}>
                Chưa có vị trí hư hỏng
              </Text>
              <Text selectable numberOfLines={2} style={styles.compactEmptyBannerDescription}>
                Trong khu vực này hiện chưa có điểm nào cần xử lý.
              </Text>
            </View>
          </View>
        ) : null}

        {!isLoadingReports && !reportsError && (mapData?.matchedTotal ?? reports.length) > 0 && reports.length === 0 ? (
          <View style={[styles.stateCard, styles.stateBannerWrap, { top: overlayTop }]}>
            <View style={styles.compactEmptyBanner}>
              <Text selectable numberOfLines={1} style={styles.compactEmptyBannerTitle}>
                Không có vị trí phù hợp
              </Text>
              <Text selectable numberOfLines={2} style={styles.compactEmptyBannerDescription}>
                Không có vị trí nào phù hợp với bộ lọc trong khu vực bạn đang xem.
              </Text>
              {hasActiveFilters ? (
                <AppButton
                  label="Xóa bộ lọc"
                  accessibilityLabel="Xóa bộ lọc bản đồ"
                  onPress={() => {
                    setSelectedStatus('all');
                    setSelectedDamageType('all');
                  }}
                  style={styles.compactRetryButton}
                />
              ) : null}
            </View>
          </View>
        ) : null}

        {selectedReport && selectedReportStatusTheme && selectedReportDamageTheme ? (
          <View style={[styles.selectedReportCardWrap, { bottom: insets.bottom + 84 }]}>
            <View style={styles.selectedReportCard}>
              <View style={styles.selectedReportHeader}>
                <Text selectable numberOfLines={1} style={styles.selectedReportPanelTitle}>
                  Thông tin vị trí hư hỏng
                </Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Đóng thông tin vị trí hư hỏng"
                  onPress={() => setSelectedReport(null)}
                  style={({ pressed }) => [styles.selectedReportCloseButton, pressed && styles.filterChipPressed]}
                >
                  <AppIcon name="close-outline" size={16} color={colors.textMuted} containerSize={20} />
                </Pressable>
              </View>

              <View style={styles.selectedReportBody}>
                {selectedReport.photoUri ? (
                  <Image
                    source={{ uri: selectedReport.photoUri }}
                    style={styles.selectedReportImage}
                    resizeMode="cover"
                  />
                ) : null}

                <View style={styles.selectedReportRow}>
                  <View
                    style={[
                      styles.selectedReportBadge,
                      { backgroundColor: selectedReportDamageTheme.backgroundColor, borderColor: selectedReportDamageTheme.color },
                    ]}
                  >
                    <Text selectable numberOfLines={1} style={[styles.selectedReportBadgeText, { color: selectedReportDamageTheme.color }]}>
                      {getDamageTypeDisplayLabel(selectedReport.type) ?? selectedReport.type}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.selectedReportStatusBadge,
                      {
                        backgroundColor: selectedReportStatusTheme.backgroundColor,
                        borderColor: selectedReportStatusTheme.borderColor,
                      },
                    ]}
                  >
                    <Text selectable numberOfLines={1} style={[styles.selectedReportStatusText, { color: selectedReportStatusTheme.color }]}>
                      {selectedReportStatusTheme.label}
                    </Text>
                  </View>
                </View>

                <Text selectable numberOfLines={2} style={styles.selectedReportTitle}>
                  {selectedReport.title}
                </Text>

                <Text selectable numberOfLines={1} style={styles.selectedReportMeta}>
                  {selectedReport.createdAt}
                  {selectedReportConfidence != null ? ` • ${selectedReportConfidence}%` : ''}
                </Text>

                {selectedReport.address ? (
                  <Text selectable numberOfLines={1} style={styles.selectedReportAddress}>
                    {selectedReport.address}
                  </Text>
                ) : null}
              </View>

              <View style={styles.selectedReportActions}>
                <AppButton
                  label="Chi tiết"
                  accessibilityLabel="Xem chi tiết phản ánh"
                  onPress={() => navigation.navigate('ReportDetailScreen', { reportId: selectedReport.id })}
                  style={styles.selectedReportPrimaryButton}
                />
              </View>
            </View>
          </View>
        ) : null}

        {locationError ? (
          <View style={[styles.locationErrorCard, { bottom: bottomOverlayOffset + 48 }]}>
            <AppIcon name="warning-outline" size={iconSize.inline} color={colors.danger} containerSize={24} />
            <Text selectable style={styles.locationErrorText}>
              {locationError}
            </Text>
          </View>
        ) : null}

        {!selectedReport ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đưa bản đồ về vị trí hiện tại"
            disabled={isLoadingLocation}
            hitSlop={10}
            style={({ pressed }) => [
              styles.fab,
              { bottom: bottomOverlayOffset },
              pressed && styles.fabPressed,
              isLoadingLocation && styles.fabDisabled,
            ]}
            onPress={handleFocusCurrentLocation}
          >
            {isLoadingLocation ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <AppIcon
                name={locationError ? 'refresh-outline' : 'locate'}
                size={iconSize.nav}
                color={colors.surface}
                containerSize={32}
              />
            )}
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  topPanel: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  topPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  topPanelTitleWrap: {
    flex: 1,
    gap: 1,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  filterToggleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterToggleButtonActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 2,
  },
  summaryChip: {
    flex: 1,
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    gap: 1,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  summaryValue: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
  },
  filterWrap: {
    gap: 4,
    marginTop: 2,
  },
  filterBlock: {
    gap: 4,
  },
  filterTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingRight: spacing.sm,
  },
  filterChip: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipCompact: {
    minWidth: 62,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  filterChipPressed: {
    opacity: 0.88,
  },
  filterChipText: {
    color: colors.text,
    fontSize: 9.5,
    fontWeight: '800',
  },
  filterChipTextActive: {
    color: colors.surface,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendWrap: {
    gap: 4,
    marginTop: 2,
  },
  legendTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  legendInlineGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  legendSectionLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    paddingTop: 4,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    flex: 1,
  },
  legendChip: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendRing: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  legendAccent: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  legendText: {
    color: colors.text,
    fontSize: 9,
    fontWeight: '800',
  },
  loadingCard: {
    position: 'absolute',
    left: spacing.lg,
    maxWidth: 172,
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingText: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  stateCard: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.xl * 2,
    maxWidth: 216,
  },
  stateBannerWrap: {
    maxWidth: 208,
  },
  compactErrorCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },
  compactErrorTextWrap: {
    gap: 2,
  },
  compactErrorTitle: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '900',
  },
  compactErrorDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  compactRetryButton: {
    minHeight: 38,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
  },
  compactEmptyBanner: {
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  compactEmptyBannerTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  compactEmptyBannerDescription: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
  },
  selectedReportCardWrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
  },
  selectedReportCard: {
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
  },
  selectedReportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  selectedReportPanelTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  selectedReportCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedReportBody: {
    gap: 6,
  },
  selectedReportImage: {
    width: '100%',
    height: 112,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  selectedReportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  selectedReportBadge: {
    minHeight: 24,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedReportBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  selectedReportStatusBadge: {
    minHeight: 24,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedReportStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  selectedReportTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 21,
  },
  selectedReportMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  selectedReportAddress: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  selectedReportActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  selectedReportPrimaryButton: {
    minHeight: 36,
    paddingHorizontal: spacing.lg,
  },
  locationErrorCard: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    minHeight: touchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  locationErrorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 5,
  },
  fabPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.96 }],
  },
  fabDisabled: {
    opacity: 0.72,
  },
});
