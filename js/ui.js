// UI module: DOM manipulation, event handlers, state rendering

import { EFFECTS, EMOJI_OPTIONS, SENSITIVITY_PRESETS } from "./constants.js";

// DOM element references
let els = {};

// Callbacks set by app.js
let callbacks = {
  onFilesSelected: null,
  onEffectChange: null,
  onIntensityChange: null,
  onSensitivityChange: null,
  onDownload: null,
  onDownloadAll: null,
  onShare: null,
  onCanvasClick: null,
  onFaceDrawn: null,
  onFaceMoved: null,
  onFaceResized: null,
  onFaceRemoved: null,
  onFormatChange: null,
  onNewPhoto: null,
  onPhotoSwitch: null,
  onPhotoRemoved: null,
  onUndo: null,
  onRedo: null,
};

// Canvas interaction state
const drag = {
  active: false,
  mode: null, // 'draw' | 'move' | 'resize'
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  targetFaceId: null,
  resizeHandle: null, // 'nw' | 'ne' | 'sw' | 'se'
  origBox: null,
};

// Track current overlay state for hit testing during canvas interaction
let currentFaces = [];
let currentSelectedId = null;

// Editor must be "activated" with a first tap before empty-space taps create boxes
let editorActive = false;

/**
 * Initialize UI: cache DOM refs, set up event listeners.
 */
export function setupUI(cbs) {
  callbacks = { ...callbacks, ...cbs };

  // Cache elements
  els = {
    app: document.getElementById("app"),
    uploadZone: document.getElementById("upload-zone"),
    fileInput: document.getElementById("file-input"),
    uploadContent: document.getElementById("upload-content"),

    editorPanel: document.getElementById("editor-panel"),
    previewContainer: document.getElementById("preview-container"),
    previewCanvas: document.getElementById("preview-canvas"),
    overlayCanvas: document.getElementById("overlay-canvas"),

    statusText: document.getElementById("status-text"),
    statusBar: document.getElementById("status-bar"),

    modeGrid: document.getElementById("mode-grid"),
    intensitySlider: document.getElementById("intensity-slider"),
    intensityValue: document.getElementById("intensity-value"),

    advancedToggle: document.getElementById("advanced-toggle"),
    advancedPanel: document.getElementById("advanced-panel"),
    sensitivitySlider: document.getElementById("sensitivity-slider"),
    sensitivityLabel: document.getElementById("sensitivity-label"),

    emojiPicker: document.getElementById("emoji-picker"),
    colorPicker: document.getElementById("color-picker"),
    colorInput: document.getElementById("color-input"),

    formatPng: document.getElementById("format-png"),
    formatJpeg: document.getElementById("format-jpeg"),
    qualityRow: document.getElementById("quality-row"),
    qualitySlider: document.getElementById("quality-slider"),
    qualityValue: document.getElementById("quality-value"),

    downloadBtn: document.getElementById("download-btn"),
    shareBtn: document.getElementById("share-btn"),
    downloadAllBtn: document.getElementById("download-all-btn"),
    newPhotoBtn: document.getElementById("new-photo-btn"),
    undoBtn: document.getElementById("undo-btn"),
    redoBtn: document.getElementById("redo-btn"),

    thumbnailStrip: document.getElementById("thumbnail-strip"),
    faceCount: document.getElementById("face-count"),
  };

  setupFileInput();
  setupDragDrop();
  setupPaste();
  setupModeGrid();
  setupSliders();
  setupAdvancedPanel();
  setupEmojiPicker();
  setupColorPicker();
  setupFormatToggle();
  setupButtons();
  setupCanvasClick();
  setupKeyboardShortcuts();
  setupThumbnailStrip();
}

// ---- File Input ----

function setupFileInput() {
  els.uploadZone.addEventListener("click", () => els.fileInput.click());
  els.fileInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) callbacks.onFilesSelected?.(files);
  });
}

function setupDragDrop() {
  const zone = els.uploadZone;
  const app = document.body;

  for (const el of [zone, app]) {
    el.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("dragover");
    });
    el.addEventListener("dragleave", () => {
      zone.classList.remove("dragover");
    });
    el.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("dragover");
      const files = Array.from(e.dataTransfer?.files || []);
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length > 0) {
        callbacks.onFilesSelected?.(imageFiles);
      }
    });
  }
}

