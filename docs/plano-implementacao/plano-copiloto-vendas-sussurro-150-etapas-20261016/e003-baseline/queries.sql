-- ============================================================
-- E003 – Baseline 90 dias | Brindes Sicoob V2
-- Período: 2026-07-18 a 2026-10-16
-- Executado em: 2026-10-16
-- Banco: Supabase – Gestão de Clientes (CRM)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Q0: Verificação de volume de dados disponíveis
-- ────────────────────────────────────────────────────────────
SELECT 'deals' AS tabela, COUNT(*) AS total_registros,
       MIN(created_at) AS mais_antigo, MAX(created_at) AS mais_recente
FROM deals
UNION ALL
SELECT 'proposals', COUNT(*), MIN(created_at), MAX(created_at) FROM proposals
UNION ALL
SELECT 'seller_daily_metrics', COUNT(*), MIN(metric_date::timestamptz), MAX(metric_date::timestamptz) FROM seller_daily_metrics
UNION ALL
SELECT 'whatsapp_messages', COUNT(*), MIN(sent_at), MAX(sent_at) FROM whatsapp_messages;

-- ────────────────────────────────────────────────────────────
-- Q1: Deals criados no período por vendedor
-- ────────────────────────────────────────────────────────────
SELECT
  s.name AS vendedor,
  COUNT(d.id) AS deals_criados
FROM salespeople s
LEFT JOIN deals d
  ON d.user_id = s.auth_user_id
  AND d.created_at >= '2026-07-18'
  AND d.created_at <  '2026-10-17'
WHERE s.is_active = true
GROUP BY s.name
ORDER BY deals_criados DESC;

-- ────────────────────────────────────────────────────────────
-- Q2: Deals ganhos no período por vendedor
-- Critério: status = 'ganho'  (valores encontrados no banco: 'ganho', 'aberto')
-- ────────────────────────────────────────────────────────────
SELECT
  s.name AS vendedor,
  COUNT(d.id) FILTER (WHERE d.status = 'ganho') AS deals_ganhos
FROM salespeople s
LEFT JOIN deals d
  ON d.user_id = s.auth_user_id
  AND d.created_at >= '2026-07-18'
  AND d.created_at <  '2026-10-17'
WHERE s.is_active = true
GROUP BY s.name
ORDER BY deals_ganhos DESC;

-- ────────────────────────────────────────────────────────────
-- Q3: Taxa de conversão = ganhos / criados × 100
-- ────────────────────────────────────────────────────────────
SELECT
  s.name AS vendedor,
  COUNT(d.id) AS deals_criados,
  COUNT(d.id) FILTER (WHERE d.status = 'ganho') AS deals_ganhos,
  ROUND(
    CASE WHEN COUNT(d.id) > 0
         THEN COUNT(d.id) FILTER (WHERE d.status = 'ganho')::numeric / COUNT(d.id) * 100
         ELSE 0
    END, 1
  ) AS taxa_conversao_pct
FROM salespeople s
LEFT JOIN deals d
  ON d.user_id = s.auth_user_id
  AND d.created_at >= '2026-07-18'
  AND d.created_at <  '2026-10-17'
WHERE s.is_active = true
GROUP BY s.name;

-- ────────────────────────────────────────────────────────────
-- Q4: Ticket médio (avg valor dos deals ganhos no período)
-- ────────────────────────────────────────────────────────────
SELECT
  s.name AS vendedor,
  ROUND(AVG(d.valor) FILTER (WHERE d.status = 'ganho')::numeric, 2) AS ticket_medio_r
FROM salespeople s
LEFT JOIN deals d
  ON d.user_id = s.auth_user_id
  AND d.created_at >= '2026-07-18'
  AND d.created_at <  '2026-10-17'
WHERE s.is_active = true
GROUP BY s.name;

-- ────────────────────────────────────────────────────────────
-- Q5: Ciclo médio de venda em dias (created_at → closed_at nos ganhos)
-- ────────────────────────────────────────────────────────────
SELECT
  s.name AS vendedor,
  ROUND(
    AVG(
      EXTRACT(EPOCH FROM (d.closed_at - d.created_at)) / 86400
    ) FILTER (WHERE d.status = 'ganho' AND d.closed_at IS NOT NULL)::numeric,
    1
  ) AS ciclo_medio_dias
FROM salespeople s
LEFT JOIN deals d
  ON d.user_id = s.auth_user_id
  AND d.created_at >= '2026-07-18'
  AND d.created_at <  '2026-10-17'
WHERE s.is_active = true
GROUP BY s.name;

-- ────────────────────────────────────────────────────────────
-- Q6: Total de proposals geradas no período por vendedor
-- ────────────────────────────────────────────────────────────
SELECT
  s.name AS vendedor,
  COUNT(p.id) AS proposals_geradas
FROM salespeople s
LEFT JOIN proposals p
  ON p.user_id = s.auth_user_id
  AND p.created_at >= '2026-07-18'
  AND p.created_at <  '2026-10-17'
