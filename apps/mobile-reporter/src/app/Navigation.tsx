import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../components/AppButton';
import AppIcon from '../components/AppIcon';
import CustomTabBar from '../components/CustomTabBar';
import { colors, iconSize, radius, spacing, touchTarget } from '../constants/theme';
import LoginScreen from '../features/auth/LoginScreen';
import RegisterScreen from '../features/auth/RegisterScreen';
import HistoryScreen from '../features/history/HistoryScreen';
import ManualReviewReportsScreen from '../features/history/ManualReviewReportsScreen';
import HomeScreen from '../features/home/HomeScreen';
import NearbyReportsScreen from '../features/home/NearbyReportsScreen';
import MapScreen from '../features/map/MapScreen';
import ProfileScreen from '../features/profile/ProfileScreen';
import ProcessingUpdatesScreen from '../features/profile/ProcessingUpdatesScreen';
import CameraScreen from '../features/report/CameraScreen';
import ConfirmReportScreen from '../features/report/ConfirmReportScreen';
import ReportDetailScreen from '../features/report/ReportDetailScreen';
import { configureMobileApiClient } from '../services/configureApiClient';
import { bootstrapMobileSession, fetchCurrentMobileUser, logout } from '../services/authService';
import { preloadUserLocation } from '../services/locationService';
import type { AuthStackParamList, BottomTabParamList, RootStackParamList } from '../types/navigation';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const BottomTab = createBottomTabNavigator<BottomTabParamList>();

export default function Navigation() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authBootstrapError, setAuthBootstrapError] = useState('');
  const [authBootstrapAttempt, setAuthBootstrapAttempt] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const runSessionBootstrap = async () => {
      if (!isMounted) {
        return;
      }

      setIsAuthReady(false);
      setAuthBootstrapError('');

      try {
        const result = await bootstrapMobileSession();

        if (!isMounted) {
          return;
        }

        if (result.status === 'authenticated') {
          setIsAuthenticated(true);
          setAuthBootstrapError('');
          void preloadUserLocation();
          return;
        }

        if (result.status === 'retry_required') {
          setIsAuthenticated(false);
          setAuthBootstrapError(result.message);
          return;
        }

        setIsAuthenticated(false);
        setAuthBootstrapError('');
      } catch {
        if (!isMounted) {
          return;
        }

        setIsAuthenticated(false);
        setAuthBootstrapError(
          'Không thể khởi tạo phiên đăng nhập. Vui lòng thử lại.',
        );
      } finally {
        if (!isMounted) {
          return;
        }

        setIsAuthReady(true);
      }
    };

    configureMobileApiClient(() => {
      if (!isMounted) {
        return;
      }

      setIsAuthenticated(false);
      setAuthBootstrapError('');
      setIsAuthReady(true);
    });

    void runSessionBootstrap();

    return () => {
      isMounted = false;
    };
  }, [authBootstrapAttempt]);

  if (!isAuthReady) {
    return <AuthLoadingScreen />;
  }

  if (authBootstrapError) {
    return (
      <AuthBootstrapErrorScreen
        message={authBootstrapError}
        onRetry={() => {
          setIsAuthReady(false);
          setAuthBootstrapError('');
          setAuthBootstrapAttempt((currentAttempt) => currentAttempt + 1);
        }}
      />
    );
  }

  return isAuthenticated ? (
    <RootStackNavigator onLogout={() => setIsAuthenticated(false)} />
  ) : (
    <AuthStackNavigator
      onLogin={() => setIsAuthenticated(true)}
      onRegisterSuccess={() => setIsAuthenticated(true)}
    />
  );
}

function AuthLoadingScreen() {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.loadingContainer}>
      <View style={styles.loadingContent}>
        <ActivityIndicator color={colors.primary} />
        <Text selectable style={styles.loadingText}>
          Đang khởi tạo ứng dụng...
        </Text>
      </View>
    </SafeAreaView>
  );
}