function setupPaste() {
  document.addEventListener("paste", (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files = [];
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) callbacks.onFilesSelected?.(files);
  });
}

// ---- Mode Grid ----

function setupModeGrid() {
  els.modeGrid.innerHTML = "";
  for (const effect of EFFECTS) {
    const btn = document.createElement("button");
    btn.className = "mode-btn";
    btn.dataset.effectId = effect.id;
    btn.setAttribute("aria-label", effect.name);
    btn.title = effect.description;
    btn.innerHTML = `
      <span class="mode-icon">${effect.icon}</span>
      <span class="mode-label">${effect.name}</span>
    `;
    btn.addEventListener("click", () => {
      callbacks.onEffectChange?.(effect.id);
    });
    els.modeGrid.appendChild(btn);
  }
}

export function setActiveMode(effectId) {
  for (const btn of els.modeGrid.querySelectorAll(".mode-btn")) {
    btn.classList.toggle("active", btn.dataset.effectId === effectId);
  }

  // Show/hide emoji picker
  els.emojiPicker.classList.toggle("visible", effectId === "emoji");
  // Show/hide color picker
  els.colorPicker.classList.toggle("visible", effectId === "solid-color");
}

// ---- Sliders ----

function setupSliders() {
  els.intensitySlider.addEventListener("input", (e) => {
    const val = parseInt(e.target.value);
    els.intensityValue.textContent = `${val}%`;
    callbacks.onIntensityChange?.(val);
  });
}

export function setIntensity(val) {
  els.intensitySlider.value = val;
  els.intensityValue.textContent = `${val}%`;
}

// ---- Advanced Panel ----

function setupAdvancedPanel() {
  els.advancedToggle.addEventListener("click", () => {
    const open = els.advancedPanel.classList.toggle("open");
    els.advancedToggle.setAttribute("aria-expanded", open);
    els.advancedToggle.querySelector(".toggle-arrow").textContent = open
      ? "\u25B2"
      : "\u25BC";
  });

  els.sensitivitySlider.addEventListener("input", (e) => {
    const val = parseInt(e.target.value);
    const labels = ["Low", "Medium", "High"];
    els.sensitivityLabel.textContent = labels[val] || "Medium";
    const keys = ["low", "medium", "high"];
    callbacks.onSensitivityChange?.(keys[val] || "medium");
  });
}

// ---- Emoji Picker ----

function setupEmojiPicker() {
  const grid = els.emojiPicker.querySelector(".emoji-grid");
  if (!grid) return;
  grid.innerHTML = "";
  for (const emoji of EMOJI_OPTIONS) {
    const btn = document.createElement("button");
    btn.className = "emoji-btn";
    btn.textContent = emoji;
    btn.setAttribute("aria-label", `Select ${emoji}`);
    btn.addEventListener("click", () => {
      for (const b of grid.querySelectorAll(".emoji-btn"))
        b.classList.remove("active");
      btn.classList.add("active");
      callbacks.onEffectChange?.("emoji", { emoji });
    });
    grid.appendChild(btn);
  }
  // Default first emoji active
  grid.firstChild?.classList.add("active");
}

// ---- Color Picker ----

function setupColorPicker() {
  els.colorInput.addEventListener("input", (e) => {
    callbacks.onEffectChange?.("solid-color", { color: e.target.value });
  });
}

// ---- Format Toggle ----

function setupFormatToggle() {
  els.formatPng.addEventListener("change", () => {
    els.qualityRow.classList.remove("visible");
    callbacks.onFormatChange?.("png", 1);
  });
  els.formatJpeg.addEventListener("change", () => {
    els.qualityRow.classList.add("visible");
    callbacks.onFormatChange?.("jpeg", parseInt(els.qualitySlider.value) / 100);
  });
  els.qualitySlider.addEventListener("input", (e) => {
    const val = parseInt(e.target.value);
    els.qualityValue.textContent = `${val}%`;
    callbacks.onFormatChange?.("jpeg", val / 100);
  });
}

// ---- Buttons ----

