import {
  ApiClientError,
  api,
} from '../../../../packages/api-client/src';
import {
  WEB_ADMIN_AUTH_CONTEXT_HEADER,
  WEB_ADMIN_AUTH_CONTEXT_VALUE,
} from './configureApiClient';

export type AdminRole =
  | 'admin'
  | 'manager'
  | 'staff'
  | 'officer'
  | 'can_bo'
  | 'super_admin'
  | 'district_officer';

export type LoginPayload = {
  email: string;
  password: string;
};

export type AdminUser = {
  id: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: string;
  managedDistrict?: string | null;
  managedWard?: string | null;
  managed_district?: string | null;
  managed_ward?: string | null;
};

export type LoginResponse = {
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  access_token?: string;
  refresh_token?: string;
  user?: AdminUser;
};

export type AdminSession = {
  user: AdminUser;
};
export type AdminSessionBootstrapResult =
  | { status: 'authenticated'; user: AdminUser }
  | { status: 'unauthenticated' }
  | { status: 'retry_required'; message: string };

const ALLOWED_ADMIN_ROLES = new Set<string>([
  'admin',
  'manager',
  'staff',
  'officer',
  'can_bo',
  'super_admin',
  'district_officer',
]);

export const isAllowedAdminRole = (role?: string): boolean => {
  if (!role) {
    return false;
  }

  return ALLOWED_ADMIN_ROLES.has(role.trim().toLowerCase());
};

export const getLoginErrorMessage = (error: unknown): string => {
  if (error instanceof ApiClientError) {
    if (error.code === 'NETWORK_ERROR') {
      return 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng rồi thử lại.';
    }

    if (error.code === 'TIMEOUT_ERROR') {
      return 'Máy chủ phản hồi chậm. Vui lòng thử lại sau ít phút.';
    }

    if (error.status === 401) {
      return 'Tài khoản hoặc mật khẩu không đúng.';
    }

    if (error.status === 403) {
      return (
        error.message ||
        'Tài khoản này là tài khoản Ứng dụng Di động (Người dân/Kỹ sư), không được phép đăng nhập vào Web Quản lý. Vui lòng sử dụng Ứng dụng Di động.'
      );
    }

    if (error.status && error.status >= 500) {
      return 'Máy chủ đang tạm gián đoạn. Vui lòng thử lại sau.';
    }

    return error.message || 'Không thể đăng nhập vào hệ thống quản trị lúc này.';
  }

  return 'Không thể đăng nhập vào hệ thống quản trị lúc này.';
};

export const loginAdmin = async (payload: LoginPayload): Promise<AdminSession> => {
  const response = await api.post<LoginResponse, LoginPayload>(
    '/auth/login',
    {
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
    },
    {
      skipAuth: true,
      suppressGlobalError: true,
      withCredentials: true,
      headers: {
        [WEB_ADMIN_AUTH_CONTEXT_HEADER]: WEB_ADMIN_AUTH_CONTEXT_VALUE,
      },
    },
  );

  if (!response.user || !isAllowedAdminRole(response.user.role)) {
    throw new ApiClientError({
      message:
        'Tài khoản này là tài khoản Ứng dụng Di động (Người dân/Kỹ sư), không được phép đăng nhập vào Web Quản lý. Vui lòng sử dụng Ứng dụng Di động.',
      status: 403,
      code: 'FORBIDDEN',
      details: response.user,
    });
  }

  cachedAdminUser = response.user;
  return {
    user: response.user,
  };
};

export const fetchCurrentAdminUser = async (): Promise<AdminUser> => {
  const user = await api.get<AdminUser>('/auth/me', {
    suppressGlobalError: true,
    withCredentials: true,
    headers: {
      [WEB_ADMIN_AUTH_CONTEXT_HEADER]: WEB_ADMIN_AUTH_CONTEXT_VALUE,
    },
  });

  if (!isAllowedAdminRole(user.role)) {
    throw new ApiClientError({
      message:
        'Tài khoản này là tài khoản Ứng dụng Di động (Người dân/Kỹ sư), không được phép đăng nhập vào Web Quản lý. Vui lòng sử dụng Ứng dụng Di động.',
      status: 403,
      code: 'FORBIDDEN',
      details: user,
    });
  }
  cachedAdminUser = user;
  return user;
};

export const logoutAdmin = async (): Promise<void> => {
  cachedAdminUser = null;
  try {
    await api.post(
      '/auth/logout',
      {},
      {
        suppressGlobalError: true,
        withCredentials: true,
        headers: {
          [WEB_ADMIN_AUTH_CONTEXT_HEADER]: WEB_ADMIN_AUTH_CONTEXT_VALUE,
        },
      },
    );
  } catch {
    // Không chặn logout phía client.
  }
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export const changeAdminPassword = async (payload: ChangePasswordPayload): Promise<{ message: string }> => {
  return api.post(
    '/auth/change-password',
    {
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword,
    },
    {
      suppressGlobalError: true,
      withCredentials: true,
      headers: {
        [WEB_ADMIN_AUTH_CONTEXT_HEADER]: WEB_ADMIN_AUTH_CONTEXT_VALUE,
      },
    },
  );
};

export const bootstrapAdminSession =
  async (): Promise<AdminSessionBootstrapResult> => {
  try {
    const user = await fetchCurrentAdminUser();
    return { status: 'authenticated', user };
  } catch (error) {
    if (error instanceof ApiClientError) {
      if (error.code === 'NETWORK_ERROR') {
        return {
          status: 'retry_required',
          message:
            'Không thể kết nối tới máy chủ để kiểm tra phiên đăng nhập. Vui lòng kiểm tra mạng rồi thử lại.',
        };
      }

      if (error.code === 'TIMEOUT_ERROR') {
        return {
          status: 'retry_required',
          message:
            'Máy chủ phản hồi chậm nên chưa thể kiểm tra phiên đăng nhập. Vui lòng thử lại sau ít phút.',
        };
      }
    }

    return { status: 'unauthenticated' };
  }
};

let cachedAdminUser: AdminUser | null = null;

export const setCachedAdminUser = (user: AdminUser | null): void => {
  cachedAdminUser = user;
};

export const getCachedAdminUser = (): AdminUser | null => cachedAdminUser;
