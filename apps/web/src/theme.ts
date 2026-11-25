import type { ThemeConfig } from 'antd';

export const NAVY = '#0A2540';
export const NAVY_LIGHT = '#143552';
export const PAGE_BG = '#F0F3F7';
export const SURFACE = '#FFFFFF';
export const BORDER = '#E2E8F0';

export const STATUS_COLORS: Record<string, string> = {
  STOCKOUT: '#DC2626',
  CRITICAL: '#EF4444',
  BELOW_ROL: '#F59E0B',
  AT_ROL: '#D97706',
  APPROACHING_ROL: '#EAB308',
  NORMAL: '#16A34A',
  ABOVE_ROL: '#22C55E',
  EXCESS: '#0EA5E9',
  NO_ROL: '#94A3B8',
  CONTINUOUSLY_DECREASING: '#F97316',
};

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: NAVY,
    colorInfo: NAVY,
    colorSuccess: '#16A34A',
    colorWarning: '#F59E0B',
    colorError: '#DC2626',
    colorBgLayout: PAGE_BG,
    colorBgContainer: SURFACE,
    borderRadius: 8,
    fontFamily:
      "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    controlHeight: 36,
  },
  components: {
    Layout: {
      siderBg: NAVY,
      headerBg: SURFACE,
      bodyBg: PAGE_BG,
      triggerBg: NAVY_LIGHT,
    },
    Menu: {
      darkItemBg: NAVY,
      darkSubMenuItemBg: NAVY_LIGHT,
      darkItemSelectedBg: '#1B4A72',
      darkItemHoverBg: NAVY_LIGHT,
    },
    Card: {
      borderRadiusLG: 10,
    },
    Table: {
      headerBg: '#F8FAFC',
    },
  },
};
