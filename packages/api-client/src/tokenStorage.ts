export const ACCESS_TOKEN_KEY = 'road_damage_gis_access_token';
export const REFRESH_TOKEN_KEY = 'road_damage_gis_refresh_token';

type MaybePromise<T> = T | Promise<T>;

export type AuthTokenStorage = {
  getAccessToken: () => MaybePromise<string | null>;
  setAccessToken: (token: string) => MaybePromise<void>;
  removeAccessToken: () => MaybePromise<void>;
  getRefreshToken: () => MaybePromise<string | null>;
  setRefreshToken: (token: string) => MaybePromise<void>;
  removeRefreshToken: () => MaybePromise<void>;
  clearTokens: () => MaybePromise<void>;
};

export type TokenStorageKeys = {
  accessTokenKey?: string;
  refreshTokenKey?: string;
};

const memoryStore = new Map<string, string>();

export const createMemoryTokenStorage = (
  keys: TokenStorageKeys = {},
): AuthTokenStorage => {
  const accessTokenKey = keys.accessTokenKey || ACCESS_TOKEN_KEY;
  const refreshTokenKey = keys.refreshTokenKey || REFRESH_TOKEN_KEY;

  return {
    getAccessToken: () => memoryStore.get(accessTokenKey) || null,
    setAccessToken: (token) => {
      memoryStore.set(accessTokenKey, token);
    },
    removeAccessToken: () => {
      memoryStore.delete(accessTokenKey);
    },
    getRefreshToken: () => memoryStore.get(refreshTokenKey) || null,
    setRefreshToken: (token) => {
      memoryStore.set(refreshTokenKey, token);
    },
    removeRefreshToken: () => {
      memoryStore.delete(refreshTokenKey);
    },
    clearTokens: () => {
      memoryStore.delete(accessTokenKey);
      memoryStore.delete(refreshTokenKey);
    },
  };
};

const getBrowserStorage = (): Storage | null => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    return window.localStorage;
  } catch {
    return null;
  }
};

export const createWebTokenStorage = (
  storage: Storage | null = getBrowserStorage(),
  keys: TokenStorageKeys = {},
): AuthTokenStorage => {
  const fallbackStorage = createMemoryTokenStorage(keys);
  const accessTokenKey = keys.accessTokenKey || ACCESS_TOKEN_KEY;
  const refreshTokenKey = keys.refreshTokenKey || REFRESH_TOKEN_KEY;

  if (!storage) {
    return fallbackStorage;
  }

  return {
    getAccessToken: () => {
      try {
        return storage.getItem(accessTokenKey);
      } catch {
        return null;
      }
    },
    setAccessToken: (token) => {
      try {
        storage.setItem(accessTokenKey, token);
      } catch {
        fallbackStorage.setAccessToken(token);
      }
    },
    removeAccessToken: () => {
      try {
        storage.removeItem(accessTokenKey);
      } catch {
        fallbackStorage.removeAccessToken();
      }
    },
    getRefreshToken: () => {
      try {
        return storage.getItem(refreshTokenKey);
      } catch {
        return null;
      }
    },
    setRefreshToken: (token) => {
      try {
        storage.setItem(refreshTokenKey, token);
      } catch {
        fallbackStorage.setRefreshToken(token);
      }
    },
    removeRefreshToken: () => {
      try {
        storage.removeItem(refreshTokenKey);
      } catch {
        fallbackStorage.removeRefreshToken();
      }
    },
    clearTokens: () => {
      try {
        storage.removeItem(accessTokenKey);
        storage.removeItem(refreshTokenKey);
      } catch {
        fallbackStorage.clearTokens();
      }
    },
  };
};

export const defaultTokenStorage = createMemoryTokenStorage();
