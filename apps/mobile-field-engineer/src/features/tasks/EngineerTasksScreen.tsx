import { useFocusEffect, type CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  getFieldEngineerUiLabel,
  getFieldWorkflowStatus,
} from '../../../../../packages/shared-constants/src/engineerLabels';
import type { EngineerBottomTabParamList, EngineerRootStackParamList } from '../../types/navigation';
import { AppButton, AppIcon, EmptyState } from '../../shared/mobileShared';
import {
  fetchEngineerTasksByScope,
  getEngineerTaskSemanticMeta,
  type EngineerTask,
  type EngineerTaskScope,
} from '../../services/engineerReportService';
import { engineerColors, engineerRadius, engineerSpacing } from '../../styles/engineerTheme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<EngineerBottomTabParamList, 'Tasks'>,
  NativeStackScreenProps<EngineerRootStackParamList>
>;

const TABS: Array<{ scope: EngineerTaskScope; label: string; icon: string }> = [
  { scope: 'available', label: 'Chờ tiếp nhận', icon: 'scan-outline' },
  { scope: 'assigned', label: 'Được giao việc', icon: 'person-add-outline' },
  { scope: 'in_progress', label: 'Đang kiểm tra', icon: 'trail-sign-outline' },
  { scope: 'surveyed', label: 'Đã hoàn tất', icon: 'checkbox-outline' },
];

