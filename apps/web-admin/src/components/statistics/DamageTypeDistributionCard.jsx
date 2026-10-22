import { FiActivity } from 'react-icons/fi';
import Panel from '../Panel';
import { DAMAGE_TYPES, UI_COLORS } from '../../constants/statusColors';

export default function DamageTypeDistributionCard({
  totalReports = 0,
  damageTypeSummary = [],
}) {
  return (
    <Panel style={styles.analyticsPanel}>
      <div style={styles.panelHeader}>
        <div>
          <h3 style={styles.panelTitle}>Cơ cấu loại hư hỏng</h3>
          <div style={styles.panelSubtitle}>
            Tỷ trọng các nhóm hư hại mặt đường theo chuẩn nhận diện AI
          </div>
        </div>
        <FiActivity size={18} color={UI_COLORS.primary} />
      </div>

      {totalReports === 0 ? (
        <div style={styles.emptyCardContent}>Không có dữ liệu trong khoảng thời gian này.</div>
      ) : (
        <div style={styles.damageTypeList}>
          {damageTypeSummary.map((item) => {
            const code = item.key;
            const meta = DAMAGE_TYPES[code] || { label: item.label, color: '#64748B' };
            const count = item.value;
            const pct = totalReports > 0 ? Math.round((count / totalReports) * 100) : 0;

            return (
              <div key={code} style={styles.damageTypeItem}>
                <div style={styles.damageTypeHead}>
                  <div style={styles.damageTypeBadgeWrap}>
                    <span
                      style={{
                        ...styles.damageTypePill,
                        backgroundColor: `${meta.color}15`,
                        color: meta.color,
                        borderColor: `${meta.color}40`,
                      }}
                    >
                      {code}
                    </span>
                    <strong style={styles.damageTypeName}>{meta.label}</strong>
                  </div>
                  <div style={styles.damageTypeNumbers}>
                    <span style={styles.damageTypeCount}>{count} ca</span>
                    <span style={styles.damageTypePct}>({pct}%)</span>
                  </div>
                </div>

                <div style={styles.damageTrack}>
                  <div
                    style={{
                      ...styles.damageBar,
                      width: `${Math.max(2, pct)}%`,
                      backgroundColor: meta.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

const styles = {
  analyticsPanel: {
    padding: '18px 20px',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  panelTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 800,
    color: UI_COLORS.text,
  },
  panelSubtitle: {
    margin: '3px 0 0',
    fontSize: 12,
    color: UI_COLORS.textMuted,
  },
  damageTypeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  damageTypeItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  damageTypeHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  damageTypeBadgeWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  damageTypePill: {
    fontSize: 11,
    fontWeight: 900,
    padding: '2px 8px',
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'solid',
  },
  damageTypeName: {
    fontSize: 13,
    color: UI_COLORS.text,
    fontWeight: 700,
  },
  damageTypeNumbers: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
  },
  damageTypeCount: {
    fontSize: 13,
    fontWeight: 800,
    color: UI_COLORS.text,
  },
  damageTypePct: {
    fontSize: 12,
    fontWeight: 600,
    color: UI_COLORS.textMuted,
  },
  damageTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  damageBar: {
    height: '100%',
    borderRadius: 999,
    transition: 'width 0.35s ease',
  },
  emptyCardContent: {
    padding: 30,
    textAlign: 'center',
    fontSize: 13,
    color: UI_COLORS.textMuted,
  },
};
