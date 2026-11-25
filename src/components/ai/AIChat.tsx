/**
 * AIChat — Chat conversacional reutilizável que consome a edge function `expert-chat`.
 *
 * Features:
 * - Histórico de mensagens user/assistant com auto-scroll
 * - Envio com Enter (Shift+Enter quebra linha)
 * - Loading state, error state, cancelamento via AbortController
 * - Markdown leve + reconhecimento do padrão [[PRODUTO:id:nome:imageUrl]]
 *   (memory: features/ai/flow-product-integration-spec)
 * - Tokens de design semânticos (Outfit, var(--primary), border-[1.5px], rounded-xl)
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type RefObject,
  type SetStateAction,
} from "react";
import { Send, Loader2, Bot, User as UserIcon, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSupabaseFunctionUrl, supabase, supabasePublishableKey } from "@/integrations/supabase/client";
import { selectExpertChatMessages } from "@/lib/assistant-message-window";
import { readExpertStream } from "@/lib/assistant-stream";
import { toast } from "sonner";

// ============================================
// TIPOS
// ============================================

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

export interface ProductMention {
  id: string;
  name: string;
  imageUrl?: string;
}

export interface AIChatProps {
  /** Modo do assistente no backend (`sales` por padrão, `layout` no gerador de mockup). */
  assistantMode?: "sales" | "layout";
  /** Dados de catálogo (somente rótulos) usados pelo modo `layout`. */
  assistantContext?: string;
  /** Placeholder do input. */
  placeholder?: string;
  /** Mensagem inicial do assistente (opcional). */
  greeting?: string;
  /** Altura máxima da área de mensagens. */
  maxHeight?: string;
  /** Callback acionado quando o assistente menciona um produto via [[PRODUTO:...]] */
  onProductMention?: (product: ProductMention) => void;
  /** Classe extra para o container raiz. */
  className?: string;
  /** Ref do textarea, para o host controlar o foco (abrir/fechar por teclado). */
  inputRef?: RefObject<HTMLTextAreaElement>;
}

// ============================================
// HELPERS
// ============================================

const PRODUCT_PATTERN = /\[\[PRODUTO:([^:]+):([^:]+)(?::([^\]]+))?\]\]/g;

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function extractProductMentions(text: string): ProductMention[] {
  const mentions: ProductMention[] = [];
  let match: RegExpExecArray | null;
  PRODUCT_PATTERN.lastIndex = 0;
  while ((match = PRODUCT_PATTERN.exec(text)) !== null) {
    const [, id, name, imageUrl] = match;
    if (id && name) mentions.push({ id, name, imageUrl });
  }
  return mentions;
}

async function responseError(response: Response) {
  if (response.status === 429) return new Error("Limite de requisições atingido. Aguarde alguns instantes.");
  if (response.status === 402) return new Error("Créditos de IA esgotados. Contate o administrador.");
  const text = await response.text().catch(() => "");
  return new Error(`Erro ${response.status}: ${text || "falha ao consultar IA"}`);
}

interface AssistantStreamOptions {
  assistantMode?: "sales" | "layout";
  assistantContext?: string;
}

/**
 * `expert-chat` responde em SSE (`text/event-stream`), não em JSON: a resposta é
 * lida linha a linha e devolvida por `onUpdate` conforme chega.
 */
async function streamAssistantContent(
  messages: ChatMessage[],
  options: AssistantStreamOptions,
  onUpdate: (content: string) => void,
  signal: AbortSignal,
) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error("Usuário não autenticado");
  const response = await fetch(getSupabaseFunctionUrl('expert-chat'), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messages: selectExpertChatMessages(
        messages.map(message => ({ role: message.role, content: message.content })),
      ),
      assistantMode: options.assistantMode ?? "sales",
      assistantContext: options.assistantContext,
    }),
    signal,
  });
  if (!response.ok) throw await responseError(response);
  if (!response.body) throw new Error("Resposta vazia do assistente");
  const content = await readExpertStream(response.body.getReader(), onUpdate);
  if (!content.trim()) throw new Error("Resposta vazia do assistente");
  return content;
}

function chatErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erro desconhecido";
}

// ============================================
// SUB-COMPONENTES
// ============================================

interface MessageBubbleProps {
  message: ChatMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const cleanContent = useMemo(
    () => message.content.replace(PRODUCT_PATTERN, (_, _id, name) => `**${name}**`),
    [message.content]
  );

