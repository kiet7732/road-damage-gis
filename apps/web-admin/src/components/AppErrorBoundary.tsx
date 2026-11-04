import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string;
  isChunkError: boolean;
};

export default class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
    isChunkError: false,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    const msg = error?.message || 'Giao diện đang gặp sự cố. Vui lòng thử lại.';
    const isChunk =
      msg.includes('dynamically imported module') ||
      msg.includes('Loading chunk') ||
      msg.includes('Failed to fetch');

    return {
      hasError: true,
      errorMessage: msg,
      isChunkError: isChunk,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Web admin render error:', error, errorInfo);

    // Auto-reload once if dynamic import failed due to momentary network/tunnel blip
    const msg = error?.message || '';
    if (
      msg.includes('dynamically imported module') ||
      msg.includes('Loading chunk') ||
      msg.includes('Failed to fetch')
    ) {
      const alreadyReloaded = sessionStorage.getItem('rd_chunk_reload_done');
      if (!alreadyReloaded) {
        sessionStorage.setItem('rd_chunk_reload_done', 'true');
        window.location.reload();
      }
    }
  }

  handleRetry = () => {
    sessionStorage.removeItem('rd_chunk_reload_done');
    if (this.state.isChunkError) {
      window.location.reload();
      return;
    }
    this.setState({
      hasError: false,
      errorMessage: '',
      isChunkError: false,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.screen}>
          <div style={styles.card}>
            <div style={styles.icon}>!</div>
            <h1 style={styles.title}>Đã có lỗi xảy ra</h1>
            <p style={styles.description}>
              {this.state.isChunkError
                ? 'Không thể tải mô-đun trang do kết nối mạng vừa bị gián đoạn. Vui lòng nhấn Thử lại để tải lại phiên làm việc.'
                : this.state.errorMessage}
            </p>
            <button style={styles.button} type="button" onClick={this.handleRetry}>
              {this.state.isChunkError ? 'Tải lại trang' : 'Thử lại'}
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
