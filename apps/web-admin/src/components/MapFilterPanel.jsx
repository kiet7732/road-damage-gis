import { FiX, FiRefreshCw } from 'react-icons/fi';
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
  onChange,
  onStatusChange,
  onDamageTypeChange,
  onPeriodChange,
  onReset,
  onClose,
  onClosePanel,
  onFitResults,
  onReload,
}) {
  const handleStatusChange = (val) => {
    if (onStatusChange) onStatusChange(val);
    if (onChange) onChange((prev) => ({ ...prev, status: val }));
  };

  const handleDamageTypeChange = (val) => {
    if (onDamageTypeChange) onDamageTypeChange(val);
    if (onChange) onChange((prev) => ({ ...prev, damageType: val }));
  };

  const handlePeriodChange = (val) => {
    if (onPeriodChange) onPeriodChange(val);
    if (onChange) onChange((prev) => ({ ...prev, periodDays: val }));
  };

  const handleClose = onClosePanel || onClose;

  const isMobileLayout = isCompact || layoutMode === 'mobile';
  const summaryGridStyle = isMobileLayout
    ? { ...styles.summaryGrid, gridTemplateColumns: '1fr' }
    : styles.summaryGrid;

  return (
    <aside
      className={`road-map-filter-panel road-map-filter-panel--${layoutMode}${isCompact ? ' road-map-filter-panel--compact' : ''}`}
      style={styles.panel}
    >
      <div style={styles.headerWrap}>
        <h3 style={styles.panelTitle}>Bộ lọc bản đồ</h3>
        {handleClose ? (
          <button
            type="button"
            onClick={handleClose}
            style={styles.closeButton}
            aria-label="Đóng bộ lọc bản đồ"
            title="Đóng bộ lọc"
          >
            <FiX size={18} />
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
          <div style={styles.summaryStatCard} title={summary?.topDamageLabel ?? 'Chưa xác định'}>
            <span style={styles.summaryStatLabel}>Loại phổ biến</span>
            <strong style={styles.summaryStatValue}>{summary?.topDamageLabel ?? 'Chưa xác định'}</strong>
          </div>
        </div>
      </div>

      <div style={styles.filterGroup}>
        <div style={styles.filterTitle}>Trạng thái xử lý</div>
        <select
          value={filters?.status ?? ''}
          onChange={(event) => handleStatusChange(event.target.value)}
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
            .map((key) => {
              const isSelected = filters?.status === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleStatusChange(isSelected ? '' : key)}
                  style={{
                    border: isSelected ? `2px solid ${STATUS_COLORS[key]?.dot || '#0F52BA'}` : '2px solid transparent',
                    borderRadius: 999,
                    background: 'none',
                    padding: 1,
                    cursor: 'pointer',
                    opacity: filters?.status && !isSelected ? 0.45 : 1,
                    transform: isSelected ? 'scale(1.05)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                  title={isSelected ? 'Bỏ chọn trạng thái này' : `Lọc theo: ${STATUS_COLORS[key]?.label}`}
                >
                  <StatusBadge status={key} size="sm" />
                </button>
              );
            })}
        </div>
      </div>

      <div style={styles.filterGroup}>
        <div style={styles.filterTitle}>Loại hư hỏng</div>
        <select
          value={filters?.damageType ?? ''}
          onChange={(event) => handleDamageTypeChange(event.target.value)}
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
          onChange={(event) => handlePeriodChange(event.target.value)}
          style={styles.select}
        >
          {PERIOD_OPTIONS.map((option) => (
            <option key={option.value || 'all-period'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.actionSection}>
        <WebButton onClick={onReload} style={styles.primaryActionButton}>
          <FiRefreshCw size={14} />
          <span>Cập nhật dữ liệu</span>
        </WebButton>
        <div style={styles.secondaryActionRow}>
          <WebButton
            variant="secondary"
            onClick={onFitResults}
            disabled={!canFitResults}
            title={!canFitResults ? 'Không có dữ liệu phù hợp để hiển thị toàn bộ.' : 'Hiển thị toàn bộ kết quả hiện có trên bản đồ'}
            style={styles.actionButton}
          >
            Hiển thị toàn bộ
          </WebButton>
          <WebButton variant="secondary" onClick={onReset} style={styles.actionButton}>
            Xóa bộ lọc
          </WebButton>
        </div>
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
    maxHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: '14px 16px',
    overflowY: 'auto',
    border: `1px solid ${UI_COLORS.border}`,
    borderRadius: 18,
    background: 'rgba(255,255,255,0.98)',
    boxShadow: '0 18px 42px rgba(15, 23, 42, 0.14)',
    boxSizing: 'border-box',
  },
  headerWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  panelTitle: {
    margin: 0,
    color: UI_COLORS.text,
    fontSize: 16,
    fontWeight: 900,
  },
  panelSubtitle: {
    margin: '3px 0 0',
    color: UI_COLORS.textMuted,
    fontSize: 12,
    lineHeight: 1.4,
  },
  closeButton: {
    width: 32,
    height: 32,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    border: `1px solid ${UI_COLORS.border}`,
    background: UI_COLORS.surfaceMuted,
    color: UI_COLORS.text,
    cursor: 'pointer',
    flexShrink: 0,
  },
  compactCloseButton: {
    minHeight: 36,
    padding: '0 12px',
    borderRadius: 999,
    border: `1px solid ${UI_COLORS.border}`,
    background: UI_COLORS.surfaceMuted,
    color: UI_COLORS.primaryDark,
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  },
  summaryBox: {
    padding: '10px 12px',
    borderRadius: 12,
    background: UI_COLORS.surfaceMuted,
    border: `1px solid ${UI_COLORS.border}`,
  },
  summaryHeader: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    flexWrap: 'wrap',
  },
  summaryValue: {
    color: UI_COLORS.primaryDark,
    fontSize: 22,
    fontWeight: 900,
  },
  summaryHeadline: {
    color: UI_COLORS.textMuted,
    fontSize: 11,
    lineHeight: 1.35,
    fontWeight: 700,
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 6,
    marginTop: 8,
  },
  summaryStatCard: {
    display: 'grid',
    gap: 2,
    padding: '6px 8px',
    borderRadius: 10,
    background: UI_COLORS.surface,
    border: `1px solid ${UI_COLORS.border}`,
    minWidth: 0,
  },
  summaryStatLabel: {
    color: UI_COLORS.textMuted,
    fontSize: 11,
    lineHeight: 1.35,
    fontWeight: 700,
  },
  summaryStatValue: {
    color: UI_COLORS.text,
    fontSize: 13,
    lineHeight: 1.35,
    fontWeight: 800,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  filterGroup: {
    display: 'grid',
    gap: 6,
  },
  filterTitle: {
    color: UI_COLORS.text,
    fontSize: 11,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  select: {
    minHeight: 38,
    height: 38,
    padding: '0 10px',
    borderRadius: 10,
    border: `1px solid ${UI_COLORS.border}`,
    background: UI_COLORS.surface,
    color: UI_COLORS.text,
    fontSize: 13,
    outline: 'none',
  },
  statusLegend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  actionSection: {
    display: 'grid',
    gap: 8,
  },
  primaryActionButton: {
    width: '100%',
    minHeight: 38,
    height: 38,
    fontSize: 13,
    fontWeight: 800,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryActionRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 8,
  },
  actionButton: {
    width: '100%',
    minHeight: 36,
    height: 36,
    padding: '0 8px',
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  fitHint: {
    marginTop: -4,
    color: UI_COLORS.textMuted,
    fontSize: 11,
    lineHeight: 1.4,
  },
};
