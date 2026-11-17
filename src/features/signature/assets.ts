import type { Asset } from "../../types";
export const styles = ["Caveat", "Dancing Script", "Allura"];
export function fromCanvas(canvas: HTMLCanvasElement, trim = true): Asset {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const { width: w, height: h } = canvas;
  const pixels = ctx.getImageData(0, 0, w, h).data;
  let left = w,
    top = h,
    right = -1,
    bottom = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (pixels[(y * w + x) * 4 + 3] > 8) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
  if (right < 0) throw new Error("Add some ink before creating a signature.");
  if (!trim) {
    left = 0;
    top = 0;
    right = w - 1;
    bottom = h - 1;
  }
  const out = document.createElement("canvas");
  out.width = right - left + 17;
  out.height = bottom - top + 17;
  out
    .getContext("2d")!
    .drawImage(
      canvas,
      left,
      top,
      right - left + 1,
      bottom - top + 1,
      8,
      8,
      right - left + 1,
      bottom - top + 1,
    );
  const preview = out.toDataURL("image/png");
  const png = Uint8Array.from(atob(preview.split(",")[1]), (c) =>
    c.charCodeAt(0),
  );
  return {
    id: crypto.randomUUID(),
    png,
    width: out.width,
    height: out.height,
    preview,
  };
}
export async function typedAsset(
  name: string,
  font: string,
  color: string,
): Promise<Asset> {
  if (!name.trim()) throw new Error("Enter your name.");
  await document.fonts.load(`64px "${font}"`);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = `64px "${font}"`;
  canvas.width = Math.ceil(ctx.measureText(name.trim()).width) + 60;
  canvas.height = 160;
  ctx.font = `64px "${font}"`;
  ctx.fillStyle = color;
  ctx.fillText(name.trim(), 30, 100);
  return fromCanvas(canvas);
}
function imageSize(bytes: Uint8Array): [number, number] {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    bytes.length >= 24 &&
    v.getUint32(0) === 0x89504e47 &&
    v.getUint32(4) === 0x0d0a1a0a
  )
    return [v.getUint32(16), v.getUint32(20)];
  if (bytes[0] === 255 && bytes[1] === 216) {
    let i = 2;
    while (i + 8 < bytes.length) {
      if (bytes[i++] !== 255) continue;
      const marker = bytes[i++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0xd8 || marker === 1 || (marker >= 0xd0 && marker <= 0xd7))
        continue;
      const len = v.getUint16(i);
      if (len < 2) break;
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker)
      )
        return [v.getUint16(i + 5), v.getUint16(i + 3)];
      i += len;
    }
  }
  throw new Error("Choose a valid PNG or JPEG image.");
}
export async function importAsset(file: File): Promise<Asset> {
  if (!file.size || file.size > 10 * 1024 * 1024)
    throw new Error("Choose a PNG or JPEG up to 10 MiB.");
  const [w, h] = imageSize(new Uint8Array(await file.arrayBuffer()));
  if (!w || !h || w > 8192 || h > 8192 || w * h > 16000000)
    throw new Error(
      "Image exceeds 8192 pixels per edge or 16 megapixels. Choose a smaller image.",
    );
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      "This image could not be decoded. Choose another PNG or JPEG.",
    );
  }
  try {
    if (bitmap.width * bitmap.height > 16000000)
      throw new Error("Image dimensions are too large.");
    const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas
      .getContext("2d")!
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return fromCanvas(canvas, false);
  } finally {
    bitmap.close();
  }
}
