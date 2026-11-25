import { useEffect, useRef, useState, type Ref, type RefObject } from "react";
import { motion } from "framer-motion";
import { Bot, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AIChat } from "./AIChat";

interface AIMockupAssistantProps {
  productName?: string;
  techniqueName?: string;
  className?: string;
}

function AssistantLauncher({
  onOpen,
  className,
  buttonRef,
}: {
  onOpen: () => void;
  className?: string;
  buttonRef: RefObject<HTMLButtonElement>;
}) {
  return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn("fixed bottom-24 right-4 z-50 md:bottom-6", className)}
      >
        <Button
          ref={buttonRef}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg gap-0 p-0 relative overflow-hidden group bg-primary hover:bg-primary/90 text-primary-foreground border-0"
          onClick={onOpen}
          aria-label="Abrir Matheus, assistente de layouts"
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

function AssistantHeader({
  minimized,
  onToggle,
  onClose,
  closeButtonRef,
}: {
  minimized: boolean;
  onToggle: () => void;
  onClose: () => void;
  closeButtonRef?: Ref<HTMLButtonElement>;
}) {
  return (
      <div
        className="flex items-center gap-3 p-3 border-b bg-primary/15 cursor-pointer"
        onClick={onToggle}
      >
        <div className="p-2 rounded-lg bg-primary/25">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-sm">Matheus — Expert em Layouts</h3>
          {!minimized && (
            <p className="text-xs text-muted-foreground truncate">
              Powered by AI
            </p>
          )}
        </div>
        <Badge variant="secondary" className="text-[10px]">
          Beta
        </Badge>
        <Button
          ref={closeButtonRef}
          variant="ghost"
          size="icon" aria-label="Fechar"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
  );
}

function AssistantChat({
  productName,
  techniqueName,
  minimized,
  inputRef,
}: {
  productName?: string;
  techniqueName?: string;
  minimized: boolean;
  inputRef: RefObject<HTMLTextAreaElement>;
}) {
  return (
    <div data-testid="assistant-chat-slot" className={cn("flex-1 min-h-0", minimized && "hidden")}>
      <AIChat
        className="h-full rounded-none border-0"
        maxHeight="100%"
        assistantMode="layout"
        assistantContext={buildAssistantContext(productName, techniqueName)}
        inputRef={inputRef}
        greeting="Olá! Sou o Matheus, seu expert em layouts. Posso ajudar com posicionamento, técnicas e sugestões para este mockup."
        placeholder="Pergunte sobre o mockup..."
      />
    </div>
  );
}

/** Rótulos do mockup em edição — o backend limita `assistantContext` a 500 caracteres. */
function buildAssistantContext(productName?: string, techniqueName?: string) {
  const context = [
    `Produto: ${productName?.trim() || "não definido"}`,
    `Técnica: ${techniqueName?.trim() || "não definida"}`,
  ].join("; ");
  return context.slice(0, 500);
}

/**
 * Assistente de layouts do gerador de mockup. A conversa é atendida pela IA
 * real (`AIChat` -> edge function `expert-chat`); o componente não responde
 * nada por conta própria.
 */
export function AIMockupAssistant({ productName, techniqueName, className }: AIMockupAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const shouldRestoreFocusRef = useRef(false);

  // Abrir/fechar pelo teclado precisa levar o foco para o chat e devolve-lo ao botao.
  useEffect(() => {
    if (isOpen) {
      // Durante a geracao o campo fica desabilitado e nao aceita foco; nesse caso
      // o foco vai para o botao Fechar, ainda dentro do painel.
      const field = chatInputRef.current;
      if (field && !field.disabled) field.focus();
      else closeButtonRef.current?.focus();
      return;
    }
    if (shouldRestoreFocusRef.current) {
      shouldRestoreFocusRef.current = false;
      launcherRef.current?.focus();
    }
  }, [isOpen]);

  const closeAssistant = () => {
    shouldRestoreFocusRef.current = true;
    setIsOpen(false);
  };

  const openAssistant = () => {
    setHasOpened(true);
    setIsOpen(true);
    setIsMinimized(false);
  };

  return (
    <>
      {!isOpen && (
        <AssistantLauncher onOpen={openAssistant} className={className} buttonRef={launcherRef} />
      )}
      {hasOpened && (
        <motion.div
          data-testid="assistant-panel"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={cn(
            "fixed z-50 shadow-2xl rounded-2xl border bg-background overflow-hidden flex flex-col",
            "bottom-24 right-4 md:bottom-6",
            isMinimized ? "w-72 h-14" : "w-80 sm:w-96 h-[500px] max-h-[70vh]",
            !isOpen && "hidden",
            className
          )}
        >
          <AssistantHeader
            minimized={isMinimized}
            onToggle={() => setIsMinimized((current) => !current)}
            onClose={closeAssistant}
            closeButtonRef={closeButtonRef}
          />
          <AssistantChat
            productName={productName}
            techniqueName={techniqueName}
            minimized={isMinimized}
            inputRef={chatInputRef}
          />
        </motion.div>
      )}
    </>
  );
}
