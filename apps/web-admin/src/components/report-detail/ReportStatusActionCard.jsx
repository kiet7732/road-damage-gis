import Panel from '../Panel';
import WebButton from '../WebButton';
import { DAMAGE_TYPES, UI_COLORS } from '../../constants/statusColors';
import { getAiPredictedDamageType, getAiPredictedDamageTypeLabel } from '../../utils/reportDamage';
import { STATUS_OPTIONS } from './reportDetailConstants';

export default function ReportStatusActionCard({
  report,
  statusDraft,
  setStatusDraft,
  adminNoteDraft,
  setAdminNoteDraft,
  isUpdatingStatus,
  onUpdateStatus,
  damageTypeDraft,
  setDamageTypeDraft,
  isUpdatingDamageType,
  onUpdateDamageType,
  isApprovingForSurvey,
  onApproveForSurvey,
}) {
  if (!report) return null;

  return (
    <>
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

          <WebButton onClick={onUpdateStatus} disabled={isUpdatingStatus}>
            {isUpdatingStatus ? 'Đang cập nhật...' : 'Lưu trạng thái'}
          </WebButton>
        </div>
      </Panel>

      <Panel title="Chỉnh sửa loại hư hỏng sau xác minh">
        <div style={styles.formStack}>
          <div style={styles.aiInfoBox}>
            <div style={styles.aiInfoTitle}>Kết quả nhận dạng ban đầu</div>
            <div style={styles.aiInfoValue}>
              {getAiPredictedDamageType(report)} - {getAiPredictedDamageTypeLabel(report)}
            </div>
            <div style={styles.aiInfoMeta}>
              {report.is_ai_overridden
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

          <WebButton onClick={onUpdateDamageType} disabled={isUpdatingDamageType}>
            {isUpdatingDamageType ? 'Đang lưu...' : 'Lưu loại hư hỏng'}
          </WebButton>
        </div>
      </Panel>

      <Panel title="Khảo sát thực địa (Kỹ sư giám sát)">
        <div style={styles.formStack}>
          {report.admin_approved_for_survey ? (
            <div style={styles.approvedBanner}>
              <div style={styles.bannerTitle}>✓ Đã phê duyệt cho kiểm tra</div>
              <div style={styles.bannerDesc}>
                Báo cáo này đã được Admin cho phép kiểm tra. Kỹ sư giám sát có thể tiếp nhận và khảo sát ngoài thực địa.
              </div>
            </div>
          ) : (
            <div style={styles.unapprovedBanner}>
              <div style={styles.bannerTitle}>⚠️ Đang ẩn với Kỹ sư giám sát</div>
              <div style={styles.bannerDesc}>
                {report.ai_status === 'no_damage_detected' || (report.ai_result?.detections_count === 0)
                  ? 'Do AI không nhận diện được điểm hư hỏng trong ảnh, báo cáo này chỉ hiển thị với Quản lý.'
                  : 'Báo cáo chưa được kích hoạt khảo sát cho kỹ sư.'}
              </div>
              <WebButton
                onClick={onApproveForSurvey}
                disabled={isApprovingForSurvey}
                style={styles.approveSurveyBtn}
              >
                {isApprovingForSurvey ? 'Đang duyệt...' : 'Xác nhận cho kiểm tra'}
              </WebButton>
            </div>
          )}
        </div>
      </Panel>
    </>
  );
}

const styles = {
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
  approvedBanner: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    border: '1px solid #BBF7D0',
    display: 'grid',
    gap: 4,
  },
  unapprovedBanner: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    border: '1px solid #FDE68A',
    display: 'grid',
    gap: 10,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: '#1E293B',
  },
  bannerDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 1.5,
  },
  approveSurveyBtn: {
    backgroundColor: '#059669',
    color: '#FFF',
    border: 'none',
  },
};
