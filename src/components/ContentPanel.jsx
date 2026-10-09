import { useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { Field, SelectField, Switch, TextField, describedBy } from './controls.jsx';
import { BYTE_CAPACITY, QR_TYPES, WIFI_ENCRYPTIONS, utf8Length } from '../lib/qrTypes.js';

function TypeTabs({ value, onChange }) {
  const tabRefs = useRef([]);

  // Arrow keys move between tabs, as screen-reader users expect from a tab list.
  const handleKeyDown = (event, index) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (index + step + QR_TYPES.length) % QR_TYPES.length;
    onChange(QR_TYPES[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="type-tabs" role="tablist" aria-label="QR code type">
      {QR_TYPES.map((type, index) => {
        const selected = type.id === value;
        return (
          <button
            key={type.id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${type.id}`}
            aria-selected={selected}
            aria-controls="content-fields"
            tabIndex={selected ? 0 : -1}
            className="type-tab"
            onClick={() => onChange(type.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            <Icon name={type.icon} />
            <span>{type.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function PasswordField({ id, label, value, error, hint, onChange, onBlur }) {
  const [visible, setVisible] = useState(false);
  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <div className="input-with-button">
        <input
          id={id}
          className="input"
          type={visible ? 'text' : 'password'}
          value={value}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          onChange={onChange}
          onBlur={onBlur}
        />
        <button
          type="button"
          className="icon-btn inset"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} />
        </button>
      </div>
    </Field>
  );
}

export default function ContentPanel({ type, values, errors, touched, errorCorrectionLevel, onTypeChange, onFieldChange, onFieldBlur }) {
  // Errors appear once the user has left a field, so they aren't scolded while still typing.
  const errorFor = (name) => (touched[`${type}.${name}`] ? errors[name] : undefined);
  const bind = (name) => ({
    id: `${type}-${name}`,
    value: values[name],
    error: errorFor(name),
    onChange: (e) => onFieldChange(name, e.target.value),
    onBlur: () => onFieldBlur(name),
  });

  const capacity = BYTE_CAPACITY[errorCorrectionLevel];

  return (
    <section className="card" aria-labelledby="content-title">
      <div className="card-head">
        <h2 id="content-title">
          <span className="step">1</span> Content
        </h2>
      </div>

      <TypeTabs value={type} onChange={onTypeChange} />

      <form
        id="content-fields"
        role="tabpanel"
        aria-labelledby={`tab-${type}`}
        className="stack"
        noValidate
        onSubmit={(e) => e.preventDefault()}
      >
        {type === 'url' && (
          <TextField
            {...bind('url')}
            label="Website URL"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://example.com"
            hint="We add https:// if you leave it out."
          />
        )}

        {type === 'text' && (
          <TextField
            {...bind('text')}
            label="Text"
            multiline
            rows={5}
            placeholder="Anything you like: a note, a code, a message…"
            hint={`${utf8Length(values.text)} / ${capacity} bytes at error correction ${errorCorrectionLevel}`}
          />
        )}

        {type === 'email' && (
          <>
            <TextField
              {...bind('to')}
              label="Email address"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@example.com"
            />
            <TextField {...bind('subject')} label="Subject" optional placeholder="Hello!" />
            <TextField {...bind('body')} label="Message" optional multiline rows={3} placeholder="Pre-filled email text" />
          </>
        )}

        {type === 'phone' && (
          <TextField
            {...bind('phone')}
            label="Phone number"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            hint="Include the country code so it works from anywhere."
          />
        )}

        {type === 'wifi' && (
          <>
            <TextField {...bind('ssid')} label="Network name (SSID)" autoComplete="off" spellCheck={false} placeholder="My Home Wi-Fi" />
            <SelectField
              id="wifi-encryption"
              label="Security"
              value={values.encryption}
              options={WIFI_ENCRYPTIONS}
              onChange={(value) => onFieldChange('encryption', value)}
            />
            {values.encryption !== 'nopass' && <PasswordField {...bind('password')} label="Password" />}
            <Switch
              id="wifi-hidden"
              label="Hidden network"
              checked={values.hidden}
              onChange={(checked) => onFieldChange('hidden', checked)}
            />
            <p className="field-hint">Nothing is uploaded. If you save this code, it’s stored only in this browser.</p>
          </>
        )}

        {errors.capacity && (
          <p className="form-error" role="alert">
            {errors.capacity}
          </p>
        )}
      </form>
    </section>
  );
}
