import { Pressable, StyleSheet, Text, View } from 'react-native';
import AppIcon, { type AppIconName } from './AppIcon';
import { colors, iconSize, radius, spacing, touchTarget } from '../theme';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  leftIcon?: AppIconName;
  rightIcon?: AppIconName;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  hideLeftAction?: boolean;
  hideRightAction?: boolean;
};

export default function ScreenHeader({
  title,
  subtitle,
  leftIcon = 'menu-outline',
  rightIcon = 'notifications-outline',
  onLeftPress,
  onRightPress,
  hideLeftAction = false,
  hideRightAction = false,
}: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      {hideLeftAction ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mở menu"
          hitSlop={8}
          onPress={onLeftPress}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <AppIcon name={leftIcon} size={iconSize.nav} color={colors.primaryDark} containerSize={28} />
        </Pressable>
      )}

      <View style={styles.titleWrapper}>
        <Text selectable numberOfLines={1} ellipsizeMode="tail" style={styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text selectable numberOfLines={1} ellipsizeMode="tail" style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {hideRightAction ? <View style={styles.iconPlaceholder} /> : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thông báo"
          hitSlop={8}
          onPress={onRightPress}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <AppIcon name={rightIcon} size={iconSize.nav} color={colors.primaryDark} containerSize={28} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconButton: {
    width: touchTarget.min,
    height: touchTarget.min,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconPlaceholder: {
    width: touchTarget.min,
    height: touchTarget.min,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },
  titleWrapper: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
});
