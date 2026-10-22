import { StyleSheet, Text, View } from 'react-native';
import StatusBadge from '../../../components/StatusBadge';
import { colors, damageTypeTheme, radius, spacing } from '../../../constants/theme';
import { getDamageTypeDisplayLabel } from '../../../services/reportService';
import type { ReportDetail } from '../../../types/roadDamage';

type ReportDetailHeaderCardProps = {
  report: ReportDetail;
};

export default function ReportDetailHeaderCard({ report }: ReportDetailHeaderCardProps) {
  const finalDamageTheme = damageTypeTheme[report.type] ?? damageTypeTheme.D40;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text selectable style={styles.reportId}>
          {report.id}
        </Text>
        <StatusBadge status={report.status} />
      </View>
      <View
        style={[
          styles.damageTypeBadge,
          { backgroundColor: finalDamageTheme?.backgroundColor ?? colors.surfaceMuted },
        ]}
      >
        <Text
          selectable
          style={[styles.damageTypeBadgeText, { color: finalDamageTheme?.color ?? colors.primaryDark }]}
          testID="report-detail-type"
        >
          Kết quả cuối: {getDamageTypeDisplayLabel(report.type) ?? finalDamageTheme?.label ?? report.type}
        </Text>
      </View>
      <Text selectable style={styles.title} testID="report-detail-title">
        {report.title}
      </Text>
      <Text selectable style={styles.meta}>
        Gửi lúc: {report.createdAt}
      </Text>
      <Text selectable style={styles.meta}>
        Cập nhật lúc: {report.updatedAt}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  reportId: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  damageTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  damageTypeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});
