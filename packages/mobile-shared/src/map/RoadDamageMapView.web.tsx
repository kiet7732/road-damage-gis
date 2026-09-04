import 'leaflet/dist/leaflet.css';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { StyleSheet, Text, View } from 'react-native';
import { colors, damageTypeTheme, radius, reportStatusTheme, spacing } from '../theme';
import type {
  MapRegion,
  RoadDamageMapHandle,
  RoadDamageMarkerTone,
  RoadDamageMapViewProps,
} from './RoadDamageMapView.types';

type LeafletMapInstance = L.Map;

const MIN_ZOOM = 5;
const MAX_ZOOM = 18;
const FALLBACK_ZOOM = 15;

const mapContainerStyle: CSSProperties = {
  width: '100%',
  height: '100%',
};

const popupButtonStyle: CSSProperties = {
  width: '100%',
  minHeight: 34,
  border: 'none',
  borderRadius: `${radius.sm}px`,
  backgroundColor: colors.primary,
  color: colors.surface,
  fontSize: '13px',
  fontWeight: 900,
  cursor: 'pointer',
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getZoomFromRegion = (region: MapRegion): number => {
  const normalizedDelta = Math.max(region.longitudeDelta, region.latitudeDelta, 0.0001);
  const zoom = Math.round(Math.log2(360 / normalizedDelta));
  return clamp(zoom, MIN_ZOOM, MAX_ZOOM);
};

const getRegionFromMap = (map: LeafletMapInstance): MapRegion => {
  const center = map.getCenter();
  const bounds = map.getBounds();

  return {
    latitude: center.lat,
    longitude: center.lng,
    latitudeDelta: Math.abs(bounds.getNorth() - bounds.getSouth()) || 0.01,
    longitudeDelta: Math.abs(bounds.getEast() - bounds.getWest()) || 0.01,
  };
};

const createMarkerIcon = (fillColor: string, accentColor = '#ffffff') =>
  L.divIcon({
    className: 'road-damage-map-marker',
    html: `
      <div style="
        width: 18px;
        height: 18px;
        border-radius: 999px;
        background: ${fillColor};
        border: 3px solid ${accentColor};
        box-shadow: 0 4px 14px rgba(15, 23, 42, 0.28);
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  });

const reporterIcon = createMarkerIcon(colors.primaryDark);

const resolveMarkerTone = (
  report: RoadDamageMapViewProps['reports'][number],
  getMarkerTone?: RoadDamageMapViewProps['getMarkerTone'],
): Required<RoadDamageMarkerTone> => {
  const statusTheme = reportStatusTheme[report.status] ?? reportStatusTheme.new;
  const customTone = getMarkerTone?.(report) ?? null;

  return {
    borderColor: customTone?.borderColor ?? statusTheme.color,
    accentColor: customTone?.accentColor ?? statusTheme.color,
    selectedBorderColor: customTone?.selectedBorderColor ?? colors.primaryDark,
    selectedAccentColor: customTone?.selectedAccentColor ?? colors.warning,
  };
};

function MapBridge({
  region,
  onRegionChangeComplete,
  onMapReady,
}: {
  region: MapRegion;
  onRegionChangeComplete: (region: MapRegion) => void;
  onMapReady: (map: LeafletMapInstance) => void;
}) {
  const map = useMap();
  const initializedRef = useRef(false);

  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);

  useEffect(() => {
    const nextZoom = getZoomFromRegion(region);
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();

    const hasCenterChanged =
      Math.abs(currentCenter.lat - region.latitude) > 0.00001 ||
      Math.abs(currentCenter.lng - region.longitude) > 0.00001;

    if (!initializedRef.current) {
      map.setView([region.latitude, region.longitude], nextZoom, { animate: false });
      initializedRef.current = true;
      return;
    }

    if (hasCenterChanged || currentZoom !== nextZoom) {
      map.setView([region.latitude, region.longitude], nextZoom, { animate: true });
    }
  }, [map, region]);

  useMapEvents({
    moveend() {
      onRegionChangeComplete(getRegionFromMap(map));
    },
    zoomend() {
      onRegionChangeComplete(getRegionFromMap(map));
    },
  });

  return null;
}

const RoadDamageMapView = forwardRef<RoadDamageMapHandle, RoadDamageMapViewProps>(
  (
    {
      reports,
      region,
      selectedReportId,
      showsUserLocation,
      userLocation,
      onRegionChangeComplete,
      onSelectReport,
      getMarkerTone,
      getPopupStatusLabel,
      popupActionLabel,
    },
    ref,
  ) => {
    const mapRef = useRef<LeafletMapInstance | null>(null);

    useImperativeHandle(ref, () => ({
      animateToRegion: (nextRegion: MapRegion) => {
        if (mapRef.current) {
          mapRef.current.setView(
            [nextRegion.latitude, nextRegion.longitude],
            getZoomFromRegion(nextRegion),
            {
              animate: true,
              duration: 0.65,
            },
          );
        }
      },
    }));

    const reportMarkers = useMemo(
      () =>
        reports.map((report) => {
          const markerTone = resolveMarkerTone(report, getMarkerTone);

          return {
            ...report,
            markerTone,
            icon: createMarkerIcon(
              damageTypeTheme[report.type]?.color ?? colors.warning,
              markerTone.borderColor,
            ),
          };
        }),
      [getMarkerTone, reports],
    );

    return (
      <View style={styles.webMap}>
        <MapContainer
          center={[region.latitude, region.longitude]}
          zoom={getZoomFromRegion(region) || FALLBACK_ZOOM}
          scrollWheelZoom
          style={mapContainerStyle}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapBridge
            region={region}
            onMapReady={(map) => {
              mapRef.current = map;
            }}
            onRegionChangeComplete={onRegionChangeComplete}
          />

          {showsUserLocation ? (
            <Marker
              position={[
                userLocation?.latitude ?? region.latitude,
                userLocation?.longitude ?? region.longitude,
              ]}
              icon={reporterIcon}
            >
              <Popup>
                <div style={popupContentStyle}>
                  <strong>Vị trí hiện tại</strong>
                  <span>Vị trí lấy từ thiết bị của bạn.</span>
                </div>
              </Popup>
            </Marker>
          ) : null}

          {reportMarkers.map((report) => (
            <Marker
              key={report.id}
              position={[report.gps.latitude, report.gps.longitude]}
              icon={report.icon}
              zIndexOffset={selectedReportId === report.id ? 1000 : 0}
            >
              <Popup minWidth={220}>
                <div style={popupContentStyle}>
                  <strong style={popupTitleStyle}>
                    {damageTypeTheme[report.type]?.label ?? report.title}
                  </strong>
                  <span style={popupStatusStyle}>
                    {getPopupStatusLabel?.(report) ?? reportStatusTheme[report.status]?.label ?? 'Chưa xác định'}
                  </span>
                  <span style={popupMetaStyle}>{report.createdAt}</span>
                  <span style={popupDescriptionStyle}>{report.address}</span>
                  <button
                    type="button"
                    onClick={() => onSelectReport(report)}
                    style={popupButtonStyle}
                  >
                    {popupActionLabel ?? 'Mở chi tiết phản ánh'}
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <View style={styles.webLabel}>
          <Text selectable style={styles.webLabelText}>
            Bản đồ hiện trạng mặt đường
          </Text>
        </View>
      </View>
    );
  },
);

RoadDamageMapView.displayName = 'RoadDamageMapView';

export default RoadDamageMapView;

const popupContentStyle: CSSProperties = {
  display: 'grid',
  gap: `${spacing.xs}px`,
  minWidth: '220px',
};

const popupTitleStyle: CSSProperties = {
  color: colors.text,
  fontSize: '15px',
  fontWeight: 900,
};

const popupDescriptionStyle: CSSProperties = {
  color: colors.textMuted,
  fontSize: '12px',
  fontWeight: 700,
  lineHeight: 1.45,
};

const popupMetaStyle: CSSProperties = {
  color: colors.primaryDark,
  fontSize: '12px',
  fontWeight: 800,
};

const popupStatusStyle: CSSProperties = {
  color: colors.text,
  fontSize: '12px',
  fontWeight: 800,
};

const styles = StyleSheet.create({
  webMap: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  webLabel: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  webLabelText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
});
