import { useState, useEffect } from "react";
import { detectProductBounds, type ProductBounds } from "@/lib/product-bounds-detector";

const DEFAULT: ProductBounds = {
  fractionX: 0.85,
  fractionY: 0.85,
  centerX: 0.5,
  centerY: 0.5,
  detected: false,
  imageAspectRatio: 1,
};

type ProductBoundsDetectOptions = {
  whiteThreshold?: number;
  alphaThreshold?: number;
  margin?: number;
  maxSize?: number;
};

/**
 * Hook that detects the product's real bounding box in its catalog image.
 * Returns fraction values used for cm→px scaling.
 */
export function useProductBounds(
  imageUrl: string | null | undefined,
  options?: ProductBoundsDetectOptions
): ProductBounds {
  const [bounds, setBounds] = useState<ProductBounds>(DEFAULT);
  const whiteThreshold = options?.whiteThreshold;
  const alphaThreshold = options?.alphaThreshold;
  const margin = options?.margin;
  const maxSize = options?.maxSize;

  useEffect(() => {
    if (!imageUrl) {
      setBounds(DEFAULT);
      return;
    }

    let cancelled = false;

    detectProductBounds(imageUrl, { whiteThreshold, alphaThreshold, margin, maxSize }).then((result) => {
      if (!cancelled) setBounds(result);
    });

    return () => {
      cancelled = true;
    };
  }, [alphaThreshold, imageUrl, margin, maxSize, whiteThreshold]);

  return bounds;
}
