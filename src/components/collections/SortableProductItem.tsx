/**
 * SortableProductItem — Draggable product row for collection management.
 * Extracted from CollectionDetailPage for modularity.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GripVertical, FileText, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import { PriceDropBadge } from "@/components/favorites/PriceDropBadge";
import { cn } from "@/lib/utils";

interface CollectionProduct {
  id: string;
  name: string;
  sku?: string;
  images?: string[];
  price?: number | null;
}

interface ProductVariant {
  color_name?: string | null;
  color_hex?: string | null;
  thumbnail?: string | null;
}

interface SortableProductItemProps {
  product: CollectionProduct;
  variant?: ProductVariant;
  priceAtSave?: number | null;
  addedAt?: string | null;
  onRemove: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
  notes?: string;
  onNotesChange: (notes: string) => void;
}

function ProductImage({ product, variant }: { product: CollectionProduct; variant?: ProductVariant }) {
  const displayImage = variant?.thumbnail || product.images?.[0];
  return displayImage ? <img src={displayImage} alt={product.name} className="w-12 h-12 rounded-lg object-cover" loading="lazy" /> : null;
}

function ProductPriceChange({ product, priceAtSave, addedAt }: { product: CollectionProduct; priceAtSave?: number | null; addedAt?: string | null }) {
  const priceDiffPct = priceAtSave && product.price ? ((product.price - priceAtSave) / priceAtSave) * 100 : null;
  if (priceDiffPct === null) return null;
  return <PriceDropBadge priceDiffPct={priceDiffPct} priceAtSave={priceAtSave ?? null} currentPrice={product.price ?? null} savedAt={addedAt ?? undefined} size="sm" />;
}

function VariantInfo({ variant }: { variant?: ProductVariant }) {
  if (!variant?.color_hex) return null;
  return <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border border-border" style={{ backgroundColor: variant.color_hex }} />{variant.color_name ? <span className="text-xs text-muted-foreground truncate max-w-[80px]">{variant.color_name}</span> : null}</span>;
}

function ProductDetails({ product, variant, priceAtSave, addedAt }: { product: CollectionProduct; variant?: ProductVariant; priceAtSave?: number | null; addedAt?: string | null }) {
  return (
    <>
      <ProductImage product={product} variant={variant} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{product.name}</p>
          <ProductPriceChange product={product} priceAtSave={priceAtSave} addedAt={addedAt} />
        </div>
        <div className="flex items-center gap-1.5">
          <p className="text-xs text-muted-foreground">{product.sku}</p>
          <VariantInfo variant={variant} />
        </div>
      </div>
    </>
  );
}

function ItemActions({ hasNotes, onToggleNotes, onRemove }: { hasNotes: boolean; onToggleNotes: () => void; onRemove: () => void }) {
  return (
    <>
      <Button variant="ghost" size="icon" aria-label="Nota" className="shrink-0 text-muted-foreground hover:text-primary" onClick={onToggleNotes}><FileText className={cn("h-4 w-4", hasNotes && "text-primary")} /></Button>
      <Button variant="ghost" size="icon" aria-label="Remover da coleção" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
    </>
  );
}

function NotesEditor({ visible, notes, onChange }: { visible: boolean; notes?: string; onChange: (notes: string) => void }) {
  return (
    <AnimatePresence>
      {visible ? <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
        <Input placeholder="Nota de venda (ex: cliente gosta deste modelo)..." defaultValue={notes || ""} onBlur={(event) => onChange(event.target.value)} className="text-xs h-8 ml-[76px]" />
      </motion.div> : null}
    </AnimatePresence>
  );
}

export function SortableProductItem({ product, variant, priceAtSave, addedAt, onRemove, isSelected, onToggleSelect, notes, onNotesChange }: SortableProductItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const [showNotes, setShowNotes] = useState(!!notes);
  const cardClass = isSelected ? "border-primary/50 bg-primary/5 shadow-md shadow-primary/10" : "border-primary/15 hover:border-primary/30 hover:shadow-sm";

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col gap-2 p-3 rounded-xl border-[1.5px] bg-card transition-all duration-200",
        cardClass
      )}
    >
      <div className="flex items-center gap-3">
        <div onClick={(e) => e.stopPropagation()}>
          <SelectionCheckbox
            checked={isSelected}
            onChange={onToggleSelect}
            size="sm"
          />
        </div>
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0 touch-none"
          aria-label="Arrastar"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <ProductDetails product={product} variant={variant} priceAtSave={priceAtSave} addedAt={addedAt} />
        <ItemActions hasNotes={Boolean(notes)} onToggleNotes={() => setShowNotes((visible) => !visible)} onRemove={onRemove} />
      </div>
      <NotesEditor visible={showNotes} notes={notes} onChange={onNotesChange} />
    </motion.div>
  );
}
