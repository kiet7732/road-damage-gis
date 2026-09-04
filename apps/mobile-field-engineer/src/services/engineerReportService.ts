import { api, ApiClientError, getApiBaseURL } from '../../../../packages/api-client/src';
import { getFieldEngineerUiLabel, getFieldWorkflowStatus } from '../../../../packages/shared-constants/src/engineerLabels';
import { normalizeRoadDamagePublicStatus, getRoadDamageType } from '../../../../packages/shared-constants/src/roadDamage';
import type { DamageTypeCode, ReportStatus } from '../../../../packages/mobile-shared/src/theme';
import type { Report } from '../../../../packages/mobile-shared/src/roadDamageTypes';

type BackendDamageDetection = {
  damage_type?: string | null;
  class_name?: string | null;
  confidence?: number | null;
};

type BackendAiResult = {
  detections?: BackendDamageDetection[];
  detections_count?: number;
  message?: string | null;
};

type BackendEngineerAttachment = {
  id: string;
  file_url: string;
  original_filename?: string | null;
  content_type?: string | null;
  note?: string | null;
  created_at: string;
};

type BackendEngineerReport = {
  id: string;
  image_url?: string | null;
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
  assigned_engineer_id?: string | null;
  assigned_engineer_name?: string | null;
  claimed_by_engineer_id?: string | null;
  claimed_by_engineer_name?: string | null;
  claimed_at?: string | null;
  claim_expires_at?: string | null;
  claim_status?: string | null;
  claim_source?: string | null;
  field_status?: string | null;
  survey_started_at?: string | null;
  survey_completed_at?: string | null;
  field_verified_damage_type?: string | null;
  field_severity?: string | null;
  field_priority?: string | null;
  field_note?: string | null;
  field_checked_in_latitude?: number | null;
  field_checked_in_longitude?: number | null;
  field_checked_in_at?: string | null;
  field_checked_in_accuracy?: number | null;
  field_checked_in_distance_meters?: number | null;
  field_checkin_quality?: string | null;
  field_checkin_warning_code?: string | null;
  history_bucket?: string | null;
  history_at?: string | null;
  can_claim?: boolean;
  can_release_claim?: boolean;
  can_check_in?: boolean;
  can_submit_survey?: boolean;
  attachments?: BackendEngineerAttachment[];
};

type BackendEngineerReportListResponse = {
  items?: BackendEngineerReport[];
  total?: number;
};

export type EngineerTaskScope = 'available' | 'assigned' | 'in_progress' | 'surveyed' | 'history';
export type EngineerHistoryBucket = 'submitted' | 'revoked' | 'completed';

export type EngineerTask = Report & {
  fieldStatus: string;
  fieldStatusLabel: string;
  aiSummary: string;
  aiSuggestedDamageLabel?: string | null;
  aiDetectionCount: number;
  assignedEngineerName?: string | null;
  claimedByEngineerName?: string | null;
  claimExpiresAt?: string | null;
  claimedAt?: string | null;
  claimStatus?: string | null;
  canClaim: boolean;
  canReleaseClaim: boolean;
  canCheckIn: boolean;
  canSubmitSurvey: boolean;
  distanceToReportMeters?: number | null;
  checkedInAt?: string | null;
  checkedInLatitude?: number | null;
  checkedInLongitude?: number | null;
  checkedInAccuracy?: number | null;
  checkinQuality?: string | null;
  checkinWarningCode?: string | null;
  historyBucket?: EngineerHistoryBucket | null;
  historyAt?: string | null;
  surveyStartedAt?: string | null;
  surveyCompletedAt?: string | null;
  fieldVerifiedDamageType?: DamageTypeCode | null;
  fieldSeverity?: string | null;
  fieldPriority?: string | null;
  fieldNote?: string | null;
  attachments: BackendEngineerAttachment[];
};

