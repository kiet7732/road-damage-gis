export const DISTRICT_CENTERS = {
  'Quận 1': { latitude: 10.7756, longitude: 106.7019, zoom: 15 },
  'Quận 3': { latitude: 10.7844, longitude: 106.6844, zoom: 15 },
  'Quận 4': { latitude: 10.7600, longitude: 106.7030, zoom: 15 },
  'Quận 5': { latitude: 10.7554, longitude: 106.6669, zoom: 15 },
  'Quận 6': { latitude: 10.7472, longitude: 106.6350, zoom: 15 },
  'Quận 7': { latitude: 10.7340, longitude: 106.7217, zoom: 14 },
  'Quận 8': { latitude: 10.7240, longitude: 106.6286, zoom: 14 },
  'Quận 10': { latitude: 10.7719, longitude: 106.6675, zoom: 15 },
  'Quận 11': { latitude: 10.7674, longitude: 106.6508, zoom: 15 },
  'Quận 12': { latitude: 10.8672, longitude: 106.6410, zoom: 13 },
  'Quận Bình Thạnh': { latitude: 10.8106, longitude: 106.7091, zoom: 14 },
  'Quận Gò Vấp': { latitude: 10.8387, longitude: 106.6653, zoom: 14 },
  'Quận Phú Nhuận': { latitude: 10.7992, longitude: 106.6803, zoom: 15 },
  'Quận Tân Bình': { latitude: 10.8015, longitude: 106.6526, zoom: 14 },
  'Quận Tân Phú': { latitude: 10.7900, longitude: 106.6282, zoom: 14 },
  'Thành phố Thủ Đức': { latitude: 10.8494, longitude: 106.7537, zoom: 13 },
  'Thành phố Thủ Dầu Một': { latitude: 10.9805, longitude: 106.6719, zoom: 14 },
  'Thủ Dầu Một': { latitude: 10.9805, longitude: 106.6719, zoom: 14 },
  'Thành phố Thuận An': { latitude: 10.9234, longitude: 106.7015, zoom: 14 },
  'Thuận An': { latitude: 10.9234, longitude: 106.7015, zoom: 14 },
  'Thành phố Dĩ An': { latitude: 10.9069, longitude: 106.7725, zoom: 14 },
  'Dĩ An': { latitude: 10.9069, longitude: 106.7725, zoom: 14 },
  'Thị xã Bến Cát': { latitude: 11.1352, longitude: 106.6074, zoom: 13 },
  'Bến Cát': { latitude: 11.1352, longitude: 106.6074, zoom: 13 },
  'Thành phố Tân Uyên': { latitude: 11.0664, longitude: 106.7621, zoom: 13 },
  'Tân Uyên': { latitude: 11.0664, longitude: 106.7621, zoom: 13 },
};

export const DEFAULT_FILTERS = {
  status: '',
  damageType: '',
  periodDays: '',
};

export const SELECTED_REPORT_FOCUS_ZOOM = 16;
export const MAP_REALTIME_REFRESH_DEBOUNCE_MS = 900;
export const BOUNDS_EPSILON = 0.00005;

export const zoomToBounds = (center, zoom) => {
  const step = zoom <= 10 ? 0.08 : zoom <= 12 ? 0.04 : zoom <= 14 ? 0.018 : 0.009;

  return {
    southWest: {
      lat: center.latitude - step,
      lng: center.longitude - step,
    },
    northEast: {
      lat: center.latitude + step,
      lng: center.longitude + step,
    },
  };
};

export const normalizeBounds = (bbox) => {
  if (!Array.isArray(bbox) || bbox.length < 4) {
    return null;
  }

  const [minLongitude, minLatitude, maxLongitude, maxLatitude] = bbox.map(Number);

  if (
    ![minLongitude, minLatitude, maxLongitude, maxLatitude].every((value) => Number.isFinite(value)) ||
    minLongitude > maxLongitude ||
    minLatitude > maxLatitude
  ) {
    return null;
  }

  return {
    southWest: {
      lat: minLatitude,
      lng: minLongitude,
    },
    northEast: {
      lat: maxLatitude,
      lng: maxLongitude,
    },
  };
};

export const areBoundsEffectivelyEqual = (left, right) => {
  if (!left || !right) {
    return left === right;
  }

  const values = [
    left?.southWest?.lat,
    left?.southWest?.lng,
    left?.northEast?.lat,
    left?.northEast?.lng,
    right?.southWest?.lat,
    right?.southWest?.lng,
    right?.northEast?.lat,
    right?.northEast?.lng,
  ];

  if (!values.every((value) => Number.isFinite(value))) {
    return false;
  }

  return (
    Math.abs(left.southWest.lat - right.southWest.lat) < BOUNDS_EPSILON &&
    Math.abs(left.southWest.lng - right.southWest.lng) < BOUNDS_EPSILON &&
    Math.abs(left.northEast.lat - right.northEast.lat) < BOUNDS_EPSILON &&
    Math.abs(left.northEast.lng - right.northEast.lng) < BOUNDS_EPSILON
  );
};
