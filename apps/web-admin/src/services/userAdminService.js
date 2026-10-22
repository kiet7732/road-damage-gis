import { ApiClientError, api } from '../../../../packages/api-client/src';

const DEFAULT_PAGE_SIZE = 15;

export function getUserErrorMessage(error) {
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
      return 'Tài khoản hiện tại không có quyền quản lý người dùng.';
    }
    if (error.status === 409) {
      return 'Email này đã được sử dụng trong hệ thống.';
    }
    if (error.status >= 500) {
      return 'Máy chủ đang tạm gián đoạn. Vui lòng thử lại sau.';
    }
    return error.message || 'Thao tác không thành công.';
  }
  return error?.message || 'Có lỗi xảy ra, vui lòng thử lại.';
}

export async function fetchAdminUsers({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  role = '',
  district = '',
  status = '',
  search = '',
} = {}) {
  const params = {
    page,
    page_size: pageSize,
  };

  if (role && role !== 'all') {
    params.role = role;
  }
  if (district && district !== 'all') {
    params.district = district;
  }
  if (status && status !== 'all') {
    params.status = status;
  }
  if (search && search.trim()) {
    params.search = search.trim();
  }

  return api.get('/admin/users', { params });
}

export async function createAdminUser(data) {
  return api.post('/admin/users', {
    fullName: data.fullName.trim(),
    email: data.email.trim().toLowerCase(),
    password: data.password,
    phone: data.phone?.trim() || null,
    role: data.role || 'field_engineer',
    managedDistrict: data.managedDistrict?.trim() || null,
    managedWard: data.managedWard?.trim() || null,
  });
}

export async function updateAdminUser(userId, data) {
  return api.put(`/admin/users/${userId}`, {
    fullName: data.fullName?.trim(),
    phone: data.phone?.trim() || null,
    role: data.role,
    managedDistrict: data.managedDistrict?.trim() || null,
    managedWard: data.managedWard?.trim() || null,
  });
}

export async function toggleUserStatus(userId, isActive) {
  return api.patch(`/admin/users/${userId}/status`, {
    isActive,
  });
}

export async function resetUserPassword(userId, newPassword) {
  return api.post(`/admin/users/${userId}/reset-password`, {
    newPassword,
  });
}
