import { useEffect, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';

/**
 * Draws a QR code into the element attached to `containerRef` and redraws it whenever
 * `options` changes. `qrRef.current` holds the instance used for downloads, so the
 * downloaded file is always generated from exactly the same settings as the preview.
 */
export function useQRCode(options) {
  const containerRef = useRef(null);
  const qrRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.replaceChildren();
    qrRef.current = null;
    if (!options) return;

    try {
      // A fresh instance per change avoids qr-code-styling keeping stale options (e.g. a removed logo).
      const qr = new QRCodeStyling(options);
      qr.append(container);
      qrRef.current = qr;
      setError(null);
    } catch (err) {
      setError(typeof err === 'string' ? err : err?.message || 'Could not draw the QR code.');
    }
  }, [options]);

  return { containerRef, qrRef, error };
}
