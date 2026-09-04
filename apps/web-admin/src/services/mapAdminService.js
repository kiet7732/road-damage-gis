import { ApiClientError, api, getApiBaseURL } from '../../../../packages/api-client/src';

const DEFAULT_MAP_LIMIT = 1000;

export const DEFAULT_GIS_CENTER = {
  latitude: 10.7769,
  longitude: 106.7009,
  zoom: 12,
};

export function getMapErrorMessage(error) {
  if (error instanceof ApiClientError) {
    if (error.code === 'NETWORK_ERROR') {
      return 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng rồi thử lại.';
    }

    if (error.code === 'TIMEOUT_ERROR') {
      return 'Máy chủ phản hồi chậm. Vui lòng thử lại sau ít phút.';
    }

    if (error.status === 401) {
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    }

    if (error.status === 403) {
      return 'Tài khoản hiện tại không có quyền xem bản đồ quản lý.';
    }

    if (error.status >= 500) {
      return 'Máy chủ đang tạm gián đoạn. Vui lòng thử lại sau.';
    }

    return error.message || 'Không thể tải dữ liệu bản đồ. Vui lòng thử lại.';
  }

  return 'Không thể tải dữ liệu bản đồ. Vui lòng thử lại.';
}

const mapGeoJsonFeatureToMapItem = (feature) => {
  const coordinates = feature?.geometry?.coordinates;
  const properties = feature?.properties;

  if (!coordinates || coordinates.length < 2 || !properties?.id) {
    return null;
  }

  const [longitude, latitude] = coordinates;

  return {
    id: properties.id,
    image_url: properties.image_url,
    latitude,
    longitude,
    gps_accuracy: properties.gps_accuracy,
    note: properties.note,
    status: properties.status,
    damage_type: properties.damage_type,
    damage_label: properties.damage_label,
    corrected_damage_type: properties.corrected_damage_type,
    is_ai_overridden: Boolean(properties.is_ai_overridden),
    confidence: properties.confidence,
    created_at: properties.created_at,
    updated_at: properties.updated_at,
  };
};

export async function fetchAdminReportsGis({
  status = '',
  damageType = '',
  periodDays = '',
  bounds = null,
  limit = DEFAULT_MAP_LIMIT,
} = {}) {
  const params = {
    limit,
  };

  if (status) {
    params.status = status;
  }

  if (damageType) {
    params.damage_type = damageType;
  }

  if (periodDays) {
    params.period_days = Number(periodDays);
  }

  if (bounds?.southWest && bounds?.northEast) {
    params.min_latitude = bounds.southWest.lat;
    params.max_latitude = bounds.northEast.lat;
    params.min_longitude = bounds.southWest.lng;
    params.max_longitude = bounds.northEast.lng;
  }

  const response = await api.get('/admin/gis/reports', { params });
  const features = Array.isArray(response?.features) ? response.features : [];
  const items = features
    .map(mapGeoJsonFeatureToMapItem)
    .filter(Boolean);

  return {
    items,
    total: Number.isFinite(response?.matched_total) ? response.matched_total : 0,
    bbox: response?.bbox || null,
    queryBBox: response?.query_bbox || null,
    pendingCount: Number.isFinite(response?.pending_count) ? response.pending_count : 0,
    processingCount: Number.isFinite(response?.processing_count) ? response.processing_count : 0,
    repairedCount: Number.isFinite(response?.repaired_count) ? response.repaired_count : 0,
    topDamageType: response?.top_damage_type || null,
    topDamageLabel: response?.top_damage_label || null,
  };
}

export function getMapImageUrl(imageUrl) {
  if (!imageUrl) {
    return '';
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  const apiBaseUrl = getApiBaseURL();
  const apiOrigin = apiBaseUrl.replace(/\/api\/?$/, '');

  return `${apiOrigin}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
}
