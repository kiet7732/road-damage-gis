import { useMemo } from 'react';
import { DAMAGE_TYPE_COLORS, DAMAGE_TYPES, UI_COLORS } from '../constants/statusColors';
import { getReportImageUrl } from '../services/reportAdminService';

export default function ReportImageInspector({ report }) {
  const detections = Array.isArray(report?.ai_result?.detections) ? report.ai_result.detections : [];
  const imageWidth = Number(report?.ai_result?.image_width);
  const imageHeight = Number(report?.ai_result?.image_height);
  const canDrawBoxes = Number.isFinite(imageWidth) && imageWidth > 0 && Number.isFinite(imageHeight) && imageHeight > 0;

  const overlays = useMemo(() => {
    if (!canDrawBoxes) {
      return [];
    }

    return detections.map((detection, index) => {
      const bbox = detection?.bbox;
      if (!bbox) {
        return null;
      }

      const left = (Number(bbox.x1) / imageWidth) * 100;
      const top = (Number(bbox.y1) / imageHeight) * 100;
      const width = ((Number(bbox.x2) - Number(bbox.x1)) / imageWidth) * 100;
      const height = ((Number(bbox.y2) - Number(bbox.y1)) / imageHeight) * 100;

      if (![left, top, width, height].every((value) => Number.isFinite(value))) {
        return null;
      }

      return {
        id: `${detection?.damage_type || 'damage'}-${index}`,
        left,
        top,
        width,
        height,
        damageType: detection?.damage_type || 'D40',
        confidence: detection?.confidence,
      };
    }).filter(Boolean);
  }, [canDrawBoxes, detections, imageHeight, imageWidth]);

  return (
    <div style={styles.container}>
      <div style={styles.imageFrame}>
        {report?.image_url ? (
          <>
            <img
              src={getReportImageUrl(report.image_url)}
              alt={report?.id || 'Ảnh báo cáo'}
              style={styles.image}
            />

            {canDrawBoxes ? (
              <div style={styles.overlay}>
                {overlays.map((overlay) => (
                  <div
                    key={overlay.id}
                    style={{
                      ...styles.box,
                      left: `${overlay.left}%`,
                      top: `${overlay.top}%`,
                      width: `${overlay.width}%`,
                      height: `${overlay.height}%`,
                      borderColor: DAMAGE_TYPE_COLORS[overlay.damageType] || UI_COLORS.primary,
                    }}
                  >
                    <span
                      style={{
                        ...styles.boxLabel,
                        background: DAMAGE_TYPE_COLORS[overlay.damageType] || UI_COLORS.primary,
                      }}
                    >
                      {overlay.damageType} · {formatConfidence(overlay.confidence)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <div style={styles.empty}>Không có ảnh báo cáo</div>
        )}
      </div>

      <div style={styles.legendWrap}>
        <strong style={styles.legendTitle}>Kết quả nhận diện AI</strong>
        {detections.length > 0 ? (
          <div style={styles.legendList}>
            {detections.map((detection, index) => {
              const damageType = detection?.damage_type || 'D40';
              return (
                <div key={`${damageType}-${index}`} style={styles.legendItem}>
                  <span
                    style={{
                      ...styles.legendDot,
                      background: DAMAGE_TYPE_COLORS[damageType] || UI_COLORS.primary,
                    }}
                  />
                  <div>
                    <div style={styles.legendItemTitle}>
                      {damageType} - {DAMAGE_TYPES[damageType]?.label || 'Chưa xác định'}
                    </div>
                    <div style={styles.legendMeta}>
                      Confidence: {formatConfidence(detection?.confidence)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={styles.legendEmpty}>Hệ thống chưa nhận dạng rõ loại hư hỏng từ ảnh này. Cán bộ có thể kiểm tra và cập nhật lại.</div>
        )}
      </div>
    </div>
  );
}

function formatConfidence(value) {
  const confidence = Number(value);
  if (!Number.isFinite(confidence)) {
    return 'N/A';
  }

  return `${Math.round(confidence * 100)}%`;
}

const styles = {
  container: {
    display: 'grid',
    gap: 16,
  },
  imageFrame: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 18,
    border: `1px solid ${UI_COLORS.border}`,
    background: '#0F172A',
  },
  image: {
    width: '100%',
    display: 'block',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
  },
  box: {
    position: 'absolute',
    border: '3px solid',
    boxSizing: 'border-box',
    borderRadius: 8,
  },
  boxLabel: {
    position: 'absolute',
    left: 0,
    top: -28,
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 24,
    padding: '0 8px',
    borderRadius: 8,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 900,
    whiteSpace: 'nowrap',
  },
  empty: {
    minHeight: 320,
    display: 'grid',
    placeItems: 'center',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 800,
  },
  legendWrap: {
    display: 'grid',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    background: UI_COLORS.surfaceMuted,
    border: `1px solid ${UI_COLORS.border}`,
  },
  legendTitle: {
    color: UI_COLORS.text,
    fontSize: 15,
    fontWeight: 900,
  },
  legendList: {
    display: 'grid',
    gap: 10,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginTop: 5,
    flex: '0 0 12px',
  },
  legendItemTitle: {
    color: UI_COLORS.text,
    fontSize: 14,
    fontWeight: 800,
  },
  legendMeta: {
    marginTop: 4,
    color: UI_COLORS.textMuted,
    fontSize: 12,
  },
  legendEmpty: {
    color: UI_COLORS.textMuted,
    fontSize: 13,
    lineHeight: 1.5,
  },
};
