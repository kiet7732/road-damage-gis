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
  getAccessToken: () => SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
  setAccessToken: (token) => SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token),
  removeAccessToken: () => SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  setRefreshToken: (token) => SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token),
  removeRefreshToken: () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  clearTokens: async () => {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },
};

const clearStoredTokens = async (): Promise<void> => {
  await mobileSecureTokenStorage.clearTokens();
};

export const configureMobileApiClient = (
  onUnauthorized?: () => void | Promise<void>,
): void => {
  setAuthTokenStorage(mobileSecureTokenStorage);
  apiClient.defaults.withCredentials = false;

  setRefreshTokenHandler(async () => {
    const refreshToken = await mobileSecureTokenStorage.getRefreshToken();

    if (!refreshToken) {
      return null;
    }

    const response = await api.post<{ accessToken?: string; access_token?: string; token?: string; refreshToken?: string; refresh_token?: string }, { refreshToken: string }>(
      '/auth/refresh',
      { refreshToken },
      {
        skipAuth: true,
        suppressGlobalError: true,
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

    return accessToken;
  });

  setAuthFailureHandler(async () => {
    await clearStoredTokens();
    await onUnauthorized?.();
  });
};
