import {
  FiUsers,
  FiLock,
  FiShield,
  FiTool,
  FiUser,
} from 'react-icons/fi';
import { UI_COLORS } from '../../constants/statusColors';

export default function UserStatsCards({ stats = {} }) {
  return (
    <div style={styles.statsGrid}>
      <div style={styles.statCard}>
        <div style={styles.statIconBox(UI_COLORS.primary, '#EFF6FF')}>
          <FiUsers size={22} color={UI_COLORS.primary} />
        </div>
        <div>
          <div style={styles.statVal}>{stats.total_users ?? '—'}</div>
          <div style={styles.statLabel}>Tổng tài khoản</div>
        </div>
      </div>

      <div style={styles.statCard}>
        <div style={styles.statIconBox('#1D4ED8', '#EFF6FF')}>
          <FiTool size={22} color="#1D4ED8" />
        </div>
        <div>
          <div style={styles.statVal}>{stats.total_engineers ?? '—'}</div>
          <div style={styles.statLabel}>Kỹ sư hiện trường</div>
        </div>
      </div>

      <div style={styles.statCard}>
        <div style={styles.statIconBox('#047857', '#ECFDF5')}>
          <FiUser size={22} color="#047857" />
        </div>
        <div>
          <div style={styles.statVal}>{stats.total_reporters ?? '—'}</div>
          <div style={styles.statLabel}>Người dân phản ánh</div>
        </div>
      </div>

      <div style={styles.statCard}>
        <div style={styles.statIconBox('#7C3AED', '#F5F3FF')}>
          <FiShield size={22} color="#7C3AED" />
        </div>
        <div>
          <div style={styles.statVal}>{stats.total_officers ?? '—'}</div>
          <div style={styles.statLabel}>Cán bộ địa bàn</div>
        </div>
      </div>

      <div style={styles.statCard}>
        <div style={styles.statIconBox(stats.total_locked > 0 ? '#DC2626' : '#6B7280', '#F3F4F6')}>
          <FiLock size={22} color={stats.total_locked > 0 ? '#DC2626' : '#6B7280'} />
        </div>
        <div>
          <div style={styles.statVal}>{stats.total_locked ?? 0}</div>
          <div style={styles.statLabel}>Tài khoản bị khóa</div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 16,
  },
  statCard: {
    background: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    border: '1px solid #E2E8F0',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  statIconBox: (color, bg) => ({
    width: 44,
    height: 44,
    borderRadius: 10,
    background: bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }),
  statVal: {
    fontSize: 22,
    fontWeight: 800,
    color: '#0F172A',
    lineHeight: 1.2,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: 600,
    marginTop: 2,
  },
};
