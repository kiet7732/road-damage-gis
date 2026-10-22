import { StyleSheet, Text, View } from 'react-native';
import InfoCard from '../../../components/InfoCard';
import { colors, damageTypeTheme, radius, spacing, type DamageTypeCode } from '../../../constants/theme';
import type { ReportAiResult } from '../../../types/roadDamage';

type ConfirmAiPreviewCardProps = {
  predictedDamageType: DamageTypeCode | null;
  isPreviewing: boolean;
  previewError: string;
  previewResult: ReportAiResult | null;
  predictionLabel: string;
};

export default function ConfirmAiPreviewCard({
  predictedDamageType,
  isPreviewing,
  previewError,
  previewResult,
  predictionLabel,
}: ConfirmAiPreviewCardProps) {
  return (
    <InfoCard style={styles.compactInfoCard}>
      <View style={styles.aiHeader}>
        <View style={styles.sectionTitleWrap}>
          <Text selectable style={styles.aiTitle}>
            Kết quả nhận dạng
          </Text>
          <Text selectable style={styles.sectionSubtitle}>
            Gợi ý hư hỏng từ ảnh.
          </Text>
        </View>
        {predictedDamageType ? (
          <View
            style={[
              styles.damageTypeChip,
              {
                backgroundColor: damageTypeTheme[predictedDamageType].backgroundColor,
                borderColor: damageTypeTheme[predictedDamageType].color,
              },
            ]}
          >
            <Text
              selectable
              style={[
                styles.damageTypeChipText,
                { color: damageTypeTheme[predictedDamageType].color },
              ]}
            >
              {damageTypeTheme[predictedDamageType].label}
            </Text>
          </View>
        ) : null}
      </View>

      {isPreviewing ? (
        <Text selectable numberOfLines={2} style={styles.aiDescription}>
          Hệ thống đang phân tích ảnh để gợi ý loại hư hỏng...
        </Text>
      ) : null}

      {!isPreviewing && previewError ? (
        <Text selectable style={styles.aiError}>
          {previewError}
        </Text>
      ) : null}

      {!isPreviewing && !previewError && previewResult ? (
        <>
          <Text selectable style={[styles.aiPrimaryText, !previewResult.success && styles.aiPrimaryWarningText]}>
            {predictionLabel || 'Chưa xác định được loại hư hỏng.'}
          </Text>
          <Text selectable style={styles.aiDescription}>
            {previewResult.message}
          </Text>
        </>
      ) : null}
    </InfoCard>
  );
}

const styles = StyleSheet.create({
  compactInfoCard: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionTitleWrap: {
    flex: 1,
    gap: 1,
  },
  aiTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  damageTypeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  damageTypeChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  aiDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  aiError: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  aiPrimaryText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  aiPrimaryWarningText: {
    color: colors.danger,
  },
});
