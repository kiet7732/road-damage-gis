import 'leaflet/dist/leaflet.css';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { FiClock, FiExternalLink, FiMapPin } from 'react-icons/fi';
import { DAMAGE_TYPES, getStatusColor, UI_COLORS } from '../constants/statusColors';
import { getMapImageUrl } from '../services/mapAdminService';
import { formatConfidence, formatDateTime } from '../utils/formatters';
import { getEffectiveDamageType, getEffectiveDamageTypeLabel } from '../utils/reportDamage';

const DEFAULT_ZOOM = 12;
const MIN_ZOOM = 6;
const MAX_ZOOM = 18;
const VIEWPORT_DEBOUNCE_MS = 550;
const CLUSTER_STATUS_ORDER = ['pending', 'processing', 'repaired'];

const createPointIcon = (status, damageType, isSelected = false) => {
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

const createClusterIcon = (count, dominantStatus) => {
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

function summarizeClusterStatuses(items) {
  const counts = items.reduce((accumulator, item) => {
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

function getClusterStep(zoom) {
  if (zoom <= 10) return 0.08;
  if (zoom <= 12) return 0.04;
  if (zoom <= 14) return 0.018;
  if (zoom <= 15) return 0.009;
  return 0;
}

function buildClusters(points, zoom) {
  const step = getClusterStep(zoom);
  if (!step) {
    return points.map((point) => ({
      type: 'point',
      id: point.id,
      latitude: point.latitude,
      longitude: point.longitude,
      items: [point],
    }));
  }

  const groups = new Map();

  points.forEach((point) => {
    const latKey = Math.floor(point.latitude / step);
    const lngKey = Math.floor(point.longitude / step);
    const key = `${latKey}:${lngKey}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(point);
  });

  return Array.from(groups.entries()).map(([key, items]) => {
    if (items.length === 1) {
      const [point] = items;
      return {
        type: 'point',
        id: point.id,
        latitude: point.latitude,
        longitude: point.longitude,
        items,
      };
    }

    const latitude = items.reduce((sum, item) => sum + item.latitude, 0) / items.length;
    const longitude = items.reduce((sum, item) => sum + item.longitude, 0) / items.length;

    return {
      type: 'cluster',
      id: `cluster-${key}`,
      latitude,
      longitude,
      items,
    };
  });
}

function MapViewportBridge({ center, zoom, onViewportChange, onZoomChange }) {
  const map = useMap();
  const initializedRef = useRef(false);
  const debounceTimerRef = useRef(null);
  const lastViewportSignatureRef = useRef('');
  const lastZoomRef = useRef(zoom);

  const emitViewportChange = () => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      const bounds = map.getBounds();
      const currentCenter = map.getCenter();
      const nextZoom = map.getZoom();
      const nextSignature = [
        currentCenter.lat.toFixed(5),
        currentCenter.lng.toFixed(5),
        nextZoom,
        bounds.getSouthWest().lat.toFixed(5),
        bounds.getSouthWest().lng.toFixed(5),
        bounds.getNorthEast().lat.toFixed(5),
        bounds.getNorthEast().lng.toFixed(5),
      ].join(':');

      if (lastViewportSignatureRef.current === nextSignature) {
        return;
      }

      lastViewportSignatureRef.current = nextSignature;

      onViewportChange?.({
        center: {
          latitude: currentCenter.lat,
          longitude: currentCenter.lng,
        },
        zoom: nextZoom,
        bounds: {
          southWest: {
            lat: bounds.getSouthWest().lat,
            lng: bounds.getSouthWest().lng,
          },
          northEast: {
            lat: bounds.getNorthEast().lat,
            lng: bounds.getNorthEast().lng,
          },
        },
      });

      if (lastZoomRef.current !== nextZoom) {
        lastZoomRef.current = nextZoom;
        onZoomChange?.(nextZoom);
      }
    }, VIEWPORT_DEBOUNCE_MS);
  };

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    map.setView([center.latitude, center.longitude], zoom, { animate: false });
    initializedRef.current = true;
    emitViewportChange();
  }, [center.latitude, center.longitude, map, zoom]);

  useMapEvents({
    moveend: emitViewportChange,
    zoomend: emitViewportChange,
  });

  useEffect(
    () => () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    },
    [],
  );

  return null;
}

function MapFocusBridge({ focusTarget, fitBoundsTarget }) {
  const map = useMap();
  const lastFocusedRef = useRef('');
  const lastFitRef = useRef('');
  const fitSignature = fitBoundsTarget?.nonce ? String(fitBoundsTarget.nonce) : '';
  const focusSignature = focusTarget?.id ? `${focusTarget.id}:${focusTarget.nonce ?? 0}` : '';

  useEffect(() => {
    if (
      !fitBoundsTarget?.bounds?.southWest ||
      !fitBoundsTarget?.bounds?.northEast ||
      lastFitRef.current === fitSignature
    ) {
      return;
    }

    map.fitBounds(
      [
        [fitBoundsTarget.bounds.southWest.lat, fitBoundsTarget.bounds.southWest.lng],
        [fitBoundsTarget.bounds.northEast.lat, fitBoundsTarget.bounds.northEast.lng],
      ],
      {
        padding: [44, 44],
        animate: true,
        duration: 0.45,
      },
    );
    lastFitRef.current = fitSignature;
  }, [fitBoundsTarget, fitSignature, map]);

  useEffect(() => {
    if (!focusTarget?.id || lastFocusedRef.current === focusSignature) {
      return;
    }

    map.setView([focusTarget.latitude, focusTarget.longitude], focusTarget.zoom ?? Math.max(map.getZoom(), 16), {
      animate: true,
    });
    lastFocusedRef.current = focusSignature;
  }, [focusTarget, focusSignature, map]);

  return null;
}

function ClusterMarker({ cluster, onOpenDetail, onSelectPoint }) {
  const map = useMap();
  const clusterSummary = useMemo(() => summarizeClusterStatuses(cluster.items), [cluster.items]);
  const statusEntries = CLUSTER_STATUS_ORDER.filter((status) => clusterSummary.counts[status]);

  return (
    <Marker
      position={[cluster.latitude, cluster.longitude]}
      icon={createClusterIcon(cluster.items.length, clusterSummary.dominantStatus)}
      eventHandlers={{
        click: () => {
          const latitudes = cluster.items.map((item) => item.latitude);
          const longitudes = cluster.items.map((item) => item.longitude);

          map.fitBounds(
            [
              [Math.min(...latitudes), Math.min(...longitudes)],
              [Math.max(...latitudes), Math.max(...longitudes)],
            ],
            {
              padding: [44, 44],
              animate: true,
              duration: 0.45,
              easeLinearity: 0.25,
              maxZoom: Math.max(map.getZoom() + 1, 15),
            },
          );
        },
      }}
    >
      <Popup>
        <div style={styles.clusterPopup}>
          <strong style={styles.popupTitle}>{cluster.items.length} vị trí trong cụm này</strong>
          <div style={styles.clusterSummaryRow}>
            {statusEntries.map((status) => {
              const tone = getStatusColor(status);

              return (
                <div
                  key={status}
                  style={{
                    ...styles.clusterSummaryChip,
                    color: tone.text,
                    background: tone.background,
                    borderColor: tone.border,
                  }}
                >
                  <span>{tone.label}</span>
                  <strong>{clusterSummary.counts[status]}</strong>
                </div>
              );
            })}
          </div>
          <div style={styles.clusterList}>
            {cluster.items.slice(0, 3).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectPoint?.(item);
                  map.setView([item.latitude, item.longitude], Math.max(map.getZoom(), 16), {
                    animate: true,
                  });
                }}
                style={styles.clusterItemButton}
              >
                <span style={styles.clusterItemTitle}>
                  {getEffectiveDamageType(item) || 'N/A'} - {item.damage_label || getEffectiveDamageTypeLabel(item)}
                </span>
                <span style={styles.clusterItemMeta}>
                  {getStatusColor(item.status).label} · {formatDateTime(item.created_at)}
                </span>
              </button>
            ))}
          </div>
          {cluster.items.length > 3 ? (
            <span style={styles.clusterHint}>Còn {cluster.items.length - 3} vị trí khác. Zoom thêm để tách cụm.</span>
          ) : null}
        </div>
      </Popup>
    </Marker>
  );
}

function WebGisMap({
  items = [],
  initialLoading = false,
  refreshing = false,
  error = '',
  center,
  zoom = DEFAULT_ZOOM,
  onViewportChange,
  onOpenDetail,
  onSelectPoint,
  selectedReportId = null,
  selectedReport = null,
  focusTarget = null,
  fitBoundsTarget = null,
}) {
  const safeItems = Array.isArray(items) ? items : [];
  const [activeZoom, setActiveZoom] = useState(zoom);
  const clusters = useMemo(() => buildClusters(safeItems, activeZoom), [safeItems, activeZoom]);
  return (
    <div className="road-admin-map-canvas" style={styles.mapCanvas}>
      <MapContainer
        center={[center.latitude, center.longitude]}
        zoom={zoom}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        scrollWheelZoom
        preferCanvas
        zoomAnimation={false}
        fadeAnimation={false}
        markerZoomAnimation={false}
        style={styles.mapContainer}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          updateWhenIdle
          updateWhenZooming={false}
          keepBuffer={6}
        />

        <MapViewportBridge
          center={center}
          zoom={zoom}
          onViewportChange={onViewportChange}
          onZoomChange={setActiveZoom}
        />
        <MapFocusBridge focusTarget={focusTarget} fitBoundsTarget={fitBoundsTarget} />

        {clusters.map((cluster) => {
          if (cluster.type === 'cluster') {
            return (
              <ClusterMarker
                key={cluster.id}
                cluster={cluster}
                onOpenDetail={onOpenDetail}
                onSelectPoint={onSelectPoint}
              />
            );
          }

          const point = cluster.items[0];
          const damageType = getEffectiveDamageType(point);
          return (
            <Marker
              key={point.id}
              position={[point.latitude, point.longitude]}
              icon={createPointIcon(point.status, damageType, point.id === selectedReportId)}
              eventHandlers={{
                click: () => onSelectPoint?.(point),
              }}
            />
          );
        })}
      </MapContainer>

      {initialLoading && safeItems.length === 0 ? (
        <div style={styles.overlayState}>
          <strong style={styles.overlayTitle}>Đang tải dữ liệu bản đồ...</strong>
        </div>
      ) : null}

      {!initialLoading && !refreshing && error ? (
        <div style={styles.overlayState}>
          <strong style={{ ...styles.overlayTitle, color: UI_COLORS.danger }}>Không tải được bản đồ</strong>
          <span style={styles.overlayDescription}>{error}</span>
        </div>
      ) : null}

      {!initialLoading && !error && safeItems.length === 0 ? (
        <div style={styles.overlayEmpty}>
          <div style={styles.emptyCard}>
            <strong style={styles.emptyTitle}>Không có vị trí hư hỏng phù hợp</strong>
            <span style={styles.emptyDescription}>Mở rộng vùng xem hoặc đổi bộ lọc.</span>
          </div>
        </div>
      ) : null}

      {refreshing && safeItems.length === 0 && !error ? (
        <div style={styles.refreshHint}>
          <span style={styles.refreshDot} />
          <span>Đang cập nhật</span>
        </div>
      ) : null}

      {selectedReport ? (
        <div style={styles.detailCard}>
          {selectedReport.image_url ? (
            <img
              src={getMapImageUrl(selectedReport.image_url)}
              alt={selectedReport.id}
              style={styles.detailImage}
            />
          ) : null}
          <div style={styles.detailBody}>
            <div style={styles.detailBadgeRow}>
              <span style={styles.detailDamageBadge}>
                {(getEffectiveDamageType(selectedReport) || 'N/A')} - {selectedReport.damage_label || getEffectiveDamageTypeLabel(selectedReport)}
              </span>
              <span
                style={{
                  ...styles.detailStatusBadge,
                  color: getStatusColor(selectedReport.status).text,
                  background: getStatusColor(selectedReport.status).background,
                  borderColor: getStatusColor(selectedReport.status).border,
                }}
              >
                {getStatusColor(selectedReport.status).label}
              </span>
            </div>
            <strong style={styles.detailTitle}>Vị trí hư hỏng đã chọn</strong>
            <div style={styles.detailMetaRow}>
              <span style={styles.detailMetaItem}>
                <FiClock size={14} />
                {formatDateTime(selectedReport.created_at)}
              </span>
              <span style={styles.detailMetaItem}>
                <FiMapPin size={14} />
                {formatConfidence(selectedReport.confidence)}
              </span>
            </div>
            {selectedReport.note?.trim() ? (
              <div style={styles.detailNote}>{selectedReport.note.trim()}</div>
            ) : null}
            <div style={styles.detailActions}>
              <button
                type="button"
                onClick={() => onOpenDetail?.(selectedReport.id)}
                style={styles.detailButton}
              >
                <FiExternalLink size={15} />
                Xem chi tiết
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default memo(WebGisMap);

const styles = {
  mapCanvas: {
    position: 'relative',
    display: 'flex',
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
    border: `1px solid ${UI_COLORS.border}`,
    borderRadius: 24,
    background: '#E5E7EB',
  },
  mapContainer: {
    width: '100%',
    height: '100%',
    minHeight: 0,
    background: '#E5E7EB',
  },
  overlayState: {
    position: 'absolute',
    inset: 20,
    zIndex: 700,
    display: 'grid',
    placeItems: 'center',
    alignContent: 'center',
    gap: 8,
    borderRadius: 18,
    background: 'rgba(255,255,255,0.90)',
    textAlign: 'center',
    padding: 20,
  },
  overlayTitle: {
    color: UI_COLORS.text,
    fontSize: 18,
    fontWeight: 900,
  },
  overlayDescription: {
    color: UI_COLORS.textMuted,
    fontSize: 14,
  },
  overlayEmpty: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 700,
    pointerEvents: 'none',
  },
  emptyCard: {
    minWidth: 260,
    maxWidth: 320,
    display: 'grid',
    gap: 2,
    padding: '10px 13px',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.94)',
    border: `1px solid ${UI_COLORS.border}`,
    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.12)',
    textAlign: 'center',
  },
  emptyTitle: {
    color: UI_COLORS.text,
    fontSize: 13,
    fontWeight: 900,
    lineHeight: 1.35,
  },
  emptyDescription: {
    color: UI_COLORS.textMuted,
    fontSize: 11,
    lineHeight: 1.35,
  },
  refreshHint: {
    position: 'absolute',
    top: 76,
    left: 16,
    zIndex: 680,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 11px',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.92)',
    border: `1px solid ${UI_COLORS.border}`,
    color: UI_COLORS.textMuted,
    fontSize: 11,
    fontWeight: 800,
    boxShadow: '0 8px 20px rgba(15, 23, 42, 0.10)',
    pointerEvents: 'none',
  },
  refreshDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: UI_COLORS.primary,
    display: 'inline-block',
  },
  clusterPopup: {
    display: 'grid',
    gap: 8,
    width: 'min(80vw, 260px)',
    minWidth: 0,
  },
  clusterSummaryRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  clusterSummaryChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    minHeight: 28,
    padding: '0 10px',
    borderRadius: 999,
    border: '1px solid transparent',
    fontSize: 12,
    fontWeight: 800,
  },
  clusterList: {
    display: 'grid',
    gap: 6,
  },
  clusterItemButton: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: `1px solid ${UI_COLORS.border}`,
    background: UI_COLORS.surface,
    color: UI_COLORS.text,
    fontSize: 12,
    fontWeight: 700,
    textAlign: 'left',
    cursor: 'pointer',
    display: 'grid',
    gap: 4,
  },
  clusterItemTitle: {
    color: UI_COLORS.text,
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1.4,
  },
  clusterItemMeta: {
    color: UI_COLORS.textMuted,
    fontSize: 11,
    lineHeight: 1.35,
  },
  clusterHint: {
    color: UI_COLORS.textMuted,
    fontSize: 11,
    lineHeight: 1.4,
  },
  detailCard: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    zIndex: 620,
    width: 'min(360px, calc(100% - 36px))',
    display: 'grid',
    gap: 0,
    borderRadius: 20,
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.98)',
    border: `1px solid ${UI_COLORS.border}`,
    boxShadow: '0 18px 42px rgba(15, 23, 42, 0.22)',
    backdropFilter: 'blur(10px)',
  },
  detailImage: {
    width: '100%',
    height: 150,
    objectFit: 'cover',
    display: 'block',
    borderBottom: `1px solid ${UI_COLORS.border}`,
  },
  detailBody: {
    display: 'grid',
    gap: 12,
    padding: 16,
  },
  detailBadgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  detailDamageBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 28,
    padding: '0 10px',
    borderRadius: 999,
    background: '#EAF2FF',
    color: UI_COLORS.primaryDark,
    fontSize: 11,
    fontWeight: 900,
  },
  detailStatusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 28,
    padding: '0 10px',
    borderRadius: 999,
    border: '1px solid transparent',
    fontSize: 11,
    fontWeight: 900,
  },
  detailTitle: {
    color: UI_COLORS.text,
    fontSize: 18,
    fontWeight: 900,
    lineHeight: 1.35,
  },
  detailMetaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailMetaItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    color: UI_COLORS.textMuted,
    fontSize: 12,
    fontWeight: 700,
  },
  detailNote: {
    color: UI_COLORS.textMuted,
    fontSize: 13,
    lineHeight: 1.5,
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  detailActions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  detailButton: {
    minHeight: 38,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '0 14px',
    border: 'none',
    borderRadius: 10,
    background: UI_COLORS.primary,
    color: UI_COLORS.surface,
    fontSize: 13,
    fontWeight: 900,
    cursor: 'pointer',
  },
};
