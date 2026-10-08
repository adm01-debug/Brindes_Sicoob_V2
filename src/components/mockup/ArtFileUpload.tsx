/**
 * ArtFileUpload — Upload de arquivos de arte vetorial (AI, EPS, PDF, SVG, CDR)
 * vinculados a um mockup. Usa o bucket privado `mockup-art-files` com RLS por pasta de usuário.
 */
import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, Trash2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ACCEPTED_EXTENSIONS = [".ai", ".eps", ".pdf", ".svg", ".cdr"];
const ACCEPTED_MIME = [
  "application/postscript",
  "application/illustrator",
  "application/pdf",
  "image/svg+xml",
  "application/x-coreldraw",
  "application/octet-stream",
];
const MAX_SIZE_MB = 25;
const ART_FILES_BUCKET = "mockup-art-files";

export interface ArtFileAttachment {
  id: string;
  file_url: string;
  file_path: string;
  original_name: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  file_extension: string | null;
  notes: string | null;
  created_at: string;
}

interface ArtFileUploadProps {
  userId: string;
  mockupId?: string | null;
  quoteId?: string | null;
  attachments: ArtFileAttachment[];
  onAttachmentsChange: (next: ArtFileAttachment[]) => void;
  className?: string;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function validArtExtension(file: File) {
  const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    toast.error(`${file.name}: formato não suportado (${ACCEPTED_EXTENSIONS.join(", ")})`);
    return null;
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    toast.error(`${file.name}: excede ${MAX_SIZE_MB}MB`);
    return null;
  }
  return extension;
}

function fileContentType(file: File) {
  return file.type.length > 0 ? file.type : "application/octet-stream";
}

function insertFailed(row: unknown, error: unknown) {
  return Boolean(error) || !row;
}

async function uploadArtFile(file: File, { userId, mockupId, quoteId }: Pick<ArtFileUploadProps, "userId" | "mockupId" | "quoteId">): Promise<ArtFileAttachment | null> {
  const extension = validArtExtension(file);
  if (!extension) return null;
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${userId}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from(ART_FILES_BUCKET).upload(path, file, { contentType: fileContentType(file), upsert: false });
  if (uploadError) {
    console.error("[ArtFileUpload] upload error", uploadError);
    toast.error(`Falha ao enviar ${file.name}`);
    return null;
  }
  const { data: signed } = await supabase.storage.from(ART_FILES_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
  const { data: row, error: insertError } = await supabase.from("art_file_attachments").insert({ user_id: userId, mockup_id: mockupId ?? null, quote_id: quoteId ?? null, file_url: signed?.signedUrl ?? "", file_path: path, original_name: file.name, mime_type: file.type.length > 0 ? file.type : null, file_size_bytes: file.size, file_extension: extension }).select().single();
  if (insertFailed(row, insertError)) {
    console.error("[ArtFileUpload] db insert error", insertError);
    toast.error(`Falha ao registrar ${file.name}`);
    await supabase.storage.from(ART_FILES_BUCKET).remove([path]);
    return null;
  }
  return row as ArtFileAttachment;
}

export function ArtFileUpload({
  userId,
  mockupId,
  quoteId,
  attachments,
  onAttachmentsChange,
  className,
}: ArtFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!userId) {
        toast.error("Faça login para anexar arquivos");
        return;
      }

      const list = Array.from(files);
      if (list.length === 0) return;

      setIsUploading(true);
      const uploaded: ArtFileAttachment[] = [];

      for (const file of list) {
        const attachment = await uploadArtFile(file, { userId, mockupId, quoteId });
        if (attachment) uploaded.push(attachment);
      }

      if (uploaded.length > 0) {
        onAttachmentsChange([...attachments, ...uploaded]);
        toast.success(`${uploaded.length} arquivo(s) enviado(s)`);
      }

      setIsUploading(false);
    },
    [userId, mockupId, quoteId, attachments, onAttachmentsChange]
  );

  const handleRemove = useCallback(
    async (att: ArtFileAttachment) => {
      const { error: delErr } = await supabase
        .from("art_file_attachments")
        .delete()
        .eq("id", att.id);

      if (delErr) {
        toast.error("Falha ao remover registro");
        return;
      }

      await supabase.storage.from(ART_FILES_BUCKET).remove([att.file_path]);
      onAttachmentsChange(attachments.filter((a) => a.id !== att.id));
      toast.success("Arquivo removido");
    },
    [attachments, onAttachmentsChange]
  );

  const handleDownload = useCallback(async (att: ArtFileAttachment) => {
    const { data, error } = await supabase.storage
      .from(ART_FILES_BUCKET)
      .createSignedUrl(att.file_path, 60 * 5);
    if (error || !data?.signedUrl) {
      toast.error("Falha ao gerar link");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }, []);

  return (
    <div className={cn("space-y-3", className)}>
      <Card
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "border-2 border-dashed p-6 text-center transition-colors cursor-pointer",
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        )}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={[...ACCEPTED_EXTENSIONS, ...ACCEPTED_MIME].join(",")}
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        {isUploading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Enviando…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Upload className="h-6 w-6" />
            <p className="text-sm font-medium">Arraste arquivos vetoriais ou clique</p>
            <p className="text-xs">
              {ACCEPTED_EXTENSIONS.join(", ")} • máx {MAX_SIZE_MB}MB
            </p>
          </div>
        )}
      </Card>

      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((att) => (
            <Card key={att.id} className="flex items-center gap-3 p-3">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{att.original_name}</p>
                <p className="text-xs text-muted-foreground">
                  {att.file_extension?.toUpperCase().replace(".", "")} • {formatBytes(att.file_size_bytes)}
                </p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => handleDownload(att)} aria-label="Baixar">
                <Download className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleRemove(att)}
                aria-label="Remover"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
