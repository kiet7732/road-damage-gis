import L from 'leaflet';
import { DAMAGE_TYPES, getStatusColor } from '../constants/statusColors';

export const DEFAULT_ZOOM = 12;
export const MIN_ZOOM = 6;
export const MAX_ZOOM = 18;
export const MIN_VISIBLE_ZOOM = 12;
export const VIEWPORT_DEBOUNCE_MS = 550;
export const CLUSTER_STATUS_ORDER = ['pending', 'processing', 'repaired'];
export const COLLISION_THRESHOLD_PX = 38;
export const DETAIL_ZOOM = 16;

export const createPointIcon = (status, damageType, isSelected = false) => {
  const tone = getStatusColor(status);
  const damageTone = DAMAGE_TYPES[damageType] || DAMAGE_TYPES.D40;
  const width = isSelected ? 30 : 26;
  const height = isSelected ? 38 : 34;
  const anchorX = width / 2;
  const anchorY = height - 2;
  const ring = isSelected ? '0 0 0 8px rgba(7, 93, 187, 0.18),' : '';

  return L.divIcon({
    className: 'road-admin-gis-marker',
    html: `
      <div style="
        position: relative;
        width: ${width}px;
        height: ${height}px;
        transform: ${isSelected ? 'scale(1.08)' : 'scale(1)'};
        transition: transform 120ms ease;
      ">
        <div style="
          position: absolute;
          inset: 0;
          clip-path: path('M 15 34 C 12 29, 2 22, 2 14 C 2 6.5, 8 1, 15 1 C 22 1, 28 6.5, 28 14 C 28 22, 18 29, 15 34 Z');
          background: ${tone.text};
          box-shadow: ${ring} 0 8px 20px rgba(15, 23, 42, 0.30);
        "></div>
        <div style="
          position: absolute;
          left: 50%;
          top: 47%;
          transform: translate(-50%, -50%);
          width: ${isSelected ? 16 : 14}px;
          height: ${isSelected ? 16 : 14}px;
          border-radius: 999px;
          background: ${damageTone.color};
          border: 3px solid #ffffff;
          box-sizing: border-box;
        "></div>
        <div style="
          position: absolute;
          right: ${isSelected ? '1px' : '0px'};
          top: ${isSelected ? '2px' : '3px'};
          width: ${isSelected ? 9 : 8}px;
          height: ${isSelected ? 9 : 8}px;
          border-radius: 999px;
          background: #ffffff;
          border: 2px solid ${tone.text};
          box-sizing: border-box;
        "></div>
      </div>
    `,
    iconSize: [width, height],
    iconAnchor: [anchorX, anchorY],
    popupAnchor: [0, -18],
  });
};

export const createClusterIcon = (count, dominantStatus) => {
  const tone = getStatusColor(dominantStatus);

  return L.divIcon({
    className: 'road-admin-gis-cluster',
    html: `
      <div style="
        width: 40px;
        height: 40px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        background: ${tone.text};
        color: #ffffff;
        border: 3px solid #ffffff;
        font-size: 13px;
        font-weight: 900;
        box-shadow: 0 8px 20px rgba(15, 23, 42, 0.26);
        transition: transform 140ms ease, box-shadow 140ms ease;
      ">${count}</div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -14],
  });
};

export function summarizeClusterStatuses(items) {
  const counts = (items || []).reduce((accumulator, item) => {
    const status = item?.status || 'pending';
    accumulator[status] = (accumulator[status] || 0) + 1;
    return accumulator;
  }, {});

  const dominantStatus =
    CLUSTER_STATUS_ORDER.reduce((bestStatus, status) => {
      if (!bestStatus) {
        return status;
      }

      return (counts[status] || 0) > (counts[bestStatus] || 0) ? status : bestStatus;
    }, null) || 'pending';

  return {
    dominantStatus,
    counts,
  };
}

export function projectToPixel(lat, lng, zoom) {
  const sinY = Math.sin((lat * Math.PI) / 180);
  const clampedSinY = Math.min(Math.max(sinY, -0.9999), 0.9999);
  const scale = 256 * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const y = (0.5 - Math.log((1 + clampedSinY) / (1 - clampedSinY)) / (4 * Math.PI)) * scale;
  return { x, y };
}

export function pixelDistance(lat1, lng1, lat2, lng2, zoom) {
  const p1 = projectToPixel(lat1, lng1, zoom);
  const p2 = projectToPixel(lat2, lng2, zoom);
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function buildScreenClusters(points, zoom) {
  if (zoom < MIN_VISIBLE_ZOOM || !Array.isArray(points) || points.length === 0) {
    return [];
  }

  if (zoom >= DETAIL_ZOOM) {
    const coordCounts = new Map();
    return points.map((point) => {
      const latVal = Number(point.latitude);
      const lngVal = Number(point.longitude);
      const key = `${latVal.toFixed(6)}:${lngVal.toFixed(6)}`;
      const index = coordCounts.get(key) || 0;
      coordCounts.set(key, index + 1);

      let lat = latVal;
      let lng = lngVal;
      if (index > 0) {
        const angle = (index * 2 * Math.PI) / 6;
        const offset = 0.00004;
        lat += Math.sin(angle) * offset;
        lng += Math.cos(angle) * offset;
      }

      return {
        type: 'point',
        id: point.id,
        latitude: lat,
        longitude: lng,
        status: point.status,
        damage_type: point.damage_type,
        count: 1,
        items: [point],
      };
    });
  }

  const clusters = [];

  for (const point of points) {
    const lat = Number(point.latitude);
    const lng = Number(point.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }

    let minDistance = Infinity;
    let targetIndex = -1;

    for (let i = 0; i < clusters.length; i++) {
      const existing = clusters[i];
      const dist = pixelDistance(lat, lng, existing.latitude, existing.longitude, zoom);
      if (dist <= COLLISION_THRESHOLD_PX && dist < minDistance) {
        minDistance = dist;
        targetIndex = i;
      }
    }

    if (targetIndex >= 0) {
      const target = clusters[targetIndex];
      const targetCount = target.items.length;
      const newTotalCount = targetCount + 1;

      target.latitude = (target.latitude * targetCount + lat) / newTotalCount;
      target.longitude = (target.longitude * targetCount + lng) / newTotalCount;
      target.items.push(point);
      target.type = 'cluster';
      target.count = newTotalCount;
      target.id = `cluster-${target.items[0].id}-${newTotalCount}`;
    } else {
      clusters.push({
        type: 'point',
        id: point.id,
        latitude: lat,
        longitude: lng,
        status: point.status,
        damage_type: point.damage_type,
        count: 1,
        items: [point],
      });
    }
  }

  return clusters;
}
