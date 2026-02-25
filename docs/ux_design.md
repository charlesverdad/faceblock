# Faceblock - UX Design Document

## 1. Design Principles

1. **Zero-friction entry.** Upload to processed photo in under 10 seconds. No signup, no cookie banner, no tutorial wall.
2. **Trust through transparency.** Privacy claim visible at all times, verifiable by architecture.
3. **Progressive disclosure.** Simple path first (upload, auto-detect, apply, download). Advanced options revealed when needed.
4. **One-page architecture.** Entire experience on a single page. States transition in place.
5. **Mobile-first, desktop-enhanced.** Core experience designed for portrait phone. Desktop gets spatial layout but no exclusive features.

## 2. User Journey Map

### 2.1 Primary Flow (Happy Path)

```
LAND → UPLOAD → DETECT → REVIEW → ADJUST → DOWNLOAD → DONE
```

| Step | State | User Action | System Response |
|------|-------|-------------|-----------------|
| 1. Land | `empty` | Opens URL | Shows upload zone with privacy notice |
| 2. Upload | `loading` | Drops/selects/pastes photo | Loads image, shows thumbnail |
| 3. Detect | `detecting` | (automatic) | Runs face detection, shows spinner over image |
| 4. Review | `detected` | Sees face boxes | Bounding boxes shown, default effect applied in preview |
| 5. Adjust | `editing` | Changes mode/intensity | Preview updates in real time |
| 6. Download | `exporting` | Clicks download | Full-res processed image saved to device |
| 7. Done | `complete` | Sees success | Option to process another photo |

### 2.2 Alternate Flows

**No faces detected:**
- Show message: "No faces detected. You can manually select areas to block."
- Enable manual selection mode (click/tap to add regions)
- Show sensitivity slider to retry with higher sensitivity

**Multiple faces with different modes:**
- Tap a face box to select it individually
- Selected face shows mode picker
- "Apply to all" checkbox for uniform treatment

**Large image warning:**
- If image > 20MP, show: "Large image detected. Processing may take a moment."
- Optionally offer to downscale for faster processing

## 3. Page Layout

### 3.1 Application States

The UI has one page with multiple states:

```
STATE: empty          STATE: editing            STATE: complete
┌─────────────┐      ┌─────────────┐          ┌─────────────┐
│   Header    │      │   Header    │          │   Header    │
├─────────────┤      ├─────────────┤          ├─────────────┤
│             │      │             │          │             │
│   Upload    │      │   Image     │          │   Image     │
│   Zone      │      │   Preview   │          │   Result    │
│             │      │   + Boxes   │          │             │
│  (drag/drop │      │             │          │             │
│   or click) │      ├─────────────┤          ├─────────────┤
│             │      │  Mode Picker│          │  Download   │
├─────────────┤      │  Intensity  │          │  New Photo  │
│  Privacy    │      │  Download   │          ├─────────────┤
│  Notice     │      ├─────────────┤          │  Privacy    │
└─────────────┘      │  Privacy    │          └─────────────┘
                     └─────────────┘
```

### 3.2 Mobile Layout (< 768px)

Single column, stacked vertically:

```
┌──────────────────────────┐
│  ▫ FACEBLOCK         [?] │  ← Compact header
├──────────────────────────┤
│                          │
│    ┌──────────────────┐  │
│    │                  │  │
│    │  Image Preview   │  │  ← Full-width, aspect-ratio preserved
│    │  (touch to add   │  │
│    │   face regions)  │  │
│    │                  │  │
│    └──────────────────┘  │
│                          │
│  ┌─────┬─────┬─────┐    │
│  │Blur │Pixel│ Bar │    │  ← Scrollable horizontal pill row
│  ├─────┼─────┼─────┤    │
│  │Black│Emoji│Color│    │
│  └─────┴─────┴─────┘    │
│                          │
│  Intensity ═══════●════  │  ← Full-width slider
│                          │
│  ┌──────────────────────┐│
│  │   ⬇ Download Photo   ││  ← Large, thumb-friendly button
│  └──────────────────────┘│
│                          │
│  🔒 Photos stay on your │  ← Privacy notice
│     device. Always.      │
└──────────────────────────┘
```

### 3.3 Desktop Layout (≥ 768px)

Two-column layout with sidebar controls:

