import { StyleSheet, Text, View } from 'react-native';
import { engineerColors, engineerRadius, engineerSpacing } from '../../../styles/engineerTheme';
import type { EngineerTask } from '../../../services/engineerReportService';
import { getDamageTypeLabel, getPriorityLabel, getSeverityLabel } from '../utils/engineerTaskUtils';

type TaskAiSurveySummaryCardProps = {
  task: EngineerTask;
  aiConfidenceText: string;
  surveyProgressText: string;
};

export default function TaskAiSurveySummaryCard({
  task,
  aiConfidenceText,
  surveyProgressText,
}: TaskAiSurveySummaryCardProps) {
  return (
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

const styles = StyleSheet.create({
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
});
