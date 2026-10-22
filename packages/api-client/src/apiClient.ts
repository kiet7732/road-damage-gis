import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import {
  AuthTokenStorage,
  defaultTokenStorage,
} from './tokenStorage';

export type ApiErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR';

export type ApiErrorPayload = {
  message: string;
  status?: number;
  code?: ApiErrorCode | string;
  error_code?: ApiErrorCode | string;
  details?: unknown;
  detail?: string | unknown;
};

export type ApiEnvelope<T> = {
  data: T;
  message?: string;
  success?: boolean;
};

export type ApiRequestConfig = AxiosRequestConfig & {
  skipAuth?: boolean;
  suppressGlobalError?: boolean;
  _retry?: boolean;
};

export type RefreshTokenHandler = () => Promise<string | null>;
export type AuthFailureHandler = (error: ApiClientError) => void | Promise<void>;

export type ApiErrorEvent = {
  error: ApiClientError;
  timestamp: number;
};

export type ApiErrorListener = (event: ApiErrorEvent) => void;

declare const __DEV__: boolean | undefined;

type RuntimeEnv = {
  EXPO_PUBLIC_API_URL?: string;
  VITE_API_URL?: string;
  REACT_APP_API_URL?: string;
  API_URL?: string;
  BACKEND_API_URL?: string;
  NODE_ENV?: string;
};

const DEFAULT_PUBLIC_API_URL = 'https://api.tuannguyenkiet0612.dpdns.org/api';
const DEFAULT_DEV_API_URL = 'http://localhost:5000/api';
const DEFAULT_TIMEOUT_MS = 30000;

let authTokenStorage: AuthTokenStorage = defaultTokenStorage;
let refreshTokenHandler: RefreshTokenHandler | null = null;
let authFailureHandler: AuthFailureHandler | null = null;
let refreshPromise: Promise<string | null> | null = null;
let isHandlingAuthFailure = false;
const apiErrorListeners = new Set<ApiErrorListener>();

const getProcessEnv = (): RuntimeEnv => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env as RuntimeEnv;
  }

  return {};
};

const getImportMetaEnv = (): RuntimeEnv => {
  try {
    const importMeta = new Function('return import.meta')() as {
      env?: RuntimeEnv;
    };

    return importMeta.env || {};
  } catch {
    return {};
  }
};

const runtimeEnv = (): RuntimeEnv => ({
  ...getProcessEnv(),
  ...getImportMetaEnv(),
});

export const getApiBaseURL = (): string => {
  // 1. Browser runtime check: Automatically match public HTTPS domain or local host
  if (typeof window !== 'undefined' && window.location) {
    const { hostname, protocol } = window.location;

    // When running on public domain (e.g. admin.tuannguyenkiet0612.dpdns.org) or any HTTPS origin
    if (hostname.includes('tuannguyenkiet0612.dpdns.org') || (protocol === 'https:' && hostname !== 'localhost' && hostname !== '127.0.0.1')) {
      return DEFAULT_PUBLIC_API_URL;
    }

    // When running on LAN IP (e.g. 192.168.1.x:5173) in browser
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && protocol === 'http:') {
      return `http://${hostname}:5000/api`;
    }
  }

  // 2. Direct member expression so Metro inlines EXPO_PUBLIC_API_URL at build time
  const expoApiUrl =
    typeof process !== 'undefined' && process.env
      ? process.env.EXPO_PUBLIC_API_URL
      : undefined;

  const env = runtimeEnv();
  const configuredUrl =
    expoApiUrl ||
    env.EXPO_PUBLIC_API_URL ||
    env.VITE_API_URL ||
    env.REACT_APP_API_URL ||
    env.BACKEND_API_URL ||
    env.API_URL;

  if (configuredUrl && configuredUrl.trim()) {
    return configuredUrl.trim().replace(/\/+$/, '');
  }

  // 3. Fallback for Native Apps / Node
  const isDev =
    typeof __DEV__ !== 'undefined'
      ? __DEV__
      : typeof process !== 'undefined' && process.env?.NODE_ENV
      ? process.env.NODE_ENV !== 'production'
      : false;

  if (!isDev) {
    return DEFAULT_PUBLIC_API_URL;
  }

  return DEFAULT_DEV_API_URL;
};

