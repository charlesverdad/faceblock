# Faceblock - Feature Specification

## 1. Blocking Modes

### 1.1 Gaussian Blur

| Property | Value |
|----------|-------|
| ID | `blur` |
| Icon | Circle with blur effect |
| Requires Landmarks | No |
| Adjustable Parameter | Blur radius (1-50px, scaled to face size) |
| Default Intensity | 70% |

**Visual:** Smooth, progressive blur that obscures facial features while maintaining the general shape and color tone of the face.

**Implementation:**
```javascript
// Clip to elliptical face region
ctx.save();
ctx.beginPath();
ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
ctx.clip();
// Apply native CSS filter
const blurPx = Math.max(1, Math.round(intensity * (faceWidth / 100)));
ctx.filter = `blur(${blurPx}px)`;
ctx.drawImage(source, sx, sy, sw, sh, sx, sy, sw, sh);
ctx.restore();
```

**Edge Cases:**
- Faces at image edges: Clip region naturally bounds to canvas
- Small faces: Minimum blur radius of 2px to ensure some obscuring

---

### 1.2 Pixelate / Mosaic

| Property | Value |
|----------|-------|
| ID | `pixelate` |
| Icon | Grid of squares |
| Requires Landmarks | No |
| Adjustable Parameter | Block size (4-64px) |
| Default Intensity | 50% (16px blocks) |

**Visual:** Classic mosaic/pixelation effect. Face becomes a grid of solid-colored squares, like a low-resolution image.

**Implementation:**
```javascript
// Downscale face region to tiny canvas
const scaledW = Math.ceil(faceWidth / blockSize);
const scaledH = Math.ceil(faceHeight / blockSize);
offCtx.drawImage(source, fx, fy, fw, fh, 0, 0, scaledW, scaledH);
// Upscale back with no smoothing
ctx.imageSmoothingEnabled = false;
ctx.drawImage(offscreen, 0, 0, scaledW, scaledH, fx, fy, fw, fh);
```

**Edge Cases:**
- Very small faces: Minimum 2x2 blocks to maintain some grid effect
- Non-square faces: Block size consistent in both axes

---

### 1.3 Black Bar (Eyes Only)

| Property | Value |
|----------|-------|
| ID | `black-bar-eyes` |
| Icon | Sunglasses |
| Requires Landmarks | Yes (falls back to estimated position) |
| Adjustable Parameter | Bar thickness multiplier (0.5-2.0x) |
| Default Intensity | 1.0x |

**Visual:** A solid black rectangle drawn across the eye region. Classic "identity protection" look from journalism and legal contexts.

**Implementation:**
```javascript
// With landmarks: use eye points 36-47
const leftEye = landmarks.positions.slice(36, 42);
const rightEye = landmarks.positions.slice(42, 48);
const eyeBox = getBoundingBox([...leftEye, ...rightEye]);
// Extend horizontally, apply thickness
ctx.fillStyle = '#000';
ctx.fillRect(eyeBox.x - padding, eyeBar.y, eyeBox.width + padding*2, barHeight);

// Without landmarks: estimate at 30% from top of face box
const barY = faceBox.y + faceBox.height * 0.3;
ctx.fillRect(faceBox.x, barY, faceBox.width, faceBox.height * 0.15);
```

**Edge Cases:**
- Profile faces (one eye visible): Bar still drawn across estimated eye line
- Tilted faces: Bar rotated to match eye angle when landmarks available

---

### 1.4 Full Face Blackout

| Property | Value |
|----------|-------|
| ID | `blackout` |
| Icon | Solid black circle |
| Requires Landmarks | No |
| Adjustable Parameter | Shape (ellipse or rectangle), color |
| Default | Black ellipse |

**Visual:** Entire face region filled with a solid color (default black). Complete, unambiguous anonymization.

**Implementation:**
```javascript
ctx.fillStyle = color;
ctx.beginPath();
ctx.ellipse(cx, cy, rx * 1.1, ry * 1.1, 0, 0, Math.PI * 2);
ctx.fill();
```

**Edge Cases:**
- Padding: Ellipse extended 10% beyond detected bounds for complete coverage

---

### 1.5 Emoji Overlay

| Property | Value |
|----------|-------|
| ID | `emoji` |
| Icon | Smiley face |
| Requires Landmarks | No |
| Adjustable Parameter | Emoji selection, size multiplier |
| Default | 😀, 1.0x size |

**Visual:** A large emoji rendered over the face, sized to cover the entire face bounding box. Fun, lighthearted anonymization.

**Available Emojis:**
😀 😎 🤡 👽 🤖 💀 🎭 🐱 🐶 🦊 🐻 🐼 🌟 ❤️ 🔥 👀 🙈 🎃 😈 🥸

**Implementation:**
```javascript
const size = Math.max(faceWidth, faceHeight) * sizeMultiplier * 1.2;
ctx.font = `${size}px serif`;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText(emoji, cx, cy);
```

