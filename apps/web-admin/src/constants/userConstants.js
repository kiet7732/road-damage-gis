import {
  FiTool,
  FiUser,
  FiShield,
  FiAward,
} from 'react-icons/fi';

export const DISTRICT_OPTIONS = [
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
  'Quận Bình Thạnh',
  'Quận Gò Vấp',
  'Quận Phú Nhuận',
  'Quận Tân Bình',
  'Quận Tân Phú',
  'Thành phố Thủ Đức',
  'Thành phố Thủ Dầu Một',
];

export const ROLE_CONFIGS = {
  field_engineer: {
    label: 'Kỹ sư hiện trường',
    color: '#1D4ED8',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    icon: FiTool,
  },
  reporter: {
    label: 'Người phản ánh',
    color: '#047857',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    icon: FiUser,
  },
  district_officer: {
    label: 'Cán bộ địa bàn',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    icon: FiShield,
  },
  officer: {
    label: 'Cán bộ địa bàn',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    icon: FiShield,
  },
  admin: {
    label: 'Quản trị viên',
    color: '#B45309',
    bg: '#FFFBEB',
    border: '#FDE68A',
    icon: FiAward,
  },
  super_admin: {
    label: 'Tổng quản trị',
    color: '#B45309',
    bg: '#FFFBEB',
    border: '#FDE68A',
    icon: FiAward,
  },
};
