export interface ApprovalDelivery {
  id: string;
  channel: string;
  destination: string;
  lease_token: string;
  payload: {
    requester_name: string;
    amount: number;
    reason: string;
    event_kind?: 'request_created' | 'escalated_to_board';
  };
}

interface DeliveryResult {
  outcome: 'delivered' | 'retry' | 'uncertain' | 'failed';
  errorCode?: string;
  providerId?: string;
}

// Aceitação pelo provedor não comprova leitura pelo destinatário.
export async function deliverApprovalNotification(delivery: ApprovalDelivery): Promise<DeliveryResult> {
  let appUrl: URL;
  try {
    appUrl = new URL('/admin/sicoob', Deno.env.get('PUBLIC_APP_URL') ?? '');
    if (appUrl.protocol !== 'https:' || appUrl.username || appUrl.password) throw new Error();
  } catch {
    return { outcome: 'retry', errorCode: 'app_url_not_configured' };
  }
  const amount = delivery.payload.amount;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) return { outcome: 'failed', errorCode: 'invalid_amount' };
  const escalated = delivery.payload.event_kind === 'escalated_to_board';
  const title = escalated ? 'Solicitação escalada para a Diretoria' : 'Nova solicitação de alçada Sicoob';
  const text = `${title}\nSolicitante: ${delivery.payload.requester_name}\nValor: ${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\nMotivo: ${delivery.payload.reason}`;
  let destination: string;
  let body: Record<string, unknown>;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (delivery.channel === 'slack') {
    try {
      const url = new URL(delivery.destination);
      if (url.protocol !== 'https:' || url.hostname !== 'hooks.slack.com' || !url.pathname.startsWith('/services/') || url.username || url.password || url.port || url.search || url.hash) throw new Error();
      destination = url.toString();
    } catch {
      return { outcome: 'failed', errorCode: 'invalid_destination' };
    }
    body = {
      text: title,
      blocks: [
        { type: 'section', text: { type: 'plain_text', text: text.slice(0, 2800), emoji: false } },
        { type: 'actions', elements: [{ type: 'button', text: { type: 'plain_text', text: 'Acessar aprovações' }, url: appUrl.toString() }] },
      ],
    };
  } else if (delivery.channel === 'email') {
    const email = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/;
    if (delivery.destination.length > 254 || !email.test(delivery.destination)) return { outcome: 'failed', errorCode: 'invalid_recipient' };
    const apiKey = Deno.env.get('RESEND_API_KEY');
    const from = Deno.env.get('NOTIFICATION_FROM_EMAIL') ?? '';
    if (!apiKey || !email.test(from)) return { outcome: 'retry', errorCode: 'email_not_configured' };
    destination = 'https://api.resend.com/emails';
    headers.Authorization = `Bearer ${apiKey}`;
    headers['Idempotency-Key'] = `sicoob-approval/${delivery.id}`;
    body = { from, to: [delivery.destination], subject: `${title} — Portal de Brindes Sicoob`, text: `${text}\n\n${appUrl}` };
  } else {
    return { outcome: 'failed', errorCode: 'unsupported_channel' };
  }
  try {
    const response = await fetch(destination, {
      method: 'POST', headers, body: JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 429) return { outcome: 'retry', errorCode: 'provider_rate_limited' };
    if (!response.ok) {
      // 5xx/408/409 não provam que o provedor deixou de aceitar a mensagem.
      return { outcome: response.status >= 400 && response.status < 500 && ![408, 409].includes(response.status) ? 'failed' : 'uncertain', errorCode: `provider_http_${response.status}` };
    }
    if (delivery.channel === 'slack') {
      return (await response.text()).trim() === 'ok'
        ? { outcome: 'delivered', providerId: 'slack:webhook_ack' }
        : { outcome: 'uncertain', errorCode: 'invalid_provider_ack' };
    }
    const data = await response.json();
    return typeof data?.id === 'string' && data.id.trim().length > 0 && data.id.length <= 200
      ? { outcome: 'delivered', providerId: data.id }
      : { outcome: 'uncertain', errorCode: 'invalid_provider_ack' };
  } catch {
    return { outcome: 'uncertain', errorCode: 'provider_result_unknown' };
  }
}
