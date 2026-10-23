# Reproduzir as verificações desta auditoria

Os scripts desta pasta são os usados na auditoria de 13/10/2026. Não são uma nova suíte integrada ao projeto. Os resultados originais estão na pasta superior, com o relatório e o manifesto de hashes.

## Referência e ambiente

- Commit: `fff0b4cb60b23715661d5782cdf747df4ef0027d`.
- Origem: repositório privado `adm01-debug/Brindes_Sicoob_V2`.
- A execução utilizou um worktree isolado em `/home/joaquim_ataides/hermes-workspaces/auditoria-planos-20261013`, removido ao final sem alterações no código.
- Para repetir, recriar um checkout isolado desse commit e ajustar as constantes de caminho dos scripts caso o destino seja outro. Não executar sobre um checkout com trabalho não salvo.
- Dependências utilizadas: Python 3, Node, TypeScript já instalado no worktree de fechamento, `pdftotext`, Docker e imagem `postgres:16-alpine` já disponível.
- As bibliotecas de Node são referenciadas por caminho local nos scripts; ajustar para a instalação correspondente, preservando a versão do lockfile auditado.

## Simulações sem acesso de escrita remoto

- `sicoob_simulacoes_auditoria.py`: reutiliza as fixtures versionadas de conversão e aprovação pública, acrescentando `guard_quote_governance_write.sql` coletado do canônico. Salva erro e contagem de efeitos; encerra e remove os contêineres.
- `sicoob_simular_rls_20261013.py`: cria tabelas sintéticas e instala as policies/helpers coletados em `bd-policies.json` e `bd-funcoes.json`. Testa duas cooperativas, gestor inativo, limite do gerente e o estado de kit. Não é clone integral do schema.
- `sicoob_simular_filtros_20261013.cjs`: transpila e executa os predicados reais de filtro/ordenação com dois produtos sintéticos; compara sete filtros ignorados e um controle positivo.

Os contêineres usam `--network none`, não publicam portas e não contêm dados pessoais. A primeira tentativa da fixture RLS encontrou a janela de reinício da inicialização do PostgreSQL; a espera foi corrigida para o listener TCP do servidor final. O resultado válido é o JSON preservado, não essa falha transitória do harness.

## Consulta do estado remoto

A coleta usou o Management API do projeto canônico com `read_only=true`. O token local foi lido em memória e não está incluído no material. O papel SQL observado foi `supabase_read_only_user`.

Foram consultados: ledger, catálogos de schema/funções/triggers/constraints/policies, grants, publicação Realtime, buckets, configuração não secreta de Auth, nomes de secrets, presença de chave no Vault, cron e agregados de execução. O bundle de `verify-email` foi obtido por leitura; nenhuma conta foi modificada. Não reproduzir a falha contra contas reais.

A comparação do ledger usou o script versionado `scripts/db/check-migration-ledger-drift.mjs`, com `--baseline-file scripts/db/migration-ledger-baseline.json --json`. Esse comparador é somente leitura; aprovação contra baseline não significa ausência de diferenças históricas.

## Geração e limites

- `sicoob_audit_20261013.py`: inventário, extração documental e auxiliares de consulta.
- `sicoob_scan_referencias.cjs`: grafo conservador de imports; candidatos não alcançáveis não equivalem a funções obrigatórias ausentes.
- `sicoob_achados_20261013.py`, `sicoob_mapeamentos_20261013.py` e `sicoob_relatorio_20261013.py`: geram relatório, matrizes e consulta offline. Executar achados antes do gerador evita duplicar complementos de texto.
- `validacao-consulta.json`: verificação em Chromium de busca, prioridade, troca de camada, paginação e ausência de erro JavaScript na consulta offline. Não é teste do portal.

Não foram reexecutados nesta rodada todos os testes de lint, tipos, dependências, Deno ou jornadas de navegador do sistema. Não extrapolar os resultados das fixtures mínimas para uma certificação integral do produto.
