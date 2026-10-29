# Correções P0: Indicadores operacionais sem valores fictícios

## Rastreabilidade

- Auditoria de origem: `docs/execucao/lacunas-funcionalidades-2026-10-11.md`, C-07.
- Registros atendidos: ADM-43 e FE-140, que identificaram a demonstração de Tendências ativa para todos os usuários.
- Escopo desta rodada: modo demo de Tendências e indicadores de gestão de compras tratados abaixo. Outros números fixos listados em C-07 continuam pendentes e não são considerados corrigidos por esta entrega.

## Implementação

`src/pages/trends/is-demo-mode.ts` agora desativa a demonstração por padrão, inclusive fora do navegador. O modo fictício só é ativado com opt-in explícito em `?demo=1` ou `?demo=true`. A coleta de dados reais e seus escopos não foram alterados; o banner já existente identifica os dados fictícios quando a demonstração é ativada.

Em `/gestor/compras`, as contagens e verbas fixas foram substituídas pela mesma consulta de cooperativa usada no painel de governança. O carregamento compartilhado foi extraído para `managerStatsService` e o cache da query é compartilhado entre as duas telas. Falha de consulta e ausência de cooperativa/verba são apresentadas explicitamente, sem números substitutos. O SLA de 85% foi removido porque não há medição por eventos de aprovação que sustente esse percentual. O botão de aprovação em lote sem ação foi substituído por um link para a fila real.

O painel financeiro do pedido deixou de exibir margem fixa de 32%. `OrderRow` não contém custo dos itens, portanto a interface informa que a margem não foi calculada; subtotal, desconto, frete e total continuam exibindo os valores do pedido.

## Validação

- Teste direcionado de Tendências: 3 cenários aprovados — padrão real, opt-in demo e rejeição de valores não reconhecidos.
- Testes de `/gestor/compras`: 3 cenários aprovados — indicadores retornados pelo serviço, falha sem fallback fictício e perfil sem cooperativa.
- Teste do painel financeiro: confirma que o valor de margem inventado não aparece quando os custos dos itens estão ausentes.
- `npm run lint`: 0 erros e 873 avisos, igual ao baseline do candidato.
- TypeScript (`npm run typecheck`): aprovado.
- Build de produção (`npm run build`): aprovado; avisos existentes de ambiente, PostCSS, divisão de chunks e tamanho de bundle permanecem.
- Suíte completa no candidato: 5.852 testes aprovados, 68 ignorados; 456 arquivos aprovados e 4 ignorados.

`npm ci` no candidato empilhado reportou zero vulnerabilidades. Esta branch depende do PR #157 (correções de dependências/CI) antes de poder ser integrada à `main`; aquele PR segue aberto e sujeito aos seus próprios gates.

## Limite

Esta rodada ainda não corrige os selos baseados em mock, indicadores BI que caem para dados sintéticos, prazo calculado por status de estoque, alerta sazonal simulado ou limite fixo de 10% enumerados em C-07. Também não comprova consulta remota com sessão autenticada, dados suficientes no ambiente canônico ou jornada real de aprovação.
