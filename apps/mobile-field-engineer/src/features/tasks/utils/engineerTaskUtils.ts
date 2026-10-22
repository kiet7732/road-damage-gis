import {
  getFieldPriorityMeta,
  getFieldSeverityMeta,
  getRoadDamageTypeOption,
} from '../../../../../../packages/shared-constants/src/fieldDomainMetadata';

export function formatDate(value?: string | null) {
  if (!value) {
    return 'Chưa có';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function calculateDistanceMeters(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(toLatitude - fromLatitude);
  const dLon = toRad(toLongitude - fromLongitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(fromLatitude)) *
      Math.cos(toRad(toLatitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function getDamageTypeLabel(typeCode?: string | null): string {
  if (!typeCode) {
    return 'Chưa thẩm định';
  }
  const option = getRoadDamageTypeOption(typeCode);
  return option?.label || typeCode;
}

export function getSeverityLabel(severity?: string | null): string {
  if (!severity) {
    return 'Chưa chọn';
  }
  const meta = getFieldSeverityMeta(severity);
  return meta?.label || severity;
}

export function getPriorityLabel(priority?: string | null): string {
  if (!priority) {
    return 'Chưa chọn';
  }
  const meta = getFieldPriorityMeta(priority);
  return meta?.label || priority;
}
