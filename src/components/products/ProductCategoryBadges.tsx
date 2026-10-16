import { type NavigateFunction, useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Package, Palette, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCategoryIcons, getCategoryIcon } from "@/hooks/useCategoryIcons";

interface Category {
  id: string | number;
  name: string;
  icon?: string;
}

const CLICKABLE_BADGE_CLASS = "px-2.5 py-1 text-sm font-medium cursor-pointer";

interface ProductCategoryBadgesProps {
  category: Category;
  groups?: Category[];
  className?: string;
  showLabels?: boolean;
  // UUID real da categoria (para deep-link correto ao Super Filtro)
  categoryUuid?: string | null;
  // Props para o link de personalização
  productId?: string;
  productName?: string;
  productSku?: string;
  productPrice?: number;
  productImageUrl?: string | null;
  productMinQuantity?: number;
  showPersonalizationLink?: boolean;
  isKit?: boolean;
}

function uniqueCategories(category: Category, groups?: Category[]) {
  const categories = [category];
  groups?.forEach((group) => {
    if (!categories.some((item) => item.id === group.id)) categories.push(group);
  });
  return categories;
}

function categoryIcon(category: Category, icons: ReturnType<typeof useCategoryIcons>["data"]) {
  const icon = getCategoryIcon(category.name, icons ?? []);
  return icon === "📦" ? category.icon || "📦" : icon;
}

function CategoryBadges({ categories, icons, categoryUuid, navigate }: { categories: Category[]; icons: ReturnType<typeof useCategoryIcons>["data"]; categoryUuid?: string | null; navigate: NavigateFunction }) {
  return categories.map((item) => (
    <Tooltip key={item.id}>
      <TooltipTrigger asChild>
        <Badge variant="secondary" onClick={() => navigate(`/filtros?categories=${categoryUuid || item.id}`)} className={cn(CLICKABLE_BADGE_CLASS, "bg-secondary/80 hover:bg-secondary border border-border/50", "transition-all duration-200 hover:scale-105")}>
          <span className="mr-1.5">{categoryIcon(item, icons)}</span>
          <span className="text-xs">{item.name}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="font-medium">Ver todos os produtos de {item.name}</TooltipContent>
    </Tooltip>
  ));
}

function ActionBadge({ icon, label, tooltip, className, onClick }: { icon: ReactNode; label: string; tooltip: string; className: string; onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" onClick={onClick} className={cn(CLICKABLE_BADGE_CLASS, className, "transition-all duration-200 hover:scale-105")}>
          {icon}<span className="text-xs">{label}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="font-medium">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function ProductActionBadges({ props, navigate }: { props: ProductCategoryBadgesProps; navigate: NavigateFunction }) {
  const { productId, productName, productSku, productPrice, productImageUrl, showPersonalizationLink = true, isKit = false, category } = props;
  if (!productId) return null;
  const productData = { id: productId, name: productName || "", sku: productSku || "", price: productPrice || 0, imageUrl: productImageUrl, categoryName: category.name };
  return (
    <>
      {showPersonalizationLink && <ActionBadge icon={<Palette className="h-3.5 w-3.5 mr-1.5" />} label="Personalização" tooltip="Simular preço de personalização" className="border-primary/50 bg-primary/10 hover:bg-primary/20 text-primary hover:text-primary hover:border-primary" onClick={() => navigate("/simulador", { state: { preSelectedProduct: productData } })} />}
      <ActionBadge icon={<Sparkles className="h-3.5 w-3.5 mr-1.5" />} label="Visualizar com Logo" tooltip="Gerar mockup com sua logo" className="border-success/50 bg-success/15 hover:bg-success/25 text-success hover:text-success/80 hover:border-success" onClick={() => navigate(`/mockup-generator?product_id=${encodeURIComponent(productId)}`)} />
      {!isKit && <ActionBadge icon={<Package className="h-3.5 w-3.5 mr-1.5" />} label="Monte seu Kit" tooltip="Montar um kit personalizado com este produto" className="border-warning/50 bg-warning/15 hover:bg-warning/25 text-warning hover:text-warning hover:border-warning" onClick={() => navigate(`/montar-kit?product=${productId}`)} />}
    </>
  );
}

/**
 * Exibe badges com ícones/emojis das categorias/grupos do produto
 * Combina a categoria principal com grupos adicionais
 * Inclui link opcional para o simulador de personalização
 */
export function ProductCategoryBadges({ category, groups, className, categoryUuid, productId, productName, productSku, productPrice, productImageUrl, showPersonalizationLink = true, isKit = false }: ProductCategoryBadgesProps) {
  const navigate = useNavigate();
  const { data: categoryIcons = [] } = useCategoryIcons();
  const allCategories = uniqueCategories(category, groups);
  const props = { category, groups, className, categoryUuid, productId, productName, productSku, productPrice, productImageUrl, showPersonalizationLink, isKit };
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <CategoryBadges categories={allCategories} icons={categoryIcons} categoryUuid={categoryUuid} navigate={navigate} />
      <ProductActionBadges props={props} navigate={navigate} />
    </div>
  );
}
import type { ReactNode } from "react";
