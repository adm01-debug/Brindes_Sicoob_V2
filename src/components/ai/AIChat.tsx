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
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Send, Loader2, Bot, User as UserIcon, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getSupabaseFunctionUrl, supabase, supabasePublishableKey } from "@/integrations/supabase/client";
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
  /** Prompt de sistema enviado a cada requisição. */
  systemPrompt?: string;
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
  /** Identificador do contexto (ex: cliente, orçamento) — usado para metadata. */
  contextId?: string;
  /** Modo de resposta com instruções confiáveis definidas no backend. */
  assistantMode?: "sales" | "layout";
  /** Dados de catálogo tratados como contexto, nunca como instruções. */
  assistantContext?: string;
}

export const AI_CHAT_MAX_MESSAGES = 50;

function createGreetingMessages(greeting?: string): ChatMessage[] {
  if (!greeting) return [];
  return [{ id: makeId(), role: "assistant", content: greeting, createdAt: Date.now() }];
}

/** Limita o payload ao contrato da Edge Function sem remover a saudação da conversa. */
export function selectAssistantRequestMessages(
  messages: ChatMessage[],
  greetingMessageId?: string | null,
): ChatMessage[] {
  if (messages.length <= AI_CHAT_MAX_MESSAGES) return messages;

  const greeting = greetingMessageId
    ? messages.find((message) => message.id === greetingMessageId)
    : undefined;
  const recentMessages = messages.filter((message) => message.id !== greeting?.id);
  const recentLimit = AI_CHAT_MAX_MESSAGES - (greeting ? 1 : 0);
  const recentWindow = recentMessages.slice(-recentLimit);
  const firstUserMessage = recentWindow.findIndex((message) => message.role === "user");
  const selected = firstUserMessage > 0 ? recentWindow.slice(firstUserMessage) : recentWindow;

  return greeting ? [greeting, ...selected] : selected;
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

type StreamEvent = { choices?: Array<{ delta?: { content?: unknown }; message?: { content?: unknown } }>; content?: unknown; delta?: unknown };

// O parser precisa cobrir os formatos OpenAI e Responses sem descartar deltas válidos.
// eslint-disable-next-line complexity
function streamEventContent(parsed: StreamEvent): string {
  const content = parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content ?? parsed.delta ?? parsed.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((part) => typeof part === "object" && part && "text" in part ? String(part.text) : "").join("");
}

function contentFromStreamEvent(event: string): string {
  const data = event.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
  if (!data || data === "[DONE]") return "";
  try {
    return streamEventContent(JSON.parse(data) as StreamEvent);
  } catch {
    return "";
  }
}

export async function readAssistantSse(response: Response): Promise<string> {
  if (!response.body) throw new Error("A resposta da IA não contém fluxo de dados");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop() ?? "";
    for (const event of events) content += contentFromStreamEvent(event);
    if (done) break;
  }
  content += contentFromStreamEvent(buffer);
  if (!content.trim()) throw new Error("Resposta vazia do assistente");
  return content;
}

interface AssistantRequest {
  messages: ChatMessage[];
  systemPrompt?: string;
  contextId?: string;
  assistantMode?: AIChatProps["assistantMode"];
  assistantContext?: string;
}

async function fetchAssistantContent(request: AssistantRequest, signal: AbortSignal) {
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
      messages: request.messages.map(message => ({ role: message.role, content: message.content })),
      systemPrompt: request.systemPrompt,
      contextId: request.contextId,
      assistantMode: request.assistantMode,
      assistantContext: request.assistantContext,
    }),
    signal,
  });
  return parseAssistantResponse(response);
}

async function parseAssistantResponse(response: Response): Promise<string> {
  if (!response.ok) throw await responseError(response);
  if (response.headers.get("content-type")?.includes("text/event-stream")) return readAssistantSse(response);
  const data = await response.json() as { message?: { content?: string }; content?: string; reply?: string };
  const content = data.message?.content ?? data.content ?? data.reply ?? "";
  if (!content) throw new Error("Resposta vazia do assistente");
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

function EmptyConversationState() {
  return <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground"><Bot className="h-10 w-10 mb-3 opacity-40" aria-hidden="true" /><p className="font-display text-sm">Inicie uma conversa com o assistente</p></div>;
}

function ChatError({ message }: { message: string }) {
  return <div role="alert" className="flex items-start gap-2 border-t-[1.5px] border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" /><span className="font-display">{message}</span></div>;
}

function SendButtonIcon({ isLoading }: { isLoading: boolean }) {
  return isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />;
}

function ResetConversationButton({ visible, onReset }: { visible: boolean; onReset: () => void }) {
  if (!visible) return null;
  return <Button type="button" variant="ghost" size="sm" onClick={onReset} className="h-7 gap-1.5 text-xs" aria-label="Reiniciar conversa"><RotateCcw className="h-3 w-3" />Reiniciar</Button>;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function AIChat({
  systemPrompt,
  placeholder = "Digite sua mensagem...",
  greeting,
  maxHeight = "500px",
  onProductMention,
  className,
  contextId,
  assistantMode,
  assistantContext,
}: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => createGreetingMessages(greeting));
  const greetingMessageIdRef = useRef<string | null>(messages[0]?.id ?? null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: makeId(),
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsLoading(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const requestMessages = selectAssistantRequestMessages(nextMessages, greetingMessageIdRef.current);
      const assistantContent = await fetchAssistantContent({ messages: requestMessages, systemPrompt, contextId, assistantMode, assistantContext }, controller.signal);
      const assistantMsg: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content: assistantContent,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      if (onProductMention) extractProductMentions(assistantContent).forEach(onProductMention);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const msg = chatErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [input, isLoading, messages, systemPrompt, contextId, assistantMode, assistantContext, onProductMention]);

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
    abortRef.current?.abort();
    const greetingMessage = greeting
      ? { id: makeId(), role: "assistant" as const, content: greeting, createdAt: Date.now() }
      : null;
    greetingMessageIdRef.current = greetingMessage?.id ?? null;
    setMessages(greetingMessage ? [greetingMessage] : []);
    setError(null);
    setIsLoading(false);
    textareaRef.current?.focus();
  }, [greeting]);

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
        <ResetConversationButton visible={messages.length > 0} onReset={handleReset} />
      </div>

      {/* Mensagens */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        style={{ maxHeight }}
        role="log"
        aria-live="polite"
        aria-atomic="false"
      >
        {messages.length === 0 && !isLoading && <EmptyConversationState />}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {isLoading && <TypingIndicator />}
      </div>

      {/* Erro */}
      {error && <ChatError message={error} />}

      {/* Input */}
      <div className="border-t-[1.5px] border-border bg-muted/20 p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
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
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            aria-label="Enviar mensagem"
            className="h-10 w-10 shrink-0 rounded-xl"
          >
            <SendButtonIcon isLoading={isLoading} />
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground/70 font-display">
          Pressione <kbd className="px-1 rounded border border-border bg-background">Enter</kbd> para enviar •{" "}
          <kbd className="px-1 rounded border border-border bg-background">Shift+Enter</kbd> para quebrar linha
        </p>
      </div>
    </div>
  );
}
