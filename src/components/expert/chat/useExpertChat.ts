/**
 * useExpertChat — Core logic extracted from ExpertChatDialog
 * Handles messages, conversations, TTS, streaming, filters.
 */
import { type Dispatch, type KeyboardEvent, type MouseEvent, type SetStateAction, useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getSupabaseFunctionUrl, supabase } from "@/integrations/supabase/client";
import { invokeExternalDb } from "@/lib/external-db";
import { useExpertChatTts } from "./useExpertChatTts";
import { useExpertConversations, type ExpertConversation } from "@/hooks/useExpertConversations";
import { selectExpertChatMessages } from "@/lib/assistant-message-window";
import {
  type FlowFilterState,
  type FlowFilterOptions,
  defaultFlowFilters,
  countActiveFilters,
  getActiveFilterLabels,
} from "../FlowFilterPanel";

export interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
  isError?: boolean;
}

const THINKING_MESSAGES = [
  "Analisando sua pergunta…",
  "Consultando catálogo…",
  "Buscando produtos relevantes…",
  "Preparando recomendações…",
];

const THINKING_MESSAGES_CRM = [
  "Consultando dados do cliente…",
  "Analisando histórico de compras…",
  "Verificando orçamentos pendentes…",
  "Gerando insights personalizados…",
];

interface UseExpertChatOptions {
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
  clientName?: string;
  initialMessage?: string | null;
}

function parseExpertStreamLine(rawLine: string): { content?: string; retry?: boolean } {
  const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;
  if (line.startsWith(":") || line.trim() === "" || !line.startsWith("data: ")) return {};

  const jsonText = line.slice(6).trim();
  if (jsonText === "[DONE]") return {};

  try {
    const parsed = JSON.parse(jsonText) as {
      choices?: Array<{ delta?: { content?: string } }>;
    };
    return { content: parsed.choices?.[0]?.delta?.content };
  } catch {
    return { retry: true };
  }
}

async function readExpertStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onUpdate: (content: string) => void,
): Promise<string> {
  const decoder = new TextDecoder();
  let buffer = "";
  let assistantMessage = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        const parsed = parseExpertStreamLine(line);
        if (parsed.retry) {
          buffer = `${line}\n${buffer}`;
          break;
        }
        if (parsed.content) {
          assistantMessage += parsed.content;
          onUpdate(assistantMessage);
        }
        newlineIndex = buffer.indexOf("\n");
      }
    }
  } catch (error) {
    if ((error as Error).name !== "AbortError") throw error;
  }

  return assistantMessage;
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right, "pt-BR", { sensitivity: "base" }),
  );
}

async function fetchBaseFilterOptions(): Promise<FlowFilterOptions> {
  const [categories, suppliers, techniques, tags, colors, materials] = await Promise.all([
    invokeExternalDb<{ name: string }>({ table: "categories", operation: "select", select: "name", filters: { is_active: true }, orderBy: { column: "name", ascending: true }, limit: 500 }),
    invokeExternalDb<{ name: string }>({ table: "suppliers", operation: "select", select: "name", orderBy: { column: "name", ascending: true }, limit: 200 }),
    invokeExternalDb<{ nome: string }>({ table: "tecnicas_gravacao", operation: "select", select: "nome", filters: { ativo: true }, orderBy: { column: "nome", ascending: true }, limit: 100 }),
    invokeExternalDb<{ name: string }>({ table: "tags", operation: "select", select: "name", orderBy: { column: "name", ascending: true }, limit: 200 }),
    invokeExternalDb<{ name: string }>({ table: "color_groups", operation: "select", select: "name", orderBy: { column: "name", ascending: true }, limit: 200 }),
    invokeExternalDb<{ name: string }>({ table: "material_groups", operation: "select", select: "name", orderBy: { column: "name", ascending: true }, limit: 200 }),
  ]);
  return {
    categories: uniqueSorted((categories.records ?? []).map(item => item.name)),
    materials: uniqueSorted((materials.records ?? []).map(item => item.name)),
    colors: uniqueSorted((colors.records ?? []).map(item => item.name)),
    suppliers: uniqueSorted((suppliers.records ?? []).map(item => item.name)),
    techniques: uniqueSorted((techniques.records ?? []).map(item => item.nome)),
    publicoAlvo: [], datasComemorativas: [], endomarketing: [], nichos: [],
    tags: uniqueSorted((tags.records ?? []).map(item => item.name)),
  };
}

