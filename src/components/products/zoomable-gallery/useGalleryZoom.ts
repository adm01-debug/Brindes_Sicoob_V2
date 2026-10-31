import { type Dispatch, type SetStateAction, type WheelEvent, useState, useRef, useCallback, useEffect } from "react";
import { useMotionValue, type MotionValue } from "framer-motion";

interface ZoomControlOptions {
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
  setRotation: Dispatch<SetStateAction<number>>;
  setIsZooming: Dispatch<SetStateAction<boolean>>;
  scale: MotionValue<number>;
  x: MotionValue<number>;
  y: MotionValue<number>;
}

function useZoomControls({ zoom, setZoom, setRotation, setIsZooming, scale, x, y }: ZoomControlOptions) {
  const resetView = useCallback(() => { setZoom(1); setRotation(0); scale.set(1); x.set(0); y.set(0); setIsZooming(false); }, [scale, setIsZooming, setRotation, setZoom, x, y]);
  const handleZoomIn = useCallback(() => { const value = Math.min(zoom + 0.5, 5); setZoom(value); scale.set(value); setIsZooming(value > 1); }, [zoom, scale, setIsZooming, setZoom]);
  const handleZoomOut = useCallback(() => { const value = Math.max(zoom - 0.5, 1); setZoom(value); scale.set(value); if (value === 1) { x.set(0); y.set(0); setIsZooming(false); } }, [zoom, scale, setIsZooming, setZoom, x, y]);
  const handleRotate = useCallback(() => setRotation((value) => (value + 90) % 360), [setRotation]);
  return { resetView, handleZoomIn, handleZoomOut, handleRotate };
}

function useGalleryKeyboard(options: { isFullscreen: boolean; goToPrevious: () => void; goToNext: () => void; handleZoomIn: () => void; handleZoomOut: () => void; handleRotate: () => void; resetView: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!options.isFullscreen) return;
      const actions: Partial<Record<string, () => void>> = { ArrowLeft: options.goToPrevious, ArrowRight: options.goToNext, '+': options.handleZoomIn, '=': options.handleZoomIn, '-': options.handleZoomOut, r: options.handleRotate, '0': options.resetView };
      actions[event.key]?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [options]);
}

export function useGalleryZoom(images: string[], isFullscreen: boolean) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [, setIsZooming] = useState(false);
  const [rotation, setRotation] = useState(0);

  const lastTapRef = useRef(0);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);

  const { resetView, handleZoomIn, handleZoomOut, handleRotate } = useZoomControls({ zoom, setZoom, setRotation, setIsZooming, scale, x, y });

  useEffect(() => { resetView(); }, [currentIndex, resetView]);

  const handleDoubleTap = useCallback(() => {
    if (zoom > 1) { resetView(); } else { setZoom(2.5); scale.set(2.5); setIsZooming(true); }
  }, [zoom, resetView, scale]);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) handleDoubleTap();
    lastTapRef.current = now;
  }, [handleDoubleTap]);

  const goToPrevious = useCallback(() => setCurrentIndex(prev => prev === 0 ? images.length - 1 : prev - 1), [images.length]);
  const goToNext = useCallback(() => setCurrentIndex(prev => prev === images.length - 1 ? 0 : prev + 1), [images.length]);

  useGalleryKeyboard({ isFullscreen, goToPrevious, goToNext, handleZoomIn, handleZoomOut, handleRotate, resetView });

  const handleWheel = useCallback((e: WheelEvent) => {
    if (!isFullscreen) return;
    e.preventDefault();
    if (e.deltaY < 0) handleZoomIn(); else handleZoomOut();
  }, [isFullscreen, handleZoomIn, handleZoomOut]);

  return {
    currentIndex, setCurrentIndex, zoom, rotation, x, y, scale,
    resetView, handleZoomIn, handleZoomOut, handleRotate, handleTap,
    goToPrevious, goToNext, handleWheel,
  };
}
