// Faceblock - Main application controller

import {
  EFFECTS,
  MANUAL_REGION_RATIO,
  MAX_PHOTOS,
  MAX_LOADED_CANVASES,
} from "./constants.js";
import {
  loadAndDetect,
  redetect,
  processImage,
  exportImage,
} from "./processor.js";
import {
  generateThumbnail,
  exportAsBlob,
  downloadBlob,
} from "./canvas-utils.js";
import {
  setupUI,
  showState,
  showStatus,
  hideStatus,
  setFaceCount,
  setActiveMode,
  setIntensity,
  setUndoRedoState,
  renderPreview,
  renderOverlay,
  renderResult,
  renderThumbnailStrip,
  resetUI,
} from "./ui.js";

// Application state — multi-photo
const state = {
  photos: [], // Array of per-photo state objects
  activePhotoId: null,

  // Global settings (shared across all photos)
  effectId: "blur",
  intensity: 70,
  sensitivity: "medium",
  options: { emoji: "\u{1F600}", color: "#ff0000" },
  format: "png",
  quality: 0.92,
};

// Queue control
let queueRunning = false;

/**
 * Get the active photo state object.
 */
function getActivePhoto() {
  if (!state.activePhotoId) return null;
  const photo = state.photos.find((p) => p.id === state.activePhotoId);
  if (!photo) {
    state.activePhotoId = null;
  }
  return photo || null;
}

/**
 * Create a new per-photo state object.
 */
function createPhotoState(file) {
  return {
    id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    originalFilename: file.name,
    fullCanvas: null,
    thumbnailDataUrl: null,
    faces: [],
    selectedFaceId: null,
    processedCanvas: null,
    undoStack: [],
    redoStack: [],
    status: "pending", // 'pending' | 'loading' | 'detected' | 'error'
    error: null,
  };
}

/**
 * Initialize the application.
 */
function init() {
  setupUI({
    onFilesSelected: handleFilesSelected,
    onEffectChange: handleEffectChange,
    onIntensityChange: handleIntensityChange,
    onSensitivityChange: handleSensitivityChange,
    onDownload: handleDownload,
    onDownloadAll: handleDownloadAll,
    onCanvasClick: handleCanvasClick,
    onFaceDrawn: handleFaceDrawn,
    onFaceMoved: handleFaceMoved,
    onFaceResized: handleFaceResized,
    onFaceRemoved: handleFaceRemoved,
    onFormatChange: handleFormatChange,
    onNewPhoto: handleNewPhoto,
    onPhotoSwitch: handlePhotoSwitch,
    onPhotoRemoved: handlePhotoRemoved,
    onUndo: handleUndo,
    onRedo: handleRedo,
  });

  // Set initial UI state
  showState("empty");
  setActiveMode(state.effectId);
  setIntensity(state.intensity);
}

// ---- File Upload ----

/**
 * Handle file selection (supports multiple files).
 */
async function handleFilesSelected(files) {
  const imageFiles = files.filter(
    (f) => f.type.startsWith("image/") && f.size <= 50 * 1024 * 1024,
  );

  if (imageFiles.length === 0) {
    showStatus("No valid image files selected", "error");
    return;
  }

  // Enforce photo limit
  const slotsAvailable = MAX_PHOTOS - state.photos.length;
  if (slotsAvailable <= 0) {
    showStatus(`Maximum ${MAX_PHOTOS} photos reached`, "warning");
    return;
  }

  const toAdd = imageFiles.slice(0, slotsAvailable);
  if (toAdd.length < imageFiles.length) {
    showStatus(
      `Added ${toAdd.length} of ${imageFiles.length} photos (max ${MAX_PHOTOS})`,
      "warning",
    );
  }

  // Create photo states and generate thumbnails
  const newPhotos = toAdd.map((f) => createPhotoState(f));
  state.photos.push(...newPhotos);

  // Generate thumbnails in parallel (fast, lightweight)
  await Promise.all(
    newPhotos.map(async (photo) => {
      photo.thumbnailDataUrl = await generateThumbnail(photo.file);
    }),
  );

  // Switch to first new photo if no active photo
  if (!state.activePhotoId) {
    state.activePhotoId = newPhotos[0].id;
  }

  renderThumbnailStrip(state.photos, state.activePhotoId);

  // Process the active photo first, then queue the rest
  await switchToPhoto(state.activePhotoId);
  processQueue();
}

// ---- Photo Processing ----

/**
 * Load and detect faces for a single photo.
 */