**Edge Cases:**
- Emoji rendering varies by OS (Apple vs Google vs Windows). Acceptable for v1.
- Size includes 20% padding to ensure full coverage

---

### 1.6 Solid Color Block

| Property | Value |
|----------|-------|
| ID | `solid-color` |
| Icon | Colored square |
| Requires Landmarks | No |
| Adjustable Parameter | Color picker (any hex color) |
| Default | #FF0000 (red) |

**Visual:** Face region filled with a user-chosen solid color. Useful for artistic or branded anonymization.

**Implementation:**
```javascript
ctx.fillStyle = userColor;
ctx.beginPath();
ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
ctx.fill();
```

---

### 1.7 Glitch Effect

| Property | Value |
|----------|-------|
| ID | `glitch` |
| Icon | Zigzag/disrupted square |
| Requires Landmarks | No |
| Adjustable Parameter | Glitch intensity (displacement amount) |
| Default Intensity | 60% |

**Visual:** Digital glitch art effect. The face region appears corrupted with horizontal displacement slices, color channel shifting, and random noise bands.

**Implementation:**
```javascript
// Get face region pixel data
const imageData = ctx.getImageData(fx, fy, fw, fh);
// Horizontal slice displacement
for (let y = 0; y < fh; y++) {
  if (Math.random() < 0.3) {  // 30% of rows glitched
    const shift = Math.floor((Math.random() - 0.5) * intensity * fw * 0.2);
    // Shift row pixels by 'shift' amount
    shiftRow(imageData, y, shift);
  }
}
// RGB channel separation on some slices
for (let y = 0; y < fh; y += Math.floor(fh / 8)) {
  const sliceH = Math.floor(Math.random() * fh * 0.1);
  separateChannels(imageData, y, sliceH, intensity);
}
ctx.putImageData(imageData, fx, fy);
```

---

### 1.8 Swirl / Distort

| Property | Value |
|----------|-------|
| ID | `swirl` |
| Icon | Spiral |
| Requires Landmarks | No |
| Adjustable Parameter | Swirl angle (90°-720°) |
| Default Intensity | 60% (360° rotation) |

**Visual:** Face region is warped in a spiral pattern radiating from the center. Features become unrecognizable while maintaining a visually interesting abstract look.

**Implementation:**
```javascript
// Pixel-by-pixel remapping
const srcData = ctx.getImageData(fx, fy, fw, fh);
const dstData = ctx.createImageData(fw, fh);
for (let y = 0; y < fh; y++) {
  for (let x = 0; x < fw; x++) {
    const dx = x - fw/2, dy = y - fh/2;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const maxDist = Math.sqrt(fw*fw + fh*fh) / 2;
    const angle = (1 - dist/maxDist) * swirlAngle;
    const srcX = Math.cos(angle)*dx - Math.sin(angle)*dy + fw/2;
    const srcY = Math.sin(angle)*dx + Math.cos(angle)*dy + fh/2;
    // Bilinear interpolation from srcX, srcY
    copyPixel(srcData, srcX, srcY, dstData, x, y);
  }
}
ctx.putImageData(dstData, fx, fy);
```

---

### 1.9 Silhouette

| Property | Value |
|----------|-------|
| ID | `silhouette` |
| Icon | Head outline |
| Requires Landmarks | Yes (for better shape, falls back to ellipse) |
| Adjustable Parameter | Color (default: dark gray), outline toggle |
| Default | #2a2a2a with subtle outline |

**Visual:** A dark, head-shaped silhouette replaces the face. When landmarks are available, the silhouette follows the jaw/forehead line for a more natural shape.

**Implementation:**
```javascript
// With landmarks: draw path through jaw + forehead points
ctx.beginPath();
const jaw = landmarks.positions.slice(0, 17);  // Jawline points
const forehead = estimateForehead(landmarks);    // Extrapolated above eyebrows
ctx.moveTo(jaw[0].x, jaw[0].y);
jaw.forEach(p => ctx.lineTo(p.x, p.y));
forehead.reverse().forEach(p => ctx.lineTo(p.x, p.y));
ctx.closePath();
ctx.fillStyle = color;
ctx.fill();

// Without landmarks: ellipse fallback
ctx.beginPath();
ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
ctx.fillStyle = color;
ctx.fill();
```

---

### 1.10 Redact (Official Document Style)

| Property | Value |
|----------|-------|
| ID | `redact` |
| Icon | Strikethrough rectangle |
| Requires Landmarks | No |
| Adjustable Parameter | None (fixed style for authenticity) |
| Default | Black rectangle with slight texture |

**Visual:** Mimics official government/legal document redaction. A solid black rectangle with slight rough edges and a subtle paper-through-marker texture.

