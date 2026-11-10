import { useMemo, useState } from 'react';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiEye,
  FiPlus,
  FiSearch,
  FiSlash,
  FiTrash2,
  FiX,
} from 'react-icons/fi';

const RESTRICTION_TYPE_LABELS = {
  under_maintenance: '🚧 Đang thi công sửa chữa',
  full_closure: '⛔ Cấm toàn bộ phương tiện',
  heavy_vehicle_ban: '🚛 Cấm xe tải / tải trọng lớn',
  lane_closure: '⚠️ Thu hẹp làn chạy',
  speed_limit: '🐌 Hạn chế tốc độ',
};

const SEVERITY_COLORS = {
  danger: { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' },
  warning: { bg: '#FEF3C7', text: '#B45309', border: '#FCD34D' },
  info: { bg: '#DBEAFE', text: '#1D4ED8', border: '#93C5FD' },
};

export default function RoadRestrictionsOverlay({
  isOpen,
  onClose,
  restrictions = [],
  loading = false,
  onSelectRestriction,
  onToggleStatus,
  onDeleteRestriction,
  onStartCreateRestriction,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'all'

  const filteredItems = useMemo(() => {
    return restrictions.filter((item) => {
      if (activeTab === 'active' && !item.is_active) {
        return false;
      }
      if (!searchTerm.trim()) {
        return true;
      }
      const s = searchTerm.toLowerCase();
      return (
        item.road_name?.toLowerCase().includes(s) ||
        item.province?.toLowerCase().includes(s) ||
        item.district?.toLowerCase().includes(s) ||
        item.reason?.toLowerCase().includes(s)
      );
    });
  }, [restrictions, activeTab, searchTerm]);

  if (!isOpen) return null;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.iconCircle}>
            <FiSlash size={18} color="#DC2626" />
          </div>
          <div>
            <h4 style={styles.title}>Đoạn Tuyến Hạn Chế Lưu Thông</h4>
            <span style={styles.subtitle}>{restrictions.length} đoạn tuyến đã ghi nhận</span>
          </div>
        </div>
        <button type="button" onClick={onClose} style={styles.closeBtn} title="Đóng danh sách">
          <FiX size={18} />
        </button>
      </div>

      {/* Action button */}
      <div style={styles.actionRow}>
        <button
          type="button"
          onClick={() => {
            onClose?.();
            onStartCreateRestriction?.();
          }}
          style={styles.addBtn}
        >
          <FiPlus size={16} />
          <span>Hạn chế đoạn đường mới (Chọn điểm A - B)</span>
        </button>
      </div>

      {/* Tabs & Search */}
      <div style={styles.filterSection}>
        <div style={styles.tabs}>
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            style={{
              ...styles.tab,
              ...(activeTab === 'active' ? styles.activeTab : {}),
            }}
          >
            Đang hiệu lực ({restrictions.filter((r) => r.is_active).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            style={{
              ...styles.tab,
              ...(activeTab === 'all' ? styles.activeTab : {}),
            }}
          >
            Tất cả ({restrictions.length})
          </button>
        </div>

        <div style={styles.searchBox}>
          <FiSearch size={14} color="#94A3B8" />
          <input
            type="text"
            placeholder="Tìm theo tên đường, quận, lý do..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          {searchTerm ? (
            <button type="button" onClick={() => setSearchTerm('')} style={styles.clearSearchBtn}>
              <FiX size={12} />
            </button>
          ) : null}
        </div>
      </div>

      {/* List */}
      <div style={styles.list}>
        {loading ? (
          <div style={styles.emptyState}>
            <span>Đang tải danh sách đoạn đường...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={styles.emptyState}>
            <FiAlertTriangle size={32} color="#CBD5E1" />
            <span style={styles.emptyTitle}>Không có đoạn đường hạn chế nào</span>
            <span style={styles.emptySubtitle}>
              {searchTerm ? 'Không tìm thấy kết quả phù hợp từ khóa' : 'Nhấn nút phía trên để tạo đoạn đường hạn chế mới'}
            </span>
          </div>
        ) : (
          filteredItems.map((item) => {
            const sevColor = SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.warning;
            const typeLabel = RESTRICTION_TYPE_LABELS[item.restriction_type] || item.restriction_type;

            return (
              <div key={item.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardHeaderLeft}>
                    <strong style={styles.roadName}>{item.road_name}</strong>
                    <span style={styles.location}>
                      {[item.ward, item.district, item.province].filter(Boolean).join(', ')}
                    </span>
                  </div>
                  <span
                    style={{
                      ...styles.severityTag,
                      backgroundColor: sevColor.bg,
                      color: sevColor.text,
                      borderColor: sevColor.border,
                    }}
                  >
                    {item.severity === 'danger' ? 'Nguy hiểm' : item.severity === 'info' ? 'Phân luồng' : 'Cảnh báo'}
                  </span>
                </div>

                <div style={styles.typeRow}>
                  <span style={styles.typeBadge}>{typeLabel}</span>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: item.is_active ? '#DCFCE7' : '#F1F5F9',
                      color: item.is_active ? '#15803D' : '#64748B',
                    }}
                  >
                    {item.is_active ? '● Đang cấm/hạn chế' : '○ Đã gỡ bỏ'}
                  </span>
                </div>

                <p style={styles.reasonText}>{item.reason}</p>

                <div style={styles.footerRow}>
                  <span style={styles.dateText}>
                    Từ: {item.start_date ? new Date(item.start_date).toLocaleDateString('vi-VN') : 'N/A'}
                    {item.end_date ? ` - Đến: ${new Date(item.end_date).toLocaleDateString('vi-VN')}` : ''}
                  </span>

                  <div style={styles.cardActions}>
                    <button
                      type="button"
                      onClick={() => onSelectRestriction?.(item)}
                      style={styles.actionIconBtn}
                      title="Xem trên bản đồ"
                    >
                      <FiEye size={15} color="#2563EB" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleStatus?.(item.id, !item.is_active)}
                      style={styles.actionIconBtn}
                      title={item.is_active ? 'Gỡ bỏ hạn chế' : 'Kích hoạt lại hạn chế'}
                    >
                      <FiCheckCircle size={15} color={item.is_active ? '#16A34A' : '#94A3B8'} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteRestriction?.(item.id)}
                      style={styles.actionIconBtn}
                      title="Xóa đoạn đường hạn chế"
                    >
                      <FiTrash2 size={15} color="#DC2626" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 380,
    maxWidth: 'calc(100% - 28px)',
    maxHeight: 'calc(100% - 28px)',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.18)',
    border: '1px solid #E2E8F0',
    zIndex: 800,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    animation: 'slideInLeft 0.25s ease-out',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    borderBottom: '1px solid #F1F5F9',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: 14.5,
    fontWeight: 800,
    color: '#0F172A',
    margin: 0,
  },
  subtitle: {
    fontSize: 11.5,
    color: '#64748B',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#94A3B8',
    cursor: 'pointer',
    padding: 6,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    padding: '10px 16px 4px',
  },
  addBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '9px 14px',
    borderRadius: 10,
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    border: 'none',
    fontSize: 12.5,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 10px rgba(220, 38, 38, 0.2)',
  },
  filterSection: {
    padding: '10px 16px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  tabs: {
    display: 'flex',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 3,
  },
  tab: {
    flex: 1,
    padding: '6px 10px',
    border: 'none',
    borderRadius: 6,
    backgroundColor: 'transparent',
    fontSize: 12,
    fontWeight: 600,
    color: '#64748B',
    cursor: 'pointer',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 10px',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
  },
  searchInput: {
    border: 'none',
    background: 'transparent',
    outline: 'none',
    fontSize: 12.5,
    flex: 1,
    color: '#0F172A',
  },
  clearSearchBtn: {
    background: 'none',
    border: 'none',
    color: '#94A3B8',
    cursor: 'pointer',
    padding: 2,
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '6px 16px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '36px 16px',
    textAlign: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 13.5,
    fontWeight: 700,
    color: '#475569',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  card: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    transition: 'all 0.15s ease',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardHeaderLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    flex: 1,
  },
  roadName: {
    fontSize: 13.5,
    fontWeight: 800,
    color: '#0F172A',
  },
  location: {
    fontSize: 11,
    color: '#64748B',
  },
  severityTag: {
    fontSize: 10.5,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'solid',
    flexShrink: 0,
  },
  typeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeBadge: {
    fontSize: 11.5,
    fontWeight: 600,
    color: '#334155',
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: '1px 7px',
    borderRadius: 6,
  },
  reasonText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 1.4,
    margin: '2px 0 0 0',
  },
  footerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 6,
    borderTop: '1px solid #EEF2F6',
  },
  dateText: {
    fontSize: 10.5,
    color: '#94A3B8',
  },
  cardActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  actionIconBtn: {
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: 6,
    padding: 5,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
