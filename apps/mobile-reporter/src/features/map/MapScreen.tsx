import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, damageTypeTheme, spacing } from '../../constants/theme';
import {
  fetchUnrepairedReportMapPoints,
  getReportHistoryErrorMessage,
  type ReportMapData,
} from '../../services/reportService';
import {
  ensureLocationReady,
  getCachedUserLocation,
  setCachedUserLocation,
} from '../../services/locationService';
import type { BottomTabParamList, RootStackParamList } from '../../types/navigation';
import type { Report } from '../../types/roadDamage';
import RoadDamageMapView from './components/RoadDamageMapView';
import type { MapRegion, RoadDamageMapHandle } from './components/RoadDamageMapView.types';
import {
  DEFAULT_REGION,
  USER_REGION_DELTA,
  SELECTED_REPORT_REGION_DELTA,
  VIEWPORT_FETCH_DEBOUNCE_MS,
  MAP_LOAD_TIMEOUT_MS,
  LOCATION_LOAD_TIMEOUT_MS,
  MAP_VIEWPORT_LIMIT,
  regionToBoundingBox,
  isSameRegion,
  type StatusFilterValue,
  type DamageTypeFilterValue,
} from './constants/mapScreenConstants';
import MapTopFilterPanel from './components/MapTopFilterPanel';
import MapSelectedReportCard from './components/MapSelectedReportCard';
import MapStatusOverlays from './components/MapStatusOverlays';

type MapScreenProps = CompositeScreenProps<
  BottomTabScreenProps<BottomTabParamList, 'Map'>,
  NativeStackScreenProps<RootStackParamList>
>;

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
  const bottomOverlayOffset = Math.max(116, insets.bottom + 104);
  const overlayTop = spacing.lg + topPanelHeight + spacing.sm;

  const hasActiveFilters = selectedStatus !== 'all' || selectedDamageType !== 'all';
  const topDamageLabel = useMemo(() => {
    if (!mapData?.topDamageType) {
      return null;
    }

    return mapData.topDamageLabel || damageTypeTheme[mapData.topDamageType]?.label || mapData.topDamageType;
  }, [mapData]);

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
      let nextMapData = await withTimeout(
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

      if (reports.length === 0) {
        setMapData(null);
        setReports([]);
        setReportsError(error instanceof Error ? error.message : getReportHistoryErrorMessage(error));
      }
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

  const lastLocationLoadedAtRef = useRef<number>(0);

  const loadCurrentLocation = useCallback(
    async (force = false) => {
      const now = Date.now();
      if (!force && lastLocationLoadedAtRef.current > 0 && now - lastLocationLoadedAtRef.current < 60_000) {
        return;
      }

      setIsLoadingLocation(true);
      setLocationError('');

      try {
        const readiness = await ensureLocationReady({
          requestPermission: true,
          promptAlert: true,
        });

        if (!readiness.permissionGranted) {
          if (!isMountedRef.current) {
            return;
          }

          setLocationError('Ứng dụng cần quyền vị trí để hiển thị khu vực xung quanh bạn.');
          if (!isSameRegion(currentRegionRef.current, DEFAULT_REGION)) {
            currentRegionRef.current = DEFAULT_REGION;
            setCurrentRegion(DEFAULT_REGION);
          }
          return;
        }

        if (!readiness.servicesEnabled) {
          if (!isMountedRef.current) {
            return;
          }

          setLocationError('Thiết bị chưa bật định vị GPS. Vui lòng bật định vị rồi thử lại.');
          if (!isSameRegion(currentRegionRef.current, DEFAULT_REGION)) {
            currentRegionRef.current = DEFAULT_REGION;
            setCurrentRegion(DEFAULT_REGION);
          }
          return;
        }

        const lastKnownLocation = await Location.getLastKnownPositionAsync().catch(() => null);

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

          userLocationRef.current = quickUserLocation;
          setUserLocation(quickUserLocation);
          setCachedUserLocation(quickUserLocation);

          if (!isSameRegion(currentRegionRef.current, quickRegion)) {
            currentRegionRef.current = quickRegion;
            setCurrentRegion(quickRegion);
          }
        }

        const location = await withTimeout(
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
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

        userLocationRef.current = nextUserLocation;
        setUserLocation(nextUserLocation);
        setCachedUserLocation(nextUserLocation);
        lastLocationLoadedAtRef.current = Date.now();

        if (!isSameRegion(currentRegionRef.current, nextRegion)) {
          currentRegionRef.current = nextRegion;
          setCurrentRegion(nextRegion);
        }
      } catch {
        if (!isMountedRef.current) {
          return;
        }

        setLocationError('Không lấy được vị trí hiện tại. Hãy bật định vị rồi thử lại.');
        if (!isSameRegion(currentRegionRef.current, DEFAULT_REGION)) {
          currentRegionRef.current = DEFAULT_REGION;
          setCurrentRegion(DEFAULT_REGION);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoadingLocation(false);
        }
      }
    },
    [withTimeout],
  );

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

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
      void loadCurrentLocation(false);
    }, [loadCurrentLocation]),
  );

  const handleRegionChangeComplete = (region: MapRegion) => {
    if (isSameRegion(currentRegionRef.current, region)) {
      return;
    }

    currentRegionRef.current = region;
    setCurrentRegion(region);
  };

  const handleFocusCurrentLocation = () => {
    if (locationError || userLocationRef.current == null) {
      loadCurrentLocation(true);
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
      latitude: report.gps.latitude - SELECTED_REPORT_REGION_DELTA.latitudeDelta * 0.20,
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
          }}
        />

        <MapTopFilterPanel
          isLoadingReports={isLoadingReports}
          reportsCount={reports.length}
          matchedTotal={mapData?.matchedTotal}
          topDamageLabel={topDamageLabel}
          reportsError={reportsError}
          isFilterOpen={isFilterOpen}
          setIsFilterOpen={setIsFilterOpen}
          onClearSelectedReport={() => {
            if (selectedReport) {
              setSelectedReport(null);
            }
          }}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          selectedDamageType={selectedDamageType}
          setSelectedDamageType={setSelectedDamageType}
          onLayout={(event) => {
            const nextHeight = Math.ceil(event.nativeEvent.layout.height);
            setTopPanelHeight((currentHeight) => (currentHeight === nextHeight ? currentHeight : nextHeight));
          }}
        />

        {selectedReport ? (
          <MapSelectedReportCard
            selectedReport={selectedReport}
            onClose={() => setSelectedReport(null)}
            onOpenDetail={(reportId) =>
              navigation.navigate('ReportDetailScreen', { reportId })
            }
            bottomOffset={bottomOverlayOffset}
          />
        ) : null}

        <MapStatusOverlays
          overlayTop={overlayTop}
          bottomOverlayOffset={bottomOverlayOffset}
          isLoadingReports={isLoadingReports}
          reportsError={reportsError}
          onRetryReports={() => loadReportsForRegion(currentRegionRef.current)}
          matchedTotal={mapData?.matchedTotal}
          reportsCount={reports.length}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={() => {
            setSelectedStatus('all');
            setSelectedDamageType('all');
          }}
          locationError={locationError}
          isLoadingLocation={isLoadingLocation}
          hasSelectedReport={Boolean(selectedReport)}
          onFocusCurrentLocation={handleFocusCurrentLocation}
        />
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
});