function AuthBootstrapErrorScreen({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.loadingContainer}>
      <View style={styles.retryCard}>
        <View style={styles.retryIconBox}>
          <AppIcon
            name="cloud-offline-outline"
            size={iconSize.xl}
            color={colors.warning}
            containerSize={44}
          />
        </View>
        <Text selectable style={styles.retryTitle}>
          Chưa thể xác minh phiên đăng nhập
        </Text>
        <Text selectable style={styles.retryMessage}>
          {message}
        </Text>
        <AppButton
          accessibilityLabel="Thử kiểm tra lại phiên đăng nhập"
          label="Thử lại"
          onPress={onRetry}
        />
      </View>
    </SafeAreaView>
  );
}

function AuthStackNavigator({
  onLogin,
  onRegisterSuccess,
}: {
  onLogin: () => void;
  onRegisterSuccess: () => void;
}) {
  return (
    <AuthStack.Navigator
      id="AuthStack"
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <AuthStack.Screen name="Login">
        {(props) => <LoginScreen {...props} onLogin={onLogin} />}
      </AuthStack.Screen>
      <AuthStack.Screen name="Register">
        {(props) => <RegisterScreen {...props} onRegisterSuccess={onRegisterSuccess} />}
      </AuthStack.Screen>
    </AuthStack.Navigator>
  );
}

function MainTabNavigator({ onLogout }: { onLogout: () => void }) {
  return (
    <BottomTab.Navigator
      id="BottomTabs"
      initialRouteName="Home"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <BottomTab.Screen name="Home" component={HomeScreen} />
      <BottomTab.Screen name="Map" component={MapScreen} />
      <BottomTab.Screen name="History" component={HistoryScreen} />
      <BottomTab.Screen name="Profile">
        {(props) => <ProfileScreen {...props} onLogout={onLogout} />}
      </BottomTab.Screen>
    </BottomTab.Navigator>
  );
}

function RootStackNavigator({ onLogout }: { onLogout: () => void }) {
  const handleLogout = async () => {
    await logout();
    onLogout();
  };

  return (
    <RootStack.Navigator
      id="RootStack"
      initialRouteName="MainTabs"
      screenOptions={({ navigation }) => ({
        headerTitleAlign: 'center',
        headerTintColor: colors.primaryDark,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTitleStyle: {
          fontWeight: '900',
        },
        contentStyle: {
          backgroundColor: colors.background,
        },
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
              <AppIcon name="chevron-back" size={iconSize.nav} color={colors.primaryDark} containerSize={32} />
            </Pressable>
          ) : undefined,
      })}
    >
      <RootStack.Screen
        name="MainTabs"
        options={{
          headerShown: false,
        }}
      >
        {() => <MainTabNavigator onLogout={handleLogout} />}
      </RootStack.Screen>
      <RootStack.Screen
        name="CameraScreen"
        component={CameraScreen}
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <RootStack.Screen
        name="ConfirmReportScreen"
        component={ConfirmReportScreen}
        options={{
          title: 'Xác nhận phản ánh',
        }}
      />
      <RootStack.Screen
        name="ReportDetailScreen"
        component={ReportDetailScreen}
        options={{
          title: 'Chi tiết phản ánh',
        }}
      />
      <RootStack.Screen
        name="NearbyReportsScreen"
        component={NearbyReportsScreen}
        options={{
          title: 'Điểm hư hỏng gần bạn',
        }}
      />
      <RootStack.Screen
        name="ManualReviewReportsScreen"
        component={ManualReviewReportsScreen}
        options={{
          title: 'Ảnh cần kiểm tra thêm',
        }}
      />
      <RootStack.Screen
        name="ProcessingUpdatesScreen"
        component={ProcessingUpdatesScreen}
        options={{
          title: 'Cập nhật xử lý',
        }}
      />
    </RootStack.Navigator>
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
    gap: 12,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  retryCard: {
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  retryIconBox: {
    alignSelf: 'center',
  },
  retryTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  retryMessage: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});
