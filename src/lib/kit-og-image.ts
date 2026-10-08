/**
 * kit-og-image — gera uma imagem OG (1200x630) em data URL via canvas
 * para enriquecer o compartilhamento social do link público do kit.
 * Sem dependências externas; apenas Canvas API.
 */

interface KitOgInput {
  kitName: string;
  organization?: string | null;
  itemsCount?: number;
  color?: string; // hex
}

function kitColor(color: string | undefined): string {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? color : "#3B82F6";
}

function drawItemsCount(ctx: CanvasRenderingContext2D, count: number | undefined): void {
  if (typeof count !== "number" || count <= 0) return;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "500 32px system-ui, -apple-system, 'Segoe UI', sans-serif";
  ctx.fillText(`${count} ${count === 1 ? "item" : "itens"}`, 80, 520);
}

/**
 * Renderiza uma imagem OG e devolve um data URL PNG.
 * Retorna null em ambientes sem suporte a canvas (SSR).
 */
export function generateKitOgImage(input: KitOgInput): string | null {
  if (typeof document === "undefined") return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const color = kitColor(input.color);
    // Background gradient diagonal
    const grad = ctx.createLinearGradient(0, 0, 1200, 630);
    grad.addColorStop(0, color);
    grad.addColorStop(1, shade(color, -30));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 630);

    // Subtle dark overlay for text contrast
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0, 0, 1200, 630);

    // Top label — organization
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "500 28px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.textBaseline = "top";
    const orgLabel = (input.organization || "Apresentação de Kit").toUpperCase();
    ctx.fillText(orgLabel.slice(0, 60), 80, 80);

    // Kit name — large
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 84px system-ui, -apple-system, 'Segoe UI', sans-serif";
    wrapText({
      ctx,
      text: input.kitName || "Kit personalizado",
      x: 80,
      y: 200,
      maxWidth: 1040,
      lineHeight: 96,
      maxLines: 3,
    });

    // Footer — items count
    drawItemsCount(ctx, input.itemsCount);

    // Brand corner
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "500 22px system-ui, -apple-system, 'Segoe UI', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("Brindes Sicoob", 1120, 540);
    ctx.textAlign = "left";

    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

interface TextLayout {
  ctx: CanvasRenderingContext2D;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
}

function wrapText({
  ctx,
  text,
  x,
  y,
  maxWidth,
  lineHeight,
  maxLines,
}: TextLayout & { lineHeight: number; maxLines: number }): void {
  const words = text.split(/\s+/);
  let line = "";
  let lines = 0;
  for (let n = 0; n < words.length; n++) {
    const word = words[n] ?? '';
    const test = line ? `${line} ${word}` : word;
    const w = ctx.measureText(test).width;
    if (w > maxWidth && line) {
      ctx.fillText(line, x, y + lines * lineHeight);
      line = word;
      lines += 1;
      if (lines >= maxLines - 1) {
        drawTruncatedLine({
          ctx,
          text: words.slice(n).join(" "),
          x,
          y: y + lines * lineHeight,
          maxWidth,
        });
        return;
      }
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y + lines * lineHeight);
}

function drawTruncatedLine({ ctx, text, x, y, maxWidth }: TextLayout): void {
  let truncated = text;
  while (ctx.measureText(`${truncated}…`).width > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1);
  }
  ctx.fillText(`${truncated}…`, x, y);
}

function shade(hex: string, percent: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + Math.round(255 * (percent / 100))));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * (percent / 100))));
  const b = Math.max(0, Math.min(255, (num & 0xff) + Math.round(255 * (percent / 100))));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
