import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import EmptyState from '../../components/EmptyState';
import { ReportCardSkeleton } from '../../components/Skeleton';
import StateMessage from '../../components/StateMessage';
import StatusBadge from '../../components/StatusBadge';
import { colors, radius, spacing } from '../../constants/theme';
import { fetchReportHistory, getReportHistoryErrorMessage } from '../../services/reportService';
import type { RootStackParamList } from '../../types/navigation';
import type { Report } from '../../types/roadDamage';

type ProcessingUpdatesScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ProcessingUpdatesScreen'
>;

type ReportUpdateItem = {
  id: string;
  reportId: string;
  title: string;
  status: Report['status'];
  statusTitle: string;
  updatedAtLabel: string;
  sortTime: number;
  description: string;
};

export default function ProcessingUpdatesScreen({ navigation }: ProcessingUpdatesScreenProps) {
  const insets = useSafeAreaInsets();
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

      setReports(nextReports);
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
    void loadReports();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadReports]);

  const updates = useMemo<ReportUpdateItem[]>(() => {
    return reports
      .map((report) => {
        const updatedAtRaw = report.updatedAtRaw ?? report.createdAtRaw ?? '';
        const createdAtRaw = report.createdAtRaw ?? '';
        const hasMeaningfulUpdate =
          Boolean(updatedAtRaw) &&
          Boolean(createdAtRaw) &&
          updatedAtRaw !== createdAtRaw;

        if (!hasMeaningfulUpdate) {
          return null;
        }

        return {
          id: `${report.id}-${updatedAtRaw || report.createdAt}`,
          reportId: report.id,
          title: report.title,
          status: report.status,
          statusTitle: getProcessingUpdateTitle(report.status),
          updatedAtLabel: `Cập nhật lúc ${report.updatedAt ?? report.createdAt}`,
          sortTime: Date.parse(updatedAtRaw || createdAtRaw || '') || 0,
          description: getProcessingUpdateDescription(report.status),
        };
      })
      .filter((item): item is ReportUpdateItem => Boolean(item))
      .sort((left, right) => right.sortTime - left.sortTime);
  }, [reports]);

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <FlatList
        data={updates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: Math.max(spacing.xxl, insets.bottom + 24) },
        ]}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            refreshing={isRefreshing}
            tintColor={colors.primary}
            onRefresh={() => {
              void loadReports('refresh');
            }}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerCard}>
            <Text selectable style={styles.headerTitle}>
              Cập nhật xử lý
            </Text>
            <Text selectable style={styles.headerSubtitle}>
              Theo dõi các thay đổi mới từ phía quản lý.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.updateCard}>
            <View style={styles.updateTopRow}>
              <View style={styles.updateIndicator} />
              <Text selectable numberOfLines={1} style={styles.updateStatusTitle}>
                {item.statusTitle}
              </Text>
              <StatusBadge status={item.status} size="sm" />
            </View>

            <Text selectable numberOfLines={2} style={styles.updateTitle}>
              {item.title}
            </Text>

            <View style={styles.updateFooter}>
              <Text selectable numberOfLines={1} style={styles.updateTime}>
                {item.updatedAtLabel}
              </Text>

              <Text selectable style={styles.updateLink} onPress={() => navigation.navigate('ReportDetailScreen', { reportId: item.reportId })}>
                Chi tiết
              </Text>
            </View>
          </View>
        )}
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
                title="Không tải được cập nhật xử lý"
                description={error}
                tone="error"
              />
            ) : null}

            {!isLoading && !error && updates.length === 0 ? (
          <EmptyState
            icon="notifications-outline"
            title="Chưa có cập nhật mới"
            description="Khi phản ánh được quản lý cập nhật, thông tin sẽ xuất hiện tại đây."
          />
        ) : null}
      </>
        }
      />
    </SafeAreaView>
  );
}

function getProcessingUpdateTitle(status: Report['status']): string {
  switch (status) {
    case 'pending':
      return 'Đã tiếp nhận phản ánh';
    case 'processing':
      return 'Đã xác minh phản ánh';
    case 'repaired':
      return 'Đã xử lý xong phản ánh';
    case 'rejected':
      return 'Đã từ chối phản ánh';
    default:
      return 'Đã cập nhật phản ánh';
  }
}

function getProcessingUpdateDescription(status: Report['status']): string {
  switch (status) {
    case 'pending':
      return 'Phản ánh đã được tiếp nhận và đang chờ xác minh.';
    case 'processing':
      return 'Phản ánh đã được xác minh và đang được xử lý.';
    case 'repaired':
      return 'Phản ánh đã được xử lý xong.';
    case 'rejected':
      return 'Phản ánh đã bị từ chối sau khi kiểm tra.';
    default:
      return 'Phản ánh đã có cập nhật trạng thái xử lý.';
  }
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
  updateCard: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  updateTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  updateIndicator: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  updateStatusTitle: {
    flex: 1,
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '900',
  },
  updateTitle: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  updateFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  updateTime: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  updateLink: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
});
