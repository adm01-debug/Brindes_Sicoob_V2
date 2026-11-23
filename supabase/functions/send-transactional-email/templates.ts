export interface TemplateContext {
  recipientName?: string;
  data: Record<string, unknown>;
}

interface TemplateOutput {
  subject: string;
  html: string;
}

const esc = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const fmtMoney = (value: unknown): string => {
  const number = Number(value ?? 0);
  return number.toLocaleString("pt-BR", { currency: "BRL", style: "currency" });
};

const fmtStatus = (value: unknown): string => {
  const raw = String(value ?? "");
  const fromUnderscore = raw.replace(/_/g, " ").trim();
  return fromUnderscore.charAt(0).toUpperCase() + fromUnderscore.slice(1);
};

const preheader = (title: string): string =>
  `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${esc(title)}</div>`;

const brandHeader = (): string =>
  `<div style="background:#1566d6;padding:20px 24px;text-align:center;">
    <span style="font-size:18px;font-weight:700;color:#ffffff;">Brindes Sicoob</span>
    <span style="font-size:12px;color:#dbe8ff;display:block;margin-top:4px;">Portal de Brindes Corporativos</span>
  </div>`;

const bodyShell = (title: string, content: string): string =>
  `<html lang="pt-BR"><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    ${preheader(title)}
    <div style="max-width:560px;margin:0 auto;background:#ffffff;">
      ${brandHeader()}
      <div style="padding:24px;">
        ${content}
      </div>
      <div style="padding:16px 24px;background:#f8fafc;font-size:12px;color:#64748b;">
        Este é um e-mail automático enviado pelo Portal de Brindes Sicoob. Não responda a esta mensagem.
      </div>
    </div>
  </body></html>`;

/** O estado descrito no corpo vem do banco, nunca de texto livre do chamador. */
const statusSentence = (data: Record<string, unknown>): string => {
  const sentence = String(data.status_sentence ?? "").trim();
  return sentence || "foi criado com sucesso.";
};

const salutation = (name?: string): string =>
  name ? `<p style="margin:0 0 16px;">Olá, <strong>${esc(name)}</strong>!</p>` : "";

const actionButton = (label: string, url: string): string =>
  `<p style="text-align:center;margin:20px 0;">
    <a href="${esc(url)}" style="background:#1566d6;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:14px;font-weight:600;">${esc(label)}</a>
  </p>`;

export function renderTemplate(eventType: string, ctx: TemplateContext): TemplateOutput | null {
  const { recipientName, data } = ctx;

  switch (eventType) {
    case "quote_sent": {
      const number = esc(data.quote_number);
      const total = fmtMoney(data.total);
      const url = String(data.action_url ?? "");
      return {
        subject: `Seu orçamento ${number ? `#${number} ` : ""}está disponível`,
        html: bodyShell("Orçamento disponível", `
          ${salutation(recipientName)}
          <h1 style="font-size:22px;color:#0f172a;margin:0 0 16px;">Orçamento ${number ? `#${number} ` : ""}preparado com carinho 💚</h1>
          <p style="color:#334155;">Preparamos um orçamento com os brindes que você selecionou.</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:0;color:#0f172a;font-weight:600;">Total: ${total}</p>
            <p style="margin:8px 0 0;color:#64748b;font-size:13px;">Validade do orçamento: confira no documento enviado.</p>
          </div>
          ${url ? actionButton("Abrir orçamento", url) : ""}
        `),
      };
    }

    case "quote_approved": {
      const number = esc(data.quote_number);
      const url = String(data.action_url ?? "");
      return {
        subject: `Orçamento ${number ? `#${number} ` : ""}aprovado ✓`,
        html: bodyShell("Orçamento aprovado", `
          ${salutation(recipientName)}
          <h1 style="font-size:22px;color:#0f172a;margin:0 0 16px;">Excelente, orçamento aprovado! 🎉</h1>
          <p style="color:#334155;">O orçamento ${number ? `#${number} ` : ""}foi <strong>aprovado</strong> e está pronto para virar pedido.</p>
          ${url ? actionButton("Ver orçamento", url) : ""}
        `),
      };
    }

    case "quote_rejected": {
      const number = esc(data.quote_number);
      const reason = esc(data.reason);
      const url = String(data.action_url ?? "");
      return {
        subject: `Orçamento ${number ? `#${number} ` : ""}— ajustes necessários`,
        html: bodyShell("Orçamento com ajustes", `
          ${salutation(recipientName)}
          <h1 style="font-size:22px;color:#0f172a;margin:0 0 16px;">Seu orçamento precisa de ajustes ✍️</h1>
          <p style="color:#334155;">O orçamento ${number ? `#${number} ` : ""}foi <strong>rejeitado</strong> para revisão.</p>
          ${reason ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;"><p style="margin:0;color:#b91c1c;">${reason}</p></div>` : ""}
          ${url ? actionButton("Revisar orçamento", url) : ""}
        `),
      };
    }

    case "order_created": {
      const orderNumber = esc(data.order_number);
      const total = fmtMoney(data.total);
      const url = String(data.action_url ?? "");
      return {
        subject: `Pedido ${orderNumber ? `#${orderNumber} ` : ""}criado com sucesso`,
        html: bodyShell("Pedido criado", `
          ${salutation(recipientName)}
          <h1 style="font-size:22px;color:#0f172a;margin:0 0 16px;">Pedido criado! 🚀</h1>
          <p style="color:#334155;">Seu pedido ${orderNumber ? `#${orderNumber} ` : ""}${esc(statusSentence(data))}</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:0;color:#0f172a;font-weight:600;">Total: ${total}</p>
          </div>
          ${url ? actionButton("Acompanhar pedido", url) : ""}
        `),
      };
    }

    case "sicoob_order_status_change": {
      const orderNumber = esc(data.order_number);
      const status = esc(data.status ?? fmtStatus(data.new_status));
      const notes = esc(data.notes);
      const sentence = esc(data.status_sentence);
      const url = String(data.action_url ?? "");
      return {
        subject: `Pedido ${orderNumber ? `#${orderNumber} ` : ""}— ${status}`,
        html: bodyShell("Atualização de pedido", `
          ${salutation(recipientName)}
          <h1 style="font-size:22px;color:#0f172a;margin:0 0 16px;">Atualização do seu pedido 📦</h1>
          <div style="background:#eef6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:0;color:#0f172a;font-weight:600;">Status: ${status}</p>
            ${sentence ? `<p style="margin:8px 0 0;color:#334155;">Seu pedido ${orderNumber ? `#${orderNumber} ` : ""}${sentence}</p>` : ""}
            ${notes ? `<p style="margin:8px 0 0;color:#334155;">${notes}</p>` : ""}
          </div>
          ${url ? actionButton("Acompanhar pedido", url) : ""}
        `),
      };
    }

    case "sicoob_order_approval_request": {
      const orderNumber = esc(data.order_number);
      const amount = fmtMoney(data.amount_at_request ?? data.total);
      const url = String(data.action_url ?? "");
      return {
        subject: `Pedido ${orderNumber ? `#${orderNumber} ` : ""}aguarda sua aprovação`,
        html: bodyShell("Aprovação necessária", `
          ${salutation(recipientName)}
          <h1 style="font-size:22px;color:#0f172a;margin:0 0 16px;">Solicitação de aprovação 🛡️</h1>
          <p style="color:#334155;">O pedido ${orderNumber ? `#${orderNumber} ` : ""}no valor de <strong>${amount}</strong> aguarda sua análise para liberação.</p>
          ${url ? actionButton("Analisar solicitação", url) : ""}
        `),
      };
    }

    default:
      return null;
  }
}
