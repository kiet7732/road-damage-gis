import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdminUser,
  fetchCurrentAdminUser,
  getCachedAdminUser,
  logoutAdmin,
} from '../services/authService';

export type UseAuthResult = {
  user: AdminUser | null;
  loading: boolean;
  error: string;
  managedDistrict: string | null;
  managedWard: string | null;
  isDistrictOfficer: boolean;
  isSuperAdmin: boolean;
  canAccessDistrict: (targetDistrict?: string | null) => boolean;
  reload: () => Promise<AdminUser | null>;
  logout: () => Promise<void>;
};

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<AdminUser | null>(() => getCachedAdminUser());
  const [loading, setLoading] = useState<boolean>(!user);
  const [error, setError] = useState<string>('');

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const currentUser = await fetchCurrentAdminUser();
      setUser(currentUser);
      return currentUser;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      void loadUser();
    }
  }, [loadUser, user]);

  const handleLogout = useCallback(async () => {
    await logoutAdmin();
    setUser(null);
  }, []);

  const managedDistrict = useMemo(() => {
    const raw = user?.managedDistrict || user?.managed_district;
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
  }, [user]);

  const managedWard = useMemo(() => {
    const raw = user?.managedWard || user?.managed_ward;
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
  }, [user]);

  const role = (user?.role || '').trim().toLowerCase();

  const isSuperAdmin = useMemo(() => {
    if (role === 'super_admin') {
      return true;
    }
    // Tài khoản admin hệ thống không bị gán địa bàn quản lý
    if (role === 'admin' && !managedDistrict) {
      return true;
    }
    return false;
  }, [role, managedDistrict]);

  const isDistrictOfficer = useMemo(() => {
    return Boolean(managedDistrict) || role === 'district_officer';
  }, [managedDistrict, role]);

  const canAccessDistrict = useCallback(
    (targetDistrict?: string | null): boolean => {
      if (isSuperAdmin) {
        return true;
      }
      if (!managedDistrict) {
        return true;
      }
      if (!targetDistrict || !targetDistrict.trim()) {
        return false;
      }
      return targetDistrict.trim().toLowerCase() === managedDistrict.toLowerCase();
    },
    [isSuperAdmin, managedDistrict],
  );

  return {
    user,
    loading,
    error,
    managedDistrict,
    managedWard,
    isDistrictOfficer,
    isSuperAdmin,
    canAccessDistrict,
    reload: loadUser,
    logout: handleLogout,
  };
}

export default useAuth;
