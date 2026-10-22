import { FiUserPlus, FiTool, FiAlertCircle, FiX } from 'react-icons/fi';
import { UI_COLORS } from '../../../constants/statusColors';
import { DISTRICT_OPTIONS } from '../../../constants/userConstants';

export default function UserCreateModal({
  isOpen,
  onClose,
  createForm,
  setCreateForm,
  onSubmit,
  actionLoading,
  actionError,
}) {
  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay} onClick={() => !actionLoading && onClose()}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div style={styles.modalTitleRow}>
            <div style={styles.modalIconCircle}>
              <FiUserPlus size={20} color={UI_COLORS.primary} />
            </div>
            <div>
              <h3 style={styles.modalTitle}>Tạo tài khoản Kỹ sư hiện trường / Cán bộ</h3>
              <p style={styles.modalSubtitle}>
                Cấp tài khoản mới để đăng nhập ứng dụng Mobile Engineer hoặc Web Admin
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={styles.modalCloseBtn}
            disabled={actionLoading}
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Engineer Guidance Banner */}
        <div style={styles.guidanceBanner}>
          <FiTool size={18} color="#1D4ED8" />
          <div style={styles.guidanceText}>
            <strong>Lưu ý:</strong> Tài khoản Kỹ sư hiện trường do Ban Quản trị cấp để tác nghiệp
            trực tiếp trên ứng dụng di động <em>Road Damage GIS</em>. Kỹ sư không thể tự đăng ký tài
            khoản bên ngoài.
          </div>
        </div>

        {actionError && (
          <div style={styles.modalErrorBanner}>
            <FiAlertCircle size={16} color="#DC2626" />
            <span>{actionError}</span>
          </div>
        )}

        <form onSubmit={onSubmit} style={styles.modalForm}>
          <div style={styles.formRow}>
            <div style={styles.formCol}>
              <label style={styles.label}>
                Vai trò <span style={styles.req}>*</span>
              </label>
              <select
                id="new-user-role"
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                style={styles.input}
                required
              >
                <option value="field_engineer">Kỹ sư hiện trường (Mobile App)</option>
                <option value="district_officer">Cán bộ địa bàn (Web Admin)</option>
                <option value="admin">Quản trị viên (Web Admin)</option>
                <option value="reporter">Người phản ánh (Citizen)</option>
              </select>
            </div>

            <div style={styles.formCol}>
              <label style={styles.label}>
                Địa bàn phụ trách
              </label>
              <select
                id="new-user-district"
                value={createForm.managedDistrict}
                onChange={(e) => setCreateForm({ ...createForm, managedDistrict: e.target.value })}
                style={styles.input}
              >
                <option value="">Toàn thành phố / Không giới hạn</option>
                {DISTRICT_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Họ và tên <span style={styles.req}>*</span>
            </label>
            <input
              type="text"
              id="new-user-fullname"
              placeholder="Ví dụ: Nguyễn Văn Hoàng"
              value={createForm.fullName}
              onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formRow}>
            <div style={styles.formCol}>
              <label style={styles.label}>
                Email đăng nhập <span style={styles.req}>*</span>
              </label>
              <input
                type="email"
                id="new-user-email"
                placeholder="engineer@roadgis.local"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formCol}>
              <label style={styles.label}>Số điện thoại</label>
              <input
                type="tel"
                id="new-user-phone"
                placeholder="0912345678"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Mật khẩu khởi tạo <span style={styles.req}>*</span>
            </label>
            <input
              type="password"
              id="new-user-password"
              placeholder="Tối thiểu 6 ký tự"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              style={styles.input}
              required
              minLength={6}
            />
          </div>

          <div style={styles.modalFooter}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelBtn}
              disabled={actionLoading}
            >
              Hủy
            </button>
            <button
              type="submit"
              id="btn-submit-create-user"
              style={styles.submitBtn}
              disabled={actionLoading}
            >
              {actionLoading ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 23, 42, 0.6)',
    display: 'grid',
    placeItems: 'center',
    zIndex: 9999,
    padding: 16,
    backdropFilter: 'blur(2px)',
  },
  modalContent: {
    background: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 540,
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  modalIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: '#EFF6FF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 800,
    color: '#0F172A',
  },
  modalSubtitle: {
    margin: '2px 0 0',
    fontSize: 13,
    color: '#64748B',
  },
  modalCloseBtn: {
    border: 'none',
    background: 'transparent',
    color: '#94A3B8',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
  },
  guidanceBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    background: '#EFF6FF',
    border: '1px solid #BFDBFE',
    borderRadius: 8,
    padding: 12,
  },
  guidanceText: {
    fontSize: 12.5,
    color: '#1E40AF',
    lineHeight: 1.5,
  },
  modalErrorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: 8,
    padding: 10,
    color: '#DC2626',
    fontSize: 13,
    fontWeight: 600,
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  formRow: {
    display: 'flex',
    gap: 12,
  },
  formCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 700,
    color: '#334155',
  },
  req: {
    color: '#EF4444',
  },
  input: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #CBD5E1',
    background: '#F8FAFC',
    fontSize: 14,
    color: '#0F172A',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  modalFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
    paddingTop: 14,
    borderTop: '1px solid #F1F5F9',
  },
  cancelBtn: {
    padding: '9px 16px',
    borderRadius: 8,
    background: '#F1F5F9',
    border: '1px solid #CBD5E1',
    color: '#475569',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '9px 20px',
    borderRadius: 8,
    background: UI_COLORS.primary,
    border: 'none',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 5px rgba(15, 118, 110, 0.2)',
  },
};
