import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import AppButton from '../../../components/AppButton';
import AppIcon from '../../../components/AppIcon';
import { colors, iconSize, radius, spacing } from '../../../constants/theme';

type MapStatusOverlaysProps = {
  overlayTop: number;
  bottomOverlayOffset: number;
  isLoadingReports: boolean;
  reportsError: string;
  onRetryReports: () => void;
  matchedTotal?: number;
  reportsCount: number;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  locationError: string;
  isLoadingLocation: boolean;
  hasSelectedReport: boolean;
  onFocusCurrentLocation: () => void;
};

export default function MapStatusOverlays({
  overlayTop,
  bottomOverlayOffset,
  isLoadingReports,
  reportsError,
  onRetryReports,
  matchedTotal,
  reportsCount,
  hasActiveFilters,
  onClearFilters,
  locationError,
  isLoadingLocation,
  hasSelectedReport,
  onFocusCurrentLocation,
}: MapStatusOverlaysProps) {
  const totalReports = matchedTotal ?? reportsCount;

  return (
    <>
      {isLoadingReports ? (
        <View style={[styles.loadingCard, { top: overlayTop }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text selectable numberOfLines={1} style={styles.loadingText}>
            Đang tải bản đồ...
          </Text>
        </View>
      ) : null}

      {!isLoadingReports && reportsError ? (
        <View style={[styles.stateCard, { top: overlayTop }]}>
          <View style={styles.compactErrorCard}>
            <View style={styles.compactErrorTextWrap}>
              <Text selectable numberOfLines={1} style={styles.compactErrorTitle}>
                Không tải được bản đồ
              </Text>
              <Text selectable numberOfLines={2} style={styles.compactErrorDescription}>
                {reportsError}
              </Text>
            </View>
            <AppButton
              label="Tải lại"
              accessibilityLabel="Tải lại dữ liệu bản đồ"
              onPress={onRetryReports}
              style={styles.compactRetryButton}
            />
          </View>
        </View>
      ) : null}

      {!isLoadingReports && !reportsError && totalReports === 0 ? (
        <View style={[styles.stateCard, styles.stateBannerWrap, { top: overlayTop }]}>
          <View style={styles.compactEmptyBanner}>
            <Text selectable numberOfLines={1} style={styles.compactEmptyBannerTitle}>
              Chưa có vị trí hư hỏng
            </Text>
            <Text selectable numberOfLines={2} style={styles.compactEmptyBannerDescription}>
              Trong khu vực này hiện chưa có điểm nào cần xử lý.
            </Text>
          </View>
        </View>
      ) : null}

      {!isLoadingReports && !reportsError && totalReports > 0 && reportsCount === 0 ? (
        <View style={[styles.stateCard, styles.stateBannerWrap, { top: overlayTop }]}>
          <View style={styles.compactEmptyBanner}>
            <Text selectable numberOfLines={1} style={styles.compactEmptyBannerTitle}>
              Không có vị trí phù hợp
            </Text>
            <Text selectable numberOfLines={2} style={styles.compactEmptyBannerDescription}>
              Không có vị trí nào phù hợp với bộ lọc trong khu vực bạn đang xem.
            </Text>
            {hasActiveFilters ? (
              <AppButton
                label="Xóa bộ lọc"
                accessibilityLabel="Xóa bộ lọc bản đồ"
                onPress={onClearFilters}
                style={styles.compactRetryButton}
              />
            ) : null}
          </View>
        </View>
      ) : null}

      {locationError ? (
        <View
          style={[
            styles.locationErrorCard,
            { bottom: hasSelectedReport ? bottomOverlayOffset + 252 : bottomOverlayOffset + 62 },
          ]}
        >
          <AppIcon name="warning-outline" size={iconSize.inline} color={colors.danger} containerSize={24} />
          <Text selectable style={styles.locationErrorText}>
            {locationError}
          </Text>
          <AppButton
            label="Bật vị trí"
            onPress={onFocusCurrentLocation}
            style={styles.locationRetryButton}
          />
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đưa bản đồ về vị trí hiện tại"
        disabled={isLoadingLocation}
        hitSlop={10}
        style={({ pressed }) => [
          styles.fab,
          { bottom: hasSelectedReport ? bottomOverlayOffset + 188 : bottomOverlayOffset },
          pressed && styles.fabPressed,
          isLoadingLocation && styles.fabDisabled,
        ]}
        onPress={onFocusCurrentLocation}
      >
        {isLoadingLocation ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <AppIcon
            name={locationError ? 'refresh-outline' : 'locate'}
            size={iconSize.nav}
            color={colors.surface}
            containerSize={32}
          />
        )}
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  loadingCard: {
    position: 'absolute',
    left: spacing.lg,
    maxWidth: 172,
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingText: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  stateCard: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.xl * 2,
    maxWidth: 216,
  },
  compactErrorCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },
  compactErrorTextWrap: {
    gap: 2,
  },
  compactErrorTitle: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '900',
  },
  compactErrorDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  compactRetryButton: {
    minHeight: 38,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
  },
  stateBannerWrap: {
    maxWidth: 208,
  },
  compactEmptyBanner: {
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  compactEmptyBannerTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  compactEmptyBannerDescription: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
  },
  locationErrorCard: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  locationErrorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  locationRetryButton: {
    minHeight: 34,
    paddingHorizontal: spacing.sm,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 10,
    zIndex: 9999,
  },
  fabPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.96 }],
  },
  fabDisabled: {
    opacity: 0.72,
  },
});
