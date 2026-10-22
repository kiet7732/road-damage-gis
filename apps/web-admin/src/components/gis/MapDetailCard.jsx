import { FiClock, FiCpu, FiExternalLink, FiMapPin, FiX } from 'react-icons/fi';
import { getStatusColor, UI_COLORS } from '../../constants/statusColors';
import { getMapImageUrl } from '../../services/mapAdminService';
import { formatConfidence, formatCoordinate, formatDateTime } from '../../utils/formatters';
import { getEffectiveDamageType, getEffectiveDamageTypeLabel } from '../../utils/reportDamage';

export default function MapDetailCard({ selectedReport, onCloseDetail, onOpenDetail }) {
  if (!selectedReport) return null;

  return (
    <div style={styles.detailCard}>
      <button
        type="button"
        onClick={onCloseDetail}
        style={styles.detailCloseButton}
        aria-label="Đóng thẻ chi tiết"
        title="Đóng thẻ chi tiết"
      >
        <FiX size={16} />
      </button>
      {selectedReport.image_url ? (
        <div style={styles.detailImageWrap}>
          <img
            src={getMapImageUrl(selectedReport.image_url)}
            alt=""
            aria-hidden="true"
            style={styles.detailImageBlur}
          />
          <img
            src={getMapImageUrl(selectedReport.image_url)}
            alt={selectedReport.id}
            style={styles.detailImage}
          />
        </div>
      ) : null}
      <div style={styles.detailBody}>
        <div style={styles.detailBadgeRow}>
          {(selectedReport.district || selectedReport.ward) ? (
            <span style={styles.detailAdminBadge}>
              [{selectedReport.district || 'Chưa phân cấp'}] • [{selectedReport.ward || 'Chưa phân cấp'}]
            </span>
          ) : null}
          <span style={styles.detailDamageBadge}>
            {(getEffectiveDamageType(selectedReport) || 'N/A')} - {selectedReport.damage_label || getEffectiveDamageTypeLabel(selectedReport)}
          </span>
          <span
            style={{
              ...styles.detailStatusBadge,
              color: getStatusColor(selectedReport.status).text,
              background: getStatusColor(selectedReport.status).background,
              borderColor: getStatusColor(selectedReport.status).border,
            }}
          >
            {getStatusColor(selectedReport.status).label}
          </span>
        </div>
        <strong style={styles.detailTitle}>
          {selectedReport.damage_label || selectedReport.class_name || (selectedReport.id ? `Phản ánh #${String(selectedReport.id).slice(0, 8)}` : 'Điểm sự cố')}
        </strong>
        <div style={styles.detailAddressText}>
          📍 {selectedReport.formatted_address || [selectedReport.road_name, selectedReport.ward, selectedReport.district].filter(Boolean).join(', ') || 'Đang cập nhật địa chỉ...'}
        </div>
        <div style={styles.detailMetaRow}>
          <span style={styles.detailMetaItem} title="Tọa độ GPS">
            <FiMapPin size={14} color={UI_COLORS.primary} />
            {formatCoordinate(selectedReport.latitude, selectedReport.longitude)}
          </span>
          <span style={styles.detailMetaItem} title="Thời gian ghi nhận">
            <FiClock size={14} />
            {formatDateTime(selectedReport.created_at)}
          </span>
          <span style={styles.detailMetaItem} title="Độ tin cậy nhận diện AI">
            <FiCpu size={14} color="#059669" />
            AI: {formatConfidence(selectedReport.confidence)}
          </span>
        </div>
        {selectedReport.note?.trim() ? (
          <div style={styles.detailNote}>{selectedReport.note.trim()}</div>
        ) : null}
        <div style={styles.detailActions}>
          <button
            type="button"
            onClick={() => onOpenDetail?.(selectedReport.id)}
            style={styles.detailButton}
          >
            <FiExternalLink size={15} />
            Xem chi tiết phản ánh
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  detailCard: {
    position: 'absolute',
    left: 18,
    bottom: 18,
    zIndex: 620,
    width: 'min(360px, calc(100% - 36px))',
    display: 'grid',
    gap: 0,
    borderRadius: 20,
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.98)',
    border: `1px solid ${UI_COLORS.border}`,
    boxShadow: '0 18px 42px rgba(15, 23, 42, 0.22)',
    backdropFilter: 'blur(10px)',
  },
  detailCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 999,
    border: `1px solid ${UI_COLORS.border}`,
    background: 'rgba(255, 255, 255, 0.94)',
    color: UI_COLORS.text,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
  },
  detailImageWrap: {
    width: '100%',
    height: 160,
    backgroundColor: '#0B132B',
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottom: `1px solid ${UI_COLORS.border}`,
  },
  detailImageBlur: {
    position: 'absolute',
    inset: -20,
    width: 'calc(100% + 40px)',
    height: 'calc(100% + 40px)',
    objectFit: 'cover',
    filter: 'blur(18px) brightness(0.4)',
    opacity: 0.7,
    pointerEvents: 'none',
  },
  detailImage: {
    position: 'relative',
    zIndex: 1,
    maxWidth: '100%',
    maxHeight: '100%',
    width: 'auto',
    height: 'auto',
    objectFit: 'contain',
    display: 'block',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
  },
  detailBody: {
    display: 'grid',
    gap: 12,
    padding: 16,
  },
  detailBadgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  detailAdminBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 26,
    padding: '0 8px',
    borderRadius: 6,
    background: '#EFF6FF',
    color: UI_COLORS.primary,
    border: '1px solid #BFDBFE',
    fontSize: 11,
    fontWeight: 800,
  },
  detailAddressText: {
    fontSize: 12,
    lineHeight: '17px',
    color: '#475569',
    fontWeight: 600,
  },
  detailDamageBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 28,
    padding: '0 10px',
    borderRadius: 999,
    background: '#EAF2FF',
    color: UI_COLORS.primaryDark,
    fontSize: 11,
    fontWeight: 900,
  },
  detailStatusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 28,
    padding: '0 10px',
    borderRadius: 999,
    border: '1px solid transparent',
    fontSize: 11,
    fontWeight: 900,
  },
  detailTitle: {
    color: UI_COLORS.text,
    fontSize: 18,
    fontWeight: 900,
    lineHeight: 1.35,
  },
  detailMetaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailMetaItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    color: UI_COLORS.textMuted,
    fontSize: 12,
    fontWeight: 700,
  },
  detailNote: {
    color: UI_COLORS.textMuted,
    fontSize: 13,
    lineHeight: 1.5,
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  detailActions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  detailButton: {
    minHeight: 38,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '0 14px',
    border: 'none',
    borderRadius: 10,
    background: UI_COLORS.primary,
    color: UI_COLORS.surface,
    fontSize: 13,
    fontWeight: 900,
    cursor: 'pointer',
  },
};
