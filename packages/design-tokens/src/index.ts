export const colors = {
  canvasWhite: '#ffffff',
  cloudMist: '#e0e0db',
  slateText: '#353241',
  richViolet: '#21164c',
  actionViolet: '#592eff',
  airBlue: '#bcf2ff',
  lushGreen: '#dfff9d',
  sunsetPink: '#ffaae6',
  neonPink: '#f843c2',
  aquaBlue: '#2ed6ff',
  electricGreen: '#a2ea13',
  softGrayFill: '#eeeeee',
} as const;

export const radii = {
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 26,
  full: 48,
  badge: 200,
  accentCard: 64,
} as const;

export const spacing = {
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
  48: 48,
  60: 60,
  100: 100,
} as const;

export type ColorToken = keyof typeof colors;
