/**
 * Design tokens for Dottinoo brand
 * These tokens are used to generate CSS variables and can be referenced in TypeScript
 */
export const tokens = {
  colors: {
    primary: {
      blue: '#4196E2',
      navy: '#133E6C',
    },
    background: {
      blue50: '#ECF4FC',
      blue100: '#D9EAF9',
    },
    accent: {
      lightSky: '#93CEEE',
      aqua: '#90E9D5',
    },
    reward: {
      yellow: '#F5D86F',
    },
    energy: {
      orange: '#B4511D',
    },
    text: {
      soft: '#355A7F',
      default: '#133E6C',
      white: '#FFFFFF',
    },
    button: {
      primary: '#2C6EAD',
      primaryHover: '#1F5A8F',
      reward: '#F5D86F',
      rewardHover: '#E8C85A',
      energy: '#B4511D',
      energyHover: '#9A4216',
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    full: '9999px',
  },
  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
} as const

