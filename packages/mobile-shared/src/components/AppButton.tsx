import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, radius, spacing, touchTarget } from '../theme';

type AppButtonProps = {
  label: string;
  icon?: ReactNode;
  variant?: 'primary' | 'outline' | 'danger';
  style?: ViewStyle;
  accessibilityLabel?: string;
  onPress: () => void;
  disabled?: boolean;
};

export default function AppButton({
  label,
  icon,
  variant = 'primary',
  style,
  accessibilityLabel,
  onPress,
  disabled = false,
}: AppButtonProps) {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        style,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {icon}
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          !isPrimary && styles.outlineLabel,
          isDanger && styles.dangerLabel,
          disabled && styles.disabledLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: Math.max(54, touchTarget.min),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  label: {
    color: colors.surface,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '900',
  },
  outlineLabel: {
    color: colors.primaryDark,
  },
  dangerLabel: {
    color: colors.danger,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    backgroundColor: '#D0D5DD',
    borderColor: '#D0D5DD',
    opacity: 1,
  },
  disabledLabel: {
    color: '#667085',
  },
});
