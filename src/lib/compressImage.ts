const MAX_EDGE = 640;
const QUALITY = 0.72;

async function decode(file: File): Promise<{ source: CanvasImageSource; w: number; h: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() };
    } catch {
      /* fall through to <img> */
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  await img.decode();
  return { source: img, w: img.naturalWidth, h: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
}

const toBlob = (canvas: HTMLCanvasElement, type: string) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));

/**
 * Downscales to ≤640px on the long edge and re-encodes as WebP (JPEG on browsers that
 * can't encode WebP). A 4 MB phone selfie typically becomes 30–70 KB.
 */
export async function compressImage(file: File): Promise<Blob> {
  const { source, w, h, close } = await decode(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas_unavailable");
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

    // Safari < 17 silently returns PNG for image/webp, so verify the type we got back.
    const webp = await toBlob(canvas, "image/webp");
    if (webp && webp.type === "image/webp") return webp;
    const jpeg = await toBlob(canvas, "image/jpeg");
    if (jpeg) return jpeg;
    throw new Error("encode_failed");
  } finally {
    close();
  }
}
