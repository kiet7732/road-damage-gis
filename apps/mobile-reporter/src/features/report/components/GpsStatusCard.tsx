import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import AppIcon from '../../../components/AppIcon';
import { colors, spacing } from '../../../constants/theme';
import type { GpsLocation } from '../../../types/navigation';

type GpsStatusCardProps = {
  gps: GpsLocation;
  isRefreshing?: boolean;
};

export default function GpsStatusCard({ gps, isRefreshing = false }: GpsStatusCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.liveDotWrap}>
        {isRefreshing ? <ActivityIndicator size="small" color={colors.success} /> : <View style={styles.liveDot} />}
      </View>
      <View style={styles.textBlock}>
        <Text selectable numberOfLines={1} style={styles.value}>
          {gps.latitude.toFixed(6)}, {gps.longitude.toFixed(6)}
        </Text>
        <Text selectable style={styles.status}>
          {isRefreshing ? 'Đang cập nhật vị trí' : 'Đã định vị'}
        </Text>
      </View>
      <View style={styles.accuracyPill}>
        <AppIcon name="navigate" size={12} color={colors.success} containerSize={14} />
        <Text selectable style={styles.accuracy}>± {gps.accuracy} m</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: 'rgba(11, 20, 46, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  liveDotWrap: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.success,
    shadowColor: colors.success,
    shadowOpacity: 0.45,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  value: {
    color: colors.textOnDark,
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  status: {
    marginTop: 1,
    color: colors.textOnDarkMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  accuracyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: 'rgba(36, 200, 167, 0.12)',
  },
  accuracy: {
    color: colors.success,
    fontSize: 9,
    fontWeight: '800',
  },
});
