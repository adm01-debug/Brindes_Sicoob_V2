import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { type ExternalImage, type VariantInfo, IMAGE_TYPES } from './types';

interface Props {
  previewUrl: string | null;
  onClose: () => void;
  extImageMap: Map<string, ExternalImage>;
  variantMap: Map<string, VariantInfo>;
}

function ImageTypeBadge({ image }: { image: ExternalImage }) {
  if (!image.image_type) return null;
  const typeInfo = IMAGE_TYPES.find((type) => type.value === image.image_type);
  if (!typeInfo) return null;
  return (
    <Badge variant="secondary" className="flex items-center gap-1 text-[10px]">
      <typeInfo.icon className={cn('h-3 w-3', typeInfo.color)} />
      {typeInfo.label}
    </Badge>
  );
}

function VariantBadge({
  image,
  variantMap,
}: {
  image: ExternalImage;
  variantMap: Map<string, VariantInfo>;
}) {
  const variantId = image.supplier_code || image.variant_id;
  if (!variantId) return null;
  const variant = variantMap.get(variantId);
  if (!variant) return null;
  return (
    <Badge variant="outline" className="flex items-center gap-1 text-[10px]">
      {variant.color_hex && (
        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: variant.color_hex }} />
      )}
      {variant.color_name || variant.name}
    </Badge>
  );
}

function PreviewMetadata({
  image,
  variantMap,
}: {
  image: ExternalImage;
  variantMap: Map<string, VariantInfo>;
}) {
  return (
    <div className="flex flex-wrap gap-2 px-2 pb-1 text-[11px] text-muted-foreground">
      <ImageTypeBadge image={image} />
      <VariantBadge image={image} variantMap={variantMap} />
      {image.alt_text && <span>Alt: {image.alt_text}</span>}
      {image.caption && <span>• {image.caption}</span>}
      {image.width_px && image.height_px && (
        <span>
          • {image.width_px}×{image.height_px}px
        </span>
      )}
      {image.file_size_bytes && <span>• {(image.file_size_bytes / 1024).toFixed(0)}KB</span>}
    </div>
  );
}

export function ImagePreviewDialog({ previewUrl, onClose, extImageMap, variantMap }: Props) {
  const externalImage = previewUrl ? extImageMap.get(previewUrl) : undefined;
  return (
    <Dialog open={!!previewUrl} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl p-2">
        {previewUrl && (
          <div className="space-y-2">
            <img
              src={previewUrl}
              alt="Preview"
              className="h-auto max-h-[80vh] w-full rounded object-contain"
              loading="lazy"
            />
            {externalImage && <PreviewMetadata image={externalImage} variantMap={variantMap} />}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
