import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ApiErrorNotifier from './src/components/ApiErrorNotifier';
import AppErrorBoundary from './src/components/AppErrorBoundary';
import Navigation from './src/app/Navigation';
import { colors } from './src/constants/theme';

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

export default function App() {
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
