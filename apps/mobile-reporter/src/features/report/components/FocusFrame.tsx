import { StyleSheet, View } from 'react-native';
import { colors } from '../../../constants/theme';

export default function FocusFrame() {
  return (
    <View style={styles.frame}>
      <View style={styles.cornerTopLeft} />
      <View style={styles.cornerTopRight} />
      <View style={styles.cornerBottomLeft} />
      <View style={styles.cornerBottomRight} />
    </View>
  );
}

const cornerBase = {
  position: 'absolute' as const,
  width: 28,
  height: 28,
  borderColor: '#FF8A3D',
  borderRadius: 2,
};

const styles = StyleSheet.create({
  frame: {
    alignSelf: 'center',
    width: '100%',
    flex: 1,
    position: 'relative',
  },
  cornerTopLeft: {
    ...cornerBase,
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTopRight: {
    ...cornerBase,
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBottomLeft: {
    ...cornerBase,
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBottomRight: {
    ...cornerBase,
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
});
