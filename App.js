/**
 * Root App Entry Point - Unified Role-Based Routing
 *
 * Tự động điều phối giao diện tùy thuộc vào vai trò tài khoản đăng nhập:
 * - Chưa đăng nhập / Khách: Mặc định hiển thị Cổng đăng nhập người phản ánh
 * - Đăng nhập tài khoản Người dân (role === 'reporter') -> Giao diện Người phản ánh (mobile-reporter)
 * - Đăng nhập tài khoản Kỹ sư (role === 'field_engineer') -> Giao diện Kỹ sư hiện trường (mobile-field-engineer)
 * - Ghi nhớ phiên làm việc (Remember Token) an toàn qua expo-secure-store.
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import MobileReporterApp from './apps/mobile-reporter/App';
import MobileFieldEngineerApp from './apps/mobile-field-engineer/App';
import {
  bootstrapMobileSession,
  subscribeAuthState,
} from './packages/mobile-shared/src/authService';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // 1. Đăng ký lắng nghe thay đổi trạng thái đăng nhập (Login/Logout/Token refresh)
    const unsubscribe = subscribeAuthState((user) => {
      if (isMounted) {
        setCurrentUser(user);
        setIsInitializing(false);
      }
    });

    // 2. Khởi tạo và khôi phục phiên làm việc đã lưu trong SecureStore
    const initSession = async () => {
      try {
        const result = await bootstrapMobileSession();
        if (isMounted) {
          if (result.status === 'authenticated' && result.user) {
            setCurrentUser(result.user);
          } else {
            setCurrentUser(null);
          }
        }
      } catch {
        if (isMounted) {
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    void initSession();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0B132B" />
      </View>
    );
  }

  // 1. Kiểm tra vai trò của tài khoản đã đăng nhập
  const role = String(currentUser?.role || '').trim().toLowerCase();

  // Đăng nhập Kỹ sư -> Tự động nạp App Kỹ sư hiện trường
  if (role === 'field_engineer' || role === 'engineer') {
    return <MobileFieldEngineerApp key="engineer-app" />;
  }

  // Đăng nhập Người dân -> Tự động nạp App Người phản ánh
  if (role === 'reporter') {
    return <MobileReporterApp key="reporter-app" />;
  }

  // 2. Nếu chưa đăng nhập: Kiểm tra xem có cấu hình tĩnh qua env không
  const envTarget = String(process.env.EXPO_PUBLIC_APP_TARGET || '').trim().toLowerCase();
  if (envTarget === 'engineer' || envTarget === 'field_engineer') {
    return <MobileFieldEngineerApp key="engineer-auth" />;
  }

  // Mặc định nạp Cổng đăng nhập của App Người phản ánh
  return <MobileReporterApp key="reporter-auth" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
