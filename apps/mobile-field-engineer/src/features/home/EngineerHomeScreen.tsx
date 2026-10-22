import { useFocusEffect, type CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FieldTelemetryHeader from '../../components/FieldTelemetryHeader';
import { getFieldEngineerUiLabel } from '../../../../../packages/shared-constants/src/engineerLabels';
import type { EngineerBottomTabParamList, EngineerRootStackParamList } from '../../types/navigation';
import { AppButton, AppIcon, EmptyState } from '../../shared/mobileShared';
import {
  claimEngineerTask,
  fetchEngineerHomeScreenData,
  type EngineerTask,
  type EngineerTaskScope,
} from '../../services/engineerReportService';
import { engineerColors, engineerRadius, engineerSpacing } from '../../styles/engineerTheme';
import { getRoadDamageTypeOption } from '../../../../../packages/shared-constants/src/fieldDomainMetadata';

type Props = CompositeScreenProps<
  BottomTabScreenProps<EngineerBottomTabParamList, 'Home'>,
  NativeStackScreenProps<EngineerRootStackParamList>
>;

type SummaryState = {
  availableTotal: number;
  assignedTotal: number;
  inProgressTotal: number;
  surveyedTotal: number;
};

export default function EngineerHomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<SummaryState | null>(null);
  const [activeTask, setActiveTask] = useState<EngineerTask | null>(null);
  const [urgentQueue, setUrgentQueue] = useState<EngineerTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClaimingId, setIsClaimingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const hasLoadedRef = useRef(false);

  const loadData = useCallback(async (isRefresh = false) => {
    // Stale-While-Revalidate: Only show blocking spinner on cold start when no data exists
    if (isRefresh) {
      setIsRefreshing(true);
    } else if (!hasLoadedRef.current) {
      setIsLoading(true);
    }
    setError('');
    try {
      const data = await fetchEngineerHomeScreenData();
      hasLoadedRef.current = true;
      setSummary(data.summary);
      setActiveTask(data.activeTask);
      setUrgentQueue(data.urgentQueue);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : getFieldEngineerUiLabel('homeLoadErrorTitle'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    void loadData(true);
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const handleQuickClaim = async (task: EngineerTask) => {
    if (isClaimingId) return;
    setIsClaimingId(task.id);
    try {
      await claimEngineerTask(task.id);
      await loadData();
      navigation.navigate('EngineerTaskDetail', { reportId: task.id });
    } catch (claimErr) {
      setError(claimErr instanceof Error ? claimErr.message : 'Không thể tiếp nhận điểm này.');
    } finally {
      setIsClaimingId(null);
    }
  };

  const navigateToScope = (scope: EngineerTaskScope) => {
    navigation.navigate('Tasks', { scope } as any);
  };

  return (
    <View style={styles.container}>
      <FieldTelemetryHeader
        title="Trung tâm tác nghiệp"
        subtitle="Hệ thống Điều phối & Thẩm định Thực địa"
        badgeText="ĐANG TRỰC BAN"
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(130, insets.bottom + 104) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[engineerColors.brandAccent]}
            tintColor={engineerColors.brandAccent}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={engineerColors.brandAccent} size="large" />
            <Text style={styles.loadingText}>Đang đồng bộ dữ liệu tác nghiệp...</Text>
          </View>
        ) : null}

        {!isLoading && error ? (
          <EmptyState
            title={getFieldEngineerUiLabel('homeLoadErrorTitle')}
            description={error}
            action={<AppButton label="Tải lại dữ liệu" onPress={() => void loadData()} />}
          />
        ) : null}

        {!isLoading && !error ? (
          <>
            {/* 1. Tinh gọn: Thanh 4 Chỉ số KPI Tác nghiệp 1 chạm */}
            {summary ? (
              <View style={styles.metricStrip}>
                <MetricPill
                  label="Chờ nhận"
                  count={summary.availableTotal}
                  color={engineerColors.statusAvailable.dot}
                  bgColor={engineerColors.statusAvailable.bg}
                  borderColor={engineerColors.statusAvailable.border}
                  onPress={() => navigateToScope('available')}
                />
                <MetricPill
                  label="Được giao"
                  count={summary.assignedTotal}
                  color={engineerColors.statusClaimed.dot}
                  bgColor={engineerColors.statusClaimed.bg}
                  borderColor={engineerColors.statusClaimed.border}
                  onPress={() => navigateToScope('assigned')}
                />
                <MetricPill
                  label="Đang làm"
                  count={summary.inProgressTotal}
                  color={engineerColors.statusInProgress.dot}
                  bgColor={engineerColors.statusInProgress.bg}
                  borderColor={engineerColors.statusInProgress.border}
                  onPress={() => navigateToScope('in_progress')}
                />
                <MetricPill
                  label="Đã xong"
                  count={summary.surveyedTotal}
                  color={engineerColors.statusSurveyed.dot}
                  bgColor={engineerColors.statusSurveyed.bg}
                  borderColor={engineerColors.statusSurveyed.border}
                  onPress={() => navigateToScope('surveyed')}
                />
              </View>
            ) : null}

            {/* 2. Trọng tâm: Nhiệm vụ đang làm (Active Work Order Hero) */}
            {activeTask ? (
              <View style={styles.activeMissionCard}>
                <View style={styles.activeTopRow}>
                  <View style={styles.pulseBadge}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.pulseBadgeText}>ĐANG TRONG TIẾN TRÌNH</Text>
                  </View>
                  <Text style={styles.activeId}>#RDG-{activeTask.id.slice(0, 6).toUpperCase()}</Text>
                </View>

                <Text style={styles.activeTitle} numberOfLines={2}>
                  {activeTask.title || 'Điểm khảo sát đang thực hiện'}
                </Text>
                <Text style={styles.activeAddress} numberOfLines={1}>
                  📍 {activeTask.formattedAddress || activeTask.address || 'Khu vực khảo sát'}
                </Text>

                <View style={styles.activeActions}>
                  <Pressable
                    onPress={() => navigation.navigate('EngineerCheckIn', { reportId: activeTask.id })}
                    style={({ pressed }) => [styles.btnCheckIn, pressed && styles.btnPressed]}
                  >
                    <AppIcon name="radio-outline" size={16} color="#FFFFFF" containerSize={18} />
                    <Text style={styles.btnCheckInText}>ĐẾN NƠI & CHECK-IN</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => navigation.navigate('EngineerTaskDetail', { reportId: activeTask.id })}
                    style={({ pressed }) => [styles.btnDetail, pressed && styles.btnPressed]}
                  >
                    <Text style={styles.btnDetailText}>MỞ HỒ SƠ</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.idleNoticeCard}>
                <AppIcon name="checkmark-circle-outline" size={24} color={engineerColors.radarGreen} containerSize={30} />
                <View style={styles.idleNoticeBody}>
                  <Text style={styles.idleNoticeTitle}>SẴN SÀNG NHẬN NHIỆM VỤ MỚI</Text>
                  <Text style={styles.idleNoticeSub}>Bạn chưa có điểm nào đang kiểm tra. Hãy nhận điểm từ danh sách bên dưới.</Text>
                </View>
              </View>
            )}

            {/* 3. Trọng tâm: Hàng đợi Công tác Khẩn cấp (Today's Urgent Queue) */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>HÀNG ĐỢI TIẾP NHẬN GẦN NHẤT</Text>
              <Pressable onPress={() => navigateToScope('available')}>
                <Text style={styles.sectionLink}>Xem tất cả ({summary?.availableTotal ?? 0}) ›</Text>
              </Pressable>
            </View>

            {urgentQueue.length === 0 ? (
              <View style={styles.emptyQueueBox}>
                <Text style={styles.emptyQueueText}>Hiện không còn điểm hư hỏng nào đang chờ tiếp nhận.</Text>
              </View>
            ) : (
              <View style={styles.queueList}>
                {urgentQueue.map((task) => {
                  const damageMeta = getRoadDamageTypeOption(task.type || '');
                  const isClaiming = isClaimingId === task.id;

                  return (
                    <View key={task.id} style={styles.queueCard}>
                      <View style={styles.queueCardBody}>
                        <View style={styles.queueCardMeta}>
                          <Text style={styles.queueCardId}>#RDG-{task.id.slice(0, 6).toUpperCase()}</Text>
                          {damageMeta ? (
                            <View style={styles.queueDamageChip}>
                              <Text style={styles.queueDamageText}>{damageMeta.code}</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.queueCardTitle} numberOfLines={1}>
                          {task.title || (damageMeta ? `${damageMeta.code} - ${damageMeta.label}` : 'Điểm hư hỏng mặt đường')}
                        </Text>
                        <Text style={styles.queueCardAddress} numberOfLines={1}>
                          📍 {task.formattedAddress || task.address || 'Đoạn đường cần kiểm tra'}
                        </Text>
                      </View>

                      <View style={styles.queueCardActions}>
                        <Pressable
                          onPress={() => void handleQuickClaim(task)}
                          disabled={isClaiming}
                          style={({ pressed }) => [styles.btnQuickClaim, pressed && styles.btnPressed]}
                        >
                          {isClaiming ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={styles.btnQuickClaimText}>TIẾP NHẬN</Text>
                          )}
                        </Pressable>
                        <Pressable
                          onPress={() => navigation.navigate('EngineerTaskDetail', { reportId: task.id })}
                          style={styles.btnQuickView}
                        >
                          <AppIcon name="chevron-forward" size={16} color={engineerColors.textMuted} containerSize={18} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function MetricPill({
  label,
  count,
  color,
  bgColor,
  borderColor,
  onPress,
}: {
  label: string;
  count: number;
  color: string;
  bgColor: string;
  borderColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.metricPill,
        { backgroundColor: bgColor, borderColor },
        pressed && styles.btnPressed,
      ]}
    >
      <Text style={[styles.metricPillCount, { color }]}>{count}</Text>
      <Text style={styles.metricPillLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: engineerColors.background,
  },
  content: {
    padding: engineerSpacing.md,
    gap: engineerSpacing.md,
    paddingBottom: 110,
  },
  loadingBox: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: engineerColors.textSecondary,
    fontSize: 13,
  },

  // Metric Strip
  metricStrip: {
    flexDirection: 'row',
    gap: 8,
  },
  metricPill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: engineerRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  metricPillCount: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  metricPillLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: engineerColors.textPrimary,
    marginTop: 2,
  },

  // Active Mission Card
  activeMissionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: engineerRadius.md,
    padding: engineerSpacing.md,
    gap: 8,
    borderWidth: 1,
    borderColor: engineerColors.borderLight,
    borderLeftWidth: 4,
    borderLeftColor: engineerColors.safetyAmber,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  activeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pulseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(247, 127, 0, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: engineerRadius.xs,
    borderWidth: 1,
    borderColor: 'rgba(247, 127, 0, 0.3)',
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: engineerColors.safetyOrange,
  },
  pulseBadgeText: {
    color: engineerColors.safetyOrange,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  activeId: {
    color: engineerColors.brandPrimary,
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  activeTitle: {
    color: engineerColors.textNavy,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  activeAddress: {
    color: engineerColors.textSecondary,
    fontSize: 12,
  },
  activeActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  btnCheckIn: {
    flex: 2,
    minHeight: 40,
    backgroundColor: engineerColors.brandPrimary,
    borderRadius: engineerRadius.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnCheckInText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  btnDetail: {
    flex: 1,
    minHeight: 40,
    backgroundColor: '#F8FAFC',
    borderRadius: engineerRadius.xs,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDetailText: {
    color: engineerColors.brandPrimary,
    fontSize: 11,
    fontWeight: '800',
  },

  // Idle notice
  idleNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: engineerSpacing.md,
    borderRadius: engineerRadius.md,
    borderWidth: 1,
    borderColor: engineerColors.borderLight,
  },
  idleNoticeBody: {
    flex: 1,
    gap: 2,
  },
  idleNoticeTitle: {
    color: engineerColors.textNavy,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  idleNoticeSub: {
    color: engineerColors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },

  // Section Header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    color: engineerColors.textNavy,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  sectionLink: {
    color: engineerColors.brandPrimary,
    fontSize: 11,
    fontWeight: '800',
  },

  // Queue List
  emptyQueueBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: engineerRadius.sm,
    borderWidth: 1,
    borderColor: engineerColors.borderLight,
    alignItems: 'center',
  },
  emptyQueueText: {
    color: engineerColors.textMuted,
    fontSize: 12,
  },
  queueList: {
    gap: 8,
  },
  queueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: engineerRadius.sm,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: engineerColors.borderLight,
    borderLeftWidth: 3,
    borderLeftColor: engineerColors.statusAvailable.dot,
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  queueCardBody: {
    flex: 1,
    gap: 2,
  },
  queueCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  queueCardId: {
    color: engineerColors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  queueDamageChip: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    backgroundColor: '#EEF2FF',
  },
  queueDamageText: {
    color: engineerColors.brandPrimary,
    fontSize: 9,
    fontWeight: '900',
  },
  queueCardTitle: {
    color: engineerColors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  queueCardAddress: {
    color: engineerColors.textSecondary,
    fontSize: 11,
  },
  queueCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  btnQuickClaim: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: engineerRadius.xs,
    backgroundColor: engineerColors.brandPrimary,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnQuickClaimText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  btnQuickView: {
    padding: 4,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
