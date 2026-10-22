import {
  bootstrapMobileSession,
  changeMobilePassword,
  fetchCurrentMobileUser,
  getCachedAuthUser,
  getLoginErrorMessage,
  login,
  logout,
  type AuthSession,
  type LoginPayload,
  type MobileSessionBootstrapResult,
} from '../../../../packages/mobile-shared/src/authService';
import { getFieldEngineerUiLabel } from '../../../../packages/shared-constants/src/engineerLabels';

const ENGINEER_ROLES = new Set(['field_engineer', 'engineer', 'engineer_staff']);

const isEngineerRole = (role?: string | null): boolean =>
  ENGINEER_ROLES.has(String(role || '').trim().toLowerCase());

export { changeMobilePassword, getCachedAuthUser, getLoginErrorMessage };

export async function loginEngineer(payload: LoginPayload): Promise<AuthSession> {
  const session = await login(payload);

  if (!isEngineerRole(session.user?.role)) {
    await logout();
    throw new Error(getFieldEngineerUiLabel('engineerRoleMismatch'));
  }

  return session;
}

export async function bootstrapEngineerSession(): Promise<MobileSessionBootstrapResult> {
  const result = await bootstrapMobileSession();

  if (result.status !== 'authenticated') {
    return result;
  }

  try {
    const user = await fetchCurrentMobileUser();
    if (isEngineerRole(user.role)) {
      return result;
    }

    await logout();
    return {
      status: 'retry_required',
      message: getFieldEngineerUiLabel('engineerRoleNoAccess'),
    };
  } catch {
    await logout();
    return {
      status: 'retry_required',
      message: getFieldEngineerUiLabel('engineerRoleVerifyFailed'),
    };
  }
}

export async function fetchCurrentEngineerUser() {
  const user = await fetchCurrentMobileUser();

  if (!isEngineerRole(user.role)) {
    throw new Error(getFieldEngineerUiLabel('engineerRoleMismatch'));
  }

  return user;
}

export async function logoutEngineer(): Promise<void> {
  await logout();
}
