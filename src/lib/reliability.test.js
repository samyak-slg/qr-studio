import { describe, expect, it } from 'vitest';
import { contrastRatio, getQrLayout, getReliabilityWarnings } from './reliability.js';
import { DEFAULT_STYLE, PRESETS } from './style.js';

const ids = (style, payload = 'https://gdg.community.dev') =>
  getReliabilityWarnings(style, payload ? getQrLayout(payload, style) : null).map((w) => w.id);

describe('contrastRatio', () => {
  it('matches the WCAG reference values', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#ffffff')).toBe(1);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 1);
  });
});

describe('getReliabilityWarnings', () => {
  it('has nothing to say about the default black-on-white code', () => {
    expect(ids(DEFAULT_STYLE)).toEqual([]);
  });

  it('keeps every built-in preset free of warnings', () => {
    for (const preset of PRESETS) {
      expect(ids({ ...DEFAULT_STYLE, ...preset.style }), preset.name).toEqual([]);
    }
  });

  it('flags low contrast, including a low-contrast gradient end colour', () => {
    expect(ids({ ...DEFAULT_STYLE, fgColor: '#bbbbbb' })).toContain('contrast');
    expect(ids({ ...DEFAULT_STYLE, useGradient: true, gradientColor: '#eeeeee' })).toContain('contrast');
    const [warning] = getReliabilityWarnings({ ...DEFAULT_STYLE, fgColor: '#f5f5f5' }, null);
    expect(warning.level).toBe('danger');
  });

  it('flags inverted codes (light dots on a dark background)', () => {
    expect(ids({ ...DEFAULT_STYLE, fgColor: '#ffffff', bgColor: '#000000' })).toContain('inverted');
  });

  it('flags logos without enough error correction, and oversized logos', () => {
    const withLogo = { ...DEFAULT_STYLE, logo: 'data:image/png;base64,AAAA' };
    expect(ids({ ...withLogo, errorCorrectionLevel: 'M' })).toContain('logo-ec');
    expect(ids({ ...withLogo, errorCorrectionLevel: 'H' })).not.toContain('logo-ec');
    expect(ids({ ...withLogo, errorCorrectionLevel: 'H', logoSize: 0.5 })).toContain('logo-size');
  });

  it('flags a missing quiet zone and modules that are too small', () => {
    expect(ids({ ...DEFAULT_STYLE, margin: 0 })).toContain('margin');
    expect(ids({ ...DEFAULT_STYLE, size: 128, margin: 8 }, 'x'.repeat(300))).toEqual(
      expect.arrayContaining(['density', 'dense', 'small']),
    );
    expect(ids({ ...DEFAULT_STYLE, size: 128, margin: 8, errorCorrectionLevel: 'L' }, 'x'.repeat(2900))).toContain('too-small');
  });

  it('returns no layout for content that cannot fit in any QR code', () => {
    expect(getQrLayout('x'.repeat(3000), DEFAULT_STYLE)).toBeNull();
  });
});

describe('getQrLayout', () => {
  it('matches how qr-code-styling sizes modules', () => {
    // A short URL needs a 25×25 grid. (512 − 2×32) / 25 = 17.9 → 17px modules.
    expect(getQrLayout('https://gdg.community.dev', DEFAULT_STYLE)).toMatchObject({ moduleCount: 25, dotSize: 17 });
  });
});
