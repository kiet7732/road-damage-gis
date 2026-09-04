import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
    <View style={styles.container}>
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
    backgroundColor: engineerColors.headerBg,
    paddingHorizontal: engineerSpacing.lg,
    paddingTop: engineerSpacing.md,
    paddingBottom: engineerSpacing.md,
    borderBottomWidth: 2,
    borderBottomColor: engineerColors.headerBorder,
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
    backgroundColor: 'rgba(255, 159, 28, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 28, 0.4)',
  },
  radarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: engineerColors.safetyOrange,
  },
  badgeText: {
    color: engineerColors.safetyOrange,
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
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  gpsStatusText: {
    color: engineerColors.radarGreen,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  titleWrap: {
    marginVertical: 2,
  },
  mainTitle: {
    color: engineerColors.textOnDark,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: engineerColors.textOnDarkMuted,
    fontSize: 12,
    marginTop: 2,
  },
  coordBar: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: engineerRadius.xs,
    backgroundColor: engineerColors.headerSurface,
    borderLeftWidth: 3,
    borderLeftColor: engineerColors.brandAccent,
  },
  coordText: {
    color: engineerColors.brandAccent,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
});
