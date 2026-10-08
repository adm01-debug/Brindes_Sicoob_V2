import { motion, AnimatePresence } from "framer-motion";
import { Bot, User, Loader2, Volume2, VolumeX, Pause, Play, Mic, Copy, Check, ArrowDown, RotateCcw, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { preprocessProductLinks, ProductAwareLink } from "../ProductLinkRenderer";
import { type RefObject } from "react";
import { type Message } from "./useExpertChat";
import { ChatEmptyState } from "./ChatEmptyState";

interface ChatMessageListProps {
  messages: Message[];
  isLoading: boolean;
  isFromVoice: boolean;
  thinkingMessage: string;
  showScrollDown: boolean;
  sellerFirstName: string;
  clientId?: string;
  clientName?: string;
  conversationsCount: number;
  scrollRef: RefObject<HTMLDivElement>;
  onScroll: () => void;
  onScrollToBottom: () => void;
  onAutoSend: (text: string) => void;
  onShowHistory: () => void;
  // TTS
  playingTtsId: string | null;
  pausedTtsId: string | null;
  loadingTtsId: string | null;
  ttsErrorId: string | null;
  copiedId: string | null;
  savingQuoteId: string | null;
  onCopy: (msgId: string, text: string) => void;
  onSaveAsQuote: (msgId: string, content: string) => void;
  onPlayTts: (msgId: string, text: string) => void;
  onPauseTts: (msgId: string) => void;
  onStopTts: () => void;
  onRetry: () => void;
}

type ActionProps = Pick<ChatMessageListProps, "playingTtsId" | "pausedTtsId" | "loadingTtsId" | "ttsErrorId" |
  "copiedId" | "savingQuoteId" | "onCopy" | "onSaveAsQuote" | "onPlayTts" | "onPauseTts" | "onStopTts">;

const PROSE_CLASS = "prose prose-sm prose-neutral dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 [&>h1]:text-sm [&>h2]:text-sm [&>h3]:text-xs [&>p]:text-[13px] [&>p]:leading-relaxed [&_li]:text-[13px] [&_li]:leading-relaxed [&>pre]:text-xs [&>pre]:bg-background/50 [&>pre]:rounded-lg [&>pre]:border [&>pre]:border-border/20 [&_code]:text-xs [&_code]:bg-background/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_a]:text-primary [&_a]:no-underline [&_a]:font-medium hover:[&_a]:underline [&_strong]:font-semibold [&_table]:text-xs [&_table]:w-full [&_table]:border-collapse [&_th]:bg-muted/80 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_th]:border [&_th]:border-border/30 [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-wider [&_td]:px-2 [&_td]:py-1.5 [&_td]:border [&_td]:border-border/20 [&_td]:text-[12px] [&_tr:hover]:bg-muted/30 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-2";

function VoiceLoading() {
  return <motion.div key="voice-loading" initial={{ opacity: 0, scale: 0.95, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.92, y: -16, filter: "blur(4px)" }} transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }} className="flex flex-col items-center justify-center py-16">
    <div className="relative h-20 w-20 mb-5"><div className="absolute inset-0 rounded-full bg-primary/8 animate-ping [animation-duration:2s]" />
      <div className="absolute inset-2 rounded-full bg-primary/10 animate-ping [animation-duration:1.5s] [animation-delay:0.3s]" />
      <div className="relative h-20 w-20 rounded-full bg-primary/8 flex items-center justify-center border border-primary/15"><Mic className="h-8 w-8 text-primary/70 animate-pulse" /></div></div>
    <p className="font-display text-sm font-medium text-foreground/80 mb-1">Processando comando de voz</p><p className="text-xs text-muted-foreground/50">Preparando sua consulta…</p>
    <div className="flex items-center gap-1 mt-3">{[0, 1, 2].map(index => <div key={index} className={`h-1 w-1 rounded-full bg-primary/${50 - index * 10} animate-bounce [animation-duration:0.6s] [animation-delay:${index * 0.15}s]`} />)}</div>
  </motion.div>;
}

function ttsButtonClass(isError: boolean, isActive: boolean, isLoading: boolean) {
  if (isError) return "text-destructive bg-destructive/10 hover:bg-destructive/15";
  if (isActive) return "text-primary bg-primary/15 shadow-sm";
  return isLoading ? "text-primary/50 cursor-wait bg-primary/5" : "text-muted-foreground/60 hover:text-primary hover:bg-primary/10";
}

function ttsTitle(isError: boolean, isPlaying: boolean, isPaused: boolean, isLoading: boolean) {
  if (isError) return "Áudio bloqueado";
  if (isPlaying) return "Pausar";
  if (isPaused) return "Retomar";
  return isLoading ? "Gerando áudio..." : "Ouvir";
}

function TtsIcon({ isLoading, isError, isPlaying, isPaused }: { isLoading: boolean; isError: boolean; isPlaying: boolean; isPaused: boolean }) {
  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
  if (isError) return <RotateCcw className="h-4 w-4" />;
  if (isPlaying) return <Pause className="h-4 w-4" />;
  return isPaused ? <Play className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />;
}

