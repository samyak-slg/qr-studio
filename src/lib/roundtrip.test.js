// Encodes every QR type into a real QR matrix, draws it as pixels, then reads it back with a
// QR decoder (jsQR), the same way a phone camera would. The decoded text must match exactly.
import jsQR from 'jsqr';
import { describe, expect, it } from 'vitest';
import { buildPayload } from './qrTypes.js';
import { createQrMatrix } from './reliability.js';

function rasterize(qr, { scale = 4, quiet = 4, hide = () => false } = {}) {
  const count = qr.getModuleCount();
  const size = (count + quiet * 2) * scale;
  const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (!qr.isDark(row, col) || hide(row, col, count)) continue;
      for (let y = 0; y < scale; y++) {
        for (let x = 0; x < scale; x++) {
          const i = (((row + quiet) * scale + y) * size + (col + quiet) * scale + x) * 4;
          pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
        }
      }
    }
  }
  return { pixels, size };
}

const decode = ({ pixels, size }) => jsQR(pixels, size, size)?.data ?? null;

const SAMPLES = {
  url: buildPayload('url', { url: 'gdg.community.dev/events?city=chennai&year=2026' }),
  text: buildPayload('text', { text: 'नमस्ते GDG 👋 · multi-line\nQR test' }),
  'text (uppercase)': buildPayload('text', { text: 'HELLO GDG SRM 2026' }), // alphanumeric mode
  'text (digits)': buildPayload('text', { text: '20261004' }), // numeric mode
  email: buildPayload('email', { to: 'team@gdg.dev', subject: 'Hi & welcome', body: 'Line 1\nLine 2' }),
  phone: buildPayload('phone', { phone: '+91 98765 43210' }),
  wifi: buildPayload('wifi', { ssid: 'Café; Home "5G"', password: 'pa;ss:wo,rd\\123', encryption: 'WPA', hidden: true }),
};

describe.each(Object.entries(SAMPLES))('%s', (_name, payload) => {
  it.each(['L', 'M', 'Q', 'H'])('reads back exactly at error correction %s', (level) => {
    expect(decode(rasterize(createQrMatrix(payload, level)))).toBe(payload);
  });
});

it('still reads at level H when the centre is covered, like a logo', () => {
  const payload = SAMPLES.url;
  const coverCentre = (row, col, count) => {
    const from = Math.floor(count * 0.4);
    const to = Math.ceil(count * 0.6);
    return row >= from && row < to && col >= from && col < to;
  };
  expect(decode(rasterize(createQrMatrix(payload, 'H'), { hide: coverCentre }))).toBe(payload);
});
