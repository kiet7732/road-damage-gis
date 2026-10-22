import {
  FiAlertTriangle,
  FiCamera,
  FiCheckCircle,
  FiInfo,
  FiMaximize2,
} from 'react-icons/fi';
import Panel from '../Panel';
import { DAMAGE_TYPES, UI_COLORS } from '../../constants/statusColors';
import { formatDateTime } from '../../utils/formatters';
import { getAiPredictedDamageType } from '../../utils/reportDamage';
import { SEVERITY_CONFIG, PRIORITY_CONFIG } from './reportDetailConstants';
import { DetailItem } from './ReportInfoCard';

export default function ReportSurveyEvidenceCard({ report, onSelectPhoto }) {
  if (!report) return null;

  return (
    <>
      <Panel title="Kết quả khảo sát kỹ thuật thực địa & Giám sát Chống gian lận">
        {/* Anti-Fraud Check-in Status Banner */}
        <div
          style={{
            ...styles.checkinBanner,
            background: report.field_checked_in_at ? '#F0FDF4' : '#FFFBEB',
            borderColor: report.field_checked_in_at ? '#86EFAC' : '#FDE68A',
          }}
        >
          <div style={styles.checkinBannerHeader}>
            {report.field_checked_in_at ? (
              <FiCheckCircle size={20} color="#15803D" />
            ) : (
              <FiAlertTriangle size={20} color="#B45309" />
            )}
            <strong
              style={{
                color: report.field_checked_in_at ? '#15803D' : '#B45309',
                fontSize: 14,
                fontWeight: 900,
              }}
            >
              {report.field_checked_in_at
                ? '✓ ĐÃ XÁC THỰC CÓ MẶT TẠI HIỆN TRƯỜNG (GEOFENCE CHECK-IN HỢP LỆ)'
                : 'CHƯA CHECK-IN TẠI HIỆN TRƯỜNG (CHƯA ĐẾN ĐIỂM SỰ CỐ)'}
            </strong>
          </div>

          {report.field_checked_in_at ? (
            <div style={styles.checkinGrid}>
              <DetailItem
                label="Kỹ sư xác thực"
                value={report.claimed_by_engineer_name || report.claimed_by_engineer_id || 'Kỹ sư hiện trường'}
              />
              <DetailItem
                label="Cự ly tới điểm hư hỏng"
                value={
                  report.field_checked_in_distance_meters != null
                    ? `${Number(report.field_checked_in_distance_meters).toFixed(2)}m (Đạt chuẩn ≤ 30m)`
                    : '≤ 30m'
                }
              />
              <DetailItem
                label="Độ chính xác GPS"
                value={report.field_checked_in_accuracy ? `±${Math.round(report.field_checked_in_accuracy)}m` : 'Chuẩn'}
              />
              <DetailItem
                label="Thời điểm check-in"
                value={formatDateTime(report.field_checked_in_at)}
              />
            </div>
          ) : (
            <div style={styles.checkinMutedText}>
              Kỹ sư chưa kích hoạt radar quét bán kính 30m để xác nhận có mặt tại hiện trường. Hệ thống sẽ ghi nhận lịch sử kiểm toán ngay khi kỹ sư thực hiện.
            </div>
          )}
        </div>

        {/* Technical Survey Results */}
        {report.field_verified_damage_type || report.field_status === 'survey_completed' ? (
          <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
            <div style={styles.infoGrid}>
              <DetailItem
                label="Loại hư hỏng xác minh"
                value={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={styles.verifiedTag}>
                      {report.field_verified_damage_type} - {DAMAGE_TYPES[report.field_verified_damage_type]?.label || 'Chưa xác định'}
                    </span>
                    <span style={styles.comparisonMeta}>
                      {report.field_verified_damage_type === getAiPredictedDamageType(report)
                        ? '(Khớp AI ban đầu)'
                        : `(Đã đính chính từ AI: ${getAiPredictedDamageType(report)})`}
                    </span>
                  </div>
                }
              />
              <DetailItem
                label="Mức độ nghiêm trọng"
                value={
                  report.field_severity ? (
                    <span
                      style={{
                        ...styles.badgePill,
                        color: (SEVERITY_CONFIG[report.field_severity] || SEVERITY_CONFIG['Trung bình']).text,
                        background: (SEVERITY_CONFIG[report.field_severity] || SEVERITY_CONFIG['Trung bình']).background,
                        borderColor: (SEVERITY_CONFIG[report.field_severity] || SEVERITY_CONFIG['Trung bình']).border,
                      }}
                    >
                      {report.field_severity}
                    </span>
                  ) : (
                    'Chưa đánh giá'
                  )
                }
              />
              <DetailItem
                label="Mức độ ưu tiên xử lý"
                value={
                  report.field_priority ? (
                    <span
                      style={{
                        ...styles.badgePill,
                        color: (PRIORITY_CONFIG[report.field_priority] || PRIORITY_CONFIG['Trung bình']).text,
                        background: (PRIORITY_CONFIG[report.field_priority] || PRIORITY_CONFIG['Trung bình']).background,
                        borderColor: (PRIORITY_CONFIG[report.field_priority] || PRIORITY_CONFIG['Trung bình']).border,
                      }}
                    >
                      {report.field_priority}
                    </span>
                  ) : (
                    'Chưa đánh giá'
                  )
                }
              />
              <DetailItem
                label="Thời điểm hoàn thành khảo sát"
                value={formatDateTime(report.survey_completed_at || report.updated_at)}
              />
            </div>

            <div style={styles.noteBox}>
              <strong style={styles.noteTitle}>Ghi chú kỹ thuật & Phương án xử lý của Kỹ sư</strong>
              <div style={styles.noteContent}>
                {report.field_note || 'Kỹ sư không để lại ghi chú kỹ thuật bổ sung.'}
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.surveyEmptyBox}>
            <FiInfo size={18} color={UI_COLORS.textMuted} />
            <span>Chưa có kết quả khảo sát kỹ thuật thực địa. Kỹ sư sẽ gửi phiếu sau khi hoàn tất kiểm tra mặt đường.</span>
          </div>
        )}
      </Panel>

      <Panel title="Hồ sơ ảnh thực địa do Kỹ sư cung cấp (Camera Enforced)">
        {Array.isArray(report.attachments) && report.attachments.length > 0 ? (
          <div style={styles.attachmentsGrid}>
            {report.attachments.map((att, idx) => (
              <div
                key={att.id || idx}
                style={styles.attachmentCard}
                onClick={() => onSelectPhoto(att)}
                title="Bấm để xem ảnh phóng to & Watermark tọa độ"
              >
                <div style={styles.attachmentImageWrap}>
                  <img
                    src={att.file_url}
                    alt={`Ảnh khảo sát ${idx + 1}`}
                    style={styles.attachmentImg}
                  />
                  <div style={styles.attachmentHoverOverlay}>
                    <FiMaximize2 size={20} color="#FFFFFF" />
                    <span style={styles.attachmentHoverText}>Phóng to ảnh</span>
                  </div>
                </div>
                <div style={styles.attachmentMeta}>
                  <div style={styles.attachmentTitle}>Ảnh thực địa #{idx + 1}</div>
                  <div style={styles.attachmentTime}>{formatDateTime(att.created_at)}</div>
                  {att.note ? <div style={styles.attachmentNote}>{att.note}</div> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.surveyEmptyBox}>
            <FiCamera size={20} color={UI_COLORS.textMuted} />
            <span>Chưa có ảnh khảo sát bổ sung từ hiện trường. Các ảnh Kỹ sư chụp trực tiếp sẽ hiển thị tại đây.</span>
          </div>
        )}
      </Panel>
    </>
  );
}

const styles = {
  checkinBanner: {
    padding: 16,
    borderRadius: 14,
    border: '1px solid',
    display: 'grid',
    gap: 12,
  },
  checkinBannerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  checkinGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 10,
  },
  checkinMutedText: {
    color: '#92400E',
    fontSize: 13,
    lineHeight: 1.5,
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 12,
  },
  verifiedTag: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 8,
    background: '#EFF6FF',
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: 800,
  },
  comparisonMeta: {
    color: UI_COLORS.textMuted,
    fontSize: 12,
    fontWeight: 500,
  },
  badgePill: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 8,
    border: '1px solid',
    fontSize: 13,
    fontWeight: 800,
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
  surveyEmptyBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    background: UI_COLORS.surfaceMuted,
    color: UI_COLORS.textMuted,
    fontSize: 13,
    lineHeight: 1.5,
  },
  attachmentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 14,
  },
  attachmentCard: {
    borderRadius: 14,
    border: `1px solid ${UI_COLORS.border}`,
    background: UI_COLORS.surface,
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  attachmentImageWrap: {
    position: 'relative',
    height: 140,
    background: '#0F172A',
    overflow: 'hidden',
  },
  attachmentImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  attachmentHoverOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.45)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    opacity: 0.85,
  },
  attachmentHoverText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 700,
  },
  attachmentMeta: {
    padding: 10,
    display: 'grid',
    gap: 4,
  },
  attachmentTitle: {
    color: UI_COLORS.text,
    fontSize: 13,
    fontWeight: 800,
  },
  attachmentTime: {
    color: UI_COLORS.textMuted,
    fontSize: 11,
  },
  attachmentNote: {
    color: UI_COLORS.text,
    fontSize: 12,
    fontStyle: 'italic',
  },
};
