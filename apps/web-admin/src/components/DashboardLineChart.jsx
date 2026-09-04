import {
  Area,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
} from 'recharts';
import { UI_COLORS } from '../constants/statusColors';

function formatChartData(data = []) {
  return (Array.isArray(data) ? data : []).map((item) => ({
    label: item?.date ?? 'N/A',
    total: Number(item?.total ?? 0),
    pending: Number(item?.pending ?? 0),
    processing: Number(item?.processing ?? 0),
    repaired: Number(item?.repaired ?? 0),
  }));
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  const rows = payload
    .filter((entry) => Number.isFinite(entry?.value))
    .map((entry) => ({
      label: entry?.name ?? 'N/A',
      value: entry?.value ?? 0,
      color: entry?.color ?? UI_COLORS.primary,
    }));

  return (
    <div style={styles.tooltip}>
      <strong style={styles.tooltipTitle}>{label}</strong>
      <div style={styles.tooltipRows}>
        {rows.map((row) => (
          <div key={row.label} style={styles.tooltipRow}>
            <span style={styles.tooltipLabelWrap}>
              <span style={{ ...styles.tooltipDot, background: row.color }} />
              <span>{row.label}</span>
            </span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardLineChart({ data = [] }) {
  const chartData = formatChartData(data);

  if (chartData.length === 0) {
    return <div style={styles.empty}>Chưa có số liệu theo thời gian.</div>;
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.legendHint}>Tổng phản ánh được nhấn mạnh, các trạng thái còn lại hiển thị để đối chiếu nhanh.</div>

      <div style={styles.chartFrame}>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart
            data={chartData}
            margin={{ top: 12, right: 12, left: -12, bottom: 0 }}
          >
            <defs>
              <linearGradient id="roadTotalArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#075DBB" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#075DBB" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="#E8EDF5" strokeDasharray="4 6" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748B', fontSize: 12, fontWeight: 700 }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748B', fontSize: 12, fontWeight: 700 }}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#B8D5FF', strokeWidth: 1 }} />
            <Legend
              verticalAlign="top"
              align="left"
              iconType="circle"
              wrapperStyle={{ paddingBottom: 12, fontSize: 12, fontWeight: 700 }}
            />

            <Area
              type="monotone"
              dataKey="total"
              name="Tổng phản ánh"
              stroke="#075DBB"
              strokeWidth={3}
              fill="url(#roadTotalArea)"
              activeDot={{ r: 6, stroke: '#FFFFFF', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="pending"
              name="Chờ xác minh"
              stroke="#E86C00"
              strokeWidth={2}
              strokeDasharray="6 6"
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="processing"
              name="Đang xử lý"
              stroke="#7E3FB3"
              strokeWidth={2}
              strokeDasharray="6 6"
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="repaired"
              name="Đã sửa chữa"
              stroke="#119C39"
              strokeWidth={2}
              strokeDasharray="6 6"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  legendHint: {
    color: UI_COLORS.textMuted,
    fontSize: 13,
    lineHeight: 1.45,
    fontWeight: 600,
  },
  chartFrame: {
    width: '100%',
    minHeight: 320,
    borderRadius: 18,
    background: '#FBFDFF',
    border: `1px solid ${UI_COLORS.border}`,
    padding: '10px 12px 4px',
    boxSizing: 'border-box',
  },
  tooltip: {
    minWidth: 164,
    padding: '10px 12px',
    borderRadius: 14,
    background: '#0F172A',
    color: '#FFFFFF',
    boxShadow: '0 16px 34px rgba(15, 23, 42, 0.22)',
  },
  tooltipTitle: {
    display: 'block',
    marginBottom: 8,
    fontSize: 12,
    fontWeight: 900,
  },
  tooltipRows: {
    display: 'grid',
    gap: 6,
  },
  tooltipRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    fontSize: 12,
  },
  tooltipLabelWrap: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  },
  tooltipDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    flexShrink: 0,
  },
  empty: {
    padding: 24,
    borderRadius: 16,
    background: UI_COLORS.surfaceMuted,
    color: UI_COLORS.textMuted,
    fontSize: 14,
  },
};
