import { forwardRef, type ForwardedRef } from "react";
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
  fallbackPath?: string;
}

const CRITICAL_PATHS = ["/simulador", "/orcamentos/novo", "/mockup-generator"];

function isCriticalPath(pathname: string): boolean {
  return CRITICAL_PATHS.some(path => pathname.includes(path));
}

function getParentLabel(pathname: string, title?: string): string {
  return routeLabels[pathname] || title || "Voltar";
}

interface BackButtonContentProps {
  useChevron: boolean;
  showLabel: boolean;
  parentLabel: string;
}

function BackButtonContent({ useChevron, showLabel, parentLabel }: BackButtonContentProps) {
  const BackIcon = useChevron ? ChevronLeft : ArrowLeft;
  if (!showLabel) return <BackIcon className={cn("h-4 w-4 transition-transform", !useChevron && "group-hover:-translate-x-0.5")} />;
  return (
    <>
      <BackIcon className={cn("h-4 w-4 transition-transform", !useChevron && "group-hover:-translate-x-0.5")} />
      <span className="text-sm hidden sm:inline">{parentLabel === "Início" ? "Voltar ao Início" : `Voltar para ${parentLabel}`}</span>
      <span className="text-sm sm:hidden">Voltar</span>
    </>
  );
}

function entranceAnimation(critical: boolean) {
  if (!critical) return { opacity: 1, scale: 1 };
  return {
    opacity: 1,
    scale: 1,
    x: [0, -2, 2, -2, 2, 0],
    transition: { repeat: Infinity, duration: 2, repeatDelay: 5 },
  };
}

interface BackButtonViewProps extends Required<Pick<BackButtonProps, "variant" | "size" | "showLabel" | "useChevron">> {
  buttonRef: ForwardedRef<HTMLButtonElement>;
  className?: string;
  ariaLabel: string;
  parentLabel: string;
  criticalPath: boolean;
  onBack: () => void;
}

function BackButtonView({ buttonRef, className, variant, size, showLabel, useChevron, ariaLabel, parentLabel, criticalPath, onBack }: BackButtonViewProps) {
  const variantClass = variant === "ghost" && "text-muted-foreground hover:text-foreground hover:bg-muted/50";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={entranceAnimation(criticalPath)} whileTap={{ scale: 0.97 }} transition={{ duration: 0.1 }}>
          <Button ref={buttonRef} variant={variant} size={size} onClick={onBack} aria-label={ariaLabel} className={cn("gap-1.5 transition-all group shrink-0", variantClass, className)}>
            <BackButtonContent useChevron={useChevron} showLabel={showLabel} parentLabel={parentLabel} />
          </Button>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-[10px] py-1 px-2 font-medium">{ariaLabel} <kbd className="ml-1 opacity-60">Esc</kbd></TooltipContent>
    </Tooltip>
  );
}

function resolveBackButtonProps(props: BackButtonProps) {
  return {
    variant: props.variant ?? "ghost",
    size: props.size ?? "sm",
    showLabel: props.showLabel ?? true,
    useChevron: props.useChevron ?? false,
  } as const;
}

export const BackButton = forwardRef<HTMLButtonElement, BackButtonProps>(
  function BackButton(props: BackButtonProps, ref) {
    const { goBack, previousItem, history } = useSmartNavigation();
    const location = useLocation();
    const canGoBack = history.length > 1 || location.pathname !== "/";
    const criticalPath = isCriticalPath(location.pathname);
    if (location.pathname === "/" || !canGoBack) return null;

    const parentPath = previousItem?.pathname || "/";
    const parentLabel = getParentLabel(parentPath, previousItem?.title);
    const ariaLabel = `Voltar para ${parentLabel}`;
    return <BackButtonView {...resolveBackButtonProps(props)} buttonRef={ref} className={props.className} ariaLabel={ariaLabel} parentLabel={parentLabel} criticalPath={criticalPath} onBack={() => goBack(props.fallbackPath)} />;
  }
);
