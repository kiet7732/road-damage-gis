import { StyleSheet, Text, View } from 'react-native';
import AppIcon from '../../../components/AppIcon';
import InfoCard from '../../../components/InfoCard';
import { colors, iconSize, radius, spacing, touchTarget } from '../../../constants/theme';
import type { Report } from '../../../types/roadDamage';
import { buildNearbyReportPreviewTitle, formatStatusLabel } from '../utils/confirmReportUtils';

type ConfirmNearbyReportsCardProps = {
  hasNearbyDuplicateWarning: boolean;
  nearbySummaryText: string;
  isCheckingNearbyReports: boolean;
  nearbyReportsError: string;
  nearbyReportsPreview: Report[];
};

export default function ConfirmNearbyReportsCard({
  hasNearbyDuplicateWarning,
  nearbySummaryText,
  isCheckingNearbyReports,
  nearbyReportsError,
  nearbyReportsPreview,
}: ConfirmNearbyReportsCardProps) {
  return (
    <InfoCard style={styles.compactInfoCard}>
      <View style={styles.sectionTitleWrap}>
        <Text selectable style={styles.aiTitle}>
          Kiểm tra phản ánh gần đó
        </Text>
      </View>

      <View
        style={[
          styles.nearbySummaryCard,
          hasNearbyDuplicateWarning ? styles.nearbySummaryWarning : styles.nearbySummaryNeutral,
        ]}
      >
        <AppIcon
          name={hasNearbyDuplicateWarning ? 'alert-circle-outline' : 'checkmark-circle-outline'}
          size={iconSize.inline}
          color={hasNearbyDuplicateWarning ? '#B45309' : colors.success}
          containerSize={24}
        />
        <Text
          selectable
          numberOfLines={2}
          style={[
            styles.nearbySummaryText,
            isCheckingNearbyReports && styles.aiDescription,
            nearbyReportsError && styles.aiError,
          ]}
        >
          {nearbySummaryText}
        </Text>
      </View>

      {!isCheckingNearbyReports && !nearbyReportsError && hasNearbyDuplicateWarning ? (
        <View style={styles.duplicateBox}>
          <View style={styles.duplicateList}>
            {nearbyReportsPreview.map((report) => (
              <View key={report.id} style={styles.duplicateItem}>
                <Text selectable numberOfLines={2} ellipsizeMode="tail" style={styles.duplicateItemTitle}>
                  {buildNearbyReportPreviewTitle(report)}
                </Text>
                <Text selectable numberOfLines={1} ellipsizeMode="tail" style={styles.duplicateItemMeta}>
                  {report.createdAt} • {formatStatusLabel(report.status)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </InfoCard>
  );
}

const styles = StyleSheet.create({
  compactInfoCard: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  sectionTitleWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  aiTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  aiDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  aiError: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  nearbySummaryCard: {
    minHeight: touchTarget.min,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  nearbySummaryNeutral: {
    backgroundColor: colors.surfaceMuted,
  },
  nearbySummaryWarning: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#F7C78B',
  },
  nearbySummaryText: {
    flex: 1,
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16,
  },
  duplicateBox: {
    gap: 6,
  },
  duplicateList: {
    gap: 6,
  },
  duplicateItem: {
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  duplicateItemTitle: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  duplicateItemMeta: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
});
