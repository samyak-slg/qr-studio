import { useMemo, useState } from 'react';
import Icon from './Icon.jsx';
import { ColorField, RangeField, Segmented, SelectField, Switch } from './controls.jsx';
import { useQRCode } from '../hooks/useQRCode.js';
import { fileToLogoDataUrl } from '../lib/image.js';
import {
  CORNER_DOT_TYPES,
  CORNER_SQUARE_TYPES,
  DEFAULT_STYLE,
  DOT_TYPES,
  ERROR_LEVELS,
  MARGIN_LIMITS,
  PRESETS,
  SIZE_LIMITS,
  matchesPreset,
  toQROptions,
} from '../lib/style.js';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

function PresetThumb({ preset }) {
  const options = useMemo(
    () => toQROptions({ ...DEFAULT_STYLE, ...preset.style }, 'GDG SRM', { size: 64, type: 'svg' }),
    [preset],
  );
  const { containerRef } = useQRCode(options);
  return <span ref={containerRef} className="preset-thumb" aria-hidden="true" />;
}

function PresetPicker({ style, onApply }) {
  return (
    <div className="presets" role="group" aria-label="Style presets">
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className="preset"
          aria-pressed={matchesPreset(style, preset)}
          onClick={() => onApply(preset.style)}
        >
          <PresetThumb preset={preset} />
          <span>{preset.name}</span>
        </button>
      ))}
    </div>
  );
}

