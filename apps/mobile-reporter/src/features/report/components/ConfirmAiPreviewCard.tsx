import { StyleSheet, Text, View } from 'react-native';
import { computePriorityAssessment } from '../../../../../../packages/shared-constants/src/fieldDomainMetadata';
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
  const priorityAssessment = previewResult ? computePriorityAssessment(previewResult) : null;

  return (
    <InfoCard style={styles.compactInfoCard}>
      <View style={styles.aiHeader}>
        <View style={styles.sectionTitleWrap}>
          <Text selectable style={styles.aiTitle}>
            Kết quả nhận dạng & Mức độ ưu tiên
          </Text>
          <Text selectable style={styles.sectionSubtitle}>
            Gợi ý hư hỏng và chỉ số ưu tiên S_priority từ ảnh.
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
          Hệ thống đang phân tích ảnh để gợi ý loại hư hỏng và tính mức độ ưu tiên...
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

          {priorityAssessment && priorityAssessment.levelCode !== 'unrated' ? (
            <View
              style={[
                styles.priorityBox,
                {
                  backgroundColor: priorityAssessment.backgroundColor,
                  borderColor: priorityAssessment.borderColor,
                },
              ]}
            >
              <View style={styles.priorityTopRow}>
                <Text selectable style={[styles.priorityTitle, { color: priorityAssessment.color }]}>
                  {priorityAssessment.levelLabel}
                </Text>
                <Text selectable style={[styles.priorityScore, { color: priorityAssessment.color }]}>
                  S_priority = {priorityAssessment.scorePercent}%
                </Text>
              </View>
              <Text selectable style={styles.priorityFormula}>
                {priorityAssessment.formulaText}
              </Text>
              <Text selectable style={styles.priorityCitizenSummary}>
                {priorityAssessment.citizenSummary}
              </Text>
            </View>
          ) : null}
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
  priorityBox: {
    marginTop: 6,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
  },
  priorityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  priorityTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  priorityScore: {
    fontSize: 13,
    fontWeight: '800',
  },
  priorityFormula: {
    color: colors.text,
    fontSize: 11.5,
    fontWeight: '700',
  },
  priorityCitizenSummary: {
    color: colors.textMuted,
    fontSize: 11.5,
    lineHeight: 17,
  },
});
