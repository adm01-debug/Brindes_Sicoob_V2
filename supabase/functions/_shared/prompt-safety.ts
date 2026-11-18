/** Escapa delimitadores e controles antes de anexar dados externos a um prompt. */
export function escapePromptDataBlock(value: string, maxLength = 30000): string {
  return value
    .slice(0, maxLength)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ");
}
