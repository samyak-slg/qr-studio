import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';

// jsdom (the fake browser used by tests) doesn't implement these, so we add harmless stand-ins.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  });
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});
