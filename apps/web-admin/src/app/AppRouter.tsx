import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import AppLayout from './AppLayout';
import LoginPage from '../pages/Auth/LoginPage';
import AccountPage from '../pages/Account/AccountPage';
import DashboardPage from '../pages/Dashboard/DashboardPage';
import DamageMapPage from '../pages/MapManagement/DamageMapPage';
import ReportDetailPage from '../pages/Reports/ReportDetailPage';
import ReportsPage from '../pages/Reports/ReportsPage';
import StatisticsPage from '../pages/Statistics/StatisticsPage';
import UsersManagementPage from '../pages/Users/UsersManagementPage';

type AppRouterProps = {
  isAuthenticated: boolean;
  onLogin: () => void;
  onLogout: () => void;
};

type PrivateRouteProps = {
  isAuthenticated: boolean;
};

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
          <Route index element={<DashboardPage />} />
          <Route path="map" element={<DamageMapPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="reports/manual-review" element={<ReportsPage mode="manual-review" />} />
          <Route path="reports/:reportId" element={<ReportDetailPage />} />
          <Route path="statistics" element={<StatisticsPage />} />
          <Route path="users" element={<UsersManagementPage />} />
          <Route path="account" element={<AccountPage />} />
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
