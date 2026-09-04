import { CommonActions } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { File as ExpoFile } from 'expo-file-system';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../../components/AppIcon';
import AppButton from '../../components/AppButton';
import BlockingOverlay from '../../components/BlockingOverlay';
import InfoCard from '../../components/InfoCard';
import StatusBadge from '../../components/StatusBadge';
import { colors, damageTypeTheme, iconSize, radius, spacing, touchTarget, type DamageTypeCode } from '../../constants/theme';
import {
  DEFAULT_NEARBY_REPORT_RADIUS_METERS,
  fetchNearbyUnrepairedReports,
  getDamageTypeDisplayLabel,
  getSubmitReportErrorMessage,
  MAX_GPS_ACCURACY_METERS,
  previewRoadDamageDetection,
  sanitizeReportNote,
  submitRoadDamageReport,
} from '../../services/reportService';
import type { RootStackParamList } from '../../types/navigation';
import type { DamageDetection, Report, ReportAiResult } from '../../types/roadDamage';
import CapturedPhotoPreview from './components/CapturedPhotoPreview';
import GpsLocationCard from './components/GpsLocationCard';
import ReportNoteCard from './components/ReportNoteCard';

type ConfirmReportScreenProps = NativeStackScreenProps<RootStackParamList, 'ConfirmReportScreen'>;

function isValidGps(gps: RootStackParamList['ConfirmReportScreen']['gps'] | undefined) {
  return (
    typeof gps?.latitude === 'number' &&
    Number.isFinite(gps.latitude) &&
    gps.latitude >= -90 &&
    gps.latitude <= 90 &&
    typeof gps?.longitude === 'number' &&
    Number.isFinite(gps.longitude) &&
    gps.longitude >= -180 &&
    gps.longitude <= 180 &&
    !(gps.latitude === 0 && gps.longitude === 0) &&
    typeof gps?.accuracy === 'number' &&
    Number.isFinite(gps.accuracy) &&
    gps.accuracy > 0 &&
    gps.accuracy <= MAX_GPS_ACCURACY_METERS
  );
}

