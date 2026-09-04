import { FIELD_WORKFLOW_STATUS, getFieldEngineerUiLabel, getFieldWorkflowStatus } from './engineerLabels.js';
import { getRoadDamageType, ROAD_DAMAGE_TYPES } from './roadDamage.js';

const normalizeValue = (value) => String(value || '').trim().toLowerCase();

export const ROAD_DAMAGE_TYPE_OPTIONS = Object.values(ROAD_DAMAGE_TYPES).map((item) => ({
  key: item.code,
  value: item.code,
  code: item.code,
  label: item.label,
  filterLabel: `${item.code} - ${item.label}`,
  color: item.color,
  backgroundColor: item.backgroundColor,
}));

export const ROAD_DAMAGE_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả loại hư hỏng' },
  ...ROAD_DAMAGE_TYPE_OPTIONS.map((item) => ({
    value: item.value,
    label: item.filterLabel,
  })),
];

export const FIELD_ENGINEER_SEVERITY_OPTIONS = [
  {
    key: 'light',
    value: getFieldEngineerUiLabel('surveySeverityLight'),
    label: getFieldEngineerUiLabel('surveySeverityLight'),
    color: '#047857',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  {
    key: 'medium',
    value: getFieldEngineerUiLabel('surveySeverityMedium'),
    label: getFieldEngineerUiLabel('surveySeverityMedium'),
    color: '#B45309',
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
  },
  {
    key: 'heavy',
    value: getFieldEngineerUiLabel('surveySeverityHeavy'),
    label: getFieldEngineerUiLabel('surveySeverityHeavy'),
    color: '#B91C1C',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
];

export const FIELD_ENGINEER_PRIORITY_OPTIONS = [
  {
    key: 'low',
    value: getFieldEngineerUiLabel('surveyPriorityLow'),
    label: getFieldEngineerUiLabel('surveyPriorityLow'),
    color: '#0F766E',
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  {
    key: 'medium',
    value: getFieldEngineerUiLabel('surveyPriorityMedium'),
    label: getFieldEngineerUiLabel('surveyPriorityMedium'),
    color: '#1D4ED8',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  {
    key: 'high',
    value: getFieldEngineerUiLabel('surveyPriorityHigh'),
    label: getFieldEngineerUiLabel('surveyPriorityHigh'),
    color: '#C2410C',
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
  },
  {
    key: 'urgent',
    value: getFieldEngineerUiLabel('surveyPriorityUrgent'),
    label: getFieldEngineerUiLabel('surveyPriorityUrgent'),
    color: '#BE123C',
    backgroundColor: '#FFF1F2',
    borderColor: '#FDA4AF',
  },
];

export const FIELD_WORKFLOW_OPTIONS = Object.values(FIELD_WORKFLOW_STATUS).map((item) => ({
  key: item.key,
  value: item.key,
  label: item.label,
  shortLabel: item.shortLabel,
  color: item.color,
  backgroundColor: item.backgroundColor,
  borderColor: item.borderColor,
}));

export const FIELD_WORKFLOW_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả hiện trường' },
  ...FIELD_WORKFLOW_OPTIONS.map((item) => ({
    value: item.value,
    label: item.label,
  })),
];

export function getRoadDamageTypeOption(value) {
  const normalized = String(value || '').trim().toUpperCase();
  return ROAD_DAMAGE_TYPE_OPTIONS.find((item) => item.value === normalized) ?? null;
}

export function getFieldSeverityMeta(value) {
  const normalized = normalizeValue(value);
  return (
    FIELD_ENGINEER_SEVERITY_OPTIONS.find(
      (item) => normalizeValue(item.value) === normalized || item.key === normalized,
    ) ?? null
  );
}

export function getFieldPriorityMeta(value) {
  const normalized = normalizeValue(value);
  return (
    FIELD_ENGINEER_PRIORITY_OPTIONS.find(
      (item) => normalizeValue(item.value) === normalized || item.key === normalized,
    ) ?? null
  );
}

export function getFieldWorkflowMeta(value) {
  return getFieldWorkflowStatus(value);
}

export function getRoadDamageTypeColor(value) {
  return getRoadDamageType(value).color;
}
