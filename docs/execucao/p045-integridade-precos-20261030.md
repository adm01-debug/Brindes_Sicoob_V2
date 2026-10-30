# P045 — Integridade de preços de orçamento

**Data:** 30/10/2026
**Branch:** `fix/quote-price-authority-311333`
**Base:** `main` em `e9d59026793b84fabeaeec9da890a068f64d49c3`
**Estado:** candidate local implementado e validado em ambiente descartável;
PR/CI e homologação conectada pendentes. Nenhuma alteração foi aplicada ao
Supabase remoto.

## Implementação do candidate

- A Edge Function `quote-price-attestation` autentica o usuário, usa a RLS da
  sessão para ler o orçamento e consulta o catálogo Promobrind em modo somente
  leitura. Produto usa `sale_price` e `cost_price`; variante usa o preço próprio
  e o custo de catálogo do produto, seguindo o fallback legado de 70% apenas
  quando `cost_price` é nulo ou zero. Técnicas e custos de personalização são
  revalidados pelos RPCs oficiais do catálogo.
- Produto novo ou item com produto/variante/quantidade/preço/custo alterados é
  validado contra o catálogo. Snapshot comercial antigo só é preservado quando
  identidade, quantidade, preço, custo e personalizações persistidas coincidem.
  Itens antigos sem produto ativo podem continuar sendo salvos sem repricing se
  seu snapshot inteiro permanece igual.
- A migration guarda um hash SHA-256 do cabeçalho, itens e histórico em tabela
  `private`, ligado a ator, orçamento, versão e expiração de cinco minutos. Os
  wrappers autenticados consomem o token uma vez na mesma transação do save.
  Triggers impedem bypass por DML direto ou RPC antiga sem token.
- `catalog_checked_at` é atualizado pelo banco quando a gravação foi atestada.
  `price_confirmed_at` permanece reservado à confirmação explícita do vendedor;
  alteração de timestamp é normalizada para o horário do servidor.
- A criação de versão continua suportada por exceção limitada às inserções feitas
  pelo núcleo interno já autorizado, que copia o snapshot de origem sem permitir
  alteração de preço. Mudanças em `shipping_type` exigem atestado porque alteram
  a interpretação comercial do total.
- O serviço web chama a Edge antes das RPCs de criação/edição e não persiste nada
  se o atestado falhar. O preço unitário manual deixou de ser editável; a
  negociação continua no fluxo de descontos/aprovação já existente.
- Antes da Edge, a criação consulta um preflight idempotente `SECURITY INVOKER`,
  sujeito às políticas RLS, que só devolve um orçamento já persistido quando
  ator, chave e hash do conteúdo coincidem. O preflight não grava; o RPC de save
  conserva o lock e a validação para resolver concorrência.
- O custo estimado de fallback usa o mesmo arredondamento em centavos no editor
  e na Edge. Preço zero de variante é preservado, e itens novos/alterados
  conferem SKU, atributos de variante e imagem presente no catálogo.
- O limite de 512 KiB é aplicado durante a leitura do stream; JSON `null` recebe
  resposta de entrada inválida. A validação de personalizações usa concorrência
  limitada a cinco configurações por item.
- A nova função entrou no manifesto de autorização, `config.toml`, workflow de
  deploy e guia de deploy. A migration foi incluída na allowlist de aplicação
  com hash verificado. O simulador SQL foi ligado ao CI.

## Simulações adversariais

`python3 scripts/qa/simular-salvamento-orcamento-atomico.py` aprovou em
PostgreSQL 17 descartável, sem rede e com dados sintéticos. Cobriu:

- adulteração de preço/custo mesmo com totais do cabeçalho recalculados;
- replay do mesmo UUID de atestado após consumo;
- rejeição de edição adulterada sem mudança de cabeçalho, row version, itens,
  personalizações ou histórico;
