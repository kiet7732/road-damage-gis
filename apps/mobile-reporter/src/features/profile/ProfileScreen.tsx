import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import EmptyState from '../../components/EmptyState';
import MenuOptionRow from '../../components/MenuOptionRow';
import ReportCountBadge from '../../components/ReportCountBadge';
import ScreenHeader from '../../components/ScreenHeader';
import { SkeletonBlock } from '../../components/Skeleton';
import StateMessage from '../../components/StateMessage';
import UserAvatar from '../../components/UserAvatar';
import { colors, radius, spacing } from '../../constants/theme';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchCurrentMobileUser } from '../../services/authService';
import { fetchReportHistory, getReportHistoryErrorMessage } from '../../services/reportService';
import type { RootStackParamList } from '../../types/navigation';

type ProfileScreenProps = {
  onLogout: () => Promise<void> | void;
};

export default function ProfileScreen({ onLogout }: ProfileScreenProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const userState = useAsyncData(fetchCurrentMobileUser, []);
  const reportState = useAsyncData(fetchReportHistory, []);
  const reloadUser = userState.reload;
  const reloadReports = reportState.reload;
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userName = userState.data?.fullName ?? userState.data?.name ?? 'N/A';
  const compact = width < 360;
  const avatarSize = compact ? 68 : 84;
  const contentBottomPadding = Math.max(spacing.xxl, insets.bottom + 92);
  const hasHandledInitialFocusRef = useRef(false);
  const errorMessage = useMemo(
    () => userState.error || reportState.error || getReportHistoryErrorMessage(new Error('Không tải được thông tin tài khoản.')),
    [reportState.error, userState.error],
  );
  const isRefreshing = userState.isRefreshing || reportState.isRefreshing;
  const processingUpdateCount = useMemo(
    () =>
      (reportState.data ?? []).filter((report) => {
        const updatedAtRaw = report.updatedAtRaw ?? '';
        const createdAtRaw = report.createdAtRaw ?? '';

        return Boolean(updatedAtRaw) && Boolean(createdAtRaw) && updatedAtRaw !== createdAtRaw;
      }).length,
    [reportState.data],
  );

  const reloadProfileData = useCallback(async (mode: 'initial' | 'refresh' = 'refresh') => {
    await Promise.all([
      reloadUser(mode),
      reloadReports(mode),
    ]);
  }, [reloadReports, reloadUser]);

  useFocusEffect(
    useCallback(() => {
      if (!hasHandledInitialFocusRef.current) {
        hasHandledInitialFocusRef.current = true;
        return;
      }

      void reloadProfileData('refresh');
    }, [reloadProfileData]),
  );

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      await onLogout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            tintColor={colors.primary}
            refreshing={isRefreshing}
            onRefresh={() => {
              void reloadProfileData('refresh');
            }}
          />
        }
        contentContainerStyle={[
          styles.container,
          {
            paddingHorizontal: compact ? spacing.md : spacing.lg,
            paddingBottom: contentBottomPadding,
          },
        ]}
      >
        <ScreenHeader
          title="Tài khoản"
          subtitle="Thông tin cá nhân của bạn"
          hideLeftAction
          rightIcon="notifications-outline"
          onRightPress={() => navigation.navigate('ProcessingUpdatesScreen')}
        />

        {userState.isLoading || reportState.isLoading ? <ProfileSkeleton avatarSize={avatarSize} /> : null}

        {!userState.isLoading && !reportState.isLoading && (userState.isError || reportState.isError) ? (
          <StateMessage title="Không tải được tài khoản" description={errorMessage} tone="error" />
        ) : null}

        {!userState.isLoading && !reportState.isLoading && userState.data ? (
          <>
            <View style={[styles.profileCard, compact && styles.profileCardCompact]}>
              <UserAvatar name={userName} size={avatarSize} />
              <View style={[styles.profileInfo, compact && styles.profileInfoCompact]}>
                <Text selectable numberOfLines={2} ellipsizeMode="tail" style={[styles.name, compact && styles.nameCompact]}>
                  {userName}
                </Text>
                <Text selectable numberOfLines={1} ellipsizeMode="tail" style={styles.role}>
                  {userState.data.role ?? 'reporter'}
                </Text>
              </View>
            </View>

            <ReportCountBadge count={reportState.data?.length ?? 0} />
          </>
        ) : null}

        {!userState.isLoading && !userState.isError && !userState.data ? (
          <EmptyState
            icon="person-circle-outline"
            title="Chưa có thông tin tài khoản"
            description="Không tìm thấy thông tin tài khoản của bạn."
          />
        ) : null}

        <View style={styles.menuGroup}>
          <MenuOptionRow
            icon="person-outline"
            title="Thông tin cá nhân"
            subtitle="Họ tên và số điện thoại"
          />
          <MenuOptionRow
            icon="location-outline"
            title="Khu vực thường gửi phản ánh"
            subtitle="Các vị trí đã gửi phản ánh"
          />
          <MenuOptionRow
            icon="notifications-outline"
            title="Cập nhật xử lý"
            subtitle="Thông báo mới về phản ánh"
            badgeLabel={processingUpdateCount > 0 ? String(processingUpdateCount) : null}
            onPress={() => navigation.navigate('ProcessingUpdatesScreen')}
          />
          <MenuOptionRow
            icon="shield-checkmark-outline"
            title="Quyền riêng tư"
            subtitle="Dữ liệu vị trí chỉ dùng để ghi nhận"
          />
          <MenuOptionRow
            icon="log-out-outline"
            title={isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
            subtitle="Xóa phiên trên thiết bị"
            onPress={handleLogout}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileSkeleton({ avatarSize }: { avatarSize: number }) {
  return (
    <>
      <View style={styles.profileCard}>
        <SkeletonBlock width={avatarSize} height={avatarSize} borderRadius={avatarSize / 2} />
        <View style={styles.profileInfo}>
          <SkeletonBlock width="78%" height={26} />
          <SkeletonBlock width="48%" height={16} />
        </View>
      </View>
      <View style={styles.countSkeletonCard}>
        <SkeletonBlock width="44%" height={18} />
        <SkeletonBlock width="24%" height={34} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileCardCompact: {
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
  },
  profileInfoCompact: {
    paddingTop: spacing.xs,
  },
  name: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  nameCompact: {
    fontSize: 20,
    lineHeight: 26,
  },
  role: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  countSkeletonCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuGroup: {
    gap: spacing.md,
  },
});
