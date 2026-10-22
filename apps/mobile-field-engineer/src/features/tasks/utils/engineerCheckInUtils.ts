import type * as Location from 'expo-location';

export const MAX_GPS_ACCURACY_METERS = 25;
export const DISTANCE_OK_METERS = 30;

export type LivePositionState = {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
  distanceMeters: number;
  quality: 'valid' | 'invalid';
  warningText: string | null;
  isMocked: boolean;
};

export function calculateDistanceMeters(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
): number {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLatitude = toRadians(toLatitude - fromLatitude);
  const deltaLongitude = toRadians(toLongitude - fromLongitude);
  const fromLatitudeRadians = toRadians(fromLatitude);
  const toLatitudeRadians = toRadians(toLatitude);

  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(fromLatitudeRadians) * Math.cos(toLatitudeRadians) * Math.sin(deltaLongitude / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function getCheckinQuality(distanceMeters: number, gpsAccuracy: number): 'valid' | 'invalid' {
  if (distanceMeters <= DISTANCE_OK_METERS && gpsAccuracy <= MAX_GPS_ACCURACY_METERS) {
    return 'valid';
  }

  return 'invalid';
}

export function getCheckinWarningText(distanceMeters: number, gpsAccuracy: number): string | null {
  if (distanceMeters > DISTANCE_OK_METERS) {
    return `Từ chối thao tác: Bạn đang cách điểm hư hỏng ${Math.round(
      distanceMeters,
    )}m (vượt quá bán kính cho phép 30m). Vui lòng di chuyển đến gần vị trí hư hỏng để tiếp tục.`;
  }

  if (gpsAccuracy > MAX_GPS_ACCURACY_METERS) {
    return `Độ chính xác GPS hiện tại là ±${Math.round(
      gpsAccuracy,
    )}m, vượt ngưỡng cho phép ±${MAX_GPS_ACCURACY_METERS}m. Vui lòng đợi tín hiệu GPS ổn định hơn.`;
  }

  return null;
}

export function buildLivePositionState(
  coords: Location.LocationObjectCoords,
  isMocked: boolean,
  targetGps?: { latitude: number; longitude: number } | null,
): LivePositionState {
  const distance = targetGps
    ? calculateDistanceMeters(coords.latitude, coords.longitude, targetGps.latitude, targetGps.longitude)
    : 0;
  const quality = getCheckinQuality(distance, coords.accuracy ?? 0);
  const warningText = getCheckinWarningText(distance, coords.accuracy ?? 0);

  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: Math.round(coords.accuracy ?? 0),
    capturedAt: new Date().toISOString(),
    distanceMeters: distance,
    quality,
    warningText,
    isMocked,
  };
}
