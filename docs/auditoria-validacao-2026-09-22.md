# Auditoria de validação — 22/09/2026

## Escopo e método

Esta auditoria validou o lote de correções posterior ao commit `7e2e8f371` da
`main`. Cinco frentes especializadas foram coordenadas: banco/RLS, Edge
Functions e cenários adversariais, contratos frontend–backend, CI/integridade e
módulos canônicos Sicoob. A execução usou código local, PostgreSQL 16
descartável sem rede, testes unitários, cenários estáticos e, em 23/09/2026,
validação administrativa no projeto Supabase de construção.

As simulações cobriram sucesso, falha parcial, concorrência, repetição,
idempotência, rollback, isolamento por organização/PA, contrato inválido,
credencial ausente, lease vencido, destino corrigido e registros históricos.

## Reconciliação remota de 23/09/2026

- A identidade funcional do projeto foi confirmada por 226 tabelas públicas,
  263 rotinas e presença dos módulos `sicoob_orders`, `sicoob_order_items` e
  `sicoob_approval_requests`.
- O ledger remoto terminava em `20260922210000`. As 18 migrations consecutivas
  até `20260922225600` foram primeiro executadas integralmente sob `ROLLBACK` e,
  após a simulação sem erros, aplicadas em uma única transação atômica.
- Os 18 registros gravados no ledger correspondem byte a byte aos arquivos do
  repositório, incluindo nome, versão e MD5 do SQL armazenado.
- Foram encontrados os 34 fluxos SQL, 4 tabelas, 4 crons e 4 gatilhos esperados;
  não há índice público inválido, duplicidade de orçamento convertido,
  duplicidade de evento da outbox ou parcela vencida ainda marcada como
  pendente.
- O banco não contém órfãos nas referências de consolidação, comprovante sem
  autor ou estado legado incompatível de assinatura. A migration
  `20260923100000` foi simulada, aplicada, registrada com MD5 idêntico ao
  arquivo local e validou definitivamente as quatro constraints históricas.
- As tabelas internas com RLS sem policy estão sem privilégios para `anon` e
  `authenticated`. `webhook_configs` mantém o deny-all deliberado por RLS sem
  policy. As duas policies de upload ausentes foram removidas deliberadamente
  para obrigar a passagem pelo fluxo de quarentena.
- Das 105 Edge Functions versionadas, 98 responderam HTTP 200, seis retornaram
  404 e uma excedeu o timeout. `quote-approval` e
  `sicoob-approval-notifications` respondem. Permanecem sem publicação os cinco
  fluxos operacionais `sicoob-approval-reconciliation`,
  `sicoob-artwork-register`, `sicoob-document-ingest`, `sicoob-kit-quote` e
  `sicoob-reorder`. `migrate-helper` também retorna 404, situação desejada para
  o stub legado inerte. `generate-mockup-nanobanana` ficou inconclusiva por
  timeout.
- O CLI está vinculado ao project ref correto, mas a conta disponível recebe
  HTTP 403 da Management API para listar/publicar funções. O MCP permite ping e
  invocação, porém não possui operação de deploy.
- O Vault ainda não contém `sicoob_project_url` nem
  `sicoob_approval_worker_secret`. A chave HMAC ativa está registrada, mas a
  presença do segredo correspondente e sua rotação ainda precisam ser
  homologadas sem expor o valor.

## Correções validadas

### Aprovação pública

- Os três aliases públicos carregam `QuoteApprovalPage`, que usa a RPC
  transacional e exige confirmação booleana real.
- `quote-public-view` ficou inerte, responde `410` e não lê banco, ambiente ou
  rede.
- Documento do signatário não é devolvido pelo endpoint legado.
- Erro de transporte é distinguido de uma decisão negada pelo banco.
- `quote-approval` está configurada como rota pública por token, exige
  assinatura em toda decisão e aplica rate limit persistente antes das RPCs.
