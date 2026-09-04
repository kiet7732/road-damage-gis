import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiFilter, FiRefreshCw, FiMaximize2, FiList, FiMapPin, FiX } from 'react-icons/fi';
import MapFilterPanel from '../../components/MapFilterPanel';
import WebGisMap from '../../components/WebGisMap';
import useAsyncData from '../../hooks/useAsyncData';
import { UI_COLORS } from '../../constants/statusColors';
import { getEffectiveDamageTypeLabel } from '../../utils/reportDamage';
import {
  isRealtimeReportEventRelevant,
  normalizeRealtimeReportEvent,
  ROADGIS_REPORT_EVENT,
} from '../../utils/realtimeEvents';
import {
  DEFAULT_GIS_CENTER,
  fetchAdminReportsGis,
  getMapErrorMessage,
} from '../../services/mapAdminService';

const DEFAULT_FILTERS = {
  status: '',
  damageType: '',
  periodDays: '',
};
const SELECTED_REPORT_FOCUS_ZOOM = 16;
const MAP_REALTIME_REFRESH_DEBOUNCE_MS = 900;

const zoomToBounds = (center, zoom) => {
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

const normalizeBounds = (bbox) => {
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

const BOUNDS_EPSILON = 0.00005;

const areBoundsEffectivelyEqual = (left, right) => {
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

export default function DamageMapPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedReport, setSelectedReport] = useState(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [fitResultsNonce, setFitResultsNonce] = useState(1);
  const [fitBoundsRequest, setFitBoundsRequest] = useState(null);
  const [isReportListOpen, setIsReportListOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState(() => {
    if (typeof window === 'undefined') {
      return 'desktop';
    }

    if (window.innerWidth <= 768) {
      return 'mobile';
    }

    if (window.innerWidth <= 1180) {
      return 'tablet';
    }

    return 'desktop';
  });
  const [isMapPanelOpen, setIsMapPanelOpen] = useState(false);
  const refreshTimerRef = useRef(null);
  const lastHandledRealtimeEventIdRef = useRef('');
  const isSoftRefreshingRef = useRef(false);
  const [queryBounds, setQueryBounds] = useState(
    zoomToBounds(
      {
        latitude: DEFAULT_GIS_CENTER.latitude,
        longitude: DEFAULT_GIS_CENTER.longitude,
      },
      DEFAULT_GIS_CENTER.zoom,
    ),
  );

  const queryState = useMemo(
    () => ({
      status: filters.status,
      damageType: filters.damageType,
      periodDays: filters.periodDays,
      bounds: queryBounds,
      limit: 1000,
    }),
    [filters, queryBounds],
  );

  const { data, isLoading, isRefreshing, error, isError, reload } = useAsyncData(async () => {
    try {
      return await fetchAdminReportsGis(queryState);
    } catch (requestError) {
      throw new Error(getMapErrorMessage(requestError));
    }
  }, [queryState.status, queryState.damageType, queryState.periodDays, queryState.bounds]);

  const mapItems = Array.isArray(data?.items) ? data.items : [];

  const selectedReportDetail = useMemo(() => {
    if (!selectedReport?.id) {
      return null;
    }

    return mapItems.find((item) => item.id === selectedReport.id) || null;
  }, [mapItems, selectedReport]);

  const activeSelectedReport = selectedReportDetail || selectedReport || null;
  const viewportSummary = useMemo(() => {
    return {
      total: Number.isFinite(data?.total) ? data.total : 0,
      pending: Number.isFinite(data?.pendingCount) ? data.pendingCount : 0,
      processing: Number.isFinite(data?.processingCount) ? data.processingCount : 0,
      repaired: Number.isFinite(data?.repairedCount) ? data.repairedCount : 0,
      topDamageLabel: data?.topDamageLabel || 'Chưa xác định',
    };
  }, [data]);
  const resultBounds = useMemo(() => normalizeBounds(data?.bbox), [data?.bbox]);
  const canFitResults = Boolean(resultBounds && viewportSummary.total > 0);
  const isCompactMapLayout = layoutMode === 'mobile';

  useEffect(() => {
    if (selectedReport && !selectedReportDetail) {
      setSelectedReport(null);
    }
  }, [selectedReport, selectedReportDetail]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const syncResponsiveMode = () => {
      if (window.innerWidth <= 768) {
        setLayoutMode('mobile');
        return;
      }

      if (window.innerWidth <= 1180) {
        setLayoutMode('tablet');
        return;
      }

      setLayoutMode('desktop');
    };

    syncResponsiveMode();
    window.addEventListener('resize', syncResponsiveMode);

    return () => {
      window.removeEventListener('resize', syncResponsiveMode);
    };
  }, []);

  useEffect(() => {
    if (!isCompactMapLayout) {
      setIsMapPanelOpen(false);
    }
  }, [isCompactMapLayout]);

  useEffect(() => {
    if (!isCompactMapLayout) {
      setIsReportListOpen(false);
    }
  }, [isCompactMapLayout]);

  useEffect(() => {
    if (fitResultsNonce <= 0) {
      return;
    }

    if (!resultBounds) {
      setFitBoundsRequest(null);
      setFitResultsNonce(0);
      return;
    }

    setFitBoundsRequest({ bounds: resultBounds, nonce: Date.now() });
    setFitResultsNonce(0);
  }, [fitResultsNonce, resultBounds]);

  const focusReportOnMap = useCallback((report) => {
    if (!report?.id || typeof report.latitude !== 'number' || typeof report.longitude !== 'number') {
      return;
    }

    setSelectedReport(report);
    setFocusNonce((value) => value + 1);
  }, []);

  const handleViewportChange = useCallback(
    (nextViewport) => {
      if (areBoundsEffectivelyEqual(nextViewport?.bounds, queryBounds)) {
        return;
      }

      setQueryBounds(nextViewport.bounds);
    },
    [queryBounds],
  );

  const handleSelectPoint = useCallback((point) => {
    setSelectedReport(point);
  }, []);

  const handleOpenDetail = useCallback(
    (reportId) => {
      if (!reportId) {
        return;
      }

      navigate(`/reports/${reportId}`);
    },
    [navigate],
  );

  const scheduleSoftRefresh = useCallback(
    () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = window.setTimeout(async () => {
        if (isSoftRefreshingRef.current) {
          return;
        }

        isSoftRefreshingRef.current = true;

        try {
          await reload('refresh');
        } finally {
          isSoftRefreshingRef.current = false;
        }
      }, MAP_REALTIME_REFRESH_DEBOUNCE_MS);
    },
    [reload],
  );

  useEffect(
    () => () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleRealtimeEvent = (browserEvent) => {
      const nextEvent = normalizeRealtimeReportEvent(browserEvent?.detail);

      if (!nextEvent || !isRealtimeReportEventRelevant(nextEvent.eventType)) {
        return;
      }

      if (lastHandledRealtimeEventIdRef.current === nextEvent.eventId) {
        return;
      }

      lastHandledRealtimeEventIdRef.current = nextEvent.eventId;

      if (activeSelectedReport?.id && nextEvent.reportId && activeSelectedReport.id === nextEvent.reportId) {
        setSelectedReport((current) =>
          current?.id === nextEvent.reportId
            ? {
                ...current,
                status: nextEvent.status ?? current.status,
                corrected_damage_type: nextEvent.correctedDamageType ?? current.corrected_damage_type,
                ai_status: nextEvent.aiStatus ?? current.ai_status,
                updated_at: nextEvent.updatedAt ?? current.updated_at,
              }
            : current,
        );
      }

      scheduleSoftRefresh();
    };

    window.addEventListener(ROADGIS_REPORT_EVENT, handleRealtimeEvent);

    return () => {
      window.removeEventListener(ROADGIS_REPORT_EVENT, handleRealtimeEvent);
    };
  }, [activeSelectedReport?.id, scheduleSoftRefresh]);

  return (
    <section style={styles.page}>
      <div style={styles.mapStage}>
        <div style={styles.mapViewportWrap}>
          <div style={styles.mapToolbar}>
            <div style={styles.mapToolbarActions}>
              <button
                type="button"
                onClick={() => setIsReportListOpen((value) => !value)}
                style={styles.secondaryMapButton}
                title="Mở danh sách phản ánh trên bản đồ"
              >
                <FiList size={16} />
                <span>Phản ánh</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (canFitResults) {
                    setFitBoundsRequest({ bounds: resultBounds, nonce: Date.now() });
                  }
                }}
                style={styles.secondaryMapButton}
                title="Hiển thị toàn bộ kết quả"
                disabled={!canFitResults}
              >
                <FiMaximize2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  scheduleSoftRefresh();
                }}
                style={styles.secondaryMapButton}
                title="Cập nhật dữ liệu bản đồ"
              >
                <FiRefreshCw size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsMapPanelOpen((value) => !value)}
                style={styles.primaryMapButton}
                title="Mở bộ lọc bản đồ"
              >
                <FiFilter size={17} />
                <span>Bộ lọc</span>
              </button>
            </div>
          </div>

          <WebGisMap
            items={mapItems}
            initialLoading={isLoading}
            refreshing={isRefreshing}
            error={isError ? error : ''}
            center={DEFAULT_GIS_CENTER}
            zoom={DEFAULT_GIS_CENTER.zoom}
            selectedReportId={activeSelectedReport?.id ?? null}
            fitBoundsTarget={fitBoundsRequest}
            focusTarget={
              activeSelectedReport
                ? { ...activeSelectedReport, zoom: SELECTED_REPORT_FOCUS_ZOOM, nonce: focusNonce }
                : null
            }
            selectedReport={activeSelectedReport}
            onViewportChange={handleViewportChange}
            onSelectPoint={handleSelectPoint}
            onOpenDetail={handleOpenDetail}
          />

          {isReportListOpen ? (
            <div style={styles.reportListOverlay}>
              <div style={styles.reportListHeader}>
                <div>
                  <strong style={styles.reportListTitle}>Danh sách phản ánh</strong>
                  <div style={styles.reportListSubtitle}>
                    {viewportSummary.total} phản ánh trong vùng đang xem
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReportListOpen(false)}
                  style={styles.reportListCloseButton}
                  aria-label="Đóng danh sách phản ánh"
                >
                  <FiX size={16} />
                </button>
              </div>

              <div style={styles.reportListBody}>
                {mapItems.length === 0 ? (
                  <div style={styles.reportListEmpty}>Chưa có phản ánh nào trong vùng đang xem.</div>
                ) : (
                  mapItems.slice(0, 24).map((report) => (
                    <button
                      key={report.id}
                      type="button"
                      onClick={() => {
                        focusReportOnMap(report);
                        setIsReportListOpen(false);
                      }}
                      style={{
                        ...styles.reportListItem,
                        ...(activeSelectedReport?.id === report.id ? styles.reportListItemActive : null),
                      }}
                    >
                      <div style={styles.reportListItemTop}>
                        <span style={styles.reportListItemTitle}>
                          {report.damage_label || getEffectiveDamageTypeLabel(report)}
                        </span>
                      </div>
                      <div style={styles.reportListItemMeta}>
                        <FiMapPin size={13} />
                        <span>
                          {report.latitude?.toFixed?.(5)}, {report.longitude?.toFixed?.(5)}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>

        {isMapPanelOpen ? (
          <>
            <button
              type="button"
              aria-label="Đóng bảng bộ lọc bản đồ"
              style={styles.panelBackdrop}
              onClick={() => setIsMapPanelOpen(false)}
            />
            <div style={styles.panelOverlay}>
              <MapFilterPanel
                filters={filters}
                summary={viewportSummary}
                loading={isLoading || isRefreshing}
                error={isError ? error : ''}
                isCompact={isCompactMapLayout}
                layoutMode={layoutMode}
                onStatusChange={(value) => setFilters((current) => ({ ...current, status: value }))}
                onDamageTypeChange={(value) => setFilters((current) => ({ ...current, damageType: value }))}
                onPeriodChange={(value) => setFilters((current) => ({ ...current, periodDays: value }))}
                onReset={() => {
                  setFilters(DEFAULT_FILTERS);
                  setSelectedReport(null);
                  setFitResultsNonce((value) => value + 1);
                  scheduleSoftRefresh();
                }}
                onReload={() => {
                  scheduleSoftRefresh();
                }}
                onFitResults={() => {
                  if (!resultBounds) {
                    return;
                  }

                  setFitBoundsRequest({ bounds: resultBounds, nonce: Date.now() });
                  setIsMapPanelOpen(false);
                }}
                canFitResults={canFitResults}
                onClosePanel={() => setIsMapPanelOpen(false)}
              />
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    gap: 0,
    height: '100%',
    minHeight: 0,
  },
  mapStage: {
    position: 'relative',
    display: 'flex',
    flex: 1,
    height: '100%',
    minHeight: 0,
  },
  secondaryMapButton: {
    minHeight: 40,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    padding: '0 12px',
    borderRadius: 12,
    border: `1px solid ${UI_COLORS.border}`,
    background: UI_COLORS.surface,
    color: UI_COLORS.text,
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  },
  primaryMapButton: {
    minHeight: 40,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    padding: '0 14px',
    borderRadius: 12,
    border: 'none',
    background: UI_COLORS.primary,
    color: UI_COLORS.surface,
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  },
  mapViewportWrap: {
    position: 'relative',
    display: 'flex',
    flex: 1,
    height: '100%',
    minHeight: 0,
  },
  mapToolbar: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 650,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: 0,
    borderRadius: 0,
    background: 'transparent',
    border: 'none',
    boxShadow: 'none',
    backdropFilter: 'none',
    flexWrap: 'wrap',
  },
  mapToolbarActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  panelBackdrop: {
    position: 'absolute',
    inset: 0,
    zIndex: 180,
    border: 0,
    background: 'rgba(15, 23, 42, 0.18)',
    cursor: 'pointer',
  },
  panelOverlay: {
    position: 'absolute',
    top: 62,
    right: 14,
    width: 'min(320px, calc(100% - 28px))',
    zIndex: 190,
  },
  reportListOverlay: {
    position: 'absolute',
    top: 62,
    right: 14,
    width: 'min(320px, calc(100% - 28px))',
    maxHeight: 'min(64vh, 560px)',
    zIndex: 645,
    display: 'grid',
    gap: 0,
    borderRadius: 18,
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.98)',
    border: `1px solid ${UI_COLORS.border}`,
    boxShadow: '0 18px 40px rgba(15, 23, 42, 0.16)',
    backdropFilter: 'blur(10px)',
  },
  reportListHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    borderBottom: `1px solid ${UI_COLORS.border}`,
  },
  reportListTitle: {
    color: UI_COLORS.text,
    fontSize: 16,
    fontWeight: 900,
  },
  reportListSubtitle: {
    marginTop: 4,
    color: UI_COLORS.textMuted,
    fontSize: 12,
    lineHeight: 1.4,
  },
  reportListCloseButton: {
    width: 34,
    height: 34,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    border: `1px solid ${UI_COLORS.border}`,
    background: UI_COLORS.surface,
    color: UI_COLORS.text,
    cursor: 'pointer',
    flexShrink: 0,
  },
  reportListBody: {
    display: 'grid',
    gap: 8,
    padding: 12,
    overflowY: 'auto',
  },
  reportListEmpty: {
    padding: 16,
    background: 'rgba(255,255,255,0.96)',
    borderRadius: 12,
    color: UI_COLORS.textMuted,
    fontSize: 13,
    lineHeight: 1.45,
  },
  reportListItem: {
    display: 'grid',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    border: `1px solid ${UI_COLORS.border}`,
    background: UI_COLORS.surface,
    color: UI_COLORS.text,
    cursor: 'pointer',
    textAlign: 'left',
  },
  reportListItemActive: {
    borderColor: '#B8D5FF',
    background: '#EEF5FF',
  },
  reportListItemTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  reportListItemTitle: {
    color: UI_COLORS.text,
    fontSize: 14,
    fontWeight: 800,
    lineHeight: 1.35,
  },
  reportListItemMeta: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    color: UI_COLORS.textMuted,
    fontSize: 12,
    fontWeight: 700,
  },
};
