// Canvas utility functions for image loading, resizing, and export

import {
  MAX_IMAGE_DIMENSION,
  DETECTION_MAX_DIMENSION,
  THUMBNAIL_SIZE,
} from "./constants.js";

/**
 * Load an image file into an HTMLImageElement.
 * Returns a promise that resolves with the loaded image.
 */
export function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

/**
 * Read EXIF orientation from a File/Blob.
 * Returns orientation value 1-8, or 1 if not found.
 */
export async function readExifOrientation(file) {
  try {
    const buffer = await file.slice(0, 65536).arrayBuffer();
    const view = new DataView(buffer);

    // Check JPEG SOI marker
    if (view.getUint16(0) !== 0xffd8) return 1;

    let offset = 2;
    while (offset < view.byteLength - 2) {
      const marker = view.getUint16(offset);
      offset += 2;

      if (marker === 0xffe1) {
        // APP1 (EXIF)
        const length = view.getUint16(offset);
        offset += 2;

        // Check "Exif\0\0"
        const exifHeader = view.getUint32(offset);
        if (exifHeader !== 0x45786966) return 1;
        offset += 6;

        const tiffOffset = offset;
        const littleEndian = view.getUint16(tiffOffset) === 0x4949;
        const ifdOffset = view.getUint32(tiffOffset + 4, littleEndian);
        const numEntries = view.getUint16(tiffOffset + ifdOffset, littleEndian);

        for (let i = 0; i < numEntries; i++) {
          const entryOffset = tiffOffset + ifdOffset + 2 + i * 12;
          if (entryOffset + 12 > view.byteLength) break;
          const tag = view.getUint16(entryOffset, littleEndian);
          if (tag === 0x0112) {
            // Orientation tag
            return view.getUint16(entryOffset + 8, littleEndian);
          }
        }
        return 1;
      } else if ((marker & 0xff00) === 0xff00) {
        offset += view.getUint16(offset);
      } else {
        break;
      }
    }
  } catch {
    // Ignore EXIF errors
  }
  return 1;
}

/**
 * Draw an image to a canvas with EXIF orientation correction.
 * Returns { canvas, ctx, width, height }.
 */
export function drawImageCorrected(img, orientation, maxDim) {
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;

  // Limit dimensions
  if (maxDim && Math.max(w, h) > maxDim) {
    const scale = maxDim / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Orientations 5-8 swap width/height
  const swapDims = orientation >= 5 && orientation <= 8;
  canvas.width = swapDims ? h : w;
  canvas.height = swapDims ? w : h;

  // Apply transform based on orientation
  switch (orientation) {
    case 2:
      ctx.transform(-1, 0, 0, 1, w, 0);
      break;
    case 3:
      ctx.transform(-1, 0, 0, -1, w, h);
      break;
    case 4:
      ctx.transform(1, 0, 0, -1, 0, h);
      break;
    case 5:
      ctx.transform(0, 1, 1, 0, 0, 0);
      break;
    case 6:
      ctx.transform(0, 1, -1, 0, h, 0);
      break;
    case 7:
      ctx.transform(0, -1, -1, 0, h, w);
      break;
    case 8:
      ctx.transform(0, -1, 1, 0, 0, w);
      break;
    default:
      break;
  }

  ctx.drawImage(img, 0, 0, w, h);
  return { canvas, ctx, width: canvas.width, height: canvas.height };
}

/**
 * Create a downscaled canvas for face detection.
 * Returns { canvas, scale } where scale maps detection coords back to full-res.
 */
export function createDetectionCanvas(sourceCanvas) {
  const maxDim = DETECTION_MAX_DIMENSION;
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;

  if (Math.max(w, h) <= maxDim) {
    return { canvas: sourceCanvas, scale: 1 };
  }

  const scale = maxDim / Math.max(w, h);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);

  const ctx = canvas.getContext("2d");
  ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);

  return { canvas, scale };
}

/**
 * Export a canvas as a Blob.
 */
export function exportAsBlob(canvas, format = "image/png", quality = 0.92) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), format, quality);
  });
}

/**
 * Trigger a download of a Blob.
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Small delay before revoking to ensure download starts
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Clone a canvas with its content.
 */
export function cloneCanvas(source) {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  canvas.getContext("2d").drawImage(source, 0, 0);
  return canvas;
}

/**
 * Generate a small thumbnail data URL from a File.
 */
export function generateThumbnail(file, maxSize = THUMBNAIL_SIZE) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = maxSize / Math.max(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.6));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
