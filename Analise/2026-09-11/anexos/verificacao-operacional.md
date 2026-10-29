# Verificação operacional e limites

As verificações de 11/09/2026 usam o commit `d75459d28da0c8164c26861cd6358b147930425a`. Nenhuma gravação foi realizada nos bancos do portal ou do catálogo. Nenhuma chamada foi feita para extrair credenciais, aprovar pedidos, criar usuários, efetuar pagamentos ou enviar comunicações.

## Ambiente e instalação

A instalação local usou `npm ci --ignore-scripts --no-audit --no-fund` e terminou com sucesso. A compilação diagnóstica usou as variáveis públicas já versionadas, sem alterar configuração remota. A instalação com scripts desativados é uma limitação de reprodução que deve ser considerada na homologação oficial.

O cliente do frontend aponta para `cfmzkthhgliqelozlmwu`. O `supabase/config.toml` identifica outro projeto, e o conector Supabase disponível na sessão também apontou para um terceiro. Esses conectores não foram usados para consultar ou modificar schemas do portal. Outros conectores não ofereceram confirmação segura do destino e dos privilégios necessários. O endereço `doufsxqlfjyuvxuezpln` respondeu à requisição sem chave com HTTP 401, o que confirma uma resposta do serviço, não acesso aos dados do catálogo.

## Build, tipos e testes

| Comando | Resultado |
|---|---|
| `npm run build` | Falhou no gate `npm audit` |
| `npm audit --json` | 21 alertas: 10 altos, 10 moderados, um baixo e zero críticos |
| `npx vite build` | Sucesso diagnóstico em 32,43 segundos |
| `npm run typecheck` | Código de saída 2, 1.259 diagnósticos em 456 arquivos |
| Recorte Vitest descrito abaixo | Cinco arquivos: quatro passaram e um falhou; 12 testes passaram e cinco falharam |

O recorte Vitest incluiu `tests/sicoob-status-mapping.test.ts`, `tests/contract/sicoob-sync.test.ts`, `tests/integration/sicoob-security.test.ts`, `tests/sicoob/rbac-routes-integrity.test.ts` e `tests/components/ProtectedRoute.test.tsx`. As cinco falhas estão em `ProtectedRoute`: o mock não informa `rolesLoaded` e a interface permanece no carregamento de permissões. Isso não comprova cinco vulnerabilidades nem invalida os achados independentes da composição de rotas.

O teste de segurança do recorte monta permissões em memória e não verifica policies reais. O teste de integridade de rotas inspeciona caminhos, sem demonstrar o fluxo autenticado completo. Scripts que criam e removem dados com credenciais privilegiadas não foram executados contra produção.

O baseline de tipos registra 1.261 diagnósticos. A comparação dos totais por arquivo não encontrou aumento, mas os 1.259 diagnósticos continuam sendo dívida. O segundo tsconfig encadeado por `&&` não foi alcançado após a falha do primeiro. Não há resultado de aprovação global do typecheck.

O bundle diagnóstico apresentou aviso de tamanho: o grupo administrativo tem aproximadamente 1.548,60 kB antes de gzip, além de grupos de ícones, PDF e voz relevantes. São medidas de empacotamento local; não medem velocidade percebida, rede do comprador ou Core Web Vitals em produção.

## Consultas remotas limitadas

| Alvo | Operação | Resultado | Limite |
|---|---|---|---|
| Configuração Auth do portal | GET com chave pública | HTTP 200, cadastro público desativado e Google desativado | Não verifica credencial ou login de um usuário |
| `profiles`, `sicoob_orders`, `cooperativas`, `postos_atendimento` | GET anônimo, somente ID, limite de uma linha | HTTP 200 e nenhuma linha visível | Não prova tabelas vazias ou isolamento entre cooperativas |
| `products` no banco próprio | Consulta limitada | HTTP 404 | Não basta para inferir todo o schema implantado |
| `external-db-bridge` | POST, operação `select`, somente ID, limite de três linhas | HTTP 200, `_unconfigured: true`, `count: 0` | Catálogo não configurado nesse caminho; não é prova de ausência de produtos no mestre |
| Catálogo externo sem credencial | GET da API | HTTP 401 | Nenhum dado de produto foi obtido diretamente |

Nenhum identificador retornado de pessoa, pedido ou cooperativa foi publicado. Os JSONs anexos guardam resultados resumidos e configuração pública, sem valores de chaves.

## Interface e implantação

A página de login foi aberta no navegador local após a compilação diagnóstica, em desktop e largura móvel de 390 px. As imagens entregues têm o IP de ambiente mascarado. Não houve clique em login rápido, correção de usuários ou autenticação social. O problema da logo foi confirmado pela imagem sem dimensão natural de carregamento.

A última tentativa de deployment consultada via GitHub é de 05/09/2026, ambiente Production, estado `failure` na Vercel. Os endereços Lovable referenciados no projeto responderam 403 neste acesso; isso não demonstra indisponibilidade universal. Um endereço Vercel respondeu HTTP 200 sem comprovar a aplicação esperada. Não houve evidência de compra ou tráfego real.

A execução [GitHub Actions 33192891133](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/33192891133) possui anotação de que o job não iniciou porque o orçamento de Actions impede novas execuções. O bloqueio financeiro não foi alterado. Defeitos estáticos nos workflows são achados separados desse estado observado.

## Cobertura documental e grafo

O detector identificou 3.338 arquivos e aproximadamente 1,89 milhão de palavras no corpus inicial. Foram combinadas extração estrutural de código, revisão semântica dos documentos e inspeção dirigida dos fluxos de maior risco. Não se afirma leitura humana linha por linha de todos os arquivos de código nem cobertura integral dos comportamentos.

O acervo externo teve extração das 298 páginas dos 12 PDFs, com 76 páginas inspecionadas visualmente; `output.pdf` recebeu OCR nas 20 páginas. O relatório financeiro de 2007 recebeu triagem de seções para pertinência ao produto, sem auditoria contábil. A planilha contém links e anotação de pesquisa, sem especificação funcional completa.

O grafo possui 15.770 nós, 20.727 arestas e 2.352 comunidades. O diagnóstico registra 11.157 arestas com extremidades não resolvidas, oito autorrelações e 631 agregações por mesmas extremidades no modelo sem direção. Há referências a dependências externas e símbolos que o extrator não resolveu. Os achados críticos têm leitura direta dos arquivos e não dependem de ausência de caminho no grafo.

O benchmark da ferramenta estima redução de contexto de 73,9 vezes em consultas sintéticas, comparando aproximadamente 1.051.333 tokens de leitura ingênua com 14.218 por consulta média. Essa estimativa usa um corpus calculado pela própria ferramenta de forma diferente do detector inicial; não é economia financeira medida, avaliação de completude ou contagem real de tokens da análise. O registro de custo informa ausência de instrumentação.
