import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import ReportTable from '../../components/ReportTable';
import AdministrativeFilterBar from '../../components/gis/AdministrativeFilterBar';
import useAsyncData from '../../hooks/useAsyncData';
import { useAuth } from '../../hooks/useAuth';
import { fetchAdminReports, getReportListErrorMessage } from '../../services/reportAdminService';

const DEFAULT_FILTERS = {
  search: '',
  status: '',
  damageType: '',
};

const PAGE_SIZE = 10;

export default function ReportsPage({ mode = 'all' }) {
  const navigate = useNavigate();
  const isManualReviewMode = mode === 'manual-review';
  const { managedDistrict } = useAuth();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [adminFilters, setAdminFilters] = useState(() => ({
    province: '',
    district: managedDistrict || '',
    ward: '',
    roadName: '',
  }));
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (managedDistrict && adminFilters.district !== managedDistrict) {
      setAdminFilters((current) => ({
        ...current,
        district: managedDistrict,
      }));
    }
  }, [managedDistrict, adminFilters.district]);

  const queryState = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      status: appliedFilters.status,
      damageType: appliedFilters.damageType,
      search: appliedFilters.search,
      province: adminFilters.province,
      district: adminFilters.district,
      ward: adminFilters.ward,
      roadName: adminFilters.roadName,
      aiStatus: isManualReviewMode ? 'manual_review_required' : '',
      reloadKey,
    }),
    [appliedFilters, adminFilters, isManualReviewMode, page, reloadKey],
  );

  const {
    data,
    isLoading,
    isError,
    error,
    reload,
  } = useAsyncData(async () => {
    try {
      return await fetchAdminReports(queryState);
    } catch (requestError) {
      throw new Error(getReportListErrorMessage(requestError));
    }
  }, [
    queryState.page,
    queryState.pageSize,
    queryState.status,
    queryState.damageType,
    queryState.search,
    queryState.province,
    queryState.district,
    queryState.ward,
    queryState.roadName,
    queryState.reloadKey,
  ]);

  const reportItems = Array.isArray(data?.items) ? data.items : [];

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    setAppliedFilters((current) => ({
      ...current,
      search: filters.search.trim(),
    }));
  };

  const handleStatusChange = (value) => {
    setFilters((current) => ({ ...current, status: value }));
    setPage(1);
    setAppliedFilters((current) => ({ ...current, status: value }));
  };

  const handleDamageTypeChange = (value) => {
    setFilters((current) => ({ ...current, damageType: value }));
    setPage(1);
    setAppliedFilters((current) => ({ ...current, damageType: value }));
  };

  const handleAdminFiltersChange = (newFilters) => {
    setAdminFilters(newFilters);
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setAdminFilters({
      province: '',
      district: managedDistrict || '',
      ward: '',
      roadName: '',
    });
    setPage(1);
    setReloadKey((value) => value + 1);
  };

  const handleRetry = () => {
    void reload('refresh');
  };

  return (
    <section style={styles.page}>
      <PageHeader
        title={isManualReviewMode ? 'Ảnh cần kiểm tra thêm' : 'Danh sách phản ánh'}
        subtitle={
          isManualReviewMode
            ? 'Theo dõi các phản ánh đã gửi thành công nhưng AI chưa xác định rõ loại hư hỏng từ ảnh.'
            : 'Xem, tìm kiếm và lọc các phản ánh hư hỏng mặt đường đã được tiếp nhận.'
        }
      />

      <AdministrativeFilterBar
        filters={adminFilters}
        values={adminFilters}
        onChange={handleAdminFiltersChange}
        fixedDistrict={managedDistrict}
      />

      <ReportTable
        title={isManualReviewMode ? 'Danh sách phản ánh cần kiểm tra thêm' : 'Danh sách phản ánh hư hỏng mặt đường'}
        items={reportItems}
        total={Number(data?.total) || 0}
        page={Number(data?.page) || page}
        pageSize={Number(data?.pageSize) || PAGE_SIZE}
        totalPages={Number(data?.totalPages) || 1}
        loading={isLoading}
        error={isError ? error : ''}
        filters={filters}
        onSearchChange={(value) => setFilters((current) => ({ ...current, search: value }))}
        onSearchSubmit={handleSearchSubmit}
        onStatusChange={handleStatusChange}
        onDamageTypeChange={handleDamageTypeChange}
        onResetFilters={handleResetFilters}
        onPageChange={setPage}
        onRetry={handleRetry}
        onViewDetail={(reportId) => {
          if (!reportId) {
            return;
          }

          navigate(`/reports/${reportId}`);
        }}
        manualReviewMode={isManualReviewMode}
      />
    </section>
  );
}

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
};
