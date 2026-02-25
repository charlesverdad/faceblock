# Faceblock - Technical Architecture

## 1. System Architecture

```
+-----------------------------------------------------------------------+
|                          BROWSER (Client-Side Only)                    |
|                                                                        |
|  +------------------+     +-------------------+     +----------------+ |
|  |   UI Layer       |     |  Processing Core  |     |  ML Engine     | |
|  |                  |     |                   |     |                | |
|  | - index.html     |     | - processor.js    |     | - detector.js  | |
|  | - styles.css     |     | - effects.js      |     |                | |
|  | - app.js         |     | - canvas-utils.js |     | face-api.js    | |
|  | - ui.js          |     |                   |     | (via CDN)      | |
|  |                  |     |                   |     |                | |
|  | [File Input]  ---------->[Image Loader] -------->| TF.js Backend  | |
|  | [Mode Select]    |     |                   |     | (WebGL/WASM)   | |
|  | [Preview Canvas] |<----| [Effect Pipeline] |<----| [Detections]   | |
|  | [Download Btn]   |     |                   |     |                | |
|  +------------------+     +-------------------+     +----------------+ |
|                                                                        |
|  +------------------------------------------------------------------+ |
|  |                     Browser Cache (HTTP)                          | |
|  |  - tiny_face_detector_model (~190KB)                              | |
|  |  - face_landmark_68_model (~350KB)                                | |
|  |  Total: ~540KB, cached after first load                           | |
|  +------------------------------------------------------------------+ |
|                                                                        |
|  Network: ZERO after initial page + model load                         |
+-----------------------------------------------------------------------+
```

## 2. Technology Decisions

### 2.1 Face Detection: @vladmandic/face-api v1.7.14

**Why this library:**
- Maintained fork of the original face-api.js (unmaintained since 2020)
- Provides face detection (bounding boxes), 68-point landmarks (needed for eye-bar mode), and face expressions
- Runs on TensorFlow.js, which auto-selects WebGL > WASM > CPU backend
- TinyFaceDetector + 68-point landmarks = ~540KB total model size
- Battle-tested for client-side face detection

**Why not MediaPipe:** MediaPipe Face Mesh provides 468 landmarks but has a more complex setup, larger models, and a migrating API. face-api.js is simpler and sufficient for this use case.

**CDN Sources:**
```
Library: https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/dist/face-api.esm-nobundle.js
Models:  https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model/
```

### 2.2 Image Manipulation: Canvas 2D API

- Gaussian blur via native `ctx.filter = 'blur(Npx)'`
- Pixelation via downscale + upscale with `imageSmoothingEnabled = false`
- All compositing, clipping, and drawing are first-class Canvas operations
- No additional library needed
- OffscreenCanvas available as future optimization for Web Worker processing

### 2.3 Framework: Vanilla JavaScript (ES Modules)

- Single-screen tool with straightforward state
- ES modules provide clean organization without a bundler
- No build step: edit-and-refresh development, copy-and-serve deployment
- Can be opened via `file://` or any static server
- Total JS payload ~50KB (excluding face-api.js loaded from CDN)

### 2.4 Styling: Vanilla CSS with Custom Properties

- CSS custom properties for theming (dark mode support)
- Modern CSS: Grid, Flexbox, `aspect-ratio`, container queries
- Mobile-first responsive layout
- No preprocessor or CSS framework needed

## 3. Data Flow Pipeline

```
Step 1: IMAGE INPUT
  User selects file via <input>, drag-and-drop, paste, or camera capture
  ↓
Step 2: IMAGE LOADING
  FileReader → new Image() → draw to hidden <canvas>
  EXIF orientation correction applied (critical for mobile photos)
  Image optionally downscaled for detection (max 1024px longest edge)
  Original full-resolution preserved separately
  ↓
Step 3: FACE DETECTION (automatic)
  Canvas passed to face-api.js:
    faceapi.detectAllFaces(canvas, TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.5
    })).withFaceLandmarks()
  Returns: Array<{ detection: { box }, landmarks: FaceLandmarks68 }>
  ↓
Step 4: USER REVIEW
  Detected faces shown with bounding boxes on preview canvas
  User can: adjust sensitivity, add/remove faces, select modes, adjust intensity
  ↓
Step 5: EFFECT APPLICATION
  For each face, apply selected effect on FULL-RESOLUTION canvas
  Detection coordinates scaled from preview to full-res
  ↓
Step 6: EXPORT
  canvas.toBlob('image/png' or 'image/jpeg', quality)
  URL.createObjectURL(blob) → <a download> → file saved
  ↓
Step 7: CLEANUP
  URL.revokeObjectURL(), canvas references cleared
```

## 4. Face Detection Pipeline

### 4.1 Model Loading Strategy

Models loaded on-demand (not on page load) when the user first selects an image:

```javascript
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model';

async function loadModels(onProgress) {
  onProgress('Loading face detector...');
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  onProgress('Loading landmark detector...');
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
}
```

After first load, models are cached by the browser's HTTP cache.

### 4.2 Detection Configuration

| Sensitivity | inputSize | scoreThreshold | Use Case |
|-------------|-----------|----------------|----------|
| Low | 320 | 0.7 | Fast, fewer false positives |
| Medium (default) | 416 | 0.5 | Balanced |
| High | 608 | 0.3 | Catches small/angled faces, more false positives |

### 4.3 Manual Face Regions

