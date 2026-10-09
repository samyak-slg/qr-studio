// Tests the app the way a user would: clicking tabs, typing, picking presets and saving.
// The real QR drawing needs a full browser, so it's replaced by a lightweight stand-in here.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App.jsx';
import { RECENT_KEY } from './lib/recentStorage.js';

vi.mock('qr-code-styling', () => ({
  default: class FakeQRCodeStyling {
    constructor(options) {
      this.options = options;
    }
    append(container) {
      const canvas = document.createElement('canvas');
      canvas.dataset.testid = 'qr';
      container.appendChild(canvas);
    }
    getRawData() {
      // Carry the encoded data along so the fake decoder below can "read" it back.
      return Promise.resolve(new Blob([this.options.data], { type: 'image/png' }));
    }
    download() {
      return Promise.resolve();
    }
  },
}));

vi.mock('./lib/image.js', () => ({
  decodeQrFromBlob: async (blob) => {
    const byteString = await blob.text();
    return new TextDecoder().decode(Uint8Array.from(byteString, (c) => c.charCodeAt(0)));
  },
  blobToThumbnail: async () => 'data:image/png;base64,AAAA',
  fileToLogoDataUrl: async () => 'data:image/png;base64,LOGO',
  copyPngToClipboard: async () => {},
}));

const tab = (name) => screen.getByRole('tab', { name });
const downloadButton = () => screen.getByRole('button', { name: /download png/i });

describe('QR Studio', () => {
  it('shows a ready-to-use URL QR code that passes the scan check', async () => {
    render(<App />);
    expect(screen.getByLabelText('Website URL')).toHaveValue('https://gdg.community.dev');
    expect(downloadButton()).toBeEnabled();
    expect(await screen.findByText('Scans correctly', {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it('shows the right inputs for every QR type', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(tab('Text'));
    expect(screen.getByRole('textbox', { name: 'Text' })).toBeInTheDocument();

    await user.click(tab('Email'));
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();

    await user.click(tab('Phone'));
    expect(screen.getByLabelText('Phone number')).toBeInTheDocument();

    await user.click(tab('Wi-Fi'));
    expect(screen.getByLabelText('Network name (SSID)')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Security'), 'nopass');
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
  });

  it('keeps what you typed when switching between types', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(tab('Phone'));
    await user.type(screen.getByLabelText('Phone number'), '+91 98765 43210');
    await user.click(tab('URL'));
    await user.click(tab('Phone'));
    expect(screen.getByLabelText('Phone number')).toHaveValue('+91 98765 43210');
  });

  it('explains invalid input and blocks downloads until it is fixed', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(tab('Email'));
    const email = screen.getByLabelText('Email address');
    await user.type(email, 'name@');
    await user.tab();

    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription('Enter a valid email address, like name@example.com.');
    expect(downloadButton()).toBeDisabled();

    await user.type(email, 'example.com');
    expect(email).not.toHaveAttribute('aria-invalid');
    expect(downloadButton()).toBeEnabled();
  });

  it('applies a preset and still lets you change settings afterwards', async () => {
    const user = userEvent.setup();
    render(<App />);
    const presets = within(screen.getByRole('group', { name: 'Style presets' }));
    expect(presets.getByRole('button', { name: 'Classic' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(presets.getByRole('button', { name: 'Ocean' }));
    expect(presets.getByRole('button', { name: 'Ocean' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Dots (start)')).toHaveValue('#0369a1');

    const bg = screen.getByLabelText('Background');
    await user.clear(bg);
    await user.type(bg, '#ffffff');
    expect(presets.getByRole('button', { name: 'Ocean' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('Dots (start)')).toHaveValue('#0369a1');
  });

  it('warns about designs that may not scan', async () => {
    const user = userEvent.setup();
    render(<App />);
    const fg = screen.getByLabelText('Dots');
    await user.clear(fg);
    await user.type(fg, '#eeeeee');
    expect(screen.getByText(/very low contrast/i)).toBeInTheDocument();
  });

  it('raises error correction to H when a logo is added', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('radio', { name: /M/ })).toBeChecked();
    const file = new File(['logo'], 'logo.png', { type: 'image/png' });
    await user.upload(document.querySelector('input[type="file"]'), file);
    expect(await screen.findByAltText('Uploaded logo')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /H/ })).toBeChecked();
  });

  it('saves QR codes to Recent, keeps them after a refresh, and loads them back', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.click(tab('Phone'));
    await user.type(screen.getByLabelText('Phone number'), '+91 98765 43210');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('button', { name: /load phone qr code/i })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(RECENT_KEY))).toHaveLength(1);

    unmount(); // Simulate closing the page...
    render(<App />); // ...and opening it again.
    expect(tab('URL')).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('button', { name: /load phone qr code/i }));
    expect(tab('Phone')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Phone number')).toHaveValue('+91 98765 43210');

    await user.click(screen.getByRole('button', { name: /delete phone qr code/i }));
    expect(screen.queryByRole('button', { name: /load phone qr code/i })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(RECENT_KEY))).toHaveLength(0);
  });

  it('switches between light and dark themes and remembers the choice', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(document.documentElement.dataset.theme).toBe('light');
    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('qr-studio:theme')).toBe('dark');
  });
});