- tentativa de alterar `shipping_type` diretamente;
- DML direto e RPC anterior sem atestado;
- atualização concorrente com `row_version` obsoleto;
- rollback de falha ocorrida após iniciar gravação atômica;
- recuperação idempotente sem escrita com hash igual e recusa de conteúdo
  diferente para a mesma chave;
- criação de versão com cópia de item e personalização;
- timestamp `price_confirmed_at` vindo do navegador normalizado pelo servidor.

O script escreve a evidência reproduzível em
`docs/execucao/evidencias/salvamento-orcamento-atomico.json` e marca
`producao_verificada: false`.

## Revisão especializada

Cinco agentes read-only revisaram construção/testes, política de atestação,
fluxo comercial, integridade SQL, idempotência e integração de CI/deploy/migrations.
Os achados críticos foram incorporados: custo real do catálogo, comparação
monetária exata, identidade de snapshots, semântica dos timestamps, proteção do
tipo de frete, suporte à versionagem e allowlists de publicação/aplicação.
Também foram corrigidos: cálculo de custo com a mesma expressão decimal no
frontend e na Edge; semântica distinta de SKU pai, SKU de variante e SKU de
fornecedor, preservando identidade legada persistida; RPCs de personalização em
GET pelo transporte somente leitura; preço zero de variante; metadados/imagem
de catálogo; leitura limitada do corpo; e retry após perda de resposta.

Uma revisão independente posterior encontrou risco de consolidar no editor duas
variantes com mesmo produto/cor/tamanho, mas identidade ou preço de catálogo
diferentes. A deduplicação agora exige mesma variante, SKU, preço e custo; o
caso de variante distinta e a mudança de snapshot têm testes unitários próprios.

## Validação local

- `npm run typecheck`: sucesso.
- `npm run lint`: sucesso, 0 erros e 873 avisos; mesmo baseline.
- `npm run build`: sucesso; mantém avisos de PostCSS/chunks e inclui avisos de
  comentários de anotação internos do Zod 4, removidos pelo Rollup no bundle.
- `npm run test:coverage:ci`: 5.867 testes aprovados, 68 ignorados; 455 arquivos
  aprovados, 4 ignorados. Cobertura: 94% statements, 86,79% branches, 97,22%
  funções e 97,6% linhas, sem piora frente ao baseline registrado.
- `npm run test:scenarios`: 226 cenários aprovados.
- `deno check --no-config supabase/functions/quote-price-attestation/index.ts`:
  sucesso.
- Gates de autorização Edge, logging estruturado, imutabilidade de migrations e
  allowlist/hash de migrations: sucesso.
- `npm run check:npm-audit`: sucesso, 0 vulnerabilidades, após atualizar
  `undici` para 8.12.3 e `zod` para 4.6.7. A atualização major do Zod foi
  acompanhada por ajustes de compatibilidade e testes.
- `npm run check:security-definer-acl`: ignorado localmente porque não há URL e
  chave Supabase configuradas.

## O que falta para encerrar P045

1. Confirmar todos os checks remotos no SHA final da PR. No snapshot anterior
   `c9aa802d`, Segurança, CodeQL, Bundle, Lighthouse e Portal Sicoob passaram;
   Qualidade contínua falhou porque o script e a fixture inicializavam o mesmo
   schema/tabela. Reproduzi e corrigi a duplicidade; os sete cenários passaram
   localmente em PostgreSQL descartável. O E2E foi bloqueado antes dos testes
   pela ausência de um Supabase isolado.
2. Publicar `quote-price-attestation` e aplicar a migration somente no projeto
   de construção autorizado. Ainda não foram executados.
3. Configurar `E2E_SUPABASE_PROJECT_ID` para o projeto de homologação e executar
   a jornada autenticada ponta a ponta. O repositório lista credenciais de
   contas E2E; seus valores não foram consultados.
4. Verificar o SECURITY DEFINER ACL com credenciais do alvo de construção.

Portanto, P045 está **implementada no candidate**, mas ainda **não está
certificada como implantada ou concluída**.
