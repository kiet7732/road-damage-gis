import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton, AppIcon } from '../../../shared/mobileShared';
import { engineerColors, engineerRadius, engineerSpacing } from '../../../styles/engineerTheme';
import type { EngineerTask } from '../../../services/engineerReportService';

type TaskDetailActionsCardProps = {
  task: EngineerTask;
  isMutating: boolean;
  canOpenAttachments: boolean;
  onClaim: () => void;
  onCheckIn: () => void;
  onSurvey: () => void;
  onAttachments: () => void;
  onRelease: () => void;
};

export default function TaskDetailActionsCard({
  task,
  isMutating,
  canOpenAttachments,
  onClaim,
  onCheckIn,
  onSurvey,
  onAttachments,
  onRelease,
}: TaskDetailActionsCardProps) {
  return (
    <View style={styles.actionsCard}>
      <Text style={styles.sectionTitle}>THAO TÁC TÁC NGHIỆP</Text>

      {task.canClaim ? (
        <>
          <AppButton
            label={isMutating ? 'Đang tiếp nhận...' : 'TIẾP NHẬN ĐIỂM NÀY'}
            onPress={onClaim}
            disabled={isMutating}
          />
          <Text style={styles.actionHint}>Tiếp nhận kiểm tra và khóa quyền trong 60 phút.</Text>
        </>
      ) : null}

      {task.canCheckIn ? (
        <>
          <AppButton
            label="CHECK-IN HIỆN TRƯỜNG (RADAR)"
            onPress={onCheckIn}
          />
          <Text style={styles.actionHint}>Xác thực vị trí thực tế trong bán kính ≤ 30m.</Text>
        </>
      ) : null}

      <View style={styles.actionRow}>
        <Pressable
          onPress={onSurvey}
          style={({ pressed }) => [styles.actionButtonSecondary, pressed && styles.pressed]}
        >
          <AppIcon name="create-outline" size={18} color={engineerColors.textNavy} containerSize={20} />
          <Text style={styles.actionButtonSecondaryText}>Phiếu khảo sát</Text>
        </Pressable>

        <Pressable
          onPress={onAttachments}
          disabled={!canOpenAttachments}
          style={({ pressed }) => [
            styles.actionButtonSecondary,
            !canOpenAttachments && styles.btnDisabled,
            pressed && styles.pressed,
          ]}
        >
          <AppIcon name="camera-outline" size={18} color={engineerColors.textNavy} containerSize={20} />
          <Text style={styles.actionButtonSecondaryText}>Ảnh bổ sung ({task.attachments.length})</Text>
        </Pressable>
      </View>

      {task.canReleaseClaim ? (
        <Pressable
          onPress={onRelease}
          disabled={isMutating}
          style={({ pressed }) => [styles.releaseButton, pressed && styles.pressed]}
        >
          <Text style={styles.releaseButtonText}>
            {isMutating ? 'Đang hủy...' : 'HỦY TIẾP NHẬN (NHẢ QUYỀN)'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actionsCard: {
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
  actionHint: {
    color: engineerColors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: -4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonSecondary: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: engineerRadius.sm,
    borderWidth: 1,
    borderColor: engineerColors.borderMedium,
    backgroundColor: '#F8FAFC',
  },
  actionButtonSecondaryText: {
    color: engineerColors.textNavy,
    fontSize: 12,
    fontWeight: '800',
  },
  releaseButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: engineerRadius.sm,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  releaseButtonText: {
    color: engineerColors.dangerRed,
    fontSize: 12,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
});
