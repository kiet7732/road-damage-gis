import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { subscribeApiErrors } from '../../../api-client/src';

export default function ApiErrorNotifier() {
  const lastShownRef = useRef<{
    message: string;
    timestamp: number;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeApiErrors(({ error, timestamp }) => {
      const lastShown = lastShownRef.current;

      if (
        lastShown &&
        lastShown.message === error.message &&
        timestamp - lastShown.timestamp < 1500
      ) {
        return;
      }

      lastShownRef.current = {
        message: error.message,
        timestamp,
      };

      Alert.alert('Không thể thực hiện', error.message || 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.');
    });

    return unsubscribe;
  }, []);

  return null;
}