export type EngineerCheckInPayload = {
  latitude: number;
  longitude: number;
  gpsAccuracy: number;
  source?: string;
};

export type EngineerSurveyPayload = {
  verifiedDamageType?: DamageTypeCode | null;
  severity?: string;
  priority?: string;
  note?: string;
  submit?: boolean;
};

export type EngineerSurveyAttachmentPayload = {
  photoUri: string;
  note?: string;
};

type EngineerTaskListResult = {
  items: EngineerTask[];
  total: number;
};

export type EngineerTaskSemanticMeta = {
  label: string;
  timestampLabel: string;
  timestampValue: string;
};

export type EngineerTaskHistoryMeta = EngineerTaskSemanticMeta & {
  tone: 'info' | 'success' | 'warning' | 'danger';
};

export type EngineerTaskActionKey = 'claim' | 'release_claim' | 'check_in' | 'submit_survey' | 'upload_attachment';

const DAMAGE_TYPE_MAP: Record<string, DamageTypeCode> = {
  D00: 'D00',
  D10: 'D10',
  D20: 'D20',
  D40: 'D40',
};

const DEFAULT_REGION_DELTA = {
  latitudeDelta: 0.009,
  longitudeDelta: 0.009,
};

const UNKNOWN_DAMAGE_LABEL = 'Hư hỏng chưa xác định';

const getDamageType = (damageType?: string | null): DamageTypeCode =>
  DAMAGE_TYPE_MAP[String(damageType || '').trim().toUpperCase()] ?? 'D40';

const getDamageTypeDisplayLabel = (damageType?: string | null): string | null => {
  const normalized = String(damageType || '').trim().toUpperCase();
  return getRoadDamageType(DAMAGE_TYPE_MAP[normalized] ?? 'D40').label ?? null;
};

const getPublicStatus = (status?: string | null): ReportStatus =>
  normalizeRoadDamagePublicStatus(String(status || '')) as ReportStatus;

