-- Exercita a migration de governança num PostgreSQL 17 isolado.
-- A execução é feita por scripts/qa/simular-governanca-orcamento.sh.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA storage;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text NOT NULL, name text NOT NULL, owner uuid);
CREATE FUNCTION storage.foldername(path text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT string_to_array(path, '/')
$$;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE TYPE public.app_role AS ENUM ('admin','manager','supervisor','dev','vendedor','gestor_compras');
CREATE TYPE public.quote_status AS ENUM ('draft','pending','sent','approved','rejected','expired','pending_approval','pending_singular_approval','approved_singular','rejected_singular');
CREATE TABLE public.profiles (user_id uuid PRIMARY KEY, cooperativa_id uuid, pa_id uuid, role text);
CREATE TABLE public.workspace_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
  title text NOT NULL, message text NOT NULL, type text NOT NULL DEFAULT 'info',
  category text NOT NULL DEFAULT 'system', action_url text, metadata jsonb DEFAULT '{}'::jsonb
);
CREATE TABLE public.organization_members (organization_id uuid, user_id uuid);
CREATE TABLE public.user_roles (user_id uuid, role public.app_role, UNIQUE(user_id, role));
CREATE FUNCTION public.get_user_org_ids(p_user_id uuid) RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = p_user_id
$$;
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_number text NOT NULL DEFAULT gen_random_uuid()::text,
  seller_id uuid NOT NULL, organization_id uuid, pa_id uuid, singular_id uuid,
  status public.quote_status NOT NULL DEFAULT 'draft', row_version integer NOT NULL DEFAULT 1,
  subtotal numeric NOT NULL DEFAULT 100, discount_percent numeric NOT NULL DEFAULT 0, negotiation_markup_percent numeric NOT NULL DEFAULT 0,
  real_subtotal numeric, real_discount_percent numeric, approved_pdf_url text, approved_by uuid, approved_at timestamptz,
  rejection_notes text, deleted_at timestamptz, is_latest_version boolean NOT NULL DEFAULT true, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.seller_discount_limits (user_id uuid PRIMARY KEY, max_discount_percent numeric NOT NULL);
CREATE TABLE public.discount_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_id uuid NOT NULL REFERENCES public.quotes(id), seller_id uuid NOT NULL,
  requested_discount_percent numeric NOT NULL, max_allowed_percent numeric NOT NULL, seller_notes text,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')), admin_id uuid, admin_notes text,
  responded_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.quote_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_id uuid NOT NULL REFERENCES public.quotes(id), user_id uuid,
  action text NOT NULL, description text NOT NULL, field_changed text, old_value text, new_value text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE FUNCTION public.bump_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.row_version := OLD.row_version + 1; RETURN NEW; END
$$;
CREATE TRIGGER zz_bump_version BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.bump_version();
GRANT USAGE ON SCHEMA public, auth TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.quotes, public.discount_approval_requests, public.quote_history TO authenticated;
GRANT SELECT ON public.workspace_notifications TO authenticated;
GRANT SELECT ON public.seller_discount_limits, public.user_roles, public.profiles, public.organization_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON storage.objects TO authenticated;
INSERT INTO public.profiles VALUES
  ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000201','vendedor'),
  ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000101',NULL,'gestor_compras'),
  ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000102',NULL,'gestor_compras'),
  ('00000000-0000-0000-0000-000000000004',NULL,NULL,'admin');
INSERT INTO public.user_roles VALUES
  ('00000000-0000-0000-0000-000000000001','vendedor'),
  ('00000000-0000-0000-0000-000000000002','gestor_compras'),
  ('00000000-0000-0000-0000-000000000003','gestor_compras'),
  ('00000000-0000-0000-0000-000000000004','admin');
INSERT INTO public.seller_discount_limits VALUES ('00000000-0000-0000-0000-000000000001', 10);
\i /workspace/supabase/migrations/20260927171216_quote_approval_security_hardening.sql
\i /workspace/supabase/migrations/20260928182000_idempotent_quote_status_notifications.sql
CREATE TRIGGER bbb_validate_real_discount
BEFORE INSERT OR UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.validate_quote_real_discount();

