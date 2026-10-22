import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { UI_COLORS } from '../../constants/statusColors';

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div style={styles.tooltip}>
      <strong style={styles.tooltipTitle}>{data.road_name}</strong>
      {data.district ? (
        <div style={styles.tooltipDistrict}>Thuộc: {data.district}</div>
      ) : null}
      <div style={styles.tooltipBody}>
        <div>Tổng số sự cố: <strong style={{ color: UI_COLORS.primary }}>{data.total}</strong></div>
        <div style={styles.tooltipBreakdown}>
          <span style={{ color: '#E86C00' }}>Chờ xác minh: {data.pending || 0}</span>
          <span style={{ color: '#7E3FB3' }}>Đang xử lý: {data.processing || 0}</span>
          <span style={{ color: '#119C39' }}>Đã sửa chữa: {data.repaired || 0}</span>
        </div>
      </div>
    </div>
  );
}

export default function TopDamagedRoadsChart({
  data = [],
  emptyText = 'Chưa có thống kê tuyến đường có sự cố.',
}) {
  const chartData = (Array.isArray(data) ? data : [])
    .filter((item) => Boolean(item?.road_name && item.road_name.trim()))
    .slice(0, 10)
    .map((item) => ({
      road_name: item.road_name.trim(),
      total: Number(item.total || 0),
      pending: Number(item.pending || 0),
      processing: Number(item.processing || 0),
      repaired: Number(item.repaired || 0),
      district: item.district || null,
    }));

  if (chartData.length === 0) {
    return <div style={styles.empty}>{emptyText}</div>;
  }

  return (
    <div style={styles.wrapper}>
      <ResponsiveContainer width="100%" height={Math.max(260, chartData.length * 36 + 40)}>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: UI_COLORS.textMuted }} />
          <YAxis
            type="category"
            dataKey="road_name"
            width={160}
            tick={{ fontSize: 12, fill: UI_COLORS.textNavy, fontWeight: 600 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="total"
            fill="#0284C7"
            radius={[0, 6, 6, 0]}
            name="Tổng sự cố"
            animationDuration={800}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const styles = {
  wrapper: {
    width: '100%',
    minHeight: 260,
  },
  tooltip: {
    background: '#FFFFFF',
    padding: '10px 14px',
    borderRadius: 10,
    border: `1px solid ${UI_COLORS.border}`,
    boxShadow: '0 6px 18px rgba(15, 23, 42, 0.12)',
    fontSize: 13,
  },
  tooltipTitle: {
    color: UI_COLORS.textNavy,
    fontSize: 14,
    display: 'block',
    marginBottom: 2,
  },
  tooltipDistrict: {
    fontSize: 11,
    color: UI_COLORS.textMuted,
    marginBottom: 6,
  },
  tooltipBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  tooltipBreakdown: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    fontSize: 11,
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
