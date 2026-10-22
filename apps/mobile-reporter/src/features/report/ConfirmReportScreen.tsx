import { CommonActions } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { File as ExpoFile } from 'expo-file-system';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../../components/AppIcon';
import BlockingOverlay from '../../components/BlockingOverlay';
import { colors, iconSize, radius, spacing, touchTarget } from '../../constants/theme';
import {
  DEFAULT_NEARBY_REPORT_RADIUS_METERS,
  fetchNearbyUnrepairedReports,
  getSubmitReportErrorMessage,
  MAX_GPS_ACCURACY_METERS,
  previewRoadDamageDetection,
  sanitizeReportNote,
  submitRoadDamageReport,
} from '../../services/reportService';
import type { RootStackParamList } from '../../types/navigation';
import type { Report, ReportAiResult } from '../../types/roadDamage';
import CapturedPhotoPreview from './components/CapturedPhotoPreview';
import ConfirmAiPreviewCard from './components/ConfirmAiPreviewCard';
import ConfirmNearbyReportsCard from './components/ConfirmNearbyReportsCard';
import ConfirmReportFooter from './components/ConfirmReportFooter';
import GpsLocationCard from './components/GpsLocationCard';
import ReportNoteCard from './components/ReportNoteCard';
import { buildPredictionLabel, getDetectionDamageType, isValidGps } from './utils/confirmReportUtils';

type ConfirmReportScreenProps = NativeStackScreenProps<RootStackParamList, 'ConfirmReportScreen'>;

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
  const previewHeight = Math.max(220, Math.min(compact ? 240 : 320, Math.round(width * 0.82)));
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

          <ConfirmAiPreviewCard
            predictedDamageType={predictedDamageType}
            isPreviewing={isPreviewing}
            previewError={previewError}
            previewResult={previewResult}
            predictionLabel={predictionLabel}
          />

          <ConfirmNearbyReportsCard
            hasNearbyDuplicateWarning={hasNearbyDuplicateWarning}
            nearbySummaryText={nearbySummaryText}
            isCheckingNearbyReports={isCheckingNearbyReports}
            nearbyReportsError={nearbyReportsError}
            nearbyReportsPreview={nearbyReportsPreview}
          />

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

        <ConfirmReportFooter
          isSubmitting={isSubmitting}
          uploadProgress={uploadProgress}
          canSubmit={canSubmit}
          footerPaddingBottom={footerPaddingBottom}
          onLayoutFooterHeight={setFooterHeight}
          onCancel={handleCancel}
          onRetake={handleRetake}
          onSubmit={handleSubmit}
        />
      </KeyboardAvoidingView>
      <BlockingOverlay visible={isSubmitting} message={`Đang gửi phản ánh... ${uploadProgress}%`} />
    </SafeAreaView>
  );
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
  noteCardWrap: {
    marginTop: 2,
  },
});
