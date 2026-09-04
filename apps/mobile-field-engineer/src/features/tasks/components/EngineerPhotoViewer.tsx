import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon, colors, radius, spacing } from '../../../shared/mobileShared';

type Props = {
  visible: boolean;
  imageUri: string | null;
  title?: string;
  onClose: () => void;
};

export default function EngineerPhotoViewer({ visible, imageUri, title = 'Ảnh hiện trường', onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [photoNaturalSize, setPhotoNaturalSize] = useState({ width: 1, height: 1 });
  const [photoZoom, setPhotoZoom] = useState(1);

  useEffect(() => {
    if (!imageUri) {
      setPhotoNaturalSize({ width: 1, height: 1 });
      return;
    }

    Image.getSize(
      imageUri,
      (imageWidth, imageHeight) => {
        if (imageWidth > 0 && imageHeight > 0) {
          setPhotoNaturalSize({ width: imageWidth, height: imageHeight });
        }
      },
      () => {
        setPhotoNaturalSize({ width: 1, height: 1 });
      },
    );
  }, [imageUri]);

  useEffect(() => {
    if (!visible) {
      setPhotoZoom(1);
    }
  }, [visible]);

  if (!imageUri) {
    return null;
  }

  const viewerMaxWidth = Math.max(220, width - spacing.xl);
  const viewerMaxHeight = Math.max(240, height - Math.max(insets.top, spacing.xl) - 160);
  const aspectRatio = photoNaturalSize.width / photoNaturalSize.height || 1;
  const fittedImageSize = getFittedImageSize(viewerMaxWidth, viewerMaxHeight, aspectRatio);
  const zoomedImageWidth = fittedImageSize.width * photoZoom;
  const zoomedImageHeight = fittedImageSize.height * photoZoom;

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.viewerOverlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Đóng ảnh toàn màn hình" onPress={onClose} style={styles.viewerBackdrop} />

        <SafeAreaView pointerEvents="box-none" style={styles.safeArea}>
          <View style={styles.viewerHeader}>
            <View style={styles.viewerTitleWrap}>
              <Text style={styles.viewerTitle}>{title}</Text>
            </View>

            <View style={styles.viewerControls}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Thu nhỏ ảnh"
                disabled={photoZoom <= 1}
                onPress={() => setPhotoZoom((current) => Math.max(1, Number((current - 0.5).toFixed(2))))}
                style={({ pressed }) => [
                  styles.viewerControlButton,
                  photoZoom <= 1 && styles.viewerControlDisabled,
                  pressed && styles.viewerControlPressed,
                ]}
              >
                <Text style={styles.viewerControlButtonText}>−</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đưa ảnh về kích thước mặc định"
                onPress={() => setPhotoZoom(1)}
                style={({ pressed }) => [styles.viewerZoomBadge, pressed && styles.viewerControlPressed]}
              >
                <Text style={styles.viewerZoomBadgeText}>{Math.round(photoZoom * 100)}%</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Phóng to ảnh"
                disabled={photoZoom >= 3}
                onPress={() => setPhotoZoom((current) => Math.min(3, Number((current + 0.5).toFixed(2))))}
                style={({ pressed }) => [
                  styles.viewerControlButton,
                  photoZoom >= 3 && styles.viewerControlDisabled,
                  pressed && styles.viewerControlPressed,
                ]}
              >
                <Text style={styles.viewerControlButtonText}>+</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng ảnh toàn màn hình"
                onPress={onClose}
                style={({ pressed }) => [styles.viewerCloseButton, pressed && styles.viewerControlPressed]}
              >
                <AppIcon name="close-outline" size={22} color={colors.surface} containerSize={24} />
              </Pressable>
            </View>
          </View>

          <View style={styles.viewerContent}>
            <ScrollView
              style={styles.viewerScroll}
              contentContainerStyle={styles.viewerScrollContent}
              maximumZoomScale={3}
              minimumZoomScale={1}
              bouncesZoom
              centerContent
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            >
              <Image
                source={{ uri: imageUri }}
                style={[
                  styles.viewerImage,
                  {
                    width: zoomedImageWidth,
                    height: zoomedImageHeight,
                  },
                ]}
                resizeMode="contain"
              />
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function getFittedImageSize(maxWidth: number, maxHeight: number, aspectRatio: number) {
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    return {
      width: maxWidth,
      height: maxHeight,
    };
  }

  let width = maxWidth;
  let height = width / aspectRatio;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return { width, height };
}

const styles = StyleSheet.create({
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 8, 19, 0.88)',
  },
  safeArea: {
    flex: 1,
  },
  viewerBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  viewerHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  viewerTitleWrap: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  viewerTitle: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '800',
  },
  viewerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: spacing.sm,
  },
  viewerControlButton: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  viewerControlDisabled: {
    opacity: 0.35,
  },
  viewerControlPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  viewerControlButtonText: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
  },
  viewerZoomBadge: {
    minWidth: 68,
    height: 42,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  viewerZoomBadgeText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '800',
  },
  viewerCloseButton: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  viewerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerScroll: {
    flex: 1,
    width: '100%',
  },
  viewerScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  viewerImage: {
    borderRadius: radius.lg,
  },
});
