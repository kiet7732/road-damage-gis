import * as SecureStore from 'expo-secure-store';
import {
  ACCESS_TOKEN_KEY,
  type AuthTokenStorage,
  REFRESH_TOKEN_KEY,
  api,
  apiClient,
  setAuthFailureHandler,
  setAuthTokenStorage,
  setRefreshTokenHandler,
} from '../../api-client/src';

export const mobileSecureTokenStorage: AuthTokenStorage = {
  getAccessToken: () => SecureStore.getItemAsync(ACCESS_TOKEN_KEY).catch(() => null),
  setAccessToken: (token) => SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token),
  removeAccessToken: () => SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY).catch(() => {}),
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY).catch(() => null),
  setRefreshToken: (token) => SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token),
  removeRefreshToken: () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {}),
  clearTokens: async () => {
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    } catch {}
    try {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch {}
  },
};

const clearStoredTokens = async (): Promise<void> => {
  await mobileSecureTokenStorage.clearTokens();
};

export const MOBILE_APP_AUTH_CONTEXT_HEADER = 'X-Auth-Context';
export const MOBILE_APP_AUTH_CONTEXT_VALUE = 'mobile-app';

// 1. Tự động kết nối bộ lưu trữ an toàn SecureStore vào apiClient ngay khi nạp module
setAuthTokenStorage(mobileSecureTokenStorage);
apiClient.defaults.withCredentials = false;
apiClient.defaults.headers.common[MOBILE_APP_AUTH_CONTEXT_HEADER] =
  MOBILE_APP_AUTH_CONTEXT_VALUE;

export const defaultRefreshTokenHandler = async (): Promise<string | null> => {
  const refreshToken = await mobileSecureTokenStorage.getRefreshToken();

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await api.post<
      { accessToken?: string; access_token?: string; token?: string; refreshToken?: string; refresh_token?: string },
      { refreshToken: string }
    >(
      '/auth/refresh',
      { refreshToken },
      {
        skipAuth: true,
        suppressGlobalError: true,
        headers: {
          [MOBILE_APP_AUTH_CONTEXT_HEADER]: MOBILE_APP_AUTH_CONTEXT_VALUE,
        },
      },
    );

    const accessToken =
      response?.accessToken ||
      response?.access_token ||
      response?.token ||
      null;
    const nextRefreshToken =
      response?.refreshToken ||
      response?.refresh_token ||
      null;

    if (nextRefreshToken) {
      await mobileSecureTokenStorage.setRefreshToken(nextRefreshToken);
    }

    if (!accessToken) {
      await clearStoredTokens();
      return null;
    }

    await mobileSecureTokenStorage.setAccessToken(accessToken);
    return accessToken;
  } catch (refreshErr) {
    console.warn('[RefreshToken] Native refresh failed:', refreshErr);
    return null;
  }
};

// 2. Cài đặt sẵn Refresh Token Handler mặc định
setRefreshTokenHandler(defaultRefreshTokenHandler);

export const configureMobileApiClient = (
  onUnauthorized?: () => void | Promise<void>,
): void => {
  setAuthTokenStorage(mobileSecureTokenStorage);
  apiClient.defaults.withCredentials = false;
  apiClient.defaults.headers.common[MOBILE_APP_AUTH_CONTEXT_HEADER] =
    MOBILE_APP_AUTH_CONTEXT_VALUE;

  setRefreshTokenHandler(defaultRefreshTokenHandler);

  setAuthFailureHandler(async () => {
    await clearStoredTokens();
    await onUnauthorized?.();
  });
};
