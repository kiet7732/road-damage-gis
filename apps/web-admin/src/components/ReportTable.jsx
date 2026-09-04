import { useMemo } from 'react';
import { FiEye, FiMapPin, FiRefreshCw, FiSearch } from 'react-icons/fi';
import { DAMAGE_TYPES, DAMAGE_TYPE_COLORS, UI_COLORS } from '../constants/statusColors';
import { getReportImageUrl } from '../services/reportAdminService';
import { formatAccuracy, formatCoordinate, formatDateTime } from '../utils/formatters';
import { getEffectiveDamageType, getPrimaryConfidence } from '../utils/reportDamage';
import EmptyState from './EmptyState';
import Panel from './Panel';
import { TableSkeleton } from './Skeleton';
import StatusBadge from './StatusBadge';
import WebButton from './WebButton';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'pending', label: 'Chờ xác minh' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'repaired', label: 'Đã sửa chữa' },
];

const DAMAGE_OPTIONS = [
  { value: '', label: 'Tất cả loại hư hỏng' },
  { value: 'D00', label: 'D00 - Nứt dọc' },
  { value: 'D10', label: 'D10 - Nứt ngang' },
  { value: 'D20', label: 'D20 - Nứt da cá sấu' },
  { value: 'D40', label: 'D40 - Ổ gà' },
];

