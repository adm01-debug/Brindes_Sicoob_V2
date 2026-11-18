# Execução integrada do plano — 16/10/2026

## Escopo e regra de conclusão

Esta execução coordenou cinco especialidades: GitHub/PRs, banco/RLS,
Edge Functions e integrações, frontend/storage e validação/CI/documentação. O
trabalho foi reunido em um candidato isolado para detectar conflitos entre os
lotes antes da integração.

O sistema continua em construção. Neste relatório, **implementado localmente**
significa código versionado, simulado e validado no candidato; não significa
publicado, migrado no banco canônico, homologado por usuários ou pronto para
tráfego real. A conclusão integral continua condicionada aos aceites definidos
no plano.

## Referências auditáveis

- Repositório canônico: `adm01-debug/Brindes_Sicoob_V2`.
- Banco canônico: `cfmzkthhgliqelozlmwu`.
- PR de integração ativo: [#112](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/112), cabeça `f844043a70ab0bedfdc332def4f6706297298f00`.
- Candidato integrado local: branch `fix/hermes-h164991-simulacao-final`, 72
  commits à frente da `origin/main` na coleta final.
- Matriz vigente: [`matriz-100-etapas.json`](../auditoria-planejamento-2026-10-16/matriz-100-etapas.json).
- Estratégia de implantação: [`ESTRATEGIA_IMPLEMENTACAO.md`](../auditoria-planejamento-2026-10-16/ESTRATEGIA_IMPLEMENTACAO.md).

## Resultado dos cinco fluxos especializados

### 1. GitHub, PRs e supply chain

- Atualizações de Actions e dependências foram reunidas e validadas no
  candidato, evitando dependências redundantes entre PRs automáticas.
- Workflows de CI, E2E, CodeQL, bundle, Lighthouse, migrations, deploy de Edge e
  compliance receberam as correções já registradas nos commits do candidato.
- O contrato de deploy das Edge Functions passou a inventariar 106 fontes, das
  quais 100 são publicáveis e seis são explicitamente `source-only`.
- A PR #112 permanece aberta e bloqueada. Os jobs hospedados encerram em dois a
  seis segundos, sem executar passos, com a anotação: “The job was not started
  because an Actions budget is preventing further use.” A Vercel conclui a
  prévia, mas não substitui os gates obrigatórios do repositório.
- Nenhum merge forçado, publicação ou desativação de proteção foi realizado.

### 2. Banco, RLS e contratos transacionais

- O aplicador allowlisted reconhece 41 migrations autorizadas, confere SHA-256,
  ledger e pós-condições e executa o lote em transação administrativa.
- A consulta administrativa em modo somente leitura encontrou 38 migrations
  aplicadas e três pendentes:
  - `20261016180000_harden_storage_and_public_favorites_acl`;
  - `20261016190000_enable_scoped_business_realtime`;
  - `20261016193000_pin_custom_kit_atomically`.
- A migration de Realtime publica somente 12 tabelas de negócio já protegidas
  por RLS, cria leitura própria de `login_attempts` e valida a publicação no
  monitor de hardening.
- A fixação de kit passou a usar RPC transacional com advisory lock, escopo do
  titular, índice parcial único e ACL restrita a `authenticated`.
- As três migrations pendentes foram aprovadas em PostgreSQL 17 descartável e
  não foram aplicadas no canônico, pois o código correspondente ainda não foi
  integrado à `main`.

### 3. Edge Functions e integrações

- O deploy deriva sua lista do manifesto canônico, preserva `verify_jwt`, exige
  avanço de versão e registra resultado parcial sem declarar sucesso indevido.
- Os contratos de autenticação e autorização cobrem as 106 fontes locais.
- Storage privado, recuperação de auto-testes, health check das conexões e
  referências assinadas foram endurecidos.
- A reconciliação remota comprovou 100 funções ativas compatíveis com o
  inventário publicável. A publicação do novo código aguarda o merge.
- A homologação do scanner antimalware, do e-mail e dos provedores de IA/voz
  permanece externa; os handlers falham fechados quando a configuração não
  existe.

### 4. Frontend, catálogo e jornadas comerciais

- O detalhe de orçamento ganhou estado de erro acionável e nova tentativa.
- Sugestões do BI chegam ao criador de orçamentos e são preservadas durante a
  inicialização.
- Todos os filtros anunciados no catálogo passaram a compor a consulta efetiva.
- Indicadores de qualidade do catálogo consultam contagens exatas; métricas não
  aferidas aparecem como indisponíveis, sem percentuais inventados.
- Rascunhos de orçamento passaram a ser escopados por usuário, cooperativa e
  PA, com detecção de concorrência entre abas e limpeza no logout.
- Gestores da Singular receberam a rota `/gestor/delegacoes`, ligada ao fluxo
  transacional existente e aos mesmos limites de escopo.
- O estimador de frete deixou de apresentar uma tabela fictícia. A interface
  informa peso verificável e exige cotação real com CEP e volumes antes de
  incluir frete no total.
- A persistência de kit fixado deixou de realizar duas escritas concorrentes e
  passou a depender da RPC atômica.
- Navegação, acessibilidade, storage privado, persistência de filtros,
  restauração de histórico e proteção contra saída com alterações pendentes
  foram integrados e exercitados em conjunto.

### 5. Validação, CI e documentação

- O teste de paridade foi atualizado para as 132 folhas atuais e passou a
  exigir explicitamente `/gestor/delegacoes` no gate Sicoob.
- O inventário de testes ignorados identifica o arquivo e o título; trocar um
  skip antigo por outro novo mantendo a contagem agora reprova o gate.
- O CI executa as verificações de observabilidade, correlação de request id e
  consistência documental previstas no lote.
- Os contratos de runtime Edge, Realtime, Storage, kit atômico, frete e
  indicadores reais foram incorporados à suíte de cenários.

## Certificação do candidato integrado

| Verificação | Resultado observado |
|---|---:|
| Instalação reprodutível | 977 pacotes, zero vulnerabilidade |
| TypeScript | zero diagnósticos |
| ESLint | zero erros; 871 avisos estruturais não bloqueantes |
| Vitest integral | 540 arquivos aprovados, 4 ignorados |
| Casos Vitest | 6.247 aprovados, 67 ignorados, zero falha |
| Cenários Node | 244/244 aprovados |
| Build de produção | aprovado, 6.233 módulos transformados |
| `npm audit` controlado | aprovado, zero vulnerabilidade |
| Simulação de kit atômico | 8/8 contratos aprovados em PostgreSQL 17 |
| Simulação de Realtime | publicação seletiva e monitor aprovados |
| Simulação de Storage/RLS | aprovada no lote especializado |
| Smoke público de autenticação Edge | 52/52 respostas esperadas |
| Deno sem dependência externa | aprovado |
| Deno integral | 183 aprovados, 15 dependentes de runtime/env, 6 ignorados |

As mensagens `ErrorBoundary` presentes na saída de Vitest são exceções
controladas pelos próprios testes; o processo encerrou com status zero. O build
mantém avisos conhecidos de chunks grandes e de variáveis `VITE_*` ausentes no
ambiente isolado, sem erro de compilação.

O gate de ACL `SECURITY DEFINER` não pôde executar pela chave de serviço via
arquivo local, pois ela não está presente no `.env.production`. A mesma classe
de contrato foi validada pelas consultas administrativas, simulações
descartáveis e cenários estáticos; a execução hospedada continua obrigatória.

## Estado do banco canônico

O banco corresponde ao código que já entrou na linha aprovada até a migration
`20261016173000`. Não existe deriva silenciosa nas três migrations novas: elas
estão versionadas, allowlisted e explicitamente pendentes. Aplicá-las antes do
merge criaria o estado inverso que esta auditoria procura evitar — banco mais
novo que o código canônico.

Após o merge aprovado, a sequência obrigatória é:

```bash
node scripts/db/apply-sicoob-migrations.mjs --apply
node scripts/db/apply-sicoob-migrations.mjs --require-applied
```

Em seguida, devem ser publicados os artefatos Edge pelo workflow canônico e
executados os smokes autenticados no SHA integrado.

## Pendências que não podem ser encerradas por código local

1. **GitHub Actions:** restaurar orçamento/capacidade para permitir que os jobs
   obrigatórios realmente iniciem. A PR #112 não pode ser mesclada de forma
   segura enquanto todos os checks terminarem antes do primeiro passo.
2. **Banco e Edge:** aplicar as três migrations e publicar as funções somente
   depois do merge com CI verde.
3. **Scanner antimalware:** contratar/configurar provedor, cadastrar os segredos
   e homologar arquivo limpo, malware, timeout, 5xx e hash divergente.
4. **IA e privacidade:** cadastrar `LOVABLE_API_KEY` e obter decisão formal do
   DPO/jurídico para o uso de dados de CRM.
5. **E-mail e canais:** homologar remetente, domínio, recibos, retry e
   destinatários com o provedor real.
6. **Regras comerciais:** formalizar tributos, frete, prazo, políticas de
   cotação/alçada, competência financeira, embalagem e fornecedor por
   cooperativa. A interface não deve inventar esses valores.
7. **Homologação humana:** executar as jornadas por persona em duas
   cooperativas, realizar compra sintética integral e registrar os aceites de
   compras, marketing, financeiro, operação e privacidade.
8. **Operação:** ensaiar restauração, ativar alertas externos e observar a janela
   de estabilidade definida pelo plano antes de declarar produção.

## Decisão de integração

O candidato local está tecnicamente verde, mas não deve ser enviado como um PR
monolítico de 480 arquivos. A ordem segura permanece:

1. restaurar o orçamento do Actions e concluir a PR #112;
2. reconstruir os lotes seguintes sobre a nova `main`, preservando commits
   coerentes e evitando conflitos com PRs já substituídas;
3. executar CI e revisão por lote;
4. aplicar as migrations e publicar Edge na ordem compatível;
5. executar smokes conectados e atualizar a matriz com a evidência remota.

Esta execução esgotou o trabalho local independente do bloqueio imediato de
integração. O plano integral permanece aberto nos itens externos e de negócio
acima; marcá-los como concluídos sem CI, implantação e aceite contrariaria o
critério de conclusão do próprio projeto.
