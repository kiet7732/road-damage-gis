import { useEffect, useState } from 'react';
import {
  FiCheck,
  FiCheckSquare,
  FiDownload,
  FiFileText,
  FiImage,
  FiSquare,
  FiX,
} from 'react-icons/fi';
import { UI_COLORS } from '../constants/statusColors';
import WebButton from './WebButton';

const EXPORT_COLUMNS_SUMMARY = [
  'Mã phản ánh',
  'Loại hư hỏng (D00, D10, D20, D40)',
  'Tên đường',
  'Phường/Xã',
  'Quận/Huyện',
  'Tỉnh/Thành phố',
  'Địa chỉ đầy đủ',
  'Tọa độ Vĩ độ',
  'Tọa độ Kinh độ',
  'Sai số GPS (m)',
  'Trạng thái xử lý',
  'Độ tin cậy AI (%)',
  'Ghi chú kỹ thuật',
  'Thời gian ghi nhận',
];

export default function ExportModal({
  isOpen,
  onClose,
  totalCount = 0,
  onExport,
  isExporting = false,
  title = 'Xuất báo cáo sự cố mặt đường',
  subTitle = '',
}) {
  const [format, setFormat] = useState('xlsx');
  const [includeImage, setIncludeImage] = useState(false);
  const [showColumnsList, setShowColumnsList] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isExporting) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isExporting, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    if (typeof onExport === 'function') {
      onExport({ format, includeImage });
    }
  };

  return (
    <div style={styles.backdrop} onClick={(e) => e.target === e.currentTarget && !isExporting && onClose()}>
      <div style={styles.modal} role="dialog" aria-modal="true" aria-labelledby="export-modal-title">
        {/* 1. Header */}
        <div style={styles.header}>
          <div style={styles.headerTitleWrap}>
            <div style={styles.iconBadge}>
              <FiDownload size={20} color={UI_COLORS.primary} />
            </div>
            <div>
              <h2 id="export-modal-title" style={styles.title}>
                {title}
              </h2>
              <p style={styles.subtitle}>
                {subTitle || `Tổng số: ${totalCount} sự cố theo bộ lọc hiện tại`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            style={styles.closeBtn}
            aria-label="Đóng cửa sổ"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* 2. Body */}
        <div style={styles.body}>
          {/* A. Chọn định dạng tệp */}
          <div style={styles.section}>
            <label style={styles.sectionLabel}>Định dạng xuất tệp</label>
            <div style={styles.formatGrid}>
              {/* Option XLSX */}
              <button
                type="button"
                onClick={() => setFormat('xlsx')}
                style={{
                  ...styles.formatCard,
                  ...(format === 'xlsx' ? styles.formatCardActive : null),
                }}
              >
                <div style={styles.formatCardTop}>
                  <div style={{ ...styles.formatIcon, backgroundColor: '#ECFDF5', color: '#059669' }}>
                    📗
                  </div>
                  <div style={styles.formatInfo}>
                    <div style={styles.formatTitle}>Microsoft Excel (.xlsx)</div>
                    <div style={styles.formatBadge}>Khuyên dùng</div>
                  </div>
                  {format === 'xlsx' ? (
                    <div style={styles.activeCheck}>
                      <FiCheck size={14} color="#FFFFFF" />
                    </div>
                  ) : null}
                </div>
                <p style={styles.formatDesc}>
                  Bảng tính Excel chuẩn, tự động căn chỉnh độ rộng cột, hỗ trợ liên kết ảnh bấm mở trực tiếp.
                </p>
              </button>

              {/* Option CSV */}
              <button
                type="button"
                onClick={() => setFormat('csv')}
                style={{
                  ...styles.formatCard,
                  ...(format === 'csv' ? styles.formatCardActive : null),
                }}
              >
                <div style={styles.formatCardTop}>
                  <div style={{ ...styles.formatIcon, backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                    📄
                  </div>
                  <div style={styles.formatInfo}>
                    <div style={styles.formatTitle}>Tệp văn bản CSV (.csv)</div>
                    <div style={styles.formatSub}>UTF-8 BOM</div>
                  </div>
                  {format === 'csv' ? (
                    <div style={styles.activeCheck}>
                      <FiCheck size={14} color="#FFFFFF" />
                    </div>
                  ) : null}
                </div>
                <p style={styles.formatDesc}>
                  Tệp phân tách dấu phẩy chuẩn UTF-8 tiếng Việt, dung lượng nhẹ, dễ nhập vào các phần mềm khác.
                </p>
              </button>
            </div>
          </div>

          {/* B. Tùy chọn xuất thêm hình ảnh */}
          <div style={styles.section}>
            <label style={styles.sectionLabel}>Tùy chọn bổ sung</label>
            <div
              style={{
                ...styles.checkboxCard,
                ...(includeImage ? styles.checkboxCardActive : null),
              }}
              onClick={() => setIncludeImage(!includeImage)}
              role="checkbox"
              aria-checked={includeImage}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault();
                  setIncludeImage(!includeImage);
                }
              }}
            >
              <div style={styles.checkboxControl}>
                {includeImage ? (
                  <FiCheckSquare size={20} color={UI_COLORS.primary} />
                ) : (
                  <FiSquare size={20} color="#94A3B8" />
                )}
              </div>
              <div style={styles.checkboxContent}>
                <div style={styles.checkboxTitleWrap}>
                  <FiImage size={16} color={includeImage ? UI_COLORS.primary : '#64748B'} />
                  <span style={styles.checkboxTitle}>Xuất thêm cột Hình ảnh hiện trường</span>
                </div>
                <p style={styles.checkboxDesc}>
                  Thêm cột "Hình ảnh hiện trường (URL)" chứa đường dẫn trực tiếp đến ảnh chụp hư hỏng để nhấp mở xem lại.
                </p>
              </div>
            </div>
          </div>

          {/* C. Xem trước các cột sẽ xuất */}
          <div style={styles.columnsPreviewSection}>
            <button
              type="button"
              onClick={() => setShowColumnsList(!showColumnsList)}
              style={styles.toggleColumnsBtn}
            >
              <span>
                Danh sách các cột trong báo cáo ({includeImage ? 15 : 14} cột)
              </span>
              <span style={styles.toggleArrow}>{showColumnsList ? '▲ Thu gọn' : '▼ Xem chi tiết'}</span>
            </button>

            {showColumnsList ? (
              <div style={styles.columnsList}>
                {EXPORT_COLUMNS_SUMMARY.map((col, idx) => (
                  <div key={col} style={styles.columnTag}>
                    <span style={styles.columnTagIndex}>{idx + 1}.</span> {col}
                  </div>
                ))}
                {includeImage ? (
                  <div style={{ ...styles.columnTag, ...styles.columnTagImage }}>
                    <span style={styles.columnTagIndex}>15.</span> Hình ảnh hiện trường (URL)
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* 3. Footer */}
        <div style={styles.footer}>
          <WebButton
            variant="secondary"
            onClick={onClose}
            disabled={isExporting}
            style={styles.cancelBtn}
          >
            Hủy bỏ
          </WebButton>
          <WebButton
            onClick={handleConfirm}
            disabled={isExporting || totalCount === 0}
            style={styles.submitBtn}
          >
            <FiDownload size={16} />
            <span>
              {isExporting
                ? 'Đang tạo tệp...'
                : `Tải xuống file .${format.toUpperCase()}`}
            </span>
          </WebButton>
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 580,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid #F1F5F9',
  },
  headerTitleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    margin: '4px 0 0 0',
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#64748B',
    cursor: 'pointer',
    padding: 6,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.15s',
  },
  body: {
    padding: '20px 24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  formatGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 12,
  },
  formatCard: {
    position: 'relative',
    textAlign: 'left',
    padding: '16px 16px 14px 16px',
    borderRadius: 14,
    border: '2px solid #E2E8F0',
    backgroundColor: '#F8FAFC',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
  },
  formatCardActive: {
    borderColor: UI_COLORS.primary,
    backgroundColor: '#F0F9FF',
    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.12)',
  },
  formatCardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  formatIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    flexShrink: 0,
  },
  formatInfo: {
    flex: 1,
    minWidth: 0,
  },
  formatTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  formatBadge: {
    display: 'inline-block',
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    backgroundColor: '#D1FAE5',
    padding: '1px 6px',
    borderRadius: 6,
    marginTop: 2,
  },
  formatSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  activeCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: UI_COLORS.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatDesc: {
    margin: 0,
    fontSize: 12,
    color: '#64748B',
    lineHeight: '17px',
  },
  checkboxCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    padding: '14px 16px',
    borderRadius: 12,
    border: '1.5px solid #E2E8F0',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    userSelect: 'none',
  },
  checkboxCardActive: {
    borderColor: UI_COLORS.primary,
    backgroundColor: '#F8FAFC',
  },
  checkboxControl: {
    marginTop: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxContent: {
    flex: 1,
  },
  checkboxTitleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  checkboxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  checkboxDesc: {
    margin: '4px 0 0 0',
    fontSize: 12,
    color: '#64748B',
    lineHeight: '18px',
  },
  columnsPreviewSection: {
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
    padding: '10px 14px',
  },
  toggleColumnsBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 0',
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  toggleArrow: {
    fontSize: 12,
    color: UI_COLORS.primary,
    fontWeight: '600',
  },
  columnsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTop: '1px solid #E2E8F0',
  },
  columnTag: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    padding: '4px 8px',
    borderRadius: 6,
  },
  columnTagIndex: {
    color: '#94A3B8',
    marginRight: 4,
    fontWeight: '700',
  },
  columnTagImage: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
    color: '#1D4ED8',
    fontWeight: '700',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    padding: '16px 24px',
    borderTop: '1px solid #F1F5F9',
    backgroundColor: '#FAFAFA',
  },
  cancelBtn: {
    minHeight: 40,
    padding: '0 18px',
  },
  submitBtn: {
    minHeight: 40,
    padding: '0 20px',
    backgroundColor: UI_COLORS.primary,
  },
};
