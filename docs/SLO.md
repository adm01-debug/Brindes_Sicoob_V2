# Service Level Objectives (SLO) — Promo Gifts

Este documento define os objetivos de nível de serviço para a plataforma Promo Gifts / Sicoob.

## 1. Disponibilidade (Availability)
* **Objetivo:** 99.9% de uptime mensal.
* **Medição:** Probing externo (Sentry/Checkly) nas rotas `/` e `/health-check`.
* **Budget de Erro:** ~43 minutos de downtime/mês.

## 2. Latência (Latency)
* **Objetivo:** 
  * 90% das requisições de API (Edge Functions) < 500ms.
  * 95% do First Contentful Paint (FCP) < 1.5s.
  * 95% do Interaction to Next Paint (INP) < 200ms.
* **Medição:** Web Vitals via Sentry RUM + Structured Logs (request_duration_ms).

## 3. Integridade de Dados (Data Integrity)
* **Objetivo:** 0% de divergência de preços entre Catálogo Externo e Quote Builder.
* **Medição:** Jobs de reconciliação semanais.

## 4. Segurança
* **Objetivo:** Hardening Score 5/5 mantido em todos os ambientes.
* **Medição:** RPC `check_hardening_score()`.
