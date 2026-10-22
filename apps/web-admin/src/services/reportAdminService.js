import { ApiClientError, api, getApiBaseURL } from '../../../../packages/api-client/src';
import * as XLSX from 'xlsx';
import { DAMAGE_TYPES } from '../constants/statusColors';
import {
  getEffectiveDamageType,
  getEffectiveDamageTypeLabel,
  getPrimaryConfidence,
} from '../utils/reportDamage';

const DEFAULT_PAGE_SIZE = 10;

export function getReportListErrorMessage(error) {
  if (error instanceof ApiClientError) {
    if (error.code === 'NETWORK_ERROR') {
      return 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng rồi thử lại.';
    }

    if (error.code === 'TIMEOUT_ERROR') {
      return 'Máy chủ phản hồi chậm. Vui lòng thử lại sau ít phút.';
    }

    if (error.status === 401) {
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    }

    if (error.status === 403) {
      return 'Tài khoản hiện tại không có quyền xem danh sách phản ánh.';
    }

    if (error.status >= 500) {
      return 'Máy chủ đang tạm gián đoạn. Vui lòng thử lại sau.';
    }

    return error.message || 'Không thể tải danh sách phản ánh.';
  }

  return 'Không thể tải danh sách phản ánh.';
}

export async function fetchAdminReports({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  status = '',
  damageType = '',
  search = '',
  aiStatus = '',
  province = '',
  district = '',
  ward = '',
  roadName = '',
  fromDate = '',
  toDate = '',
} = {}) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0
    ? Math.floor(pageSize)
    : DEFAULT_PAGE_SIZE;

  const params = {
    limit: safePageSize,
    offset: (safePage - 1) * safePageSize,
  };

  if (status) {
    params.status = status;
  }

  if (damageType) {
    params.damage_type = damageType;
  }

  if (search?.trim()) {
    params.search = search.trim();
  }

  if (aiStatus?.trim()) {
    params.ai_status = aiStatus.trim();
  }

  if (district?.trim()) {
    params.district = district.trim();
  }

  if (ward?.trim()) {
    params.ward = ward.trim();
  }

  if (roadName?.trim()) {
    params.road_name = roadName.trim();
  }

  if (fromDate?.trim()) {
    params.from_date = fromDate.trim();
  }

  if (toDate?.trim()) {
    params.to_date = toDate.trim();
  }

  const response = await api.get('/admin/reports', { params });
  const items = Array.isArray(response?.items) ? response.items : [];
  const total = Number.isFinite(response?.total) ? response.total : items.length;

  return {
    items,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  };
}

const escapeCsvField = (value) => {
  if (value === null || value === undefined) {
    return '""';
  }
  const stringValue = String(value);
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return `"${stringValue}"`;
};

const STATUS_DISPLAY_MAP = {
  pending: 'Chờ tiếp nhận (pending)',
  in_progress: 'Đang kiểm tra (in_progress)',
  processing: 'Đang xử lý (processing)',
  repaired: 'Đã xử lý (repaired)',
  rejected: 'Từ chối (rejected)',
  cancelled: 'Đã hủy (cancelled)',
};

