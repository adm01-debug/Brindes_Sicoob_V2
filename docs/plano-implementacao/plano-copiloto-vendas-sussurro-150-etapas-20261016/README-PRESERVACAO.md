# Copiloto de vendas "Sussurro" — plano preservado, não executado

Este diretório é **arquivo**, não funcionalidade. Ele existe para que as quatro branches
que o continham possam ser apagadas sem perder nada.

## O que é

Plano de 150 etapas para um copiloto de vendas em tempo real, escrito em 16/10/2026, com o
material de compliance (LGPD e políticas de WhatsApp), o "cérebro de vendas" (banco de
perguntas, biblioteca de objeções, método COOPERA) e a baseline de medição.

O próprio plano declara, na linha 3 de `plano.md`: *"Este documento é só o plano: nenhuma
etapa foi executada"*.

## Por que não foi implementado

A auditoria de 18/11/2026 concluiu `faz_sentido = false`, e a razão é de produto, não de
código: **não existe produtor do dado**. O copiloto precisa de mensagens entrando em tempo
real (webhook de WhatsApp no padrão de `supabase/functions/webhook-inbound`, gravando
conversas e mensagens), e esse produtor nunca foi construído. Sem ele, o motor analisaria
o vazio.

Nenhuma linha daqui está ligada ao sistema: não há rota, hook em uso, edge publicada nem
tabela criada. Implementar exige decisão do dono sobre a integração de mensageria.

## O que está preservado aqui

| caminho | origem | o que é |
|---|---|---|
| `plano.md`, `etapas.csv` | PR #114 | o plano de 150 etapas e a lista de etapas |
| `compliance/e021…e030` | PR #117 | 10 documentos de LGPD, consentimento, retenção, DPA, opt-out, auditoria e segurança |
| `cerebro-vendas/`, `e003-baseline/` | PR #118 | banco de perguntas, biblioteca de objeções, método COOPERA, baseline e queries |
| `motor-nao-executado/` | PR #116 | ~760 linhas de motor: hook do front, 3 edge functions e o SQL das tabelas |

O motor fica em `motor-nao-executado/` de propósito, fora de `src/` e de
`supabase/{functions,migrations}/`: ali ele não vira código morto, não entra no `tsc`, no
ESLint nem no `deno check`, e o `.sql` não é visto pelo aplicador de migrations nem pelo
verificador de imutabilidade. O arquivo SQL termina em `.sql.txt` pelo mesmo motivo.

## Para retomar

1. decidir a integração de mensageria (quem entrega a mensagem do cliente ao sistema);
2. aplicar `motor-nao-executado/20261016154200_copilot_engine_tables.sql.txt` pelo fluxo de
   `docs/agentes/banco.md` — arquivo novo em `supabase/migrations/`, PR, allowlist, dispatch;
3. mover as três edge functions para `supabase/functions/`, declará-las em
   `edge-authz-manifest.ts` e pôr na allowlist de publicação;
4. ligar `useCopilotQuote.ts` a uma tela.

Enquanto 1 não acontecer, nada disso deve ser mesclado: seriam quatro peças sem consumidor.

Registro completo do veredito: [`docs/RECUPERACAO/README.md`](../../RECUPERACAO/README.md).
