import { FiInbox } from 'react-icons/fi';
import { UI_COLORS } from '../constants/statusColors';
import WebButton from './WebButton';

export default function EmptyState({
  title = 'Chưa có thông tin',
  description = 'Hiện chưa có thông tin phù hợp để hiển thị.',
  actionLabel,
  onAction,
}) {
  return (
    <div style={styles.container}>
      <div style={styles.iconWrap}>
        <FiInbox size={34} color="#98A2B3" />
      </div>
      <strong style={styles.title}>{title}</strong>
      <span style={styles.description}>{description}</span>
      {actionLabel && onAction ? (
        <WebButton style={styles.actionButton} onClick={onAction}>
          {actionLabel}
        </WebButton>
      ) : null}
    </div>
  );
}

const styles = {
  container: {
    minHeight: 220,
    display: 'grid',
    placeItems: 'center',
    alignContent: 'center',
    gap: 10,
    padding: 28,
    background: UI_COLORS.surfaceMuted,
  },
  iconWrap: {
    width: 68,
    height: 68,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 999,
    background: '#EEF2F7',
  },
  title: {
    marginTop: 6,
    color: UI_COLORS.text,
    fontSize: 18,
  },
  description: {
    maxWidth: 360,
    color: UI_COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 1.5,
  },
  actionButton: {
    marginTop: 10,
  },
};
