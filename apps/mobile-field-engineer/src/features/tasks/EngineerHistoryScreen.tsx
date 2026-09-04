import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getFieldEngineerUiLabel } from '../../../../../packages/shared-constants/src/engineerLabels';
import type { EngineerRootStackParamList } from '../../types/navigation';
import { AppButton, colors, EmptyState, radius, spacing } from '../../shared/mobileShared';
import {
  fetchEngineerHistoryTasks,
  getEngineerHistorySemanticMeta,
  type EngineerTask,
} from '../../services/engineerReportService';

type Props = NativeStackScreenProps<EngineerRootStackParamList, 'EngineerHistory'>;

export default function EngineerHistoryScreen({ navigation }: Props) {
  const [tasks, setTasks] = useState<EngineerTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      setTasks(await fetchEngineerHistoryTasks());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : getFieldEngineerUiLabel('historyLoadErrorTitle'));
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{getFieldEngineerUiLabel('historyTitle')}</Text>
        <Text style={styles.subtitle}>{getFieldEngineerUiLabel('historySubtitle')}</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>{getFieldEngineerUiLabel('historyLoading')}</Text>
        </View>
      ) : null}

      {!isLoading && error ? (
        <View style={styles.stateWrap}>
          <EmptyState
            title={getFieldEngineerUiLabel('historyLoadErrorTitle')}
            description={error}
            action={<AppButton label={getFieldEngineerUiLabel('commonRetry')} onPress={() => void loadHistory()} />}
          />
        </View>
      ) : null}

      {!isLoading && !error && tasks.length === 0 ? (
        <View style={styles.stateWrap}>
          <EmptyState
            title={getFieldEngineerUiLabel('historyEmptyTitle')}
            description={getFieldEngineerUiLabel('historyEmpty')}
          />
        </View>
      ) : null}

      {!isLoading && !error && tasks.length > 0 ? (
        <ScrollView contentContainerStyle={styles.list}>
          {tasks.map((task) => {
            const historyMeta = getHistoryMeta(task);
            return (
              <Pressable
                key={task.id}
                onPress={() => navigation.navigate('EngineerTaskDetail', { reportId: task.id })}
                style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
              >
                <View style={styles.itemTop}>
                  <Text numberOfLines={2} style={styles.itemTitle}>{task.title}</Text>
                  <View style={[styles.itemPill, historyMeta.badgeStyle]}>
                    <Text style={[styles.itemPillText, historyMeta.badgeTextStyle]}>
                      {historyMeta.label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.itemAddress}>{task.address}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.itemMetaTitle}>{task.fieldStatusLabel}</Text>
                  <Text style={styles.itemMeta}>{historyMeta.timestampLabel}: {historyMeta.timestampValue}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

function getHistoryMeta(task: EngineerTask) {
  const meta = getEngineerHistorySemanticMeta(task);
  const toneStyles = HISTORY_TONE_STYLES[meta.tone];

  return {
    ...meta,
    badgeStyle: toneStyles.badgeStyle,
    badgeTextStyle: toneStyles.badgeTextStyle,
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  stateWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  item: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  itemPressed: {
    opacity: 0.9,
  },
  itemTop: {
    gap: spacing.sm,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  itemPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    minHeight: 28,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  itemAddress: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  itemMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  itemMetaTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  metaRow: {
    gap: spacing.sm,
  },
});

const HISTORY_TONE_STYLES = {
  info: {
    badgeStyle: { backgroundColor: '#EEF4FF', borderColor: '#C7D7FE' },
    badgeTextStyle: { color: colors.primaryDark },
  },
  success: {
    badgeStyle: { backgroundColor: '#ECFDF3', borderColor: '#ABEFC6' },
    badgeTextStyle: { color: '#067647' },
  },
  warning: {
    badgeStyle: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
    badgeTextStyle: { color: '#B45309' },
  },
  danger: {
    badgeStyle: { backgroundColor: '#FEF3F2', borderColor: '#FECDCA' },
    badgeTextStyle: { color: '#B42318' },
  },
} as const;
