// Saves recently generated QR codes in the browser's localStorage so they survive a page refresh.

export const RECENT_KEY = 'qr-studio:recent';
export const MAX_RECENT = 12;

const isEntry = (item) =>
  item && typeof item === 'object' && typeof item.id === 'string' && typeof item.type === 'string' && item.fields && item.style;

export function loadRecent(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isEntry).slice(0, MAX_RECENT) : [];
  } catch {
    return []; // Corrupted data or storage blocked (e.g. private mode): start fresh.
  }
}

/** Writes the list. If the browser's storage is full, drops the oldest entries until it fits. */
export function saveRecent(list, storage = globalThis.localStorage) {
  for (let count = list.length; count >= 0; count--) {
    try {
      storage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, count)));
      return count;
    } catch {
      // Quota exceeded: try again with one entry fewer.
    }
  }
  return 0;
}

/** Two entries are the same QR code when their type, content and style all match. */
export function entrySignature({ type, fields, style }) {
  return JSON.stringify([type, fields, style]);
}

/** Puts the entry first, removing any older copy of the same QR code, and caps the list length. */
export function addRecent(list, entry) {
  const signature = entrySignature(entry);
  return [entry, ...list.filter((item) => entrySignature(item) !== signature)].slice(0, MAX_RECENT);
}
