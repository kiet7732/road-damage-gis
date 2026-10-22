import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiClientError } from '../../../../../packages/api-client/src';
import { UI_COLORS } from '../../constants/statusColors';
import { formatDateTime, getStatusLabel } from '../../utils/formatters';
import { getEffectiveDamageType } from '../../utils/reportDamage';
import EmptyState from '../../components/EmptyState';
import PageHeader from '../../components/PageHeader';
import Panel from '../../components/Panel';
import ReportImageInspector from '../../components/ReportImageInspector';
import ReportMiniMap from '../../components/ReportMiniMap';
import Skeleton from '../../components/Skeleton';
import { useToast } from '../../components/ToastProvider';
import WebButton from '../../components/WebButton';
import useAsyncData from '../../hooks/useAsyncData';
import {
  fetchAdminReportDetail,
  fetchEngineerTimeline,
  getReportDetailErrorMessage,
  updateAdminReportDamageType,
  updateAdminReportStatus,
} from '../../services/reportDetailService';
import ReportInfoCard from '../../components/report-detail/ReportInfoCard';
import ReportSurveyEvidenceCard from '../../components/report-detail/ReportSurveyEvidenceCard';
import ReportStatusActionCard from '../../components/report-detail/ReportStatusActionCard';
import ReportTimelineCard from '../../components/report-detail/ReportTimelineCard';
import ReportPhotoLightboxModal from '../../components/report-detail/ReportPhotoLightboxModal';

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
  const [selectedPhoto, setSelectedPhoto] = useState(null);

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

  const {
    data: timelineItemsData,
  } = useAsyncData(async () => {
    if (!reportId) {
      return [];
    }

    try {
      const resp = await fetchEngineerTimeline(reportId);
      return Array.isArray(resp?.items) ? resp.items : [];
    } catch (timelineError) {
      console.warn('Không thể tải dòng thời gian kiểm toán:', timelineError);
      return [];
    }
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
        title: 'Tiếp nhận phản ánh từ Công dân',
        description: `Phản ánh được ghi nhận vào lúc ${formatDateTime(activeReport.created_at)}.`,
      },
      {
        key: 'ai',
        title: 'Kết quả nhận dạng AI ban đầu',
        description: activeReport?.ai_result?.message || 'Hệ thống chưa có kết quả nhận dạng.',
      },
    ];

    if (Array.isArray(timelineItemsData) && timelineItemsData.length > 0) {
      const sortedEvents = [...timelineItemsData].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );

      for (const event of sortedEvents) {
        const timeStr = formatDateTime(event.created_at);
        const engineerName = event.engineer_name || 'Kỹ sư hiện trường';

        if (event.action_type === 'claim') {
          items.push({
            key: `action-${event.id}`,
            title: 'Kỹ sư tiếp nhận nhiệm vụ',
            description: `${engineerName} đã tiếp nhận sự cố vào lúc ${timeStr}. Khóa quyền kiểm tra trong 60 phút.`,
          });
        } else if (event.action_type === 'check_in') {
          const dist = event.action_payload_json?.distance_meters != null
            ? `${Number(event.action_payload_json.distance_meters).toFixed(2)}m`
            : '≤ 30m';
          const acc = event.action_payload_json?.gps_accuracy != null
            ? `±${Math.round(event.action_payload_json.gps_accuracy)}m`
            : 'chuẩn';
          items.push({
            key: `action-${event.id}`,
            title: '✓ Xác thực có mặt tại hiện trường (Check-in hợp lệ)',
            description: `${engineerName} đã check-in thành công tại hiện trường (Cự ly: ${dist} ≤ 30m, GPS ${acc}) vào lúc ${timeStr}.`,
            isSuccess: true,
          });
        } else if (event.action_type === 'rejected_check_in') {
          const reason = event.action_payload_json?.rejection_reason === 'mock_location_detected'
            ? 'Phát hiện ứng dụng định vị giả lập (Mock Location)'
            : 'Cự ly check-in vượt quá bán kính 30m';
          items.push({
            key: `action-${event.id}`,
            title: '⚠️ Từ chối check-in (Cảnh báo gian lận vị trí)',
            description: `Hệ thống phát hiện vi phạm: ${reason} vào lúc ${timeStr}. Thao tác bị khóa cứng.`,
            isWarning: true,
          });
        } else if (event.action_type === 'upload_attachment') {
          items.push({
            key: `action-${event.id}`,
            title: 'Chụp ảnh khảo sát thực địa',
            description: `${engineerName} đã tải lên ảnh hiện trường có đóng dấu Watermark tọa độ vào lúc ${timeStr}.`,
          });
        } else if (event.action_type === 'submit_survey') {
          const payload = event.action_payload_json || {};
          items.push({
            key: `action-${event.id}`,
            title: '✓ Hoàn thành nộp phiếu khảo sát kỹ thuật',
            description: `${engineerName} đã nộp phiếu khảo sát: Loại [${payload.verified_damage_type || 'N/A'}], Mức độ [${payload.severity || 'N/A'}], Mức ưu tiên [${payload.priority || 'N/A'}] vào lúc ${timeStr}.`,
            isSuccess: true,
          });
        } else if (event.action_type === 'admin_assign') {
          items.push({
            key: `action-${event.id}`,
            title: 'Cán bộ điều phối phân công',
            description: `Cán bộ đã phân công kỹ sư xử lý vào lúc ${timeStr}.`,
          });
        } else if (event.action_type === 'admin_revoke') {
          items.push({
            key: `action-${event.id}`,
            title: 'Thu hồi quyền kiểm tra sự cố',
            description: `Cán bộ đã thu hồi quyền kiểm tra sự cố vào lúc ${timeStr}.`,
          });
        }
      }
    }

    items.push({
      key: 'updated',
      title: 'Trạng thái hiện tại',
      description: `Trạng thái xử lý là "${getStatusLabel(activeReport.status)}", cập nhật lúc ${formatDateTime(activeReport.updated_at)}.`,
    });

    if (activeReport.admin_note) {
      items.push({
        key: 'admin-note',
        title: 'Ghi chú xử lý của cán bộ',
        description: activeReport.admin_note,
      });
    }

    return items;
  }, [activeReport, timelineItemsData]);

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

          <ReportInfoCard report={activeReport} />

          <ReportSurveyEvidenceCard
            report={activeReport}
            onSelectPhoto={setSelectedPhoto}
          />
        </div>

        <div style={styles.sideColumn}>
          <Panel title="Vị trí trên bản đồ">
            <ReportMiniMap latitude={activeReport.latitude} longitude={activeReport.longitude} />
          </Panel>

          <ReportStatusActionCard
            report={activeReport}
            statusDraft={statusDraft}
            setStatusDraft={setStatusDraft}
            adminNoteDraft={adminNoteDraft}
            setAdminNoteDraft={setAdminNoteDraft}
            isUpdatingStatus={isUpdatingStatus}
            onUpdateStatus={handleUpdateStatus}
            damageTypeDraft={damageTypeDraft}
            setDamageTypeDraft={setDamageTypeDraft}
            isUpdatingDamageType={isUpdatingDamageType}
            onUpdateDamageType={handleUpdateDamageType}
          />

          <ReportTimelineCard historyItems={historyItems} />

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

      <ReportPhotoLightboxModal
        selectedPhoto={selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
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
  actionStack: {
    display: 'grid',
    gap: 10,
  },
};
