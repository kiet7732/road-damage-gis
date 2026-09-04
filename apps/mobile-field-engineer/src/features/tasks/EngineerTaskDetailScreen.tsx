import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  getFieldPriorityMeta,
  getFieldSeverityMeta,
  getRoadDamageTypeOption,
} from '../../../../../packages/shared-constants/src/fieldDomainMetadata';
import {
  getFieldEngineerActionLabel,
  getFieldEngineerUiLabel,
  getFieldWorkflowStatus,
} from '../../../../../packages/shared-constants/src/engineerLabels';
import type { EngineerRootStackParamList } from '../../types/navigation';
import {
  AppButton,
  AppIcon,
  EmptyState,
  getOrLoadUserLocation,
} from '../../shared/mobileShared';
import {
  canUploadEngineerAttachment,
  claimEngineerTask,
  fetchEngineerTaskDetail,
  getEngineerTaskActionBlockReason,
  releaseEngineerTaskClaim,
  type EngineerTask,
} from '../../services/engineerReportService';
import EngineerPhotoViewer from './components/EngineerPhotoViewer';
import { engineerColors, engineerRadius, engineerSpacing } from '../../styles/engineerTheme';

type Props = NativeStackScreenProps<EngineerRootStackParamList, 'EngineerTaskDetail'>;

type LiveDistanceSummary = {
  distanceMeters: number | null;
  capturedAt: string | null;
};

