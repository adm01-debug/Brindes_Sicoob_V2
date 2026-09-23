# Notificações duráveis de aprovação — 22/09/2026

## Contrato implementado

A solicitação de aprovação grava a outbox na mesma transação. Cada entrega é
identificada por solicitação, evento, canal e geração. O worker reserva uma
linha com `SKIP LOCKED`, lease e token aleatório; uma confirmação só é aceita
com o token vigente.

| Estado | Tratamento |
|---|---|
| `pending` | Aguardando reserva |
| `sending` | Reservada por até 60 segundos |
| `delivered` | Provedor confirmou aceitação e forneceu recibo |
| `retry` | Falha seguramente não entregue; backoff exponencial, até cinco tentativas |
| `uncertain` | O envio pode ter ocorrido; exige conferência humana |
| `failed` | Rejeição definitiva ou tentativas esgotadas |
| `cancelled` | Entrega nunca tentada e invalidada pela origem |

Uma correção de destino substitui automaticamente apenas uma entrega com zero
tentativas. Se a entrega já foi tentada, ela passa a `uncertain`; um supervisor
precisa confirmar o recibo ou criar uma geração sucessora pela página
`/admin/sicoob/notificacoes`. A Edge Function usa o usuário autenticado como
operador, sem aceitar identidade informada pelo navegador.

Entregas `delivered`/`cancelled` com mais de 180 dias e `failed`/`uncertain` com
mais de 365 dias são arquivadas. A cadeia entre gerações é preservada. O worker
é acionado a cada minuto com URL e segredo do Vault. Cada request do `pg_net` é
registrado; um monitor a cada dois minutos materializa HTTP não 2xx, timeout e
idade anormal da fila para o painel administrativo.

Slack aceita somente webhook HTTPS no domínio esperado. Email exige recibo do
Resend e usa chave de idempotência por entrega. Estados incertos nunca são
reenviados automaticamente.

## Validação local

- 57 cenários PostgreSQL da outbox aprovados, incluindo concorrência, lease,
  backoff, mudança de destino antes/depois de tentativa, reconciliação e retenção;
- 11 cenários de agendamento/Vault/monitoramento aprovados, incluindo a
  degradação obrigatória do estado de saúde quando existe entrega falha ou
  incerta sem reconciliação;
- ACL nega leitura e execução a `anon` e `authenticated` nas RPCs internas;
- cenários Node do worker validam recibo, falhas parciais, payload inválido e
  ausência de credenciais;
- Deno check das Edge Functions do worker e da reconciliação aprovado.

As evidências locais estão em
[`evidencias/notificacoes-duraveis-20260922/`](./evidencias/notificacoes-duraveis-20260922/).
Elas usam PostgreSQL 16 descartável e transporte simulado.

## Dependências do ambiente de construção

- aplicar as migrations e confrontar o ledger remoto;
- configurar `sicoob_project_url` e `sicoob_approval_worker_secret` no Vault;
- configurar `SICOOB_APPROVAL_WORKER_SECRET`, `RESEND_API_KEY` e
  `NOTIFICATION_FROM_EMAIL` nas Edge Functions;
- publicar `sicoob-approval-notifications` e
  `sicoob-approval-reconciliation`;
- homologar Slack/Resend com destinos de teste autorizados;
- verificar o painel, os crons e uma reconciliação real.

Nenhuma dessas ações remotas foi executada neste lote porque a conexão MCP
administrativa disponível não aponta para o projeto `cfmzkthhgliqelozlmwu`.