```
┌────────────────────────────────────────────────────────┐
│  ▫ FACEBLOCK                              [About] [?]  │
├──────────────────────────────────┬─────────────────────┤
│                                  │                     │
│                                  │  MODE               │
│                                  │  ┌───┐ ┌───┐ ┌───┐ │
│      Image Preview               │  │Blr│ │Pxl│ │Bar│ │
│      (click to add faces)        │  └───┘ └───┘ └───┘ │
│                                  │  ┌───┐ ┌───┐ ┌───┐ │
│                                  │  │Blk│ │Emj│ │Clr│ │
│                                  │  └───┘ └───┘ └───┘ │
│                                  │                     │
│                                  │  INTENSITY          │
│                                  │  ═══════●═══════    │
│                                  │                     │
│                                  │  SENSITIVITY        │
│                                  │  ════●══════════    │
│                                  │                     │
│                                  │  FORMAT             │
│                                  │  (●) PNG  ( ) JPEG  │
│                                  │                     │
│                                  │  ┌─────────────────┐│
│                                  │  │  ⬇ Download     ││
│                                  │  └─────────────────┘│
├──────────────────────────────────┴─────────────────────┤
│  🔒 Your photos never leave your device.               │
└────────────────────────────────────────────────────────┘
```

## 4. Component Inventory

### 4.1 Upload Zone

- **Visual**: Dashed border region with icon and text
- **States**: Default, hover/dragover (highlight), loading
- **Interactions**:
  - Click to open file picker (`accept="image/*"`)
  - Drag and drop image files
  - Paste from clipboard (`Ctrl/Cmd+V`)
  - Camera capture on mobile (`capture="environment"`)
- **Accepted formats**: JPEG, PNG, WebP, HEIC (where supported)
- **Size**: Full viewport width on mobile, centered with max-width on desktop

### 4.2 Image Preview

- **Visual**: The uploaded image displayed with face detection overlays
- **Overlay**: Semi-transparent bounding boxes around detected faces
  - Default: Blue dashed border, labeled "Face 1", "Face 2", etc.
  - Selected face: Solid blue border, thicker
  - Hovered face: Light blue fill
- **Interactions**:
  - Click/tap empty area to add manual face region
  - Click/tap existing box to select (for per-face mode)
  - Long-press or right-click box to remove
- **Scaling**: Image fits within container maintaining aspect ratio (`object-fit: contain`)

### 4.3 Mode Picker

- **Visual**: Grid of labeled, iconized buttons (2x3 on mobile, 3x2 or row on desktop)
- **Each button**: Icon + label, e.g. "🔵 Blur", "🟩 Pixel", "🕶️ Bar"
- **States**: Default, hover, selected (highlighted border/background)
- **Behavior**: Single-select globally, or per-face when a face is selected
- **More modes**: Expandable "+ More" button reveals additional modes (Glitch, Swirl, Silhouette, Redact)

### 4.4 Intensity Slider

- **Visual**: Range input with value label
- **Range**: 0-100%, mapped to effect-specific parameters
- **Thumb**: Large (44px minimum) for touch targets
- **Behavior**: Preview updates in real-time as slider moves (debounced to ~16ms for smooth UX)

### 4.5 Sensitivity Slider

- **Visual**: Range input labeled "Detection Sensitivity"
- **Range**: Low / Medium / High (3 discrete steps)
- **Behavior**: Changing re-runs face detection with new parameters
- **Shown**: Only after initial detection, in an "Advanced" expandable section

### 4.6 Download Button

- **Visual**: Large, high-contrast button with download icon
- **States**: Disabled (no image), Ready, Processing (spinner), Complete (checkmark)
- **Behavior**: Generates full-resolution processed image and triggers browser download
- **Format options**: PNG (default, lossless) or JPEG (with quality slider, 1-100)

### 4.7 Privacy Badge

- **Visual**: Lock icon with text, subtle but always visible
- **Position**: Bottom of page (mobile), footer bar (desktop)
- **Text**: "Your photos never leave your device. All processing happens locally."
- **Non-dismissible**: Always visible, reinforces trust

### 4.8 Loading States

| State | Visual |
|-------|--------|
| Loading models (first use) | Progress text: "Loading AI models..." with animated dots |
| Detecting faces | Spinner overlay on image: "Detecting faces..." |
| Applying effect | Brief spinner on download button |
| Exporting | Button shows "Preparing..." then auto-triggers download |

## 5. Interaction Patterns

### 5.1 Drag and Drop

```
User drags file over page
  → Upload zone highlights (dashed border becomes solid, background tints)
  → Drop text changes to "Drop to process"
User drops file
  → Upload zone shows thumbnail
  → Transitions to detection state
User drags non-image file
  → Upload zone shows error state: "Please drop an image file"
```

### 5.2 Clipboard Paste

```
User presses Ctrl/Cmd+V anywhere on page
  → If clipboard contains image data, load it
  → If no image in clipboard, ignore silently
```

