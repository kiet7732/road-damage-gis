import { StyleSheet, Text, View } from 'react-native';
import AppIcon from '../../../components/AppIcon';
import IconTitleRow from '../../../components/IconTitleRow';
import InfoCard from '../../../components/InfoCard';
import { colors, iconSize, radius, spacing, touchTarget } from '../../../constants/theme';
import { getLocationSourceLabel } from '../../../services/reportService';
import type { GpsLocation } from '../../../types/navigation';

type GpsLocationCardProps = {
  gps: GpsLocation;
  address: string;
};

export default function GpsLocationCard({ gps, address }: GpsLocationCardProps) {
  return (
    <InfoCard>
      <IconTitleRow icon="location-outline" title="Vị trí GPS ghi nhận" color={colors.danger} />
      <Text selectable style={styles.address}>
        {address}
      </Text>
      <View style={styles.gpsBox}>
        <View style={styles.inlineIconRow}>
          <AppIcon name="navigate-circle-outline" size={iconSize.inline} color={colors.primaryDark} containerSize={24} />
          <Text selectable numberOfLines={1} style={styles.gpsText}>
            {gps.latitude.toFixed(6)}, {gps.longitude.toFixed(6)}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Text selectable style={styles.gpsMetaPill}>
            Sai số ±{gps.accuracy}m
          </Text>
          <Text selectable style={styles.gpsMetaPill}>
            {getLocationSourceLabel(gps.source)}
          </Text>
        </View>
        <Text selectable style={styles.gpsMuted}>
          Ghi nhận lúc: {new Date(gps.capturedAt).toLocaleString('vi-VN')}
        </Text>
      </View>
    </InfoCard>
  );
}

const styles = StyleSheet.create({
  address: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  gpsBox: {
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    gap: spacing.xs,
  },
  inlineIconRow: {
    minHeight: touchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  gpsText: {
    flex: 1,
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gpsMetaPill: {
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  gpsMuted: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
