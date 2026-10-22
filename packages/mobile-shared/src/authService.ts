import {
  ApiClientError,
  api,
} from '../../api-client/src';
import {
  MOBILE_APP_AUTH_CONTEXT_HEADER,
  MOBILE_APP_AUTH_CONTEXT_VALUE,
  defaultRefreshTokenHandler,
  mobileSecureTokenStorage,
} from './configureApiClient';
import { isAdminRole } from './roleRouting';

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
};

export type AuthUser = {
  id: string;
  fullName?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
};

export type LoginResponse = {
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  access_token?: string;
  refresh_token?: string;
  user?: AuthUser;
};

export type AuthSession = {
  accessToken: string;
  refreshToken?: string;
  user?: AuthUser;
};

export type MobileSessionBootstrapResult =
  | { status: 'authenticated'; user?: AuthUser }
  | { status: 'unauthenticated' }
  | { status: 'retry_required'; message: string };

export type AuthStateListener = (user: AuthUser | null) => void;
const authStateListeners = new Set<AuthStateListener>();
let cachedAuthUser: AuthUser | null = null;
let lastAuthCheckTime: number = 0;

export const getCachedAuthUser = (): AuthUser | null => cachedAuthUser;
export const setCachedAuthUser = (user: AuthUser | null): void => {
  cachedAuthUser = user;
  lastAuthCheckTime = user ? Date.now() : 0;
};

export const subscribeAuthState = (listener: AuthStateListener): (() => void) => {
  authStateListeners.add(listener);
  return () => {
    authStateListeners.delete(listener);
  };
};

export const notifyAuthStateChanged = (user: AuthUser | null): void => {
  setCachedAuthUser(user);
  authStateListeners.forEach((listener) => {
    try {
      listener(user);
    } catch (e) {
      console.error('Auth state listener error:', e);
    }
  });
};

const getAccessTokenFromResponse = (response: LoginResponse): string | null =>
  response.accessToken || response.access_token || response.token || null;

const getRefreshTokenFromResponse = (response: LoginResponse): string | null =>
  response.refreshToken || response.refresh_token || null;

export const clearMobileAuthSession = async (): Promise<void> => {
  setCachedAuthUser(null);
  await mobileSecureTokenStorage.clearTokens();
  notifyAuthStateChanged(null);
};

const persistAuthSession = async (response: LoginResponse): Promise<AuthSession> => {
  const accessToken = getAccessTokenFromResponse(response);
  const refreshToken = getRefreshTokenFromResponse(response);

  if (!accessToken) {
    throw new ApiClientError({
      message: 'Phản hồi xác thực không hợp lệ.',
      code: 'UNKNOWN_ERROR',
      details: response,
    });
  }

  await mobileSecureTokenStorage.clearTokens();
  await mobileSecureTokenStorage.setAccessToken(accessToken);

  if (refreshToken) {
    await mobileSecureTokenStorage.setRefreshToken(refreshToken);
  } else {
    await mobileSecureTokenStorage.removeRefreshToken();
  }

  const user = response.user;
  if (user) {
    notifyAuthStateChanged(user);
  } else {
    fetchCurrentMobileUser()
      .then((fetchedUser) => notifyAuthStateChanged(fetchedUser))
      .catch(() => notifyAuthStateChanged(null));
  }

  return {
    accessToken,
    refreshToken: refreshToken || undefined,
    user: response.user,
  };
};

export const getLoginErrorMessage = (error: unknown): string => {
  if (error instanceof ApiClientError) {
    if (error.code === 'NETWORK_ERROR') {
      return 'Không thể kết nối tới hệ thống. Vui lòng kiểm tra mạng rồi thử lại.';
    }

    if (error.code === 'TIMEOUT_ERROR') {
      return 'Hệ thống phản hồi chậm. Vui lòng thử lại sau ít phút.';
    }

    if (error.status === 401) {
      return 'Tài khoản hoặc mật khẩu không đúng.';
    }

    if (error.status === 403) {
      return (
        error.message ||
        'Tài khoản Quản trị viên chỉ được phép đăng nhập trên Cổng Web Quản lý (Web Admin).'
      );
    }

    if (error.status === 422) {
      return 'Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra lại email và mật khẩu.';
    }

    if (error.status && error.status >= 500) {
      return error.message || 'Hệ thống đang tạm gián đoạn. Vui lòng thử lại sau.';
    }

    return error.message || 'Không thể đăng nhập lúc này. Vui lòng thử lại.';
  }

  return error instanceof Error ? error.message : 'Không thể đăng nhập lúc này. Vui lòng thử lại.';
};

