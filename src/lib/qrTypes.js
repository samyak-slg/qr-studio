// The kinds of content a QR code can hold: their fields, validation rules,
// and the exact text ("payload") that gets encoded into the code.

export const QR_TYPES = [
  { id: 'url', label: 'URL', icon: 'link' },
  { id: 'text', label: 'Text', icon: 'text' },
  { id: 'email', label: 'Email', icon: 'mail' },
  { id: 'phone', label: 'Phone', icon: 'phone' },
  { id: 'wifi', label: 'Wi-Fi', icon: 'wifi' },
];

export const DEFAULT_FIELDS = {
  url: { url: 'https://gdg.community.dev' },
  text: { text: '' },
  email: { to: '', subject: '', body: '' },
  phone: { phone: '' },
  wifi: { ssid: '', password: '', encryption: 'WPA', hidden: false },
};

export const WIFI_ENCRYPTIONS = [
  { value: 'WPA', label: 'WPA / WPA2 / WPA3' },
  { value: 'WEP', label: 'WEP (old routers)' },
  { value: 'nopass', label: 'None (open network)' },
];

// The most bytes a QR code can store (version 40, byte mode) at each error-correction level.
export const BYTE_CAPACITY = { L: 2953, M: 2331, Q: 1663, H: 1273 };

export function utf8Length(value) {
  return new TextEncoder().encode(value).length;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/;

/** Adds https:// when the user typed a bare domain such as "example.com". */
export function normalizeUrl(raw) {
  const value = raw.trim();
  if (!value) return '';
  return /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`;
}

/** Removes the spaces, brackets and dashes people use to format phone numbers. */
export function normalizePhone(raw) {
  return raw.trim().replace(/[\s().-]/g, '');
}

/** Characters with a special meaning in the Wi-Fi QR format must be escaped with a backslash. */
export function escapeWifi(value) {
  return value.replace(/([\\;,":])/g, '\\$1');
}

const validators = {
  url({ url }) {
    const value = url.trim();
    if (!value) return { url: 'Enter a website address.' };
    if (/\s/.test(value)) return { url: 'A URL can’t contain spaces.' };
    let parsed;
    try {
      parsed = new URL(normalizeUrl(value));
    } catch {
      return { url: 'This doesn’t look like a valid URL.' };
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { url: 'Only http:// and https:// links are supported.' };
    }
    const host = parsed.hostname;
    const isIpAddress = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
    const hasDomain = /\.([a-z]{2,}|xn--[a-z\d-]+)$/i.test(host);
    if (host !== 'localhost' && !isIpAddress && !hasDomain) {
      return { url: 'Include a full domain, like example.com.' };
    }
    return {};
  },

  text({ text }) {
    return text.trim() ? {} : { text: 'Enter some text to encode.' };
  },

  email({ to }) {
    const value = to.trim();
    if (!value) return { to: 'Enter an email address.' };
    if (!EMAIL_PATTERN.test(value)) return { to: 'Enter a valid email address, like name@example.com.' };
    return {};
  },

  phone({ phone }) {
    const value = normalizePhone(phone);
    if (!value) return { phone: 'Enter a phone number.' };
    if (!/^\+?\d+$/.test(value)) return { phone: 'Use digits only, with an optional + and country code.' };
    const digits = value.replace('+', '').length;
    if (digits < 3 || digits > 15) return { phone: 'Phone numbers have between 3 and 15 digits.' };
    return {};
  },

  wifi({ ssid, password, encryption }) {
    const errors = {};
    if (!ssid.trim()) errors.ssid = 'Enter the network name (SSID).';
    else if (utf8Length(ssid) > 32) errors.ssid = 'Network names can be at most 32 bytes long.';

    if (encryption === 'WPA') {
      const isRawKey = /^[0-9a-f]{64}$/i.test(password);
      if (!password) errors.password = 'Enter the Wi-Fi password.';
      else if (!isRawKey && (password.length < 8 || password.length > 63)) {
        errors.password = 'WPA passwords are 8 to 63 characters long.';
      }
    } else if (encryption === 'WEP') {
      const isHexKey = /^([0-9a-f]{10}|[0-9a-f]{26})$/i.test(password);
      if (!password) errors.password = 'Enter the Wi-Fi password.';
      else if (!isHexKey && password.length !== 5 && password.length !== 13) {
        errors.password = 'WEP keys are 5 or 13 characters, or 10 or 26 hex digits.';
      }
    }
    return errors;
  },
};

const builders = {
  url: ({ url }) => normalizeUrl(url),
  text: ({ text }) => text,
  email: ({ to, subject, body }) => {
    const params = [];
    if (subject.trim()) params.push(`subject=${encodeURIComponent(subject.trim())}`);
    if (body.trim()) params.push(`body=${encodeURIComponent(body)}`);
    return `mailto:${to.trim()}${params.length ? `?${params.join('&')}` : ''}`;
  },
  phone: ({ phone }) => `tel:${normalizePhone(phone)}`,
  wifi: ({ ssid, password, encryption, hidden }) => {
    let payload = `WIFI:T:${encryption};S:${escapeWifi(ssid)};`;
    if (encryption !== 'nopass') payload += `P:${escapeWifi(password)};`;
    if (hidden) payload += 'H:true;';
    return `${payload};`;
  },
};

export function buildPayload(type, fields) {
  return builders[type](fields);
}

/**
 * Validates the fields for a QR type and builds the payload.
 * Returns { errors, payload }; payload is '' whenever there are errors.
 */
export function evaluateContent(type, fields, errorCorrectionLevel = 'M') {
  const errors = validators[type](fields);
  if (Object.keys(errors).length > 0) return { errors, payload: '' };

  const payload = buildPayload(type, fields);
  const bytes = utf8Length(payload);
  const max = BYTE_CAPACITY[errorCorrectionLevel];
  if (bytes > max) {
    return {
      errors: {
        capacity: `Too much content: ${bytes} bytes, but error correction ${errorCorrectionLevel} fits at most ${max}. Shorten it or pick a lower error-correction level.`,
      },
      payload: '',
    };
  }
  return { errors: {}, payload };
}

/** A short, human-readable label for a saved QR code. Never shows a Wi-Fi password. */
export function describeContent(type, fields) {
  switch (type) {
    case 'url':
      return normalizeUrl(fields.url).replace(/^https?:\/\//, '');
    case 'text':
      return fields.text.trim().replace(/\s+/g, ' ');
    case 'email':
      return fields.to.trim();
    case 'phone':
      return fields.phone.trim();
    case 'wifi':
      return fields.ssid;
    default:
      return '';
  }
}
