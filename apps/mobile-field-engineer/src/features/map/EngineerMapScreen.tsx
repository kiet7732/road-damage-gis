import { useFocusEffect, type CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFieldEngineerActionLabel, getFieldEngineerUiLabel, getFieldWorkflowStatus } from '../../../../../packages/shared-constants/src/engineerLabels';
import type { Report } from '../../../../../packages/mobile-shared/src/roadDamageTypes';
import type { EngineerBottomTabParamList, EngineerRootStackParamList } from '../../types/navigation';
import { AppButton, AppIcon, colors, radius, RoadDamageMapView, spacing, type MapRegion, type RoadDamageMapHandle, getCachedUserLocation, getOrLoadUserLocation, setCachedUserLocation } from '../../shared/mobileShared';
import { MapEmptyOverlay, MapFloatingHeader, MapSelectionCard } from './EngineerMapUi';
import { engineerColors, engineerSpacing } from '../../styles/engineerTheme';
import {
  buildEngineerFocusRegion,
  claimEngineerTask,
  fetchEngineerMapTasks,
  getEngineerTaskActionBlockReason,
  type EngineerTask,
} from '../../services/engineerReportService';

type Props = CompositeScreenProps<
  BottomTabScreenProps<EngineerBottomTabParamList, 'Map'>,
  NativeStackScreenProps<EngineerRootStackParamList>
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

const FIELD_STATE_ORDER = [
  'available_for_inspection',
  'inspection_claimed',
  'inspection_in_progress',
  'survey_completed',
] as const;

function calculateTasksBounds(taskList: EngineerTask[]): MapRegion | null {
  if (!taskList || taskList.length === 0) return null;
  let minLat = taskList[0].gps.latitude;
  let maxLat = taskList[0].gps.latitude;
  let minLng = taskList[0].gps.longitude;
  let maxLng = taskList[0].gps.longitude;
  for (const t of taskList) {
    if (t.gps.latitude < minLat) minLat = t.gps.latitude;
    if (t.gps.latitude > maxLat) maxLat = t.gps.latitude;
    if (t.gps.longitude < minLng) minLng = t.gps.longitude;
    if (t.gps.longitude > maxLng) maxLng = t.gps.longitude;
  }
  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;
  const latDelta = Math.max((maxLat - minLat) * 1.35, 0.04);
  const lngDelta = Math.max((maxLng - minLng) * 1.35, 0.04);
  return {
    latitude: midLat,
    longitude: midLng,
    latitudeDelta: Math.min(latDelta, 0.6),
    longitudeDelta: Math.min(lngDelta, 0.6),
  };
}

