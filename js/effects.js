// Face blocking effect implementations
// All effects operate on a CanvasRenderingContext2D at full resolution.

/**
 * Gaussian Blur effect.
 * Uses native CSS filter with elliptical clip.
 * Blur radius scales proportionally to face size so small faces
 * in group photos get a tight, appropriately-sized blur.
 */
export function applyBlur(ctx, sourceCanvas, faceBox, intensity) {
  const { x, y, width, height } = faceBox;
  const faceSize = Math.min(width, height);

  // Padding scales with face size but is capped for small faces
  const padding = Math.min(faceSize * 0.05, 20);

  // Blur radius: proportional to face size. For a 400px face at 70% = ~18px blur.
  // For a 60px face at 70% = ~4px blur. Keeps the effect tight on small faces.
  const blurPx = Math.max(2, Math.round((intensity / 100) * faceSize * 0.07));

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(
    x + width / 2,
    y + height / 2,
    width / 2 + padding,
    height / 2 + padding,
    0,
    0,
    Math.PI * 2,
  );
  ctx.clip();

  // Check for native filter support
  if (typeof ctx.filter !== "undefined" && ctx.filter !== undefined) {
    ctx.filter = `blur(${blurPx}px)`;
    const margin = padding + blurPx;
    const sx = Math.max(0, x - margin);
    const sy = Math.max(0, y - margin);
    const sw = Math.min(sourceCanvas.width - sx, width + margin * 2);
    const sh = Math.min(sourceCanvas.height - sy, height + margin * 2);
    ctx.drawImage(sourceCanvas, sx, sy, sw, sh, sx, sy, sw, sh);
    ctx.filter = "none";
  } else {
    // Fallback: pixelate at very small scale for blur-like effect
    applyPixelate(ctx, sourceCanvas, faceBox, Math.max(4, blurPx));
  }

  ctx.restore();
}

/**
 * Pixelate / Mosaic effect.
 * Downscales and upscales with no smoothing.
 */
export function applyPixelate(ctx, sourceCanvas, faceBox, intensity) {
  const { x, y, width, height } = faceBox;
  const faceSize = Math.min(width, height);
  // Scale block size relative to face: big faces get big blocks, small faces get small blocks
  const maxBlocks = Math.max(4, faceSize * 0.1);
  const blockSize = Math.max(2, Math.round((intensity / 100) * maxBlocks) + 2);

  const scaledW = Math.max(1, Math.ceil(width / blockSize));
  const scaledH = Math.max(1, Math.ceil(height / blockSize));

  const offscreen = document.createElement("canvas");
  offscreen.width = scaledW;
  offscreen.height = scaledH;
  const offCtx = offscreen.getContext("2d");
  offCtx.drawImage(sourceCanvas, x, y, width, height, 0, 0, scaledW, scaledH);

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(
    x + width / 2,
    y + height / 2,
    width / 2,
    height / 2,
    0,
    0,
    Math.PI * 2,
  );
  ctx.clip();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(offscreen, 0, 0, scaledW, scaledH, x, y, width, height);
  ctx.restore();
}

/**
 * Black Bar on Eyes effect.
 * Uses 68-point landmarks when available, estimates otherwise.
 */
export function applyBlackBarEyes(
  ctx,
  _sourceCanvas,
  faceBox,
  intensity,
  landmarks,
) {
  const thicknessMultiplier = 0.5 + (intensity / 100) * 1.5;

  if (landmarks && landmarks.positions && landmarks.positions.length >= 48) {
    const leftEye = landmarks.positions.slice(36, 42);
    const rightEye = landmarks.positions.slice(42, 48);
    const allPoints = [...leftEye, ...rightEye];

    const minX = Math.min(...allPoints.map((p) => p.x));
    const maxX = Math.max(...allPoints.map((p) => p.x));
    const minY = Math.min(...allPoints.map((p) => p.y));
    const maxY = Math.max(...allPoints.map((p) => p.y));

    const eyeWidth = maxX - minX;
    const eyeHeight = maxY - minY;
    const paddingH = eyeWidth * 0.25;
    const barHeight =
      Math.max(eyeHeight * 2.5, faceBox.height * 0.14) * thicknessMultiplier;
    const barY = (minY + maxY) / 2 - barHeight / 2;

    ctx.fillStyle = "#000000";
    ctx.fillRect(minX - paddingH, barY, eyeWidth + paddingH * 2, barHeight);
  } else {
    // Fallback: estimate eye position
    const barY = faceBox.y + faceBox.height * 0.28;
    const barHeight = faceBox.height * 0.16 * thicknessMultiplier;
    ctx.fillStyle = "#000000";
    ctx.fillRect(faceBox.x, barY, faceBox.width, barHeight);
  }
}

/**
 * Full Face Blackout effect.
 * Fills an ellipse with solid black.
 */
