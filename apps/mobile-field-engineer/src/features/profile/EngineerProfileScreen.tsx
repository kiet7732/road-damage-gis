import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFieldEngineerUiLabel } from '../../../../../packages/shared-constants/src/engineerLabels';
import type { EngineerBottomTabParamList, EngineerRootStackParamList } from '../../types/navigation';
import { AppIcon, ForgotPasswordModal } from '../../shared/mobileShared';
import {
  changeMobilePassword,
  fetchCurrentEngineerUser,
  logoutEngineer,
} from '../../services/authService';
import { engineerColors, engineerRadius, engineerSpacing } from '../../styles/engineerTheme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<EngineerBottomTabParamList, 'Profile'>,
  NativeStackScreenProps<EngineerRootStackParamList>
> & {
  onLogout: () => void;
};

export default function EngineerProfileScreen({ navigation, onLogout }: Props) {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<{ fullName?: string; email?: string; phone?: string; role?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showChangePwdModal, setShowChangePwdModal] = useState(false);
  const [showForgotPwdModal, setShowForgotPwdModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmittingPwd, setIsSubmittingPwd] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const hasLoadedRef = useRef(false);

  const loadProfile = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else if (!hasLoadedRef.current) {
      setIsLoading(true);
    }
    try {
      setProfile(await fetchCurrentEngineerUser());
      hasLoadedRef.current = true;
    } catch {
      setProfile(null);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    void loadProfile(true);
  }, [loadProfile]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

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

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, engineerSpacing.md) }]}>
        <Text style={styles.title}>Tài khoản kỹ sư</Text>
        <Text style={styles.subtitle}>Quản lý ca trực tác nghiệp & Nhật ký thực địa</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(130, insets.bottom + 104) }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[engineerColors.brandAccent]}
            tintColor={engineerColors.brandAccent}
          />
        }
      >
        {/* User Card */}
        <View style={styles.card}>
          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={engineerColors.brandAccent} />
              <Text style={styles.loadingText}>Đang tải thông tin tài khoản...</Text>
            </View>
          ) : (
            <>
              <View style={styles.avatarRow}>
                <View style={styles.avatarBox}>
                  <AppIcon name="person" size={28} color="#0F52BA" containerSize={48} />
                </View>
                <View style={styles.avatarTextWrap}>
                  <Text style={styles.name}>{profile?.fullName || 'Kỹ sư hiện trường'}</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>
                      KỸ SƯ HIỆN TRƯỜNG
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.metaDivider} />

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Email liên hệ:</Text>
                <Text style={styles.metaValue}>{profile?.email || 'Chưa cập nhật'}</Text>
              </View>

              {profile?.phone ? (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Số điện thoại:</Text>
                  <Text style={styles.metaValue}>{profile.phone}</Text>
                </View>
              ) : null}
            </>
          )}
        </View>

        {/* Tactical History Link */}
        <Pressable
          onPress={() => navigation.navigate('EngineerHistory')}
          style={({ pressed }) => [styles.linkCard, pressed && styles.linkCardPressed]}
        >
          <View style={styles.linkIconBox}>
            <AppIcon name="journal-outline" size={22} color="#0F52BA" containerSize={32} />
          </View>
          <View style={styles.linkBody}>
            <Text style={styles.linkTitle}>Nhật ký tác nghiệp hiện trường</Text>
            <Text style={styles.linkDescription}>Tra cứu các điểm đã khảo sát, hoàn tất hoặc chuyển giao</Text>
          </View>
          <AppIcon name="chevron-forward" size={18} color="#94A3B8" containerSize={20} />
        </Pressable>

        {/* Change Password Link */}
        <Pressable
          onPress={() => {
            setPwdError('');
            setPwdSuccess('');
            setShowChangePwdModal(true);
          }}
          style={({ pressed }) => [styles.linkCard, pressed && styles.linkCardPressed]}
        >
          <View style={[styles.linkIconBox, { backgroundColor: '#EFF6FF' }]}>
            <AppIcon name="key-outline" size={22} color="#0F52BA" containerSize={32} />
          </View>
          <View style={styles.linkBody}>
            <Text style={styles.linkTitle}>Đổi mật khẩu tài khoản</Text>
            <Text style={styles.linkDescription}>Cập nhật khi còn nhớ mật khẩu cũ</Text>
          </View>
          <AppIcon name="chevron-forward" size={18} color="#94A3B8" containerSize={20} />
        </Pressable>

        <Pressable
          onPress={() => {
            setShowForgotPwdModal(true);
          }}
          style={({ pressed }) => [styles.linkCard, pressed && styles.linkCardPressed]}
        >
          <View style={[styles.linkIconBox, { backgroundColor: '#EFF6FF' }]}>
            <AppIcon name="mail-unread-outline" size={22} color="#0F52BA" containerSize={32} />
          </View>
          <View style={styles.linkBody}>
            <Text style={styles.linkTitle}>Quên mật khẩu</Text>
            <Text style={styles.linkDescription}>Cấp lại mật khẩu qua mã OTP gửi về Gmail</Text>
          </View>
          <AppIcon name="chevron-forward" size={18} color="#94A3B8" containerSize={20} />
        </Pressable>

        {/* Logout Button */}
        <Pressable
          onPress={async () => {
            await logoutEngineer();
            onLogout();
          }}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
        >
          <AppIcon name="log-out-outline" size={18} color="#DC2626" containerSize={20} />
          <Text style={styles.logoutButtonText}>Đăng xuất tài khoản</Text>
        </Pressable>
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
                <AppIcon name="key-outline" size={22} color="#0F52BA" containerSize={36} />
              </View>
              <View style={styles.modalTitleWrap}>
                <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
                <Text style={styles.modalSubtitle}>Nhập mật khẩu mới cho tài khoản kỹ sư</Text>
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
                <AppIcon name="alert-circle-outline" size={18} color="#DC2626" containerSize={20} />
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
                placeholderTextColor="#94A3B8"
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
                placeholderTextColor="#94A3B8"
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
                placeholderTextColor="#94A3B8"
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
              <Pressable
                disabled={isSubmittingPwd || !currentPassword || !newPassword || !confirmPassword}
                onPress={handleChangePassword}
                style={[
                  styles.saveBtn,
                  (isSubmittingPwd || !currentPassword || !newPassword || !confirmPassword) && styles.saveBtnDisabled,
                ]}
              >
                {isSubmittingPwd ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Lưu mật khẩu</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        visible={showForgotPwdModal}
        initialEmail={profile?.email || ''}
        onClose={() => setShowForgotPwdModal(false)}
        onSuccess={async () => {
          setShowForgotPwdModal(false);
          await logoutEngineer();
          onLogout();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: engineerSpacing.md,
    paddingBottom: engineerSpacing.md,
    paddingHorizontal: engineerSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  title: {
    color: '#0B132B',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    padding: engineerSpacing.lg,
    gap: engineerSpacing.lg,
    paddingBottom: 110,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: engineerSpacing.lg,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  loadingWrap: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: engineerColors.textSecondary,
    fontSize: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF5FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextWrap: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: '#0B132B',
    fontSize: 16,
    fontWeight: '900',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#EEF5FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  roleBadgeText: {
    color: '#0F52BA',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  metaDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  metaValue: {
    color: '#0B132B',
    fontSize: 12,
    fontWeight: '800',
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: engineerSpacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  linkIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF5FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkBody: {
    flex: 1,
    gap: 2,
  },
  linkTitle: {
    color: '#0B132B',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  linkDescription: {
    color: '#64748B',
    fontSize: 11,
  },
  linkCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  logoutButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  logoutButtonText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  logoutButtonPressed: {
    opacity: 0.85,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: engineerSpacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: engineerRadius.xl,
    padding: engineerSpacing.xl,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: engineerSpacing.md,
    marginBottom: engineerSpacing.md,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: engineerRadius.lg,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleWrap: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0B132B',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: engineerSpacing.sm,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: engineerRadius.md,
    padding: engineerSpacing.sm,
    marginBottom: engineerSpacing.md,
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
    gap: engineerSpacing.sm,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: engineerRadius.md,
    padding: engineerSpacing.sm,
    marginBottom: engineerSpacing.md,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '600',
    flex: 1,
  },
  formGroup: {
    marginBottom: engineerSpacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B132B',
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
    color: '#0F52BA',
  },
  inputField: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: engineerRadius.md,
    paddingHorizontal: engineerSpacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0B132B',
    backgroundColor: '#FFFFFF',
  },
  modalButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: engineerSpacing.md,
    marginTop: engineerSpacing.sm,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: engineerSpacing.lg,
    borderRadius: engineerRadius.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: engineerSpacing.lg,
    borderRadius: engineerRadius.md,
    backgroundColor: '#0F52BA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.7,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
