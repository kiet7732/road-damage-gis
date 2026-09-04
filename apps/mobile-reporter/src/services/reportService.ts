import {
  ApiClientError,
  api,
  getApiBaseURL,
} from '../../../../packages/api-client/src';
import type { DamageTypeCode, ReportStatus } from '../constants/theme';
import type { GpsLocation } from '../types/navigation';
import type {
  DamageDetection,
  NewReportPayload,
  Report,
  ReportAiResult,
  ReportDetail,
} from '../types/roadDamage';

type BackendBoundingBox = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type BackendDamageDetection = {
  class_id?: number | null;
  damage_type?: string;
  class_name?: string | null;
  confidence: number;
  bbox: BackendBoundingBox;
};

type BackendAiResult = {
  success: boolean;
  detections_count: number;
  detections: BackendDamageDetection[];
  processing_time_ms?: number | null;
  message: string;
  preview_token?: string | null;
};

type BackendReport = {
  id: string;
  image_path?: string;
  image_url?: string;
  latitude: number;
  longitude: number;
  gps_accuracy?: number | null;
  location_source?: string | null;
  location_recorded_at?: string | null;
  note?: string | null;
  corrected_damage_type?: string | null;
  ai_status: string;
  status: string;
  ai_result: BackendAiResult;
  created_at: string;
  updated_at: string;
};

type BackendReportListResponse = {
  items: BackendReport[];
  total: number;
};

type GeoJsonFeatureCollection = {
  type: 'FeatureCollection';
  features?: GeoJsonFeature[];
  bbox?: [number, number, number, number] | null;
  query_bbox?: [number, number, number, number] | null;
  matched_total?: number;
  pending_count?: number;
  processing_count?: number;
  repaired_count?: number;
  top_damage_type?: string | null;
  top_damage_label?: string | null;
};

type GeoJsonFeature = {
  type: 'Feature';
  id?: string;
  geometry?: {
    type: 'Point';
    coordinates?: [number, number];
  };
  properties?: {
    id: string;
    image_url?: string;
    user_id?: string | null;
    status: string;
    ai_status?: string | null;
    note?: string | null;
    gps_accuracy?: number | null;
    location_source?: string | null;
    location_recorded_at?: string | null;
    damage_type?: string | null;
    damage_label?: string | null;
    corrected_damage_type?: string | null;
    is_ai_overridden?: boolean;
    confidence?: number | null;
    created_at: string;
    updated_at: string;
  };
};

type SubmitReportOptions = {
  onUploadProgress?: (progress: number) => void;
};

type ReportMapViewportOptions = {
  minLatitude: number;
  minLongitude: number;
  maxLatitude: number;
  maxLongitude: number;
  limit?: number;
  status?: ReportStatus | 'all';
  damageType?: DamageTypeCode | 'all';
};

type NearbyReportLookupOptions = {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  limit?: number;
};

export const MAX_REPORT_IMAGE_DIMENSION = 1600;
export const MAX_GPS_ACCURACY_METERS = 80;
export const MAX_REPORT_NOTE_LENGTH = 500;
export const DEFAULT_NEARBY_REPORT_RADIUS_METERS = 250;

export type ReportMapData = {
  reports: Report[];
  matchedTotal: number;
  pendingCount: number;
  processingCount: number;
  repairedCount: number;
  topDamageType: DamageTypeCode | null;
  topDamageLabel: string | null;
  bbox?: [number, number, number, number] | null;
  queryBbox?: [number, number, number, number] | null;
};

const STATUS_MAP: Record<string, ReportStatus> = {
  new: 'new',
  pending: 'pending',
  pending_verification: 'pending',
  manual_review_required: 'pending',
  verified: 'processing',
  processing: 'processing',
  in_progress: 'processing',
  repaired: 'repaired',
  resolved: 'repaired',
  done: 'repaired',
  rejected: 'rejected',
};

