import { useCallback, useState } from "react";
import { useToast } from "@/hooks/use-toast";

function safeDownloadName(productName: string) {
  return productName.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "_").substring(0, 30);
}

async function downloadPhoto(url: string, productName: string, index: number) {
  try {
    const response = await fetch(url, { mode: "cors" });
    const blob = await response.blob();
    const extension = url.split(".").pop()?.split("?")[0] || "jpg";
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `${safeDownloadName(productName)}_${index + 1}.${extension}`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(anchor.href);
  } catch {
    window.open(url, "_blank");
  }
}

/**
 * Hook to download product photos.
 * Downloads individual images or multiple as separate files
 * (real ZIP requires a library; this provides a pragmatic per-file download).
 */
export function usePhotoDownload() {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const downloadPhotos = useCallback(
    async (images: string[], productName: string) => {
      if (images.length === 0) return;

      setDownloading(true);
      toast({
        title: "Download",
        description: `Preparando ${images.length} foto(s)...`,
      });

      try {
        for (const [index, url] of images.entries()) {
          await downloadPhoto(url, productName, index);
          if (index < images.length - 1) await new Promise((resolve) => setTimeout(resolve, 300));
        }

        toast({
          title: "Download concluído",
          description: `${images.length} foto(s) baixada(s)`,
        });
      } catch {
        toast({
          title: "Erro no download",
          description: "Não foi possível baixar as fotos",
          variant: "destructive",
        });
      } finally {
        setDownloading(false);
      }
    },
    [toast]
  );

  return { downloadPhotos, downloading };
}
