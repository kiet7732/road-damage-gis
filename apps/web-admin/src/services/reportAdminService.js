import { ApiClientError, api, getApiBaseURL } from '../../../../packages/api-client/src';

const DEFAULT_PAGE_SIZE = 10;

export function getReportListErrorMessage(error) {
  if (error instanceof ApiClientError) {
    if (error.code === 'NETWORK_ERROR') {
      return 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng rồi thử lại.';
    }

    if (error.code === 'TIMEOUT_ERROR') {
      return 'Máy chủ phản hồi chậm. Vui lòng thử lại sau ít phút.';
    }

    if (error.status === 401) {
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    }

    if (error.status === 403) {
      return 'Tài khoản hiện tại không có quyền xem danh sách phản ánh.';
    }

    if (error.status >= 500) {
      return 'Máy chủ đang tạm gián đoạn. Vui lòng thử lại sau.';
    }

    return error.message || 'Không thể tải danh sách phản ánh.';
  }

  return 'Không thể tải danh sách phản ánh.';
}

export async function fetchAdminReports({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  status = '',
  damageType = '',
  search = '',
  aiStatus = '',
} = {}) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0
    ? Math.floor(pageSize)
    : DEFAULT_PAGE_SIZE;

  const params = {
    limit: safePageSize,
    offset: (safePage - 1) * safePageSize,
  };

  if (status) {
    params.status = status;
  }

  if (damageType) {
    params.damage_type = damageType;
  }

  if (search?.trim()) {
    params.search = search.trim();
  }

  if (aiStatus?.trim()) {
    params.ai_status = aiStatus.trim();
  }

  const response = await api.get('/admin/reports', { params });
  const items = Array.isArray(response?.items) ? response.items : [];
  const total = Number.isFinite(response?.total) ? response.total : items.length;

  return {
    items,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  };
}

export function getReportImageUrl(imageUrl) {
  if (!imageUrl) {
    return '';
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  const apiBaseUrl = getApiBaseURL();
  const apiOrigin = apiBaseUrl.replace(/\/api\/?$/, '');

  return `${apiOrigin}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
}
