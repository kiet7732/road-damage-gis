import Panel from '../Panel';
import StatusBadge from '../StatusBadge';
import { UI_COLORS } from '../../constants/statusColors';
import { formatCoordinate, formatDateTime } from '../../utils/formatters';
import { getEffectiveDamageType, getEffectiveDamageTypeLabel } from '../../utils/reportDamage';
import { getLocationSourceLabel } from './reportDetailConstants';

export function DetailItem({ label, value }) {
  return (
    <div style={styles.detailCard}>
      <div style={styles.detailLabel}>{label}</div>
      <div style={styles.detailValue}>{value}</div>
    </div>
  );
}

export default function ReportInfoCard({ report }) {
  if (!report) return null;

  return (
    <Panel title="Thông tin báo cáo">
      <div style={styles.infoGrid}>
        <DetailItem label="Mã phản ánh" value={report.id} />
        <DetailItem label="Người gửi" value={report.user_id || 'Ẩn danh / chưa định danh'} />
        <DetailItem label="Thời điểm ghi nhận" value={formatDateTime(report.created_at)} />
        <DetailItem label="Trạng thái hiện tại" value={<StatusBadge status={report.status} size="sm" />} />
        <DetailItem label="Trạng thái nhận dạng" value={report.ai_status || 'N/A'} />
        <DetailItem label="Số hư hỏng phát hiện" value={String(report?.ai_result?.detections_count ?? 0)} />
        <DetailItem
          label="Loại hư hỏng sử dụng"
          value={`${getEffectiveDamageType(report)} - ${getEffectiveDamageTypeLabel(report)}`}
        />
        <DetailItem
          label="Địa chỉ ghi nhận"
          value={report.formatted_address || [report.road_name, report.ward, report.district].filter(Boolean).join(', ') || 'Đang cập nhật địa chỉ...'}
        />
        <DetailItem
          label="Tọa độ vị trí"
          value={formatCoordinate(report.latitude, report.longitude)}
        />
        <DetailItem
          label="Độ chính xác vị trí"
          value={report.gps_accuracy ? `±${Math.round(report.gps_accuracy)}m` : 'N/A'}
        />
        <DetailItem
          label="Nguồn vị trí"
          value={getLocationSourceLabel(report.location_source)}
        />
        <DetailItem
          label="Thời điểm ghi nhận vị trí"
          value={report.location_recorded_at ? formatDateTime(report.location_recorded_at) : 'N/A'}
        />
      </div>

      <div style={styles.noteBox}>
        <strong style={styles.noteTitle}>Ghi chú thực địa</strong>
        <div style={styles.noteContent}>{report.note || 'Người gửi không để lại ghi chú.'}</div>
      </div>
    </Panel>
  );
}

const styles = {
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
};