- A evidência HMAC versionada cobre o snapshot comercial, itens,
  personalizações, condições, signatário, origem e imagem. A verificação também
  detecta mudança posterior no conteúdo aprovado.
- A página apresenta itens, quantidades, personalizações, frete, pagamento,
  prazo e observações antes da decisão.

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
- Destino alterado antes da primeira tentativa gera nova entrega; depois de uma
  tentativa, a entrega fica incerta e exige reconciliação auditada.
- Supervisores possuem uma Edge Function e página administrativa para confirmar
  recibo ou criar uma geração sucessora sem forjar a identidade do operador.
- O resultado HTTP do `pg_net` e a idade da fila são materializados e exibidos;
  o monitor roda a cada dois minutos.
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
- A fórmula `brl-v1` reconcilia produtos, personalizações, ajuste comercial,
  desconto e frete com arredondamento em BRL; qualquer divergência no orçamento
  aprovado aborta toda a conversão.
- Pedidos convertidos preservam o detalhamento financeiro e seus itens ficam
  imutáveis. Pedidos manuais em rascunho são recalculados atomicamente pela RPC.
- O BI usa eventos reais de conclusão para volume e ticket, calcula o mix pelas
  unidades efetivamente entregues e exporta CSV; os indicadores fictícios foram
  removidos.
- Inclusão/remoção de item e recálculo do total ocorrem na mesma transação.
- Policies antigas de escrita direta nos itens foram removidas, impedindo
  contornar a RPC atômica.
- Consolidação de orçamentos legados ocorre em uma RPC com locks e rollback.
- Pedidos personalizados recebem `requires_artwork`; produção/logística exige
  versão vigente aprovada.
- Nota fiscal e comprovante passam pela Edge `sicoob-document-ingest`, bucket
  privado de quarentena, detecção por assinatura dos bytes, SHA-256 e scanner
  antimalware privado antes da promoção ao bucket final.
- Ausência, timeout, erro ou parecer inconclusivo do scanner falham fechados. O
  registro imutável vincula finalidade, pedido, usuário, hash, MIME detectado,
  tamanho, versão do scanner e objeto final; reutilização é bloqueada.
- Pedidos personalizados anteriores recebem backfill de `requires_artwork`, e
  a exigência não pode ser rebaixada.
- Conversão e consolidação recusam perfis inativos/excluídos; a consolidação usa
  `user_roles` como fonte canônica de autorização.
- Referências de consolidação para Singular e vendedor têm FKs `NOT VALID`,
  bloqueando novos órfãos sem ocultar a reconciliação dos registros históricos.
- O seed QA foi alinhado às colunas e estados canônicos.

### CI e inventário

- CI executa a suíte Vitest completa com cobertura dos fluxos críticos alterados,
  além das novas simulações SQL e checks Deno.
- O gate de migrations falha fechado e usa a base correta em PR e push.
- Gates de RLS e Security Definer falham quando não conseguem auditar.
- O gate de ACL aceita somente service role e falha no Actions sem credenciais.
- Um orçamento de skips impede crescimento da dívida P0/RLS/segurança.
- O inventário de runtime inclui as RPCs introduzidas e verificadas neste lote.
- O teste que emitia aviso de `vi.mock` aninhado passou a usar `vi.doMock`.

## Evidências executadas

