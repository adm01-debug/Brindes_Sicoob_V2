/**
 * Leitura do stream SSE da edge function `expert-chat`
 * (`data: {"choices":[{"delta":{"content":"..."}}]}` terminando em `data: [DONE]`).
 * Compartilhado entre o chat comercial, o assistente de layouts e o `AIChat`.
 */

export function parseExpertStreamLine(rawLine: string): { content?: string; retry?: boolean } {
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

export async function readExpertStream(
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