export class ApiClientError extends Error {
  status?: number;
  code: ApiErrorCode | string;
  details?: unknown;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.name = 'ApiClientError';
    this.status = payload.status;
    this.code = payload.error_code || payload.code || 'UNKNOWN_ERROR';
    this.details = payload.details;
  }
}

export const setAuthTokenStorage = (storage: AuthTokenStorage): void => {
  authTokenStorage = storage;
};

export const setRefreshTokenHandler = (
  handler: RefreshTokenHandler | null,
): void => {
  refreshTokenHandler = handler;
};

export const setAuthFailureHandler = (
  handler: AuthFailureHandler | null,
): void => {
  authFailureHandler = handler;
};

export const subscribeApiErrors = (listener: ApiErrorListener): (() => void) => {
  apiErrorListeners.add(listener);

  return () => {
    apiErrorListeners.delete(listener);
  };
};

const emitApiError = (error: ApiClientError): void => {
  const event: ApiErrorEvent = {
    error,
    timestamp: Date.now(),
  };

  apiErrorListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (listenerError) {
      console.error('Api error listener failed:', listenerError);
    }
  });
};

const getErrorCode = (status?: number, errorCode?: string): ApiErrorCode | string => {
  if (errorCode) return errorCode;
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status && status >= 500) return 'SERVER_ERROR';

  return 'UNKNOWN_ERROR';
};

const handleAuthFailure = async (error: ApiClientError): Promise<void> => {
  if (isHandlingAuthFailure) {
    return;
  }

  isHandlingAuthFailure = true;

  try {
    await authTokenStorage.clearTokens();
    await authFailureHandler?.(error);
  } finally {
    isHandlingAuthFailure = false;
  }
};

const getApiErrorMessage = (
  responseData: Partial<ApiErrorPayload> | undefined,
  fallback: string,
): string => {
  if (responseData?.message) {
    return responseData.message;
  }

  if (typeof responseData?.detail === 'string') {
    return responseData.detail;
  }

  return fallback;
};

export const normalizeApiError = (error: unknown): ApiClientError => {
  if (error instanceof ApiClientError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<Partial<ApiErrorPayload>>;
    const status = axiosError.response?.status;
    const responseData = axiosError.response?.data;

    if (axiosError.code === 'ECONNABORTED') {
      return new ApiClientError({
        message: 'Yêu cầu quá thời gian phản hồi. Vui lòng thử lại.',
        status,
        code: 'TIMEOUT_ERROR',
        details: responseData,
      });
    }

    if (!axiosError.response) {
      return new ApiClientError({
        message: 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng.',
        code: 'NETWORK_ERROR',
        details: axiosError.message,
      });
    }

    return new ApiClientError({
      message: getApiErrorMessage(
        responseData,
        axiosError.message || 'Có lỗi xảy ra khi gọi API.',
      ),
      status,
      code: getErrorCode(
        status,
        responseData?.error_code || responseData?.code,
      ),
      details: responseData?.details || responseData?.detail || responseData,
    });
  }

  return new ApiClientError({
    message: error instanceof Error ? error.message : 'Có lỗi không xác định.',
    code: 'UNKNOWN_ERROR',
    details: error,
  });
};

const unwrapResponseData = <T>(response: AxiosResponse<ApiEnvelope<T> | T>): T => {
  const responseData = response.data;

  if (
    responseData &&
    typeof responseData === 'object' &&
    'data' in responseData
  ) {
    return (responseData as ApiEnvelope<T>).data;
  }

  return responseData as T;
};

