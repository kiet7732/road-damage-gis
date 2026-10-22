import React, { useState } from 'react';
import {
  FiX,
  FiMapPin,
  FiClock,
  FiCpu,
  FiExternalLink,
  FiCopy,
  FiCheck,
  FiCheckCircle,
  FiAlertTriangle,
} from 'react-icons/fi';
import { DAMAGE_TYPES, getStatusColor, UI_COLORS } from '../../constants/statusColors';
import { getMapImageUrl } from '../../services/mapAdminService';
import { formatConfidence, formatCoordinate, formatDateTime, formatAccuracy } from '../../utils/formatters';
import { getEffectiveDamageType, getEffectiveDamageTypeLabel } from '../../utils/reportDamage';

type ReportDetailDrawerProps = {
  report: any | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenFullDetail?: (reportId: string) => void;
};

export default function ReportDetailDrawer({
  report,
  isOpen,
  onClose,
  onOpenFullDetail,
}: ReportDetailDrawerProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !report) {
    return null;
  }

  const damageType = getEffectiveDamageType(report);
  const damageLabel = report.damage_label || getEffectiveDamageTypeLabel(report);
  const statusColor = getStatusColor(report.status);

  // Administrative components
  const districtText = report.district?.trim() || null;
  const wardText = report.ward?.trim()
    ? (/^(phường|xã|thị trấn|tt\.|p\.)\s+/i.test(report.ward.trim()) ? report.ward.trim() : `Phường ${report.ward.trim()}`)
    : null;
  const roadName = report.road_name?.trim() || null;

  // Standardized formatted address
  const fullAddress =
    report.formatted_address ||
    [roadName, wardText, districtText, report.province].filter(Boolean).join(', ') ||
    'Đang xác định địa chỉ...';

  const handleCopyAddress = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.warn('Failed to copy address:', err);
    }
  };

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <aside
        style={styles.drawer}
        onClick={(e) => e.stopPropagation()}
        aria-label="Chi tiết phản ánh sự cố"
      >
        {/* Drawer Header */}
        <div style={styles.header}>
          <div>
            <span style={styles.headerSubtitle}>HỒ SƠ ĐIỂM SỰ CỐ GIS</span>
            <h3 style={styles.headerTitle}>
              #{report.id ? String(report.id).slice(0, 8).toUpperCase() : 'N/A'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={styles.closeBtn}
            aria-label="Đóng chi tiết"
          >
            <FiX size={18} />
          </button>
        </div>


        {/* Image Preview */}
        {report.image_url ? (
          <div style={styles.imageWrap}>
            <img
              src={getMapImageUrl(report.image_url)}
              alt=""
              aria-hidden="true"
              style={styles.ambientBlur}
            />
            <img
              src={getMapImageUrl(report.image_url)}
              alt={`Sự cố ${report.id}`}
              style={styles.image}
            />
          </div>
        ) : null}

        {/* Body Content */}
        <div style={styles.body}>
          {/* Status & Damage Type Badges */}
          <div style={styles.badgesRow}>
            <span
              style={{
                ...styles.statusPill,
                color: statusColor.text,
                backgroundColor: statusColor.background,
                borderColor: statusColor.border,
              }}
            >
              {statusColor.label}
            </span>

            <span style={styles.damagePill}>
              {damageType} - {damageLabel}
            </span>
          </div>

          {/* Standardized Address Card */}
          <div style={styles.addressCard}>
            <div style={styles.addressHeader}>
              <FiMapPin size={16} color={UI_COLORS.primary} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={styles.fullAddressText}>{fullAddress}</div>
            </div>

            <button
              type="button"
              onClick={handleCopyAddress}
              style={styles.copyBtn}
              title="Sao chép địa chỉ chuẩn"
            >
              {copied ? (
                <>
                  <FiCheck size={14} color="#10B981" />
                  <span style={{ color: '#10B981', fontWeight: 700 }}>Đã sao chép!</span>
                </>
              ) : (
                <>
                  <FiCopy size={14} />
                  <span>Sao chép địa chỉ</span>
                </>
              )}
            </button>
          </div>

          {/* GPS & Technical Metadata */}
          <div style={styles.techSection}>
            <h4 style={styles.techTitle}>THÔNG SỐ KỸ THUẬT VỊ TRÍ</h4>

            <div style={styles.techGrid}>
              <div style={styles.techItem}>
                <span style={styles.techLabel}>Tọa độ GPS</span>
                <span style={styles.techValue}>
                  {formatCoordinate(report.latitude, report.longitude)}
                </span>
              </div>

              <div style={styles.techItem}>
                <span style={styles.techLabel}>Sai số thiết bị</span>
                <span style={styles.techValue}>
                  ±{formatAccuracy(report.gps_accuracy)}
                </span>
              </div>

              <div style={styles.techItem}>
                <span style={styles.techLabel}>Độ tin cậy AI</span>
                <span style={styles.techValue}>
                  {formatConfidence(report.confidence)}
                </span>
              </div>

              <div style={styles.techItem}>
                <span style={styles.techLabel}>Thời gian ghi nhận</span>
                <span style={styles.techValue}>
                  {formatDateTime(report.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Citizen Note */}
          {report.note?.trim() ? (
            <div style={styles.noteBox}>
              <span style={styles.noteLabel}>Ghi chú phản ánh:</span>
              <p style={styles.noteText}>{report.note.trim()}</p>
            </div>
          ) : null}
        </div>

        {/* Action Footer */}
        <div style={styles.footer}>
          {onOpenFullDetail ? (
            <button
              type="button"
              onClick={() => onOpenFullDetail(report.id)}
              style={styles.primaryActionBtn}
            >
              <FiExternalLink size={16} />
              <span>Xem chi tiết & Thẩm định</span>
            </button>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'absolute',
    inset: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    backdropFilter: 'blur(2px)',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  drawer: {
    width: '100%',
    maxWidth: 420,
    height: '100%',
    backgroundColor: '#FFFFFF',
    boxShadow: '-6px 0 24px rgba(15, 23, 42, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: `1px solid ${UI_COLORS.border}`,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: 800,
    color: '#64748B',
    letterSpacing: '0.5px',
  },
  headerTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 900,
    color: '#0B132B',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#64748B',
    padding: 6,
    borderRadius: 8,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBadgeBar: {
    backgroundColor: '#F8FAFC',
    padding: '8px 20px',
    borderBottom: `1px solid ${UI_COLORS.border}`,
  },
  adminBadge: {
    display: 'inline-block',
    fontSize: 12,
    fontWeight: 800,
    color: UI_COLORS.primary,
    backgroundColor: '#EFF6FF',
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid #BFDBFE',
    letterSpacing: '0.2px',
  },
  imageWrap: {
    width: '100%',
    height: 240,
    backgroundColor: '#0B132B',
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientBlur: {
    position: 'absolute',
    inset: -20,
    width: 'calc(100% + 40px)',
    height: 'calc(100% + 40px)',
    objectFit: 'cover',
    filter: 'blur(22px) brightness(0.4)',
    opacity: 0.7,
    pointerEvents: 'none',
  },
  image: {
    position: 'relative',
    zIndex: 1,
    maxWidth: '100%',
    maxHeight: '100%',
    width: 'auto',
    height: 'auto',
    objectFit: 'contain',
    display: 'block',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
  },
  body: {
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    flex: 1,
  },
  badgesRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusPill: {
    fontSize: 12,
    fontWeight: 800,
    padding: '4px 10px',
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: 'solid',
  },
  damagePill: {
    fontSize: 12,
    fontWeight: 700,
    backgroundColor: '#F1F5F9',
    color: '#1E293B',
    padding: '4px 10px',
    borderRadius: 6,
    border: `1px solid ${UI_COLORS.border}`,
  },
  addressCard: {
    backgroundColor: '#F8FAFC',
    border: `1px solid ${UI_COLORS.border}`,
    borderRadius: 12,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  addressHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  roadName: {
    fontSize: 15,
    fontWeight: 800,
    color: '#0B132B',
  },
  fullAddressText: {
    margin: 0,
    fontSize: 13,
    lineHeight: '19px',
    color: '#475569',
  },
  copyBtn: {
    alignSelf: 'flex-start',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 600,
    color: UI_COLORS.textNavy,
    backgroundColor: '#FFFFFF',
    border: `1px solid ${UI_COLORS.border}`,
    borderRadius: 6,
    cursor: 'pointer',
  },
  techSection: {
    backgroundColor: '#FFFFFF',
    border: `1px solid ${UI_COLORS.border}`,
    borderRadius: 12,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  techTitle: {
    margin: 0,
    fontSize: 11,
    fontWeight: 800,
    color: '#64748B',
    letterSpacing: '0.4px',
  },
  techGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 10,
  },
  techItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  techLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  techValue: {
    fontSize: 12,
    fontWeight: 700,
    color: '#1E293B',
  },
  noteBox: {
    backgroundColor: '#FFFBEB',
    border: '1px solid #FEF3C7',
    borderRadius: 10,
    padding: 12,
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#92400E',
  },
  noteText: {
    margin: '4px 0 0 0',
    fontSize: 12,
    lineHeight: '18px',
    color: '#78350F',
  },
  footer: {
    padding: '16px 20px',
    borderTop: `1px solid ${UI_COLORS.border}`,
    backgroundColor: '#FFFFFF',
  },
  primaryActionBtn: {
    width: '100%',
    height: 42,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 800,
    color: '#FFFFFF',
    backgroundColor: UI_COLORS.primary,
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(15, 82, 186, 0.25)',
  },
};
