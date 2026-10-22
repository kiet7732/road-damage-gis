import { ApiClientError, api } from '../../../../packages/api-client/src';

export function getDashboardErrorMessage(error) {
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
      return 'Tài khoản hiện tại không có quyền xem dữ liệu tổng quan.';
    }

    if (error.status >= 500) {
      return 'Máy chủ đang tạm gián đoạn. Vui lòng thử lại sau.';
    }

    return error.message || 'Không thể tải dữ liệu tổng quan.';
  }

  return 'Không thể tải dữ liệu tổng quan.';
}

export async function fetchAdminDashboard(params = {}) {
  const query = {};
  if (params?.district) {
    query.district = params.district;
  }
  if (params?.from_date) {
    query.from_date = params.from_date;
  }
  if (params?.to_date) {
    query.to_date = params.to_date;
  }
  return api.get('/admin/dashboard', { params: query });
}

export async function fetchAdministrativeStats(params = {}) {
  const query = {};
  if (params?.district) {
    query.district = params.district;
  }
  if (params?.from_date) {
    query.from_date = params.from_date;
  }
  if (params?.to_date) {
    query.to_date = params.to_date;
  }
  return api.get('/admin/dashboard/administrative-stats', { params: query });
}