WHERE s.is_active = true
GROUP BY s.name
ORDER BY proposals_geradas DESC;

-- ────────────────────────────────────────────────────────────
-- Q7: Taxa proposal → deal ganho
-- Lógica: proposal com deal_id vinculado a deal ganho / total proposals
-- ────────────────────────────────────────────────────────────
SELECT
  s.name AS vendedor,
  COUNT(p.id) AS proposals_geradas,
  COUNT(p.id) FILTER (
    WHERE EXISTS (
      SELECT 1 FROM deals d
      WHERE d.id = p.deal_id AND d.status = 'ganho'
    )
  ) AS proposals_com_deal_ganho,
  ROUND(
    CASE WHEN COUNT(p.id) > 0
         THEN COUNT(p.id) FILTER (
           WHERE EXISTS (
             SELECT 1 FROM deals d
             WHERE d.id = p.deal_id AND d.status = 'ganho'
           )
         )::numeric / COUNT(p.id) * 100
         ELSE 0
    END, 1
  ) AS taxa_proposal_ganho_pct
FROM salespeople s
LEFT JOIN proposals p
  ON p.user_id = s.auth_user_id
  AND p.created_at >= '2026-07-18'
  AND p.created_at <  '2026-10-17'
WHERE s.is_active = true
GROUP BY s.name;

-- ────────────────────────────────────────────────────────────
-- Q8: Tempo médio de primeira resposta WhatsApp
-- Nota: whatsapp_messages está vazia em 2026-10-16; métrica não mensurável
-- ────────────────────────────────────────────────────────────
SELECT
  s.name AS vendedor,
  ROUND(AVG(sdm.avg_response_time_minutes), 0) AS avg_resp_min_sdm
FROM salespeople s
LEFT JOIN seller_daily_metrics sdm
  ON sdm.user_id = s.auth_user_id
  AND sdm.metric_date >= '2026-07-18'
  AND sdm.metric_date <= '2026-10-16'
WHERE s.is_active = true
GROUP BY s.name;

-- ────────────────────────────────────────────────────────────
-- Q9: Query consolidada (todas as métricas em uma linha por vendedor)
-- ────────────────────────────────────────────────────────────
WITH d90 AS (
  SELECT
    d.user_id,
    COUNT(*) AS criados,
    COUNT(*) FILTER (WHERE d.status = 'ganho') AS ganhos,
    AVG(d.valor) FILTER (WHERE d.status = 'ganho') AS ticket_medio,
    AVG(EXTRACT(EPOCH FROM (d.closed_at - d.created_at)) / 86400)
      FILTER (WHERE d.status = 'ganho' AND d.closed_at IS NOT NULL) AS ciclo_dias
  FROM deals d
  WHERE d.created_at >= '2026-07-18' AND d.created_at < '2026-10-17'
  GROUP BY d.user_id
),
p90 AS (
  SELECT
    p.user_id,
    COUNT(*) AS total_prop,
    COUNT(*) FILTER (
      WHERE EXISTS (SELECT 1 FROM deals d WHERE d.id = p.deal_id AND d.status = 'ganho')
    ) AS prop_ganhas
  FROM proposals p
  WHERE p.created_at >= '2026-07-18' AND p.created_at < '2026-10-17'
  GROUP BY p.user_id
),
sdm90 AS (
  SELECT user_id, ROUND(AVG(avg_response_time_minutes)::numeric, 0) AS avg_resp_min
  FROM seller_daily_metrics
  WHERE metric_date >= '2026-07-18' AND metric_date <= '2026-10-16'
  GROUP BY user_id
)
SELECT
  s.name                                                       AS vendedor,
  COALESCE(d90.criados, 0)                                    AS deals_criados,
  COALESCE(d90.ganhos, 0)                                     AS deals_ganhos,
  ROUND(CASE WHEN COALESCE(d90.criados,0) > 0
    THEN d90.ganhos::numeric / d90.criados * 100 ELSE 0 END,1) AS taxa_conversao_pct,
  ROUND(COALESCE(d90.ticket_medio, 0)::numeric, 2)            AS ticket_medio_r,
  ROUND(COALESCE(d90.ciclo_dias, 0)::numeric, 1)              AS ciclo_medio_dias,
  COALESCE(p90.total_prop, 0)                                 AS proposals_geradas,
  ROUND(CASE WHEN COALESCE(p90.total_prop,0) > 0
    THEN p90.prop_ganhas::numeric / p90.total_prop * 100 ELSE 0 END,1) AS taxa_prop_ganho_pct,
  COALESCE(sdm90.avg_resp_min, 0)                             AS avg_resp_wpp_min
FROM salespeople s
LEFT JOIN d90  ON d90.user_id  = s.auth_user_id
LEFT JOIN p90  ON p90.user_id  = s.auth_user_id
LEFT JOIN sdm90 ON sdm90.user_id = s.auth_user_id
WHERE s.is_active = true
ORDER BY deals_ganhos DESC, deals_criados DESC;