async function processPhoto(photo) {
  // Photo may have been removed while queued
  if (!state.photos.find((p) => p.id === photo.id)) return;
  if (photo.status === "detected" && photo.fullCanvas) return;

  photo.status = "loading";
  renderThumbnailStrip(state.photos, state.activePhotoId);

  try {
    const isActive = photo.id === state.activePhotoId;
    const { fullCanvas, faces } = await loadAndDetect(
      photo.file,
      state.sensitivity,
      isActive ? (msg) => showStatus(msg, "info") : null,
    );

    photo.fullCanvas = fullCanvas;
    photo.faces = faces;
    photo.status = "detected";

    renderThumbnailStrip(state.photos, state.activePhotoId);

    // If this is the active photo, update the display
    if (isActive) {
      showState("editing");
      renderPreview(fullCanvas);
      renderOverlay(faces, null);
      setFaceCount(faces.length);

      if (faces.length === 0) {
        showStatus(
          "No faces detected. Click on the image to manually select areas.",
          "warning",
        );
      } else {
        updatePreview();
        hideStatus();
      }
    }

    evictCanvases();
  } catch (err) {
    console.error(`Error processing ${photo.originalFilename}:`, err);
    photo.status = "error";
    photo.error = err.message;
    renderThumbnailStrip(state.photos, state.activePhotoId);

    if (photo.id === state.activePhotoId) {
      showStatus("Failed to process image. Please try again.", "error");
    }
  }
}

/**
 * Process queued photos sequentially in the background.
 */
async function processQueue() {
  if (queueRunning) return;
  queueRunning = true;

  for (const photo of state.photos) {
    if (photo.status === "pending") {
      await processPhoto(photo);
    }
  }

  queueRunning = false;
}

/**
 * Evict old canvases to keep memory in check.
 */
function evictCanvases() {
  const loaded = state.photos.filter(
    (p) => p.fullCanvas && p.id !== state.activePhotoId,
  );
  // Keep at most MAX_LOADED_CANVASES - 1 inactive (plus 1 active = MAX total)
  const maxInactive = Math.max(0, MAX_LOADED_CANVASES - 1);
  if (loaded.length > maxInactive) {
    const toEvict = loaded.slice(0, loaded.length - maxInactive);
    for (const p of toEvict) {
      p.fullCanvas = null;
      p.processedCanvas = null;
      // Keep status as 'detected' — canvas can be reloaded from File
    }
  }
}

// ---- Photo Navigation ----

/**
 * Switch to a different photo.
 */
async function switchToPhoto(photoId) {
  const photo = state.photos.find((p) => p.id === photoId);
  if (!photo) return;

  state.activePhotoId = photoId;
  renderThumbnailStrip(state.photos, state.activePhotoId);

  if (photo.status === "pending" || !photo.fullCanvas) {
    showState("loading");
    await processPhoto(photo);

    // Check if photo failed or was removed during processing
    if (photo.status === "error" || !photo.fullCanvas) {
      showStatus(`Failed to load ${photo.originalFilename}`, "error");
      return;
    }
  }

  showState("editing");
  renderPreview(photo.fullCanvas);
  renderOverlay(photo.faces, photo.selectedFaceId);
  setFaceCount(photo.faces.length);

  updateUndoRedoButtons();

  if (photo.faces.length > 0) {
    updatePreview();
    hideStatus();
  } else {
    showStatus(
      "No faces detected. Click on the image to manually select areas.",
      "warning",
    );
  }
}

async function handlePhotoSwitch(photoId) {
  if (photoId === state.activePhotoId) return;
  await switchToPhoto(photoId);
}

function handlePhotoRemoved(photoId) {
  const idx = state.photos.findIndex((p) => p.id === photoId);
  if (idx < 0) return;

  // Clean up canvas references
  const removed = state.photos[idx];
  removed.fullCanvas = null;
  removed.processedCanvas = null;
  removed.file = null;

  state.photos.splice(idx, 1);

  if (state.photos.length === 0) {
    // No photos left — reset to empty state
    state.activePhotoId = null;
    resetUI();
    return;
  }

  if (photoId === state.activePhotoId) {
    // Switch to nearest photo
    const newIdx = Math.min(idx, state.photos.length - 1);
    switchToPhoto(state.photos[newIdx].id);
  } else {
    renderThumbnailStrip(state.photos, state.activePhotoId);
  }
}

// ---- Effect & Settings Handlers ----

function handleEffectChange(effectId, options) {
  state.effectId = effectId;
  if (options) {
    Object.assign(state.options, options);
  }

  const effect = EFFECTS.find((e) => e.id === effectId);
  if (effect && !options) {
    state.intensity = effect.defaultIntensity;
    setIntensity(state.intensity);
  }

  setActiveMode(effectId);
  updatePreview();
}

