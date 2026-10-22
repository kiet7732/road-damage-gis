import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getFieldEngineerUiLabel,
  getFieldWorkflowStatus,
} from '../../../../../packages/shared-constants/src/engineerLabels';
import type { EngineerRootStackParamList } from '../../types/navigation';
import {
  AppButton,
  EmptyState,
  getOrLoadUserLocation,
} from '../../shared/mobileShared';
import {
  canUploadEngineerAttachment,
  claimEngineerTask,
  fetchEngineerTaskDetail,
  openExternalNavigation,
  releaseEngineerTaskClaim,
  type EngineerTask,
} from '../../services/engineerReportService';
import EngineerPhotoViewer from './components/EngineerPhotoViewer';
import TaskAiSurveySummaryCard from './components/TaskAiSurveySummaryCard';
import TaskCitizenPhotoCard from './components/TaskCitizenPhotoCard';
import TaskDetailActionsCard from './components/TaskDetailActionsCard';
import TaskDetailHeaderCard from './components/TaskDetailHeaderCard';
import TaskLocationDossierCard from './components/TaskLocationDossierCard';
import { calculateDistanceMeters } from './utils/engineerTaskUtils';
import { engineerColors, engineerSpacing } from '../../styles/engineerTheme';

type Props = NativeStackScreenProps<EngineerRootStackParamList, 'EngineerTaskDetail'>;

type LiveDistanceSummary = {
  distanceMeters: number | null;
  capturedAt: string | null;
};

