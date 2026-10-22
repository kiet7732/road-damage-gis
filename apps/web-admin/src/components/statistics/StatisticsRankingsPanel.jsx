import Panel from '../Panel';
import { UI_COLORS } from '../../constants/statusColors';

export default function StatisticsRankingsPanel({
  activeTab,
  setActiveTab,
  topRoads = [],
  wardStats = [],
}) {
  return (
    <Panel style={styles.tablePanel}>
      <div style={styles.tablePanelHeader}>
        <div style={styles.tabGroup}>
          <button
            type="button"
            onClick={() => setActiveTab('roads')}
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'roads' ? styles.tabBtnActive : null),
            }}
          >
            Top tuyến đường hư hỏng nhiều nhất ({topRoads.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('wards')}
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'wards' ? styles.tabBtnActive : null),
            }}
          >
            Thống kê theo Phường / Xã ({wardStats.length})
          </button>
        </div>
      </div>

      {activeTab === 'roads' ? (
        <div style={styles.tableWrap}>
          {topRoads.length === 0 ? (
            <div style={styles.emptyTable}>Không ghi nhận sự cố nào trên các tuyến đường trong kỳ.</div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeadRow}>
                  <th style={{ ...styles.th, width: 48 }}>#</th>
                  <th style={styles.th}>Tuyến đường</th>
                  <th style={styles.th}>Quận / Huyện</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Tổng sự cố</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Chờ duyệt</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Đang sửa</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Đã xong</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>Tiến độ</th>
                </tr>
              </thead>
              <tbody>
                {topRoads.map((road, idx) => {
                  const roadRepaired = road.repaired ?? 0;
                  const roadTotal = road.total ?? 0;
                  const roadRate = roadTotal > 0 ? Math.round((roadRepaired / roadTotal) * 100) : 0;

                  return (
                    <tr key={`${road.road_name}-${idx}`} style={styles.tableBodyRow}>
                      <td style={styles.tdIndex}>{idx + 1}</td>
                      <td style={styles.tdRoadName}>
                        <strong>{road.road_name}</strong>
                      </td>
                      <td style={styles.tdDistrict}>{road.district || 'Chưa phân cấp'}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <span style={styles.badgeTotal}>{roadTotal}</span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <span style={styles.badgePending}>{road.pending ?? 0}</span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <span style={styles.badgeProcessing}>{road.processing ?? 0}</span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <span style={styles.badgeRepaired}>{roadRepaired}</span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <span
                          style={{
                            ...styles.ratePill,
                            color: roadRate === 100 ? '#15803d' : roadRate > 50 ? '#0369a1' : '#b45309',
                            backgroundColor: roadRate === 100 ? '#f0fdf4' : roadRate > 50 ? '#f0f9ff' : '#fffbeb',
                          }}
                        >
                          {roadRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div style={styles.tableWrap}>
          {wardStats.length === 0 ? (
            <div style={styles.emptyTable}>Không có dữ liệu theo phường trong kỳ này.</div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeadRow}>
                  <th style={{ ...styles.th, width: 48 }}>#</th>
                  <th style={styles.th}>Phường / Xã</th>
                  <th style={styles.th}>Quận / Huyện</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Tổng sự cố</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Tỷ trọng</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Đã khắc phục</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Còn tồn đọng</th>
                </tr>
              </thead>
              <tbody>
                {wardStats.map((ward, idx) => {
                  const repaired = ward.repaired ?? 0;
                  const pending = (ward.total ?? 0) - repaired;

                  return (
                    <tr key={`${ward.ward}-${idx}`} style={styles.tableBodyRow}>
                      <td style={styles.tdIndex}>{idx + 1}</td>
                      <td style={styles.tdRoadName}>
                        <strong>{ward.ward}</strong>
                      </td>
                      <td style={styles.tdDistrict}>{ward.district || 'Chưa phân cấp'}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <span style={styles.badgeTotal}>{ward.total}</span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <strong>{ward.percentage}%</strong>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <span style={styles.badgeRepaired}>{repaired}</span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <span style={pending > 0 ? styles.badgePending : styles.badgeRepaired}>
                          {pending}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </Panel>
  );
}

const styles = {
  tablePanel: {
    padding: '18px 20px',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  tablePanelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: `1px solid ${UI_COLORS.border}`,
    paddingBottom: 12,
  },
  tabGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  tabBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: 'transparent',
    color: '#64748B',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tabBtnActive: {
    backgroundColor: '#EFF6FF',
    color: UI_COLORS.primary,
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  },
  tableHeadRow: {
    borderBottom: `1px solid ${UI_COLORS.border}`,
  },
  th: {
    padding: '10px 12px',
    color: UI_COLORS.textMuted,
    fontWeight: 700,
    fontSize: 12,
    textAlign: 'left',
  },
  tableBodyRow: {
    borderBottom: '1px solid #F1F5F9',
    transition: 'background-color 0.12s ease',
  },
  td: {
    padding: '12px',
    color: UI_COLORS.text,
  },
  tdIndex: {
    padding: '12px',
    color: '#94A3B8',
    fontWeight: 700,
    fontSize: 12,
  },
  tdRoadName: {
    padding: '12px',
    color: UI_COLORS.text,
    fontSize: 13,
  },
  tdDistrict: {
    padding: '12px',
    color: '#64748B',
    fontSize: 12,
  },
  badgeTotal: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    fontWeight: 800,
    fontSize: 12,
    color: '#1E293B',
  },
  badgePending: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: 6,
    backgroundColor: '#FEF3C7',
    color: '#B45309',
    fontWeight: 800,
    fontSize: 12,
  },
  badgeProcessing: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: 6,
    backgroundColor: '#E0F2FE',
    color: '#0369A1',
    fontWeight: 800,
    fontSize: 12,
  },
  badgeRepaired: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: 6,
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    fontWeight: 800,
    fontSize: 12,
  },
  ratePill: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: 6,
    fontWeight: 800,
    fontSize: 12,
  },
  emptyTable: {
    padding: 36,
    textAlign: 'center',
    color: UI_COLORS.textMuted,
    fontSize: 13,
  },
};
