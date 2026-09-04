import { useMemo } from 'react';
import { UI_COLORS } from '../constants/statusColors';

export default function DashboardBarChart({
  data = [],
  emptyText = 'Chưa có số liệu để hiển thị.',
}) {
  const safeData = Array.isArray(data) ? data : [];
  const totalValue = useMemo(
    () => safeData.reduce((sum, item) => sum + Number(item?.value ?? 0), 0),
    [safeData],
  );
  const maxValue = useMemo(
    () => safeData.reduce((max, item) => Math.max(max, Number(item?.value ?? 0)), 0),
    [safeData],
  );

  if (safeData.length === 0) {
    return <div style={styles.empty}>{emptyText}</div>;
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.chartArea}>
        {safeData.map((item) => {
          const value = Number(item?.value ?? 0);
          const ratio = maxValue > 0 ? value / maxValue : 0;
          const percent = totalValue > 0 ? Math.round((value / totalValue) * 100) : 0;

          return (
            <div key={item?.key ?? item?.label ?? Math.random()} style={styles.row}>
              <div style={styles.rowTop}>
                <div style={styles.labelGroup}>
                  <span
                    style={{
                      ...styles.colorDot,
                      background: item?.color ?? UI_COLORS.primary,
                    }}
                  />
                  <span style={styles.rowLabel}>{item?.label ?? 'N/A'}</span>
                </div>
                <div style={styles.valueGroup}>
                  <span style={styles.rowValue}>{value}</span>
                  <span style={styles.rowPercent}>{percent}%</span>
                </div>
              </div>
              <div style={styles.barTrack}>
                <div
                  style={{
                    ...styles.bar,
                    width: `${Math.max(8, ratio * 100)}%`,
                    background: item?.color ?? UI_COLORS.primary,
                  }}
                  title={`${item?.label ?? 'N/A'}: ${value}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  chartArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  rowTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  labelGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    flexShrink: 0,
  },
  rowLabel: {
    color: UI_COLORS.text,
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.35,
  },
  valueGroup: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
    flexShrink: 0,
  },
  rowValue: {
    color: UI_COLORS.text,
    fontSize: 18,
    fontWeight: 900,
  },
  rowPercent: {
    color: UI_COLORS.textMuted,
    fontSize: 12,
    fontWeight: 700,
  },
  barTrack: {
    width: '100%',
    height: 12,
    padding: 2,
    borderRadius: 999,
    background: UI_COLORS.surfaceMuted,
    border: `1px solid ${UI_COLORS.border}`,
    boxSizing: 'border-box',
  },
  bar: {
    height: '100%',
    borderRadius: 999,
    transition: 'width 0.24s ease',
  },
  empty: {
    padding: 24,
    borderRadius: 16,
    background: UI_COLORS.surfaceMuted,
    color: UI_COLORS.textMuted,
    fontSize: 14,
  },
};
