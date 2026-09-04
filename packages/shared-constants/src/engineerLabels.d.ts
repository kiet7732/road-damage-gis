export type FieldWorkflowStatusKey =
  | 'available_for_inspection'
  | 'inspection_claimed'
  | 'inspection_in_progress'
  | 'survey_completed'
  | 'awaiting_admin_review'
  | 'repair_in_progress'
  | 'awaiting_acceptance'
  | 'completed';

export type FieldEngineerActionKey =
  | 'claim'
  | 'release_claim'
  | 'check_in'
  | 'save_survey_draft'
  | 'submit_survey'
  | 'upload_attachment';

export type FieldEngineerAdminLabelKey =
  | 'assign'
  | 'reassign'
  | 'revoke'
  | 'timeline'
  | 'assignedEngineer'
  | 'activeClaim'
  | 'latestCheckin'
  | 'distanceToReport'
  | 'fieldStatus'
  | 'claimAt'
  | 'lockExpiresAt'
  | 'checkinAccuracy'
  | 'surveyProgress'
  | 'fieldEvidence'
  | 'dispatchSection'
  | 'claimOwner'
  | 'claimSource'
  | 'dispatchEngineer'
  | 'dispatchHint'
  | 'engineerListLoading'
  | 'engineerSelectPlaceholder'
  | 'refresh'
  | 'refreshing'
  | 'timelineEmpty'
  | 'activeClaimProgress'
  | 'lockInactive'
  | 'lockUntilPrefix'
  | 'claimMissing'
  | 'unassigned'
  | 'noClaimOwner';

export type FieldEngineerCheckinLabelKey =
  | 'valid'
  | 'warning'
  | 'invalid'
  | 'distance_warning'
  | 'accuracy_warning'
  | 'distanceTooFar'
  | 'distanceFarButAllowed'
  | 'accuracyTooLowPrefix'
  | 'accuracyThresholdPrefix'
  | 'statusLabel'
  | 'distanceLabel'
  | 'accuracyLabel'
  | 'devicePositionLabel';

export type FieldEngineerUiLabelKey =
  | 'checkInScreenTitle'
  | 'latestCheckin'
  | 'claimPending'
  | 'releasePending'
  | 'checkinWarningTitle'
  | 'checkinInvalidTitle'
  | 'assignedPlaceholder'
  | 'activeClaimPlaceholder'
  | 'claimExpired'
  | 'claimExpiresAtPrefix'
  | 'surveyTitle'
  | 'surveyCompletedAtPrefix'
  | 'surveyStartedAtPrefix'
  | 'surveyNotStarted'
  | 'engineerRoleTitle'
  | 'engineerRoleDescription'
  | 'engineerRoleMismatch'
  | 'engineerRoleNoAccess'
  | 'engineerRoleVerifyFailed'
  | 'engineerLoginPending'
  | 'engineerLoginAction'
  | 'engineerAppBootstrapError'
  | 'engineerAppOpenError'
  | 'engineerProfileSubtitle'
  | 'historyTitle'
  | 'historySubtitle'
  | 'historyEmpty'
  | 'mapTaskOpen'
  | 'mapHeaderTitle'
  | 'mapHeaderSubtitle'
  | 'mapEmptyTitle'
  | 'mapTaskEmpty'
  | 'mapClaimOwned'
  | 'mapClaimOtherPrefix'
  | 'mapClaimOtherSuffix'
  | 'mapInternalFlow'
  | 'mapLoadError'
  | 'mapLoading'
  | 'mapLegendShow'
  | 'mapLegendHide'
  | 'mapLegendSummary'
  | 'mapActionOpenDetail'
  | 'mapActionFocus'
  | 'mapActionOpenSurvey'
  | 'mapActionOpenSurveyDetail'
  | 'mapSelectionAddressFallback'
  | 'mapPrimaryHintAvailable'
  | 'mapPrimaryHintAssigned'
  | 'mapPrimaryHintCheckin'
  | 'mapPrimaryHintSurvey'
  | 'mapPrimaryHintSurveyCompleted'
  | 'taskTitleDescriptionFallback'
  | 'aiUnresolvedSummary'
  | 'noData'
  | 'loadingSurvey'
  | 'surveyOpenError'
  | 'surveyOpenErrorDescription'
  | 'surveyScreenTitle'
  | 'surveyScreenDescription'
  | 'surveyPointLabel'
  | 'surveyFieldStatusLabel'
  | 'surveyOriginalImageTitle'
  | 'surveyOriginalImageCaption'
  | 'surveyLocationSection'
  | 'surveyGpsLabel'
  | 'surveyDistanceLabel'
  | 'surveyCheckinStateLabel'
  | 'surveyCheckedInAtPrefix'
  | 'surveyNotCheckedIn'
  | 'surveyOpenCheckin'
  | 'surveyRecheckin'
  | 'surveyCheckinHelper'
  | 'surveySubmitBlockedNoCheckin'
  | 'surveySubmitBlockedIncomplete'
  | 'surveyDraftAllowedHint'
  | 'surveyAiSection'
  | 'surveyAiSuggestionLabel'
  | 'surveyConfidenceLabel'
  | 'surveyQuickSummaryLabel'
  | 'surveyUnknownDamage'
  | 'surveyDamageTypeSection'
  | 'surveySeveritySection'
  | 'surveyPrioritySection'
  | 'surveyNoteSection'
  | 'surveyNotePlaceholder'
  | 'surveySavePending'
  | 'surveySaveDraft'
  | 'surveySubmitPending'
  | 'surveySubmit'
  | 'surveyAttachmentsOpen'
  | 'checkinLoadError'
  | 'checkinPermissionRequired'
  | 'checkinSubmitError'
  | 'checkinLoading'
  | 'checkinOpenError'
  | 'checkinOpenErrorDescription'
  | 'checkinScreenDescription'
  | 'checkinPointLabel'
  | 'checkinCapturedAtPrefix'
  | 'checkinRefreshPending'
  | 'checkinRefresh'
  | 'checkinSubmitPending'
  | 'checkinSubmit'
  | 'checkinBackToDetail'
  | 'taskDetailSurveySubmitted'
  | 'taskDetailSurveyDraftSaved'
  | 'taskDetailClaimUntilPrefix'
  | 'taskDetailSurveySection'
  | 'taskDetailSurveyProgressLabel'
  | 'taskDetailCheckinLabel'
  | 'taskDetailCheckedIn'
  | 'taskDetailNotCheckedIn'
  | 'taskDetailOpenSurvey'
  | 'taskListTitle'
  | 'taskListInProgressEmpty';

