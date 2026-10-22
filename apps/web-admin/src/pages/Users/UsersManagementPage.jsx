import { useState } from 'react';
import { FiUserPlus } from 'react-icons/fi';
import PageHeader from '../../components/PageHeader';
import { useToast } from '../../components/ToastProvider';
import { UI_COLORS } from '../../constants/statusColors';
import useAsyncData from '../../hooks/useAsyncData';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  toggleUserStatus,
  resetUserPassword,
  getUserErrorMessage,
} from '../../services/userAdminService';
import UserStatsCards from '../../components/users/UserStatsCards';
import UserFilterBar from '../../components/users/UserFilterBar';
import UserTable from '../../components/users/UserTable';
import UserCreateModal from '../../components/users/modals/UserCreateModal';
import UserEditModal from '../../components/users/modals/UserEditModal';
import UserResetPasswordModal from '../../components/users/modals/UserResetPasswordModal';

export default function UsersManagementPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  // Filters state
  const [roleFilter, setRoleFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPwdModalOpen, setIsResetPwdModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    role: 'field_engineer',
    managedDistrict: '',
    managedWard: '',
  });
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    role: 'field_engineer',
    managedDistrict: '',
    managedWard: '',
  });
  const [resetPwdForm, setResetPwdForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  // Action status state
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // Fetch users data
  const {
    data,
    isLoading,
    isError,
    error,
  } = useAsyncData(async () => {
    return await fetchAdminUsers({
      page,
      pageSize: 15,
      role: roleFilter,
      district: districtFilter,
      status: statusFilter,
      search: appliedSearch,
    });
  }, [page, roleFilter, districtFilter, statusFilter, appliedSearch, reloadKey]);

  const userItems = data?.items || [];
  const stats = data?.stats || {};
  const total = data?.total || 0;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(searchKeyword.trim());
  };

  const handleClearSearch = () => {
    setSearchKeyword('');
    setAppliedSearch('');
    setPage(1);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.fullName.trim() || !createForm.email.trim() || !createForm.password) {
      setActionError('Vui lòng điền đầy đủ họ tên, email và mật khẩu.');
      return;
    }
    if (createForm.password.length < 6) {
      setActionError('Mật khẩu khởi tạo phải có ít nhất 6 ký tự.');
      return;
    }

    setActionLoading(true);
    setActionError('');
    try {
      await createAdminUser(createForm);
      showToast(`Đã tạo thành công tài khoản ${createForm.role === 'field_engineer' ? 'Kỹ sư hiện trường' : 'người dùng'}!`);
      setIsCreateModalOpen(false);
      setCreateForm({
        fullName: '',
        email: '',
        password: '',
        phone: '',
        role: 'field_engineer',
        managedDistrict: '',
        managedWard: '',
      });
      setReloadKey((prev) => prev + 1);
    } catch (err) {
      setActionError(getUserErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    setActionLoading(true);
    setActionError('');
    try {
      await updateAdminUser(selectedUser.id, editForm);
      showToast('Đã cập nhật thông tin người dùng thành công!');
      setIsEditModalOpen(false);
      setSelectedUser(null);
      setReloadKey((prev) => prev + 1);
    } catch (err) {
      setActionError(getUserErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const isCurrentlyActive = user.isActive !== false;
    const actionText = isCurrentlyActive ? 'khóa' : 'mở khóa';
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản "${user.fullName || user.email}"?`)) {
      return;
    }

    try {
      await toggleUserStatus(user.id, !isCurrentlyActive);
      showToast(`Đã ${actionText} tài khoản thành công!`);
      setReloadKey((prev) => prev + 1);
    } catch (err) {
      alert(getUserErrorMessage(err));
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!resetPwdForm.newPassword || resetPwdForm.newPassword.length < 6) {
      setActionError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (resetPwdForm.newPassword !== resetPwdForm.confirmPassword) {
      setActionError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setActionLoading(true);
    setActionError('');
    try {
      await resetUserPassword(selectedUser.id, resetPwdForm.newPassword);
      showToast(`Đã đặt lại mật khẩu cho tài khoản ${selectedUser.email} thành công!`);
      setIsResetPwdModalOpen(false);
      setSelectedUser(null);
      setResetPwdForm({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      setActionError(getUserErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditForm({
      fullName: user.fullName || user.full_name || '',
      phone: user.phone || '',
      role: user.role || 'field_engineer',
      managedDistrict: user.managedDistrict || user.managed_district || '',
      managedWard: user.managedWard || user.managed_ward || '',
    });
    setActionError('');
    setIsEditModalOpen(true);
  };

  const openResetPwdModal = (user) => {
    setSelectedUser(user);
    setResetPwdForm({ newPassword: '', confirmPassword: '' });
    setActionError('');
    setIsResetPwdModalOpen(true);
  };

  const openCreateModal = () => {
    setCreateForm({
      fullName: '',
      email: '',
      password: '',
      phone: '',
      role: 'field_engineer',
      managedDistrict: '',
      managedWard: '',
    });
    setActionError('');
    setIsCreateModalOpen(true);
  };

  return (
    <div style={styles.container}>
      {/* Page Header */}
      <PageHeader
        title="Quản lý tài khoản & Phân quyền"
        subtitle="Quản lý người dùng, tạo tài khoản Kỹ sư hiện trường và phân bổ địa bàn phụ trách."
        action={
          <button
            type="button"
            id="btn-create-engineer"
            onClick={openCreateModal}
            style={styles.primaryBtn}
          >
            <FiUserPlus size={18} />
            <span>+ Tạo tài khoản Kỹ sư</span>
          </button>
        }
      />

      {/* Overview Stat Cards */}
      <UserStatsCards stats={stats} />

      {/* Filter & Search Bar */}
      <UserFilterBar
        searchKeyword={searchKeyword}
        setSearchKeyword={setSearchKeyword}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
        districtFilter={districtFilter}
        setDistrictFilter={setDistrictFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onSearchSubmit={handleSearchSubmit}
        onClearSearch={handleClearSearch}
        onRefresh={() => setReloadKey((prev) => prev + 1)}
      />

      {/* Users Table */}
      <UserTable
        isLoading={isLoading}
        isError={isError}
        error={error}
        userItems={userItems}
        total={total}
        page={page}
        setPage={setPage}
        currentUser={currentUser}
        onEditUser={openEditModal}
        onResetPassword={openResetPwdModal}
        onToggleStatus={handleToggleStatus}
        onRetry={() => setReloadKey((prev) => prev + 1)}
      />

      {/* Modal: Create User / Engineer */}
      <UserCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        createForm={createForm}
        setCreateForm={setCreateForm}
        onSubmit={handleCreateSubmit}
        actionLoading={actionLoading}
        actionError={actionError}
      />

      {/* Modal: Edit User */}
      <UserEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        selectedUser={selectedUser}
        editForm={editForm}
        setEditForm={setEditForm}
        onSubmit={handleEditSubmit}
        actionLoading={actionLoading}
        actionError={actionError}
      />

      {/* Modal: Reset Password */}
      <UserResetPasswordModal
        isOpen={isResetPwdModalOpen}
        onClose={() => setIsResetPwdModalOpen(false)}
        selectedUser={selectedUser}
        resetPwdForm={resetPwdForm}
        setResetPwdForm={setResetPwdForm}
        onSubmit={handleResetPasswordSubmit}
        actionLoading={actionLoading}
        actionError={actionError}
      />
    </div>
  );
}

const styles = {
  container: {
    padding: '24px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    background: '#F8FAFC',
    minHeight: '100vh',
    position: 'relative',
  },
  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: UI_COLORS.primary,
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 10,
    padding: '10px 18px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(15, 118, 110, 0.25)',
    transition: 'all 0.2s',
  },
};