export const getRegisterErrorMessage = (error: unknown): string => {
  if (error instanceof ApiClientError) {
    if (error.code === 'NETWORK_ERROR') {
      return 'Không thể kết nối tới hệ thống. Vui lòng kiểm tra mạng rồi thử lại.';
    }

    if (error.code === 'TIMEOUT_ERROR') {
      return 'Hệ thống phản hồi chậm. Vui lòng thử lại sau ít phút.';
    }

    if (error.status === 409) {
      return error.message || 'Email đã được sử dụng.';
    }

    if (error.status && error.status >= 500) {
      return 'Hệ thống đang tạm gián đoạn. Vui lòng thử lại sau.';
    }

    return error.message || 'Không thể hoàn tất đăng ký lúc này. Vui lòng thử lại.';
  }

  return 'Không thể hoàn tất đăng ký lúc này. Vui lòng thử lại.';
};

export const login = async (payload: LoginPayload): Promise<AuthSession> => {
  const response = await api.post<LoginResponse, LoginPayload>(
    '/auth/login',
    {
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
    },
    {
      skipAuth: true,
      suppressGlobalError: true,
      headers: {
        [MOBILE_APP_AUTH_CONTEXT_HEADER]: MOBILE_APP_AUTH_CONTEXT_VALUE,
      },
    },
  );

  if (response.user && isAdminRole(response.user.role)) {
    await clearMobileAuthSession();
    throw new ApiClientError({
      message:
        'Tài khoản Quản trị viên chỉ được phép đăng nhập trên Cổng Web Quản lý (Web Admin). Vui lòng sử dụng trình duyệt để truy cập Web Admin.',
      status: 403,
      code: 'FORBIDDEN',
      details: response.user,
    });
  }

  return persistAuthSession(response);
};

export const register = async (payload: RegisterPayload): Promise<AuthSession> => {
  const response = await api.post<LoginResponse, RegisterPayload>(
    '/auth/register',
    {
      fullName: payload.fullName.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: payload.phone?.trim() || undefined,
      password: payload.password,
    },
    {
      skipAuth: true,
      suppressGlobalError: true,
      headers: {
        [MOBILE_APP_AUTH_CONTEXT_HEADER]: MOBILE_APP_AUTH_CONTEXT_VALUE,
      },
    },
  );

  return persistAuthSession(response);
};

export const logout = async (): Promise<void> => {
  try {
    const refreshToken = await mobileSecureTokenStorage.getRefreshToken();
    if (refreshToken) {
      await api.post(
        '/auth/logout',
        { refreshToken },
        {
          skipAuth: true,
          suppressGlobalError: true,
          headers: {
            [MOBILE_APP_AUTH_CONTEXT_HEADER]: MOBILE_APP_AUTH_CONTEXT_VALUE,
          },
        },
      );
    }
  } catch {
    // Không chặn đăng xuất cục bộ khi backend tạm lỗi hoặc thiết bị mất mạng.
  } finally {
    await clearMobileAuthSession();
  }
};