Users can click/tap to add face regions the detector missed. Manual regions use a default bounding box (15% of image smallest dimension) centered on the click point. Clicking an existing detection removes it.

## 5. Performance Optimization

### 5.1 Detection Downscaling

Large photos (e.g., 4000x3000 = 12MP) are downscaled to max 1024px for detection, then coordinates are scaled back to full resolution for effect application. This reduces detection time from 2-5s to 100-300ms.

### 5.2 Lazy Model Loading

Initial page load is just HTML + CSS + JS (~50KB). Models (~540KB) load only when needed. Browser cache ensures they load once across sessions.

### 5.3 Memory Management

- Maximum processing dimension: 4096px (configurable). Larger images are downscaled.
- Object URLs revoked immediately after use
- Canvas references nulled when loading new images
- Warning displayed for images exceeding 20MP

### 5.4 Performance Targets

| Operation | Desktop | Mobile |
|-----------|---------|--------|
| Model load (first time) | <500ms (WiFi) | <2s (4G) |
| Model load (cached) | 0ms | 0ms |
| Face detection (1024px) | <200ms | <500ms |
| Effect application (per face) | <50ms | <200ms |
| Total pipeline | <1s | <3s |

## 6. EXIF Orientation Handling

Mobile photos frequently have EXIF orientation metadata. The implementation:

1. Reads EXIF orientation from file bytes (first ~64KB) using a minimal parser (~50 lines of DataView code)
2. Applies correct canvas transform before drawing
3. Ensures photos from phones render correctly regardless of orientation

## 7. Browser Compatibility

### 7.1 Feature Matrix

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| ES Modules | 61+ | 60+ | 11+ | 16+ |
| Canvas 2D | All | All | All | All |
| `ctx.filter` (blur) | 52+ | 49+ | **16+** | 79+ |
| WebGL (TF.js) | All | All | 15+ | All |
| WASM (TF.js fallback) | 57+ | 52+ | 11+ | 16+ |
| File API / FileReader | All | All | All | All |
| `<a download>` | All | All | 14.5+ | All |

### 7.2 Safari Considerations

- `ctx.filter` supported from Safari 16+ (Sep 2022). For Safari 15, blur falls back to JavaScript-based implementation.
- `<a download>` works from Safari 14.5+ but may prompt differently than desktop.

## 8. Privacy Architecture

### 8.1 Zero Network Traffic

After initial load, the application makes **zero** network requests:
- No analytics scripts
- No external API calls
- No cookies
- Images never leave the browser
- Processed images created via `canvas.toBlob()` and downloaded via `URL.createObjectURL()`

### 8.2 Content Security Policy

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self' https://cdn.jsdelivr.net;
               style-src 'self' 'unsafe-inline';
               img-src 'self' blob: data:;
               connect-src 'self' https://cdn.jsdelivr.net;
               font-src 'self';
               object-src 'none';
               base-uri 'self';">
```

This CSP makes the zero-network claim verifiable:
- Scripts only from self and jsdelivr (for face-api.js)
- Images from self, blob: (processed), data: (loaded photos)
- Connections only to self and jsdelivr (model loading, cached after first use)
- All other external connections blocked

### 8.3 Privacy Notice

A persistent, non-dismissible notice states:
> "Your photos never leave your device. All processing happens locally in your browser."

This is architecturally enforced, not just claimed.

## 9. Deployment

### 9.1 Static Hosting

No build step. Deployment is copying files to any static host:

- **GitHub Pages**: Push to main, enable Pages in settings, add `.nojekyll`
- **Netlify / Vercel / Cloudflare Pages**: Point to repo root, no build command needed
- **Any web server**: Copy files, serve as static

### 9.2 Cache Strategy

| File | Cache Policy |
|------|-------------|
| `index.html` | `no-cache` (always check for updates) |
| `*.js`, `*.css` | `public, max-age=31536000, immutable` |
| Model files (if bundled) | `public, max-age=31536000, immutable` |

## 10. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| face-api.js / TF.js version conflict | Runtime errors | Use ESM no-bundle build (includes TF.js inline), pin to exact version |
| Mobile memory pressure (12MP = ~48MB) | Browser crash | Limit max dimension to 4096px, release references aggressively, warn on >20MP |
| Face detection misses | Poor UX | Sensitivity slider, manual face selection, document limitations |
| Safari Canvas filter support | Blur breaks on Safari 15 | Runtime detection, fallback to JS-based blur |
| Emoji rendering inconsistency | Visual differences across OS | Acceptable for v1; v2 could bundle Noto Color Emoji PNGs |
| CDN unavailability | Models can't load | Browser caches after first load; option to bundle models locally |

## 11. Module Responsibilities

| Module | Responsibilities | Key Exports |
|--------|-----------------|-------------|
| `app.js` | Entry point, initialization, wiring | `init()` |
| `ui.js` | DOM events, state transitions, rendering | `setupUI()`, `renderPreview()`, `showLoading()` |
| `detector.js` | Face detection wrapper | `loadModels()`, `detectFaces()` |
| `processor.js` | Pipeline orchestrator | `processImage()` |
| `effects.js` | Effect implementations | `applyBlur()`, `applyPixelate()`, `applyBlackBarEyes()`, etc. |
| `canvas-utils.js` | Canvas helpers | `loadImage()`, `createDetectionCanvas()`, `exportAsBlob()` |
| `constants.js` | Configuration, effect registry | `EFFECTS`, `MODEL_BASE_URL`, `MAX_IMAGE_DIMENSION` |
