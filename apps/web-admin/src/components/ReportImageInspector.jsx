import { useEffect, useMemo, useState } from 'react';
import {
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiMaximize2,
  FiSmartphone,
  FiX,
} from 'react-icons/fi';
import { DAMAGE_TYPE_COLORS, DAMAGE_TYPES, UI_COLORS } from '../constants/statusColors';
import { getReportImageUrl } from '../services/reportAdminService';

function formatConfidence(value) {
  const confidence = Number(value);
  if (!Number.isFinite(confidence)) {
    return 'N/A';
  }

  return `${Math.round(confidence * 100)}%`;
}

export default function ReportImageInspector({ report }) {
  const [naturalDims, setNaturalDims] = useState(null);
  const [showBoxes, setShowBoxes] = useState(true);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const detections = Array.isArray(report?.ai_result?.detections) ? report.ai_result.detections : [];
  const imageWidth = Number(report?.ai_result?.image_width);
  const imageHeight = Number(report?.ai_result?.image_height);

  // Tính toán kích thước hiệu dụng để xác định hướng ảnh (dọc hay ngang)
  const effectiveWidth = Number.isFinite(imageWidth) && imageWidth > 0 ? imageWidth : naturalDims?.width || 0;
  const effectiveHeight = Number.isFinite(imageHeight) && imageHeight > 0 ? imageHeight : naturalDims?.height || 0;
  const isPortrait = effectiveWidth > 0 && effectiveHeight > 0 ? effectiveHeight > effectiveWidth : false;

  const canDrawBoxes = effectiveWidth > 0 && effectiveHeight > 0;

  // Lắng nghe phím Escape để đóng lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isLightboxOpen) {
        setIsLightboxOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen]);

  const overlays = useMemo(() => {
    if (!canDrawBoxes) {
      return [];
    }

    return detections
      .map((detection, index) => {
        const bbox = detection?.bbox;
        if (!bbox) {
          return null;
        }

        const left = (Number(bbox.x1) / effectiveWidth) * 100;
        const top = (Number(bbox.y1) / effectiveHeight) * 100;
        const width = ((Number(bbox.x2) - Number(bbox.x1)) / effectiveWidth) * 100;
        const height = ((Number(bbox.y2) - Number(bbox.y1)) / effectiveHeight) * 100;

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
      })
      .filter(Boolean);
  }, [canDrawBoxes, detections, effectiveHeight, effectiveWidth]);

  const imageUrl = report?.image_url ? getReportImageUrl(report.image_url) : '';

  return (
    <div style={styles.container}>
      {/* Khung hiển thị ảnh tối ưu cho cả ảnh chụp dọc và ngang */}
      <div style={styles.imageStage}>
        {imageUrl ? (
          <>
            {/* Lớp nền mờ Ambient Backdrop tạo chiều sâu thẩm mỹ khi xem ảnh dọc */}
            {isPortrait ? (
              <img
                src={imageUrl}
                alt=""
                aria-hidden="true"
                style={styles.ambientBlur}
              />
            ) : null}

            {/* Khung chính chứa ảnh và tọa độ Bounding Box khớp chuẩn 1:1 */}
            <div style={styles.imageWrapper}>
              <img
                src={imageUrl}
                alt={report?.id || 'Ảnh báo cáo hiện trường'}
                onLoad={(e) => {
                  if (!naturalDims) {
                    setNaturalDims({
                      width: e.target.naturalWidth,
                      height: e.target.naturalHeight,
                    });
                  }
                }}
                style={isPortrait ? styles.imagePortrait : styles.imageLandscape}
              />

              {canDrawBoxes && showBoxes ? (
                <div style={styles.overlay}>
                  {overlays.map((overlay) => {
                    const boxColor = DAMAGE_TYPE_COLORS[overlay.damageType] || UI_COLORS.primary;
                    return (
                      <div
                        key={overlay.id}
                        style={{
                          ...styles.box,
                          left: `${overlay.left}%`,
                          top: `${overlay.top}%`,
                          width: `${overlay.width}%`,
                          height: `${overlay.height}%`,
                          borderColor: boxColor,
                        }}
                      >
                        <span
                          style={{
                            ...styles.boxLabel,
                            background: boxColor,
                          }}
                        >
                          {overlay.damageType} · {formatConfidence(overlay.confidence)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {/* Các nút công cụ nổi trên khung ảnh */}
            <div style={styles.floatingControls}>
              <div style={styles.floatingLeft}>
                {isPortrait ? (
                  <span style={styles.portraitBadge} title="Ảnh chụp theo chiều dọc từ ứng dụng di động">
                    <FiSmartphone size={13} />
                    <span>Ảnh dọc di động</span>
                  </span>
                ) : null}
              </div>

              <div style={styles.floatingRight}>
                {canDrawBoxes && overlays.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowBoxes((v) => !v)}
                    style={styles.floatingBtn}
                    title={showBoxes ? 'Tạm ẩn các hộp đánh dấu nhận diện AI' : 'Hiển thị hộp đánh dấu AI'}
                  >
                    {showBoxes ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                    <span>{showBoxes ? 'Ẩn hộp AI' : 'Hiện hộp AI'}</span>
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  style={styles.floatingBtn}
                  title="Phóng to ảnh toàn màn hình để kiểm tra chi tiết"
                >
                  <FiMaximize2 size={14} />
                  <span>Phóng to</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={styles.empty}>Không có ảnh báo cáo hiện trường</div>
        )}
      </div>

      {/* Thẻ chú giải & kết quả nhận diện AI */}
      <div style={styles.legendWrap}>
        <div style={styles.legendHeader}>
          <strong style={styles.legendTitle}>Kết quả nhận diện AI</strong>
          {detections.length > 0 ? (
            <span style={styles.detectionCountBadge}>
              Phát hiện {detections.length} vùng hư hỏng
            </span>
          ) : null}
        </div>

        {detections.length > 0 ? (
          <div style={styles.legendList}>
            {detections.map((detection, index) => {
              const damageType = detection?.damage_type || 'D40';
              const dotColor = DAMAGE_TYPE_COLORS[damageType] || UI_COLORS.primary;
              return (
                <div key={`${damageType}-${index}`} style={styles.legendItem}>
                  <span
                    style={{
                      ...styles.legendDot,
                      background: dotColor,
                    }}
                  />
                  <div>
                    <div style={styles.legendItemTitle}>
                      {damageType} - {DAMAGE_TYPES[damageType]?.label || 'Chưa xác định'}
                    </div>
                    <div style={styles.legendMeta}>
                      Độ tin cậy (Confidence): <strong>{formatConfidence(detection?.confidence)}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={styles.legendEmpty}>
            Hệ thống chưa nhận dạng rõ loại hư hỏng từ ảnh này. Cán bộ có thể kiểm tra và cập nhật lại ở bảng bên phải.
          </div>
        )}
      </div>

      {/* Lightbox xem ảnh toàn màn hình khi cần soi kỹ chi tiết vết nứt/ổ gà */}
      {isLightboxOpen && imageUrl ? (
        <div style={styles.lightboxBackdrop} onClick={() => setIsLightboxOpen(false)}>
          <div style={styles.lightboxContainer} onClick={(e) => e.stopPropagation()}>
            <div style={styles.lightboxHeader}>
              <div style={styles.lightboxTitleWrap}>
                <span style={styles.lightboxBadge}>CHẾ ĐỘ SOI CHI TIẾT</span>
                <strong style={styles.lightboxTitle}>Ảnh hiện trường #{report?.id || ''}</strong>
              </div>
              <div style={styles.lightboxHeaderActions}>
                {canDrawBoxes && overlays.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowBoxes((v) => !v)}
                    style={styles.lightboxToolBtn}
                  >
                    {showBoxes ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                    <span>{showBoxes ? 'Ẩn hộp AI' : 'Hiện hộp AI'}</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(false)}
                  style={styles.lightboxCloseBtn}
                  title="Đóng (Phím Esc)"
                  aria-label="Đóng phóng to"
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>

            <div style={styles.lightboxBody}>
              <div style={styles.lightboxImageWrap}>
                <img
                  src={imageUrl}
                  alt={report?.id || 'Ảnh chi tiết'}
                  style={styles.lightboxImg}
                />
                {canDrawBoxes && showBoxes ? (
                  <div style={styles.overlay}>
                    {overlays.map((overlay) => {
                      const boxColor = DAMAGE_TYPE_COLORS[overlay.damageType] || UI_COLORS.primary;
                      return (
                        <div
                          key={`lightbox-${overlay.id}`}
                          style={{
                            ...styles.box,
                            left: `${overlay.left}%`,
                            top: `${overlay.top}%`,
                            width: `${overlay.width}%`,
                            height: `${overlay.height}%`,
                            borderColor: boxColor,
                            borderWidth: 3,
                          }}
                        >
                          <span
                            style={{
                              ...styles.boxLabel,
                              background: boxColor,
                            }}
                          >
                            {overlay.damageType} · {formatConfidence(overlay.confidence)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  container: {
    display: 'grid',
    gap: 16,
  },
  imageStage: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 18,
    border: `1px solid ${UI_COLORS.border}`,
    background: 'radial-gradient(ellipse at center, #1E293B 0%, #0B132B 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 320,
    maxHeight: 'min(70vh, 540px)',
    boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.35)',
  },
  ambientBlur: {
    position: 'absolute',
    inset: -30,
    width: 'calc(100% + 60px)',
    height: 'calc(100% + 60px)',
    objectFit: 'cover',
    filter: 'blur(28px) brightness(0.4)',
    opacity: 0.65,
    pointerEvents: 'none',
  },
  imageWrapper: {
    position: 'relative',
    display: 'inline-block',
    lineHeight: 0,
    maxWidth: '100%',
    maxHeight: 'min(70vh, 540px)',
    zIndex: 2,
    boxShadow: '0 10px 32px rgba(0, 0, 0, 0.45)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePortrait: {
    display: 'block',
    maxWidth: '100%',
    maxHeight: 'min(70vh, 540px)',
    width: 'auto',
    height: 'auto',
    objectFit: 'contain',
  },
  imageLandscape: {
    display: 'block',
    maxWidth: '100%',
    maxHeight: 'min(70vh, 540px)',
    width: '100%',
    height: 'auto',
    objectFit: 'contain',
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
    borderRadius: 6,
  },
  boxLabel: {
    position: 'absolute',
    left: 0,
    top: -26,
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 22,
    padding: '0 7px',
    borderRadius: 6,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 900,
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.35)',
  },
  floatingControls: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
    pointerEvents: 'none',
  },
  floatingLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    pointerEvents: 'auto',
  },
  floatingRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    pointerEvents: 'auto',
  },
  portraitBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 10px',
    borderRadius: 999,
    background: 'rgba(15, 23, 42, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(8px)',
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: 700,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
  },
  floatingBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 999,
    border: '1px solid rgba(255, 255, 255, 0.25)',
    background: 'rgba(15, 23, 42, 0.82)',
    backdropFilter: 'blur(8px)',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    transition: 'background-color 0.15s ease',
  },
  empty: {
    minHeight: 300,
    display: 'grid',
    placeItems: 'center',
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: 700,
  },
  legendWrap: {
    display: 'grid',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    background: UI_COLORS.surfaceMuted,
    border: `1px solid ${UI_COLORS.border}`,
  },
  legendHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  legendTitle: {
    color: UI_COLORS.text,
    fontSize: 15,
    fontWeight: 900,
  },
  detectionCountBadge: {
    fontSize: 11,
    fontWeight: 800,
    color: UI_COLORS.primary,
    backgroundColor: '#EFF6FF',
    border: '1px solid #BFDBFE',
    padding: '3px 8px',
    borderRadius: 6,
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
  lightboxBackdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 10000,
    backgroundColor: 'rgba(11, 19, 43, 0.92)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    boxSizing: 'border-box',
  },
  lightboxContainer: {
    background: '#0F172A',
    borderRadius: 20,
    maxWidth: '94vw',
    maxHeight: '94vh',
    width: 'auto',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
  },
  lightboxHeader: {
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
  },
  lightboxTitleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  lightboxBadge: {
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 0.5,
    color: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    padding: '2px 7px',
    borderRadius: 4,
  },
  lightboxTitle: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 800,
  },
  lightboxHeaderActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  lightboxToolBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 12px',
    borderRadius: 8,
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  lightboxCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    color: '#E2E8F0',
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  lightboxBody: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    overflow: 'auto',
    maxHeight: 'calc(94vh - 80px)',
  },
  lightboxImageWrap: {
    position: 'relative',
    display: 'inline-block',
    lineHeight: 0,
    borderRadius: 8,
    overflow: 'hidden',
  },
  lightboxImg: {
    display: 'block',
    maxWidth: '88vw',
    maxHeight: 'calc(94vh - 120px)',
    width: 'auto',
    height: 'auto',
    objectFit: 'contain',
  },
};