function handleIntensityChange(value) {
  state.intensity = value;
  updatePreview();
}

async function handleSensitivityChange(sensitivity) {
  const photo = getActivePhoto();
  if (!photo?.fullCanvas) return;
  state.sensitivity = sensitivity;

  showStatus("Re-detecting faces...", "info");
  try {
    const manualFaces = photo.faces.filter((f) => f.manual);
    const detected = await redetect(photo.fullCanvas, sensitivity, (msg) =>
      showStatus(msg, "info"),
    );

    photo.faces = [...detected, ...manualFaces];
    renderOverlay(photo.faces, photo.selectedFaceId);
    setFaceCount(photo.faces.length);
    renderThumbnailStrip(state.photos, state.activePhotoId);
    updatePreview();
    hideStatus();
  } catch (err) {
    console.error("Re-detection error:", err);
    showStatus("Detection failed. Please try again.", "error");
  }
}

// ---- Canvas Interaction Handlers ----

function getDefaultFaceSize() {
  const photo = getActivePhoto();
  if (!photo?.fullCanvas) return 100;

  const detectedFaces = photo.faces.filter((f) => !f.manual);
  if (detectedFaces.length === 0) {
    return (
      Math.min(photo.fullCanvas.width, photo.fullCanvas.height) *
      MANUAL_REGION_RATIO
    );
  }
  const sizes = detectedFaces
    .map((f) => Math.max(f.box.width, f.box.height))
    .sort((a, b) => a - b);
  return sizes[Math.floor(sizes.length / 2)];
}

function handleCanvasClick(x, y) {
  const photo = getActivePhoto();
  if (!photo?.fullCanvas) return;

  const clickedFace = photo.faces.find((f) => {
    const b = f.box;
    return x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
  });

  if (clickedFace) {
    photo.selectedFaceId = clickedFace.id;
  } else if (photo.selectedFaceId) {
    photo.selectedFaceId = null;
  } else {
    pushUndo(photo);
    const size = getDefaultFaceSize();
    const newFace = {
      id: `manual-${Date.now()}`,
      box: {
        x: Math.max(0, x - size / 2),
        y: Math.max(0, y - size / 2),
        width: size,
        height: size,
      },
      score: 1,
      landmarks: null,
      manual: true,
    };
    photo.faces.push(newFace);
    photo.selectedFaceId = newFace.id;
  }

  renderOverlay(photo.faces, photo.selectedFaceId);
  setFaceCount(photo.faces.length);
  updatePreview();
}

function handleFaceDrawn(box) {
  const photo = getActivePhoto();
  if (!photo?.fullCanvas) return;
  pushUndo(photo);
  const newFace = {
    id: `manual-${Date.now()}`,
    box,
    score: 1,
    landmarks: null,
    manual: true,
  };
  photo.faces.push(newFace);
  photo.selectedFaceId = newFace.id;
  renderOverlay(photo.faces, photo.selectedFaceId);
  setFaceCount(photo.faces.length);
  updatePreview();
}

function handleFaceMoved(faceId, newBox) {
  const photo = getActivePhoto();
  if (!photo) return;
  const face = photo.faces.find((f) => f.id === faceId);
  if (!face) return;
  pushUndo(photo);
  face.box = newBox;
  renderOverlay(photo.faces, photo.selectedFaceId);
  updatePreview();
}

function handleFaceResized(faceId, newBox) {
  const photo = getActivePhoto();
  if (!photo) return;
  const face = photo.faces.find((f) => f.id === faceId);
  if (!face) return;
  pushUndo(photo);
  face.box = newBox;
  renderOverlay(photo.faces, photo.selectedFaceId);
  updatePreview();
}

function handleFaceRemoved() {
  const photo = getActivePhoto();
  if (!photo?.selectedFaceId) return;
  const idx = photo.faces.findIndex((f) => f.id === photo.selectedFaceId);
  if (idx >= 0) {
    pushUndo(photo);
    photo.faces.splice(idx, 1);
    photo.selectedFaceId = null;
    renderOverlay(photo.faces, photo.selectedFaceId);
    setFaceCount(photo.faces.length);
    updatePreview();
  }
}

// ---- Undo / Redo ----

const MAX_UNDO = 50;

function pushUndo(photo) {
  const snapshot = photo.faces.map((f) => ({
    ...f,
    box: { ...f.box },
    landmarks: f.landmarks,
  }));
  photo.undoStack.push({
    faces: snapshot,
    selectedFaceId: photo.selectedFaceId,
  });
  if (photo.undoStack.length > MAX_UNDO) photo.undoStack.shift();
  photo.redoStack = [];
  updateUndoRedoButtons();
}