const DAMAGE_TYPE_MAP: Record<string, DamageTypeCode> = {
  D00: 'D00',
  D10: 'D10',
  D20: 'D20',
  D40: 'D40',
};

const DAMAGE_TYPE_LABEL_MAP: Record<DamageTypeCode, string> = {
  D00: 'Nứt dọc',
  D10: 'Nứt ngang',
  D20: 'Nứt da cá sấu',
  D40: 'Ổ gà',
};

const UNKNOWN_DAMAGE_LABEL = 'Hư hỏng chưa xác định';
const DEFAULT_REPORT_TITLE_DESCRIPTION = 'Ghi nhận tại hiện trường';
const REPORT_TITLE_MAX_LENGTH = 80;

export const getLocationSourceLabel = (source?: string | null): string => {
  const normalized = source?.trim().toLowerCase();

  if (normalized === 'map_selected') {
    return 'Người dùng chọn lại vị trí trên bản đồ';
  }

  return 'Vị trí lấy tại nơi chụp ảnh';
};

const getReportStatus = (status: string): ReportStatus =>
  STATUS_MAP[status] ?? 'new';

const getDamageType = (damageType?: string): DamageTypeCode =>
  DAMAGE_TYPE_MAP[damageType ?? ''] ?? 'D40';

export const getDamageTypeDisplayLabel = (damageType?: string): string | null => {
  const normalizedDamageType = damageType?.trim().toUpperCase();

  if (!normalizedDamageType) {
    return null;
  }

  const mappedDamageType = DAMAGE_TYPE_MAP[normalizedDamageType];
  return mappedDamageType ? DAMAGE_TYPE_LABEL_MAP[mappedDamageType] : null;
};

const formatCreatedAt = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || 'N/A';
  }

  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const getEffectiveDamageType = (report: BackendReport): string => {
  const correctedDamageType = report.corrected_damage_type?.trim().toUpperCase();
  if (correctedDamageType) {
    return correctedDamageType;
  }

  const firstDetection = report.ai_result?.detections?.[0];
  return (firstDetection?.damage_type || '').trim().toUpperCase();
};

const normalizeReportTitleText = (value?: string | null): string =>
  (value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const truncateReportTitleText = (value: string, maxLength = REPORT_TITLE_MAX_LENGTH): string => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
};

const buildReportTitle = (report: BackendReport): string => {
  const firstDetection = report.ai_result?.detections?.[0];
  const effectiveDamageType = getEffectiveDamageType(report);
  const finalDamageLabel =
    getDamageTypeDisplayLabel(effectiveDamageType) ||
    firstDetection?.class_name ||
    getDamageTypeDisplayLabel(firstDetection?.damage_type) ||
    null;

  const normalizedDamageLabel = normalizeReportTitleText(finalDamageLabel) || UNKNOWN_DAMAGE_LABEL;
  const normalizedDescription =
    normalizeReportTitleText(report.note) || DEFAULT_REPORT_TITLE_DESCRIPTION;

  return truncateReportTitleText(`${normalizedDamageLabel} - ${normalizedDescription}`);
};

const getBackendOrigin = (): string => getApiBaseURL().replace(/\/api\/?$/i, '');