| Gate | Resultado |
|---|---:|
| Cenários Node de arquitetura e segurança | 190/190 aprovados |
| Vitest integral | 5.472 aprovados; 109 ignorados |
| Arquivos Vitest | 377 aprovados; 8 ignorados |
| Cobertura crítica selecionada | 93,61% statements; 86,09% branches; 96,77% funções; 97,43% linhas |
| TypeScript baseline | 545/545; nenhuma regressão |
| ESLint baseline | nenhuma regressão; 13 erros removidos |
| Build Vite | aprovado |
| Deno check das Edge Functions alteradas | aprovado |
| Manifest de autorização Edge | 105/105 declaradas |
| Referências de runtime | 2.047 arquivos; 1.096 referências; 0 quebradas fora da allowlist |
| Imutabilidade de migrations | aprovado contra `origin/main` |
| Actionlint | aprovado |
| Simulação da aprovação pública | aprovada, incluindo snapshot, adulteração e rotação |
| Simulação da outbox | 57/57 |
| Simulação do agendamento/Vault/monitor | 11/11 |
| Conversão, itens e arte | 22/22 |
| Documentos financeiros/logísticos | 20/20 no banco + 8 testes de bytes/scanner |
| Consolidação de orçamentos | 6/6 |
| ACL efetiva | 23/23 |
| Consolidação/distribuição Sicoob | aprovada, incluindo as duas novas FKs |
| Financeiro/arte, verba e controles | aprovados |
| Segredos no diff | nenhuma correspondência encontrada; 31 fingerprints históricos isolados em baseline específica |
| Simulação remota das 18 migrations | aprovada sob `ROLLBACK` |
| Ledger remoto | 18/18 arquivos com versão, nome e MD5 exatos |
| Constraint de reconciliação `20260923100000` | simulada, aplicada e 4/4 constraints validadas |
| Objetos remotos do lote | 34/34 funções; 4/4 tabelas; 4/4 crons; 4/4 gatilhos |
| Integridade remota | 0 índices inválidos; 0 duplicidades; 0 órfãos; 0 vencimentos pendentes |
| ACL remota sensível | 0 funções administrativas executáveis por `anon` |
| Paridade de Edge Functions | 98/105 HTTP 200; 6 ausentes; 1 timeout |

Os `109` testes ignorados pertencem a contratos que exigem ambiente, personas,
provedores ou credenciais específicos. Eles não foram contabilizados como
sucesso.

## Pendências que dependem do ambiente

1. Configurar no Vault `sicoob_project_url` e
   `sicoob_approval_worker_secret`; confirmar o segredo da chave HMAC ativa;
   publicar as Edge Functions ausentes e exercitar os crons.
2. Configurar `SICOOB_MALWARE_SCANNER_URL` e
   `SICOOB_MALWARE_SCANNER_TOKEN` com um scanner privado que devolva parecer
   conclusivo, publicar `sicoob-document-ingest` e executar arquivos EICAR no
   ambiente de construção.
3. Configurar as personas RLS e os secrets administrativos do GitHub Actions.
4. Restaurar o orçamento do GitHub Actions e tornar checks obrigatórios na
   proteção da `main`, inclusive para administradores.
5. Executar smoke test autenticado no banco de construção, envio real para
   provedores de teste e reconciliação de `uncertain`/`failed`.
6. Confirmar no provedor a rotação da credencial histórica do `migrate-helper`;
   a baseline por fingerprint já mantém novos achados bloqueados.

## Gaps ainda abertos

- Executar os contratos que dependem de personas, provedores e credenciais
  reais. O orçamento de skips apenas impede crescimento; não converte os 109
  casos condicionais em evidência remota.
- Homologar o scanner privado com EICAR, arquivos reais e indisponibilidade
  induzida. O código e os contratos locais falham fechados, mas o provedor ainda
  não foi configurado nem exercitado no projeto remoto.
- Reduzir a dívida histórica de TypeScript/ESLint. Os 31 achados históricos do
  Gitleaks foram isolados por fingerprint, sem exceção genérica; a rotação da
  credencial antiga do `migrate-helper` ainda precisa ser comprovada.
- Fixar Actions por SHA e estabelecer orçamento total/por rota do bundle, além
  do limite atual por arquivo.

O lote de banco está aplicado e reconciliado no ambiente de construção. Ele não
está validado como produção: faltam os segredos operacionais, cinco Edge
Functions de negócio, scanner homologado, tráfego real e CI remoto verde.
