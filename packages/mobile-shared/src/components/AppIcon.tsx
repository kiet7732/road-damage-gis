import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';
import { colors, iconSize } from '../theme';

export type AppIconName = ComponentProps<typeof Ionicons>['name'];

type AppIconProps = {
  name: AppIconName;
  size?: number;
  color?: ColorValue;
  containerSize?: number;
  style?: StyleProp<ViewStyle>;
};

export default function AppIcon({
  name,
  size = iconSize.inline,
  color = colors.primaryDark,
  containerSize,
  style,
}: AppIconProps) {
  const boxSize = containerSize ?? Math.max(size + 8, 24);

  return (
    <View style={[styles.container, { width: boxSize, height: boxSize }, style]}>
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
