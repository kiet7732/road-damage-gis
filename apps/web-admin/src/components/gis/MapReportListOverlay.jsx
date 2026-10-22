import { FiClock, FiMapPin, FiX } from 'react-icons/fi';
import StatusBadge from '../StatusBadge';
import { formatCoordinate, formatDateTime } from '../../utils/formatters';
import { getEffectiveDamageTypeLabel } from '../../utils/reportDamage';

export default function MapReportListOverlay({
  isOpen,
  onClose,
  totalCount,
  mapItems = [],
  activeSelectedReport,
  onFocusReport,
}) {
  if (!isOpen) return null;

  return (
    <div style={styles.reportListOverlay}>
      <div style={styles.reportListHeader}>
        <div>
          <strong style={styles.reportListTitle}>Danh sách phản ánh</strong>
          <div style={styles.reportListSubtitle}>
            {totalCount} phản ánh trong vùng đang xem
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
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
                onFocusReport(report);
                onClose();
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
                <StatusBadge status={report.status} size="sm" />
              </div>
              <div style={styles.reportListItemMeta}>
                <span style={styles.reportListItemMetaItem}>
                  <FiMapPin size={12} />
                  <span>{formatCoordinate(report.latitude, report.longitude)}</span>
                </span>
                {report.created_at ? (
                  <span style={styles.reportListItemMetaItem}>
                    <FiClock size={12} />
                    <span>{formatDateTime(report.created_at)}</span>
                  </span>
                ) : null}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  reportListOverlay: {
    position: 'absolute',
    top: 76,
    right: 16,
    zIndex: 660,
    width: 'min(360px, calc(100% - 32px))',
    maxHeight: 'calc(100% - 96px)',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 20,
    overflow: 'hidden',
    background: 'rgba(255, 255, 255, 0.98)',
    border: '1px solid #CBD5E1',
    boxShadow: '0 18px 42px rgba(15, 23, 42, 0.22)',
    backdropFilter: 'blur(10px)',
  },
  reportListHeader: {
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #E2E8F0',
    background: '#F8FAFC',
  },
  reportListTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: 900,
  },
  reportListSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  reportListCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    border: '1px solid #CBD5E1',
    background: '#FFFFFF',
    color: '#0F172A',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  reportListBody: {
    padding: 10,
    overflowY: 'auto',
    display: 'grid',
    gap: 8,
  },
  reportListEmpty: {
    padding: 24,
    textAlign: 'center',
    color: '#64748B',
    fontSize: 13,
  },
  reportListItem: {
    display: 'grid',
    gap: 6,
    padding: 12,
    borderRadius: 12,
    border: '1px solid #E2E8F0',
    background: '#FFFFFF',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  reportListItemActive: {
    borderColor: '#3B82F6',
    background: '#EFF6FF',
  },
  reportListItemTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  reportListItemTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: '#0F172A',
  },
  reportListItemMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    color: '#64748B',
    fontSize: 11,
  },
  reportListItemMetaItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },
};
