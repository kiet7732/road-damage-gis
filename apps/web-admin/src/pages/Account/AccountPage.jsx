import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import Panel from '../../components/Panel';
import { DashboardSkeleton } from '../../components/Skeleton';
import { UI_COLORS } from '../../constants/statusColors';
import useAsyncData from '../../hooks/useAsyncData';
import { fetchCurrentAdminUser, getLoginErrorMessage } from '../../services/authService';

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

  const displayName = currentUser?.fullName?.trim() || currentUser?.name?.trim() || 'Tài khoản';
  const displayRole = currentUser?.role?.trim() || 'Chưa có vai trò';
  const displayEmail = currentUser?.email?.trim() || 'Chưa có email';
  const avatarText = displayName.charAt(0).toUpperCase();

  return (
    <section style={styles.page}>
      <PageHeader title="Tài khoản" subtitle="Thông tin cán bộ quản lý đang đăng nhập." />

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
        <Panel>
          <div style={styles.accountBox}>
            <div style={styles.avatar}>{avatarText}</div>
            <div style={styles.accountInfo}>
              <strong style={styles.name}>{displayName}</strong>
              <p style={styles.role}>{displayRole}</p>
              <p style={styles.meta}>{displayEmail}</p>
              <p style={styles.meta}>ID: {currentUser.id}</p>
            </div>
          </div>
        </Panel>
      ) : null}
    </section>
  );
}

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  accountBox: {
    minHeight: 160,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    color: UI_COLORS.text,
  },
  accountInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  avatar: {
    width: 56,
    height: 56,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 18,
    background: '#E6F0FF',
    color: UI_COLORS.primary,
    fontWeight: 900,
  },
  name: {
    fontSize: 18,
  },
  role: {
    margin: '4px 0 0',
    color: UI_COLORS.textMuted,
  },
  meta: {
    margin: 0,
    color: UI_COLORS.textMuted,
    fontSize: 14,
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
