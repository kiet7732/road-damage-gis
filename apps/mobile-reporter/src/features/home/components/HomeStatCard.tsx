import { StyleSheet, Text, View } from 'react-native';
import AppIcon, { type AppIconName } from '../../../components/AppIcon';
import { colors, iconSize, radius, spacing } from '../../../constants/theme';

type HomeStatCardProps = {
  label: string;
  value: number;
  icon: AppIconName;
  color: string;
  backgroundColor: string;
  borderColor: string;
};

export default function HomeStatCard({
  label,
  value,
  icon,
  color,
  backgroundColor,
  borderColor,
}: HomeStatCardProps) {
  return (
    <View style={[styles.card, { backgroundColor, borderColor }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
          <AppIcon name={icon} size={iconSize.md} color={color} containerSize={34} />
        </View>
        <View style={[styles.accent, { backgroundColor: color }]} />
      </View>

      <Text selectable numberOfLines={1} adjustsFontSizeToFit style={[styles.value, { color }]}>
        {value}
      </Text>
      <Text selectable numberOfLines={2} style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '46%',
    minHeight: 112,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accent: {
    width: 28,
    height: 4,
    borderRadius: radius.full,
  },
  value: {
    fontSize: 26,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  label: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
  },
});
