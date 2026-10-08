import type { ChangeEvent, DragEvent, RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Upload, Loader2, Plus, FileVideo, Palette, Youtube } from 'lucide-react';
import { type VideoVariant, VIDEO_TYPES } from "./types";

interface Props {
  productId?: string;
  variants: VideoVariant[];
  uploadVideoType: string;
  setUploadVideoType: (v: string) => void;
  uploadVariant: string;
  setUploadVariant: (v: string) => void;
  isUploading: boolean;
  uploadCount: number;
  uploadProgress: number;
  isDragOver: boolean;
  fileInputRef: RefObject<HTMLInputElement>;
  handleFileSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  handleDragOverZone: (e: DragEvent) => void;
  handleDragLeaveZone: (e: DragEvent) => void;
  handleDropZone: (e: DragEvent) => void;
  youtubeUrl: string;
  setYoutubeUrl: (v: string) => void;
  addYoutubeVideo: () => void;
  isAddingYoutube: boolean;
}

function UploadSelectors({ variants, uploadVideoType, setUploadVideoType, uploadVariant, setUploadVariant }: Pick<Props, "variants" | "uploadVideoType" | "setUploadVideoType" | "uploadVariant" | "setUploadVariant">) {
  return <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 bg-muted/30 border-b border-border/30"><Select value={uploadVideoType} onValueChange={setUploadVideoType}><SelectTrigger className="h-8 w-auto min-w-[140px] gap-1.5 text-xs rounded-md bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 border border-primary/30 hover:border-primary/50 hover:from-primary/20 hover:via-primary/15 hover:to-primary/10 shadow-[0_0_8px_hsl(var(--primary)/0.15)] hover:shadow-[0_0_12px_hsl(var(--primary)/0.25)] transition-all duration-300 text-foreground/90"><span className="text-muted-foreground/70 font-normal">Tipo:</span><SelectValue /></SelectTrigger><SelectContent>{VIDEO_TYPES.map((type) => <SelectItem key={type.value} value={type.value} className="text-xs"><span className="flex items-center gap-1.5"><type.icon className={`h-3.5 w-3.5 ${type.color}`} />{type.label}</span></SelectItem>)}</SelectContent></Select>{variants.length > 0 && <Select value={uploadVariant} onValueChange={setUploadVariant}><SelectTrigger className="h-8 w-auto min-w-[160px] gap-1.5 text-xs rounded-md bg-background/60 border-border/40 hover:bg-background/80 transition-colors"><Palette className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><SelectValue placeholder="Sem variação" /></SelectTrigger><SelectContent><SelectItem value="none" className="text-xs">Sem variação</SelectItem>{variants.map((variant) => <SelectItem key={variant.id} value={variant.id} className="text-xs"><span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border border-border/60 shrink-0" style={{ backgroundColor: variant.color_hex || '#999' }} />{variant.color_name || variant.name}</span></SelectItem>)}</SelectContent></Select>}</div>;
}

function UploadProgress({ progress, count }: { progress: number; count: number }) {
  const percent = count > 0 ? (progress / count) * 100 : 0;
  return <div className="flex flex-col items-center gap-2.5"><Loader2 className="h-6 w-6 text-primary animate-spin" /><span className="text-sm font-medium text-foreground/70">Enviando {progress}/{count} vídeo(s)...</span><div className="w-48 h-1 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${percent}%` }} /></div></div>;
}

function UploadPrompt({ isDragOver }: { isDragOver: boolean }) {
  return <><div className={cn("w-10 h-10 rounded-lg flex items-center justify-center transition-colors", isDragOver ? "bg-primary/15" : "bg-muted/30")}>{isDragOver ? <FileVideo className="h-5 w-5 text-primary" /> : <Upload className="h-5 w-5 text-muted-foreground/50" />}</div><div className="text-center"><p className="text-sm text-muted-foreground">{isDragOver ? <span className="text-primary font-medium">Solte os vídeos aqui</span> : 'Arraste vídeos ou clique para selecionar'}</p><p className="text-[11px] text-muted-foreground/50 mt-0.5">MP4, WebM, MOV • Máx. 100MB por arquivo</p></div><Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-border/40"><Plus className="h-3.5 w-3.5" /> Selecionar vídeos</Button></>;
}

