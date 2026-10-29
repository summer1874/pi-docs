/**
 * Edge-lensing map for the liquid-glass player.
 *
 * feDisplacementMap shifts each backdrop pixel by (R, G) − 128. Near the capsule's rim the map
 * points inward, so the content behind the edge is pulled toward the centre and appears bent,
 * the way light refracts through the curved edge of a glass lens. The interior stays neutral (128, 128).
 * Only Chromium applies SVG filters in backdrop-filter; other browsers keep the plain blur.
 */
export function lensMap(width: number, height: number, band = 14): string {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(w, h);
  const r = h / 2;
  const hx = w / 2 - r;
  // Signed distance to the capsule outline: negative inside.
  const sdf = (x: number, y: number) => {
    const qx = Math.max(Math.abs(x - w / 2) - hx, 0);
    const qy = y - h / 2;
    return Math.hypot(qx, qy) - r;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const depth = -sdf(px, py);
      let dx = 0;
      let dy = 0;
      if (depth > 0 && depth < band) {
        // Outward normal from the distance field's gradient.
        const nx = sdf(px + 1, py) - sdf(px - 1, py);
        const ny = sdf(px, py + 1) - sdf(px, py - 1);
        const len = Math.hypot(nx, ny) || 1;
        const strength = (1 - depth / band) ** 2;
        dx = (-nx / len) * strength;
        dy = (-ny / len) * strength;
      }
      const i = (y * w + x) * 4;
      img.data[i] = 128 + dx * 127;
      img.data[i + 1] = 128 + dy * 127;
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

export const supportsBackdropSvgFilter = () =>
  typeof navigator !== 'undefined' && /Chrome\//.test(navigator.userAgent);
