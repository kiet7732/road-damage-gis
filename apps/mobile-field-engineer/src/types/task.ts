import type {
  EngineerTask,
  EngineerTaskScope,
  EngineerHistoryBucket,
  EngineerCheckInPayload,
  EngineerSurveyPayload,
  EngineerSurveyAttachmentPayload,
  EngineerTaskSemanticMeta,
  EngineerTaskHistoryMeta,
  EngineerTaskActionKey,
} from '../services/engineerReportService';

export type {
  EngineerTask,
  EngineerTaskScope,
  EngineerHistoryBucket,
  EngineerCheckInPayload,
  EngineerSurveyPayload,
  EngineerSurveyAttachmentPayload,
  EngineerTaskSemanticMeta,
  EngineerTaskHistoryMeta,
  EngineerTaskActionKey,
};

export type TaskAdministrativeFilter = {
  ward?: string | null;
  district?: string | null;
  roadName?: string | null;
};
