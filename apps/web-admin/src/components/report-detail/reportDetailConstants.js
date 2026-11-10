import { getFieldPriorityMeta } from '../../../../../packages/shared-constants/src/fieldDomainMetadata';

export const SEVERITY_CONFIG = {
  'Nặng': { text: '#B91C1C', background: '#FEF2F2', border: '#FECACA' },
  'Trung bình': { text: '#B45309', background: '#FFFBEB', border: '#FDE68A' },
  'Nhẹ': { text: '#15803D', background: '#F0FDF4', border: '#BBF7D0' },
};

export const PRIORITY_CONFIG = {
  'Cấp 1 – Cực kỳ nghiêm trọng': { text: '#BE123C', background: '#FFF1F2', border: '#FDA4AF' },
  'Cấp 1': { text: '#BE123C', background: '#FFF1F2', border: '#FDA4AF' },
  level_1: { text: '#BE123C', background: '#FFF1F2', border: '#FDA4AF' },
  'Khẩn': { text: '#BE123C', background: '#FFF1F2', border: '#FDA4AF' },
  'Khẩn cấp': { text: '#BE123C', background: '#FFF1F2', border: '#FDA4AF' },
  'Cấp 2 – Nghiêm trọng': { text: '#C2410C', background: '#FFF7ED', border: '#FDBA74' },
  'Cấp 2': { text: '#C2410C', background: '#FFF7ED', border: '#FDBA74' },
  level_2: { text: '#C2410C', background: '#FFF7ED', border: '#FDBA74' },
  'Cao': { text: '#C2410C', background: '#FFF7ED', border: '#FDBA74' },
  'Cấp 3 – Cần khắc phục': { text: '#B45309', background: '#FFFBEB', border: '#FCD34D' },
  'Cấp 3': { text: '#B45309', background: '#FFFBEB', border: '#FCD34D' },
  level_3: { text: '#B45309', background: '#FFFBEB', border: '#FCD34D' },
  'Trung bình': { text: '#B45309', background: '#FFFBEB', border: '#FCD34D' },
  'Cấp 4 – Hư hỏng nhẹ': { text: '#0F766E', background: '#F0FDFA', border: '#99F6E4' },
  'Cấp 4': { text: '#0F766E', background: '#F0FDFA', border: '#99F6E4' },
  level_4: { text: '#0F766E', background: '#F0FDFA', border: '#99F6E4' },
  'Thấp': { text: '#0F766E', background: '#F0FDFA', border: '#99F6E4' },
};

export function getPriorityBadgeConfig(value) {
  if (value && PRIORITY_CONFIG[value]) {
    return {
      ...PRIORITY_CONFIG[value],
      label: getFieldPriorityMeta(value)?.label || value,
    };
  }
  const meta = getFieldPriorityMeta(value);
  if (meta) {
    return {
      text: meta.color,
      background: meta.backgroundColor,
      border: meta.borderColor,
      label: meta.label,
    };
  }
  return {
    text: '#475569',
    background: '#F8FAFC',
    border: '#E2E8F0',
    label: value || 'Chưa đánh giá',
  };
}

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
