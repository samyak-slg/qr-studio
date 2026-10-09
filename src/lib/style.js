// Visual settings for the QR code, the built-in presets, and the conversion
// from our settings object to the options the qr-code-styling library expects.

export const DEFAULT_STYLE = {
  size: 512,
  margin: 32,
  errorCorrectionLevel: 'M',
  fgColor: '#000000',
  bgColor: '#ffffff',
  useGradient: false,
  gradientColor: '#1a73e8',
  gradientType: 'linear',
  gradientRotation: 45,
  dotType: 'square',
  cornerSquareType: 'square',
  cornerDotType: 'square',
  customEyes: false,
  cornerSquareColor: '#1a73e8',
  cornerDotColor: '#1a73e8',
  logo: null,
  logoSize: 0.3,
  logoMargin: 4,
  hideBackgroundDots: true,
};

export const SIZE_LIMITS = { min: 128, max: 1024, step: 16 };
export const MARGIN_LIMITS = { min: 0, max: 96, step: 4 };

export const ERROR_LEVELS = [
  { value: 'L', label: 'L', sub: '7%' },
  { value: 'M', label: 'M', sub: '15%' },
  { value: 'Q', label: 'Q', sub: '25%' },
  { value: 'H', label: 'H', sub: '30%' },
];

export const DOT_TYPES = [
  { value: 'square', label: 'Square' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'extra-rounded', label: 'Extra rounded' },
  { value: 'dots', label: 'Dots' },
  { value: 'classy', label: 'Classy' },
  { value: 'classy-rounded', label: 'Classy rounded' },
];

export const CORNER_SQUARE_TYPES = [
  { value: 'square', label: 'Square' },
  { value: 'extra-rounded', label: 'Rounded' },
  { value: 'dot', label: 'Circle' },
];

export const CORNER_DOT_TYPES = [
  { value: 'square', label: 'Square' },
  { value: 'dot', label: 'Circle' },
];

// The style keys a preset controls. Size, margin, error correction and logo are left alone.
const PRESET_KEYS = [
  'fgColor',
  'bgColor',
  'useGradient',
  'gradientColor',
  'gradientType',
  'gradientRotation',
  'dotType',
  'cornerSquareType',
  'cornerDotType',
  'customEyes',
  'cornerSquareColor',
  'cornerDotColor',
];

const BASE_PRESET = Object.fromEntries(PRESET_KEYS.map((key) => [key, DEFAULT_STYLE[key]]));
const preset = (id, name, style) => ({ id, name, style: { ...BASE_PRESET, ...style } });

export const PRESETS = [
  preset('classic', 'Classic', {}),
  preset('gdg', 'GDG', {
    fgColor: '#1a73e8',
    dotType: 'rounded',
    cornerSquareType: 'extra-rounded',
    cornerDotType: 'dot',
    customEyes: true,
    cornerSquareColor: '#ea4335',
    cornerDotColor: '#34a853',
  }),
  preset('ocean', 'Ocean', {
    fgColor: '#0369a1',
    bgColor: '#f0f9ff',
    useGradient: true,
    gradientColor: '#1e3a8a',
    gradientRotation: 45,
    dotType: 'extra-rounded',
    cornerSquareType: 'extra-rounded',
    cornerDotType: 'dot',
  }),
  preset('sunset', 'Sunset', {
    fgColor: '#db2777',
    bgColor: '#fff7ed',
    useGradient: true,
    gradientColor: '#c2410c',
    gradientRotation: 135,
    dotType: 'classy-rounded',
    cornerSquareType: 'extra-rounded',
  }),
  preset('forest', 'Forest', {
    fgColor: '#14532d',
    bgColor: '#f0fdf4',
    dotType: 'classy',
    cornerSquareType: 'extra-rounded',
    cornerDotType: 'dot',
  }),
  preset('grape', 'Grape', {
    fgColor: '#6d28d9',
    bgColor: '#faf5ff',
    useGradient: true,
    gradientColor: '#be185d',
    gradientType: 'radial',
    dotType: 'dots',
    cornerSquareType: 'dot',
    cornerDotType: 'dot',
  }),
];

/** True when the current style looks exactly like the preset (ignoring settings that are switched off). */
export function matchesPreset(style, { style: presetStyle }) {
  return PRESET_KEYS.every((key) => {
    const isGradientKey = key === 'gradientColor' || key === 'gradientType' || key === 'gradientRotation';
    const isEyeColorKey = key === 'cornerSquareColor' || key === 'cornerDotColor';
    if (isGradientKey && !style.useGradient && !presetStyle.useGradient) return true;
    if (isEyeColorKey && !style.customEyes && !presetStyle.customEyes) return true;
    return style[key] === presetStyle[key];
  });
}

/**
 * qr-code-styling's bundled encoder stores one byte per character and silently mangles
 * anything outside Latin-1 (emoji, Hindi, Tamil...). Passing UTF-8 bytes as characters
 * makes it store proper UTF-8, which every phone scanner understands.
 */
export function toByteString(value) {
  return Array.from(new TextEncoder().encode(value), (byte) => String.fromCharCode(byte)).join('');
}

/** Converts our style settings + payload into qr-code-styling options. */
export function toQROptions(style, payload, { size = style.size, type = 'canvas' } = {}) {
  const scale = size / style.size;
  const gradient = style.useGradient
    ? {
        type: style.gradientType,
        rotation: (style.gradientRotation * Math.PI) / 180,
        colorStops: [
          { offset: 0, color: style.fgColor },
          { offset: 1, color: style.gradientColor },
        ],
      }
    : undefined;
  const eyeColors = (color) => (style.customEyes ? { color, gradient: undefined } : { color: style.fgColor, gradient });

  return {
    type,
    width: size,
    height: size,
    data: toByteString(payload),
    margin: Math.round(style.margin * scale),
    image: style.logo ?? undefined,
    qrOptions: { errorCorrectionLevel: style.errorCorrectionLevel },
    dotsOptions: { type: style.dotType, color: style.fgColor, gradient },
    cornersSquareOptions: { type: style.cornerSquareType, ...eyeColors(style.cornerSquareColor) },
    cornersDotOptions: { type: style.cornerDotType, ...eyeColors(style.cornerDotColor) },
    backgroundOptions: { color: style.bgColor },
    imageOptions: {
      crossOrigin: 'anonymous',
      imageSize: style.logoSize,
      margin: Math.round(style.logoMargin * scale),
      hideBackgroundDots: style.hideBackgroundDots,
    },
  };
}
