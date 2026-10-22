import { StyleSheet, Text, View } from 'react-native';
import { engineerColors, engineerRadius, engineerSpacing } from '../../../styles/engineerTheme';
import type { EngineerTask } from '../../../services/engineerReportService';
import type { LivePositionState } from '../utils/engineerCheckInUtils';

type CheckInCoordinateCompareCardProps = {
  task: EngineerTask;
  livePosition: LivePositionState | null;
  radarColor: string;
};

export default function CheckInCoordinateCompareCard({
  task,
  livePosition,
  radarColor,
}: CheckInCoordinateCompareCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>ĐỐI CHIẾU TỌA ĐỘ HIỆN TRƯỜNG</Text>

      <View style={styles.addressSummaryBox}>
        <Text style={styles.addressFullText} numberOfLines={1} ellipsizeMode="tail">
          📍 {task.formattedAddress || [task.roadName, task.ward, task.district].filter(Boolean).join(' • ') || task.address || 'Đang cập nhật địa chỉ...'}
        </Text>
      </View>

      <View style={styles.coordCompareRow}>
        <View style={styles.coordBox}>
          <Text style={styles.coordBoxLabel}>📍 TÂM ĐIỂM HƯ HỎNG</Text>
          <Text style={styles.coordBoxValue}>
            {task.gps.latitude.toFixed(6)}, {task.gps.longitude.toFixed(6)}
          </Text>
          <Text style={styles.coordSub}>Sai số lúc chụp: ±{Math.round(task.gps.accuracy || 0)}m</Text>
        </View>

        <View style={styles.coordBox}>
          <Text style={styles.coordBoxLabel}>📱 VỊ TRÍ KỸ SƯ (GPS)</Text>
          <Text style={[styles.coordBoxValue, { color: radarColor }]}>
            {livePosition
              ? `${livePosition.latitude.toFixed(6)}, ${livePosition.longitude.toFixed(6)}`
              : 'Đang lấy...'}
          </Text>
          <Text style={styles.coordSub}>
            Độ chính xác: {livePosition ? `±${Math.round(livePosition.accuracy)}m` : 'N/A'}
          </Text>
        </View>
      </View>

      {livePosition?.warningText ? (
        <View style={[styles.noticeBox, styles.noticeDanger]}>
          <Text style={styles.noticeTitle}>VỊ TRÍ CHƯA HỢP LỆ (YÊU CẦU ≤ 30M)</Text>
          <Text style={styles.noticeText}>{livePosition.warningText}</Text>
        </View>
      ) : null}
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
  },
  sectionTitle: {
    color: engineerColors.textNavy,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  addressSummaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: engineerRadius.xs,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    gap: 4,
  },
  addressFullText: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  coordCompareRow: {
    gap: 8,
  },
  coordBox: {
    padding: 8,
    borderRadius: engineerRadius.xs,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 2,
  },
  coordBoxLabel: {
    color: engineerColors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  coordBoxValue: {
    color: engineerColors.textNavy,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  coordSub: {
    color: engineerColors.textMuted,
    fontSize: 10,
  },
  noticeBox: {
    padding: 10,
    borderRadius: engineerRadius.xs,
    borderWidth: 1,
    gap: 2,
  },
  noticeDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  noticeTitle: {
    color: '#92400E',
    fontSize: 11,
    fontWeight: '900',
  },
  noticeText: {
    color: '#78350F',
    fontSize: 11,
    lineHeight: 15,
  },
});