function CopyButton({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={cn("p-1.5 rounded-lg transition-all duration-150", copied ? "text-success" : "text-muted-foreground/50 hover:text-foreground hover:bg-muted/50")} title={copied ? "Copiado!" : "Copiar"} aria-label="Copiar mensagem">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</button>;
}

function SaveQuoteButton({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return <button onClick={onClick} disabled={saving} className={cn("p-1.5 rounded-lg transition-all duration-150", saving ? "text-primary/50 cursor-wait" : "text-muted-foreground/50 hover:text-primary hover:bg-primary/5")} title="Salvar como rascunho de orçamento" aria-label="Salvar como rascunho de orçamento">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}</button>;
}

function TtsStatus({ error, active, onStop }: { error: boolean; active: boolean; onStop: () => void }) {
  return <>{error && <span className="text-[10px] text-destructive font-medium">Bloqueado</span>}
    {active && <button onClick={onStop} className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-all duration-150" title="Parar" aria-label="Parar áudio"><VolumeX className="h-3.5 w-3.5" /></button>}</>;
}

function AssistantActions({ id, content, ...actions }: { id: string; content: string } & ActionProps) {
  const isPlaying = actions.playingTtsId === id;
  const isPaused = actions.pausedTtsId === id;
  const isLoading = actions.loadingTtsId === id;
  const isError = actions.ttsErrorId === id;
  const isActive = isPlaying || isPaused;
  const isCopied = actions.copiedId === id;
  const isSaving = actions.savingQuoteId === id;
  const playOrPause = () => isPlaying ? actions.onPauseTts(id) : actions.onPlayTts(id, content);
  return <div className={cn("flex items-center gap-1 self-start mt-1.5 ml-0.5 transition-opacity duration-150", isActive ? "opacity-100" : "opacity-0 group-hover/msg:opacity-100")}>
    <CopyButton copied={isCopied} onClick={() => actions.onCopy(id, content)} />
    <SaveQuoteButton saving={isSaving} onClick={() => actions.onSaveAsQuote(id, content)} />
    <button onClick={playOrPause} disabled={isLoading} className={cn("p-2 rounded-xl transition-all duration-150", ttsButtonClass(isError, isActive, isLoading))} title={ttsTitle(isError, isPlaying, isPaused, isLoading)} aria-label={isPlaying ? "Pausar" : "Ouvir"}><TtsIcon isLoading={isLoading} isError={isError} isPlaying={isPlaying} isPaused={isPaused} /></button>
    <TtsStatus error={isError} active={isActive} onStop={actions.onStopTts} />
  </div>;
}

function MessageBody({ message }: { message: Message }) {
  if (message.role !== "assistant") return <p className="whitespace-pre-wrap">{message.content}</p>;
  return <div className={PROSE_CLASS}><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ProductAwareLink }} skipHtml>{preprocessProductLinks(message.content)}</ReactMarkdown></div>;
}

function bubbleClass(message: Message) {
  if (message.role === "user") return "bg-primary text-primary-foreground rounded-br-lg";
  return message.isError ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-bl-lg" : "bg-muted/50 text-foreground rounded-bl-lg border border-border/20";
}

function MessageAvatar({ role }: { role: Message["role"] }) {
  if (role === "assistant") return <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5"><Bot className="h-3.5 w-3.5 text-primary" /></div>;
  return <div className="h-7 w-7 rounded-xl bg-secondary/60 flex items-center justify-center flex-shrink-0 mt-0.5"><User className="h-3.5 w-3.5 text-secondary-foreground/60" /></div>;
}

function MessageMeta({ message, id, isLoading, onRetry, actions }: {
  message: Message; id: string; isLoading: boolean; onRetry: () => void; actions: ActionProps;
}) {
  const showActions = message.role === "assistant" && Boolean(message.content) && !message.isError && !isLoading;
  return <>
    {message.timestamp && <span className="text-[10px] text-muted-foreground/30 mt-0.5 ml-1 opacity-0 group-hover/msg:opacity-100 transition-opacity select-none">{new Date(message.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>}
    {message.isError && !isLoading && <button onClick={onRetry} className="flex items-center gap-1.5 self-start mt-1.5 ml-0.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-destructive hover:bg-destructive/10 transition-colors"><RotateCcw className="h-3 w-3" /> Tentar novamente</button>}
    {showActions && <AssistantActions id={id} content={message.content} {...actions} />}
  </>;
}

function MessageItem({ message, index, isFromVoice, isLoading, onRetry, actions }: {
  message: Message; index: number; isFromVoice: boolean; isLoading: boolean; onRetry: () => void; actions: ActionProps;
}) {
  const id = message.id || `msg-${message.role}-${index}`;
  return <motion.div initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.25, delay: index === 0 && isFromVoice ? 0.15 : 0 }} layout className={cn("flex gap-2", message.role === "user" ? "justify-end" : "justify-start")}>
    {message.role === "assistant" && <MessageAvatar role="assistant" />}
    <div className="flex flex-col max-w-[80%] group/msg"><div className={cn("rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed", bubbleClass(message))}><MessageBody message={message} /></div>
      <MessageMeta message={message} id={id} isLoading={isLoading} onRetry={onRetry} actions={actions} />
    </div>
    {message.role === "user" && <MessageAvatar role="user" />}
  </motion.div>;
}

