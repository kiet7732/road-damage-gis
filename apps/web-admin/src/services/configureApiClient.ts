import {
  AuthTokenStorage,
  api,
  apiClient,
  setAuthFailureHandler,
  setAuthTokenStorage,
  setRefreshTokenHandler,
} from '../../../../packages/api-client/src';

export const webCookieTokenStorage: AuthTokenStorage = {
  getAccessToken: () => null,
  setAccessToken: () => undefined,
  removeAccessToken: () => undefined,
  getRefreshToken: () => null,
  setRefreshToken: () => undefined,
  removeRefreshToken: () => undefined,
  clearTokens: () => undefined,
};

export const WEB_ADMIN_AUTH_CONTEXT_HEADER = 'X-Auth-Context';
export const WEB_ADMIN_AUTH_CONTEXT_VALUE = 'web-admin';

export const configureWebApiClient = (
  onUnauthorized?: () => void | Promise<void>,
): void => {
  setAuthTokenStorage(webCookieTokenStorage);
  apiClient.defaults.withCredentials = true;
  apiClient.defaults.headers.common[WEB_ADMIN_AUTH_CONTEXT_HEADER] =
    WEB_ADMIN_AUTH_CONTEXT_VALUE;

  setRefreshTokenHandler(async () => {
    const response = await api.post<{ accessToken?: string; access_token?: string; token?: string }, Record<string, never>>(
      '/auth/refresh',
      {},
      {
        skipAuth: true,
        suppressGlobalError: true,
        withCredentials: true,
      },
    );

    return (
      response?.accessToken ||
      response?.access_token ||
      response?.token ||
      null
    );
  });

  setAuthFailureHandler(async () => {
    await onUnauthorized?.();
  });
};
