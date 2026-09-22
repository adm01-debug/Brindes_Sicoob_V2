# Notificações duráveis de aprovação — 22/09/2026

Base `1c37076eb` de `origin/main`; trabalho isolado em
`fix/sicoob-entregas-20260922`. Banco de construção `cfmzkthhgliqelozlmwu`.
O PR #18 já estava mesclado e a Vercel havia publicado aquele lote. Esta execução
avança no backend de notificações; o plano completo de 50 etapas permanece aberto.

## Defeitos reproduzidos e correções

O webhook enviava novamente a mesma mensagem ao receber o mesmo evento duas vezes
ou ao ser executado em paralelo. Dois testes falharam antes do patch com duas
entregas onde deveria existir uma. Não havia fila persistente nem confirmação por
destino. O endpoint genérico `send-transactional-email` também declarava email
enfileirado depois de inserir apenas uma notificação interna.

A migration `20260922210000` cria uma outbox privada. O trigger grava as entregas
na mesma transação da solicitação de aprovação, usando o PA do pedido. Uma chave
única por solicitação/canal impede duplicação inclusive após apagar e recriar a
configuração do canal. Os destinatários e valores vêm do banco, sem aceitar
substituição pelo corpo do webhook. Nenhuma chamada de rede ocorre no trigger.

O worker reserva uma entrega por vez com bloqueio de linha, `SKIP LOCKED` e um
token de reserva. A confirmação precisa do mesmo token, ainda vigente. Cada
invocação processa até cinco mensagens e limita o tempo do lote. O executor pode
receber o webhook legado/nativo ou `{ "action": "process_queue" }`; ambos exigem
a credencial de serviço, antes de acessar o banco.

| Estado | Significado e tratamento |
|---|---|
| `pending` | Aguardando reserva |
| `sending` | Reservada por até 60 segundos |
| `delivered` | Aceitação confirmada pelo provedor; não comprova leitura nem chegada à caixa de entrada |
| `retry` | Falha sem envio conhecido, como configuração ausente ou HTTP 429; espera exponencial, até cinco tentativas |
| `uncertain` | Timeout, falha de rede, 5xx, confirmação inválida ou reserva expirada; exige conferência, sem reenvio automático |
| `failed` | Rejeição definitiva, destino inválido ou tentativas esgotadas |
| `cancelled` | Entrega ainda não iniciada cujo canal/destino mudou ou cuja solicitação já foi decidida |

Uma mensagem que o provedor aceitou, seguida de falha na confirmação no banco,
fica reservada e depois incerta. Esse comportamento evita repetir cegamente uma
entrega possivelmente realizada. Não é garantia universal de entrega exatamente
uma vez: os casos incertos precisam de reconciliação operacional. Uma mudança de
configuração após a reserva não cancela uma requisição externa já em andamento.

Slack aceita somente HTTPS em `hooks.slack.com/services/`, sem redirecionamento,
credenciais na URL ou query string. Dados do usuário entram em blocos de texto
simples. Email usa o Resend já previsto no projeto, com texto simples e chave de
idempotência estável por entrega. A resposta precisa conter um identificador.
A [documentação do Resend](https://resend.com/docs/dashboard/emails/idempotency-keys)
explica a proteção por chave; não usamos essa proteção para prometer deduplicação
ilimitada no tempo.

O endpoint genérico continua sem transporte para outros eventos e agora responde
501, sem gravar uma falsa fila. Seu consumidor exige `success: true`,
`delivery_status: "accepted"` e `provider_id` não vazio para confirmar envio.
Isso também recusa o corpo de sucesso do endpoint antigo enquanto a publicação
estiver pendente. Não foram migrados silenciosamente todos os emails de orçamento
e pedidos para a fila específica de aprovação.

## Checklist executado

- [x] Preservar alterações de outros trabalhos na `main` local.
- [x] Consultar o mapa Graphify existente e verificar suas indicações no código.
- [x] Inspecionar tabelas, triggers, colunas, permissões e contagens reais.
- [x] Reproduzir duplicação sequencial e concorrente antes da correção.
- [x] Criar enfileiramento transacional, reserva exclusiva e confirmação protegida.
- [x] Separar mensagens aceitas, pendentes, rejeitadas e incertas.
- [x] Repetir somente o canal pendente depois de falha parcial.
- [x] Cancelar pendências após decisão, desativação ou mudança do destino.
- [x] Impedir duplicação ao recriar uma configuração.
- [x] Implementar transporte de email da aprovação com Resend e confirmação explícita.
- [x] Corrigir o sucesso fictício do endpoint genérico e de seu consumidor.
- [x] Instrumentar o endpoint genérico com logging estruturado, sem corpo de mensagens.
- [x] Testar a migration com PostgreSQL isolado e papéis reais.
- [x] Fazer dry-run remoto e comprovar rollback antes da aplicação.
- [x] Aplicar a migration e registrar o SQL exato no ledger.
- [x] Conferir RLS, permissões de execução e zero violações no gate ACL.
- [x] Confirmar HTTP 401/SQLSTATE 42501 nas tentativas anônimas de ler e reservar.
- [x] Atualizar inventário incremental e os checks de CI.
- [ ] Publicar e comparar as duas Edge Functions alteradas no Supabase.
- [ ] Verificar `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL` e `PUBLIC_APP_URL` no ambiente remoto.
- [ ] Ativar o acionamento periódico do worker para drenar a fila sem depender de novo webhook.
- [ ] Homologar envio com destinatários autorizados e recebimento confirmado.
- [ ] Implantar operação de reconciliação das entregas incertas/falhas e monitoração da fila.
- [ ] Executar CI remoto no commit final e concluir a revisão do PR.

## Evidências e limites

[Banco real](evidencias/notificacoes-duraveis-20260922/banco.json),
[simulação PostgreSQL](evidencias/notificacoes-duraveis-20260922/simulacao.json) e
[API pública real](evidencias/notificacoes-duraveis-20260922/postgrest.json).

O banco ficou com **44 versões** no ledger. O SQL gravado coincide com o arquivo
local, RLS está ativa, visitantes não leem a fila e usuários comuns não executam
as RPCs do worker. A auditoria ACL retornou zero violações. A tabela de entregas
permanece vazia; não havia solicitações nem canais ativos na inspeção inicial.
Nenhum email, Slack ou outro webhook externo foi enviado nos testes.

Foram aprovados 31 cenários PostgreSQL e 163 cenários Node, incluindo 24 do
webhook/fila e dois do endpoint genérico. A suíte Vitest completa passou com
5.446 testes e 113 ignorados antes do reforço final do recibo no consumidor;
o teste desse consumidor foi então ampliado para oito cenários. Os testes da
Edge Function usam transporte e banco simulados; os testes SQL usam duas sessões
reais em PostgreSQL descartável sem rede. A fixture não é um clone completo dos
dados e triggers remotos.

A Management API continua retornando 403 por privilégios insuficientes. Portanto,
a presença da migration no banco não significa que o worker novo já esteja
publicado ou executando. O GitHub Actions também estava bloqueado por orçamento.
O banco externo de produtos não foi modificado. O inventário e os tipos globais
ainda precisam da reconciliação completa prevista no plano; este lote verifica
o delta da fila e suas quatro RPCs de serviço.
