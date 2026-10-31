/**
 * ExternalCollectionCard — Grid/List card for catalog (external) collections.
 * Extracted from CollectionsPage for modularity.
 */
import { motion } from "framer-motion";
import { FolderOpen, Package, Star, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ExternalCollection } from "@/hooks/useExternalCollections";

interface ExternalCollectionCardProps {
  collection: ExternalCollection;
  productCount: number | undefined;
  viewMode: "grid" | "list";
  onNavigate: () => void;
  onDuplicate: () => void;
  index: number;
}

const PRIMARY_COLOR = "hsl(var(--primary))";

function CollectionImage({ collection, grid = false }: { collection: ExternalCollection; grid?: boolean }) {
  if (collection.image_url) return <img src={collection.image_url} alt={grid ? collection.name : ""} className={grid ? "w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" : "w-full h-full object-cover"} loading={grid ? "lazy" : undefined} />;
  if (!grid) return <FolderOpen className="h-6 w-6" style={{ color: collection.color || PRIMARY_COLOR }} />;
  return <div className="flex flex-col items-center gap-2"><FolderOpen className="h-14 w-14 transition-transform duration-300 group-hover:scale-110" style={{ color: collection.color || PRIMARY_COLOR }} /></div>;
}

function ListCollectionCard({ collection, productCount, onNavigate, onDuplicate, index }: Omit<ExternalCollectionCardProps, "viewMode">) {
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }} className="group flex items-center gap-4 p-3 rounded-xl bg-card border border-border/50 hover:border-primary/40 hover:shadow-md cursor-pointer transition-all duration-200" onClick={onNavigate}>
      <div className="w-12 h-12 rounded-lg flex items-center justify-center text-lg shrink-0 overflow-hidden" style={{ backgroundColor: collection.color ? `${collection.color}20` : "hsl(var(--muted))" }}><CollectionImage collection={collection} /></div>
      <div className="flex-1 min-w-0"><h3 className="font-display font-semibold text-foreground truncate">{collection.name}</h3>{collection.description && <p className="text-sm text-muted-foreground truncate">{collection.description}</p>}</div>
      <div className="flex items-center gap-2 shrink-0"><span className="text-sm text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" />{productCount ?? "…"}</span>{collection.is_featured && <Star className="h-4 w-4 text-primary" />}<Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(event) => { event.stopPropagation(); onDuplicate(); }} aria-label="Duplicar coleção"><Copy className="h-4 w-4" /></Button></div>
    </motion.div>
  );
}

function GridCollectionDetails({ collection, productCount }: { collection: ExternalCollection; productCount: number | undefined }) {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-md" style={{ backgroundColor: collection.color || PRIMARY_COLOR, color: "#fff" }}>{collection.icon || "📁"}</div>
        <div className="min-w-0 flex-1"><h3 className="font-display font-bold text-base leading-tight text-foreground line-clamp-2">{collection.name}</h3>{collection.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{collection.description}</p>}</div>
        {collection.is_featured && <Star className="h-4 w-4 text-primary fill-primary shrink-0" />}
      </div>
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50 text-xs text-muted-foreground font-medium"><Package className="h-3 w-3 text-primary" />{productCount ?? "…"} produtos</span>
        {collection.is_featured && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">Destaque</Badge>}
      </div>
    </div>
  );
}

function DuplicateCollectionButton({ onDuplicate }: { onDuplicate: () => void }) {
  return (
    <div className="absolute top-3 right-3 z-10 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
      <Button variant="ghost" size="icon" aria-label="Duplicar como coleção local" className="h-8 w-8 bg-background/60 backdrop-blur-sm hover:bg-background/80" onClick={(event) => { event.stopPropagation(); onDuplicate(); }}><Copy className="h-4 w-4" /></Button>
    </div>
  );
}

function GridCollectionCard({
  collection,
  productCount,
  onNavigate,
  onDuplicate,
  index,
}: Omit<ExternalCollectionCardProps, "viewMode">) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 400, damping: 25 }}
      className="group relative rounded-2xl bg-card overflow-hidden cursor-pointer border-[1.5px] border-border/40 hover:border-primary/40 shadow-sm transition-all duration-500"
      onClick={onNavigate}
    >
      <div
        className="aspect-[3/4] overflow-hidden flex items-center justify-center relative"
        style={{
          backgroundColor: collection.color ? `${collection.color}12` : "hsl(var(--muted))",
        }}
      >
        <CollectionImage collection={collection} grid />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card/80 to-transparent" />
      </div>

      <GridCollectionDetails collection={collection} productCount={productCount} />
      <DuplicateCollectionButton onDuplicate={onDuplicate} />
    </motion.div>
  );
}

export function ExternalCollectionCard(props: ExternalCollectionCardProps) {
  const { viewMode, ...cardProps } = props;
  if (viewMode === "list") return <ListCollectionCard {...cardProps} />;
  return <GridCollectionCard {...cardProps} />;
}
