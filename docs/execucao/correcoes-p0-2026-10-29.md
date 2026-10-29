# Correção P0: Tendências sem dados fictícios por padrão

## Rastreabilidade

- Auditoria de origem: `docs/execucao/lacunas-funcionalidades-2026-10-11.md`, C-07.
- Registros atendidos: ADM-43 e FE-140, que identificaram a demonstração de Tendências ativa para todos os usuários.
- Escopo desta correção: o seletor de modo demo e sua regressão automatizada. Os demais números fixos listados em C-07 continuam pendentes e não são considerados corrigidos por esta entrega.

## Implementação

`src/pages/trends/is-demo-mode.ts` agora desativa a demonstração por padrão, inclusive fora do navegador. O modo fictício só é ativado com opt-in explícito em `?demo=1` ou `?demo=true`. A coleta de dados reais e seus escopos não foram alterados; o banner já existente identifica os dados fictícios quando a demonstração é ativada.

## Validação

- Teste direcionado: 3 cenários aprovados — padrão real, opt-in demo e rejeição de valores não reconhecidos.
- ESLint nos arquivos alterados: aprovado sem avisos.
- TypeScript (`npm run typecheck`): aprovado.
- Build de produção (`npm run build`): aprovado; avisos existentes de ambiente, PostCSS, divisão de chunks e tamanho de bundle permanecem.
- Suíte completa após aplicar também as correções de dependências do PR #157: 5.849 testes aprovados, 68 ignorados; 455 arquivos aprovados e 4 ignorados.

`npm ci` no candidato empilhado reportou zero vulnerabilidades. Esta branch depende do PR #157 (correções de dependências/CI) antes de poder ser integrada à `main`; aquele PR segue aberto e sujeito aos seus próprios gates.

## Limite

Esta entrega fecha apenas o comportamento de Tendências em ADM-43/FE-140. Não comprova consultas remotas com uma sessão autenticada, dados suficientes no ambiente canônico, nem corrige os outros indicadores fictícios enumerados em C-07.