### 5.3 Camera Capture (Mobile)

```
Upload zone shows "Take Photo" option alongside "Choose Photo"
  → Opens device camera
  → Captured photo loaded directly into the app
```

### 5.4 Face Selection

```
Default: All faces selected, global mode applied
Tap a face box:
  → Face becomes individually selected
  → Mode picker applies to that face only
  → Other faces show their current mode dimmed
Tap outside all boxes:
  → Returns to global selection mode
```

### 5.5 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1-6` | Select blocking mode (Blur, Pixel, Bar, Black, Emoji, Color) |
| `+` / `-` | Increase / decrease intensity |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Ctrl/Cmd + S` | Download processed image |
| `Ctrl/Cmd + O` | Open file picker |
| `Ctrl/Cmd + V` | Paste image from clipboard |
| `Delete` / `Backspace` | Remove selected face region |
| `A` | Select all faces |
| `Escape` | Deselect / return to upload state |

## 6. Responsive Breakpoints

| Breakpoint | Layout | Notes |
|------------|--------|-------|
| < 480px | Single column, compact | Small phone portrait |
| 480-767px | Single column, comfortable | Large phone / small tablet |
| 768-1023px | Two-column (image + sidebar) | Tablet landscape |
| ≥ 1024px | Two-column, max-width container | Desktop |

### Touch Target Sizes

All interactive elements minimum 44x44px (Apple HIG / WCAG 2.5.5).

## 7. Visual Design Direction

### 7.1 Color Palette

```
--bg-primary:     #0f0f0f     (near-black background)
--bg-secondary:   #1a1a2e     (card/panel background)
--bg-surface:     #16213e     (elevated surface)
--accent:         #4361ee     (primary blue, actions)
--accent-hover:   #3a56d4     (hover state)
--success:        #2ec4b6     (success/complete)
--warning:        #f4a261     (warning)
--error:          #e63946     (error states)
--text-primary:   #e8e8e8     (main text)
--text-secondary: #a0a0b0     (secondary text)
--border:         #2a2a3e     (subtle borders)
```

Dark theme by default (appropriate for photo editing). Light theme toggle available.

### 7.2 Typography

- **Font**: System font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)
- **Sizes**: 14px body, 18px headings, 12px labels
- **Weight**: 400 body, 600 headings, 700 buttons

### 7.3 Spacing Scale

```
--space-xs:  4px
--space-sm:  8px
--space-md:  16px
--space-lg:  24px
--space-xl:  32px
--space-2xl: 48px
```

## 8. Accessibility (WCAG 2.1 AA)

### 8.1 Checklist

- [x] Color contrast ratio ≥ 4.5:1 for text, ≥ 3:1 for large text and UI elements
- [x] All interactive elements keyboard-accessible (tab order, focus indicators)
- [x] Screen reader labels for all controls (`aria-label`, `aria-describedby`)
- [x] Status messages announced via `aria-live="polite"` regions
- [x] Touch targets ≥ 44x44px
- [x] Reduced motion: respect `prefers-reduced-motion` (disable transitions/animations)
- [x] Alt text for preview images (dynamically: "Uploaded photo with N detected faces")
- [x] Role and state for custom controls (`role="button"`, `aria-pressed`, `aria-selected`)
- [x] Error messages associated with inputs via `aria-describedby`
- [x] Skip link to main content

### 8.2 Focus Management

- After upload: focus moves to the image preview
- After detection: screen reader announces "N faces detected"
- After download: screen reader announces "Image saved"
- Modal/panel open: focus trapped inside, restored on close

## 9. Error States

| Error | Display | Recovery |
|-------|---------|----------|
| No faces detected | Inline message on preview | Manual selection mode, sensitivity slider |
| Unsupported file format | Toast notification | "Please use JPEG, PNG, or WebP" |
| File too large (>50MB) | Toast notification | "Please use a smaller image" |
| Browser not supported | Full-page message | Link to supported browsers |
| Model load failed | Retry button | "Failed to load AI models. Check your connection and try again." |
| Processing error | Toast notification | "Something went wrong. Please try again." |

## 10. Onboarding (First Use)

**No tutorial, no modal.** The upload zone itself is the onboarding:

1. Large, obvious drop zone with clear text: "Drop a photo here or click to select"
2. Below it, a one-sentence explanation: "Faceblock detects faces and blocks them. Everything stays on your device."
3. Three small icons showing the flow: Upload → Detect → Download
4. Privacy badge visible immediately

Returning users see the same upload zone (no "welcome back" state since there's no user tracking).
