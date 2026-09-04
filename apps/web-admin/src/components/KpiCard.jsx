import { FiActivity, FiCheckCircle, FiClock, FiInbox } from 'react-icons/fi';
import { getStatusColor, UI_COLORS } from '../constants/statusColors';

const icons = {
  new: FiInbox,
  pending: FiClock,
  processing: FiActivity,
  repaired: FiCheckCircle,
};

export default function KpiCard({ label, value, description, status }) {
  const color = getStatusColor(status);
  const Icon = icons[status] ?? FiInbox;

  return (
    <article style={styles.card}>
      <div style={{ ...styles.iconBox, color: color.text, background: color.background }}>
        <Icon size={24} />
      </div>
      <div style={styles.body}>
        <div style={styles.value}>{value}</div>
        <div style={styles.label}>{label}</div>
        <div style={styles.description}>{description}</div>
      </div>
    </article>
  );
}

const styles = {
  card: {
    minHeight: 126,
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: 20,
    border: `1px solid ${UI_COLORS.border}`,
    borderRadius: 18,
    background: UI_COLORS.surface,
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
    boxSizing: 'border-box',
  },
  iconBox: {
    width: 58,
    height: 58,
    flex: '0 0 58px',
    borderRadius: 18,
    display: 'grid',
    placeItems: 'center',
  },
  body: {
    minWidth: 0,
  },
  value: {
    color: UI_COLORS.text,
    fontSize: 28,
    lineHeight: 1,
    fontWeight: 900,
    fontVariantNumeric: 'tabular-nums',
  },
  label: {
    marginTop: 7,
    color: UI_COLORS.text,
    fontSize: 15,
    fontWeight: 900,
  },
  description: {
    marginTop: 5,
    color: UI_COLORS.textMuted,
    fontSize: 13,
    lineHeight: 1.45,
  },
};