const buildImageUrl = (imageUrl?: string): string | undefined => {
  if (!imageUrl) {
    return undefined;
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  const normalizedPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  return `${getBackendOrigin()}${normalizedPath}`;
};

const mapBackendDetection = (detection: BackendDamageDetection): DamageDetection => ({
  damageType: detection.damage_type || 'UNKNOWN',
  className: detection.class_name,
  confidence: detection.confidence,
  bbox: detection.bbox,
});

const mapBackendAiResult = (aiResult: BackendAiResult): ReportAiResult => ({
  success: Boolean(aiResult?.success),
  detectionsCount: aiResult?.detections_count ?? 0,
  detections: (aiResult?.detections ?? []).map(mapBackendDetection),
  processingTimeMs: aiResult?.processing_time_ms,
  message: aiResult?.message || 'Chưa có kết quả nhận dạng.',
  previewToken: aiResult?.preview_token ?? null,
});

const mapBackendReportToMobileReport = (report: BackendReport): Report => ({
  id: report.id,
  title: buildReportTitle(report),
  address: `Tọa độ: ${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}`,
  status: getReportStatus(report.status),
  type: getDamageType(getEffectiveDamageType(report)),
  createdAt: formatCreatedAt(report.created_at),
  createdAtRaw: report.created_at,
  updatedAt: formatCreatedAt(report.updated_at),
  updatedAtRaw: report.updated_at,
  photoUri: buildImageUrl(report.image_url),
  note: report.note,
  aiStatus: report.ai_status,
  confidence: report.ai_result?.detections?.[0]?.confidence ?? null,
  gps: {
    latitude: report.latitude,
    longitude: report.longitude,
    accuracy: report.gps_accuracy ?? 0,
    capturedAt: report.location_recorded_at || report.created_at,
    source: (report.location_source?.trim().toLowerCase() === 'map_selected' ? 'map_selected' : 'camera_gps'),
  },
});

const mapBackendReportToMobileReportDetail = (report: BackendReport): ReportDetail => ({
  ...mapBackendReportToMobileReport(report),
  photoUri: buildImageUrl(report.image_url),
  note: report.note,
  aiStatus: report.ai_status,
  aiResult: mapBackendAiResult(report.ai_result),
  rawStatus: report.status,
  updatedAt: formatCreatedAt(report.updated_at),
});

const mapGeoJsonFeatureToBackendReport = (feature: GeoJsonFeature): BackendReport | null => {
  const coordinates = feature.geometry?.coordinates;
  const properties = feature.properties;

  if (!coordinates || coordinates.length < 2 || !properties?.id) {
    return null;
  }

  const [longitude, latitude] = coordinates;
  const damageType = properties.corrected_damage_type || properties.damage_type || 'D40';
  const damageLabel = properties.damage_label || damageType;
  const confidence = Number(properties.confidence);

  return {
    id: properties.id,
    image_path: properties.image_url || '',
    image_url: properties.image_url,
    latitude,
    longitude,
    gps_accuracy: properties.gps_accuracy ?? null,
    location_source: properties.location_source ?? null,
    location_recorded_at: properties.location_recorded_at ?? null,
    note: properties.note ?? null,
    corrected_damage_type: properties.corrected_damage_type ?? null,
    ai_status: properties.ai_status || 'completed',
    status: properties.status,
    ai_result: {
      success: true,
      detections_count: damageType ? 1 : 0,
      detections: damageType
        ? [
            {
              damage_type: damageType,
              class_name: damageLabel,
              confidence: Number.isFinite(confidence) ? confidence : 0,
              bbox: { x1: 0, y1: 0, x2: 0, y2: 0 },
            },
          ]
        : [],
      message: 'Thông tin được đồng bộ từ bản đồ hệ thống.',
    },
    created_at: properties.created_at,
    updated_at: properties.updated_at,
  };
};

const mapGeoJsonToMobileReports = (payload: GeoJsonFeatureCollection): Report[] =>
  (payload.features ?? [])
    .map(mapGeoJsonFeatureToBackendReport)
    .filter((item): item is BackendReport => Boolean(item))
    .map(mapBackendReportToMobileReport);

const metersToLatitudeDelta = (meters: number): number => meters / 111_320;

const metersToLongitudeDelta = (meters: number, latitude: number): number => {
  const latitudeRadians = (latitude * Math.PI) / 180;
  const metersPerDegree = 111_320 * Math.cos(latitudeRadians);

  if (!Number.isFinite(metersPerDegree) || Math.abs(metersPerDegree) < 1e-6) {
    return metersToLatitudeDelta(meters);
  }

  return meters / metersPerDegree;
};

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const calculateDistanceMeters = (
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
): number => {
  const earthRadiusMeters = 6_371_000;
  const deltaLatitude = toRadians(toLatitude - fromLatitude);
  const deltaLongitude = toRadians(toLongitude - fromLongitude);
  const fromLatitudeRadians = toRadians(fromLatitude);
  const toLatitudeRadians = toRadians(toLatitude);

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(fromLatitudeRadians) *
      Math.cos(toLatitudeRadians) *
      Math.sin(deltaLongitude / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
};

const getCommonReportErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (error instanceof ApiClientError) {
    if (error.code === 'NETWORK_ERROR') {
      return 'Không thể kết nối tới hệ thống. Vui lòng kiểm tra mạng rồi thử lại.';
    }

    if (error.code === 'TIMEOUT_ERROR') {
      return 'Hệ thống phản hồi chậm. Vui lòng thử lại sau ít phút.';
    }

    if (error.status === 401) {
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    }

    if (error.status && error.status >= 500) {
      return 'Hệ thống đang tạm gián đoạn. Vui lòng thử lại sau.';
    }

    return error.message || fallbackMessage;
  }

  return fallbackMessage;
};

export const getReportHistoryErrorMessage = (error: unknown): string =>
  getCommonReportErrorMessage(error, 'Không tải được lịch sử phản ánh.');

export const getReportDetailErrorMessage = (error: unknown): string => {
  if (error instanceof ApiClientError && error.status === 404) {
    return 'Phản ánh không tồn tại hoặc đã bị xóa.';
  }

  return getCommonReportErrorMessage(error, 'Không tải được chi tiết phản ánh.');
};

export const getSubmitReportErrorMessage = (error: unknown): string =>
  getCommonReportErrorMessage(error, 'Không gửi được phản ánh. Vui lòng thử lại.');

export const getNearbyReportErrorMessage = (error: unknown): string =>
  getCommonReportErrorMessage(error, 'Không tải được các điểm hư hỏng gần bạn.');

export const sanitizeReportNote = (value: string): string =>
  value
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/(.)\1{9,}/g, '$1$1$1')
    .trim()
    .slice(0, MAX_REPORT_NOTE_LENGTH);