function setupButtons() {
  els.downloadBtn.addEventListener("click", () => callbacks.onDownload?.());
  els.downloadAllBtn.addEventListener("click", () =>
    callbacks.onDownloadAll?.(),
  );
  els.newPhotoBtn.addEventListener("click", () => callbacks.onNewPhoto?.());
  els.undoBtn?.addEventListener("click", () => callbacks.onUndo?.());
  els.redoBtn?.addEventListener("click", () => callbacks.onRedo?.());

  // Show share button if Web Share API supports files
  if (els.shareBtn && navigator.canShare) {
    try {
      const testFile = new File([new Blob(["test"])], "test.png", {
        type: "image/png",
      });
      if (navigator.canShare({ files: [testFile] })) {
        els.shareBtn.hidden = false;
        els.shareBtn.addEventListener("click", () => callbacks.onShare?.());
      }
    } catch {
      // canShare not supported for files
    }
  }
}

// ---- Canvas Interaction (tap to select, drag to move/draw/resize) ----

function setupCanvasClick() {
  const canvas = els.overlayCanvas;

  function getCanvasCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function getDisplayScale() {
    const rect = canvas.getBoundingClientRect();
    return rect.width > 0 ? rect.width / canvas.width : 1;
  }

  function getHandleSize() {
    const displayScale = getDisplayScale();
    return 24 / displayScale;
  }

  function getDeleteBtnSize() {
    const displayScale = getDisplayScale();
    return 22 / displayScale;
  }

  function hitTest(cx, cy) {
    if (currentSelectedId) {
      const selected = currentFaces.find((f) => f.id === currentSelectedId);
      if (selected) {
        const b = selected.box;

        // Check delete button (centered on top-right corner)
        const ds = getDeleteBtnSize();
        const dCx = b.x + b.width;
        const dCy = b.y;
        const dDist = Math.sqrt((cx - dCx) ** 2 + (cy - dCy) ** 2);
        // Generous hitbox for touch: visual radius + extra padding
        const hitRadius = ds / 2 + 8 / (getDisplayScale() || 1);
        if (dDist <= hitRadius) {
          return { type: "delete", face: selected };
        }

        // Check resize handle (centered on bottom-left corner)
        const hs = getHandleSize();
        const hCx = b.x;
        const hCy = b.y + b.height;
        if (
          cx >= hCx - hs / 2 &&
          cx <= hCx + hs / 2 &&
          cy >= hCy - hs / 2 &&
          cy <= hCy + hs / 2
        ) {
          return { type: "resize", face: selected };
        }
      }
    }
    // Check face boxes (reverse for z-order)
    for (let i = currentFaces.length - 1; i >= 0; i--) {
      const f = currentFaces[i];
      const b = f.box;
      if (
        cx >= b.x &&
        cx <= b.x + b.width &&
        cy >= b.y &&
        cy <= b.y + b.height
      ) {
        return { type: "face", face: f };
      }
    }
    return { type: "empty" };
  }

  function getResizeBox() {
    const dx = drag.currentX - drag.startX;
    const dy = drag.currentY - drag.startY;
    // Bottom-left handle: anchor is top-right corner
    const newWidth = Math.max(20, drag.origBox.width - dx);
    const newHeight = Math.max(20, drag.origBox.height + dy);
    const newX = drag.origBox.x + drag.origBox.width - newWidth;
    return {
      x: newX,
      y: drag.origBox.y,
      width: newWidth,
      height: newHeight,
    };
  }

  function drawDragPreview() {
    if (drag.mode === "move") {
      const dx = drag.currentX - drag.startX;
      const dy = drag.currentY - drag.startY;
      const b = drag.origBox;
      const movedBox = {
        x: b.x + dx,
        y: b.y + dy,
        width: b.width,
        height: b.height,
      };
      const tempFaces = currentFaces.map((f) =>
        f.id === drag.targetFaceId ? { ...f, box: movedBox } : f,
      );
      renderOverlay(tempFaces, currentSelectedId);

      // If outside canvas, draw a red tint over the moved box
      const newCX = movedBox.x + movedBox.width / 2;
      const newCY = movedBox.y + movedBox.height / 2;
      if (isOutsideCanvas(newCX, newCY)) {
        const ctx = canvas.getContext("2d");
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = "#EF4444";
        const r = Math.min(movedBox.width, movedBox.height) * 0.1;
        ctx.beginPath();
        ctx.roundRect(
          movedBox.x,
          movedBox.y,
          movedBox.width,
          movedBox.height,
          r,
        );
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    } else if (drag.mode === "resize") {
      const box = getResizeBox();
      const tempFaces = currentFaces.map((f) =>
        f.id === drag.targetFaceId ? { ...f, box } : f,
      );
      renderOverlay(tempFaces, currentSelectedId);
    }
  }

  function setDragHint(text) {
    showSelectionHint(text);
  }

  function clearDragHint() {
    // Restore selection hint if still selected, otherwise clear
    if (currentSelectedId) {
      showSelectionHint("Drag to move");
    } else {
      clearSelectionHint();
    }
  }

  function handlePointerDown(x, y) {
    const hit = hitTest(x, y);
    drag.startX = x;
    drag.startY = y;
    drag.currentX = x;
    drag.currentY = y;

    if (hit.type === "delete") {
      callbacks.onFaceRemoved?.();
      return;
    } else if (hit.type === "resize") {
      drag.active = true;
      drag.mode = "resize";
      drag.targetFaceId = hit.face.id;
      drag.origBox = { ...hit.face.box };
    } else if (hit.type === "face" && hit.face.id === currentSelectedId) {
      // Already selected — prepare for move
      drag.active = true;
      drag.mode = "move";
      drag.targetFaceId = hit.face.id;
      drag.origBox = { ...hit.face.box };
      setDragHint("Drag outside to remove");
    } else if (hit.type === "face") {
      editorActive = true;
      callbacks.onCanvasClick?.(x, y);
    } else {
      // Empty space
      if (!editorActive) {
        // First tap activates the editor
        editorActive = true;
        showSelectionHint("Tap to add a box");
      } else {
        // Editor already active — create a box
        callbacks.onCanvasClick?.(x, y);
      }
    }
  }

  function handlePointerMove(x, y) {
    if (!drag.active) return;
    drag.currentX = x;
    drag.currentY = y;
    drawDragPreview();
  }

  function isOutsideCanvas(x, y) {
    return x < 0 || y < 0 || x > canvas.width || y > canvas.height;
  }

  function handlePointerUp(x, y) {
    if (!drag.active) return;
    drag.currentX = x;
    drag.currentY = y;
    const dx = x - drag.startX;
    const dy = y - drag.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (drag.mode === "move") {
      clearDragHint();
      const newCenterX = drag.origBox.x + drag.origBox.width / 2 + dx;
      const newCenterY = drag.origBox.y + drag.origBox.height / 2 + dy;
      if (isOutsideCanvas(newCenterX, newCenterY)) {
        // Dragged outside — remove face
        callbacks.onFaceRemoved?.();
      } else if (dist > 3) {
        callbacks.onFaceMoved?.(drag.targetFaceId, {
          x: drag.origBox.x + dx,
          y: drag.origBox.y + dy,
          width: drag.origBox.width,
          height: drag.origBox.height,
        });
      }
    } else if (drag.mode === "resize") {
      callbacks.onFaceResized?.(drag.targetFaceId, getResizeBox());
    }

    drag.active = false;
    drag.mode = null;
    drag.targetFaceId = null;
    drag.origBox = null;
  }

  // Mouse events
  canvas.addEventListener("mousedown", (e) => {
    e.preventDefault();
    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (coords) handlePointerDown(coords.x, coords.y);
  });

  canvas.addEventListener("mousemove", (e) => {
    if (drag.active) return; // handled by window listener
    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (!coords) return;
    const hit = hitTest(coords.x, coords.y);
    if (hit.type === "delete") {
      canvas.style.cursor = "pointer";
    } else if (hit.type === "resize") {
      canvas.style.cursor = "nesw-resize";
    } else if (hit.type === "face" && hit.face.id === currentSelectedId) {
      canvas.style.cursor = "move";
    } else if (hit.type === "face") {
      canvas.style.cursor = "pointer";
    } else {
      canvas.style.cursor = "pointer";
    }
  });

  window.addEventListener("mousemove", (e) => {
    if (!drag.active) return;
    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (coords) handlePointerMove(coords.x, coords.y);
  });

  window.addEventListener("mouseup", (e) => {
    if (!drag.active) return;
    const coords = getCanvasCoords(e.clientX, e.clientY);
    if (coords) handlePointerUp(coords.x, coords.y);
  });

  // Touch events
  canvas.addEventListener(
    "touchstart",
    (e) => {
      const touch = e.touches[0];
      const coords = getCanvasCoords(touch.clientX, touch.clientY);
      if (!coords) return;

      // Check what we'd hit before deciding to consume the touch
      const hit = hitTest(coords.x, coords.y);
      const hitsEmptySpace = hit.type === "empty";

      if (hitsEmptySpace && !editorActive) {
        // Activation tap — let scroll through, activate on touchend instead
        return;
      }

      // Active interaction — prevent scroll
      e.preventDefault();
      handlePointerDown(coords.x, coords.y);
    },
    { passive: false },
  );

  // Handle activation tap on touchend so it doesn't block scrolling
  canvas.addEventListener("touchend", (e) => {
    if (!editorActive && !drag.active) {
      const touch = e.changedTouches[0];
      const coords = getCanvasCoords(touch.clientX, touch.clientY);
      if (!coords) return;
      const hit = hitTest(coords.x, coords.y);
      if (hit.type === "empty") {
        editorActive = true;
        showSelectionHint("Tap to add a box");
      }
    }
  });

  canvas.addEventListener(
    "touchmove",
    (e) => {
      if (!drag.active) return;
      e.preventDefault();
      const touch = e.touches[0];
      const coords = getCanvasCoords(touch.clientX, touch.clientY);
      if (coords) handlePointerMove(coords.x, coords.y);
    },
    { passive: false },
  );

  canvas.addEventListener("touchend", (e) => {
    if (!drag.active) return;
    e.preventDefault();
    const touch = e.changedTouches[0];
    const coords = getCanvasCoords(touch.clientX, touch.clientY);
    if (coords) handlePointerUp(coords.x, coords.y);
  });

  // Deactivate editor when clicking/tapping outside the canvas
  document.addEventListener("mousedown", (e) => {
    if (!canvas.contains(e.target)) {
      editorActive = false;
      clearSelectionHint();
    }
  });
  document.addEventListener(
    "touchstart",
    (e) => {
      if (!canvas.contains(e.target)) {
        editorActive = false;
        clearSelectionHint();
      }
    },
    { passive: true },
  );
}

// ---- Keyboard Shortcuts ----

function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Don't capture if user is in an input
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

    const effectKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
    const idx = effectKeys.indexOf(e.key);
    if (idx >= 0 && idx < EFFECTS.length) {
      e.preventDefault();
      callbacks.onEffectChange?.(EFFECTS[idx].id);
      return;
    }

    if (e.key === "[") {
      e.preventDefault();
      const val = Math.max(0, parseInt(els.intensitySlider.value) - 10);
      els.intensitySlider.value = val;
      els.intensityValue.textContent = `${val}%`;
      callbacks.onIntensityChange?.(val);
    }
    if (e.key === "]") {
      e.preventDefault();
      const val = Math.min(100, parseInt(els.intensitySlider.value) + 10);
      els.intensitySlider.value = val;
      els.intensityValue.textContent = `${val}%`;
      callbacks.onIntensityChange?.(val);
    }

    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      callbacks.onFaceRemoved?.();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z") {
      e.preventDefault();
      callbacks.onRedo?.();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "z") {
      e.preventDefault();
      callbacks.onUndo?.();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      callbacks.onDownload?.();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "o") {
      e.preventDefault();
      els.fileInput.click();
    }
  });
}

