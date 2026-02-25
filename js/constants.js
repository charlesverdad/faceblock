// Faceblock constants and configuration

export const MODEL_BASE_URL =
  "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.14/model";
export const MAX_IMAGE_DIMENSION = 4096;
export const DETECTION_MAX_DIMENSION = 1600;
export const MAX_FILE_SIZE_MB = 50;
export const MANUAL_REGION_RATIO = 0.15;
export const MAX_PHOTOS = 20;
export const MAX_LOADED_CANVASES = 3;
export const THUMBNAIL_SIZE = 80;

// SSD MobileNet v1 presets (minConfidence controls detection threshold)
export const SENSITIVITY_PRESETS = {
  low: { minConfidence: 0.5 },
  medium: { minConfidence: 0.3 },
  high: { minConfidence: 0.15 },
};

export const EMOJI_OPTIONS = [
  "😀",
  "😎",
  "🤡",
  "👽",
  "🤖",
  "💀",
  "🎭",
  "🐱",
  "🐶",
  "🦊",
  "🐻",
  "🐼",
  "🌟",
  "🔥",
  "🙈",
  "🎃",
  "😈",
  "🥸",
  "👾",
  "🤠",
];

export const EFFECTS = [
  {
    id: "blur",
    name: "Blur",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" opacity=".3"/><circle cx="12" cy="12" r="7" opacity=".5"/><circle cx="12" cy="12" r="4"/></svg>`,
    requiresLandmarks: false,
    defaultIntensity: 70,
    description: "Gaussian blur",
  },
  {
    id: "pixelate",
    name: "Pixelate",
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="2" width="5" height="5"/><rect x="9" y="2" width="5" height="5" opacity=".7"/><rect x="16" y="2" width="5" height="5"/><rect x="2" y="9" width="5" height="5" opacity=".7"/><rect x="9" y="9" width="5" height="5"/><rect x="16" y="9" width="5" height="5" opacity=".7"/><rect x="2" y="16" width="5" height="5"/><rect x="9" y="16" width="5" height="5" opacity=".7"/><rect x="16" y="16" width="5" height="5"/></svg>`,
    requiresLandmarks: false,
    defaultIntensity: 50,
    description: "Mosaic blocks",
  },
  {
    id: "black-bar-eyes",
    name: "Eye Bar",
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="9" width="20" height="6" rx="1"/></svg>`,
    requiresLandmarks: true,
    defaultIntensity: 60,
    description: "Black bar on eyes",
  },
  {
    id: "blackout",
    name: "Blackout",
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>`,
    requiresLandmarks: false,
    defaultIntensity: 100,
    description: "Solid black face",
  },
  {
    id: "emoji",
    name: "Emoji",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9" stroke-width="3" stroke-linecap="round"/><line x1="15" y1="9" x2="15.01" y2="9" stroke-width="3" stroke-linecap="round"/></svg>`,
    requiresLandmarks: false,
    defaultIntensity: 60,
    description: "Emoji overlay",
  },
  {
    id: "solid-color",
    name: "Color",
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="4" fill="var(--accent)"/></svg>`,
    requiresLandmarks: false,
    defaultIntensity: 100,
    description: "Solid color fill",
  },
  {
    id: "glitch",
    name: "Glitch",
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="3" width="20" height="3"/><rect x="5" y="8" width="14" height="3" fill="var(--error)"/><rect x="0" y="13" width="18" height="3"/><rect x="6" y="18" width="16" height="3" fill="var(--accent)"/></svg>`,
    requiresLandmarks: false,
    defaultIntensity: 60,
    description: "Digital glitch",
  },
  {
    id: "swirl",
    name: "Swirl",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 12c0-3 2.5-5 5-5s4 2 4 4-1.5 3-3 3-2.5-1-2.5-2.5S17 9 18 9"/><path d="M12 12c0 3-2.5 5-5 5s-4-2-4-4 1.5-3 3-3 2.5 1 2.5 2.5S7 15 6 15"/></svg>`,
    requiresLandmarks: false,
    defaultIntensity: 60,
    description: "Spiral distortion",
  },
  {
    id: "silhouette",
    name: "Silhouette",
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="10" rx="7" ry="9" opacity=".8"/></svg>`,
    requiresLandmarks: true,
    defaultIntensity: 80,
    description: "Dark silhouette",
  },
  {
    id: "redact",
    name: "Redact",
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="4" width="20" height="16" rx="1"/><line x1="4" y1="8" x2="20" y2="8" stroke="rgba(255,255,255,.1)" stroke-width="1"/><line x1="4" y1="12" x2="20" y2="12" stroke="rgba(255,255,255,.1)" stroke-width="1"/><line x1="4" y1="16" x2="20" y2="16" stroke="rgba(255,255,255,.1)" stroke-width="1"/></svg>`,
    requiresLandmarks: false,
    defaultIntensity: 100,
    description: "Document redaction",
  },
];

export function getEffect(id) {
  return EFFECTS.find((e) => e.id === id);
}
