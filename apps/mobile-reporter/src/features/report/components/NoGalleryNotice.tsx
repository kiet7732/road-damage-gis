import { StyleSheet, Text, View } from 'react-native';
import AppIcon from '../../../components/AppIcon';
import { colors, spacing } from '../../../constants/theme';

export default function NoGalleryNotice() {
  return (
    <View style={styles.notice}>
      <AppIcon name="ban-outline" size={16} color={colors.danger} containerSize={18} />
      <Text selectable style={styles.text}>Chỉ chụp trực tiếp bằng camera</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 92, 119, 0.08)',
  },
  text: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '800',
  },
});
