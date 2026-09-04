import { DAMAGE_TYPES, STATUS_COLORS, UI_COLORS } from '../constants/statusColors';
import StatusBadge from './StatusBadge';
import WebButton from './WebButton';

const PERIOD_OPTIONS = [
  { value: '', label: 'Toàn bộ thời gian' },
  { value: '7', label: '7 ngày gần đây' },
  { value: '30', label: '30 ngày gần đây' },
  { value: '90', label: '90 ngày gần đây' },
  { value: '365', label: '12 tháng gần đây' },
];

export default function MapFilterPanel({
  filters,
  summary,
  loading = false,
  error = '',
  isCompact = false,
  layoutMode = 'desktop',
  canFitResults = false,
  onStatusChange,
  onDamageTypeChange,
  onPeriodChange,
  onReset,
  onClosePanel,
  onFitResults,
  onReload,
}) {
  const isMobileLayout = isCompact || layoutMode === 'mobile';
  const isTabletLayout = layoutMode === 'tablet';
  const summaryGridStyle = isMobileLayout
    ? { ...styles.summaryGrid, gridTemplateColumns: '1fr' }
    : styles.summaryGrid;
  const actionRowStyle = isMobileLayout
    ? { ...styles.actionRow, gridTemplateColumns: '1fr' }
    : isTabletLayout
      ? { ...styles.actionRow, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }
      : styles.actionRow;

  return (
    <aside
      className={`road-map-filter-panel road-map-filter-panel--${layoutMode}${isCompact ? ' road-map-filter-panel--compact' : ''}`}
      style={styles.panel}
    >
      <div style={styles.headerWrap}>
        <h3 style={styles.panelTitle}>Bộ lọc bản đồ</h3>
        {isCompact ? (
          <button type="button" onClick={onClosePanel} style={styles.compactCloseButton}>
            Đóng
          </button>
        ) : null}
      </div>
      <div>
        <p style={styles.panelSubtitle}>Thu gọn để lọc nhanh theo trạng thái, loại hư hỏng và thời gian.</p>
      </div>

      <div style={styles.summaryBox}>
        <div style={styles.summaryHeader}>
          <div style={styles.summaryValue}>{summary?.total ?? 0}</div>
          <div style={styles.summaryHeadline}>vị trí trong vùng đang xem</div>
        </div>
        <div style={summaryGridStyle}>
          <div style={styles.summaryStatCard}>
            <span style={styles.summaryStatLabel}>Chờ xác minh</span>
            <strong style={styles.summaryStatValue}>{summary?.pending ?? 0}</strong>
          </div>
          <div style={styles.summaryStatCard}>
            <span style={styles.summaryStatLabel}>Đang xử lý</span>
            <strong style={styles.summaryStatValue}>{summary?.processing ?? 0}</strong>
          </div>
          <div style={styles.summaryStatCard}>
            <span style={styles.summaryStatLabel}>Đã sửa chữa</span>
            <strong style={styles.summaryStatValue}>{summary?.repaired ?? 0}</strong>
          </div>
          <div style={styles.summaryStatCard}>
            <span style={styles.summaryStatLabel}>Loại phổ biến</span>
            <strong style={styles.summaryStatValue}>{summary?.topDamageLabel ?? 'Chưa xác định'}</strong>
          </div>
        </div>
      </div>

      <div style={styles.filterGroup}>
        <div style={styles.filterTitle}>Trạng thái xử lý</div>
        <select
          value={filters?.status ?? ''}
          onChange={(event) => onStatusChange?.(event.target.value)}
          style={styles.select}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="pending">Chờ xác minh</option>
          <option value="processing">Đang xử lý</option>
          <option value="repaired">Đã sửa chữa</option>
        </select>

        <div style={styles.statusLegend}>
          {Object.keys(STATUS_COLORS)
            .filter((key) => ['pending', 'processing', 'repaired'].includes(key))
            .map((key) => (
              <StatusBadge key={key} status={key} size="sm" />
            ))}
        </div>
      </div>

      <div style={styles.filterGroup}>
        <div style={styles.filterTitle}>Loại hư hỏng</div>
        <select
          value={filters?.damageType ?? ''}
          onChange={(event) => onDamageTypeChange?.(event.target.value)}
          style={styles.select}
        >
          <option value="">Tất cả loại hư hỏng</option>
          {Object.entries(DAMAGE_TYPES).map(([key, value]) => (
            <option key={key} value={key}>
              {value.label} ({key})
            </option>
          ))}
        </select>
      </div>

      <div style={styles.filterGroup}>
        <div style={styles.filterTitle}>Thời gian gửi báo cáo</div>
        
        <select
          value={filters?.periodDays ?? ''}
          onChange={(event) => onPeriodChange?.(event.target.value)}
          style={styles.select}
        >
          {PERIOD_OPTIONS.map((option) => (
            <option key={option.value || 'all-period'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div style={actionRowStyle}>
        <WebButton variant="secondary" onClick={onReset} style={styles.actionButton}>
          Xóa bộ lọc
        </WebButton>
        <WebButton
          variant="secondary"
          onClick={onFitResults}
          disabled={!canFitResults}
          title={!canFitResults ? 'Không có dữ liệu phù hợp để hiển thị toàn bộ.' : 'Hiển thị toàn bộ kết quả hiện có trên bản đồ'}
          style={styles.actionButton}
        >
          Hiển thị toàn bộ kết quả
        </WebButton>
        <WebButton onClick={onReload} style={styles.actionButton}>
          Cập nhật dữ liệu
        </WebButton>
      </div>

      {!canFitResults && !loading && !error ? (
        <div style={styles.fitHint}>
          Không có dữ liệu phù hợp để hiển thị toàn bộ trên bản đồ.
        </div>
      ) : null}
    </aside>
  );
}

const styles = {
  panel: {
    minWidth: 0,
    maxHeight: 720,
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    padding: 18,
    overflowY: 'auto',
    border: `1px solid ${UI_COLORS.border}`,
    borderRadius: 20,
    background: 'rgba(255,255,255,0.98)',
    boxShadow: '0 18px 42px rgba(15, 23, 42, 0.14)',
    boxSizing: 'border-box',
  },
  headerWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  panelTitle: {
    margin: 0,
    color: UI_COLORS.text,
    fontSize: 18,
    fontWeight: 900,
  },
  panelSubtitle: {
    margin: '6px 0 0',
    color: UI_COLORS.textMuted,
    fontSize: 13,
    lineHeight: 1.45,
  },
  compactCloseButton: {
    minHeight: 40,
    padding: '0 14px',
    borderRadius: 999,
    border: `1px solid ${UI_COLORS.border}`,
    background: UI_COLORS.surfaceMuted,
    color: UI_COLORS.primaryDark,
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
  },
  summaryBox: {
    padding: 14,
    borderRadius: 16,
    background: UI_COLORS.surfaceMuted,
    border: `1px solid ${UI_COLORS.border}`,
  },
  summaryHeader: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 10,
    flexWrap: 'wrap',
  },
  summaryValue: {
    color: UI_COLORS.primaryDark,
    fontSize: 26,
    fontWeight: 900,
  },
  summaryHeadline: {
    color: UI_COLORS.textMuted,
    fontSize: 12,
    lineHeight: 1.35,
    fontWeight: 700,
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 8,
    marginTop: 12,
  },
  summaryStatCard: {
    display: 'grid',
    gap: 4,
    padding: 10,
    borderRadius: 12,
    background: UI_COLORS.surface,
    border: `1px solid ${UI_COLORS.border}`,
  },
  summaryStatLabel: {
    color: UI_COLORS.textMuted,
    fontSize: 12,
    lineHeight: 1.35,
    fontWeight: 700,
  },
  summaryStatValue: {
    color: UI_COLORS.text,
    fontSize: 15,
    lineHeight: 1.35,
    fontWeight: 900,
  },
  filterGroup: {
    display: 'grid',
    gap: 10,
  },
  filterTitle: {
    color: UI_COLORS.text,
    fontSize: 13,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  select: {
    minHeight: 44,
    padding: '0 14px',
    borderRadius: 12,
    border: `1px solid ${UI_COLORS.border}`,
    background: UI_COLORS.surface,
    color: UI_COLORS.text,
    fontSize: 14,
    outline: 'none',
  },
  statusLegend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 10,
  },
  actionButton: {
    width: '100%',
  },
  fitHint: {
    marginTop: -10,
    color: UI_COLORS.textMuted,
    fontSize: 12,
    lineHeight: 1.45,
  },
};
