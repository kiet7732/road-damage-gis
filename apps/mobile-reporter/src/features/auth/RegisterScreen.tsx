import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
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
import AppButton from '../../components/AppButton';
import AppIcon from '../../components/AppIcon';
import { colors, iconSize, radius, spacing, touchTarget } from '../../constants/theme';
import { getRegisterErrorMessage, register } from '../../services/authService';
import type { AuthStackParamList } from '../../types/navigation';

type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, 'Register'> & {
  onRegisterSuccess: () => void;
};

type RegisterErrors = {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  acceptTerms?: string;
};

type RegisterValidationParams = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

const phonePattern = /^(\+84|0)[0-9]{9,10}$/;

const getRegisterErrors = ({
  fullName,
  email,
  phone,
  password,
  confirmPassword,
  acceptTerms,
}: RegisterValidationParams): RegisterErrors => {
  const nextErrors: RegisterErrors = {};
  const trimmedFullName = fullName.trim();
  const trimmedEmail = email.trim();
  const trimmedPhone = phone.trim();

  if (trimmedFullName.length < 2) {
    nextErrors.fullName = 'Vui lòng nhập họ tên.';
  }

  if (!trimmedEmail) {
    nextErrors.email = 'Vui lòng nhập email.';
  } else if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
    nextErrors.email = 'Email không hợp lệ.';
  }

  if (trimmedPhone && !phonePattern.test(trimmedPhone)) {
    nextErrors.phone = 'Số điện thoại không hợp lệ.';
  }

  if (!password) {
    nextErrors.password = 'Vui lòng nhập mật khẩu.';
  } else if (password.length < 6) {
    nextErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự.';
  }

  if (!confirmPassword) {
    nextErrors.confirmPassword = 'Vui lòng nhập lại mật khẩu.';
  } else if (confirmPassword !== password) {
    nextErrors.confirmPassword = 'Mật khẩu nhập lại không khớp.';
  }

  if (!acceptTerms) {
    nextErrors.acceptTerms = 'Vui lòng xác nhận thông tin cung cấp là đúng.';
  }

  return nextErrors;
};

