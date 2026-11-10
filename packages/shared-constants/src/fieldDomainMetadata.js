import { FIELD_WORKFLOW_STATUS, getFieldEngineerUiLabel, getFieldWorkflowStatus } from './engineerLabels.js';
import { getRoadDamageType, ROAD_DAMAGE_TYPES } from './roadDamage.js';

const normalizeValue = (value) => String(value || '').trim().toLowerCase();

export const ROAD_DAMAGE_TYPE_OPTIONS = Object.values(ROAD_DAMAGE_TYPES).map((item) => ({
  key: item.code,
  value: item.code,
  code: item.code,
  label: item.label,
  filterLabel: `${item.code} - ${item.label}`,
  color: item.color,
  backgroundColor: item.backgroundColor,
}));

export const ROAD_DAMAGE_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả loại hư hỏng' },
  ...ROAD_DAMAGE_TYPE_OPTIONS.map((item) => ({
    value: item.value,
    label: item.filterLabel,
  })),
];

export const FIELD_ENGINEER_SEVERITY_OPTIONS = [
  {
    key: 'light',
    value: getFieldEngineerUiLabel('surveySeverityLight'),
    label: getFieldEngineerUiLabel('surveySeverityLight'),
    color: '#047857',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  {
    key: 'medium',
    value: getFieldEngineerUiLabel('surveySeverityMedium'),
    label: getFieldEngineerUiLabel('surveySeverityMedium'),
    color: '#B45309',
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
  },
  {
    key: 'heavy',
    value: getFieldEngineerUiLabel('surveySeverityHeavy'),
    label: getFieldEngineerUiLabel('surveySeverityHeavy'),
    color: '#B91C1C',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
];

export const PRIORITY_LEVEL_METADATA = {
  level_1: {
    key: 'level_1',
    code: 'level_1',
    levelNumber: 1,
    value: 'Cấp 1 – Cực kỳ nghiêm trọng',
    label: 'Cấp 1 – Cực kỳ nghiêm trọng',
    shortLabel: 'Cấp 1',
    thresholdText: 'S_priority ≥ 1.6 (≥ 160%)',
    technicalDescription:
      'Đại diện cho các trường hợp hệ thống phát hiện đồng thời từ hai nhãn hư hỏng trở lên với độ tin cậy vượt trội (thường trên 80% – 90%). Điển hình là các tổ hợp phá hoại kết cấu phức tạp như ổ gà (D40) xuất hiện song hành cùng nứt lưới mai rùa (D20), trong đó các bounding box thường chiếm tỷ lệ diện tích lớn và rõ nét trên khung hình, phản ánh vùng mặt đường bị hư hại nghiêm trọng cần phát lệnh cảnh báo tức thời.',
    citizenSummary:
      'Hệ thống AI ghi nhận tổ hợp hư hỏng ở mức Cấp 1 – Cực kỳ nghiêm trọng. Báo cáo được ưu tiên đẩy lên đầu danh sách khảo sát và xử lý khẩn cấp.',
    color: '#BE123C',
    backgroundColor: '#FFF1F2',
    borderColor: '#FDA4AF',
    aliases: ['level_1', 'cap_1', 'cấp 1', 'cấp 1 – cực kỳ nghiêm trọng', 'cấp 1 - cực kỳ nghiêm trọng', 'cực kỳ nghiêm trọng', 'urgent', 'khẩn', 'khẩn cấp'],
  },
  level_2: {
    key: 'level_2',
    code: 'level_2',
    levelNumber: 2,
    value: 'Cấp 2 – Nghiêm trọng',
    label: 'Cấp 2 – Nghiêm trọng',
    shortLabel: 'Cấp 2',
    thresholdText: '1.2 ≤ S_priority < 1.6 (120% – < 160%)',
    technicalDescription:
      'Phản ánh trạng thái đa tổn thương với độ tin cậy ở mức khá-cao (ví dụ hai vết nứt cùng đạt ngưỡng 60% – 75%), hoặc trường hợp một hư hại chính được mô hình nhận diện cực kỳ chuẩn xác (85% – 95%) kèm theo một dấu hiệu hư hại thứ cấp (40% – 65%). Đây là những vị trí mặt đường đã suy giảm chất lượng rõ rệt và có xu hướng lan rộng nhanh chóng nếu không được can thiệp sớm.',
    citizenSummary:
      'Hệ thống AI ghi nhận mức độ hư hỏng Cấp 2 – Nghiêm trọng. Vị trí này sẽ được ưu tiên phân công kỹ sư hiện trường kiểm tra sớm.',
    color: '#C2410C',
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
    aliases: ['level_2', 'cap_2', 'cấp 2', 'cấp 2 – nghiêm trọng', 'cấp 2 - nghiêm trọng', 'nghiêm trọng', 'high', 'cao'],
  },
  level_3: {
    key: 'level_3',
    code: 'level_3',
    levelNumber: 3,
    value: 'Cấp 3 – Cần khắc phục',
    label: 'Cấp 3 – Cần khắc phục',
    shortLabel: 'Cấp 3',
    thresholdText: '0.8 ≤ S_priority < 1.2 (80% – < 120%)',
    technicalDescription:
      'Tương ứng với hai kịch bản phát hiện của mô hình: hoặc hệ thống ghi nhận duy nhất một nhãn hư hại đơn lẻ nhưng có độ tin cậy rất cao (80% – 95%), hoặc ghi nhận hai hư hỏng cục bộ có độ tin cậy ở mức trung bình gộp lại (khoảng 40% – 55%). Các điểm này đại diện cho những khuyết tật mặt đường mới phát sinh, cần đưa vào lộ trình khắc phục theo kế hoạch định kỳ.',
    citizenSummary:
      'Hệ thống AI ghi nhận hư hỏng ở mức Cấp 3 – Cần khắc phục. Điểm phản ánh đã được đưa vào danh sách kiểm tra và bảo trì định kỳ.',
    color: '#B45309',
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
    aliases: ['level_3', 'cap_3', 'cấp 3', 'cấp 3 – cần khắc phục', 'cấp 3 - cần khắc phục', 'cần khắc phục', 'medium', 'trung bình'],
  },
  level_4: {
    key: 'level_4',
    code: 'level_4',
    levelNumber: 4,
    value: 'Cấp 4 – Hư hỏng nhẹ',
    label: 'Cấp 4 – Hư hỏng nhẹ',
    shortLabel: 'Cấp 4',
    thresholdText: 'S_priority < 0.8 (< 80%)',
    technicalDescription:
      'Xác định các phát hiện đơn lẻ có độ tin cậy chỉ ở mức trung bình-thấp (50% – 79%) hoặc trường hợp gồm hai đối tượng nhưng cả hai đều nằm sát ngưỡng lọc nhiễu tối thiểu của thuật toán (khoảng 35% – 40%). Mức độ này đóng vai trò cảnh báo sớm các dấu hiệu rạn nứt nhỏ ban đầu và phục vụ công tác giám sát, lưu trữ dữ liệu để đối chiếu tốc độ thoái hóa mặt đường trong các đợt tuần tra kế tiếp.',
    citizenSummary:
      'Hệ thống AI ghi nhận dấu hiệu hư hỏng ở mức Cấp 4 – Hư hỏng nhẹ. Dữ liệu đã được lưu trữ phục vụ giám sát và theo dõi chất lượng mặt đường.',
    color: '#0F766E',
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
    aliases: ['level_4', 'cap_4', 'cấp 4', 'cấp 4 – hư hỏng nhẹ', 'cấp 4 - hư hỏng nhẹ', 'hư hỏng nhẹ', 'low', 'thấp'],
  },
};

export const FIELD_ENGINEER_PRIORITY_OPTIONS = [
  PRIORITY_LEVEL_METADATA.level_1,
  PRIORITY_LEVEL_METADATA.level_2,
  PRIORITY_LEVEL_METADATA.level_3,
  PRIORITY_LEVEL_METADATA.level_4,
];

export const PRIORITY_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả mức độ ưu tiên' },
  { value: 'level_1', label: 'Cấp 1 – Cực kỳ nghiêm trọng (≥ 160%)' },
  { value: 'level_2', label: 'Cấp 2 – Nghiêm trọng (120% – < 160%)' },
  { value: 'level_3', label: 'Cấp 3 – Cần khắc phục (80% – < 120%)' },
  { value: 'level_4', label: 'Cấp 4 – Hư hỏng nhẹ (< 80%)' },
];

export const FIELD_WORKFLOW_OPTIONS = Object.values(FIELD_WORKFLOW_STATUS).map((item) => ({
  key: item.key,
  value: item.key,
  label: item.label,
  shortLabel: item.shortLabel,
  color: item.color,
  backgroundColor: item.backgroundColor,
  borderColor: item.borderColor,
}));

export const FIELD_WORKFLOW_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả hiện trường' },
  ...FIELD_WORKFLOW_OPTIONS.map((item) => ({
    value: item.value,
    label: item.label,
  })),
];

