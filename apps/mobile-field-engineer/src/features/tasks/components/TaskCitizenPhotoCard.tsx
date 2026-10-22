import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../../../shared/mobileShared';
import { engineerColors, engineerRadius } from '../../../styles/engineerTheme';

type TaskCitizenPhotoCardProps = {
  photoUri?: string | null;
  onPress: () => void;
};

export default function TaskCitizenPhotoCard({ photoUri, onPress }: TaskCitizenPhotoCardProps) {
  if (!photoUri) return null;

  return (
    <View style={styles.photoContainer}>
      <Text style={styles.sectionTitleOnBg}>HÌNH ẢNH CÔNG DÂN PHẢN ÁNH</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Xem ảnh phóng to"
        onPress={onPress}
        style={({ pressed }) => [styles.photoButton, pressed && styles.photoButtonPressed]}
      >
        <Image
          source={{ uri: photoUri }}
          style={StyleSheet.absoluteFillObject}
          blurRadius={20}
          resizeMode="cover"
        />
        <View style={styles.photoBackdropOverlay} />
        <Image source={{ uri: photoUri }} style={styles.image} resizeMode="contain" />
        <View style={styles.photoHint}>
          <AppIcon name="scan-outline" size={14} color="#FFFFFF" containerSize={16} />
          <Text style={styles.photoHintText}>Bấm để mở chế độ soi ảnh & Bounding Box AI</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  photoContainer: {
    marginTop: 2,
  },
  sectionTitleOnBg: {
    color: engineerColors.textNavy,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  photoButton: {
    position: 'relative',
    height: 320,
    borderRadius: engineerRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: engineerColors.borderMedium,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButtonPressed: {
    opacity: 0.9,
  },
  photoBackdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  photoHint: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(11, 19, 43, 0.85)',
  },
  photoHintText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