export function applyBlackout(ctx, _sourceCanvas, faceBox, _intensity) {
  const { x, y, width, height } = faceBox;
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.ellipse(
    x + width / 2,
    y + height / 2,
    (width / 2) * 1.05,
    (height / 2) * 1.05,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
}

/**
 * Emoji Overlay effect.
 */
export function applyEmoji(
  ctx,
  _sourceCanvas,
  faceBox,
  intensity,
  _landmarks,
  emoji = "\u{1F600}",
) {
  const { x, y, width, height } = faceBox;
  const sizeMultiplier = 0.6 + (intensity / 100) * 0.8;
  const size = Math.max(width, height) * sizeMultiplier;

  ctx.save();
  ctx.font = `${size}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, x + width / 2, y + height / 2);
  ctx.restore();
}

/**
 * Solid Color fill effect.
 */
export function applySolidColor(
  ctx,
  _sourceCanvas,
  faceBox,
  _intensity,
  _landmarks,
  color = "#ff0000",
) {
  const { x, y, width, height } = faceBox;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(
    x + width / 2,
    y + height / 2,
    (width / 2) * 1.05,
    (height / 2) * 1.05,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
}

/**
 * Digital Glitch effect.
 * Displaces horizontal slices and separates color channels.
 */
export function applyGlitch(ctx, sourceCanvas, faceBox, intensity) {
  const { x, y, width, height } = faceBox;
  const fx = Math.round(Math.max(0, x));
  const fy = Math.round(Math.max(0, y));
  const fw = Math.round(Math.min(width, sourceCanvas.width - fx));
  const fh = Math.round(Math.min(height, sourceCanvas.height - fy));

  if (fw <= 0 || fh <= 0) return;

  const imageData = ctx.getImageData(fx, fy, fw, fh);
  const data = imageData.data;
  const result = new Uint8ClampedArray(data);
  const strength = intensity / 100;

  // Horizontal slice displacement
  for (let row = 0; row < fh; row++) {
    if (Math.random() < 0.3 * strength) {
      const shift = Math.floor((Math.random() - 0.5) * fw * 0.3 * strength);
      for (let col = 0; col < fw; col++) {
        const srcCol = Math.min(fw - 1, Math.max(0, col - shift));
        const dstIdx = (row * fw + col) * 4;
        const srcIdx = (row * fw + srcCol) * 4;
        result[dstIdx] = data[srcIdx];
        result[dstIdx + 1] = data[srcIdx + 1];
        result[dstIdx + 2] = data[srcIdx + 2];
        result[dstIdx + 3] = data[srcIdx + 3];
      }
    }
  }

  // RGB channel separation on random bands
  const numBands = Math.floor(3 + strength * 8);
  for (let i = 0; i < numBands; i++) {
    const bandY = Math.floor(Math.random() * fh);
    const bandH = Math.floor(Math.random() * fh * 0.08) + 1;
    const channelShift = Math.floor(
      (Math.random() - 0.5) * fw * 0.15 * strength,
    );

    for (let row = bandY; row < Math.min(fh, bandY + bandH); row++) {
      for (let col = 0; col < fw; col++) {
        const idx = (row * fw + col) * 4;
        const srcCol = Math.min(fw - 1, Math.max(0, col + channelShift));
        const srcIdx = (row * fw + srcCol) * 4;
        // Shift only red channel
        result[idx] = data[srcIdx];
      }
    }
  }

  imageData.data.set(result);
  ctx.putImageData(imageData, fx, fy);
}

/**
 * Swirl / Distortion effect.
 * Pixel-by-pixel polar coordinate remapping.
 */
export function applySwirl(ctx, sourceCanvas, faceBox, intensity) {
  const { x, y, width, height } = faceBox;
  const fx = Math.round(Math.max(0, x));
  const fy = Math.round(Math.max(0, y));
  const fw = Math.round(Math.min(width, sourceCanvas.width - fx));
  const fh = Math.round(Math.min(height, sourceCanvas.height - fy));

  if (fw <= 0 || fh <= 0) return;

  const srcData = ctx.getImageData(fx, fy, fw, fh);
  const dstData = ctx.createImageData(fw, fh);
  const swirlAngle = (intensity / 100) * Math.PI * 4; // Up to 720 degrees

  const cx = fw / 2;
  const cy = fh / 2;
  const maxRadius = Math.sqrt(cx * cx + cy * cy);

  for (let py = 0; py < fh; py++) {
    for (let px = 0; px < fw; px++) {
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const normalizedDist = dist / maxRadius;

      // Swirl angle decreases with distance from center
      const angle = swirlAngle * (1 - normalizedDist);

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      let srcX = cos * dx - sin * dy + cx;
      let srcY = sin * dx + cos * dy + cy;

      // Clamp to bounds
      srcX = Math.max(0, Math.min(fw - 1, srcX));
      srcY = Math.max(0, Math.min(fh - 1, srcY));

      // Nearest neighbor sampling
      const sx = Math.round(srcX);
      const sy = Math.round(srcY);
      const srcIdx = (sy * fw + sx) * 4;
      const dstIdx = (py * fw + px) * 4;

      dstData.data[dstIdx] = srcData.data[srcIdx];
      dstData.data[dstIdx + 1] = srcData.data[srcIdx + 1];
      dstData.data[dstIdx + 2] = srcData.data[srcIdx + 2];
      dstData.data[dstIdx + 3] = srcData.data[srcIdx + 3];
    }
  }

  ctx.putImageData(dstData, fx, fy);
}

/**
 * Silhouette effect.
 * Dark shape following face landmarks or ellipse fallback.
 */
export function applySilhouette(
  ctx,
  _sourceCanvas,
  faceBox,
  intensity,
  landmarks,
) {
  const darkness = 0.1 + (1 - intensity / 100) * 0.3;
  const r = Math.round(darkness * 50);
  const g = Math.round(darkness * 50);
  const b = Math.round(darkness * 60);
  const color = `rgb(${r},${g},${b})`;

  if (landmarks && landmarks.positions && landmarks.positions.length >= 17) {
    // Use jawline + estimated forehead
    const jaw = landmarks.positions.slice(0, 17);
    const leftBrow = landmarks.positions.slice(17, 22);
    const rightBrow = landmarks.positions.slice(22, 27);

    // Estimate forehead points above eyebrows
    const browTop = Math.min(
      ...leftBrow.map((p) => p.y),
      ...rightBrow.map((p) => p.y),
    );
    const foreheadHeight = (browTop - faceBox.y) * 0.6;

    ctx.beginPath();
    ctx.moveTo(jaw[0].x, jaw[0].y);
    for (const p of jaw) {
      ctx.lineTo(p.x, p.y);
    }

    // Forehead curve
    const rightTop = rightBrow[rightBrow.length - 1];
    const leftTop = leftBrow[0];
    ctx.lineTo(rightTop.x, rightTop.y - foreheadHeight);

    // Arc across forehead
    const midX = (leftTop.x + rightTop.x) / 2;
    ctx.quadraticCurveTo(
      midX,
      browTop - foreheadHeight * 1.5,
      leftTop.x,
      leftTop.y - foreheadHeight,
    );
    ctx.lineTo(jaw[0].x, jaw[0].y);

    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    // Ellipse fallback
    const { x, y, width, height } = faceBox;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(
      x + width / 2,
      y + height / 2,
      (width / 2) * 1.05,
      (height / 2) * 1.15,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

/**
 * Redact effect (official document style).
 * Black rectangle with subtle texture.
 */
export function applyRedact(ctx, _sourceCanvas, faceBox, _intensity) {
  const { x, y, width, height } = faceBox;
  const pad = 4;

  // Main black rectangle
  ctx.fillStyle = "#000000";
  ctx.fillRect(x - pad, y - pad, width + pad * 2, height + pad * 2);

  // Subtle horizontal scan lines for texture
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  for (let ly = y; ly < y + height; ly += 3) {
    ctx.fillRect(x - pad, ly, width + pad * 2, 1);
  }

  // Rough edges
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  for (let i = 0; i < 15; i++) {
    const ex = x - pad + Math.random() * (width + pad * 2);
    const ey = y - pad + (Math.random() < 0.5 ? 0 : height + pad * 2);
    ctx.fillRect(ex - 1, ey - 1, 3, 3);
  }
}

/**
 * Apply an effect by ID.
 */
export function applyEffect(
  ctx,
  sourceCanvas,
  faceBox,
  effectId,
  intensity,
  landmarks,
  options = {},
) {
  switch (effectId) {
    case "blur":
      return applyBlur(ctx, sourceCanvas, faceBox, intensity);
    case "pixelate":
      return applyPixelate(ctx, sourceCanvas, faceBox, intensity);
    case "black-bar-eyes":
      return applyBlackBarEyes(
        ctx,
        sourceCanvas,
        faceBox,
        intensity,
        landmarks,
      );
    case "blackout":
      return applyBlackout(ctx, sourceCanvas, faceBox, intensity);
    case "emoji":
      return applyEmoji(
        ctx,
        sourceCanvas,
        faceBox,
        intensity,
        landmarks,
        options.emoji,
      );
    case "solid-color":
      return applySolidColor(
        ctx,
        sourceCanvas,
        faceBox,
        intensity,
        landmarks,
        options.color,
      );
    case "glitch":
      return applyGlitch(ctx, sourceCanvas, faceBox, intensity);
    case "swirl":
      return applySwirl(ctx, sourceCanvas, faceBox, intensity);
    case "silhouette":
      return applySilhouette(ctx, sourceCanvas, faceBox, intensity, landmarks);
    case "redact":
      return applyRedact(ctx, sourceCanvas, faceBox, intensity);
    default:
      return applyBlur(ctx, sourceCanvas, faceBox, intensity);
  }
}
