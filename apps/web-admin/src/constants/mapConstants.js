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
  'Thành phố Bến Cát': { latitude: 11.1352, longitude: 106.6074, zoom: 13 },
  'Bến Cát': { latitude: 11.1352, longitude: 106.6074, zoom: 13 },
  'Thành phố Tân Uyên': { latitude: 11.0664, longitude: 106.7621, zoom: 13 },
  'Tân Uyên': { latitude: 11.0664, longitude: 106.7621, zoom: 13 },
  'Huyện Bàu Bàng': { latitude: 11.2421, longitude: 106.6345, zoom: 12 },
  'Huyện Bắc Tân Uyên': { latitude: 11.1512, longitude: 106.8421, zoom: 12 },
  'Huyện Dầu Tiếng': { latitude: 11.2815, longitude: 106.3652, zoom: 12 },
  'Huyện Phú Giáo': { latitude: 11.2925, longitude: 106.7982, zoom: 12 },
};

export const PROVINCE_CENTERS = {
  'Bình Dương': {
    latitude: 11.1604,
    longitude: 106.6719,
    zoom: 10,
    bbox: [106.330, 10.865, 106.968, 11.498],
  },
  'Tỉnh Bình Dương': {
    latitude: 11.1604,
    longitude: 106.6719,
    zoom: 10,
    bbox: [106.330, 10.865, 106.968, 11.498],
  },
  'TP. Hồ Chí Minh': {
    latitude: 10.7769,
    longitude: 106.7009,
    zoom: 10,
    bbox: [106.356, 10.376, 107.018, 11.160],
  },
  'Thành phố Hồ Chí Minh': {
    latitude: 10.7769,
    longitude: 106.7009,
    zoom: 10,
    bbox: [106.356, 10.376, 107.018, 11.160],
  },
  'Đồng Nai': {
    latitude: 10.9574,
    longitude: 106.8427,
    zoom: 10,
    bbox: [106.762, 10.582, 107.575, 11.581],
  },
  'Bà Rịa - Vũng Tàu': {
    latitude: 10.5417,
    longitude: 107.2429,
    zoom: 10,
    bbox: [107.018, 10.320, 107.585, 10.805],
  },
  'Hà Nội': {
    latitude: 21.0285,
    longitude: 105.8542,
    zoom: 10,
    bbox: [105.285, 20.564, 106.020, 21.385],
  },
  'Đà Nẵng': {
    latitude: 16.0544,
    longitude: 108.2022,
    zoom: 11,
    bbox: [107.912, 15.918, 108.338, 16.215],
  },
  'Cần Thơ': {
    latitude: 10.0452,
    longitude: 105.7469,
    zoom: 10,
    bbox: [105.375, 9.920, 105.845, 10.325],
  },
  'Hải Phòng': {
    latitude: 20.8449,
    longitude: 106.6881,
    zoom: 10,
    bbox: [106.480, 20.560, 107.080, 21.015],
  },
};

export const PROVINCE_BOUNDARIES_FALLBACK = {
  'Bình Dương': {
    type: 'FeatureCollection',
    province: 'Bình Dương',
    display_name: 'Tỉnh Bình Dương',
    road_management_authority: 'Sở Xây dựng / Sở GTVT Tỉnh Bình Dương & Khu Quản lý đường bộ IV',
    center: { latitude: 11.1604, longitude: 106.6719, zoom: 10 },
    bbox: [106.330, 10.865, 106.968, 11.498],
    features: [
      {
        type: 'Feature',
        properties: {
          name: 'Bình Dương',
          display_name: 'Tỉnh Bình Dương',
          admin_level: 'province',
          road_authority: 'Sở Xây dựng / Sở GTVT Tỉnh Bình Dương & Khu Quản lý đường bộ IV',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [106.352, 11.432],
              [106.445, 11.485],
              [106.565, 11.498],
              [106.685, 11.472],
              [106.825, 11.425],
              [106.935, 11.345],
              [106.968, 11.215],
              [106.942, 11.095],
              [106.865, 10.998],
              [106.812, 10.925],
              [106.792, 10.878],
              [106.735, 10.865],
              [106.662, 10.892],
              [106.615, 10.952],
              [106.555, 11.028],
              [106.462, 11.112],
              [106.365, 11.218],
              [106.330, 11.325],
              [106.352, 11.432],
            ],
          ],
        },
      },
    ],
  },
  'TP. Hồ Chí Minh': {
    type: 'FeatureCollection',
    province: 'TP. Hồ Chí Minh',
    display_name: 'Thành phố Hồ Chí Minh',
    road_management_authority: 'Sở Giao thông công chánh TP. Hồ Chí Minh & Khu Quản lý đường bộ IV',
    center: { latitude: 10.7769, longitude: 106.7009, zoom: 10 },
    bbox: [106.356, 10.376, 107.018, 11.160],
    features: [
      {
        type: 'Feature',
        properties: {
          name: 'TP. Hồ Chí Minh',
          display_name: 'Thành phố Hồ Chí Minh',
          admin_level: 'province',
          road_authority: 'Sở Giao thông công chánh TP. Hồ Chí Minh & Khu Quản lý đường bộ IV',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [106.356, 11.160],
              [106.482, 11.142],
              [106.588, 11.055],
              [106.662, 10.892],
              [106.768, 10.885],
              [106.855, 10.895],
              [106.892, 10.795],
              [106.968, 10.665],
              [107.018, 10.515],
              [106.955, 10.376],
              [106.815, 10.412],
              [106.725, 10.555],
              [106.635, 10.625],
              [106.512, 10.682],
              [106.435, 10.798],
              [106.382, 10.965],
              [106.356, 11.160],
            ],
          ],
        },
      },
    ],
  },
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
