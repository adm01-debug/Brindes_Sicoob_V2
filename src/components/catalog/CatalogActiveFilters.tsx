import { Badge } from "@/components/ui/badge";
import type { FilterState } from "@/components/filters/FilterPanel";
import { useCategoriesByIds } from "@/hooks/useExternalCategoriesQuery";
import { motion, AnimatePresence } from "framer-motion";

interface CatalogActiveFiltersProps {
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  activeFiltersCount: number;
}

export function CatalogActiveFilters({ filters, setFilters, activeFiltersCount }: CatalogActiveFiltersProps) {
  const selectedCategories = useCategoriesByIds(filters.categories.map(String));
  const categoryNames = new Map(selectedCategories.map((category) => [category.id, category.name]));
  if (activeFiltersCount === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 py-2">
      <AnimatePresence mode="popLayout">
        {(filters.sicoobThemes || []).map((theme) => (
          <motion.div
            key={`theme-${theme}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            layout
          >
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-destructive/10 border-sicoob-green/30 text-sicoob-green-dark bg-sicoob-green/5"
              onClick={() => setFilters({ ...filters, sicoobThemes: filters.sicoobThemes.filter((t) => t !== theme) })}
            >
              🌿 Tema: {theme}
              <span className="ml-1 opacity-60">×</span>
            </Badge>
          </motion.div>
        ))}

        {filters.minQuantity && filters.minQuantity > 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            layout
          >
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-destructive/10 border-sicoob-green/30 text-sicoob-green-dark bg-sicoob-green/5"
              onClick={() => setFilters({ ...filters, minQuantity: 0 })}
            >
              📊 Tiragem: ≤{filters.minQuantity} un.
              <span className="ml-1 opacity-60">×</span>
            </Badge>
          </motion.div>
        ) : null}

        {filters.colors.map((color) => (
          <motion.div
            key={color}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            layout
          >
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-destructive/10 border-muted-foreground/20 text-muted-foreground"
              onClick={() => setFilters({ ...filters, colors: filters.colors.filter((c) => c !== color) })}
            >
              🎨 {color}
              <span className="ml-1 opacity-60">×</span>
            </Badge>
          </motion.div>
        ))}
        {filters.categories.map((catId) => {
          const categoryName = categoryNames.get(String(catId));
          return (
            <motion.div
              key={catId}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              layout
            >
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-destructive/10 border-muted-foreground/20 text-muted-foreground"
                onClick={() => setFilters({ ...filters, categories: filters.categories.filter((c) => c !== catId) })}
              >
                {categoryName ?? "Categoria selecionada"}
                <span className="ml-1 opacity-60">×</span>
              </Badge>
            </motion.div>
          );
        })}
        {filters.featured && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            layout
          >
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-destructive/10 border-muted-foreground/20 text-muted-foreground"
              onClick={() => setFilters({ ...filters, featured: false })}
            >
              ⭐ Destaques
              <span className="ml-1 opacity-60">×</span>
            </Badge>
          </motion.div>
        )}
        {filters.isKit && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            layout
          >
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-destructive/10 border-muted-foreground/20 text-muted-foreground"
              onClick={() => setFilters({ ...filters, isKit: false })}
            >
              📦 KITs
              <span className="ml-1 opacity-60">×</span>
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
