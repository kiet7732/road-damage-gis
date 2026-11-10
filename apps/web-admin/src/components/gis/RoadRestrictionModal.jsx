import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiCheck, FiLock, FiMapPin, FiX } from 'react-icons/fi';
import { UI_COLORS } from '../../constants/statusColors';

const RESTRICTION_TYPES = [
  { value: 'under_maintenance', label: '🚧 Đang thi công sửa chữa', desc: 'Mặt đường đang được cào bóc, thảm nhựa hoặc gia cố' },
  { value: 'full_closure', label: '⛔ Cấm toàn bộ phương tiện', desc: 'Đóng đường khẩn cấp do sạt lở, sụt lún hoặc sự cố nghiêm trọng' },
  { value: 'heavy_vehicle_ban', label: '🚛 Cấm xe tải / tải trọng lớn', desc: 'Cấm xe quá tải bảo vệ cầu đường yếu hoặc khu vực xuống cấp' },
  { value: 'lane_closure', label: '⚠️ Thu hẹp làn chạy', desc: 'Chỉ cấm một phần lòng đường, các phương tiện đi chậm' },
  { value: 'speed_limit', label: '🐌 Hạn chế tốc độ', desc: 'Giảm tốc độ do gờ mấp mô hoặc hư hỏng chờ khắc phục' },
];

const SEVERITY_OPTIONS = [
  { value: 'danger', label: 'Cực kỳ nghiêm trọng', color: '#DC2626', bg: '#FEE2E2' },
  { value: 'warning', label: 'Cảnh báo', color: '#D97706', bg: '#FEF3C7' },
  { value: 'info', label: 'Thông tin phân luồng', color: '#2563EB', bg: '#DBEAFE' },
];

