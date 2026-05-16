import { forwardRef } from "react";
import { useLocation } from "react-router-dom";
import { ArrowLeft, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSmartNavigation } from "@/hooks/useSmartNavigation";

const routeLabels: Record<string, string> = {
  "/": "Início",
  "/produtos": "Produtos",
  "/filtros": "Super Filtro",
  "/novidades": "Novidades",
  "/colecoes": "Coleções",
  "/orcamentos": "Orçamentos",
  "/pedidos": "Pedidos",
  "/simulador": "Simulador",
  "/simulador-precos": "Preços por Tiragem",
  "/mockup-generator": "Gerador de Mockups",
  "/magic-up": "Magic Up",
  "/favoritos": "Favoritos",
  "/comparar": "Comparar",
  "/configuracoes": "Configurações",
  "/admin": "Administração",
  "/seguranca": "Segurança",
  "/estoque": "Dashboard de Estoque",
};

interface BackButtonProps {
  className?: string;
  variant?: "ghost" | "outline" | "secondary" | "default";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
  useChevron?: boolean;
}

export const BackButton = forwardRef<HTMLButtonElement, BackButtonProps>(
  function BackButton({ 
    className, 
    variant = "ghost", 
    size = "sm", 
    showLabel = true,
    useChevron = false
  }: BackButtonProps, ref) {
    const { goBack, previousItem, history } = useSmartNavigation();
    const location = useLocation();
    
    // Check if we can actually go back (history length > 1 or from another site)
    const canGoBack = history.length > 1;

    if (location.pathname === "/" || !canGoBack) return null;

    const parentPath = previousItem?.pathname || "/";
    const parentLabel = routeLabels[parentPath] || previousItem?.title || "Voltar";
    const ariaLabel = `Voltar para ${parentLabel}`;
    const Icon = useChevron ? ChevronLeft : ArrowLeft;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.1 }}
          >
            <Button
              ref={ref}
              variant={variant}
              size={size}
              onClick={goBack}
              aria-label={ariaLabel}
              className={cn(
                "gap-1.5 transition-all group shrink-0",
                variant === "ghost" && "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                className
              )}
            >
              <Icon className={cn(
                "h-4 w-4 transition-transform",
                !useChevron && "group-hover:-translate-x-0.5"
              )} />
              {showLabel && (
                <>
                  <span className="text-sm hidden sm:inline">{parentLabel === "Início" ? "Voltar ao Início" : `Voltar para ${parentLabel}`}</span>
                  <span className="text-sm sm:hidden">Voltar</span>
                </>
              )}
            </Button>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[10px] py-1 px-2 font-medium">
          {ariaLabel} <kbd className="ml-1 opacity-60">Esc</kbd>
        </TooltipContent>
      </Tooltip>
    );
  }
);