// ---- Thumbnail Strip ----

function setupThumbnailStrip() {
  // Event delegation on the strip container
  els.thumbnailStrip.addEventListener("click", (e) => {
    const removeBtn = e.target.closest(".thumb-remove");
    if (removeBtn) {
      e.stopPropagation();
      const photoId = removeBtn.closest(".thumb").dataset.photoId;
      callbacks.onPhotoRemoved?.(photoId);
      return;
    }

    const addBtn = e.target.closest(".thumb-add");
    if (addBtn) {
      els.fileInput.click();
      return;
    }

    const thumb = e.target.closest(".thumb");
    if (thumb) {
      callbacks.onPhotoSwitch?.(thumb.dataset.photoId);
    }
  });
}

/**
 * Render the thumbnail strip.
 * @param {Array} photos - Array of photo state objects
 * @param {string} activePhotoId - Currently active photo ID
 */
export function renderThumbnailStrip(photos, activePhotoId) {
  const strip = els.thumbnailStrip;

  // Only show strip when multiple photos
  if (photos.length <= 1) {
    strip.classList.remove("visible");
    strip.innerHTML = "";
    els.downloadAllBtn.hidden = true;
    return;
  }

  strip.classList.add("visible");
  els.downloadAllBtn.hidden = false;
  els.downloadAllBtn.textContent = `Save All (${photos.length})`;

  strip.innerHTML = "";

  for (const photo of photos) {
    const btn = document.createElement("button");
    btn.className = "thumb" + (photo.id === activePhotoId ? " active" : "");
    btn.dataset.photoId = photo.id;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-selected", photo.id === activePhotoId);
    btn.title = photo.originalFilename;

    const img = document.createElement("img");
    img.src = photo.thumbnailDataUrl || "";
    img.alt = photo.originalFilename;
    btn.appendChild(img);

    // Status badge
    const badge = document.createElement("span");
    if (photo.status === "pending") {
      badge.className = "thumb-status thumb-status--pending";
      badge.textContent = "...";
    } else if (photo.status === "loading") {
      badge.className = "thumb-status thumb-status--loading";
      badge.textContent = "...";
    } else if (photo.status === "error") {
      badge.className = "thumb-status thumb-status--error";
      badge.textContent = "!";
    } else if (photo.status === "detected") {
      badge.className = "thumb-status";
      badge.textContent = photo.faces.length;
    }
    btn.appendChild(badge);

    // Remove button
    const removeBtn = document.createElement("button");
    removeBtn.className = "thumb-remove";
    removeBtn.setAttribute("aria-label", `Remove ${photo.originalFilename}`);
    removeBtn.title = "Remove";
    removeBtn.innerHTML = "&times;";
    btn.appendChild(removeBtn);

    strip.appendChild(btn);
  }

  // Add-photo button at the end
  const addBtn = document.createElement("button");
  addBtn.className = "thumb-add";
  addBtn.title = "Add more photos";
  addBtn.setAttribute("aria-label", "Add more photos");
  addBtn.textContent = "+";
  strip.appendChild(addBtn);

  // Scroll active thumbnail into view
  const activeThumb = strip.querySelector(".thumb.active");
  if (activeThumb) {
    activeThumb.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }
}

