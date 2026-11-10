import { FiFilter, FiRefreshCw, FiMaximize2, FiList, FiSlash, FiXCircle } from 'react-icons/fi';
import { UI_COLORS } from '../../constants/statusColors';

export default function MapToolbar({
  onToggleReportList,
  onToggleRestrictionOverlay,
  isRestrictionsOverlayOpen = false,
  restrictionsCount = 0,
  onFitAll,
  canFitResults,
  useServerDBSCAN,
  onToggleDBSCAN,
  onRefresh,
  onToggleMapPanel,
  isPanelActive = false,
  isCompact = false,
  hasActiveFilters = false,
  activeFilterCount = 0,
  onResetAllFilters,
}) {
  return (
    <div style={styles.mapToolbar}>
      <div style={{ ...styles.mapToolbarActions, ...(isCompact ? styles.mapToolbarActionsCompact : {}) }}>
        {hasActiveFilters && onResetAllFilters ? (
          <button
            type="button"
            onClick={onResetAllFilters}
            style={{
              ...styles.resetMapButton,
              ...(isCompact ? styles.compactButton : {}),
            }}
            title="Hủy toàn bộ bộ lọc và xem toàn bộ phản ánh hư hỏng"
            aria-label="Hủy lọc"
          >
            <FiXCircle size={isCompact ? 13 : 15} />
            <span className="road-toolbar-btn-text">Hủy lọc{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={onToggleReportList}
          style={{
            ...styles.secondaryMapButton,
            ...(isCompact ? styles.compactButton : {}),
          }}
          title="Mở danh sách phản ánh trên bản đồ"
        >
          <FiList size={isCompact ? 13 : 15} />
          <span className="road-toolbar-btn-text">Phản ánh</span>
        </button>
        {onToggleRestrictionOverlay ? (
          <button
            type="button"
            onClick={onToggleRestrictionOverlay}
            style={{
              ...styles.secondaryMapButton,
              ...(isCompact ? styles.compactButton : {}),
              ...(isRestrictionsOverlayOpen
                ? { backgroundColor: '#fee2e2', color: '#b91c1c', borderColor: '#fca5a5', fontWeight: 700 }
                : {}),
            }}
            title="Quản lý và thiết lập các đoạn tuyến đường hạn chế lưu thông / thi công"
          >
            <FiSlash size={isCompact ? 13 : 15} />
            <span className="road-toolbar-btn-text">
              Hạn chế{restrictionsCount > 0 ? ` (${restrictionsCount})` : ''}
            </span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={onFitAll}
          style={{
            ...styles.secondaryMapButton,
            ...(isCompact ? styles.compactButton : {}),
          }}
          title="Hiển thị toàn bộ kết quả"
          disabled={!canFitResults}
        >
          <FiMaximize2 size={isCompact ? 13 : 15} />
        </button>
        <button
          type="button"
          onClick={onToggleDBSCAN}
          style={{
            ...styles.secondaryMapButton,
            ...(isCompact ? styles.compactButton : {}),
            ...(useServerDBSCAN
              ? { backgroundColor: '#e0f2fe', color: '#0369a1', borderColor: '#7dd3fc', fontWeight: 700 }
              : {}),
          }}
          title="Bật/Tắt Phân cụm mật độ PostGIS DBSCAN (Tự động rã thành từng vị trí hư hỏng khi zoom gần)"
        >
          <span style={{ whiteSpace: 'nowrap' }}>{useServerDBSCAN ? 'DBSCAN: Bật' : 'DBSCAN: Tắt'}</span>
        </button>
        <button
          type="button"
          onClick={onRefresh}
          style={{
            ...styles.secondaryMapButton,
            ...(isCompact ? styles.compactButton : {}),
          }}
          title="Cập nhật dữ liệu bản đồ"
        >
          <FiRefreshCw size={isCompact ? 13 : 14} />
        </button>
        <button
          type="button"
          onClick={onToggleMapPanel}
          style={{
            ...styles.primaryMapButton,
            ...(isCompact ? styles.compactButton : {}),
            ...(isPanelActive ? styles.primaryMapButtonActive : styles.primaryMapButtonInactive),
          }}
          title={isPanelActive ? 'Đóng bộ lọc bản đồ' : 'Mở bộ lọc bản đồ'}
        >
          <FiFilter size={isCompact ? 13 : 15} />
          <span className="road-toolbar-btn-text">Bộ lọc</span>
        </button>
      </div>
    </div>
  );
}

const styles = {
  mapToolbar: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  mapToolbarActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'nowrap',
  },
  mapToolbarActionsCompact: {
    gap: 4,
  },
  resetMapButton: {
    minHeight: 34,
    height: 34,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '0 10px',
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#fca5a5',
    background: '#fef2f2',
    color: '#dc2626',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.12)',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  primaryMapButton: {
    minHeight: 34,
    height: 34,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '0 12px',
    borderRadius: 10,
    border: 'none',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  primaryMapButtonActive: {
    background: UI_COLORS.primary,
    color: '#FFFFFF',
    boxShadow: '0 2px 8px rgba(15, 82, 186, 0.3)',
  },
  primaryMapButtonInactive: {
    background: '#FFFFFF',
    color: UI_COLORS.text,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: UI_COLORS.border,
    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.08)',
  },
  secondaryMapButton: {
    minHeight: 34,
    height: 34,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '0 10px',
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: UI_COLORS.border,
    background: '#FFFFFF',
    color: UI_COLORS.text,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.08)',
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  compactButton: {
    minHeight: 32,
    height: 32,
    padding: '0 8px',
    fontSize: 11,
    gap: 4,
    borderRadius: 8,
  },
};
