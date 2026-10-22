import { ApiClientError, api } from '../../../../packages/api-client/src';

export function getReportDetailErrorMessage(error) {
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

    if (error.status === 404) {
      return 'Không tìm thấy phản ánh tương ứng.';
    }

    if (error.status >= 500) {
      return 'Máy chủ đang tạm gián đoạn. Vui lòng thử lại sau.';
    }

    return error.message || 'Không thể tải chi tiết phản ánh.';
  }

  return 'Không thể tải chi tiết phản ánh.';
}

export async function fetchAdminReportDetail(reportId) {
  return api.get(`/admin/reports/${reportId}`, { suppressGlobalError: true });
}

export async function updateAdminReportStatus(reportId, payload) {
  return api.patch(`/admin/reports/${reportId}/status`, payload);
}

export async function updateAdminReportDamageType(reportId, payload) {
  return api.patch(`/admin/reports/${reportId}/damage-type`, payload);
}

export async function fetchEngineerTimeline(reportId) {
  return api.get(`/admin/reports/${reportId}/engineer-timeline`, { suppressGlobalError: true });
}
