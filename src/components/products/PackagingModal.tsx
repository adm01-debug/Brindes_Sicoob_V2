/**
 * PackagingModal - Modal com detalhes da embalagem especial do produto
 */
import { type ReactNode, useState } from "react";
import { Gift, Package, Ruler, Scale, Boxes, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";

type PackagingContext = 'always' | 'with_customization' | 'without_customization' | null;

interface PackagingModalProps {
  isOpen: boolean;
  onClose: () => void;
  packingType: string | null;
  packagingContext?: PackagingContext;
  boxImage: string | null;
  boxWidthMm: number | null;
  boxHeightMm: number | null;
  boxLengthMm: number | null;
  boxWeightKg: number | null;
  boxQuantity: number | null;
  boxVolumeCm3: number | null;
}

// Mapeamento de contexto para texto
const contextLabels: Record<string, string> = {
  'always': 'Sempre disponível',
  'with_customization': 'Disponível com personalização',
  'without_customization': 'Disponível sem personalização',
};

function formatDimension(value: number | null, unit: string) {
  return value ? `${value.toLocaleString("pt-BR")} ${unit}` : null;
}

function PackagingImage({ image, label, loaded, error, onLoad, onError }: { image: string | null; label: string | null; loaded: boolean; error: boolean; onLoad: () => void; onError: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-secondary/30">
      <AspectRatio ratio={4 / 3}>
        {image && !error ? (
          <>
            {!loaded && <div className="absolute inset-0 flex items-center justify-center bg-secondary/50"><Package className="h-12 w-12 text-muted-foreground/30 animate-pulse" /></div>}
            <img src={image} alt={label || "Embalagem especial"} className={cn("w-full h-full object-contain transition-all duration-700 ease-out", loaded ? "opacity-100 blur-0 scale-100" : "opacity-40 blur-md scale-105")} onLoad={onLoad} onError={onError} loading="lazy" />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-secondary to-secondary/50"><Package className="h-16 w-16 text-muted-foreground/30 mb-2" /><span className="text-xs text-muted-foreground">Imagem não disponível</span></div>
        )}
      </AspectRatio>
    </div>
  );
}

function PackagingType({ packingType, context }: { packingType: string | null; context?: PackagingContext }) {
  if (!packingType) return null;
  const contextLabel = context ? contextLabels[context] : undefined;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground"><Package className="h-4 w-4 text-warning" />Tipo</div>
      <div className="flex flex-col gap-1.5"><Badge variant="secondary" className="px-3 py-1.5 text-sm font-medium bg-warning/10 text-warning-foreground border border-warning/20 w-fit">{packingType}</Badge>{contextLabel && <span className="text-xs text-muted-foreground">{contextLabel}</span>}</div>
    </div>
  );
}

function PackagingDimensions({ width, height, length, volume }: { width: number | null; height: number | null; length: number | null; volume: number | null }) {
  if (!width && !height && !length && !volume) return null;
  return (
    <><Separator className="bg-border/50" /><div className="space-y-3"><div className="flex items-center gap-2 text-sm font-medium text-foreground"><Ruler className="h-4 w-4 text-info" />Dimensões</div><div className="grid grid-cols-2 gap-3"><DimensionItem label="Largura" value={formatDimension(width, "mm")} /><DimensionItem label="Altura" value={formatDimension(height, "mm")} /><DimensionItem label="Profundidade" value={formatDimension(length, "mm")} /><DimensionItem label="Volume" value={formatDimension(volume, "cm³")} /></div></div></>
  );
}

function PackagingWeight({ weight, quantity }: { weight: number | null; quantity: number | null }) {
  if (!weight && !quantity) return null;
  return (
    <><Separator className="bg-border/50" /><div className="space-y-3"><div className="flex items-center gap-2 text-sm font-medium text-foreground"><Scale className="h-4 w-4 text-success" />Peso e Quantidades</div><div className="grid grid-cols-2 gap-3"><DimensionItem label="Peso da embalagem" value={weight ? `${weight.toLocaleString("pt-BR")} kg` : null} /><DimensionItem label="Qtd por caixa master" value={quantity ? `${quantity.toLocaleString("pt-BR")} un` : null} icon={<Boxes className="h-3.5 w-3.5 text-muted-foreground" />} /></div></div></>
  );
}

export function PackagingModal({
  isOpen,
  onClose,
  packingType,
  packagingContext,
  boxImage,
  boxWidthMm,
  boxHeightMm,
  boxLengthMm,
  boxWeightKg,
  boxQuantity,
  boxVolumeCm3,
}: PackagingModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
              <Gift className="h-4 w-4 text-warning" />
            </div>
            <span>Embalagem Especial</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <PackagingImage image={boxImage} label={packingType} loaded={imageLoaded} error={imageError} onLoad={() => setImageLoaded(true)} onError={() => setImageError(true)} />
          <PackagingType packingType={packingType} context={packagingContext} />
          <PackagingDimensions width={boxWidthMm} height={boxHeightMm} length={boxLengthMm} volume={boxVolumeCm3} />
          <PackagingWeight weight={boxWeightKg} quantity={boxQuantity} />

          {/* Observação */}
          <Separator className="bg-border/50" />
          <div className="flex items-start gap-2 p-3 rounded-lg bg-info/5 border border-info/20">
            <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              A embalagem especial está inclusa no preço do produto.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Componente auxiliar para exibir dimensões
function DimensionItem({ 
  label, 
  value, 
  icon 
}: { 
  label: string; 
  value: string | null;
  icon?: ReactNode;
}) {
  if (!value) return null;
  
  return (
    <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/50">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
        {icon}
        {label}
      </div>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}
