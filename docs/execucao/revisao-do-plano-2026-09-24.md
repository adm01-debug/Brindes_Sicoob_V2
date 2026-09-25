# Revisão dos planos e das melhorias — 24/09/2026

**Não implementamos integralmente todas as melhorias.** Há funcionalidades completas no código, integrações parcialmente ligadas, correções ainda em PR e requisitos de produto que não foram localizados. O projeto continua em construção; etapas de piloto/produção são futuras, conforme orientação do usuário.

Base de código: `6193793a7fad6ec7e1dacd0e68075e3685016e28`, `origin/main` consultado em 24/09. A revisão foi feita em worktree isolado e preservou as três edições do diretório principal. Nenhuma correção funcional, migration remota ou implantação foi executada neste lote de auditoria.

## Escopo e como interpretar

A matriz confronta as **250 etapas documentais** dos quatro planos (100 + 50 + 50 + 50) e as **32 melhorias do benchmark**. Cada etapa tem diagnóstico atual, fonte de código/documento e condição concreta de fechamento. As referências históricas permanecem identificadas; nomes de tabelas, presença de arquivos e testes com mocks não foram tratados como homologação.

Os **1.000 requisitos do plano de produto** foram indexados com o texto original, diagnóstico histórico e bloqueio atual da etapa. **20 diagnósticos individuais foram atualizados; 980 foram preservados explicitamente como históricos, sem novo ensaio individual.** Esta revisão não representa mil testes executados nem certificação individual dos mil requisitos. Não há base para substituir o checklist original por “100% concluído”.

| Plano | Local/documental | Parcial | Não localizado | Validação externa | Histórico | Premissa substituída |
|---|---:|---:|---:|---:|---:|---:|
| Produto — E001–E100 | 0 | 81 | 3 | 16 | 0 | 0 |
| Reconciliação — R01–R50 | 3 | 31 | 1 | 4 | 10 | 1 |
| Correções da auditoria — C01–C50 | 10 | 26 | 4 | 6 | 2 | 2 |
| Runbook técnico — T01–T50 | 14 | 28 | 5 | 1 | 2 | 0 |
| Benchmark — B01–B32 | 5 | 22 | 1 | 4 | 0 | 0 |

“Local/documental” vale somente para o escopo indicado na linha, como um verificador implementado ou uma simulação executada. Não é conclusão integral do produto. As 100 etapas de produto continuam sem encerramento formal, pois os critérios de aceite, responsáveis/revisores e dependências do checklist não foram integralmente satisfeitos. As etapas se sobrepõem e **não podem ser somadas como percentual de funcionalidades prontas**.

Artefatos revisáveis:

- [Matriz das 250 etapas](revisao-plano-20260924/matriz-250-etapas.md), [CSV](revisao-plano-20260924/matriz-250-etapas.csv) e [JSON](revisao-plano-20260924/matriz-250-etapas.json).
- [Benchmark atualizado](revisao-plano-20260924/benchmark-32.md), [CSV](revisao-plano-20260924/benchmark-32.csv).
- [1.000 requisitos, histórico e bloqueio atual](revisao-plano-20260924/requisitos-1000.csv), [JSON](revisao-plano-20260924/requisitos-1000.json).
- [Resumo e legenda](revisao-plano-20260924/resumo.json), [checks executados](revisao-plano-20260924/checks.json).

## Lacunas confirmadas e prioridade de correção

