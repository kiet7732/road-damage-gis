import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getFieldEngineerUiLabel } from '../../../../../packages/shared-constants/src/engineerLabels';
import {
  FIELD_ENGINEER_PRIORITY_OPTIONS,
  FIELD_ENGINEER_SEVERITY_OPTIONS,
  ROAD_DAMAGE_TYPE_OPTIONS,
} from '../../../../../packages/shared-constants/src/fieldDomainMetadata';
import type { DamageTypeCode } from '../../../../../packages/mobile-shared/src/theme';
import type { EngineerRootStackParamList } from '../../types/navigation';
import { AppButton, AppIcon, EmptyState } from '../../shared/mobileShared';
import {
  fetchEngineerTaskDetail,
  updateEngineerSurvey,
  type EngineerTask,
} from '../../services/engineerReportService';
import { engineerColors, engineerRadius, engineerSpacing } from '../../styles/engineerTheme';

type Props = NativeStackScreenProps<EngineerRootStackParamList, 'EngineerSurvey'>;

export default function EngineerSurveyScreen({ route, navigation }: Props) {
  const { reportId } = route.params;
  const [task, setTask] = useState<EngineerTask | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [verifiedDamageType, setVerifiedDamageType] = useState<DamageTypeCode | null>(null);
  const [severity, setSeverity] = useState('');
  const [priority, setPriority] = useState('');
  const [noteDraft, setNoteDraft] = useState('');

  const loadTask = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const detail = await fetchEngineerTaskDetail(reportId);
      setTask(detail);
      setVerifiedDamageType(detail.fieldVerifiedDamageType ?? detail.type ?? null);
      setSeverity(detail.fieldSeverity || '');
      setPriority(detail.fieldPriority || '');
      setNoteDraft(detail.fieldNote || detail.note || '');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không tải được phiếu khảo sát.');
    } finally {
      setIsLoading(false);
    }
  }, [reportId]);

  useFocusEffect(
    useCallback(() => {
      void loadTask();
    }, [loadTask]),
  );

  const canSubmitSurvey = useMemo(() => {
    return Boolean(verifiedDamageType && severity.trim() && priority.trim());
  }, [priority, severity, verifiedDamageType]);
  const canCheckInNow = task?.canCheckIn ?? false;
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
    <ScrollView contentContainerStyle={styles.screen}>
      {/* Header Banner */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Text style={styles.headerId}>PHIẾU KHẢO SÁT KỸ THUẬT #RDG-{task.id.slice(0, 6).toUpperCase()}</Text>
          <View style={[styles.checkinBadge, hasCheckedIn ? styles.checkinDone : styles.checkinMissing]}>
            <Text style={[styles.checkinBadgeText, hasCheckedIn ? styles.checkinDoneText : styles.checkinMissingText]}>
              {hasCheckedIn ? '✓ ĐÃ CHECK-IN' : '⚠️ CHƯA CHECK-IN'}
            </Text>
          </View>
        </View>
        <Text style={styles.headerTitle}>{task.title}</Text>
        <Text style={styles.headerAddress}>📍 {task.address || 'Khu vực khảo sát thực địa'}</Text>
      </View>

      {/* Check-in Reminder Notice if missing */}
      {!hasCheckedIn ? (
        <View style={styles.warningNotice}>
          <AppIcon name="alert-circle-outline" size={18} color={engineerColors.safetyAmber} containerSize={20} />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>YÊU CẦU CHECK-IN HIỆN TRƯỜNG</Text>
            <Text style={styles.warningText}>
              Bạn có thể lưu nháp phiếu này, nhưng cần Check-in thực địa (≤ 30m) mới được nộp chính thức.
            </Text>
            <Pressable
              onPress={() => navigation.navigate('EngineerCheckIn', { reportId })}
              style={styles.checkInQuickBtn}
            >
              <Text style={styles.checkInQuickBtnText}>Đi tới màn hình Check-in ➔</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Damage Type Grid */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>1. XÁC MINH LOẠI HƯ HỎNG MẶT ĐƯỜNG</Text>
        <View style={styles.damageGrid}>
          {ROAD_DAMAGE_TYPE_OPTIONS.map((option) => {
            const selected = verifiedDamageType === option.code;
            return (
              <Pressable
                key={option.code}
                onPress={() => setVerifiedDamageType(option.code as DamageTypeCode)}
                style={({ pressed }) => [
                  styles.damageTile,
                  selected && {
                    backgroundColor: option.backgroundColor,
                    borderColor: option.color,
                    borderWidth: 2,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.damageCodePill, { backgroundColor: option.color }]}>
                  <Text style={styles.damageCodeText}>{option.code}</Text>
                </View>
                <Text style={[styles.damageLabel, selected && { color: option.color, fontWeight: '900' }]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Severity & Priority Grid */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>2. MỨC ĐỘ NGHIÊM TRỌNG</Text>
        <View style={styles.chipWrap}>
          {FIELD_ENGINEER_SEVERITY_OPTIONS.map((option) => {
            const selected = severity === option.value;
            return (
              <Pressable
                key={option.key}
                onPress={() => setSeverity(option.value)}
                style={({ pressed }) => [
                  styles.levelChip,
                  selected && {
                    backgroundColor: option.backgroundColor,
                    borderColor: option.borderColor,
                    borderWidth: 2,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.levelChipText, selected && { color: option.color, fontWeight: '900' }]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>3. MỨC ĐỘ ƯU TIÊN XỬ LÝ</Text>
        <View style={styles.chipWrap}>
          {FIELD_ENGINEER_PRIORITY_OPTIONS.map((option) => {
            const selected = priority === option.value;
            return (
              <Pressable
                key={option.key}
                onPress={() => setPriority(option.value)}
                style={({ pressed }) => [
                  styles.levelChip,
                  selected && {
                    backgroundColor: option.backgroundColor,
                    borderColor: option.borderColor,
                    borderWidth: 2,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.levelChipText, selected && { color: option.color, fontWeight: '900' }]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Technical Notes Input */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>4. GHI CHÚ KỸ THUẬT & PHƯƠNG ÁN XỬ LÝ</Text>
        <TextInput
          multiline
          numberOfLines={5}
          placeholder="Nhập kích thước ước tính, vật liệu trám vá, điều kiện mặt đường..."
          placeholderTextColor={engineerColors.textMuted}
          style={styles.textArea}
          value={noteDraft}
          onChangeText={setNoteDraft}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Tactical Submission Actions */}
      <View style={styles.actions}>
        <Pressable
          onPress={() => void handleSaveSurvey(true)}
          disabled={isSaving || !canSubmitFinalSurvey}
          style={({ pressed }) => [
            styles.submitButton,
            (!canSubmitFinalSurvey || isSaving) && styles.btnDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.submitButtonText}>
            {isSaving ? 'ĐANG NỘP PHIẾU...' : 'GỬI PHIẾU KHẢO SÁT CHÍNH THỨC'}
          </Text>
        </Pressable>

        <View style={styles.secondaryActionRow}>
          <Pressable
            onPress={() => void handleSaveSurvey(false)}
            disabled={isSaving}
            style={({ pressed }) => [styles.draftButton, pressed && styles.pressed]}
          >
            <Text style={styles.draftButtonText}>
              {isSaving ? 'Đang lưu...' : '💾 Lưu bản nháp'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('EngineerAttachments', { reportId })}
            style={({ pressed }) => [styles.attachButton, pressed && styles.pressed]}
          >
            <AppIcon name="camera-outline" size={16} color={engineerColors.textNavy} containerSize={18} />
            <Text style={styles.attachButtonText}>Ảnh thực địa ({task.attachments.length})</Text>
          </Pressable>
        </View>
      </View>
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
  headerCard: {
    backgroundColor: engineerColors.headerBg,
    borderRadius: engineerRadius.md,
    padding: engineerSpacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: engineerColors.headerBorder,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerId: {
    color: engineerColors.brandAccent,
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  checkinBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: engineerRadius.xs,
    borderWidth: 1,
  },
  checkinDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderColor: engineerColors.radarGreen,
  },
  checkinMissing: {
    backgroundColor: 'rgba(255, 159, 28, 0.18)',
    borderColor: engineerColors.safetyOrange,
  },
  checkinBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  checkinDoneText: {
    color: engineerColors.radarGreen,
  },
  checkinMissingText: {
    color: engineerColors.safetyOrange,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  headerAddress: {
    color: engineerColors.textOnDarkMuted,
    fontSize: 12,
  },
  warningNotice: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: engineerRadius.md,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningContent: {
    flex: 1,
    gap: 4,
  },
  warningTitle: {
    color: '#92400E',
    fontSize: 11,
    fontWeight: '900',
  },
  warningText: {
    color: '#78350F',
    fontSize: 11,
    lineHeight: 16,
  },
  checkInQuickBtn: {
    marginTop: 4,
  },
  checkInQuickBtnText: {
    color: engineerColors.brandPrimary,
    fontSize: 12,
    fontWeight: '800',
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
  sectionTitle: {
    color: engineerColors.textNavy,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  damageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  damageTile: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: engineerRadius.xs,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  damageCodePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: engineerRadius.xs,
  },
  damageCodeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  damageLabel: {
    flex: 1,
    color: engineerColors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  levelChip: {
    flex: 1,
    minWidth: 70,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: engineerRadius.xs,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  levelChipText: {
    color: engineerColors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  textArea: {
    minHeight: 90,
    padding: 10,
    borderRadius: engineerRadius.xs,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    color: engineerColors.textPrimary,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  actions: {
    gap: 10,
  },
  submitButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: engineerRadius.sm,
    backgroundColor: engineerColors.brandPrimary,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  secondaryActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  draftButton: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: engineerRadius.xs,
    borderWidth: 1,
    borderColor: engineerColors.borderMedium,
    backgroundColor: '#F8FAFC',
  },
  draftButtonText: {
    color: engineerColors.textNavy,
    fontSize: 12,
    fontWeight: '800',
  },
  attachButton: {
    flex: 1,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: engineerRadius.xs,
    borderWidth: 1,
    borderColor: engineerColors.borderMedium,
    backgroundColor: '#F8FAFC',
  },
  attachButtonText: {
    color: engineerColors.textNavy,
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
