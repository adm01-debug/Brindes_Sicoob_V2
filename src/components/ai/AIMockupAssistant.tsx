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

  if (!isOpen) {
    return (
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
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={cn("fixed z-50 shadow-2xl rounded-2xl border bg-background overflow-hidden bottom-24 right-4 md:bottom-6", isMinimized ? "w-72 h-14" : "w-80 sm:w-96 h-[500px] max-h-[70vh]", className)}>
      <div className="flex items-center gap-3 p-3 border-b bg-primary/15 cursor-pointer" onClick={() => setIsMinimized((value) => !value)}>
        <div className="p-2 rounded-lg bg-primary/25"><Bot className="h-4 w-4 text-primary" /></div>
        <div className="flex-1 min-w-0"><h3 className="font-display font-semibold text-sm">Assistente de Layouts</h3>{!isMinimized && <p className="text-xs text-muted-foreground truncate">Respostas geradas pela IA do portal</p>}</div>
        <Badge variant="secondary" className="text-[10px]">Beta</Badge>
        <Button variant="ghost" size="icon" aria-label="Fechar" className="h-7 w-7" onClick={(event) => { event.stopPropagation(); setIsOpen(false); }}><X className="h-4 w-4" /></Button>
      </div>
      <AIChat
        className={cn("h-[calc(100%-57px)] rounded-none border-0", isMinimized && "hidden")}
        maxHeight="310px"
        contextId={productName}
        assistantMode="layout"
        assistantContext={[productName && `Produto: ${productName}`, techniqueName && `Técnica: ${techniqueName}`].filter(Boolean).join("; ")}
        greeting="Olá! Posso revisar posição, contraste e viabilidade visual do seu mockup com base nos dados selecionados."
        placeholder="Pergunte sobre o mockup…"
      />
    </motion.div>
  );
}
