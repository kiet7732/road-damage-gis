import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AppIcon, { type AppIconName } from './AppIcon';
import { colors, iconSize, radius, spacing } from '../theme';

type EmptyStateProps = {
  icon?: AppIconName;
  title?: string;
  description?: string;
  action?: ReactNode;
};

export default function EmptyState({
  icon = 'file-tray-outline',
  title = 'Chưa có thông tin',
  description = 'Thông tin sẽ hiển thị tại đây sau khi hệ thống ghi nhận.',
  action,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <AppIcon name={icon} size={iconSize.xl} color="#98A2B3" containerSize={40} />
      </View>
      <Text selectable numberOfLines={2} style={styles.title}>
        {title}
      </Text>
      <Text selectable style={styles.description}>
        {description}
      </Text>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F4F7',
  },
  title: {
    marginTop: spacing.sm,
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  description: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.md,
    width: '100%',
  },
});
