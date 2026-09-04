import { UI_COLORS } from '../constants/statusColors';

export default function PageHeader({ title, subtitle, action }) {
  return (
    <div style={styles.header}>
      <div style={styles.copy}>
        <h2 style={styles.title}>{title}</h2>
        {subtitle ? <p style={styles.subtitle}>{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
  },
  copy: {
    minWidth: 0,
  },
  title: {
    margin: 0,
    color: UI_COLORS.text,
    fontSize: 26,
    fontWeight: 900,
  },
  subtitle: {
    margin: '6px 0 0',
    color: UI_COLORS.textMuted,
    fontSize: 15,
  },
};
