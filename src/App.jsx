import { useCallback, useMemo, useState } from 'react';
import ContentPanel from './components/ContentPanel.jsx';
import Icon from './components/Icon.jsx';
import PreviewPanel from './components/PreviewPanel.jsx';
import RecentPanel from './components/RecentPanel.jsx';
import StylePanel from './components/StylePanel.jsx';
import { useRecent } from './hooks/useRecent.js';
import { useTheme } from './hooks/useTheme.js';
import { useToast } from './hooks/useToast.js';
import { createId } from './lib/format.js';
import { DEFAULT_FIELDS, QR_TYPES, describeContent, evaluateContent } from './lib/qrTypes.js';
import { getQrLayout, getReliabilityWarnings } from './lib/reliability.js';
import { DEFAULT_STYLE, toQROptions } from './lib/style.js';

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [type, setType] = useState('url');
  const [fields, setFields] = useState(DEFAULT_FIELDS); // Kept per type, so switching tabs never loses input.
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const [touched, setTouched] = useState({});
  const recent = useRecent();
  const { toast, showToast } = useToast();

  const values = fields[type];
  const { errors, payload } = useMemo(
    () => evaluateContent(type, values, style.errorCorrectionLevel),
    [type, values, style.errorCorrectionLevel],
  );
  const layout = useMemo(() => (payload ? getQrLayout(payload, style) : null), [payload, style]);
  const warnings = useMemo(() => getReliabilityWarnings(style, layout), [style, layout]);
  const drawable = Boolean(layout) && layout.dotSize >= 1;
  const qrOptions = useMemo(() => (drawable ? toQROptions(style, payload) : null), [drawable, style, payload]);

  const typeLabel = QR_TYPES.find((t) => t.id === type).label;
  const emptyMessage = payload
    ? 'There’s too much content for this size. Increase the size or reduce the margin.'
    : Object.values(errors)[0];

  const changeField = useCallback(
    (name, value) => setFields((prev) => ({ ...prev, [type]: { ...prev[type], [name]: value } })),
    [type],
  );
  const blurField = useCallback((name) => setTouched((prev) => ({ ...prev, [`${type}.${name}`]: true })), [type]);
  const changeStyle = useCallback((patch) => setStyle((prev) => ({ ...prev, ...patch })), []);

  const saveToRecent = (thumbnail) =>
    recent.add({ id: createId(), createdAt: Date.now(), type, fields: values, style, thumbnail });

  const loadFromRecent = (item) => {
    setType(item.type);
    setFields((prev) => ({ ...prev, [item.type]: { ...DEFAULT_FIELDS[item.type], ...item.fields } }));
    setStyle({ ...DEFAULT_STYLE, ...item.style });
    showToast('Loaded into the editor', 'info');
    document.getElementById('main')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="app">
      <header className="header">
        <a className="brand" href="/">
          <img src="/favicon.svg" alt="" width="36" height="36" />
          <span>
            <strong>QR Studio</strong>
            <small>QR code generator &amp; designer</small>
          </span>
        </a>
        <button
          type="button"
          className="icon-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
      </header>

      <p className="intro">
        Make a QR code for a link, text, email, phone number or Wi-Fi network. Style it, check that it scans, and download
        it. Everything happens in your browser; nothing is uploaded.
      </p>

      <main id="main">
        {/* The sticky preview can only slide within .layout, so Recent sits outside it. */}
        <div className="layout">
          <div className="area-content">
            <ContentPanel
              type={type}
              values={values}
              errors={errors}
              touched={touched}
              errorCorrectionLevel={style.errorCorrectionLevel}
              onTypeChange={setType}
              onFieldChange={changeField}
              onFieldBlur={blurField}
            />
          </div>
          <div className="area-preview">
            <PreviewPanel
              options={qrOptions}
              payload={payload}
              style={style}
              layout={layout}
              warnings={warnings}
              emptyMessage={emptyMessage}
              label={`QR code for ${typeLabel}: ${describeContent(type, values)}`}
              fileName={`qr-${type}`}
              onSave={saveToRecent}
              onNotify={showToast}
            />
          </div>
          <div className="area-style">
            <StylePanel style={style} onChange={changeStyle} onReset={() => setStyle(DEFAULT_STYLE)} onNotify={showToast} />
          </div>
        </div>
        <div className="area-recent">
          <RecentPanel items={recent.items} onLoad={loadFromRecent} onRemove={recent.remove} onClear={recent.clear} />
        </div>
      </main>

      <footer className="footer">
        Built with React, Vite and qr-code-styling for the GDG on Campus SRM recruitment task.
      </footer>

      <div className="toast-region" aria-live="polite">
        {toast && (
          <div key={toast.key} className={`toast toast-${toast.kind}`}>
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}
