import { useCallback, useEffect, useRef, useState } from 'react';

export default function useAsyncData(loader, dependencies = []) {
  const [state, setState] = useState({
    data: null,
    isLoading: true,
    isRefreshing: false,
    isError: false,
    isSuccess: false,
    error: '',
    rawError: null,
    reload: async () => {},
  });
  const isMountedRef = useRef(true);
  const latestRequestIdRef = useRef(0);
  const loaderRef = useRef(loader);
  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  const load = useCallback(async (mode = 'initial') => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    setState((current) => ({
      ...current,
      isLoading: mode === 'initial',
      isRefreshing: mode === 'refresh',
      isError: false,
      isSuccess: false,
      error: '',
      rawError: null,
    }));

    try {
      const data = await loaderRef.current();

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
        rawError: null,
      }));
      hasLoadedOnceRef.current = true;
    } catch (error) {
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
        error: error instanceof Error ? error.message : 'Không thể tải thông tin lúc này. Vui lòng thử lại.',
        rawError: error,
      }));
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    void load(hasLoadedOnceRef.current ? 'refresh' : 'initial');

    return () => {
      isMountedRef.current = false;
    };
  }, [load, ...dependencies]);

  return {
    ...state,
    reload: load,
  };
}
