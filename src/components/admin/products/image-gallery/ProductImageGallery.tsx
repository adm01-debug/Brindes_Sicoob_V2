/**
 * ProductImageGallery — Orchestrator component.
 * All logic extracted to useProductImageGallery hook.
 * All UI sections extracted to sub-components.
 */
import { Filter, Loader2 } from "lucide-react";
import { useProductImageGallery } from './useProductImageGallery';
import { ImageFilterBar } from './ImageFilterBar';
import { ImageBulkToolbar } from './ImageBulkToolbar';
import { ImageGrid } from './ImageGrid';
import { ImageUploadArea } from './ImageUploadArea';
import { ImagePreviewDialog } from './ImagePreviewDialog';
import { ImageStatsBar } from './ImageStatsBar';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';

interface ProductImageGalleryProps {
  images: string[];
  onChange: (images: string[]) => void;
  folder?: string;
  productId?: string;
}

type GalleryModel = ReturnType<typeof useProductImageGallery>;

function GalleryControls({ gallery, images, hasVariants }: { gallery: GalleryModel; images: string[]; hasVariants: boolean }) {
  const showFilters = gallery.externalImages.length > 0 || images.length > 3;
  return <>{showFilters && <ImageFilterBar filterMode={gallery.filterMode} setFilterMode={gallery.setFilterMode} typeFilter={gallery.typeFilter} setTypeFilter={gallery.setTypeFilter} stats={gallery.stats} activeTypes={gallery.activeTypes} variantMap={gallery.variantMap} hasVariants={hasVariants} />}{images.length > 0 && <ImageBulkToolbar bulkMode={gallery.bulkMode} setBulkMode={gallery.setBulkMode} clearSelection={gallery.clearSelection} selectAll={gallery.selectAll} filteredImagesCount={gallery.filteredImages.length} selectedUrls={gallery.selectedUrls} setSelectedUrls={gallery.setSelectedUrls} bulkUpdateType={gallery.bulkUpdateType} bulkUpdateVariant={gallery.bulkUpdateVariant} bulkUpdateAltText={gallery.bulkUpdateAltText} requestBulkDelete={() => gallery.setDeleteConfirm({ type: 'bulk' })} isBulkUpdating={gallery.isBulkUpdating} variants={gallery.variants} />}</>;
}

function GalleryImages({ gallery, images, hasPrimary, hasOgImage }: { gallery: GalleryModel; images: string[]; hasPrimary: boolean; hasOgImage: boolean }) {
  return <>{gallery.filteredImages.length > 0 && <ImageGrid filteredImages={gallery.filteredImages} images={images} extImageMap={gallery.extImageMap} variantMap={gallery.variantMap} bulkMode={gallery.bulkMode} selectedUrls={gallery.selectedUrls} editingIndex={gallery.editingIndex} dragIndex={gallery.dragIndex} dragOverIndex={gallery.dragOverIndex} toggleSelect={gallery.toggleSelect} handleDragStart={gallery.handleDragStart} handleDragOver={gallery.handleDragOver} handleDrop={gallery.handleDrop} handleDragEnd={gallery.handleDragEnd} setPreviewUrl={gallery.setPreviewUrl} setEditingIndex={gallery.setEditingIndex} handleSetPrimary={gallery.handleSetPrimary} requestRemove={(url) => gallery.setDeleteConfirm({ type: 'single', url })} updateExternalImageMeta={gallery.updateExternalImageMeta} />}{gallery.filteredImages.length === 0 && images.length > 0 && <div className="text-center py-6 text-sm text-muted-foreground"><Filter className="h-5 w-5 mx-auto mb-2 opacity-40" />Nenhuma imagem corresponde ao filtro selecionado</div>}{gallery.externalImages.length > 0 && <ImageStatsBar stats={gallery.stats} hasPrimary={hasPrimary} hasOgImage={hasOgImage} />}</>;
}

function GalleryDeleteDialog({ gallery }: { gallery: GalleryModel }) {
  const confirm = () => {
    if (gallery.deleteConfirm?.type === 'single' && gallery.deleteConfirm.url) gallery.handleRemove(gallery.deleteConfirm.url);
    else if (gallery.deleteConfirm?.type === 'bulk') gallery.bulkDelete();
    gallery.setDeleteConfirm(null);
  };
  return <ConfirmDeleteDialog open={Boolean(gallery.deleteConfirm)} onCancel={() => gallery.setDeleteConfirm(null)} onConfirm={confirm} title={gallery.deleteConfirm?.type === 'bulk' ? 'Remover imagens selecionadas' : 'Remover imagem'} count={gallery.deleteConfirm?.type === 'bulk' ? gallery.selectedUrls.size : 1} />;
}

export function ProductImageGallery({ images, onChange, folder = 'products', productId }: ProductImageGalleryProps) {
  const g = useProductImageGallery({ images, onChange, folder, productId });
  const hasVariants = g.stats.byVariant.size > 0;
  const hasPrimary = g.externalImages.some(img => img.is_primary);
  const hasOgImage = g.externalImages.some(img => img.is_og_image);

  return (
    <div className="space-y-3">
      {/* Loading state */}
      {(g.isLoadingExt && productId && (
        <div className="flex items-center justify-center py-4 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm">Carregando imagens...</span>
        </div>
      ))}


      {/* Filter bar — show when there are images (not just external) */}
      <GalleryControls gallery={g} images={images} hasVariants={hasVariants} />

      {/* Image grid */}
      <GalleryImages gallery={g} images={images} hasPrimary={hasPrimary} hasOgImage={hasOgImage} />

      {/* Upload area */}
      <ImageUploadArea
        productId={productId} variants={g.variants} variantMap={g.variantMap}
        variantImageCounts={g.variantImageCounts}
        uploadVariant={g.uploadVariant} setUploadVariant={g.setUploadVariant}
        uploadImageType={g.uploadImageType} setUploadImageType={g.setUploadImageType}
        isUploading={g.isUploading} uploadCount={g.uploadCount} uploadProgress={g.uploadProgress}
        isDragOverZone={g.isDragOverZone}
        fileInputRef={g.fileInputRef} handleFilesChange={g.handleFilesChange}
        handleDropZone={g.handleDropZone}
        handleDropZoneDragOver={g.handleDropZoneDragOver}
        handleDropZoneDragLeave={g.handleDropZoneDragLeave}
      />

      {/* Preview dialog */}
      <ImagePreviewDialog
        previewUrl={g.previewUrl} onClose={() => g.setPreviewUrl(null)}
        extImageMap={g.extImageMap} variantMap={g.variantMap}
      />

      {/* Confirm delete dialog */}
      <GalleryDeleteDialog gallery={g} />
    </div>
  );
}