// ---- State Management ----

export function showState(state) {
  els.app.dataset.state = state;
}

export function showStatus(text, type = "info") {
  els.statusText.textContent = text;
  els.statusBar.dataset.type = type;
  els.statusBar.classList.add("visible");

  // Auto-hide success messages
  if (type === "success") {
    setTimeout(() => els.statusBar.classList.remove("visible"), 3000);
  }
}

export function hideStatus() {
  els.statusBar.classList.remove("visible");
}

let baseFaceCountText = "";

export function setFaceCount(detectedCount) {
  if (detectedCount > 0) {
    baseFaceCountText = `${detectedCount} face${detectedCount > 1 ? "s" : ""} detected \u00B7 Tap to add more`;
  } else {
    baseFaceCountText = "No faces detected \u00B7 Tap to add areas";
  }
  els.faceCount.textContent = baseFaceCountText;
  els.faceCount.classList.remove("drag-hint");
}

function showSelectionHint(text) {
  els.faceCount.textContent = text;
  els.faceCount.classList.add("drag-hint");
}

function clearSelectionHint() {
  els.faceCount.textContent = baseFaceCountText;
  els.faceCount.classList.remove("drag-hint");
}

/**
 * Render the image preview on the preview canvas.
 */
export function renderPreview(fullCanvas) {
  const preview = els.previewCanvas;
  const overlay = els.overlayCanvas;
  const container = els.previewContainer;

  // Set canvas size to match image aspect ratio within container
  const containerWidth = container.clientWidth;
  const aspect = fullCanvas.height / fullCanvas.width;
  const displayWidth = containerWidth;
  const displayHeight = containerWidth * aspect;

  preview.width = fullCanvas.width;
  preview.height = fullCanvas.height;
  overlay.width = fullCanvas.width;
  overlay.height = fullCanvas.height;

  // Set display size via CSS
  preview.style.width = "100%";
  preview.style.height = "auto";
  overlay.style.width = "100%";
  overlay.style.height = "auto";

  const ctx = preview.getContext("2d");
  ctx.drawImage(fullCanvas, 0, 0);
}

