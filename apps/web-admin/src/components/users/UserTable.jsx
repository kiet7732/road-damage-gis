import {
  FiUsers,
  FiAlertCircle,
  FiRefreshCw,
  FiEdit2,
  FiKey,
  FiLock,
  FiUnlock,
  FiUser,
} from 'react-icons/fi';
import { UI_COLORS } from '../../constants/statusColors';
import { ROLE_CONFIGS } from '../../constants/userConstants';
import { getUserErrorMessage } from '../../services/userAdminService';

export default function UserTable({
  isLoading,
  isError,
  error,
  userItems,
  total,
  page,
  setPage,
  currentUser,
  onEditUser,
  onResetPassword,
  onToggleStatus,
  onRetry,
}) {
  return (
    <div style={styles.tableCard}>
      {isLoading ? (
        <div style={styles.loadingState}>
          <FiRefreshCw size={24} className="spin-icon" color={UI_COLORS.primary} />
          <span>Đang tải danh sách người dùng...</span>
        </div>
      ) : isError ? (
        <div style={styles.errorState}>
          <FiAlertCircle size={24} color="#DC2626" />
          <span>{getUserErrorMessage(error)}</span>
          <button
            type="button"
            onClick={onRetry}
            style={styles.retryBtn}
          >
            Thử lại
          </button>
        </div>
      ) : userItems.length === 0 ? (
        <div style={styles.emptyState}>
          <FiUsers size={40} color={UI_COLORS.textMuted} />
          <div style={styles.emptyTitle}>Không tìm thấy tài khoản nào</div>
          <div style={styles.emptySubtitle}>
            Thử điều chỉnh bộ lọc hoặc tạo tài khoản Kỹ sư hiện trường mới.
          </div>
        </div>
      ) : (
        <div style={styles.tableResponsive}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.th}>Người dùng</th>
                <th style={styles.th}>Vai trò</th>
                <th style={styles.th}>Địa bàn quản lý</th>
                <th style={styles.th}>Số điện thoại</th>
                <th style={styles.th}>Trạng thái</th>
                <th style={styles.th}>Ngày tạo</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {userItems.map((u) => {
                const roleConfig = ROLE_CONFIGS[u.role] || {
                  label: u.role,
                  color: '#4B5563',
                  bg: '#F3F4F6',
                  border: '#E5E7EB',
                  icon: FiUser,
                };
                const RoleIcon = roleConfig.icon;
                const isActive = u.isActive !== false;
                const initials = (u.fullName || u.email)
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <tr key={u.id} style={styles.tableRow}>
                    {/* Name & Email */}
                    <td style={styles.td}>
                      <div style={styles.userCell}>
                        <div style={styles.avatar(roleConfig.color, roleConfig.bg)}>
                          {initials}
                        </div>
                        <div>
                          <div style={styles.userName}>{u.fullName || 'Chưa cập nhật'}</div>
                          <div style={styles.userEmail}>{u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td style={styles.td}>
                      <div
                        style={styles.roleBadge(
                          roleConfig.color,
                          roleConfig.bg,
                          roleConfig.border
                        )}
                      >
                        <RoleIcon size={12} />
                        <span>{roleConfig.label}</span>
                      </div>
                    </td>

                    {/* District */}
                    <td style={styles.td}>
                      {u.managedDistrict ? (
                        <span style={styles.districtBadge}>{u.managedDistrict}</span>
                      ) : (
                        <span style={styles.textMuted}>Toàn thành phố</span>
                      )}
                    </td>

                    {/* Phone */}
                    <td style={styles.td}>
                      {u.phone ? <span>{u.phone}</span> : <span style={styles.textMuted}>—</span>}
                    </td>

                    {/* Status */}
                    <td style={styles.td}>
                      <div style={styles.statusPill(isActive)}>
                        <span style={styles.statusDot(isActive)} />
                        <span>{isActive ? 'Hoạt động' : 'Tạm khóa'}</span>
                      </div>
                    </td>

                    {/* Created At */}
                    <td style={styles.td}>
                      <span style={styles.dateText}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '—'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <div style={styles.actionGroup}>
                        <button
                          type="button"
                          onClick={() => onEditUser(u)}
                          style={styles.iconActionBtn}
                          title="Chỉnh sửa thông tin"
                        >
                          <FiEdit2 size={15} color="#3B82F6" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onResetPassword(u)}
                          style={styles.iconActionBtn}
                          title="Đặt lại mật khẩu"
                        >
                          <FiKey size={15} color="#F59E0B" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onToggleStatus(u)}
                          disabled={currentUser?.id === u.id}
                          style={{
                            ...styles.iconActionBtn,
                            opacity: currentUser?.id === u.id ? 0.4 : 1,
                          }}
                          title={
                            currentUser?.id === u.id
                              ? 'Không thể khóa tài khoản chính mình'
                              : isActive
                              ? 'Khóa tài khoản'
                              : 'Mở khóa tài khoản'
                          }
                        >
                          {isActive ? (
                            <FiLock size={15} color="#EF4444" />
                          ) : (
                            <FiUnlock size={15} color="#10B981" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination bar */}
      {total > 15 && (
        <div style={styles.paginationBar}>
          <span style={styles.paginationText}>
            Hiển thị {userItems.length} trên tổng số {total} tài khoản
          </span>
          <div style={styles.paginationControls}>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={styles.pageBtn(page <= 1)}
            >
              Trang trước
            </button>
            <span style={styles.pageIndicator}>Trang {page}</span>
            <button
              type="button"
              disabled={page * 15 >= total}
              onClick={() => setPage((p) => p + 1)}
              style={styles.pageBtn(page * 15 >= total)}
            >
              Trang sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  tableCard: {
    background: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid #E2E8F0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  tableResponsive: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  tableHeaderRow: {
    background: '#F8FAFC',
    borderBottom: '1px solid #E2E8F0',
  },
  th: {
    padding: '12px 16px',
    fontSize: 12,
    fontWeight: 700,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    borderBottom: '1px solid #F1F5F9',
    transition: 'background 0.15s',
  },
  td: {
    padding: '14px 16px',
    fontSize: 14,
    color: '#1E293B',
    verticalAlign: 'middle',
  },
  userCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  avatar: (color, bg) => ({
    width: 36,
    height: 36,
    borderRadius: 18,
    background: bg,
    color: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 13,
    border: `1px solid ${color}33`,
    flexShrink: 0,
  }),
  userName: {
    fontWeight: 700,
    color: '#0F172A',
    fontSize: 14,
  },
  userEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  roleBadge: (color, bg, border) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    color: color,
    background: bg,
    border: `1px solid ${border}`,
    whiteSpace: 'nowrap',
  }),
  districtBadge: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    background: '#F1F5F9',
    color: '#334155',
  },
  textMuted: {
    color: '#94A3B8',
    fontSize: 13,
  },
  statusPill: (active) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 700,
    background: active ? '#ECFDF5' : '#FEF2F2',
    color: active ? '#059669' : '#DC2626',
    border: `1px solid ${active ? '#A7F3D0' : '#FECACA'}`,
  }),
  statusDot: (active) => ({
    width: 6,
    height: 6,
    borderRadius: 3,
    background: active ? '#10B981' : '#EF4444',
  }),
  dateText: {
    fontSize: 13,
    color: '#64748B',
  },
  actionGroup: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  },
  iconActionBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 6,
    background: '#F8FAFC',
    border: '1px solid #E2E8F0',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  loadingState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 48,
    color: '#64748B',
    fontSize: 14,
  },
  errorState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    padding: 48,
    color: '#DC2626',
    fontSize: 14,
  },
  retryBtn: {
    padding: '6px 14px',
    borderRadius: 6,
    background: UI_COLORS.primary,
    color: '#FFFFFF',
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: 48,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1E293B',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  paginationBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderTop: '1px solid #E2E8F0',
    background: '#F8FAFC',
  },
  paginationText: {
    fontSize: 13,
    color: '#64748B',
  },
  paginationControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  pageBtn: (disabled) => ({
    padding: '6px 12px',
    borderRadius: 6,
    background: disabled ? '#F1F5F9' : '#FFFFFF',
    border: '1px solid #CBD5E1',
    color: disabled ? '#94A3B8' : '#1E293B',
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
  }),
  pageIndicator: {
    fontSize: 13,
    fontWeight: 600,
    color: '#334155',
  },
};
