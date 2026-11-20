# PLC-39 — CSP e cabeçalhos de segurança ausentes na raiz do domínio publicado

- Origem: D. Observabilidade e segurança de borda (Planos de melhorias e correções)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: P
- Impacto no negocio: a página de entrada do portal fica sem proteção contra injeção de scripts e clickjacking.

## Estado real conferido

PARCIAL - CSP e cabecalhos CONFIGURADOS: vercel.json:9-43 aplica headers para `/:path*` (Strict-Transport-Security, Content-Security-Policy com frame-ancestors self), public/_headers:1-12 mantem politica equivalente e tests/scenarios/csp-providers.mjs:13-16 prova a equivalencia Cloudflare/Vercel. PENDENTE: verificar resposta real publicada em producao (nao verificada) e decidir CSP com nonce.

## O que falta (auditoria)

regra explícita para `/` (ou `source: "/(.*)"`) com teste automatizado da resposta publicada, e CSP com nonce.

## Camadas afetadas

- 

## Regras de negocio

- ver `docs/agentes/regras-dominio.md`

## Raio de impacto

- 

## Dependencias

- 

## Criterio de aceite

- 

## Estado final

- NAO INICIADO
