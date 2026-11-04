import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAlertCircle,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiCompass,
  FiEye,
  FiMapPin,
  FiRefreshCw,
  FiSearch,
  FiX,
} from 'react-icons/fi';
import AdministrativeFilterBar from '../gis/AdministrativeFilterBar';
import EmptyState from '../EmptyState';
import Panel from '../Panel';
import { TableSkeleton } from '../Skeleton';
import StatusBadge from '../StatusBadge';
import { useToast } from '../ToastProvider';
import WebButton from '../WebButton';
import { UI_COLORS } from '../../constants/statusColors';
import useAsyncData from '../../hooks/useAsyncData';
import { useAuth } from '../../hooks/useAuth';
import {
  approveReportForSurvey,
  fetchAdminReports,
  getReportImageUrl,
  getReportListErrorMessage,
} from '../../services/reportAdminService';
import { formatAccuracy, formatCoordinate, formatDateTime } from '../../utils/formatters';

const PAGE_SIZE = 10;

export default function NoDamageReportsView() {
  const navigate = useNavigate();
  const { managedDistrict } = useAuth();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [approvalFilter, setApprovalFilter] = useState(''); // '' | 'unapproved' | 'approved'
  const [adminFilters, setAdminFilters] = useState(() => ({
    province: '',
    district: managedDistrict || '',
    ward: '',
    roadName: '',
  }));
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  // Approval modal state
  const [approvingReport, setApprovingReport] = useState(null);
  const [approvalNote, setApprovalNote] = useState('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Photo lightbox modal state
  const [lightboxImageUrl, setLightboxImageUrl] = useState(null);

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
      search: appliedSearch,
      province: adminFilters.province,
      district: adminFilters.district,
      ward: adminFilters.ward,
      roadName: adminFilters.roadName,
      hasDamageDetected: false,
      reloadKey,
    }),
    [appliedSearch, adminFilters, page, reloadKey],
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
    queryState.search,
    queryState.province,
    queryState.district,
    queryState.ward,
    queryState.roadName,
    queryState.hasDamageDetected,
    queryState.reloadKey,
  ]);

  const rawItems = Array.isArray(data?.items) ? data.items : [];
  
  // Client-side filtering by approval state if selected
  const items = useMemo(() => {
    if (!approvalFilter) return rawItems;
    if (approvalFilter === 'approved') {
      return rawItems.filter((r) => Boolean(r.admin_approved_for_survey));
    }
    if (approvalFilter === 'unapproved') {
      return rawItems.filter((r) => !r.admin_approved_for_survey);
    }
    return rawItems;
  }, [rawItems, approvalFilter]);

  const total = Number(data?.total) || 0;
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(search.trim());
  };

  const handleAdminFiltersChange = (newFilters) => {
    setAdminFilters(newFilters);
    setPage(1);
  };

  const handleConfirmApproval = async () => {
    if (!approvingReport) return;
    try {
      setIsSubmittingApproval(true);
      await approveReportForSurvey(approvingReport.id, approvalNote);
      showToast({
        title: 'Đã xác nhận cho kiểm tra',
        message: `Phản ánh #${approvingReport.id.slice(0, 8)} đã được phê duyệt và hiển thị với Kỹ sư giám sát.`,
        type: 'success',
      });
      setApprovingReport(null);
      setApprovalNote('');
      setReloadKey((prev) => prev + 1);
    } catch (err) {
      showToast({
        title: 'Lỗi phê duyệt',
        message: err?.message || 'Không thể phê duyệt phản ánh.',
        type: 'error',
      });
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Thông tin giải thích nghiệp vụ */}
      <div style={styles.noticeBanner}>
        <div style={styles.noticeIcon}>
          <FiAlertCircle size={22} color="#D97706" />
        </div>
        <div style={styles.noticeContent}>
          <div style={styles.noticeTitle}>
            Báo cáo AI không phát hiện hư hỏng nhưng Người dân vẫn gửi
          </div>
          <div style={styles.noticeDesc}>
            Các phản ánh này <strong>chỉ hiển thị đối với Quản lý (Admin)</strong> và tạm thời bị ẩn khỏi Kỹ sư giám sát.
            Quản lý cần xem xét hình ảnh hiện trường, tọa độ GPS EXIF. Khi bấm nút <strong>"Cho kiểm tra"</strong>, báo cáo sẽ chính thức hiển thị với Kỹ sư giám sát để nhận nhiệm vụ khảo sát thực địa.
          </div>
        </div>
      </div>

      <AdministrativeFilterBar
        filters={adminFilters}
        values={adminFilters}
        onChange={handleAdminFiltersChange}
        fixedDistrict={managedDistrict}
      />

      <Panel>
        <div style={styles.tableHeader}>
          <div style={styles.headerTitles}>
            <h3 style={styles.tableTitle}>Báo cáo chờ duyệt khảo sát (AI không nhận diện được)</h3>
            <span style={styles.tableSubtitle}>
              Tổng cộng {total} phản ánh không có hư hỏng AI nhận dạng
            </span>
          </div>

          <div style={styles.filterRow}>
            <form style={styles.searchForm} onSubmit={handleSearchSubmit}>
              <div style={styles.searchBox}>
                <FiSearch size={16} color={UI_COLORS.textMuted} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo mã phản ánh, địa chỉ..."
                  style={styles.searchInput}
                />
              </div>
              <WebButton type="submit" style={styles.searchBtn}>
                Tìm
              </WebButton>
            </form>

            <select
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value)}
              style={styles.select}
            >
              <option value="">Tất cả trạng thái duyệt</option>
              <option value="unapproved">Chưa duyệt (Đang ẩn với Kỹ sư)</option>
              <option value="approved">Đã duyệt cho kiểm tra</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : isError ? (
          <EmptyState
            title="Lỗi tải dữ liệu"
            description={error || 'Không thể kết nối máy chủ.'}
            actionLabel="Thử lại"
            onAction={() => reload('refresh')}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="Không có báo cáo nào"
            description="Hiện không có báo cáo nào mà AI không nhận diện được hư hỏng trong danh mục này."
          />
        ) : (
          <>
            <div style={styles.tableScroll}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.trHead}>
                    <th style={styles.th}>Ảnh hiện trường</th>
                    <th style={styles.th}>Mã & Thời gian</th>
                    <th style={styles.th}>Vị trí & GPS EXIF</th>
                    <th style={styles.th}>Kết quả AI</th>
                    <th style={styles.th}>Quyền Kỹ sư</th>
                    <th style={{ ...styles.th, textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((report) => {
                    const isApproved = Boolean(report.admin_approved_for_survey);
                    const coords = formatCoordinate(report.latitude, report.longitude);
                    const accuracy = formatAccuracy(report.gps_accuracy);
                    const imageUrl = getReportImageUrl(report.image_url);

                    return (
                      <tr key={report.id} style={styles.trBody}>
                        <td style={styles.td}>
                          <div
                            style={styles.thumbnailWrapper}
                            onClick={() => imageUrl && setLightboxImageUrl(imageUrl)}
                            title="Bấm để xem ảnh phóng to"
                          >
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt="Ảnh hiện trường"
                                style={styles.thumbnail}
                                loading="lazy"
                              />
                            ) : (
                              <div style={styles.noThumbnail}>Không có ảnh</div>
                            )}
                          </div>
                        </td>

                        <td style={styles.td}>
                          <div style={styles.reportId} title={report.id}>
                            #{report.id.slice(0, 8)}
                          </div>
                          <div style={styles.timeText}>
                            <FiClock size={12} style={{ marginRight: 4 }} />
                            {formatDateTime(report.created_at)}
                          </div>
                          {report.note ? (
                            <div style={styles.noteSnippet} title={report.note}>
                              💬 {report.note}
                            </div>
                          ) : null}
                        </td>

                        <td style={styles.td}>
                          <div style={styles.addressLine}>
                            <FiMapPin size={14} color="#0284C7" style={{ flexShrink: 0, marginTop: 2 }} />
                            <span>
                              {report.formatted_address ||
                                [report.road_name, report.ward, report.district].filter(Boolean).join(', ') ||
                                coords}
                            </span>
                          </div>
                          <div style={styles.gpsLine}>
                            <FiCompass size={12} color="#64748B" style={{ flexShrink: 0 }} />
                            <span>
                              {coords} ({accuracy})
                              {report.location_source === 'camera_exif' ? (
                                <span style={styles.exifBadge}>EXIF GPS</span>
                              ) : null}
                            </span>
                          </div>
                        </td>

                        <td style={styles.td}>
                          <span style={styles.noDamageAiTag}>
                            0 hư hại phát hiện
                          </span>
                          <div style={styles.aiMessageText}>
                            {report.ai_result?.message || 'Không tìm thấy điểm hư hỏng.'}
                          </div>
                        </td>

                        <td style={styles.td}>
                          {isApproved ? (
                            <span style={styles.approvedTag}>
                              <FiCheckCircle size={13} style={{ marginRight: 4 }} />
                              Đã cho kiểm tra
                            </span>
                          ) : (
                            <span style={styles.unapprovedTag}>
                              <FiAlertCircle size={13} style={{ marginRight: 4 }} />
                              Ẩn với Kỹ sư
                            </span>
                          )}
                        </td>

                        <td style={{ ...styles.td, textAlign: 'right' }}>
                          <div style={styles.actionsWrap}>
                            {!isApproved ? (
                              <WebButton
                                size="sm"
                                style={styles.approveBtn}
                                onClick={() => {
                                  setApprovingReport(report);
                                  setApprovalNote('');
                                }}
                              >
                                <FiCheck size={14} style={{ marginRight: 4 }} />
                                Cho kiểm tra
                              </WebButton>
                            ) : null}

                            <WebButton
                              variant="secondary"
                              size="sm"
                              onClick={() => navigate(`/reports/${report.id}`)}
                            >
                              <FiEye size={14} style={{ marginRight: 4 }} />
                              Chi tiết
                            </WebButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Phân trang */}
            <div style={styles.pagination}>
              <span style={styles.paginationText}>
                Trang {page} / {totalPages} (Tổng {total} báo cáo)
              </span>
              <div style={styles.paginationButtons}>
                <WebButton
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Trang trước
                </WebButton>
                <WebButton
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Trang sau
                </WebButton>
              </div>
            </div>
          </>
        )}
      </Panel>

      {/* Modal xác nhận phê duyệt cho kiểm tra */}
      {approvingReport ? (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Xác nhận cho Kỹ sư kiểm tra</h3>
              <button
                type="button"
                style={styles.modalCloseBtn}
                onClick={() => setApprovingReport(null)}
              >
                <FiX size={20} />
              </button>
            </div>

            <div style={styles.modalBody}>
              <p style={{ margin: '0 0 12px', fontSize: 14, color: '#334155' }}>
                Bạn đang cho phép khảo sát đối với phản ánh <strong>#{approvingReport.id.slice(0, 8)}</strong> tại{' '}
                <strong>
                  {approvingReport.road_name || approvingReport.formatted_address || 'Vị trí đã chọn'}
                </strong>.
              </p>
              <div style={styles.modalWarningBox}>
                Báo cáo này ban đầu AI không nhận diện được điểm hư hại. Sau khi xác nhận, báo cáo sẽ{' '}
                <strong>ngay lập tức hiển thị trên ứng dụng của Kỹ sư giám sát</strong> để tiếp nhận khảo sát.
              </div>

              <label style={styles.modalLabel}>
                <span>Ghi chú của Quản trị viên (tùy chọn):</span>
                <textarea
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  placeholder="Ví dụ: Người dân phản ánh có ổ gà ngập nước, giao kỹ sư kiểm tra thực tế..."
                  rows={3}
                  style={styles.modalTextarea}
                />
              </label>
            </div>

            <div style={styles.modalFooter}>
              <WebButton
                variant="secondary"
                onClick={() => setApprovingReport(null)}
                disabled={isSubmittingApproval}
              >
                Hủy bỏ
              </WebButton>
              <WebButton
                onClick={handleConfirmApproval}
                disabled={isSubmittingApproval}
                style={styles.confirmApproveBtn}
              >
                {isSubmittingApproval ? 'Đang duyệt...' : 'Xác nhận cho kiểm tra'}
              </WebButton>
            </div>
          </div>
        </div>
      ) : null}

      {/* Lightbox phóng to ảnh */}
      {lightboxImageUrl ? (
        <div style={styles.modalOverlay} onClick={() => setLightboxImageUrl(null)}>
          <div style={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxImageUrl}
              alt="Ảnh phóng to"
              style={styles.lightboxImage}
            />
            <button
              type="button"
              style={styles.lightboxCloseBtn}
              onClick={() => setLightboxImageUrl(null)}
            >
              <FiX size={24} color="#FFF" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  noticeBanner: {
    display: 'flex',
    gap: 14,
    padding: '16px 20px',
    backgroundColor: '#FEF3C7',
    border: '1px solid #FDE68A',
    borderRadius: 14,
    alignItems: 'flex-start',
  },
  noticeIcon: {
    flexShrink: 0,
    marginTop: 2,
  },
  noticeContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: '#92400E',
  },
  noticeDesc: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 1.5,
  },
  tableHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  headerTitles: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  tableTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 800,
    color: UI_COLORS.text,
  },
  tableSubtitle: {
    fontSize: 13,
    color: UI_COLORS.textMuted,
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  searchForm: {
    display: 'flex',
    gap: 8,
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    border: '1px solid #E2E8F0',
    borderRadius: 8,
    padding: '0 10px',
    backgroundColor: '#FFF',
    minWidth: 240,
    height: 38,
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: 13,
    width: '100%',
  },
  searchBtn: {
    height: 38,
    padding: '0 14px',
  },
  select: {
    height: 38,
    borderRadius: 8,
    border: '1px solid #E2E8F0',
    backgroundColor: '#FFF',
    padding: '0 10px',
    fontSize: 13,
    color: UI_COLORS.text,
    outline: 'none',
  },
  tableScroll: {
    overflowX: 'auto',
    width: '100%',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  trHead: {
    borderBottom: '2px solid #E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  th: {
    padding: '12px 14px',
    fontSize: 12,
    fontWeight: 700,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trBody: {
    borderBottom: '1px solid #F1F5F9',
    transition: 'background 0.15s ease',
  },
  td: {
    padding: '14px',
    fontSize: 13,
    verticalAlign: 'middle',
  },
  thumbnailWrapper: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  noThumbnail: {
    width: '100%',
    height: '100%',
    display: 'grid',
    placeItems: 'center',
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
  },
  reportId: {
    fontWeight: 800,
    color: UI_COLORS.text,
    fontSize: 13,
  },
  timeText: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  noteSnippet: {
    fontSize: 12,
    color: '#334155',
    marginTop: 4,
    fontStyle: 'italic',
    maxWidth: 220,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  addressLine: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
    fontWeight: 600,
    color: UI_COLORS.text,
    maxWidth: 320,
  },
  gpsLine: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  exifBadge: {
    marginLeft: 6,
    backgroundColor: '#E0F2FE',
    color: '#0369A1',
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: 4,
  },
  noDamageAiTag: {
    display: 'inline-block',
    backgroundColor: '#F1F5F9',
    color: '#475569',
    fontWeight: 700,
    fontSize: 12,
    padding: '3px 8px',
    borderRadius: 6,
    border: '1px solid #CBD5E1',
  },
  aiMessageText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 3,
  },
  approvedTag: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    fontWeight: 700,
    fontSize: 12,
    padding: '4px 10px',
    borderRadius: 12,
  },
  unapprovedTag: {
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    color: '#B45309',
    fontWeight: 700,
    fontSize: 12,
    padding: '4px 10px',
    borderRadius: 12,
  },
  actionsWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  approveBtn: {
    backgroundColor: '#059669',
    color: '#FFF',
    border: 'none',
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTop: '1px solid #E2E8F0',
    marginTop: 14,
  },
  paginationText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: 600,
  },
  paginationButtons: {
    display: 'flex',
    gap: 8,
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'grid',
    placeItems: 'center',
    zIndex: 9999,
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #E2E8F0',
  },
  modalTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 800,
    color: UI_COLORS.text,
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#64748B',
    display: 'grid',
    placeItems: 'center',
  },
  modalBody: {
    padding: '18px 20px',
  },
  modalWarningBox: {
    backgroundColor: '#EFF6FF',
    border: '1px solid #BFDBFE',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 1.5,
    marginBottom: 16,
  },
  modalLabel: {
    display: 'grid',
    gap: 6,
    fontSize: 13,
    fontWeight: 600,
    color: '#475569',
  },
  modalTextarea: {
    width: '100%',
    borderRadius: 8,
    border: '1px solid #CBD5E1',
    padding: '10px',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  modalFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    padding: '14px 20px',
    borderTop: '1px solid #E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  confirmApproveBtn: {
    backgroundColor: '#059669',
    color: '#FFF',
    border: 'none',
  },
  lightboxContent: {
    position: 'relative',
    maxWidth: '90vw',
    maxHeight: '90vh',
    display: 'grid',
    placeItems: 'center',
  },
  lightboxImage: {
    maxWidth: '100%',
    maxHeight: '85vh',
    borderRadius: 12,
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
    objectFit: 'contain',
  },
  lightboxCloseBtn: {
    position: 'absolute',
    top: -16,
    right: -16,
    background: '#1E293B',
    border: '2px solid #FFF',
    borderRadius: '50%',
    width: 36,
    height: 36,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
  },
};