  return (
    <div
      className={cn(
        "flex gap-3 animate-fade-in",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[1.5px]",
          isUser
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-muted text-muted-foreground border-border"
        )}
        aria-hidden="true"
      >
        {isUser ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-xl border-[1.5px] px-4 py-2.5 text-sm leading-relaxed font-display",
          isUser
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-card text-card-foreground border-border"
        )}
      >
        <p className="whitespace-pre-wrap break-words">{cleanContent}</p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in" aria-live="polite" aria-label="Assistente digitando">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-[1.5px] bg-muted text-muted-foreground border-border">
        <Bot className="h-4 w-4" />
      </div>
      <div className="rounded-xl border-[1.5px] border-border bg-card px-4 py-2.5">
        <div className="flex gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

interface SendTurnOptions {
  assistantMode?: "sales" | "layout";
  assistantContext?: string;
  onProductMention?: (product: ProductMention) => void;
}

interface RunTurnArgs {
  messages: ChatMessage[];
  options: SendTurnOptions;
  signal: AbortSignal;
  isCurrentTurn: () => boolean;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setStreaming: Dispatch<SetStateAction<string>>;
}

/** Executa o stream de um turno; turno cancelado nao escreve no historico. */
async function runTurn({ messages, options, signal, isCurrentTurn, setMessages, setStreaming }: RunTurnArgs) {
  const assistantContent = await streamAssistantContent(
    messages,
    { assistantMode: options.assistantMode, assistantContext: options.assistantContext },
    (partial) => {
      if (isCurrentTurn()) setStreaming(partial);
    },
    signal,
  );
  if (!isCurrentTurn()) return;
  setMessages((prev) => [
    ...prev,
    { id: makeId(), role: "assistant", content: assistantContent, createdAt: Date.now() },
  ]);
  if (options.onProductMention) extractProductMentions(assistantContent).forEach(options.onProductMention);
}

/** Dispara o turno (streaming + erros) fora do componente para manter a complexidade baixa. */
function useSendTurn(
  messages: ChatMessage[],
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>,
  setStreaming: Dispatch<SetStateAction<string>>,
  setError: Dispatch<SetStateAction<string | null>>,
  setIsLoading: Dispatch<SetStateAction<boolean>>,
  options: SendTurnOptions,
) {
  const abortRef = useRef<AbortController | null>(null);
  // Cada turno recebe um numero. `cancel` avanca o contador, entao deltas,
  // conclusao e erro de um turno cancelado (ou substituido) sao descartados.
  const turnRef = useRef(0);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const cancel = useCallback(() => {
    turnRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const sendTurn = useCallback(
    async (content: string) => {
      const turn = turnRef.current + 1;
      turnRef.current = turn;
      const isCurrentTurn = () => turnRef.current === turn;

      const userMsg: ChatMessage = { id: makeId(), role: "user", content, createdAt: Date.now() };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setError(null);
      setStreaming("");
      setIsLoading(true);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await runTurn({
          messages: nextMessages,
          options,
          signal: controller.signal,
          isCurrentTurn,
          setMessages,
          setStreaming,
        });
      } catch (err) {
        if (!isCurrentTurn()) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        const msg = chatErrorMessage(err);
        setError(msg);
        toast.error(msg);
      } finally {
        if (isCurrentTurn()) {
          setStreaming("");
          setIsLoading(false);
        }
      }
    },
    [messages, setMessages, setStreaming, setError, setIsLoading, options],
  );

  return useMemo(() => ({ sendTurn, cancel }), [sendTurn, cancel]);
}

interface ChatLogProps {
  messages: ChatMessage[];
  streaming: string;
  isLoading: boolean;
  maxHeight: string;
  scrollRef: RefObject<HTMLDivElement>;
  onScroll: () => void;
}

function ChatLog({ messages, streaming, isLoading, maxHeight, scrollRef, onScroll }: ChatLogProps) {
  const empty = messages.length === 0 && !isLoading;
  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      style={{ maxHeight }}
      role="log"
      aria-live="polite"
      aria-atomic="false"
    >
      {empty && (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <Bot className="h-10 w-10 mb-3 opacity-40" aria-hidden="true" />
          <p className="font-display text-sm">Inicie uma conversa com o assistente</p>
        </div>
      )}
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
      {streaming !== "" && (
        <MessageBubble message={{ id: "streaming", role: "assistant", content: streaming, createdAt: 0 }} />
      )}
      {isLoading && streaming === "" && <TypingIndicator />}
    </div>
  );
}

interface ChatComposerProps {
  input: string;
  onInput: (value: string) => void;
  onSend: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  isLoading: boolean;
  placeholder: string;
  textareaRef: RefObject<HTMLTextAreaElement>;
}

function ChatComposer({ input, onInput, onSend, onKeyDown, isLoading, placeholder, textareaRef }: ChatComposerProps) {
  return (
    <div className="border-t-[1.5px] border-border bg-muted/20 p-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={isLoading}
          aria-label="Mensagem para o assistente"
          className={cn(
            "flex-1 resize-none rounded-xl border-[1.5px] border-input bg-background px-3 py-2 text-sm",
            "font-display ring-offset-background transition-all duration-200",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary",
            "hover:border-primary/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "min-h-[40px] max-h-32"
          )}
        />
        <Button
          type="button"
          onClick={onSend}
          disabled={!input.trim() || isLoading}
          size="icon"
          aria-label="Enviar mensagem"
          className="h-10 w-10 shrink-0 rounded-xl"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground/70 font-display">
        Pressione <kbd className="px-1 rounded border border-border bg-background">Enter</kbd> para enviar •{" "}
        <kbd className="px-1 rounded border border-border bg-background">Shift+Enter</kbd> para quebrar linha
      </p>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function AIChat({
  assistantMode,
  assistantContext,
  placeholder = "Digite sua mensagem...",
  greeting,
  maxHeight = "500px",
  onProductMention,
  className,
  inputRef,
}: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    greeting
      ? [{ id: makeId(), role: "assistant", content: greeting, createdAt: Date.now() }]
      : []
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  // O host pode passar a ref para mover o foco ao abrir/fechar o chat.
  const textareaRef = inputRef ?? internalTextareaRef;

  // Acompanha a resposta so enquanto a pessoa estiver no fim da conversa:
  // rolar por cima de quem esta lendo uma mensagem anterior tira o texto da tela.
  const nearBottomRef = useRef(true);
  const lastScrollTopRef = useRef(0);
  // Rolagem suave tambem emite eventos: sem esta marca, a propria animacao
  // desligaria o acompanhamento antes de chegar ao fim da conversa.
  const animatingRef = useRef(false);

  const handleLogScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const wentUp = el.scrollTop < lastScrollTopRef.current;
    lastScrollTopRef.current = el.scrollTop;
    if (distance <= 48) {
      nearBottomRef.current = true;
      animatingRef.current = false;
      return;
    }
    if (wentUp) {
      nearBottomRef.current = false;
      animatingRef.current = false;
      return;
    }
    if (animatingRef.current) return;
    nearBottomRef.current = false;
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !nearBottomRef.current) return;
    animatingRef.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading, streaming]);

