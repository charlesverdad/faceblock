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
    // Ensure minimum 44px screen touch target
    const displayScale = getDisplayScale();
    const minCanvasPx = 44 / displayScale;
    return Math.max(minCanvasPx, 24);
  }

  function getDeleteBtnSize() {
    const displayScale = getDisplayScale();
    const minCanvasPx = 32 / displayScale;
    return Math.max(minCanvasPx, 20);
  }

  function hitTest(cx, cy) {
    if (currentSelectedId) {
      const selected = currentFaces.find((f) => f.id === currentSelectedId);
      if (selected) {
        const b = selected.box;

        // Check delete button (top-right)
        const ds = getDeleteBtnSize();
        const dx = b.x + b.width - ds / 2;
        const dy = b.y - ds / 2;
        const dCx = dx + ds / 2;
        const dCy = dy + ds / 2;
        const dDist = Math.sqrt((cx - dCx) ** 2 + (cy - dCy) ** 2);
        if (dDist <= ds / 2 + 4) {
          return { type: "delete", face: selected };
        }

        // Check resize handle (bottom-right)
        const hs = getHandleSize();
        const hx = b.x + b.width - hs;
        const hy = b.y + b.height - hs;
        if (cx >= hx && cx <= hx + hs && cy >= hy && cy <= hy + hs) {
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

  function getDragBox() {
    const x1 = Math.min(drag.startX, drag.currentX);
    const y1 = Math.min(drag.startY, drag.currentY);
    const x2 = Math.max(drag.startX, drag.currentX);
    const y2 = Math.max(drag.startY, drag.currentY);
    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
  }

  function getResizeBox() {
    const dx = drag.currentX - drag.startX;
    const dy = drag.currentY - drag.startY;
    return {
      x: drag.origBox.x,
      y: drag.origBox.y,
      width: Math.max(20, drag.origBox.width + dx),
      height: Math.max(20, drag.origBox.height + dy),
    };
  }

  function drawDragPreview() {
    renderOverlay(currentFaces, currentSelectedId);
    const ctx = canvas.getContext("2d");

    if (drag.mode === "draw") {
      const box = getDragBox();
      ctx.strokeStyle = "#f4a261";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.setLineDash([]);
    } else if (drag.mode === "move") {
      const dx = drag.currentX - drag.startX;
      const dy = drag.currentY - drag.startY;
      const b = drag.origBox;
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(b.x + dx, b.y + dy, b.width, b.height);
      ctx.fillStyle = "rgba(16,185,129,0.08)";
      ctx.fillRect(b.x + dx, b.y + dy, b.width, b.height);
      ctx.setLineDash([]);
    } else if (drag.mode === "resize") {
      const box = getResizeBox();
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(box.x, box.y, box.width, box.height);
      ctx.setLineDash([]);
    }
  }

  function handlePointerDown(x, y) {
    const hit = hitTest(x, y);
    drag.startX = x;
    drag.startY = y;
    drag.currentX = x;
    drag.currentY = y;

    if (hit.type === "delete") {
      // Immediately delete the face
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
    } else if (hit.type === "face") {
      // Tap unselected face — select it
      callbacks.onCanvasClick?.(x, y);
    } else {
      // Empty space — start drawing new box
      drag.active = true;
      drag.mode = "draw";
      drag.targetFaceId = null;
      drag.origBox = null;
    }
  }

  function handlePointerMove(x, y) {
    if (!drag.active) return;
    drag.currentX = x;
    drag.currentY = y;
    drawDragPreview();
  }

  function handlePointerUp(x, y) {
    if (!drag.active) return;
    drag.currentX = x;
    drag.currentY = y;
    const dx = x - drag.startX;
    const dy = y - drag.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (drag.mode === "draw") {
      if (dist < 5) {
        // Tiny drag = click on empty space
        callbacks.onCanvasClick?.(x, y);
      } else {
        const box = getDragBox();
        if (box.width > 10 && box.height > 10) {
          callbacks.onFaceDrawn?.(box);
        }
      }
    } else if (drag.mode === "move") {
      if (dist > 3) {
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
      canvas.style.cursor = "nwse-resize";
    } else if (hit.type === "face" && hit.face.id === currentSelectedId) {
      canvas.style.cursor = "move";
    } else if (hit.type === "face") {
      canvas.style.cursor = "pointer";
    } else {
      canvas.style.cursor = "crosshair";
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
      e.preventDefault();
      const touch = e.touches[0];
      const coords = getCanvasCoords(touch.clientX, touch.clientY);
      if (coords) handlePointerDown(coords.x, coords.y);
    },
    { passive: false },
  );

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
  els.downloadAllBtn.textContent = `Download All (${photos.length})`;

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

export function setFaceCount(count) {
  els.faceCount.textContent =
    count > 0
      ? `${count} face${count > 1 ? "s" : ""} detected`
      : "No faces detected (click image to add)";
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
    const isManual = face.manual;

    ctx.strokeStyle = isSelected
      ? "#10b981"
      : isManual
        ? "#f4a261"
        : "rgba(16,185,129,0.7)";
    ctx.lineWidth = Math.max(2, Math.min(width, height) * 0.02);
    ctx.setLineDash(isManual ? [8, 4] : []);

    // Rounded rectangle
    const r = Math.min(width, height) * 0.1;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, r);
    ctx.stroke();

    // Light fill on hover/selected
    if (isSelected) {
      ctx.fillStyle = "rgba(16,185,129,0.1)";
      ctx.fill();
    }

    // Label
    ctx.setLineDash([]);
    const label = face.manual ? "Manual" : `Face ${faces.indexOf(face) + 1}`;
    const fontSize = Math.max(12, Math.min(width * 0.12, 20));
    ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
    const textWidth = ctx.measureText(label).width;
    const pad = 4;

    ctx.fillStyle = isSelected ? "#10b981" : "rgba(16,185,129,0.8)";
    ctx.fillRect(
      x,
      y - fontSize - pad * 2,
      textWidth + pad * 2,
      fontSize + pad * 2,
    );

    ctx.fillStyle = "#fff";
    ctx.textBaseline = "top";
    ctx.fillText(label, x + pad, y - fontSize - pad);

    // Controls on selected face
    if (isSelected) {
      const displayScale =
        overlay.getBoundingClientRect().width / overlay.width || 1;

      // Resize handle (bottom-right corner) — minimum 44px screen touch target
      const hs = Math.max(44 / displayScale, 24);
      const hx = x + width - hs;
      const hy = y + height - hs;

      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.roundRect(hx, hy, hs, hs, hs * 0.15);
      ctx.fill();

      // Grip lines inside resize handle
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = Math.max(1.5, hs * 0.06);
      ctx.beginPath();
      ctx.moveTo(hx + hs * 0.25, hy + hs * 0.85);
      ctx.lineTo(hx + hs * 0.85, hy + hs * 0.25);
      ctx.moveTo(hx + hs * 0.45, hy + hs * 0.85);
      ctx.lineTo(hx + hs * 0.85, hy + hs * 0.45);
      ctx.moveTo(hx + hs * 0.65, hy + hs * 0.85);
      ctx.lineTo(hx + hs * 0.85, hy + hs * 0.65);
      ctx.stroke();

      // Delete button (top-right corner) — circle with X
      const ds = Math.max(32 / displayScale, 20);
      const dcx = x + width - ds / 2;
      const dcy = y - ds / 2;

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