function UploadDropZone(props: Pick<Props, "isDragOver" | "isUploading" | "uploadCount" | "uploadProgress" | "fileInputRef" | "handleFileSelect" | "handleDragOverZone" | "handleDragLeaveZone" | "handleDropZone">) {
  return <div className={cn('py-6 px-4 flex flex-col items-center justify-center gap-3 transition-all duration-200 cursor-pointer', props.isDragOver ? 'bg-primary/8' : 'bg-background/30 hover:bg-muted/20', props.isUploading && 'opacity-60 pointer-events-none')} onDragOver={props.handleDragOverZone} onDragLeave={props.handleDragLeaveZone} onDrop={props.handleDropZone} onClick={() => props.fileInputRef.current?.click()}><input ref={props.fileInputRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/mpeg,video/ogg" multiple className="hidden" onChange={props.handleFileSelect} />{props.isUploading ? <UploadProgress progress={props.uploadProgress} count={props.uploadCount} /> : <UploadPrompt isDragOver={props.isDragOver} />}</div>;
}

function YoutubeInput({ productId, youtubeUrl, setYoutubeUrl, addYoutubeVideo, isAddingYoutube }: Pick<Props, "productId" | "youtubeUrl" | "setYoutubeUrl" | "addYoutubeVideo" | "isAddingYoutube">) {
  if (!productId) return null;
  return <div className="flex items-center gap-2 px-3 py-2.5 border-t border-border/30 bg-muted/20" onClick={(event) => event.stopPropagation()}><Youtube className="h-4 w-4 text-destructive shrink-0" /><Input value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} placeholder="Cole uma URL do YouTube..." className="h-7 text-xs flex-1 bg-background/50 border-border/30" onKeyDown={(event) => event.key === 'Enter' && addYoutubeVideo()} /><Button type="button" size="sm" className="h-7 text-[11px] px-3" disabled={!youtubeUrl.trim() || isAddingYoutube} onClick={addYoutubeVideo}>{isAddingYoutube ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Adicionar'}</Button></div>;
}

export function VideoUploadArea({
  productId, variants, uploadVideoType, setUploadVideoType,
  uploadVariant, setUploadVariant, isUploading, uploadCount, uploadProgress,
  isDragOver, fileInputRef, handleFileSelect,
  handleDragOverZone, handleDragLeaveZone, handleDropZone,
  youtubeUrl, setYoutubeUrl, addYoutubeVideo, isAddingYoutube,
}: Props) {
  return (
    <div className={cn("rounded-xl border border-border/40 overflow-hidden transition-all duration-200", isDragOver ? "border-primary/60 ring-2 ring-primary/20 shadow-lg shadow-primary/5" : "hover:border-border/60")}>
      <UploadSelectors variants={variants} uploadVideoType={uploadVideoType} setUploadVideoType={setUploadVideoType} uploadVariant={uploadVariant} setUploadVariant={setUploadVariant} />
      <UploadDropZone isDragOver={isDragOver} isUploading={isUploading} uploadCount={uploadCount} uploadProgress={uploadProgress} fileInputRef={fileInputRef} handleFileSelect={handleFileSelect} handleDragOverZone={handleDragOverZone} handleDragLeaveZone={handleDragLeaveZone} handleDropZone={handleDropZone} />
      <YoutubeInput productId={productId} youtubeUrl={youtubeUrl} setYoutubeUrl={setYoutubeUrl} addYoutubeVideo={addYoutubeVideo} isAddingYoutube={isAddingYoutube} />
    </div>
  );
}