export const fetchReportHistory = async (): Promise<Report[]> => {
  const response = await api.get<BackendReportListResponse>('/reports/history');
  return response.items.map(mapBackendReportToMobileReport);
};

export const fetchUnrepairedReportMapPoints = async (
  options: ReportMapViewportOptions,
): Promise<ReportMapData> => {
  const params = new URLSearchParams();
  params.set('min_latitude', String(options.minLatitude));
  params.set('min_longitude', String(options.minLongitude));
  params.set('max_latitude', String(options.maxLatitude));
  params.set('max_longitude', String(options.maxLongitude));
  params.set('limit', String(options.limit ?? 500));

  if (options.status && options.status !== 'all') {
    params.set('status', options.status);
  }

  if (options.damageType && options.damageType !== 'all') {
    params.set('damage_type', options.damageType);
  }

  const response = await api.get<GeoJsonFeatureCollection>(
    `/gis/search?${params.toString()}`,
  );

  const reports = mapGeoJsonToMobileReports(response);
  const topDamageType =
    response.top_damage_type && response.top_damage_type in DAMAGE_TYPE_MAP
      ? (response.top_damage_type as DamageTypeCode)
      : null;

  return {
    reports,
    matchedTotal: Number.isFinite(response.matched_total) ? Number(response.matched_total) : reports.length,
    pendingCount: Number.isFinite(response.pending_count) ? Number(response.pending_count) : 0,
    processingCount: Number.isFinite(response.processing_count) ? Number(response.processing_count) : 0,
    repairedCount: Number.isFinite(response.repaired_count) ? Number(response.repaired_count) : 0,
    topDamageType,
    topDamageLabel: response.top_damage_label ?? (topDamageType ? DAMAGE_TYPE_LABEL_MAP[topDamageType] : null),
    bbox: response.bbox ?? null,
    queryBbox: response.query_bbox ?? null,
  };
};

