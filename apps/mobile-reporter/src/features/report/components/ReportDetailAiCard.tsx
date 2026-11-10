import { StyleSheet, Text, View } from 'react-native';
import { computePriorityAssessment } from '../../../../../../packages/shared-constants/src/fieldDomainMetadata';
import InfoCard from '../../../components/InfoCard';
import { colors, damageTypeTheme, radius, spacing } from '../../../constants/theme';
import { getDamageTypeDisplayLabel } from '../../../services/reportService';
import type { DamageDetection, ReportDetail } from '../../../types/roadDamage';

type ReportDetailAiCardProps = {
  aiStatus: string;
  aiResult: ReportDetail['aiResult'];
};

export default function ReportDetailAiCard({ aiStatus, aiResult }: ReportDetailAiCardProps) {
  const priorityAssessment = computePriorityAssessment(aiResult);
  const sortedDetections = [...(aiResult.detections || [])].sort(
    (a, b) => Number(b.confidence || 0) - Number(a.confidence || 0),
  );

  return (
    <InfoCard>
      <Text selectable style={styles.sectionTitle}>
        Kết quả nhận dạng & Đánh giá Mức độ ưu tiên (S_priority)
      </Text>
      <Text selectable style={styles.meta}>
        Trạng thái xử lý ảnh: {aiStatus}
      </Text>
      <Text selectable style={styles.meta}>
        Thông báo: {aiResult.message}
      </Text>
      {aiResult.processingTimeMs ? (
        <Text selectable style={styles.meta}>
          Thời gian xử lý: {aiResult.processingTimeMs}ms
        </Text>
      ) : null}

      {priorityAssessment.levelCode !== 'unrated' ? (
        <View
          style={[
            styles.priorityBanner,
            {
              backgroundColor: priorityAssessment.backgroundColor,
              borderColor: priorityAssessment.borderColor,
            },
          ]}
        >
          <View style={styles.priorityHeaderRow}>
            <Text selectable style={[styles.priorityLevelTitle, { color: priorityAssessment.color }]}>
              {priorityAssessment.levelLabel}
            </Text>
            <Text selectable style={[styles.priorityScoreBadge, { color: priorityAssessment.color }]}>
              S_priority = {priorityAssessment.scorePercent}%
            </Text>
          </View>
          <Text selectable style={styles.priorityFormulaText}>
            {priorityAssessment.formulaText}
          </Text>
          <Text selectable style={styles.priorityCitizenText}>
            {priorityAssessment.citizenSummary}
          </Text>
        </View>
      ) : null}

      {sortedDetections.length > 0 ? (
        <View style={styles.detectionList}>
          {sortedDetections.map((detection, index) => (
            <DetectionRow
              key={`${detection.damageType}-${index}`}
              detection={detection}
              index={index}
              isTopContributor={index < 2}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyDetectionBox}>
          <Text selectable style={styles.emptyDetectionText}>
            Hệ thống chưa phát hiện hư hỏng rõ ràng. Phản ánh này cần được kiểm tra thêm.
          </Text>
        </View>
      )}
    </InfoCard>
  );
}

function DetectionRow({
  detection,
  index,
  isTopContributor,
}: {
  detection: DamageDetection;
  index: number;
  isTopContributor: boolean;
}) {
  const damageTheme = damageTypeTheme[detection.damageType as keyof typeof damageTypeTheme];
  const label =
    getDamageTypeDisplayLabel(detection.damageType) ||
    detection.className ||
    damageTheme?.label ||
    detection.damageType;
  const confidencePercent = (detection.confidence * 100).toFixed(1);

  return (
    <View style={styles.detectionRow}>
      <View style={styles.detectionHeader}>
        <Text selectable style={styles.detectionTitle}>
          #{index + 1} {label}{' '}
          {isTopContributor ? '★ (Gộp vào S_priority)' : ''}
        </Text>
        <Text selectable style={styles.confidence}>
          {confidencePercent}%
        </Text>
      </View>
      <Text selectable style={styles.bbox}>
        BBox: x1 {Math.round(detection.bbox.x1)}, y1 {Math.round(detection.bbox.y1)}, x2 {Math.round(detection.bbox.x2)}, y2 {Math.round(detection.bbox.y2)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  priorityBanner: {
    marginTop: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
  },
  priorityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  priorityLevelTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  priorityScoreBadge: {
    fontSize: 13,
    fontWeight: '800',
  },
  priorityFormulaText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  priorityCitizenText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  detectionList: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  detectionRow: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  detectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  detectionTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 13.5,
    fontWeight: '700',
  },
  confidence: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  bbox: {
    color: colors.textMuted,
    fontSize: 11,
  },
  emptyDetectionBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  emptyDetectionText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});
