import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DamageTypeCode } from '../../../../../packages/mobile-shared/src/theme';
import type { EngineerRootStackParamList } from '../../types/navigation';
import { AppButton, EmptyState, getDeviceCurrentLocation } from '../../shared/mobileShared';
import {
  fetchEngineerTaskDetail,
  updateEngineerSurvey,
  type EngineerTask,
} from '../../services/engineerReportService';
import SurveyActionsBar from './components/SurveyActionsBar';
import SurveyFormFields from './components/SurveyFormFields';
import SurveyHeaderBanner from './components/SurveyHeaderBanner';
import { engineerColors, engineerSpacing } from '../../styles/engineerTheme';

type Props = NativeStackScreenProps<EngineerRootStackParamList, 'EngineerSurvey'>;

export default function EngineerSurveyScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { reportId } = route.params;
  const [task, setTask] = useState<EngineerTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const hasLoadedRef = useRef(false);

  const [verifiedDamageType, setVerifiedDamageType] = useState<DamageTypeCode | null>(null);
  const [severity, setSeverity] = useState('');
  const [priority, setPriority] = useState('');
  const [noteDraft, setNoteDraft] = useState('');

  const loadTask = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else if (!hasLoadedRef.current) {
      setIsLoading(true);
    }
    setError('');
    try {
      const detail = await fetchEngineerTaskDetail(reportId);
      setTask(detail);
      setVerifiedDamageType(detail.fieldVerifiedDamageType ?? detail.type ?? null);
      setSeverity(detail.fieldSeverity || '');
      setPriority(detail.fieldPriority || '');
      setNoteDraft(detail.fieldNote || detail.note || '');
      hasLoadedRef.current = true;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không tải được phiếu khảo sát.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [reportId]);

  const handleRefresh = useCallback(() => {
    void loadTask(true);
  }, [loadTask]);

  useFocusEffect(
    useCallback(() => {
      void loadTask();
    }, [loadTask]),
  );

  const canSubmitSurvey = useMemo(() => {
    return Boolean(verifiedDamageType && severity.trim() && priority.trim());
  }, [priority, severity, verifiedDamageType]);
  const hasCheckedIn = Boolean(task?.checkedInAt);
  const canSubmitFinalSurvey = canSubmitSurvey && hasCheckedIn;

  const handleSaveSurvey = async (submit: boolean) => {
    if (!task || isSaving) {
      return;
    }

    if (submit && !hasCheckedIn) {
      setError('Cần thực hiện Check-in hiện trường trước khi gửi khảo sát chính thức.');
      return;
    }

    if (submit && !canSubmitSurvey) {
      setError('Vui lòng chọn đầy đủ: Loại hư hỏng, Mức độ và Mức ưu tiên.');
      return;
    }

    setIsSaving(true);
    setError('');

    if (submit) {
      try {
        const liveLocation = await getDeviceCurrentLocation();
        if (liveLocation.isMocked) {
          setError(
            'Cảnh báo: Phát hiện thiết bị đang bật chế độ định vị giả lập (Mock Location). Vui lòng tắt các ứng dụng can thiệp GPS để tiếp tục tác nghiệp.',
          );
          setIsSaving(false);
          return;
        }
      } catch (locErr) {
        setError(locErr instanceof Error ? locErr.message : 'Không thể xác thực toạ độ thiết bị.');
        setIsSaving(false);
        return;
      }
    }

    try {
      const updatedTask = await updateEngineerSurvey(task.id, {
        verifiedDamageType,
        severity,
        priority,
        note: noteDraft,
        submit,
      });
      setTask(updatedTask);

      if (submit) {
        navigation.replace('EngineerTaskDetail', { reportId: task.id });
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu phiếu khảo sát.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color={engineerColors.brandAccent} size="large" />
        <Text style={styles.stateText}>Đang nạp dữ liệu phiếu khảo sát...</Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.centerState}>
        <EmptyState
          title="LỖI MỞ PHIẾU KHẢO SÁT"
          description={error || 'Không tìm thấy thông tin hồ sơ.'}
          action={<AppButton label="Tải lại" onPress={() => void loadTask()} />}
        />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.screen,
        { paddingBottom: Math.max(40, insets.bottom + 24) },
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
      <SurveyHeaderBanner
        task={task}
        hasCheckedIn={hasCheckedIn}
        onNavigateToCheckIn={() => navigation.navigate('EngineerCheckIn', { reportId })}
      />

      <SurveyFormFields
        verifiedDamageType={verifiedDamageType}
        setVerifiedDamageType={setVerifiedDamageType}
        severity={severity}
        setSeverity={setSeverity}
        priority={priority}
        setPriority={setPriority}
        noteDraft={noteDraft}
        setNoteDraft={setNoteDraft}
      />

      <SurveyActionsBar
        error={error}
        isSaving={isSaving}
        canSubmitFinalSurvey={canSubmitFinalSurvey}
        attachmentCount={task.attachments.length}
        onSubmit={() => void handleSaveSurvey(true)}
        onSaveDraft={() => void handleSaveSurvey(false)}
        onNavigateToAttachments={() => navigation.navigate('EngineerAttachments', { reportId })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: engineerSpacing.lg,
    gap: engineerSpacing.md,
    backgroundColor: engineerColors.background,
    paddingBottom: 40,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: engineerColors.background,
    padding: 32,
  },
  stateText: {
    color: engineerColors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
});