export default function EngineerTasksScreen({ route, navigation }: Props) {
  const initialScope = (route?.params as { scope?: EngineerTaskScope } | undefined)?.scope;
  const [activeScope, setActiveScope] = useState<EngineerTaskScope>(initialScope || 'available');
  const [tasks, setTasks] = useState<EngineerTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const paramScope = (route?.params as { scope?: EngineerTaskScope } | undefined)?.scope;
  useEffect(() => {
    if (paramScope && paramScope !== activeScope) {
      setActiveScope(paramScope);
    }
  }, [paramScope]);

  const loadTasks = useCallback(async (scope: EngineerTaskScope) => {
    setIsLoading(true);
    setError('');

    try {
      const result = await fetchEngineerTasksByScope(scope);
      setTasks(result.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : getFieldEngineerUiLabel('taskListLoadError'));
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadTasks(activeScope);
    }, [activeScope, loadTasks]),
  );

  const emptyDescription = useMemo(() => {
    switch (activeScope) {
      case 'assigned':
        return 'Không có điểm nào được chỉ định riêng cho bạn lúc này.';
      case 'in_progress':
        return 'Bạn chưa có điểm nào đang trong tiến trình kiểm tra thực địa.';
      case 'surveyed':
        return 'Chưa có phiếu khảo sát nào hoàn thành trong ca làm việc này.';
      default:
        return 'Hiện tại không có điểm hư hỏng mới nào đang chờ tiếp nhận.';
    }
  }, [activeScope]);

  return (
    <View style={styles.container}>
      {/* Tactical Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.headerTitle}>DANH MỤC PHIẾU TÁC NGHIỆP</Text>
            <Text style={styles.headerSubtitle}>Quản lý & Tiếp nhận hồ sơ hư hỏng thực địa</Text>
          </View>
          <View style={styles.headerCountBadge}>
            <Text style={styles.headerCountText}>{tasks.length} PHIẾU</Text>
          </View>
        </View>

        {/* Industrial Tab Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
          {TABS.map((tab) => {
            const active = tab.scope === activeScope;
            return (
              <Pressable
                key={tab.scope}
                onPress={() => setActiveScope(tab.scope)}
                style={({ pressed }) => [
                  styles.tabButton,
                  active && styles.tabButtonActive,
                  pressed && styles.pressed,
                ]}
              >
                <AppIcon
                  name={tab.icon as any}
                  size={14}
                  color={active ? '#0B132B' : '#94A3B8'}
                  containerSize={16}
                />
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content Area */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={engineerColors.brandAccent} size="large" />
          <Text style={styles.loadingText}>Đang nạp danh mục phiếu công tác...</Text>
        </View>
      ) : null}

      {!isLoading && error ? (
        <View style={styles.stateWrap}>
          <EmptyState
            title="KHÔNG THỂ TẢI DANH MỤC"
            description={error}
            action={<AppButton label="Thử lại" onPress={() => void loadTasks(activeScope)} />}
          />
        </View>
      ) : null}

      {!isLoading && !error && tasks.length === 0 ? (
        <View style={styles.stateWrap}>
          <EmptyState title="DANH SÁCH TRỐNG" description={emptyDescription} />
        </View>
      ) : null}

      {!isLoading && !error && tasks.length > 0 ? (
        <ScrollView contentContainerStyle={styles.listContainer}>
          {tasks.map((task) => {
            const workflow = getFieldWorkflowStatus(task.fieldStatus);
            const semantic = getEngineerTaskSemanticMeta(task, activeScope);
            const isClaimable = task.canClaim;

            return (
              <Pressable
                key={task.id}
                onPress={() => navigation.navigate('EngineerTaskDetail', { reportId: task.id })}
                style={({ pressed }) => [
                  styles.ticketCard,
                  { borderLeftColor: workflow?.color || engineerColors.brandPrimary },
                  pressed && styles.cardPressed,
                ]}
              >
                {/* Ticket Top Meta */}
                <View style={styles.ticketTopRow}>
                  <View style={styles.ticketIdBadge}>
                    <Text style={styles.ticketIdText}>#RDG-{task.id.slice(0, 6).toUpperCase()}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: workflow?.backgroundColor || '#EEF5FF',
                        borderColor: workflow?.borderColor || '#B8D5FF',
                      },
                    ]}
                  >
                    <View style={[styles.statusDot, { backgroundColor: workflow?.color || engineerColors.brandPrimary }]} />
                    <Text style={[styles.statusPillText, { color: workflow?.color || engineerColors.brandPrimary }]}>
                      {workflow?.shortLabel || task.fieldStatusLabel}
                    </Text>
                  </View>
                </View>

                {/* Ticket Title & Address */}
                <Text style={styles.ticketTitle} numberOfLines={2}>{task.title}</Text>
                <Text style={styles.ticketAddress} numberOfLines={1}>📍 {task.address || 'Khu vực khảo sát thực địa'}</Text>

                {/* Ticket Technical Footer */}
                <View style={styles.ticketFooter}>
                  <View style={styles.techTag}>
                    <Text style={styles.techTagText}>
                      {task.type ? `MÃ: ${task.type}` : 'CHƯA PHÂN LOẠI'}
                    </Text>
                  </View>

                  <Text style={styles.timestampText}>
                    ⏱ {semantic.timestampLabel}: {semantic.timestampValue}
                  </Text>
                </View>

                {isClaimable ? (
                  <View style={styles.claimPromptBar}>
                    <Text style={styles.claimPromptText}>⚡ Đang khả dụng để tiếp nhận kiểm tra ngay</Text>
                    <AppIcon name="chevron-forward" size={14} color={engineerColors.safetyOrange} containerSize={16} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
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
    paddingBottom: engineerSpacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: engineerColors.headerBorder,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: engineerSpacing.lg,
    marginBottom: engineerSpacing.sm,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    color: engineerColors.textOnDarkMuted,
    fontSize: 11,
    marginTop: 2,
  },
  headerCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: engineerRadius.xs,
    backgroundColor: engineerColors.headerSurface,
    borderWidth: 1,
    borderColor: engineerColors.headerBorder,
  },
  headerCountText: {
    color: engineerColors.brandAccent,
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  tabsContainer: {
    paddingHorizontal: engineerSpacing.lg,
    gap: 8,
    paddingBottom: 4,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: engineerRadius.xs,
    backgroundColor: engineerColors.headerSurface,
    borderWidth: 1,
    borderColor: engineerColors.headerBorder,
  },
  tabButtonActive: {
    backgroundColor: engineerColors.brandAccent,
    borderColor: engineerColors.brandAccent,
  },
  tabLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
  },
  tabLabelActive: {
    color: '#0B132B',
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.85,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
  loadingText: {
    color: engineerColors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  stateWrap: {
    flex: 1,
    padding: engineerSpacing.lg,
    justifyContent: 'center',
  },
  listContainer: {
    padding: engineerSpacing.lg,
    gap: 12,
    paddingBottom: 40,
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: engineerRadius.md,
    padding: engineerSpacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: engineerColors.borderLight,
    borderLeftWidth: 4,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  ticketTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ticketIdBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: engineerRadius.xs,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ticketIdText: {
    color: engineerColors.textNavy,
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: engineerRadius.xs,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '900',
  },
  ticketTitle: {
    color: engineerColors.textNavy,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  ticketAddress: {
    color: engineerColors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  techTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: engineerRadius.xs,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  techTagText: {
    color: engineerColors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  timestampText: {
    color: engineerColors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  claimPromptBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: engineerRadius.xs,
    backgroundColor: 'rgba(255, 159, 28, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 28, 0.3)',
  },
  claimPromptText: {
    color: engineerColors.safetyAmber,
    fontSize: 11,
    fontWeight: '800',
  },
});