export function getRoadDamageTypeOption(value) {
  const normalized = String(value || '').trim().toUpperCase();
  return ROAD_DAMAGE_TYPE_OPTIONS.find((item) => item.value === normalized) ?? null;
}

export function getFieldSeverityMeta(value) {
  const normalized = normalizeValue(value);
  return (
    FIELD_ENGINEER_SEVERITY_OPTIONS.find(
      (item) => normalizeValue(item.value) === normalized || item.key === normalized,
    ) ?? null
  );
}

export function getFieldPriorityMeta(value) {
  const normalized = normalizeValue(value);
  if (!normalized) {
    return null;
  }
  for (const option of FIELD_ENGINEER_PRIORITY_OPTIONS) {
    if (
      option.key === normalized ||
      normalizeValue(option.value) === normalized ||
      normalizeValue(option.shortLabel) === normalized ||
      (Array.isArray(option.aliases) && option.aliases.includes(normalized)) ||
      normalized.startsWith(normalizeValue(option.shortLabel))
    ) {
      return option;
    }
  }
  return null;
}

export function classifyPriorityScore(score, totalDetections) {
  if (!totalDetections || totalDetections <= 0 || !Number.isFinite(score) || score <= 0) {
    return 'unrated';
  }
  if (score >= 1.6) {
    return 'level_1';
  }
  if (score >= 1.2) {
    return 'level_2';
  }
  if (score >= 0.8) {
    return 'level_3';
  }
  return 'level_4';
}

