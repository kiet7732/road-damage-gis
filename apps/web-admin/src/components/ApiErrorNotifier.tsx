import { useEffect } from 'react';
import { subscribeApiErrors } from '../../../../packages/api-client/src';
import { useToast } from './ToastProvider';

export default function ApiErrorNotifier() {
  const { showToast } = useToast();

  useEffect(() => {
    const unsubscribe = subscribeApiErrors(({ error }) => {
      showToast(error.message || 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.', 'error');
    });

    return unsubscribe;
  }, [showToast]);

  return null;
}
