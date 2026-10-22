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
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MobileReporterApp from './apps/mobile-reporter/App';
import MobileFieldEngineerApp from './apps/mobile-field-engineer/App';
import {
  bootstrapMobileSession,
  clearMobileAuthSession,
  subscribeAuthState,
} from './packages/mobile-shared/src/authService';
import { configureMobileApiClient } from './packages/mobile-shared/src/configureApiClient';
import { isAdminRole, resolveAppRole } from './packages/mobile-shared/src/roleRouting';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState('');

  useEffect(() => {
    let isMounted = true;

    // 1. Cấu hình apiClient ngay lập tức khi App khởi động
    configureMobileApiClient(() => {
      if (isMounted) {
        setCurrentUser(null);
      }
    });

    // 2. Đăng ký lắng nghe thay đổi trạng thái đăng nhập (Login/Logout/Token refresh)
    const unsubscribe = subscribeAuthState((user) => {
      if (isMounted) {
        if (user && isAdminRole(user.role)) {
          void clearMobileAuthSession();
          setCurrentUser(null);
        } else {
          setCurrentUser(user);
        }
        setInitError('');
        setIsInitializing(false);
      }
    });

    // 3. Khởi tạo và khôi phục phiên làm việc đã lưu trong SecureStore
    const initSession = async () => {
      try {
        setInitError('');
        const result = await bootstrapMobileSession();
        if (!isMounted) return;

        if (result.status === 'authenticated' && result.user && !isAdminRole(result.user.role)) {
          setCurrentUser(result.user);
        } else if (result.status === 'retry_required') {
          // Lỗi mạng khi mở app -> Không vội xóa token, cho phép người dùng bấm Thử lại
          setInitError(result.message);
        } else {
          if (result.user && isAdminRole(result.user.role)) {
            await clearMobileAuthSession();
          }
          setCurrentUser(null);
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

  // Màn hình thông báo khi khởi tạo phiên thất bại do mất kết nối
  if (initError) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Lỗi kết nối</Text>
          <Text style={styles.errorText}>{initError}</Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => {
              setIsInitializing(true);
              setInitError('');
              void bootstrapMobileSession().then((result) => {
                if (result.status === 'authenticated' && result.user && !isAdminRole(result.user.role)) {
                  setCurrentUser(result.user);
                } else if (result.status === 'retry_required') {
                  setInitError(result.message);
                } else {
                  setCurrentUser(null);
                }
                setIsInitializing(false);
              });
            }}
          >
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // 1. Phân giải vai trò tài khoản khi đã có phiên làm việc hợp lệ
  const appRole = resolveAppRole(currentUser?.role);

  // Nếu vai trò là admin mà lọt vào đây -> Từ chối truy cập Mobile App
  if (currentUser && appRole === 'admin') {
    void clearMobileAuthSession();
    return <MobileReporterApp key="unified-auth" />;
  }

  // Vai trò Kỹ sư hiện trường -> Tự động nạp App Kỹ sư hiện trường
  if (currentUser && appRole === 'engineer') {
    return <MobileFieldEngineerApp key="engineer-app" />;
  }

  // Vai trò Người dân -> Tự động nạp App Người phản ánh
  if (currentUser && appRole === 'reporter') {
    return <MobileReporterApp key="reporter-app" />;
  }

  // 2. Khi chưa đăng nhập: Luôn nạp Cổng đăng nhập thống nhất (dùng cho Người dân & Kỹ sư)
  return <MobileReporterApp key="unified-auth" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorBox: {
    alignItems: 'center',
    maxWidth: 320,
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  errorText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: '#0F172A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
