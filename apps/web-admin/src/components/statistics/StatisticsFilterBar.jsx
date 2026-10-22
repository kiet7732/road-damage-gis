import {
  FiCalendar,
  FiMapPin,
  FiDownload,
  FiRefreshCw,
  FiCheckCircle,
} from 'react-icons/fi';
import Panel from '../Panel';
import WebButton from '../WebButton';
import { ALL_DISTRICTS, PRESETS } from '../../constants/statisticsConstants';
import { UI_COLORS } from '../../constants/statusColors';

export default function StatisticsFilterBar({
  selectedPreset,
  setSelectedPreset,
  customFromDate,
  setCustomFromDate,
  customToDate,
  setCustomToDate,
  activeDistrict,
  setSelectedDistrict,
  managedDistrict,
  onExportCsv,
  onOpenExportModal,
  isExporting,
  totalReports,
  isLoading,
  isRefreshing,
  onReload,
  exportNotice,
}) {
  return (
    <Panel style={styles.filterCard}>
      <div style={styles.filterBar}>
        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>
            <FiCalendar size={14} />
            <span>Thời gian:</span>
          </span>
          <div style={styles.presetGroup}>
            {PRESETS.map((preset) => {
              const isActive = selectedPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedPreset(preset.id)}
                  style={{
                    ...styles.presetBtn,
                    ...(isActive ? styles.presetBtnActive : null),
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {selectedPreset === 'custom' ? (
          <div style={styles.customDateWrap}>
            <div style={styles.dateInputWrap}>
              <span style={styles.dateInputSub}>Từ:</span>
              <input
                type="date"
                value={customFromDate}
                onChange={(e) => setCustomFromDate(e.target.value)}
                style={styles.dateInput}
              />
            </div>
            <div style={styles.dateInputWrap}>
              <span style={styles.dateInputSub}>Đến:</span>
              <input
                type="date"
                value={customToDate}
                onChange={(e) => setCustomToDate(e.target.value)}
                style={styles.dateInput}
              />
            </div>
          </div>
        ) : null}

        <div style={styles.filterGroup}>
          <span style={styles.filterLabel}>
            <FiMapPin size={14} />
            <span>Địa bàn:</span>
          </span>
          <select
            value={activeDistrict || ''}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            disabled={Boolean(managedDistrict)}
            style={{
              ...styles.districtSelect,
              ...(managedDistrict ? styles.districtSelectDisabled : null),
            }}
            title={managedDistrict ? `Tài khoản được phân công quản lý ${managedDistrict}` : 'Chọn Quận/Huyện'}
          >
            <option value="">Toàn thành phố (Tất cả Quận/Huyện)</option>
            {ALL_DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.actionGroup}>
          <WebButton
            onClick={onOpenExportModal || onExportCsv}
            disabled={isExporting || isLoading || totalReports === 0}
            style={styles.exportBtn}
            title="Xuất báo cáo thống kê Excel (.xlsx) hoặc CSV (.csv)"
          >
            <FiDownload size={15} />
            <span>{isExporting ? 'Đang xuất...' : 'Xuất báo cáo'}</span>
          </WebButton>

          <button
            type="button"
            onClick={onReload}
            disabled={isLoading || isRefreshing}
            style={styles.refreshBtn}
            title="Tải lại số liệu thống kê"
          >
            <FiRefreshCw size={15} className={isRefreshing ? 'spin-animation' : undefined} />
          </button>
        </div>
      </div>

      {exportNotice ? (
        <div style={styles.noticeBanner}>
          <FiCheckCircle size={14} color="#16a34a" />
          <span>{exportNotice}</span>
        </div>
      ) : null}
    </Panel>
  );
}

const styles = {
  filterCard: {
    padding: '16px 20px',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    boxShadow: '0 2px 10px rgba(15, 23, 42, 0.05)',
  },
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  filterLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    fontWeight: 700,
    color: UI_COLORS.text,
  },
  presetGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  presetBtn: {
    padding: '6px 12px',
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 8,
    border: `1px solid ${UI_COLORS.border}`,
    backgroundColor: '#F8FAFC',
    color: '#475569',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  presetBtnActive: {
    backgroundColor: UI_COLORS.primary,
    borderColor: UI_COLORS.primary,
    color: '#FFFFFF',
    fontWeight: 700,
    boxShadow: '0 2px 6px rgba(15, 82, 186, 0.25)',
  },
  customDateWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  dateInputWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  dateInputSub: {
    fontSize: 12,
    color: UI_COLORS.textMuted,
    fontWeight: 600,
  },
  dateInput: {
    height: 34,
    padding: '0 8px',
    borderRadius: 8,
    border: `1px solid ${UI_COLORS.border}`,
    fontSize: 12,
    fontWeight: 600,
    color: UI_COLORS.text,
    backgroundColor: '#FFFFFF',
  },
  districtSelect: {
    height: 36,
    padding: '0 12px',
    borderRadius: 8,
    border: `1px solid ${UI_COLORS.border}`,
    fontSize: 13,
    fontWeight: 600,
    color: UI_COLORS.text,
    backgroundColor: '#F8FAFC',
    cursor: 'pointer',
    outline: 'none',
  },
  districtSelectDisabled: {
    backgroundColor: '#F1F5F9',
    cursor: 'not-allowed',
    color: '#64748B',
  },
  actionGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginLeft: 'auto',
  },
  exportBtn: {
    height: 36,
    padding: '0 14px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderColor: '#059669',
    color: '#FFFFFF',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    border: `1px solid ${UI_COLORS.border}`,
    backgroundColor: '#F8FAFC',
    color: '#475569',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  noticeBanner: {
    marginTop: 12,
    padding: '8px 14px',
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    border: '1px solid #BBF7D0',
    color: '#15803D',
    fontSize: 12,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
};