export const fetchNearbyUnrepairedReports = async (
  options: NearbyReportLookupOptions,
): Promise<Report[]> => {
  const radiusMeters = Math.max(50, options.radiusMeters ?? DEFAULT_NEARBY_REPORT_RADIUS_METERS);
  const latitudeDelta = metersToLatitudeDelta(radiusMeters);
  const longitudeDelta = metersToLongitudeDelta(radiusMeters, options.latitude);

  const mapData = await fetchUnrepairedReportMapPoints({
    minLatitude: options.latitude - latitudeDelta,
    maxLatitude: options.latitude + latitudeDelta,
    minLongitude: options.longitude - longitudeDelta,
    maxLongitude: options.longitude + longitudeDelta,
    limit: options.limit ?? 50,
  });

  const reports = mapData.reports;

  return reports
    .filter((report) => {
      const distanceMeters = calculateDistanceMeters(
        options.latitude,
        options.longitude,
        report.gps.latitude,
        report.gps.longitude,
      );

      return distanceMeters <= radiusMeters;
    })
    .sort((left, right) => {
      const leftDistance = calculateDistanceMeters(
        options.latitude,
        options.longitude,
        left.gps.latitude,
        left.gps.longitude,
      );
      const rightDistance = calculateDistanceMeters(
        options.latitude,
        options.longitude,
        right.gps.latitude,
        right.gps.longitude,
      );

      return leftDistance - rightDistance;
    });
};

export const fetchReportDetail = async (reportId: string): Promise<ReportDetail> => {
  const response = await api.get<BackendReport>(`/reports/${encodeURIComponent(reportId)}`);
  return mapBackendReportToMobileReportDetail(response);
};

const getFileNameFromUri = (uri: string): string => {
  const cleanUri = uri.split('?')[0];
  return cleanUri.substring(cleanUri.lastIndexOf('/') + 1) || `road-damage-${Date.now()}.jpg`;
};

const getMimeTypeFromUri = (uri: string): string => {
  const lowerUri = uri.toLowerCase();

  if (lowerUri.endsWith('.png')) {
    return 'image/png';
  }

  if (lowerUri.endsWith('.webp')) {
    return 'image/webp';
  }

  return 'image/jpeg';
};

const appendPhotoToFormData = (formData: FormData, photoUri: string): void => {
  formData.append('image', {
    uri: photoUri,
    name: getFileNameFromUri(photoUri),
    type: getMimeTypeFromUri(photoUri),
  } as unknown as Blob);
};

const appendGpsToFormData = (formData: FormData, gps: GpsLocation): void => {
  formData.append('latitude', String(gps.latitude));
  formData.append('longitude', String(gps.longitude));
  formData.append('gps_accuracy', String(gps.accuracy));
  formData.append('location_source', gps.source ?? 'camera_gps');
  formData.append('location_recorded_at', gps.capturedAt);
};

export const submitRoadDamageReport = async (
  payload: NewReportPayload,
  options: SubmitReportOptions = {},
): Promise<Report> => {
  const formData = new FormData();

  appendPhotoToFormData(formData, payload.photoUri);
  appendGpsToFormData(formData, payload.gps);
  formData.append('note', payload.note?.trim() ?? '');
  if (payload.previewToken?.trim()) {
    formData.append('preview_token', payload.previewToken.trim());
  }

  const response = await api.post<BackendReport, FormData>('/reports', formData, {
    onUploadProgress: (event) => {
      if (!event.total) {
        return;
      }

      const progress = Math.round((event.loaded / event.total) * 100);
      options.onUploadProgress?.(Math.min(100, Math.max(0, progress)));
    },
  });

  return mapBackendReportToMobileReport(response);
};

export const previewRoadDamageDetection = async (
  photoUri: string,
): Promise<ReportAiResult> => {
  const formData = new FormData();
  appendPhotoToFormData(formData, photoUri);

  const response = await api.post<BackendAiResult, FormData>(
    '/reports/preview-ai',
    formData,
  );

  return mapBackendAiResult(response);
};
