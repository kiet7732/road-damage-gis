import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { engineerColors, engineerRadius, engineerSpacing } from '../../../styles/engineerTheme';
import type { LivePositionState } from '../utils/engineerCheckInUtils';

type CheckInRadarCardProps = {
  livePosition: LivePositionState | null;
  isRefreshingLocation: boolean;
  radarColor: string;
};

export default function CheckInRadarCard({
  livePosition,
  isRefreshingLocation,
  radarColor,
}: CheckInRadarCardProps) {
  return (
    <View style={styles.radarCard}>
      <View style={styles.radarTopRow}>
        <Text style={styles.radarTitle}>MÁY ĐO CỰ LY THỰC ĐỊA</Text>
        <View style={[styles.radarStatusPill, { borderColor: radarColor }]}>
          <View style={[styles.radarStatusDot, { backgroundColor: radarColor }]} />
          <Text style={[styles.radarStatusText, { color: radarColor }]}>
            {livePosition ? (livePosition.isMocked ? 'MOCKED GPS' : livePosition.quality.toUpperCase()) : 'SEARCHING'}
          </Text>
        </View>
      </View>

      {/* Concentric Radar Rings */}
      <View style={styles.radarCircleContainer}>
        <View style={[styles.radarRingOuter, { borderColor: `${radarColor}33` }]}>
          <View style={[styles.radarRingMid, { borderColor: `${radarColor}66` }]}>
            <View style={[styles.radarRingInner, { backgroundColor: `${radarColor}15`, borderColor: radarColor }]}>
              {isRefreshingLocation ? (
                <ActivityIndicator color={radarColor} size="small" />
              ) : (
                <>
                  <Text style={[styles.radarDistNum, { color: radarColor }]}>
                    {livePosition ? Math.round(livePosition.distanceMeters) : '--'}
                  </Text>
                  <Text style={styles.radarDistUnit}>MÉT</Text>
                </>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Distance Readout Hint */}
      <Text style={[styles.radarHint, { color: radarColor }]}>
        {!livePosition
          ? 'Đang khóa tín hiệu vệ tinh GPS...'
          : livePosition.isMocked
            ? '⛔ PHÁT HIỆN ĐỊNH VỊ GIẢ LẬP (MOCK LOCATION)'
            : livePosition.quality === 'valid'
              ? '🎯 ĐÃ TRONG BÁN KÍNH HỢP LỆ (≤ 30M)'
              : `⛔ NGOÀI BÁN KÍNH CHO PHÉP (${Math.round(livePosition.distanceMeters)}M > 30M)`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  radarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: engineerRadius.lg,
    padding: engineerSpacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
    gap: 12,
  },
  radarTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  radarTitle: {
    color: '#0B132B',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  radarStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: engineerRadius.xs,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
  },
  radarStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  radarStatusText: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  radarCircleContainer: {
    marginVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarRingOuter: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarRingMid: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarRingInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarDistNum: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'monospace',
    lineHeight: 32,
  },
  radarDistUnit: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  radarHint: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
