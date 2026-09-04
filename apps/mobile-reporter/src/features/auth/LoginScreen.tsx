import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { getLoginErrorMessage, login } from '../../services/authService';
import type { AuthStackParamList } from '../../types/navigation';

type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'> & {
  onLogin: () => void;
};

export default function LoginScreen({ navigation, onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const cardRef = useRef<View | null>(null);
  const emailFieldRef = useRef<View | null>(null);
  const passwordFieldRef = useRef<View | null>(null);

  const compact = width < 360 || height < 680;
  const cardPadding = compact ? spacing.lg : spacing.xl;
  const shouldCenterCard = !isKeyboardVisible && height >= 780;

  const isFormReady = useMemo(
    () => email.trim().length > 0 && password.length > 0,
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
    } else if (trimmedEmail.includes('@') && !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setEmailError('Email không hợp lệ.');
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

    try {
      await login({
        email: email.trim(),
        password,
      });
      onLogin();
    } catch (error) {
      setSubmitError(getLoginErrorMessage(error));
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
          contentContainerStyle={[
            styles.scrollContent,
            {
              padding: compact ? spacing.md : spacing.lg,
              justifyContent: shouldCenterCard ? 'center' : 'flex-start',
              paddingBottom: isKeyboardVisible ? spacing.xl : compact ? spacing.md : spacing.lg,
            },
          ]}
        >
          <View ref={cardRef} style={[styles.card, { padding: cardPadding }]}>
            <View style={styles.hero}>
              <View style={styles.heroTopRow}>
                <View style={styles.logoBox}>
                  <AppIcon name="alert" size={26} color={colors.primaryDark} containerSize={34} />
                </View>

                <View style={styles.heroTextBlock}>
                  <Text selectable style={styles.appEyebrow}>
                    Ứng dụng người phản ánh
                  </Text>
                  <Text selectable style={styles.appTitle}>
                    Cổng phản ánh mặt đường
                  </Text>
                </View>
              </View>

              <Text selectable style={styles.appSubtitle}>
                Gửi phản ánh hư hỏng mặt đường nhanh chóng và theo dõi tiến độ xử lý.
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.formHeader}>
              <Text selectable style={styles.formTitle}>
                Đăng nhập
              </Text>
              <Text selectable style={styles.formSubtitle}>
                Nhập thông tin để tiếp tục.
              </Text>
            </View>

            <View style={styles.form}>
              <View ref={emailFieldRef} style={styles.field}>
                <Text selectable style={styles.label}>
                  Email
                </Text>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isSubmitting}
                  keyboardType="email-address"
                  onChangeText={(value) => {
                    setEmail(value);
                    setEmailError('');
                    setSubmitError('');
                  }}
                  placeholder="reporter@tdmu.edu.vn"
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="next"
                  onFocus={() => scrollToField(emailFieldRef)}
                  onSubmitEditing={() => scrollToField(passwordFieldRef)}
                  style={[styles.input, emailError ? styles.inputError : null]}
                  textContentType="username"
                  value={email}
                />
                {emailError ? <Text selectable style={styles.errorText}>{emailError}</Text> : null}
              </View>

              <View ref={passwordFieldRef} style={styles.field}>
                <Text selectable style={styles.label}>
                  Mật khẩu
                </Text>
                <View style={[styles.inputRow, passwordError ? styles.inputError : null]}>
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="password"
                    editable={!isSubmitting}
                    onChangeText={(value) => {
                      setPassword(value);
                      setPasswordError('');
                      setSubmitError('');
                    }}
                    onFocus={() => scrollToField(passwordFieldRef)}
                    onSubmitEditing={handleLogin}
                    placeholder="Nhập mật khẩu"
                    placeholderTextColor={colors.textMuted}
                    returnKeyType="done"
                    secureTextEntry={!isPasswordVisible}
                    style={styles.inputField}
                    textContentType="password"
                    value={password}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={isPasswordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    disabled={isSubmitting}
                    hitSlop={8}
                    onPress={() => setIsPasswordVisible((currentValue) => !currentValue)}
                    style={({ pressed }) => [styles.passwordToggle, pressed && styles.passwordTogglePressed]}
                  >
                    <AppIcon
                      name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                      size={iconSize.inline}
                      color={colors.textMuted}
                      containerSize={22}
                    />
                  </Pressable>
                </View>
                {passwordError ? <Text selectable style={styles.errorText}>{passwordError}</Text> : null}
              </View>

              {submitError ? (
                <View style={styles.submitErrorBox}>
                  <AppIcon name="warning-outline" size={iconSize.inline} color={colors.danger} containerSize={22} />
                  <Text selectable style={styles.submitError}>
                    {submitError}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.actionGroup}>
              <AppButton
                accessibilityLabel="Đăng nhập vào ứng dụng"
                disabled={isSubmitting || !isFormReady}
                icon={isSubmitting ? <ActivityIndicator color={colors.surface} /> : undefined}
                label={isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
                onPress={handleLogin}
              />
            </View>

            <View style={styles.registerRow}>
              <Text selectable style={styles.registerText}>
                Chưa có tài khoản?
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đăng ký tài khoản"
                disabled={isSubmitting}
                hitSlop={8}
                onPress={() => navigation.navigate('Register')}
                style={({ pressed }) => pressed && styles.registerPressed}
              >
                <Text style={styles.registerLink}>
                  Đăng ký tài khoản
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  hero: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 20,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#D8E7FF',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroTextBlock: {
    flex: 1,
    minWidth: 0,
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
  appEyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  appTitle: {
    color: colors.primaryDark,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
  },
  appSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  divider: {
    height: 1,
    marginHorizontal: -spacing.xl,
    backgroundColor: colors.border,
  },
  formHeader: {
    gap: spacing.xs,
  },
  formTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  formSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    gap: spacing.md,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    color: colors.text,
    fontSize: 13,
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
  passwordTogglePressed: {
    opacity: 0.7,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
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
  actionGroup: {
    gap: spacing.md,
  },
  registerRow: {
    minHeight: touchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  registerText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  registerLink: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  registerPressed: {
    opacity: 0.72,
  },
});
