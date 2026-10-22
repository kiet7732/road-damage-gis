import { useFocusEffect, type CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import TaskCard from './components/TaskCard';

type Props = CompositeScreenProps<
  BottomTabScreenProps<EngineerBottomTabParamList, 'Tasks'>,
  NativeStackScreenProps<EngineerRootStackParamList>
>;

const PAGE_SIZE = 10;

const TABS: Array<{ scope: EngineerTaskScope; label: string; icon: string }> = [
  { scope: 'available', label: 'Chờ tiếp nhận', icon: 'scan-outline' },
  { scope: 'assigned', label: 'Được giao việc', icon: 'person-add-outline' },
  { scope: 'in_progress', label: 'Đang kiểm tra', icon: 'trail-sign-outline' },
  { scope: 'surveyed', label: 'Đã hoàn tất', icon: 'checkbox-outline' },
];

export default function EngineerTasksScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const initialScope = (route?.params as { scope?: EngineerTaskScope } | undefined)?.scope;
  const [activeScope, setActiveScope] = useState<EngineerTaskScope>(initialScope || 'available');
  const [tasks, setTasks] = useState<EngineerTask[]>([]);
  const [selectedWard, setSelectedWard] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const scopeCacheRef = useRef<Partial<Record<EngineerTaskScope, EngineerTask[]>>>({});

  const paramScope = (route?.params as { scope?: EngineerTaskScope } | undefined)?.scope;
  useEffect(() => {
    if (paramScope && paramScope !== activeScope) {
      setActiveScope(paramScope);
    }
  }, [paramScope]);

  // Reset ward filter & visible pagination count when switching work scope
  useEffect(() => {
    setSelectedWard(null);
    setVisibleCount(PAGE_SIZE);
  }, [activeScope]);

  const handleSelectWard = useCallback((ward: string | null) => {
    setSelectedWard(ward);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const loadTasks = useCallback(async (scope: EngineerTaskScope, isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
      delete scopeCacheRef.current[scope];
    } else {
      const cached = scopeCacheRef.current[scope];
      if (cached !== undefined) {
        setTasks(cached);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
    }
    setError('');

    try {
      const result = await fetchEngineerTasksByScope(scope);
      scopeCacheRef.current[scope] = result.items;
      setTasks(result.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : getFieldEngineerUiLabel('taskListLoadError'));
      if (!isRefresh && scopeCacheRef.current[scope] === undefined) {
        setTasks([]);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setVisibleCount(PAGE_SIZE);
    void loadTasks(activeScope, true);
  }, [activeScope, loadTasks]);

  useFocusEffect(
    useCallback(() => {
      void loadTasks(activeScope);
    }, [activeScope, loadTasks]),
  );

  // Extract distinct administrative wards for quick filtering
  const wardList = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      const w = t.ward?.trim();
      if (w) {
        const normalized = /^phường\s*/i.test(w) ? w : `Phường ${w}`;
        counts[normalized] = (counts[normalized] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([wardName, count]) => ({ wardName, count }))
      .sort((a, b) => b.count - a.count);
  }, [tasks]);

  // Filter tasks based on selected ward
  const displayedTasks = useMemo(() => {
    if (!selectedWard) {
      return tasks;
    }
    return tasks.filter((t) => {
      const w = t.ward?.trim();
      if (!w) return false;
      const normalized = /^phường\s*/i.test(w) ? w : `Phường ${w}`;
      return normalized.toLowerCase() === selectedWard.toLowerCase();
    });
  }, [tasks, selectedWard]);

  const pagedTasks = useMemo(() => {
    return displayedTasks.slice(0, visibleCount);
  }, [displayedTasks, visibleCount]);

  const handleEndReached = useCallback(() => {
    if (visibleCount < displayedTasks.length) {
      setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, displayedTasks.length));
    }
  }, [displayedTasks.length, visibleCount]);

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
      <View style={[styles.header, { paddingTop: Math.max(insets.top, engineerSpacing.md) }]}>
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.headerTitle}>DANH MỤC PHIẾU TÁC NGHIỆP</Text>
            <Text style={styles.headerSubtitle}>Quản lý & Tiếp nhận hồ sơ hư hỏng thực địa</Text>
          </View>
          <View style={styles.headerCountBadge}>
            <Text style={styles.headerCountText}>{displayedTasks.length} PHIẾU</Text>
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
                  color={active ? '#FFFFFF' : '#64748B'}
                  containerSize={16}
                />
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Quick Administrative Ward Filter Bar */}
        {wardList.length > 0 ? (
          <View style={styles.wardFilterWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.wardChipsContainer}
            >
              <Pressable
                onPress={() => handleSelectWard(null)}
                style={({ pressed }) => [
                  styles.wardChip,
                  selectedWard === null && styles.wardChipActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.wardChipText, selectedWard === null && styles.wardChipTextActive]}>
                  Tất cả ({tasks.length})
                </Text>
              </Pressable>

              {wardList.map((item) => {
                const isSelected = selectedWard === item.wardName;
                return (
                  <Pressable
                    key={item.wardName}
                    onPress={() => handleSelectWard(isSelected ? null : item.wardName)}
                    style={({ pressed }) => [
                      styles.wardChip,
                      isSelected && styles.wardChipActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.wardChipText, isSelected && styles.wardChipTextActive]}>
                      {item.wardName} ({item.count})
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
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
        <ScrollView
          contentContainerStyle={[
            styles.stateScrollWrap,
            { paddingBottom: Math.max(130, insets.bottom + 104) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[engineerColors.brandAccent]}
              tintColor={engineerColors.brandAccent}
            />
          }
        >
          <EmptyState title="DANH SÁCH TRỐNG" description={emptyDescription} />
        </ScrollView>
      ) : null}

      {!isLoading && !error && tasks.length > 0 && displayedTasks.length === 0 ? (
        <ScrollView
          contentContainerStyle={[
            styles.stateScrollWrap,
            { paddingBottom: Math.max(130, insets.bottom + 104) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[engineerColors.brandAccent]}
              tintColor={engineerColors.brandAccent}
            />
          }
        >
          <EmptyState
            title="KHÔNG TÌM THẤY PHIẾU"
            description={`Không có điểm hư hỏng nào trong ca trực thuộc ${selectedWard}.`}
            action={<AppButton label="Xem tất cả phường" onPress={() => handleSelectWard(null)} />}
          />
        </ScrollView>
      ) : null}

      {!isLoading && !error && displayedTasks.length > 0 ? (
        <FlatList
          data={pagedTasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              scope={activeScope}
              onPress={(t) => navigation.navigate('EngineerTaskDetail', { reportId: t.id })}
            />
          )}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: Math.max(130, insets.bottom + 104) },
          ]}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[engineerColors.brandAccent]}
              tintColor={engineerColors.brandAccent}
            />
          }
          ListFooterComponent={
            visibleCount < displayedTasks.length ? (
              <View style={styles.listFooter}>
                <ActivityIndicator size="small" color={engineerColors.brandAccent} />
                <Text style={styles.listFooterText}>Đang nạp thêm phiếu tác nghiệp...</Text>
              </View>
            ) : displayedTasks.length > PAGE_SIZE ? (
              <View style={styles.listFooter}>
                <Text style={styles.listFooterEndText}>Đã hiển thị toàn bộ {displayedTasks.length} phiếu</Text>
              </View>
            ) : null
          }
        />
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
    backgroundColor: '#FFFFFF',
    paddingBottom: engineerSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: engineerSpacing.lg,
    marginBottom: engineerSpacing.sm,
  },
  headerTitle: {
    color: '#0B132B',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  headerCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: engineerRadius.xs,
    backgroundColor: '#EEF5FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  headerCountText: {
    color: '#0F52BA',
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
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButtonActive: {
    backgroundColor: '#0F52BA',
    borderColor: '#0F52BA',
  },
  tabLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.85,
  },
  wardFilterWrap: {
    paddingTop: engineerSpacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 4,
  },
  wardChipsContainer: {
    paddingHorizontal: engineerSpacing.lg,
    gap: 6,
    paddingVertical: 4,
  },
  wardChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: engineerRadius.full,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  wardChipActive: {
    backgroundColor: '#0F52BA',
    borderColor: '#0F52BA',
  },
  wardChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  wardChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
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
  stateScrollWrap: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  listContainer: {
    padding: engineerSpacing.lg,
    gap: 12,
    paddingBottom: 110,
  },
  listFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: engineerSpacing.md,
    gap: 6,
  },
  listFooterText: {
    color: engineerColors.brandAccent,
    fontSize: 12,
    fontWeight: '700',
  },
  listFooterEndText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
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
