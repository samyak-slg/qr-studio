# Testing

## Automated tests

Run them with:

```bash
npm test
```

**81 tests in 5 files, all passing.**

| File | What it checks |
| --- | --- |
| `src/lib/qrTypes.test.js` | Payload format and validation for **every QR type**: URL (bare domains, spaces, missing TLD, non-http schemes), text (blank, too long for the error-correction level, multi-byte characters), email (mailto encoding, invalid addresses), phone (formatting removed, letters rejected, digit limits), Wi-Fi (escaping, open networks, WPA/WEP password rules, 32-byte SSID limit). |
| `src/lib/roundtrip.test.js` | **Downloaded-code verification:** each QR type is encoded into a real QR matrix, drawn as pixels and decoded again with jsQR at all four error-correction levels. The decoded text must match exactly, including Hindi and emoji. A further test covers the centre of an H-level code, as a logo would, and checks that it still decodes. |
| `src/lib/reliability.test.js` | **Customization and scan reliability:** WCAG contrast values, no warnings for the default or any preset, and warnings for low contrast, gradient contrast, inverted colours, logos at low error correction, oversized logos, a missing quiet zone, small modules and very dense codes. |
| `src/lib/recentStorage.test.js` | **Local persistence:** newest entry first, duplicates removed, 12-entry cap, save-and-reload round trip, corrupted data ignored, oldest entries dropped when storage is full. |
| `src/App.test.jsx` | **The whole app, used like a person would:** each type shows the right inputs, typed values survive switching tabs, invalid input shows an accessible error and disables Download, presets apply and can still be edited, warnings appear, a logo raises error correction to H, Recent survives an unmount and remount (a "refresh") and loads back into the editor, and the theme toggles and is remembered. |

## Manual testing

Tested in Microsoft Edge (Chromium) on Windows 11, at desktop (1280×900 and 1440×1000) and mobile (375×812 and 390×844) sizes.

| # | Test | Result |
| --- | --- | --- |
| 1 | URL `https://gdg.community.dev` generates and the scan badge shows *Scans correctly* | ✅ |
| 2 | Text with Hindi and emoji (`नमस्ते GDG 👋`) scans back exactly | ✅ |
| 3 | Email with subject `Hi & welcome` and a two-line message scans correctly | ✅ |
| 4 | Phone `+91 (98765) 43-210` becomes `tel:+919876543210` and scans correctly | ✅ |
| 5 | Wi-Fi SSID `Café; Home "5G"` with password `pa;ss:wo,rd\123` is escaped properly and scans correctly | ✅ |
| 6 | Invalid inputs: empty URL, `not a url`, `example`, `ftp://…`, `name@`, `98abc`, 5-character WPA password, 2,400 bytes of text at level M. Each shows a clear message, and Download is disabled | ✅ |
| 7 | All six presets pass the scan test and highlight as selected | ✅ |
| 8 | After choosing a preset, colours, gradient, patterns, size, margin and error correction can all still be changed | ✅ |
| 9 | Light dots on a dark background shows "Low contrast" and "inverted" warnings, and the scan test fails | ✅ |
| 10 | Margin 0 shows the quiet-zone warning | ✅ |
| 11 | Uploading a logo raises error correction from M to H automatically. A 50% logo shows a warning, and the code still scans | ✅ |
| 12 | **Downloaded files:** the PNG and SVG were captured, checked to be 512×512, and decoded back to the exact Wi-Fi payload | ✅ |
| 13 | Saved codes appear in Recent. After a full page reload they're still there, and clicking one restores the type, fields, design and logo | ✅ |
| 14 | Downloading the same design twice keeps a single Recent entry | ✅ |
| 15 | The theme toggle switches light/dark and is remembered after a reload | ✅ |
| 16 | No horizontal scrolling at 375 px wide. One column on mobile, two columns with a sticky preview on desktop. The preview never overlaps the Recent section | ✅ |
| 17 | The type tabs can be changed with the arrow keys, and every control is reachable with Tab | ✅ |

### Check it with your phone

The built-in scan test uses a software decoder. For a final check, point your phone camera at the preview for a few designs (Classic, GDG, Grape, and one with a logo) and confirm each one opens the right link, email, number or Wi-Fi network.