export type FieldEngineerDetailLabelKey =
  | 'claimAtPrefix'
  | 'lockPrefix'
  | 'lockNotActive'
  | 'checkinQuality'
  | 'checkinCoordinates'
  | 'distanceAccuracy'
  | 'checkinWarningPrefix'
  | 'fieldNoteTitle'
  | 'anonymousReporter'
  | 'noNote';

export type FieldEngineerClaimStateLabelKey =
  | 'expiredAction'
  | 'genericUpdate'
  | 'alreadyOwned'
  | 'expired'
  | 'inactive'
  | 'noFieldStatus'
  | 'noCheckin'
  | 'noSurvey'
  | 'claimedByPrefix'
  | 'selfClaimSource'
  | 'adminAssignSource';

export type FieldEngineerTimelineLabelKey =
  | 'assignDescriptionSuffix'
  | 'reassignDescriptionSuffix'
  | 'revokeDescriptionSuffix'
  | 'claimDescriptionPrefix'
  | 'claimDescriptionFallback'
  | 'releaseDescriptionSuffix'
  | 'expiredDescriptionSuffix'
  | 'checkinDescriptionPrefix'
  | 'checkinAccuracyPrefix'
  | 'draftDescriptionSuffix'
  | 'submitDescriptionSuffix'
  | 'attachmentDescriptionSuffix'
  | 'genericDescriptionSuffix';

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
export const FIELD_ENGINEER_DETAIL_LABELS: Record<FieldEngineerDetailLabelKey, string>;
export const FIELD_ENGINEER_CLAIM_STATE_LABELS: Record<FieldEngineerClaimStateLabelKey, string>;
export const FIELD_ENGINEER_TIMELINE_LABELS: Record<FieldEngineerTimelineLabelKey, string>;

export function getFieldWorkflowStatus(
  status: string,
): (typeof FIELD_WORKFLOW_STATUS)[FieldWorkflowStatusKey] | null;
export function isFieldWorkflowStatus(status: string): boolean;
export function getFieldEngineerActionLabel(actionType: string): string;
export function getFieldEngineerAdminLabel(key: string): string;
export function getFieldEngineerCheckinLabel(key: string): string;
export function getFieldEngineerUiLabel(key: string): string;
export function getFieldEngineerDetailLabel(key: string): string;
export function getFieldEngineerClaimStateLabel(key: string): string;
export function getFieldEngineerTimelineLabel(key: string): string;
