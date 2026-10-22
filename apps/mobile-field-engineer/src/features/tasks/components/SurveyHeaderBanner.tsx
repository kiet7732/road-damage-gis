import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../../shared/mobileShared';
import { engineerColors, engineerRadius, engineerSpacing } from '../../../styles/engineerTheme';
import type { EngineerTask } from '../../../services/engineerReportService';

type SurveyHeaderBannerProps = {
  task: EngineerTask;
  hasCheckedIn: boolean;
  onNavigateToCheckIn: () => void;
};

export default function SurveyHeaderBanner({
  task,
  hasCheckedIn,
  onNavigateToCheckIn,
}: SurveyHeaderBannerProps) {
  return (
    <>
      {/* Header Banner */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.headerId}>
            PHIẾU KHẢO SÁT KỸ THUẬT #RDG-{task.id.slice(0, 8).toUpperCase()}
          </Text>
          <View style={[styles.checkinBadge, hasCheckedIn ? styles.checkinDone : styles.checkinMissing]}>
            <Text style={[styles.checkinBadgeText, hasCheckedIn ? styles.checkinDoneText : styles.checkinMissingText]}>
              {hasCheckedIn
                ? `✓ ĐÃ CHECK-IN${typeof task.distanceToReportMeters === 'number' ? ` (${Math.round(task.distanceToReportMeters)}m)` : ''}`
                : '⚠️ CHƯA CHECK-IN'}
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
              onPress={onNavigateToCheckIn}
              style={styles.checkInQuickBtn}
            >
              <Text style={styles.checkInQuickBtnText}>Đi tới màn hình Check-in ➔</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: engineerRadius.md,
    padding: engineerSpacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: engineerColors.borderLight,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: engineerSpacing.sm,
  },
  headerId: {
    flex: 1,
    color: engineerColors.brandPrimary,
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  checkinBadge: {
    flexShrink: 0,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: engineerRadius.xs,
    borderWidth: 1,
  },
  checkinDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: engineerColors.radarGreen,
  },
  checkinMissing: {
    backgroundColor: 'rgba(255, 159, 28, 0.12)',
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
    color: engineerColors.textNavy,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  headerAddress: {
    color: engineerColors.textSecondary,
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
});
