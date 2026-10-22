import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon, colors, radius, spacing, touchTarget } from '../shared/mobileShared';
import type { EngineerBottomTabParamList } from '../types/navigation';

type TabKey = keyof EngineerBottomTabParamList;

const TAB_CONFIG: Record<
  TabKey,
  {
    label: string;
    activeIcon: 'home' | 'location' | 'clipboard' | 'person';
    inactiveIcon: 'home-outline' | 'location-outline' | 'clipboard-outline' | 'person-outline';
  }
> = {
  Home: {
    label: 'Trang chủ',
    activeIcon: 'home',
    inactiveIcon: 'home-outline',
  },
  Map: {
    label: 'Bản đồ',
    activeIcon: 'location',
    inactiveIcon: 'location-outline',
  },
  Tasks: {
    label: 'Tác nghiệp',
    activeIcon: 'clipboard',
    inactiveIcon: 'clipboard-outline',
  },
  Profile: {
    label: 'Tài khoản',
    activeIcon: 'person',
    inactiveIcon: 'person-outline',
  },
};

export default function EngineerTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const androidBottomOffset = Platform.OS === 'android' ? (insets.bottom > 0 ? 2 : 8) : 0;
  const wrapperBottomPadding = Platform.OS === 'android' ? Math.max(insets.bottom, 6) : Math.max(insets.bottom, 8);

  return (
    <View
      style={[
        styles.wrapper,
        {
          bottom: androidBottomOffset,
          paddingBottom: wrapperBottomPadding,
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const tabKey = route.name as TabKey;
          const config = TAB_CONFIG[tabKey] ?? {
            label: route.name,
            activeIcon: 'home' as const,
            inactiveIcon: 'home-outline' as const,
          };
          const options = descriptors[route.key]?.options;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options?.tabBarAccessibilityLabel ?? config.label}
              onPress={onPress}
              style={({ pressed }) => [
                styles.item,
                isFocused && styles.activeItem,
                pressed && styles.pressed,
              ]}
            >
              <AppIcon
                name={isFocused ? config.activeIcon : config.inactiveIcon}
                size={22}
                color={isFocused ? colors.primary : colors.textMuted}
                containerSize={28}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  isFocused && styles.activeLabel,
                ]}
              >
                {config.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
  bar: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  item: {
    flex: 1,
    minWidth: 0,
    minHeight: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 2,
  },
  activeItem: {
    backgroundColor: '#EEF5FF',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
  },
  activeLabel: {
    color: colors.primary,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.78,
  },
});
