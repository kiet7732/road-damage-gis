import { FiBell, FiChevronDown, FiMenu } from 'react-icons/fi';
import { UI_COLORS } from '../constants/statusColors';
import { useAuth } from '../hooks/useAuth';

const NAV_ICON_SIZE = 24;
const INLINE_ICON_SIZE = 18;

export default function Header({ compact = false, onMenuClick, onLogout }) {
  const { user: currentUser } = useAuth();
  const displayName = currentUser?.fullName?.trim() || currentUser?.name?.trim() || 'Tài khoản';
  const displayRole = currentUser?.role?.trim() || 'Chưa có vai trò';
  const managedDistrict = currentUser?.managed_district || currentUser?.managedDistrict;
  const avatarText = displayName.charAt(0).toUpperCase();

  return (
    <header style={{ ...styles.header, ...(compact ? styles.headerCompact : null) }}>
      <div style={styles.leftArea}>
        {compact ? (
          <button type="button" style={styles.menuButton} aria-label="Mở menu" onClick={onMenuClick}>
            <FiMenu size={NAV_ICON_SIZE} aria-hidden="true" />
          </button>
        ) : null}

        <div style={styles.titleBlock}>
          <h1 className="road-admin-header-title" style={{ ...styles.title, fontSize: compact ? 16 : 20 }}>
            Hệ thống quản lý tình trạng mặt đường
          </h1>
          {!compact ? (
            <p style={styles.subtitle}>Theo dõi phản ánh, xác minh hiện trạng và quản lý dữ liệu bản đồ.</p>
          ) : null}
        </div>
      </div>

      <div className="road-admin-header-actions" style={styles.actions}>
        <button type="button" style={styles.notificationButton} aria-label="Thông báo">
          <FiBell size={NAV_ICON_SIZE} aria-hidden="true" />
          <span style={styles.notificationDot} />
        </button>

        <button type="button" style={styles.userButton} onClick={onLogout} title="Mở xác nhận đăng xuất">
          <div style={styles.avatar}>{avatarText}</div>
          {!compact ? (
            <div style={styles.userText}>
              <div style={styles.userName}>{displayName}</div>
              <div className="road-admin-user-role" style={styles.userRole}>
                <span>{displayRole}</span>
                {managedDistrict ? (
                  <span style={styles.districtBadge}>{managedDistrict}</span>
                ) : null}
              </div>
            </div>
          ) : null}
          <span style={styles.inlineIcon}>
            <FiChevronDown size={INLINE_ICON_SIZE} color={UI_COLORS.textMuted} aria-hidden="true" />
          </span>
        </button>
      </div>
    </header>
  );
}

const styles = {
  header: {
    height: 76,
    flex: '0 0 76px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
    padding: '0 28px',
    background: UI_COLORS.surface,
    borderBottom: `1px solid ${UI_COLORS.border}`,
    boxSizing: 'border-box',
  },
  headerCompact: {
    padding: '0 16px',
  },
  leftArea: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: {
    width: 44,
    height: 44,
    flex: '0 0 44px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `1px solid ${UI_COLORS.border}`,
    borderRadius: 14,
    background: UI_COLORS.surface,
    color: UI_COLORS.text,
    cursor: 'pointer',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    margin: 0,
    color: UI_COLORS.text,
    fontWeight: 900,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  subtitle: {
    margin: '4px 0 0',
    color: UI_COLORS.textMuted,
    fontSize: 13,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    flex: '0 0 auto',
  },
  notificationButton: {
    position: 'relative',
    width: 44,
    height: 44,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `1px solid ${UI_COLORS.border}`,
    borderRadius: 14,
    background: UI_COLORS.surface,
    color: '#334155',
    cursor: 'pointer',
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 9,
    height: 9,
    borderRadius: 999,
    background: UI_COLORS.danger,
    border: `2px solid ${UI_COLORS.surface}`,
  },
  userButton: {
    minHeight: 44,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 10px 0 0',
    border: `1px solid ${UI_COLORS.border}`,
    borderRadius: 16,
    background: UI_COLORS.surface,
    cursor: 'pointer',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    display: 'grid',
    placeItems: 'center',
    background: '#E6F0FF',
    color: UI_COLORS.primary,
    fontWeight: 900,
  },
  userText: {
    textAlign: 'left',
  },
  userName: {
    color: UI_COLORS.text,
    fontSize: 14,
    fontWeight: 800,
  },
  userRole: {
    marginTop: 2,
    color: UI_COLORS.textMuted,
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  districtBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '1px 6px',
    borderRadius: 6,
    background: '#EFF6FF',
    color: UI_COLORS.primary,
    border: '1px solid #BFDBFE',
    fontSize: 11,
    fontWeight: 700,
    lineHeight: '14px',
  },
  inlineIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