export default function ConfirmReportScreen({ navigation, route }: ConfirmReportScreenProps) {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewResult, setPreviewResult] = useState<ReportAiResult | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [nearbyReports, setNearbyReports] = useState<Report[]>([]);
  const [isCheckingNearbyReports, setIsCheckingNearbyReports] = useState(false);
  const [nearbyReportsError, setNearbyReportsError] = useState('');
  const [footerHeight, setFooterHeight] = useState(0);
  const submitLockRef = useRef(false);
  const hasSubmittedRef = useRef(false);
  const hasDeletedTempPhotoRef = useRef(false);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const photoUri = route.params?.photoUri ?? '';
  const gps = route.params?.gps;
  const initialPreviewResult = route.params?.initialPreviewResult ?? null;
  const initialPreviewError = route.params?.initialPreviewError ?? '';
  const initialPreviewPhotoUri = route.params?.initialPreviewPhotoUri ?? null;
  const compact = width < 360 || height < 680;
  const previewHeight = Math.max(150, Math.min(compact ? 180 : 220, Math.round(width * 0.54)));
  const footerPaddingBottom = Platform.OS === 'ios'
    ? Math.max(insets.bottom, spacing.xs)
    : spacing.xs;

  const validationMessage = useMemo(() => {
    if (!photoUri?.trim()) {
      return 'Vui lòng chụp ảnh hiện trường trước khi gửi phản ánh.';
    }

    if (!isValidGps(gps)) {
      return `Vị trí hiện tại chưa đủ chính xác. Sai số cần nhỏ hơn hoặc bằng ±${MAX_GPS_ACCURACY_METERS}m.`;
    }

    return '';
  }, [gps, photoUri]);

  const canSubmit = !validationMessage && !isSubmitting;

  useEffect(() => {
    function deleteTempPhotoIfNeeded() {
      if (hasSubmittedRef.current || hasDeletedTempPhotoRef.current || !photoUri?.trim()) {
        return;
      }

      try {
        const tempPhoto = new ExpoFile(photoUri) as unknown as {
          exists: boolean;
          delete: () => void;
        };
        if (tempPhoto.exists) {
          tempPhoto.delete();
        }
      } catch {
        // Bỏ qua lỗi xóa ảnh tạm để không ảnh hưởng trải nghiệm điều hướng.
      } finally {
        hasDeletedTempPhotoRef.current = true;
      }
    }

    const unsubscribeBeforeRemove = navigation.addListener('beforeRemove', () => {
      deleteTempPhotoIfNeeded();
    });

    return () => {
      unsubscribeBeforeRemove();
      deleteTempPhotoIfNeeded();
    };
  }, [navigation, photoUri]);

  useEffect(() => {
    let mounted = true;

    if (!photoUri?.trim()) {
      setPreviewResult(null);
      setPreviewError('');
      setIsPreviewing(false);
      return () => {
        mounted = false;
      };
    }

    if (initialPreviewPhotoUri && initialPreviewPhotoUri === photoUri) {
      setPreviewResult(initialPreviewResult);
      setPreviewError(initialPreviewError);
      setIsPreviewing(false);

      return () => {
        mounted = false;
      };
    }

    setIsPreviewing(true);
    setPreviewError('');

    previewRoadDamageDetection(photoUri)
      .then((result) => {
        if (!mounted) {
          return;
        }
        setPreviewResult(result);
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }
        setPreviewResult(null);
        setPreviewError(getSubmitReportErrorMessage(error));
      })
      .finally(() => {
        if (!mounted) {
          return;
        }
        setIsPreviewing(false);
      });

    return () => {
      mounted = false;
    };
  }, [photoUri]);

  useEffect(() => {
    let mounted = true;

    if (!isValidGps(gps)) {
      setNearbyReports([]);
      setNearbyReportsError('');
      setIsCheckingNearbyReports(false);
      return () => {
        mounted = false;
      };
    }

    setIsCheckingNearbyReports(true);
    setNearbyReportsError('');

    fetchNearbyUnrepairedReports({
      latitude: gps.latitude,
      longitude: gps.longitude,
      radiusMeters: DEFAULT_NEARBY_REPORT_RADIUS_METERS,
      limit: 20,
    })
      .then((reports) => {
        if (!mounted) {
          return;
        }

        setNearbyReports(reports);
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }

        setNearbyReports([]);
        setNearbyReportsError(getSubmitReportErrorMessage(error));
      })
      .finally(() => {
        if (!mounted) {
          return;
        }

        setIsCheckingNearbyReports(false);
      });

    return () => {
      mounted = false;
    };
  }, [gps]);

  const primaryDetection = previewResult?.detections?.[0] ?? null;
  const predictedDamageType = getDetectionDamageType(primaryDetection);
  const predictionLabel = buildPredictionLabel(previewResult, primaryDetection);
  const nearbyReportsPreview = nearbyReports.slice(0, 2);
  const hasNearbyDuplicateWarning = nearbyReports.length > 0;
  const nearbySummaryText = useMemo(() => {
    if (isCheckingNearbyReports) {
      return `Đang kiểm tra các phản ánh trong phạm vi ${DEFAULT_NEARBY_REPORT_RADIUS_METERS}m...`;
    }

    if (nearbyReportsError) {
      return nearbyReportsError;
    }

    if (hasNearbyDuplicateWarning) {
      return `Đã có ${nearbyReports.length} phản ánh gần vị trí này trong phạm vi ${DEFAULT_NEARBY_REPORT_RADIUS_METERS}m.`;
    }

    return `Chưa ghi nhận phản ánh chưa xử lý nào trong phạm vi ${DEFAULT_NEARBY_REPORT_RADIUS_METERS}m.`;
  }, [hasNearbyDuplicateWarning, isCheckingNearbyReports, nearbyReports.length, nearbyReportsError]);

  function navigateToHistoryAfterSubmit() {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'MainTabs',
            params: {
              screen: 'History',
            },
          },
        ],
      }),
    );
  }

  function navigateToDetailAfterSubmit(reportId: string) {
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          {
            name: 'MainTabs',
            params: {
              screen: 'History',
            },
          },
          {
            name: 'ReportDetailScreen',
            params: { reportId },
          },
        ],
      }),
    );
  }

  function navigateToManualReviewReports() {
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          {
            name: 'MainTabs',
            params: {
              screen: 'History',
            },
          },
          {
            name: 'ManualReviewReportsScreen',
          },
        ],
      }),
    );
  }

  function buildSubmitSuccessContent(createdReport: Report) {
    if (createdReport.aiStatus === 'manual_review_required') {
      return {
        title: 'Đã gửi phản ánh',
        message:
          'Phản ánh đã được ghi nhận. Hệ thống chưa phân tích rõ ảnh nên báo cáo sẽ được chuyển sang kiểm tra thủ công.',
      };
    }

    return {
      title: 'Gửi thành công',
      message: 'Phản ánh của bạn đã được ghi nhận và lưu vào hệ thống.',
    };
  }

  async function handleSubmit() {
    if (submitLockRef.current) {
      return;
    }

    if (!canSubmit) {
      Alert.alert('Thiếu thông tin', validationMessage || 'Vui lòng kiểm tra lại thông tin trước khi gửi.');
      return;
    }

    if (!gps) {
      Alert.alert('Thiếu vị trí', 'Không tìm thấy vị trí hiện tại. Vui lòng chụp lại ảnh.');
      return;
    }

    try {
      submitLockRef.current = true;
      setIsSubmitting(true);
      setUploadProgress(0);

      const createdReport = await submitRoadDamageReport(
        {
          photoUri,
          gps,
          note: sanitizeReportNote(note),
          previewToken: previewResult?.previewToken ?? null,
        },
        {
          onUploadProgress: setUploadProgress,
        },
      );

      hasSubmittedRef.current = true;

      const successContent = buildSubmitSuccessContent(createdReport);

      Alert.alert(successContent.title, successContent.message, [
        ...(createdReport.aiStatus === 'manual_review_required'
          ? [
              {
                text: 'Xem mục kiểm tra thêm',
                onPress: navigateToManualReviewReports,
              },
            ]
          : [
              {
                text: 'Xem lịch sử',
                onPress: navigateToHistoryAfterSubmit,
              },
            ]),
        {
          text: 'Xem chi tiết',
          onPress: () => navigateToDetailAfterSubmit(createdReport.id),
        },
      ]);
    } catch (error) {
      Alert.alert('Không gửi được phản ánh', getSubmitReportErrorMessage(error));
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    if (isSubmitting) {
      return;
    }

    Alert.alert(
      'Hủy phản ánh',
      'Bạn có chắc muốn hủy phản ánh này không?',
      [
        { text: 'Tiếp tục chỉnh sửa', style: 'cancel' },
        {
          text: 'Xác nhận hủy',
          style: 'destructive',
          onPress: () => navigation.navigate('MainTabs', { screen: 'Home' }),
        },
      ],
    );
  }

  function handleRetake() {
    if (isSubmitting) {
      return;
    }

    navigation.goBack();
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', default: undefined })}
        style={styles.keyboardView}
      >
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.container,
            {
              paddingBottom: Math.max(footerHeight + spacing.xs, spacing.lg),
              paddingHorizontal: compact ? spacing.md : spacing.lg,
            },
          ]}
        >
          {photoUri ? (
            <CapturedPhotoPreview
              photoUri={photoUri}
              height={previewHeight}
              predictionLabel={predictionLabel}
            />
          ) : null}
          {gps ? (
            <GpsLocationCard
              gps={gps}
              address="Vị trí được ghi nhận trực tiếp tại thời điểm chụp ảnh."
            />
          ) : null}

          <InfoCard style={styles.compactInfoCard}>
            <View style={styles.aiHeader}>
              <View style={styles.sectionTitleWrap}>
                <Text selectable style={styles.aiTitle}>
                  Kết quả nhận dạng
                </Text>
                <Text selectable style={styles.sectionSubtitle}>
                  Gợi ý hư hỏng từ ảnh.
                </Text>
              </View>
              {predictedDamageType ? (
                <View
                  style={[
                    styles.damageTypeChip,
                    {
                      backgroundColor: damageTypeTheme[predictedDamageType].backgroundColor,
                      borderColor: damageTypeTheme[predictedDamageType].color,
                    },
                  ]}
                >
                  <Text
                    selectable
                    style={[
                      styles.damageTypeChipText,
                      { color: damageTypeTheme[predictedDamageType].color },
                    ]}
                  >
                    {damageTypeTheme[predictedDamageType].label}
                  </Text>
                </View>
              ) : null}
            </View>

            {isPreviewing ? (
              <Text selectable numberOfLines={2} style={styles.aiDescription}>
                Hệ thống đang phân tích ảnh để gợi ý loại hư hỏng...
              </Text>
            ) : null}

            {!isPreviewing && previewError ? (
              <Text selectable style={styles.aiError}>
                {previewError}
              </Text>
            ) : null}

            {!isPreviewing && !previewError && previewResult ? (
              <>
                <Text selectable style={[styles.aiPrimaryText, !previewResult.success && styles.aiPrimaryWarningText]}>
                  {predictionLabel || 'Chưa xác định được loại hư hỏng.'}
                </Text>
                <Text selectable style={styles.aiDescription}>
                  {previewResult.message}
                </Text>
              </>
            ) : null}
          </InfoCard>

          <InfoCard style={styles.compactInfoCard}>
            <View style={styles.sectionTitleWrap}>
              <Text selectable style={styles.aiTitle}>
                Kiểm tra phản ánh gần đó
              </Text>
            </View>

            <View
              style={[
                styles.nearbySummaryCard,
                hasNearbyDuplicateWarning ? styles.nearbySummaryWarning : styles.nearbySummaryNeutral,
              ]}
            >
              <AppIcon
                name={hasNearbyDuplicateWarning ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                size={iconSize.inline}
                color={hasNearbyDuplicateWarning ? '#B45309' : colors.success}
                containerSize={24}
              />
              <Text
                selectable
                numberOfLines={2}
                style={[
                  styles.nearbySummaryText,
                  isCheckingNearbyReports && styles.aiDescription,
                  nearbyReportsError && styles.aiError,
                ]}
              >
                {nearbySummaryText}
              </Text>
            </View>

            {!isCheckingNearbyReports && !nearbyReportsError && hasNearbyDuplicateWarning ? (
              <View style={styles.duplicateBox}>
                <View style={styles.duplicateList}>
                  {nearbyReportsPreview.map((report) => (
                    <View key={report.id} style={styles.duplicateItem}>
                      <Text selectable numberOfLines={2} ellipsizeMode="tail" style={styles.duplicateItemTitle}>
                        {buildNearbyReportPreviewTitle(report)}
                      </Text>
                      <Text selectable numberOfLines={1} ellipsizeMode="tail" style={styles.duplicateItemMeta}>
                        {report.createdAt} • {formatStatusLabel(report.status)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </InfoCard>

          {validationMessage ? (
            <View style={styles.validationBox}>
              <AppIcon name="alert-circle-outline" size={iconSize.inline} color={colors.danger} containerSize={24} />
              <Text selectable style={styles.validationText}>
                {validationMessage}
              </Text>
            </View>
          ) : null}

          <View style={styles.noteCardWrap}>
            <ReportNoteCard value={note} onChangeText={setNote} />
          </View>
        </ScrollView>

        <View
          onLayout={(event) => {
            const nextHeight = Math.ceil(event.nativeEvent.layout.height);
            setFooterHeight((currentHeight) => (currentHeight !== nextHeight ? nextHeight : currentHeight));
          }}
          style={[styles.footer, { paddingBottom: footerPaddingBottom }]}
        >
          {isSubmitting ? (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(uploadProgress, 8)}%` }]} />
            </View>
          ) : null}
          <View style={styles.footerRow}>
            <AppButton
              label="Hủy"
              variant="outline"
              accessibilityLabel="Hủy phản ánh hiện tại"
              onPress={handleCancel}
              disabled={isSubmitting}
              style={styles.secondaryAction}
            />
            <AppButton
              label="Chụp lại"
              variant="outline"
              accessibilityLabel="Quay lại camera để chụp lại"
              icon={<AppIcon name="camera" size={iconSize.inline} color={colors.primaryDark} containerSize={22} />}
              onPress={handleRetake}
              disabled={isSubmitting}
              style={styles.secondaryAction}
            />
          </View>
          <AppButton
            label={isSubmitting ? `Đang gửi... ${uploadProgress}%` : 'Xác nhận gửi'}
            accessibilityLabel="Xác nhận gửi phản ánh"
            icon={
              <AppIcon name="send" size={iconSize.inline} color={canSubmit ? colors.surface : '#667085'} containerSize={22} />
            }
            onPress={handleSubmit}
            disabled={!canSubmit}
          />
        </View>
      </KeyboardAvoidingView>
      <BlockingOverlay visible={isSubmitting} message={`Đang gửi phản ánh... ${uploadProgress}%`} />
    </SafeAreaView>
  );
}

function getDetectionDamageType(detection: DamageDetection | null): DamageTypeCode | null {
  if (!detection?.damageType) {
    return null;
  }

  const normalized = detection.damageType.trim().toUpperCase();
  return normalized in damageTypeTheme ? (normalized as DamageTypeCode) : null;
}

function buildPredictionLabel(
  previewResult: ReportAiResult | null,
  detection: DamageDetection | null,
): string {
  if (!previewResult) {
    return '';
  }

  if (!previewResult.success || !detection) {
    return 'Hệ thống chưa xác định được loại hư hỏng từ ảnh này.';
  }

  const damageType = getDetectionDamageType(detection);
  const damageLabel = damageType
    ? damageTypeTheme[damageType].label
    : detection.className || detection.damageType;
  const confidencePercent = Math.round((detection.confidence || 0) * 100);

  return `${damageLabel} • độ tin cậy ${confidencePercent}%`;
}

function formatStatusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'Chờ xác minh';
    case 'processing':
      return 'Đang xử lý';
    case 'repaired':
      return 'Đã sửa chữa';
    case 'rejected':
      return 'Từ chối';
    default:
      return status;
  }
}

function buildNearbyReportPreviewTitle(report: Report): string {
  const damageLabel = getDamageTypeDisplayLabel(report.type) ?? report.type;
  const rawTitle = (report.title ?? '').trim();
  const titleWithoutPrefix = rawTitle.replace(new RegExp(`^${damageLabel}\\s*-\\s*`, 'i'), '').trim();
  const normalizedTitle = titleWithoutPrefix.replace(/\s+/g, ' ');

  if (!normalizedTitle) {
    return damageLabel;
  }

  const shortTitle = normalizedTitle
    .replace(/^\[seed-demo\]\s*/i, '')
    .replace(/^ghi nhận tại hiện trường$/i, '')
    .replace(/^vị trí /i, '')
    .trim();

  if (!shortTitle) {
    return damageLabel;
  }

  return shortTitle;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingTop: 2,
    gap: spacing.xs,
  },
  compactInfoCard: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  validationBox: {
    minHeight: touchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  validationText: {
    flex: 1,
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionTitleWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  aiTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
  },
  damageTypeChip: {
    minHeight: 30,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  damageTypeChipText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  aiPrimaryText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  aiPrimaryWarningText: {
    color: colors.danger,
  },
  aiDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  aiError: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  nearbySummaryCard: {
    minHeight: touchTarget.min,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  nearbySummaryNeutral: {
    backgroundColor: colors.surfaceMuted,
  },
  nearbySummaryWarning: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#F7C78B',
  },
  nearbySummaryText: {
    flex: 1,
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16,
  },
  duplicateBox: {
    gap: 6,
  },
  duplicateList: {
    gap: 6,
  },
  duplicateItem: {
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  duplicateItemTitle: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
  },
  duplicateItemMeta: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: 4,
    paddingHorizontal: spacing.lg,
    paddingTop: 4,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  progressTrack: {
    height: 8,
    overflow: 'hidden',
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryAction: {
    flex: 1,
  },
  noteCardWrap: {
    marginTop: 2,
  },
});
