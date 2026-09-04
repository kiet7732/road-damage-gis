import { CSSProperties, FormEvent, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
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

  return (
    <main style={styles.page}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <div style={styles.logo}>RD</div>
        <h1 style={styles.title}>Road Damage GIS Admin</h1>
        <p style={styles.subtitle}>
          Đăng nhập để quản lý phản ánh, bản đồ GIS và thống kê hư hỏng mặt đường.
        </p>

        <div style={styles.field}>
          <label style={styles.label} htmlFor="admin-email">
            Email
          </label>
          <input
            id="admin-email"
            autoComplete="email"
            disabled={isSubmitting}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Nhập email cán bộ"
            style={{
              ...styles.input,
              ...(emailError ? styles.inputError : null),
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
          <input
            id="admin-password"
            autoComplete="current-password"
            disabled={isSubmitting}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Nhập mật khẩu"
            style={{
              ...styles.input,
              ...(passwordError ? styles.inputError : null),
            }}
            type="password"
            value={password}
          />
          {passwordError ? <span style={styles.errorText}>{passwordError}</span> : null}
        </div>

        {submitError ? <div style={styles.submitError}>{submitError}</div> : null}

        <WebButton disabled={isSubmitting} style={styles.submitButton} type="submit">
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </WebButton>
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
    background: UI_COLORS.background,
    boxSizing: 'border-box',
  },
  card: {
    width: 'min(100%, 420px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    padding: 28,
    border: `1px solid ${UI_COLORS.border}`,
    borderRadius: 22,
    background: UI_COLORS.surface,
    boxShadow: '0 20px 60px rgba(15, 23, 42, 0.12)',
    boxSizing: 'border-box',
  },
  logo: {
    width: 56,
    height: 56,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 18,
    background: UI_COLORS.primary,
    color: UI_COLORS.surface,
    fontWeight: 900,
  },
  title: {
    margin: 0,
    color: UI_COLORS.text,
    fontSize: 26,
    fontWeight: 900,
  },
  subtitle: {
    margin: 0,
    color: UI_COLORS.textMuted,
    fontSize: 14,
    lineHeight: 1.6,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    color: UI_COLORS.text,
    fontSize: 14,
    fontWeight: 800,
  },
  input: {
    minHeight: 46,
    border: `1px solid ${UI_COLORS.border}`,
    borderRadius: 12,
    background: UI_COLORS.surfaceMuted,
    color: UI_COLORS.text,
    fontSize: 15,
    padding: '0 14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  inputError: {
    borderColor: UI_COLORS.danger,
  },
  errorText: {
    color: UI_COLORS.danger,
    fontSize: 13,
    fontWeight: 700,
  },
  submitError: {
    padding: '10px 12px',
    borderRadius: 12,
    background: `${UI_COLORS.danger}14`,
    color: UI_COLORS.danger,
    fontSize: 14,
    fontWeight: 800,
    lineHeight: 1.5,
  },
  submitButton: {
    width: '100%',
  },
} satisfies Record<string, CSSProperties>;
