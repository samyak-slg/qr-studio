// Reusable, accessible form controls.
import { useState } from 'react';

export function Field({ id, label, hint, error, optional, children }) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
        {optional && <span className="optional">optional</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="field-hint">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function describedBy(id, error, hint) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export function TextField({ id, label, hint, error, optional, multiline = false, ...inputProps }) {
  const Tag = multiline ? 'textarea' : 'input';
  return (
    <Field id={id} label={label} hint={hint} error={error} optional={optional}>
      <Tag
        id={id}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        {...inputProps}
      />
    </Field>
  );
}

export function SelectField({ id, label, value, options, onChange, hint }) {
  return (
    <Field id={id} label={label} hint={hint}>
      <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

/** Native colour picker plus a hex text box that stay in sync. */
export function ColorField({ id, label, value, onChange }) {
  // While the user is typing an incomplete hex code we show their draft instead of the real value.
  const [draft, setDraft] = useState(null);
  const shown = draft ?? value;
  const invalid = draft !== null && !HEX_PATTERN.test(draft);

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className={`color-input${invalid ? ' is-invalid' : ''}`}>
        <input
          type="color"
          aria-label={`${label}: colour picker`}
          value={value}
          onChange={(e) => {
            setDraft(null);
            onChange(e.target.value.toLowerCase());
          }}
        />
        <input
          id={id}
          type="text"
          value={shown}
          maxLength={7}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={invalid || undefined}
          onChange={(e) => {
            let next = e.target.value.trim();
            if (next && !next.startsWith('#')) next = `#${next}`;
            if (HEX_PATTERN.test(next)) {
              setDraft(null);
              onChange(next.toLowerCase());
            } else {
              setDraft(next);
            }
          }}
          onBlur={() => setDraft(null)}
        />
      </div>
    </div>
  );
}

export function RangeField({ id, label, value, min, max, step, onChange, format = (v) => v }) {
  return (
    <div className="field">
      <div className="field-row">
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
        <output htmlFor={id} className="range-value">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function Switch({ id, label, checked, onChange }) {
  return (
    <label className="switch" htmlFor={id}>
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch-track" aria-hidden="true">
        <span className="switch-thumb" />
      </span>
      <span>{label}</span>
    </label>
  );
}

/** A row of radio buttons styled as a segmented control. */
export function Segmented({ name, label, options, value, onChange, hint }) {
  return (
    <fieldset className="field segmented-field">
      <legend className="field-label">{label}</legend>
      <div className="segmented">
        {options.map((option) => (
          <label key={option.value} className="segmented-option">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>
              {option.label}
              {option.sub && <small>{option.sub}</small>}
            </span>
          </label>
        ))}
      </div>
      {hint && <p className="field-hint">{hint}</p>}
    </fieldset>
  );
}
