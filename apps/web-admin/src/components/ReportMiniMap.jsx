import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { UI_COLORS } from '../constants/statusColors';

const createPointIcon = () =>
  L.divIcon({
    className: 'road-admin-mini-map-marker',
    html: `
      <div style="
        width: 16px;
        height: 16px;
        border-radius: 999px;
        background: ${UI_COLORS.primary};
        border: 3px solid #ffffff;
        box-shadow: 0 6px 16px rgba(15, 23, 42, 0.25);
      "></div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

export default function ReportMiniMap({ latitude, longitude }) {
  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
    return (
      <div style={styles.empty}>
        <strong style={styles.emptyTitle}>Chưa có thông tin vị trí</strong>
      </div>
    );
  }

  return (
    <div style={styles.mapWrap}>
      <MapContainer
        center={[Number(latitude), Number(longitude)]}
        zoom={16}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        touchZoom={false}
        boxZoom={false}
        keyboard={false}
        zoomControl={false}
        attributionControl={false}
        style={styles.map}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          subdomains="abc"
          attribution='&copy; OpenStreetMap contributors'
        />
        <Marker
          position={[Number(latitude), Number(longitude)]}
          icon={createPointIcon()}
        />
      </MapContainer>
    </div>
  );
}

const styles = {
  mapWrap: {
    minHeight: 240,
    overflow: 'hidden',
    borderRadius: 16,
    border: `1px solid ${UI_COLORS.border}`,
  },
  map: {
    width: '100%',
    height: 240,
  },
  empty: {
    minHeight: 240,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 16,
    border: `1px solid ${UI_COLORS.border}`,
    background: UI_COLORS.surfaceMuted,
  },
  emptyTitle: {
    color: UI_COLORS.textMuted,
    fontSize: 14,
    fontWeight: 800,
  },
};
