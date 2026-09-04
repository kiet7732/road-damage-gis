import { BrowserRouter } from 'react-router-dom';
import { useEffect, useState } from 'react';
import AppRouter from './src/app/AppRouter';
import ApiErrorNotifier from './src/components/ApiErrorNotifier';
import AppErrorBoundary from './src/components/AppErrorBoundary';
import { ToastProvider } from './src/components/ToastProvider';
import WebButton from './src/components/WebButton';
import { UI_COLORS } from './src/constants/statusColors';
import { configureWebApiClient } from './src/services/configureApiClient';
import {
  bootstrapAdminSession,
  logoutAdmin,
} from './src/services/authService';
import './src/styles/responsive.css';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authBootstrapError, setAuthBootstrapError] = useState('');
  const [authBootstrapAttempt, setAuthBootstrapAttempt] = useState(0);

  useEffect(() => {
    configureWebApiClient(() => {
      setIsAuthenticated(false);
      setAuthBootstrapError('');
    });

    bootstrapAdminSession()
      .then((result) => {
        if (result.status === 'authenticated') {
          setIsAuthenticated(true);
          setAuthBootstrapError('');
          return;
        }

        if (result.status === 'retry_required') {
          setIsAuthenticated(false);
          setAuthBootstrapError(result.message);
          return;
        }

        setIsAuthenticated(false);
        setAuthBootstrapError('');
      })
      .catch(() => {
        setIsAuthenticated(false);
        setAuthBootstrapError('Không thể khởi tạo phiên đăng nhập quản trị.');
      })
      .finally(() => {
        setIsAuthReady(true);
      });
  }, [authBootstrapAttempt]);

  const handleLogout = async () => {
    await logoutAdmin();
    setIsAuthenticated(false);
  };

  if (!isAuthReady) {
    return null;
  }

  if (authBootstrapError) {
    return (
      <AppErrorBoundary>
        <main style={styles.page}>
          <section style={styles.card}>
            <div style={styles.logo}>RD</div>
            <h1 style={styles.title}>Chưa thể kiểm tra phiên đăng nhập</h1>
            <p style={styles.subtitle}>{authBootstrapError}</p>
            <WebButton
              style={styles.button}
              type="button"
              onClick={() => {
                setIsAuthReady(false);
                setAuthBootstrapError('');
                setAuthBootstrapAttempt((currentValue) => currentValue + 1);
              }}
            >
              Thử lại
            </WebButton>
          </section>
        </main>
      </AppErrorBoundary>
    );
  }

  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <ApiErrorNotifier />
          <style>
            {`
              @keyframes roadDamageSkeleton {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
              }
            `}
          </style>
          <AppRouter
            isAuthenticated={isAuthenticated}
            onLogin={() => setIsAuthenticated(true)}
            onLogout={handleLogout}
          />
        </ToastProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: 24,
    background: UI_COLORS.background,
    boxSizing: 'border-box',
  },
  card: {
    width: 'min(100%, 460px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    padding: 28,
    border: `1px solid ${UI_COLORS.border}`,
    borderRadius: 22,
    background: UI_COLORS.surface,
    boxShadow: '0 20px 60px rgba(15, 23, 42, 0.12)',
    boxSizing: 'border-box',
    textAlign: 'center',
  },
  logo: {
    width: 56,
    height: 56,
    display: 'grid',
    placeItems: 'center',
    margin: '0 auto',
    borderRadius: 18,
    background: UI_COLORS.primary,
    color: UI_COLORS.surface,
    fontWeight: 900,
  },
  title: {
    margin: 0,
    color: UI_COLORS.text,
    fontSize: 24,
    fontWeight: 900,
  },
  subtitle: {
    margin: 0,
    color: UI_COLORS.textMuted,
    fontSize: 14,
    lineHeight: 1.6,
  },
  button: {
    width: '100%',
  },
} as const;
