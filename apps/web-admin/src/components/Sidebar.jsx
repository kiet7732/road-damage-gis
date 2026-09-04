import { NavLink } from 'react-router-dom';
import { FiAlertCircle, FiBarChart2, FiGrid, FiList, FiMap, FiUser, FiX } from 'react-icons/fi';
import { UI_COLORS } from '../constants/statusColors';

const SIDEBAR_ICON_SIZE = 24;

const menuItems = [
  { label: 'Dashboard', path: '/', icon: FiGrid },
  { label: 'Bản đồ GIS', path: '/map', icon: FiMap },
  { label: 'Danh sách báo cáo', path: '/reports', icon: FiList },
  { label: 'Ảnh cần kiểm tra thêm', path: '/reports/manual-review', icon: FiAlertCircle },
  { label: 'Thống kê', path: '/statistics', icon: FiBarChart2 },
  { label: 'Tài khoản', path: '/account', icon: FiUser },
];

export default function Sidebar({ drawer = false, onClose }) {
  return (
    <aside className={drawer ? 'road-sidebar-drawer' : undefined} style={styles.sidebar}>
      <div style={styles.brand}>
        <div style={styles.logoMark}>RD</div>
        <div style={styles.brandCopy}>
          <div style={styles.brandTitle}>Road Damage GIS</div>
          <div style={styles.brandSubtitle}>Admin Console</div>
        </div>

        {drawer ? (
          <button type="button" style={styles.closeButton} aria-label="Đóng menu" onClick={onClose}>
            <FiX size={SIDEBAR_ICON_SIZE} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <nav style={styles.menu} aria-label="Điều hướng quản trị">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end
              onClick={drawer ? onClose : undefined}
              className="road-sidebar-menu-item"
              style={({ isActive }) => ({
                ...styles.menuItem,
                ...(isActive ? styles.menuItemActive : null),
              })}
            >
              <span style={styles.menuIcon}>
                <Icon size={SIDEBAR_ICON_SIZE} aria-hidden="true" />
              </span>
              <span style={styles.menuLabel}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 280,
    flex: '0 0 280px',
    height: '100vh',
    overflowY: 'auto',
    background: UI_COLORS.sidebar,
    color: UI_COLORS.surface,
    borderRight: '1px solid rgba(255,255,255,0.08)',
    padding: 20,
    boxSizing: 'border-box',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 24,
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  brandCopy: {
    minWidth: 0,
    flex: 1,
  },
  logoMark: {
    width: 44,
    height: 44,
    flex: '0 0 44px',
    borderRadius: 14,
    display: 'grid',
    placeItems: 'center',
    background: UI_COLORS.primary,
    fontWeight: 900,
    letterSpacing: 0.5,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },
  brandSubtitle: {
    marginTop: 3,
    color: UI_COLORS.sidebarText,
    fontSize: 13,
  },
  closeButton: {
    width: 44,
    height: 44,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 14,
    background: 'rgba(255,255,255,0.08)',
    color: UI_COLORS.surface,
    cursor: 'pointer',
  },
  menu: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingTop: 24,
  },
  menuItem: {
    minHeight: 48,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '0 14px',
    borderRadius: 12,
    color: UI_COLORS.sidebarText,
    textDecoration: 'none',
    fontSize: 15,
    fontWeight: 700,
    outline: 'none',
  },
  menuItemActive: {
    color: UI_COLORS.surface,
    background: UI_COLORS.primary,
    boxShadow: 'inset 4px 0 0 rgba(255,255,255,0.35)',
  },
  menuIcon: {
    width: 24,
    height: 24,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 24px',
  },
  menuLabel: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
};
