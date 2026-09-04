import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getFieldEngineerUiLabel } from '../../../../packages/shared-constants/src/engineerLabels';
import { AppIcon, colors, iconSize, spacing, touchTarget } from '../../../../packages/mobile-shared/src';
import { configureMobileApiClient } from '../services/configureApiClient';
import { bootstrapEngineerSession } from '../services/authService';
import EngineerLoginScreen from '../features/auth/EngineerLoginScreen';
import EngineerHomeScreen from '../features/home/EngineerHomeScreen';
import EngineerMapScreen from '../features/map/EngineerMapScreen';
import EngineerTasksScreen from '../features/tasks/EngineerTasksScreen';
import EngineerTaskDetailScreen from '../features/tasks/EngineerTaskDetailScreen';
import EngineerCheckInScreen from '../features/tasks/EngineerCheckInScreen';
import EngineerSurveyScreen from '../features/tasks/EngineerSurveyScreen';
import EngineerAttachmentsScreen from '../features/tasks/EngineerAttachmentsScreen';
import EngineerHistoryScreen from '../features/tasks/EngineerHistoryScreen';
import EngineerProfileScreen from '../features/profile/EngineerProfileScreen';
import type { EngineerAuthStackParamList, EngineerBottomTabParamList, EngineerRootStackParamList } from '../types/navigation';

const AuthStack = createNativeStackNavigator<EngineerAuthStackParamList>();
const RootStack = createNativeStackNavigator<EngineerRootStackParamList>();
const BottomTab = createBottomTabNavigator<EngineerBottomTabParamList>();

export default function Navigation() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authBootstrapError, setAuthBootstrapError] = useState('');
  const [authBootstrapAttempt, setAuthBootstrapAttempt] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const runSessionBootstrap = async () => {
      setIsAuthReady(false);
      setAuthBootstrapError('');

      try {
        const result = await bootstrapEngineerSession();
        if (!isMounted) {
          return;
        }

        if (result.status === 'authenticated') {
          setIsAuthenticated(true);
          setIsAuthReady(true);
          return;
        }

        if (result.status === 'retry_required') {
          setIsAuthenticated(false);
          setAuthBootstrapError(result.message);
          setIsAuthReady(true);
          return;
        }

        setIsAuthenticated(false);
      } catch {
        if (!isMounted) {
          return;
        }

        setAuthBootstrapError('Không thể khởi tạo ứng dụng kỹ sư hiện trường. Vui lòng thử lại.');
      } finally {
        if (isMounted) {
          setIsAuthReady(true);
        }
      }
    };

    configureMobileApiClient(() => {
      if (!isMounted) {
        return;
      }

      setIsAuthenticated(false);
      setIsAuthReady(true);
      setAuthBootstrapError('');
    });

    void runSessionBootstrap();

    return () => {
      isMounted = false;
    };
  }, [authBootstrapAttempt]);

  if (!isAuthReady) {
    return <LoadingScreen />;
  }

  if (authBootstrapError) {
    return (
      <RetryScreen
        message={authBootstrapError}
        onRetry={() => {
          setAuthBootstrapAttempt((value) => value + 1);
        }}
      />
    );
  }

  return isAuthenticated ? (
    <RootNavigator onLogout={() => setIsAuthenticated(false)} />
  ) : (
    <AuthNavigator onLogin={() => setIsAuthenticated(true)} />
  );
}

function AuthNavigator({ onLogin }: { onLogin: () => void }) {
  return (
    <AuthStack.Navigator
      id="engineer-auth-stack"
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      <AuthStack.Screen name="Login">
        {(props) => <EngineerLoginScreen {...props} onLogin={onLogin} />}
      </AuthStack.Screen>
    </AuthStack.Navigator>
  );
}

