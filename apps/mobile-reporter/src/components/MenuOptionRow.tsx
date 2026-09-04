import { Pressable, StyleSheet, Text, View } from 'react-native';
import AppIcon, { type AppIconName } from './AppIcon';
import { colors, iconSize, radius, spacing, touchTarget } from '../constants/theme';

type MenuOptionRowProps = {
  icon: AppIconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  badgeLabel?: string | null;
};

export default function MenuOptionRow({ icon, title, subtitle, onPress, badgeLabel }: MenuOptionRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View style={styles.iconWrapper}>
        <AppIcon name={icon} size={iconSize.md} color={colors.primaryDark} containerSize={24} />
      </View>
      <View style={styles.content}>
        <Text selectable numberOfLines={1} ellipsizeMode="tail" style={styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text selectable numberOfLines={1} ellipsizeMode="tail" style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {badgeLabel ? (
        <View style={styles.badge}>
          <Text selectable={false} style={styles.badgeText}>
            {badgeLabel}
          </Text>
        </View>
      ) : null}
      <AppIcon name="chevron-forward" size={iconSize.inline} color={colors.textMuted} containerSize={24} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: touchTarget.min + 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  badge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
  },
  badgeText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '900',
  },
});
