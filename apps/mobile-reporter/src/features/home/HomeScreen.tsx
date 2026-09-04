import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useRef } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../../components/AppIcon';
import AppButton from '../../components/AppButton';
import EmptyState from '../../components/EmptyState';
import { KpiSkeletonGrid } from '../../components/Skeleton';
import StateMessage from '../../components/StateMessage';
import { colors, iconSize, spacing } from '../../constants/theme';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchCurrentMobileUser } from '../../services/authService';
import { getOrLoadUserLocation } from '../../services/locationService';
import {
  DEFAULT_NEARBY_REPORT_RADIUS_METERS,
  fetchNearbyUnrepairedReports,
  getDamageTypeDisplayLabel,
  fetchReportHistory,
  getNearbyReportErrorMessage,
  getReportHistoryErrorMessage,
} from '../../services/reportService';
import type { BottomTabParamList, RootStackParamList } from '../../types/navigation';
import type { Report } from '../../types/roadDamage';
import HomeStatCard from './components/HomeStatCard';
import RecentReportCard from './components/RecentReportCard';

type HomeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<BottomTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const userState = useAsyncData(fetchCurrentMobileUser, []);
  const reportState = useAsyncData(fetchReportHistory, []);
  const nearbyReportState = useAsyncData(
    useCallback(async () => {
      const userLocation = await getOrLoadUserLocation();

      if (!userLocation) {
        throw new Error('Chưa lấy được vị trí hiện tại để thống kê các điểm gần bạn.');
      }

      return fetchNearbyUnrepairedReports({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        radiusMeters: DEFAULT_NEARBY_REPORT_RADIUS_METERS,
        limit: 20,
      });
    }, []),
    [],
  );
  const reloadUser = userState.reload;
  const reloadReports = reportState.reload;
  const reloadNearbyReports = nearbyReportState.reload;
  const reports = reportState.data ?? [];
  const recentReports = reports.slice(0, 3);
  const nearbyReports = nearbyReportState.data ?? [];
  const nearbyPreviewReports = nearbyReports.slice(0, 2);
  const compact = width < 370;
  const horizontalPadding = compact ? spacing.md : spacing.lg;
  const contentBottomPadding = Math.max(120, insets.bottom + 92);
  const topPadding = Math.max(insets.top + spacing.sm, Platform.OS === 'android' ? 18 : spacing.md);
  const hasHandledInitialFocusRef = useRef(false);

  const stats = buildStatusStats(reports);
  const isLoading = userState.isLoading || reportState.isLoading;
  const isRefreshing =
    userState.isRefreshing || reportState.isRefreshing || nearbyReportState.isRefreshing;
  const isError = userState.isError || reportState.isError;
  const errorText =
    userState.error ||
    reportState.error ||
    getReportHistoryErrorMessage(new Error('Không tải được thông tin.'));
  const nearbyErrorText =
    nearbyReportState.error ||
    getNearbyReportErrorMessage(new Error('Không tải được dữ liệu điểm gần bạn.'));

  const reloadHomeData = useCallback(async (mode: 'initial' | 'refresh' = 'refresh') => {
    await Promise.all([
      reloadUser(mode),
      reloadReports(mode),
      reloadNearbyReports(mode),
    ]);
  }, [reloadNearbyReports, reloadReports, reloadUser]);

  useFocusEffect(
    useCallback(() => {
      if (!hasHandledInitialFocusRef.current) {
        hasHandledInitialFocusRef.current = true;
        return;
      }

      void reloadHomeData('refresh');
    }, [reloadHomeData]),
  );

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            tintColor={colors.primary}
            refreshing={isRefreshing}
            onRefresh={() => {
              void reloadHomeData('refresh');
            }}
          />
        }
        contentContainerStyle={[
          styles.container,
          {
            paddingHorizontal: horizontalPadding,
            paddingTop: topPadding,
            paddingBottom: contentBottomPadding,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text selectable numberOfLines={1} adjustsFontSizeToFit style={styles.greeting}>
              Xin chào, {userState.data?.fullName ?? userState.data?.name ?? 'Người phản ánh'}
            </Text>
            <Text selectable numberOfLines={2} style={styles.headerSubtitle}>
              Phản ánh hư hỏng mặt đường vị trí thực tế.
            </Text>
          </View>

          <View style={styles.avatar}>
            <Text selectable={false} style={styles.avatarText}>
              {(userState.data?.fullName ?? userState.data?.name ?? 'A').trim().charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mở camera để gửi phản ánh"
          onPress={() => navigation.navigate('CameraScreen')}
          style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
        >
          <View style={styles.quickIcon}>
            <AppIcon name="camera" size={iconSize.xl} color={colors.surface} containerSize={42} />
          </View>
          <View style={styles.quickText}>
            <Text selectable numberOfLines={1} style={styles.quickTitle}>
              Gửi phản ánh mới
            </Text>
            <Text selectable numberOfLines={2} style={styles.quickSubtitle}>
              Chụp ảnh tại hiện trường và tự động ghi nhận vị trí.
            </Text>
          </View>
          <AppIcon name="chevron-forward" size={iconSize.md} color={colors.textOnDark} containerSize={28} />
        </Pressable>

        <View style={styles.sectionHeader}>
          <View>
            <Text selectable style={styles.sectionTitle}>
              Thống kê phản ánh
            </Text>
            <Text selectable style={styles.sectionSubtitle}>
              Theo trạng thái xử lý hiện tại
            </Text>
          </View>
        </View>

        {isLoading ? <KpiSkeletonGrid /> : null}

        {!isLoading && isError ? (
          <StateMessage title="Không thể tải thông tin" description={errorText} tone="error" />
        ) : null}

        {!isLoading && !isError ? (
          <View style={styles.statsGrid}>
            {stats.map((item) => (
              <HomeStatCard
                key={item.label}
                label={item.label}
                value={item.value}
                icon={item.icon}
                color={item.color}
                backgroundColor={item.backgroundColor}
                borderColor={item.borderColor}
              />
            ))}
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <View>
            <Text selectable style={styles.sectionTitle}>
              Hư hỏng gần bạn
            </Text>
            <Text selectable style={styles.sectionSubtitle}>
              Trong bán kính 100m từ vị trí hiện tại
            </Text>
          </View>

          <AppButton
            label="Xem thêm"
            variant="outline"
            icon={<AppIcon name="navigate-outline" size={iconSize.sm} color={colors.primaryDark} containerSize={18} />}
            style={styles.historyButton}
            onPress={() => navigation.navigate('NearbyReportsScreen')}
          />
        </View>

        {nearbyReportState.isLoading ? (
          <StateMessage
            title="Đang tìm điểm hư hỏng gần bạn"
            description="Hệ thống đang thống kê các điểm trong phạm vi 100m."
            loading
          />
        ) : null}

        {!nearbyReportState.isLoading && nearbyReportState.isError ? (
          <StateMessage
            title="Không tải được điểm gần bạn"
            description={nearbyErrorText}
            tone="error"
          />
        ) : null}

        {!nearbyReportState.isLoading &&
        !nearbyReportState.isError &&
        nearbyPreviewReports.length === 0 ? (
          <EmptyState
            icon="navigate-outline"
            title="Chưa có điểm hư hỏng gần bạn"
            description="Trong bán kính 100m hiện chưa có điểm hư hỏng nào cần theo dõi."
          />
        ) : null}

        {!nearbyReportState.isLoading &&
        !nearbyReportState.isError &&
        nearbyPreviewReports.length > 0 ? (
          <View style={styles.nearbyList}>
            {nearbyPreviewReports.map((report) => {
              const damageTheme = colorsByDamageType(report.type);
              const statusMeta = statusMetaByReport(report.status);

              return (
                <Pressable
                  key={`nearby-${report.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Xem chi tiết điểm hư hỏng gần bạn ${report.id}`}
                  onPress={() =>
                    navigation.navigate('ReportDetailScreen', { reportId: report.id })
                  }
                  style={({ pressed }) => [
                    styles.nearbyCard,
                    nearbyPreviewReports.length === 1 && styles.nearbyCardSingle,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.nearbyTopRow}>
                    <View
                      style={[
                        styles.nearbyDamageBadge,
                        { backgroundColor: `${damageTheme}16`, borderColor: `${damageTheme}55` },
                      ]}
                    >
                      <View
                        style={[
                          styles.nearbyDamageDot,
                          { backgroundColor: damageTheme },
                        ]}
                      />
                      <Text selectable numberOfLines={1} style={[styles.nearbyType, { color: damageTheme }]}>
                        {getDamageTypeDisplayLabel(report.type) ?? report.type}
                      </Text>
                    </View>

                    <AppIcon
                      name="chevron-forward"
                      size={16}
                      color={colors.textMuted}
                      containerSize={18}
                    />
                  </View>

                  <View style={styles.nearbyContent}>
                    <Text selectable numberOfLines={2} style={styles.nearbyTitle}>
                      {report.title}
                    </Text>

                    <View
                      style={[
                        styles.nearbyStatusPill,
                        { backgroundColor: statusMeta.backgroundColor },
                      ]}
                    >
                      <Text selectable={false} numberOfLines={1} style={[styles.nearbyStatusText, { color: statusMeta.color }]}>
                        {statusMeta.label}
                      </Text>
                    </View>

                    <View style={styles.nearbyMetaRow}>
                      <AppIcon
                        name="time-outline"
                        size={14}
                        color={colors.textMuted}
                        containerSize={16}
                      />
                      <Text selectable numberOfLines={1} style={styles.nearbyMetaText}>
                        {report.createdAt}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <View>
            <Text selectable style={styles.sectionTitle}>
              Phản ánh gần đây
            </Text>
            <Text selectable style={styles.sectionSubtitle}>
              Những phản ánh mới nhất của bạn
            </Text>
          </View>

          <AppButton
            label="Lịch sử"
            variant="outline"
            icon={<AppIcon name="time-outline" size={iconSize.sm} color={colors.primaryDark} containerSize={18} />}
            style={styles.historyButton}
            onPress={() => navigation.navigate('History')}
          />
        </View>

        {!isLoading && !isError && recentReports.length === 0 ? (
          <EmptyState
            icon="file-tray-outline"
            title="Chưa có phản ánh nào"
            description="Những phản ánh mới của bạn sẽ hiển thị tại đây."
            action={
              <AppButton
                label="Gửi phản ánh ngay"
                icon={<AppIcon name="camera" size={iconSize.inline} color={colors.surface} containerSize={22} />}
                onPress={() => navigation.navigate('CameraScreen')}
              />
            }
          />
        ) : null}

        {!isLoading && !isError && recentReports.length > 0 ? (
          <View style={styles.recentList}>
            {recentReports.map((report) => (
              <RecentReportCard
                key={report.id}
                report={report}
                onPress={(reportId) => navigation.navigate('ReportDetailScreen', { reportId })}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function buildStatusStats(reports: Report[]) {
  return [
    {
      label: 'Đã gửi',
      value: reports.length,
      icon: 'send-outline' as const,
      color: colors.primary,
      backgroundColor: '#EEF5FF',
      borderColor: '#CFE1FF',
    },
    {
      label: 'Chờ xác minh',
      value: reports.filter((report) => report.status === 'pending' || report.status === 'new').length,
      icon: 'shield-checkmark-outline' as const,
      color: '#7E3FB3',
      backgroundColor: '#F6EDFF',
      borderColor: '#E2C8FF',
    },
    {
      label: 'Đang xử lý',
      value: reports.filter((report) => report.status === 'processing').length,
      icon: 'construct-outline' as const,
      color: '#0B7F75',
      backgroundColor: '#E6F7F5',
      borderColor: '#B9E8E2',
    },
    {
      label: 'Đã xử lý',
      value: reports.filter((report) => report.status === 'repaired').length,
      icon: 'checkmark-done-circle-outline' as const,
      color: '#119C39',
      backgroundColor: '#E8F8ED',
      borderColor: '#B8E9C5',
    },
  ];
}

function colorsByDamageType(type: Report['type']) {
  return (
    {
      D00: '#2F80ED',
      D10: '#D4A000',
      D20: '#F57C00',
      D40: '#D92D20',
    }[type] ?? colors.primary
  );
}

function statusMetaByReport(status: Report['status']) {
  switch (status) {
    case 'pending':
    case 'new':
      return {
        label: 'Chờ xác minh',
        color: '#7E3FB3',
        backgroundColor: '#F6EDFF',
      };
    case 'processing':
      return {
        label: 'Đang xử lý',
        color: '#0B7F75',
        backgroundColor: '#E6F7F5',
      };
    case 'repaired':
      return {
        label: 'Đã xử lý',
        color: '#119C39',
        backgroundColor: '#E8F8ED',
      };
    default:
      return {
        label: 'Cập nhật',
        color: colors.primaryDark,
        backgroundColor: '#EEF5FF',
      };
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingTop: 0,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  greeting: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6F0FF',
    borderWidth: 1,
    borderColor: '#CFE1FF',
  },
  avatarText: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: '900',
  },
  quickAction: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 24,
    backgroundColor: colors.primaryDark,
  },
  quickIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  quickText: {
    flex: 1,
    gap: 3,
  },
  quickTitle: {
    color: colors.textOnDark,
    fontSize: 18,
    fontWeight: '900',
  },
  quickSubtitle: {
    color: colors.textOnDarkMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  sectionSubtitle: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  historyButton: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  nearbyList: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  nearbyCard: {
    flex: 1,
    minHeight: 170,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  nearbyCardSingle: {
    maxWidth: '48%',
  },
  nearbyDamageBadge: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  nearbyDamageDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  nearbyContent: {
    flex: 1,
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  nearbyTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  nearbyType: {
    fontSize: 13,
    fontWeight: '900',
  },
  nearbyStatusPill: {
    minHeight: 24,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearbyStatusText: {
    fontSize: 10,
    fontWeight: '900',
  },
  nearbyTitle: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  nearbyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nearbyMetaText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  recentList: {
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
});
