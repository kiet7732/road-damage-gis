import { getStatusColor } from '../constants/statusColors';

export function formatDateTime(value) {
  if (!value) {
    return 'N/A';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parsed);
}

export function formatCoordinate(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return 'N/A';
  }

  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function formatAccuracy(value) {
  const accuracy = Number(value);
  if (!Number.isFinite(accuracy) || accuracy <= 0) {
    return 'N/A';
  }

  return `${Math.round(accuracy)}m`;
}

export function formatConfidence(value) {
  const confidence = Number(value);
  if (!Number.isFinite(confidence)) {
    return 'N/A';
  }

  return `${Math.round(confidence * 100)}%`;
}

export function getStatusLabel(status) {
  return getStatusColor(status).label;
}