/**
 * Draw face overlay boxes on the overlay canvas.
 */
export function renderOverlay(faces, selectedFaceId) {
  // Save state for hit testing during canvas interaction
  currentFaces = faces;
  currentSelectedId = selectedFaceId;

  const overlay = els.overlayCanvas;
  const ctx = overlay.getContext("2d");
  ctx.clearRect(0, 0, overlay.width, overlay.height);

  for (const face of faces) {
    const { x, y, width, height } = face.box;
    const isSelected = face.id === selectedFaceId;

    ctx.strokeStyle = isSelected ? "#7C5CFC" : "rgba(124,92,252,0.6)";
    ctx.lineWidth = Math.max(2, Math.min(width, height) * 0.02);
    ctx.setLineDash([]);

    // Rounded rectangle
    const r = Math.min(width, height) * 0.1;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, r);
    ctx.stroke();

    // Light fill on selected
    if (isSelected) {
      ctx.fillStyle = "rgba(124,92,252,0.1)";
      ctx.fill();
    }

    // Controls on selected face
    if (isSelected) {
      const displayScale =
        overlay.getBoundingClientRect().width / overlay.width || 1;

      // Resize handle (centered on bottom-left corner)
      const hs = 24 / displayScale;
      const hx = x - hs / 2;
      const hy = y + height - hs / 2;

      ctx.fillStyle = "#7C5CFC";
      ctx.beginPath();
      ctx.roundRect(hx, hy, hs, hs, hs * 0.15);
      ctx.fill();

      // Diagonal two-headed arrow inside resize handle
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = Math.max(1.5, hs * 0.08);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const ax1 = hx + hs * 0.25;
      const ay1 = hy + hs * 0.75;
      const ax2 = hx + hs * 0.75;
      const ay2 = hy + hs * 0.25;
      ctx.beginPath();
      ctx.moveTo(ax1, ay1);
      ctx.lineTo(ax2, ay2);
      ctx.stroke();
      const arrowLen = hs * 0.2;
      ctx.beginPath();
      ctx.moveTo(ax2 - arrowLen, ay2);
      ctx.lineTo(ax2, ay2);
      ctx.lineTo(ax2, ay2 + arrowLen);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ax1 + arrowLen, ay1);
      ctx.lineTo(ax1, ay1);
      ctx.lineTo(ax1, ay1 - arrowLen);
      ctx.stroke();
      ctx.lineCap = "butt";

      // Delete button (centered on top-right corner)
      const ds = 22 / displayScale;
      const dcx = x + width;
      const dcy = y;

      ctx.fillStyle = "rgba(230, 57, 70, 0.9)";
      ctx.beginPath();
      ctx.arc(dcx, dcy, ds / 2, 0, Math.PI * 2);
      ctx.fill();

      // X inside delete button
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = Math.max(2, ds * 0.1);
      ctx.lineCap = "round";
      const xOff = ds * 0.22;
      ctx.beginPath();
      ctx.moveTo(dcx - xOff, dcy - xOff);
      ctx.lineTo(dcx + xOff, dcy + xOff);
      ctx.moveTo(dcx + xOff, dcy - xOff);
      ctx.lineTo(dcx - xOff, dcy + xOff);
      ctx.stroke();
      ctx.lineCap = "butt";
    }
  }

  // Show selection hint (only when not mid-drag)
  if (selectedFaceId && !drag.active) {
    showSelectionHint("Drag to move");
  } else if (!selectedFaceId && !drag.active) {
    clearSelectionHint();
  }
}

/**
 * Render the processed result on the preview canvas.
 */
export function renderResult(processedCanvas) {
  const preview = els.previewCanvas;
  const ctx = preview.getContext("2d");
  ctx.drawImage(processedCanvas, 0, 0);

  // Clear overlay
  const overlay = els.overlayCanvas;
  overlay.getContext("2d").clearRect(0, 0, overlay.width, overlay.height);
}

export function setUndoRedoState(canUndo, canRedo) {
  if (els.undoBtn) els.undoBtn.disabled = !canUndo;
  if (els.redoBtn) els.redoBtn.disabled = !canRedo;
}

export function resetUI() {
  editorActive = false;
  els.fileInput.value = "";
  showState("empty");
  hideStatus();
  const preview = els.previewCanvas;
  preview.getContext("2d").clearRect(0, 0, preview.width, preview.height);
  els.overlayCanvas
    .getContext("2d")
    .clearRect(0, 0, els.overlayCanvas.width, els.overlayCanvas.height);
  els.thumbnailStrip.classList.remove("visible");
  els.thumbnailStrip.innerHTML = "";
  els.downloadAllBtn.hidden = true;
}
