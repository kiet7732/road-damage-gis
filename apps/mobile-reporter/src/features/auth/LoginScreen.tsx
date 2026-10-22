import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { UnifiedLoginScreen } from '../../../../../packages/mobile-shared/src';
import type { AuthStackParamList } from '../../types/navigation';

type LoginScreenProps = NativeStackScreenProps<AuthStackParamList, 'Login'> & {
  onLogin: () => void;
};

export default function LoginScreen({ navigation, onLogin }: LoginScreenProps) {
  return (
    <UnifiedLoginScreen
      onLogin={onLogin}
      onRegisterPress={() => navigation.navigate('Register')}
    />
  );
}