async function fetchNicheOptions() {
  try {
    const result = await invokeExternalDb<{ nome: string }>({ table: "ramo_atividade", operation: "select", select: "nome", orderBy: { column: "nome", ascending: true }, limit: 200 });
    return uniqueSorted((result.records ?? []).map(item => item.nome));
  } catch {
    return [];
  }
}

function optionalList<T>(values: T[]) {
  return values.length > 0 ? values : undefined;
}

function optionalNumber(value: string) {
  return value ? Number(value) : undefined;
}

function enabled(value: boolean) {
  return value || undefined;
}

export function buildExpertRequestBody(messages: Message[], userMessage: string, clientId: string | undefined, filters: FlowFilterState) {
  return {
    messages: selectExpertChatMessages([...messages, { role: "user" as const, content: userMessage }])
      .map(message => ({ role: message.role, content: message.content }))
      .filter(message => Boolean(message.content?.length)),
    clientId: clientId || undefined,
    categoryFilter: optionalList(filters.selectedCategories),
    priceMin: optionalNumber(filters.priceMin),
    priceMax: optionalNumber(filters.priceMax),
    materialFilter: optionalList(filters.selectedMaterials),
    colorFilter: optionalList(filters.selectedColors),
    genderFilter: optionalList(filters.selectedGenders),
    supplierFilter: optionalList(filters.selectedSuppliers),
    techniqueFilter: optionalList(filters.selectedTechniques),
    publicoFilter: optionalList(filters.selectedPublicos),
    dataComemorativaFilter: optionalList(filters.selectedDatasComemorativas),
    endomarketingFilter: optionalList(filters.selectedEndomarketing),
    nichoFilter: optionalList(filters.selectedNichos),
    tagFilter: optionalList(filters.selectedTags),
    onlyInStock: enabled(filters.onlyInStock),
    onlyNew: enabled(filters.onlyNew),
    onlyKit: enabled(filters.onlyKit),
    onlyBestseller: enabled(filters.onlyBestseller),
    onlyFeatured: enabled(filters.onlyFeatured),
    hasPersonalization: enabled(filters.hasPersonalization),
  };
}

type SetMessages = Dispatch<SetStateAction<Message[]>>;

function updateAssistantMessage(setMessages: SetMessages, content: string) {
  setMessages(previous => {
    const next = [...previous];
    const last = next[next.length - 1];
    if (last?.role === "assistant") last.content = content;
    return next;
  });
}

interface RequestExpertAnswerOptions {
  readonly messages: Message[];
  readonly userMessage: string;
  readonly clientId: string | undefined;
  readonly filters: FlowFilterState;
  readonly signal: AbortSignal;
  readonly setMessages: SetMessages;
}

