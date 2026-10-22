import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../../../components/AppIcon';
import { colors, radius, spacing } from '../../../constants/theme';

type CapturedPhotoPreviewProps = {
  photoUri: string;
  height?: number;
  predictionLabel?: string | null;
};

export default function CapturedPhotoPreview({
  photoUri,
  height = 320,
  predictionLabel,
}: CapturedPhotoPreviewProps) {
  const insets = useSafeAreaInsets();
  const { width, height: screenHeight } = useWindowDimensions();
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [photoZoom, setPhotoZoom] = useState(1);
  const [photoNaturalSize, setPhotoNaturalSize] = useState({ width: 3, height: 4 });

  useEffect(() => {
    if (!photoUri) return;
    Image.getSize(
      photoUri,
      (imgWidth, imgHeight) => {
        if (imgWidth > 0 && imgHeight > 0) {
          setPhotoNaturalSize({ width: imgWidth, height: imgHeight });
        }
      },
      () => {},
    );
  }, [photoUri]);

  const fittedImageSize = useMemo(() => {
    const maxWidth = width - spacing.xl * 2;
    const maxHeight = screenHeight - Math.max(insets.top, spacing.lg) - spacing.xl * 4;
    const aspectRatio = photoNaturalSize.width / photoNaturalSize.height || 3 / 4;

    let fittedWidth = maxWidth;
    let fittedHeight = fittedWidth / aspectRatio;

    if (fittedHeight > maxHeight) {
      fittedHeight = maxHeight;
      fittedWidth = fittedHeight * aspectRatio;
    }

    return {
      width: Math.max(220, fittedWidth),
      height: Math.max(220, fittedHeight),
    };
  }, [insets.top, photoNaturalSize.height, photoNaturalSize.width, screenHeight, width]);

  const zoomedImageWidth = fittedImageSize.width * photoZoom;
  const zoomedImageHeight = fittedImageSize.height * photoZoom;

  function openViewer() {
    setPhotoZoom(1);
    setIsViewerOpen(true);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mở ảnh hiện trường toàn màn hình"
        onPress={openViewer}
        style={({ pressed }) => [styles.photoCard, { height }, pressed && styles.photoCardPressed]}
      >
        <Image
          source={{ uri: photoUri }}
          style={StyleSheet.absoluteFillObject}
          blurRadius={20}
          resizeMode="cover"
        />
        <View style={styles.photoBackdropOverlay} />
        <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="contain" />
        {predictionLabel ? (
          <View style={styles.detectOverlay}>
            <Text selectable numberOfLines={1} ellipsizeMode="tail" style={styles.detectLabel}>
              {predictionLabel}
            </Text>
          </View>
        ) : null}
      </Pressable>

      <Modal
        visible={isViewerOpen}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => setIsViewerOpen(false)}
      >
        <View style={styles.viewerOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng ảnh toàn màn hình"
            onPress={() => setIsViewerOpen(false)}
            style={styles.viewerBackdrop}
          />

          <View style={[styles.viewerHeader, { top: Math.max(insets.top, spacing.md) }]}>
            <View style={styles.viewerZoomControls}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Thu nhỏ ảnh"
                disabled={photoZoom <= 1}
                onPress={() => setPhotoZoom((current) => Math.max(1, Number((current - 0.5).toFixed(2))))}
                style={({ pressed }) => [
                  styles.viewerZoomButton,
                  photoZoom <= 1 && styles.viewerZoomButtonDisabled,
                  pressed && styles.viewerControlPressed,
                ]}
              >
                <Text selectable={false} style={styles.viewerZoomButtonText}>
                  −
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đưa ảnh về kích thước mặc định"
                onPress={() => setPhotoZoom(1)}
                style={({ pressed }) => [styles.viewerZoomBadge, pressed && styles.viewerControlPressed]}
              >
                <Text selectable={false} style={styles.viewerZoomBadgeText}>
                  {Math.round(photoZoom * 100)}%
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Phóng to ảnh"
                disabled={photoZoom >= 3}
                onPress={() => setPhotoZoom((current) => Math.min(3, Number((current + 0.5).toFixed(2))))}
                style={({ pressed }) => [
                  styles.viewerZoomButton,
                  photoZoom >= 3 && styles.viewerZoomButtonDisabled,
                  pressed && styles.viewerControlPressed,
                ]}
              >
                <Text selectable={false} style={styles.viewerZoomButtonText}>
                  +
                </Text>
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng ảnh toàn màn hình"
              onPress={() => setIsViewerOpen(false)}
              style={({ pressed }) => [styles.viewerCloseButton, pressed && styles.viewerCloseButtonPressed]}
            >
              <AppIcon name="close-outline" size={22} color={colors.surface} containerSize={24} />
            </Pressable>
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
                source={{ uri: photoUri }}
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
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  photoCard: {
    width: '100%',
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCardPressed: {
    opacity: 0.95,
  },
  photoBackdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  detectOverlay: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(7, 14, 35, 0.82)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  detectLabel: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.96)',
  },
  viewerBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  viewerHeader: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  viewerZoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  viewerZoomButton: {
    minWidth: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerZoomButtonDisabled: {
    opacity: 0.42,
  },
  viewerZoomButtonText: {
    color: colors.surface,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
  },
  viewerZoomBadge: {
    minWidth: 62,
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerCloseButtonPressed: {
    opacity: 0.84,
  },
  viewerControlPressed: {
    opacity: 0.84,
  },
  viewerContent: {
    flex: 1,
    paddingTop: spacing.xxl * 2,
    paddingBottom: spacing.xl,
  },
  viewerScroll: {
    flex: 1,
  },
  viewerScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  viewerImage: {
    borderRadius: radius.lg,
  },
});
