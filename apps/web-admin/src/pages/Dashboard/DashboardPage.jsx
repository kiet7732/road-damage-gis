import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiFilter, FiMapPin } from 'react-icons/fi';

import DashboardBarChart from '../../components/DashboardBarChart';
import DashboardLineChart from '../../components/DashboardLineChart';
import EmptyState from '../../components/EmptyState';
import KpiCard from '../../components/KpiCard';
import PageHeader from '../../components/PageHeader';
import Panel from '../../components/Panel';
import { DashboardSkeleton } from '../../components/Skeleton';
import AdministrativeDistributionChart from '../../components/dashboard/AdministrativeDistributionChart';
import TopDamagedRoadsChart from '../../components/dashboard/TopDamagedRoadsChart';
import WardProgressTable from '../../components/dashboard/WardProgressTable';
import { UI_COLORS } from '../../constants/statusColors';
import useAsyncData from '../../hooks/useAsyncData';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchAdminDashboard,
  fetchAdministrativeStats,
  getDashboardErrorMessage,
} from '../../services/dashboardService';

const ALL_DISTRICTS = [
  'Quận 1',
  'Quận 3',
  'Quận 4',
  'Quận 5',
  'Quận 6',
  'Quận 7',
  'Quận 8',
  'Quận 10',
  'Quận 11',
  'Quận 12',
  'Bình Thạnh',
  'Gò Vấp',
  'Phú Nhuận',
  'Tân Bình',
  'Tân Phú',
  'Bình Tân',
  'TP. Thủ Đức',
];

export default function DashboardPage() {
  const { managedDistrict } = useAuth();
  const [selectedDistrict, setSelectedDistrict] = useState(managedDistrict || '');

  useEffect(() => {
    if (managedDistrict && selectedDistrict !== managedDistrict) {
      setSelectedDistrict(managedDistrict);
    }
  }, [managedDistrict, selectedDistrict]);

  const activeDistrict = managedDistrict || selectedDistrict || null;

  const loadAllDashboardData = useCallback(async () => {
    try {
      const [dash, admin] = await Promise.all([
        fetchAdminDashboard({ district: activeDistrict }),
        fetchAdministrativeStats({ district: activeDistrict }),
      ]);
      return { dashboard: dash, adminStats: admin };
    } catch (requestError) {
      throw new Error(getDashboardErrorMessage(requestError));
    }
  }, [activeDistrict]);

  const {
    data: dataBundle,
    isLoading,
    isRefreshing,
    isError,
    isSuccess,
    error,
    reload,
  } = useAsyncData(loadAllDashboardData, [activeDistrict]);

  const dashboard = dataBundle?.dashboard;
  const adminStats = dataBundle?.adminStats;

  const kpis = Array.isArray(dashboard?.kpis) ? dashboard.kpis : [];
  const statusSummary = Array.isArray(dashboard?.status_summary) ? dashboard.status_summary : [];
  const damageTypeSummary = Array.isArray(dashboard?.damage_type_summary) ? dashboard.damage_type_summary : [];
  const timeline = Array.isArray(dashboard?.timeline) ? dashboard.timeline : [];

  const districtStats = Array.isArray(adminStats?.district_stats) ? adminStats.district_stats : [];
  const wardStats = Array.isArray(adminStats?.ward_stats) ? adminStats.ward_stats : [];
  const topRoads = Array.isArray(adminStats?.top_roads) ? adminStats.top_roads : [];

  const isDistrictSpecific = Boolean(activeDistrict);
  const distributionData = isDistrictSpecific ? wardStats : districtStats;
  const distributionTitle = isDistrictSpecific
    ? `Tỷ trọng phân bổ sự cố theo Phường (${activeDistrict})`
    : 'Tỷ trọng phân bổ sự cố giữa các Quận/Huyện';

  return (
    <section style={styles.page}>
      <div style={styles.headerRow}>
        <PageHeader
          title="Tổng quan hệ thống"
          subtitle={
            managedDistrict
              ? `Theo dõi tình hình tiếp nhận và xử lý sự cố hạ tầng giao thông trên địa bàn ${managedDistrict}.`
              : 'Theo dõi nhanh tình hình tiếp nhận và xử lý phản ánh hư hỏng mặt đường toàn thành phố.'
          }
        />

        {/* Bộ lọc địa bàn cho Super Admin */}
        {!managedDistrict ? (
          <div style={styles.districtFilterWrap}>
            <FiFilter size={16} color={UI_COLORS.primary} />
            <span style={styles.filterLabel}>Khu vực:</span>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              style={styles.districtSelect}
            >
              <option value="">Toàn thành phố (Tất cả Quận/Huyện)</option>
              {ALL_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div style={styles.lockedDistrictBadge}>
            <FiMapPin size={16} color={UI_COLORS.primary} />
            <span>Địa bàn: <strong>{managedDistrict}</strong></span>
          </div>
        )}
      </div>

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

      {!isLoading && isSuccess && kpis.length === 0 && (!adminStats || adminStats.total_reports === 0) ? (
        <EmptyState
          title="Chưa có số liệu tổng quan"
          description="Hệ thống chưa có đủ dữ liệu để hiển thị thống kê."
        />
      ) : null}

      {!isLoading && isSuccess && (kpis.length > 0 || (adminStats && adminStats.total_reports > 0)) ? (
        <>
          {/* 1. Hàng Thẻ KPI */}
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

          {/* 2. Hàng Biểu đồ Phân bổ Trạng thái & Loại Hư hại */}
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

          {/* 3. Ticket 10: Hàng Biểu đồ Địa giới Hành chính & Top 10 Tuyến đường */}
          <div className="road-dashboard-content-grid" style={styles.grid}>
            <Panel title={distributionTitle}>
              <AdministrativeDistributionChart
                data={distributionData}
                emptyText={
                  isDistrictSpecific
                    ? `Chưa có dữ liệu phân bổ theo phường tại ${activeDistrict}.`
                    : 'Chưa có số liệu phân bổ giữa các quận/huyện.'
                }
              />
            </Panel>

            <Panel title={`Top 10 Tuyến đường có nhiều sự cố nhất${isDistrictSpecific ? ` (${activeDistrict})` : ''}`}>
              <TopDamagedRoadsChart
                data={topRoads}
                emptyText="Chưa có dữ liệu thống kê tuyến đường."
              />
            </Panel>
          </div>

          {/* 4. Ticket 10: Bảng Thống kê Tiến độ Sửa chữa theo Phường */}
          <Panel title={`Tiến độ sửa chữa theo từng Phường${isDistrictSpecific ? ` - ${activeDistrict}` : ''}`}>
            <WardProgressTable
              data={wardStats}
              showDistrict={!isDistrictSpecific}
              emptyText="Chưa có dữ liệu tiến độ của các phường."
            />
          </Panel>

          {/* 5. Biến động theo thời gian */}
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
  headerRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
  },
  districtFilterWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 14px',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    border: `1px solid ${UI_COLORS.border}`,
    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: UI_COLORS.textNavy,
  },
  districtSelect: {
    height: 34,
    padding: '0 10px',
    fontSize: 13,
    fontWeight: 600,
    color: UI_COLORS.text,
    backgroundColor: '#F8FAFC',
    border: `1px solid ${UI_COLORS.border}`,
    borderRadius: 8,
    outline: 'none',
    cursor: 'pointer',
  },
  lockedDistrictBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    backgroundColor: '#EFF6FF',
    color: UI_COLORS.primary,
    borderRadius: 12,
    border: '1px solid #BFDBFE',
    fontSize: 13,
    fontWeight: 600,
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
