import { useState } from 'react';
import Icon from './Icon.jsx';
import { useQRCode } from '../hooks/useQRCode.js';
import { useScanCheck } from '../hooks/useScanCheck.js';
import { blobToThumbnail, copyPngToClipboard } from '../lib/image.js';

const SCAN_BADGES = {
  checking: { icon: 'scan', label: 'Checking scan…', className: 'badge-neutral' },
  pass: { icon: 'check', label: 'Scans correctly', className: 'badge-success' },
  fail: { icon: 'alert', label: 'Scan failed', className: 'badge-danger' },
};

const NOTICE_ICONS = { danger: 'alert', warning: 'alert', info: 'info' };

function Notices({ items }) {
  if (items.length === 0) return null;
  return (
    <ul className="notices" aria-label="Scan reliability tips">
      {items.map((item) => (
        <li key={item.id} className={`notice notice-${item.level}`}>
          <Icon name={NOTICE_ICONS[item.level]} size={16} />
          <span>{item.message}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PreviewPanel({ options, payload, style, layout, warnings, emptyMessage, label, fileName, onSave, onNotify }) {
  const { containerRef, qrRef, error } = useQRCode(options);
  const scan = useScanCheck(qrRef, options, payload);
  const [busy, setBusy] = useState(false);
  const ready = Boolean(options) && !error;
  const badge = ready ? SCAN_BADGES[scan] : null;

  const notices =
    ready && scan === 'fail'
      ? [
          {
            id: 'scan',
            level: 'danger',
            message: 'Our built-in scanner couldn’t read this design. Raise the contrast, margin or error correction, and test with your phone before using it.',
          },
          ...warnings,
        ]
      : warnings;

  // Runs a download/copy, then remembers the QR code in "Recent".
  const run = async (task, successMessage, failureMessage) => {
    const qr = qrRef.current;
    if (!qr || busy) return;
    setBusy(true);
    try {
      await task(qr);
      onSave(await blobToThumbnail(await qr.getRawData('png')));
      if (successMessage) onNotify(successMessage);
    } catch {
      onNotify(failureMessage, 'error');
    } finally {
      setBusy(false);
    }
  };

  const download = (extension) =>
    run((qr) => qr.download({ name: fileName, extension }), `Downloaded ${fileName}.${extension}`, 'The download failed. Please try again.');

  const copy = () =>
    run(
      (qr) => copyPngToClipboard(() => qr.getRawData('png')),
      'QR code copied. Paste it anywhere.',
      'Your browser blocked copying images. Use Download instead.',
    );

  const save = () => run(async () => {}, 'Saved to Recent');

  return (
    <section className="card preview" aria-labelledby="preview-title">
      <div className="card-head">
        <h2 id="preview-title">Preview</h2>
        {badge && (
          <span className={`badge ${badge.className}`} role="status">
            <Icon name={badge.icon} size={14} />
            {badge.label}
          </span>
        )}
      </div>

      <div className="qr-stage">
        <div
          ref={containerRef}
          className="qr-canvas"
          role="img"
          aria-label={label}
          hidden={!ready}
          style={{ '--qr-display': `${style.size}px` }}
        />
        {!ready && (
          <div className="qr-empty">
            <Icon name="scan" size={40} />
            <p>{error ? 'This QR code can’t be drawn. Try shorter content or a larger size.' : emptyMessage}</p>
          </div>
        )}
      </div>

      <p className="qr-meta">
        {style.size} × {style.size} px
        {layout && ` · ${layout.moduleCount} × ${layout.moduleCount} modules`} · Error correction {style.errorCorrectionLevel}
      </p>

      <div className="actions">
        <button type="button" className="btn btn-primary" disabled={!ready || busy} onClick={() => download('png')}>
          <Icon name="download" />
          Download PNG
        </button>
        <button type="button" className="btn" disabled={!ready || busy} onClick={() => download('svg')}>
          <Icon name="download" size={16} />
          SVG
        </button>
        <button type="button" className="btn" disabled={!ready || busy} onClick={copy}>
          <Icon name="copy" size={16} />
          Copy
        </button>
        <button type="button" className="btn" disabled={!ready || busy} onClick={save}>
          <Icon name="bookmark" size={16} />
          Save
        </button>
      </div>

      <Notices items={ready ? notices : []} />
    </section>
  );
}
