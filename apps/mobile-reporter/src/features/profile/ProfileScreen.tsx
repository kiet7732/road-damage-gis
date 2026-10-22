import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppButton from '../../components/AppButton';
import AppIcon from '../../components/AppIcon';
import EmptyState from '../../components/EmptyState';
import ForgotPasswordModal from '../../components/ForgotPasswordModal';
import MenuOptionRow from '../../components/MenuOptionRow';
import ReportCountBadge from '../../components/ReportCountBadge';
import ScreenHeader from '../../components/ScreenHeader';
import { SkeletonBlock } from '../../components/Skeleton';
import StateMessage from '../../components/StateMessage';
import UserAvatar from '../../components/UserAvatar';
import { colors, radius, spacing } from '../../constants/theme';
import { useAsyncData } from '../../hooks/useAsyncData';
import { changeMobilePassword, fetchCurrentMobileUser } from '../../services/authService';
import { fetchReportHistory, getReportHistoryErrorMessage } from '../../services/reportService';
import type { RootStackParamList } from '../../types/navigation';

type ProfileScreenProps = {
  onLogout: () => Promise<void> | void;
};

export default function ProfileScreen({ onLogout }: ProfileScreenProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const userState = useAsyncData(fetchCurrentMobileUser, [], {
    cacheKey: 'current_user',
    ttlMs: 120_000,
  });
  const reportState = useAsyncData(fetchReportHistory, [], {
    cacheKey: 'report_history',
    ttlMs: 60_000,
  });
  const reloadUser = userState.reload;
  const reloadReports = reportState.reload;
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showChangePwdModal, setShowChangePwdModal] = useState(false);
  const [showForgotPwdModal, setShowForgotPwdModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmittingPwd, setIsSubmittingPwd] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  const userName = userState.data?.fullName ?? userState.data?.name ?? 'N/A';
  const compact = width < 360;
  const avatarSize = compact ? 68 : 84;
  const contentBottomPadding = Math.max(140, insets.bottom + 128);
  const hasHandledInitialFocusRef = useRef(false);
  const lastFocusReloadAtRef = useRef(Date.now());

  const handleChangePassword = async () => {
    setPwdError('');
    setPwdSuccess('');

    if (!currentPassword) {
      setPwdError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPwdError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (newPassword === currentPassword) {
      setPwdError('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsSubmittingPwd(true);
    try {
      await changeMobilePassword({ currentPassword, newPassword });
      setPwdSuccess('Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowChangePwdModal(false);
        setPwdSuccess('');
      }, 1500);
    } catch (err: any) {
      setPwdError(err?.message || 'Có lỗi xảy ra khi đổi mật khẩu.');
    } finally {
      setIsSubmittingPwd(false);
    }
  };
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
        lastFocusReloadAtRef.current = Date.now();
        return;
      }

      const now = Date.now();
      if (now - lastFocusReloadAtRef.current < 45_000) {
        return;
      }
      lastFocusReloadAtRef.current = now;

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
            icon="key-outline"
            title="Đổi mật khẩu"
            subtitle="Cập nhật khi còn nhớ mật khẩu cũ"
            onPress={() => {
              setPwdError('');
              setPwdSuccess('');
              setShowChangePwdModal(true);
            }}
          />
          <MenuOptionRow
            icon="mail-unread-outline"
            title="Quên mật khẩu"
            subtitle="Cấp lại mật khẩu qua mã xác thực gửi về Gmail"
            onPress={() => {
              setShowForgotPwdModal(true);
            }}
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

        <Text style={styles.appVersionText}>Phiên bản 1.0.1 (Build 2)</Text>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePwdModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isSubmittingPwd && setShowChangePwdModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => !isSubmittingPwd && setShowChangePwdModal(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalIconWrap}>
                <AppIcon name="key-outline" size={22} color={colors.primary} containerSize={36} />
              </View>
              <View style={styles.modalTitleWrap}>
                <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
                <Text style={styles.modalSubtitle}>Nhập mật khẩu mới cho tài khoản</Text>
              </View>
            </View>

            {pwdSuccess ? (
              <View style={styles.successBanner}>
                <AppIcon name="checkmark-circle-outline" size={18} color="#059669" containerSize={20} />
                <Text style={styles.successBannerText}>{pwdSuccess}</Text>
              </View>
            ) : null}

            {pwdError ? (
              <View style={styles.errorBanner}>
                <AppIcon name="alert-circle-outline" size={18} color={colors.danger} containerSize={20} />
                <Text style={styles.errorBannerText}>{pwdError}</Text>
              </View>
            ) : null}

            <View style={styles.formGroup}>
              <View style={styles.inputLabelRow}>
                <Text style={styles.inputLabel}>Mật khẩu hiện tại</Text>
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    setShowChangePwdModal(false);
                    setShowForgotPwdModal(true);
                  }}
                >
                  <Text style={styles.forgotLinkText}>Quên mật khẩu?</Text>
                </Pressable>
              </View>
              <TextInput
                secureTextEntry
                placeholder="Nhập mật khẩu đang dùng"
                placeholderTextColor={colors.textMuted}
                value={currentPassword}
                onChangeText={(text) => {
                  setCurrentPassword(text);
                  setPwdError('');
                }}
                style={styles.inputField}
                editable={!isSubmittingPwd}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Mật khẩu mới</Text>
              <TextInput
                secureTextEntry
                placeholder="Tối thiểu 6 ký tự"
                placeholderTextColor={colors.textMuted}
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  setPwdError('');
                }}
                style={styles.inputField}
                editable={!isSubmittingPwd}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Xác nhận mật khẩu mới</Text>
              <TextInput
                secureTextEntry
                placeholder="Nhập lại mật khẩu mới"
                placeholderTextColor={colors.textMuted}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setPwdError('');
                }}
                style={styles.inputField}
                editable={!isSubmittingPwd}
              />
            </View>

            <View style={styles.modalButtonRow}>
              <Pressable
                disabled={isSubmittingPwd}
                onPress={() => setShowChangePwdModal(false)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <AppButton
                  label={isSubmittingPwd ? 'Đang lưu...' : 'Lưu mật khẩu'}
                  disabled={isSubmittingPwd || !currentPassword || !newPassword || !confirmPassword}
                  icon={isSubmittingPwd ? <ActivityIndicator color="#FFFFFF" size="small" /> : undefined}
                  onPress={handleChangePassword}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        visible={showForgotPwdModal}
        initialEmail={userState.data?.email ?? ''}
        onClose={() => setShowForgotPwdModal(false)}
        onSuccess={async () => {
          setShowForgotPwdModal(false);
          await onLogout();
        }}
      />
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
  appVersionText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.xl,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: '#E6F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleWrap: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  successBannerText: {
    fontSize: 13,
    color: '#065F46',
    fontWeight: '600',
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '600',
    flex: 1,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  forgotLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  inputField: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: '#FFFFFF',
  },
  modalButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
