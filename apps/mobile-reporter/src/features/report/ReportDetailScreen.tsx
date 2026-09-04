import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../../components/AppIcon';
import AppButton from '../../components/AppButton';
import InfoCard from '../../components/InfoCard';
import { SkeletonBlock } from '../../components/Skeleton';
import StateMessage from '../../components/StateMessage';
import StatusBadge from '../../components/StatusBadge';
import { colors, damageTypeTheme, iconSize, radius, spacing } from '../../constants/theme';
import {
  fetchReportDetail,
  getDamageTypeDisplayLabel,
  getLocationSourceLabel,
  getReportDetailErrorMessage,
} from '../../services/reportService';
import type { RootStackParamList } from '../../types/navigation';
import type { DamageDetection, ReportDetail } from '../../types/roadDamage';

type ReportDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'ReportDetailScreen'>;

export default function ReportDetailScreen({ route }: ReportDetailScreenProps) {
  const { reportId } = route.params;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  const [photoNaturalSize, setPhotoNaturalSize] = useState({ width: 1, height: 1 });
  const [photoZoom, setPhotoZoom] = useState(1);
  const isMountedRef = useRef(true);
  const latestRequestIdRef = useRef(0);

  const loadReport = useCallback(async () => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    setIsLoading(true);
    setError('');

    try {
      const nextReport = await fetchReportDetail(reportId);
      if (!isMountedRef.current || latestRequestIdRef.current !== requestId) {
        return;
      }
      setReport(nextReport);
    } catch (loadError) {
      if (!isMountedRef.current || latestRequestIdRef.current !== requestId) {
        return;
      }
      setReport(null);
      setError(getReportDetailErrorMessage(loadError));
    } finally {
      if (isMountedRef.current && latestRequestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [reportId]);

  useEffect(() => {
    loadReport();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadReport]);

  useEffect(() => {
    if (!report?.photoUri) {
      setPhotoNaturalSize({ width: 1, height: 1 });
      return;
    }

    Image.getSize(
      report.photoUri,
      (imageWidth, imageHeight) => {
        if (imageWidth > 0 && imageHeight > 0) {
          setPhotoNaturalSize({ width: imageWidth, height: imageHeight });
        }
      },
      () => {
        setPhotoNaturalSize({ width: 1, height: 1 });
      },
    );
  }, [report?.photoUri]);

  useEffect(() => {
    if (!isPhotoViewerOpen) {
      setPhotoZoom(1);
    }
  }, [isPhotoViewerOpen]);

  const finalDamageTheme = report ? (damageTypeTheme[report.type] ?? damageTypeTheme.D40) : null;
  const viewerMaxWidth = Math.max(220, width - spacing.xl);
  const viewerMaxHeight = Math.max(240, height - Math.max(insets.top, spacing.xl) - 160);
  const aspectRatio = photoNaturalSize.width / photoNaturalSize.height || 1;
  const fittedImageSize = getFittedImageSize(viewerMaxWidth, viewerMaxHeight, aspectRatio);
  const zoomedImageWidth = fittedImageSize.width * photoZoom;
  const zoomedImageHeight = fittedImageSize.height * photoZoom;

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.container}>
        {isLoading ? <ReportDetailSkeleton /> : null}

        {!isLoading && error ? (
          <>
            <StateMessage
              title="Không tải được phản ánh"
              description={error}
              tone="error"
            />
            <AppButton label="Tải lại" onPress={loadReport} />
          </>
        ) : null}

        {!isLoading && !error && report ? (
          <>
            <View style={styles.card}>
              <View style={styles.header}>
                <Text selectable style={styles.reportId}>
                  {report.id}
                </Text>
                <StatusBadge status={report.status} />
              </View>
              <View
                style={[
                  styles.damageTypeBadge,
                  { backgroundColor: finalDamageTheme?.backgroundColor ?? colors.surfaceMuted },
                ]}
              >
                <Text
                  selectable
                  style={[styles.damageTypeBadgeText, { color: finalDamageTheme?.color ?? colors.primaryDark }]}
                  testID="report-detail-type"
                >
                  Kết quả cuối: {getDamageTypeDisplayLabel(report.type) ?? finalDamageTheme?.label ?? report.type}
                </Text>
              </View>
              <Text selectable style={styles.title} testID="report-detail-title">
                {report.title}
              </Text>
              <Text selectable style={styles.meta}>
                Gửi lúc: {report.createdAt}
              </Text>
              <Text selectable style={styles.meta}>
                Cập nhật lúc: {report.updatedAt}
              </Text>
            </View>

            <InfoCard>
              <Text selectable style={styles.sectionTitle}>
                Ảnh hiện trường
              </Text>
              {report.photoUri ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Xem ảnh hiện trường toàn màn hình"
                  onPress={() => setIsPhotoViewerOpen(true)}
                  style={({ pressed }) => [styles.photoButton, pressed && styles.photoButtonPressed]}
                >
                  <Image source={{ uri: report.photoUri }} style={styles.photo} resizeMode="cover" />
                  <View style={styles.photoHint}>
                    <AppIcon name="expand-outline" size={iconSize.sm} color={colors.surface} containerSize={16} />
                    <Text selectable={false} style={styles.photoHintText}>
                      Xem toàn ảnh
                    </Text>
                  </View>
                </Pressable>
              ) : (
                <StateMessage title="Chưa có ảnh" description="Hiện chưa có ảnh cho phản ánh này." />
              )}
            </InfoCard>

            <InfoCard>
              <Text selectable style={styles.sectionTitle}>
                Vị trí GPS
              </Text>
              <Text selectable style={styles.address}>
                {report.address}
              </Text>
              <Text selectable style={styles.gpsText}>
                {report.gps.latitude.toFixed(6)}, {report.gps.longitude.toFixed(6)}
              </Text>
              <Text selectable style={styles.meta}>
                Độ chính xác vị trí: ±{Math.round(report.gps.accuracy || 0)}m
              </Text>
              <Text selectable style={styles.meta}>
                Nguồn vị trí: {getLocationSourceLabel(report.gps.source)}
              </Text>
              <Text selectable style={styles.meta}>
                Thời gian lấy vị trí: {report.gps.capturedAt && !Number.isNaN(new Date(report.gps.capturedAt).getTime()) ? new Date(report.gps.capturedAt).toLocaleString('vi-VN') : 'Chưa có thông tin'}
              </Text>
            </InfoCard>

            <InfoCard>
              <Text selectable style={styles.sectionTitle}>
                Kết quả nhận dạng
              </Text>
              <Text selectable style={styles.meta}>
                Trạng thái xử lý ảnh: {report.aiStatus}
              </Text>
              <Text selectable style={styles.meta}>
                Thông báo: {report.aiResult.message}
              </Text>
              {report.aiResult.processingTimeMs ? (
                <Text selectable style={styles.meta}>
                  Thời gian xử lý: {report.aiResult.processingTimeMs}ms
                </Text>
              ) : null}
              {report.aiResult.detections.length > 0 ? (
                <View style={styles.detectionList}>
                  {report.aiResult.detections.map((detection, index) => (
                    <DetectionRow key={`${detection.damageType}-${index}`} detection={detection} index={index} />
                  ))}
                </View>
              ) : (
                <View style={styles.emptyDetectionBox}>
                  <Text selectable style={styles.emptyDetectionText}>
                    Hệ thống chưa phát hiện hư hỏng rõ ràng. Phản ánh này cần được kiểm tra thêm.
                  </Text>
                </View>
              )}
            </InfoCard>

            {report.note ? (
              <InfoCard>
                <Text selectable style={styles.sectionTitle}>
                  Ghi chú
                </Text>
                <Text selectable style={styles.note}>
                  {report.note}
                </Text>
              </InfoCard>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {report?.photoUri ? (
        <Modal
          visible={isPhotoViewerOpen}
          animationType="fade"
          transparent
          statusBarTranslucent
          onRequestClose={() => setIsPhotoViewerOpen(false)}
        >
          <View style={styles.viewerOverlay}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng ảnh toàn màn hình"
              onPress={() => setIsPhotoViewerOpen(false)}
              style={styles.viewerBackdrop}
            />

            <View style={[styles.viewerHeader, { top: Math.max(insets.top, spacing.md) }]}>
              <View style={styles.viewerZoomControls}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Thu nhỏ ảnh"
                  disabled={photoZoom <= 1}
                  onPress={() => setPhotoZoom((current) => Math.max(1, Number((current - 0.5).toFixed(2))))}
                  style={({ pressed }) => [
                    styles.viewerZoomButton,
                    photoZoom <= 1 && styles.viewerZoomButtonDisabled,
                    pressed && styles.viewerControlPressed,
                  ]}
                >
                  <Text selectable={false} style={styles.viewerZoomButtonText}>
                    −
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Đưa ảnh về kích thước mặc định"
                  onPress={() => setPhotoZoom(1)}
                  style={({ pressed }) => [styles.viewerZoomBadge, pressed && styles.viewerControlPressed]}
                >
                  <Text selectable={false} style={styles.viewerZoomBadgeText}>
                    {Math.round(photoZoom * 100)}%
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Phóng to ảnh"
                  disabled={photoZoom >= 3}
                  onPress={() => setPhotoZoom((current) => Math.min(3, Number((current + 0.5).toFixed(2))))}
                  style={({ pressed }) => [
                    styles.viewerZoomButton,
                    photoZoom >= 3 && styles.viewerZoomButtonDisabled,
                    pressed && styles.viewerControlPressed,
                  ]}
                >
                  <Text selectable={false} style={styles.viewerZoomButtonText}>
                    +
                  </Text>
                </Pressable>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng ảnh toàn màn hình"
                onPress={() => setIsPhotoViewerOpen(false)}
                style={({ pressed }) => [styles.viewerCloseButton, pressed && styles.viewerCloseButtonPressed]}
              >
                <AppIcon name="close-outline" size={22} color={colors.surface} containerSize={24} />
              </Pressable>
            </View>

            <View style={styles.viewerContent}>
              <ScrollView
                style={styles.viewerScroll}
                contentContainerStyle={styles.viewerScrollContent}
                maximumZoomScale={3}
                minimumZoomScale={1}
                bouncesZoom
                centerContent
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
              >
                <Image
                  source={{ uri: report.photoUri }}
                  style={[
                    styles.viewerImage,
                    {
                      width: zoomedImageWidth,
                      height: zoomedImageHeight,
                    },
                  ]}
                  resizeMode="contain"
                />
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

function DetectionRow({ detection, index }: { detection: DamageDetection; index: number }) {
  const damageTheme = damageTypeTheme[detection.damageType as keyof typeof damageTypeTheme];
  const label =
    getDamageTypeDisplayLabel(detection.damageType) ||
    detection.className ||
    damageTheme?.label ||
    detection.damageType;
  const confidencePercent = Math.round(detection.confidence * 100);

  return (
    <View style={styles.detectionRow}>
      <View style={styles.detectionHeader}>
        <Text selectable style={styles.detectionTitle}>
          #{index + 1} {label}
        </Text>
        <Text selectable style={styles.confidence}>
          {confidencePercent}%
        </Text>
      </View>
      <Text selectable style={styles.bbox}>
        BBox: x1 {Math.round(detection.bbox.x1)}, y1 {Math.round(detection.bbox.y1)}, x2 {Math.round(detection.bbox.x2)}, y2 {Math.round(detection.bbox.y2)}
      </Text>
    </View>
  );
}

function ReportDetailSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <SkeletonBlock width="36%" height={16} />
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
      <SkeletonBlock width="86%" height={28} />
      <SkeletonBlock width="100%" height={220} borderRadius={radius.lg} />
      <SkeletonBlock width="72%" height={18} />
      <SkeletonBlock width="62%" height={16} />
    </View>
  );
}

function getFittedImageSize(maxWidth: number, maxHeight: number, aspectRatio: number) {
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    return {
      width: maxWidth,
      height: maxHeight,
    };
  }

  let width = maxWidth;
  let height = width / aspectRatio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return { width, height };
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  reportId: {
    flex: 1,
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '900',
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 30,
  },
  damageTypeBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  damageTypeBadgeText: {
    fontSize: 13,
    fontWeight: '900',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  address: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  meta: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
  },
  gpsText: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  photo: {
    width: '100%',
    height: 230,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  photoButton: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  photoButtonPressed: {
    opacity: 0.92,
  },
  photoHint: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  photoHintText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '800',
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
  },
  viewerBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  viewerHeader: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  viewerZoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  viewerZoomButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  viewerZoomButtonDisabled: {
    opacity: 0.45,
  },
  viewerZoomButtonText: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 24,
  },
  viewerZoomBadge: {
    minWidth: 72,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  viewerZoomBadgeText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '800',
  },
  viewerCloseButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  viewerCloseButtonPressed: {
    opacity: 0.84,
  },
  viewerContent: {
    flex: 1,
    paddingTop: spacing.xxl * 2,
    paddingBottom: spacing.xxl,
  },
  viewerScroll: {
    flex: 1,
  },
  viewerScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  viewerImage: {
    backgroundColor: 'transparent',
  },
  viewerControlPressed: {
    opacity: 0.84,
  },
  detectionList: {
    gap: spacing.sm,
  },
  detectionRow: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  detectionTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  confidence: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '900',
  },
  bbox: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  emptyDetectionBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  emptyDetectionText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  note: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
});
