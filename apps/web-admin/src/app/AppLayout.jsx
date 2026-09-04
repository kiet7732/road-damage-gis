import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import WebButton from '../components/WebButton';
import { UI_COLORS } from '../constants/statusColors';

const TABLET_WIDTH = 980;

export default function AppLayout({ onLogout }) {
  const location = useLocation();
  const [isTablet, setIsTablet] = useState(() => getIsTablet());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isMapPage = location.pathname === '/map';

  useEffect(() => {
    function handleResize() {
      const nextIsTablet = getIsTablet();
      setIsTablet(nextIsTablet);

      if (!nextIsTablet) {
        setIsSidebarOpen(false);
      }
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setIsLogoutConfirmOpen(false);
  }, [location.pathname]);

  async function handleConfirmLogout() {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await onLogout();
    } finally {
      setIsLoggingOut(false);
      setIsLogoutConfirmOpen(false);
    }
  }

  return (
    <div className="road-admin-shell" style={styles.shell}>
      {!isTablet ? <Sidebar /> : null}

      {isTablet && isSidebarOpen ? (
        <div className="road-sidebar-overlay" role="presentation">
          <Sidebar drawer onClose={() => setIsSidebarOpen(false)} />
          <button
            type="button"
            className="road-sidebar-backdrop"
            aria-label="Đóng menu"
            onClick={() => setIsSidebarOpen(false)}
          />
        </div>
      ) : null}

      <div className="road-admin-main">
        <Header
          compact={isTablet}
          onMenuClick={() => setIsSidebarOpen(true)}
          onLogout={() => setIsLogoutConfirmOpen((currentValue) => !currentValue)}
        />
        {isLogoutConfirmOpen ? (
          <div style={styles.confirmStripWrap}>
            <div style={styles.confirmStrip}>
              <div style={styles.confirmCopy}>
                <strong style={styles.confirmTitle}>Xác nhận đăng xuất</strong>
                <span style={styles.confirmText}>
                  Bạn có muốn kết thúc phiên làm việc của tài khoản quản lý này không?
                </span>
              </div>

              <div style={styles.confirmActions}>
                <WebButton
                  variant="secondary"
                  type="button"
                  onClick={() => setIsLogoutConfirmOpen(false)}
                  disabled={isLoggingOut}
                >
                  Hủy
                </WebButton>
                <WebButton type="button" onClick={handleConfirmLogout} disabled={isLoggingOut}>
                  {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
                </WebButton>
              </div>
            </div>
          </div>
        ) : null}
        <main
          className={`road-admin-content${isMapPage ? ' road-admin-content--map' : ''}`}
          style={{ ...styles.content, padding: isMapPage ? 0 : isTablet ? 16 : 28 }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function getIsTablet() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.innerWidth < TABLET_WIDTH;
}

const styles = {
  shell: {
    background: UI_COLORS.background,
    color: UI_COLORS.text,
  },
  content: {
    boxSizing: 'border-box',
  },
  confirmStripWrap: {
    padding: '14px 28px 0',
    background: UI_COLORS.surface,
    borderBottom: `1px solid ${UI_COLORS.border}`,
  },
  confirmStrip: {
    minHeight: 74,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '14px 18px',
    borderRadius: 18,
    background: '#FFF7ED',
    border: '1px solid #F5C48B',
    boxSizing: 'border-box',
  },
  confirmCopy: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  confirmTitle: {
    color: UI_COLORS.text,
    fontSize: 15,
    fontWeight: 900,
  },
  confirmText: {
    color: UI_COLORS.textMuted,
    fontSize: 13,
    lineHeight: 1.5,
  },
  confirmActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
};
