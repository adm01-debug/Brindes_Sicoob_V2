# Modelos de e-mail transacional — preservados da PR #4, não ligados

Este diretório é **arquivo**, não funcionalidade.

## O que é

`buildEmailContent.ts.txt` traz os 168 linhas da PR #4 (fechada sem merge) que
montam assunto e corpo HTML de seis eventos do sistema: `quote_sent`,
`quote_approved`, `quote_rejected`, `order_created`,
`sicoob_order_status_change` e `sicoob_order_approval_request`. Junto vem a
validação de campos obrigatórios por evento.

## Por que não foi restaurado como código

A `main` tem hoje `supabase/functions/send-transactional-email/index.ts` como um
stub honesto: valida o pedido e responde **HTTP 501** com
`"O envio deste email ainda não está implementado."`, e o comentário explica a
decisão — o endpoint nunca teve transporte durável, e OTP e aprovações Sicoob
usam entregadores próprios com recibo do provedor
(`_shared/step-up-otp-delivery.ts`, `_shared/approval-delivery.ts`).

A versão da PR #4 **também não envia e-mail nenhum**. Ela monta o conteúdo,
grava uma linha em `workspace_notifications` dizendo que um e-mail foi enviado,
e responde:

```json
{ "success": true, "message": "Email validated and queued successfully" }
```

Nada é enfileirado e nada é entregue. Trocar o 501 honesto por um
`success: true` falso seria uma regressão de verdade — a mesma classe de
problema que esta rodada de recuperação passou o dia corrigindo (selo
fabricado, número inventado apresentado como medido).

## O que vale, e quando usar

Os seis modelos HTML são a parte reaproveitável: a `main` hoje só envia
**texto puro** (`approval-delivery.ts:61` monta `subject` e `text`, sem HTML).
No dia em que o transporte durável existir, estes modelos são o ponto de
partida — e a decisão de ligá-los é do dono, porque envolve provedor de envio,
domínio remetente e custo.

Extensão `.txt` de propósito: assim o arquivo não entra no `deno check`, não
vira código morto no bundle e ninguém o importa por engano.

Veredito e medição completa ficam no ledger de recuperação, publicado pela PR #315
(`docs/RECUPERACAO/`). O link direto fica de fora enquanto aquela PR não entra na
`main`: apontar para um arquivo ausente deste checkout não ajuda ninguém a conferir.
