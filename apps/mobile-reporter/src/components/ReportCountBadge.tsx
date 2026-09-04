import { StyleSheet, Text, View } from 'react-native';
import AppIcon from './AppIcon';
import { colors, iconSize, radius, spacing } from '../constants/theme';

type ReportCountBadgeProps = {
  count: number;
};

export default function ReportCountBadge({ count }: ReportCountBadgeProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <AppIcon name="document-text-outline" size={iconSize.inline} color={colors.primary} containerSize={24} />
      </View>
      <View style={styles.copy}>
        <Text selectable numberOfLines={1} ellipsizeMode="tail" style={styles.label}>
          Số phản ánh đã gửi
        </Text>
        <Text selectable numberOfLines={1} style={styles.count}>
          {count}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  count: {
    marginTop: 2,
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
});
