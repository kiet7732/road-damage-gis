import { UI_COLORS } from '../constants/statusColors';

export default function Skeleton({ width = '100%', height = 16, radius = 10, style }) {
  return (
    <span
      aria-hidden="true"
      style={{
        ...styles.block,
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
    />
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div style={styles.tableSkeleton}>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} style={styles.skeletonRow}>
          <Skeleton width={88} height={18} />
          <Skeleton width="26%" height={18} />
          <Skeleton width={120} height={18} />
          <Skeleton width={116} height={26} radius={999} />
          <Skeleton width={64} height={18} />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div style={styles.dashboardGrid}>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} style={styles.dashboardCard}>
          <Skeleton width={44} height={44} radius={14} />
          <Skeleton width="48%" height={18} />
          <Skeleton width="74%" height={14} />
          <Skeleton width="32%" height={30} />
        </div>
      ))}
    </div>
  );
}

const styles = {
  block: {
    display: 'inline-block',
    background: 'linear-gradient(90deg, #E5E7EB 0%, #F3F4F6 50%, #E5E7EB 100%)',
    backgroundSize: '200% 100%',
    animation: 'roadDamageSkeleton 1.2s ease-in-out infinite',
  },
  tableSkeleton: {
    display: 'flex',
    flexDirection: 'column',
    padding: 16,
    gap: 14,
    background: UI_COLORS.surface,
  },
  skeletonRow: {
    minHeight: 54,
    display: 'flex',
    alignItems: 'center',
    gap: 18,
    borderBottom: `1px solid ${UI_COLORS.border}`,
  },
  dashboardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
    gap: 18,
  },
  dashboardCard: {
    minHeight: 150,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    padding: 20,
    borderRadius: 20,
    background: UI_COLORS.surface,
    border: `1px solid ${UI_COLORS.border}`,
  },
};
