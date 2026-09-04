import { UI_COLORS } from '../constants/statusColors';

export default function Panel({ title, children, style }) {
  return (
    <section style={{ ...styles.panel, ...style }}>
      {title ? <h3 style={styles.title}>{title}</h3> : null}
      {children}
    </section>
  );
}

const styles = {
  panel: {
    minWidth: 0,
    padding: 22,
    border: `1px solid ${UI_COLORS.border}`,
    borderRadius: 18,
    background: UI_COLORS.surface,
    boxSizing: 'border-box',
  },
  title: {
    margin: 0,
    color: UI_COLORS.text,
    fontSize: 18,
    fontWeight: 900,
  },
};
