import { FiCheckCircle, FiClock, FiRefreshCw, FiSlash, FiTarget } from 'react-icons/fi';
import { getStatusColor } from '../constants/statusColors';

const STATUS_ICON_SIZE = 16;

const statusIcons = {
  target: FiTarget,
  clock: FiClock,
  refresh: FiRefreshCw,
  check: FiCheckCircle,
  slash: FiSlash,
};

export default function StatusBadge({ status, size = 'md' }) {
  const color = getStatusColor(status);
  const Icon = statusIcons[color.icon] ?? FiTarget;
  const compact = size === 'sm';

  return (
    <span
      style={{
        ...styles.badge,
        ...(compact ? styles.badgeSmall : null),
        color: color.text,
        background: color.background,
        borderColor: color.border,
      }}
    >
      <span style={styles.iconWrap}>
        <Icon size={STATUS_ICON_SIZE} aria-hidden="true" />
      </span>
      {color.label}
    </span>
  );
}

const styles = {
  badge: {
    minHeight: 30,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    padding: '0 11px',
    border: '1px solid',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },
  badgeSmall: {
    minHeight: 26,
    gap: 6,
    padding: '0 9px',
    fontSize: 11,
  },
  iconWrap: {
    width: 18,
    height: 18,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 18px',
  },
};