async function requestExpertAnswer(options: RequestExpertAnswerOptions) {
  const session = await supabase.auth.getSession();
  const response = await fetch(getSupabaseFunctionUrl('expert-chat'), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.data.session?.access_token}` },
    body: JSON.stringify(buildExpertRequestBody(options.messages, options.userMessage, options.clientId, options.filters)),
    signal: options.signal,
  });
  if (!response.ok) {
    const errorData = await response.json() as { error?: string };
    throw new Error(errorData.error || "Erro ao conectar com o Flow");
  }
  const assistantMessageId = `assistant-${Date.now()}`;
  options.setMessages(previous => [...previous, { id: assistantMessageId, role: "assistant", content: "", timestamp: Date.now() }]);
  const reader = response.body?.getReader();
  const content = reader ? await readExpertStream(reader, value => updateAssistantMessage(options.setMessages, value)) : "";
  return { content, assistantMessageId };
}

interface EnsureConversationOptions {
  readonly currentId: string | null;
  readonly userMessage: string;
  readonly create: (title: string) => Promise<string | null>;
  readonly setCurrentId: Dispatch<SetStateAction<string | null>>;
}

async function ensureConversation(options: EnsureConversationOptions) {
  if (options.currentId) return options.currentId;
  const suffix = options.userMessage.length > 50 ? "..." : "";
  const createdId = await options.create(options.userMessage.slice(0, 50) + suffix);
  if (createdId) options.setCurrentId(createdId);
  return createdId;
}

function expertErrorMessage(error: unknown) {
  return error instanceof Error
    ? `Desculpe, ocorreu um erro: ${error.message}`
    : "Desculpe, ocorreu um erro ao processar sua mensagem.";
}

type SaveMessage = ReturnType<typeof useExpertConversations>['saveMessage'];

interface SaveConversationMessageOptions {
  readonly conversationId: string | null;
  readonly role: Message['role'];
  readonly content: string;
  readonly save: SaveMessage;
}

async function saveConversationMessage(options: SaveConversationMessageOptions) {
  if (options.conversationId) await options.save(options.conversationId, options.role, options.content);
}

interface AutoPlayAnswerOptions {
  readonly enabled: boolean;
  readonly fromVoice: boolean;
  readonly answer: { content: string; assistantMessageId: string };
  readonly play: (messageId: string, content: string) => void;
}

function autoPlayAnswer(options: AutoPlayAnswerOptions) {
  if (!options.enabled || !options.fromVoice || !options.answer.content) return;
  setTimeout(() => options.play(options.answer.assistantMessageId, options.answer.content), 300);
}

interface ReportExpertFailureOptions {
  readonly error: unknown;
  readonly conversationId: string | null;
  readonly setMessages: SetMessages;
  readonly save: SaveMessage;
}

async function reportExpertFailure(options: ReportExpertFailureOptions) {
  if (options.error instanceof Error && options.error.name === 'AbortError') return;
  console.error("Expert chat error:", options.error);
  const content = expertErrorMessage(options.error);
  options.setMessages(previous => [...previous, { id: `error-${Date.now()}`, role: "assistant", content, timestamp: Date.now(), isError: true }]);
  await saveConversationMessage({ conversationId: options.conversationId, role: "assistant", content, save: options.save });
}

function resetInputHeight(input: HTMLTextAreaElement | null) {
  if (input) input.style.height = "auto";
}

export function useExpertChat({
  isOpen,
  onClose,
  clientId,
  clientName,
  initialMessage,
}: UseExpertChatOptions) {
  const navigate = useNavigate();
  const [savingQuoteId, setSavingQuoteId] = useState<string | null>(null);
  const [sellerFirstName, setSellerFirstName] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const tts = useExpertChatTts();
  const [isFromVoice, setIsFromVoice] = useState(false);
  const isFromVoiceRef = useRef(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [lastUserInput, setLastUserInput] = useState("");
  const [thinkingMessage, setThinkingMessage] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [flowFilters, setFlowFilters] = useState<FlowFilterState>(defaultFlowFilters);
  const [filterOptions, setFilterOptions] = useState<FlowFilterOptions>({
    categories: [], materials: [], colors: [], suppliers: [], techniques: [],
    publicoAlvo: [], datasComemorativas: [], endomarketing: [], nichos: [], tags: [],
  });
  const [showFilters, setShowFilters] = useState(false);
  const [historyDateFilter, setHistoryDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [autoPlayTts, setAutoPlayTts] = useState(() => {
    try { return localStorage.getItem("flow_autoplay_tts") !== "false"; } catch { return true; }
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const handleAutoSend = useCallback((text: string) => {
    setInput(text);
    setTimeout(() => {
      const sendButton = document.querySelector('[data-oracle-send]') as HTMLButtonElement | null;
      sendButton?.click();
    }, 50);
  }, []);

  const {
    conversations,
    isLoading: isLoadingConversations,
    createConversation,
    deleteConversation,
    fetchMessages,
    saveMessage,
  } = useExpertConversations(clientId);

  // Rotate thinking messages
  useEffect(() => {
    if (!isLoading) { setThinkingMessage(""); return; }
    const msgs = clientId ? THINKING_MESSAGES_CRM : THINKING_MESSAGES;
    let idx = 0;
    setThinkingMessage(msgs[0] ?? "");
    const interval = setInterval(() => {
      idx = (idx + 1) % msgs.length;
      setThinkingMessage(msgs[idx] ?? "");
    }, 2500);
    return () => clearInterval(interval);
  }, [isLoading, clientId]);

  // Fetch seller profile
  useEffect(() => {
    if (!isOpen) return;
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, preferences")
          .eq("user_id", user.id)
          .single();
        if (profile?.full_name) setSellerFirstName(profile.full_name.split(" ")[0] ?? "");
        const prefs = profile?.preferences as Record<string, unknown> | null;
        if (prefs && typeof prefs.flow_autoplay_tts === "boolean") {
          setAutoPlayTts(prefs.flow_autoplay_tts);
          try { localStorage.setItem("flow_autoplay_tts", String(prefs.flow_autoplay_tts)); } catch {
            // O armazenamento pode estar indisponível em modo privado.
          }
        }
      } catch { /* ignore */ }
    };
    fetchProfile();
  }, [isOpen]);

  // Fetch filter options
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void fetchBaseFilterOptions()
      .then(options => { if (!cancelled) setFilterOptions(options); })
      .catch(error => console.error("Error fetching Flow filters:", error));
    void fetchNicheOptions().then(nichos => {
      if (!cancelled && nichos.length > 0) setFilterOptions(previous => ({ ...previous, nichos }));
    });
    return () => { cancelled = true; };
  }, [isOpen]);

  // Proactive filter feedback
  const prevFilterKeyRef = useRef("");
  const filterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const currentCount = countActiveFilters(flowFilters);
    if (currentCount === 0 || isLoading || !isOpen) return;
    const labels = getActiveFilterLabels(flowFilters);
    const filterKey = labels.map(l => `${l.key}:${l.value || l.label}`).sort().join("|");
    if (filterKey === prevFilterKeyRef.current) return;
    prevFilterKeyRef.current = filterKey;
    if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    filterDebounceRef.current = setTimeout(() => {
      const summary = labels.map(l => l.label).join(", ");
      handleAutoSend(`Filtros aplicados: ${summary}. Me mostre os melhores produtos para esses filtros, com recomendações e insights de vendas.`);
    }, 1000);
    return () => { if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current); };
  }, [flowFilters, handleAutoSend, isLoading, isOpen]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current && !showScrollDown) {
      if (scrollRef.current.scrollTo) {
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      } else {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }
  }, [messages, showScrollDown]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 80);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      if (scrollRef.current.scrollTo) {
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      } else {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
      setShowScrollDown(false);
    }
  }, []);

  const handleCopy = useCallback(async (msgId: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleSaveAsQuote = useCallback(async (msgId: string, proposalContent: string) => {
    try {
      setSavingQuoteId(msgId);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Faça login para salvar orçamentos"); return; }
      const { data: quote, error } = await supabase
        // rls-allow: RLS aplica seller_id automaticamente
        .from("quotes")
        .insert({ seller_id: user.id, status: "draft", client_id: clientId || null, client_name: clientName || null, notes: proposalContent.slice(0, 2000), internal_notes: "Gerado pelo Flow - Assistente Pessoal" })
        .select("id, quote_number")
        .single();
      if (error) throw error;
      toast.success(`Rascunho ${quote.quote_number} criado!`, { description: "Redirecionando para o editor…", duration: 2000 });
      setTimeout(() => { onClose(); navigate(`/orcamentos/novo?edit=${quote.id}`); }, 800);
    } catch (err) {
      console.error("Error saving quote draft:", err);
      toast.error("Erro ao criar rascunho de orçamento");
    } finally { setSavingQuoteId(null); }
  }, [clientId, clientName, navigate, onClose]);

  useEffect(() => {
    if (isOpen && inputRef.current && !showHistory) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen, showHistory]);

  useEffect(() => {
    if (!isOpen) { setShowHistory(false); setHistorySearch(""); }
  }, [isOpen]);

  useEffect(() => {
    setMessages([]); setCurrentConversationId(null); setShowHistory(false);
    setFlowFilters(defaultFlowFilters); prevFilterKeyRef.current = "";
  }, [clientId]);

  // Auto-send initial voice message
  const initialMessageSentRef = useRef(false);
  useEffect(() => {
    if (isOpen && initialMessage && !initialMessageSentRef.current && !isLoading) {
      initialMessageSentRef.current = true;
      setIsFromVoice(true); isFromVoiceRef.current = true;
      handleAutoSend(initialMessage);
    }
    if (!isOpen) { initialMessageSentRef.current = false; setIsFromVoice(false); isFromVoiceRef.current = false; }
  }, [handleAutoSend, isOpen, initialMessage, isLoading]);

  // TTS — delegated to useExpertChatTts
  const { handlePlayTts, handlePauseTts, stopTts } = tts;

  const startNewConversation = useCallback(() => {
    setMessages([]); setCurrentConversationId(null); setShowHistory(false);
  }, []);

  const loadConversation = useCallback(async (conversation: ExpertConversation) => {
    const loaded = await fetchMessages(conversation.id);
    setMessages(loaded.map(m => ({ id: m.id, role: m.role, content: m.content })));
    setCurrentConversationId(conversation.id);
    setShowHistory(false);
  }, [fetchMessages]);

  const handleDeleteConversation = useCallback(async (e: MouseEvent, conversationId: string) => {
    e.stopPropagation();
    await deleteConversation(conversationId);
    if (currentConversationId === conversationId) startNewConversation();
  }, [deleteConversation, currentConversationId, startNewConversation]);

  const handleRetry = useCallback(() => {
    if (!lastUserInput) return;
    setMessages(prev => {
      const filtered = prev.filter(m => !m.isError);
      if (filtered.length > 0 && filtered[filtered.length - 1]?.role === "user") return filtered.slice(0, -1);
      return filtered;
    });
    handleAutoSend(lastUserInput);
  }, [handleAutoSend, lastUserInput]);

  const handleStopGenerating = useCallback(() => {
    if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; }
  }, []);

  const sendMessage = async () => {
    const userMessage = input.trim();
    if (!userMessage || isLoading) return;
    setInput(""); setLastUserInput(userMessage);
    resetInputHeight(inputRef.current);
    const convId = await ensureConversation({
      currentId: currentConversationId,
      userMessage,
      create: createConversation,
      setCurrentId: setCurrentConversationId,
    });

    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: "user", content: userMessage, timestamp: Date.now() }]);
    setIsLoading(true);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    await saveConversationMessage({ conversationId: convId, role: "user", content: userMessage, save: saveMessage });

    try {
      const answer = await requestExpertAnswer({
        messages, userMessage, clientId, filters: flowFilters,
        signal: abortController.signal, setMessages,
      });
      await saveConversationMessage({ conversationId: answer.content ? convId : null, role: "assistant", content: answer.content, save: saveMessage });
      autoPlayAnswer({ enabled: autoPlayTts, fromVoice: isFromVoiceRef.current, answer, play: handlePlayTts });
    } catch (error) {
      await reportExpertFailure({ error, conversationId: convId, setMessages, save: saveMessage });
    } finally {
      setIsLoading(false); abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const activeFiltersCount = countActiveFilters(flowFilters);

  const handleToggleAutoPlayTts = useCallback(async (next: boolean) => {
    setAutoPlayTts(next);
    try { localStorage.setItem("flow_autoplay_tts", String(next)); } catch {
      // O armazenamento pode estar indisponível em modo privado.
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("preferences").eq("user_id", user.id).single();
        const currentPrefs = (profile?.preferences as Record<string, unknown>) || {};
        await supabase.from("profiles").update({ preferences: { ...currentPrefs, flow_autoplay_tts: next } }).eq("user_id", user.id);
      }
    } catch {
      // A preferência local já foi aplicada; persistência remota é opcional.
    }
  }, []);

  const resetFilters = useCallback(() => {
    setFlowFilters(defaultFlowFilters);
    prevFilterKeyRef.current = "";
  }, []);

  return {
    // State
    messages, input, setInput, isLoading, isFromVoice,
    showHistory, setShowHistory, historySearch, setHistorySearch,
    historyDateFilter, setHistoryDateFilter,
    showFilters, setShowFilters, flowFilters, setFlowFilters,
    filterOptions, autoPlayTts, activeFiltersCount,
    thinkingMessage, showScrollDown,
    sellerFirstName, conversations, isLoadingConversations,
    currentConversationId, clientId, clientName,
    savingQuoteId, copiedId,
    playingTtsId: tts.playingTtsId, pausedTtsId: tts.pausedTtsId, loadingTtsId: tts.loadingTtsId, ttsErrorId: tts.ttsErrorId,
    // Refs
    scrollRef, inputRef,
    // Actions
    sendMessage, handleKeyDown, handleAutoSend,
    handleCopy, handleSaveAsQuote,
    handlePlayTts, handlePauseTts, stopTts,
    handleScroll, scrollToBottom,
    startNewConversation, loadConversation, handleDeleteConversation,
    handleRetry, handleStopGenerating,
    handleToggleAutoPlayTts, resetFilters,
    isFromVoiceRef,
  };
}
