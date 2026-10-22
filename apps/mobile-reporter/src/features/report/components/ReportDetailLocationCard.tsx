import { Pressable, StyleSheet, Text, View } from 'react-native';
import AppIcon from '../../../components/AppIcon';
import InfoCard from '../../../components/InfoCard';
import { colors, iconSize, radius, spacing } from '../../../constants/theme';
import { getLocationSourceLabel } from '../../../services/reportService';
import type { ReportDetail } from '../../../types/roadDamage';

type ReportDetailLocationCardProps = {
  report: ReportDetail;
  copiedAddressToast: boolean;
  onCopyAddress: () => void;
  onOpenNavigation: () => void;
};

export default function ReportDetailLocationCard({
  report,
  copiedAddressToast,
  onCopyAddress,
  onOpenNavigation,
}: ReportDetailLocationCardProps) {
  return (
    <InfoCard>
      <Text selectable style={styles.sectionTitle}>
        Địa chỉ & Vị trí
      </Text>

      {report.isAddressPending || (!report.formattedAddress && !report.roadName) ? (
        <View style={styles.pendingAddressBanner} testID="report-detail-address-pending">
          <View style={styles.pendingBannerHeader}>
            <AppIcon name="time-outline" size={iconSize.md} color={colors.warning} containerSize={24} />
            <Text selectable style={styles.pendingBannerTitle}>
              Đang xác định địa chỉ hành chính...
            </Text>
          </View>
          <Text selectable style={styles.pendingBannerSubtitle}>
            Hệ thống đang xử lý phân cấp địa chỉ ngầm. Kéo xuống để làm mới sau vài giây.
          </Text>
        </View>
      ) : (
        <View style={styles.addressBox} testID="report-detail-address-box">
          <View style={styles.addressBoxHeader}>
            <AppIcon name="location" size={iconSize.md} color={colors.primary} containerSize={24} />
            <Text selectable style={styles.addressPrimaryText}>
              {report.formattedAddress || report.address}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.locationActionButtonsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sao chép địa chỉ"
          onPress={onCopyAddress}
          style={({ pressed }) => [
            styles.locationActionButton,
            pressed && styles.locationActionButtonPressed,
          ]}
          testID="report-detail-copy-address"
        >
          <AppIcon
            name={copiedAddressToast ? 'checkmark-circle-outline' : 'copy-outline'}
            size={iconSize.sm}
            color={copiedAddressToast ? colors.success : colors.primary}
            containerSize={18}
          />
          <Text
            selectable={false}
            style={[
              styles.locationActionButtonText,
              copiedAddressToast && { color: colors.success },
            ]}
          >
            {copiedAddressToast ? 'Đã sao chép!' : 'Sao chép địa chỉ'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mở Google Maps điều hướng"
          onPress={onOpenNavigation}
          style={({ pressed }) => [
            styles.locationActionButton,
            styles.navigationButton,
            pressed && styles.locationActionButtonPressed,
          ]}
          testID="report-detail-open-maps"
        >
          <AppIcon
            name="navigate-outline"
            size={iconSize.sm}
            color={colors.surface}
            containerSize={18}
          />
          <Text selectable={false} style={styles.navigationButtonText}>
            Chỉ đường (Maps)
          </Text>
        </Pressable>
      </View>

      <View style={styles.gpsDivider} />

      <Text selectable style={styles.gpsCoordText}>
        Tọa độ GPS: {report.gps.latitude.toFixed(6)}, {report.gps.longitude.toFixed(6)}
      </Text>
      <Text selectable style={styles.meta}>
        Độ chính xác vị trí: ±{Math.round(report.gps.accuracy || 0)}m
      </Text>
      <Text selectable style={styles.meta}>
        Nguồn vị trí: {getLocationSourceLabel(report.gps.source)}
      </Text>
      <Text selectable style={styles.meta}>
        Thời gian lấy vị trí: {report.gps.capturedAt && !Number.isNaN(new Date(report.gps.capturedAt).getTime()) ? new Date(report.gps.capturedAt).toLocaleString('vi-VN') : 'Chưa có thông tin'}
      </Text>
    </InfoCard>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  pendingAddressBanner: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: spacing.xs,
  },
  pendingBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pendingBannerTitle: {
    color: '#B45309',
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  pendingBannerSubtitle: {
    color: '#92400E',
    fontSize: 12,
    lineHeight: 16,
  },
  addressBox: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  addressBoxHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  addressPrimaryText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    flex: 1,
  },
  locationActionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  locationActionButton: {
    flex: 1,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationActionButtonPressed: {
    opacity: 0.8,
  },
  locationActionButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  navigationButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  navigationButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '700',
  },
  gpsDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  gpsCoordText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});
