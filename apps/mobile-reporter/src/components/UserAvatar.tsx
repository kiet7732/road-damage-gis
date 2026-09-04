import { StyleSheet, Text, View } from 'react-native';
import AppIcon from './AppIcon';
import { colors, iconSize } from '../constants/theme';

type UserAvatarProps = {
  name: string;
  size?: number;
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export default function UserAvatar({ name, size = 72 }: UserAvatarProps) {
  const badgeSize = Math.max(24, Math.round(size * 0.34));

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text selectable={false} style={[styles.initials, { fontSize: Math.round(size * 0.3) }]}>
        {getInitials(name)}
      </Text>
      <View
        style={[
          styles.badge,
          {
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
          },
        ]}
      >
        <AppIcon name="checkmark" size={iconSize.sm} color={colors.surface} containerSize={badgeSize - 4} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
    borderWidth: 4,
    borderColor: colors.surface,
  },
  initials: {
    color: colors.surface,
    fontWeight: '900',
  },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
