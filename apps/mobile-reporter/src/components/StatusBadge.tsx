import { StyleSheet, Text, View } from 'react-native';
import AppIcon, { type AppIconName } from './AppIcon';
import { iconSize, radius, reportStatusTheme, type ReportStatus } from '../constants/theme';

type StatusBadgeProps = {
  status: ReportStatus;
  size?: 'sm' | 'md';
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const statusStyle = reportStatusTheme[status] ?? reportStatusTheme.new;
  const isSmall = size === 'sm';
  const iconName = statusStyle.icon as AppIconName;

  return (
    <View
      style={[
        styles.badge,
        isSmall && styles.badgeSmall,
        {
          backgroundColor: statusStyle.backgroundColor,
          borderColor: statusStyle.borderColor,
        },
      ]}
    >
      <AppIcon
        name={iconName}
        size={isSmall ? iconSize.xs : iconSize.sm}
        color={statusStyle.color}
        containerSize={isSmall ? 18 : 20}
      />
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[
          styles.label,
          isSmall && styles.labelSmall,
          {
            color: statusStyle.color,
          },
        ]}
      >
        {statusStyle.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexShrink: 0,
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 11,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  badgeSmall: {
    flexShrink: 0,
    minHeight: 28,
    paddingHorizontal: 9,
    gap: 5,
  },
  label: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: '900',
  },
  labelSmall: {
    flexShrink: 0,
    fontSize: 11,
  },
});
