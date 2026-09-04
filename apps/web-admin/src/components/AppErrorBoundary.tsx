import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string;
};

export default class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Giao diện đang gặp sự cố. Vui lòng thử lại.',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Web admin render error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      errorMessage: '',
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.screen}>
          <div style={styles.card}>
            <div style={styles.icon}>!</div>
            <h1 style={styles.title}>Đã có lỗi xảy ra</h1>
            <p style={styles.description}>{this.state.errorMessage}</p>
            <button style={styles.button} type="button" onClick={this.handleRetry}>
              Thử lại
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles: Record<string, React.CSSProperties> = {
  screen: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: '#F4F7FB',
  },
  card: {
    width: '100%',
    maxWidth: 460,
    padding: 28,
    borderRadius: 20,
    background: '#FFFFFF',
    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.12)',
    textAlign: 'center',
  },
  icon: {
    width: 64,
    height: 64,
    margin: '0 auto 16px',
    borderRadius: 20,
    display: 'grid',
    placeItems: 'center',
    background: '#EAF2FF',
    color: '#0E4FAF',
    fontSize: 32,
    fontWeight: 800,
  },
  title: {
    margin: '0 0 12px',
    color: '#0F172A',
    fontSize: 28,
    fontWeight: 800,
  },
  description: {
    margin: '0 0 20px',
    color: '#475467',
    fontSize: 15,
    lineHeight: 1.6,
  },
  button: {
    minWidth: 140,
    border: 'none',
    borderRadius: 12,
    padding: '12px 18px',
    background: '#0E63CE',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
};
