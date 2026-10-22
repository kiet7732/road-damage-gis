import { FiSearch, FiRefreshCw, FiX } from 'react-icons/fi';
import { UI_COLORS } from '../../constants/statusColors';
import { DISTRICT_OPTIONS } from '../../constants/userConstants';

export default function UserFilterBar({
  searchKeyword,
  setSearchKeyword,
  roleFilter,
  setRoleFilter,
  districtFilter,
  setDistrictFilter,
  statusFilter,
  setStatusFilter,
  onSearchSubmit,
  onClearSearch,
  onRefresh,
}) {
  return (
    <div style={styles.filterCard}>
      <form onSubmit={onSearchSubmit} style={styles.filterRow}>
        <div style={styles.searchBox}>
          <FiSearch size={16} color={UI_COLORS.textMuted} />
          <input
            type="text"
            id="user-search-input"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Tìm theo họ tên, email, SĐT..."
            style={styles.searchInput}
          />
          {searchKeyword && (
            <button
              type="button"
              onClick={onClearSearch}
              style={styles.clearBtn}
            >
              <FiX size={14} />
            </button>
          )}
        </div>

        {/* Role Filter */}
        <select
          id="user-role-filter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={styles.select}
        >
          <option value="all">Tất cả vai trò</option>
          <option value="field_engineer">Kỹ sư hiện trường</option>
          <option value="reporter">Người phản ánh</option>
          <option value="officer">Cán bộ địa bàn</option>
          <option value="admin">Quản trị viên</option>
        </select>

        {/* District Filter */}
        <select
          id="user-district-filter"
          value={districtFilter}
          onChange={(e) => setDistrictFilter(e.target.value)}
          style={styles.select}
        >
          <option value="all">Tất cả địa bàn</option>
          {DISTRICT_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          id="user-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={styles.select}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="locked">Tạm khóa</option>
        </select>

        <button type="submit" id="btn-search-users" style={styles.searchSubmitBtn}>
          <FiSearch size={15} />
          <span>Tìm kiếm</span>
        </button>

        <button
          type="button"
          id="btn-refresh-users"
          onClick={onRefresh}
          style={styles.refreshBtn}
          title="Làm mới danh sách"
        >
          <FiRefreshCw size={15} />
        </button>
      </form>
    </div>
  );
}

const styles = {
  filterCard: {
    background: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    border: '1px solid #E2E8F0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  searchBox: {
    flex: '1 1 240px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#F8FAFC',
    border: '1px solid #CBD5E1',
    borderRadius: 8,
    padding: '8px 12px',
  },
  searchInput: {
    border: 'none',
    background: 'transparent',
    outline: 'none',
    width: '100%',
    fontSize: 14,
    color: '#0F172A',
  },
  clearBtn: {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: '#94A3B8',
    padding: 0,
    display: 'flex',
  },
  select: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #CBD5E1',
    background: '#FFFFFF',
    fontSize: 14,
    color: '#0F172A',
    outline: 'none',
    cursor: 'pointer',
    minWidth: 150,
  },
  searchSubmitBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 8,
    background: '#0F172A',
    color: '#FFFFFF',
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 8,
    background: '#F1F5F9',
    border: '1px solid #CBD5E1',
    color: '#475569',
    cursor: 'pointer',
  },
};