export default function RoadRestrictionModal({
  isOpen,
  onClose,
  startPoint,
  endPoint,
  defaultProvince = '',
  isProvinceOfficer = false,
  onSave,
}) {
  const [roadName, setRoadName] = useState('');
  const [province, setProvince] = useState(defaultProvince || 'Bình Dương');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [restrictionType, setRestrictionType] = useState('under_maintenance');
  const [severity, setSeverity] = useState('warning');
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (defaultProvince) {
      setProvince(defaultProvince);
    }
  }, [defaultProvince]);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roadName.trim()) {
      setErrorMessage('Vui lòng nhập tên tuyến đường');
      return;
    }
    if (!reason.trim()) {
      setErrorMessage('Vui lòng nhập lý do hạn chế');
      return;
    }
    if (!startPoint || !endPoint) {
      setErrorMessage('Thiếu tọa độ Điểm đầu hoặc Điểm cuối');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage('');
      await onSave({
        road_name: roadName.trim(),
        province: isProvinceOfficer ? defaultProvince : province.trim(),
        district: district.trim() || null,
        ward: ward.trim() || null,
        start_latitude: Number(startPoint.latitude.toFixed(6)),
        start_longitude: Number(startPoint.longitude.toFixed(6)),
        end_latitude: Number(endPoint.latitude.toFixed(6)),
        end_longitude: Number(endPoint.longitude.toFixed(6)),
        restriction_type: restrictionType,
        severity,
        reason: reason.trim(),
        start_date: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        end_date: endDate ? new Date(endDate).toISOString() : null,
        is_active: true,
      });
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Không thể thiết lập hạn chế đoạn đường. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.iconCircle}>
              <FiAlertTriangle size={22} color="#DC2626" />
            </div>
            <div>
              <h3 style={styles.title}>Thiết Lập Đoạn Đường Hạn Chế Lưu Thông</h3>
              <p style={styles.subtitle}>Ghi nhận đoạn tuyến thi công hoặc cấm đường giữa 2 điểm đã chọn</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={styles.closeBtn} title="Đóng">
            <FiX size={20} />
          </button>
        </div>

        {/* Coords summary card */}
        <div style={styles.coordsCard}>
          <div style={styles.coordCol}>
            <div style={styles.coordLabel}>
              <span style={{ ...styles.pointDot, background: '#16A34A' }} />
              <strong>Điểm đầu (A):</strong>
            </div>
            <div style={styles.coordVal}>
              {startPoint ? `${startPoint.latitude.toFixed(5)}, ${startPoint.longitude.toFixed(5)}` : 'Chưa chọn'}
            </div>
          </div>
          <div style={styles.coordArrow}>➔</div>
          <div style={styles.coordCol}>
            <div style={styles.coordLabel}>
              <span style={{ ...styles.pointDot, background: '#DC2626' }} />
              <strong>Điểm cuối (B):</strong>
            </div>
            <div style={styles.coordVal}>
              {endPoint ? `${endPoint.latitude.toFixed(5)}, ${endPoint.longitude.toFixed(5)}` : 'Chưa chọn'}
            </div>
          </div>
        </div>

        {errorMessage ? (
          <div style={styles.errorAlert}>
            <span>{errorMessage}</span>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.row}>
            <div style={styles.fieldCol}>
              <label style={styles.label}>
                Tên tuyến đường <span style={styles.req}>*</span>
              </label>
              <input
                type="text"
                placeholder="VD: Quốc lộ 13, Đại lộ Bình Dương, ĐT 743..."
                value={roadName}
                onChange={(e) => setRoadName(e.target.value)}
                style={styles.input}
                required
              />
            </div>
            <div style={styles.fieldCol}>
              <label style={styles.label}>
                Tỉnh / Thành phố quản lý <span style={styles.req}>*</span>
              </label>
              {isProvinceOfficer ? (
                <div style={styles.lockedProvinceBox} title="Cố định theo phạm vi tỉnh quản lý">
                  <FiLock size={14} color="#1D4ED8" />
                  <span style={styles.lockedProvinceText}>{defaultProvince || 'Bình Dương'}</span>
                  <span style={styles.lockedBadge}>Cấp tỉnh</span>
                </div>
              ) : (
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  style={styles.select}
                >
                  <option value="Bình Dương">Bình Dương</option>
                  <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                  <option value="Đồng Nai">Đồng Nai</option>
                  <option value="Bà Rịa - Vũng Tàu">Bà Rịa - Vũng Tàu</option>
                  <option value="Hà Nội">Hà Nội</option>
                  <option value="Đà Nẵng">Đà Nẵng</option>
                  <option value="Cần Thơ">Cần Thơ</option>
                </select>
              )}
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.fieldCol}>
              <label style={styles.label}>Quận / Huyện / Thành phố trực thuộc</label>
              <input
                type="text"
                placeholder="VD: Thành phố Thủ Dầu Một, Thuận An..."
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.fieldCol}>
              <label style={styles.label}>Phường / Xã</label>
              <input
                type="text"
                placeholder="VD: Phường Hiệp Thành, Phường Phú Hòa..."
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.fieldCol}>
              <label style={styles.label}>Loại hình hạn chế</label>
              <select
                value={restrictionType}
                onChange={(e) => setRestrictionType(e.target.value)}
                style={styles.select}
              >
                {RESTRICTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.fieldCol}>
              <label style={styles.label}>Mức độ cảnh báo</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                style={styles.select}
              >
                {SEVERITY_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.fieldFull}>
            <label style={styles.label}>
              Lý do hạn chế / Nội dung thông báo <span style={styles.req}>*</span>
            </label>
            <textarea
              rows={2}
              placeholder="VD: Thi công sửa chữa cào bóc thảm nhựa bù lún đoạn km 14 - km 15. Đề nghị phương tiện giảm tốc độ hoặc chuyển hướng."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={styles.textarea}
              required
            />
          </div>

          <div style={styles.row}>
            <div style={styles.fieldCol}>
              <label style={styles.label}>Thời gian bắt đầu</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.fieldCol}>
              <label style={styles.label}>Thời gian dự kiến kết thúc</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.actions}>
            <button type="button" onClick={onClose} style={styles.cancelBtn} disabled={submitting}>
              Hủy bỏ
            </button>
            <button type="submit" style={styles.submitBtn} disabled={submitting}>
              <FiCheck size={16} />
              <span>{submitting ? 'Đang lưu...' : 'Lưu đoạn đường hạn chế'}</span>
            </button>
          </div>
        </form>
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
    backdropFilter: 'blur(4px)',
    zIndex: 1200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 620,
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    animation: 'fadeIn 0.2s ease-out',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 16px',
    borderBottom: '1px solid #E2E8F0',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: 800,
    color: '#0F172A',
    margin: 0,
  },
  subtitle: {
    fontSize: 12.5,
    color: '#64748B',
    margin: '3px 0 0 0',
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
    transition: 'background 0.15s',
  },
  coordsCard: {
    margin: '16px 24px 0',
    padding: '12px 16px',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    border: '1px solid #E2E8F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  coordCol: {
    flex: 1,
  },
  coordLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: '#475569',
  },
  pointDot: {
    width: 9,
    height: 9,
    borderRadius: '50%',
    display: 'inline-block',
  },
  coordVal: {
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: 700,
    color: '#0F172A',
    marginTop: 2,
  },
  coordArrow: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: 800,
  },
  errorAlert: {
    margin: '12px 24px 0',
    padding: '10px 14px',
    backgroundColor: '#FEF2F2',
    color: '#B91C1C',
    borderRadius: 8,
    fontSize: 13,
    border: '1px solid #FECACA',
  },
  form: {
    padding: '16px 24px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  row: {
    display: 'flex',
    gap: 14,
  },
  fieldCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  fieldFull: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  label: {
    fontSize: 12.5,
    fontWeight: 700,
    color: '#334155',
  },
  req: {
    color: '#DC2626',
  },
  input: {
    padding: '9px 12px',
    borderRadius: 10,
    border: '1.5px solid #CBD5E1',
    fontSize: 13.5,
    color: '#0F172A',
    outline: 'none',
    backgroundColor: '#FFFFFF',
  },
  select: {
    padding: '9px 12px',
    borderRadius: 10,
    border: '1.5px solid #CBD5E1',
    fontSize: 13.5,
    color: '#0F172A',
    outline: 'none',
    backgroundColor: '#FFFFFF',
  },
  textarea: {
    padding: '9px 12px',
    borderRadius: 10,
    border: '1.5px solid #CBD5E1',
    fontSize: 13.5,
    color: '#0F172A',
    outline: 'none',
    resize: 'vertical',
  },
  lockedProvinceBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '9px 12px',
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    border: '1.5px solid #BFDBFE',
  },
  lockedProvinceText: {
    fontSize: 13.5,
    fontWeight: 700,
    color: '#1E40AF',
    flex: 1,
  },
  lockedBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 6,
    backgroundColor: '#DBEAFE',
    color: '#1D4ED8',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
    paddingTop: 14,
    borderTop: '1px solid #E2E8F0',
  },
  cancelBtn: {
    padding: '10px 18px',
    borderRadius: 10,
    border: '1px solid #CBD5E1',
    backgroundColor: '#FFFFFF',
    color: '#475569',
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    borderRadius: 10,
    border: 'none',
    backgroundColor: '#DC2626',
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
  },
};
