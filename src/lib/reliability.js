// Checks that warn users when a design choice could make the QR code hard to scan.

import qrcode from 'qrcode-generator';
import { toByteString } from './style.js';

export function hexToRgb(hex) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) return null;
  const n = parseInt(match[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Relative luminance from the WCAG definition: 0 is black, 1 is white. */
export function luminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours, from 1 (identical) to 21 (black on white). */
export function contrastRatio(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

// Same mode detection qr-code-styling uses, so our module count matches what it draws.
function detectMode(data) {
  if (/^[0-9]*$/.test(data)) return 'Numeric';
  if (/^[0-9A-Z $%*+\-./:]*$/.test(data)) return 'Alphanumeric';
  return 'Byte';
}

/** Builds the raw QR matrix (the grid of dark/light modules) for a payload. */
export function createQrMatrix(payload, errorCorrectionLevel) {
  const data = toByteString(payload);
  const qr = qrcode(0, errorCorrectionLevel);
  qr.addData(data, detectMode(data));
  qr.make();
  return qr;
}

/**
 * How big each module will be when drawn, and how wide the blank border (quiet zone) is.
 * Returns null if the payload can't fit in a QR code at all.
 */
export function getQrLayout(payload, style) {
  let moduleCount;
  try {
    moduleCount = createQrMatrix(payload, style.errorCorrectionLevel).getModuleCount();
  } catch {
    return null; // "code length overflow"
  }
  const dotSize = Math.floor((style.size - style.margin * 2) / moduleCount);
  const quietZonePx = (style.size - moduleCount * dotSize) / 2;
  return {
    moduleCount,
    dotSize,
    quietZoneModules: dotSize > 0 ? quietZonePx / dotSize : 0,
  };
}

/**
 * Returns a list of { id, level, message } where level is 'danger', 'warning' or 'info'.
 * `layout` is the result of getQrLayout, or null when there is no valid content yet.
 */
export function getReliabilityWarnings(style, layout) {
  const warnings = [];
  const add = (id, level, message) => warnings.push({ id, level, message });

  const codeColors = [style.fgColor];
  if (style.useGradient) codeColors.push(style.gradientColor);
  if (style.customEyes) codeColors.push(style.cornerSquareColor, style.cornerDotColor);

  const worstContrast = Math.min(...codeColors.map((color) => contrastRatio(color, style.bgColor)));
  if (worstContrast < 2) {
    add('contrast', 'danger', `Very low contrast (${worstContrast.toFixed(1)}:1). This code probably won’t scan. Use darker dots or a lighter background.`);
  } else if (worstContrast < 3) {
    add('contrast', 'warning', `Low contrast (${worstContrast.toFixed(1)}:1). Scanners work best above 3:1. Try darker dots or a lighter background.`);
  }

  const bgLuminance = luminance(style.bgColor);
  if (codeColors.some((color) => luminance(color) > bgLuminance)) {
    add('inverted', 'warning', 'The code is lighter than its background (inverted). Many scanner apps can’t read inverted codes. Keep the dots darker than the background.');
  }

  if (style.logo) {
    if (style.errorCorrectionLevel === 'L' || style.errorCorrectionLevel === 'M') {
      add('logo-ec', 'warning', `A logo hides part of the code. Use error correction Q or H so it can still be read (currently ${style.errorCorrectionLevel}).`);
    }
    if (style.logoSize > 0.35) {
      add('logo-size', 'warning', 'The logo covers a large part of the code. Keep it at 35% or smaller.');
    }
  }

  if (layout) {
    if (layout.dotSize < 1) {
      add('too-small', 'danger', 'There’s too much content to draw at this size. Increase the size or reduce the margin.');
    } else {
      if (layout.quietZoneModules < 2) {
        add('margin', 'warning', `The blank border is only ${layout.quietZoneModules.toFixed(1)} modules wide. Scanners need a clear border. Increase the margin (4 modules is ideal).`);
      }
      if (layout.dotSize < 3) {
        add('density', 'warning', `Each square of the code is only ${layout.dotSize}px. Increase the size or shorten the content.`);
      }
    }
    if (layout.moduleCount >= 57) {
      add('dense', 'info', 'Long content makes a dense code that’s harder to scan from a distance. Shorter content scans faster.');
    }
  }

  if ((style.dotType === 'dots' || style.dotType === 'classy') && style.errorCorrectionLevel === 'L') {
    add('pattern', 'info', 'Decorative dot styles leave less room for error. Consider error correction M or higher.');
  }

  if (style.size < 200) {
    add('small', 'info', 'Images under 200px can look blurry when printed. Use 300px or more for print.');
  }

  return warnings;
}
