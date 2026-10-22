import { FiShield, FiX } from 'react-icons/fi';
import { formatDateTime } from '../../utils/formatters';

export default function ReportPhotoLightboxModal({ selectedPhoto, onClose }) {
  if (!selectedPhoto) return null;

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <div style={styles.modalSubtitle}>HỒ SƠ ẢNH HIỆN TRƯỜNG • CAMERA ENFORCED</div>
            <h3 style={styles.modalTitle}>
              {selectedPhoto.original_filename || 'Ảnh khảo sát thực địa của kỹ sư'}
            </h3>
          </div>
          <button
            type="button"
            style={styles.modalCloseBtn}
            onClick={onClose}
            aria-label="Đóng xem ảnh"
          >
            <FiX size={20} />
          </button>
        </div>

        <div style={styles.modalImageWrap}>
          <img
            src={selectedPhoto.file_url}
            alt="Ảnh phóng to"
            style={styles.modalImg}
          />
        </div>

        <div style={styles.modalFooter}>
          <div style={styles.modalFooterBadge}>
            <FiShield size={16} color="#15803D" />
            <span>Ảnh chụp trực tiếp tại hiện trường (Có Watermark tọa độ & mã sự cố)</span>
          </div>
          <span style={styles.modalFooterTime}>
            Ghi nhận lúc: {formatDateTime(selectedPhoto.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    background: 'rgba(15, 23, 42, 0.82)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    boxSizing: 'border-box',
  },
  modalContent: {
    background: '#FFFFFF',
    borderRadius: 20,
    maxWidth: 960,
    width: '100%',
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
  },
  modalHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid #E2E8F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#F8FAFC',
  },
  modalSubtitle: {
    fontSize: 11,
    fontWeight: 800,
    color: '#075DBB',
    letterSpacing: 0.5,
  },
  modalTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 800,
    color: '#0F172A',
  },
  modalCloseBtn: {
    border: 'none',
    background: '#EDF2F7',
    borderRadius: '50%',
    width: 36,
    height: 36,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    color: '#475569',
  },
  modalImageWrap: {
    padding: 16,
    background: '#0B1120',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    maxHeight: 'calc(92vh - 140px)',
    overflow: 'auto',
  },
  modalImg: {
    maxWidth: '100%',
    maxHeight: 'calc(92vh - 170px)',
    objectFit: 'contain',
    borderRadius: 8,
  },
  modalFooter: {
    padding: '12px 20px',
    background: '#F8FAFC',
    borderTop: '1px solid #E2E8F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  modalFooterBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: '#15803D',
    fontSize: 13,
    fontWeight: 700,
  },
  modalFooterTime: {
    color: '#64748B',
    fontSize: 12,
  },
};
