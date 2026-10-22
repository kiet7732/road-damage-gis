import { useMemo } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import { getStatusColor, UI_COLORS } from '../../constants/statusColors';
import { formatDateTime } from '../../utils/formatters';
import { getEffectiveDamageType, getEffectiveDamageTypeLabel } from '../../utils/reportDamage';
import {
  createClusterIcon,
  summarizeClusterStatuses,
  CLUSTER_STATUS_ORDER,
} from '../../utils/mapClusteringUtils';

export default function ClusterMarker({ cluster, onOpenDetail, onSelectPoint }) {
  const map = useMap();
  const clusterSummary = useMemo(() => summarizeClusterStatuses(cluster.items), [cluster.items]);
  const statusEntries = CLUSTER_STATUS_ORDER.filter((status) => clusterSummary.counts[status]);

  return (
    <Marker
      position={[cluster.latitude, cluster.longitude]}
      icon={createClusterIcon(cluster.count || cluster.items.length, cluster.dominantStatus || clusterSummary.dominantStatus)}
      eventHandlers={{
        click: () => {
          const validItems = (cluster.items || []).filter((item) => item?.latitude && item?.longitude);
          const latitudes = validItems.map((item) => Number(item.latitude)).filter(Number.isFinite);
          const longitudes = validItems.map((item) => Number(item.longitude)).filter(Number.isFinite);

          if (latitudes.length > 1) {
            const minLat = Math.min(...latitudes);
            const maxLat = Math.max(...latitudes);
            const minLng = Math.min(...longitudes);
            const maxLng = Math.max(...longitudes);

            if (maxLat - minLat > 0.0003 || maxLng - minLng > 0.0003) {
              map.fitBounds(
                [
                  [minLat, minLng],
                  [maxLat, maxLng],
                ],
                {
                  padding: [44, 44],
                  animate: true,
                  duration: 0.45,
                  easeLinearity: 0.25,
                  maxZoom: Math.max(map.getZoom() + 2, 16),
                },
              );
              return;
            }
          }

          map.setView([cluster.latitude, cluster.longitude], Math.min(map.getZoom() + 3, 17), {
            animate: true,
          });
        },
      }}
    >
      <Popup>
        <div style={styles.clusterPopup}>
          <strong style={styles.popupTitle}>{cluster.count || cluster.items.length} vị trí trong cụm này</strong>
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
            {cluster.items.slice(0, 3).map((item, idx) => (
              <button
                key={item.id || `cluster-item-${idx}`}
                type="button"
                onClick={() => {
                  onSelectPoint?.(item);
                  map.setView([item.latitude || cluster.latitude, item.longitude || cluster.longitude], Math.max(map.getZoom(), 16), {
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

const styles = {
  clusterPopup: {
    display: 'grid',
    gap: 8,
    width: 'min(80vw, 260px)',
    minWidth: 0,
  },
  popupTitle: {
    color: UI_COLORS.text,
    fontSize: 13,
    fontWeight: 900,
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
};
