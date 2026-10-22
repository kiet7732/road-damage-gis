import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../../shared/mobileShared';
import { engineerColors, engineerRadius, engineerSpacing } from '../../../styles/engineerTheme';

type SurveyActionsBarProps = {
  error: string;
  isSaving: boolean;
  canSubmitFinalSurvey: boolean;
  attachmentCount: number;
  onSubmit: () => void;
  onSaveDraft: () => void;
  onNavigateToAttachments: () => void;
};

export default function SurveyActionsBar({
  error,
  isSaving,
  canSubmitFinalSurvey,
  attachmentCount,
  onSubmit,
  onSaveDraft,
  onNavigateToAttachments,
}: SurveyActionsBarProps) {
  return (
    <>
      {error ? (
        error.includes('Mock Location') ? (
          <View style={styles.mockLocationBanner}>
            <View style={styles.mockLocationHeader}>
              <AppIcon name="alert-circle" size={20} color={engineerColors.dangerRed} containerSize={22} />
              <Text style={styles.mockLocationTitle}>PHÁT HIỆN ĐỊNH VỊ GIẢ LẬP (MOCK LOCATION)</Text>
            </View>
            <Text style={styles.mockLocationText}>{error}</Text>
          </View>
        ) : (
          <Text style={styles.errorText}>{error}</Text>
        )
      ) : null}

      {/* Tactical Submission Actions */}
      <View style={styles.actions}>
        <Pressable
          onPress={onSubmit}
          disabled={isSaving || !canSubmitFinalSurvey}
          style={({ pressed }) => [
            styles.submitButton,
            (!canSubmitFinalSurvey || isSaving) && styles.btnDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.submitButtonText}>
            {isSaving ? 'ĐANG NỘP PHIẾU...' : 'GỬI PHIẾU KHẢO SÁT CHÍNH THỨC'}
          </Text>
        </Pressable>

        <View style={styles.secondaryActionRow}>
          <Pressable
            onPress={onSaveDraft}
            disabled={isSaving}
            style={({ pressed }) => [styles.draftButton, pressed && styles.pressed]}
          >
            <Text style={styles.draftButtonText}>
              {isSaving ? 'Đang lưu...' : '💾 Lưu bản nháp'}
            </Text>
          </Pressable>

          <Pressable
            onPress={onNavigateToAttachments}
            style={({ pressed }) => [styles.attachButton, pressed && styles.pressed]}
          >
            <AppIcon name="camera-outline" size={16} color={engineerColors.textNavy} containerSize={18} />
            <Text style={styles.attachButtonText}>Ảnh thực địa ({attachmentCount})</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 10,
  },
  submitButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: engineerRadius.sm,
    backgroundColor: engineerColors.brandPrimary,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  secondaryActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  draftButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: engineerRadius.xs,
    borderWidth: 1,
    borderColor: engineerColors.borderMedium,
    backgroundColor: '#F8FAFC',
  },
  draftButtonText: {
    color: engineerColors.textNavy,
    fontSize: 12,
    fontWeight: '800',
  },
  attachButton: {
    flex: 1,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: engineerRadius.xs,
    borderWidth: 1,
    borderColor: engineerColors.borderMedium,
    backgroundColor: '#F8FAFC',
  },
  attachButtonText: {
    color: engineerColors.textNavy,
    fontSize: 12,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  errorText: {
    color: engineerColors.dangerRed,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
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
});
