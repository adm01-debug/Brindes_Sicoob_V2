-- Os timestamps de criação de um orçamento são autoridade do servidor.
-- Mantém a função como SECURITY INVOKER e normaliza apenas chamadas externas;
-- rotinas internas do proprietário preservam seus fluxos históricos auditados.

CREATE OR REPLACE FUNCTION public.guard_quote_governance_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_commercial_keys constant text[] := ARRAY[
    'quote_number', 'client_id', 'client_name', 'client_email', 'client_phone',
    'client_company', 'client_cnpj', 'subtotal', 'discount_percent',
    'discount_amount', 'total', 'notes', 'payment_terms', 'delivery_time',
    'shipping_type', 'shipping_cost', 'internal_notes', 'valid_until',
    'negotiation_markup_percent', 'real_subtotal', 'real_discount_percent',
    'suggested_modifications', 'tags', 'total_cost', 'row_version'
  ];
  v_old_commercial jsonb;
  v_new_commercial jsonb;
  v_call_context text;
  v_table_owner name := pg_catalog.pg_get_userbyid((
    SELECT relation.relowner
    FROM pg_catalog.pg_class AS relation
    WHERE relation.oid = TG_RELID
  ));
BEGIN
  GET DIAGNOSTICS v_call_context = PG_CONTEXT;

  IF current_setting('app.quote_governance_write', true) = 'true'
     AND current_user = v_table_owner THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF NOT COALESCE(OLD.is_latest_version, true)
       OR OLD.status::text NOT IN ('draft', 'revision', 'rejected', 'rejected_singular') THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'Um orçamento enviado ou decidido não pode ser excluído; preserve seu histórico.';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Chamadas externas devem deixar a organização dentro do escopo do ator e
    -- o identificador comercial a cargo do servidor. A RPC canônica
    -- save_quote_atomic é SECURITY INVOKER, mas sua pilha inequívoca permite o
    -- default/trigger de numeração depois de ela validar identidade e escopo.
    -- service_role permanece reservado às rotinas administrativas do backend.
    IF current_user <> v_table_owner
       AND current_user <> 'service_role' THEN
      -- BEFORE INSERT recebe inclusive valores default ou enviados pelo cliente.
      -- Atribuí-los aqui impede retrodatação, data futura e divergência entre os
      -- dois relógios de governança sem depender do caminho de escrita usado.
      NEW.created_at := statement_timestamp();
      NEW.updated_at := NEW.created_at;

      IF NEW.organization_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1
           FROM public.get_user_org_ids(auth.uid()) AS allowed_organization_id
           WHERE allowed_organization_id = NEW.organization_id
         ) THEN
        RAISE EXCEPTION USING
          ERRCODE = '42501',
          MESSAGE = 'A organização do orçamento não pertence ao usuário autenticado.';
      END IF;

      IF COALESCE(NEW.quote_number, '') <> ''
         AND v_call_context !~ 'PL/pgSQL function (public\.)?save_quote_atomic\(' THEN
        RAISE EXCEPTION USING
          ERRCODE = '42501',
          MESSAGE = 'O número do orçamento deve ser gerado pelo servidor.';
      END IF;
    END IF;

    IF COALESCE(NEW.status::text, 'draft') <> 'draft'
       OR NEW.approved_by IS NOT NULL
       OR NEW.approved_at IS NOT NULL
       OR NEW.approved_pdf_url IS NOT NULL
       OR NEW.rejection_notes IS NOT NULL
       OR NEW.client_response IS NOT NULL
       OR NEW.client_response_at IS NOT NULL
       OR NEW.client_response_notes IS NOT NULL
       OR NEW.sent_at IS NOT NULL
       OR NEW.deleted_at IS NOT NULL
       OR COALESCE(NEW.synced_to_bitrix, false) IS TRUE
       OR NEW.synced_at IS NOT NULL
       OR NEW.bitrix_deal_id IS NOT NULL
       OR NEW.bitrix_quote_id IS NOT NULL
       OR NEW.parent_quote_id IS NOT NULL
       OR NEW.consolidation_id IS NOT NULL
       OR (
         (
           NEW.reorder_source_order_id IS NOT NULL
           OR NEW.reorder_source_quote_id IS NOT NULL
           OR NEW.catalog_revalidated_at IS NOT NULL
           OR NEW.catalog_valid_until IS NOT NULL
           OR COALESCE(NEW.reorder_price_changed_items, 0) <> 0
         )
         AND NOT (
           current_user = v_table_owner
           AND current_setting('app.sicoob_reorder_operation', true) = 'create'
         )
       )
       OR COALESCE(NEW.catalog_stock_is_reserved, false) IS TRUE
       OR NEW.version IS DISTINCT FROM 1
       OR NEW.row_version IS DISTINCT FROM 1
       OR NEW.is_latest_version IS DISTINCT FROM true
       OR NEW.is_active IS DISTINCT FROM true THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'A criação de orçamento deve iniciar como rascunho canônico, sem decisão ou histórico forjado.';
    END IF;
    RETURN NEW;
  END IF;

  -- A consolidação histórica é SECURITY DEFINER e já valida papel, Singular,
  -- elegibilidade e locks. Ela só pode preencher o vínculo uma vez e não pode
  -- aproveitar esta exceção estreita para alterar qualquer outro campo.
  IF TG_OP = 'UPDATE'
     AND current_user = v_table_owner
     AND OLD.status::text = 'approved_singular'
     AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND OLD.consolidation_id IS NULL
     AND NEW.consolidation_id IS NOT NULL
     AND (to_jsonb(NEW) - ARRAY['consolidation_id', 'updated_at'])
         IS NOT DISTINCT FROM
         (to_jsonb(OLD) - ARRAY['consolidation_id', 'updated_at']) THEN
    RETURN NEW;
  END IF;

  -- A recompra originada de pedido primeiro reutiliza a RPC transacional
  -- legada e, em seguida, anexa o snapshot vigente do catálogo ao rascunho
  -- recém-criado. A exceção exige a pilha real da RPC SECURITY DEFINER e
  -- limita a alteração exatamente aos campos de linhagem e validade.
  IF TG_OP = 'UPDATE'
     AND current_user = v_table_owner
     AND v_call_context ~ 'PL/pgSQL function (public\.)?reorder_sicoob_order_as_quote\('
     AND OLD.reorder_source_order_id IS NULL
     AND OLD.reorder_source_quote_id IS NULL
     AND OLD.catalog_revalidated_at IS NULL
     AND NEW.reorder_source_order_id IS NOT NULL
     AND NEW.reorder_source_quote_id IS NULL
     AND NEW.catalog_revalidated_at IS NOT NULL
     AND NEW.catalog_valid_until > NEW.catalog_revalidated_at
     AND COALESCE(NEW.catalog_stock_is_reserved, false) IS FALSE
     AND COALESCE(NEW.reorder_price_changed_items, 0) >= 0
     AND (to_jsonb(NEW) - ARRAY[
           'reorder_source_order_id', 'catalog_revalidated_at',
           'catalog_valid_until', 'catalog_stock_is_reserved',
           'reorder_price_changed_items', 'updated_at'
         ]) IS NOT DISTINCT FROM
         (to_jsonb(OLD) - ARRAY[
           'reorder_source_order_id', 'catalog_revalidated_at',
           'catalog_valid_until', 'catalog_stock_is_reserved',
           'reorder_price_changed_items', 'updated_at'
         ]) THEN
    RETURN NEW;
  END IF;

  -- A remoção de um usuário no Auth aciona a FK histórica
  -- quotes.seller_id ON DELETE SET NULL. A atualização acontece em um trigger
  -- referencial aninhado, com a identidade do proprietário da tabela. Aceita-se
  -- somente essa nulificação e nenhuma outra alteração no orçamento.
  IF TG_OP = 'UPDATE'
     AND pg_trigger_depth() > 1
     AND current_user = v_table_owner
     AND OLD.seller_id IS NOT NULL
     AND NEW.seller_id IS NULL
     AND (to_jsonb(NEW) - ARRAY['seller_id', 'updated_at'])
         IS NOT DISTINCT FROM
         (to_jsonb(OLD) - ARRAY['seller_id', 'updated_at']) THEN
    RETURN NEW;
  END IF;

  -- Um UPDATE idempotente ainda acionaria os gatilhos posteriores de versão,
  -- row_version e updated_at. Recusá-lo aqui preserva o snapshot de propostas
  -- já enviadas e impede invalidar aprovações sem mudança comercial real.
  IF to_jsonb(NEW) IS NOT DISTINCT FROM to_jsonb(OLD) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Atualização sem alteração efetiva não é permitida no orçamento.';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.approved_pdf_url IS DISTINCT FROM OLD.approved_pdf_url
     OR NEW.rejection_notes IS DISTINCT FROM OLD.rejection_notes
     OR NEW.client_response IS DISTINCT FROM OLD.client_response
     OR NEW.client_response_at IS DISTINCT FROM OLD.client_response_at
     OR NEW.client_response_notes IS DISTINCT FROM OLD.client_response_notes
     OR NEW.version IS DISTINCT FROM OLD.version
     OR NEW.parent_quote_id IS DISTINCT FROM OLD.parent_quote_id
     OR NEW.is_latest_version IS DISTINCT FROM OLD.is_latest_version
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR (
       NEW.updated_at IS DISTINCT FROM OLD.updated_at
       AND NOT (
         current_setting('app.quote_atomic_save', true) = 'true'
         AND v_call_context ~ 'PL/pgSQL function (public\.)?save_quote_atomic\('
         AND COALESCE(OLD.is_latest_version, true)
         AND OLD.status::text IN ('draft', 'revision', 'rejected', 'rejected_singular')
       )
     )
     OR NEW.sent_at IS DISTINCT FROM OLD.sent_at
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.pa_id IS DISTINCT FROM OLD.pa_id
     OR NEW.singular_id IS DISTINCT FROM OLD.singular_id
     OR NEW.consolidation_id IS DISTINCT FROM OLD.consolidation_id
     OR NEW.reorder_source_order_id IS DISTINCT FROM OLD.reorder_source_order_id
     OR NEW.reorder_source_quote_id IS DISTINCT FROM OLD.reorder_source_quote_id
     OR NEW.catalog_revalidated_at IS DISTINCT FROM OLD.catalog_revalidated_at
     OR NEW.catalog_valid_until IS DISTINCT FROM OLD.catalog_valid_until
     OR NEW.catalog_stock_is_reserved IS DISTINCT FROM OLD.catalog_stock_is_reserved
     OR NEW.reorder_price_changed_items IS DISTINCT FROM OLD.reorder_price_changed_items
     OR NEW.synced_to_bitrix IS DISTINCT FROM OLD.synced_to_bitrix
     OR NEW.synced_at IS DISTINCT FROM OLD.synced_at
     OR NEW.bitrix_deal_id IS DISTINCT FROM OLD.bitrix_deal_id
     OR NEW.bitrix_quote_id IS DISTINCT FROM OLD.bitrix_quote_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Campos de governança do orçamento só podem ser alterados por fluxo autorizado.';
  END IF;

  IF NOT COALESCE(OLD.is_latest_version, true)
     OR OLD.status::text NOT IN ('draft', 'revision', 'rejected', 'rejected_singular') THEN
    SELECT COALESCE(jsonb_object_agg(entry.key, entry.value), '{}'::jsonb)
      INTO v_old_commercial
    FROM jsonb_each(to_jsonb(OLD)) AS entry
    WHERE entry.key = ANY(v_commercial_keys);

    SELECT COALESCE(jsonb_object_agg(entry.key, entry.value), '{}'::jsonb)
      INTO v_new_commercial
    FROM jsonb_each(to_jsonb(NEW)) AS entry
    WHERE entry.key = ANY(v_commercial_keys);

    IF v_new_commercial IS DISTINCT FROM v_old_commercial THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'O conteúdo comercial de um orçamento enviado ou decidido é imutável.';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.guard_quote_governance_write() IS
  'Protege a governança do orçamento e canonicaliza created_at/updated_at em inserções externas.';

NOTIFY pgrst, 'reload schema';
