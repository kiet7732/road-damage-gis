import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../../shared/mobileShared';
import { engineerColors, engineerRadius, engineerSpacing } from '../../../styles/engineerTheme';
import type { EngineerTask } from '../../../services/engineerReportService';
import { formatDate } from '../utils/engineerTaskUtils';

type TaskLocationDossierCardProps = {
  task: EngineerTask;
  localDistanceText: string;
  copiedAddress: boolean;
  onNavigate: () => void;
  onCopyAddress: () => void;
};

export default function TaskLocationDossierCard({
  task,
  localDistanceText,
  copiedAddress,
  onNavigate,
  onCopyAddress,
}: TaskLocationDossierCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.sectionTitle}>ĐỊA CHỈ & VỊ TRÍ HIỆN TRƯỜNG</Text>
        <View style={styles.rangePill}>
          <Text style={styles.rangePillText}>CỰ LY: {localDistanceText}</Text>
        </View>
      </View>

      {/* Prominent Address Box */}
      <View style={styles.addressBox}>
        <View style={styles.addressRoadRow}>
          <AppIcon name="location" size={18} color={engineerColors.brandPrimary} containerSize={20} />
          <Text style={styles.addressRoadTitle}>
            {task.formattedAddress || task.address || 'Đang cập nhật địa chỉ...'}
          </Text>
        </View>

        {task.isAddressPending && !task.formattedAddress ? (
          <View style={styles.pendingAddressBar}>
            <AppIcon name="time-outline" size={14} color={engineerColors.safetyAmber} containerSize={16} />
            <Text style={styles.pendingAddressText}>Đang xác định địa chỉ...</Text>
          </View>
        ) : null}

        {/* External Navigation & Copy Address Actions */}
        <View style={styles.addressActionRow}>
          <Pressable
            onPress={onNavigate}
            accessibilityRole="button"
            accessibilityLabel="Mở chỉ đường trên Google Maps"
            style={({ pressed }) => [styles.btnNavigate, pressed && styles.btnPressed]}
          >
            <AppIcon name="navigate-outline" size={16} color="#FFFFFF" containerSize={18} />
            <Text style={styles.btnNavigateText}>Chỉ đường (Google Maps)</Text>
          </Pressable>

          <Pressable
            onPress={onCopyAddress}
            style={({ pressed }) => [styles.btnCopy, pressed && styles.btnPressed]}
          >
            <AppIcon
              name={copiedAddress ? 'checkmark-circle-outline' : 'copy-outline'}
              size={15}
              color={copiedAddress ? '#10B981' : engineerColors.textNavy}
              containerSize={17}
            />
            <Text style={[styles.btnCopyText, copiedAddress && { color: '#10B981' }]}>
              {copiedAddress ? 'Đã sao chép!' : 'Sao chép'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Technical Coordinate Panel */}
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
            <Text style={styles.checkinEvidenceTitle}>ĐÃ CHECK-IN THỰC ĐI THÀNH CÔNG</Text>
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
  addressBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: engineerRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: engineerSpacing.md,
    gap: engineerSpacing.xs,
    marginBottom: engineerSpacing.sm,
  },
  addressRoadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressRoadTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0B132B',
    flex: 1,
  },
  pendingAddressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: engineerRadius.xs,
    marginTop: 4,
  },
  pendingAddressText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: engineerColors.safetyAmber,
    fontWeight: '600',
  },
  addressActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: engineerSpacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: engineerSpacing.sm,
  },
  btnNavigate: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: engineerColors.brandPrimary,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: engineerRadius.sm,
    shadowColor: engineerColors.brandPrimary,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  btnNavigateText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  btnCopy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: engineerRadius.sm,
  },
  btnCopyText: {
    color: engineerColors.textNavy,
    fontSize: 12,
    fontWeight: '700',
  },
  btnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  coordBox: {
    padding: 8,
    borderRadius: engineerRadius.xs,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 2,
  },
  coordLabel: {
    color: engineerColors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  coordValue: {
    color: engineerColors.brandPrimary,
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
});
