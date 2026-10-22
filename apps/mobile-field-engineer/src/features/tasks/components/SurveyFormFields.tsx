import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  FIELD_ENGINEER_PRIORITY_OPTIONS,
  FIELD_ENGINEER_SEVERITY_OPTIONS,
  ROAD_DAMAGE_TYPE_OPTIONS,
} from '../../../../../../packages/shared-constants/src/fieldDomainMetadata';
import type { DamageTypeCode } from '../../../../../../packages/mobile-shared/src/theme';
import { engineerColors, engineerRadius, engineerSpacing } from '../../../styles/engineerTheme';

type SurveyFormFieldsProps = {
  verifiedDamageType: DamageTypeCode | null;
  setVerifiedDamageType: (type: DamageTypeCode) => void;
  severity: string;
  setSeverity: (severity: string) => void;
  priority: string;
  setPriority: (priority: string) => void;
  noteDraft: string;
  setNoteDraft: (note: string) => void;
};

export default function SurveyFormFields({
  verifiedDamageType,
  setVerifiedDamageType,
  severity,
  setSeverity,
  priority,
  setPriority,
  noteDraft,
  setNoteDraft,
}: SurveyFormFieldsProps) {
  return (
    <>
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
    </>
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
  pressed: {
    opacity: 0.85,
  },
});
