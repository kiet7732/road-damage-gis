import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon, getOrLoadUserLocation, type CachedUserLocation } from '../shared/mobileShared';
import { engineerColors, engineerRadius, engineerSpacing } from '../styles/engineerTheme';

type Props = {
  title?: string;
  subtitle?: string;
  badgeText?: string;
};

export default function FieldTelemetryHeader({
  title = 'TRUNG TÂM ĐIỀU PHỐI HIỆN TRƯỜNG',
  subtitle = 'Hệ thống Quản lý & Thẩm định Hư hỏng Mặt đường',
  badgeText = 'CA TRỰC THỰC ĐỊA',
}: Props) {
  const insets = useSafeAreaInsets();
  const [location, setLocation] = useState<CachedUserLocation | null>(null);

  useEffect(() => {
    let isMounted = true;
    void getOrLoadUserLocation().then((loc) => {
      if (isMounted && loc) {
        setLocation(loc);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, engineerSpacing.md) }]}>
      {/* Top telemetry bar */}
      <View style={styles.telemetryRow}>
        <View style={styles.badgeWrap}>
          <View style={styles.radarDot} />
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>

        <View style={styles.gpsStatusWrap}>
          <AppIcon name="radio-outline" size={14} color={engineerColors.radarGreen} containerSize={16} />
          <Text style={styles.gpsStatusText}>
            {location ? 'GPS: ĐÃ KHÓA' : 'GPS: Đang dò...'}
          </Text>
        </View>
      </View>

      {/* Title & subtitle */}
      <View style={styles.titleWrap}>
        <Text style={styles.mainTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
      </View>

      {/* Coordinate chip if available */}
      {location ? (
        <View style={styles.coordBar}>
          <Text style={styles.coordText}>
            📍 TỌA ĐỘ: {location.latitude.toFixed(5)}°N, {location.longitude.toFixed(5)}°E
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: engineerSpacing.lg,
    paddingTop: engineerSpacing.md,
    paddingBottom: engineerSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  telemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: engineerSpacing.xs,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: engineerRadius.xs,
    backgroundColor: '#EEF5FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  radarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0F52BA',
  },
  badgeText: {
    color: '#0F52BA',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  gpsStatusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: engineerRadius.xs,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  gpsStatusText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  titleWrap: {
    marginVertical: 2,
  },
  mainTitle: {
    color: '#0B132B',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  coordBar: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: engineerRadius.xs,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 3,
    borderLeftColor: '#0F52BA',
  },
  coordText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
});
