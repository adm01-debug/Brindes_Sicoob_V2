import { type ChangeEvent, type DragEvent, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, X, Loader2, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ProductAnalysis {
  productType: string;
  material: string;
  colors: string[];
  category: string;
  keywords: string[];
  description: string;
}

interface SearchResult {
  id: string;
  name: string;
  sku: string;
  category_name: string;
  description: string;
  price: number;
  colors: unknown;
  relevance: number;
}

interface VisualSearchProps {
  onResultsFound: (products: SearchResult[], analysis: ProductAnalysis) => void;
}

function validateImage(file: File) {
  if (!file.type.startsWith('image/')) return 'Por favor, selecione uma imagem.';
  if (file.size > 10 * 1024 * 1024) return 'A imagem deve ter no máximo 10MB.';
  return null;
}

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });
}

function useVisualSearchRequest(
  onResultsFound: VisualSearchProps['onResultsFound'],
  onComplete: () => void,
) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const performVisualSearch = async (imageBase64: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('visual-search', {
        body: { imageBase64 },
      });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      const { products, analysis } = data;
      toast({
        title: 'Busca concluída!',
        description: `Encontrados ${products.length} produtos similares.`,
      });
      onResultsFound(products, analysis);
      onComplete();
    } catch (error) {
      console.error('Visual search error:', error);
      toast({
        title: 'Erro na busca',
        description:
          error instanceof Error ? error.message : 'Não foi possível processar a imagem.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  return { isLoading, performVisualSearch };
}

function useImageSelection(performVisualSearch: (image: string) => Promise<void>) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { toast } = useToast();
  const selectFile = async (file: File) => {
    const validationError = validateImage(file);
    if (validationError) {
      toast({ title: 'Arquivo inválido', description: validationError, variant: 'destructive' });
      return;
    }
    try {
      const base64 = await readImage(file);
      setPreviewImage(base64);
      await performVisualSearch(base64);
    } catch (error) {
      toast({
        title: 'Erro ao ler imagem',
        description: error instanceof Error ? error.message : 'Falha inesperada.',
        variant: 'destructive',
      });
    }
  };
  return { previewImage, selectFile, clearPreview: () => setPreviewImage(null) };
}

function useDropTarget(selectFile: (file: File) => Promise<void>) {
  const [dragActive, setDragActive] = useState(false);
  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files[0]) void selectFile(e.dataTransfer.files[0]);
  };
  return { dragActive, handleDrag, handleDrop };
}

function useVisualSearch(onResultsFound: VisualSearchProps['onResultsFound']) {
  const [isOpen, setIsOpen] = useState(false);
  const request = useVisualSearchRequest(onResultsFound, () => setIsOpen(false));
  const selection = useImageSelection(request.performVisualSearch);
  const dropTarget = useDropTarget(selection.selectFile);
  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) void selection.selectFile(event.target.files[0]);
  };
  return {
    isOpen,
    setIsOpen,
    isLoading: request.isLoading,
    previewImage: selection.previewImage,
    dragActive: dropTarget.dragActive,
    handleDrag: dropTarget.handleDrag,
    handleDrop: dropTarget.handleDrop,
    handleInputChange,
    clearPreview: selection.clearPreview,
    search: () => selection.previewImage && request.performVisualSearch(selection.previewImage),
  };
}

type VisualController = ReturnType<typeof useVisualSearch>;

function VisualSearchTrigger() {
  return (
    <DialogTrigger asChild>
      <Button
        variant="outline"
        size="icon"
        className="group relative border-orange/30 hover:border-orange hover:bg-orange/10"
        aria-label="Busca visual"
      >
        <Camera className="h-4 w-4 text-orange" />
        <span className="absolute -right-1 -top-1 h-2 w-2 animate-pulse rounded-full bg-orange" />
      </Button>
    </DialogTrigger>
  );
}

function ImagePreview({ controller }: { controller: VisualController }) {
  return (
    <motion.div
      key="preview"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative overflow-hidden rounded-xl border border-border"
    >
      <img
        src={controller.previewImage ?? ''}
        alt="Imagem selecionada para busca visual"
        className="h-48 w-full bg-muted object-contain"
        loading="lazy"
      />
      {controller.isLoading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80">
          <Loader2 className="h-8 w-8 animate-spin text-orange" />
          <p className="text-sm font-medium">Analisando imagem com IA...</p>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 bg-background/80 hover:bg-background"
          onClick={controller.clearPreview}
          aria-label="Remover imagem"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </motion.div>
  );
}

function UploadZone({ controller }: { controller: VisualController }) {
  const stateClass = controller.dragActive
    ? 'border-orange bg-orange/10'
    : 'border-border hover:border-orange/50 hover:bg-muted/50';
  return (
    <motion.div
      key="upload"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <label
        htmlFor="visual-search-input"
        className={`flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 ${stateClass}`}
        onDragEnter={controller.handleDrag}
        onDragLeave={controller.handleDrag}
        onDragOver={controller.handleDrag}
        onDrop={controller.handleDrop}
      >
        <div className="flex flex-col items-center gap-3 p-4">
          <div className="rounded-full bg-orange/10 p-3">
            <Upload className="h-6 w-6 text-orange" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Arraste uma imagem ou clique para selecionar</p>
            <p className="mt-1 text-xs text-muted-foreground">PNG, JPG ou WEBP (max. 10MB)</p>
          </div>
        </div>
        <input
          id="visual-search-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={controller.handleInputChange}
          disabled={controller.isLoading}
        />
      </label>
    </motion.div>
  );
}

function VisualSearchContent({ controller }: { controller: VisualController }) {
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-orange" />
          Busca Visual com IA
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Faça upload de uma imagem de produto para encontrar itens similares no catálogo usando
          inteligência artificial.
        </p>
        <AnimatePresence mode="wait">
          {controller.previewImage ? (
            <ImagePreview controller={controller} />
          ) : (
            <UploadZone controller={controller} />
          )}
        </AnimatePresence>
        {!controller.isLoading && controller.previewImage ? (
          <Button onClick={controller.search} className="w-full bg-orange hover:bg-orange-hover">
            <Search className="mr-2 h-4 w-4" />
            Buscar Produtos Similares
          </Button>
        ) : null}
      </div>
    </DialogContent>
  );
}

export function VisualSearchButton({ onResultsFound }: VisualSearchProps) {
  const controller = useVisualSearch(onResultsFound);

  return (
    <Dialog open={controller.isOpen} onOpenChange={controller.setIsOpen}>
      <VisualSearchTrigger />
      <VisualSearchContent controller={controller} />
    </Dialog>
  );
}
