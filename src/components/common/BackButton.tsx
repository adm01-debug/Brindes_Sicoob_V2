import { forwardRef } from "react";
import { useLocation } from "react-router-dom";
import { ArrowLeft, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSmartNavigation } from "@/hooks/useSmartNavigation";
import { useNavigationStore } from "@/stores/useNavigationStore";

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
  fallbackPath?: string;
}

export const BackButton = forwardRef<HTMLButtonElement, BackButtonProps>(
  function BackButton({
    className,
    variant = "ghost",
    size = "sm",
    showLabel = true,
    useChevron = false,
    fallbackPath
  }: BackButtonProps, ref) {
    const { goBack, previousItem, history } = useSmartNavigation();
    const direction = useNavigationStore(s => s.direction);
    const location = useLocation();
    
    // Check if we can actually go back or ascend
    const canGoBack = history.length > 1 || location.pathname !== "/";
    const isCriticalPath = location.pathname.includes('/simulador') || 
                         location.pathname.includes('/orcamentos/novo') ||
                         location.pathname.includes('/mockup-generator');

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
            animate={isCriticalPath ? {
              opacity: 1, scale: 1,
              x: [0, -2, 2, -2, 2, 0],
              transition: { repeat: Infinity, duration: 2, repeatDelay: 5 }
            } : { opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.1 }}
          >

            <Button
              ref={ref}
              variant={variant}
              size={size}
              onClick={() => goBack(fallbackPath)}
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
