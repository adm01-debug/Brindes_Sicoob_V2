import type { ChangeEvent, MouseEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, MapPin, Upload, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PersonalizationArea } from "./MultiAreaManager";

interface AreaCardProps {
  area: PersonalizationArea;
  index: number;
  isActive: boolean;
  isReadOnly: boolean;
  canRemove: boolean;
  onSelect: () => void;
  onNameChange: (name: string) => void;
  onLogoUpload: (file: File) => void;
  onLogoRemove: () => void;
  onRemove: () => void;
}

function LogoFileInput({ label, onUpload, id }: { label: string; onUpload: (file: File) => void; id?: string }) {
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (file?.type.startsWith("image/")) onUpload(file);
    e.target.value = "";
  };
  return <input type="file" accept="image/*" onChange={handleFileChange} onClick={(event) => event.stopPropagation()} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" id={id} aria-label={label} />;
}

function AreaMetadata({ area }: { area: PersonalizationArea }) {
  const hasMetadata = area.maxWidthCm || area.maxHeightCm || area.techniquesAvailable;
  if (!hasMetadata) return null;
  return <span className="text-[10px] text-muted-foreground block truncate">{area.maxWidthCm && area.maxHeightCm && <>{area.maxWidthCm}×{area.maxHeightCm}cm</>}<TechniqueCount count={area.techniquesAvailable} /><ColorCount count={area.maxColors} />{area.isCurved ? <> · curvo</> : null}</span>;
}

function TechniqueCount({ count }: { count?: number | null }) {
  return count ? <> · {count} {count === 1 ? "técnica" : "técnicas"}</> : null;
}

function ColorCount({ count }: { count?: number | null }) {
  return count ? <> · até {count} cor{count > 1 ? "es" : ""}</> : null;
}

function AreaName(props: Pick<AreaCardProps, "area" | "index" | "isActive" | "isReadOnly" | "onNameChange">) {
  if (props.isReadOnly) return <div className="flex-1 min-w-0"><span className={cn("text-sm block truncate", props.isActive && "font-medium")}>{props.area.name}</span><AreaMetadata area={props.area} /></div>;
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => { event.stopPropagation(); props.onNameChange(event.target.value); };
  return <div className="flex-1 min-w-0"><Input value={props.area.name} onChange={handleChange} onClick={(event) => event.stopPropagation()} className={cn("h-7 text-sm border-0 bg-transparent p-0 focus-visible:ring-0", props.isActive && "font-medium")} placeholder="Nome da área" aria-label={`Nome da área ${props.index + 1}`} /></div>;
}

function ExistingLogo({ area, onUpload, onRemove }: { area: PersonalizationArea; onUpload: (file: File) => void; onRemove: () => void }) {
  if (!area.logoPreview) return null;
  const handleRemove = (event: MouseEvent) => { event.stopPropagation(); onRemove(); };
  return <div className="flex items-center gap-1 flex-shrink-0"><div className="relative h-7 w-7 rounded border border-border/30 bg-background overflow-hidden"><img src={area.logoPreview} alt="Logo" className="w-full h-full object-contain" loading="lazy" /></div><div className="relative"><LogoFileInput label={`Substituir logo de ${area.name}`} onUpload={onUpload} /><Button variant="ghost" size="icon" aria-label="Atualizar" className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 pointer-events-none" title="Substituir logo"><RefreshCw className="h-3.5 w-3.5" /></Button></div><Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={handleRemove} title="Remover logo" aria-label={`Remover logo de ${area.name}`}><X className="h-3.5 w-3.5" /></Button></div>;
}

function NewLogo({ area, onUpload }: { area: PersonalizationArea; onUpload: (file: File) => void }) {
  return <><div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground flex-shrink-0"><MapPin className="h-3 w-3" /><span>{area.positionX}%</span><span>×</span><span>{area.positionY}%</span></div><div className="relative flex-shrink-0"><LogoFileInput label={`Upload logo para ${area.name}`} onUpload={onUpload} id={`logo-upload-${area.id}`} /><Button variant="default" size="sm" className="h-7 px-3 text-xs font-semibold gap-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm pointer-events-none"><Upload className="h-3 w-3" />Adicionar Logo</Button></div></>;
}

function RemoveAreaButton({ area, visible, onRemove }: { area: PersonalizationArea; visible: boolean; onRemove: () => void }) {
  if (!visible) return null;
  const handleRemove = (event: MouseEvent) => { event.stopPropagation(); onRemove(); };
  return <Button variant="ghost" size="icon" className={cn("h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity", "text-muted-foreground hover:text-destructive hover:bg-destructive/10")} onClick={handleRemove} aria-label={`Remover área ${area.name}`}><Trash2 className="h-3.5 w-3.5" /></Button>;
}

export function AreaCard(props: AreaCardProps) {
  const { area, isActive } = props;

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2.5 rounded-lg border transition-all duration-200 cursor-pointer group",
        isActive
          ? "border-primary/60 bg-primary/5 shadow-sm shadow-primary/10"
          : "border-border/30 hover:border-primary/40 hover:bg-muted/50"
      )}
      onClick={props.onSelect}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      onKeyDown={(event) => event.key === "Enter" && props.onSelect()}
    >
      {/* Step number */}
      <div className={cn(
        "flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-all duration-200",
        isActive
          ? "bg-primary text-primary-foreground scale-110"
          : "bg-primary/10 text-primary"
      )}>
        {props.index + 1}
      </div>
      <AreaName {...props} />
      {area.logoPreview ? <ExistingLogo area={area} onUpload={props.onLogoUpload} onRemove={props.onLogoRemove} /> : <NewLogo area={area} onUpload={props.onLogoUpload} />}
      <RemoveAreaButton area={area} visible={!props.isReadOnly && props.canRemove} onRemove={props.onRemove} />
    </div>
  );
}
