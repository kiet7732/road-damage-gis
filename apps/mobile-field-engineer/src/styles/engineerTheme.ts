/**
 * Engineer Specialized Theme - Industrial & Field Telemetry Palette
 * Bảng màu & Kiểu dáng kỹ thuật thực địa cho Kỹ sư hiện trường.
 */

export const engineerColors = {
  // Nền & Khung chính - Đồng bộ tông màu sáng thanh lịch của hệ thống
  headerBg: '#FFFFFF',
  headerSurface: '#FFFFFF',
  headerBorder: '#E2E8F0',
  
  // Nền ứng dụng ngoài trời
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  surfaceCard: '#FFFFFF',
  surfaceCardDark: '#FFFFFF',
  
  // Màu thương hiệu & Tác nghiệp Kỹ thuật
  brandPrimary: '#0F52BA', // Xanh sapphire đậm đồng bộ toàn hệ thống
  brandDark: '#0B132B',
  brandAccent: '#0F52BA',  // Xanh sapphire chủ đạo
  
  // Màu an toàn & Trạng thái Công trường
  safetyAmber: '#F77F00',  // Cam an toàn công trường
  safetyOrange: '#FF9F1C', // Cam cảnh báo
  radarGreen: '#10B981',   // Xanh tín hiệu GPS khóa tốt
  dangerRed: '#EF4444',    // Đỏ cảnh báo khẩn cấp
  
  // Màu chữ & Độ tương phản cao
  textNavy: '#0B132B',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textOnDark: '#FFFFFF',
  textOnDarkMuted: '#94A3B8',
  textCyan: '#00B4D8',
  textAmber: '#D97706',
  
  // Viền & Phân cách kỹ thuật
  borderLight: '#E2E8F0',
  borderMedium: '#CBD5E1',
  borderDark: '#334155',
  borderAccent: '#00B4D8',
  
  // Trạng thái Quy trình Hiện trường (Field Workflow Tones)
  statusAvailable: {
    bg: '#FEF3C7',
    border: '#FCD34D',
    text: '#92400E',
    dot: '#F59E0B',
  },
  statusClaimed: {
    bg: '#E0F2FE',
    border: '#BAE6FD',
    text: '#0369A1',
    dot: '#0284C7',
  },
  statusInProgress: {
    bg: '#FFEDD5',
    border: '#FED7AA',
    text: '#C2410C',
    dot: '#EA580C',
  },
  statusSurveyed: {
    bg: '#D1FAE5',
    border: '#A7F3D0',
    text: '#065F46',
    dot: '#10B981',
  },
};

export const engineerSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const engineerRadius = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 9999,
};