export default function EngineerTaskDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { reportId } = route.params;
  const [task, setTask] = useState<EngineerTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState('');
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  const [liveDistance, setLiveDistance] = useState<LiveDistanceSummary>({
    distanceMeters: null,
    capturedAt: null,
  });

  const loadDetail = useCallback(async () => {
    if (!task) {
      setIsLoading(true);
    }
    setError('');
    try {
      const nextTask = await fetchEngineerTaskDetail(reportId);
      setTask(nextTask);
      setIsLoading(false);

      void getOrLoadUserLocation().then((currentLocation) => {
        if (currentLocation) {
          setLiveDistance({
            distanceMeters: calculateDistanceMeters(
              currentLocation.latitude,
              currentLocation.longitude,
              nextTask.gps.latitude,
              nextTask.gps.longitude,
            ),
            capturedAt: new Date().toISOString(),
          });
        } else {
          setLiveDistance({
            distanceMeters: null,
            capturedAt: null,
          });
        }
      }).catch(() => {
        // Ignore location errors for distance badge
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : getFieldEngineerUiLabel('taskDetailLoadError'));
      setIsLoading(false);
    }
  }, [reportId, task]);

  useFocusEffect(
    useCallback(() => {
      void loadDetail();
    }, [loadDetail]),
  );

  const handleClaim = async () => {
    if (!task?.canClaim || isMutating) {
      return;
    }

    setIsMutating(true);
    try {
      setTask(await claimEngineerTask(task.id));
      setError('');
    } catch (mutateError) {
      setError(mutateError instanceof Error ? mutateError.message : 'Không thể nhận kiểm tra.');
    } finally {
      setIsMutating(false);
    }
  };

  const handleRelease = async () => {
    if (!task?.canReleaseClaim || isMutating) {
      return;
    }

    setIsMutating(true);
    try {
      setTask(await releaseEngineerTaskClaim(task.id));
      setError('');
    } catch (mutateError) {
      setError(mutateError instanceof Error ? mutateError.message : 'Không thể hủy nhận kiểm tra.');
    } finally {
      setIsMutating(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadDetail();
    } finally {
      setRefreshing(false);
    }
  }, [loadDetail]);

  const handleCopyAddress = async () => {
    if (!task) return;
    const textToCopy = task.formattedAddress || task.address || `${task.gps.latitude}, ${task.gps.longitude}`;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).clipboard?.writeText) {
        await (navigator as any).clipboard.writeText(textToCopy);
      } else {
        await Share.share({
          message: textToCopy,
          title: 'Địa chỉ điểm hư hỏng',
        });
      }
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (copyErr) {
      console.warn('Failed to copy address:', copyErr);
    }
  };

  const handleNavigate = () => {
    if (!task) return;
    void openExternalNavigation({
      address: task.formattedAddress || task.address,
      latitude: task.gps.latitude,
      longitude: task.gps.longitude,
      label: task.roadName || task.title,
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color={engineerColors.brandAccent} size="large" />
        <Text style={styles.stateText}>Đang mở hồ sơ kỹ thuật...</Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.centerState}>
        <EmptyState
          title="KHÔNG TÌM THẤY HỒ SƠ"
          description={error || 'Phiếu tác nghiệp này không tồn tại hoặc đã bị xóa.'}
          action={<AppButton label="Tải lại" onPress={() => void loadDetail()} />}
        />
      </View>
    );
  }

  const statusMeta = getFieldWorkflowStatus(task.fieldStatus);
  const localDistanceText =
    typeof liveDistance.distanceMeters === 'number'
      ? `${Math.round(liveDistance.distanceMeters)}m`
      : 'Chưa xác định';
  const aiConfidenceText =
    typeof task.confidence === 'number' ? `${Math.round(task.confidence * 100)}%` : 'Chưa có';
  const surveyProgressText = task.surveyCompletedAt
    ? 'Đã nộp khảo sát'
    : task.surveyStartedAt
      ? 'Đang lưu bản nháp'
      : 'Chưa bắt đầu';

  const canOpenAttachments = canUploadEngineerAttachment(task);

  // Stepper calculations
  const step1Done = !task.canClaim;
  const step2Done = !!task.checkedInAt;
  const step3Done = !!task.surveyStartedAt || !!task.surveyCompletedAt;
  const step4Done = task.attachments.length > 0;
  const step5Done = !!task.surveyCompletedAt;

  return (
    <>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(40, insets.bottom + 24) },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[engineerColors.brandAccent]}
            tintColor={engineerColors.brandAccent}
          />
        }
      >
        <TaskDetailHeaderCard
          task={task}
          statusMeta={statusMeta}
          step1Done={step1Done}
          step2Done={step2Done}
          step3Done={step3Done}
          step4Done={step4Done}
          step5Done={step5Done}
        />

        <TaskCitizenPhotoCard
          photoUri={task.photoUri}
          onPress={() => setIsPhotoViewerOpen(true)}
        />

        <TaskLocationDossierCard
          task={task}
          localDistanceText={localDistanceText}
          copiedAddress={copiedAddress}
          onNavigate={handleNavigate}
          onCopyAddress={() => void handleCopyAddress()}
        />

        <TaskAiSurveySummaryCard
          task={task}
          aiConfidenceText={aiConfidenceText}
          surveyProgressText={surveyProgressText}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TaskDetailActionsCard
          task={task}
          isMutating={isMutating}
          canOpenAttachments={canOpenAttachments}
          onClaim={() => void handleClaim()}
          onCheckIn={() => navigation.navigate('EngineerCheckIn', { reportId: task.id })}
          onSurvey={() => navigation.navigate('EngineerSurvey', { reportId: task.id })}
          onAttachments={() => navigation.navigate('EngineerAttachments', { reportId: task.id })}
          onRelease={() => void handleRelease()}
        />
      </ScrollView>

      <EngineerPhotoViewer
        visible={isPhotoViewerOpen}
        imageUri={task.photoUri ?? null}
        title="Ảnh gốc phản ánh"
        onClose={() => setIsPhotoViewerOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: engineerSpacing.lg,
    gap: engineerSpacing.md,
    backgroundColor: engineerColors.background,
    paddingBottom: 40,
  },
  centerState: {
    flex: 1,
    padding: engineerSpacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: engineerColors.background,
  },
  stateText: {
    color: engineerColors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  errorText: {
    color: engineerColors.dangerRed,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
