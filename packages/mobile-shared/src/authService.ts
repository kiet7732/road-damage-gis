import {
  ApiClientError,
  api,
} from '../../api-client/src';
import { mobileSecureTokenStorage } from './configureApiClient';

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

export const subscribeAuthState = (listener: AuthStateListener): (() => void) => {
  authStateListeners.add(listener);
  return () => {
    authStateListeners.delete(listener);
  };
};

export const notifyAuthStateChanged = (user: AuthUser | null): void => {
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

    if (error.status && error.status >= 500) {
      return 'Hệ thống đang tạm gián đoạn. Vui lòng thử lại sau.';
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
    },
  );

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
  const token = await mobileSecureTokenStorage.getAccessToken();

  if (!token) {
    notifyAuthStateChanged(null);
    return { status: 'unauthenticated' };
  }

  try {
    const user = await api.get<AuthUser>('/auth/me', { suppressGlobalError: true });
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
    }

    await clearMobileAuthSession();
    return { status: 'unauthenticated' };
  }
};

export const fetchCurrentMobileUser = async (): Promise<AuthUser> =>
  api.get<AuthUser>('/auth/me');
