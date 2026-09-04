import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

type StateMessageProps = {
  title: string;
  description?: string;
  loading?: boolean;
  tone?: 'default' | 'error';
};

export default function StateMessage({
  title,
  description,
  loading = false,
  tone = 'default',
}: StateMessageProps) {
  return (
    <View style={styles.container}>
      {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
      <Text
        selectable
        style={[styles.title, tone === 'error' && styles.errorTitle]}
      >
        {title}
      </Text>
      {description ? (
        <Text selectable style={styles.description}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  errorTitle: {
    color: colors.danger,
  },
  description: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