export const bootstrapMobileSession =
  async (): Promise<MobileSessionBootstrapResult> => {
  if (cachedAuthUser && Date.now() - lastAuthCheckTime < 20000) {
    return { status: 'authenticated', user: cachedAuthUser };
  }

  let token = await mobileSecureTokenStorage.getAccessToken();
  const refreshToken = await mobileSecureTokenStorage.getRefreshToken();

  if (!token && !refreshToken) {
    notifyAuthStateChanged(null);
    return { status: 'unauthenticated' };
  }

  // Nếu access token chưa có nhưng có refresh token -> thử lấy lại access token
  if (!token && refreshToken) {
    try {
      token = await defaultRefreshTokenHandler();
    } catch {
      // Refresh thất bại
    }
  }

  if (!token) {
    await clearMobileAuthSession();
    return { status: 'unauthenticated' };
  }

  try {
    const user = await api.get<AuthUser>('/auth/me', {
      suppressGlobalError: true,
      headers: {
        Authorization: `Bearer ${token}`,
        [MOBILE_APP_AUTH_CONTEXT_HEADER]: MOBILE_APP_AUTH_CONTEXT_VALUE,
      },
    });

    if (isAdminRole(user.role)) {
      await clearMobileAuthSession();
      return { status: 'unauthenticated' };
    }

    notifyAuthStateChanged(user);
    return { status: 'authenticated', user };
  } catch (error) {
    if (error instanceof ApiClientError) {
      if (error.code === 'NETWORK_ERROR') {
        return {
          status: 'retry_required',
          message:
            'Không thể kiểm tra phiên đăng nhập vì thiết bị đang mất kết nối. Vui lòng kiểm tra mạng rồi thử lại.',
        };
      }

      if (error.code === 'TIMEOUT_ERROR') {
        return {
          status: 'retry_required',
          message:
            'Hệ thống đang phản hồi chậm nên chưa thể kiểm tra phiên đăng nhập. Vui lòng thử lại sau ít phút.',
        };
      }

      // Nếu token hết hạn (401) và có refresh token: thử làm mới token một lần nữa
      if (error.status === 401 && refreshToken) {
        try {
          const refreshedToken = await defaultRefreshTokenHandler();
          if (refreshedToken) {
            const user = await api.get<AuthUser>('/auth/me', {
              suppressGlobalError: true,
              headers: {
                Authorization: `Bearer ${refreshedToken}`,
                [MOBILE_APP_AUTH_CONTEXT_HEADER]: MOBILE_APP_AUTH_CONTEXT_VALUE,
              },
            });

            if (!isAdminRole(user.role)) {
              notifyAuthStateChanged(user);
              return { status: 'authenticated', user };
            }
          }
        } catch {
          // Bỏ qua nếu refresh thất bại
        }
      }
    }

    await clearMobileAuthSession();
    return { status: 'unauthenticated' };
  }
};

export const fetchCurrentMobileUser = async (forceRefresh = false): Promise<AuthUser> => {
  if (!forceRefresh && cachedAuthUser) {
    return cachedAuthUser;
  }

  const user = await api.get<AuthUser>('/auth/me', {
    headers: {
      [MOBILE_APP_AUTH_CONTEXT_HEADER]: MOBILE_APP_AUTH_CONTEXT_VALUE,
    },
  });

  setCachedAuthUser(user);
  return user;
};

export type ChangeMobilePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export const changeMobilePassword = async (
  payload: ChangeMobilePasswordPayload,
): Promise<{ message: string }> => {
  return api.post(
    '/auth/change-password',
    {
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword,
    },
    {
      headers: {
        [MOBILE_APP_AUTH_CONTEXT_HEADER]: MOBILE_APP_AUTH_CONTEXT_VALUE,
      },
    },
  );
};

export type ForgotPasswordOtpResponse = {
  success: boolean;
  message: string;
  email: string;
  expiresIn: number;
};

export const requestPasswordResetOtp = async (
  email: string,
): Promise<ForgotPasswordOtpResponse> => {
  return api.post(
    '/auth/forgot-password/request-otp',
    { email: email.trim().toLowerCase() },
    {
      headers: {
        [MOBILE_APP_AUTH_CONTEXT_HEADER]: MOBILE_APP_AUTH_CONTEXT_VALUE,
      },
    },
  );
};

export const verifyPasswordResetOtp = async (
  email: string,
  otp: string,
): Promise<{ success: boolean; message: string }> => {
  return api.post(
    '/auth/forgot-password/verify-otp',
    { email: email.trim().toLowerCase(), otp: otp.trim() },
    {
      headers: {
        [MOBILE_APP_AUTH_CONTEXT_HEADER]: MOBILE_APP_AUTH_CONTEXT_VALUE,
      },
    },
  );
};

export type ResetPasswordWithOtpPayload = {
  email: string;
  otp: string;
  newPassword: string;
};

export const resetPasswordWithOtp = async (
  payload: ResetPasswordWithOtpPayload,
): Promise<{ success: boolean; message: string }> => {
  return api.post(
    '/auth/forgot-password/reset-password',
    {
      email: payload.email.trim().toLowerCase(),
      otp: payload.otp.trim(),
      newPassword: payload.newPassword,
    },
    {
      headers: {
        [MOBILE_APP_AUTH_CONTEXT_HEADER]: MOBILE_APP_AUTH_CONTEXT_VALUE,
      },
    },
  );
};
