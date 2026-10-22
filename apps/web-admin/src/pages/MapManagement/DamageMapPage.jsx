import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MapFilterPanel from '../../components/MapFilterPanel';
import WebGisMap from '../../components/WebGisMap';
import useAsyncData from '../../hooks/useAsyncData';
import { UI_COLORS } from '../../constants/statusColors';
import {
  isRealtimeReportEventRelevant,
  normalizeRealtimeReportEvent,
  ROADGIS_REPORT_EVENT,
} from '../../utils/realtimeEvents';
import {
  DEFAULT_GIS_CENTER,
  fetchAdminReportsGis,
  fetchReportClustersGis,
  getMapErrorMessage,
} from '../../services/mapAdminService';
import AdministrativeFilterBar from '../../components/gis/AdministrativeFilterBar';
import ReportDetailDrawer from '../../components/gis/ReportDetailDrawer';
import MapReportListOverlay from '../../components/gis/MapReportListOverlay';
import MapToolbar from '../../components/gis/MapToolbar';
import { useAuth } from '../../hooks/useAuth';
import {
  DISTRICT_CENTERS,
  DEFAULT_FILTERS,
  SELECTED_REPORT_FOCUS_ZOOM,
  MAP_REALTIME_REFRESH_DEBOUNCE_MS,
  zoomToBounds,
  normalizeBounds,
  areBoundsEffectivelyEqual,
} from '../../constants/mapConstants';

