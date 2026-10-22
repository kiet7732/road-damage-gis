export const SEVERITY_CONFIG = {
  'Nặng': { text: '#B91C1C', background: '#FEF2F2', border: '#FECACA' },
  'Trung bình': { text: '#B45309', background: '#FFFBEB', border: '#FDE68A' },
  'Nhẹ': { text: '#15803D', background: '#F0FDF4', border: '#BBF7D0' },
};

export const PRIORITY_CONFIG = {
  'Khẩn': { text: '#991B1B', background: '#FFE4E6', border: '#FECDD3' },
  'Khẩn cấp': { text: '#991B1B', background: '#FFE4E6', border: '#FECDD3' },
  'Cao': { text: '#C2410C', background: '#FFF7ED', border: '#FED7AA' },
  'Trung bình': { text: '#1D4ED8', background: '#EFF6FF', border: '#BFDBFE' },
  'Thấp': { text: '#475569', background: '#F8FAFC', border: '#E2E8F0' },
};

export const STATUS_OPTIONS = [
  { value: 'pending', label: 'Chờ xác minh' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'repaired', label: 'Đã sửa chữa' },
  { value: 'rejected', label: 'Từ chối' },
];

export function getLocationSourceLabel(source) {
  const normalized = String(source || '').trim().toLowerCase();

  if (normalized === 'map_selected') {
    return 'Người dùng chọn lại vị trí trên bản đồ';
  }

  return 'Vị trí lấy tại nơi chụp ảnh';
}
