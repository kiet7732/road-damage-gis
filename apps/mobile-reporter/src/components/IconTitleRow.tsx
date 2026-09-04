import { StyleSheet, Text, View } from 'react-native';
import AppIcon, { type AppIconName } from './AppIcon';
import { colors, iconSize, spacing, touchTarget } from '../constants/theme';

type IconTitleRowProps = {
  icon: AppIconName;
  title: string;
  color?: string;
};

export default function IconTitleRow({ icon, title, color = colors.primaryDark }: IconTitleRowProps) {
  return (
    <View style={styles.row}>
      <AppIcon name={icon} size={iconSize.nav} color={color} containerSize={28} />
      <Text selectable numberOfLines={2} style={styles.title}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
});
