import { useState } from 'react';
import { UI_COLORS } from '../constants/statusColors';

export default function WebButton({
  children,
  variant = 'primary',
  disabled = false,
  style,
  ...props
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const interactive = !disabled && (hovered || focused);

  return (
    <button
      type="button"
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...styles.base,
        ...styles[variant],
        ...(interactive ? styles.interactive : null),
        ...(disabled ? styles.disabled : null),
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}

const styles = {
  base: {
    minHeight: 44,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '0 14px',
    borderRadius: 12,
    fontWeight: 900,
    cursor: 'pointer',
    transition: '160ms ease',
    outline: 'none',
  },
  primary: {
    border: 0,
    background: UI_COLORS.primary,
    color: UI_COLORS.surface,
  },
  secondary: {
    border: `1px solid ${UI_COLORS.border}`,
    background: UI_COLORS.surface,
    color: UI_COLORS.primaryDark,
  },
  interactive: {
    transform: 'translateY(-1px)',
    boxShadow: '0 8px 20px rgba(7, 93, 187, 0.18)',
    outline: `3px solid ${UI_COLORS.primary}22`,
  },
  disabled: {
    cursor: 'not-allowed',
    opacity: 0.55,
    transform: 'none',
    boxShadow: 'none',
  },
};
