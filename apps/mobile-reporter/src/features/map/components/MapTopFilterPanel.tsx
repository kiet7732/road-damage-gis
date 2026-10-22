import { Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
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
import {
  STATUS_FILTERS,
  DAMAGE_TYPE_FILTERS,
  type StatusFilterValue,
  type DamageTypeFilterValue,
} from '../constants/mapScreenConstants';

type MapTopFilterPanelProps = {
  isLoadingReports: boolean;
  reportsCount: number;
  matchedTotal?: number;
  topDamageLabel: string | null;
  reportsError: string;
  isFilterOpen: boolean;
  setIsFilterOpen: (fn: (prev: boolean) => boolean) => void;
  onClearSelectedReport: () => void;
  selectedStatus: StatusFilterValue;
  setSelectedStatus: (status: StatusFilterValue) => void;
  selectedDamageType: DamageTypeFilterValue;
  setSelectedDamageType: (damageType: DamageTypeFilterValue) => void;
  onLayout: (event: LayoutChangeEvent) => void;
};

export default function MapTopFilterPanel({
  isLoadingReports,
  reportsCount,
  matchedTotal,
  topDamageLabel,
  reportsError,
  isFilterOpen,
  setIsFilterOpen,
  onClearSelectedReport,
  selectedStatus,
  setSelectedStatus,
  selectedDamageType,
  setSelectedDamageType,
  onLayout,
}: MapTopFilterPanelProps) {
  return (
    <View onLayout={onLayout} style={styles.topPanel}>
      <View style={styles.topPanelHeader}>
        <View style={styles.topPanelTitleWrap}>
          <Text selectable style={styles.title}>
            Bản đồ hư hỏng
          </Text>
          <Text selectable numberOfLines={1} style={styles.subtitle}>
            {isLoadingReports
              ? 'Đang cập nhật dữ liệu bản đồ'
              : `${matchedTotal ?? reportsCount} vị trí trong vùng đang xem`}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isFilterOpen ? 'Thu gọn bộ lọc bản đồ' : 'Mở bộ lọc bản đồ'}
          accessibilityState={{ expanded: isFilterOpen }}
          onPress={() => {
            setIsFilterOpen((currentValue) => !currentValue);
            onClearSelectedReport();
          }}
          style={({ pressed }) => [
            styles.filterToggleButton,
            isFilterOpen && styles.filterToggleButtonActive,
            pressed && styles.filterChipPressed,
          ]}
        >
          <AppIcon
            name={isFilterOpen ? 'close-outline' : 'options-outline'}
            size={18}
            color={isFilterOpen ? colors.surface : colors.primaryDark}
            containerSize={24}
          />
        </Pressable>
      </View>

      {isFilterOpen ? (
        <>
          {!isLoadingReports && !reportsError ? (
            <View style={styles.summaryRow}>
              <View style={styles.summaryChip}>
                <Text selectable style={styles.summaryLabel}>
                  Trong vùng xem
                </Text>
                <Text selectable style={styles.summaryValue}>
                  {matchedTotal ?? reportsCount}
                </Text>
              </View>
              <View style={styles.summaryChip}>
                <Text selectable style={styles.summaryLabel}>
                  Phổ biến
                </Text>
                <Text selectable numberOfLines={1} style={styles.summaryValue}>
                  {topDamageLabel ?? 'Chưa có'}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.filterWrap}>
            <View style={styles.filterBlock}>
              <Text selectable style={styles.filterTitle}>
                Trạng thái
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                {STATUS_FILTERS.map((status) => {
                  const isActive = selectedStatus === status;
                  const label =
                    status === 'all'
                      ? 'Tất cả'
                      : reportStatusTheme[status as ReportStatus].label;

                  return (
                    <Pressable
                      key={status}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                      onPress={() => setSelectedStatus(status)}
                      style={({ pressed }) => [
                        styles.filterChip,
                        isActive && styles.filterChipActive,
                        pressed && styles.filterChipPressed,
                      ]}
                    >
                      <Text
                        selectable={false}
                        style={[styles.filterChipText, isActive && styles.filterChipTextActive]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.filterBlock}>
              <Text selectable style={styles.filterTitle}>
                Loại hư hỏng
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                {DAMAGE_TYPE_FILTERS.map((damageType) => {
                  const isActive = selectedDamageType === damageType;
                  const label =
                    damageType === 'all'
                      ? 'Tất cả'
                      : (getDamageTypeDisplayLabel(damageType) ?? damageType);

                  return (
                    <Pressable
                      key={damageType}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                      onPress={() => setSelectedDamageType(damageType)}
                      style={({ pressed }) => [
                        styles.filterChip,
                        styles.filterChipCompact,
                        isActive && styles.filterChipActive,
                        pressed && styles.filterChipPressed,
                      ]}
                    >
                      {damageType !== 'all' ? (
                        <View
                          style={[
                            styles.filterDot,
                            { backgroundColor: damageTypeTheme[damageType as DamageTypeCode].color },
                          ]}
                        />
                      ) : null}
                      <Text
                        selectable={false}
                        style={[styles.filterChipText, isActive && styles.filterChipTextActive]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  topPanel: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  topPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  topPanelTitleWrap: {
    flex: 1,
    gap: 1,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  filterToggleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterToggleButtonActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 2,
  },
  summaryChip: {
    flex: 1,
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    gap: 1,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  summaryValue: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
  },
  filterWrap: {
    gap: 4,
    marginTop: 2,
  },
  filterBlock: {
    gap: 4,
  },
  filterTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingRight: spacing.lg,
  },
  filterChip: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipCompact: {
    minWidth: 62,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  filterChipPressed: {
    opacity: 0.88,
  },
  filterChipText: {
    color: colors.text,
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '800',
  },
  filterChipTextActive: {
    color: colors.surface,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