function FollowUpActions({ visible, clientId, onAutoSend }: { visible: boolean; clientId?: string; onAutoSend: (text: string) => void }) {
  if (!visible) return null;
  const clientActions = clientId ? [
    { emoji: "📝", label: "Montar proposta", prompt: "Com base nessa análise, monte uma proposta comercial detalhada com produtos, quantidades e valores sugeridos." },
    { emoji: "💬", label: "Msg follow-up", prompt: "Crie uma mensagem de follow-up para enviar a este cliente por WhatsApp." },
  ] : [];
  const actions = [{ emoji: "🔍", label: "Aprofundar", prompt: "Pode detalhar mais essa última resposta? Quero mais informações." }, ...clientActions,
    { emoji: "📊", label: "Comparar", prompt: "Compare as opções mencionadas em uma tabela com prós e contras." }];
  return <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-wrap gap-1.5 ml-9 mt-1">{actions.map(action => <button key={action.label} onClick={() => onAutoSend(action.prompt)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-border/40 bg-background/80 hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all duration-150"><span className="text-[10px]">{action.emoji}</span>{action.label}</button>)}</motion.div>;
}

function TypingIndicator({ visible, isFromVoice, thinkingMessage }: { visible: boolean; isFromVoice: boolean; thinkingMessage: string }) {
  if (!visible) return null;
  return <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 justify-start"><div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5"><Bot className="h-3.5 w-3.5 text-primary" /></div>
    <div className="bg-muted/50 rounded-2xl rounded-bl-lg border border-border/20 px-4 py-3"><div className="flex flex-col gap-1.5"><div className="flex items-center gap-2"><div className="flex items-center gap-1">{[0, 1, 2].map(index => <motion.div key={index} className="h-1.5 w-1.5 rounded-full bg-primary/60" animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity, delay: index * 0.2, ease: "easeInOut" }} />)}</div>
      {isFromVoice && <span className="text-[10px] text-muted-foreground/40 flex items-center gap-1"><Mic className="h-2.5 w-2.5" /> via voz</span>}</div>
      <AnimatePresence mode="wait"><motion.p key={thinkingMessage} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.3 }} className="text-[10px] text-muted-foreground/50 leading-none">{thinkingMessage}</motion.p></AnimatePresence>
    </div></div></motion.div>;
}

function ScrollButton({ visible, onClick }: { visible: boolean; onClick: () => void }) {
  return <AnimatePresence>{visible && <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={onClick} className="absolute bottom-2 left-1/2 -translate-x-1/2 h-8 w-8 rounded-full bg-background border border-border/50 shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:shadow-lg transition-all z-10" aria-label="Rolar para baixo"><ArrowDown className="h-3.5 w-3.5" /></motion.button>}</AnimatePresence>;
}

export function ChatMessageList(props: ChatMessageListProps) {
  const { messages, isLoading, isFromVoice } = props;
  const lastMessage = messages[messages.length - 1];
  const actions: ActionProps = props;
  const showFollowUp = lastMessage?.role === "assistant" && !lastMessage.isError && !isLoading;
  return <ScrollArea className="flex-1 px-4 py-3 relative" ref={props.scrollRef} onScrollCapture={props.onScroll}>
    <div className="space-y-3">
      {messages.length === 0 && !isFromVoice && <ChatEmptyState sellerFirstName={props.sellerFirstName} clientId={props.clientId} clientName={props.clientName} conversationsCount={props.conversationsCount} onAutoSend={props.onAutoSend} onShowHistory={props.onShowHistory} />}
      <AnimatePresence mode="wait">{messages.length === 0 && isFromVoice && <VoiceLoading />}</AnimatePresence>
      <AnimatePresence mode="popLayout">{messages.map((message, index) => <MessageItem key={message.id || `msg-${message.role}-${index}`} message={message} index={index} isFromVoice={isFromVoice} isLoading={isLoading} onRetry={props.onRetry} actions={actions} />)}</AnimatePresence>
      <FollowUpActions visible={showFollowUp} clientId={props.clientId} onAutoSend={props.onAutoSend} />
      <TypingIndicator visible={isLoading && lastMessage?.role === "user"} isFromVoice={isFromVoice} thinkingMessage={props.thinkingMessage} />
    </div>
    <ScrollButton visible={props.showScrollDown} onClick={props.onScrollToBottom} />
  </ScrollArea>;
}
