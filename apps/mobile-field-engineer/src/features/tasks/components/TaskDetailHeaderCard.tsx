import { StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../../shared/mobileShared';
import { engineerColors, engineerRadius, engineerSpacing } from '../../../styles/engineerTheme';
import type { EngineerTask } from '../../../services/engineerReportService';
import { formatDate } from '../utils/engineerTaskUtils';

type TaskDetailHeaderCardProps = {
  task: EngineerTask;
  statusMeta: {
    backgroundColor?: string;
    borderColor?: string;
    color?: string;
    label?: string;
  } | null;
  step1Done: boolean;
  step2Done: boolean;
  step3Done: boolean;
  step4Done: boolean;
  step5Done: boolean;
};

export default function TaskDetailHeaderCard({
  task,
  statusMeta,
  step1Done,
  step2Done,
  step3Done,
  step4Done,
  step5Done,
}: TaskDetailHeaderCardProps) {
  return (
    <>
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

        <Text style={styles.title}>{task.title || 'Điểm khảo sát thực địa'}</Text>
        <Text style={styles.addressText} numberOfLines={1} ellipsizeMode="tail">
          📍 {task.formattedAddress || task.address || 'Khu vực khảo sát thực địa'}
        </Text>

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

const styles = StyleSheet.create({
  ticketHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: engineerRadius.md,
    padding: engineerSpacing.md,
    gap: 8,
    borderWidth: 1,
    borderColor: engineerColors.borderLight,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
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
    backgroundColor: '#EEF5FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  ticketBadgeText: {
    color: engineerColors.brandPrimary,
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
    color: engineerColors.textNavy,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
  },
  addressText: {
    color: engineerColors.textSecondary,
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
  sectionTitle: {
    color: engineerColors.textNavy,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
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
});
