import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { UnifiedLoginScreen } from '../../../../../packages/mobile-shared/src';
import type { EngineerAuthStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<EngineerAuthStackParamList, 'Login'> & {
  onLogin: () => void;
};

export default function EngineerLoginScreen({ onLogin }: Props) {
  return <UnifiedLoginScreen onLogin={onLogin} />;
}
