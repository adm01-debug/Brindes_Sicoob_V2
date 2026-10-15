import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, Sparkles, X } from "lucide-react";
import { AIChat } from "@/components/ai/AIChat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AIMockupAssistantProps {
  productName?: string;
  techniqueName?: string;
  className?: string;
}

export function AIMockupAssistant({ productName, techniqueName, className }: AIMockupAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <>
      {!isOpen && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn("fixed bottom-24 right-4 z-50 md:bottom-6", className)}
        >
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg gap-0 p-0 relative overflow-hidden group bg-primary hover:bg-primary/90 text-primary-foreground border-0"
            onClick={() => setIsOpen(true)}
            aria-label="Abrir assistente de layouts"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Bot className="h-6 w-6" />
            </motion.div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground/50" />
              <Sparkles className="relative h-4 w-4 text-primary-foreground" />
            </span>
          </Button>
        </motion.div>
      )}
      <motion.div hidden={!isOpen} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={cn("fixed z-50 shadow-2xl rounded-2xl border bg-background overflow-hidden bottom-24 right-4 md:bottom-6", isMinimized ? "w-72 h-14" : "w-80 sm:w-96 h-[500px] max-h-[70vh]", className)}>
        <div className="flex items-center gap-3 border-b bg-primary/15 p-3">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            aria-expanded={!isMinimized}
            aria-label={isMinimized ? "Expandir assistente de layouts" : "Minimizar assistente de layouts"}
            onClick={() => setIsMinimized((value) => !value)}
          >
            <span className="rounded-lg bg-primary/25 p-2"><Bot className="h-4 w-4 text-primary" /></span>
            <span className="min-w-0 flex-1"><span className="block font-display text-sm font-semibold">Assistente de Layouts</span>{!isMinimized && <span className="block truncate text-xs text-muted-foreground">Respostas geradas pela IA do portal</span>}</span>
            <Badge variant="secondary" className="text-[10px]">Beta</Badge>
          </button>
          <Button variant="ghost" size="icon" aria-label="Fechar" className="h-7 w-7" onClick={(event) => { event.stopPropagation(); setIsOpen(false); }}><X className="h-4 w-4" /></Button>
        </div>
        <AIChat
          key={JSON.stringify([productName, techniqueName])}
          className={cn("h-[calc(100%-57px)] rounded-none border-0", isMinimized && "hidden")}
          maxHeight="310px"
          contextId={productName}
          assistantMode="layout"
          assistantContext={[productName && `Produto: ${productName}`, techniqueName && `Técnica: ${techniqueName}`].filter(Boolean).join("; ")}
          greeting="Olá! Posso revisar posição, contraste e viabilidade visual do seu mockup com base nos dados selecionados."
          placeholder="Pergunte sobre o mockup…"
        />
      </motion.div>
    </>
  );
}
