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
  managedProvince: string | null;
  managedDistrict: string | null;
  managedWard: string | null;
  isProvinceOfficer: boolean;
  isDistrictOfficer: boolean;
  isSuperAdmin: boolean;
  isSystemAdmin: boolean;
  canAccessProvince: (targetProvince?: string | null) => boolean;
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

  const managedProvince = useMemo(() => {
    const raw = user?.managedProvince || user?.managed_province;
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
  }, [user]);

  const managedDistrict = useMemo(() => {
    const raw = user?.managedDistrict || user?.managed_district;
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
  }, [user]);

  const managedWard = useMemo(() => {
    const raw = user?.managedWard || user?.managed_ward;
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
  }, [user]);

  const role = (user?.role || '').trim().toLowerCase();

  const isProvinceOfficer = useMemo(() => {
    return (
      role === 'province_officer' ||
      role === 'provincial_admin' ||
      role === 'provincial_manager' ||
      Boolean(managedProvince && !managedDistrict)
    );
  }, [role, managedProvince, managedDistrict]);

  const isDistrictOfficer = useMemo(() => {
    return Boolean(managedDistrict) || role === 'district_officer';
  }, [managedDistrict, role]);

  const isSuperAdmin = useMemo(() => {
    if (role === 'super_admin' || role === 'system_admin') {
      return !managedProvince && !managedDistrict;
    }
    // Tài khoản Quản trị viên hệ thống không bị gán vùng tỉnh hay địa bàn quận/huyện
    if (role === 'admin' && !managedProvince && !managedDistrict) {
      return true;
    }
    return false;
  }, [role, managedProvince, managedDistrict]);

  const isSystemAdmin = isSuperAdmin;

  const canAccessProvince = useCallback(
    (targetProvince?: string | null): boolean => {
      if (isSuperAdmin) {
        return true;
      }
      if (!managedProvince) {
        return true;
      }
      if (!targetProvince || !targetProvince.trim()) {
        return false;
      }
      return targetProvince.trim().toLowerCase() === managedProvince.toLowerCase();
    },
    [isSuperAdmin, managedProvince],
  );

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
    managedProvince,
    managedDistrict,
    managedWard,
    isProvinceOfficer,
    isDistrictOfficer,
    isSuperAdmin,
    isSystemAdmin,
    canAccessProvince,
    canAccessDistrict,
    reload: loadUser,
    logout: handleLogout,
  };
}

export default useAuth;