SET ROLE authenticated;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
INSERT INTO public.quotes(id,seller_id,singular_id,status,subtotal,discount_percent,negotiation_markup_percent)
VALUES ('00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000101','draft',100,15,0);
DO $$ BEGIN
  BEGIN
    INSERT INTO public.discount_approval_requests(quote_id,seller_id,requested_discount_percent,max_allowed_percent,status)
    VALUES ('00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000001',15,10,'approved');
    RAISE EXCEPTION 'autoaprovação direta foi aceita';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
SELECT request_id FROM public.request_discount_approval_atomic('00000000-0000-0000-0000-000000000301',1,15,'teste');
DO $$ BEGIN
  IF (SELECT status::text FROM public.quotes WHERE id='00000000-0000-0000-0000-000000000301') <> 'pending_approval' THEN RAISE EXCEPTION 'pedido não transitou'; END IF;
  IF (SELECT count(*) FROM public.discount_approval_requests WHERE quote_id='00000000-0000-0000-0000-000000000301') <> 1 THEN RAISE EXCEPTION 'pedido ausente'; END IF;
END $$;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
DO $$ DECLARE r uuid := (SELECT id FROM public.discount_approval_requests); BEGIN
  BEGIN PERFORM public.respond_discount_approval_atomic(r,2,true,NULL); RAISE EXCEPTION 'comprador de outra Singular respondeu'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
SELECT request_status FROM public.respond_discount_approval_atomic((SELECT id FROM public.discount_approval_requests),2,false,'ajuste');
DO $$ BEGIN
  IF (SELECT status::text FROM public.quotes WHERE id='00000000-0000-0000-0000-000000000301') <> 'draft' THEN RAISE EXCEPTION 'recusa não retornou a rascunho'; END IF;
  IF (SELECT status FROM public.discount_approval_requests LIMIT 1) <> 'rejected' THEN RAISE EXCEPTION 'recusa não foi persistida'; END IF;
END $$;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
DO $$ BEGIN
  BEGIN
    UPDATE public.quotes SET status='approved' WHERE id='00000000-0000-0000-0000-000000000301';
    RAISE EXCEPTION 'alteração direta de status foi aceita';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
SELECT request_id FROM public.request_discount_approval_atomic('00000000-0000-0000-0000-000000000301',3,15,'segunda solicitação');
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
SELECT request_status FROM public.respond_discount_approval_atomic((SELECT id FROM public.discount_approval_requests WHERE status='pending'),4,true,'aprovado');
SELECT status, approved_pdf_url FROM public.approve_quote_with_pdf_atomic(
  '00000000-0000-0000-0000-000000000301', 5,
  'quotes/00000000-0000-0000-0000-000000000301/proposta-assinada.pdf', 'documento validado'
);
DO $$ BEGIN
  IF (SELECT status::text FROM public.quotes WHERE id='00000000-0000-0000-0000-000000000301') <> 'approved' THEN RAISE EXCEPTION 'aprovação com PDF não concluiu'; END IF;
  IF (SELECT approved_pdf_url FROM public.quotes WHERE id='00000000-0000-0000-0000-000000000301') <> 'quotes/00000000-0000-0000-0000-000000000301/proposta-assinada.pdf' THEN RAISE EXCEPTION 'caminho privado não foi salvo'; END IF;
  BEGIN
    UPDATE public.quotes SET subtotal=90 WHERE id='00000000-0000-0000-0000-000000000301';
    RAISE EXCEPTION 'mudança de conteúdo reutilizou aprovação antiga';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
SELECT public.append_quote_history_note(
  '00000000-0000-0000-0000-000000000301', 'note', 'Anotação legítima do vendedor'
);
DO $$ BEGIN
  BEGIN
    INSERT INTO public.quote_history(quote_id,user_id,action,description)
    VALUES ('00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000001','note','forjada');
    RAISE EXCEPTION 'histórico direto foi aceito';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
