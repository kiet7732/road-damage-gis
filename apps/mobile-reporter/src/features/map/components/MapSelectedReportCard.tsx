import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import AppButton from '../../../components/AppButton';
import AppIcon from '../../../components/AppIcon';
import {
  colors,
  damageTypeTheme,
  radius,
  reportStatusTheme,
  spacing,
  type DamageTypeCode,
  type ReportStatus,
} from '../../../constants/theme';
import { getDamageTypeDisplayLabel } from '../../../services/reportService';
import type { Report } from '../../../types/roadDamage';

type MapSelectedReportCardProps = {
  selectedReport: Report;
  onClose: () => void;
  onOpenDetail: (reportId: string) => void;
  bottomOffset: number;
};

export default function MapSelectedReportCard({
  selectedReport,
  onClose,
  onOpenDetail,
  bottomOffset,
}: MapSelectedReportCardProps) {
  const selectedReportStatusTheme =
    reportStatusTheme[selectedReport.status as ReportStatus] ?? reportStatusTheme.pending;
  const selectedReportDamageTheme =
    damageTypeTheme[selectedReport.type as DamageTypeCode] ?? damageTypeTheme.D40;

  const selectedReportConfidence = useMemo(() => {
    if (
      selectedReport == null ||
      typeof selectedReport.confidence !== 'number' ||
      !Number.isFinite(selectedReport.confidence)
    ) {
      return null;
    }

    return Math.round(selectedReport.confidence * 100);
  }, [selectedReport]);

  return (
    <View style={[styles.selectedReportCardWrap, { bottom: bottomOffset }]}>
      <View style={styles.selectedReportCard}>
        <View style={styles.selectedReportHeader}>
          <View style={styles.selectedReportRow}>
            <View
              style={[
                styles.selectedReportBadge,
                {
                  backgroundColor: selectedReportDamageTheme.backgroundColor,
                  borderColor: selectedReportDamageTheme.color,
                },
              ]}
            >
              <Text
                selectable
                numberOfLines={1}
                style={[styles.selectedReportBadgeText, { color: selectedReportDamageTheme.color }]}
              >
                {getDamageTypeDisplayLabel(selectedReport.type) ?? selectedReport.type}
              </Text>
            </View>

            <View
              style={[
                styles.selectedReportStatusBadge,
                {
                  backgroundColor: selectedReportStatusTheme.backgroundColor,
                  borderColor: selectedReportStatusTheme.borderColor,
                },
              ]}
            >
              <Text
                selectable
                numberOfLines={1}
                style={[styles.selectedReportStatusText, { color: selectedReportStatusTheme.color }]}
              >
                {selectedReportStatusTheme.label}
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng thông tin vị trí hư hỏng"
            onPress={onClose}
            style={({ pressed }) => [styles.selectedReportCloseButton, pressed && styles.filterChipPressed]}
          >
            <AppIcon name="close-outline" size={16} color={colors.textMuted} containerSize={20} />
          </Pressable>
        </View>

        <View style={styles.selectedReportBodyHorizontal}>
          {selectedReport.photoUri ? (
            <Image
              source={{ uri: selectedReport.photoUri }}
              style={styles.selectedReportThumbnail}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.selectedReportThumbnailPlaceholder,
                { backgroundColor: selectedReportDamageTheme.backgroundColor },
              ]}
            >
              <AppIcon
                name="warning-outline"
                size={24}
                color={selectedReportDamageTheme.color}
                containerSize={32}
              />
            </View>
          )}

          <View style={styles.selectedReportInfo}>
            <Text selectable numberOfLines={2} style={styles.selectedReportTitle}>
              {selectedReport.title}
            </Text>

            <Text selectable numberOfLines={1} ellipsizeMode="tail" style={styles.selectedReportCoordinates}>
              📍 {selectedReport.formattedAddress ||
                selectedReport.address ||
                selectedReport.roadName ||
                `${selectedReport.gps.latitude.toFixed(6)}, ${selectedReport.gps.longitude.toFixed(6)}`}
            </Text>

            <Text selectable numberOfLines={1} style={styles.selectedReportMeta}>
              {selectedReport.createdAt}
              {selectedReportConfidence != null ? ` • AI: ${selectedReportConfidence}%` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.selectedReportActions}>
          <AppButton
            label="Xem chi tiết phản ánh"
            accessibilityLabel="Xem chi tiết phản ánh"
            onPress={() => onOpenDetail(selectedReport.id)}
            style={styles.selectedReportPrimaryButton}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  selectedReportCardWrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
  },
  selectedReportCard: {
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
  },
  selectedReportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  selectedReportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  selectedReportBadge: {
    minHeight: 24,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedReportBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  selectedReportStatusBadge: {
    minHeight: 24,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedReportStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  selectedReportCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipPressed: {
    opacity: 0.88,
  },
  selectedReportBodyHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  selectedReportThumbnail: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  selectedReportThumbnailPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedReportInfo: {
    flex: 1,
    gap: 3,
  },
  selectedReportTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  selectedReportCoordinates: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  selectedReportMeta: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  selectedReportActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  selectedReportPrimaryButton: {
    flex: 1,
    minHeight: 38,
  },
});