| ID | Prioridade | Constatação e impacto | Evidência | Fechamento necessário |
|---|---|---|---|---|
| A01 | P0 | Cinco Edge Functions operacionais retornam 404: reconciliação de aprovações, arte, ingestão documental, kit e recompra. Os consumidores existem, mas o fluxo remoto correspondente não está demonstrado. | [Auditoria real do Supabase](auditoria-paridade-local-github-supabase-2026-09-24.md) | Publicar versões revisadas e executar cada fluxo com ator autorizado e tentativa negada. |
| A02 | P0 | Correções de segurança/integração ainda estão fora do main: documentos/exportações/crons (#24), ações por papel (#25), remoção de aprovação legada (#26), CSP (#27), workers internos (#28) e erros da recompra (#29). | [PRs abertos](revisao-plano-20260924/prs-abertos.json) | Revisar dependências, integrar e validar o conjunto; #26 depende da branch de #24. Não contar conteúdo de branch como incorporado. |
| A03 | P1 | `/sicoob/logistica` é rota ativa e exibe três remessas fixas, KPIs 142/8/99,2%/128 e promessa de rastreamento em tempo real. Busca/filtro não estão ligados a consultas reais nessa página. | [Página](../../src/pages/sicoob/LogisticsReportPage.tsx), [rota](../../src/routes/config/sicoob.ts) | Consumir remessas/recebimentos reais com escopo, filtros, erro/vazio e métricas reconciliadas; ou restringir explicitamente à demonstração. |
| A04 | P1 | `QuoteAutoSave` usa `key=quoteId || "new"`; novos orçamentos persistem sob `autosave_new`, incluindo cliente, itens e notas internas. Uma nova montagem restaura o conteúdo anterior sem identidade de usuário. A limpeza atual de logout não inclui autosave. | [Hook](../../src/hooks/useAutoSave.ts), [call-site](../../src/pages/QuoteBuilderPage.tsx), [Auth](../../src/contexts/AuthContext.tsx), [sonda executada](../../scripts/revisao/rascunhos-20260924.cenarios.tsx) | Segmentar por usuário/cooperativa/PA e rascunho, limpar/inutilizar na troca de sessão e testar dois atores. A sonda reproduz persistência entre montagens; não é E2E de login real. |
| A05 | P1 | Falha em `localStorage.setItem` é apenas registrada; o hook não expõe erro ao consumidor. O componente possui texto “Erro ao salvar”, mas não recebe essa falha e pode permanecer em “Salvando...”. | [Hook/componente](../../src/components/quotes/QuoteAutoSave.tsx), [sonda executada](../../scripts/revisao/rascunhos-20260924.cenarios.tsx) | Expor sucesso/erro real, preservar rascunho em memória e permitir recuperação; ensaiar quota/storage negado. |
| A06 | P1 | As duas chaves públicas em `.env.production` recebem 401; oito relações, vinte RPCs e onze colunas remotas estão ausentes dos tipos versionados. | [Auditoria de paridade](auditoria-paridade-local-github-supabase-2026-09-24.md) | Corrigir configuração pública do build e regenerar/revisar contratos do projeto correto. |
| A07 | P1 | Main exige uma revisão, mas não exige checks e permite bypass administrativo. PRs podem ser incorporados sem testes remotos executados. | [Proteção consultada](revisao-plano-20260924/protecao-github.json) | Configurar checks obrigatórios/enforcement e comprovar execução do CI e bloqueio de regressão. |
| A08 | P1 | Não há fotografia administrativa atual do ledger integral. O comparador existe, mas o secret SQL observado não está configurado; snapshot histórico de lote não prova paridade das 534 migrations. | [Workflow](../../.github/workflows/migration-ledger-drift.yml), [auditoria](auditoria-paridade-local-github-supabase-2026-09-24.md) | Comparar versões, nomes e hashes no projeto-alvo; classificar o backlog semanticamente. Não aplicar migrations antigas em bloco. |
| A09 | P2 | `check-runtime-refs` passou usando cache de 22/09; não há atualização automática semanal confirmada. Mudança remota pode escapar da comparação. | [Verificador](../../scripts/db/check-runtime-refs.mjs), [resultado](revisao-plano-20260924/checks.json) | Renovar inventário de forma autenticada, registrar validade/hash e ensaiar detecção de recurso removido. |
| A10 | P2 | Previsão de estoque de kit converte erro de consulta em `records: []`, usa buffer fixo de três dias e não demonstra níveis de confiança. | [Hook](../../src/hooks/useKitStockForecast.ts) | Distinguir indisponibilidade de ausência de estoque; validar variante, reposição suficiente e confiança antes de prometer data. |
| A11 | P2 | Validação de kit no servidor cobre preço, mínimo, variante e demanda agregada, mas não foi localizada verificação física de capacidade da embalagem. | [Validador](../../supabase/functions/sicoob-kit-quote/catalog.ts) | Definir dimensões/peso/capacidade e tratamento de informação desconhecida; validar antes de aceitar a composição. |
| A12 | P2 | Convite institucional com escopo e validade, delegação temporária e comparação de cotações institucionais com exceção de fornecedor único não têm fluxo completo localizado. | E016, E060, E067 na [matriz](revisao-plano-20260924/matriz-250-etapas.md) | Implementar contratos, autorização, UI e cenários negativos; convite de colaboração em kit e comparador de produtos não satisfazem esses requisitos. |
| A13 | P2 | Magic Up tem schema de comentários/compartilhamento público/reações sem consumidor; as views `sicoob_budget_audit` e `v_full_scope_grants` também não foram localizadas no dashboard fora dos tipos. | [Magic Up](evidencias/etapa24_magic_up_20260917.md), [dashboard](../../src/pages/admin/AuditEvidenceDashboard.tsx) | Implementar o fluxo previsto ou registrar retirada de escopo com justificativa; não remover dados por suposição. |
| A14 | P2 | Campanha institucional com marcos regressivos, cancelamento por item/destino, inspeção por lote e resolução completa de avaria/falta permanecem incompletos. Recebimento com avaria existe, mas não implementa protocolo, investigação, crédito/reposição e reabertura. | E051–E052, E069, E072, E077 na [matriz](revisao-plano-20260924/matriz-250-etapas.md) | Fechar cada passagem operacional com ator, estado, evento, documento e teste de término. |
| A15 | P2 | O desenho mais próximo de loja está demonstrado em `/loja-demo`; a demonstração não certifica a jornada comercial real. Marca, usabilidade, teclado/zoom/leitor e telas extremas não têm aceite integral. | [Demo](../../src/pages/sicoob/StorefrontDemoPage.tsx), [pesquisa](../pesquisa/2026-09-11/dossie.md) | Validar telas conectadas com cooperativa piloto, marca autorizada e tarefas observadas. |

P0 indica bloqueio de aceite funcional/segurança do próximo lote, não incidente em produção — o sistema segue em construção.

## Avanços que a documentação antiga ainda trata como ausentes

- **Distribuição e recebimento por destino:** RPC, UI e controle de somas/idempotência existem. Simulação atual confirmou isolamento de PA, rejeição de excesso, retry e avaria imutável. B31 passa de ausência estrutural histórica para implementação parcial aguardando homologação.
- **Kits:** demanda repetida agora é agregada e variante/mínimo/preço são validados no servidor. A lacuna de capacidade física e a função remota ausente continuam explícitas.
- **Arte e conversão:** identidade/versionamento e pré-condição de produção estão implementados; conversão financeira e mutação de itens passaram 22 cenários SQL.
- **Notificações:** outbox durável, estados de entrega e reconciliação têm código e 57 cenários SQL aprovados. Configuração de provedor/Vault, entrega real e publicação continuam pendentes.
- **Vistos recentemente:** chave por usuário e limpeza de memória estão implementadas; a falha histórica de store global foi corrigida. Isso não corrige o rascunho de orçamento, que utiliza outro mecanismo.
- **Bitrix e versionamento:** as tabelas Bitrix e `create_quote_version_atomic` aparecem na API real. O documento de decisões pendentes ainda contém descrições anteriores à aplicação; não reaplicar o pacote antigo apenas por essas descrições.
- **Passkey:** o método inseguro foi desativado deliberadamente. A autenticação por passkey completa ainda precisa de desafio e assinatura verificados no servidor; desativação segura não é entrega da funcionalidade.

## Verificação executada nesta rodada

| Verificação | Resultado e limite |
|---|---|
| Instalação isolada | `npm ci --ignore-scripts --no-audit --no-fund`; 1.081 pacotes. A primeira tentativa com dependências compartilhadas foi invalidada por link PPTX quebrado e substituída por instalação limpa. |
| Vitest integral | **5.472 passaram, 0 falharam, 113 ignorados**, em 385 arquivos coletados. Execução sem cobertura; não extrapolar percentuais de relatórios antigos. |
| Cenários Node | **195/195 passaram**. |
| TypeScript baseline | **166 erros / baseline 166**, zero regressão. Não é tipagem global limpa. |
| ESLint baseline | **3.314 erros globais**, zero arquivos de aplicação alterados; gate diferencial passou. Não é aprovação do lint global. |
| Build | Vite aprovado. |
| Orçamento de bundle | Gate passou; 627 chunks, 9.646.997 bytes brutos e 2.930.801 bytes gzip; dois avisos em chunks de ícones/voz. Não certifica orçamento total por jornada. |
| Autorização Edge | Manifesto **106/106** passou estaticamente; não executa todas as chamadas remotas. |
| Referências de runtime | 2.050 arquivos, 1.075 referências; zero quebradas no cache de **22/09**, não em catálogo vivo renovado nesta rodada. |
| Conversão/itens financeiros | **22/22 cenários**, PostgreSQL 16 descartável sem rede. |
| Documentos | **20/20 cenários**, PostgreSQL 16 descartável; não homologa scanner real. |
| Outbox | **57/57 cenários**, PostgreSQL 16 descartável; não comprova entrega de provedor. |
| Distribuição/recebimento | Simulação aprovada com criação, soma, isolamento, idempotência, parcial e avaria; relatório próprio sem inventar contagem de testes. |
| Rascunhos | **Duas lacunas reproduzidas**. As sondas passam quando a lacuna aparece; não contabilizadas como testes de produto aprovado. |
| Supabase remoto | Reutilizada a coleta real da mesma data já incorporada no PR #30: 230 tabelas/partições públicas com RLS ativo; oito sem policies; auditoria ACL disponível sem achados. Não foi repetida aplicação de migrations nem ensaio de escrita remota. |
| GitHub | Proteção e lista de PRs consultadas novamente. CI remoto não substituído pelos testes locais. |

Os 113 ignorados incluem 58 casos de bypass Edge, nove de personas RLS e grupos de recuperação de acesso, integrações, webhooks e integridade. O [JSON de checks](revisao-plano-20260924/checks.json) lista a distribuição exata. RLS habilitado e zero achados em uma RPC de ACL não comprovam todos os predicados de autorização.

## Sequência recomendada para encerrar as lacunas

1. Reconciliar PRs #24–#29, configuração pública, tipos e implantação das cinco funções ausentes; validar cada lote no ambiente de construção.
2. Corrigir os rascunhos por identidade e seu retorno de erro; substituir os dados simulados da rota logística ativa.
3. Fechar ledger e objetos SQL com conexão ao projeto correto; não usar a API administrativa como se ela oferecesse SQL arbitrário.
4. Homologar Auth, catálogo somente leitura, Storage, scanner, notificações e exportações com duas cooperativas/personas de teste; executar os contratos atualmente ignorados.
5. Implementar os fluxos de negócio ainda ausentes ou formalizar retirada de escopo, preservando rastreabilidade aos IDs das matrizes.
6. Homologar design e jornada completa com participantes e responsáveis por compra/marca; piloto real e segunda cooperativa permanecem etapas futuras.

A conclusão deve ser dada por requisito com evidência, não pela soma de arquivos ou testes. Não há comprovação atual de 10/10 nem de implantação integral dos planos.

## Reprodução dos artefatos

`python3 scripts/revisao/gerar-revisao-2026-09-24.py` valida IDs, fontes e referências antes de regenerar as matrizes a partir das avaliações TSV versionadas. `npx vitest run --config scripts/revisao/vitest-rascunhos-20260924.config.ts` reproduz as duas lacunas do autosave; sucesso desse comando significa que o comportamento indesejado foi observado no commit auditado.

Foram conferidos 250 IDs de etapas, 32 IDs do benchmark, 1.000 IDs de requisitos e 922 links locais dos relatórios gerados, sem duplicação ou link quebrado. As 534 migrations ativas não possuem prefixos repetidos. Esses controles validam a consistência do relatório, não substituem os aceites funcionais.