export function computePriorityAssessment(reportOrAiResult, explicitFieldPriority = null) {
  if (!reportOrAiResult) {
    return {
      score: 0,
      scorePercent: 0,
      levelCode: 'unrated',
      levelNumber: null,
      levelLabel: 'Chưa xác định mức ưu tiên AI',
      shortLabel: 'Chưa xếp cấp',
      thresholdText: 'Chưa phát hiện đối tượng hư hỏng (S_priority = 0%)',
      formulaText: 'Không có nhãn hư hỏng nào được phát hiện trong khung hình',
      technicalDescription: 'Hệ thống chưa ghi nhận nhãn hư hỏng từ mô hình thị giác máy tính; chờ thẩm định thủ công.',
      citizenSummary: 'Phản ánh đã được tiếp nhận và chuyển đến bộ phận chuyên môn để kiểm tra, phân loại.',
      color: '#64748B',
      backgroundColor: '#F1F5F9',
      borderColor: '#CBD5E1',
      topDetections: [],
      totalDetectionsCount: 0,
      distinctDamageTypes: [],
      effectiveLevelCode: 'unrated',
      effectiveLevelNumber: null,
      effectiveLevelLabel: 'Chưa xác định mức ưu tiên',
      effectiveShortLabel: 'Chưa xếp cấp',
      isFieldVerified: false,
    };
  }

  const aiResult = reportOrAiResult.ai_result || reportOrAiResult.aiResult || reportOrAiResult;
  const fieldPriority =
    explicitFieldPriority ??
    reportOrAiResult.field_priority ??
    reportOrAiResult.fieldPriority ??
    null;

  let rawDetections = [];
  if (Array.isArray(aiResult?.detections)) {
    rawDetections = aiResult.detections;
  } else if (Array.isArray(reportOrAiResult?.detections)) {
    rawDetections = reportOrAiResult.detections;
  } else if (Number.isFinite(Number(reportOrAiResult?.confidence)) && Number(reportOrAiResult.confidence) > 0) {
    rawDetections = [
      {
        damage_type: reportOrAiResult.damage_type || reportOrAiResult.corrected_damage_type || 'D40',
        confidence: Number(reportOrAiResult.confidence),
      },
    ];
  }

  const parsedDetections = [];
  const distinctDamageTypes = [];

  for (const det of rawDetections) {
    const conf = Number(det?.confidence ?? 0);
    if (!Number.isFinite(conf) || conf <= 0) {
      continue;
    }
    const clampedConf = Math.max(0, Math.min(1, conf));
    const dType = String(det?.damage_type || det?.damageType || 'D40').trim().toUpperCase();
    const dMeta = getRoadDamageType(dType);
    if (!distinctDamageTypes.includes(dType)) {
      distinctDamageTypes.push(dType);
    }
    parsedDetections.push({
      damageType: dType,
      damageLabel: dMeta?.label || 'Hư hỏng mặt đường',
      className: det?.class_name || det?.className || dType,
      confidence: Number(clampedConf.toFixed(4)),
      confidencePercent: Number((clampedConf * 100).toFixed(1)),
    });
  }

  parsedDetections.sort((a, b) => b.confidence - a.confidence);
  const totalDetectionsCount = parsedDetections.length;
  const topDetections = parsedDetections.slice(0, 2);
  const score = Number(topDetections.reduce((acc, item) => acc + item.confidence, 0).toFixed(4));
  const scorePercent = Number((score * 100).toFixed(1));
  const levelCode = classifyPriorityScore(score, totalDetectionsCount);

  const fieldMeta = getFieldPriorityMeta(fieldPriority);
  const isFieldVerified = Boolean(fieldMeta);
  const aiMeta = PRIORITY_LEVEL_METADATA[levelCode] || null;
  const effectiveMeta = fieldMeta || aiMeta;

  let formulaText = 'Không có nhãn hư hỏng nào được phát hiện trong khung hình';
  if (topDetections.length === 2) {
    const [d1, d2] = topDetections;
    formulaText = `S_priority = ${d1.confidencePercent}% (${d1.damageType}) + ${d2.confidencePercent}% (${d2.damageType}) = ${scorePercent}% (Tổng 2 tỷ lệ cao nhất trong ${totalDetectionsCount} phát hiện)`;
  } else if (topDetections.length === 1) {
    const [d1] = topDetections;
    formulaText = `S_priority = ${d1.confidencePercent}% (${d1.damageType}) (Phát hiện đơn lẻ 1 đối tượng trong khung hình)`;
  }

  return {
    score,
    scorePercent,
    levelCode,
    levelNumber: aiMeta?.levelNumber ?? null,
    levelLabel: aiMeta?.label ?? 'Chưa xác định mức ưu tiên AI',
    shortLabel: aiMeta?.shortLabel ?? 'Chưa xếp cấp',
    thresholdText: aiMeta?.thresholdText ?? 'Chưa phát hiện đối tượng hư hỏng (S_priority = 0%)',
    formulaText,
    technicalDescription:
      aiMeta?.technicalDescription ??
      'Hệ thống chưa ghi nhận nhãn hư hỏng từ mô hình thị giác máy tính; chờ thẩm định thủ công.',
    citizenSummary:
      aiMeta?.citizenSummary ??
      'Phản ánh đã được tiếp nhận và chuyển đến bộ phận chuyên môn để kiểm tra, phân loại.',
    color: effectiveMeta?.color ?? '#64748B',
    backgroundColor: effectiveMeta?.backgroundColor ?? '#F1F5F9',
    borderColor: effectiveMeta?.borderColor ?? '#CBD5E1',
    topDetections,
    totalDetectionsCount,
    distinctDamageTypes,
    effectiveLevelCode: effectiveMeta?.code ?? 'unrated',
    effectiveLevelNumber: effectiveMeta?.levelNumber ?? null,
    effectiveLevelLabel: effectiveMeta?.label ?? 'Chưa xác định mức ưu tiên',
    effectiveShortLabel: effectiveMeta?.shortLabel ?? 'Chưa xếp cấp',
    isFieldVerified,
  };
}

export function getFieldWorkflowMeta(value) {
  return getFieldWorkflowStatus(value);
}

export function getRoadDamageTypeColor(value) {
  return getRoadDamageType(value).color;
}
