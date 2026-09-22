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
- Inclusão/remoção de item e recálculo do total ocorrem na mesma transação.
- Policies antigas de escrita direta nos itens foram removidas, impedindo
  contornar a RPC atômica.
- Consolidação de orçamentos legados ocorre em uma RPC com locks e rollback.
- Pedidos personalizados recebem `requires_artwork`; produção/logística exige
  versão vigente aprovada.
- Nota fiscal e comprovante logístico exigem objeto existente, proprietário,
  MIME e tamanho compatíveis. Exclusão é limitada a objeto órfão.
- O comprovante aceita somente JPEG, PNG ou WebP, vincula o proprietário do
  objeto atual e impede extensão incompatível com o MIME declarado.
- Pedidos personalizados anteriores recebem backfill de `requires_artwork`, e
  a exigência não pode ser rebaixada.
- Conversão e consolidação recusam perfis inativos/excluídos; a consolidação usa
  `user_roles` como fonte canônica de autorização.
- Referências de consolidação para Singular e vendedor têm FKs `NOT VALID`,
  bloqueando novos órfãos sem ocultar a reconciliação dos registros históricos.
- O seed QA foi alinhado às colunas e estados canônicos.

### CI e inventário

- CI executa a suíte Vitest completa com cobertura, além das novas simulações
  SQL e checks Deno.
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
| Vitest integral | 5.457 aprovados; 109 ignorados |
| Arquivos Vitest | 373 aprovados; 8 ignorados |
| Cobertura selecionada | 100% statements, funções e linhas; 96,62% branches |
| TypeScript baseline | 578/578; nenhuma regressão |
| ESLint baseline | nenhuma regressão; 8 erros removidos |
| Build Vite | aprovado |
| Deno check das Edge Functions alteradas | aprovado |
| Manifest de autorização Edge | 104/104 declaradas |
| Referências de runtime | 2.042 arquivos; 1.098 referências; 0 quebradas fora da allowlist |
| Imutabilidade de migrations | aprovado contra `origin/main` |
| Actionlint | aprovado |
| Simulação da aprovação pública | aprovada, incluindo snapshot, adulteração e rotação |
| Simulação da outbox | 55/55 |
| Simulação do agendamento/Vault/monitor | 11/11 |
| Conversão, itens e arte | 18/18 |
| Documentos financeiros/logísticos | 10/10 |
| Consolidação de orçamentos | 6/6 |
| ACL efetiva | 22/22 |
| Consolidação/distribuição Sicoob | aprovada, incluindo as duas novas FKs |
| Financeiro/arte, verba e controles | aprovados |
| Segredos no diff | nenhuma correspondência encontrada; 31 fingerprints históricos isolados em baseline específica |

Os `109` testes ignorados pertencem a contratos que exigem ambiente, personas,
provedores ou credenciais específicos. Eles não foram contabilizados como
sucesso.

## Pendências que dependem do ambiente

1. Aplicar as migrations no banco de construção em ordem e confrontar o ledger.
2. Configurar no Vault `sicoob_project_url` e
   `sicoob_approval_worker_secret` e a chave HMAC versionada; publicar as Edge
   Functions e validar os crons.
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
- Validar bytes reais e antimalware de notas fiscais e comprovantes. O banco
  verifica proprietário, caminho, MIME e tamanho registrados no Storage, mas o
  conteúdo binário ainda não passa por um verificador dedicado.
- Reduzir a dívida histórica de TypeScript/ESLint. Os 31 achados históricos do
  Gitleaks foram isolados por fingerprint, sem exceção genérica; a rotação da
  credencial antiga do `migrate-helper` ainda precisa ser comprovada.
- Fixar Actions por SHA e estabelecer orçamento total/por rota do bundle, além
  do limite atual por arquivo.
- Decidir a apresentação contábil da diferença entre total comercial do
  orçamento (frete/desconto/personalização) e soma de mercadorias dos itens. O
  snapshot preserva os componentes, mas relatórios precisam usar o cabeçalho
  como total aprovado.

O lote está validado para revisão e aplicação controlada no ambiente de
construção. Ele não está validado como produção: ainda não houve migration
remota, deploy das Edge Functions, tráfego real nem CI remoto verde.
