export const ROADGIS_REPORT_EVENT = 'roadgis:report-event';

export const MAP_RELEVANT_EVENT_TYPES = new Set([
  'report_created',
  'report_manual_review_required',
  'engineer_assigned',
  'engineer_inspection_updated',
  'report_status_updated',
  'report_damage_type_updated',
]);

export function isRealtimeReportEventRelevant(eventType) {
  if (typeof eventType !== 'string') {
    return false;
  }

  return MAP_RELEVANT_EVENT_TYPES.has(eventType.trim());
}

export function normalizeRealtimeReportEvent(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const eventType =
    typeof payload.event_type === 'string'
      ? payload.event_type.trim()
      : typeof payload.type === 'string'
        ? payload.type.trim()
        : '';

  if (!eventType) {
    return null;
  }

  return {
    eventId:
      typeof payload.event_id === 'string'
        ? payload.event_id
        : typeof payload.id === 'string'
          ? payload.id
          : `${eventType}:${payload.report_id ?? 'unknown'}:${payload.updated_at ?? 'na'}`,
    eventType,
    reportId: payload.report_id ?? null,
    reporterUserId: payload.reporter_user_id ?? null,
    engineerUserId: payload.engineer_user_id ?? null,
    status: payload.status ?? null,
    correctedDamageType: payload.corrected_damage_type ?? null,
    aiStatus: payload.ai_status ?? null,
    inspectionStatus: payload.inspection_status ?? null,
    updatedAt: payload.updated_at ?? null,
    latitude: Number.isFinite(Number(payload.latitude)) ? Number(payload.latitude) : null,
    longitude: Number.isFinite(Number(payload.longitude)) ? Number(payload.longitude) : null,
    raw: payload,
  };
}
