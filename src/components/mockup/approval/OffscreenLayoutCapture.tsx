/**
 * OffscreenLayoutCapture — Renders the approval template off-screen,
 * captures it with html2canvas, uploads to storage, and updates the DB record.
 * 
 * Usage: set `captureRequest` with the data + record ID. Once captured, it
 * auto-clears and calls `onCaptured`.
 */

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { MockupApprovalTemplate } from "./MockupApprovalTemplate";
import { supabase } from "@/integrations/supabase/client";
import type { MockupApprovalData } from "@/types/mockup-approval";
import { logger } from "@/lib/logger";

export interface LayoutCaptureRequest {
  data: MockupApprovalData;
  recordId: string;
  userId: string;
}

interface OffscreenLayoutCaptureProps {
  request: LayoutCaptureRequest | null;
  onCaptured?: (recordId: string) => void;
}

const wait = (milliseconds: number) => new Promise<void>((resolve) => {
  setTimeout(resolve, milliseconds);
});

function waitForImage(image: HTMLImageElement) {
  if (image.complete) return Promise.resolve();
  return new Promise<void>((resolve) => {
    image.onload = () => resolve();
    image.onerror = () => resolve();
    setTimeout(resolve, 8000);
  });
}

async function waitForImages(element: HTMLElement) {
  const images = Array.from(element.querySelectorAll("img"));
  await Promise.all(images.map(waitForImage));
}

async function renderLayout(element: HTMLElement) {
  const html2canvas = (await import("html2canvas")).default;
  const canvas = await html2canvas(element, {
    scale: 1.5,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
  });
  return canvas.toDataURL("image/jpeg", 0.85);
}

async function uploadLayout(dataUrl: string, userId: string) {
  const blob = await (await fetch(dataUrl)).blob();
  const storagePath = `${userId}/mockup-layouts/layout-${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from("mockup-art-files")
    .upload(storagePath, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  return supabase.storage.from("mockup-art-files").getPublicUrl(storagePath).data.publicUrl;
}

async function saveLayoutUrl(recordId: string, layoutUrl: string) {
  const { error } = await supabase
    .from("generated_mockups")
    .update({ layout_url: layoutUrl })
    .eq("id", recordId);
  if (error) throw error;
}

interface CaptureContext {
  element: HTMLElement;
  request: LayoutCaptureRequest;
  isMounted: () => boolean;
}

async function captureLayout({ element, request, isMounted }: CaptureContext) {
  await waitForImages(element);
  await wait(500);
  if (!isMounted()) return false;
  const dataUrl = await renderLayout(element);
  if (!isMounted()) return false;
  const publicUrl = await uploadLayout(dataUrl, request.userId);
  await saveLayoutUrl(request.recordId, publicUrl);
  return true;
}

function useOffscreenCapture(
  request: LayoutCaptureRequest | null,
  onCaptured: OffscreenLayoutCaptureProps["onCaptured"],
  templateRef: RefObject<HTMLDivElement>,
) {
  const [isCapturing, setIsCapturing] = useState(false);
  const processedRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      processedRef.current = null;
    };
  }, []);
  useEffect(() => {
    if (!request || isCapturing || processedRef.current === request.recordId) return;

    const capture = async () => {
      await wait(500);
      const element = templateRef.current;
      if (!element || !mountedRef.current) return;

      setIsCapturing(true);
      processedRef.current = request.recordId;
      try {
        const captured = await captureLayout({ element, request, isMounted: () => mountedRef.current });
        if (!captured) return;
        logger.log("Layout auto-captured for record:", request.recordId);
        if (mountedRef.current) onCaptured?.(request.recordId);
      } catch (err) {
        console.error("Layout auto-capture error:", err);
      } finally {
        if (mountedRef.current) setIsCapturing(false);
      }
    };
    void capture();
  }, [request, isCapturing, onCaptured, templateRef]);
}

export function OffscreenLayoutCapture({ request, onCaptured }: OffscreenLayoutCaptureProps) {
  const templateRef = useRef<HTMLDivElement>(null);
  useOffscreenCapture(request, onCaptured, templateRef);

  if (!request) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        left: "-9999px",
        top: 0,
        width: "794px",
        opacity: 0,
        pointerEvents: "none",
        zIndex: -1,
      }}
    >
      <MockupApprovalTemplate ref={templateRef} data={request.data} />
    </div>,
    document.body
  );
}
