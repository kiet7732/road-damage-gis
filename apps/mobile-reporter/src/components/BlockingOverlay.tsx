import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';

type BlockingOverlayProps = {
  visible: boolean;
  message?: string;
  variant?: 'card' | 'toast';
};

export default function BlockingOverlay({
  visible,
  message = 'Đang xử lý, vui lòng chờ...',
  variant = 'card',
}: BlockingOverlayProps) {
  if (!visible) {
    return null;
  }

  return (
    <View pointerEvents="auto" style={[styles.overlay, variant === 'toast' && styles.toastOverlay]}>
      <View style={[styles.card, variant === 'toast' && styles.toastCard]}>
        <ActivityIndicator
          size={variant === 'toast' ? 'small' : 'large'}
          color={variant === 'toast' ? colors.textOnDark : colors.primary}
        />
        <Text selectable style={[styles.message, variant === 'toast' && styles.toastMessage]}>
          {message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.32)',
  },
  toastOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.12)',
  },
  card: {
    minWidth: 190,
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  toastCard: {
    minWidth: 0,
    maxWidth: 320,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: 'rgba(11, 20, 46, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  message: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  toastMessage: {
    flexShrink: 1,
    color: colors.textOnDark,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'left',
  },
});
