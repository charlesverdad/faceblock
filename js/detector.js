// Face detection module using face-api.js
// Uses SSD MobileNet v1 for better accuracy on group photos,
// angled faces, and distant/small faces.
// face-api.js is loaded via script tag and available as window.faceapi

import { MODEL_BASE_URL, SENSITIVITY_PRESETS } from './constants.js';

let modelsLoaded = false;

function getFaceApi() {
  if (!window.faceapi) {
    throw new Error('face-api.js not loaded. Check script tag in index.html.');
  }
  return window.faceapi;
}

/**
 * Load face detection models.
 * @param {function} onProgress - Callback for progress updates
 */
export async function loadModels(onProgress) {
  if (modelsLoaded) return;

  const faceapi = getFaceApi();

  onProgress?.('Loading face detector model...');
  await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_BASE_URL);

  onProgress?.('Loading landmark model...');
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_BASE_URL);

  modelsLoaded = true;
  onProgress?.('Models ready');
}

/**
 * Check if models are loaded.
 */
export function isReady() {
  return modelsLoaded;
}

/**
 * Detect faces in a canvas element.
 * @param {HTMLCanvasElement} canvas - The canvas to detect faces in
 * @param {string} sensitivity - 'low', 'medium', or 'high'
 * @param {number} detectionScale - Scale factor from detection canvas to full-res
 * @returns {Array} Array of face detection results with scaled coordinates
 */
export async function detectFaces(canvas, sensitivity = 'medium', detectionScale = 1) {
  if (!modelsLoaded) throw new Error('Models not loaded');

  const faceapi = getFaceApi();
  const preset = SENSITIVITY_PRESETS[sensitivity] || SENSITIVITY_PRESETS.medium;

  const options = new faceapi.SsdMobilenetv1Options({
    minConfidence: preset.minConfidence,
  });

  const results = await faceapi.detectAllFaces(canvas, options).withFaceLandmarks();

  // Scale coordinates back to full resolution and normalize the output
  return results.map((r, index) => {
    const box = r.detection.box;
    const scale = 1 / detectionScale;

    const scaledBox = {
      x: box.x * scale,
      y: box.y * scale,
      width: box.width * scale,
      height: box.height * scale,
    };

    let scaledLandmarks = null;
    if (r.landmarks) {
      scaledLandmarks = {
        positions: r.landmarks.positions.map(p => ({
          x: p.x * scale,
          y: p.y * scale,
        })),
      };
    }

    return {
      id: `face-${index}`,
      box: scaledBox,
      score: r.detection.score,
      landmarks: scaledLandmarks,
      manual: false,
    };
  });
}
