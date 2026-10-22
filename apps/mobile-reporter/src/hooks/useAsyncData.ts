import { useCallback, useEffect, useRef, useState } from 'react';

type AsyncState<T> = {
  data: T | null;
  isLoading: boolean;
  isRefreshing: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: string;
  reload: (mode?: 'initial' | 'refresh') => Promise<void>;
};

export type UseAsyncDataOptions = {
  cacheKey?: string;
  ttlMs?: number; // mặc định 60_000 ms (1 phút)
  revalidateOnMount?: boolean; // mặc định true (revalidate ngầm)
};

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();

export function setAsyncDataCache<T>(key: string, data: T): void {
  memoryCache.set(key, { data, timestamp: Date.now() });
}

export function getAsyncDataCache<T>(key: string, maxAgeMs = 60_000): T | null {
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.timestamp > maxAgeMs) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

export function clearAsyncDataCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(keyPrefix)) {
      memoryCache.delete(key);
    }
  }
}

export function useAsyncData<T>(
  loader: () => Promise<T>,
  dependencies: unknown[] = [],
  options?: UseAsyncDataOptions,
) {
  const cacheKey = options?.cacheKey;
  const ttlMs = options?.ttlMs ?? 60_000;
  const revalidateOnMount = options?.revalidateOnMount ?? true;

  const getCachedValue = useCallback(() => {
    return cacheKey ? getAsyncDataCache<T>(cacheKey, ttlMs) : null;
  }, [cacheKey, ttlMs]);

  const [state, setState] = useState<AsyncState<T>>(() => {
    const cached = cacheKey ? getAsyncDataCache<T>(cacheKey, ttlMs) : null;
    return {
      data: cached,
      isLoading: cached === null,
      isRefreshing: false,
      isError: false,
      isSuccess: cached !== null,
      error: '',
      reload: async () => {},
    };
  });

  const isMountedRef = useRef(true);
  const latestRequestIdRef = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      const requestId = latestRequestIdRef.current + 1;
      latestRequestIdRef.current = requestId;

      const cached = getCachedValue();
      const hasExistingData = stateRef.current.data !== null || cached !== null;

      setState((current) => ({
        ...current,
        data: current.data ?? cached,
        isLoading: mode === 'initial' && !hasExistingData,
        isRefreshing: mode === 'refresh' || (mode === 'initial' && hasExistingData),
        isError: false,
        error: '',
      }));

      try {
        const data = await loader();

        if (!isMountedRef.current || latestRequestIdRef.current !== requestId) {
          return;
        }

        if (cacheKey) {
          setAsyncDataCache(cacheKey, data);
        }

        setState((current) => ({
          ...current,
          data,
          isLoading: false,
          isRefreshing: false,
          isError: false,
          isSuccess: true,
          error: '',
        }));
      } catch (error: unknown) {
        if (!isMountedRef.current || latestRequestIdRef.current !== requestId) {
          return;
        }

        setState((current) => ({
          ...current,
          data: current.data ?? cached,
          isLoading: false,
          isRefreshing: false,
          isError: true,
          isSuccess: (current.data ?? cached) !== null,
          error:
            error instanceof Error
              ? error.message
              : 'Không thể tải thông tin lúc này. Vui lòng thử lại.',
        }));
      }
    },
    [loader, getCachedValue, cacheKey],
  );

  useEffect(() => {
    isMountedRef.current = true;
    const cached = getCachedValue();

    if (cached !== null && !revalidateOnMount) {
      return;
    }

    void load(cached !== null ? 'refresh' : 'initial');

    return () => {
      isMountedRef.current = false;
    };
  }, [load, getCachedValue, revalidateOnMount, ...dependencies]);

  return {
    ...state,
    reload: load,
  };
}
