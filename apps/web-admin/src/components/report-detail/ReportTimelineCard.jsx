import Panel from '../Panel';
import { UI_COLORS } from '../../constants/statusColors';

export default function ReportTimelineCard({ historyItems = [] }) {
  return (
    <Panel title="Lịch sử tác nghiệp & Kiểm toán hiện trường">
      <div style={styles.timeline}>
        {historyItems.map((item) => {
          let dotBg = UI_COLORS.primary;
          if (item.isSuccess) dotBg = '#10B981';
          if (item.isWarning) dotBg = '#EF4444';

          return (
            <div key={item.key} style={styles.timelineItem}>
              <div style={{ ...styles.timelineDot, background: dotBg }} />
              <div>
                <div
                  style={{
                    ...styles.timelineTitle,
                    color: item.isWarning ? '#B91C1C' : item.isSuccess ? '#15803D' : UI_COLORS.text,
                  }}
                >
                  {item.title}
                </div>
                <div style={styles.timelineDescription}>{item.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

const styles = {
  timeline: {
    display: 'grid',
    gap: 14,
  },
  timelineItem: {
    display: 'grid',
    gridTemplateColumns: '14px minmax(0, 1fr)',
    gap: 12,
    alignItems: 'start',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginTop: 5,
    background: UI_COLORS.primary,
  },
  timelineTitle: {
    color: UI_COLORS.text,
    fontSize: 14,
    fontWeight: 900,
  },
  timelineDescription: {
    marginTop: 4,
    color: UI_COLORS.textMuted,
    fontSize: 13,
    lineHeight: 1.55,
  },
};
