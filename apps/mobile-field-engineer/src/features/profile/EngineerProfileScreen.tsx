import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { getFieldEngineerUiLabel } from '../../../../../packages/shared-constants/src/engineerLabels';
import type { EngineerBottomTabParamList, EngineerRootStackParamList } from '../../types/navigation';
import { AppIcon } from '../../shared/mobileShared';
import { fetchCurrentEngineerUser, logoutEngineer } from '../../services/authService';
import { engineerColors, engineerRadius, engineerSpacing } from '../../styles/engineerTheme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<EngineerBottomTabParamList, 'Profile'>,
  NativeStackScreenProps<EngineerRootStackParamList>
> & {
  onLogout: () => void;
};

export default function EngineerProfileScreen({ navigation, onLogout }: Props) {
  const [profile, setProfile] = useState<{ fullName?: string; email?: string; phone?: string; role?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      setProfile(await fetchCurrentEngineerUser());
    } catch {
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>HỒ SƠ KỸ SƯ HIỆN TRƯỜNG</Text>
        <Text style={styles.subtitle}>Quản lý tài khoản tác nghiệp & Nhật ký thực địa</Text>
      </View>

      <View style={styles.content}>
        {/* User Card */}
        <View style={styles.card}>
          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={engineerColors.brandAccent} />
              <Text style={styles.loadingText}>Đang tải thông tin tài khoản...</Text>
            </View>
          ) : (
            <>
              <View style={styles.avatarRow}>
                <View style={styles.avatarBox}>
                  <AppIcon name="person" size={28} color={engineerColors.brandAccent} containerSize={48} />
                </View>
                <View style={styles.avatarTextWrap}>
                  <Text style={styles.name}>{profile?.fullName || 'Kỹ sư hiện trường'}</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>
                      VAI TRÒ: {profile?.role ? profile.role.toUpperCase() : 'FIELD_ENGINEER'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.metaDivider} />

              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Email liên hệ:</Text>
                <Text style={styles.metaValue}>{profile?.email || 'Chưa cập nhật'}</Text>
              </View>

              {profile?.phone ? (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Số điện thoại:</Text>
                  <Text style={styles.metaValue}>{profile.phone}</Text>
                </View>
              ) : null}
            </>
          )}
        </View>

        {/* Tactical History Link */}
        <Pressable
          onPress={() => navigation.navigate('EngineerHistory')}
          style={({ pressed }) => [styles.linkCard, pressed && styles.linkCardPressed]}
        >
          <View style={styles.linkIconBox}>
            <AppIcon name="journal-outline" size={22} color={engineerColors.brandAccent} containerSize={32} />
          </View>
          <View style={styles.linkBody}>
            <Text style={styles.linkTitle}>NHẬT KÝ TÁC NGHIỆP HIỆN TRƯỜNG</Text>
            <Text style={styles.linkDescription}>Tra cứu các điểm đã khảo sát, hoàn tất hoặc nhả quyền</Text>
          </View>
          <AppIcon name="chevron-forward" size={18} color="#94A3B8" containerSize={20} />
        </Pressable>

        {/* Logout Button */}
        <Pressable
          onPress={async () => {
            await logoutEngineer();
            onLogout();
          }}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
        >
          <AppIcon name="log-out-outline" size={18} color={engineerColors.dangerRed} containerSize={20} />
          <Text style={styles.logoutButtonText}>ĐĂNG XUẤT PHIÊN LÀM VIỆC</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: engineerColors.background,
  },
  header: {
    backgroundColor: engineerColors.headerBg,
    paddingTop: engineerSpacing.md,
    paddingBottom: engineerSpacing.md,
    paddingHorizontal: engineerSpacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: engineerColors.headerBorder,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: engineerColors.textOnDarkMuted,
    fontSize: 11,
    marginTop: 2,
  },
  content: {
    padding: engineerSpacing.lg,
    gap: engineerSpacing.lg,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: engineerRadius.md,
    padding: engineerSpacing.lg,
    gap: 10,
    borderWidth: 1,
    borderColor: engineerColors.borderLight,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  loadingWrap: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: engineerColors.textSecondary,
    fontSize: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: engineerRadius.sm,
    backgroundColor: engineerColors.headerBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextWrap: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: engineerColors.textNavy,
    fontSize: 16,
    fontWeight: '900',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: engineerRadius.xs,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleBadgeText: {
    color: engineerColors.textNavy,
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  metaDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLabel: {
    color: engineerColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  metaValue: {
    color: engineerColors.textNavy,
    fontSize: 12,
    fontWeight: '800',
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: engineerSpacing.md,
    borderRadius: engineerRadius.md,
    borderWidth: 1,
    borderColor: engineerColors.borderLight,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  linkIconBox: {
    width: 40,
    height: 40,
    borderRadius: engineerRadius.xs,
    backgroundColor: engineerColors.headerBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkBody: {
    flex: 1,
    gap: 2,
  },
  linkTitle: {
    color: engineerColors.textNavy,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  linkDescription: {
    color: engineerColors.textSecondary,
    fontSize: 11,
  },
  linkCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  logoutButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: engineerRadius.sm,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  logoutButtonText: {
    color: engineerColors.dangerRed,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  logoutButtonPressed: {
    opacity: 0.85,
  },
});
