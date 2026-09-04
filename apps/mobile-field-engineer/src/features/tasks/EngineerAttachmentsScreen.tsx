import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { File as ExpoFile } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
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

type Props = NativeStackScreenProps<EngineerRootStackParamList, 'EngineerAttachments'>;

const MAX_IMAGE_DIMENSION = 1600;

export default function EngineerAttachmentsScreen({ route, navigation }: Props) {
  const { reportId } = route.params;
  const cameraRef = useRef<CameraView | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [task, setTask] = useState<EngineerTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [viewerImageUri, setViewerImageUri] = useState<string | null>(null);
  const [attachmentNote, setAttachmentNote] = useState('');
  const [error, setError] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const loadTask = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const detail = await fetchEngineerTaskDetail(reportId);
      setTask(detail);
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

  const handleCapturePhoto = async () => {
    if (isCapturing) {
      return;
    }

    setIsCapturing(true);
    setError('');

    try {
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.82,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        throw new Error('Không chụp được ảnh bổ sung.');
      }

      const photoWidth = Number.isFinite(photo.width) ? photo.width : undefined;
      const photoHeight = Number.isFinite(photo.height) ? photo.height : undefined;
      const longestEdge = Math.max(photoWidth ?? 0, photoHeight ?? 0);
      const shouldResize = longestEdge > MAX_IMAGE_DIMENSION;

      const optimizedPhoto = await manipulateAsync(
        photo.uri,
        shouldResize
          ? [
              photoWidth && photoHeight
                ? photoWidth >= photoHeight
                  ? { resize: { width: MAX_IMAGE_DIMENSION } }
                  : { resize: { height: MAX_IMAGE_DIMENSION } }
                : { resize: { width: MAX_IMAGE_DIMENSION } },
            ]
          : [],
        {
          compress: 0.8,
          format: SaveFormat.JPEG,
        },
      );

      if (!optimizedPhoto?.uri) {
        throw new Error('Không tối ưu được ảnh bổ sung.');
      }

      if (photo.uri !== optimizedPhoto.uri) {
        try {
          const rawPhoto = new ExpoFile(photo.uri) as unknown as {
            exists: boolean;
            delete: () => void;
          };
          if (rawPhoto.exists) {
            rawPhoto.delete();
          }
        } catch {
          // Bỏ qua lỗi dọn file tạm.
        }
      }

      setCapturedPhotoUri(optimizedPhoto.uri);
      setIsCameraOpen(false);
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : 'Không thể chụp ảnh bổ sung.');
    } finally {
      setIsCapturing(false);
    }
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

  if (isCameraOpen) {
    return (
      <View style={styles.cameraScreen}>
        <CameraView ref={cameraRef} style={styles.cameraPreview} facing="back" />
        <View style={styles.cameraOverlay}>
          <Text style={styles.cameraTitle}>{getFieldEngineerUiLabel('attachmentsCameraTitle')}</Text>
          <Text style={styles.cameraHint}>{getFieldEngineerUiLabel('attachmentsCameraHint')}</Text>

          {error ? <Text style={styles.cameraError}>{error}</Text> : null}

          <View style={styles.cameraActions}>
            <AppButton
              label={getFieldEngineerUiLabel('attachmentsCloseCamera')}
              variant="outline"
              onPress={() => setIsCameraOpen(false)}
              disabled={isCapturing}
            />
            <AppButton
              label={isCapturing ? getFieldEngineerUiLabel('attachmentsCapturePending') : getFieldEngineerUiLabel('attachmentsCapture')}
              onPress={() => void handleCapturePhoto()}
              disabled={isCapturing}
            />
          </View>
        </View>
      </View>
    );
  }

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
              <Image source={{ uri: capturedPhotoUri }} style={styles.previewImage} resizeMode="cover" />
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
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 240,
    backgroundColor: colors.surfaceMuted,
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
    width: 72,
    height: 72,
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
  cameraScreen: {
    flex: 1,
    backgroundColor: '#020617',
  },
  cameraPreview: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
  },
  cameraTitle: {
    color: colors.surface,
    fontSize: 20,
    fontWeight: '900',
  },
  cameraHint: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    lineHeight: 21,
  },
  cameraError: {
    color: '#FFD3CE',
    fontSize: 13,
    fontWeight: '700',
  },
  cameraActions: {
    gap: spacing.md,
  },
});