function MainTabs({ onLogout }: { onLogout: () => void }) {
  return (
    <BottomTab.Navigator
      id="engineer-main-tabs"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#00B4D8',
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
          letterSpacing: 0.2,
        },
        tabBarStyle: {
          height: 68,
          paddingTop: 6,
          paddingBottom: 8,
          backgroundColor: '#0B132B',
          borderTopColor: '#1C2541',
          borderTopWidth: 2,
        },
        tabBarIcon: ({ color, size }) => {
          const iconName =
            route.name === 'Home'
              ? 'speedometer-outline'
              : route.name === 'Map'
                ? 'map-outline'
                : route.name === 'Tasks'
                  ? 'clipboard-outline'
                  : 'person-circle-outline';

          return <AppIcon name={iconName} size={size} color={color} containerSize={28} />;
        },
      })}
    >
      <BottomTab.Screen name="Home" component={EngineerHomeScreen} options={{ title: 'Trung tâm' }} />
      <BottomTab.Screen name="Map" component={EngineerMapScreen} options={{ title: 'Bản đồ Radar' }} />
      <BottomTab.Screen name="Tasks" component={EngineerTasksScreen} options={{ title: 'Phiếu tác nghiệp' }} />
      <BottomTab.Screen name="Profile">
        {(props) => <EngineerProfileScreen {...props} onLogout={onLogout} />}
      </BottomTab.Screen>
    </BottomTab.Navigator>
  );
}

function RootNavigator({ onLogout }: { onLogout: () => void }) {
  return (
    <RootStack.Navigator
      id="engineer-root-stack"
      screenOptions={({ navigation }) => ({
        headerTitleAlign: 'center',
        headerTintColor: '#FFFFFF',
        headerStyle: {
          backgroundColor: '#0B132B',
        },
        headerTitleStyle: {
          fontWeight: '900',
          fontSize: 16,
          letterSpacing: 0.3,
        },
        contentStyle: { backgroundColor: '#EDF2F7' },
        headerLeft: ({ canGoBack }) =>
          canGoBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              hitSlop={8}
              onPress={navigation.goBack}
              style={{
                width: touchTarget.min,
                height: touchTarget.min,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppIcon name="chevron-back" size={iconSize.nav} color="#00B4D8" containerSize={32} />
            </Pressable>
          ) : undefined,
      })}
    >
      <RootStack.Screen name="MainTabs" options={{ headerShown: false }}>
        {() => <MainTabs onLogout={onLogout} />}
      </RootStack.Screen>
      <RootStack.Screen
        name="EngineerTaskDetail"
        component={EngineerTaskDetailScreen}
        options={{ title: 'HỒ SƠ TÁC NGHIỆP' }}
      />
      <RootStack.Screen
        name="EngineerCheckIn"
        component={EngineerCheckInScreen}
        options={{ title: 'XÁC THỰC HIỆN TRƯỜNG' }}
      />
      <RootStack.Screen
        name="EngineerSurvey"
        component={EngineerSurveyScreen}
        options={{ title: 'PHIẾU KHẢO SÁT KỸ THUẬT' }}
      />
      <RootStack.Screen
        name="EngineerAttachments"
        component={EngineerAttachmentsScreen}
        options={{ title: 'HỒ SƠ ẢNH HIỆN TRƯỜNG' }}
      />
      <RootStack.Screen
        name="EngineerHistory"
        component={EngineerHistoryScreen}
        options={{ title: 'NHẬT KÝ TÁC NGHIỆP' }}
      />
    </RootStack.Navigator>
  );
}

function LoadingScreen() {
  return (
    <SafeAreaView style={styles.loadingContainer}>
      <View style={styles.loadingContent}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.loadingText}>Đang khởi tạo ứng dụng kỹ sư...</Text>
      </View>
    </SafeAreaView>
  );
}

function RetryScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <SafeAreaView style={styles.loadingContainer}>
      <View style={styles.retryCard}>
        <AppIcon name="warning-outline" size={iconSize.xl} color={colors.warning} containerSize={40} />
        <Text style={styles.retryTitle}>Chưa thể mở ứng dụng kỹ sư hiện trường</Text>
        <Text style={styles.retryMessage}>{message}</Text>
        <Pressable onPress={onRetry} style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}>
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  retryCard: {
    margin: spacing.lg,
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  retryTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  retryMessage: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  retryButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  retryButtonPressed: {
    opacity: 0.9,
  },
  retryButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '900',
  },
});
