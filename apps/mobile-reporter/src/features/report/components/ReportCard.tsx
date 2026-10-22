import { Pressable, StyleSheet, Text, View } from 'react-native';
import AppIcon from '../../../components/AppIcon';
import StatusBadge from '../../../components/StatusBadge';
import { colors, damageTypeTheme, iconSize, radius, spacing } from '../../../constants/theme';
import { getDamageTypeDisplayLabel } from '../../../services/reportService';
import type { Report } from '../../../types/roadDamage';

export type ReportCardProps = {
  report: Report;
  onPress: (reportId: string) => void;
};

export default function ReportCard({ report, onPress }: ReportCardProps) {
  const damageLabel =
    getDamageTypeDisplayLabel(report.type) ??
    damageTypeTheme[report.type]?.label ??
    report.type;

  const isPending =
    report.isAddressPending ||
    !report.formattedAddress && !report.roadName;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Xem chi tiết phản ánh ${report.id}`}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(report.id)}
    >
      <View style={styles.header}>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={styles.title}
          testID={`report-card-title-${report.id}`}
        >
          {report.title}
        </Text>
        <StatusBadge status={report.status} />
      </View>

      <Text
        selectable
        style={styles.damageType}
        testID={`report-card-type-${report.id}`}
      >
        Hư hỏng: {damageLabel}
      </Text>

      {isPending ? (
        <View style={styles.pendingAddressContainer} testID={`report-card-pending-${report.id}`}>
          <AppIcon
            name="time-outline"
            size={iconSize.sm}
            color={colors.textMuted}
            containerSize={18}
          />
          <Text selectable numberOfLines={1} style={styles.pendingAddressText}>
            Đang xác định địa chỉ...
          </Text>
        </View>
      ) : (
        <View style={styles.addressContainer} testID={`report-card-address-${report.id}`}>
          <AppIcon
            name="location-outline"
            size={iconSize.sm}
            color={colors.primary}
            containerSize={18}
          />
          <Text
            selectable
            numberOfLines={1}
            ellipsizeMode="tail"
            style={styles.addressText}
          >
            {report.formattedAddress || report.address}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <AppIcon
          name="calendar-outline"
          size={iconSize.xs}
          color={colors.textMuted}
          containerSize={14}
        />
        <Text selectable style={styles.createdAt}>
          {report.createdAt}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 22,
  },
  damageType: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: 2,
  },
  addressText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  pendingAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  pendingAddressText: {
    color: colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  createdAt: {
    color: colors.textMuted,
    fontSize: 12,
  },
  adminBadgeRow: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  adminBadgeText: {
    color: '#1D4ED8',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
  },
});
