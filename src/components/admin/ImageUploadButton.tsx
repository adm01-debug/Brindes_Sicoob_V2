import React, { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { validateFile } from "@/lib/security/file-validation";

interface ImageUploadButtonProps {
  currentImageUrl: string | null;
  onUpload: (url: string) => void;
  onRemove: () => void;
  folder?: string;
  className?: string;
}

function getUploadStatus(error: unknown): number | undefined {
  let current = error;
  for (let depth = 0; depth < 3; depth += 1) {
    if (!current || typeof current !== "object") return undefined;
    if ("status" in current && typeof current.status === "number") return current.status;
    current = "context" in current ? current.context : undefined;
  }
  return undefined;
}

const wait = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay));

async function uploadWithRetry(formData: FormData, attempt = 1): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke("secure-upload", { body: formData });
    if (error) throw error;
    if (!data?.url || typeof data.url !== "string") throw new Error("URL de upload ausente");
    return data.url;
  } catch (error) {
    if (getUploadStatus(error) === 403 || attempt >= 3) throw error;
    const delay = 2 ** attempt * 1000;
    console.warn(`Tentativa ${attempt} falhou. Tentando novamente em ${delay}ms...`, error);
    await wait(delay);
    return uploadWithRetry(formData, attempt + 1);
  }
}

async function removeStoredImage(currentImageUrl: string) {
  const filePath = currentImageUrl.split("/personalization-images/")[1];
  if (filePath) await supabase.storage.from("personalization-images").remove([filePath]);
}

export function ImageUploadButton({
  currentImageUrl,
  onUpload,
  onRemove,
  folder = "locations",
  className,
}: ImageUploadButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target.files?.[0]);
    if (!file) return;

    // 🛡️ Camada de Segurança V2.0: Validação de integridade e tipo real
    const validation = await validateFile(file, {
      maxSizeMb: 5,
      allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });

    if (!validation.valid) {
      toast.error((validation.error || "Arquivo inválido"));
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const url = await uploadWithRetry(formData);
      onUpload(url);
      toast.success("Imagem enviada com segurança!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao enviar imagem");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = async () => {
    if (!currentImageUrl) return;

    try {
      await removeStoredImage(currentImageUrl);
      onRemove();
      toast.success("Imagem removida!");
    } catch (error) {
      console.error("Remove error:", error);
      toast.error("Erro ao remover imagem");
    }
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {currentImageUrl ? (
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
              >
                <ImageIcon className="h-4 w-4 text-primary" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="p-0">
              <img
                src={currentImageUrl}
                alt="Área de gravação"
                className="max-w-64 max-h-48 rounded" loading="lazy" />
            </TooltipContent>
          </Tooltip>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={handleRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <Upload className="h-3 w-3 mr-1" />
              <span className="text-xs">Imagem</span>
            </>
          )}
        </Button>
      )}
    </div>
  );
}