function handleUndo() {
  const photo = getActivePhoto();
  if (!photo || photo.undoStack.length === 0) return;

  const current = photo.faces.map((f) => ({
    ...f,
    box: { ...f.box },
    landmarks: f.landmarks,
  }));
  photo.redoStack.push({
    faces: current,
    selectedFaceId: photo.selectedFaceId,
  });

  const prev = photo.undoStack.pop();
  photo.faces = prev.faces;
  photo.selectedFaceId = prev.selectedFaceId;

  renderOverlay(photo.faces, photo.selectedFaceId);
  setFaceCount(photo.faces.length);
  updatePreview();
  updateUndoRedoButtons();
}

function handleRedo() {
  const photo = getActivePhoto();
  if (!photo || photo.redoStack.length === 0) return;

  const current = photo.faces.map((f) => ({
    ...f,
    box: { ...f.box },
    landmarks: f.landmarks,
  }));
  photo.undoStack.push({
    faces: current,
    selectedFaceId: photo.selectedFaceId,
  });

  const next = photo.redoStack.pop();
  photo.faces = next.faces;
  photo.selectedFaceId = next.selectedFaceId;

  renderOverlay(photo.faces, photo.selectedFaceId);
  setFaceCount(photo.faces.length);
  updatePreview();
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  const photo = getActivePhoto();
  setUndoRedoState(
    photo ? photo.undoStack.length > 0 : false,
    photo ? photo.redoStack.length > 0 : false,
  );
}

// ---- Format & Export ----

function handleFormatChange(format, quality) {
  state.format = format;
  state.quality = quality;
}

async function handleDownload() {
  const photo = getActivePhoto();
  if (!photo?.fullCanvas || photo.faces.length === 0) {
    showStatus("No faces to process", "warning");
    return;
  }

  showStatus("Preparing download...", "info");
  try {
    const processed = processImage(
      photo.fullCanvas,
      photo.faces,
      state.effectId,
      state.intensity,
      state.options,
    );

    const filename = await exportImage(
      processed,
      state.format,
      state.quality,
      photo.originalFilename,
    );
    showStatus(`Saved as ${filename}`, "success");
  } catch (err) {
    console.error("Export error:", err);
    showStatus("Failed to export image. Please try again.", "error");
  }
}

async function handleDownloadAll() {
  if (state.photos.length === 0) return;

  if (typeof JSZip === "undefined") {
    showStatus("ZIP library not loaded. Try refreshing the page.", "error");
    return;
  }

  const zip = new JSZip();
  const total = state.photos.length;
  let completed = 0;
  const usedNames = new Set();

  showStatus(`Processing 0/${total}...`, "info");

  for (const photo of state.photos) {
    // Ensure canvas is loaded
    if (!photo.fullCanvas) {
      await processPhoto(photo);
    }
    if (!photo.fullCanvas) {
      completed++;
      continue; // Skip errored photos
    }

    const processed = processImage(
      photo.fullCanvas,
      photo.faces,
      state.effectId,
      state.intensity,
      state.options,
    );

    const mimeType = state.format === "jpeg" ? "image/jpeg" : "image/png";
    const ext = state.format === "jpeg" ? ".jpg" : ".png";
    const baseName = photo.originalFilename.replace(/\.[^.]+$/, "");
    let filename = `faceblock_${baseName}${ext}`;

    // Handle duplicate names
    let counter = 1;
    while (usedNames.has(filename)) {
      filename = `faceblock_${baseName}(${counter})${ext}`;
      counter++;
    }
    usedNames.add(filename);

    const blob = await exportAsBlob(processed, mimeType, state.quality);
    zip.file(filename, blob);

    completed++;
    showStatus(`Processing ${completed}/${total}...`, "info");
  }

  showStatus("Creating ZIP...", "info");
  try {
    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadBlob(zipBlob, "faceblock_photos.zip");
    showStatus(`Downloaded ${total} photos`, "success");
  } catch (err) {
    console.error("ZIP error:", err);
    showStatus("Failed to create ZIP file", "error");
  }
}

// ---- Reset ----

function handleNewPhoto() {
  state.photos = [];
  state.activePhotoId = null;
  resetUI();
}

// ---- Preview Update ----

function updatePreview() {
  const photo = getActivePhoto();
  if (!photo?.fullCanvas || photo.faces.length === 0) return;

  const processed = processImage(
    photo.fullCanvas,
    photo.faces,
    state.effectId,
    state.intensity,
    state.options,
  );
  photo.processedCanvas = processed;
  renderResult(processed);
  renderOverlay(photo.faces, photo.selectedFaceId);
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
