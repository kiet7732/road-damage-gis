import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AppButton from './AppButton';
import AppIcon from './AppIcon';
import { colors, iconSize, radius, spacing, touchTarget } from '../theme';
import {
  getLoginErrorMessage,
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  verifyPasswordResetOtp,
} from '../authService';

type Step = 'EMAIL' | 'OTP' | 'NEW_PASSWORD' | 'SUCCESS';

type Props = {
  visible: boolean;
  initialEmail?: string;
  onClose: () => void;
  onSuccess: (email: string) => void;
};

export default function ForgotPasswordModal({
  visible,
  initialEmail = '',
  onClose,
  onSuccess,
}: Props) {
  const [step, setStep] = useState<Step>('EMAIL');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Timers
  const [timeLeft, setTimeLeft] = useState(300); // 5 phút
  const [resendCooldown, setResendCooldown] = useState(60); // 60s cooldown

  useEffect(() => {
    if (visible) {
      setStep('EMAIL');
      setEmail(initialEmail.trim());
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setErrorMessage('');
      setTimeLeft(300);
      setResendCooldown(60);
      setIsSubmitting(false);
    }
  }, [visible, initialEmail]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (visible && step === 'OTP') {
      timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [visible, step]);

  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // STEP 1: Gửi mã OTP
  const handleRequestOtp = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Vui lòng nhập địa chỉ email của bạn.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setErrorMessage('Địa chỉ email không hợp lệ (ví dụ: name@gmail.com).');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await requestPasswordResetOtp(trimmedEmail);
      setTimeLeft(res.expiresIn || 300);
      setResendCooldown(60);
      setStep('OTP');
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gửi lại mã OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await requestPasswordResetOtp(email.trim());
      setTimeLeft(res.expiresIn || 300);
      setResendCooldown(60);
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // STEP 2: Xác minh OTP
  const handleVerifyOtp = async () => {
    const trimmedOtp = otp.trim();
    if (trimmedOtp.length < 4) {
      setErrorMessage('Vui lòng nhập đầy đủ mã xác nhận OTP.');
      return;
    }
    if (timeLeft <= 0) {
      setErrorMessage('Mã xác nhận đã hết hạn. Vui lòng bấm Gửi lại mã.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await verifyPasswordResetOtp(email.trim(), trimmedOtp);
      setStep('NEW_PASSWORD');
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // STEP 3: Đặt lại mật khẩu mới
  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setErrorMessage('Vui lòng nhập đầy đủ mật khẩu mới và xác nhận.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await resetPasswordWithOtp({
        email: email.trim(),
        otp: otp.trim(),
        newPassword: newPassword.trim(),
      });
      setStep('SUCCESS');
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    const finalEmail = email.trim();
    onClose();
    onSuccess(finalEmail);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.iconCircle}>
                <AppIcon
                  name={
                    step === 'SUCCESS'
                      ? 'checkmark-circle'
                      : step === 'NEW_PASSWORD'
                      ? 'lock-closed'
                      : step === 'OTP'
                      ? 'shield-checkmark'
                      : 'mail'
                  }
                  size={24}
                  color={step === 'SUCCESS' ? colors.success : colors.primary}
                  containerSize={40}
                />
              </View>
              <View style={styles.titleWrap}>
                <Text style={styles.modalTitle}>
                  {step === 'EMAIL' && 'Khôi phục mật khẩu'}
                  {step === 'OTP' && 'Xác thực mã OTP'}
                  {step === 'NEW_PASSWORD' && 'Tạo mật khẩu mới'}
                  {step === 'SUCCESS' && 'Thành công'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {step === 'EMAIL' && 'Bước 1/3: Nhập địa chỉ Gmail nhận mã'}
                  {step === 'OTP' && 'Bước 2/3: Xác minh mã bảo mật'}
                  {step === 'NEW_PASSWORD' && 'Bước 3/3: Đặt lại mật khẩu'}
                  {step === 'SUCCESS' && 'Hoàn tất quy trình'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng"
                hitSlop={8}
                onPress={onClose}
                style={styles.closeBtn}
              >
                <AppIcon name="close" size={20} color={colors.textMuted} containerSize={28} />
              </Pressable>
            </View>

            {/* Error Banner */}
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <AppIcon name="warning-outline" size={16} color={colors.danger} containerSize={18} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <ScrollView
              contentContainerStyle={styles.scrollBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* STEP 1: EMAIL */}
              {step === 'EMAIL' && (
                <View style={styles.stepContainer}>
                  <Text style={styles.stepDesc}>
                    Nhập địa chỉ Gmail đã đăng ký trong hệ thống. Mã xác thực (OTP) 6 chữ số sẽ được gửi trực tiếp đến hộp thư Gmail của bạn để xác minh danh tính.
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Địa chỉ Gmail</Text>
                    <View style={styles.inputBox}>
                      <AppIcon name="mail-outline" size={18} color={colors.textMuted} containerSize={24} />
                      <TextInput
                        autoCapitalize="none"
                        autoComplete="email"
                        autoCorrect={false}
                        editable={!isSubmitting}
                        keyboardType="email-address"
                        onChangeText={(t) => {
                          setEmail(t);
                          setErrorMessage('');
                        }}
                        placeholder="name@gmail.com"
                        placeholderTextColor={colors.textMuted}
                        style={styles.textInput}
                        value={email}
                      />
                    </View>
                  </View>

                  <View style={styles.actionWrap}>
                    <AppButton
                      accessibilityLabel="Gửi mã xác minh"
                      disabled={isSubmitting || !email.trim()}
                      icon={isSubmitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : undefined}
                      label={isSubmitting ? 'ĐANG GỬI MÃ...' : 'GỬI MÃ XÁC MINH'}
                      onPress={handleRequestOtp}
                    />
                  </View>
                </View>
              )}

              {/* STEP 2: OTP */}
              {step === 'OTP' && (
                <View style={styles.stepContainer}>
                  <Text style={styles.stepDesc}>
                    Mã xác thực 6 chữ số đã được gửi đến:{' '}
                    <Text style={styles.boldEmail}>{email}</Text>
                    {'\n'}Vui lòng kiểm tra hộp thư đến (Inbox) hoặc Spam/Thư rác trong Gmail và nhập mã bên dưới.
                  </Text>

                  {/* Countdown Timer Card */}
                  <View style={[styles.timerCard, timeLeft === 0 && styles.timerCardExpired]}>
                    <AppIcon
                      name={timeLeft > 0 ? 'time-outline' : 'alert-circle-outline'}
                      size={18}
                      color={timeLeft > 0 ? colors.primary : colors.danger}
                      containerSize={22}
                    />
                    <Text style={[styles.timerText, timeLeft === 0 && styles.timerTextExpired]}>
                      {timeLeft > 0
                        ? `Mã có hiệu lực trong: ${formatTimer(timeLeft)}`
                        : 'Mã xác nhận đã hết hạn. Vui lòng bấm Gửi lại mã.'}
                    </Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nhập mã OTP (6 số)</Text>
                    <TextInput
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isSubmitting}
                      keyboardType="number-pad"
                      maxLength={6}
                      onChangeText={(t) => {
                        setOtp(t);
                        setErrorMessage('');
                      }}
                      placeholder="• • • • • •"
                      placeholderTextColor={colors.textMuted}
                      style={styles.otpInput}
                      value={otp}
                    />
                  </View>

                  <View style={styles.resendRow}>
                    <Pressable
                      disabled={resendCooldown > 0 || isSubmitting}
                      onPress={handleResendOtp}
                      style={styles.resendBtn}
                    >
                      <Text
                        style={[
                          styles.resendBtnText,
                          (resendCooldown > 0 || isSubmitting) && styles.resendBtnTextDisabled,
                        ]}
                      >
                        {resendCooldown > 0
                          ? `Gửi lại mã sau (${resendCooldown}s)`
                          : '🔄 Gửi lại mã xác nhận'}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        setStep('EMAIL');
                        setErrorMessage('');
                      }}
                      style={styles.resendBtn}
                    >
                      <Text style={styles.changeEmailText}>Đổi email khác</Text>
                    </Pressable>
                  </View>

                  <View style={styles.actionWrap}>
                    <AppButton
                      accessibilityLabel="Xác minh mã"
                      disabled={isSubmitting || otp.trim().length < 4 || timeLeft === 0}
                      icon={isSubmitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : undefined}
                      label={isSubmitting ? 'ĐANG KIỂM TRA...' : 'XÁC NHẬN MÃ'}
                      onPress={handleVerifyOtp}
                    />
                  </View>
                </View>
              )}

              {/* STEP 3: NEW PASSWORD */}
              {step === 'NEW_PASSWORD' && (
                <View style={styles.stepContainer}>
                  <Text style={styles.stepDesc}>
                    Mã xác thực chính xác! Vui lòng tạo mật khẩu mới cho tài khoản (tối thiểu 6 ký tự).
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Mật khẩu mới</Text>
                    <View style={styles.inputBox}>
                      <AppIcon name="lock-closed-outline" size={18} color={colors.textMuted} containerSize={24} />
                      <TextInput
                        autoCapitalize="none"
                        autoComplete="new-password"
                        editable={!isSubmitting}
                        onChangeText={(t) => {
                          setNewPassword(t);
                          setErrorMessage('');
                        }}
                        placeholder="Nhập ít nhất 6 ký tự"
                        placeholderTextColor={colors.textMuted}
                        secureTextEntry={!isPasswordVisible}
                        style={styles.textInput}
                        value={newPassword}
                      />
                      <Pressable
                        hitSlop={8}
                        onPress={() => setIsPasswordVisible((v) => !v)}
                        style={styles.eyeBtn}
                      >
                        <AppIcon
                          name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                          size={18}
                          color={colors.textMuted}
                          containerSize={24}
                        />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nhập lại mật khẩu</Text>
                    <View style={styles.inputBox}>
                      <AppIcon name="shield-outline" size={18} color={colors.textMuted} containerSize={24} />
                      <TextInput
                        autoCapitalize="none"
                        autoComplete="new-password"
                        editable={!isSubmitting}
                        onChangeText={(t) => {
                          setConfirmPassword(t);
                          setErrorMessage('');
                        }}
                        placeholder="Nhập lại mật khẩu mới"
                        placeholderTextColor={colors.textMuted}
                        secureTextEntry={!isPasswordVisible}
                        style={styles.textInput}
                        value={confirmPassword}
                      />
                    </View>
                  </View>

                  <View style={styles.actionWrap}>
                    <AppButton
                      accessibilityLabel="Đặt lại mật khẩu"
                      disabled={isSubmitting || !newPassword || !confirmPassword}
                      icon={isSubmitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : undefined}
                      label={isSubmitting ? 'ĐANG LƯU MẬT KHẨU...' : 'ĐẶT LẠI MẬT KHẨU'}
                      onPress={handleResetPassword}
                    />
                  </View>
                </View>
              )}

              {/* STEP 4: SUCCESS */}
              {step === 'SUCCESS' && (
                <View style={[styles.stepContainer, { alignItems: 'center', paddingVertical: 12 }]}>
                  <View style={styles.successIconBox}>
                    <AppIcon name="checkmark-circle" size={54} color={colors.success} containerSize={64} />
                  </View>
                  <Text style={styles.successTitle}>Đổi mật khẩu thành công!</Text>
                  <Text style={styles.successDesc}>
                    Mật khẩu tài khoản của bạn đã được cập nhật thành công. Vui lòng bấm bên dưới để quay lại màn hình đăng nhập.
                  </Text>

                  <View style={[styles.actionWrap, { width: '100%', marginTop: 20 }]}>
                    <AppButton
                      accessibilityLabel="Đăng nhập ngay"
                      label="ĐĂNG NHẬP NGAY"
                      onPress={handleFinish}
                    />
                  </View>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  keyboardWrap: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  titleWrap: {
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
  closeBtn: {
    padding: 4,
    alignSelf: 'flex-start',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  scrollBody: {
    paddingVertical: spacing.xs,
  },
  stepContainer: {
    gap: spacing.md,
  },
  stepDesc: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 19,
  },
  boldEmail: {
    fontWeight: '700',
    color: colors.primaryDark,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    minHeight: touchTarget.min,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  eyeBtn: {
    padding: 6,
  },
  otpInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#93C5FD',
    borderRadius: radius.md,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 8,
    textAlign: 'center',
    color: colors.primaryDark,
    paddingVertical: spacing.md,
  },
  timerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 8,
  },
  timerCardExpired: {
    backgroundColor: '#FEF2F2',
  },
  timerText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  timerTextExpired: {
    color: colors.danger,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resendBtn: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  resendBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  resendBtnTextDisabled: {
    color: colors.textMuted,
  },
  changeEmailText: {
    fontSize: 13,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  actionWrap: {
    marginTop: spacing.xs,
  },
  successIconBox: {
    marginBottom: spacing.sm,
  },
  successTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.text,
  },
  successDesc: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
    paddingHorizontal: spacing.md,
  },
});
