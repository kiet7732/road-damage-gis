import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  getFieldEngineerCheckinLabel,
  getFieldEngineerUiLabel,
} from '../../../../../packages/shared-constants/src/engineerLabels';
import type { EngineerRootStackParamList } from '../../types/navigation';
import { AppIcon, EmptyState } from '../../shared/mobileShared';
import {
  checkInEngineerTask,
  fetchEngineerTaskDetail,
  getEngineerTaskActionBlockReason,
  type EngineerTask,
} from '../../services/engineerReportService';
import { engineerColors, engineerRadius, engineerSpacing } from '../../styles/engineerTheme';

type Props = NativeStackScreenProps<EngineerRootStackParamList, 'EngineerCheckIn'>;

const MAX_GPS_ACCURACY_METERS = 80;
const DISTANCE_OK_METERS = 30;
const DISTANCE_WARNING_METERS = 100;

type LivePositionState = {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
  distanceMeters: number;
  quality: 'valid' | 'warning' | 'invalid';
  warningText: string | null;
};

export default function EngineerCheckInScreen({ route, navigation }: Props) {
  const { reportId } = route.params;
  const [task, setTask] = useState<EngineerTask | null>(null);
  const [livePosition, setLivePosition] = useState<LivePositionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadTask = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const detail = await fetchEngineerTaskDetail(reportId);
      setTask(detail);
      await refreshCurrentLocation(detail);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : getFieldEngineerUiLabel('checkinLoadError'));
    } finally {
      setIsLoading(false);
    }
  }, [reportId]);

  useFocusEffect(
    useCallback(() => {
      void loadTask();
    }, [loadTask]),
  );

  const refreshCurrentLocation = useCallback(
    async (taskSnapshot: EngineerTask | null = task) => {
      if (!taskSnapshot) {
        return;
      }

      setIsRefreshingLocation(true);
      setError('');

      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          throw new Error('Cần cấp quyền truy cập vị trí để xác thực hiện trường.');
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const accuracy = Math.round(location.coords.accuracy ?? 0);
        const distanceMeters = calculateDistanceMeters(
          location.coords.latitude,
          location.coords.longitude,
          taskSnapshot.gps.latitude,
          taskSnapshot.gps.longitude,
        );

        const quality = getCheckinQuality(distanceMeters, accuracy);
        setLivePosition({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy,
          capturedAt: new Date().toISOString(),
          distanceMeters,
          quality,
          warningText: getCheckinWarningText(distanceMeters, accuracy),
        });
      } catch (locationError) {
        setError(
          locationError instanceof Error
            ? locationError.message
            : 'Không lấy được vị trí hiện tại. Vui lòng thử lại.',
        );
      } finally {
        setIsRefreshingLocation(false);
      }
    },
    [task],
  );

  const handleCheckIn = async () => {
    if (!task || !livePosition || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const updatedTask = await checkInEngineerTask(task.id, {
        latitude: livePosition.latitude,
        longitude: livePosition.longitude,
        gpsAccuracy: livePosition.accuracy,
        source: 'gps_live',
      });
      setTask(updatedTask);
      navigation.replace('EngineerSurvey', { reportId: task.id });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể gửi dữ liệu check-in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCheckInAllowed = Boolean(livePosition && livePosition.quality !== 'invalid' && task?.canCheckIn);
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
      : livePosition.quality === 'valid'
        ? engineerColors.radarGreen
        : livePosition.quality === 'warning'
          ? engineerColors.safetyOrange
          : engineerColors.dangerRed;

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      {/* Rangefinder Radar Display */}
      <View style={styles.radarCard}>
        <View style={styles.radarTopRow}>
          <Text style={styles.radarTitle}>MÁY ĐO CỰ LY THỰC ĐỊA</Text>
          <View style={[styles.radarStatusPill, { borderColor: radarColor }]}>
            <View style={[styles.radarStatusDot, { backgroundColor: radarColor }]} />
            <Text style={[styles.radarStatusText, { color: radarColor }]}>
              {livePosition ? livePosition.quality.toUpperCase() : 'SEARCHING'}
            </Text>
          </View>
        </View>

        {/* Concentric Radar Rings */}
        <View style={styles.radarCircleContainer}>
          <View style={[styles.radarRingOuter, { borderColor: `${radarColor}33` }]}>
            <View style={[styles.radarRingMid, { borderColor: `${radarColor}66` }]}>
              <View style={[styles.radarRingInner, { backgroundColor: `${radarColor}15`, borderColor: radarColor }]}>
                {isRefreshingLocation ? (
                  <ActivityIndicator color={radarColor} size="small" />
                ) : (
                  <>
                    <Text style={[styles.radarDistNum, { color: radarColor }]}>
                      {livePosition ? Math.round(livePosition.distanceMeters) : '--'}
                    </Text>
                    <Text style={styles.radarDistUnit}>MÉT</Text>
                  </>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Distance Readout Hint */}
        <Text style={[styles.radarHint, { color: radarColor }]}>
          {!livePosition
            ? 'Đang khóa tín hiệu vệ tinh GPS...'
            : livePosition.quality === 'valid'
              ? '🎯 ĐÃ TRONG BÁN KÍNH HỢP LỆ (≤ 30M)'
              : livePosition.quality === 'warning'
                ? '⚠️ CỰ LY TỪ 30M - 100M (HÃY TIẾP CẬN GẦN HƠN)'
                : '⛔ NGOÀI BÁN KÍNH CHO PHÉP (> 100M)'}
        </Text>
      </View>

      {/* Target & Device Coordinates Dossier */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>ĐỐI CHIẾU TỌA ĐỘ HIỆN TRƯỜNG</Text>

        <View style={styles.coordCompareRow}>
          <View style={styles.coordBox}>
            <Text style={styles.coordBoxLabel}>📍 TÂM ĐIỂM HƯ HỎNG</Text>
            <Text style={styles.coordBoxValue}>
              {task.gps.latitude.toFixed(6)}, {task.gps.longitude.toFixed(6)}
            </Text>
            <Text style={styles.coordSub}>Sai số lúc chụp: ±{Math.round(task.gps.accuracy || 0)}m</Text>
          </View>

          <View style={styles.coordBox}>
            <Text style={styles.coordBoxLabel}>📱 VỊ TRÍ KỸ SƯ (GPS)</Text>
            <Text style={[styles.coordBoxValue, { color: radarColor }]}>
              {livePosition
                ? `${livePosition.latitude.toFixed(6)}, ${livePosition.longitude.toFixed(6)}`
                : 'Đang lấy...'}
            </Text>
            <Text style={styles.coordSub}>
              Độ chính xác: {livePosition ? `±${Math.round(livePosition.accuracy)}m` : 'N/A'}
            </Text>
          </View>
        </View>

        {livePosition?.warningText ? (
          <View
            style={[
              styles.noticeBox,
              livePosition.quality === 'warning' ? styles.noticeWarning : styles.noticeDanger,
            ]}
          >
            <Text style={styles.noticeTitle}>
              {livePosition.quality === 'warning' ? 'CẢNH BÁO CỰ LY' : 'VỊ TRÍ CHƯA HỢP LỆ'}
            </Text>
            <Text style={styles.noticeText}>{livePosition.warningText}</Text>
          </View>
        ) : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Tactile Action Buttons */}
      <View style={styles.actions}>
        <Pressable
          onPress={() => void refreshCurrentLocation()}
          disabled={isRefreshingLocation || isSubmitting}
          style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
        >
          <AppIcon name="refresh-outline" size={18} color={engineerColors.brandAccent} containerSize={20} />
          <Text style={styles.refreshButtonText}>
            {isRefreshingLocation ? 'Đang đo lại GPS...' : 'QUÉT LẠI VỊ TRÍ GPS HIỆN TẠI'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => void handleCheckIn()}
          disabled={!isCheckInAllowed || isRefreshingLocation || isSubmitting}
          style={({ pressed }) => [
            styles.checkInButton,
            !isCheckInAllowed && styles.btnDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.checkInButtonText}>
            {isSubmitting ? 'ĐANG GHI NHẬN CHECK-IN...' : 'XÁC THỰC CÓ MẶT TẠI HIỆN TRƯỜNG'}
          </Text>
        </Pressable>

        {!isCheckInAllowed ? (
          <Text style={styles.helperText}>
            {livePosition?.quality === 'invalid'
              ? livePosition.warningText || 'Khoảng cách quá xa để check-in.'
              : checkinBlockedReason || 'Tác vụ check-in bị khóa.'}
          </Text>
        ) : (
          <Text style={styles.helperTextValid}>
            ✓ Đủ điều kiện xác thực. Bấm nút trên để lưu toạ độ và chuyển sang phiếu khảo sát.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

function getCheckinQuality(distanceMeters: number, gpsAccuracy: number): 'valid' | 'warning' | 'invalid' {
  if (gpsAccuracy > MAX_GPS_ACCURACY_METERS || distanceMeters > DISTANCE_WARNING_METERS) {
    return 'invalid';
  }

  if (distanceMeters <= DISTANCE_OK_METERS) {
    return 'valid';
  }

  return 'warning';
}

function getCheckinWarningText(distanceMeters: number, gpsAccuracy: number): string | null {
  if (gpsAccuracy > MAX_GPS_ACCURACY_METERS) {
    return `Độ chính xác GPS hiện tại là ±${Math.round(gpsAccuracy)}m, vượt ngưỡng cho phép ±${MAX_GPS_ACCURACY_METERS}m.`;
  }

  if (distanceMeters > DISTANCE_WARNING_METERS) {
    return `Bạn đang cách điểm hư hỏng ${Math.round(distanceMeters)}m, vượt ngưỡng tối đa 100m.`;
  }

  if (distanceMeters > DISTANCE_OK_METERS) {
    return `Khoảng cách ${Math.round(distanceMeters)}m nằm trong vùng cảnh báo (30m - 100m). Bạn vẫn có thể check-in nếu có vật cản.`;
  }

  return null;
}

function calculateDistanceMeters(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
): number {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLatitude = toRadians(toLatitude - fromLatitude);
  const deltaLongitude = toRadians(toLongitude - fromLongitude);
  const fromLatitudeRadians = toRadians(fromLatitude);
  const toLatitudeRadians = toRadians(toLatitude);

  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(fromLatitudeRadians) * Math.cos(toLatitudeRadians) * Math.sin(deltaLongitude / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
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
  radarCard: {
    backgroundColor: engineerColors.headerBg,
    borderRadius: engineerRadius.lg,
    padding: engineerSpacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: engineerColors.headerBorder,
    gap: 12,
  },
  radarTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  radarTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  radarStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: engineerRadius.xs,
    backgroundColor: engineerColors.headerSurface,
    borderWidth: 1,
  },
  radarStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  radarStatusText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  radarCircleContainer: {
    marginVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarRingOuter: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarRingMid: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarRingInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarDistNum: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'monospace',
    lineHeight: 32,
  },
  radarDistUnit: {
    color: engineerColors.textOnDarkMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  radarHint: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: engineerRadius.md,
    padding: engineerSpacing.md,
    gap: 10,
    borderWidth: 1,
    borderColor: engineerColors.borderLight,
  },
  sectionTitle: {
    color: engineerColors.textNavy,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  coordCompareRow: {
    gap: 8,
  },
  coordBox: {
    padding: 8,
    borderRadius: engineerRadius.xs,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 2,
  },
  coordBoxLabel: {
    color: engineerColors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  coordBoxValue: {
    color: engineerColors.textNavy,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  coordSub: {
    color: engineerColors.textMuted,
    fontSize: 10,
  },
  noticeBox: {
    padding: 10,
    borderRadius: engineerRadius.xs,
    borderWidth: 1,
    gap: 2,
  },
  noticeWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  noticeDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  noticeTitle: {
    color: '#92400E',
    fontSize: 11,
    fontWeight: '900',
  },
  noticeText: {
    color: '#78350F',
    fontSize: 11,
    lineHeight: 15,
  },
  actions: {
    gap: 10,
  },
  refreshButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: engineerRadius.sm,
    backgroundColor: engineerColors.headerBg,
    borderWidth: 1,
    borderColor: engineerColors.headerBorder,
  },
  refreshButtonText: {
    color: engineerColors.brandAccent,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  checkInButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: engineerRadius.sm,
    backgroundColor: engineerColors.brandPrimary,
  },
  checkInButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  helperText: {
    color: engineerColors.dangerRed,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  helperTextValid: {
    color: engineerColors.radarGreen,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorText: {
    color: engineerColors.dangerRed,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
