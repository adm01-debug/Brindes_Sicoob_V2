# E024 — Política de Retenção de Dados

**Fase:** F03 — Conformidade, LGPD e Regras do WhatsApp  
**Data:** 2026-10-16  
**Status:** Rascunho — aguarda revisão de Joaquim  
**Princípio aplicado:** LGPD art. 5º, X (minimização) e art. 16 (término do tratamento)

---

## 1. Tabela de Retenção

| Tabela | Dados armazenados | Retenção | Motivo | Ação ao expirar |
|--------|-------------------|---------|--------|------------------|
| `copilot_messages` | Conteúdo raw das mensagens | **90 dias** | Minimização de dados; LLM não precisa de histórico longo | `DELETE CASCADE` completo |
| `copilot_insights` | Insights gerados pela IA | **180 dias** | Melhoria do modelo de sugestão | Anonimizar + agregar estatísticas |
| `copilot_suggestions` | Sugestões geradas ao vendedor | **30 dias** | Auditoria de qualidade interna | `DELETE` |
| `copilot_feedback` | Avaliações do vendedor sobre sugestões | **2 anos** | Dados para melhoria futura (treinamento fine-tuning) | Anonimizar (remover `contact_id`) |
| `copilot_events` | Log de eventos do sistema | **90 dias** | Debug e auditoria operacional | `DELETE` (exceto eventos de opt-out — ver nota) |
| `copilot_conversations` | Metadados (sem conteúdo) | **365 dias** | Relatórios de desempenho do vendedor | Anonimizar (remover `contact_id`, manter agregados) |
| `copilot_contacts` | Nome, telefone, opt-out status | **5 anos após último contato** | Histórico de relacionamento | Anonimizar |

> **Nota importante:** Eventos de opt-out em `copilot_events` têm retenção de **5 anos** para fins de evidência em fiscalização da ANPD. Eles devem ser excluídos do job normal de limpeza de 90 dias via cláusula `WHERE event_type != 'opt_out_registered'`.

---

## 2. Job de Limpeza Automatizado

### Requisito: extensão pg_cron no Supabase

```sql
-- Habilitar pg_cron (executar uma vez, como superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### Job diário de limpeza (executa às 02:00 BRT)

```sql
SELECT cron.schedule(
  'copilot-data-retention-cleanup',
  '0 5 * * *',
  $cron$
  DO $$
  DECLARE
    v_deleted_messages   INTEGER;
    v_deleted_suggestions INTEGER;
    v_deleted_events     INTEGER;
    v_anonymized_insights INTEGER;
    v_anonymized_feedback INTEGER;
    v_anonymized_convs    INTEGER;
  BEGIN
    DELETE FROM copilot_messages
    WHERE created_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS v_deleted_messages = ROW_COUNT;

    DELETE FROM copilot_suggestions
    WHERE created_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS v_deleted_suggestions = ROW_COUNT;

    DELETE FROM copilot_events
    WHERE created_at < NOW() - INTERVAL '90 days'
      AND event_type NOT IN ('opt_out_registered', 'opt_in_restored');
    GET DIAGNOSTICS v_deleted_events = ROW_COUNT;

    UPDATE copilot_insights
    SET contact_id = NULL, conversation_id = NULL, anonymized_at = NOW()
    WHERE created_at < NOW() - INTERVAL '180 days' AND anonymized_at IS NULL;
    GET DIAGNOSTICS v_anonymized_insights = ROW_COUNT;

    UPDATE copilot_feedback
    SET contact_id = NULL, anonymized_at = NOW()
    WHERE created_at < NOW() - INTERVAL '2 years' AND anonymized_at IS NULL;
    GET DIAGNOSTICS v_anonymized_feedback = ROW_COUNT;

    UPDATE copilot_conversations
    SET contact_id = NULL, anonymized_at = NOW()
    WHERE created_at < NOW() - INTERVAL '365 days' AND anonymized_at IS NULL;
    GET DIAGNOSTICS v_anonymized_convs = ROW_COUNT;

    INSERT INTO copilot_events (event_type, event_data, created_at)
    VALUES (
      'retention_job_executed',
      jsonb_build_object(
        'deleted_messages', v_deleted_messages,
        'deleted_suggestions', v_deleted_suggestions,
        'deleted_events', v_deleted_events,
        'anonymized_insights', v_anonymized_insights,
        'anonymized_feedback', v_anonymized_feedback,
        'anonymized_convs', v_anonymized_convs,
        'job_version', '1.0'
      ),
      NOW()
    );
  END;
  $$;
  $cron$
);
```

---

## 3. Política de Backup

| Plano | Retenção de backup | Observação |
|-------|-------------------|------------|
| Free | 1 dia | Insuficiente para produção |
| Pro | 7 dias (PITR) | Mínimo aceitável |
| Team/Enterprise | 30 dias (PITR) | Recomendado |

---

## 4. Campos de Controle nas Tabelas

```sql
created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
anonymized_at TIMESTAMPTZ,
deleted_at    TIMESTAMPTZ
```

---

## Referências

- LGPD art. 5º (minimização), art. 16 (término do tratamento)
- E022 — RIPD Simplificado
- E028 — Trilha de Auditoria
- [Supabase pg_cron](https://supabase.com/docs/guides/database/extensions/pg_cron)
