# Desempenho — objetivos e estado verificado

Este documento descreve práticas e metas; não comprova que serviços ou limites
operacionais estejam configurados no ambiente publicado. Os resultados medidos
devem ser registrados com data, URL, SHA e execução reproduzível em
[`PERFORMANCE_AUDIT.md`](./PERFORMANCE_AUDIT.md).

## Frontend
- Code splitting with React.lazy()
- Image optimization (WebP)
- Implement virtual scrolling
- Use React Query for caching

## Backend
- Database indexing
- Cache de backend: avaliar e medir antes de selecionar uma tecnologia; não há
  evidência neste repositório de uma camada Redis ativa.
- CDN para assets: confirmar no provedor do ambiente.
- Compressão: confirmar nos headers efetivamente servidos.

## Monitoring
- Lighthouse: o workflow configura pontuação mínima de 0,90 para performance,
  acessibilidade, boas práticas e SEO. Isso é um gate por execução, não uma
  medição de todas as jornadas nem evidência de meta acima de 95.
- Core Web Vitals: o código atual contém coleta via `web-vitals` e mantém a
  rota `/admin/performance`. A existência do código não prova ingestão ativa,
  dashboard operacional ou configuração Sentry no ambiente.
- Taxa de erro: meta <0,1%; sem medição operacional recente anexada aqui.

## Targets (Google Core Web Vitals — official thresholds)
| Metric | Good | Needs Improv. | Poor |
|--------|------|---------------|------|
| LCP    | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| INP    | ≤ 200ms | ≤ 500ms | > 500ms |
| CLS    | ≤ 0.1 | ≤ 0.25 | > 0.25 |
| FCP    | ≤ 1.8s | ≤ 3.0s | > 3.0s |
| TTFB   | ≤ 800ms | ≤ 1800ms | > 1800ms |

