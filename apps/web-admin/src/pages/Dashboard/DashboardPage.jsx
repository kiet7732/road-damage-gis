import { useCallback } from 'react';

import DashboardBarChart from '../../components/DashboardBarChart';
import DashboardLineChart from '../../components/DashboardLineChart';
import EmptyState from '../../components/EmptyState';
import KpiCard from '../../components/KpiCard';
import PageHeader from '../../components/PageHeader';
import Panel from '../../components/Panel';
import { DashboardSkeleton } from '../../components/Skeleton';
import { UI_COLORS } from '../../constants/statusColors';
import useAsyncData from '../../hooks/useAsyncData';
import { fetchAdminDashboard, getDashboardErrorMessage } from '../../services/dashboardService';

export default function DashboardPage() {
  const loadDashboard = useCallback(async () => {
    try {
      return await fetchAdminDashboard();
    } catch (requestError) {
      throw new Error(getDashboardErrorMessage(requestError));
    }
  }, []);

  const {
    data: dashboard,
    isLoading,
    isRefreshing,
    isError,
    isSuccess,
    error,
    reload,
  } = useAsyncData(loadDashboard, []);

  const kpis = Array.isArray(dashboard?.kpis) ? dashboard.kpis : [];
  const statusSummary = Array.isArray(dashboard?.status_summary) ? dashboard.status_summary : [];
  const damageTypeSummary = Array.isArray(dashboard?.damage_type_summary) ? dashboard.damage_type_summary : [];
  const timeline = Array.isArray(dashboard?.timeline) ? dashboard.timeline : [];

  return (
    <section style={styles.page}>
      <PageHeader
        title="Tổng quan hệ thống"
        subtitle="Theo dõi nhanh tình hình tiếp nhận và xử lý phản ánh hư hỏng mặt đường."
      />

      {isLoading ? <DashboardSkeleton /> : null}

      {!isLoading && isError ? (
        <DashboardState
          title="Không tải được thống kê"
          description={error || 'Không thể tải dữ liệu tổng quan.'}
          tone="error"
          actionLabel={isRefreshing ? 'Đang tải lại...' : 'Tải lại'}
          onAction={() => {
            void reload('refresh');
          }}
        />
      ) : null}

      {!isLoading && isSuccess && kpis.length === 0 ? (
        <EmptyState
          title="Chưa có số liệu tổng quan"
          description="Hệ thống chưa có đủ dữ liệu để hiển thị thống kê."
        />
      ) : null}

      {!isLoading && isSuccess && kpis.length > 0 ? (
        <>
          <div style={styles.kpiGrid}>
            {kpis.map((item) => (
              <KpiCard
                key={item?.key ?? item?.label ?? 'unknown-kpi'}
                label={item?.label ?? 'N/A'}
                value={item?.value ?? 0}
                description={item?.description ?? 'N/A'}
                status={item?.status ?? item?.key ?? 'new'}
              />
            ))}
          </div>

          <div className="road-dashboard-content-grid" style={styles.grid}>
            <Panel title="Phân bổ theo trạng thái">
              <DashboardBarChart
                data={statusSummary}
                emptyText="Chưa có dữ liệu trạng thái xử lý."
              />
            </Panel>

            <Panel title="Phân loại theo loại hư hỏng">
              <DashboardBarChart
                data={damageTypeSummary}
                emptyText="Chưa có dữ liệu loại hư hỏng."
              />
            </Panel>
          </div>

          <Panel title="Biến động theo thời gian">
            <DashboardLineChart data={timeline} />
          </Panel>
        </>
      ) : null}
    </section>
  );
}

function DashboardState({ title, description = '', tone = 'default', actionLabel, onAction }) {
  return (
    <Panel>
      <div style={styles.stateBox}>
        <strong style={{ color: tone === 'error' ? UI_COLORS.danger : UI_COLORS.text }}>
          {title ?? 'N/A'}
        </strong>
        {description ? <span style={styles.stateDescription}>{description}</span> : null}
        {actionLabel && onAction ? (
          <button type="button" onClick={onAction} style={styles.retryButton}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </Panel>
  );
}

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
    gap: 18,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: 18,
  },
  stateBox: {
    minHeight: 120,
    display: 'grid',
    placeItems: 'center',
    alignContent: 'center',
    gap: 8,
  },
  stateDescription: {
    color: UI_COLORS.textMuted,
    fontSize: 14,
  },
  retryButton: {
    minHeight: 40,
    padding: '0 16px',
    borderRadius: 10,
    border: `1px solid ${UI_COLORS.primary}`,
    background: UI_COLORS.surface,
    color: UI_COLORS.primary,
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer',
  },
};
