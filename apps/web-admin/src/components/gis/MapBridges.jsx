import { useEffect, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import { FiCompass } from 'react-icons/fi';
import { UI_COLORS } from '../../constants/statusColors';
import { MIN_VISIBLE_ZOOM, VIEWPORT_DEBOUNCE_MS } from '../../utils/mapClusteringUtils';

export function MapViewportBridge({ center, zoom, onViewportChange, onZoomChange }) {
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
    zoomend: () => {
      const nextZoom = map.getZoom();
      lastZoomRef.current = nextZoom;
      onZoomChange?.(nextZoom);
      emitViewportChange();
    },
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

export function MapFocusBridge({ focusTarget, fitBoundsTarget }) {
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

export function ZoomLevelIndicator({ activeZoom, totalCount }) {
  const map = useMap();
  if (activeZoom >= MIN_VISIBLE_ZOOM || totalCount === 0) {
    return null;
  }

  return (
    <div style={styles.zoomHintContainer}>
      <div style={styles.zoomHintBadge}>
        <FiCompass size={14} color={UI_COLORS.primary} style={{ flexShrink: 0 }} />
        <span>Góc nhìn xa (Zoom {Math.round(activeZoom)}) · Đã ẩn {totalCount} vị trí hư hỏng</span>
        <button
          type="button"
          onClick={() => map.setZoom(13, { animate: true })}
          style={styles.zoomResetButton}
          title="Phóng to bản đồ về mức hiển thị chi tiết (Zoom 13)"
        >
          Phóng to
        </button>
      </div>
    </div>
  );
}

const styles = {
  zoomHintContainer: {
    position: 'absolute',
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 500,
    pointerEvents: 'none',
  },
  zoomHintBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 14px',
    borderRadius: 999,
    background: 'rgba(255, 255, 255, 0.95)',
    border: `1px solid ${UI_COLORS.border}`,
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.16)',
    backdropFilter: 'blur(8px)',
    fontSize: 12,
    fontWeight: 700,
    color: UI_COLORS.textNavy,
    pointerEvents: 'auto',
  },
  zoomResetButton: {
    marginLeft: 4,
    padding: '3px 10px',
    borderRadius: 999,
    border: 'none',
    background: UI_COLORS.primary,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 800,
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  },
};
