import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppIcon from '../../../components/AppIcon';
import { colors, spacing } from '../../../constants/theme';

type ReportDetailPhotoViewerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  photoUri: string | null;
  insetsTop: number;
  windowWidth: number;
  windowHeight: number;
  photoNaturalSize: { width: number; height: number };
  photoZoom: number;
  setPhotoZoom: (fn: (current: number) => number) => void;
};

export default function ReportDetailPhotoViewerModal({
  isOpen,
  onClose,
  photoUri,
  insetsTop,
  windowWidth,
  windowHeight,
  photoNaturalSize,
  photoZoom,
  setPhotoZoom,
}: ReportDetailPhotoViewerModalProps) {
  if (!photoUri) return null;

  const viewerMaxWidth = Math.max(220, windowWidth - spacing.xl);
  const viewerMaxHeight = Math.max(240, windowHeight - Math.max(insetsTop, spacing.xl) - 160);
  const aspectRatio = photoNaturalSize.width / photoNaturalSize.height || 1;
  const fittedImageSize = getFittedImageSize(viewerMaxWidth, viewerMaxHeight, aspectRatio);
  const zoomedImageWidth = fittedImageSize.width * photoZoom;
  const zoomedImageHeight = fittedImageSize.height * photoZoom;

  return (
    <Modal
      visible={isOpen}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.viewerOverlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đóng ảnh toàn màn hình"
          onPress={onClose}
          style={styles.viewerBackdrop}
        />

        <View style={[styles.viewerHeader, { top: Math.max(insetsTop, spacing.md) }]}>
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
              onPress={() => setPhotoZoom(() => 1)}
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
            onPress={onClose}
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
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  viewerHeader: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewerZoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 3,
  },
  viewerZoomButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  viewerZoomButtonDisabled: {
    opacity: 0.35,
  },
  viewerZoomButtonText: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
  viewerZoomBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  viewerZoomBadgeText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '700',
  },
  viewerControlPressed: {
    opacity: 0.7,
  },
  viewerCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  viewerCloseButtonPressed: {
    opacity: 0.7,
  },
  viewerContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerScroll: {
    flex: 1,
    width: '100%',
  },
  viewerScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    maxWidth: '100%',
    maxHeight: '100%',
  },
});
