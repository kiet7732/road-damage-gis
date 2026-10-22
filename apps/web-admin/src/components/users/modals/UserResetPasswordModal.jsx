import { FiKey, FiAlertCircle, FiX } from 'react-icons/fi';

export default function UserResetPasswordModal({
  isOpen,
  onClose,
  selectedUser,
  resetPwdForm,
  setResetPwdForm,
  onSubmit,
  actionLoading,
  actionError,
}) {
  if (!isOpen || !selectedUser) return null;

  return (
    <div style={styles.modalOverlay} onClick={() => !actionLoading && onClose()}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div style={styles.modalTitleRow}>
            <div style={styles.modalIconCircle}>
              <FiKey size={20} color="#F59E0B" />
            </div>
            <div>
              <h3 style={styles.modalTitle}>Đặt lại mật khẩu</h3>
              <p style={styles.modalSubtitle}>
                Tài khoản: <strong>{selectedUser.fullName}</strong> ({selectedUser.email})
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

        {actionError && (
          <div style={styles.modalErrorBanner}>
            <FiAlertCircle size={16} color="#DC2626" />
            <span>{actionError}</span>
          </div>
        )}

        <form onSubmit={onSubmit} style={styles.modalForm}>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Mật khẩu mới <span style={styles.req}>*</span>
            </label>
            <input
              type="password"
              id="reset-new-password"
              placeholder="Tối thiểu 6 ký tự"
              value={resetPwdForm.newPassword}
              onChange={(e) => setResetPwdForm({ ...resetPwdForm, newPassword: e.target.value })}
              style={styles.input}
              required
              minLength={6}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Xác nhận mật khẩu mới <span style={styles.req}>*</span>
            </label>
            <input
              type="password"
              id="reset-confirm-password"
              placeholder="Nhập lại mật khẩu mới"
              value={resetPwdForm.confirmPassword}
              onChange={(e) => setResetPwdForm({ ...resetPwdForm, confirmPassword: e.target.value })}
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
              id="btn-submit-reset-pwd"
              style={styles.submitBtn}
              disabled={actionLoading}
            >
              {actionLoading ? 'Đang cập nhật...' : 'Xác nhận đặt lại'}
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
    background: '#F59E0B',
    border: 'none',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 5px rgba(245, 158, 11, 0.2)',
  },
};