**Implementation:**
```javascript
// Solid black rectangle (not ellipse - redaction is always rectangular)
ctx.fillStyle = '#000';
ctx.fillRect(fx - 2, fy - 2, fw + 4, fh + 4);
// Add subtle texture (horizontal scan lines)
ctx.fillStyle = 'rgba(255,255,255,0.03)';
for (let y = fy; y < fy + fh; y += 3) {
  ctx.fillRect(fx, y, fw, 1);
}
// Rough edges
for (let i = 0; i < 20; i++) {
  const ex = fx + Math.random() * fw;
  const ey = fy + (Math.random() < 0.5 ? 0 : fh);
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(ex - 2, ey - 2, 4, 4);
}
```

---

## 2. Face Detection Features

### 2.1 Automatic Detection

- Runs immediately after image upload
- Uses TinyFaceDetector with 68-point landmarks
- Default: medium sensitivity (inputSize=416, scoreThreshold=0.5)

### 2.2 Sensitivity Control

Three-step slider:

| Level | inputSize | scoreThreshold | Best For |
|-------|-----------|----------------|----------|
| Low | 320 | 0.7 | Fast results, clear front-facing faces |
| Medium | 416 | 0.5 | General use (default) |
| High | 608 | 0.3 | Small faces, crowds, profile angles |

Changing sensitivity re-runs detection and preserves manually added regions.

### 2.3 Manual Face Selection

- **Add**: Click/tap empty area on image to add a face region
  - Default region: circle, 15% of image's smallest dimension
  - Resizable via drag handles on desktop
- **Remove**: Click/tap existing region to deselect, long-press/right-click to remove
- **Adjust**: Drag edges to resize on desktop

### 2.4 Per-Face Effect Selection

- Default: All faces use the same globally-selected effect
- Tap individual face → mode picker applies to that face only
- UI shows effect icon on each face box
- "Apply to all" button resets to uniform mode

## 3. Image Input Methods

| Method | Platform | Trigger |
|--------|----------|---------|
| File picker | All | Click upload zone or button |
| Drag and drop | Desktop | Drag image file onto page |
| Clipboard paste | All | Ctrl/Cmd+V |
| Camera capture | Mobile | `input[capture="environment"]` |

**Accepted formats:** JPEG, PNG, WebP, HEIC (where browser supports)
**Maximum file size:** 50MB (soft limit with warning)
**EXIF handling:** Orientation corrected before processing

## 4. Export Options

### 4.1 Format Selection

| Format | Quality | Use Case |
|--------|---------|----------|
| PNG | Lossless | Default. Preserves exact quality |
| JPEG | Adjustable (1-100) | Smaller file size when quality is sufficient |

### 4.2 Export Process

1. Effects applied on full-resolution canvas (not preview size)
2. `canvas.toBlob(format, quality)` generates output
3. `URL.createObjectURL(blob)` + `<a download>` triggers save
4. Filename: `faceblock_[original-name].[ext]`

### 4.3 Resolution Handling

- Output matches input resolution (up to 4096px max dimension)
- Images larger than 4096px on any axis are downscaled proportionally
- No upscaling ever applied

## 5. Undo/Redo System

### 5.1 History Stack

- Maintains up to 20 state snapshots
- Each snapshot stores: face regions, per-face effect selections, intensity values
- Does NOT store full image data (too memory-intensive)
- Undo/redo re-applies effects from snapshot state

### 5.2 Tracked Actions

| Action | Creates History Entry |
|--------|---------------------|
| Change global effect mode | Yes |
| Change per-face effect | Yes |
| Adjust intensity | Yes (debounced, one entry per slider release) |
| Add manual face region | Yes |
| Remove face region | Yes |
| Change sensitivity (re-detect) | Yes |

## 6. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `1` through `0` | Select blocking mode 1-10 |
| `[` / `]` | Decrease / increase intensity by 10% |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + S` | Download processed image |
| `Ctrl/Cmd + O` | Open file picker |
| `Ctrl/Cmd + V` | Paste image from clipboard |
| `Delete` | Remove selected face region |
| `A` | Select all faces |
| `Tab` | Cycle through detected faces |
| `Escape` | Deselect all / return to upload |
| `Space` | Toggle before/after preview |
| `?` | Show keyboard shortcuts help |

## 7. Batch Processing (v2)

**Planned for v2:**

- "Add More Photos" button after first image
- Thumbnail strip showing queued images
- Global effect applied to all photos
- Process all → Download as ZIP
- Uses JSZip (client-side) for archive creation

## 8. Additional Features

### 8.1 Before/After Comparison

- Toggle button or spacebar to flip between original and processed
- On desktop: optional slider divider (drag left/right to reveal)

### 8.2 Zoom and Pan (Desktop)

- Mouse wheel to zoom into preview
- Click and drag to pan when zoomed
- Zoom resets on new image load

### 8.3 Dark/Light Theme

- Default: Dark theme (better for photo editing)
- Toggle in header
- Respects `prefers-color-scheme` on first load
- Preference saved to localStorage

### 8.4 About/Help Panel

- Accessible from header `[?]` button
- Slide-in panel (not modal, avoids blocking)
- Contents: How it works, privacy explanation, keyboard shortcuts, credits
- Links to source code (if open source)
