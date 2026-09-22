# Auditoria de validação — 22/09/2026

## Escopo e método

Esta auditoria validou o lote de correções posterior ao commit `7e2e8f371` da
`main`. Cinco frentes especializadas foram coordenadas: banco/RLS, Edge
Functions e cenários adversariais, contratos frontend–backend, CI/integridade e
módulos canônicos Sicoob. A execução usou código local, PostgreSQL 16
descartável sem rede, testes unitários e cenários estáticos. Nenhuma migration
foi aplicada ao projeto remoto e nenhuma Edge Function foi publicada.

As simulações cobriram sucesso, falha parcial, concorrência, repetição,
idempotência, rollback, isolamento por organização/PA, contrato inválido,
credencial ausente, lease vencido, destino corrigido e registros históricos.

## Correções validadas

### Aprovação pública

- Os três aliases públicos carregam `QuoteApprovalPage`, que usa a RPC
  transacional e exige confirmação booleana real.
- `quote-public-view` ficou inerte, responde `410` e não lê banco, ambiente ou
  rede.
- Documento do signatário não é devolvido pelo endpoint legado.
- Erro de transporte é distinguido de uma decisão negada pelo banco.

### Step-up OTP e e-mail

- O OTP é enviado diretamente pelo provedor configurado, com timeout,
  idempotência por desafio e exigência de recibo.
- Falha de entrega elimina o desafio e retorna indisponibilidade; o código não
  aparece em resposta ou auditoria.
- O endpoint transacional antigo não anuncia envio sem fila ou provedor.

### Outbox de aprovação

- Eventos são versionados por tipo, canal e geração.
- Correção de destino cria nova entrega auditável e preserva a tentativa
  anterior.
- Escalação para a Diretoria produz evento e conteúdo próprios.
- Estado `delivered` exige recibo do provedor; estados de erro exigem código.
- Há índice parcial para leases vencidos e tratamento de contrato inválido.
- O worker usa segredo próprio e mantém a service role apenas na comunicação
  interna com o banco.
- Falhas terminais históricas não mantêm toda execução global em `503`.
- O agendador lê URL e segredo pelo Vault e falha fechado quando não está
  configurado, conforme o padrão documentado pelo Supabase para
  [agendamento de Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions)
  e [Vault](https://supabase.com/docs/guides/database/vault).

### RLS e ACL

- Cinco policies passaram a usar wrappers que fixam o ator em `auth.uid()`.
- Seis helpers necessários às policies receberam `EXECUTE` somente para
  `authenticated`; `PUBLIC` e `anon` permanecem revogados.
- A auditoria de tabelas com RLS e nenhuma policy passou a falhar fechado.
- O teste entre organizações usa duas sessões autenticadas e fixture
  determinística; não usa service role como persona e não altera massa remota.

### Fluxo comercial e módulos canônicos

- A conversão `quote → sicoob_orders + sicoob_order_items` ocorre em uma RPC
  atômica, com lock, escopo, idempotência, snapshots, histórico e marcação da
  origem.
- Inclusão/remoção de item e recálculo do total ocorrem na mesma transação.
- Consolidação de orçamentos legados ocorre em uma RPC com locks e rollback.
- Pedidos personalizados recebem `requires_artwork`; produção/logística exige
  versão vigente aprovada.
- Nota fiscal e comprovante logístico exigem objeto existente, proprietário,
  MIME e tamanho compatíveis. Exclusão é limitada a objeto órfão.
- Referências de consolidação para Singular e vendedor têm FKs `NOT VALID`,
  bloqueando novos órfãos sem ocultar a reconciliação dos registros históricos.
- O seed QA foi alinhado às colunas e estados canônicos.

### CI e inventário

- CI executa a suíte Vitest completa com cobertura, além das novas simulações
  SQL e checks Deno.
- O gate de migrations falha fechado e usa a base correta em PR e push.
- Gates de RLS e Security Definer falham quando não conseguem auditar.
- O inventário de runtime inclui as RPCs introduzidas e verificadas neste lote.
- O teste que emitia aviso de `vi.mock` aninhado passou a usar `vi.doMock`.

## Evidências executadas

| Gate | Resultado |
|---|---:|
| Cenários Node de arquitetura e segurança | 176/176 aprovados |
| Vitest integral | 5.448 aprovados; 113 ignorados |
| Arquivos Vitest | 371 aprovados; 9 ignorados |
| Cobertura selecionada | 100% statements, funções e linhas; 96,62% branches |
| TypeScript baseline | 618/618; nenhuma regressão |
| ESLint baseline | nenhuma regressão; 5 erros removidos |
| Build Vite | aprovado |
| Deno check das cinco Edge Functions alteradas | aprovado |
| Manifest de autorização Edge | 103/103 declaradas |
| Logging estruturado Edge | 103/103 classificadas |
| Referências de runtime | 2.040 arquivos; 1.103 referências; 0 quebradas fora da allowlist |
| Imutabilidade de migrations | aprovado contra `origin/main` |
| Actionlint | aprovado |
| Simulação da aprovação pública | 30/30 |
| Simulação da outbox | aprovada, incluindo concorrência e falhas |
| Simulação do agendamento/Vault | 8/8 |
| Conversão, itens e arte | 17/17 |
| Documentos financeiros/logísticos | 8/8 |
| Consolidação de orçamentos | 5/5 |
| ACL efetiva | 22/22 |
| Consolidação/distribuição Sicoob | aprovada, incluindo as duas novas FKs |
| Financeiro/arte, verba e controles | aprovados |
| Segredos no diff | nenhuma correspondência encontrada |

Os `113` testes ignorados pertencem a contratos que exigem ambiente, personas,
provedores ou credenciais específicos. Eles não foram contabilizados como
sucesso.

## Pendências que dependem do ambiente

1. Aplicar as migrations no banco de construção em ordem e confrontar o ledger.
2. Configurar no Vault `sicoob_project_url` e
   `sicoob_approval_worker_secret`, publicar as Edge Functions e validar o cron.
3. Configurar as personas RLS e os secrets administrativos do GitHub Actions.
4. Restaurar o orçamento do GitHub Actions e tornar checks obrigatórios na
   proteção da `main`, inclusive para administradores.
5. Executar smoke test autenticado no banco de construção, envio real para
   provedores de teste e reconciliação de `uncertain`/`failed`.
6. Triar os 25 achados históricos do Gitleaks e confirmar a rotação das
   credenciais que não forem falsos positivos.

## Gaps de produto/arquitetura ainda abertos

- Definir a evidência jurídica da assinatura. O hash atual cobre a imagem; uma
  prova forte do contexto completo requer payload canônico e assinatura/HMAC
  fora do próprio registro.
- Definir rate limit distribuído para RPCs públicas caso o modelo de ameaça
  exija impedir chamadas diretas ao PostgREST.
- Unificar o vocabulário de status entre produção (`in_production`,
  `in_separation`, `in_transit`, `delivered`) e a visão simplificada da UI.
- Decidir se `overdue` será materializado por view/job ou continuará calculado
  somente na interface.
- Converter os contratos P0 legados ainda ignorados em testes executáveis à
  medida que as credenciais e fixtures dedicadas forem cadastradas.
- Definir retenção e reconciliação operacional para entregas `uncertain` e
  `failed` da outbox.

O lote está validado para revisão e aplicação controlada no ambiente de
construção. Ele não está validado como produção: ainda não houve migration
remota, deploy das Edge Functions, tráfego real nem CI remoto verde.
