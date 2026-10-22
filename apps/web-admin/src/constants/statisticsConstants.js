export const ALL_DISTRICTS = [
  'Quận 1',
  'Quận 3',
  'Quận 4',
  'Quận 5',
  'Quận 6',
  'Quận 7',
  'Quận 8',
  'Quận 10',
  'Quận 11',
  'Quận 12',
  'Bình Thạnh',
  'Gò Vấp',
  'Phú Nhuận',
  'Tân Bình',
  'Tân Phú',
  'Bình Tân',
  'TP. Thủ Đức',
];

export const PRESETS = [
  { id: '7days', label: '7 ngày qua' },
  { id: '30days', label: '30 ngày qua' },
  { id: 'thisMonth', label: 'Tháng này' },
  { id: 'all', label: 'Toàn thời gian' },
  { id: 'custom', label: 'Tùy chọn' },
];

export function getPresetDates(presetId) {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  if (presetId === '7days') {
    const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { fromDate: d.toISOString().slice(0, 10), toDate: todayStr };
  }
  if (presetId === '30days') {
    const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { fromDate: d.toISOString().slice(0, 10), toDate: todayStr };
  }
  if (presetId === 'thisMonth') {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return { fromDate: `${y}-${m}-01`, toDate: todayStr };
  }
  if (presetId === 'all') {
    return { fromDate: '', toDate: '' };
  }
  return null;
}
