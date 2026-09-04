import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../components/AppButton';
import EmptyState from '../../components/EmptyState';
import { ReportCardSkeleton } from '../../components/Skeleton';
import StateMessage from '../../components/StateMessage';
import StatusBadge from '../../components/StatusBadge';
import { colors, damageTypeTheme, radius, spacing } from '../../constants/theme';
import {
  fetchReportHistory,
  getDamageTypeDisplayLabel,
  getReportHistoryErrorMessage,
} from '../../services/reportService';
import type { RootStackParamList } from '../../types/navigation';
import type { Report } from '../../types/roadDamage';

type ManualReviewReportsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ManualReviewReportsScreen'
>;

export default function ManualReviewReportsScreen({
  navigation,
}: ManualReviewReportsScreenProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const isMountedRef = useRef(true);
  const latestRequestIdRef = useRef(0);

  const loadReports = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    if (mode === 'refresh') {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError('');

    try {
      const nextReports = await fetchReportHistory();
      if (!isMountedRef.current || latestRequestIdRef.current !== requestId) {
        return;
      }

      setReports(nextReports.filter((report) => report.aiStatus === 'manual_review_required'));
    } catch (loadError) {
      if (!isMountedRef.current || latestRequestIdRef.current !== requestId) {
        return;
      }

      setError(getReportHistoryErrorMessage(loadError));
    } finally {
      if (isMountedRef.current && latestRequestIdRef.current === requestId) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    loadReports();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadReports]);

  const renderReport = ({ item }: { item: Report }) => {
    const damageLabel =
      getDamageTypeDisplayLabel(item.type) ?? damageTypeTheme[item.type]?.label ?? item.type;

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Xem chi tiết phản ánh ${item.id}`}
        style={({ pressed }) => [styles.reportCard, pressed && styles.reportCardPressed]}
        onPress={() => navigation.navigate('ReportDetailScreen', { reportId: item.id })}
      >
        <View style={styles.reportHeader}>
          <Text selectable numberOfLines={1} style={styles.reportTitle}>
            {item.title}
          </Text>
          <StatusBadge status={item.status} />
        </View>

        <Text selectable style={styles.reportType}>
          Hư hỏng dự kiến: {damageLabel}
        </Text>

        <Text selectable numberOfLines={2} style={styles.reportDescription}>
          Ảnh này đã được gửi thành công nhưng hệ thống chưa xác định rõ hư hỏng, nên cần kiểm tra thêm.
        </Text>

        <Text selectable style={styles.createdAt}>
          {item.createdAt}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={renderReport}
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            refreshing={isRefreshing}
            tintColor={colors.primary}
            onRefresh={() => loadReports('refresh')}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerCard}>
            <Text selectable style={styles.headerTitle}>
              Ảnh cần kiểm tra thêm
            </Text>
            <Text selectable style={styles.headerSubtitle}>
              Đây là các phản ánh mà hệ thống chưa xác định rõ hư hỏng từ ảnh.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <>
            {isLoading ? (
              <>
                <ReportCardSkeleton />
                <ReportCardSkeleton />
              </>
            ) : null}

            {!isLoading && error ? (
              <StateMessage
                title="Không tải được danh sách"
                description={error}
                tone="error"
              />
            ) : null}

            {!isLoading && !error && reports.length === 0 ? (
              <EmptyState
                icon="scan-outline"
                title="Chưa có ảnh cần kiểm tra thêm"
                description="Các phản ánh AI chưa nhận diện rõ sẽ xuất hiện tại đây."
                action={
                  <AppButton
                    label="Gửi phản ánh mới"
                    onPress={() => navigation.navigate('CameraScreen')}
                  />
                }
              />
            ) : null}
          </>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerCard: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  reportCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportCardPressed: {
    opacity: 0.82,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  reportTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  reportType: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
  reportDescription: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  createdAt: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
});
