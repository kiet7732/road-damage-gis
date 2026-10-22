import KpiCard from '../KpiCard';
import { UI_COLORS } from '../../constants/statusColors';

export default function StatisticsKpiCards({
  totalReports,
  pendingCount,
  processingCount,
  repairedCount,
  completionRate,
}) {
  return (
    <div style={styles.kpiGrid}>
      <KpiCard
        item={{
          key: 'total',
          label: 'Tổng sự cố ghi nhận',
          value: totalReports,
          description: 'Tổng số điểm hư hỏng phát sinh trong kỳ',
        }}
        variant="default"
      />
      <KpiCard
        item={{
          key: 'pending',
          label: 'Chờ xác minh',
          value: pendingCount,
          description: 'Cần cán bộ kiểm tra và phê duyệt',
          status: 'pending',
        }}
        variant="default"
      />
      <KpiCard
        item={{
          key: 'processing',
          label: 'Đang xử lý / Khảo sát',
          value: processingCount,
          description: 'Kỹ sư hiện trường đang thi công, sửa chữa',
          status: 'processing',
        }}
        variant="default"
      />
      <div style={styles.completionCard}>
        <div style={styles.completionHeader}>
          <div>
            <div style={styles.completionLabel}>Đã hoàn thành sửa chữa</div>
            <div style={styles.completionValue}>{repairedCount} vị trí</div>
          </div>
          <div style={styles.completionBadge}>{completionRate}%</div>
        </div>
        <div style={styles.progressTrack}>
          <div
            style={{
              ...styles.progressBar,
              width: `${Math.min(100, completionRate)}%`,
            }}
          />
        </div>
        <div style={styles.completionDesc}>
          {repairedCount}/{totalReports} sự cố đã được khắc phục hoàn toàn
        </div>
      </div>
    </div>
  );
}

const styles = {
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 16,
  },
  completionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    border: `1px solid ${UI_COLORS.border}`,
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 10,
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
  },
  completionHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  completionLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: UI_COLORS.textMuted,
  },
  completionValue: {
    fontSize: 22,
    fontWeight: 900,
    color: '#15803D',
    marginTop: 4,
  },
  completionBadge: {
    fontSize: 14,
    fontWeight: 900,
    padding: '4px 10px',
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    border: '1px solid #86EFAC',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#16A34A',
    transition: 'width 0.4s ease',
  },
  completionDesc: {
    fontSize: 11,
    color: UI_COLORS.textMuted,
    fontWeight: 600,
  },
};
