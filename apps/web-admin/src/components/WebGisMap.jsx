import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import { Fragment, memo, useEffect, useMemo, useState } from 'react';
import { GeoJSON, MapContainer, Marker, Polyline, Popup, TileLayer, ZoomControl } from 'react-leaflet';
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
import {
  MapViewportBridge,
  MapFocusBridge,
  ZoomLevelIndicator,
  RoadSelectionMapBridge,
} from './gis/MapBridges';
import ClusterMarker from './gis/ClusterMarker';
import MapDetailCard from './gis/MapDetailCard';

const POINT_A_ICON = L.divIcon({
  className: 'road-start-point-marker',
  html: `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #16A34A;
      color: #ffffff;
      font-weight: 800;
      font-size: 13px;
      border: 2.5px solid #ffffff;
      box-shadow: 0 4px 12px rgba(22, 163, 74, 0.5);
    ">A</div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const POINT_B_ICON = L.divIcon({
  className: 'road-end-point-marker',
  html: `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #DC2626;
      color: #ffffff;
      font-weight: 800;
      font-size: 13px;
      border: 2.5px solid #ffffff;
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.5);
    ">B</div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const PROVINCE_BOUNDARY_OUTER_STYLE = {
  color: '#3B82F6',
  weight: 7,
  opacity: 0.25,
  fill: false,
  interactive: false,
};

const PROVINCE_BOUNDARY_INNER_STYLE = {
  color: '#1D4ED8',
  weight: 3,
  opacity: 0.92,
  dashArray: '8, 6',
  fillColor: '#2563EB',
  fillOpacity: 0.06,
  interactive: false,
};