const normalizeTitleText = (value?: string | null): string =>
  String(value || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const buildReportTitle = (report: BackendEngineerReport): string => {
  const effectiveDamageType =
    report.field_verified_damage_type ||
    report.corrected_damage_type ||
    report.ai_result?.detections?.[0]?.damage_type ||
    null;
  const damageLabel =
    getDamageTypeDisplayLabel(effectiveDamageType) ||
    normalizeTitleText(report.ai_result?.detections?.[0]?.class_name) ||
    UNKNOWN_DAMAGE_LABEL;
  const description = normalizeTitleText(report.note) || getFieldEngineerUiLabel('taskTitleDescriptionFallback');

  return `${damageLabel} - ${description}`;
};

const buildAiSummary = (report: BackendEngineerReport): string => {
  const message = normalizeTitleText(report.ai_result?.message);
  if (message) {
    return message;
  }

  const detectionLabel =
    getDamageTypeDisplayLabel(report.ai_result?.detections?.[0]?.damage_type) ||
    normalizeTitleText(report.ai_result?.detections?.[0]?.class_name);

  if (detectionLabel) {
    return `${getFieldEngineerUiLabel('aiSummaryPrefix')} ${detectionLabel}.`;
  }

  if (String(report.ai_status || '').trim().toLowerCase() === 'manual_review_required') {
    return getFieldEngineerUiLabel('aiUnresolvedSummary');
  }

  return getFieldEngineerUiLabel('noData');
};

const formatDateTime = (value?: string | null): string => {
  if (!value) {
    return 'Chưa có dữ liệu';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const buildImageUrl = (imageUrl?: string | null): string | undefined => {
  if (!imageUrl) {
    return undefined;
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  const backendOrigin = getApiBaseURL().replace(/\/api\/?$/i, '');
  const normalizedPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  return `${backendOrigin}${normalizedPath}`;
};

const getFileNameFromUri = (uri: string): string => {
  const cleanUri = uri.split('?')[0];
  return cleanUri.substring(cleanUri.lastIndexOf('/') + 1) || `engineer-survey-${Date.now()}.jpg`;
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

const appendPhotoToFormData = (formData: FormData, fieldName: string, photoUri: string): void => {
  formData.append(fieldName, {
    uri: photoUri,
    name: getFileNameFromUri(photoUri),
    type: getMimeTypeFromUri(photoUri),
  } as unknown as Blob);
};

const mapBackendReportToEngineerTask = (report: BackendEngineerReport): EngineerTask => {
  const effectiveDamageType =
    report.field_verified_damage_type ||
    report.corrected_damage_type ||
    report.ai_result?.detections?.[0]?.damage_type ||
    null;
  const fieldStatus = String(report.field_status || 'available_for_inspection').trim().toLowerCase();
  const fieldMeta = getFieldWorkflowStatus(fieldStatus);

  return {
    id: report.id,
    title: buildReportTitle(report),
    address: `Tọa độ: ${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}`,
    status: getPublicStatus(report.status),
    type: getDamageType(effectiveDamageType),
    createdAt: formatDateTime(report.created_at),
    createdAtRaw: report.created_at,
    updatedAt: formatDateTime(report.updated_at),
    updatedAtRaw: report.updated_at,
    photoUri: buildImageUrl(report.image_url),
    note: report.note,
    aiStatus: report.ai_status,
    aiSummary: buildAiSummary(report),
    aiSuggestedDamageLabel:
      getDamageTypeDisplayLabel(report.ai_result?.detections?.[0]?.damage_type) ||
      normalizeTitleText(report.ai_result?.detections?.[0]?.class_name) ||
      null,
    aiDetectionCount: Number(report.ai_result?.detections_count) || report.ai_result?.detections?.length || 0,
    confidence: report.ai_result?.detections?.[0]?.confidence ?? null,
    gps: {
      latitude: report.latitude,
      longitude: report.longitude,
      accuracy: report.gps_accuracy ?? 0,
      capturedAt: report.location_recorded_at || report.created_at,
      source: report.location_source?.trim().toLowerCase() === 'map_selected' ? 'map_selected' : 'camera_gps',
    },
    fieldStatus,
    fieldStatusLabel: fieldMeta?.label || getFieldWorkflowStatus('available_for_inspection')?.label || getFieldEngineerUiLabel('taskListAvailableSectionTitle'),
    assignedEngineerName: report.assigned_engineer_name || null,
    claimedByEngineerName: report.claimed_by_engineer_name || null,
    claimExpiresAt: report.claim_expires_at,
    claimedAt: report.claimed_at,
    claimStatus: report.claim_status,
    canClaim: Boolean(report.can_claim),
    canReleaseClaim: Boolean(report.can_release_claim),
    canCheckIn: Boolean(report.can_check_in),
    canSubmitSurvey: Boolean(report.can_submit_survey),
    distanceToReportMeters: report.field_checked_in_distance_meters,
    checkedInAt: report.field_checked_in_at,
    checkedInLatitude: report.field_checked_in_latitude,
    checkedInLongitude: report.field_checked_in_longitude,
    checkedInAccuracy: report.field_checked_in_accuracy,
    checkinQuality: report.field_checkin_quality,
    checkinWarningCode: report.field_checkin_warning_code,
    historyBucket: report.history_bucket
      ? (String(report.history_bucket).trim().toLowerCase() as EngineerTask['historyBucket'])
      : null,
    historyAt: report.history_at || null,
    surveyStartedAt: report.survey_started_at,
    surveyCompletedAt: report.survey_completed_at,
    fieldVerifiedDamageType: report.field_verified_damage_type
      ? getDamageType(report.field_verified_damage_type)
      : null,
    fieldSeverity: report.field_severity,
    fieldPriority: report.field_priority,
    fieldNote: report.field_note,
    attachments: Array.isArray(report.attachments)
      ? report.attachments.map((attachment) => ({
          ...attachment,
          file_url: buildImageUrl(attachment.file_url) || attachment.file_url,
        }))
      : [],
  };
};

const getListErrorMessage = (error: unknown): string => {
  if (error instanceof ApiClientError) {
    if (error.code === 'NETWORK_ERROR') {
      return 'Không thể kết nối tới hệ thống. Vui lòng kiểm tra mạng rồi thử lại.';
    }
    if (error.code === 'TIMEOUT_ERROR') {
      return 'Hệ thống phản hồi chậm. Vui lòng thử lại sau ít phút.';
    }
    if (error.status === 403) {
      return 'Tài khoản hiện tại không có quyền dùng ứng dụng kỹ sư hiện trường.';
    }
    return error.message || getFieldEngineerUiLabel('taskListLoadError');
  }

  return getFieldEngineerUiLabel('taskListLoadError');
};

async function fetchEngineerScope(scope: EngineerTaskScope, limit = 50): Promise<EngineerTaskListResult> {
  const response = await api.get<BackendEngineerReportListResponse>(`/engineer/reports/${scope.replace('_', '-')}`, {
    params: {
      limit,
      offset: 0,
    },
    suppressGlobalError: true,
  });

  const items = Array.isArray(response?.items) ? response.items.map(mapBackendReportToEngineerTask) : [];

  return {
    items,
    total: Number(response?.total) || items.length,
  };
}

export async function fetchEngineerTaskBuckets() {
  const [available, assigned, inProgress, surveyed] = await Promise.all([
    fetchEngineerScope('available', 1),
    fetchEngineerScope('assigned', 1),
    fetchEngineerScope('in_progress', 1),
    fetchEngineerHistory(1),
  ]);

  return {
    availableTotal: available.total,
    assignedTotal: assigned.total,
    inProgressTotal: inProgress.total,
    surveyedTotal: surveyed.total,
  };
}

export async function fetchEngineerTasksByScope(scope: EngineerTaskScope, limit = 50): Promise<EngineerTaskListResult> {
  try {
    if (scope === 'surveyed') {
      const items = await fetchEngineerHistoryTasks(limit);
      return {
        items,
        total: items.length,
      };
    }

    return await fetchEngineerScope(scope, limit);
  } catch (error) {
    throw new Error(getListErrorMessage(error));
  }
}

export async function fetchEngineerMapTasks(): Promise<EngineerTask[]> {
  try {
    const [available, assigned, inProgress] = await Promise.all([
      fetchEngineerScope('available', 100),
      fetchEngineerScope('assigned', 100),
      fetchEngineerScope('in_progress', 100),
    ]);

    const merged = new Map<string, EngineerTask>();
    [...available.items, ...assigned.items, ...inProgress.items].forEach((item) => {
      merged.set(item.id, item);
    });

    return Array.from(merged.values());
  } catch (error) {
    throw new Error(getListErrorMessage(error));
  }
}

export async function fetchEngineerHistoryTasks(limit = 100): Promise<EngineerTask[]> {
  const result = await fetchEngineerHistory(limit);
  return result.items;
}

async function fetchEngineerHistory(limit = 100): Promise<EngineerTaskListResult> {
  try {
    return await fetchEngineerScope('history', limit);
  } catch (error) {
    throw new Error(getListErrorMessage(error));
  }
}

export async function fetchEngineerTaskDetail(reportId: string): Promise<EngineerTask> {
  try {
    const response = await api.get<BackendEngineerReport>(`/engineer/reports/${reportId}`, {
      suppressGlobalError: true,
    });
    return mapBackendReportToEngineerTask(response);
  } catch (error) {
    throw new Error(getListErrorMessage(error));
  }
}

export async function claimEngineerTask(reportId: string): Promise<EngineerTask> {
  try {
    const response = await api.post<BackendEngineerReport>(`/engineer/reports/${reportId}/claim`, undefined, {
      suppressGlobalError: true,
    });
    return mapBackendReportToEngineerTask(response);
  } catch (error) {
    throw new Error(getListErrorMessage(error));
  }
}

export async function releaseEngineerTaskClaim(reportId: string): Promise<EngineerTask> {
  try {
    const response = await api.post<BackendEngineerReport>(`/engineer/reports/${reportId}/release-claim`, undefined, {
      suppressGlobalError: true,
    });
    return mapBackendReportToEngineerTask(response);
  } catch (error) {
    throw new Error(getListErrorMessage(error));
  }
}

export async function checkInEngineerTask(
  reportId: string,
  payload: EngineerCheckInPayload,
): Promise<EngineerTask> {
  try {
    const response = await api.post<BackendEngineerReport>(`/engineer/reports/${reportId}/check-in`, {
      latitude: payload.latitude,
      longitude: payload.longitude,
      gps_accuracy: payload.gpsAccuracy,
      source: payload.source ?? 'gps_live',
    }, {
      suppressGlobalError: true,
    });
    return mapBackendReportToEngineerTask(response);
  } catch (error) {
    throw new Error(getListErrorMessage(error));
  }
}

export async function updateEngineerSurvey(
  reportId: string,
  payload: EngineerSurveyPayload,
): Promise<EngineerTask> {
  try {
    const response = await api.patch<BackendEngineerReport>(`/engineer/reports/${reportId}/survey`, {
      verified_damage_type: payload.verifiedDamageType ?? null,
      severity: payload.severity?.trim() || null,
      priority: payload.priority?.trim() || null,
      note: payload.note?.trim() || null,
      submit: Boolean(payload.submit),
    }, {
      suppressGlobalError: true,
    });
    return mapBackendReportToEngineerTask(response);
  } catch (error) {
    throw new Error(getListErrorMessage(error));
  }
}

export async function uploadEngineerSurveyAttachment(
  reportId: string,
  payload: EngineerSurveyAttachmentPayload,
): Promise<BackendEngineerAttachment[]> {
  try {
    const formData = new FormData();
    appendPhotoToFormData(formData, 'files', payload.photoUri);
    formData.append('note', payload.note?.trim() || '');

    const response = await api.post<{ items?: BackendEngineerAttachment[] }, FormData>(
      `/engineer/reports/${reportId}/survey-attachments`,
      formData,
      {
        suppressGlobalError: true,
      },
    );

    return Array.isArray(response?.items) ? response.items : [];
  } catch (error) {
    throw new Error(getListErrorMessage(error));
  }
}

export function buildEngineerFocusRegion(task: EngineerTask) {
  return {
    latitude: task.gps.latitude,
    longitude: task.gps.longitude,
    ...DEFAULT_REGION_DELTA,
  };
}

const getDisplayDate = (value?: string | null): string => formatDateTime(value || null);

export function getEngineerTaskSemanticMeta(
  task: EngineerTask,
  scope: EngineerTaskScope,
): EngineerTaskSemanticMeta {
  if (scope === 'surveyed') {
    return getEngineerHistorySemanticMeta(task);
  }

  if (scope === 'in_progress') {
    if (task.checkedInAt) {
      return {
        label: getFieldEngineerUiLabel('taskMetaInProgressCheckedIn'),
        timestampLabel: getFieldEngineerUiLabel('historyTimestampPrefix'),
        timestampValue: getDisplayDate(task.checkedInAt),
      };
    }

    if (task.surveyStartedAt) {
      return {
        label: getFieldEngineerUiLabel('taskMetaInProgressStarted'),
        timestampLabel: getFieldEngineerUiLabel('historyTimestampPrefix'),
        timestampValue: getDisplayDate(task.surveyStartedAt),
      };
    }

    return {
      label: getFieldEngineerUiLabel('taskMetaInProgressHolding'),
      timestampLabel: getFieldEngineerUiLabel('historyTimestampPrefix'),
      timestampValue: getDisplayDate(task.claimedAt || task.createdAtRaw),
    };
  }

  if (scope === 'assigned') {
    if (task.claimedAt) {
      return {
        label: getFieldEngineerUiLabel('taskMetaAssignedClaimed'),
        timestampLabel: getFieldEngineerUiLabel('historyTimestampPrefix'),
        timestampValue: getDisplayDate(task.claimedAt),
      };
    }

    return {
      label: getFieldEngineerUiLabel('taskMetaAssignedWaiting'),
      timestampLabel: getFieldEngineerUiLabel('historyTimestampPrefix'),
      timestampValue: getDisplayDate(task.createdAtRaw),
    };
  }

  return {
    label: getFieldEngineerUiLabel('taskMetaAvailableOpen'),
    timestampLabel: getFieldEngineerUiLabel('historyTimestampPrefix'),
    timestampValue: getDisplayDate(task.createdAtRaw),
  };
}

export function getEngineerHistorySemanticMeta(task: EngineerTask): EngineerTaskHistoryMeta {
  const bucket = task.historyBucket || 'submitted';
  if (bucket === 'completed') {
    return {
      label: getFieldEngineerUiLabel('historyBucketCompleted'),
      timestampLabel: getFieldEngineerUiLabel('historyBucketCompletedAt'),
      timestampValue: getDisplayDate(task.historyAt || task.updatedAtRaw),
      tone: 'success',
    };
  }

  if (bucket === 'revoked') {
    return {
      label: getFieldEngineerUiLabel('historyBucketRevoked'),
      timestampLabel: getFieldEngineerUiLabel('historyBucketRevokedAt'),
      timestampValue: getDisplayDate(task.historyAt || task.updatedAtRaw),
      tone: 'danger',
    };
  }

  return {
    label: getFieldEngineerUiLabel('historyBucketSubmitted'),
    timestampLabel: getFieldEngineerUiLabel('historyBucketSubmittedAt'),
    timestampValue: getDisplayDate(task.historyAt || task.surveyCompletedAt || task.updatedAtRaw),
    tone: 'info',
  };
}

export function canUploadEngineerAttachment(task: EngineerTask): boolean {
  return Boolean(
    task.canReleaseClaim ||
    task.canCheckIn ||
    task.canSubmitSurvey ||
    task.checkedInAt ||
    task.surveyStartedAt ||
    task.surveyCompletedAt,
  );
}

export function getEngineerTaskActionBlockReason(
  task: EngineerTask,
  action: EngineerTaskActionKey,
): string | null {
  switch (action) {
    case 'claim':
      if (task.canClaim) {
        return null;
      }
      if (task.claimedByEngineerName) {
        return `${task.claimedByEngineerName} đang giữ quyền kiểm tra điểm này.`;
      }
      if (task.assignedEngineerName) {
        return `Điểm này đang được phân công cho ${task.assignedEngineerName}.`;
      }
      return 'Điểm này hiện chưa thể nhận kiểm tra.';
    case 'release_claim':
      return task.canReleaseClaim ? null : 'Bạn không còn quyền hủy nhận kiểm tra cho điểm này.';
    case 'check_in':
      return task.canCheckIn ? null : 'Bạn cần nhận kiểm tra trước khi check-in hiện trường.';
    case 'submit_survey':
      if (!task.checkedInAt) {
        return getFieldEngineerUiLabel('surveySubmitBlockedNoCheckin');
      }
      if (!task.canSubmitSurvey) {
        return 'Bạn chưa đủ điều kiện gửi khảo sát hoàn chỉnh cho điểm này.';
      }
      return null;
    case 'upload_attachment':
      return canUploadEngineerAttachment(task)
        ? null
        : 'Hãy nhận kiểm tra hoặc check-in hiện trường trước khi tải ảnh bổ sung.';
    default:
      return null;
  }
}
