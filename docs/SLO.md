# 📉 Metas de Nível de Serviço (SLO)

Este documento define os Service Level Objectives (SLOs) para a plataforma **Promo Gifts / Sicoob**.

## 1. Disponibilidade (Uptime)

*   **Meta**: 99.9% de uptime mensal.
*   **Janela de Erro Mensal**: ~43 minutos.
*   **SLI (Service Level Indicator)**: Porcentagem de requisições bem-sucedidas (status < 500) nas Edge Functions e Dashboard.

## 2. Performance (Latência)

*   **Dashboard / UI**:
    *   LCP (Largest Contentful Paint) < 2.5s em 90% das sessões.
    *   INP (Interaction to Next Paint) < 200ms em 95% das sessões.
*   **API / Edge Functions**:
    *   95% das requisições respondidas em < 400ms.
    *   Sincronização com Bitrix24 concluída em < 5s (assíncrona).

## 3. Integridade de Dados

*   **Meta**: 0% de divergência de preços em orçamentos convertidos.
*   **SLI**: Comparação automatizada entre `quote_items.unit_price` e `order_items.unit_price` no momento da conversão.

## 4. Segurança

*   **Meta**: Tempo de resposta a incidentes críticos (P0) < 4h.
*   **SLI**: Timestamp da detecção automática (bot_detection_log) vs timestamp da ação mitigatória.