export default function RegisterScreen({ navigation, onRegisterSuccess }: RegisterScreenProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const cardRef = useRef<View | null>(null);
  const fullNameFieldRef = useRef<View | null>(null);
  const emailFieldRef = useRef<View | null>(null);
  const phoneFieldRef = useRef<View | null>(null);
  const passwordFieldRef = useRef<View | null>(null);
  const confirmPasswordFieldRef = useRef<View | null>(null);

  const compact = width < 360 || height < 720;
  const shortScreen = height < 780;
  const cardPadding = compact ? spacing.md : shortScreen ? spacing.lg : spacing.xl;
  const contentGap = compact ? spacing.md : shortScreen ? spacing.md : spacing.lg;
  const fieldGap = compact ? spacing.sm : spacing.md;
  const inputHeight = compact ? 48 : shortScreen ? 50 : Math.max(52, touchTarget.min);
  const titleSize = compact ? 18 : shortScreen ? 20 : 22;
  const titleLineHeight = compact ? 24 : shortScreen ? 26 : 28;
  const topInsetPadding = compact ? spacing.sm : spacing.md;
  const isFormReady =
    Object.keys(
      getRegisterErrors({
        fullName,
        email,
        phone,
        password,
        confirmPassword,
        acceptTerms,
      }),
    ).length === 0;

  const clearFieldError = (field: keyof RegisterErrors) => {
    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }));
    setSubmitError('');
  };

  const validateForm = (): boolean => {
    const nextErrors = getRegisterErrors({
      fullName,
      email,
      phone,
      password,
      confirmPassword,
      acceptTerms,
    });

    setErrors(nextErrors);
    setSubmitError('');

    return Object.keys(nextErrors).length === 0;
  };

  const handleRegister = async () => {
    if (isSubmitting || !validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      await register({
        fullName,
        email,
        phone,
        password,
      });

      onRegisterSuccess();
    } catch (error) {
      setSubmitError(getRegisterErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToField = (fieldRef: React.RefObject<View | null>) => {
    requestAnimationFrame(() => {
      if (!fieldRef.current || !cardRef.current || !scrollRef.current) {
        return;
      }

      fieldRef.current.measureLayout(
        cardRef.current,
        (_x, y) => {
          scrollRef.current?.scrollTo({
            y: Math.max(0, y - spacing.lg),
            animated: true,
          });
        },
        () => undefined,
      );
    });
  };

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
        style={styles.keyboardView}
      >
        <ScrollView
          ref={scrollRef}
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          scrollEnabled={isKeyboardVisible}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              padding: compact ? spacing.sm : spacing.md,
              justifyContent: 'center',
              paddingBottom: isKeyboardVisible ? spacing.xl : compact ? spacing.md : spacing.lg,
            },
          ]}
        >
          <View ref={cardRef} style={[styles.card, { padding: cardPadding, gap: contentGap }]}>
            <View style={[styles.header, { padding: topInsetPadding }]}>
              <View style={styles.headerTopRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Quay lại đăng nhập"
                  disabled={isSubmitting}
                  hitSlop={8}
                  onPress={() => navigation.goBack()}
                  style={({ pressed }) => [styles.backAction, pressed && styles.pressed]}
                >
                  <View style={styles.backActionContent}>
                    <AppIcon
                      name="arrow-back"
                      size={16}
                      color={colors.primaryDark}
                      containerSize={16}
                    />
                    <Text selectable style={styles.backLabel}>
                      Quay lại đăng nhập
                    </Text>
                  </View>
                </Pressable>
              </View>

              <View style={styles.heroTopRow}>
                <View style={[styles.logoBox, compact ? styles.logoBoxCompact : null]}>
                  <AppIcon name="person-add" size={26} color={colors.primaryDark} containerSize={34} />
                </View>

                <View style={styles.headerText}>
                  <Text selectable style={styles.appEyebrow}>
                    Ứng dụng người phản ánh
                  </Text>
                  <Text selectable style={[styles.title, { fontSize: titleSize, lineHeight: titleLineHeight }]}>
                    Đăng ký tài khoản
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.form, { gap: fieldGap }]}>
              <FormField
                fieldRef={fullNameFieldRef}
                label="Họ và tên"
                value={fullName}
                error={errors.fullName}
                placeholder="Nguyễn Văn A"
                editable={!isSubmitting}
                textContentType="name"
                inputHeight={inputHeight}
                onFocus={() => scrollToField(fullNameFieldRef)}
                onChangeText={(value) => {
                  setFullName(value);
                  clearFieldError('fullName');
                }}
              />

              <FormField
                fieldRef={emailFieldRef}
                label="Email"
                value={email}
                error={errors.email}
                placeholder="abc@tdmu.edu.vn"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isSubmitting}
                keyboardType="email-address"
                textContentType="emailAddress"
                inputHeight={inputHeight}
                onFocus={() => scrollToField(emailFieldRef)}
                onChangeText={(value) => {
                  setEmail(value);
                  clearFieldError('email');
                }}
              />

              <FormField
                fieldRef={phoneFieldRef}
                label="Số điện thoại"
                value={phone}
                error={errors.phone}
                placeholder="0901234567"
                editable={!isSubmitting}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                inputHeight={inputHeight}
                onFocus={() => scrollToField(phoneFieldRef)}
                onChangeText={(value) => {
                  setPhone(value);
                  clearFieldError('phone');
                }}
              />

              <FormField
                fieldRef={passwordFieldRef}
                label="Mật khẩu"
                value={password}
                error={errors.password}
                placeholder="Tối thiểu 6 ký tự"
                autoCapitalize="none"
                autoComplete="password"
                editable={!isSubmitting}
                secureTextEntry={!isPasswordVisible}
                textContentType="newPassword"
                inputHeight={inputHeight}
                onFocus={() => scrollToField(passwordFieldRef)}
                rightIcon={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                onRightIconPress={() => setIsPasswordVisible((currentValue) => !currentValue)}
                onChangeText={(value) => {
                  setPassword(value);
                  clearFieldError('password');
                }}
              />

              <FormField
                fieldRef={confirmPasswordFieldRef}
                label="Nhập lại mật khẩu"
                value={confirmPassword}
                error={errors.confirmPassword}
                placeholder="Nhập lại mật khẩu"
                autoCapitalize="none"
                editable={!isSubmitting}
                secureTextEntry={!isConfirmPasswordVisible}
                textContentType="newPassword"
                inputHeight={inputHeight}
                onFocus={() => scrollToField(confirmPasswordFieldRef)}
                onSubmitEditing={handleRegister}
                rightIcon={isConfirmPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                onRightIconPress={() => setIsConfirmPasswordVisible((currentValue) => !currentValue)}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  clearFieldError('confirmPassword');
                }}
              />

              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: acceptTerms, disabled: isSubmitting }}
                disabled={isSubmitting}
                onPress={() => {
                  setAcceptTerms((currentValue) => !currentValue);
                  clearFieldError('acceptTerms');
                }}
                style={({ pressed }) => [
                  styles.termsRow,
                  { padding: compact ? spacing.sm : spacing.md },
                  errors.acceptTerms ? styles.termsRowError : null,
                  pressed && !isSubmitting ? styles.pressed : null,
                ]}
              >
                <View style={[styles.checkbox, acceptTerms ? styles.checkboxChecked : null]}>
                  {acceptTerms ? (
                    <AppIcon name="checkmark" size={iconSize.sm} color={colors.surface} containerSize={18} />
                  ) : null}
                </View>
                <Text selectable style={styles.termsText}>
                  Tôi xác nhận thông tin đã cung cấp là đúng và sử dụng ứng dụng để gửi phản ánh đúng mục đích.
                </Text>
              </Pressable>
              {errors.acceptTerms ? <Text selectable style={styles.errorText}>{errors.acceptTerms}</Text> : null}

              {submitError ? (
                <View style={styles.submitErrorBox}>
                  <AppIcon name="warning-outline" size={iconSize.inline} color={colors.danger} containerSize={22} />
                  <Text selectable style={styles.submitError}>
                    {submitError}
                  </Text>
                </View>
              ) : null}
            </View>

            <AppButton
              accessibilityLabel="Tạo tài khoản người phản ánh"
              disabled={isSubmitting || !isFormReady}
              icon={isSubmitting ? <ActivityIndicator color={colors.surface} /> : undefined}
              label={isSubmitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
              onPress={handleRegister}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FormFieldProps = {
  fieldRef?: React.RefObject<View | null>;
  label: string;
  value: string;
  error?: string;
  placeholder: string;
  editable: boolean;
  inputHeight?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: 'email' | 'password';
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  secureTextEntry?: boolean;
  textContentType?: 'name' | 'emailAddress' | 'telephoneNumber' | 'newPassword';
  onFocus?: () => void;
  onSubmitEditing?: () => void;
  rightIcon?: 'eye-outline' | 'eye-off-outline';
  onRightIconPress?: () => void;
  onChangeText: (value: string) => void;
};

function FormField({
  fieldRef,
  label,
  value,
  error,
  placeholder,
  editable,
  inputHeight,
  autoCapitalize,
  autoComplete,
  keyboardType = 'default',
  secureTextEntry = false,
  textContentType,
  onFocus,
  onSubmitEditing,
  rightIcon,
  onRightIconPress,
  onChangeText,
}: FormFieldProps) {
  return (
    <View ref={fieldRef} style={styles.field}>
      <Text selectable style={styles.label}>
        {label}
      </Text>
      <View style={[styles.inputRow, inputHeight ? { minHeight: inputHeight } : null, error ? styles.inputError : null]}>
        <TextInput
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          editable={editable}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onSubmitEditing={onSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          returnKeyType={onSubmitEditing ? 'done' : 'next'}
          secureTextEntry={secureTextEntry}
          style={[styles.inputField, inputHeight ? { minHeight: inputHeight } : null]}
          textContentType={textContentType}
          value={value}
        />
        {rightIcon && onRightIconPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={rightIcon === 'eye-off-outline' ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            disabled={!editable}
            hitSlop={8}
            onPress={onRightIconPress}
            style={({ pressed }) => [styles.passwordToggle, pressed && styles.pressed]}
          >
            <AppIcon
              name={rightIcon}
              size={iconSize.inline}
              color={colors.textMuted}
              containerSize={22}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text selectable style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    gap: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 20,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#D8E7FF',
  },
  headerTopRow: {
    alignItems: 'flex-start',
  },
  backAction: {
    minHeight: 32,
    justifyContent: 'center',
    paddingVertical: 2,
    paddingRight: spacing.sm,
  },
  backActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backLabel: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '800',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logoBoxCompact: {
    width: 48,
    height: 48,
    borderRadius: 16,
  },
  logoBox: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 3,
    borderColor: colors.primaryDark,
    backgroundColor: '#EEF5FF',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  appEyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
  },
  form: {
    gap: spacing.md,
  },
  field: {
    gap: 6,
  },
  label: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  input: {
    minHeight: Math.max(52, touchTarget.min),
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBackground,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: spacing.md,
  },
  inputRow: {
    minHeight: Math.max(52, touchTarget.min),
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBackground,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
  },
  inputField: {
    flex: 1,
    minHeight: Math.max(52, touchTarget.min),
    color: colors.text,
    fontSize: 15,
    paddingRight: spacing.xs,
  },
  inputError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  passwordToggle: {
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  termsRow: {
    minHeight: touchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  termsRowError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  termsText: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  submitErrorBox: {
    minHeight: touchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  submitError: {
    flex: 1,
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.72,
  },
});
