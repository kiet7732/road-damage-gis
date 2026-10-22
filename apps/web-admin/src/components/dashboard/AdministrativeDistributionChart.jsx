import React, { useState } from 'react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { UI_COLORS } from '../../constants/statusColors';

const DISTRICT_COLORS = [
  '#2563EB', // Blue
  '#0D9488', // Teal
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#6366F1', // Indigo
  '#14B8A6', // Cyan
  '#F97316', // Orange
  '#3B82F6', // Sky
  '#84CC16', // Lime
  '#A855F7', // Violet
  '#06B6D4', // Light blue
  '#E11D48', // Rose
];

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div style={styles.tooltip}>
      <div style={styles.tooltipHeader}>
        <span style={{ ...styles.tooltipDot, background: payload[0]?.color }} />
        <strong style={styles.tooltipTitle}>{data.name}</strong>
      </div>
      <div style={styles.tooltipBody}>
        <div>Số lượng: <strong>{data.value}</strong> sự cố</div>
        {data.percentage !== undefined ? (
          <div>Tỷ trọng: <strong>{data.percentage}%</strong></div>
        ) : null}
        {data.pending !== undefined ? (
          <div style={styles.tooltipSub}>
            Chờ xác minh: {data.pending} • Đang xử lý: {data.processing} • Đã sửa: {data.repaired}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function AdministrativeDistributionChart({
  data = [],
  emptyText = 'Chưa có số liệu phân bổ địa bàn.',
}) {
  const [isHovered, setIsHovered] = useState(false);

  const chartData = (Array.isArray(data) ? data : [])
    .filter((item) => Number(item?.total ?? item?.value ?? 0) > 0)
    .map((item) => ({
      name: item.district || item.ward || item.name || 'N/A',
      value: Number(item.total ?? item.value ?? 0),
      percentage: Number(item.percentage ?? 0),
      pending: item.pending,
      processing: item.processing,
      repaired: item.repaired,
    }));

  const total = chartData.reduce((acc, curr) => acc + curr.value, 0);

  if (chartData.length === 0) {
    return <div style={styles.empty}>{emptyText}</div>;
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={96}
              paddingAngle={3}
              animationDuration={800}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${entry.name}-${index}`}
                  fill={DISTRICT_COLORS[index % DISTRICT_COLORS.length]}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }} />
            <Legend
              verticalAlign="bottom"
              height={40}
              iconType="circle"
              formatter={(value) => (
                <span style={styles.legendText}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        <div
          style={{
            ...styles.centerStat,
            opacity: isHovered ? 0 : 1,
            transform: isHovered ? 'translate(-50%, -50%) scale(0.92)' : 'translate(-50%, -50%) scale(1)',
          }}
        >
          <span style={styles.centerNumber}>{total}</span>
          <span style={styles.centerLabel}>Tổng sự cố</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  chartContainer: {
    position: 'relative',
    width: '100%',
    minHeight: 280,
  },
  centerStat: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    pointerEvents: 'none',
    zIndex: 1,
    transition: 'opacity 0.22s cubic-bezier(0.4, 0, 0.2, 1), transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  centerNumber: {
    fontSize: 22,
    fontWeight: 800,
    color: UI_COLORS.textNavy,
    lineHeight: 1.1,
  },
  centerLabel: {
    fontSize: 11,
    color: UI_COLORS.textMuted,
    fontWeight: 600,
  },
  legendText: {
    fontSize: 12,
    color: UI_COLORS.text,
    fontWeight: 600,
    marginRight: 8,
  },
  tooltip: {
    background: '#FFFFFF',
    padding: '10px 14px',
    borderRadius: 12,
    border: `1px solid ${UI_COLORS.border}`,
    boxShadow: '0 10px 25px rgba(15, 23, 42, 0.16)',
    fontSize: 13,
    pointerEvents: 'none',
  },
  tooltipHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  tooltipDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  tooltipTitle: {
    color: UI_COLORS.textNavy,
    fontSize: 14,
  },
  tooltipBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    color: UI_COLORS.text,
  },
  tooltipSub: {
    fontSize: 11,
    color: UI_COLORS.textMuted,
    marginTop: 4,
    borderTop: '1px solid #F1F5F9',
    paddingTop: 4,
  },
  empty: {
    minHeight: 180,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: UI_COLORS.textMuted,
    fontSize: 14,
  },
};
