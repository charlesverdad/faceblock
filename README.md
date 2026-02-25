# Faceblock

**Private face anonymization that runs entirely in your browser.**

Faceblock detects and blocks faces in photos using 10 different effects — blur, pixelate, eye bars, emoji, and more. Everything runs client-side. Your photos never leave your device.

**[Launch Faceblock](https://charlesverdad.github.io/faceblock/app.html)**

## Features

- **100% Client-Side** — No backend, no uploads, no tracking. All processing happens in your browser using WebGL.
- **10 Blocking Effects** — Blur, Pixelate, Eye Bar, Blackout, Emoji, Solid Color, Glitch, Swirl, Silhouette, Redact.
- **AI Face Detection** — SSD MobileNet v1 via [face-api.js](https://github.com/vladmandic/face-api) detects faces at any angle, distance, and size. Handles 100+ faces in group photos.
- **Batch Processing** — Upload up to 20 photos at once. Auto-detects faces across all images. Download individually or as a ZIP.
- **Manual Control** — Draw, move, and resize face boxes. Tap to select, drag to reposition, resize handle for precise control.
- **Adjustable Sensitivity** — Low, medium, and high detection sensitivity presets for different photo types.
- **Mobile Friendly** — Responsive design with touch support, paste from clipboard, and camera capture.
- **Export Options** — PNG or JPEG output with adjustable quality.

## Tech Stack

- Vanilla JavaScript (ES Modules, no build step)
- [face-api.js](https://github.com/vladmandic/face-api) — Face detection and 68-point landmarks
- [JSZip](https://stuk.github.io/jszip/) — Batch ZIP downloads
- Canvas 2D API — Image manipulation and effects
- Zero dependencies beyond the two CDN libraries above

## Project Structure

```
faceblock/
├── index.html        # Landing page
├── app.html          # The app
├── landing.css       # Landing page styles
├── styles.css        # App styles
├── js/
│   ├── app.js        # Main controller, multi-photo state
│   ├── ui.js         # DOM, events, canvas interaction
│   ├── processor.js  # Detection + effect pipeline
│   ├── detector.js   # face-api.js wrapper
│   ├── effects.js    # 10 blocking effect implementations
│   ├── canvas-utils.js  # Image loading, EXIF, export
│   └── constants.js  # Config and effect registry
└── docs/             # Architecture and design docs
```

## Running Locally

Serve the project root with any static file server:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .

# Or just open index.html in a browser (some features may require a server for ES modules)
```

## Privacy

Faceblock enforces privacy through architecture, not policy:

- **No backend** — The entire app is static HTML/CSS/JS
- **No network requests** after initial page load (models are cached by the browser)
- **Content Security Policy** restricts all connections to `self` and the CDN
- **No analytics, no cookies, no tracking**

## License

MIT
