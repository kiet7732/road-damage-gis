import {
  FiUserPlus,
  FiTool,
  FiAlertCircle,
  FiX,
  FiUser,
  FiShield,
  FiAward,
  FiMapPin,
} from 'react-icons/fi';
import { UI_COLORS } from '../../../constants/statusColors';
import { DISTRICT_OPTIONS, PROVINCE_OPTIONS } from '../../../constants/userConstants';

const ROLE_MODAL_CONFIG = {
  field_engineer: {
    title: 'Tạo tài khoản Kỹ sư hiện trường',
    subtitle: 'Cấp tài khoản mới để đăng nhập ứng dụng Mobile Engineer tác nghiệp',
    bannerIcon: FiTool,
    bannerColor: '#1D4ED8',
    bannerBg: '#EFF6FF',
    bannerBorder: '#BFDBFE',
    bannerText: (
      <span>
        <strong>Lưu ý:</strong> Tài khoản Kỹ sư hiện trường do Ban Quản trị cấp để tác nghiệp
        trực tiếp trên ứng dụng di động <em>Road Damage GIS</em>. Kỹ sư không thể tự đăng ký tài
        khoản bên ngoài.
      </span>
    ),
    emailPlaceholder: 'engineer@roadgis.local',
    namePlaceholder: 'Ví dụ: Nguyễn Văn Hoàng',
    submitText: 'Tạo tài khoản Kỹ sư',
    hasProvince: false,
    hasDistrict: true,
  },
  reporter: {
    title: 'Tạo tài khoản Người phản ánh (Citizen)',
    subtitle: 'Cấp tài khoản người dân để gửi phản ánh sự cố hư hỏng đường bộ qua Mobile App',
    bannerIcon: FiUser,
    bannerColor: '#047857',
    bannerBg: '#ECFDF5',
    bannerBorder: '#A7F3D0',
    bannerText: (
      <span>
        <strong>Lưu ý:</strong> Tài khoản Người phản ánh dành cho người dân báo cáo sự cố, hư hỏng
        mặt đường trên toàn hệ thống. Người dân không bị giới hạn theo vùng hay địa bàn phụ trách.
      </span>
    ),
    emailPlaceholder: 'nguoidan@gmail.com',
    namePlaceholder: 'Ví dụ: Nguyễn Văn An',
    submitText: 'Tạo tài khoản Người dân',
    hasProvince: false,
    hasDistrict: false,
  },
  district_officer: {
    title: 'Tạo tài khoản Cán bộ địa bàn',
    subtitle: 'Cấp tài khoản mới để truy cập và xử lý tác nghiệp Web Admin theo Quận/Huyện/TP',
    bannerIcon: FiShield,
    bannerColor: '#7C3AED',
    bannerBg: '#F5F3FF',
    bannerBorder: '#DDD6FE',
    bannerText: (
      <span>
        <strong>Lưu ý:</strong> Tài khoản Cán bộ địa bàn có quyền tiếp nhận, xử lý và phân công
        báo cáo sự cố trong phạm vi địa bàn cấp huyện/thành phố được phân công phụ trách.
      </span>
    ),
    emailPlaceholder: 'canbo@thudaumot.gov.vn',
    namePlaceholder: 'Ví dụ: Trần Văn Bình',
    submitText: 'Tạo tài khoản Cán bộ',
    hasProvince: false,
    hasDistrict: true,
  },
  province_officer: {
    title: 'Tạo tài khoản Quản trị viên cấp tỉnh',
    subtitle: 'Cấp tài khoản quản lý toàn diện trong vùng Tỉnh/Thành phố được phân công (Chỉ dùng trên Web)',
    bannerIcon: FiMapPin,
    bannerColor: '#0284C7',
    bannerBg: '#E0F2FE',
    bannerBorder: '#BAE6FD',
    bannerText: (
      <span>
        <strong>Lưu ý:</strong> Quản trị viên cấp tỉnh có đầy đủ chức năng quản trị (xem/lọc báo cáo,
        duyệt khảo sát, điều phối kỹ sư, bản đồ khoanh vùng ranh giới GIS) nhưng <strong>chỉ được
        thao tác trong vùng Tỉnh/TP được cấp</strong> và chỉ sử dụng trên Web Admin.
      </span>
    ),
    emailPlaceholder: 'province.binhduong@roadgis.local',
    namePlaceholder: 'Ví dụ: Phạm Quốc Tuấn (Sở Xây dựng / GTVT)',
    submitText: 'Tạo Quản trị viên cấp tỉnh',
    hasProvince: true,
    hasDistrict: false,
  },
  admin: {
    title: 'Tạo tài khoản Quản trị viên hệ thống',
    subtitle: 'Cấp tài khoản quản trị hệ thống cao nhất với toàn quyền không giới hạn vùng',
    bannerIcon: FiAward,
    bannerColor: '#B45309',
    bannerBg: '#FFFBEB',
    bannerBorder: '#FDE68A',
    bannerText: (
      <span>
        <strong>Lưu ý:</strong> Quản trị viên hệ thống có toàn quyền kiểm soát hệ thống, cấp tài khoản
        cho Quản trị viên cấp tỉnh và thao tác dữ liệu trên toàn quốc mà không bị giới hạn vùng.
      </span>
    ),
    emailPlaceholder: 'sysadmin@roadgis.local',
    namePlaceholder: 'Ví dụ: Lê Thị Mai',
    submitText: 'Tạo Quản trị viên hệ thống',
    hasProvince: false,
    hasDistrict: false,
  },
};

