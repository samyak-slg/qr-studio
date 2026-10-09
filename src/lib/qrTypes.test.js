import { describe, expect, it } from 'vitest';
import { BYTE_CAPACITY, DEFAULT_FIELDS, buildPayload, describeContent, evaluateContent, normalizeUrl } from './qrTypes.js';

const evaluate = (type, fields, level) => evaluateContent(type, { ...DEFAULT_FIELDS[type], ...fields }, level);

describe('URL', () => {
  it('accepts full and bare URLs, adding https:// when missing', () => {
    expect(evaluate('url', { url: 'https://gdg.community.dev/events' })).toEqual({
      errors: {},
      payload: 'https://gdg.community.dev/events',
    });
    expect(evaluate('url', { url: '  example.com/path?q=1  ' }).payload).toBe('https://example.com/path?q=1');
    expect(normalizeUrl('http://localhost:5173')).toBe('http://localhost:5173');
  });

  it.each([
    ['', 'Enter a website address.'],
    ['not a url', 'A URL can’t contain spaces.'],
    ['example', 'Include a full domain, like example.com.'],
    ['ftp://files.example.com', 'Only http:// and https:// links are supported.'],
    ['https://', 'This doesn’t look like a valid URL.'],
  ])('rejects %j', (url, message) => {
    expect(evaluate('url', { url })).toEqual({ errors: { url: message }, payload: '' });
  });
});

describe('Text', () => {
  it('encodes text exactly as typed, including emoji and other scripts', () => {
    const text = '  नमस्ते GDG 👋\nline two ';
    expect(evaluate('text', { text }).payload).toBe(text);
  });

  it('rejects empty or whitespace-only text', () => {
    expect(evaluate('text', { text: '   ' }).errors.text).toBe('Enter some text to encode.');
  });

  it('rejects content that is too large for the chosen error-correction level', () => {
    const text = 'x'.repeat(BYTE_CAPACITY.H + 1);
    expect(evaluate('text', { text }, 'H').errors.capacity).toMatch(/fits at most 1273/);
    expect(evaluate('text', { text }, 'L').errors).toEqual({});
  });

  it('counts multi-byte characters by their UTF-8 size', () => {
    const text = '👋'.repeat(400); // 4 bytes each = 1600 bytes
    expect(evaluate('text', { text }, 'H').errors.capacity).toMatch(/1600 bytes/);
  });
});

describe('Email', () => {
  it('builds a mailto: link with encoded subject and body', () => {
    const { payload } = evaluate('email', { to: 'team@gdg.dev', subject: 'Hi & welcome', body: 'Line 1\nLine 2' });
    expect(payload).toBe('mailto:team@gdg.dev?subject=Hi%20%26%20welcome&body=Line%201%0ALine%202');
  });

  it('leaves out empty optional fields', () => {
    expect(evaluate('email', { to: 'a@b.co' }).payload).toBe('mailto:a@b.co');
  });

  it.each(['', 'name', 'name@', 'name@site', 'na me@site.com'])('rejects %j', (to) => {
    expect(evaluate('email', { to }).errors.to).toBeTruthy();
  });
});

describe('Phone', () => {
  it('strips formatting characters', () => {
    expect(evaluate('phone', { phone: '+91 (98765) 43-210' }).payload).toBe('tel:+919876543210');
    expect(evaluate('phone', { phone: '100' }).payload).toBe('tel:100');
  });

  it.each([
    ['', 'Enter a phone number.'],
    ['98abc', 'Use digits only, with an optional + and country code.'],
    ['++91', 'Use digits only, with an optional + and country code.'],
    ['12', 'Phone numbers have between 3 and 15 digits.'],
    ['1234567890123456', 'Phone numbers have between 3 and 15 digits.'],
  ])('rejects %j', (phone, message) => {
    expect(evaluate('phone', { phone }).errors.phone).toBe(message);
  });
});

describe('Wi-Fi', () => {
  it('builds the standard WIFI: string and escapes special characters', () => {
    const fields = { ssid: 'Café; Home "5G"', password: 'pa;ss:wo,rd\\123', encryption: 'WPA', hidden: true };
    expect(evaluate('wifi', fields).payload).toBe('WIFI:T:WPA;S:Café\\; Home \\"5G\\";P:pa\\;ss\\:wo\\,rd\\\\123;H:true;;');
  });

  it('omits the password for open networks', () => {
    expect(evaluate('wifi', { ssid: 'Guest', encryption: 'nopass', password: 'ignored' }).payload).toBe('WIFI:T:nopass;S:Guest;;');
  });

  it('validates SSID and password rules for each security type', () => {
    expect(evaluate('wifi', { ssid: '  ' }).errors.ssid).toBe('Enter the network name (SSID).');
    expect(evaluate('wifi', { ssid: 'x'.repeat(33), password: 'password1' }).errors.ssid).toMatch(/32 bytes/);
    expect(evaluate('wifi', { ssid: 'Home', password: '' }).errors.password).toBe('Enter the Wi-Fi password.');
    expect(evaluate('wifi', { ssid: 'Home', password: 'short' }).errors.password).toMatch(/8 to 63/);
    expect(evaluate('wifi', { ssid: 'Home', password: 'a'.repeat(64) }).errors).toEqual({}); // 64 hex digits = raw key
    expect(evaluate('wifi', { ssid: 'Home', password: 'abc', encryption: 'WEP' }).errors.password).toMatch(/WEP keys/);
    expect(evaluate('wifi', { ssid: 'Home', password: 'abcde', encryption: 'WEP' }).errors).toEqual({});
  });
});

describe('describeContent', () => {
  it('summarises entries without revealing Wi-Fi passwords', () => {
    expect(describeContent('url', { url: 'https://example.com' })).toBe('example.com');
    expect(describeContent('wifi', { ssid: 'Home', password: 'secret123' })).toBe('Home');
  });
});

it('every type has default fields and a payload builder', () => {
  for (const type of Object.keys(DEFAULT_FIELDS)) {
    expect(typeof buildPayload(type, DEFAULT_FIELDS[type])).toBe('string');
  }
});
