import { useState, useMemo } from "react";
import {
  MessageCircle,
  Copy,
  Download,
  Check,
  Image as ImageIcon,
  Palette,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/hooks/useProducts";
import { SharePreviewDialog } from "./share/SharePreviewDialog";
import { ShareAllColorsDialog } from "./share/ShareAllColorsDialog";
import { usePhotoDownload } from "./share/usePhotoDownload";
import { MESSAGE_TEMPLATES } from "./share/MessageTemplates";

interface ShareActionsProps {
  product: Product;
  selectedPhotosCount?: number;
  selectedVariant?: { variantName?: string | null; colorHex?: string | null; thumbnailUrl?: string | null } | null;
}

function countMainPhotos(product: Product) {
  if (!product.colors || product.colors.length === 0) return product.images.length;
  const colorImageUrls = new Set<string>();
  product.colors.forEach((color) => {
    if (color.image) colorImageUrls.add(color.image);
    color.images?.forEach((image) => colorImageUrls.add(image));
  });
  const mainImages = product.images.filter((image) => !colorImageUrls.has(image));
  return mainImages.length > 0 ? mainImages.length : 1;
}

interface ShareMenuProps {
  product: Product;
  copied: boolean;
  downloading: boolean;
  mainPhotosCount: number;
  selectedPhotosCount: number;
  onPreview: () => void;
  onAllColors: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onKitOption: (title: string, description: string) => void;
}

function ShareMenu({ product, copied, downloading, mainPhotosCount, selectedPhotosCount, onPreview, onAllColors, onCopy, onDownload, onKitOption }: ShareMenuProps) {
  const hasColors = Boolean(product.colors && product.colors.length > 1);
  return (
    <div className="inline-flex rounded-md shadow-sm">
      <Button className="gap-2 rounded-r-none border-r border-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={onPreview}>
        <MessageCircle className="h-4 w-4" />Enviar - WhatsApp
        <span className="bg-primary-foreground/20 text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">{mainPhotosCount}</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button className="rounded-l-none px-2 bg-primary hover:bg-primary/90 text-primary-foreground"><ChevronDown className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Opções de Envio</DropdownMenuLabel><DropdownMenuSeparator />
          <DropdownMenuItem onClick={onPreview}><MessageCircle className="h-4 w-4 mr-2" />Enviar Produto Simples<span className="ml-auto text-[10px] text-muted-foreground">{mainPhotosCount} foto{mainPhotosCount !== 1 ? "s" : ""}</span></DropdownMenuItem>
          {hasColors && <DropdownMenuItem onClick={onAllColors}><Palette className="h-4 w-4 mr-2" />Enviar Todas as Cores<span className="ml-auto text-[10px] text-muted-foreground">{product.colors?.length}</span></DropdownMenuItem>}
          {product.isKit && <><DropdownMenuItem onClick={() => onKitOption("KIT Completo", "Preparando fotos do kit montado...")}><ImageIcon className="h-4 w-4 mr-2" />Enviar KIT Completo</DropdownMenuItem><DropdownMenuItem onClick={() => onKitOption("Itens do KIT", "Preparando fotos individuais dos itens...")}><ImageIcon className="h-4 w-4 mr-2" />Enviar Itens Separados</DropdownMenuItem></>}
          <DropdownMenuSeparator /><DropdownMenuLabel>Compartilhar</DropdownMenuLabel>
          <DropdownMenuItem onClick={onCopy}>{copied ? <Check className="h-4 w-4 mr-2 text-success" /> : <Copy className="h-4 w-4 mr-2" />}Copiar Descrição</DropdownMenuItem>
          <DropdownMenuItem onClick={onDownload} disabled={downloading}><Download className="h-4 w-4 mr-2" />{downloading ? "Baixando..." : `Download (${selectedPhotosCount || product.images.length} fotos)`}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function ShareActions({ product, selectedPhotosCount = 0, selectedVariant }: ShareActionsProps) {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [showAllColors, setShowAllColors] = useState(false);
  const [copied, setCopied] = useState(false);
  const { downloadPhotos, downloading } = usePhotoDownload();

  const mainPhotosCount = useMemo(() => countMainPhotos(product), [product]);

  const handleCopyDescription = async () => {
    const template = MESSAGE_TEMPLATES[1] ?? MESSAGE_TEMPLATES[0];
    if (!template) return;
    const message = template.generate(product); // informal default
    await navigator.clipboard.writeText(message);
    setCopied(true);
    toast({
      title: "Copiado!",
      description: "Descrição copiada para a área de transferência",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const hasColors = Boolean(product.colors && product.colors.length > 1);

  return (
    <>
      <ShareMenu product={product} copied={copied} downloading={downloading} mainPhotosCount={mainPhotosCount} selectedPhotosCount={selectedPhotosCount} onPreview={() => setShowPreview(true)} onAllColors={() => setShowAllColors(true)} onCopy={handleCopyDescription} onDownload={() => downloadPhotos(product.images, product.name)} onKitOption={(title, description) => toast({ title, description })} />

      <SharePreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        product={product}
        selectedVariant={selectedVariant}
      />

      {hasColors && (
        <ShareAllColorsDialog
          open={showAllColors}
          onOpenChange={setShowAllColors}
          product={product}
        />
      )}
    </>
  );
}
