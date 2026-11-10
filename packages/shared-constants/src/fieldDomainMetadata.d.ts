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
  levelNumber?: number;
  thresholdText?: string;
  technicalDescription?: string;
  citizenSummary?: string;
  aliases?: string[];
};

export type PriorityTopDetectionData = {
  damageType: string;
  damageLabel: string;
  className: string;
  confidence: number;
  confidencePercent: number;
};

export type PriorityAssessmentData = {
  score: number;
  scorePercent: number;
  levelCode: 'level_1' | 'level_2' | 'level_3' | 'level_4' | 'unrated';
  levelNumber: number | null;
  levelLabel: string;
  shortLabel: string;
  thresholdText: string;
  formulaText: string;
  technicalDescription: string;
  citizenSummary: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  topDetections: PriorityTopDetectionData[];
  totalDetectionsCount: number;
  distinctDamageTypes: string[];
  effectiveLevelCode: 'level_1' | 'level_2' | 'level_3' | 'level_4' | 'unrated';
  effectiveLevelNumber: number | null;
  effectiveLevelLabel: string;
  effectiveShortLabel: string;
  isFieldVerified: boolean;
};

export const ROAD_DAMAGE_TYPE_OPTIONS: DomainOption[];
export const ROAD_DAMAGE_FILTER_OPTIONS: Array<{ value: string; label: string }>;
export const FIELD_ENGINEER_SEVERITY_OPTIONS: DomainOption[];
export const PRIORITY_LEVEL_METADATA: Record<'level_1' | 'level_2' | 'level_3' | 'level_4', DomainOption>;
export const FIELD_ENGINEER_PRIORITY_OPTIONS: DomainOption[];
export const PRIORITY_FILTER_OPTIONS: Array<{ value: string; label: string }>;
export const FIELD_WORKFLOW_OPTIONS: DomainOption[];
export const FIELD_WORKFLOW_FILTER_OPTIONS: Array<{ value: string; label: string }>;

export function getRoadDamageTypeOption(value: string): DomainOption | null;
export function getFieldSeverityMeta(value: string): DomainOption | null;
export function getFieldPriorityMeta(value: string): DomainOption | null;
export function classifyPriorityScore(score: number, totalDetections: number): 'level_1' | 'level_2' | 'level_3' | 'level_4' | 'unrated';
export function computePriorityAssessment(reportOrAiResult: unknown, explicitFieldPriority?: string | null): PriorityAssessmentData;
export function getFieldWorkflowMeta(value: string): DomainOption | null;
export function getRoadDamageTypeColor(value: string): string;
