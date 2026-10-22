import React from 'react';
import { UI_COLORS } from '../../constants/statusColors';

export default function WardProgressTable({
  data = [],
  showDistrict = true,
  emptyText = 'Chưa có thống kê tiến độ theo phường.',
}) {
  const safeData = Array.isArray(data) ? data : [];

  if (safeData.length === 0) {
    return <div style={styles.empty}>{emptyText}</div>;
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.tableScroll}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.headerRow}>
              <th style={{ ...styles.th, textAlign: 'left' }}>Phường / Xã</th>
              {showDistrict ? (
                <th style={{ ...styles.th, textAlign: 'left' }}>Quận / Huyện</th>
              ) : null}
              <th style={{ ...styles.th, textAlign: 'center' }}>Chờ xác minh</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Đang xử lý</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Đã sửa chữa</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Tổng sự cố</th>
              <th style={{ ...styles.th, textAlign: 'left', minWidth: 160 }}>Tiến độ hoàn thành</th>
            </tr>
          </thead>
          <tbody>
            {safeData.map((item, index) => {
              const rate = Number(item.completion_rate || 0);
              let progressColor = '#10B981'; // Green
              if (rate < 40) {
                progressColor = '#EF4444'; // Red
              } else if (rate < 70) {
                progressColor = '#F59E0B'; // Amber
              }

              return (
                <tr key={`${item.district}-${item.ward}-${index}`} style={styles.row}>
                  <td style={{ ...styles.td, fontWeight: 700, color: UI_COLORS.textNavy }}>
                    {item.ward}
                  </td>
                  {showDistrict ? (
                    <td style={{ ...styles.td, color: UI_COLORS.textMuted }}>
                      {item.district}
                    </td>
                  ) : null}
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <span style={styles.pendingBadge}>{item.pending || 0}</span>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <span style={styles.processingBadge}>{item.processing || 0}</span>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center' }}>
                    <span style={styles.repairedBadge}>{item.repaired || 0}</span>
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center', fontWeight: 700 }}>
                    {item.total || 0}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.progressWrap}>
                      <div style={styles.progressBarTrack}>
                        <div
                          style={{
                            ...styles.progressBarFill,
                            width: `${Math.min(100, Math.max(0, rate))}%`,
                            backgroundColor: progressColor,
                          }}
                        />
                      </div>
                      <span style={{ ...styles.progressText, color: progressColor }}>
                        {rate}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: '100%',
    overflow: 'hidden',
  },
  tableScroll: {
    maxHeight: 380,
    overflowY: 'auto',
    border: `1px solid ${UI_COLORS.border}`,
    borderRadius: 12,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  headerRow: {
    backgroundColor: '#F8FAFC',
    borderBottom: `1px solid ${UI_COLORS.border}`,
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  th: {
    padding: '12px 14px',
    fontSize: 12,
    fontWeight: 700,
    color: UI_COLORS.textNavy,
    whiteSpace: 'nowrap',
  },
  row: {
    borderBottom: '1px solid #F1F5F9',
    transition: 'background-color 0.15s ease',
  },
  td: {
    padding: '10px 14px',
    color: UI_COLORS.text,
    verticalAlign: 'middle',
  },
  pendingBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 6,
    background: '#FFF7ED',
    color: '#C2410C',
    fontWeight: 700,
    fontSize: 12,
  },
  processingBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 6,
    background: '#FAF5FF',
    color: '#7E22CE',
    fontWeight: 700,
    fontSize: 12,
  },
  repairedBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 6,
    background: '#F0FDF4',
    color: '#15803D',
    fontWeight: 700,
    fontSize: 12,
  },
  progressWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  progressBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
    transition: 'width 0.4s ease',
  },
  progressText: {
    fontWeight: 700,
    fontSize: 12,
    minWidth: 40,
    textAlign: 'right',
  },
  empty: {
    minHeight: 140,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: UI_COLORS.textMuted,
    fontSize: 14,
  },
};
