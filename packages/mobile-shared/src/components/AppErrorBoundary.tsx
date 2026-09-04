import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AppButton from './AppButton';
import { colors, radius, spacing } from '../theme';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  errorMessage: string;
};

export default class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    errorMessage: '',
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      errorMessage: error.message || 'Ứng dụng vừa gặp sự cố. Vui lòng thử lại.',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Mobile app render error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      errorMessage: '',
    });
  };

  render() {
    if (this.state.errorMessage) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <Text selectable style={styles.title}>
              Đã có lỗi xảy ra
            </Text>
            <Text selectable style={styles.description}>
              {this.state.errorMessage}
            </Text>
            <AppButton
              label="Thử lại"
              onPress={this.handleRetry}
              accessibilityLabel="Thử tải lại ứng dụng"
            />
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  title: {
    color: colors.danger,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  description: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
