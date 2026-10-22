import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../components/AppButton';
import AppIcon from '../../components/AppIcon';
import EmptyState from '../../components/EmptyState';
import StateMessage from '../../components/StateMessage';
import { colors, iconSize, spacing } from '../../constants/theme';
import {
  DEFAULT_NEARBY_REPORT_RADIUS_METERS,
  fetchNearbyUnrepairedReports,
  getNearbyReportErrorMessage,
} from '../../services/reportService';
import { ensureLocationReady, getOrLoadUserLocation } from '../../services/locationService';
import type { RootStackParamList } from '../../types/navigation';
import type { Report } from '../../types/roadDamage';
import RecentReportCard from './components/RecentReportCard';

type NearbyReportsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'NearbyReportsScreen'
>;

const PAGE_SIZE = 10;
const MAX_NEARBY_REPORTS = 50;

export default function NearbyReportsScreen({
  navigation,
}: NearbyReportsScreenProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const hasHandledInitialFocusRef = useRef(false);

  const visibleReports = useMemo(
    () => reports.slice(0, visibleCount),
    [reports, visibleCount],
  );

  const loadNearbyReports = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      setError('');

      try {
        const userLocation = await getOrLoadUserLocation({
          requestPermission: true,
          promptAlert: true,
        });

        if (!userLocation) {
          throw new Error(
            'Chưa lấy được vị trí hiện tại. Vui lòng cấp quyền vị trí và bật GPS trên thiết bị.',
          );
        }

        const nearbyReports = await fetchNearbyUnrepairedReports({
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          radiusMeters: DEFAULT_NEARBY_REPORT_RADIUS_METERS,
          limit: MAX_NEARBY_REPORTS,
        });

        setReports(nearbyReports);
        setVisibleCount(PAGE_SIZE);
      } catch (loadError) {
        setError(getNearbyReportErrorMessage(loadError));
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      if (!hasHandledInitialFocusRef.current) {
        hasHandledInitialFocusRef.current = true;
        void loadNearbyReports('initial');
        return;
      }

      void loadNearbyReports('refresh');
    }, [loadNearbyReports]),
  );

  const handleEndReached = () => {
    if (visibleCount >= reports.length) {
      return;
    }

    setVisibleCount((currentCount) =>
      Math.min(currentCount + PAGE_SIZE, reports.length),
    );
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.header}>
        <Text selectable style={styles.title}>
          Điểm hư hỏng gần bạn
        </Text>
        <Text selectable style={styles.subtitle}>
          Trong bán kính 100m từ vị trí hiện tại
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
          <Text selectable style={styles.loadingText}>
            Đang tìm các điểm hư hỏng gần bạn...
          </Text>
        </View>
      ) : null}

      {!isLoading && error ? (
        <View style={styles.contentWrap}>
          <StateMessage
            title="Không tải được dữ liệu"
            description={error}
            tone="error"
          />
          <AppButton
            label="Bật vị trí & Thử lại"
            icon={<AppIcon name="locate" size={iconSize.sm} color={colors.primary} containerSize={18} />}
            onPress={async () => {
              await ensureLocationReady({ requestPermission: true, promptAlert: true });
              void loadNearbyReports('refresh');
            }}
          />
        </View>
      ) : null}

      {!isLoading && !error && reports.length === 0 ? (
        <View style={styles.contentWrap}>
          <EmptyState
            icon="navigate-outline"
            title="Chưa có điểm hư hỏng gần bạn"
            description="Trong bán kính 100m hiện chưa có điểm hư hỏng nào cần theo dõi."
          />
        </View>
      ) : null}

      {!isLoading && !error && reports.length > 0 ? (
        <FlatList
          data={visibleReports}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              colors={[colors.primary]}
              tintColor={colors.primary}
              refreshing={isRefreshing}
              onRefresh={() => {
                void loadNearbyReports('refresh');
              }}
            />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.35}
          renderItem={({ item }) => (
            <RecentReportCard
              report={item}
              onPress={(reportId) =>
                navigation.navigate('ReportDetailScreen', { reportId })
              }
            />
          )}
          ListHeaderComponent={
            <View style={styles.summaryCard}>
              <Text selectable style={styles.summaryValue}>
                {reports.length} điểm
              </Text>
              <Text selectable style={styles.summaryLabel}>
                Trong phạm vi 100m quanh bạn
              </Text>
            </View>
          }
          ListFooterComponent={
            visibleCount < reports.length ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text selectable style={styles.footerText}>
                  Đang tải thêm...
                </Text>
              </View>
            ) : (
              <View style={styles.footer}>
                <Text selectable style={styles.footerTextMuted}>
                  Đã hiển thị hết các điểm gần bạn
                </Text>
              </View>
            )
          }
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  contentWrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  summaryCard: {
    padding: spacing.md,
    borderRadius: 18,
    backgroundColor: '#EEF5FF',
    borderWidth: 1,
    borderColor: '#CFE1FF',
    gap: 4,
  },
  summaryValue: {
    color: colors.primaryDark,
    fontSize: 20,
    fontWeight: '900',
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  footerText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  footerTextMuted: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
});
