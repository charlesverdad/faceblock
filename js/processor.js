// Pipeline orchestrator: coordinates detection and effect application

import { loadModels, detectFaces, isReady } from './detector.js';
import { applyEffect } from './effects.js';
import {
  loadImageFromFile,
  readExifOrientation,
  drawImageCorrected,
  createDetectionCanvas,
  cloneCanvas,
  exportAsBlob,
  downloadBlob,
} from './canvas-utils.js';
import { MAX_IMAGE_DIMENSION } from './constants.js';

/**
 * Full pipeline: load image file, detect faces, return state.
 * @param {File} file - Image file
 * @param {string} sensitivity - Detection sensitivity
 * @param {function} onProgress - Progress callback
 * @returns {{ fullCanvas, faces }}
 */
export async function loadAndDetect(file, sensitivity, onProgress) {
  // Ensure models are loaded
  if (!isReady()) {
    await loadModels(onProgress);
  }

  onProgress?.('Loading image...');
  const img = await loadImageFromFile(file);
  const orientation = await readExifOrientation(file);

  // Draw to full-res canvas with EXIF correction
  const { canvas: fullCanvas } = drawImageCorrected(img, orientation, MAX_IMAGE_DIMENSION);

  onProgress?.('Detecting faces...');

  // Create downscaled canvas for detection
  const { canvas: detCanvas, scale } = createDetectionCanvas(fullCanvas);

  // Run detection
  const faces = await detectFaces(detCanvas, sensitivity, scale);

  onProgress?.(faces.length > 0 ? `Found ${faces.length} face${faces.length > 1 ? 's' : ''}` : 'No faces detected');

  return { fullCanvas, faces };
}

/**
 * Re-detect faces on an existing canvas with a new sensitivity.
 */
export async function redetect(fullCanvas, sensitivity, onProgress) {
  onProgress?.('Re-detecting faces...');
  const { canvas: detCanvas, scale } = createDetectionCanvas(fullCanvas);
  const faces = await detectFaces(detCanvas, sensitivity, scale);
  onProgress?.(faces.length > 0 ? `Found ${faces.length} face${faces.length > 1 ? 's' : ''}` : 'No faces detected');
  return faces;
}

/**
 * Apply effects to all faces and return the processed canvas.
 * @param {HTMLCanvasElement} fullCanvas - Original full-res canvas
 * @param {Array} faces - Face detection results with effect settings
 * @param {string} globalEffectId - Default effect ID
 * @param {number} globalIntensity - Default intensity
 * @param {object} globalOptions - Default options (emoji, color)
 * @returns {HTMLCanvasElement} Processed canvas
 */
export function processImage(fullCanvas, faces, globalEffectId, globalIntensity, globalOptions = {}) {
  // Clone the canvas so we don't modify the original
  const processed = cloneCanvas(fullCanvas);
  const ctx = processed.getContext('2d');

  for (const face of faces) {
    const effectId = face.effectId || globalEffectId;
    const intensity = face.intensity != null ? face.intensity : globalIntensity;
    const options = face.options || globalOptions;

    applyEffect(ctx, fullCanvas, face.box, effectId, intensity, face.landmarks, options);
  }

  return processed;
}

/**
 * Export the processed canvas and trigger download.
 */
export async function exportImage(processedCanvas, format, quality, originalFilename) {
  const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const ext = format === 'jpeg' ? '.jpg' : '.png';

  // Build output filename
  const baseName = originalFilename
    ? originalFilename.replace(/\.[^.]+$/, '')
    : 'photo';
  const filename = `faceblock_${baseName}${ext}`;

  const blob = await exportAsBlob(processedCanvas, mimeType, quality);
  downloadBlob(blob, filename);

  return filename;
}
