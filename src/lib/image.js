// Browser image helpers: loading, resizing, and reading a QR code back out of an image.

import jsQR from 'jsqr';

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = src;
  });
}

async function blobToImage(blob) {
  const url = URL.createObjectURL(blob);
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function drawToCanvas(img, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, width, height);
  return { canvas, ctx };
}

/** Shrinks an uploaded logo to at most `maxSize` px so it stays small enough to save locally. */
export async function fileToLogoDataUrl(file, maxSize = 256) {
  const img = await blobToImage(file);
  const width = img.naturalWidth || maxSize;
  const height = img.naturalHeight || maxSize;
  const scale = Math.min(1, maxSize / Math.max(width, height));
  const { canvas } = drawToCanvas(img, Math.round(width * scale), Math.round(height * scale));
  return canvas.toDataURL('image/png');
}

/** Small preview image of a QR code for the "Recent" list. */
export async function blobToThumbnail(blob, size = 96) {
  const img = await blobToImage(blob);
  const { canvas } = drawToCanvas(img, size, size);
  return canvas.toDataURL('image/png');
}

/** Tries to read a QR code from an image, like a phone camera would. Returns the text or null. */
export async function decodeQrFromBlob(blob) {
  const img = await blobToImage(blob);
  const { ctx } = drawToCanvas(img, img.naturalWidth, img.naturalHeight);
  const { data, width, height } = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
  const result = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' });
  return result ? result.data : null;
}

/** Copies a PNG to the clipboard. Accepts a Blob promise so Safari keeps the user's click permission. */
export async function copyPngToClipboard(getBlob) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error('Clipboard images are not supported in this browser');
  }
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': getBlob() })]);
  } catch (error) {
    if (error?.name === 'NotAllowedError') throw error;
    // Some browsers only accept a ready Blob, not a promise.
    const blob = await getBlob();
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  }
}
