import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiRotateCcw, FiCompass, FiSearch, FiX, FiLoader } from 'react-icons/fi';
import { fetchAdministrativeHierarchy } from '../../services/mapAdminService';
import { UI_COLORS } from '../../constants/statusColors';
import { useAuth } from '../../hooks/useAuth';

export type AdministrativeFilterValues = {
  province?: string;
  district?: string;
  ward?: string;
  roadName?: string;
};

type DistrictItem = {
  name: string;
  wards: string[];
  roads: string[];
  total_reports: number;
};

type ProvinceItem = {
  name: string;
  districts: DistrictItem[];
};

type Props = {
  values?: AdministrativeFilterValues;
  filters?: AdministrativeFilterValues;
  onChange: (nextValues: AdministrativeFilterValues) => void;
  onDistrictSelect?: (districtName: string) => void;
  isCompact?: boolean;
  className?: string;
  fixedProvince?: string | null;
  fixedDistrict?: string | null;
  totalResults?: number;
  isLoadingResults?: boolean;
  onReset?: () => void;
};

export default function AdministrativeFilterBar({
  values,
  filters,
  onChange,
  onDistrictSelect,
  isCompact = false,
  className = '',
  fixedProvince,
  fixedDistrict,
  totalResults,
  isLoadingResults = false,
  onReset,
}: Props) {
  const {
    managedProvince: authManagedProvince,
    managedDistrict: authManagedDistrict,
  } = useAuth();
  const lockedProvince =
    fixedProvince !== undefined ? fixedProvince : authManagedProvince;
  const lockedDistrict =
    fixedDistrict !== undefined ? fixedDistrict : authManagedDistrict;

  const activeValues = useMemo<AdministrativeFilterValues>(() => {
    const raw = values || filters || {};
    return {
      ...raw,
      ...(lockedProvince ? { province: lockedProvince } : {}),
      ...(lockedDistrict ? { district: lockedDistrict } : {}),
    };
  }, [values, filters, lockedProvince, lockedDistrict]);

  const [provinces, setProvinces] = useState<ProvinceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Debounced road search
  const [localRoadName, setLocalRoadName] = useState(activeValues.roadName || '');
  const isInternalRoadChangeRef = useRef(false);

  // Sync external changes to localRoadName
  useEffect(() => {
    if (!isInternalRoadChangeRef.current) {
      setLocalRoadName(activeValues.roadName || '');
    }
    isInternalRoadChangeRef.current = false;
  }, [activeValues.roadName]);

  // Debounce user input
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = localRoadName.trim();
      const currentTrimmed = (activeValues.roadName || '').trim();
      if (trimmed !== currentTrimmed) {
        isInternalRoadChangeRef.current = true;
        onChange({
          ...activeValues,
          roadName: trimmed,
        });
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [localRoadName, activeValues, onChange]);

  useEffect(() => {
    let isMounted = true;

    async function loadHierarchy() {
      try {
        setLoading(true);
        const scopeKey = `${lockedProvince || ''}:${lockedDistrict || ''}`;
        const res = await fetchAdministrativeHierarchy(scopeKey);
        if (isMounted && Array.isArray(res?.provinces)) {
          setProvinces(res.provinces);
        }
      } catch (err) {
        console.warn('Failed to load administrative hierarchy:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadHierarchy();

    return () => {
      isMounted = false;
    };
  }, [lockedProvince, lockedDistrict]);

  // Sync locked province/district to parent state if not already set
  useEffect(() => {
    const raw = values || filters || {};
    const needProvinceSync = Boolean(lockedProvince && raw.province !== lockedProvince);
    const needDistrictSync = Boolean(lockedDistrict && raw.district !== lockedDistrict);
    if (needProvinceSync || needDistrictSync) {
      onChange({
        ...raw,
        ...(lockedProvince ? { province: lockedProvince } : {}),
        ...(lockedDistrict ? { district: lockedDistrict } : {}),
      });
    }
  }, [lockedProvince, lockedDistrict, values, filters, onChange]);

  // Selected province data
  const currentProvince = useMemo(() => {
    if (!activeValues.province) {
      return null;
    }
    return provinces.find((p) => p.name === activeValues.province) || null;
  }, [provinces, activeValues.province]);

  // Available districts: all districts across all provinces if no province selected, or current province districts
  const districtList = useMemo(() => {
    if (!currentProvince) {
      return provinces.flatMap((p) => p.districts || []);
    }
    return currentProvince.districts || [];
  }, [currentProvince, provinces]);

  // Selected district data
  const currentDistrict = useMemo(() => {
    const targetDistrict = lockedDistrict || activeValues.district;
    if (!targetDistrict) return null;
    return districtList.find((d) => d.name === targetDistrict) || null;
  }, [districtList, lockedDistrict, activeValues.district]);

  // Available wards under the chosen district
  const wardList = useMemo(() => {
    return currentDistrict?.wards || [];
  }, [currentDistrict]);

  // Available roads: if district selected -> roads of that district; else all roads across all districts
  const availableRoads = useMemo(() => {
    if (currentDistrict?.roads?.length) {
      return currentDistrict.roads;
    }
    const roadSet = new Set<string>();
    provinces.forEach((p) => {
      p.districts?.forEach((d) => {
        d.roads?.forEach((r) => roadSet.add(r));
      });
    });
    return Array.from(roadSet);
  }, [currentDistrict, provinces]);

  // Handlers for cascading selects
  const handleProvinceChange = (provinceName: string) => {
    if (lockedProvince) {
      return;
    }
    setLocalRoadName('');
    onChange({
      province: provinceName,
      district: lockedDistrict || '',
      ward: '',
      roadName: '',
    });
  };

  const handleDistrictChange = (districtName: string) => {
    if (lockedDistrict) {
      return;
    }

    setLocalRoadName('');
    const owningProvince = provinces.find((p) =>
      p.districts?.some((d) => d.name === districtName),
    );
    onChange({
      province: activeValues.province || (owningProvince?.name ?? ''),
      district: districtName,
      ward: '',
      roadName: '',
    });

    if (districtName && onDistrictSelect) {
      onDistrictSelect(districtName);
    }
  };

  const handleWardChange = (wardName: string) => {
    setLocalRoadName('');
    onChange({
      ...activeValues,
      ward: wardName,
      roadName: '',
    });
  };

  const handleRoadKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = localRoadName.trim();
      isInternalRoadChangeRef.current = true;
      onChange({
        ...activeValues,
        roadName: trimmed,
      });
    }
  };

  const handleClearRoad = () => {
    setLocalRoadName('');
    isInternalRoadChangeRef.current = true;
    onChange({
      ...activeValues,
      roadName: '',
    });
  };

  const handleReset = () => {
    setLocalRoadName('');
    isInternalRoadChangeRef.current = true;
    onChange({
      province: lockedProvince || '',
      district: lockedDistrict || '',
      ward: '',
      roadName: '',
    });
    onReset?.();
  };

  const hasFilterActive = Boolean(
    (!lockedProvince && activeValues.province) ||
    activeValues.ward ||
    activeValues.roadName ||
    localRoadName.trim() ||
    (!lockedDistrict && activeValues.district)
  );

  const selectWrapperStyle = isCompact
    ? { ...styles.selectWrapper, minWidth: 70, flex: '1 1 95px' }
    : styles.selectWrapper;
  const searchWrapperStyle = isCompact
    ? { ...styles.searchWrapper, minWidth: 75, flex: '1 1 100px' }
    : styles.searchWrapper;

  return (
    <div
      className={`admin-hierarchy-filter-bar ${className}`}
      style={{
        ...styles.container,
        ...(isCompact ? styles.compactContainer : null),
      }}
    >
      <div style={styles.controlsGrid}>
        <div style={styles.titleWrap} title="Lọc địa giới hành chính">
          <FiCompass size={15} color={UI_COLORS.primary} style={{ flexShrink: 0 }} />
          {!isCompact ? <span className="road-admin-filter-bar-title" style={styles.title}>Địa giới:</span> : null}
        </div>

        {/* 1. Tỉnh / Thành phố */}
        {lockedProvince ? (
          <div style={selectWrapperStyle}>
            <select
              value={lockedProvince}
              disabled
              style={{
                ...styles.select,
                ...styles.selectLocked,
              }}
              title={`Vùng quản lý cố định: ${lockedProvince}`}
            >
              <option value={lockedProvince}>
                🗺️ {lockedProvince} (Vùng quản lý)
              </option>
            </select>
          </div>
        ) : provinces.length > 0 ? (
          <div style={selectWrapperStyle}>
            <select
              value={activeValues.province || ''}
              onChange={(e) => handleProvinceChange(e.target.value)}
              style={{
                ...styles.select,
                ...(activeValues.province ? styles.selectActive : null),
              }}
              disabled={loading}
              title="Chọn Tỉnh / Thành phố (Khoanh vùng bản đồ)"
            >
              <option value="">Tất cả Tỉnh/TP</option>
              {provinces.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {/* 2. Quận / Huyện (Cascading Dropdown 1) */}
        <div style={selectWrapperStyle}>
          <select
            value={lockedDistrict || activeValues.district || ''}
            onChange={(e) => handleDistrictChange(e.target.value)}
            style={{
              ...styles.select,
              ...(activeValues.district ? styles.selectActive : null),
              ...(lockedDistrict ? styles.selectLocked : null),
            }}
            disabled={loading || Boolean(lockedDistrict)}
            title={lockedDistrict ? `Địa bàn cố định: ${lockedDistrict}` : 'Chọn Quận / Huyện'}
          >
            {lockedDistrict ? (
              <option value={lockedDistrict}>
                🔒 {lockedDistrict} (Địa bàn quản lý)
              </option>
            ) : (
              <>
                <option value="">Tất cả Quận / Huyện</option>
                {districtList.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name} {d.total_reports ? `(${d.total_reports})` : ''}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        {/* 3. Phường / Xã (Cascading Dropdown 2 - Reset khi đổi Quận) */}
        <div style={selectWrapperStyle}>
          <select
            value={activeValues.ward || ''}
            onChange={(e) => handleWardChange(e.target.value)}
            style={{
              ...styles.select,
              ...(activeValues.ward ? styles.selectActive : null),
            }}
            disabled={loading || !(lockedDistrict || activeValues.district)}
            title={lockedDistrict || activeValues.district ? 'Chọn Phường / Xã' : 'Vui lòng chọn Quận/Huyện trước'}
          >
            <option value="">
              {lockedDistrict || activeValues.district ? 'Tất cả Phường / Xã' : 'Chọn Quận trước'}
            </option>
            {wardList.map((w) => (
              <option key={w} value={w}>
                {/^phường/i.test(w) ? w : `Phường ${w}`}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Tuyến đường (Search Input with Autocomplete Datalist & Clear Button) */}
        <div style={searchWrapperStyle}>
          <FiSearch size={14} style={styles.searchIcon} />
          <input
            type="text"
            list="admin-road-datalist"
            placeholder="Tìm tên đường..."
            value={localRoadName}
            onChange={(e) => setLocalRoadName(e.target.value)}
            onKeyDown={handleRoadKeyDown}
            style={{
              ...styles.input,
              ...(localRoadName.trim() ? styles.inputActive : null),
            }}
            disabled={loading}
            title="Nhập hoặc chọn tên đường (Nhấn Enter hoặc đợi 0.3s để tìm)"
            autoComplete="off"
          />
          {localRoadName ? (
            <button
              type="button"
              onClick={handleClearRoad}
              style={styles.clearSearchBtn}
              title="Xóa tên đường"
              aria-label="Xóa tên đường"
            >
              <FiX size={13} />
            </button>
          ) : null}
          <datalist id="admin-road-datalist">
            {availableRoads.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </div>

        {/* 5. Result Feedback Badge */}
        {hasFilterActive && (
          <div style={styles.resultBadgeWrap}>
            {isLoadingResults ? (
              <span style={styles.loadingBadge}>
                <FiLoader className="spin-animation" size={12} />
                <span>Đang tìm...</span>
              </span>
            ) : totalResults !== undefined ? (
              totalResults > 0 ? (
                <span style={styles.successBadge} title={`Tìm thấy ${totalResults} phản ánh hư hỏng phù hợp`}>
                  <span style={styles.dotSuccess} />
                  <span>{totalResults} vị trí</span>
                </span>
              ) : (
                <span style={styles.emptyBadge} title="Không có phản ánh nào tại địa giới này">
                  <span style={styles.dotEmpty} />
                  <span>0 kết quả</span>
                </span>
              )
            ) : null}
          </div>
        )}

        {/* 6. Reset Action */}
        {hasFilterActive ? (
          <button
            type="button"
            onClick={handleReset}
            style={styles.resetBtn}
            aria-label="Đặt lại bộ lọc"
            title="Xóa toàn bộ bộ lọc địa giới và trở về góc nhìn mặc định"
          >
            <FiRotateCcw size={13} />
            <span>Hủy lọc</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 6,
    padding: '4px 8px',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: UI_COLORS.border,
    boxShadow: '0 2px 10px rgba(15, 23, 42, 0.08)',
    minWidth: 0,
    maxWidth: '100%',
    boxSizing: 'border-box',
  },
  compactContainer: {
    padding: '3px 6px',
    gap: 4,
  },
  titleWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginRight: 2,
    flexShrink: 0,
    userSelect: 'none',
  },
  title: {
    fontSize: 11,
    fontWeight: 800,
    color: UI_COLORS.textNavy,
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    whiteSpace: 'nowrap',
  },
  controlsGrid: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'nowrap',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  selectWrapper: {
    position: 'relative',
    minWidth: 78,
    maxWidth: 155,
    flex: '1 1 105px',
  },
  select: {
    width: '100%',
    height: 34,
    padding: '0 6px',
    fontSize: 12,
    fontWeight: 600,
    color: UI_COLORS.text,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: UI_COLORS.border,
    borderRadius: 8,
    outline: 'none',
    cursor: 'pointer',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  selectActive: {
    borderColor: UI_COLORS.primary,
    backgroundColor: '#F0F7FF',
    color: UI_COLORS.primary,
    fontWeight: 700,
  },
  selectLocked: {
    backgroundColor: '#F1F5F9',
    borderColor: '#94A3B8',
    color: '#334155',
    fontWeight: 700,
    cursor: 'not-allowed',
  },
  searchWrapper: {
    position: 'relative',
    minWidth: 82,
    maxWidth: 165,
    flex: '1 1 110px',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 8,
    color: '#94A3B8',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    height: 34,
    paddingLeft: 26,
    paddingRight: 22,
    fontSize: 12,
    fontWeight: 500,
    color: UI_COLORS.text,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: UI_COLORS.border,
    borderRadius: 8,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease, background-color 0.15s ease',
    textOverflow: 'ellipsis',
  },
  inputActive: {
    borderColor: UI_COLORS.primary,
    backgroundColor: '#F0F7FF',
    color: UI_COLORS.primary,
    fontWeight: 700,
  },
  clearSearchBtn: {
    position: 'absolute',
    right: 5,
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 18,
    height: 18,
    borderRadius: 9,
    border: 'none',
    backgroundColor: '#E2E8F0',
    color: '#475569',
    cursor: 'pointer',
    padding: 0,
    transition: 'background-color 0.15s ease',
  },
  resultBadgeWrap: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  loadingBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    height: 26,
    padding: '0 6px',
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    color: '#64748B',
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  successBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    height: 26,
    padding: '0 7px',
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
    border: '1px solid #A7F3D0',
    color: '#047857',
    fontSize: 11,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  dotSuccess: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  emptyBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    height: 26,
    padding: '0 7px',
    borderRadius: 6,
    backgroundColor: '#FFFBEB',
    border: '1px solid #FDE68A',
    color: '#B45309',
    fontSize: 11,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  dotEmpty: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  resetBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    height: 34,
    padding: '0 8px',
    fontSize: 12,
    fontWeight: 700,
    color: '#DC2626',
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: 8,
    cursor: 'pointer',
    flexShrink: 0,
    whiteSpace: 'nowrap',
    transition: 'background-color 0.15s ease',
  },
};
