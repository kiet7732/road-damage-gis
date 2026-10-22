import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiTrendingUp } from 'react-icons/fi';
import DashboardLineChart from '../../components/DashboardLineChart';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import Panel from '../../components/Panel';
import { DashboardSkeleton } from '../../components/Skeleton';
import { UI_COLORS } from '../../constants/statusColors';
import useAsyncData from '../../hooks/useAsyncData';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchAdminDashboard,
  fetchAdministrativeStats,
  getDashboardErrorMessage,
} from '../../services/dashboardService';
import { exportReports, fetchAdminReports } from '../../services/reportAdminService';
import ExportModal from '../../components/ExportModal';
import { PRESETS, getPresetDates } from '../../constants/statisticsConstants';
import StatisticsFilterBar from '../../components/statistics/StatisticsFilterBar';
import StatisticsKpiCards from '../../components/statistics/StatisticsKpiCards';
import DamageTypeDistributionCard from '../../components/statistics/DamageTypeDistributionCard';
import StatisticsRankingsPanel from '../../components/statistics/StatisticsRankingsPanel';

export default function StatisticsPage() {
  const { managedDistrict } = useAuth();
  const [selectedDistrict, setSelectedDistrict] = useState(managedDistrict || '');
  const [selectedPreset, setSelectedPreset] = useState('30days');
  const [customFromDate, setCustomFromDate] = useState(() => {
    const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  });
  const [customToDate, setCustomToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [activeTab, setActiveTab] = useState('roads'); // 'roads' | 'wards'
  const [isExporting, setIsExporting] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState('');

  // Đồng bộ managedDistrict nếu tài khoản bị khóa theo quận
  useEffect(() => {
    if (managedDistrict && selectedDistrict !== managedDistrict) {
      setSelectedDistrict(managedDistrict);
    }
  }, [managedDistrict, selectedDistrict]);

  const activeDistrict = managedDistrict || selectedDistrict || null;

  // Xác định khoảng ngày hiệu lực
  const { effectiveFromDate, effectiveToDate } = useMemo(() => {
    if (selectedPreset === 'custom') {
      return {
        effectiveFromDate: customFromDate || '',
        effectiveToDate: customToDate || '',
      };
    }
    const dates = getPresetDates(selectedPreset);
    return {
      effectiveFromDate: dates?.fromDate || '',
      effectiveToDate: dates?.toDate || '',
    };
  }, [selectedPreset, customFromDate, customToDate]);

  // Tải dữ liệu thống kê từ backend
  const loadStatsData = useCallback(async () => {
    try {
      const [dash, admin] = await Promise.all([
        fetchAdminDashboard({
          district: activeDistrict,
          from_date: effectiveFromDate || undefined,
          to_date: effectiveToDate || undefined,
        }),
        fetchAdministrativeStats({
          district: activeDistrict,
          from_date: effectiveFromDate || undefined,
          to_date: effectiveToDate || undefined,
        }),
      ]);
      return { dashboard: dash, adminStats: admin };
    } catch (err) {
      throw new Error(getDashboardErrorMessage(err));
    }
  }, [activeDistrict, effectiveFromDate, effectiveToDate]);

  const {
    data: bundle,
    isLoading,
    isRefreshing,
    isError,
    error,
    reload,
  } = useAsyncData(loadStatsData, [activeDistrict, effectiveFromDate, effectiveToDate]);

  const dashboard = bundle?.dashboard;
  const adminStats = bundle?.adminStats;

  const totalReports = dashboard?.total_reports ?? 0;
  const statusSummary = dashboard?.status_summary ?? [];
  const damageTypeSummary = dashboard?.damage_type_summary ?? [];
  const timeline = dashboard?.timeline ?? [];

  const pendingCount = statusSummary.find((s) => s.key === 'pending')?.value ?? 0;
  const processingCount = statusSummary.find((s) => s.key === 'processing')?.value ?? 0;
  const repairedCount = statusSummary.find((s) => s.key === 'repaired')?.value ?? 0;
  const completionRate = totalReports > 0 ? Math.round((repairedCount / totalReports) * 100) : 0;

  const topRoads = Array.isArray(adminStats?.top_roads) ? adminStats.top_roads : [];
  const wardStats = Array.isArray(adminStats?.ward_stats) ? adminStats.ward_stats : [];

  // Xử lý xuất file báo cáo Excel (.xlsx) / CSV (.csv)
  const handleExport = async ({ format = 'xlsx', includeImage = false } = {}) => {
    try {
      setIsExporting(true);
      setExportNotice('');

      const res = await fetchAdminReports({
        page: 1,
        pageSize: 2000,
        district: activeDistrict || '',
        fromDate: effectiveFromDate || '',
        toDate: effectiveToDate || '',
      });

      const reports = res?.items || [];
      if (reports.length === 0) {
        setExportNotice('Không có sự cố nào trong khoảng thời gian đã chọn để xuất file.');
        setIsExportModalOpen(false);
        return;
      }

      const districtTag = activeDistrict ? `-${activeDistrict.replace(/\s+/g, '_')}` : '';
      const dateTag = effectiveFromDate && effectiveToDate
        ? `-${effectiveFromDate}_den_${effectiveToDate}`
        : `-${new Date().toISOString().slice(0, 10)}`;
      const ext = format === 'csv' ? 'csv' : 'xlsx';
      const filename = `Bao_cao_thong_ke_hu_hong_mat_duong${districtTag}${dateTag}.${ext}`;
      const reportTitle = `BÁO CÁO THỐNG KÊ HƯ HỎNG MẶT ĐƯỜNG${activeDistrict ? ` - ${activeDistrict.toUpperCase()}` : ''}`;

      exportReports({
        reports,
        format,
        includeImage,
        customFilename: filename,
        title: reportTitle,
      });

      setIsExportModalOpen(false);
      setExportNotice(`Đã xuất thành công ${reports.length} bản ghi ra file "${filename}"!`);
      setTimeout(() => setExportNotice(''), 5000);
    } catch (err) {
      console.error('Lỗi khi xuất báo cáo thống kê:', err);
      setExportNotice('Có lỗi xảy ra khi tải dữ liệu xuất báo cáo. Vui lòng thử lại.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section style={styles.page}>
      {/* 1. Tiêu đề trang */}
      <PageHeader
        title="Thống kê & Báo cáo"
        subtitle="Tổng hợp số liệu hư hỏng mặt đường, phân tích cơ cấu hư hại và xuất báo cáo quản lý theo chu kỳ."
      />

      {/* 2. Thanh bộ lọc thời gian & địa bàn tinh gọn */}
      <StatisticsFilterBar
        selectedPreset={selectedPreset}
        setSelectedPreset={setSelectedPreset}
        customFromDate={customFromDate}
        setCustomFromDate={setCustomFromDate}
        customToDate={customToDate}
        setCustomToDate={setCustomToDate}
        activeDistrict={activeDistrict}
        setSelectedDistrict={setSelectedDistrict}
        managedDistrict={managedDistrict}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onExportCsv={() => handleExport({ format: 'csv', includeImage: false })}
        isExporting={isExporting}
        totalReports={totalReports}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        onReload={reload}
        exportNotice={exportNotice}
      />

      {/* Hộp thoại tùy chọn xuất báo cáo XLSX / CSV */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        totalCount={totalReports}
        onExport={handleExport}
        isExporting={isExporting}
      />

      {/* Thông báo lỗi nếu có */}
      {isError ? (
        <EmptyState
          title="Không thể tải số liệu thống kê"
          description={error?.message || 'Có lỗi xảy ra khi kết nối máy chủ.'}
          actionLabel="Thử lại"
          onAction={reload}
        />
      ) : null}

      {/* Hiệu ứng tải dữ liệu */}
      {isLoading ? <DashboardSkeleton /> : null}

      {!isLoading && !isError ? (
        <>
          {/* 3. Hàng thẻ KPIs chỉ số trong kỳ */}
          <StatisticsKpiCards
            totalReports={totalReports}
            pendingCount={pendingCount}
            processingCount={processingCount}
            repairedCount={repairedCount}
            completionRate={completionRate}
          />

          {/* 4. Khu vực Biểu đồ & Cơ cấu hư hại */}
          <div style={styles.analyticsGrid}>
            <DamageTypeDistributionCard
              totalReports={totalReports}
              damageTypeSummary={damageTypeSummary}
            />

            {/* Diễn biến theo thời gian */}
            <Panel style={styles.analyticsPanel}>
              <div style={styles.panelHeader}>
                <div>
                  <h3 style={styles.panelTitle}>Diễn biến phát sinh theo thời gian</h3>
                  <div style={styles.panelSubtitle}>
                    Xu hướng số lượng sự cố phản ánh và trạng thái qua các mốc
                  </div>
                </div>
                <FiTrendingUp size={18} color="#0284c7" />
              </div>

              {timeline.length === 0 ? (
                <div style={styles.emptyCardContent}>Chưa có đủ số liệu thời gian để vẽ biểu đồ.</div>
              ) : (
                <div style={styles.chartWrapper}>
                  <DashboardLineChart data={timeline} />
                </div>
              )}
            </Panel>
          </div>

          {/* 5. Bảng xếp hạng Tuyến đường & Phường trọng điểm */}
          <StatisticsRankingsPanel
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            topRoads={topRoads}
            wardStats={wardStats}
          />
        </>
      ) : null}
    </section>
  );
}

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    width: '100%',
    boxSizing: 'border-box',
  },
  analyticsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
    gap: 16,
  },
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
  chartWrapper: {
    width: '100%',
    minHeight: 240,
  },
  emptyCardContent: {
    padding: 30,
    textAlign: 'center',
    fontSize: 13,
    color: UI_COLORS.textMuted,
  },
};
