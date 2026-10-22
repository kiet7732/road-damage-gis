import { damageTypeTheme, type DamageTypeCode } from '../../../constants/theme';
import { getDamageTypeDisplayLabel, MAX_GPS_ACCURACY_METERS } from '../../../services/reportService';
import type { RootStackParamList } from '../../../types/navigation';
import type { DamageDetection, Report, ReportAiResult } from '../../../types/roadDamage';

export function isValidGps(gps: RootStackParamList['ConfirmReportScreen']['gps'] | undefined) {
  return (
    typeof gps?.latitude === 'number' &&
    Number.isFinite(gps.latitude) &&
    gps.latitude >= -90 &&
    gps.latitude <= 90 &&
    typeof gps?.longitude === 'number' &&
    Number.isFinite(gps.longitude) &&
    gps.longitude >= -180 &&
    gps.longitude <= 180 &&
    !(gps.latitude === 0 && gps.longitude === 0) &&
    typeof gps?.accuracy === 'number' &&
    Number.isFinite(gps.accuracy) &&
    gps.accuracy > 0 &&
    gps.accuracy <= MAX_GPS_ACCURACY_METERS
  );
}

export function getDetectionDamageType(detection: DamageDetection | null): DamageTypeCode | null {
  if (!detection?.damageType) {
    return null;
  }

  const normalized = detection.damageType.trim().toUpperCase();
  return normalized in damageTypeTheme ? (normalized as DamageTypeCode) : null;
}

export function buildPredictionLabel(
  previewResult: ReportAiResult | null,
  detection: DamageDetection | null,
): string {
  if (!previewResult) {
    return '';
  }

  if (!previewResult.success || !detection) {
    return 'Hệ thống chưa xác định được loại hư hỏng từ ảnh này.';
  }

  const damageType = getDetectionDamageType(detection);
  const damageLabel = damageType
    ? damageTypeTheme[damageType].label
    : detection.className || detection.damageType;
  const confidencePercent = Math.round((detection.confidence || 0) * 100);

  return `${damageLabel} • độ tin cậy ${confidencePercent}%`;
}

export function formatStatusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'Chờ xác minh';
    case 'processing':
      return 'Đang xử lý';
    case 'repaired':
      return 'Đã sửa chữa';
    case 'rejected':
      return 'Từ chối';
    default:
      return status;
  }
}

export function buildNearbyReportPreviewTitle(report: Report): string {
  const damageLabel = getDamageTypeDisplayLabel(report.type) ?? report.type;
  const rawTitle = (report.title ?? '').trim();
  const titleWithoutPrefix = rawTitle.replace(new RegExp(`^${damageLabel}\\s*-\\s*`, 'i'), '').trim();
  const normalizedTitle = titleWithoutPrefix.replace(/\s+/g, ' ');

  if (!normalizedTitle) {
    return damageLabel;
  }

  const shortTitle = normalizedTitle
    .replace(/^\[seed-demo\]\s*/i, '')
    .replace(/^ghi nhận tại hiện trường$/i, '')
    .replace(/^vị trí /i, '')
    .trim();

  if (!shortTitle) {
    return damageLabel;
  }

  return shortTitle;
}