  const { sendTurn, cancel } = useSendTurn(messages, setMessages, setStreaming, setError, setIsLoading, {
    assistantMode,
    assistantContext,
    onProductMention,
  });

  const sendMessage = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    // Mandar mensagem e pedido explicito para ver o fim da conversa.
    nearBottomRef.current = true;
    void sendTurn(trimmed);
  }, [input, isLoading, sendTurn]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const handleReset = useCallback(() => {
    // Cancela o turno em andamento antes de limpar: senao a resposta antiga
    // entraria no historico novo e seguiria como contexto da proxima pergunta.
    cancel();
    setMessages(
      greeting
        ? [{ id: makeId(), role: "assistant", content: greeting, createdAt: Date.now() }]
        : []
    );
    setError(null);
    setStreaming("");
    setIsLoading(false);
    textareaRef.current?.focus();
  }, [cancel, greeting, textareaRef]);

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border-[1.5px] border-border bg-background overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b-[1.5px] border-border bg-muted/30 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="font-display text-sm font-semibold text-foreground">Assistente IA</span>
        </div>
        {messages.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-7 gap-1.5 text-xs"
            aria-label="Reiniciar conversa"
          >
            <RotateCcw className="h-3 w-3" />
            Reiniciar
          </Button>
        )}
      </div>

      {/* Mensagens */}
      <ChatLog
        messages={messages}
        streaming={streaming}
        isLoading={isLoading}
        maxHeight={maxHeight}
        scrollRef={scrollRef}
        onScroll={handleLogScroll}
      />

      {/* Erro */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 border-t-[1.5px] border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span className="font-display">{error}</span>
        </div>
      )}

      {/* Input */}
      <ChatComposer
        input={input}
        onInput={setInput}
        onSend={sendMessage}
        onKeyDown={handleKeyDown}
        isLoading={isLoading}
        placeholder={placeholder}
        textareaRef={textareaRef}
      />
    </div>
  );
}