export default function ReportTable({
  title = 'Danh sách phản ánh',
  items = [],
  total = 0,
  page = 1,
  pageSize = 10,
  totalPages = 1,
  loading = false,
  error = '',
  filters,
  onSearchChange,
  onSearchSubmit,
  onStatusChange,
  onDamageTypeChange,
  onResetFilters,
  onPageChange,
  onRetry,
  onViewDetail,
  manualReviewMode = false,
}) {
  const safeItems = Array.isArray(items) ? items : [];
  const rangeLabel = useMemo(() => {
    if (total <= 0) {
      return '0 phản ánh';
    }

    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `${start}-${end} / ${total} phản ánh`;
  }, [page, pageSize, total]);

  return (
    <Panel>
      <div className="road-admin-table-panel-header" style={styles.header}>
        <div style={styles.headerCopy}>
          <h3 style={styles.title}>{title}</h3>
          <span style={styles.summary}>{rangeLabel}</span>
        </div>

        <div className="road-admin-report-filters" style={styles.filtersWrap}>
          <form style={styles.searchForm} onSubmit={onSearchSubmit}>
            <div style={styles.searchBox}>
              <FiSearch size={16} color={UI_COLORS.textMuted} aria-hidden="true" />
              <input
                value={filters?.search ?? ''}
                onChange={(event) => onSearchChange?.(event.target.value)}
                placeholder="Tìm theo mã phản ánh, ghi chú hoặc tọa độ"
                style={styles.searchInput}
              />
            </div>
            <WebButton type="submit" style={styles.searchButton}>
              Tìm kiếm
            </WebButton>
          </form>

          <div style={styles.filterRow}>
            <select
              value={filters?.status ?? ''}
              onChange={(event) => onStatusChange?.(event.target.value)}
              style={styles.select}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || 'all-status'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={filters?.damageType ?? ''}
              onChange={(event) => onDamageTypeChange?.(event.target.value)}
              style={styles.select}
            >
              {DAMAGE_OPTIONS.map((option) => (
                <option key={option.value || 'all-damage'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <WebButton variant="secondary" onClick={onResetFilters} style={styles.resetButton}>
              <FiRefreshCw size={16} aria-hidden="true" />
              Xóa lọc
            </WebButton>
          </div>
        </div>
      </div>

      <div className="road-admin-table-wrap" style={styles.tableWrap}>
        {loading ? <TableSkeleton rows={6} /> : null}

        {!loading && error ? (
          <div style={styles.stateBox}>
            <strong style={styles.errorTitle}>Không thể tải danh sách phản ánh</strong>
            <span style={styles.stateDescription}>{error}</span>
            <WebButton onClick={onRetry}>Thử lại</WebButton>
          </div>
        ) : null}

        {!loading && !error && safeItems.length === 0 ? (
          <EmptyState
            title={manualReviewMode ? 'Chưa có ảnh cần kiểm tra thêm' : 'Không có phản ánh phù hợp'}
            description={
              manualReviewMode
                ? 'Các phản ánh AI chưa xác định rõ sẽ xuất hiện tại đây để cán bộ kiểm tra thủ công.'
                : 'Không tìm thấy phản ánh nào với bộ lọc hiện tại.'
            }
            actionLabel="Đặt lại bộ lọc"
            onAction={onResetFilters}
          />
        ) : null}

        {!loading && !error && safeItems.length > 0 ? (
          <>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Mã phản ánh</th>
                  <th style={styles.th}>Ảnh</th>
                  <th style={styles.th}>Loại hư hỏng</th>
                  <th style={styles.th}>Tọa độ</th>
                  <th style={styles.th}>Trạng thái</th>
                  <th style={styles.th}>Thời điểm ghi nhận</th>
                  <th style={styles.th}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {safeItems.map((report) => {
                  const damageType = getEffectiveDamageType(report);
                  const damageMeta = DAMAGE_TYPES[damageType];
                  const confidence = getPrimaryConfidence(report);

                  return (
                    <tr key={report?.id ?? report?.image_path ?? `${report?.latitude}-${report?.longitude}`} style={styles.tr}>
                      <td style={styles.tdStrong}>
                        <div style={styles.idCell}>{report?.id ?? 'N/A'}</div>
                        {report?.note ? <div style={styles.mutedClamp}>{report.note}</div> : null}
                      </td>

                      <td style={styles.td}>
                        <div style={styles.thumbnailWrap}>
                          {report?.image_url ? (
                            <img
                              src={getReportImageUrl(report.image_url)}
                              alt={report?.id ?? 'Ảnh báo cáo'}
                              style={styles.thumbnail}
                            />
                          ) : (
                            <div style={styles.thumbnailFallback}>N/A</div>
                          )}
                        </div>
                      </td>

                      <td style={styles.td}>
                        <div style={styles.damageCell}>
                          <span
                            style={{
                              ...styles.damageDot,
                              background: DAMAGE_TYPE_COLORS[damageType] ?? UI_COLORS.textMuted,
                            }}
                          />
                          <div>
                            <div style={styles.damageTitle}>
                              {damageType} - {damageMeta?.label ?? 'Chưa xác định'}
                            </div>
                            <div style={styles.muted}>
                              Độ tin cậy nhận dạng: {confidence ? `${confidence}%` : 'Chưa có kết quả'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={styles.td}>
                        <div style={styles.coordinateCell}>
                          <FiMapPin size={15} color={UI_COLORS.textMuted} aria-hidden="true" />
                          <div>
                            <div>{formatCoordinate(report?.latitude, report?.longitude)}</div>
                            <div style={styles.muted}>
                              Độ chính xác vị trí ±{formatAccuracy(report?.gps_accuracy)}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={styles.td}>
                        <StatusBadge status={report?.status ?? 'new'} size="sm" />
                      </td>

                      <td style={styles.td}>
                        <div style={styles.dateCell}>{formatDateTime(report?.created_at)}</div>
                      </td>

                      <td style={styles.td}>
                        <WebButton
                          variant="secondary"
                          onClick={() => onViewDetail?.(report?.id)}
                          style={styles.actionButton}
                        >
                          <FiEye size={16} aria-hidden="true" />
                          Xem chi tiết
                        </WebButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={styles.pagination}>
              <span style={styles.paginationSummary}>{rangeLabel}</span>
              <div style={styles.paginationActions}>
                <WebButton
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => onPageChange?.(page - 1)}
                >
                  Trang trước
                </WebButton>
                <span style={styles.paginationCurrent}>
                  Trang {page} / {Math.max(totalPages, 1)}
                </span>
                <WebButton
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange?.(page + 1)}
                >
                  Trang sau
                </WebButton>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </Panel>
  );
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 18,
    marginBottom: 18,
    flexWrap: 'wrap',
  },
  headerCopy: {
    display: 'grid',
    gap: 6,
  },
  title: {
    margin: 0,
    color: UI_COLORS.text,
    fontSize: 18,
    fontWeight: 900,
  },
  summary: {
    color: UI_COLORS.textMuted,
    fontSize: 13,
    fontWeight: 700,
  },
  filtersWrap: {
    minWidth: 0,
    width: 'min(100%, 660px)',
    display: 'grid',
    gap: 12,
    flex: '1 1 520px',
  },
  searchForm: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    gap: 10,
  },
  searchBox: {
    minHeight: 44,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 14px',
    borderRadius: 12,
    border: `1px solid ${UI_COLORS.border}`,
    background: UI_COLORS.surface,
  },
  searchInput: {
    width: '100%',
    border: 0,
    outline: 'none',
    background: 'transparent',
    color: UI_COLORS.text,
    fontSize: 14,
  },
  searchButton: {
    minWidth: 122,
  },
  filterRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr)) auto',
    gap: 10,
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
  resetButton: {
    minWidth: 118,
  },
  tableWrap: {
    overflowX: 'auto',
    border: `1px solid ${UI_COLORS.border}`,
    borderRadius: 14,
    background: UI_COLORS.surface,
  },
  stateBox: {
    minHeight: 220,
    display: 'grid',
    placeItems: 'center',
    alignContent: 'center',
    gap: 8,
    padding: 24,
  },
  errorTitle: {
    color: UI_COLORS.danger,
    fontSize: 17,
  },
  stateDescription: {
    maxWidth: 360,
    color: UI_COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 1.5,
  },
  table: {
    width: '100%',
    minWidth: 1080,
    borderCollapse: 'collapse',
    fontSize: 14,
  },
  th: {
    height: 46,
    padding: '0 16px',
    background: UI_COLORS.surfaceMuted,
    color: '#334155',
    textAlign: 'left',
    fontWeight: 900,
    borderBottom: `1px solid ${UI_COLORS.border}`,
    whiteSpace: 'nowrap',
  },
  tr: {
    background: UI_COLORS.surface,
  },
  td: {
    padding: '14px 16px',
    color: '#334155',
    borderBottom: `1px solid ${UI_COLORS.border}`,
    verticalAlign: 'middle',
  },
  tdStrong: {
    padding: '14px 16px',
    color: UI_COLORS.text,
    borderBottom: `1px solid ${UI_COLORS.border}`,
    verticalAlign: 'middle',
  },
  idCell: {
    fontWeight: 900,
  },
  mutedClamp: {
    marginTop: 6,
    color: UI_COLORS.textMuted,
    fontSize: 12,
    lineHeight: 1.45,
    maxWidth: 220,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  thumbnailWrap: {
    width: 84,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    border: `1px solid ${UI_COLORS.border}`,
    background: UI_COLORS.surfaceMuted,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  thumbnailFallback: {
    width: '100%',
    height: '100%',
    display: 'grid',
    placeItems: 'center',
    color: UI_COLORS.textMuted,
    fontSize: 12,
    fontWeight: 800,
  },
  damageCell: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  },
  damageDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginTop: 5,
    flex: '0 0 10px',
  },
  damageTitle: {
    color: UI_COLORS.text,
    fontWeight: 800,
  },
  muted: {
    marginTop: 4,
    color: UI_COLORS.textMuted,
    fontSize: 12,
  },
  coordinateCell: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
  },
  dateCell: {
    whiteSpace: 'nowrap',
    fontWeight: 700,
    color: UI_COLORS.text,
  },
  actionButton: {
    minHeight: 36,
    padding: '0 12px',
    borderRadius: 10,
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    flexWrap: 'wrap',
    padding: '14px 16px',
    borderTop: `1px solid ${UI_COLORS.border}`,
    background: UI_COLORS.surface,
  },
  paginationSummary: {
    color: UI_COLORS.textMuted,
    fontSize: 13,
    fontWeight: 700,
  },
  paginationActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  paginationCurrent: {
    color: UI_COLORS.text,
    fontSize: 13,
    fontWeight: 800,
  },
};
