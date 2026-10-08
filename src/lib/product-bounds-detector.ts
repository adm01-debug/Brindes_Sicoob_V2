import { logger } from "@/lib/logger";
/**
 * Product Bounds Detector
 * 
 * Detects the actual bounding box of a product within its catalog image
 * using an offscreen canvas. Works best with white/transparent backgrounds
 * (standard for catalog photos).
 * 
 * Returns the fraction of the image that the product occupies, which is
 * then used to calculate accurate cm-to-px scaling.
 */

export interface ProductBounds {
  /** Fraction of image width occupied by product (0-1) */
  fractionX: number;
  /** Fraction of image height occupied by product (0-1) */
  fractionY: number;
  /** Product center X as fraction of image (0-1) */
  centerX: number;
  /** Product center Y as fraction of image (0-1) */
  centerY: number;
  /** Whether detection succeeded or fell back to default */
  detected: boolean;
  /** Natural aspect ratio of the source image (width / height) */
  imageAspectRatio: number;
}

const DEFAULT_BOUNDS: ProductBounds = {
  fractionX: 0.85,
  fractionY: 0.85,
  centerX: 0.5,
  centerY: 0.5,
  detected: false,
  imageAspectRatio: 1,
};

// Cache to avoid reprocessing the same image
const boundsCache = new Map<string, ProductBounds>();

interface DetectorOptions {
  whiteThreshold: number;
  alphaThreshold: number;
  margin: number;
  maxSize: number;
}

function detectorOptions(options: Partial<DetectorOptions> | undefined): DetectorOptions {
  return {
    whiteThreshold: options?.whiteThreshold ?? 245,
    alphaThreshold: options?.alphaThreshold ?? 10,
    margin: options?.margin ?? 0.02,
    maxSize: options?.maxSize ?? 512,
  };
}

function naturalImageSize(image: HTMLImageElement) {
  return { width: image.naturalWidth || image.width, height: image.naturalHeight || image.height };
}

interface PixelBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  productPixels: number;
}

function isProductPixel(
  data: Uint8ClampedArray,
  index: number,
  whiteThreshold: number,
  alphaThreshold: number,
) {
  const alpha = data[index + 3] ?? 0;
  if (alpha < alphaThreshold) return false;
  const isWhite = (data[index] ?? 0) >= whiteThreshold
    && (data[index + 1] ?? 0) >= whiteThreshold
    && (data[index + 2] ?? 0) >= whiteThreshold;
  return !isWhite;
}

function scanPixelBounds(
  { data, width, height, whiteThreshold, alphaThreshold }: {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    whiteThreshold: number;
    alphaThreshold: number;
  },
): PixelBounds {
  const bounds: PixelBounds = { minX: width, maxX: 0, minY: height, maxY: 0, productPixels: 0 };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!isProductPixel(data, (y * width + x) * 4, whiteThreshold, alphaThreshold)) continue;
      bounds.productPixels += 1;
      bounds.minX = Math.min(bounds.minX, x);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxY = Math.max(bounds.maxY, y);
    }
  }
  return bounds;
}

function calculateDetectedBounds(
  { pixels, width, height, margin, imageAspectRatio }: {
    pixels: PixelBounds;
    width: number;
    height: number;
    margin: number;
    imageAspectRatio: number;
  },
) {
  const productRatio = pixels.productPixels / (width * height);
  if (pixels.productPixels < 100 || productRatio < 0.01) {
    return { ...DEFAULT_BOUNDS, imageAspectRatio };
  }
  if (productRatio > 0.95) {
    return { fractionX: 0.95, fractionY: 0.95, centerX: 0.5, centerY: 0.5, detected: true, imageAspectRatio };
  }
  const boundsWidth = pixels.maxX - pixels.minX;
  const boundsHeight = pixels.maxY - pixels.minY;
  return {
    fractionX: Math.min(1, (boundsWidth / width) + margin * 2),
    fractionY: Math.min(1, (boundsHeight / height) + margin * 2),
    centerX: (pixels.minX + boundsWidth / 2) / width,
    centerY: (pixels.minY + boundsHeight / 2) / height,
    detected: true,
    imageAspectRatio,
  };
}

/**
 * Detect the product's bounding box in the image by scanning for
 * non-background pixels. Background is identified as near-white or
 * near-transparent pixels.
 * 
 * @param imageUrl URL of the product image
 * @param options.whiteThreshold Pixel brightness above which is "background" (0-255, default 245)
 * @param options.alphaThreshold Alpha below which is "transparent" (0-255, default 10)
 * @param options.margin Extra margin fraction to add around detected bounds (default 0.02)
 * @param options.maxSize Max canvas dimension for performance (default 512)
 */
export async function detectProductBounds(
  imageUrl: string,
  options?: {
    whiteThreshold?: number;
    alphaThreshold?: number;
    margin?: number;
    maxSize?: number;
  }
): Promise<ProductBounds> {
  // Check cache
  const cached = boundsCache.get(imageUrl);
  if (cached) return cached;

  const { whiteThreshold, alphaThreshold, margin, maxSize } = detectorOptions(options);

  try {
    const img = await loadImageCors(imageUrl);
    
    // Capture natural aspect ratio before scaling
    const { width: natW, height: natH } = naturalImageSize(img);
    if (natW === 0 || natH === 0) return DEFAULT_BOUNDS;
    const imageAspectRatio = natW / natH;

    // Scale down for performance
    let w = natW;
    let h = natH;

    const scale = Math.min(1, maxSize / Math.max(w, h));
    w = Math.round(w * scale);
    h = Math.round(h * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return DEFAULT_BOUNDS;

    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const pixels = scanPixelBounds({
      data: imageData.data,
      width: w,
      height: h,
      whiteThreshold,
      alphaThreshold,
    });
    const result = calculateDetectedBounds({
      pixels,
      width: w,
      height: h,
      margin,
      imageAspectRatio,
    });

    boundsCache.set(imageUrl, result);
    return result;

  } catch (err) {
    logger.warn("[ProductBoundsDetector] Failed to detect bounds, using fallback:", err);
    return DEFAULT_BOUNDS;
  }
}

/**
 * Load an image handling CORS. First tries direct load,
 * then falls back to fetch+blob if CORS blocks canvas read.
 */
function loadImageCors(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = async () => {
      // Fallback: fetch as blob to bypass CORS
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const img2 = new Image();
        img2.onload = () => {
          URL.revokeObjectURL(blobUrl);
          resolve(img2);
        };
        img2.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          reject(new Error("Failed to load image via blob fallback"));
        };
        img2.src = blobUrl;
      } catch (e) {
        reject(e);
      }
    };
    img.src = url;
  });
}

/**
 * Clear the bounds cache (useful if images are updated).
 */
export function clearBoundsCache() {
  boundsCache.clear();
}
