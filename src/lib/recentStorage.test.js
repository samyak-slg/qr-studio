import { describe, expect, it } from 'vitest';
import { MAX_RECENT, RECENT_KEY, addRecent, loadRecent, saveRecent } from './recentStorage.js';

const entry = (id, text = id) => ({
  id,
  createdAt: Date.now(),
  type: 'text',
  fields: { text },
  style: { fgColor: '#000000' },
  thumbnail: 'data:image/png;base64,AAAA',
});

describe('recent QR codes', () => {
  it('adds new entries to the front', () => {
    const list = addRecent(addRecent([], entry('a')), entry('b'));
    expect(list.map((e) => e.id)).toEqual(['b', 'a']);
  });

  it('moves a re-saved QR code to the front instead of duplicating it', () => {
    let list = [entry('a', 'same'), entry('b', 'other')];
    list = addRecent(list, entry('c', 'same'));
    expect(list.map((e) => e.id)).toEqual(['c', 'b']);
  });

  it(`keeps at most ${MAX_RECENT} entries`, () => {
    let list = [];
    for (let i = 0; i < MAX_RECENT + 5; i++) list = addRecent(list, entry(String(i)));
    expect(list).toHaveLength(MAX_RECENT);
    expect(list[0].id).toBe(String(MAX_RECENT + 4));
  });

  it('survives a page refresh (save then load from localStorage)', () => {
    const list = [entry('a'), entry('b')];
    saveRecent(list);
    expect(loadRecent()).toEqual(list);
  });

  it('ignores corrupted or unexpected stored data', () => {
    localStorage.setItem(RECENT_KEY, '{not json');
    expect(loadRecent()).toEqual([]);
    localStorage.setItem(RECENT_KEY, JSON.stringify([{ nope: true }, entry('ok')]));
    expect(loadRecent().map((e) => e.id)).toEqual(['ok']);
  });

  it('drops the oldest entries when storage is full', () => {
    let saved = null;
    const tinyStorage = {
      setItem(key, value) {
        if (JSON.parse(value).length > 2) throw new DOMException('Quota exceeded', 'QuotaExceededError');
        saved = value;
      },
    };
    expect(saveRecent([entry('a'), entry('b'), entry('c')], tinyStorage)).toBe(2);
    expect(JSON.parse(saved).map((e) => e.id)).toEqual(['a', 'b']);
  });
});
