import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFieldEngineerUiLabel } from '../../../../../packages/shared-constants/src/engineerLabels';
import type { EngineerRootStackParamList } from '../../types/navigation';
import { AppIcon, EmptyState, ensureLocationReady } from '../../shared/mobileShared';
import {
  checkInEngineerTask,
  fetchEngineerTaskDetail,
  getEngineerTaskActionBlockReason,
  type EngineerTask,
} from '../../services/engineerReportService';
import CheckInActionsBar from './components/CheckInActionsBar';
import CheckInCoordinateCompareCard from './components/CheckInCoordinateCompareCard';
import CheckInRadarCard from './components/CheckInRadarCard';
import {
  buildLivePositionState,
  DISTANCE_OK_METERS,
  MAX_GPS_ACCURACY_METERS,
  type LivePositionState,
} from './utils/engineerCheckInUtils';
import { engineerColors, engineerRadius, engineerSpacing } from '../../styles/engineerTheme';

type Props = NativeStackScreenProps<EngineerRootStackParamList, 'EngineerCheckIn'>;

export default function EngineerCheckInScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { reportId } = route.params;
  const [task, setTask] = useState<EngineerTask | null>(null);
  const [livePosition, setLivePosition] = useState<LivePositionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isMountedRef = useRef(true);
  const taskRef = useRef<EngineerTask | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refreshCurrentLocation = useCallback(
    async (taskSnapshot?: EngineerTask | null) => {
      const activeTask = taskSnapshot || taskRef.current;
      if (!activeTask) {
        return;
      }

      setIsRefreshingLocation(true);
      setError('');

      try {
        const readiness = await ensureLocationReady({ requestPermission: true, promptAlert: true });
        if (!readiness.permissionGranted) {
          throw new Error('Cần cấp quyền truy cập vị trí để xác thực hiện trường.');
        }
        if (!readiness.servicesEnabled) {
          throw new Error('Vui lòng bật định vị GPS của thiết bị để xác thực hiện trường.');
        }

        const lastKnown = await Location.getLastKnownPositionAsync().catch(() => null);
        if (lastKnown?.coords && isMountedRef.current) {
          setLivePosition(
            buildLivePositionState(lastKnown.coords, Boolean(lastKnown.mocked), activeTask.gps),
          );
        }

        const location = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
        ]);

        if (location?.coords && isMountedRef.current) {
          setLivePosition(
            buildLivePositionState(location.coords, Boolean(location.mocked), activeTask.gps),
          );
        }
      } catch (locationError) {
        if (!isMountedRef.current) return;
        setError(
          locationError instanceof Error
            ? locationError.message
            : 'Không lấy được vị trí hiện tại. Vui lòng thử lại.',
        );
      } finally {
        if (isMountedRef.current) {
          setIsRefreshingLocation(false);
        }
      }
    },
    [],
  );

  const loadTask = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else if (!taskRef.current) {
      setIsLoading(true);
    }
    setError('');
    try {
      const detail = await fetchEngineerTaskDetail(reportId);
      if (!isMountedRef.current) return;
      taskRef.current = detail;
      setTask(detail);
      void refreshCurrentLocation(detail);
    } catch (loadError) {
      if (!isMountedRef.current) return;
      setError(loadError instanceof Error ? loadError.message : getFieldEngineerUiLabel('checkinLoadError'));
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [reportId, refreshCurrentLocation]);

  const handleRefresh = useCallback(() => {
    void loadTask(true);
  }, [loadTask]);

  useFocusEffect(
    useCallback(() => {
      void loadTask();
    }, [loadTask]),
  );

  const handleCheckIn = async () => {
    const activeTask = task || taskRef.current;
    if (!activeTask || !livePosition || isSubmitting) {
      return;
    }

    if (livePosition.isMocked) {
      const msg =
        'Cảnh báo: Phát hiện thiết bị đang bật chế độ định vị giả lập (Mock Location). Vui lòng tắt các ứng dụng can thiệp GPS để tiếp tục tác nghiệp.';
      setError(msg);
      Alert.alert('Từ chối thao tác', msg);
      return;
    }

    if (livePosition.distanceMeters > DISTANCE_OK_METERS) {
      const msg = `Từ chối thao tác: Bạn đang cách điểm hư hỏng ${Math.round(
        livePosition.distanceMeters,
      )}m (vượt quá bán kính cho phép 30m). Vui lòng di chuyển đến gần vị trí hư hỏng để tiếp tục.`;
      setError(msg);
      Alert.alert('Từ chối thao tác', msg);
      return;
    }

    if (livePosition.accuracy > MAX_GPS_ACCURACY_METERS) {
      const msg = `Độ chính xác GPS hiện tại là ±${Math.round(
        livePosition.accuracy,
      )}m, vượt ngưỡng cho phép ±${MAX_GPS_ACCURACY_METERS}m. Vui lòng đợi tín hiệu GPS ổn định hơn.`;
      setError(msg);
      Alert.alert('GPS chưa đủ chính xác', msg);
      return;
    }

    if (!activeTask.canCheckIn) {
      const reason = checkinBlockedReason || 'Tác vụ check-in bị khóa.';
      setError(reason);
      Alert.alert('Không thể check-in', reason);
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const updatedTask = await checkInEngineerTask(activeTask.id, {
        latitude: livePosition.latitude,
        longitude: livePosition.longitude,
        gpsAccuracy: livePosition.accuracy,
        source: livePosition.isMocked ? 'mock_gps' : 'gps_live',
        isMocked: livePosition.isMocked,
        distanceMeters: livePosition.distanceMeters,
      });
      setTask(updatedTask);
      navigation.replace('EngineerSurvey', { reportId: activeTask.id });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể gửi dữ liệu check-in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCheckInAllowed = Boolean(
    livePosition &&
    !livePosition.isMocked &&
    livePosition.quality === 'valid' &&
    task?.canCheckIn
  );
  const checkinBlockedReason = task ? getEngineerTaskActionBlockReason(task, 'check_in') : null;

  if (isLoading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color={engineerColors.brandAccent} size="large" />
        <Text style={styles.stateText}>Đang khởi động radar đo khoảng cách...</Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.centerState}>
        <EmptyState
          title="LỖI MỞ CHECK-IN"
          description={error || 'Không tìm thấy thông tin điểm hư hỏng.'}
        />
      </View>
    );
  }

  const radarColor =
    !livePosition
      ? engineerColors.brandAccent
      : livePosition.isMocked
        ? engineerColors.dangerRed
        : livePosition.quality === 'valid'
          ? engineerColors.radarGreen
          : engineerColors.dangerRed;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.screen,
        { paddingBottom: Math.max(40, insets.bottom + 24) },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[engineerColors.brandAccent]}
          tintColor={engineerColors.brandAccent}
        />
      }
    >
      {/* Mock Location Detected Alert Banner */}
      {livePosition?.isMocked ? (
        <View style={styles.mockLocationBanner}>
          <View style={styles.mockLocationHeader}>
            <AppIcon name="alert-circle" size={20} color={engineerColors.dangerRed} containerSize={22} />
            <Text style={styles.mockLocationTitle}>PHÁT HIỆN ĐỊNH VỊ GIẢ LẬP (MOCK LOCATION)</Text>
          </View>
          <Text style={styles.mockLocationText}>
            Cảnh báo: Phát hiện thiết bị đang bật chế độ định vị giả lập (Mock Location). Vui lòng tắt các ứng dụng can thiệp GPS để tiếp tục tác nghiệp.
          </Text>
        </View>
      ) : null}

      <CheckInRadarCard
        livePosition={livePosition}
        isRefreshingLocation={isRefreshingLocation}
        radarColor={radarColor}
      />

      <CheckInCoordinateCompareCard
        task={task}
        livePosition={livePosition}
        radarColor={radarColor}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <CheckInActionsBar
        isRefreshingLocation={isRefreshingLocation}
        isSubmitting={isSubmitting}
        isCheckInAllowed={isCheckInAllowed}
        livePosition={livePosition}
        checkinBlockedReason={checkinBlockedReason}
        onRefreshLocation={() => void refreshCurrentLocation()}
        onCheckIn={() => void handleCheckIn()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: engineerSpacing.lg,
    gap: engineerSpacing.md,
    backgroundColor: engineerColors.background,
    paddingBottom: 40,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: engineerColors.background,
    padding: 32,
  },
  stateText: {
    color: engineerColors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  mockLocationBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: engineerRadius.md,
    padding: engineerSpacing.md,
    gap: 6,
  },
  mockLocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mockLocationTitle: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  mockLocationText: {
    color: '#B91C1C',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  errorText: {
    color: engineerColors.dangerRed,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