INSERT INTO public.quotes(id,seller_id,singular_id,status,subtotal,discount_percent)
VALUES ('00000000-0000-0000-0000-000000000302','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000101','draft',100,0);
SELECT status FROM public.bulk_update_quote_status_atomic(
  ARRAY['00000000-0000-0000-0000-000000000302'::uuid], ARRAY[1], 'sent'
);
DO $$ BEGIN
  IF (SELECT status::text FROM public.quotes WHERE id='00000000-0000-0000-0000-000000000302') <> 'sent' THEN RAISE EXCEPTION 'transição atômica não aplicou'; END IF;
END $$;
CREATE TEMP TABLE unauthorized_retry_snapshot AS
SELECT row_version,
       (SELECT count(*) FROM public.quote_history
        WHERE quote_id='00000000-0000-0000-0000-000000000302') AS history_count
FROM public.quotes
WHERE id='00000000-0000-0000-0000-000000000302';
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
DO $$ BEGIN
  BEGIN
    PERFORM public.bulk_update_quote_status_atomic(
      ARRAY['00000000-0000-0000-0000-000000000302'::uuid],
      ARRAY[(SELECT row_version FROM public.quotes WHERE id='00000000-0000-0000-0000-000000000302')],
      'sent'
    );
    RAISE EXCEPTION 'retry do mesmo status por outra Singular foi aceito';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF (SELECT row_version FROM public.quotes WHERE id='00000000-0000-0000-0000-000000000302')
     <> (SELECT row_version FROM unauthorized_retry_snapshot) THEN
    RAISE EXCEPTION 'retry não autorizado alterou row_version';
  END IF;
  IF (SELECT count(*) FROM public.quote_history
      WHERE quote_id='00000000-0000-0000-0000-000000000302')
     <> (SELECT history_count FROM unauthorized_retry_snapshot) THEN
    RAISE EXCEPTION 'retry não autorizado gravou histórico';
  END IF;
  IF has_function_privilege(
       'authenticated',
       'public.assert_quote_transition(uuid, public.quotes, text)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'função auxiliar de transição continua exposta';
  END IF;
END $$;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
INSERT INTO public.quotes(id,seller_id,singular_id,status,subtotal,discount_percent)
VALUES ('00000000-0000-0000-0000-000000000303','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000101','draft',100,0);
SELECT status FROM public.bulk_update_quote_status_atomic(
  ARRAY['00000000-0000-0000-0000-000000000303'::uuid],
  ARRAY[1],
  'pending_singular_approval'
);
CREATE TEMP TABLE retry_snapshot AS
SELECT row_version FROM public.quotes WHERE id='00000000-0000-0000-0000-000000000303';
SELECT status FROM public.bulk_update_quote_status_atomic(
  ARRAY['00000000-0000-0000-0000-000000000303'::uuid],
  ARRAY[(SELECT row_version FROM public.quotes WHERE id='00000000-0000-0000-0000-000000000303')],
  'pending_singular_approval'
);
DO $$ BEGIN
  IF (SELECT row_version FROM public.quotes WHERE id='00000000-0000-0000-0000-000000000303')
     <> (SELECT row_version FROM retry_snapshot) THEN
    RAISE EXCEPTION 'retry incrementou row_version';
  END IF;
  IF (SELECT count(*) FROM public.quote_history
      WHERE quote_id='00000000-0000-0000-0000-000000000303' AND action='status_changed') <> 1 THEN
    RAISE EXCEPTION 'retry duplicou histórico';
  END IF;
  IF (SELECT count(*) FROM public.workspace_notifications
      WHERE metadata->>'quote_id'='00000000-0000-0000-0000-000000000303') <> 1 THEN
    RAISE EXCEPTION 'notificação transacional ausente ou duplicada';
  END IF;
END $$;
INSERT INTO storage.objects(bucket_id,name,owner)
VALUES ('proposals','quotes/00000000-0000-0000-0000-000000000301/proposta-assinada.pdf','00000000-0000-0000-0000-000000000001');
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
DO $$ BEGIN
  BEGIN
    INSERT INTO storage.objects(bucket_id,name,owner)
    VALUES ('proposals','quotes/00000000-0000-0000-0000-000000000301/fraude.pdf','00000000-0000-0000-0000-000000000003');
    RAISE EXCEPTION 'upload da outra Singular foi aceito';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
