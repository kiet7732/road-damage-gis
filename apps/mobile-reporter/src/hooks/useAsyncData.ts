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

export function useAsyncData<T>(loader: () => Promise<T>, dependencies: unknown[] = []) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    isLoading: true,
    isRefreshing: false,
    isError: false,
    isSuccess: false,
    error: '',
    reload: async () => {},
  });
  const isMountedRef = useRef(true);
  const latestRequestIdRef = useRef(0);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      const requestId = latestRequestIdRef.current + 1;
      latestRequestIdRef.current = requestId;

      setState((current) => ({
        ...current,
        isLoading: mode === 'initial',
        isRefreshing: mode === 'refresh',
        isError: false,
        isSuccess: false,
        error: '',
      }));

      try {
        const data = await loader();

        if (!isMountedRef.current || latestRequestIdRef.current !== requestId) {
          return;
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
          data: mode === 'refresh' ? current.data : null,
          isLoading: false,
          isRefreshing: false,
          isError: true,
          isSuccess: false,
          error:
            error instanceof Error
              ? error.message
              : 'Không thể tải thông tin lúc này. Vui lòng thử lại.',
        }));
      }
    },
    [loader],
  );

  useEffect(() => {
    isMountedRef.current = true;
    void load('initial');

    return () => {
      isMountedRef.current = false;
    };
  }, [load, ...dependencies]);

  return {
    ...state,
    reload: load,
  };
}
