import { CSSProperties, FormEvent, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { FiShield, FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi';
import WebButton from '../../components/WebButton';
import { UI_COLORS } from '../../constants/statusColors';
import {
  getLoginErrorMessage,
  loginAdmin,
} from '../../services/authService';

type LoginPageProps = {
  isAuthenticated: boolean;
  onLogin: () => void;
};

type LoginLocationState = {
  from?: {
    pathname?: string;
  };
};

export default function LoginPage({ isAuthenticated, onLogin }: LoginPageProps) {
  const location = useLocation();
  const locationState = location.state as LoginLocationState | null;
  const redirectTo = locationState?.from?.pathname ?? '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await loginAdmin({
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

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setEmailError('');
    setPasswordError('');
    setSubmitError('');
  };

  return (
    <main style={styles.page}>
      <form style={styles.card} onSubmit={handleSubmit} noValidate>
        {/* Brand Header */}
        <div style={styles.headerBox}>
          <div style={styles.iconCircle}>
            <FiShield size={28} color={UI_COLORS.primary} />
          </div>
          <div style={styles.badgeRow}>
            <span style={styles.portalBadge}>CỔNG QUẢN TRỊ HỆ THỐNG</span>
          </div>
          <h1 style={styles.appTitle}>ROAD DAMAGE GIS</h1>
          <p style={styles.appSubtitle}>
            Hệ thống Quản lý & Khảo sát Hư hỏng Mặt đường Đô thị
          </p>
        </div>

        <div style={styles.divider} />

        {/* Form Fields */}
        <div style={styles.formContent}>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="admin-email">
              Email / Tài khoản
            </label>
            <input
              id="admin-email"
              autoComplete="email"
              disabled={isSubmitting}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError('');
                setSubmitError('');
              }}
              placeholder="name@roadgis.local"
              style={{
                ...styles.input,
                ...(emailError ? styles.inputError : null),
                ...(focusedField === 'email' ? styles.inputFocused : null),
              }}
              type="email"
              value={email}
            />
            {emailError ? <span style={styles.errorText}>{emailError}</span> : null}
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="admin-password">
              Mật khẩu
            </label>
            <div
              style={{
                ...styles.inputRow,
                ...(passwordError ? styles.inputError : null),
                ...(focusedField === 'password' ? styles.inputFocused : null),
              }}
            >
              <input
                id="admin-password"
                autoComplete="current-password"
                disabled={isSubmitting}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setPasswordError('');
                  setSubmitError('');
                }}
                placeholder="Nhập mật khẩu"
                style={styles.inputInner}
                type={isPasswordVisible ? 'text' : 'password'}
                value={password}
              />
              <button
                type="button"
                aria-label={isPasswordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                disabled={isSubmitting}
                onClick={() => setIsPasswordVisible((v) => !v)}
                style={styles.eyeButton}
              >
                {isPasswordVisible ? (
                  <FiEyeOff size={18} color={UI_COLORS.textMuted} />
                ) : (
                  <FiEye size={18} color={UI_COLORS.textMuted} />
                )}
              </button>
            </div>
            {passwordError ? <span style={styles.errorText}>{passwordError}</span> : null}
          </div>

          {submitError ? (
            <div style={styles.errorBanner}>
              <FiAlertCircle size={18} color={UI_COLORS.danger} style={{ flexShrink: 0 }} />
              <span style={styles.errorBannerText}>{submitError}</span>
            </div>
          ) : null}

          <WebButton
            disabled={isSubmitting}
            style={styles.submitButton}
            type="submit"
          >
            {isSubmitting ? 'ĐANG XÁC THỰC...' : 'ĐĂNG NHẬP QUẢN TRỊ'}
          </WebButton>
        </div>

        {/* Quick Demo Login Section */}
        <div style={styles.demoSection}>
          <span style={styles.demoTitle}>TÀI KHOẢN TRẢI NGHIỆM NHANH</span>
          <div style={styles.demoChipsRow}>
            <button
              type="button"
              style={styles.demoChip}
              onClick={() => handleFillDemo('admin.demo@roadgis.local', 'Admin@123')}
            >
              🛡️ Quản trị viên
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    padding: 24,
    background: '#F1F5F9',
    boxSizing: 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    padding: '32px 28px',
    border: '1px solid #E2E8F0',
    borderRadius: 20,
    background: '#FFFFFF',
    boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.08)',
    boxSizing: 'border-box',
  },
  headerBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF5FF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #DBEAFE',
    marginBottom: 2,
  },
  badgeRow: {
    display: 'flex',
    justifyContent: 'center',
  },
  portalBadge: {
    padding: '4px 12px',
    borderRadius: 9999,
    backgroundColor: '#EEF5FF',
    border: '1px solid #DBEAFE',
    color: UI_COLORS.primary,
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.6px',
    textTransform: 'uppercase',
  },
  appTitle: {
    margin: 0,
    color: '#0A2540',
    fontSize: 24,
    fontWeight: 900,
    letterSpacing: '0.5px',
  },
  appSubtitle: {
    margin: 0,
    color: UI_COLORS.textMuted,
    fontSize: 13,
    lineHeight: 1.5,
    maxWidth: 360,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    margin: '4px 0',
  },
  formContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    color: UI_COLORS.text,
    fontSize: 13,
    fontWeight: 700,
  },
  input: {
    minHeight: 48,
    border: '1px solid #CBD5E1',
    borderRadius: 10,
    background: '#FFFFFF',
    color: UI_COLORS.text,
    fontSize: 14,
    padding: '0 14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  },
  inputRow: {
    minHeight: 48,
    border: '1px solid #CBD5E1',
    borderRadius: 10,
    background: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: 14,
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  },
  inputInner: {
    flex: 1,
    height: '100%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: UI_COLORS.text,
    fontSize: 14,
    padding: 0,
  },
  eyeButton: {
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    color: UI_COLORS.textMuted,
    borderRadius: '0 10px 10px 0',
  },
  inputFocused: {
    borderColor: UI_COLORS.primary,
    boxShadow: '0 0 0 3px rgba(7, 93, 187, 0.12)',
    background: '#FAFCFF',
  },
  inputError: {
    borderColor: UI_COLORS.danger,
    background: '#FEF2F2',
  },
  errorText: {
    color: UI_COLORS.danger,
    fontSize: 12,
    fontWeight: 600,
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderRadius: 10,
    background: '#FEF2F2',
    border: '1px solid #FECACA',
    boxSizing: 'border-box',
  },
  errorBannerText: {
    flex: 1,
    color: UI_COLORS.danger,
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.4,
  },
  submitButton: {
    width: '100%',
    minHeight: 48,
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: '0.3px',
    marginTop: 4,
  },
  demoSection: {
    marginTop: 6,
    paddingTop: 16,
    borderTop: '1px solid #E2E8F0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  },
  demoTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: UI_COLORS.textMuted,
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
  },
  demoChipsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  demoChip: {
    background: '#F8FAFC',
    borderRadius: 9999,
    padding: '7px 16px',
    border: '1px solid #CBD5E1',
    color: '#334155',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
} satisfies Record<string, CSSProperties>;
