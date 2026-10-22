import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCameraPermissions } from 'expo-camera';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { getFieldEngineerUiLabel } from '../../../../../packages/shared-constants/src/engineerLabels';
import type { EngineerRootStackParamList } from '../../types/navigation';
import { AppButton, AppIcon, colors, EmptyState, radius, spacing } from '../../shared/mobileShared';
import {
  canUploadEngineerAttachment,
  fetchEngineerTaskDetail,
  getEngineerTaskActionBlockReason,
  uploadEngineerSurveyAttachment,
  type EngineerTask,
} from '../../services/engineerReportService';
import EngineerPhotoViewer from './components/EngineerPhotoViewer';
import EngineerCameraView from './components/EngineerCameraView';

type Props = NativeStackScreenProps<EngineerRootStackParamList, 'EngineerAttachments'>;

export default function EngineerAttachmentsScreen({ route, navigation }: Props) {
  const { reportId } = route.params;
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [task, setTask] = useState<EngineerTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [viewerImageUri, setViewerImageUri] = useState<string | null>(null);
  const [attachmentNote, setAttachmentNote] = useState('');
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const hasLoadedRef = useRef(false);

  const loadTask = useCallback(async () => {
    if (!hasLoadedRef.current) {
      setIsLoading(true);
    }
    setError('');
    try {
      const detail = await fetchEngineerTaskDetail(reportId);
      setTask(detail);
      hasLoadedRef.current = true;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : getFieldEngineerUiLabel('attachmentsLoadError'));
    } finally {
      setIsLoading(false);
    }
  }, [reportId]);

  useFocusEffect(
    useCallback(() => {
      void loadTask();
    }, [loadTask]),
  );

  const ensureCameraPermission = useCallback(async () => {
    if (cameraPermission?.granted) {
      return true;
    }

    const nextPermission = await requestCameraPermission();
    if (!nextPermission.granted) {
      setError(getFieldEngineerUiLabel('attachmentsCameraPermissionRequired'));
      return false;
    }

    return true;
  }, [cameraPermission?.granted, requestCameraPermission]);

  const handleOpenCamera = async () => {
    const granted = await ensureCameraPermission();
    if (!granted) {
      return;
    }

    setError('');
    setIsCameraOpen(true);
  };

  const handleUploadAttachment = async () => {
    if (!task || !capturedPhotoUri || isUploading) {
      return;
    }

    setIsUploading(true);
    setError('');
    try {
      await uploadEngineerSurveyAttachment(task.id, {
        photoUri: capturedPhotoUri,
        note: attachmentNote,
        imageSource: 'camera_live',
        capturedAt: new Date().toISOString(),
      });
      setCapturedPhotoUri(null);
      setAttachmentNote('');
      await loadTask();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : getFieldEngineerUiLabel('attachmentsUploadError'));
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.stateText}>{getFieldEngineerUiLabel('attachmentsLoading')}</Text>
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.centerState}>
        <EmptyState
          title={getFieldEngineerUiLabel('attachmentsOpenError')}
          description={error || getFieldEngineerUiLabel('attachmentsOpenErrorDescription')}
          action={<AppButton label={getFieldEngineerUiLabel('commonReload')} onPress={() => void loadTask()} />}
        />
      </View>
    );
  }

  const canUpload = canUploadEngineerAttachment(task);
  const uploadBlockedReason = getEngineerTaskActionBlockReason(task, 'upload_attachment');

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>{getFieldEngineerUiLabel('surveyAttachmentsOpen')}</Text>
          <Text style={styles.description}>
            {getFieldEngineerUiLabel('attachmentsScreenDescription')}
          </Text>
          <Text style={styles.meta}>Ảnh đã tải: {task.attachments.length}</Text>
          <Text style={styles.helperText}>
            {canUpload ? getFieldEngineerUiLabel('taskActionUploadHint') : uploadBlockedReason}
          </Text>
        </View>

        {capturedPhotoUri ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Ảnh chuẩn bị tải lên</Text>
            <Pressable onPress={() => setViewerImageUri(capturedPhotoUri)} style={styles.previewWrap}>
              <Image
                source={{ uri: capturedPhotoUri }}
                style={StyleSheet.absoluteFillObject}
                blurRadius={20}
                resizeMode="cover"
              />
              <View style={styles.photoBackdropOverlay} />
              <Image source={{ uri: capturedPhotoUri }} style={styles.previewImage} resizeMode="contain" />
            </Pressable>
            <TextInput
              placeholder="Ghi chú ngắn cho ảnh bổ sung (nếu cần)"
              placeholderTextColor={colors.textMuted}
              value={attachmentNote}
              onChangeText={setAttachmentNote}
              style={styles.noteInput}
            />
            <View style={styles.inlineActions}>
              <AppButton
                label={isUploading ? getFieldEngineerUiLabel('attachmentsUploadPending') : getFieldEngineerUiLabel('attachmentsUpload')}
                onPress={() => void handleUploadAttachment()}
                disabled={isUploading || !canUpload}
              />
              <AppButton
                label="Chụp lại"
                variant="outline"
                onPress={() => {
                  setCapturedPhotoUri(null);
                  void handleOpenCamera();
                }}
                disabled={isUploading}
              />
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{getFieldEngineerUiLabel('attachmentsScreenTitle')}</Text>
            <Text style={styles.description}>
              Nên chụp cận cảnh vị trí hư hỏng hoặc thêm một góc rộng để dễ đánh giá hiện trường.
            </Text>
            <AppButton label="Mở camera" onPress={() => void handleOpenCamera()} disabled={!canUpload} />
            {!canUpload ? <Text style={styles.helperText}>{uploadBlockedReason}</Text> : null}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Danh sách ảnh đã tải</Text>
          {task.attachments.length > 0 ? (
            <View style={styles.attachmentList}>
              {task.attachments.map((attachment, index) => (
                <Pressable
                  key={attachment.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Xem ảnh bổ sung ${index + 1}`}
                  onPress={() => setViewerImageUri(attachment.file_url)}
                  style={({ pressed }) => [styles.attachmentRow, pressed && styles.attachmentRowPressed]}
                >
                  <Image source={{ uri: attachment.file_url }} style={styles.attachmentThumb} resizeMode="cover" />
                  <View style={styles.attachmentMeta}>
                    <Text style={styles.attachmentTitle}>{getFieldEngineerUiLabel('surveyAttachmentsOpen')} #{index + 1}</Text>
                    <Text style={styles.attachmentSubtitle}>{formatDate(attachment.created_at)}</Text>
                    {attachment.note ? <Text style={styles.attachmentSubtitle}>{attachment.note}</Text> : null}
                  </View>
                  <AppIcon name="expand-outline" size={18} color={colors.primaryDark} containerSize={28} />
                </Pressable>
              ))}
            </View>
          ) : (
            <EmptyState
              title="Chưa có ảnh bổ sung"
              description={getFieldEngineerUiLabel('attachmentsEmpty')}
            />
          )}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.actions}>
          <AppButton
            label={getFieldEngineerUiLabel('attachmentsBackToSurvey')}
            variant="outline"
            onPress={() => navigation.goBack()}
          />
          <AppButton
            label="Về chi tiết công việc"
            variant="outline"
            onPress={() => navigation.navigate('EngineerTaskDetail', { reportId })}
          />
        </View>
      </ScrollView>

      <EngineerPhotoViewer
        visible={Boolean(viewerImageUri)}
        imageUri={viewerImageUri}
        title={getFieldEngineerUiLabel('attachmentsSectionTitle')}
        onClose={() => setViewerImageUri(null)}
      />

      {task && isCameraOpen ? (
        <EngineerCameraView
          visible={isCameraOpen}
          task={task}
          onClose={() => setIsCameraOpen(false)}
          onCapturePhoto={(photoUri) => {
            setCapturedPhotoUri(photoUri);
            setIsCameraOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function formatDate(value?: string | null) {
  if (!value) {
    return getFieldEngineerUiLabel('noData');
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    backgroundColor: colors.background,
    paddingBottom: spacing.xxl,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  stateText: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  previewWrap: {
    height: 300,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBackdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  noteInput: {
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inputBackground,
    color: colors.text,
    fontSize: 14,
  },
  inlineActions: {
    gap: spacing.md,
  },
  attachmentList: {
    gap: spacing.sm,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  attachmentRowPressed: {
    opacity: 0.94,
  },
  attachmentThumb: {
    width: 64,
    height: 80,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  attachmentMeta: {
    flex: 1,
    gap: 4,
  },
  attachmentTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  attachmentSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  actions: {
    gap: spacing.md,
  },
});
