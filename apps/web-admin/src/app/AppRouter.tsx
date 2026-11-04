import { lazy, Suspense } from 'react';
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import AppLayout from './AppLayout';
import LoginPage from '../pages/Auth/LoginPage';
import DashboardPage from '../pages/Dashboard/DashboardPage';

// Robust lazy loader with automated retry to withstand transient tunnel/network glitches
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 3,
  interval = 800
) {
  return lazy(() =>
    new Promise<{ default: T }>((resolve, reject) => {
      const attempt = (remaining: number) => {
        factory()
          .then((comp) => {
            sessionStorage.removeItem('rd_chunk_reload_done');
            resolve(comp);
          })
          .catch((error) => {
            console.warn(`[ModuleLoader] Retrying dynamic import (${remaining} attempts left)...`, error);
            if (remaining <= 1) {
              reject(error);
              return;
            }
            setTimeout(() => attempt(remaining - 1), interval);
          });
      };
      attempt(retries);
    })
  );
}

// Code-split heavy secondary pages with resilient auto-retry
const AccountPage = lazyWithRetry(() => import('../pages/Account/AccountPage'));
const DamageMapPage = lazyWithRetry(() => import('../pages/MapManagement/DamageMapPage'));
const ReportDetailPage = lazyWithRetry(() => import('../pages/Reports/ReportDetailPage'));
const ReportsPage = lazyWithRetry(() => import('../pages/Reports/ReportsPage'));
const StatisticsPage = lazyWithRetry(() => import('../pages/Statistics/StatisticsPage'));
const UsersManagementPage = lazyWithRetry(() => import('../pages/Users/UsersManagementPage'));

type AppRouterProps = {
  isAuthenticated: boolean;
  onLogin: () => void;
  onLogout: () => void;
};

type PrivateRouteProps = {
  isAuthenticated: boolean;
};

function PageLoadingFallback() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 14,
        color: '#64748B',
        fontSize: 14,
        fontWeight: 500,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          border: '3px solid #E2E8F0',
          borderTopColor: '#0F766E',
          borderRadius: '50%',
          animation: 'rdPageSpin 0.75s linear infinite',
        }}
      />
      <span>Đang tải nội dung...</span>
      <style>{`@keyframes rdPageSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function AppRouter({
  isAuthenticated,
  onLogin,
  onLogout,
}: AppRouterProps) {
  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage isAuthenticated={isAuthenticated} onLogin={onLogin} />}
      />

      <Route element={<PrivateRoute isAuthenticated={isAuthenticated} />}>
        <Route element={<AppLayout onLogout={onLogout} />}>
          <Route
            index
            element={<DashboardPage />}
          />
          <Route
            path="map"
            element={
              <Suspense fallback={<PageLoadingFallback />}>
                <DamageMapPage />
              </Suspense>
            }
          />
          <Route
            path="reports"
            element={
              <Suspense fallback={<PageLoadingFallback />}>
                <ReportsPage />
              </Suspense>
            }
          />
          <Route
            path="reports/manual-review"
            element={
              <Suspense fallback={<PageLoadingFallback />}>
                <ReportsPage mode="manual-review" />
              </Suspense>
            }
          />
          <Route
            path="reports/:reportId"
            element={
              <Suspense fallback={<PageLoadingFallback />}>
                <ReportDetailPage />
              </Suspense>
            }
          />
          <Route
            path="statistics"
            element={
              <Suspense fallback={<PageLoadingFallback />}>
                <StatisticsPage />
              </Suspense>
            }
          />
          <Route
            path="users"
            element={
              <Suspense fallback={<PageLoadingFallback />}>
                <UsersManagementPage />
              </Suspense>
            }
          />
          <Route
            path="account"
            element={
              <Suspense fallback={<PageLoadingFallback />}>
                <AccountPage />
              </Suspense>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
    </Routes>
  );
}

function PrivateRoute({ isAuthenticated }: PrivateRouteProps) {
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
