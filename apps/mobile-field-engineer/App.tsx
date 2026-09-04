import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApiErrorNotifier, AppErrorBoundary, colors } from '../../packages/mobile-shared/src';
import Navigation from './src/app/Navigation';

const navigationTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  },
};

export default function FieldEngineerApp() {
  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <ApiErrorNotifier />
        <StatusBar style="dark" backgroundColor={colors.background} />
        <NavigationContainer theme={navigationTheme}>
          <Navigation />
        </NavigationContainer>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}
