import PageHeader from '../../components/PageHeader';
import Panel from '../../components/Panel';
import { UI_COLORS } from '../../constants/statusColors';

export default function StatisticsPage() {
  return (
    <section style={styles.page}>
      <PageHeader title="Thống kê" subtitle="Tổng hợp số liệu hư hỏng mặt đường theo thời gian và trạng thái." />
      <Panel>
        <div style={styles.placeholder}>Trang thống kê sẽ được triển khai ở bước tiếp theo.</div>
      </Panel>
    </section>
  );
}

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  placeholder: {
    minHeight: 220,
    display: 'grid',
    placeItems: 'center',
    color: UI_COLORS.textMuted,
  },
};
