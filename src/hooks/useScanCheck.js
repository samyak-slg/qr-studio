import { useEffect, useState } from 'react';
import { decodeQrFromBlob } from '../lib/image.js';

/**
 * After the design stops changing, renders the same PNG the user would download and tries to
 * read it back with a QR decoder. Returns 'idle' | 'checking' | 'pass' | 'fail'.
 */
export function useScanCheck(qrRef, options, expectedText, delay = 400) {
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (!options) {
      setStatus('idle');
      return undefined;
    }
    let cancelled = false;
    setStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const blob = await qrRef.current.getRawData('png');
        const decoded = await decodeQrFromBlob(blob);
        if (!cancelled) setStatus(decoded === expectedText ? 'pass' : 'fail');
      } catch {
        if (!cancelled) setStatus('fail');
      }
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [qrRef, options, expectedText, delay]);

  return status;
}
