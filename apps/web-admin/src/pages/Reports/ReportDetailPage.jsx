import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiClientError } from '../../../../../packages/api-client/src';
import { DAMAGE_TYPES, UI_COLORS } from '../../constants/statusColors';
import { formatCoordinate, formatDateTime, getStatusLabel } from '../../utils/formatters';
import {
  getAiPredictedDamageType,
  getAiPredictedDamageTypeLabel,
  getEffectiveDamageType,
  getEffectiveDamageTypeLabel,
} from '../../utils/reportDamage';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import Panel from '../../components/Panel';
import ReportImageInspector from '../../components/ReportImageInspector';
import ReportMiniMap from '../../components/ReportMiniMap';
import Skeleton from '../../components/Skeleton';
import StatusBadge from '../../components/StatusBadge';
import { useToast } from '../../components/ToastProvider';
import WebButton from '../../components/WebButton';
import useAsyncData from '../../hooks/useAsyncData';
import {
  fetchAdminReportDetail,
  getReportDetailErrorMessage,
  updateAdminReportDamageType,
  updateAdminReportStatus,
} from '../../services/reportDetailService';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Chờ xác minh' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'repaired', label: 'Đã sửa chữa' },
  { value: 'rejected', label: 'Từ chối' },
];

function getLocationSourceLabel(source) {
  const normalized = String(source || '').trim().toLowerCase();

  if (normalized === 'map_selected') {
    return 'Người dùng chọn lại vị trí trên bản đồ';
  }

  return 'Vị trí lấy tại nơi chụp ảnh';
}

