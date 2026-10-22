import { StyleSheet, View } from 'react-native';

export default function FocusFrame() {
  return (
    <View pointerEvents="none" style={styles.frame}>
      <View style={styles.cornerTopLeft} />
      <View style={styles.cornerTopRight} />
      <View style={styles.cornerBottomLeft} />
      <View style={styles.cornerBottomRight} />
    </View>
  );
}

const cornerLength = 28;
const cornerThickness = 2.5;
const cornerColor = 'rgba(255, 255, 255, 0.75)';

const styles = StyleSheet.create({
  frame: {
    alignSelf: 'center',
    width: '100%',
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: cornerLength,
    height: cornerLength,
    borderTopWidth: cornerThickness,
    borderLeftWidth: cornerThickness,
    borderColor: cornerColor,
    borderTopLeftRadius: 6,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: cornerLength,
    height: cornerLength,
    borderTopWidth: cornerThickness,
    borderRightWidth: cornerThickness,
    borderColor: cornerColor,
    borderTopRightRadius: 6,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: cornerLength,
    height: cornerLength,
    borderBottomWidth: cornerThickness,
    borderLeftWidth: cornerThickness,
    borderColor: cornerColor,
    borderBottomLeftRadius: 6,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: cornerLength,
    height: cornerLength,
    borderBottomWidth: cornerThickness,
    borderRightWidth: cornerThickness,
    borderColor: cornerColor,
    borderBottomRightRadius: 6,
  },
});
