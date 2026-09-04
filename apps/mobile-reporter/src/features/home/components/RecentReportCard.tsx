import { Pressable, StyleSheet, Text, View } from 'react-native';
import AppIcon from '../../../components/AppIcon';
import StatusBadge from '../../../components/StatusBadge';
import { colors, damageTypeTheme, iconSize, radius, spacing } from '../../../constants/theme';
import { getDamageTypeDisplayLabel } from '../../../services/reportService';
import type { Report } from '../../../types/roadDamage';

type RecentReportCardProps = {
  report: Report;
  onPress: (reportId: string) => void;
};

export default function RecentReportCard({ report, onPress }: RecentReportCardProps) {
  const damageTheme = damageTypeTheme[report?.type ?? 'D40'] ?? damageTypeTheme.D40;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Xem chi tiết phản ánh ${report?.id ?? ''}`}
      onPress={() => onPress(report.id)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.thumbnail}>
        <View style={styles.sky} />
        <View style={styles.road}>
          <View style={styles.lane} />
          <View style={styles.crack} />
          <View style={[styles.damagePill, { backgroundColor: damageTheme.color }]}>
            <Text selectable numberOfLines={1} style={styles.damagePillText}>
              {getDamageTypeDisplayLabel(report?.type) ?? report?.type ?? 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text selectable numberOfLines={2} style={styles.title}>
            {report?.title ?? 'Chưa có tiêu đề'}
          </Text>
          <StatusBadge status={report?.status ?? 'new'} size="sm" />
        </View>

        <View style={styles.metaRow}>
          <AppIcon name="location-outline" size={iconSize.sm} color={colors.textMuted} containerSize={18} />
          <Text selectable numberOfLines={1} style={styles.metaText}>
            {report?.address ?? 'N/A'}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <AppIcon name="calendar-outline" size={iconSize.sm} color={colors.textMuted} containerSize={18} />
          <Text selectable numberOfLines={1} style={styles.metaText}>
            {report?.createdAt ?? 'N/A'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  thumbnail: {
    width: 92,
    minHeight: 92,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.roadSurface,
  },
  sky: {
    height: 28,
    backgroundColor: colors.roadSky,
  },
  road: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.roadSurface,
  },
  lane: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 46,
    width: 3,
    backgroundColor: colors.roadLane,
    transform: [{ rotate: '8deg' }],
  },
  crack: {
    width: 66,
    height: 4,
    marginLeft: 12,
    borderRadius: radius.full,
    backgroundColor: colors.roadCrack,
    transform: [{ rotate: '-8deg' }],
  },
  damagePill: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    maxWidth: 70,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  damagePillText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: '900',
  },
  content: {
    flex: 1,
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
});
