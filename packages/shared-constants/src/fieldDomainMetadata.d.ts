export type DomainOption = {
  key: string;
  value: string;
  label: string;
  color: string;
  backgroundColor: string;
  borderColor?: string;
  shortLabel?: string;
  code?: string;
  filterLabel?: string;
};

export const ROAD_DAMAGE_TYPE_OPTIONS: DomainOption[];
export const ROAD_DAMAGE_FILTER_OPTIONS: Array<{ value: string; label: string }>;
export const FIELD_ENGINEER_SEVERITY_OPTIONS: DomainOption[];
export const FIELD_ENGINEER_PRIORITY_OPTIONS: DomainOption[];
export const FIELD_WORKFLOW_OPTIONS: DomainOption[];
export const FIELD_WORKFLOW_FILTER_OPTIONS: Array<{ value: string; label: string }>;

export function getRoadDamageTypeOption(value: string): DomainOption | null;
export function getFieldSeverityMeta(value: string): DomainOption | null;
export function getFieldPriorityMeta(value: string): DomainOption | null;
export function getFieldWorkflowMeta(value: string): DomainOption | null;
export function getRoadDamageTypeColor(value: string): string;
