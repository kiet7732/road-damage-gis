import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../theme';

type SkeletonBlockProps = {
  width?: ViewStyle['width'];
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export function SkeletonBlock({
  width = '100%',
  height = 18,
  borderRadius = radius.sm,
  style,
}: SkeletonBlockProps) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 720,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 720,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.block,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function ReportCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <SkeletonBlock width="58%" height={18} />
        <SkeletonBlock width={96} height={28} borderRadius={radius.full} />
      </View>
      <SkeletonBlock width="92%" height={14} />
      <SkeletonBlock width="48%" height={13} />
    </View>
  );
}

export function KpiSkeletonGrid() {
  return (
    <View style={styles.grid}>
      {[0, 1, 2, 3].map((item) => (
        <View key={item} style={styles.kpiCard}>
          <SkeletonBlock width={14} height={14} borderRadius={radius.full} />
          <SkeletonBlock width="44%" height={18} />
          <SkeletonBlock width="72%" height={13} />
          <SkeletonBlock width="32%" height={28} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: '#D9E2EF',
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  kpiCard: {
    width: '47%',
    minHeight: 132,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
