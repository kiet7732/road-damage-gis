import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppButton from '../../components/AppButton';
import AppIcon from '../../components/AppIcon';
import EmptyState from '../../components/EmptyState';
import ScreenHeader from '../../components/ScreenHeader';
import { ReportCardSkeleton } from '../../components/Skeleton';
import StateMessage from '../../components/StateMessage';
import StatusBadge from '../../components/StatusBadge';
import { colors, damageTypeTheme, iconSize, radius, spacing } from '../../constants/theme';
import {
  fetchReportHistory,
  getDamageTypeDisplayLabel,
  getReportHistoryErrorMessage,
} from '../../services/reportService';
import type { BottomTabParamList, RootStackParamList } from '../../types/navigation';
import type { Report } from '../../types/roadDamage';

type HistoryScreenProps = CompositeScreenProps<
  BottomTabScreenProps<BottomTabParamList, 'History'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function HistoryScreen({ navigation }: HistoryScreenProps) {
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const hasHandledInitialFocusRef = useRef(false);
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
    loadReports();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadReports]);

  useFocusEffect(
    useCallback(() => {
      if (!hasHandledInitialFocusRef.current) {
        hasHandledInitialFocusRef.current = true;
        return;
      }

      loadReports('refresh');
    }, [loadReports]),
  );

  const handleRefresh = () => {
    loadReports('refresh');
  };
  const contentBottomPadding = Math.max(spacing.xxl, insets.bottom + 92);
  const topPadding = Platform.OS === 'android' ? Math.max(6, insets.top - 14) : 0;

  function renderReport({ item }: { item: Report }) {
    const damageLabel = getDamageTypeDisplayLabel(item.type) ?? damageTypeTheme[item.type]?.label ?? item.type;

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Xem chi tiết phản ánh ${item.id}`}
        style={({ pressed }) => [styles.reportCard, pressed && styles.reportCardPressed]}
        onPress={() => navigation.navigate('ReportDetailScreen', { reportId: item.id })}
      >
        <View style={styles.reportHeader}>
          <Text
            selectable
            numberOfLines={1}
            ellipsizeMode="tail"
            style={styles.reportTitle}
            testID={`history-report-title-${item.id}`}
          >
            {item.title}
          </Text>
          <StatusBadge status={item.status} />
        </View>
        <Text selectable style={styles.reportType} testID={`history-report-type-${item.id}`}>
          Hư hỏng: {damageLabel}
        </Text>
        <Text selectable numberOfLines={2} ellipsizeMode="tail" style={styles.address}>
          {item.address}
        </Text>
        <Text selectable style={styles.createdAt}>
          {item.createdAt}
        </Text>
      </Pressable>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.safeArea, { paddingTop: topPadding }]}>
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={renderReport}
        contentContainerStyle={[styles.container, { paddingBottom: contentBottomPadding }]}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            refreshing={isRefreshing}
            tintColor={colors.primary}
            onRefresh={handleRefresh}
          />
        }
        ListHeaderComponent={
          <ScreenHeader
            title="Lịch sử phản ánh"
            subtitle="Theo dõi tiến độ xử lý"
            hideLeftAction
            rightIcon="scan-outline"
            onRightPress={() => navigation.navigate('ManualReviewReportsScreen')}
          />
        }
        ListEmptyComponent={
          <>
            {isLoading ? (
              <>
                <ReportCardSkeleton />
                <ReportCardSkeleton />
                <ReportCardSkeleton />
              </>
            ) : null}
            {!isLoading && error ? (
              <StateMessage
                title="Không thể tải lịch sử phản ánh"
                description={error}
                tone="error"
              />
            ) : null}
            {!isLoading && !error && reports.length === 0 ? (
              <EmptyState
                icon="document-text-outline"
                title="Chưa có phản ánh nào"
                description="Bạn chưa gửi phản ánh hư hỏng nào."
                action={
                  <AppButton
                    label="Gửi phản ánh ngay"
                    icon={<AppIcon name="camera" size={iconSize.inline} color={colors.surface} containerSize={22} />}
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
    paddingTop: spacing.sm,
    gap: spacing.md,
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
    opacity: 0.78,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  reportTitle: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  address: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  reportType: {
    color: colors.primaryDark,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '800',
  },
  createdAt: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
});
