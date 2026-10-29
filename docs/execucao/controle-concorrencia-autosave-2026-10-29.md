# Concorrência e resiliência do autosave de orçamentos — 29/10/2026

## Escopo e referência

Correção das lacunas P056 e P059 da [revisão do plano de 01/10/2026](revisao-do-plano-2026-10-01.md), revalidadas no código de `main` (`e9d59026793b84fabeaec9da890a068f64d49c3`). O hook de autosave não observava alterações concorrentes e a página acessava `sessionStorage` durante a renderização.

## Alterações

- O autosave observa o evento `storage` para detectar uma revisão divergente gravada em outra aba.
- Antes de gravar, compara novamente o valor atual com a revisão conhecida; isso protege também a janela em que o evento ainda não chegou.
- Usa Web Locks (`navigator.locks`) quando disponível para serializar gravações da mesma chave; navegadores sem suporte mantêm a validação por revisão.
- Ao detectar conflito, bloqueia novas gravações automáticas e informa que o orçamento precisa ser recarregado. A revisão externa permanece preservada.
- O indicador de autosave apresenta “Conflito em outra aba” e explica a ação necessária no tooltip.
- Testes cobrem conflito notificado pelo evento e a corrida detectada imediatamente antes da gravação.
- A criação do identificador de rascunho ocorre em efeito, fora da renderização; quando o navegador bloqueia `sessionStorage`, a tela continua funcionando com um identificador em memória.
- A leitura de rascunho local usa acesso protegido contra exceções do navegador; a cobertura inclui o cenário de armazenamento de sessão bloqueado.

## Validação

- `npm ci --no-audit --no-fund`: concluído; os avisos de scripts de instalação pendentes permanecem os do lockfile.
- `npm test -- tests/hooks/useAutoSave.test.tsx tests/components/quotes/QuoteAutoSave.readonly.test.tsx --reporter=dot`: 8/8 passaram após a mudança P059.
- `npm run typecheck`: passou após a mudança P059.
- `npm run lint:baseline`: passou; 0 erro global e 0 regressão nos dois arquivos de aplicação alterados.
- `npm run build`: passou; avisos existentes de variáveis de ambiente ausentes, PostCSS, import dinâmico e chunks grandes.
- `npm test -- --reporter=dot`: 5.842 passaram e 68 foram ignorados; 452 arquivos passaram e 4 foram ignorados.
- `npm run test:scenarios`: 226/226 passaram.

## Limites

Esta proteção cobre abas do mesmo navegador e mesma origem. Não substitui controle de versão no servidor nem sincronização entre dispositivos. Um conflito exige recarregar o orçamento para evitar escolher silenciosamente qual revisão vence. Sem `sessionStorage`, o identificador do rascunho só permanece estável durante a montagem atual e a recuperação após recarregar fica indisponível; a interface não quebra. Nenhuma tabela, migration, Edge Function, credencial ou banco remoto foi alterado; nenhuma jornada autenticada em homologação foi declarada como validada.

## Estado

Correção em branch isolada, aguardando repetição dos gates completos após a mudança P059 e revisão no PR. P056/P059 só devem ser encerradas depois dos checks remotos e da confirmação de que a mensagem de conflito e o fallback de armazenamento funcionam na jornada do orçamento.