export default function UserCreateModal({
  isOpen,
  onClose,
  createForm,
  setCreateForm,
  onSubmit,
  actionLoading,
  actionError,
}) {
  if (!isOpen) return null;

  const currentRole = createForm.role || 'field_engineer';
  const cfg = ROLE_MODAL_CONFIG[currentRole] || ROLE_MODAL_CONFIG.field_engineer;
  const BannerIcon = cfg.bannerIcon;
  const isNoScopeRole = currentRole === 'reporter' || currentRole === 'admin' || currentRole === 'system_admin';
  const isProvinceRole = currentRole === 'province_officer';

  const handleRoleChange = (e) => {
    const newRole = e.target.value;
    setCreateForm({
      ...createForm,
      role: newRole,
      ...(newRole === 'reporter' || newRole === 'admin' || newRole === 'system_admin'
        ? { managedProvince: '', managedDistrict: '', managedWard: '' }
        : newRole === 'province_officer'
        ? { managedProvince: createForm.managedProvince || 'Bình Dương', managedDistrict: '', managedWard: '' }
        : {}),
    });
  };

  return (
    <div style={styles.modalOverlay} onClick={() => !actionLoading && onClose()}>
      <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div style={styles.modalTitleRow}>
            <div style={styles.modalIconCircle}>
              <FiUserPlus size={20} color={UI_COLORS.primary} />
            </div>
            <div>
              <h3 style={styles.modalTitle}>{cfg.title}</h3>
              <p style={styles.modalSubtitle}>{cfg.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={styles.modalCloseBtn}
            disabled={actionLoading}
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Dynamic Role Guidance Banner */}
        <div
          style={{
            ...styles.guidanceBanner,
            background: cfg.bannerBg,
            borderColor: cfg.bannerBorder,
          }}
        >
          <BannerIcon size={18} color={cfg.bannerColor} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ ...styles.guidanceText, color: cfg.bannerColor }}>
            {cfg.bannerText}
          </div>
        </div>

        {actionError && (
          <div style={styles.modalErrorBanner}>
            <FiAlertCircle size={16} color="#DC2626" />
            <span>{actionError}</span>
          </div>
        )}

        <form onSubmit={onSubmit} style={styles.modalForm}>
          {isNoScopeRole ? (
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Vai trò <span style={styles.req}>*</span>
              </label>
              <select
                id="new-user-role"
                value={createForm.role}
                onChange={handleRoleChange}
                style={styles.input}
                required
              >
                <option value="province_officer">Quản trị viên cấp tỉnh (Web Admin - Theo vùng Tỉnh/TP)</option>
                <option value="admin">Quản trị viên hệ thống (Toàn quyền hệ thống)</option>
                <option value="district_officer">Cán bộ địa bàn (Web Admin - Theo Quận/Huyện/TP)</option>
                <option value="field_engineer">Kỹ sư hiện trường (Mobile App)</option>
                <option value="reporter">Người phản ánh (Citizen - Mobile App)</option>
              </select>
            </div>
          ) : isProvinceRole ? (
            <div style={styles.formRow}>
              <div style={styles.formCol}>
                <label style={styles.label}>
                  Vai trò <span style={styles.req}>*</span>
                </label>
                <select
                  id="new-user-role"
                  value={createForm.role}
                  onChange={handleRoleChange}
                  style={styles.input}
                  required
                >
                  <option value="province_officer">Quản trị viên cấp tỉnh (Web Admin)</option>
                  <option value="admin">Quản trị viên hệ thống (Toàn quyền)</option>
                  <option value="district_officer">Cán bộ địa bàn (Web Admin)</option>
                  <option value="field_engineer">Kỹ sư hiện trường (Mobile App)</option>
                  <option value="reporter">Người phản ánh (Citizen)</option>
                </select>
              </div>

              <div style={styles.formCol}>
                <label style={styles.label}>
                  Vùng quản lý (Tỉnh / Thành phố) <span style={styles.req}>*</span>
                </label>
                <select
                  id="new-user-province"
                  value={createForm.managedProvince || ''}
                  onChange={(e) => setCreateForm({ ...createForm, managedProvince: e.target.value })}
                  style={styles.input}
                  required
                >
                  <option value="">-- Chọn Tỉnh / Thành phố --</option>
                  {PROVINCE_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div style={styles.formRow}>
              <div style={styles.formCol}>
                <label style={styles.label}>
                  Vai trò <span style={styles.req}>*</span>
                </label>
                <select
                  id="new-user-role"
                  value={createForm.role}
                  onChange={handleRoleChange}
                  style={styles.input}
                  required
                >
                  <option value="province_officer">Quản trị viên cấp tỉnh (Web Admin)</option>
                  <option value="admin">Quản trị viên hệ thống (Toàn quyền)</option>
                  <option value="district_officer">Cán bộ địa bàn (Web Admin)</option>
                  <option value="field_engineer">Kỹ sư hiện trường (Mobile App)</option>
                  <option value="reporter">Người phản ánh (Citizen)</option>
                </select>
              </div>

              <div style={styles.formCol}>
                <label style={styles.label}>
                  Địa bàn phụ trách
                </label>
                <select
                  id="new-user-district"
                  value={createForm.managedDistrict}
                  onChange={(e) => setCreateForm({ ...createForm, managedDistrict: e.target.value })}
                  style={styles.input}
                >
                  <option value="">Toàn vùng / Không giới hạn</option>
                  {DISTRICT_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Họ và tên <span style={styles.req}>*</span>
            </label>
            <input
              type="text"
              id="new-user-fullname"
              placeholder={cfg.namePlaceholder}
              value={createForm.fullName}
              onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formRow}>
            <div style={styles.formCol}>
              <label style={styles.label}>
                Email đăng nhập <span style={styles.req}>*</span>
              </label>
              <input
                type="email"
                id="new-user-email"
                placeholder={cfg.emailPlaceholder}
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formCol}>
              <label style={styles.label}>Số điện thoại</label>
              <input
                type="tel"
                id="new-user-phone"
                placeholder="0912345678"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              Mật khẩu khởi tạo <span style={styles.req}>*</span>
            </label>
            <input
              type="password"
              id="new-user-password"
              placeholder="Tối thiểu 6 ký tự"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              style={styles.input}
              required
              minLength={6}
            />
          </div>

          <div style={styles.modalFooter}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelBtn}
              disabled={actionLoading}
            >
              Hủy
            </button>
            <button
              type="submit"
              id="btn-submit-create-user"
              style={styles.submitBtn}
              disabled={actionLoading}
            >
              {actionLoading ? 'Đang tạo...' : cfg.submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 23, 42, 0.6)',
    display: 'grid',
    placeItems: 'center',
    zIndex: 9999,
    padding: 16,
    backdropFilter: 'blur(2px)',
  },
  modalContent: {
    background: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 540,
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  modalIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: '#EFF6FF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 800,
    color: '#0F172A',
  },
  modalSubtitle: {
    margin: '2px 0 0',
    fontSize: 13,
    color: '#64748B',
  },
  modalCloseBtn: {
    border: 'none',
    background: 'transparent',
    color: '#94A3B8',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
  },
  guidanceBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderStyle: 'solid',
    borderRadius: 8,
    padding: 12,
    transition: 'all 0.2s ease',
  },
  guidanceText: {
    fontSize: 12.5,
    lineHeight: 1.5,
  },
  modalErrorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: 8,
    padding: 10,
    color: '#DC2626',
    fontSize: 13,
    fontWeight: 600,
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  formRow: {
    display: 'flex',
    gap: 12,
  },
  formCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 700,
    color: '#334155',
  },
  req: {
    color: '#EF4444',
  },
  input: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #CBD5E1',
    background: '#F8FAFC',
    fontSize: 14,
    color: '#0F172A',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  modalFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
    paddingTop: 14,
    borderTop: '1px solid #F1F5F9',
  },
  cancelBtn: {
    padding: '9px 16px',
    borderRadius: 8,
    background: '#F1F5F9',
    border: '1px solid #CBD5E1',
    color: '#475569',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '9px 20px',
    borderRadius: 8,
    background: UI_COLORS.primary,
    border: 'none',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 5px rgba(15, 118, 110, 0.2)',
  },
};