export default function EngineerMapScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const cachedLocation = getCachedUserLocation();
  const initialRegion: MapRegion = cachedLocation
    ? {
        latitude: cachedLocation.latitude,
        longitude: cachedLocation.longitude,
        ...USER_REGION_DELTA,
      }
    : DEFAULT_REGION;
  const mapRef = useRef<RoadDamageMapHandle | null>(null);
  const [region, setRegion] = useState<MapRegion>(initialRegion);
  const [tasks, setTasks] = useState<EngineerTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<EngineerTask | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(cachedLocation);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);
  const [error, setError] = useState('');

  const reports = useMemo<Report[]>(() => tasks.map((task) => task), [tasks]);

  const hasLoadedRef = useRef(false);

  const loadMapData = useCallback(async () => {
    // SWR: Only show blocking loader on first cold start
    if (!hasLoadedRef.current) {
      setIsLoading(true);
    }
    setError('');
    try {
      const nextTasks = await fetchEngineerMapTasks();
      hasLoadedRef.current = true;
      setTasks(nextTasks);
      setIsLoading(false);

      // Refresh user location in background without blocking map display
      void getOrLoadUserLocation().then((location) => {
        if (location) {
          setUserLocation(location);
          setCachedUserLocation(location);
        }
      });

      // Automatically focus on the cluster of tasks so all 53 tasks are visible
      if (nextTasks.length > 0) {
        const bounds = calculateTasksBounds(nextTasks);
        if (bounds) {
          setRegion(bounds);
          mapRef.current?.animateToRegion(bounds, 650);
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : getFieldEngineerUiLabel('mapLoadError'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFocusCurrentLocation = useCallback(async () => {
    let loc = userLocation;
    if (!loc) {
      loc = await getOrLoadUserLocation();
      if (loc) {
        setUserLocation(loc);
        setCachedUserLocation(loc);
      }
    }

    if (loc) {
      const focusRegion: MapRegion = {
        latitude: loc.latitude,
        longitude: loc.longitude,
        ...USER_REGION_DELTA,
      };
      setRegion(focusRegion);
      mapRef.current?.animateToRegion(focusRegion, 650);
    }
  }, [userLocation]);

  const handleMapPanDrag = useCallback(() => {
    if (isLegendExpanded) {
      setIsLegendExpanded(false);
    }
  }, [isLegendExpanded]);

  const handleSelectReport = useCallback((report: Report) => {
    const nextTask = tasks.find((item) => item.id === report.id) || null;
    setSelectedTask(nextTask);
    if (isLegendExpanded) {
      setIsLegendExpanded(false);
    }
    if (nextTask) {
      const focusRegion: MapRegion = {
        latitude: nextTask.gps.latitude - USER_REGION_DELTA.latitudeDelta * 0.20,
        longitude: nextTask.gps.longitude,
        ...USER_REGION_DELTA,
      };
      setRegion(focusRegion);
      mapRef.current?.animateToRegion(focusRegion, 450);
    }
  }, [tasks, isLegendExpanded]);

  useFocusEffect(
    useCallback(() => {
      void loadMapData();
    }, [loadMapData]),
  );

  const selectedMeta = selectedTask ? getFieldWorkflowStatus(selectedTask.fieldStatus) : null;
  const selectedMapState = selectedTask ? resolveTaskMapState(selectedTask) : null;
  const taskStateSummary = useMemo(() => {
    return tasks.reduce<Record<string, number>>((accumulator, task) => {
      const key = resolveTaskMapState(task);
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {});
  }, [tasks]);
  const legendItems = useMemo(() => {
    return FIELD_STATE_ORDER.flatMap((stateKey) => {
      const count = taskStateSummary[stateKey] || 0;
      if (count <= 0) {
        return [];
      }
      const stateMeta = getFieldWorkflowStatus(stateKey);
      return [{
        key: stateKey,
        label: stateMeta?.shortLabel || stateMeta?.label || stateKey,
        color: stateMeta?.color || colors.primaryDark,
        count,
      }];
    });
  }, [taskStateSummary]);
  const claimBlockedReason = selectedTask ? getEngineerTaskActionBlockReason(selectedTask, 'claim') : null;
  const checkinBlockedReason = selectedTask ? getEngineerTaskActionBlockReason(selectedTask, 'check_in') : null;

  const handleClaimTask = useCallback(async () => {
    if (!selectedTask?.canClaim || isClaiming) {
      return;
    }

    setIsClaiming(true);
    try {
      const updated = await claimEngineerTask(selectedTask.id);
      setTasks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedTask(updated);
      setError('');
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : getFieldEngineerUiLabel('taskActionClaimBlocked'));
    } finally {
      setIsClaiming(false);
    }
  }, [isClaiming, selectedTask]);

  const handleFocusTask = useCallback((task: EngineerTask) => {
    const focusRegion = buildEngineerFocusRegion(task);
    setRegion(focusRegion);
    mapRef.current?.animateToRegion(focusRegion, 320);
  }, []);

  const primaryAction = useMemo(() => {
    if (!selectedTask) {
      return null;
    }

    if (selectedTask.canClaim) {
      return {
        label: getFieldEngineerActionLabel('claim'),
        onPress: () => void handleClaimTask(),
        disabled: isClaiming,
        loading: isClaiming,
      };
    }

    if (selectedTask.canCheckIn) {
      return {
        label: getFieldEngineerActionLabel('check_in'),
        onPress: () => navigation.navigate('EngineerCheckIn', { reportId: selectedTask.id }),
      };
    }

    if (selectedMapState === 'inspection_in_progress') {
      return {
        label: getFieldEngineerUiLabel('mapActionOpenSurvey'),
        onPress: () => navigation.navigate('EngineerSurvey', { reportId: selectedTask.id }),
      };
    }

    if (selectedMapState === 'survey_completed') {
      return {
        label: getFieldEngineerUiLabel('mapActionOpenSurveyDetail'),
        onPress: () => navigation.navigate('EngineerTaskDetail', { reportId: selectedTask.id }),
      };
    }

    return {
      label: getFieldEngineerUiLabel('mapActionOpenDetail'),
      onPress: () => navigation.navigate('EngineerTaskDetail', { reportId: selectedTask.id }),
    };
  }, [handleClaimTask, isClaiming, navigation, selectedMapState, selectedTask]);

  const selectionFooter = useMemo(() => {
    if (selectedTask?.canClaim) {
      return getFieldEngineerUiLabel('taskActionClaimHint');
    }
    if (selectedTask && !selectedTask.canCheckIn && checkinBlockedReason) {
      return checkinBlockedReason;
    }
    return claimBlockedReason;
  }, [checkinBlockedReason, claimBlockedReason, selectedTask]);

  const selectedDistanceMeters = useMemo(() => {
    if (!userLocation || !selectedTask) {
      return null;
    }
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(selectedTask.gps.latitude - userLocation.latitude);
    const dLon = toRad(selectedTask.gps.longitude - userLocation.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(userLocation.latitude)) *
        Math.cos(toRad(selectedTask.gps.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }, [selectedTask, userLocation]);

  const selectionBottomOffset = Math.max(96, insets.bottom + 88);
  const locateFabBottom = selectedTask
    ? selectionBottomOffset + 246
    : Math.max(104, insets.bottom + 94);
  const fitAllFabBottom = selectedTask
    ? selectionBottomOffset + 306
    : Math.max(164, insets.bottom + 154);

  return (
    <View style={styles.container}>
      <RoadDamageMapView
        ref={mapRef}
        reports={reports}
        region={region}
        selectedReportId={selectedTask?.id ?? null}
        showsUserLocation
        userLocation={userLocation}
        onRegionChangeComplete={setRegion}
        onSelectReport={handleSelectReport}
        onMapPanDrag={handleMapPanDrag}
        getMarkerTone={(report) => getEngineerMarkerTone(report as EngineerTask)}
        getPopupStatusLabel={(report) => getTaskStateLabel(report as EngineerTask)}
        popupActionLabel={getFieldEngineerUiLabel('mapTaskOpen')}
      />

      {/* Floating Top Header */}
      <View style={[styles.topPanelWrap, { top: Math.max(insets.top, 10) }]}>
        <MapFloatingHeader
          title="Bản đồ tác nghiệp"
          subtitle={isLoading ? 'Đang tải dữ liệu hiện trường...' : `${tasks.length} điểm hư hỏng cần xử lý`}
          count={tasks.length}
          legendItems={legendItems}
          isLegendExpanded={isLegendExpanded}
          onToggleLegend={() => setIsLegendExpanded((prev) => !prev)}
        />
      </View>

      {/* Floating Fit All Tasks Button */}
      {tasks.length > 0 && (
        <Pressable
          accessibilityLabel="Xem tất cả nhiệm vụ"
          accessibilityRole="button"
          onPress={() => {
            const b = calculateTasksBounds(tasks);
            if (b) {
              setRegion(b);
              mapRef.current?.animateToRegion(b, 650);
            }
          }}
          style={({ pressed }) => [
            styles.floatingLocateButton,
            { bottom: fitAllFabBottom, backgroundColor: '#FFFFFF' },
            pressed && styles.pressed,
          ]}
        >
          <AppIcon
            name="layers"
            size={22}
            color={engineerColors.brandPrimary}
            containerSize={28}
          />
        </Pressable>
      )}

      {/* Floating Locate Button (FAB) */}
      <Pressable
        accessibilityLabel="Vị trí của tôi"
        accessibilityRole="button"
        onPress={() => void handleFocusCurrentLocation()}
        style={({ pressed }) => [
          styles.floatingLocateButton,
          { bottom: locateFabBottom },
          pressed && styles.pressed,
        ]}
      >
        <AppIcon
          name="locate"
          size={22}
          color="#FFFFFF"
          containerSize={28}
        />
      </Pressable>

      {isLoading ? (
        <View style={styles.centerOverlay} pointerEvents="none">
          <View style={styles.overlayCard}>
            <ActivityIndicator color={engineerColors.brandPrimary} />
            <Text style={styles.overlayText}>Đang tải bản đồ tác nghiệp...</Text>
          </View>
        </View>
      ) : null}

      {!isLoading && error ? (
        <View style={styles.centerOverlay}>
          <View style={styles.overlayCard}>
            <Text style={styles.overlayError}>{error}</Text>
            <AppButton label={getFieldEngineerUiLabel('commonRetry')} onPress={() => void loadMapData()} />
          </View>
        </View>
      ) : null}

      {!isLoading && !error && reports.length === 0 ? <MapEmptyOverlay /> : null}

      {selectedTask && primaryAction ? (
        <MapSelectionCard
          title={selectedTask.title}
          statusLabel={selectedMeta?.shortLabel || selectedTask.fieldStatusLabel}
          statusColor={selectedMeta?.color || colors.primaryDark}
          statusBackgroundColor={selectedMeta?.backgroundColor || '#EEF5FF'}
          statusBorderColor={selectedMeta?.borderColor || '#B8D5FF'}
          address={selectedTask.address || getFieldEngineerUiLabel('mapSelectionAddressFallback')}
          hint={buildTaskAvailabilityHint(selectedTask)}
          distanceMeters={selectedDistanceMeters}
          bottomOffset={selectionBottomOffset}
          onClose={() => setSelectedTask(null)}
          primaryAction={primaryAction}
          secondaryActions={[
            {
              key: 'detail',
              label: 'Xem hồ sơ',
              onPress: () => navigation.navigate('EngineerTaskDetail', { reportId: selectedTask.id }),
            },
            {
              key: 'focus',
              label: 'Định vị',
              onPress: () => handleFocusTask(selectedTask),
            },
          ]}
          footerMessage={selectionFooter}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#F8FAFC',
  },
  topPanelWrap: {
    position: 'absolute',
    left: engineerSpacing.md,
    right: engineerSpacing.md,
    zIndex: 20,
  },
  floatingLocateButton: {
    position: 'absolute',
    right: engineerSpacing.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: engineerColors.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
    zIndex: 25,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    zIndex: 25,
  },
  overlayCard: {
    gap: spacing.sm,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  overlayText: {
    color: '#0B132B',
    fontSize: 13,
    fontWeight: '700',
  },
  overlayError: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});

function resolveTaskMapState(task: EngineerTask): typeof FIELD_STATE_ORDER[number] {
  const fieldStatus = String(task.fieldStatus || '').trim().toLowerCase();

  if (fieldStatus === 'survey_completed' || task.surveyCompletedAt) {
    return 'survey_completed';
  }

  if (fieldStatus === 'inspection_in_progress' || task.checkedInAt || task.surveyStartedAt) {
    return 'inspection_in_progress';
  }

  if (fieldStatus === 'inspection_claimed' || task.claimedByEngineerName) {
    return 'inspection_claimed';
  }

  return 'available_for_inspection';
}

function getTaskStateLabel(task: EngineerTask): string {
  const key = resolveTaskMapState(task);
  const meta = getFieldWorkflowStatus(key);
  return meta?.label || task.fieldStatusLabel;
}

function getEngineerMarkerTone(task: EngineerTask) {
  const key = resolveTaskMapState(task);
  const meta = getFieldWorkflowStatus(key);

  return {
    borderColor: meta?.color || colors.primaryDark,
    accentColor: meta?.borderColor || colors.primary,
    selectedBorderColor: meta?.color || colors.primaryDark,
    selectedAccentColor: colors.warning,
  };
}

function buildTaskAvailabilityHint(task: EngineerTask): string {
  const taskState = resolveTaskMapState(task);

  if (task.canCheckIn) {
    return getFieldEngineerUiLabel('mapPrimaryHintCheckin');
  }

  if (taskState === 'inspection_in_progress') {
    return getFieldEngineerUiLabel('mapPrimaryHintSurvey');
  }

  if (taskState === 'survey_completed') {
    return getFieldEngineerUiLabel('mapPrimaryHintSurveyCompleted');
  }

  if (task.canClaim) {
    return getFieldEngineerUiLabel('mapPrimaryHintAvailable');
  }

  if (task.claimedByEngineerName) {
    return `${getFieldEngineerUiLabel('mapClaimOtherPrefix')} ${task.claimedByEngineerName} ${getFieldEngineerUiLabel('mapClaimOtherSuffix')}`;
  }

  if (task.assignedEngineerName) {
    return getFieldEngineerUiLabel('mapPrimaryHintAssigned');
  }

  return getFieldEngineerUiLabel('mapInternalFlow');
}
