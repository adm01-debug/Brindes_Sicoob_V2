# Correções P0: Indicadores operacionais sem valores fictícios

## Rastreabilidade

- Auditoria de origem: `docs/execucao/lacunas-funcionalidades-2026-10-11.md`, C-07.
- Registros atendidos: ADM-43 e FE-140, que identificaram a demonstração de Tendências ativa para todos os usuários.
- Escopo desta rodada: modo demo de Tendências, gestão de compras, BI do cliente, sazonalidade, selos de inteligência, prazo do comparador, limite de desconto, margem financeira e interpretação de verba ausente. Os demais itens de C-07 permanecem explicitamente pendentes.

## Implementação

`src/pages/trends/is-demo-mode.ts` agora desativa a demonstração por padrão, inclusive fora do navegador. O modo fictício só é ativado com opt-in explícito em `?demo=1` ou `?demo=true`. A coleta de dados reais e seus escopos não foram alterados; o banner já existente identifica os dados fictícios quando a demonstração é ativada.

Em `/gestor/compras`, as contagens e verbas fixas foram substituídas pela mesma consulta de cooperativa usada no painel de governança. O carregamento compartilhado foi extraído para `managerStatsService` e o cache da query é compartilhado entre as duas telas. Falha de consulta e ausência de cooperativa/verba são apresentadas explicitamente, sem números substitutos. O SLA de 85% foi removido porque não há medição por eventos de aprovação que sustente esse percentual. O botão de aprovação em lote sem ação foi substituído por um link para a fila real.

O painel financeiro do pedido deixou de exibir margem fixa de 32%. `OrderRow` não contém custo dos itens, portanto a interface informa que a margem não foi calculada; subtotal, desconto, frete e total continuam exibindo os valores do pedido.

Os painéis BI deixaram de preencher clientes sem histórico ou consultas com erro com estatísticas de demonstração; apresentam ausência/erro sem inventar categorias. A sazonalidade não calcula picos nem projeções com menos de três meses reais cobertos. Selos de vendas e velocidade só são derivados das views reais quando disponíveis; sem dados de inteligência, permanecem apenas flags gravadas no catálogo. O comparador usa o prazo informado pelo fornecedor e mostra “Não informado” quando ausente. O texto de desconto que sugeria um limite universal de 10% foi removido.

O componente de inteligência orçamentária não afirma atualização “em tempo real”. Quando não existe verba positiva configurada, apresenta estado indisponível e não calcula percentual nem impacto; com verba informada, mantém o cálculo comparativo. Esse tratamento também evita `NaN`/`Infinity` em divisões por zero.

## Validação

- Testes direcionados de Tendências: 3 cenários aprovados — padrão real, opt-in demo e rejeição de valores não reconhecidos.
- Testes de `/gestor/compras`: 3 cenários aprovados — indicadores retornados pelo serviço, falha sem fallback fictício e perfil sem cooperativa.
- Teste do painel financeiro: confirma que o valor de margem inventado não aparece quando os custos dos itens estão ausentes.
- Testes novos dos BI, sazonalidade, selos e verba: ausência/erro sem estatística fictícia, sazonalidade restrita ao histórico real, badges de mercado apenas com dados reais e verba ausente sem percentual ou status financeiro afirmativo.
- `npm run lint`: 0 erros e 872 avisos; o total não aumentou em relação ao candidato.
- TypeScript (`npm run typecheck`): aprovado.
- Build de produção (`npm run build`): aprovado; avisos existentes de ambiente, PostCSS, divisão de chunks e tamanho de bundle permanecem.
- Suíte completa no candidato: 5.869 testes aprovados, 68 ignorados; 462 arquivos aprovados e 4 ignorados.

`npm ci` no candidato empilhado reportou zero vulnerabilidades. Esta branch depende do PR #157 (correções de dependências/CI) antes de poder ser integrada à `main`; aquele PR segue aberto e sujeito aos seus próprios gates.

## Limite

Esta entrega corrige os fallbacks sintéticos e as afirmações enganosas de C-07 descritos acima, mas não prova que as views/RPCs de inteligência tenham cobertura, atualização ou volume suficientes no ambiente canônico. O score de saúde não calcula share-of-wallet por falta de fonte confiável; dimensões sem benchmark/período comparável usam valor neutro e devem continuar identificadas como estimativas limitadas. Também não comprova consulta remota com sessão autenticada, dados suficientes no ambiente canônico ou jornada real de aprovação. Nenhuma alteração foi aplicada ao banco Supabase.