export default function DamageMapPage() {
  const navigate = useNavigate();
  const { managedDistrict } = useAuth();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [adminFilters, setAdminFilters] = useState(() => ({
    province: '',
    district: managedDistrict || '',
    ward: '',
    roadName: '',
  }));
  const [selectedReport, setSelectedReport] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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

  const handleDistrictSelect = useCallback((districtName) => {
    if (!districtName) {
      return;
    }

    const center = DISTRICT_CENTERS[districtName];
    if (center) {
      const step = 0.025;
      setFitBoundsRequest({
        bounds: {
          southWest: {
            lat: center.latitude - step,
            lng: center.longitude - step,
          },
          northEast: {
            lat: center.latitude + step,
            lng: center.longitude + step,
          },
        },
        nonce: Date.now(),
      });
    }
  }, []);

  useEffect(() => {
    if (managedDistrict && adminFilters.district !== managedDistrict) {
      setAdminFilters((current) => ({
        ...current,
        district: managedDistrict,
      }));
    }
  }, [managedDistrict, adminFilters.district]);

  useEffect(() => {
    if (managedDistrict && DISTRICT_CENTERS[managedDistrict]) {
      handleDistrictSelect(managedDistrict);
    }
  }, [managedDistrict, handleDistrictSelect]);

  const queryState = useMemo(
    () => ({
      status: filters.status,
      damageType: filters.damageType,
      periodDays: filters.periodDays,
      province: adminFilters.province,
      district: adminFilters.district,
      ward: adminFilters.ward,
      roadName: adminFilters.roadName,
      bounds: queryBounds,
      limit: 1000,
    }),
    [filters, adminFilters, queryBounds],
  );

  const { data, isLoading, isRefreshing, error, isError, reload } = useAsyncData(async () => {
    try {
      return await fetchAdminReportsGis(queryState);
    } catch (requestError) {
      throw new Error(getMapErrorMessage(requestError));
    }
  }, [
    queryState.status,
    queryState.damageType,
    queryState.periodDays,
    queryState.province,
    queryState.district,
    queryState.ward,
    queryState.roadName,
    queryState.bounds,
  ]);

  const mapItems = Array.isArray(data?.items) ? data.items : [];
  const [useServerDBSCAN, setUseServerDBSCAN] = useState(false);
  const [serverClusters, setServerClusters] = useState(null);

  useEffect(() => {
    if (!useServerDBSCAN) {
      setServerClusters(null);
      return;
    }

    let isCancelled = false;
    async function loadClusters() {
      try {
        const clusters = await fetchReportClustersGis({
          eps: 0.003,
          minPoints: 2,
          status: filters.status,
          district: adminFilters.district,
          ward: adminFilters.ward,
        });
        if (!isCancelled) {
          setServerClusters(clusters);
        }
      } catch (err) {
        if (!isCancelled) {
          setServerClusters(null);
        }
      }
    }

    loadClusters();
    return () => {
      isCancelled = true;
    };
  }, [useServerDBSCAN, filters.status, adminFilters.district, adminFilters.ward]);

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
  const isCompactMapLayout = layoutMode === 'mobile' || layoutMode === 'tablet';

  useEffect(() => {
    if (selectedReport && !selectedReportDetail) {
      setSelectedReport(null);
    }
  }, [selectedReport, selectedReportDetail]);

  // Tự động zoom và định vị bao quát kết quả khi người dùng lọc địa giới hoặc tìm tên đường
  const lastAutoFitSignatureRef = useRef('');
  useEffect(() => {
    const hasAdminFilter = Boolean(
      adminFilters.province ||
      adminFilters.district ||
      adminFilters.ward ||
      adminFilters.roadName
    );

    if (!hasAdminFilter) {
      return;
    }

    const filterKey = `${adminFilters.province || ''}:${adminFilters.district || ''}:${adminFilters.ward || ''}:${adminFilters.roadName || ''}`;

    if (data?.items && data.items.length > 0 && resultBounds) {
      const signature = `${filterKey}:${data.items.length}:${data.bbox?.join(',')}`;
      if (lastAutoFitSignatureRef.current !== signature) {
        lastAutoFitSignatureRef.current = signature;
        if (data.items.length === 1) {
          const single = data.items[0];
          setSelectedReport(single);
          setFitBoundsRequest({
            bounds: {
              southWest: { lat: single.latitude - 0.003, lng: single.longitude - 0.003 },
              northEast: { lat: single.latitude + 0.003, lng: single.longitude + 0.003 },
            },
            nonce: Date.now(),
          });
        } else {
          setFitBoundsRequest({
            bounds: resultBounds,
            nonce: Date.now(),
          });
        }
      }
    } else if (data?.items && data.items.length === 0 && adminFilters.district) {
      const center = DISTRICT_CENTERS[adminFilters.district];
      if (center) {
        const step = 0.025;
        const districtSig = `empty-district:${adminFilters.district}`;
        if (lastAutoFitSignatureRef.current !== districtSig) {
          lastAutoFitSignatureRef.current = districtSig;
          setFitBoundsRequest({
            bounds: {
              southWest: { lat: center.latitude - step, lng: center.longitude - step },
              northEast: { lat: center.latitude + step, lng: center.longitude + step },
            },
            nonce: Date.now(),
          });
        }
      }
    }
  }, [adminFilters, data, resultBounds]);

  const handleResetAdminFilters = useCallback(() => {
    setAdminFilters({
      province: '',
      district: managedDistrict || '',
      ward: '',
      roadName: '',
    });
    setSelectedReport(null);
    setIsDrawerOpen(false);
    setFitBoundsRequest({
      bounds: zoomToBounds(
        { latitude: DEFAULT_GIS_CENTER.latitude, longitude: DEFAULT_GIS_CENTER.longitude },
        DEFAULT_GIS_CENTER.zoom,
      ),
      nonce: Date.now(),
    });
  }, [managedDistrict]);

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
    setIsDrawerOpen(true);
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
    setIsDrawerOpen(true);
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

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (isDrawerOpen) {
          setIsDrawerOpen(false);
        } else if (selectedReport) {
          setSelectedReport(null);
        } else if (isReportListOpen) {
          setIsReportListOpen(false);
        } else if (isMapPanelOpen) {
          setIsMapPanelOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, isMapPanelOpen, isReportListOpen, selectedReport]);

  return (
    <section style={styles.page}>
      <div style={styles.mapStage}>
        <div style={styles.mapViewportWrap}>
          <div style={styles.mapTopControls}>
            <div style={styles.adminFilterSlot}>
              <AdministrativeFilterBar
                filters={adminFilters}
                values={adminFilters}
                onChange={setAdminFilters}
                onDistrictSelect={handleDistrictSelect}
                fixedDistrict={managedDistrict}
                totalResults={mapItems.length}
                isLoadingResults={isLoading || isRefreshing}
                onReset={handleResetAdminFilters}
                isCompact={isCompactMapLayout}
              />
            </div>
            <div style={styles.toolbarSlot}>
              <MapToolbar
                onToggleReportList={() => {
                  setIsReportListOpen((value) => !value);
                  setIsMapPanelOpen(false);
                }}
                onFitAll={() => {
                  if (canFitResults) {
                    setFitBoundsRequest({ bounds: resultBounds, nonce: Date.now() });
                  }
                }}
                canFitResults={canFitResults}
                useServerDBSCAN={useServerDBSCAN}
                onToggleDBSCAN={() => setUseServerDBSCAN((v) => !v)}
                onRefresh={scheduleSoftRefresh}
                onToggleMapPanel={() => {
                  if (isCompactMapLayout) {
                    setIsMapPanelOpen((value) => !value);
                    setIsReportListOpen(false);
                  } else {
                    setIsSidebarOpen((value) => !value);
                  }
                }}
                isPanelActive={isCompactMapLayout ? isMapPanelOpen : isSidebarOpen}
                isCompact={isCompactMapLayout}
              />
            </div>
          </div>

          <WebGisMap
            items={mapItems}
            serverClusters={useServerDBSCAN ? serverClusters : null}
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
            selectedReport={isDrawerOpen ? null : activeSelectedReport}
            onViewportChange={handleViewportChange}
            onSelectPoint={handleSelectPoint}
            onOpenDetail={handleOpenDetail}
            onCloseDetail={() => {
              setSelectedReport(null);
              setIsDrawerOpen(false);
            }}
          />

          <MapReportListOverlay
            isOpen={isReportListOpen}
            onClose={() => setIsReportListOpen(false)}
            totalCount={viewportSummary.total}
            mapItems={mapItems}
            activeSelectedReport={activeSelectedReport}
            onFocusReport={focusReportOnMap}
          />
        </div>

        {/* Mobile / Tablet Slide-in Modal Drawer */}
        {isCompactMapLayout && isMapPanelOpen ? (
          <div style={styles.modalOverlay} role="presentation">
            <button
              type="button"
              style={styles.modalBackdrop}
              onClick={() => setIsMapPanelOpen(false)}
              aria-label="Đóng bảng lọc bản đồ"
            />
            <div style={styles.modalDrawer}>
              <MapFilterPanel
                filters={filters}
                summary={viewportSummary}
                totalResults={mapItems.length}
                canFitResults={canFitResults}
                isCompact
                layoutMode={layoutMode}
                onChange={setFilters}
                onStatusChange={(status) => setFilters((f) => ({ ...f, status }))}
                onDamageTypeChange={(damageType) => setFilters((f) => ({ ...f, damageType }))}
                onPeriodChange={(periodDays) => setFilters((f) => ({ ...f, periodDays }))}
                onReset={() => {
                  setFilters(DEFAULT_FILTERS);
                  setFitResultsNonce((value) => value + 1);
                }}
                onFitResults={() => setFitResultsNonce((value) => value + 1)}
                onReload={scheduleSoftRefresh}
                onClose={() => setIsMapPanelOpen(false)}
              />
            </div>
          </div>
        ) : null}

        {/* Desktop Collapsible Sidebar */}
        {!isCompactMapLayout && isSidebarOpen ? (
          <aside className="road-admin-map-sidebar" style={styles.mapSidebar}>
            <MapFilterPanel
              filters={filters}
              summary={viewportSummary}
              totalResults={mapItems.length}
              canFitResults={canFitResults}
              onChange={setFilters}
              onStatusChange={(status) => setFilters((f) => ({ ...f, status }))}
              onDamageTypeChange={(damageType) => setFilters((f) => ({ ...f, damageType }))}
              onPeriodChange={(periodDays) => setFilters((f) => ({ ...f, periodDays }))}
              onReset={() => {
                setFilters(DEFAULT_FILTERS);
                setFitResultsNonce((value) => value + 1);
              }}
              onFitResults={() => setFitResultsNonce((value) => value + 1)}
              onReload={scheduleSoftRefresh}
              onClose={() => setIsSidebarOpen(false)}
            />
          </aside>
        ) : null}
      </div>

      <ReportDetailDrawer
        report={activeSelectedReport}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onOpenFullDetail={handleOpenDetail}
      />
    </section>
  );
}

const styles = {
  page: {
    height: '100%',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  mapStage: {
    display: 'flex',
    flex: 1,
    gap: 16,
    minHeight: 0,
    height: '100%',
    position: 'relative',
  },
  mapViewportWrap: {
    position: 'relative',
    display: 'flex',
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    height: '100%',
    borderRadius: 18,
    overflow: 'hidden',
  },
  mapTopControls: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    zIndex: 650,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    pointerEvents: 'none',
    flexWrap: 'wrap',
  },
  adminFilterSlot: {
    pointerEvents: 'auto',
    flex: '1 1 auto',
    maxWidth: '100%',
  },
  toolbarSlot: {
    pointerEvents: 'auto',
    flexShrink: 0,
  },
  mapSidebar: {
    width: 320,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    transition: 'all 0.2s ease',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1050,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    inset: 0,
    border: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    backdropFilter: 'blur(3px)',
    cursor: 'pointer',
  },
  modalDrawer: {
    position: 'relative',
    zIndex: 1,
    width: 'min(90vw, 360px)',
    height: '100%',
    backgroundColor: '#FFFFFF',
    boxShadow: '-8px 0 32px rgba(15, 23, 42, 0.25)',
    display: 'flex',
    flexDirection: 'column',
  },
};