export default function EngineerTaskDetailScreen({ route, navigation }: Props) {
  const { reportId } = route.params;
  const [task, setTask] = useState<EngineerTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState('');
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  const [liveDistance, setLiveDistance] = useState<LiveDistanceSummary>({
    distanceMeters: null,
    capturedAt: null,
  });

  const loadDetail = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const nextTask = await fetchEngineerTaskDetail(reportId);
      setTask(nextTask);

      const currentLocation = await getOrLoadUserLocation();
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
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : getFieldEngineerUiLabel('taskDetailLoadError'));
    } finally {
      setIsLoading(false);
    }
  }, [reportId]);

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

  const claimBlockedReason = getEngineerTaskActionBlockReason(task, 'claim');
  const releaseBlockedReason = getEngineerTaskActionBlockReason(task, 'release_claim');
  const checkinBlockedReason = getEngineerTaskActionBlockReason(task, 'check_in');
  const uploadBlockedReason = getEngineerTaskActionBlockReason(task, 'upload_attachment');
  const canOpenAttachments = canUploadEngineerAttachment(task);

  // Stepper calculations
  const step1Done = !task.canClaim;
  const step2Done = !!task.checkedInAt;
  const step3Done = !!task.surveyStartedAt || !!task.surveyCompletedAt;
  const step4Done = task.attachments.length > 0;
  const step5Done = !!task.surveyCompletedAt;

  return (
    <>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Ticket Header Card */}
        <View style={styles.ticketHeaderCard}>
          <View style={styles.ticketHeaderTop}>
            <View style={styles.ticketBadge}>
              <Text style={styles.ticketBadgeText}>#RDG-{task.id.slice(0, 8).toUpperCase()}</Text>
            </View>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: statusMeta?.backgroundColor || '#EEF5FF',
                  borderColor: statusMeta?.borderColor || '#B8D5FF',
                },
              ]}
            >
              <Text style={[styles.statusPillText, { color: statusMeta?.color || engineerColors.brandPrimary }]}>
                {statusMeta?.label || task.fieldStatusLabel}
              </Text>
            </View>
          </View>

          <Text style={styles.title}>{task.title}</Text>
          <Text style={styles.addressText}>📍 {task.address || 'Khu vực khảo sát thực địa'}</Text>

          {task.claimExpiresAt ? (
            <View style={styles.expireWarningBar}>
              <AppIcon name="time-outline" size={14} color={engineerColors.safetyOrange} containerSize={16} />
              <Text style={styles.expireWarningText}>
                Khóa quyền kiểm tra đến: {formatDate(task.claimExpiresAt)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* 5-Step Workflow Stepper HUD */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>QUY TRÌNH TÁC NGHIỆP HIỆN TRƯỜNG</Text>
          <View style={styles.stepperContainer}>
            <StepItem step="1" label="Tiếp nhận" done={step1Done} active={task.canClaim} />
            <View style={[styles.stepLine, step2Done && styles.stepLineDone]} />
            <StepItem step="2" label="Check-in" done={step2Done} active={!step2Done && step1Done} />
            <View style={[styles.stepLine, step3Done && styles.stepLineDone]} />
            <StepItem step="3" label="Khảo sát" done={step3Done} active={step2Done && !step5Done} />
            <View style={[styles.stepLine, step4Done && styles.stepLineDone]} />
            <StepItem step="4" label="Ảnh thêm" done={step4Done} active={step3Done} />
            <View style={[styles.stepLine, step5Done && styles.stepLineDone]} />
            <StepItem step="5" label="Nghiệm thu" done={step5Done} active={step5Done} />
          </View>
        </View>

        {/* Photo Card with Expand Hint */}
        {task.photoUri ? (
          <View style={styles.photoContainer}>
            <Text style={styles.sectionTitleOnBg}>HÌNH ẢNH CÔNG DÂN PHẢN ÁNH</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xem ảnh phóng to"
              onPress={() => setIsPhotoViewerOpen(true)}
              style={({ pressed }) => [styles.photoButton, pressed && styles.photoButtonPressed]}
            >
              <Image source={{ uri: task.photoUri }} style={styles.image} resizeMode="cover" />
              <View style={styles.photoHint}>
                <AppIcon name="scan-outline" size={14} color="#FFFFFF" containerSize={16} />
                <Text style={styles.photoHintText}>Bấm để mở chế độ soi ảnh & Bounding Box AI</Text>
              </View>
            </Pressable>
          </View>
        ) : null}

        {/* GPS Telemetry Dossier */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>ĐỊNH VỊ & ĐO ĐẠC HIỆN TRƯỜNG</Text>
            <View style={styles.rangePill}>
              <Text style={styles.rangePillText}>CỰ LY: {localDistanceText}</Text>
            </View>
          </View>

          <View style={styles.coordBox}>
            <Text style={styles.coordLabel}>TỌA ĐỘ BÁO CÁO:</Text>
            <Text style={styles.coordValue}>
              {task.gps.latitude.toFixed(6)}°N, {task.gps.longitude.toFixed(6)}°E
            </Text>
          </View>

          <View style={styles.infoGrid}>
            <InfoBox label="Sai số GPS lúc chụp" value={`±${Math.round(task.gps.accuracy || 0)}m`} />
            <InfoBox label="Khoảng cách tới Kỹ sư" value={localDistanceText} />
          </View>

          {task.checkedInAt ? (
            <View style={styles.checkinEvidenceBox}>
              <View style={styles.checkinEvidenceHeader}>
                <AppIcon name="checkmark-circle" size={16} color={engineerColors.radarGreen} containerSize={18} />
                <Text style={styles.checkinEvidenceTitle}>ĐÃ CHECK-IN THỰC ĐỊA THÀNH CÔNG</Text>
              </View>
              <Text style={styles.evidenceText}>Thời điểm: {formatDate(task.checkedInAt)}</Text>
              <Text style={styles.evidenceText}>
                Khoảng cách lúc check-in: {typeof task.distanceToReportMeters === 'number' ? `${Math.round(task.distanceToReportMeters)}m` : 'N/A'}
              </Text>
              <Text style={styles.evidenceText}>
                Độ chính xác thiết bị: {typeof task.checkedInAccuracy === 'number' ? `±${Math.round(task.checkedInAccuracy)}m` : 'N/A'}
              </Text>
            </View>
          ) : (
            <View style={styles.checkinWarningBox}>
              <AppIcon name="alert-circle-outline" size={16} color={engineerColors.safetyAmber} containerSize={18} />
              <Text style={styles.checkinWarningText}>Chưa xác nhận check-in tại vị trí này (Yêu cầu khoảng cách ≤ 30m).</Text>
            </View>
          )}
        </View>

        {/* AI Detection vs Field Verification */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>HỒ SƠ THẨM ĐỊNH KỸ THUẬT</Text>

          {/* AI suggestion panel */}
          <View style={styles.aiPanel}>
            <View style={styles.aiHeader}>
              <Text style={styles.aiTitle}>🤖 KẾT QUẢ AI NHẬN DẠNG</Text>
              <Text style={styles.aiConfidence}>Độ tin cậy: {aiConfidenceText}</Text>
            </View>
            <Text style={styles.aiResult}>
              Loại: <Text style={{ fontWeight: '900' }}>{task.aiSuggestedDamageLabel || 'Không rõ'}</Text> ({task.aiDetectionCount} vùng phát hiện)
            </Text>
          </View>

          {/* Field verified summary */}
          <View style={styles.infoGrid}>
            <InfoBox label="Thẩm định Kỹ sư" value={getDamageTypeLabel(task.fieldVerifiedDamageType)} highlight />
            <InfoBox label="Mức độ hư hỏng" value={getSeverityLabel(task.fieldSeverity)} />
          </View>

          <View style={styles.infoGrid}>
            <InfoBox label="Mức độ ưu tiên" value={getPriorityLabel(task.fieldPriority)} />
            <InfoBox label="Ảnh đính kèm" value={`${task.attachments.length} ảnh`} />
          </View>

          <View style={styles.infoGrid}>
            <InfoBox label="Tiến độ khảo sát" value={surveyProgressText} />
            <InfoBox label="Trạng thái Check-in" value={task.checkedInAt ? 'Đã check-in' : 'Chưa check-in'} />
          </View>

          {task.fieldNote ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>Ghi chú hiện trường:</Text>
              <Text style={styles.noteContent}>{task.fieldNote}</Text>
            </View>
          ) : null}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Action Command Center */}
        <View style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>THAO TÁC TÁC NGHIỆP</Text>

          {task.canClaim ? (
            <>
              <AppButton
                label={isMutating ? 'Đang tiếp nhận...' : 'TIẾP NHẬN ĐIỂM NÀY'}
                onPress={() => void handleClaim()}
                disabled={isMutating}
              />
              <Text style={styles.actionHint}>Tiếp nhận kiểm tra và khóa quyền trong 60 phút.</Text>
            </>
          ) : null}

          {task.canCheckIn ? (
            <>
              <AppButton
                label="CHECK-IN HIỆN TRƯỜNG (RADAR)"
                onPress={() => navigation.navigate('EngineerCheckIn', { reportId: task.id })}
              />
              <Text style={styles.actionHint}>Xác thực vị trí thực tế trong bán kính ≤ 30m.</Text>
            </>
          ) : null}

          <View style={styles.actionRow}>
            <Pressable
              onPress={() => navigation.navigate('EngineerSurvey', { reportId: task.id })}
              style={({ pressed }) => [styles.actionButtonSecondary, pressed && styles.pressed]}
            >
              <AppIcon name="create-outline" size={18} color={engineerColors.textNavy} containerSize={20} />
              <Text style={styles.actionButtonSecondaryText}>Phiếu khảo sát</Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('EngineerAttachments', { reportId: task.id })}
              disabled={!canOpenAttachments}
              style={({ pressed }) => [
                styles.actionButtonSecondary,
                !canOpenAttachments && styles.btnDisabled,
                pressed && styles.pressed,
              ]}
            >
              <AppIcon name="camera-outline" size={18} color={engineerColors.textNavy} containerSize={20} />
              <Text style={styles.actionButtonSecondaryText}>Ảnh bổ sung ({task.attachments.length})</Text>
            </Pressable>
          </View>

          {task.canReleaseClaim ? (
            <Pressable
              onPress={() => void handleRelease()}
              disabled={isMutating}
              style={({ pressed }) => [styles.releaseButton, pressed && styles.pressed]}
            >
              <Text style={styles.releaseButtonText}>
                {isMutating ? 'Đang hủy...' : 'HỦY TIẾP NHẬN (NHẢ QUYỀN)'}
              </Text>
            </Pressable>
          ) : null}
        </View>
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

function StepItem({ step, label, done, active }: { step: string; label: string; done: boolean; active: boolean }) {
  return (
    <View style={styles.stepItem}>
      <View
        style={[
          styles.stepCircle,
          done && styles.stepCircleDone,
          active && styles.stepCircleActive,
        ]}
      >
        <Text style={[styles.stepNum, done && styles.stepNumDone, active && styles.stepNumActive]}>
          {done ? '✓' : step}
        </Text>
      </View>
      <Text style={[styles.stepLabel, (done || active) && styles.stepLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function InfoBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={[styles.infoBox, highlight && styles.infoBoxHighlight]}>
      <Text style={styles.infoBoxLabel}>{label}</Text>
      <Text style={[styles.infoBoxValue, highlight && styles.infoBoxValueHighlight]}>{value}</Text>
    </View>
  );
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'Chưa có';
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

function calculateDistanceMeters(
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(toLatitude - fromLatitude);
  const dLon = toRad(toLongitude - fromLongitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(fromLatitude)) *
      Math.cos(toRad(toLatitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function getDamageTypeLabel(typeCode?: string | null): string {
  if (!typeCode) {
    return 'Chưa thẩm định';
  }
  const option = getRoadDamageTypeOption(typeCode);
  return option?.label || typeCode;
}

function getSeverityLabel(severity?: string | null): string {
  if (!severity) {
    return 'Chưa chọn';
  }
  const meta = getFieldSeverityMeta(severity);
  return meta?.label || severity;
}

function getPriorityLabel(priority?: string | null): string {
  if (!priority) {
    return 'Chưa chọn';
  }
  const meta = getFieldPriorityMeta(priority);
  return meta?.label || priority;
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
  ticketHeaderCard: {
    backgroundColor: engineerColors.headerBg,
    borderRadius: engineerRadius.md,
    padding: engineerSpacing.md,
    gap: 8,
    borderWidth: 1,
    borderColor: engineerColors.headerBorder,
  },
  ticketHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ticketBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: engineerRadius.xs,
    backgroundColor: engineerColors.headerSurface,
    borderWidth: 1,
    borderColor: engineerColors.headerBorder,
  },
  ticketBadgeText: {
    color: engineerColors.brandAccent,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: engineerRadius.xs,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '900',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
  },
  addressText: {
    color: engineerColors.textOnDarkMuted,
    fontSize: 12,
  },
  expireWarningBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: engineerRadius.xs,
    backgroundColor: 'rgba(255, 159, 28, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 28, 0.3)',
  },
  expireWarningText: {
    color: engineerColors.safetyOrange,
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: engineerRadius.md,
    padding: engineerSpacing.md,
    gap: 10,
    borderWidth: 1,
    borderColor: engineerColors.borderLight,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: engineerColors.textNavy,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  sectionTitleOnBg: {
    color: engineerColors.textNavy,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  rangePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: engineerRadius.xs,
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  rangePillText: {
    color: '#065F46',
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
    width: 52,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: engineerColors.brandPrimary,
    borderColor: engineerColors.brandPrimary,
  },
  stepCircleDone: {
    backgroundColor: engineerColors.radarGreen,
    borderColor: engineerColors.radarGreen,
  },
  stepNum: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '900',
  },
  stepNumActive: {
    color: '#FFFFFF',
  },
  stepNumDone: {
    color: '#FFFFFF',
  },
  stepLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: engineerColors.textNavy,
    fontWeight: '900',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: 14,
  },
  stepLineDone: {
    backgroundColor: engineerColors.radarGreen,
  },
  photoContainer: {
    marginTop: 2,
  },
  photoButton: {
    position: 'relative',
    borderRadius: engineerRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: engineerColors.borderMedium,
  },
  photoButtonPressed: {
    opacity: 0.9,
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: '#0F172A',
  },
  photoHint: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(11, 19, 43, 0.85)',
  },
  photoHintText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  coordBox: {
    padding: 8,
    borderRadius: engineerRadius.xs,
    backgroundColor: engineerColors.headerBg,
    gap: 2,
  },
  coordLabel: {
    color: engineerColors.textOnDarkMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  coordValue: {
    color: engineerColors.brandAccent,
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  infoBox: {
    flex: 1,
    padding: 8,
    borderRadius: engineerRadius.xs,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 2,
  },
  infoBoxHighlight: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  infoBoxLabel: {
    color: engineerColors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  infoBoxValue: {
    color: engineerColors.textNavy,
    fontSize: 12,
    fontWeight: '900',
  },
  infoBoxValueHighlight: {
    color: engineerColors.brandPrimary,
  },
  checkinEvidenceBox: {
    padding: 10,
    borderRadius: engineerRadius.xs,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 3,
  },
  checkinEvidenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  checkinEvidenceTitle: {
    color: '#065F46',
    fontSize: 11,
    fontWeight: '900',
  },
  evidenceText: {
    color: '#047857',
    fontSize: 11,
    fontWeight: '600',
  },
  checkinWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: engineerRadius.xs,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  checkinWarningText: {
    flex: 1,
    color: '#92400E',
    fontSize: 11,
    fontWeight: '700',
  },
  aiPanel: {
    padding: 10,
    borderRadius: engineerRadius.xs,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    gap: 4,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiTitle: {
    color: engineerColors.textNavy,
    fontSize: 11,
    fontWeight: '900',
  },
  aiConfidence: {
    color: engineerColors.brandPrimary,
    fontSize: 11,
    fontWeight: '900',
  },
  aiResult: {
    color: engineerColors.textSecondary,
    fontSize: 12,
  },
  noteBox: {
    padding: 8,
    borderRadius: engineerRadius.xs,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 2,
  },
  noteLabel: {
    color: engineerColors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  noteContent: {
    color: engineerColors.textPrimary,
    fontSize: 12,
    lineHeight: 16,
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: engineerRadius.md,
    padding: engineerSpacing.md,
    gap: 10,
    borderWidth: 1,
    borderColor: engineerColors.borderLight,
  },
  actionHint: {
    color: engineerColors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: -4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonSecondary: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: engineerRadius.sm,
    borderWidth: 1,
    borderColor: engineerColors.borderMedium,
    backgroundColor: '#F8FAFC',
  },
  actionButtonSecondaryText: {
    color: engineerColors.textNavy,
    fontSize: 12,
    fontWeight: '800',
  },
  releaseButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: engineerRadius.sm,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  releaseButtonText: {
    color: engineerColors.dangerRed,
    fontSize: 12,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  errorText: {
    color: engineerColors.dangerRed,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
