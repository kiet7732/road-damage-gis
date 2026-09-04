import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getFieldEngineerUiLabel } from '../../../../../packages/shared-constants/src/engineerLabels';
import type { EngineerAuthStackParamList } from '../../types/navigation';
import { AppButton, AppIcon, iconSize, radius, spacing } from '../../shared/mobileShared';
import { getLoginErrorMessage, loginEngineer } from '../../services/authService';
import { engineerColors, engineerRadius, engineerSpacing } from '../../styles/engineerTheme';

type Props = NativeStackScreenProps<EngineerAuthStackParamList, 'Login'> & {
  onLogin: () => void;
};

export default function EngineerLoginScreen({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isReady = useMemo(() => email.trim().length > 0 && password.length >= 6, [email, password]);

  const handleLogin = async () => {
    if (!isReady || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      await loginEngineer({ email: email.trim(), password });
      onLogin();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : getLoginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <View style={styles.card}>
          {/* Tactical Hero Header */}
          <View style={styles.hero}>
            <View style={styles.iconBox}>
              <AppIcon name="construct-outline" size={28} color={engineerColors.safetyOrange} containerSize={48} />
            </View>
            <View style={styles.eyebrowBadge}>
              <Text style={styles.eyebrow}>TRUY CẬP HỆ THỐNG NỘI BỘ</Text>
            </View>
            <Text style={styles.title}>KỸ SƯ HIỆN TRƯỜNG</Text>
            <Text style={styles.subtitle}>Cổng tác nghiệp, điều phối và khảo sát hư hỏng mặt đường thực địa</Text>
          </View>

          {/* Email Input */}
          <View style={styles.field}>
            <Text style={styles.label}>TÀI KHOẢN / EMAIL KỸ SƯ</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="engineer@tdmu.edu.vn"
              placeholderTextColor={engineerColors.textMuted}
              style={styles.input}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                setSubmitError('');
              }}
            />
          </View>

          {/* Password Input */}
          <View style={styles.field}>
            <Text style={styles.label}>MẬT KHẨU BẢO MẬT</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="password"
              secureTextEntry
              placeholder="Nhập mật khẩu"
              placeholderTextColor={engineerColors.textMuted}
              style={styles.input}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setSubmitError('');
              }}
            />
          </View>

          {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

          <AppButton
            label={isSubmitting ? 'ĐANG XÁC THỰC...' : 'ĐĂNG NHẬP HỆ THỐNG'}
            onPress={handleLogin}
            disabled={!isReady || isSubmitting}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: engineerColors.headerBg,
  },
  keyboard: {
    flex: 1,
    justifyContent: 'center',
    padding: engineerSpacing.lg,
  },
  card: {
    gap: engineerSpacing.lg,
    padding: engineerSpacing.xl,
    borderRadius: engineerRadius.lg,
    borderWidth: 1,
    borderColor: engineerColors.headerBorder,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 8,
  },
  hero: {
    alignItems: 'center',
    gap: 6,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: engineerRadius.md,
    backgroundColor: engineerColors.headerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: engineerColors.headerBorder,
  },
  eyebrowBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: engineerRadius.xs,
    backgroundColor: 'rgba(255, 159, 28, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 28, 0.4)',
  },
  eyebrow: {
    color: engineerColors.safetyOrange,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  title: {
    color: engineerColors.textNavy,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: engineerColors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  field: {
    gap: 6,
  },
  label: {
    color: engineerColors.textNavy,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: engineerColors.borderMedium,
    borderRadius: engineerRadius.sm,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: engineerSpacing.md,
    color: engineerColors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: engineerColors.dangerRed,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