function LogoField({ style, onChange, onNotify }) {
  const [error, setError] = useState('');

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // Lets the same file be picked again after removing it.
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file (PNG, JPG, SVG or WebP).');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError('The logo must be smaller than 2 MB.');
      return;
    }
    try {
      const logo = await fileToLogoDataUrl(file);
      setError('');
      const needsMoreCorrection = style.errorCorrectionLevel === 'L' || style.errorCorrectionLevel === 'M';
      onChange(needsMoreCorrection ? { logo, errorCorrectionLevel: 'H' } : { logo });
      if (needsMoreCorrection) onNotify('Error correction raised to H so the code still scans with a logo.', 'info');
    } catch {
      setError('That image couldn’t be read. Try a PNG or JPG.');
    }
  };

  return (
    <div className="stack">
      <div className="logo-row">
        {style.logo ? (
          <img className="logo-preview" src={style.logo} alt="Uploaded logo" />
        ) : (
          <span className="logo-preview empty" aria-hidden="true">
            <Icon name="upload" />
          </span>
        )}
        <div className="logo-actions">
          <label className="btn btn-small file-btn">
            <input type="file" accept="image/*" className="visually-hidden" onChange={handleFile} />
            <Icon name="upload" size={16} />
            {style.logo ? 'Replace logo' : 'Upload logo'}
          </label>
          {style.logo && (
            <button type="button" className="btn btn-small btn-ghost" onClick={() => onChange({ logo: null })}>
              <Icon name="trash" size={16} />
              Remove
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {style.logo && (
        <div className="grid-2">
          <RangeField
            id="logo-size"
            label="Logo size"
            min={0.1}
            max={0.5}
            step={0.05}
            value={style.logoSize}
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={(logoSize) => onChange({ logoSize })}
          />
          <RangeField
            id="logo-margin"
            label="Logo padding"
            min={0}
            max={20}
            step={1}
            value={style.logoMargin}
            format={(v) => `${v}px`}
            onChange={(logoMargin) => onChange({ logoMargin })}
          />
          <Switch
            id="logo-hide-dots"
            label="Clear dots behind logo"
            checked={style.hideBackgroundDots}
            onChange={(hideBackgroundDots) => onChange({ hideBackgroundDots })}
          />
        </div>
      )}
    </div>
  );
}

export default function StylePanel({ style, onChange, onReset, onNotify }) {
  return (
    <section className="card" aria-labelledby="style-title">
      <div className="card-head">
        <h2 id="style-title">
          <span className="step">2</span> Design
        </h2>
        <button type="button" className="btn btn-small btn-ghost" onClick={onReset}>
          <Icon name="reset" size={16} />
          Reset
        </button>
      </div>

      <h3 className="section-title">Presets</h3>
      <PresetPicker style={style} onApply={onChange} />
      <p className="field-hint">Pick a preset, then fine-tune anything below.</p>

      <h3 className="section-title">Colours</h3>
      <div className="grid-2">
        <ColorField id="fg-color" label={style.useGradient ? 'Dots (start)' : 'Dots'} value={style.fgColor} onChange={(fgColor) => onChange({ fgColor })} />
        <ColorField id="bg-color" label="Background" value={style.bgColor} onChange={(bgColor) => onChange({ bgColor })} />
      </div>
      <div className="stack-sm">
        <Switch id="use-gradient" label="Gradient dots" checked={style.useGradient} onChange={(useGradient) => onChange({ useGradient })} />
        {style.useGradient && (
          <div className="grid-2 nested">
            <ColorField id="gradient-color" label="Dots (end)" value={style.gradientColor} onChange={(gradientColor) => onChange({ gradientColor })} />
            <Segmented
              name="gradient-type"
              label="Gradient type"
              value={style.gradientType}
              options={[
                { value: 'linear', label: 'Linear' },
                { value: 'radial', label: 'Radial' },
              ]}
              onChange={(gradientType) => onChange({ gradientType })}
            />
            {style.gradientType === 'linear' && (
              <RangeField
                id="gradient-rotation"
                label="Angle"
                min={0}
                max={360}
                step={15}
                value={style.gradientRotation}
                format={(v) => `${v}°`}
                onChange={(gradientRotation) => onChange({ gradientRotation })}
              />
            )}
          </div>
        )}
        <Switch id="custom-eyes" label="Different colour for corners" checked={style.customEyes} onChange={(customEyes) => onChange({ customEyes })} />
        {style.customEyes && (
          <div className="grid-2 nested">
            <ColorField id="corner-square-color" label="Corner frame" value={style.cornerSquareColor} onChange={(cornerSquareColor) => onChange({ cornerSquareColor })} />
            <ColorField id="corner-dot-color" label="Corner centre" value={style.cornerDotColor} onChange={(cornerDotColor) => onChange({ cornerDotColor })} />
          </div>
        )}
      </div>

      <h3 className="section-title">Pattern</h3>
      <div className="grid-3">
        <SelectField id="dot-type" label="Dot style" value={style.dotType} options={DOT_TYPES} onChange={(dotType) => onChange({ dotType })} />
        <SelectField
          id="corner-square-type"
          label="Corner frame"
          value={style.cornerSquareType}
          options={CORNER_SQUARE_TYPES}
          onChange={(cornerSquareType) => onChange({ cornerSquareType })}
        />
        <SelectField
          id="corner-dot-type"
          label="Corner centre"
          value={style.cornerDotType}
          options={CORNER_DOT_TYPES}
          onChange={(cornerDotType) => onChange({ cornerDotType })}
        />
      </div>

      <h3 className="section-title">Size &amp; quality</h3>
      <div className="grid-2">
        <RangeField
          id="qr-size"
          label="Size"
          {...SIZE_LIMITS}
          value={style.size}
          format={(v) => `${v} px`}
          onChange={(size) => onChange({ size })}
        />
        <RangeField
          id="qr-margin"
          label="Margin"
          {...MARGIN_LIMITS}
          value={style.margin}
          format={(v) => `${v} px`}
          onChange={(margin) => onChange({ margin })}
        />
      </div>
      <Segmented
        name="error-correction"
        label="Error correction"
        value={style.errorCorrectionLevel}
        options={ERROR_LEVELS}
        onChange={(errorCorrectionLevel) => onChange({ errorCorrectionLevel })}
        hint="Higher levels survive more damage (or a logo) but make the code denser."
      />

      <h3 className="section-title">Logo</h3>
      <LogoField style={style} onChange={onChange} onNotify={onNotify} />
    </section>
  );
}
