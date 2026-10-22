import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../../components/AppIcon';
import AppButton from '../../components/AppButton';
import InfoCard from '../../components/InfoCard';
import { SkeletonBlock } from '../../components/Skeleton';
import StateMessage from '../../components/StateMessage';
import { colors, iconSize, radius, spacing } from '../../constants/theme';
import {
  fetchReportDetail,
  getReportDetailErrorMessage,
} from '../../services/reportService';
import { openGoogleMapsNavigation } from '../../../../../packages/mobile-shared/src/locationService';
import type { RootStackParamList } from '../../types/navigation';
import type { ReportDetail } from '../../types/roadDamage';
import ReportDetailHeaderCard from './components/ReportDetailHeaderCard';
import ReportDetailLocationCard from './components/ReportDetailLocationCard';
import ReportDetailAiCard from './components/ReportDetailAiCard';
import ReportDetailPhotoViewerModal from './components/ReportDetailPhotoViewerModal';

type ReportDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'ReportDetailScreen'>;

export default function ReportDetailScreen({ route }: ReportDetailScreenProps) {
  const { reportId } = route.params;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  const [photoNaturalSize, setPhotoNaturalSize] = useState({ width: 3, height: 4 });
  const [photoZoom, setPhotoZoom] = useState(1);
  const [copiedAddressToast, setCopiedAddressToast] = useState(false);
  const copyToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const latestRequestIdRef = useRef(0);

  const loadReport = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    if (mode === 'refresh') {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
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
        setIsRefreshing(false);
      }
    }
  }, [reportId]);

  const handleRefresh = () => {
    loadReport('refresh');
  };

  const handleCopyAddress = async () => {
    if (!report) return;
    const textToCopy =
      report.formattedAddress ||
      report.address ||
      `${report.gps.latitude.toFixed(6)}, ${report.gps.longitude.toFixed(6)}`;

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(textToCopy);
    } else {
      try {
        await Share.share({ message: textToCopy });
      } catch {
        // ignore
      }
    }

    setCopiedAddressToast(true);
    if (copyToastTimeoutRef.current) {
      clearTimeout(copyToastTimeoutRef.current);
    }
    copyToastTimeoutRef.current = setTimeout(() => {
      setCopiedAddressToast(false);
    }, 2000);
  };

  const handleOpenNavigation = () => {
    if (!report) return;
    void openGoogleMapsNavigation({
      latitude: report.gps.latitude,
      longitude: report.gps.longitude,
      address: report.formattedAddress || report.address,
      label: report.title,
    });
  };

  useEffect(() => {
    isMountedRef.current = true;
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

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            refreshing={isRefreshing}
            tintColor={colors.primary}
            onRefresh={handleRefresh}
          />
        }
      >
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
            <ReportDetailHeaderCard report={report} />

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
                  <Image
                    source={{ uri: report.photoUri }}
                    style={StyleSheet.absoluteFillObject}
                    blurRadius={20}
                    resizeMode="cover"
                  />
                  <View style={styles.photoBackdropOverlay} />
                  <Image source={{ uri: report.photoUri }} style={styles.photo} resizeMode="contain" />
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

            <ReportDetailLocationCard
              report={report}
              copiedAddressToast={copiedAddressToast}
              onCopyAddress={handleCopyAddress}
              onOpenNavigation={handleOpenNavigation}
            />

            <ReportDetailAiCard
              aiStatus={report.aiStatus}
              aiResult={report.aiResult}
            />

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

      <ReportDetailPhotoViewerModal
        isOpen={isPhotoViewerOpen}
        onClose={() => setIsPhotoViewerOpen(false)}
        photoUri={report?.photoUri ?? null}
        insetsTop={insets.top}
        windowWidth={width}
        windowHeight={height}
        photoNaturalSize={photoNaturalSize}
        photoZoom={photoZoom}
        setPhotoZoom={setPhotoZoom}
      />
    </SafeAreaView>
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
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  photoButton: {
    height: 320,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#000000',
    position: 'relative',
  },
  photoButtonPressed: {
    opacity: 0.92,
  },
  photoBackdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoHint: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  photoHintText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '700',
  },
  note: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 22,
  },
});
