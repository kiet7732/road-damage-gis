import piexif from 'piexifjs';
import { File as ExpoFile } from 'expo-file-system';
import { Platform } from 'react-native';
import type { GpsLocation } from './roadDamageTypes';

type ExpoFileSystemFileHandle = {
  base64: () => Promise<string>;
  write: (content: string | Uint8Array, options?: { encoding?: string }) => void;
};

/**
 * Chuyển đổi tọa độ thập phân sang cấu trúc 3 phân số [Độ, Phút, Giây] chuẩn EXIF.
 * Ví dụ: 10.762622 -> [[10, 1], [45, 1], [4544, 100]] (10° 45' 45.44")
 */
export function convertDecimalToDms(
  decimal: number,
): [[number, number], [number, number], [number, number]] {
  const abs = Math.abs(decimal);
  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = Math.round((minutesFloat - minutes) * 60 * 100);

  return [
    [degrees, 1],
    [minutes, 1],
    [seconds, 100],
  ];
}

/**
 * Dán (nhúng) toàn bộ EXIF Metadata chuẩn GIS vào file ảnh JPEG ngay tại thời điểm chụp.
 * Dùng chung cho cả Người phản ánh (Reporter) và Kỹ sư giám sát (Field Engineer).
 * Bao gồm nhóm thẻ GPS IFD chuẩn quốc tế:
 * - GPSLatitude / GPSLatitudeRef
 * - GPSLongitude / GPSLongitudeRef
 * - GPSAltitude / GPSAltitudeRef
 * - GPSTimeStamp / GPSDateStamp (UTC)
 * - GPSImgDirection / GPSImgDirectionRef (La bàn hướng chụp)
 * - GPSHPositioningError (Sai số mét)
 * - ImageDescription (Metadata tùy biến)
 */
export async function embedGisExifToPhoto(
  photoUri: string,
  gps: GpsLocation,
  customMetadata?: Record<string, any>,
): Promise<string> {
  if (!photoUri || !gps) {
    return photoUri;
  }

  try {
    const d = gps.capturedAt ? new Date(gps.capturedAt) : new Date();
    const timeStamp: [[number, number], [number, number], [number, number]] = [
      [d.getUTCHours(), 1],
      [d.getUTCMinutes(), 1],
      [d.getUTCSeconds(), 1],
    ];
    const dateStamp = `${d.getUTCFullYear()}:${String(d.getUTCMonth() + 1).padStart(2, '0')}:${String(
      d.getUTCDate(),
    ).padStart(2, '0')}`;

    const gpsIfd: Record<number, any> = {};

    // 1. Tọa độ Vĩ độ
    gpsIfd[piexif.GPSIFD.GPSLatitudeRef] = gps.latitude >= 0 ? 'N' : 'S';
    gpsIfd[piexif.GPSIFD.GPSLatitude] = convertDecimalToDms(gps.latitude);

    // 2. Tọa độ Kinh độ
    gpsIfd[piexif.GPSIFD.GPSLongitudeRef] = gps.longitude >= 0 ? 'E' : 'W';
    gpsIfd[piexif.GPSIFD.GPSLongitude] = convertDecimalToDms(gps.longitude);

    // 3. Thời gian chuẩn UTC lúc chụp
    gpsIfd[piexif.GPSIFD.GPSTimeStamp] = timeStamp;
    gpsIfd[piexif.GPSIFD.GPSDateStamp] = dateStamp;

    // 4. Sai số vị trí GPS (GPSHPositioningError)
    if (typeof gps.accuracy === 'number' && gps.accuracy > 0) {
      gpsIfd[piexif.GPSIFD.GPSHPositioningError] = [Math.round(gps.accuracy * 10), 10];
    }

    // 5. Độ cao (GPSAltitude)
    if (typeof gps.altitude === 'number' && Number.isFinite(gps.altitude)) {
      gpsIfd[piexif.GPSIFD.GPSAltitudeRef] = gps.altitude >= 0 ? 0 : 1;
      gpsIfd[piexif.GPSIFD.GPSAltitude] = [Math.round(Math.abs(gps.altitude) * 10), 10];
    }

    // 6. Hướng camera la bàn số (GPSImgDirection)
    if (typeof gps.heading === 'number' && Number.isFinite(gps.heading) && gps.heading >= 0) {
      gpsIfd[piexif.GPSIFD.GPSImgDirectionRef] = 'T';
      gpsIfd[piexif.GPSIFD.GPSImgDirection] = [Math.round(gps.heading * 10), 10];
    }

    // 7. Thẻ thông tin bổ sung (ImageDescription)
    const zerothIfd: Record<number, any> = {};
    zerothIfd[piexif.ImageIFD.ImageDescription] = JSON.stringify({
      source: customMetadata?.source || 'road_damage_mobile',
      captured_at: gps.capturedAt,
      accuracy_meters: gps.accuracy,
      ...customMetadata,
    });

    const exifObj = {
      '0th': zerothIfd,
      GPS: gpsIfd,
      Exif: {},
      '1st': {},
      thumbnail: null,
    };

    const exifBytes = piexif.dump(exifObj);

    if (Platform.OS === 'web') {
      let dataUri = photoUri;
      if (photoUri.startsWith('blob:')) {
        const response = await fetch(photoUri);
        const blob = await response.blob();
        dataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      if (dataUri.startsWith('data:image/jpeg') || dataUri.startsWith('data:image/jpg')) {
        return piexif.insert(exifBytes, dataUri);
      }
      return photoUri;
    }

    // Native: Android / iOS dùng API File của Expo
    const file = new ExpoFile(photoUri) as unknown as ExpoFileSystemFileHandle;
    const base64 = await file.base64();
    const dataUri = `data:image/jpeg;base64,${base64}`;
    const taggedDataUri = piexif.insert(exifBytes, dataUri);
    const rawBase64 = taggedDataUri.replace(/^data:image\/jpeg;base64,/, '');

    file.write(rawBase64, { encoding: 'base64' });

    return photoUri;
  } catch (error) {
    console.warn('Lỗi dán EXIF Metadata vào ảnh:', error);
    return photoUri;
  }
}
