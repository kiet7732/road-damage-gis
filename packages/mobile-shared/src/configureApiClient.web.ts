import {
  type AuthTokenStorage,
  api,
  apiClient,
  createWebTokenStorage,
  setAuthFailureHandler,
  setAuthTokenStorage,
  setRefreshTokenHandler,
} from '../../api-client/src';

export const mobileSecureTokenStorage: AuthTokenStorage = createWebTokenStorage();

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
