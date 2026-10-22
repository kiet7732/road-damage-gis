import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../../shared/mobileShared';
import { engineerColors, engineerRadius } from '../../../styles/engineerTheme';
import type { LivePositionState } from '../utils/engineerCheckInUtils';

type CheckInActionsBarProps = {
  isRefreshingLocation: boolean;
  isSubmitting: boolean;
  isCheckInAllowed: boolean;
  livePosition: LivePositionState | null;
  checkinBlockedReason: string | null;
  onRefreshLocation: () => void;
  onCheckIn: () => void;
};

export default function CheckInActionsBar({
  isRefreshingLocation,
  isSubmitting,
  isCheckInAllowed,
  livePosition,
  checkinBlockedReason,
  onRefreshLocation,
  onCheckIn,
}: CheckInActionsBarProps) {
  return (
    <View style={styles.actions}>
      <Pressable
        onPress={onRefreshLocation}
        disabled={isRefreshingLocation || isSubmitting}
        style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
      >
        <AppIcon name="refresh-outline" size={18} color={engineerColors.brandAccent} containerSize={20} />
        <Text style={styles.refreshButtonText}>
          {isRefreshingLocation ? 'Đang đo lại GPS...' : 'QUÉT LẠI VỊ TRÍ GPS HIỆN TẠI'}
        </Text>
      </Pressable>

      <Pressable
        onPress={onCheckIn}
        disabled={isRefreshingLocation || isSubmitting}
        style={({ pressed }) => [
          styles.checkInButton,
          !isCheckInAllowed ? styles.btnDisabled : styles.btnValid,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.checkInButtonText}>
          {isSubmitting ? 'ĐANG GHI NHẬN CHECK-IN...' : 'XÁC THỰC CÓ MẶT TẠI HIỆN TRƯỜNG'}
        </Text>
      </Pressable>

      {!isCheckInAllowed ? (
        <Text style={styles.helperText}>
          {livePosition?.isMocked
            ? 'Cảnh báo: Định vị giả lập đang bật. Thao tác check-in bị khóa.'
            : livePosition?.warningText
              ? livePosition.warningText
              : checkinBlockedReason || 'Tác vụ check-in bị khóa.'}
        </Text>
      ) : (
        <Text style={styles.helperTextValid}>
          ✓ Đủ điều kiện xác thực (≤ 30m). Bấm nút trên để lưu toạ độ và chuyển sang phiếu khảo sát.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  refreshButtonText: {
    color: '#0F52BA',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  checkInButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: engineerRadius.sm,
  },
  btnValid: {
    backgroundColor: engineerColors.brandPrimary,
  },
  btnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.85,
  },
  checkInButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
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
});