export default function ReportDetailPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [reportState, setReportState] = useState(null);
  const [statusDraft, setStatusDraft] = useState('pending');
  const [adminNoteDraft, setAdminNoteDraft] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [damageTypeDraft, setDamageTypeDraft] = useState('D40');
  const [isUpdatingDamageType, setIsUpdatingDamageType] = useState(false);

  const {
    data: report,
    isLoading,
    isRefreshing,
    isError,
    error,
    rawError,
    reload,
  } = useAsyncData(async () => {
    if (!reportId) {
      throw new Error('Không tìm thấy mã phản ánh.');
    }

    return fetchAdminReportDetail(reportId);
  }, [reportId]);

  useEffect(() => {
    if (!report) {
      return;
    }

    setReportState(report);
    setStatusDraft(report.status || 'pending');
    setAdminNoteDraft(report.admin_note || '');
    setDamageTypeDraft(getEffectiveDamageType(report));
  }, [report]);

  const activeReport = reportState || report;
  const displayError = isError ? getReportDetailErrorMessage(rawError) : error;
  const isNotFound = rawError instanceof ApiClientError && rawError.status === 404;

  const historyItems = useMemo(() => {
    if (!activeReport) {
      return [];
    }

    const items = [
      {
        key: 'created',
        title: 'Tiếp nhận phản ánh',
        description: `Phản ánh được ghi nhận vào lúc ${formatDateTime(activeReport.created_at)}.`,
      },
      {
        key: 'ai',
        title: 'Kết quả nhận dạng',
        description: activeReport?.ai_result?.message || 'Hệ thống chưa có kết quả nhận dạng.',
      },
      {
        key: 'updated',
        title: 'Cập nhật gần nhất',
        description: `Trạng thái hiện tại là "${getStatusLabel(activeReport.status)}", cập nhật lúc ${formatDateTime(activeReport.updated_at)}.`,
      },
    ];

    if (activeReport.admin_note) {
      items.push({
        key: 'admin-note',
        title: 'Ghi chú xử lý của cán bộ',
        description: activeReport.admin_note,
      });
    }

    return items;
  }, [activeReport]);

  if (isLoading) {
    return (
      <section style={styles.page}>
        <PageHeader
          title="Chi tiết phản ánh"
          subtitle="Đang tải dữ liệu chi tiết phản ánh mặt đường."
        />

        <div style={styles.loadingGrid}>
          <Panel>
            <div style={styles.loadingStack}>
              <Skeleton width="42%" height={22} />
              <Skeleton width="68%" height={14} />
              <Skeleton width="100%" height={360} radius={18} />
            </div>
          </Panel>
          <Panel>
            <div style={styles.loadingStack}>
              <Skeleton width="46%" height={22} />
              <Skeleton width="100%" height={220} radius={16} />
              <Skeleton width="100%" height={120} radius={16} />
            </div>
          </Panel>
        </div>
      </section>
    );
  }

  if (isNotFound) {
    return (
      <section style={styles.page}>
        <PageHeader
          title="Chi tiết phản ánh"
          subtitle="Không tìm thấy dữ liệu với mã phản ánh đã chọn."
        />
        <Panel>
          <EmptyState
            title="Không tìm thấy phản ánh"
            description="Phản ánh có thể đã bị xóa hoặc mã truy cập không còn hợp lệ."
            actionLabel="Quay lại danh sách"
            onAction={() => navigate('/reports')}
          />
        </Panel>
      </section>
    );
  }

  if (isError) {
    return (
      <section style={styles.page}>
        <PageHeader
          title="Chi tiết phản ánh"
          subtitle="Không thể tải dữ liệu phản ánh ở thời điểm hiện tại."
        />
        <Panel>
          <EmptyState
            title="Không tải được chi tiết phản ánh"
            description={displayError || 'Có lỗi xảy ra trong quá trình tải dữ liệu.'}
            actionLabel={isRefreshing ? 'Đang tải lại...' : 'Tải lại'}
            onAction={() => {
              void reload('refresh');
            }}
          />
        </Panel>
      </section>
    );
  }

  if (!activeReport) {
    return null;
  }

  const handleUpdateStatus = async () => {
    if (!reportId || !statusDraft) {
      return;
    }

    setIsUpdatingStatus(true);

    try {
      await updateAdminReportStatus(reportId, {
        status: statusDraft,
        admin_note: adminNoteDraft.trim() || null,
      });

      await reload('refresh');
      showToast('Cập nhật trạng thái báo cáo thành công.');
    } catch (requestError) {
      showToast(getReportDetailErrorMessage(requestError), 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleUpdateDamageType = async () => {
    if (!reportId || !damageTypeDraft) {
      return;
    }

    setIsUpdatingDamageType(true);

    try {
      await updateAdminReportDamageType(reportId, {
        corrected_damage_type: damageTypeDraft,
        is_ai_overridden: true,
      });

      await reload('refresh');
      showToast('Đã cập nhật loại hư hỏng sau xác minh.');
    } catch (requestError) {
      showToast(getReportDetailErrorMessage(requestError), 'error');
    } finally {
      setIsUpdatingDamageType(false);
    }
  };

  return (
    <section style={styles.page}>
      <PageHeader
        title={`Chi tiết phản ánh #${activeReport.id}`}
        subtitle="Xem đầy đủ ảnh hiện trường, kết quả nhận dạng, vị trí bản đồ và thông tin xử lý."
        action={(
          <Link to="/reports" style={styles.backLink}>
            Quay lại danh sách
          </Link>
        )}
      />

      <div className="road-report-detail-layout" style={styles.layout}>
        <div style={styles.mainColumn}>
          <Panel title="Ảnh hiện trường và vùng nhận diện AI">
            <ReportImageInspector report={activeReport} />
          </Panel>

          <Panel title="Thông tin báo cáo">
            <div style={styles.infoGrid}>
              <DetailItem label="Mã phản ánh" value={activeReport.id} />
              <DetailItem label="Người gửi" value={activeReport.user_id || 'Ẩn danh / chưa định danh'} />
              <DetailItem label="Thời điểm ghi nhận" value={formatDateTime(activeReport.created_at)} />
              <DetailItem label="Trạng thái hiện tại" value={<StatusBadge status={activeReport.status} size="sm" />} />
              <DetailItem label="Trạng thái nhận dạng" value={activeReport.ai_status || 'N/A'} />
              <DetailItem label="Số hư hỏng phát hiện" value={String(activeReport?.ai_result?.detections_count ?? 0)} />
              <DetailItem
                label="Loại hư hỏng sử dụng"
                value={`${getEffectiveDamageType(activeReport)} - ${getEffectiveDamageTypeLabel(activeReport)}`}
              />
              <DetailItem
                label="Tọa độ vị trí"
                value={formatCoordinate(activeReport.latitude, activeReport.longitude)}
              />
              <DetailItem
                label="Độ chính xác vị trí"
                value={activeReport.gps_accuracy ? `±${Math.round(activeReport.gps_accuracy)}m` : 'N/A'}
              />
              <DetailItem
                label="Nguồn vị trí"
                value={getLocationSourceLabel(activeReport.location_source)}
              />
              <DetailItem
                label="Thời điểm ghi nhận vị trí"
                value={activeReport.location_recorded_at ? formatDateTime(activeReport.location_recorded_at) : 'N/A'}
              />
            </div>

            <div style={styles.noteBox}>
              <strong style={styles.noteTitle}>Ghi chú thực địa</strong>
              <div style={styles.noteContent}>{activeReport.note || 'Người gửi không để lại ghi chú.'}</div>
            </div>
          </Panel>
        </div>

        <div style={styles.sideColumn}>
          <Panel title="Vị trí trên bản đồ">
            <ReportMiniMap latitude={activeReport.latitude} longitude={activeReport.longitude} />
          </Panel>

          <Panel title="Cập nhật trạng thái xử lý">
            <div style={styles.formStack}>
              <label style={styles.formLabel}>
                <span style={styles.formLabelText}>Trạng thái mới</span>
                <select
                  value={statusDraft}
                  onChange={(event) => setStatusDraft(event.target.value)}
                  disabled={isUpdatingStatus}
                  style={styles.select}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={styles.formLabel}>
                <span style={styles.formLabelText}>Ghi chú xử lý</span>
                <textarea
                  value={adminNoteDraft}
                  onChange={(event) => setAdminNoteDraft(event.target.value)}
                  disabled={isUpdatingStatus}
                  rows={4}
                  placeholder="Nhập nội dung xác minh hoặc tiến độ xử lý..."
                  style={styles.textarea}
                />
              </label>

              <WebButton onClick={handleUpdateStatus} disabled={isUpdatingStatus}>
                {isUpdatingStatus ? 'Đang cập nhật...' : 'Lưu trạng thái'}
              </WebButton>
            </div>
          </Panel>

          <Panel title="Chỉnh sửa loại hư hỏng sau xác minh">
            <div style={styles.formStack}>
              <div style={styles.aiInfoBox}>
                <div style={styles.aiInfoTitle}>Kết quả nhận dạng ban đầu</div>
                <div style={styles.aiInfoValue}>
                  {getAiPredictedDamageType(activeReport)} - {getAiPredictedDamageTypeLabel(activeReport)}
                </div>
                <div style={styles.aiInfoMeta}>
                  {activeReport.is_ai_overridden
                    ? 'Đã được cán bộ hiệu chỉnh.'
                    : 'Chưa có hiệu chỉnh thủ công.'}
                </div>
              </div>

              <label style={styles.formLabel}>
                <span style={styles.formLabelText}>Loại hư hỏng xác minh</span>
                <select
                  value={damageTypeDraft}
                  onChange={(event) => setDamageTypeDraft(event.target.value)}
                  disabled={isUpdatingDamageType}
                  style={styles.select}
                >
                  {Object.entries(DAMAGE_TYPES).map(([key, value]) => (
                    <option key={key} value={key}>
                      {key} - {value.label}
                    </option>
                  ))}
                </select>
              </label>

              <WebButton onClick={handleUpdateDamageType} disabled={isUpdatingDamageType}>
                {isUpdatingDamageType ? 'Đang lưu...' : 'Lưu loại hư hỏng'}
              </WebButton>
            </div>
          </Panel>

          <Panel title="Lịch sử cập nhật">
            <div style={styles.timeline}>
              {historyItems.map((item) => (
                <div key={item.key} style={styles.timelineItem}>
                  <div style={styles.timelineDot} />
                  <div>
                    <div style={styles.timelineTitle}>{item.title}</div>
                    <div style={styles.timelineDescription}>{item.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Thao tác nhanh">
            <div style={styles.actionStack}>
              <WebButton onClick={() => navigate('/reports')}>Về danh sách phản ánh</WebButton>
              <WebButton variant="secondary" onClick={() => navigate('/map')}>
                Xem trên bản đồ
              </WebButton>
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
}

function DetailItem({ label, value }) {
  return (
    <div style={styles.detailCard}>
      <div style={styles.detailLabel}>{label}</div>
      <div style={styles.detailValue}>{value}</div>
    </div>
  );
}

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 0.8fr)',
    gap: 18,
    alignItems: 'start',
  },
  mainColumn: {
    display: 'grid',
    gap: 18,
  },
  sideColumn: {
    display: 'grid',
    gap: 18,
  },
  backLink: {
    color: UI_COLORS.primary,
    fontWeight: 800,
    textDecoration: 'none',
  },
  loadingGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.3fr) minmax(320px, 0.7fr)',
    gap: 18,
  },
  loadingStack: {
    display: 'grid',
    gap: 14,
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 12,
  },
  detailCard: {
    display: 'grid',
    gap: 6,
    padding: 14,
    borderRadius: 14,
    background: UI_COLORS.surfaceMuted,
    border: `1px solid ${UI_COLORS.border}`,
  },
  detailLabel: {
    color: UI_COLORS.textMuted,
    fontSize: 12,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailValue: {
    color: UI_COLORS.text,
    fontSize: 14,
    fontWeight: 800,
    lineHeight: 1.45,
  },
  noteBox: {
    marginTop: 16,
    display: 'grid',
    gap: 10,
    padding: 16,
    borderRadius: 16,
    border: `1px solid ${UI_COLORS.border}`,
    background: UI_COLORS.surfaceMuted,
  },
  noteTitle: {
    color: UI_COLORS.text,
    fontSize: 14,
    fontWeight: 900,
  },
  noteContent: {
    color: UI_COLORS.textMuted,
    fontSize: 14,
    lineHeight: 1.6,
  },
  aiInfoBox: {
    display: 'grid',
    gap: 6,
    padding: 14,
    borderRadius: 14,
    border: `1px solid ${UI_COLORS.border}`,
    background: UI_COLORS.surfaceMuted,
  },
  aiInfoTitle: {
    color: UI_COLORS.textMuted,
    fontSize: 12,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  aiInfoValue: {
    color: UI_COLORS.text,
    fontSize: 15,
    fontWeight: 900,
  },
  aiInfoMeta: {
    color: UI_COLORS.textMuted,
    fontSize: 13,
    lineHeight: 1.5,
  },
  formStack: {
    display: 'grid',
    gap: 14,
  },
  formLabel: {
    display: 'grid',
    gap: 8,
  },
  formLabelText: {
    color: UI_COLORS.text,
    fontSize: 13,
    fontWeight: 900,
  },
  select: {
    minHeight: 44,
    padding: '0 14px',
    borderRadius: 12,
    border: `1px solid ${UI_COLORS.border}`,
    background: UI_COLORS.surface,
    color: UI_COLORS.text,
    fontSize: 14,
    outline: 'none',
  },
  textarea: {
    width: '100%',
    minHeight: 110,
    padding: 12,
    borderRadius: 12,
    border: `1px solid ${UI_COLORS.border}`,
    background: UI_COLORS.surface,
    color: UI_COLORS.text,
    fontSize: 14,
    lineHeight: 1.5,
    resize: 'vertical',
    boxSizing: 'border-box',
    outline: 'none',
  },
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
  actionStack: {
    display: 'grid',
    gap: 10,
  },
};
