/** Contrato de tamanho aceito pela Edge Function expert-chat. */
export const EXPERT_CHAT_MAX_MESSAGES = 30;
export const EXPERT_CHAT_MAX_CONTENT_LENGTH = 30_000;
export const EXPERT_CHAT_MAX_MESSAGE_LENGTH = 5_000;

export interface AssistantMessageLike {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

function normalizeMessages<T extends AssistantMessageLike>(messages: T[]): T[] {
  if (messages.every((message) => message.content.length <= EXPERT_CHAT_MAX_MESSAGE_LENGTH)) return messages;
  return messages.map((message) => message.content.length <= EXPERT_CHAT_MAX_MESSAGE_LENGTH
    ? message
    : { ...message, content: message.content.slice(-EXPERT_CHAT_MAX_MESSAGE_LENGTH) });
}

function fitsContract(messages: AssistantMessageLike[]): boolean {
  return messages.length <= EXPERT_CHAT_MAX_MESSAGES &&
    messages.reduce((total, message) => total + message.content.length, 0) <= EXPERT_CHAT_MAX_CONTENT_LENGTH;
}

function recentWindow<T extends AssistantMessageLike>(messages: T[], maxCount: number, contentBudget: number): T[] {
  const latestUser = [...messages].reverse().find((message) => message.role === "user");
  const recent = latestUser ? [latestUser] : [];
  let contentLength = latestUser?.content.length ?? 0;
  const candidates = messages.filter((message) => message !== latestUser).slice(-(maxCount - recent.length));
  for (const message of candidates.reverse()) {
    if (contentLength + message.content.length > contentBudget) continue;
    recent.push(message);
    contentLength += message.content.length;
    if (recent.length === maxCount) break;
  }
  recent.sort((left, right) => messages.indexOf(left) - messages.indexOf(right));
  const firstUserMessage = recent.findIndex((message) => message.role === "user");
  return firstUserMessage > 0 ? recent.slice(firstUserMessage) : recent;
}

/** Preserva a pergunta mais recente e limita o histórico ao contrato da Edge. */
export function selectExpertChatMessages<T extends AssistantMessageLike>(
  messages: T[],
  greetingMessageId?: string | null,
): T[] {
  const normalized = normalizeMessages(messages);
  const greeting = greetingMessageId
    ? normalized.find((message) => message.id === greetingMessageId)
    : undefined;
  if (fitsContract(normalized)) return normalized;

  const includeGreeting = Boolean(greeting && greeting.content.length <= EXPERT_CHAT_MAX_CONTENT_LENGTH - EXPERT_CHAT_MAX_MESSAGE_LENGTH);
  const candidates = normalized.filter((message) => !includeGreeting || message.id !== greeting?.id);
  const maxRecentMessages = EXPERT_CHAT_MAX_MESSAGES - (includeGreeting ? 1 : 0);
  const contentBudget = EXPERT_CHAT_MAX_CONTENT_LENGTH - (includeGreeting ? greeting?.content.length ?? 0 : 0);
  const selected = recentWindow(candidates, maxRecentMessages, contentBudget);
  return includeGreeting && greeting ? [greeting, ...selected] : selected;
}
