import { DAMAGE_TYPES } from '../constants/statusColors';

export function getAiPredictedDamageType(report) {
  const detections = report?.ai_result?.detections;
  const firstDetection = Array.isArray(detections) && detections.length > 0 ? detections[0] : null;
  return firstDetection?.damage_type || report?.damage_type || 'D40';
}

export function getEffectiveDamageType(report) {
  return report?.corrected_damage_type || report?.damage_type || getAiPredictedDamageType(report);
}

export function getAiPredictedDamageTypeLabel(report) {
  const damageType = getAiPredictedDamageType(report);
  return DAMAGE_TYPES[damageType]?.label || 'Chưa xác định';
}

export function getEffectiveDamageTypeLabel(report) {
  const damageType = getEffectiveDamageType(report);
  return DAMAGE_TYPES[damageType]?.label || 'Chưa xác định';
}

export function getPrimaryConfidence(report) {
  const mapConfidence = Number(report?.confidence);
  if (Number.isFinite(mapConfidence)) {
    return Math.round(mapConfidence * 100);
  }

  const detections = report?.ai_result?.detections;
  const firstDetection = Array.isArray(detections) && detections.length > 0 ? detections[0] : null;
  const confidence = Number(firstDetection?.confidence);

  if (!Number.isFinite(confidence)) {
    return '';
  }

  return Math.round(confidence * 100);
}
