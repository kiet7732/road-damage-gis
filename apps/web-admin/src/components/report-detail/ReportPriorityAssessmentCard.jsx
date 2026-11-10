import { FiActivity, FiAward, FiCheckCircle, FiCpu, FiLayers } from 'react-icons/fi';
import Panel from '../Panel';
import { DAMAGE_TYPES, UI_COLORS } from '../../constants/statusColors';
import { getReportPriorityAssessment, PRIORITY_LEVEL_METADATA } from '../../utils/reportDamage';

const ALL_LEVEL_KEYS = ['level_1', 'level_2', 'level_3', 'level_4'];

export default function ReportPriorityAssessmentCard({ report }) {
  if (!report) return null;

  const assessment = getReportPriorityAssessment(report);
  const allDetections = Array.isArray(report?.ai_result?.detections)
    ? [...report.ai_result.detections].sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0))
    : [];

  const gaugePercent = Math.min(100, Math.max(0, (assessment.scorePercent / 200) * 100));

  return (
    <Panel title="Phân tích Chỉ số Ưu tiên Xử lý Kỹ thuật (S_priority – 4 Cấp bậc)">
      {/* Top Summary Banner */}
      <div
        style={{
          ...styles.heroBanner,
          background: assessment.backgroundColor,
          borderColor: assessment.borderColor,
        }}
      >
        <div style={styles.heroLeft}>
          <div style={styles.eyebrowRow}>
            <span
              style={{
                ...styles.sourcePill,
                color: assessment.color,
                borderColor: assessment.borderColor,
              }}
            >
              {assessment.isFieldVerified ? (
                <>
                  <FiCheckCircle size={13} /> Đã xác minh thực địa bởi Kỹ sư
                </>
              ) : (
                <>
                  <FiCpu size={13} /> Tự động xếp hạng bởi Mô hình Thị giác Máy tính (AI)
                </>
              )}
            </span>
            <span style={styles.thresholdBadge}>{assessment.thresholdText}</span>
          </div>

          <div style={{ ...styles.heroLevelTitle, color: assessment.color }}>
            {assessment.effectiveLevelLabel}
          </div>

          <div style={styles.formulaLine}>
            <strong>Công thức tính điểm gộp:</strong> {assessment.formulaText}
          </div>

          {assessment.isFieldVerified && assessment.levelCode !== assessment.effectiveLevelCode ? (
            <div style={styles.overrideNotice}>
              Ghi chú đối sánh: Suy luận AI ban đầu xếp ở mức <strong>{assessment.levelLabel}</strong> ({assessment.scorePercent}%),
              đã được Kỹ sư hiện trường thẩm định thực tế và cập nhật thành <strong>{assessment.effectiveLevelLabel}</strong>.
            </div>
          ) : null}
        </div>

        <div
          style={{
            ...styles.scoreCircle,
            borderColor: assessment.color,
            color: assessment.color,
          }}
        >
          <span style={styles.scoreLabel}>S_priority</span>
          <strong style={styles.scoreBigValue}>{assessment.scorePercent}%</strong>
          <span style={styles.scoreSubValue}>({assessment.score.toFixed(2)} / 2.00)</span>
        </div>
      </div>

      {/* Visual Scale 0% -> 200% */}
      <div style={styles.scaleContainer}>
        <div style={styles.scaleHeader}>
          <span style={styles.scaleTitle}>
            <FiActivity size={14} /> Thang chuẩn hóa chỉ số gộp S_priority (0% – 200%)
          </span>
          <span style={styles.scaleValueText}>
            Giá trị hiện tại: <strong style={{ color: assessment.color }}>{assessment.scorePercent}% ({assessment.score.toFixed(2)})</strong>
          </span>
        </div>

        <div style={styles.scaleTrackWrap}>
          <div style={styles.scaleTrack}>
            <div style={{ ...styles.scaleZone, width: '40%', background: '#99F6E4' }} title="Cấp 4: < 80%" />
            <div style={{ ...styles.scaleZone, width: '20%', background: '#FCD34D' }} title="Cấp 3: 80% - < 120%" />
            <div style={{ ...styles.scaleZone, width: '20%', background: '#FDBA74' }} title="Cấp 2: 120% - < 160%" />
            <div style={{ ...styles.scaleZone, width: '20%', background: '#FDA4AF' }} title="Cấp 1: ≥ 160%" />
          </div>
          {assessment.totalDetectionsCount > 0 ? (
            <div
              style={{
                ...styles.scaleMarker,
                left: `calc(${gaugePercent}% - 8px)`,
                background: assessment.color,
              }}
              title={`S_priority = ${assessment.scorePercent}%`}
            />
          ) : null}
        </div>

        <div style={styles.scaleTicks}>
          <span>0% (0.0)</span>
          <span>Cấp 4 (&lt; 80%)</span>
          <span>80% (0.8)</span>
          <span>Cấp 3</span>
          <span>120% (1.2)</span>
          <span>Cấp 2</span>
          <span>160% (1.6)</span>
          <span>Cấp 1 (≥ 160%)</span>
          <span>200% (2.0)</span>
        </div>
      </div>

      {/* Top 2 Detections Extraction Breakdown */}
      <div style={styles.sectionBlock}>
        <div style={styles.sectionHeading}>
          <FiLayers size={15} color={UI_COLORS.primary} />
          <span>Bóc tách tỷ lệ phần trăm tin cậy từ khung hình ({allDetections.length} đối tượng phát hiện)</span>
        </div>
        <div style={styles.ruleHint}>
          Quy tắc thuật toán: Sắp xếp tất cả đối tượng hư hỏng phát hiện trong khung hình (thuộc 1 đến 4 nhãn D00, D10, D20, D40) theo tỷ lệ tin cậy giảm dần. Lấy <strong>2 tỷ lệ cao nhất</strong> gộp lại (nếu khung hình chỉ có 1 đối tượng thì lấy tỷ lệ duy nhất đó) để xác định $S_{'{'}priority{'}'}$.
        </div>

        {allDetections.length > 0 ? (
          <div style={styles.detectionChipGrid}>
            {allDetections.map((det, idx) => {
              const isSelectedTop2 = idx < 2;
              const pct = (Number(det.confidence || 0) * 100).toFixed(1);
              const dType = det.damage_type || 'D40';
              const dLabel = DAMAGE_TYPES[dType]?.label || 'Hư hỏng mặt đường';

              return (
                <div
                  key={`${dType}-${idx}`}
                  style={{
                    ...styles.detectionCard,
                    borderColor: isSelectedTop2 ? assessment.color : UI_COLORS.border,
                    background: isSelectedTop2 ? assessment.backgroundColor : UI_COLORS.surfaceMuted,
                  }}
                >
                  <div style={styles.detectionCardTop}>
                    <span
                      style={{
                        ...styles.rankTag,
                        background: isSelectedTop2 ? assessment.color : '#64748B',
                      }}
                    >
                      {isSelectedTop2 ? `★ Tỷ lệ cao #${idx + 1} (Cộng vào S_priority)` : `Đối tượng #${idx + 1} (Không cộng)`}
                    </span>
                    <strong style={{ fontSize: 15, color: isSelectedTop2 ? assessment.color : UI_COLORS.text }}>
                      {pct}%
                    </strong>
                  </div>
                  <div style={styles.detectionCardTitle}>
                    {dType} – {dLabel}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={styles.emptyDetections}>
            Khung hình này chưa có đối tượng hư hỏng nào được mô hình AI trích xuất tự động.
          </div>
        )}
      </div>

      {/* Technical Interpretation & 4-Level Standard Matrix */}
      <div style={styles.sectionBlock}>
        <div style={styles.sectionHeading}>
          <FiAward size={15} color={UI_COLORS.primary} />
          <span>Bảng chuẩn hóa 4 Cấp bậc Kỹ thuật & Diễn giải chuyên môn</span>
        </div>

        <div style={styles.levelsGrid}>
          {ALL_LEVEL_KEYS.map((lvlKey) => {
            const meta = PRIORITY_LEVEL_METADATA[lvlKey];
            const isCurrent = assessment.effectiveLevelCode === lvlKey;

            return (
              <div
                key={lvlKey}
                style={{
                  ...styles.levelCard,
                  borderColor: isCurrent ? meta.color : UI_COLORS.border,
                  background: isCurrent ? meta.backgroundColor : '#FFFFFF',
                  boxShadow: isCurrent ? `0 0 0 2px ${meta.borderColor}` : 'none',
                }}
              >
                <div style={styles.levelCardHeader}>
                  <span
                    style={{
                      ...styles.levelTitlePill,
                      color: meta.color,
                      background: meta.backgroundColor,
                      borderColor: meta.borderColor,
                    }}
                  >
                    {meta.label}
                  </span>
                  {isCurrent ? (
                    <span style={{ ...styles.activeMarker, background: meta.color }}>
                      ĐANG ÁP DỤNG
                    </span>
                  ) : null}
                </div>

                <div style={styles.levelThreshold}>
                  Ngưỡng chuẩn: <strong>{meta.thresholdText}</strong>
                </div>

                <p style={styles.levelDescription}>{meta.technicalDescription}</p>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

const styles = {
  heroBanner: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    borderRadius: 16,
    border: '1.5px solid',
  },
  heroLeft: {
    flex: '1 1 380px',
    display: 'grid',
    gap: 8,
  },
  eyebrowRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  sourcePill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    background: '#FFFFFF',
    border: '1px solid',
  },
  thresholdBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    color: UI_COLORS.text,
    background: 'rgba(255,255,255,0.8)',
    border: `1px solid ${UI_COLORS.border}`,
  },
  heroLevelTitle: {
    fontSize: 20,
    fontWeight: 900,
    letterSpacing: -0.3,
  },
  formulaLine: {
    fontSize: 13.5,
    color: UI_COLORS.text,
    lineHeight: 1.5,
  },
  overrideNotice: {
    marginTop: 4,
    padding: '8px 12px',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.85)',
    border: `1px dashed ${UI_COLORS.border}`,
    fontSize: 12.5,
    color: UI_COLORS.text,
    lineHeight: 1.5,
  },
  scoreCircle: {
    minWidth: 128,
    padding: '12px 18px',
    borderRadius: 16,
    background: '#FFFFFF',
    border: '2px solid',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.85,
  },
  scoreBigValue: {
    fontSize: 26,
    fontWeight: 900,
    lineHeight: 1.2,
  },
  scoreSubValue: {
    fontSize: 11.5,
    fontWeight: 700,
    opacity: 0.8,
  },
  scaleContainer: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    background: UI_COLORS.surfaceMuted,
    border: `1px solid ${UI_COLORS.border}`,
    display: 'grid',
    gap: 8,
  },
  scaleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  scaleTitle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12.5,
    fontWeight: 800,
    color: UI_COLORS.text,
  },
  scaleValueText: {
    fontSize: 12.5,
    color: UI_COLORS.textMuted,
  },
  scaleTrackWrap: {
    position: 'relative',
    padding: '6px 0',
  },
  scaleTrack: {
    display: 'flex',
    height: 12,
    borderRadius: 999,
    overflow: 'hidden',
    border: `1px solid ${UI_COLORS.border}`,
  },
  scaleZone: {
    height: '100%',
    borderRight: '1px solid rgba(255,255,255,0.8)',
  },
  scaleMarker: {
    position: 'absolute',
    top: 2,
    width: 16,
    height: 20,
    borderRadius: 6,
    border: '2px solid #FFFFFF',
    boxShadow: '0 2px 6px rgba(15,23,42,0.35)',
  },
  scaleTicks: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    fontWeight: 700,
    color: UI_COLORS.textMuted,
  },
  sectionBlock: {
    marginTop: 18,
    display: 'grid',
    gap: 10,
  },
  sectionHeading: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    fontWeight: 900,
    color: UI_COLORS.text,
  },
  ruleHint: {
    fontSize: 13,
    color: UI_COLORS.textMuted,
    lineHeight: 1.55,
  },
  detectionChipGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 10,
  },
  detectionCard: {
    padding: 12,
    borderRadius: 12,
    border: '1.5px solid',
    display: 'grid',
    gap: 6,
  },
  detectionCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  rankTag: {
    padding: '3px 8px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    color: '#FFFFFF',
  },
  detectionCardTitle: {
    fontSize: 13.5,
    fontWeight: 800,
    color: UI_COLORS.text,
  },
  emptyDetections: {
    padding: 12,
    borderRadius: 12,
    background: UI_COLORS.surfaceMuted,
    border: `1px solid ${UI_COLORS.border}`,
    fontSize: 13,
    color: UI_COLORS.textMuted,
  },
  levelsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 12,
  },
  levelCard: {
    padding: 14,
    borderRadius: 14,
    border: '1.5px solid',
    display: 'grid',
    gap: 8,
    alignContent: 'start',
  },
  levelCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  levelTitlePill: {
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12.5,
    fontWeight: 900,
    border: '1px solid',
  },
  activeMarker: {
    padding: '3px 8px',
    borderRadius: 999,
    fontSize: 10.5,
    fontWeight: 900,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  levelThreshold: {
    fontSize: 12.5,
    color: UI_COLORS.text,
  },
  levelDescription: {
    margin: 0,
    fontSize: 12.5,
    color: UI_COLORS.textMuted,
    lineHeight: 1.55,
    textAlign: 'justify',
  },
};
