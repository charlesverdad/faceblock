# Faceblock - Project Overview

## What is Faceblock?

Faceblock is a completely static, client-side web application that lets users load photos and obscure faces using various blocking/anonymization effects. No data ever leaves the user's device. No account, no server, no tracking.

## Core Principles

1. **100% Client-Side** - All face detection and image processing runs in the browser using TensorFlow.js and the Canvas API. Zero network traffic after the initial page and model load.
2. **Zero-Friction** - No signup, no cookies, no tutorials. Drop a photo, pick a mode, download.
3. **Privacy by Architecture** - Photos never leave the device. This is enforced by Content Security Policy, not just promised.
4. **Mobile + Desktop** - Responsive, touch-friendly design that works on all modern browsers and screen sizes.
5. **No Build Step** - Vanilla JS with ES modules. Edit and refresh. Deploy by copying files.

## Target Users

- Journalists anonymizing sources in photos
- Social media users protecting friends' privacy
- HR/compliance teams redacting faces in documents
- Parents sharing group photos while protecting other children's identities
- Anyone who needs quick, private face anonymization

## Key Features

- **Automatic face detection** using TinyFaceDetector (face-api.js)
- **10 blocking modes**: Blur, Pixelate, Black Bar (eyes), Blackout, Emoji, Solid Color, Glitch, Swirl, Silhouette, Redact
- **Per-face control** - Apply different effects to different faces
- **Manual face selection** - Add/remove face regions by clicking
- **Adjustable intensity** - Sliders for blur radius, pixel size, etc.
- **Detection sensitivity** - Tune for small/angled faces
- **Full-resolution export** - PNG or JPEG with quality control
- **Drag & drop, paste, camera** - Multiple input methods
- **Keyboard shortcuts** for power users
- **Works offline** after first visit (models are cached)

## Technology Stack

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Face Detection | `@vladmandic/face-api` v1.7.14 | Maintained fork of face-api.js, 68-point landmarks, ~540KB models |
| ML Backend | TensorFlow.js (WebGL/WASM/CPU) | Auto-selects best backend per device |
| Image Processing | Canvas 2D API | Native, fast, no additional libraries |
| Framework | Vanilla JS (ES Modules) | Zero build step, minimal overhead |
| Styling | Vanilla CSS with custom properties | No preprocessor needed |
| Deployment | Any static host | GitHub Pages, Netlify, Vercel, Cloudflare Pages |

## Project Structure

```
faceblock/
├── index.html              # Single-page entry point
├── styles.css              # All styles, responsive layout
├── favicon.svg             # Inline SVG favicon
├── .nojekyll               # GitHub Pages compatibility
├── js/
│   ├── app.js              # Entry module, initialization
│   ├── ui.js               # DOM manipulation, event handlers
│   ├── detector.js         # Face detection wrapper (face-api.js)
│   ├── processor.js        # Pipeline orchestrator
│   ├── effects.js          # All blocking effect implementations
│   ├── canvas-utils.js     # Canvas helpers (load, resize, export, EXIF)
│   └── constants.js        # Configuration, effect registry
├── docs/
│   ├── project_overview.md # This file
│   ├── tech_architecture.md
│   ├── ux_design.md
│   └── feature_spec.md
└── README.md
```

## Browser Support

| Browser | Minimum Version |
|---------|----------------|
| Chrome / Edge | 79+ (Jan 2020) |
| Firefox | 78+ (Jun 2020) |
| Safari | 15+ (Sep 2021) |
| Samsung Internet | 13+ (Nov 2020) |

Covers ~97%+ of global browser usage.

## Related Documents

- [Technical Architecture](./tech_architecture.md) - System design, data flow, performance
- [UX Design](./ux_design.md) - User flows, wireframes, accessibility
- [Feature Specification](./feature_spec.md) - Blocking modes, parameters, implementation details
