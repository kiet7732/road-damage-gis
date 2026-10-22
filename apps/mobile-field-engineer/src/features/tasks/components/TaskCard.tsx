import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getFieldWorkflowStatus } from '../../../../../../packages/shared-constants/src/engineerLabels';
import { getRoadDamageTypeOption } from '../../../../../../packages/shared-constants/src/fieldDomainMetadata';
import { AppIcon } from '../../../shared/mobileShared';
import {
  getEngineerTaskSemanticMeta,
  openExternalNavigation,
  type EngineerTask,
  type EngineerTaskScope,
} from '../../../services/engineerReportService';
import { engineerColors, engineerRadius, engineerSpacing } from '../../../styles/engineerTheme';

type TaskCardProps = {
  task: EngineerTask;
  onPress: (task: EngineerTask) => void;
  onClaim?: (task: EngineerTask) => void;
  scope?: EngineerTaskScope;
};

export default function TaskCard({ task, onPress, onClaim, scope = 'available' }: TaskCardProps) {
  const workflow = getFieldWorkflowStatus(task.fieldStatus);
  const semantic = getEngineerTaskSemanticMeta(task, scope);
  const isClaimable = task.canClaim;
  const damageMeta = getRoadDamageTypeOption(task.type || '');

  // Determine prominent location components
  const hasRoadName = Boolean(task.roadName && task.roadName.trim());
  const roadTitle = hasRoadName ? task.roadName!.trim() : task.title || 'Điểm khảo sát thực địa';
  
  // Format administrative area (Phường/Xã, Quận/Huyện)
  const formatWard = (ward?: string | null): string | null => {
    if (!ward || !ward.trim()) return null;
    const clean = ward.trim();
    if (/^(phường|xã|thị trấn|tt\.|p\.)\s+/i.test(clean)) {
      return clean;
    }
    return `Phường ${clean}`;
  };

  const wardPart = formatWard(task.ward);
  const districtPart = task.district?.trim() || null;
  const adminAreaText = [wardPart, districtPart].filter(Boolean).join(' • ');

  const handleNavigate = (e: any) => {
    e?.stopPropagation?.();
    void openExternalNavigation({
      address: task.formattedAddress || task.address,
      latitude: task.gps.latitude,
      longitude: task.gps.longitude,
      label: task.roadName || task.title,
    });
  };

  return (
    <Pressable
      onPress={() => onPress(task)}
      style={({ pressed }) => [
        styles.card,
        { borderLeftColor: workflow?.color || engineerColors.brandPrimary },
        pressed && styles.cardPressed,
      ]}
    >
      {/* Top Meta Row: ID & Status Badge */}
      <View style={styles.topRow}>
        <View style={styles.idBadge}>
          <Text style={styles.idText}>#RDG-{task.id.slice(0, 6).toUpperCase()}</Text>
        </View>

        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: workflow?.backgroundColor || '#EEF5FF',
              borderColor: workflow?.borderColor || '#B8D5FF',
            },
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: workflow?.color || engineerColors.brandPrimary }]} />
          <Text style={[styles.statusPillText, { color: workflow?.color || engineerColors.brandPrimary }]}>
            {workflow?.shortLabel || task.fieldStatusLabel}
          </Text>
        </View>
      </View>

      {/* Primary Location Section (1 dòng địa chỉ duy nhất) */}
      <View style={styles.locationSection}>
        <View style={styles.roadHeaderRow}>
          <AppIcon
            name="location"
            size={16}
            color={engineerColors.brandPrimary}
            containerSize={18}
          />
          <Text style={styles.roadTitleText} numberOfLines={1} ellipsizeMode="tail">
            {task.formattedAddress || task.address || [roadTitle, adminAreaText].filter(Boolean).join(' • ')}
          </Text>
        </View>

        {task.isAddressPending && !hasRoadName ? (
          <View style={styles.pendingBadge}>
            <AppIcon
              name="time-outline"
              size={12}
              color={engineerColors.safetyAmber}
              containerSize={14}
            />
            <Text style={styles.pendingText}>Đang xác định địa chỉ...</Text>
          </View>
        ) : null}
      </View>

      {/* Middle Meta: Damage Type & Timestamp */}
      <View style={styles.metaRow}>
        <View style={styles.damageChip}>
          <Text style={styles.damageChipText}>
            {task.type ? `${task.type} - ${damageMeta?.label || 'Hư hỏng mặt đường'}` : 'CHƯA PHÂN LOẠI'}
          </Text>
        </View>

        <Text style={styles.timestampText}>
          ⏱ {semantic.timestampLabel}: {semantic.timestampValue}
        </Text>
      </View>

      {/* Card Action Row: External Navigation (AC-02) & Claim/Detail */}
      <View style={styles.actionRow}>
        <Pressable
          onPress={handleNavigate}
          style={({ pressed }) => [styles.navBtn, pressed && styles.btnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Chỉ đường đến địa chỉ này"
        >
          <AppIcon
            name="navigate-outline"
            size={14}
            color={engineerColors.brandPrimary}
            containerSize={16}
          />
          <Text style={styles.navBtnText}>Chỉ đường</Text>
        </Pressable>

        {isClaimable && onClaim ? (
          <Pressable
            onPress={(e) => {
              e?.stopPropagation?.();
              onClaim(task);
            }}
            style={({ pressed }) => [styles.claimBtn, pressed && styles.btnPressed]}
          >
            <Text style={styles.claimBtnText}>TIẾP NHẬN NGAY</Text>
          </Pressable>
        ) : (
          <View style={styles.viewDetailWrap}>
            <Text style={styles.viewDetailText}>Chi tiết hồ sơ</Text>
            <AppIcon
              name="chevron-forward"
              size={13}
              color={engineerColors.textMuted}
              containerSize={14}
            />
          </View>
        )}
      </View>

      {/* Claim Prompt Banner if Available */}
      {isClaimable && !onClaim ? (
        <View style={styles.claimPromptBar}>
          <Text style={styles.claimPromptText}>⚡ Đang khả dụng để tiếp nhận kiểm tra ngay</Text>
          <AppIcon name="chevron-forward" size={14} color={engineerColors.safetyOrange} containerSize={16} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: engineerRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    padding: engineerSpacing.md,
    marginBottom: engineerSpacing.md,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
    gap: engineerSpacing.sm,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  idBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: engineerRadius.xs,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  idText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: engineerRadius.full,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  locationSection: {
    gap: 2,
  },
  roadHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roadTitleText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    color: '#0B132B',
    letterSpacing: 0.1,
  },
  adminAreaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 2,
  },
  adminAreaText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#475569',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: engineerRadius.xs,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  pendingText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: engineerColors.safetyAmber,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  damageChip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: engineerRadius.xs,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  damageChipText: {
    color: '#1E293B',
    fontSize: 11,
    fontWeight: '700',
  },
  timestampText: {
    color: '#64748B',
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: engineerSpacing.xs,
    marginTop: 2,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: engineerRadius.xs,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  navBtnText: {
    color: engineerColors.brandPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  claimBtn: {
    backgroundColor: engineerColors.brandPrimary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: engineerRadius.xs,
  },
  claimBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  viewDetailWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDetailText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  claimPromptBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: engineerRadius.xs,
    paddingHorizontal: engineerSpacing.sm,
    paddingVertical: 4,
    marginTop: 2,
  },
  claimPromptText: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '700',
  },
});
