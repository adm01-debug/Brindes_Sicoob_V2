import { useState } from "react";
import { RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQuotes } from "@/hooks/quotes/useQuotes";
import { cn } from "@/lib/utils";

interface Props {
  quoteId: string;
  variant?: "default" | "outline" | "ghost" | "link";
  className?: string;
  showLabel?: boolean;
}

/**
 * Recompra segura: usa o orçamento aprovado como referência e reconsulta o catálogo.
 */
export function OneClickReorderQuote({ quoteId, variant = "outline", className, showLabel = true }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { reorderQuote } = useQuotes();

  const handleReorder = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsProcessing(true);
    try {
      const newQuote = await reorderQuote(quoteId);
      if (newQuote?.id) {
        navigate(`/orcamentos/${newQuote.id}/editar`);
      }
    } catch (error) {
      console.error("Error in reorder:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button
      variant={variant}
      size="sm"
      className={cn("h-8 px-3 text-xs", className)}
      onClick={handleReorder}
      disabled={isProcessing}
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <RotateCcw className="h-4 w-4 mr-2" />
      )}
      {showLabel && "Recomprar com valores atuais"}
    </Button>
  );
}
