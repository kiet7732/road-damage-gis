import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from './AppButton';
import AppIcon from './AppIcon';
import ForgotPasswordModal from './ForgotPasswordModal';
import { colors, iconSize, radius, spacing, touchTarget } from '../theme';
import { getLoginErrorMessage, login, type AuthUser } from '../authService';

type Props = {
  onLogin?: (user?: AuthUser) => void;
  onRegisterPress?: () => void;
};

export default function UnifiedLoginScreen({ onLogin, onRegisterPress }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const cardRef = useRef<View | null>(null);
  const passwordInputRef = useRef<TextInput | null>(null);

  const compact = width < 370 || height < 700;
  const isFormReady = useMemo(
    () => email.trim().length > 0 && password.length >= 6,
    [email, password],
  );

  const validateForm = (): boolean => {
    const trimmedEmail = email.trim();
    let isValid = true;
    setEmailError('');
    setPasswordError('');
    setSubmitError('');

    if (!trimmedEmail) {
      setEmailError('Vui lòng nhập email.');
      isValid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setEmailError('Email không hợp lệ (ví dụ: name@domain.com).');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Vui lòng nhập mật khẩu.');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Mật khẩu phải có ít nhất 6 ký tự.');
      isValid = false;
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (!validateForm() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const session = await login({
        email: email.trim(),
        password,
      });
      onLogin?.(session.user);
    } catch (error) {
      setSubmitError(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          ref={scrollRef}
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { padding: compact ? spacing.md : spacing.xl },
          ]}
        >
          <View ref={cardRef} style={styles.card}>
            {/* Header / Brand */}
            <View style={styles.headerBox}>
              <View style={styles.iconCircle}>
                <AppIcon name="shield-checkmark" size={28} color={colors.primary} containerSize={40} />
              </View>
              <View style={styles.badgeRow}>
                <View style={styles.portalBadge}>
                  <Text style={styles.portalBadgeText}>CỔNG XÁC THỰC HỆ THỐNG</Text>
                </View>
              </View>
              <Text style={styles.appTitle}>ROAD DAMAGE GIS</Text>
              <Text style={styles.appSubtitle}>
                Hệ thống Quản lý & Khảo sát Hư hỏng Mặt đường Đô thị
              </Text>
            </View>

            <View style={styles.divider} />

            {/* Form Fields */}
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Email / Tài khoản</Text>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  blurOnSubmit={false}
                  editable={!isSubmitting}
                  keyboardType="email-address"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  onChangeText={(val) => {
                    setEmail(val);
                    setEmailError('');
                    setSubmitError('');
                    setSuccessNotice('');
                  }}
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  placeholder="name@roadgis.local"
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="next"
                  style={[
                    styles.input,
                    emailError
                      ? styles.inputError
                      : focusedField === 'email'
                        ? styles.inputFocused
                        : null,
                  ]}
                  value={email}
                />
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Mật khẩu</Text>
                <View
                  style={[
                    styles.inputRow,
                    passwordError
                      ? styles.inputError
                      : focusedField === 'password'
                        ? styles.inputFocused
                        : null,
                  ]}
                >
                  <TextInput
                    ref={passwordInputRef}
                    autoCapitalize="none"
                    autoComplete="password"
                    editable={!isSubmitting}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    onChangeText={(val) => {
                      setPassword(val);
                      setPasswordError('');
                      setSubmitError('');
                      setSuccessNotice('');
                    }}
                    onSubmitEditing={handleLogin}
                    placeholder="Nhập mật khẩu"
                    placeholderTextColor={colors.textMuted}
                    returnKeyType="done"
                    secureTextEntry={!isPasswordVisible}
                    style={styles.inputField}
                    value={password}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={isPasswordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    disabled={isSubmitting}
                    hitSlop={8}
                    onPress={() => setIsPasswordVisible((v) => !v)}
                    style={styles.eyeButton}
                  >
                    <AppIcon
                      name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                      size={iconSize.inline}
                      color={colors.textMuted}
                      containerSize={24}
                    />
                  </Pressable>
                </View>
                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

                <View style={styles.forgotPasswordRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Quên mật khẩu"
                    hitSlop={8}
                    onPress={() => setShowForgotModal(true)}
                    style={({ pressed }) => [styles.forgotPasswordPressable, pressed && styles.pressed]}
                  >
                    <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
                  </Pressable>
                </View>
              </View>

              {successNotice ? (
                <View style={styles.successBanner}>
                  <AppIcon name="checkmark-circle-outline" size={18} color={colors.success} containerSize={20} />
                  <Text style={styles.successBannerText}>{successNotice}</Text>
                </View>
              ) : null}

              {submitError ? (
                <View style={styles.errorBanner}>
                  <AppIcon name="warning-outline" size={18} color={colors.danger} containerSize={20} />
                  <Text style={styles.errorBannerText}>{submitError}</Text>
                </View>
              ) : null}
            </View>

            {/* Action */}
            <View style={styles.actionRow}>
              <AppButton
                accessibilityLabel="Đăng nhập hệ thống"
                disabled={isSubmitting || !isFormReady}
                icon={isSubmitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : undefined}
                label={isSubmitting ? 'ĐANG XÁC THỰC...' : 'ĐĂNG NHẬP HỆ THỐNG'}
                onPress={handleLogin}
              />
            </View>

            {/* Register Link (if enabled for citizens) or Admin notice (for engineers) */}
            {onRegisterPress ? (
              <View style={styles.registerRow}>
                <Text style={styles.registerText}>Chưa có tài khoản?</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Đăng ký tài khoản mới"
                  disabled={isSubmitting}
                  hitSlop={8}
                  onPress={onRegisterPress}
                  style={({ pressed }) => [styles.linkPressable, pressed && styles.pressed]}
                >
                  <Text style={styles.registerLink}>Đăng ký ngay</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.engineerNoticeBox}>
                <AppIcon name="information-circle-outline" size={18} color={colors.primary} containerSize={20} />
                <Text style={styles.engineerNoticeText}>
                  Tài khoản Kỹ sư hiện trường do Ban Quản trị cấp. Vui lòng liên hệ Quản trị viên nếu bạn chưa có tài khoản.
                </Text>
              </View>
            )}

            {/* Quick Demo Login Chips */}
            <View style={styles.demoSection}>
              <Text style={styles.demoTitle}>TÀI KHOẢN TRẢI NGHIỆM NHANH</Text>
              <View style={styles.demoChipsRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Chọn tài khoản Người dân"
                  style={({ pressed }) => [styles.demoChip, pressed && styles.pressed]}
                  onPress={() => {
                    setEmail('reporter1.demo@roadgis.local');
                    setPassword('Reporter@123');
                    setEmailError('');
                    setPasswordError('');
                    setSubmitError('');
                  }}
                >
                  <Text style={styles.demoChipText}>👤 Người dân</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Chọn tài khoản Kỹ sư"
                  style={({ pressed }) => [styles.demoChip, pressed && styles.pressed]}
                  onPress={() => {
                    setEmail('engineer.a.demo@roadgis.local');
                    setPassword('Engineer@123');
                    setEmailError('');
                    setPasswordError('');
                    setSubmitError('');
                  }}
                >
                  <Text style={styles.demoChipText}>👷 Kỹ sư</Text>
                </Pressable>
              </View>

              <View style={styles.adminNoticeContainer}>
                <Text style={styles.adminNoticeText}>
                  🛡️ Cán bộ Quản trị vui lòng sử dụng Cổng Web Quản lý (Web Admin).
                </Text>
                {Platform.OS === 'web' && (
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel="Mở Cổng Quản trị Web Admin"
                    onPress={() => {
                      if (typeof window !== 'undefined') {
                        const targetUrl = window.location.hostname.includes('dpdns.org')
                          ? 'https://admin.tuannguyenkiet0612.dpdns.org'
                          : 'http://localhost:5173';
                        window.open(targetUrl, '_blank');
                      }
                    }}
                    style={({ pressed }) => [styles.adminPortalLink, pressed && styles.pressed]}
                  >
                    <Text style={styles.adminPortalLinkText}>
                      🖥️ Mở Cổng Quản trị Web Admin (Port 5173) ↗
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Interactive Forgot Password OTP Flow */}
      <ForgotPasswordModal
        visible={showForgotModal}
        initialEmail={email}
        onClose={() => setShowForgotModal(false)}
        onSuccess={(updatedEmail) => {
          setEmail(updatedEmail);
          setPassword('');
          setEmailError('');
          setPasswordError('');
          setSubmitError('');
          setSuccessNotice('Đặt lại mật khẩu thành công! Vui lòng nhập mật khẩu mới để đăng nhập.');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  keyboardView: {
    flex: 1,
    width: '100%',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.xl,
    gap: spacing.lg,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 4,
  },
  headerBox: {
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  badgeRow: {
    flexDirection: 'row',
  },
  portalBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: '#EEF5FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  portalBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  appTitle: {
    color: colors.primaryDark,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  appSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 360,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  form: {
    gap: spacing.md,
  },
  field: {
    gap: 6,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 14,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  inputRow: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingLeft: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputField: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    height: '100%',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: '#FAFCFF',
    borderWidth: 1.5,
  },
  eyeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  inputError: {
    borderColor: colors.danger,
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorBannerText: {
    flex: 1,
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successBannerText: {
    flex: 1,
    color: '#065F46',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  actionRow: {
    marginTop: 4,
  },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  registerText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  linkPressable: {
    paddingVertical: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  registerLink: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  engineerNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  engineerNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 16,
    fontWeight: '500',
  },
  demoSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
    gap: 8,
  },
  demoTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  demoChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  demoChip: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  demoChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  pressed: {
    opacity: 0.8,
  },
  adminNoticeContainer: {
    marginTop: 6,
    alignItems: 'center',
    gap: 4,
  },
  adminNoticeText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
  },
  adminPortalLink: {
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: '#EEF5FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  adminPortalLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  forgotPasswordRow: {
    alignItems: 'flex-end',
    marginTop: 4,
    marginBottom: 4,
  },
  forgotPasswordPressable: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
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
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderTitleWrap: {
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
  modalDesc: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  modalContactCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  modalContactLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  modalContactValue: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  modalActionWrap: {
    marginTop: spacing.xs,
  },
});
