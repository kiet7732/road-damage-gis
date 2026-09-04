import { StyleSheet, TextInput } from 'react-native';
import IconTitleRow from '../../../components/IconTitleRow';
import InfoCard from '../../../components/InfoCard';
import { colors, radius, spacing } from '../../../constants/theme';
import { MAX_REPORT_NOTE_LENGTH } from '../../../services/reportService';

type ReportNoteCardProps = {
  value: string;
  onChangeText: (value: string) => void;
};

export default function ReportNoteCard({ value, onChangeText }: ReportNoteCardProps) {
  return (
    <InfoCard style={styles.card}>
      <IconTitleRow icon="create-outline" title="Ghi chú thêm" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline
        maxLength={MAX_REPORT_NOTE_LENGTH}
        placeholder="Ví dụ: Ổ gà sâu, có nước đọng, dễ gây nguy hiểm vào buổi tối..."
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        textAlignVertical="top"
        returnKeyType="default"
      />
    </InfoCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  input: {
    minHeight: 72,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    backgroundColor: colors.inputBackground,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    lineHeight: 20,
  },
});
