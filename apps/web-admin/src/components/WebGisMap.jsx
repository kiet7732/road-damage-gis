import 'leaflet/dist/leaflet.css';

import { memo, useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, TileLayer, ZoomControl } from 'react-leaflet';
import { UI_COLORS } from '../constants/statusColors';
import { getEffectiveDamageType } from '../utils/reportDamage';
import {
  DEFAULT_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
  MIN_VISIBLE_ZOOM,
  buildScreenClusters,
  createPointIcon,
} from '../utils/mapClusteringUtils';
import { MapViewportBridge, MapFocusBridge, ZoomLevelIndicator } from './gis/MapBridges';
import ClusterMarker from './gis/ClusterMarker';
import MapDetailCard from './gis/MapDetailCard';

function WebGisMap({
  items = [],
  serverClusters = null,
  initialLoading = false,
  refreshing = false,
  error = '',
  center,
  zoom = DEFAULT_ZOOM,
  onViewportChange,
  onOpenDetail,
  onSelectPoint,
  onCloseDetail,
  selectedReportId = null,
  selectedReport = null,
  focusTarget = null,
  fitBoundsTarget = null,
}) {
  const safeItems = Array.isArray(items) ? items : [];
  const [activeZoom, setActiveZoom] = useState(zoom);

  useEffect(() => {
    setActiveZoom(zoom);
  }, [zoom]);

  const clusters = useMemo(() => {
    // 1. Khi phóng to ra ngoài / zoom xa (activeZoom < MIN_VISIBLE_ZOOM), ẩn toàn bộ
    if (activeZoom < MIN_VISIBLE_ZOOM) {
      return [];
    }

    // 2. Thuật toán gom cụm thông minh theo khoảng cách pixel màn hình trên danh sách điểm:
    if (safeItems.length > 0) {
      return buildScreenClusters(safeItems, activeZoom);
    }

    // 3. Fallback khi safeItems chưa tải xong nhưng có serverClusters
    if (Array.isArray(serverClusters) && serverClusters.length > 0) {
      const result = [];
      serverClusters.forEach((sc, idx) => {
        if (sc.cluster_id !== null && sc.cluster_id !== undefined && sc.count > 1) {
          const lat = sc.center_latitude ?? sc.centroid_geojson?.coordinates?.[1];
          const lng = sc.center_longitude ?? sc.centroid_geojson?.coordinates?.[0];
          if (lat && lng) {
            result.push({
              type: 'cluster',
              id: `dbscan-cluster-${sc.cluster_id ?? idx}`,
              latitude: lat,
              longitude: lng,
              count: sc.count,
              items: Array.isArray(sc.items) ? sc.items : Array(sc.count).fill({ status: 'pending' }),
              isServerCluster: true,
            });
          }
        } else if (Array.isArray(sc.noise_points)) {
          sc.noise_points.forEach((np) => {
            if (np.latitude && np.longitude) {
              result.push({
                type: 'point',
                id: np.id,
                latitude: np.latitude,
                longitude: np.longitude,
                status: np.status,
                damage_type: np.damage_type,
                count: 1,
                items: [np],
              });
            }
          });
        }
      });
      return result;
    }

    return [];
  }, [safeItems, serverClusters, activeZoom]);

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
        zoomControl={false}
        style={styles.mapContainer}
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          subdomains="abc"
          maxZoom={19}
          keepBuffer={10}
          updateWhenIdle={false}
        />

        <MapViewportBridge
          center={center}
          zoom={zoom}
          onViewportChange={onViewportChange}
          onZoomChange={setActiveZoom}
        />
        <MapFocusBridge focusTarget={focusTarget} fitBoundsTarget={fitBoundsTarget} />
        <ZoomLevelIndicator activeZoom={activeZoom} totalCount={safeItems.length} />

        {clusters.map((cluster) => {
          const isCluster = cluster.type === 'cluster' && cluster.count > 1;

          if (isCluster) {
            return (
              <ClusterMarker
                key={cluster.id}
                cluster={cluster}
                onOpenDetail={onOpenDetail}
                onSelectPoint={onSelectPoint}
              />
            );
          }

          const point = cluster.items?.[0] || cluster;
          const damageType = getEffectiveDamageType(point);
          return (
            <Marker
              key={point.id}
              position={[point.latitude, point.longitude]}
              icon={createPointIcon(point.status, damageType, point.id === selectedReportId)}
              eventHandlers={{
                click: (e) => {
                  onSelectPoint?.(point);
                  if (e?.target?._map) {
                    e.target._map.panTo([point.latitude, point.longitude], { animate: true, duration: 0.35 });
                  }
                },
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

      <MapDetailCard
        selectedReport={selectedReport}
        onCloseDetail={onCloseDetail}
        onOpenDetail={onOpenDetail}
      />
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
};
