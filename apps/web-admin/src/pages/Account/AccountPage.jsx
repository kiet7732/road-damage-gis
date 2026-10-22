import { useState } from 'react';
import {
  FiAlertCircle,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiKey,
  FiLock,
  FiShield,
  FiUser,
} from 'react-icons/fi';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import Panel from '../../components/Panel';
import { DashboardSkeleton } from '../../components/Skeleton';
import WebButton from '../../components/WebButton';
import { UI_COLORS } from '../../constants/statusColors';
import useAsyncData from '../../hooks/useAsyncData';
import {
  changeAdminPassword,
  fetchCurrentAdminUser,
  getLoginErrorMessage,
} from '../../services/authService';

export default function AccountPage() {
  const {
    data: currentUser,
    isLoading,
    isError,
    isSuccess,
    error,
  } = useAsyncData(async () => {
    try {
      return await fetchCurrentAdminUser();
    } catch (requestError) {
      throw new Error(getLoginErrorMessage(requestError));
    }
  }, []);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [changeError, setChangeError] = useState('');
  const [changeSuccess, setChangeSuccess] = useState('');

  const displayName = currentUser?.fullName?.trim() || currentUser?.name?.trim() || 'Tài khoản';
  const displayRole = currentUser?.role?.trim() || 'Chưa có vai trò';
  const displayEmail = currentUser?.email?.trim() || 'Chưa có email';
  const avatarText = displayName.charAt(0).toUpperCase();

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setChangeError('');
    setChangeSuccess('');

    if (!currentPassword) {
      setChangeError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setChangeError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    if (newPassword === currentPassword) {
      setChangeError('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangeError('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    setIsSubmitting(true);
    try {
      await changeAdminPassword({
        currentPassword,
        newPassword,
      });
      setChangeSuccess('Đổi mật khẩu thành công! Mật khẩu mới đã được cập nhật.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setChangeSuccess(''), 6000);
    } catch (err) {
      setChangeError(err?.message || 'Có lỗi xảy ra khi đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section style={styles.page}>
      <PageHeader title="Tài khoản & Bảo mật" subtitle="Thông tin cán bộ quản lý đang đăng nhập và cài đặt mật khẩu an toàn." />

      {isLoading ? <DashboardSkeleton /> : null}

      {!isLoading && isError ? (
        <Panel>
          <div style={styles.stateBox}>
            <strong style={styles.errorTitle}>Không tải được tài khoản</strong>
            <span style={styles.stateText}>{error || 'Không lấy được thông tin tài khoản từ máy chủ.'}</span>
          </div>
        </Panel>
      ) : null}

      {!isLoading && isSuccess && !currentUser ? (
        <Panel>
          <EmptyState
            title="Chưa có thông tin tài khoản"
            description="Không tìm thấy thông tin tài khoản quản trị."
          />
        </Panel>
      ) : null}

      {!isLoading && isSuccess && currentUser ? (
        <div style={styles.gridContainer}>
          {/* 1. Thẻ thông tin cá nhân */}
          <Panel style={styles.infoCard}>
            <div style={styles.cardHeader}>
              <div style={styles.cardHeaderIcon}>
                <FiUser size={18} color={UI_COLORS.primary} />
              </div>
              <h3 style={styles.cardTitle}>Thông tin cá nhân</h3>
            </div>

            <div style={styles.accountBox}>
              <div style={styles.avatar}>{avatarText}</div>
              <div style={styles.accountInfo}>
                <strong style={styles.name}>{displayName}</strong>
                <span style={styles.roleBadge}>{displayRole.toUpperCase()}</span>
                <p style={styles.metaEmail}>{displayEmail}</p>
              </div>
            </div>

            <div style={styles.divider} />

            <div style={styles.metaList}>
              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>Mã định danh (ID):</span>
                <span style={styles.metaValue}>{currentUser.id}</span>
              </div>
              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>Số điện thoại:</span>
                <span style={styles.metaValue}>{currentUser.phone || 'Chưa cập nhật'}</span>
              </div>
              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>Địa bàn quản lý:</span>
                <span style={styles.metaHighlight}>
                  {currentUser.managed_district || currentUser.managedDistrict
                    ? `${currentUser.managed_district || currentUser.managedDistrict}${
                        currentUser.managed_ward || currentUser.managedWard
                          ? ` - ${currentUser.managed_ward || currentUser.managedWard}`
                          : ''
                      }`
                    : 'Toàn thành phố (Không giới hạn)'}
                </span>
              </div>
              <div style={styles.metaRow}>
                <span style={styles.metaLabel}>Cấp bảo mật:</span>
                <span style={styles.metaSecurity}>
                  <FiShield size={14} color="#059669" /> Xác thực phiên làm việc an toàn
                </span>
              </div>
            </div>
          </Panel>

          {/* 2. Thẻ Đổi mật khẩu */}
          <Panel style={styles.passwordCard}>
            <div style={styles.cardHeader}>
              <div style={{ ...styles.cardHeaderIcon, backgroundColor: '#FFFBEB' }}>
                <FiKey size={18} color="#D97706" />
              </div>
              <div>
                <h3 style={styles.cardTitle}>Đổi mật khẩu tài khoản</h3>
                <p style={styles.cardSubtitle}>
                  Khuyến nghị sử dụng mật khẩu mạnh kết hợp chữ, số và ký tự đặc biệt.
                </p>
              </div>
            </div>

            {changeSuccess ? (
              <div style={styles.successBanner}>
                <FiCheckCircle size={18} color="#059669" style={{ flexShrink: 0 }} />
                <span>{changeSuccess}</span>
              </div>
            ) : null}

            {changeError ? (
              <div style={styles.errorBanner}>
                <FiAlertCircle size={18} color="#DC2626" style={{ flexShrink: 0 }} />
                <span>{changeError}</span>
              </div>
            ) : null}

            <form onSubmit={handlePasswordSubmit} style={styles.passwordForm}>
              {/* Mật khẩu hiện tại */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel} htmlFor="account-current-password">
                  Mật khẩu hiện tại <span style={styles.req}>*</span>
                </label>
                <div style={styles.inputWrap}>
                  <input
                    id="account-current-password"
                    type={showCurrent ? 'text' : 'password'}
                    placeholder="Nhập mật khẩu hiện tại đang dùng"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      setChangeError('');
                    }}
                    style={styles.input}
                    disabled={isSubmitting}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    style={styles.eyeBtn}
                    onClick={() => setShowCurrent(!showCurrent)}
                    tabIndex={-1}
                  >
                    {showCurrent ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>

              {/* Mật khẩu mới */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel} htmlFor="account-new-password">
                  Mật khẩu mới <span style={styles.req}>*</span>
                </label>
                <div style={styles.inputWrap}>
                  <input
                    id="account-new-password"
                    type={showNew ? 'text' : 'password'}
                    placeholder="Tối thiểu 6 ký tự"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setChangeError('');
                    }}
                    style={styles.input}
                    disabled={isSubmitting}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    style={styles.eyeBtn}
                    onClick={() => setShowNew(!showNew)}
                    tabIndex={-1}
                  >
                    {showNew ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>

              {/* Xác nhận mật khẩu mới */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel} htmlFor="account-confirm-password">
                  Xác nhận mật khẩu mới <span style={styles.req}>*</span>
                </label>
                <div style={styles.inputWrap}>
                  <input
                    id="account-confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setChangeError('');
                    }}
                    style={styles.input}
                    disabled={isSubmitting}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    style={styles.eyeBtn}
                    onClick={() => setShowConfirm(!showConfirm)}
                    tabIndex={-1}
                  >
                    {showConfirm ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                  </button>
                </div>
              </div>

              <div style={styles.submitRow}>
                <WebButton
                  type="submit"
                  disabled={isSubmitting || !currentPassword || !newPassword || !confirmPassword}
                  style={styles.submitBtn}
                >
                  <FiLock size={15} />
                  <span>{isSubmitting ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}</span>
                </WebButton>
              </div>
            </form>
          </Panel>
        </div>
      ) : null}
    </section>
  );
}

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    width: '100%',
    boxSizing: 'border-box',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
    gap: 20,
    alignItems: 'start',
  },
  infoCard: {
    padding: '24px',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  passwordCard: {
    padding: '24px',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0,
  },
  cardTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 800,
    color: UI_COLORS.text,
  },
  cardSubtitle: {
    margin: '3px 0 0',
    fontSize: 12,
    color: UI_COLORS.textMuted,
  },
  accountBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '16px',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    border: '1px solid #E2E8F0',
  },
  avatar: {
    width: 56,
    height: 56,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 16,
    background: '#E6F0FF',
    color: UI_COLORS.primary,
    fontWeight: 900,
    fontSize: 22,
    flexShrink: 0,
  },
  accountInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 0,
  },
  name: {
    fontSize: 17,
    fontWeight: 800,
    color: UI_COLORS.text,
  },
  roleBadge: {
    display: 'inline-block',
    alignSelf: 'flex-start',
    padding: '2px 8px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
    backgroundColor: '#EFF6FF',
    color: UI_COLORS.primary,
  },
  metaEmail: {
    margin: 0,
    color: UI_COLORS.textMuted,
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  metaList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 13,
  },
  metaLabel: {
    color: UI_COLORS.textMuted,
    fontWeight: 500,
  },
  metaValue: {
    color: UI_COLORS.text,
    fontWeight: 600,
  },
  metaHighlight: {
    color: UI_COLORS.primary,
    fontWeight: 700,
  },
  metaSecurity: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    color: '#059669',
    fontWeight: 600,
    fontSize: 12,
  },
  successBanner: {
    padding: '12px 14px',
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    border: '1px solid #A7F3D0',
    color: '#065F46',
    fontSize: 13,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  errorBanner: {
    padding: '12px 14px',
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    color: '#991B1B',
    fontSize: 13,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  passwordForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: UI_COLORS.text,
  },
  req: {
    color: '#DC2626',
  },
  inputWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: '10px 42px 10px 14px',
    borderRadius: 10,
    border: '1px solid #CBD5E1',
    fontSize: 14,
    color: UI_COLORS.text,
    boxSizing: 'border-box',
    outline: 'none',
    backgroundColor: '#FFFFFF',
    transition: 'border-color 0.2s',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: UI_COLORS.textMuted,
    display: 'flex',
    alignItems: 'center',
    padding: 4,
  },
  submitRow: {
    marginTop: 8,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 20px',
    borderRadius: 10,
    fontWeight: 700,
  },
  stateBox: {
    minHeight: 120,
    display: 'grid',
    placeItems: 'center',
    alignContent: 'center',
    gap: 8,
    textAlign: 'center',
  },
  stateText: {
    color: UI_COLORS.textMuted,
    fontSize: 14,
  },
  errorTitle: {
    color: UI_COLORS.danger,
  },
};
