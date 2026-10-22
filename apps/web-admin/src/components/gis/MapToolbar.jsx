import { FiFilter, FiRefreshCw, FiMaximize2, FiList } from 'react-icons/fi';
import { UI_COLORS } from '../../constants/statusColors';

export default function MapToolbar({
  onToggleReportList,
  onFitAll,
  canFitResults,
  useServerDBSCAN,
  onToggleDBSCAN,
  onRefresh,
  onToggleMapPanel,
  isPanelActive = false,
  isCompact = false,
}) {
  return (
    <div style={styles.mapToolbar}>
      <div style={{ ...styles.mapToolbarActions, ...(isCompact ? styles.mapToolbarActionsCompact : {}) }}>
        <button
          type="button"
          onClick={onToggleReportList}
          style={{
            ...styles.secondaryMapButton,
            ...(isCompact ? styles.compactButton : {}),
          }}
          title="Mở danh sách phản ánh trên bản đồ"
        >
          <FiList size={isCompact ? 14 : 16} />
          <span>Phản ánh</span>
        </button>
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
          <FiMaximize2 size={isCompact ? 14 : 16} />
        </button>
        <button
          type="button"
          onClick={onToggleDBSCAN}
          style={{
            ...styles.secondaryMapButton,
            ...(isCompact ? styles.compactButton : {}),
            ...(useServerDBSCAN
              ? { backgroundColor: '#e0f2fe', color: '#0369a1', borderColor: '#7dd3fc', fontWeight: 600 }
              : {}),
          }}
          title="Bật/Tắt Phân cụm mật độ PostGIS DBSCAN (Tự động rã thành từng vị trí hư hỏng khi zoom gần)"
        >
          <span>{useServerDBSCAN ? 'DBSCAN: Bật' : 'DBSCAN: Tắt'}</span>
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
          <FiRefreshCw size={isCompact ? 14 : 16} />
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
          <FiFilter size={isCompact ? 14 : 17} />
          <span>Bộ lọc</span>
        </button>
      </div>
    </div>
  );
}

const styles = {
  mapToolbar: {
    display: 'flex',
    alignItems: 'center',
  },
  mapToolbarActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  mapToolbarActionsCompact: {
    gap: 6,
  },
  primaryMapButton: {
    minHeight: 40,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 16px',
    borderRadius: 12,
    border: 'none',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  primaryMapButtonActive: {
    background: UI_COLORS.primary,
    color: '#FFFFFF',
    boxShadow: '0 4px 12px rgba(15, 82, 186, 0.3)',
  },
  primaryMapButtonInactive: {
    background: '#FFFFFF',
    color: UI_COLORS.text,
    border: `1px solid ${UI_COLORS.border}`,
    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.08)',
  },
  secondaryMapButton: {
    minHeight: 40,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 14px',
    borderRadius: 12,
    border: `1px solid ${UI_COLORS.border}`,
    background: '#FFFFFF',
    color: UI_COLORS.text,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.08)',
    transition: 'all 0.15s ease',
  },
  compactButton: {
    minHeight: 36,
    padding: '0 10px',
    fontSize: 12,
    gap: 5,
    borderRadius: 10,
  },
};