function WebGisMap({
  items = [],
  serverClusters = null,
  provinceBoundary = null,
  managedProvince = null,
  onFitProvinceBoundary,
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
  roadRestrictions = [],
  isSelectingRoad = false,
  startPoint = null,
  endPoint = null,
  onRoadPointSelected = null,
  onCancelRoadSelection = null,
  onToggleRestrictionStatus = null,
  onDeleteRestriction = null,
}) {
  const safeItems = Array.isArray(items) ? items : [];
  const [activeZoom, setActiveZoom] = useState(zoom);

  useEffect(() => {
    setActiveZoom(zoom);
  }, [zoom]);

  const clusters = useMemo(() => {
    // 1. Nếu đang bật phân cụm mật độ DBSCAN từ server và có dữ liệu:
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
              items: Array.isArray(sc.items) && sc.items.length > 0 ? sc.items : Array(sc.count).fill({ status: 'pending' }),
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

    // 2. Thuật toán gom cụm thông minh theo khoảng cách pixel màn hình trên toàn bộ danh sách điểm:
    if (safeItems.length > 0) {
      return buildScreenClusters(safeItems, activeZoom);
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
        <RoadSelectionMapBridge isSelecting={isSelectingRoad} onMapClick={onRoadPointSelected} />

        {startPoint ? (
          <Marker
            position={[startPoint.latitude, startPoint.longitude]}
            icon={POINT_A_ICON}
          />
        ) : null}

        {endPoint ? (
          <Marker
            position={[endPoint.latitude, endPoint.longitude]}
            icon={POINT_B_ICON}
          />
        ) : null}

        {startPoint && endPoint ? (
          <Polyline
            positions={[
              [startPoint.latitude, startPoint.longitude],
              [endPoint.latitude, endPoint.longitude],
            ]}
            pathOptions={{
              color: '#DC2626',
              weight: 5,
              dashArray: '8, 8',
              opacity: 0.9,
            }}
          />
        ) : null}

        {roadRestrictions.map((restr) => {
          const isDanger = restr.severity === 'danger';
          const isInfo = restr.severity === 'info';
          const outerColor = !restr.is_active ? '#94A3B8' : isDanger ? '#EF4444' : isInfo ? '#3B82F6' : '#F59E0B';
          const innerColor = !restr.is_active ? '#64748B' : isDanger ? '#DC2626' : isInfo ? '#1D4ED8' : '#D97706';
          const positions = [
            [restr.start_latitude, restr.start_longitude],
            [restr.end_latitude, restr.end_longitude],
          ];

          return (
            <Fragment key={restr.id}>
              <Polyline
                positions={positions}
                pathOptions={{
                  color: outerColor,
                  weight: 12,
                  opacity: 0.35,
                }}
              />
              <Polyline
                positions={positions}
                pathOptions={{
                  color: innerColor,
                  weight: 6,
                  dashArray: restr.is_active ? '10, 8' : '4, 4',
                  opacity: restr.is_active ? 0.95 : 0.5,
                }}
              >
                <Popup>
                  <div style={{ minWidth: 220, padding: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 6,
                          backgroundColor: restr.is_active ? '#FEE2E2' : '#F1F5F9',
                          color: restr.is_active ? '#B91C1C' : '#64748B',
                        }}
                      >
                        {restr.is_active ? '⛔ Hạn chế lưu thông' : '○ Đã gỡ bỏ'}
                      </span>
                    </div>
                    <strong style={{ fontSize: 14, color: '#0F172A', display: 'block', marginBottom: 2 }}>
                      {restr.road_name}
                    </strong>
                    <div style={{ fontSize: 11.5, color: '#64748B', marginBottom: 6 }}>
                      {[restr.ward, restr.district, restr.province].filter(Boolean).join(', ')}
                    </div>
                    <div style={{ fontSize: 12, color: '#334155', marginBottom: 6, lineHeight: 1.4 }}>
                      <strong>Lý do:</strong> {restr.reason}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', marginBottom: 8 }}>
                      Từ: {restr.start_date ? new Date(restr.start_date).toLocaleDateString('vi-VN') : ''}
                      {restr.end_date ? ` - Đến: ${new Date(restr.end_date).toLocaleDateString('vi-VN')}` : ''}
                    </div>
                    <div style={{ display: 'flex', gap: 6, paddingTop: 6, borderTop: '1px solid #E2E8F0' }}>
                      {onToggleRestrictionStatus ? (
                        <button
                          type="button"
                          onClick={() => onToggleRestrictionStatus(restr.id, !restr.is_active)}
                          style={{
                            flex: 1,
                            padding: '5px 8px',
                            borderRadius: 6,
                            border: '1px solid #CBD5E1',
                            backgroundColor: restr.is_active ? '#FEF2F2' : '#F0FDF4',
                            color: restr.is_active ? '#DC2626' : '#16A34A',
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {restr.is_active ? 'Gỡ bỏ' : 'Bật lại'}
                        </button>
                      ) : null}
                      {onDeleteRestriction ? (
                        <button
                          type="button"
                          onClick={() => onDeleteRestriction(restr.id)}
                          style={{
                            padding: '5px 8px',
                            borderRadius: 6,
                            border: '1px solid #E2E8F0',
                            backgroundColor: '#F8FAFC',
                            color: '#64748B',
                            fontSize: 11.5,
                            cursor: 'pointer',
                          }}
                        >
                          Xóa
                        </button>
                      ) : null}
                    </div>
                  </div>
                </Popup>
              </Polyline>
            </Fragment>
          );
        })}

        {provinceBoundary && Array.isArray(provinceBoundary.features) && provinceBoundary.features.length > 0 ? (
          <>
            <GeoJSON
              key={`boundary-outer-${provinceBoundary.province || 'active'}`}
              data={provinceBoundary}
              style={PROVINCE_BOUNDARY_OUTER_STYLE}
            />
            <GeoJSON
              key={`boundary-inner-${provinceBoundary.province || 'active'}`}
              data={provinceBoundary}
              style={PROVINCE_BOUNDARY_INNER_STYLE}
            />
          </>
        ) : null}

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

      {provinceBoundary && Array.isArray(provinceBoundary.features) && provinceBoundary.features.length > 0 ? (
        <div style={styles.boundaryBadge} title={provinceBoundary.road_management_authority || ''}>
          <span style={styles.boundaryDot} />
          <div style={styles.boundaryCopy}>
            <strong style={styles.boundaryTitle}>
              Khoanh vùng ranh giới: {provinceBoundary.display_name || provinceBoundary.province}
            </strong>
            <span style={styles.boundarySub}>
              {managedProvince
                ? '🔒 Phạm vi vùng được phân quyền quản lý'
                : provinceBoundary.road_management_authority || 'Ranh giới địa giới hành chính cấp tỉnh'}
            </span>
          </div>
          {onFitProvinceBoundary ? (
            <button
              type="button"
              onClick={onFitProvinceBoundary}
              style={styles.fitBoundaryBtn}
              title="Căn chỉnh bản đồ bao quát toàn bộ ranh giới vùng quản lý"
            >
              Căn toàn vùng
            </button>
          ) : null}
        </div>
      ) : null}

      {isSelectingRoad ? (
        <div style={styles.selectionBanner}>
          <div style={styles.selectionBannerCopy}>
            <span style={styles.selectionDot} />
            <strong style={styles.selectionTitle}>
              {!startPoint
                ? '📍 Bước 1: Nhấp trên bản đồ để chọn Điểm bắt đầu (🟢 Điểm A)'
                : '📍 Bước 2: Nhấp trên bản đồ để chọn Điểm kết thúc (🔴 Điểm B)'}
            </strong>
          </div>
          {onCancelRoadSelection ? (
            <button
              type="button"
              onClick={onCancelRoadSelection}
              style={styles.cancelSelectionBtn}
            >
              Hủy thao tác
            </button>
          ) : null}
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
  boundaryBadge: {
    position: 'absolute',
    bottom: 18,
    left: 16,
    zIndex: 660,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 14px',
    borderRadius: 14,
    background: 'rgba(255, 255, 255, 0.95)',
    border: '1.5px solid #93C5FD',
    boxShadow: '0 8px 24px rgba(29, 78, 216, 0.16)',
    maxWidth: 'calc(100% - 96px)',
  },
  boundaryDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: '#1D4ED8',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.25)',
    flexShrink: 0,
  },
  boundaryCopy: {
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    minWidth: 0,
  },
  boundaryTitle: {
    fontSize: 12.5,
    fontWeight: 800,
    color: '#1E3A8A',
    lineHeight: 1.25,
  },
  boundarySub: {
    fontSize: 11,
    fontWeight: 600,
    color: '#475569',
    lineHeight: 1.25,
  },
  fitBoundaryBtn: {
    padding: '5px 10px',
    borderRadius: 8,
    border: '1px solid #BFDBFE',
    background: '#EFF6FF',
    color: '#1D4ED8',
    fontSize: 11.5,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
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
  selectionBanner: {
    position: 'absolute',
    top: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 900,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '10px 18px',
    borderRadius: 30,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    backdropFilter: 'blur(8px)',
    border: '1.5px solid #DC2626',
    boxShadow: '0 12px 30px rgba(220, 38, 38, 0.35)',
    color: '#FFFFFF',
    animation: 'bounceIn 0.3s ease',
  },
  selectionBannerCopy: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  selectionDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: '#EF4444',
    boxShadow: '0 0 10px #EF4444',
    animation: 'pulse 1.2s infinite',
  },
  selectionTitle: {
    fontSize: 13.5,
    fontWeight: 700,
    letterSpacing: '0.2px',
  },
  cancelSelectionBtn: {
    padding: '5px 12px',
    borderRadius: 20,
    border: '1px solid rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
};