const formatReportDateTime = (value) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:${pad(parsed.getSeconds())} ${pad(parsed.getDate())}/${pad(parsed.getMonth() + 1)}/${parsed.getFullYear()}`;
};

const getDamageTypeDisplay = (report) => {
  const code = getEffectiveDamageType(report);
  const label = getEffectiveDamageTypeLabel(report);
  return `${code} - ${label}`;
};

export const REPORT_EXPORT_HEADERS = [
  'Mã phản ánh',
  'Loại hư hỏng',
  'Tên đường',
  'Phường/Xã',
  'Quận/Huyện',
  'Tỉnh/Thành phố',
  'Địa chỉ đầy đủ',
  'Tọa độ Vĩ độ',
  'Tọa độ Kinh độ',
  'Sai số GPS (m)',
  'Trạng thái xử lý',
  'Độ tin cậy AI (%)',
  'Ghi chú kỹ thuật',
  'Thời gian ghi nhận',
];

export const REPORT_EXPORT_IMAGE_HEADER = 'Hình ảnh hiện trường (URL)';

export function buildReportExportRowData(report, includeImage = false) {
  const damageDisplay = getDamageTypeDisplay(report);
  const conf = getPrimaryConfidence(report);
  const confidenceText = conf !== '' && conf !== null && conf !== undefined ? `${conf}%` : '';
  const statusDisplay = STATUS_DISPLAY_MAP[report?.status] || report?.status || '';
  const lat = typeof report?.latitude === 'number' ? Number(report.latitude.toFixed(6)) : '';
  const lng = typeof report?.longitude === 'number' ? Number(report.longitude.toFixed(6)) : '';
  const gpsAcc = typeof report?.gps_accuracy === 'number' ? Math.round(report.gps_accuracy) : '';
  const createdAtFormatted = formatReportDateTime(report?.created_at);

  const row = [
    report?.id || '',
    damageDisplay,
    report?.road_name || '',
    report?.ward || '',
    report?.district || '',
    report?.province || '',
    report?.formatted_address || '',
    lat,
    lng,
    gpsAcc,
    statusDisplay,
    confidenceText,
    report?.note || '',
    createdAtFormatted,
  ];

  if (includeImage) {
    const rawImg = report?.image_url || report?.photo_url || report?.thumbnail_url || '';
    const fullImgUrl = rawImg ? getReportImageUrl(rawImg) : '';
    row.push(fullImgUrl);
  }

  return row;
}

function triggerBrowserDownload(blob, filename) {
  if (typeof window !== 'undefined') {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export function exportReportsToXlsx({
  reports = [],
  includeImage = false,
  customFilename = '',
  title = 'BÁO CÁO CHI TIẾT SỰ CỐ HƯ HỎNG MẶT ĐƯỜNG',
} = {}) {
  const headers = includeImage
    ? [...REPORT_EXPORT_HEADERS, REPORT_EXPORT_IMAGE_HEADER]
    : [...REPORT_EXPORT_HEADERS];

  const now = new Date();
  const exportTimeStr = formatReportDateTime(now);
  const countStr = `${reports.length} sự cố`;

  const sheetData = [
    ['HỆ THỐNG QUẢN LÝ VÀ THEO DÕI HƯ HỎNG MẶT ĐƯỜNG (ROAD DAMAGE GIS)'],
    [title],
    [`Thời gian xuất: ${exportTimeStr}`, '', `Tổng số bản ghi: ${countStr}`],
    [],
    headers,
  ];

  const rows = reports.map((report) => buildReportExportRowData(report, includeImage));
  sheetData.push(...rows);

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  const colWidths = [
    { wch: 22 },
    { wch: 24 },
    { wch: 24 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 45 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 26 },
    { wch: 18 },
    { wch: 30 },
    { wch: 22 },
  ];

  if (includeImage) {
    colWidths.push({ wch: 50 });
  }

  ws['!cols'] = colWidths;
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
  ];

  if (includeImage) {
    const imageColIdx = headers.length - 1;
    for (let r = 0; r < rows.length; r++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 5 + r, c: imageColIdx });
      const cell = ws[cellAddress];
      if (cell && cell.v && typeof cell.v === 'string' && /^https?:\/\//i.test(cell.v)) {
        cell.l = {
          Target: cell.v,
          Tooltip: 'Nhấp chuột để mở xem ảnh hiện trường trên trình duyệt',
        };
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Danh sách sự cố');

  const baseName = customFilename || `Bao_cao_su_co_mat_duong_${now.toISOString().slice(0, 10)}`;
  const finalFilename = baseName.endsWith('.xlsx') ? baseName : `${baseName.replace(/\.csv$/i, '')}.xlsx`;

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  triggerBrowserDownload(blob, finalFilename);
}

export function exportReportsToCsv(reportsOrOptions = [], legacyFilename = '') {
  let reports = [];
  let includeImage = false;
  let customFilename = '';

  if (Array.isArray(reportsOrOptions)) {
    reports = reportsOrOptions;
    customFilename = legacyFilename;
  } else if (typeof reportsOrOptions === 'object' && reportsOrOptions !== null) {
    reports = reportsOrOptions.reports || [];
    includeImage = Boolean(reportsOrOptions.includeImage);
    customFilename = reportsOrOptions.customFilename || '';
  }

  const headers = includeImage
    ? [...REPORT_EXPORT_HEADERS, REPORT_EXPORT_IMAGE_HEADER]
    : [...REPORT_EXPORT_HEADERS];

  const rows = reports.map((report) => {
    const row = buildReportExportRowData(report, includeImage);
    return row.map(escapeCsvField).join(',');
  });

  const csvContent = `\uFEFF${headers.map(escapeCsvField).join(',')}\n${rows.join('\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const baseName = customFilename || `Bao_cao_su_co_mat_duong_${new Date().toISOString().slice(0, 10)}`;
  const finalFilename = baseName.endsWith('.csv') ? baseName : `${baseName.replace(/\.xlsx$/i, '')}.csv`;

  triggerBrowserDownload(blob, finalFilename);
}

export function exportReports({
  reports = [],
  format = 'xlsx',
  includeImage = false,
  customFilename = '',
  title = '',
} = {}) {
  if (format === 'csv') {
    return exportReportsToCsv({ reports, includeImage, customFilename });
  }
  return exportReportsToXlsx({ reports, includeImage, customFilename, title });
}

export function getReportImageUrl(imageUrl) {
  if (!imageUrl) {
    return '';
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  const apiBaseUrl = getApiBaseURL();
  const apiOrigin = apiBaseUrl.replace(/\/api\/?$/, '');

  return `${apiOrigin}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
}
