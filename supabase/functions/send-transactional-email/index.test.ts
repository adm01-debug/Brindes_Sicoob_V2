import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { renderTemplate } from "./templates.ts";
import { deliverTransactionalEmail } from "./deliver.ts";

Deno.test("renderTemplate gera corpo html/subject para os 6 eventos", () => {
  for (const eventType of [
    "quote_sent",
    "quote_approved",
    "quote_rejected",
    "order_created",
    "sicoob_order_status_change",
    "sicoob_order_approval_request",
  ]) {
    const out = renderTemplate(eventType, {
      recipientName: "Maria Silva",
      data: { quote_number: "Q-001", order_number: "P-001", total: 149.9, status: "envio", new_status: "em_transporte", notes: "ok", reason: "ajuste", action_url: "https://app.exemplo/pedido/1" },
    });
    assertEquals(out !== null, true, `template ${eventType} existe`);
    if (out) {
      assertEquals(out.html.includes("Brindes Sicoob"), true, `branding em ${eventType}`);
      assertEquals(out.subject.length > 5, true, `subject de ${eventType}`);
    }
  }
});

Deno.test("renderTemplate retorna null para evento desconhecido", () => {
  assertEquals(renderTemplate("evento_inexistente", { data: {} }), null);
});

Deno.test("deliverTransactionalEmail degrada sem secrets", async () => {
  const prevKey = Deno.env.get("RESEND_API_KEY");
  const prevFrom = Deno.env.get("NOTIFICATION_FROM_EMAIL");
  Deno.env.delete("RESEND_API_KEY");
  Deno.env.delete("NOTIFICATION_FROM_EMAIL");
  try {
    const result = await deliverTransactionalEmail({
      eventType: "quote_sent",
      recipientEmail: "cliente@exemplo.com",
      subject: "teste",
      html: "<p>oi</p>",
    });
    assertEquals(result.accepted, false);
    assertEquals(result.errorCode, "email_not_configured");
  } finally {
    if (prevKey) Deno.env.set("RESEND_API_KEY", prevKey);
    if (prevFrom) Deno.env.set("NOTIFICATION_FROM_EMAIL", prevFrom);
  }
});

Deno.test("deliverTransactionalEmail rejeita email inválido", async () => {
  const result = await deliverTransactionalEmail({
    eventType: "quote_sent",
    recipientEmail: "sem-arroba",
    subject: "teste",
    html: "<p>oi</p>",
  });
  assertEquals(result.accepted, false);
  assertEquals(result.errorCode, "invalid_recipient");
});

Deno.test("deliverTransactionalEmail aceita recibo do provedor com fetch stub", async () => {
  Deno.env.set("RESEND_API_KEY", "re_testkey");
  Deno.env.set("NOTIFICATION_FROM_EMAIL", "brindes@sicoob.com.br");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(new Response(JSON.stringify({ id: "recibo-123" }), { status: 200 }));
  try {
    const result = await deliverTransactionalEmail({
      eventType: "quote_sent",
      recipientEmail: "cliente@exemplo.com",
      subject: "teste",
      html: "<p>oi</p>",
    });
    assertEquals(result.accepted, true);
    assertEquals(result.providerId, "recibo-123");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("deliverTransactionalEmail reporta falha do provedor", async () => {
  Deno.env.set("RESEND_API_KEY", "re_testkey");
  Deno.env.set("NOTIFICATION_FROM_EMAIL", "brindes@sicoob.com.br");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(new Response("rate limited", { status: 429 }));
  try {
    const result = await deliverTransactionalEmail({
      eventType: "quote_sent",
      recipientEmail: "cliente@exemplo.com",
      subject: "teste",
      html: "<p>oi</p>",
    });
    assertEquals(result.accepted, false);
    assertEquals(result.errorCode, "provider_http_429");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
