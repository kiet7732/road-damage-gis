import { StyleSheet, View } from 'react-native';
import AppButton from '../../../components/AppButton';
import AppIcon from '../../../components/AppIcon';
import { colors, iconSize, radius, spacing } from '../../../constants/theme';

type ConfirmReportFooterProps = {
  isSubmitting: boolean;
  uploadProgress: number;
  canSubmit: boolean;
  footerPaddingBottom: number;
  onLayoutFooterHeight: (height: number) => void;
  onCancel: () => void;
  onRetake: () => void;
  onSubmit: () => void;
};

export default function ConfirmReportFooter({
  isSubmitting,
  uploadProgress,
  canSubmit,
  footerPaddingBottom,
  onLayoutFooterHeight,
  onCancel,
  onRetake,
  onSubmit,
}: ConfirmReportFooterProps) {
  return (
    <View
      onLayout={(event) => {
        const nextHeight = Math.ceil(event.nativeEvent.layout.height);
        onLayoutFooterHeight(nextHeight);
      }}
      style={[styles.footer, { paddingBottom: footerPaddingBottom }]}
    >
      {isSubmitting ? (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.max(uploadProgress, 8)}%` }]} />
        </View>
      ) : null}
      <View style={styles.footerRow}>
        <AppButton
          label="Hủy"
          variant="outline"
          accessibilityLabel="Hủy phản ánh hiện tại"
          onPress={onCancel}
          disabled={isSubmitting}
          style={styles.secondaryAction}
        />
        <AppButton
          label="Chụp lại"
          variant="outline"
          accessibilityLabel="Quay lại camera để chụp lại"
          icon={<AppIcon name="camera" size={iconSize.inline} color={colors.primaryDark} containerSize={22} />}
          onPress={onRetake}
          disabled={isSubmitting}
          style={styles.secondaryAction}
        />
      </View>
      <AppButton
        label={isSubmitting ? `Đang gửi... ${uploadProgress}%` : 'Xác nhận gửi'}
        accessibilityLabel="Xác nhận gửi phản ánh"
        icon={
          <AppIcon name="send" size={iconSize.inline} color={canSubmit ? colors.surface : '#667085'} containerSize={22} />
        }
        onPress={onSubmit}
        disabled={!canSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: 4,
    paddingHorizontal: spacing.lg,
    paddingTop: 4,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  progressTrack: {
    height: 8,
    overflow: 'hidden',
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryAction: {
    flex: 1,
  },
});
