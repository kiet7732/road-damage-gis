/**
 * Role-Based Routing & Role Resolution Utilities
 * Đồng bộ phân quyền và điều hướng 3 vai trò: Kỹ sư (Engineer), Người dân (Reporter), Cán bộ (Admin).
 */

export type AppRoleType = 'engineer' | 'reporter' | 'admin';

export const ENGINEER_ROLES = new Set(['field_engineer', 'engineer', 'engineer_staff']);
export const ADMIN_ROLES = new Set(['admin', 'manager', 'staff', 'officer', 'can_bo']);
export const REPORTER_ROLES = new Set(['reporter', 'citizen', 'user']);

/**
 * Chuẩn hóa chuỗi vai trò
 */
export const normalizeRole = (role?: string | null): string =>
  String(role || '').trim().toLowerCase();

/**
 * Kiểm tra vai trò thuộc nhóm Kỹ sư
 */
export const isEngineerRole = (role?: string | null): boolean =>
  ENGINEER_ROLES.has(normalizeRole(role));

/**
 * Kiểm tra vai trò thuộc nhóm Quản trị / Cán bộ
 */
export const isAdminRole = (role?: string | null): boolean =>
  ADMIN_ROLES.has(normalizeRole(role));

/**
 * Kiểm tra vai trò thuộc nhóm Người phản ánh
 */
export const isReporterRole = (role?: string | null): boolean =>
  REPORTER_ROLES.has(normalizeRole(role));

/**
 * Phân giải vai trò sang 1 trong 3 nhóm chính: 'engineer' | 'admin' | 'reporter'
 */
export const resolveAppRole = (role?: string | null): AppRoleType => {
  const normalized = normalizeRole(role);
  if (ENGINEER_ROLES.has(normalized)) {
    return 'engineer';
  }
  if (ADMIN_ROLES.has(normalized)) {
    return 'admin';
  }
  return 'reporter';
};

/**
 * Tên hiển thị tiếng Việt thân thiện của từng vai trò
 */
export const getRoleDisplayName = (role?: string | null): string => {
  const appRole = resolveAppRole(role);
  switch (appRole) {
    case 'engineer':
      return 'Kỹ sư hiện trường';
    case 'admin':
      return 'Cán bộ quản lý';
    case 'reporter':
    default:
      return 'Người dân phản ánh';
  }
};
