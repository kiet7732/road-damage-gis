import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getFieldEngineerUiLabel } from '../../../../../packages/shared-constants/src/engineerLabels';
import { AppButton, AppIcon, EmptyState } from '../../shared/mobileShared';
import { engineerColors, engineerRadius, engineerSpacing } from '../../styles/engineerTheme';

type MapHeaderProps = {
  title: string;
  subtitle: string;
  count?: number;
};

type MapLegendCompactProps = {
  items: Array<{
    key: string;
    label: string;
    color: string;
    count: number;
  }>;
  expanded: boolean;
  onToggle: () => void;
};

type MapSelectionCardProps = {
  title: string;
  statusLabel: string;
  statusColor: string;
  statusBackgroundColor: string;
  statusBorderColor: string;
  address: string;
  hint: string;
  distanceMeters?: number | null;
  primaryAction: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
  };
  secondaryActions: Array<{
    key: string;
    label: string;
    onPress: () => void;
  }>;
  footerMessage?: string | null;
};

export function MapHeader({ title, subtitle, count }: MapHeaderProps) {
  return (
    <View style={styles.headerWrap}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBox}>
            <AppIcon name="radio-outline" size={18} color={engineerColors.brandAccent} containerSize={24} />
          </View>
          <View>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSubtitle}>{subtitle}</Text>
          </View>
        </View>
        {typeof count === 'number' ? (
          <View style={styles.headerCountBadge}>
            <Text style={styles.headerCountNum}>{count}</Text>
            <Text style={styles.headerCountUnit}>ĐIỂM</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function MapLegendCompact({ items, expanded, onToggle }: MapLegendCompactProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.legendWrap}>
      <Pressable onPress={onToggle} style={({ pressed }) => [styles.legendToggle, pressed && styles.pressed]}>
        <View style={styles.legendToggleLeft}>
          <AppIcon name="layers-outline" size={14} color={engineerColors.brandAccent} containerSize={16} />
          <Text style={styles.legendToggleText}>
            {expanded ? 'THU GỌN CHÚ GIẢI' : 'CHÚ GIẢI TRẠNG THÁI'}
          </Text>
        </View>
        <AppIcon name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color="#94A3B8" containerSize={16} />
      </Pressable>

      {expanded ? (
        <View style={styles.legendPanel}>
          <Text style={styles.legendTitle}>PHÂN LOẠI TRẠNG THÁI HIỆN TRƯỜNG</Text>
          {items.map((item) => (
            <View key={item.key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={styles.legendCount}>{item.count}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function MapEmptyOverlay() {
  return (
    <View style={styles.centerOverlay}>
      <View style={styles.stateCard}>
        <EmptyState
          title="KHU VỰC KHÔNG CÓ ĐIỂM HƯ HỎNG"
          description="Hiện không có phản ánh nào cần kiểm tra trong bán kính bản đồ này."
        />
      </View>
    </View>
  );
}

export function MapSelectionCard({
  title,
  statusLabel,
  statusColor,
  statusBackgroundColor,
  statusBorderColor,
  address,
  hint,
  distanceMeters,
  primaryAction,
  secondaryActions,
  footerMessage,
}: MapSelectionCardProps) {
  const isWithinRadius = typeof distanceMeters === 'number' && distanceMeters <= 30;

  return (
    <View style={styles.selectionWrap}>
      <View style={styles.selectionCard}>
        {/* Top header row */}
        <View style={styles.selectionTopRow}>
          <View style={styles.selectionTitleWrap}>
            <View style={styles.tagRow}>
              {typeof distanceMeters === 'number' ? (
                <View
                  style={[
                    styles.distanceBadge,
                    isWithinRadius ? styles.distanceValid : styles.distanceFar,
                  ]}
                >
                  <Text style={[styles.distanceText, isWithinRadius ? styles.distanceTextValid : styles.distanceTextFar]}>
                    🎯 CỰ LY: {Math.round(distanceMeters)}m {isWithinRadius ? '• TRONG BÁN KÍNH' : ''}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text numberOfLines={2} style={styles.selectionTitle}>{title}</Text>
            <Text numberOfLines={1} style={styles.selectionAddress}>📍 {address}</Text>
          </View>

          <View
            style={[
              styles.selectionPill,
              { backgroundColor: statusBackgroundColor, borderColor: statusBorderColor },
            ]}
          >
            <Text style={[styles.selectionPillText, { color: statusColor }]} numberOfLines={1}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Operational Context Hint */}
        <View style={styles.hintBox}>
          <AppIcon name="information-circle-outline" size={14} color={engineerColors.brandAccent} containerSize={16} />
          <Text style={styles.selectionHint}>{hint}</Text>
        </View>

        {/* Tactical Primary Action */}
        <Pressable
          onPress={primaryAction.onPress}
          disabled={primaryAction.disabled || primaryAction.loading}
          style={({ pressed }) => [
            styles.primaryButton,
            (primaryAction.disabled || primaryAction.loading) && styles.btnDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {primaryAction.loading ? 'ĐANG XỬ LÝ...' : primaryAction.label}
          </Text>
        </Pressable>

        {/* Secondary Action Row */}
        <View style={styles.secondaryRow}>
          {secondaryActions.map((action) => (
            <Pressable
              key={action.key}
              onPress={action.onPress}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryButtonText}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        {footerMessage ? <Text style={styles.footerMessage}>{footerMessage}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    backgroundColor: engineerColors.headerBg,
    paddingHorizontal: engineerSpacing.lg,
    paddingVertical: engineerSpacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: engineerColors.headerBorder,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: engineerRadius.xs,
    backgroundColor: engineerColors.headerSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    color: engineerColors.textOnDarkMuted,
    fontSize: 11,
  },
  headerCountBadge: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: engineerRadius.xs,
    backgroundColor: engineerColors.headerSurface,
    borderWidth: 1,
    borderColor: engineerColors.headerBorder,
  },
  headerCountNum: {
    color: engineerColors.brandAccent,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  headerCountUnit: {
    color: engineerColors.textOnDarkMuted,
    fontSize: 8,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.88,
  },
  legendWrap: {
    position: 'absolute',
    top: engineerSpacing.md,
    right: engineerSpacing.md,
    maxWidth: 220,
    zIndex: 20,
  },
  legendToggle: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 10,
    borderRadius: engineerRadius.xs,
    borderWidth: 1,
    borderColor: engineerColors.borderDark,
    backgroundColor: engineerColors.headerBg,
  },
  legendToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendToggleText: {
    color: engineerColors.brandAccent,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  legendPanel: {
    marginTop: 4,
    gap: 4,
    padding: engineerSpacing.sm,
    borderRadius: engineerRadius.xs,
    borderWidth: 1,
    borderColor: engineerColors.borderDark,
    backgroundColor: engineerColors.headerBg,
  },
  legendTitle: {
    color: engineerColors.textOnDarkMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  legendCount: {
    color: engineerColors.brandAccent,
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: engineerSpacing.lg,
  },
  stateCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: engineerRadius.md,
    borderWidth: 1,
    borderColor: engineerColors.borderLight,
    backgroundColor: '#FFFFFF',
    padding: engineerSpacing.md,
  },
  selectionWrap: {
    position: 'absolute',
    left: engineerSpacing.md,
    right: engineerSpacing.md,
    bottom: engineerSpacing.md,
    zIndex: 15,
  },
  selectionCard: {
    gap: 8,
    padding: engineerSpacing.md,
    borderRadius: engineerRadius.lg,
    borderWidth: 1,
    borderColor: engineerColors.borderLight,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 6,
  },
  selectionTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  selectionTitleWrap: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  tagRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  distanceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: engineerRadius.xs,
  },
  distanceValid: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  distanceFar: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  distanceText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  distanceTextValid: {
    color: '#065F46',
  },
  distanceTextFar: {
    color: '#475569',
  },
  selectionTitle: {
    color: engineerColors.textNavy,
    fontSize: 15,
    fontWeight: '900',
  },
  selectionAddress: {
    color: engineerColors.textSecondary,
    fontSize: 12,
  },
  selectionPill: {
    alignSelf: 'flex-start',
    minHeight: 26,
    paddingHorizontal: 8,
    borderRadius: engineerRadius.xs,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionPillText: {
    fontSize: 11,
    fontWeight: '900',
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: engineerRadius.xs,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectionHint: {
    flex: 1,
    color: engineerColors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: engineerRadius.sm,
    backgroundColor: engineerColors.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: engineerRadius.xs,
    borderWidth: 1,
    borderColor: engineerColors.borderMedium,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: engineerColors.textNavy,
    fontSize: 12,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  footerMessage: {
    color: engineerColors.dangerRed,
    fontSize: 11,
    fontWeight: '700',
  },
});
