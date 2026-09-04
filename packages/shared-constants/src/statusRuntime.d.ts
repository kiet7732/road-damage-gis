export type RoadDamageStatusKey = 'new' | 'pending' | 'processing' | 'repaired' | 'rejected';
export type FieldWorkflowStatusKey =
  | 'available_for_inspection'
  | 'inspection_claimed'
  | 'inspection_in_progress'
  | 'survey_completed'
  | 'awaiting_admin_review';
export type FieldEngineerActionKey =
  | 'claim'
  | 'release_claim'
  | 'check_in'
  | 'save_survey_draft'
  | 'submit_survey'
  | 'upload_attachment'
  | 'assign_engineer'
  | 'reassign_engineer'
  | 'revoke_engineer';
export type FieldEngineerAdminLabelKey =
  | 'sectionTitle'
  | 'sectionDescription'
  | 'assignedEngineer'
  | 'activeClaim'
  | 'latestCheckin'
  | 'distanceToReport'
  | 'lockExpiresAt'
  | 'timeline'
  | 'assign'
  | 'reassign'
  | 'revoke';
export type FieldEngineerCheckinLabelKey = 'valid' | 'warning' | 'invalid' | 'distance_warning';
export type FieldEngineerUiLabelKey =
  | 'assignedPlaceholder'
  | 'activeClaimPlaceholder'
  | 'latestCheckin'
  | 'claimPending'
  | 'releasePending'
  | 'claimExpired'
  | 'claimExpiresAtPrefix'
  | 'surveyStartedAtPrefix'
  | 'surveyCompletedAtPrefix'
  | 'surveyNotStarted'
  | 'surveyTitle'
  | 'checkInScreenTitle'
  | 'checkinWarningTitle'
  | 'checkinInvalidTitle';

export const ROAD_DAMAGE_STATUS: Record<
  RoadDamageStatusKey,
  {
    key: RoadDamageStatusKey;
    label: string;
    shortLabel: string;
    color: string;
    backgroundColor: string;
    borderColor: string;
    mobileIcon: string;
    webIcon: string;
  }
>;

export const REPORT_PUBLIC_STATUS_ALIASES: Record<string, RoadDamageStatusKey>;

export const FIELD_WORKFLOW_STATUS: Record<
  FieldWorkflowStatusKey,
  {
    key: FieldWorkflowStatusKey;
    label: string;
    shortLabel: string;
    color: string;
    backgroundColor: string;
    borderColor: string;
  }
>;

export const FIELD_ENGINEER_ACTION_LABELS: Record<FieldEngineerActionKey, string>;
export const FIELD_ENGINEER_ADMIN_LABELS: Record<FieldEngineerAdminLabelKey, string>;
export const FIELD_ENGINEER_CHECKIN_LABELS: Record<FieldEngineerCheckinLabelKey, string>;
export const FIELD_ENGINEER_UI_LABELS: Record<FieldEngineerUiLabelKey, string>;

export const REPORTER_PROCESSING_UPDATES: Record<
  string,
  {
    title: string;
    description: string;
  }
>;

export function normalizeRoadDamagePublicStatus(status: string): RoadDamageStatusKey;
export function getRoadDamageStatus(status: string): typeof ROAD_DAMAGE_STATUS[RoadDamageStatusKey];
export function getPublicStatusLabel(status: string): string;
export function getPublicStatusShortLabel(status: string): string;
export function getFieldWorkflowStatus(
  status: string,
): (typeof FIELD_WORKFLOW_STATUS)[FieldWorkflowStatusKey] | null;
export function isFieldWorkflowStatus(status: string): boolean;
export function getFieldEngineerActionLabel(actionType: string): string;
export function getFieldEngineerAdminLabel(key: string): string;
export function getFieldEngineerCheckinLabel(key: string): string;
export function getFieldEngineerUiLabel(key: string): string;
export function getReporterProcessingUpdate(
  status: string,
): {
  title: string;
  description: string;
};
