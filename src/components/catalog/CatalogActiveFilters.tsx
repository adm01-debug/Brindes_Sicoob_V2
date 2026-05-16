import { Badge } from "@/components/ui/badge";
import type { FilterState } from "@/components/filters/FilterPanel";
import { CATEGORIES } from "@/data/mockData";
import { motion, AnimatePresence } from "framer-motion";

interface CatalogActiveFiltersProps {
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  activeFiltersCount: number;
}

export function CatalogActiveFilters({ filters, setFilters, activeFiltersCount }: CatalogActiveFiltersProps) {
  if (activeFiltersCount === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <AnimatePresence mode="popLayout">
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
              className="cursor-pointer hover:bg-destructive/10 border-brand/20 text-brand"
              onClick={() => setFilters({ ...filters, colors: filters.colors.filter((c) => c !== color) })}
            >
              🎨 {color}
              <span className="ml-1">×</span>
            </Badge>
          </motion.div>
        ))}
        {filters.categories.map((catId) => {
          const cat = CATEGORIES.find((c) => c.id === catId);
          return cat ? (
            <motion.div
              key={catId}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              layout
            >
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-destructive/10 border-brand/20 text-brand"
                onClick={() => setFilters({ ...filters, categories: filters.categories.filter((c) => c !== catId) })}
              >
                {cat.icon} {cat.name}
                <span className="ml-1">×</span>
              </Badge>
            </motion.div>
          ) : null;
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
              className="cursor-pointer hover:bg-destructive/10 border-brand/20 text-brand"
              onClick={() => setFilters({ ...filters, featured: false })}
            >
              ⭐ Destaques
              <span className="ml-1">×</span>
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
              className="cursor-pointer hover:bg-destructive/10 border-brand/20 text-brand"
              onClick={() => setFilters({ ...filters, isKit: false })}
            >
              📦 KITs
              <span className="ml-1">×</span>
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