const shouldEmitGlobalError = (
  normalizedError: ApiClientError,
  requestConfig?: ApiRequestConfig,
): boolean => {
  if (requestConfig?.suppressGlobalError) {
    return false;
  }

  return [
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
    'UNAUTHORIZED',
    'FORBIDDEN',
    'NOT_FOUND',
    'SERVER_ERROR',
  ].includes(normalizedError.code);
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: getApiBaseURL(),
  timeout: DEFAULT_TIMEOUT_MS,
  headers: {
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const requestConfig = config as InternalAxiosRequestConfig & ApiRequestConfig;

    const headers = AxiosHeaders.from(requestConfig.headers);

    if (!requestConfig.skipAuth) {
      const token = await authTokenStorage.getAccessToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    // Đảm bảo FormData (đặc biệt React Native FormData chứa _parts) có header multipart/form-data
    const isFormData =
      requestConfig.data &&
      typeof requestConfig.data === 'object' &&
      ('_parts' in requestConfig.data ||
        (typeof FormData !== 'undefined' && requestConfig.data instanceof FormData));

    if (isFormData) {
      // Trong React Native (OkHttp) và Trình duyệt, KHÔNG ĐƯỢC set cứng 'multipart/form-data'
      // vì sẽ làm mất tham số boundary khiến server báo 'Missing boundary' hoặc OkHttp lỗi mạng.
      // Xóa Content-Type để runtime tự động gán 'multipart/form-data; boundary=...'.
      headers.delete('Content-Type');
      if (!requestConfig.timeout || requestConfig.timeout === DEFAULT_TIMEOUT_MS) {
        requestConfig.timeout = 60000;
      }
    }

    requestConfig.headers = headers;
    return requestConfig;
  },
  (error) => Promise.reject(normalizeApiError(error)),
);

apiClient.interceptors.response.use(
  (response) => unwrapResponseData(response),
  async (error) => {
    const normalizedError = normalizeApiError(error);
    const originalRequest = axios.isAxiosError(error)
      ? (error.config as ApiRequestConfig | undefined)
      : undefined;

    if (
      normalizedError.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.skipAuth &&
      refreshTokenHandler
    ) {
      originalRequest._retry = true;

      try {
        refreshPromise = refreshPromise || refreshTokenHandler();
        const newAccessToken = await refreshPromise;
        refreshPromise = null;

        if (newAccessToken) {
          await authTokenStorage.setAccessToken(newAccessToken);

          const headers = AxiosHeaders.from(originalRequest.headers);
          headers.set('Authorization', `Bearer ${newAccessToken}`);
          originalRequest.headers = headers;

          return apiClient.request(originalRequest);
        }
      } catch (refreshError) {
        refreshPromise = null;
        await handleAuthFailure(normalizeApiError(refreshError));
        if (shouldEmitGlobalError(normalizedError, originalRequest)) {
          emitApiError(normalizedError);
        }
        return Promise.reject(normalizedError);
      }
    }

    if (normalizedError.status === 401) {
      await handleAuthFailure(normalizedError);
    }

    if (shouldEmitGlobalError(normalizedError, originalRequest)) {
      emitApiError(normalizedError);
    }

    return Promise.reject(normalizedError);
  },
);

export const api = {
  get: <T>(url: string, config?: ApiRequestConfig): Promise<T> =>
    apiClient.get(url, config) as Promise<T>,

  post: <T, B = unknown>(
    url: string,
    body?: B,
    config?: ApiRequestConfig,
  ): Promise<T> => apiClient.post(url, body, config) as Promise<T>,

  put: <T, B = unknown>(
    url: string,
    body?: B,
    config?: ApiRequestConfig,
  ): Promise<T> => apiClient.put(url, body, config) as Promise<T>,

  patch: <T, B = unknown>(
    url: string,
    body?: B,
    config?: ApiRequestConfig,
  ): Promise<T> => apiClient.patch(url, body, config) as Promise<T>,

  delete: <T>(url: string, config?: ApiRequestConfig): Promise<T> =>
    apiClient.delete(url, config) as Promise<T>,
};
