import statusRuntimeData from './statusRuntime.json' with { type: 'json' };

export const ROAD_DAMAGE_STATUS = statusRuntimeData.publicStatus;
export const REPORT_PUBLIC_STATUS_ALIASES = statusRuntimeData.publicStatusAliases;
export const FIELD_WORKFLOW_STATUS = statusRuntimeData.fieldWorkflowStatus;
export const FIELD_ENGINEER_ACTION_LABELS = statusRuntimeData.engineerActionLabels;
export const FIELD_ENGINEER_ADMIN_LABELS = statusRuntimeData.engineerAdminLabels;
export const FIELD_ENGINEER_CHECKIN_LABELS = statusRuntimeData.engineerCheckinLabels;
export const FIELD_ENGINEER_UI_LABELS = statusRuntimeData.engineerUiLabels;
export const FIELD_ENGINEER_DETAIL_LABELS = statusRuntimeData.engineerDetailLabels;
export const FIELD_ENGINEER_CLAIM_STATE_LABELS = statusRuntimeData.engineerClaimStateLabels;
export const FIELD_ENGINEER_TIMELINE_LABELS = statusRuntimeData.engineerTimelineLabels;
export const REPORTER_PROCESSING_UPDATES = statusRuntimeData.reporterProcessingUpdates;

export function normalizeRoadDamagePublicStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  return REPORT_PUBLIC_STATUS_ALIASES[normalized] ?? 'new';
}

export function getRoadDamageStatus(status) {
  const publicStatus = normalizeRoadDamagePublicStatus(status);
  return ROAD_DAMAGE_STATUS[publicStatus] ?? ROAD_DAMAGE_STATUS.new;
}

export function getPublicStatusLabel(status) {
  return getRoadDamageStatus(status).label;
}

export function getPublicStatusShortLabel(status) {
  return getRoadDamageStatus(status).shortLabel;
}

export function getFieldWorkflowStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  return FIELD_WORKFLOW_STATUS[normalized] ?? null;
}

export function isFieldWorkflowStatus(status) {
  return Boolean(getFieldWorkflowStatus(status));
}

export function getFieldEngineerActionLabel(actionType) {
  const normalized = String(actionType || '').trim().toLowerCase();
  return FIELD_ENGINEER_ACTION_LABELS[normalized] ?? 'Cập nhật hiện trường';
}

export function getFieldEngineerAdminLabel(key) {
  const normalized = String(key || '').trim();
  return FIELD_ENGINEER_ADMIN_LABELS[normalized] ?? 'Điều phối hiện trường';
}

export function getFieldEngineerCheckinLabel(key) {
  const normalized = String(key || '').trim().toLowerCase();
  return FIELD_ENGINEER_CHECKIN_LABELS[normalized] ?? 'Kiểm tra vị trí hiện trường';
}

export function getFieldEngineerUiLabel(key) {
  const normalized = String(key || '').trim();
  return FIELD_ENGINEER_UI_LABELS[normalized] ?? 'Điều phối hiện trường';
}

export function getFieldEngineerDetailLabel(key) {
  const normalized = String(key || '').trim();
  return FIELD_ENGINEER_DETAIL_LABELS[normalized] ?? 'Thông tin hiện trường';
}

export function getFieldEngineerClaimStateLabel(key) {
  const normalized = String(key || '').trim();
  return FIELD_ENGINEER_CLAIM_STATE_LABELS[normalized] ?? 'Trạng thái hiện trường';
}

export function getFieldEngineerTimelineLabel(key) {
  const normalized = String(key || '').trim();
  return FIELD_ENGINEER_TIMELINE_LABELS[normalized] ?? 'có cập nhật hiện trường vào lúc';
}

export function getReporterProcessingUpdate(status) {
  const normalizedStatus = normalizeRoadDamagePublicStatus(status);
  return (
    REPORTER_PROCESSING_UPDATES[normalizedStatus] ??
    REPORTER_PROCESSING_UPDATES.default
  );
}
