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

export const MOBILE_APP_AUTH_CONTEXT_HEADER = 'X-Auth-Context';
export const MOBILE_APP_AUTH_CONTEXT_VALUE = 'mobile-app';

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
    console.warn('[RefreshToken] Web refresh failed:', refreshErr);
    return null;
  }
};

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
