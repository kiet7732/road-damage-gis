import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon, { type AppIconName } from './AppIcon';
import { colors, iconSize, radius, spacing, touchTarget } from '../constants/theme';
import type { BottomTabParamList, RootStackParamList } from '../types/navigation';

const TAB_LABELS: Record<keyof BottomTabParamList, string> = {
  Home: 'Trang chủ',
  Map: 'Bản đồ',
  History: 'Lịch sử',
  Profile: 'Tài khoản',
};

const TAB_ICONS: Record<keyof BottomTabParamList, { active: AppIconName; inactive: AppIconName }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Map: { active: 'location', inactive: 'location-outline' },
  History: { active: 'time', inactive: 'time-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const androidBottomOffset = Platform.OS === 'android' ? (insets.bottom > 0 ? 2 : 8) : 0;
  const wrapperBottomPadding = Platform.OS === 'android' ? Math.max(insets.bottom, 6) : Math.max(insets.bottom, 8);

  const openCamera = () => {
    rootNavigation.navigate('CameraScreen');
  };

  return (
    <View
      style={[
        styles.wrapper,
        {
          bottom: androidBottomOffset,
          paddingBottom: wrapperBottomPadding,
        },
      ]}
    >
      <View style={styles.bar}>
        {state.routes.slice(0, 2).map((route, index) => {
          const isFocused = state.index === index;
          const tabName = route.name as keyof BottomTabParamList;
          const options = descriptors[route.key]?.options;

          return (
            <TabItem
              key={route.key}
              label={TAB_LABELS[tabName]}
              icon={isFocused ? TAB_ICONS[tabName].active : TAB_ICONS[tabName].inactive}
              focused={isFocused}
              compact={tabName === 'Map'}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              accessibilityLabel={options?.tabBarAccessibilityLabel}
            />
          );
        })}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Gửi phản ánh"
          hitSlop={8}
          onPress={openCamera}
          style={({ pressed }) => [styles.fabSlot, pressed && styles.pressed]}
        >
          <View pointerEvents="none" style={styles.fabShadow}>
            <View style={styles.fab}>
              <AppIcon name="camera" size={34} color={colors.surface} containerSize={48} />
            </View>
          </View>
        </Pressable>

        {state.routes.slice(2).map((route, localIndex) => {
          const routeIndex = localIndex + 2;
          const isFocused = state.index === routeIndex;
          const tabName = route.name as keyof BottomTabParamList;
          const options = descriptors[route.key]?.options;

          return (
            <TabItem
              key={route.key}
              label={TAB_LABELS[tabName]}
              icon={isFocused ? TAB_ICONS[tabName].active : TAB_ICONS[tabName].inactive}
              focused={isFocused}
              compact={tabName === 'Map'}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              accessibilityLabel={options?.tabBarAccessibilityLabel}
            />
          );
        })}
      </View>
    </View>
  );
}

type TabItemProps = {
  label: string;
  icon: AppIconName;
  focused: boolean;
  compact?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
};

function TabItem({ label, icon, focused, compact = false, onPress, accessibilityLabel }: TabItemProps) {
  const color = focused ? colors.primary : colors.textMuted;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={focused ? { selected: true } : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.item, focused && styles.activeItem, pressed && styles.pressed]}
    >
      <AppIcon name={icon} size={compact ? 25 : iconSize.tab} color={color} containerSize={32} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: 14,
    backgroundColor: 'transparent',
  },
  bar: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 6,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
  },
  item: {
    flex: 1,
    minWidth: 0,
    minHeight: touchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  activeItem: {
    backgroundColor: '#EEF5FF',
  },
  fabSlot: {
    width: 78,
    minHeight: 68,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -42,
  },
  fabShadow: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDECEC',
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E53935',
  },
  pressed: {
    opacity: 0.78,
  },
});
