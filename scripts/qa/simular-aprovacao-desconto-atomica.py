#!/usr/bin/env python3
"""Valida a RPC de aprovação de desconto em PostgreSQL 17 isolado.

Não acessa Supabase nem qualquer banco compartilhado. O cenário confirma que
pedido, status e histórico têm commit único, usam a alçada persistida e
rejeitam concorrência e decisões sem permissão.
"""
from __future__ import annotations

import json
import subprocess
import sys
import time
from pathlib import Path


CONTAINER = "sicoob-desconto-atomico-20260927"
ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS = (
    ROOT / "supabase/migrations/20260927162240_discount_approval_atomic.sql",
    ROOT / "supabase/migrations/20260927163021_quote_pdf_approval_atomic.sql",
)


def run(args: list[str], *, input_text: str | None = None, check: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(args, input=input_text, text=True, capture_output=True, check=False)
    if check and result.returncode:
        raise RuntimeError(f"{' '.join(args)} falhou: {result.stderr.strip()}")
    return result


def sql(statement: str) -> str:
    return run([
        "docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres", "-X", "-qAt",
        "-v", "ON_ERROR_STOP=1",
    ], input_text=statement).stdout.strip()


BOOTSTRAP = r"""
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

CREATE TYPE public.quote_status AS ENUM ('draft', 'pending', 'sent', 'approved', 'pending_approval');
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  status public.quote_status NOT NULL DEFAULT 'draft',
  row_version integer NOT NULL DEFAULT 1,
  discount_percent numeric NOT NULL DEFAULT 0,
  real_discount_percent numeric,
  negotiation_markup_percent numeric NOT NULL DEFAULT 0,
  approved_pdf_url text,
  approved_by uuid,
  approved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.seller_discount_limits (
  user_id uuid PRIMARY KEY,
  max_discount_percent numeric NOT NULL CHECK (max_discount_percent BETWEEN 0 AND 100)
);
CREATE TABLE public.discount_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id),
  seller_id uuid NOT NULL,
  requested_discount_percent numeric NOT NULL,
  max_allowed_percent numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_id uuid,
  admin_notes text,
  seller_notes text,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.quote_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id),
  user_id uuid,
  action text NOT NULL,
  description text NOT NULL,
  field_changed text,
  old_value text,
  new_value text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE public.user_roles (user_id uuid NOT NULL, role text NOT NULL);
CREATE FUNCTION public.can_approve_discount(p_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role IN ('admin', 'supervisor', 'manager')) $$;
CREATE FUNCTION public.can_manage_quotes(p_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id AND role IN ('admin', 'supervisor', 'manager')) $$;

CREATE FUNCTION public.bump_quote_row_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.row_version := OLD.row_version + 1; RETURN NEW; END;
$$;
CREATE TRIGGER quote_row_version BEFORE UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.bump_quote_row_version();

CREATE FUNCTION public.validate_discount_before_pending() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IN ('draft', 'pending') AND COALESCE(NEW.real_discount_percent, 0) > 10
     AND NOT EXISTS (
       SELECT 1 FROM public.discount_approval_requests
       WHERE quote_id = NEW.id AND status = 'approved'
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'aprovação ainda não confirmada';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER quote_discount_guard BEFORE UPDATE OF status ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.validate_discount_before_pending();

INSERT INTO public.quotes (id, seller_id, status, row_version, discount_percent, real_discount_percent, negotiation_markup_percent)
VALUES ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'pending', 1, 15, 15, 8);
INSERT INTO public.seller_discount_limits (user_id, max_discount_percent)
VALUES ('00000000-0000-0000-0000-000000000001', 10);
INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-000000000002', 'supervisor');
"""

VERIFY = r"""
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
SELECT request_id, quote_row_version, max_allowed_percent
FROM public.request_discount_approval_atomic(
  '00000000-0000-0000-0000-000000000101', 1, 15, 'Cliente estratégico'
);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.discount_approval_requests) <> 1 THEN
    RAISE EXCEPTION 'pedido não criou exatamente uma solicitação';
  END IF;
  IF (SELECT status::text FROM public.quotes WHERE id = '00000000-0000-0000-0000-000000000101') <> 'pending_approval' THEN
    RAISE EXCEPTION 'pedido não promoveu o status';
  END IF;
  IF (SELECT row_version FROM public.quotes WHERE id = '00000000-0000-0000-0000-000000000101') <> 2 THEN
    RAISE EXCEPTION 'pedido não incrementou versão exatamente uma vez';
  END IF;
  IF (SELECT max_allowed_percent FROM public.discount_approval_requests) <> 10 THEN
    RAISE EXCEPTION 'limite do navegador foi aceito em vez da alçada persistida';
  END IF;
  IF (SELECT count(*) FROM public.quote_history WHERE action = 'discount_approval_requested') <> 1 THEN
    RAISE EXCEPTION 'pedido não criou histórico';
  END IF;
END;
$$;

SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
DO $$
BEGIN
  BEGIN
    PERFORM public.request_discount_approval_atomic(
      '00000000-0000-0000-0000-000000000101', 2, 15, NULL
    );
    RAISE EXCEPTION 'solicitação duplicada foi aceita';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END;
$$;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.discount_approval_requests) <> 1 THEN
    RAISE EXCEPTION 'falha duplicada deixou escrita parcial';
  END IF;
END;
$$;

SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
DO $$
DECLARE v_request uuid := (SELECT id FROM public.discount_approval_requests LIMIT 1);
BEGIN
  BEGIN
    PERFORM public.respond_discount_approval_atomic(v_request, 1, true, 'Aprovado');
    RAISE EXCEPTION 'decisão com versão obsoleta foi aceita';
  EXCEPTION WHEN serialization_failure THEN NULL;
  END;
END;
$$;
DO $$
BEGIN
  IF (SELECT status FROM public.discount_approval_requests LIMIT 1) <> 'pending' THEN
    RAISE EXCEPTION 'conflito de versão deixou decisão parcial';
  END IF;
END;
$$;

SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
SELECT request_status, quote_row_version
FROM public.respond_discount_approval_atomic(
  (SELECT id FROM public.discount_approval_requests LIMIT 1), 2, true, 'Aprovado'
);
DO $$
BEGIN
  BEGIN
    PERFORM public.approve_quote_with_pdf_atomic(
      '00000000-0000-0000-0000-000000000101', 2, 'https://arquivos.test/assinada.pdf', NULL
    );
    RAISE EXCEPTION 'aprovação de PDF com versão obsoleta foi aceita';
  EXCEPTION WHEN serialization_failure THEN NULL;
  END;
END;
$$;
SELECT status, row_version, approved_pdf_url
FROM public.approve_quote_with_pdf_atomic(
  '00000000-0000-0000-0000-000000000101', 3, 'https://arquivos.test/assinada.pdf', 'Aprovação formal'
);
DO $$
DECLARE v_request uuid := (SELECT id FROM public.discount_approval_requests LIMIT 1);
BEGIN
  IF (SELECT status FROM public.discount_approval_requests WHERE id = v_request) <> 'approved' THEN
    RAISE EXCEPTION 'decisão não foi persistida';
  END IF;
  IF (SELECT status::text FROM public.quotes WHERE id = '00000000-0000-0000-0000-000000000101') <> 'approved' THEN
    RAISE EXCEPTION 'aprovação com PDF não promoveu o orçamento';
  END IF;
  IF (SELECT row_version FROM public.quotes WHERE id = '00000000-0000-0000-0000-000000000101') <> 4 THEN
    RAISE EXCEPTION 'decisão ou PDF não incrementou versões exatamente uma vez';
  END IF;
  IF (SELECT approved_pdf_url FROM public.quotes WHERE id = '00000000-0000-0000-0000-000000000101') <> 'https://arquivos.test/assinada.pdf' THEN
    RAISE EXCEPTION 'URL do PDF não foi vinculada à aprovação';
  END IF;
  IF (SELECT count(*) FROM public.quote_history) <> 3 THEN
    RAISE EXCEPTION 'histórico da decisão ou PDF ausente ou duplicado';
  END IF;
  IF has_function_privilege('public', 'public.request_discount_approval_atomic(uuid, integer, numeric, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PUBLIC ainda executa RPC de pedido';
  END IF;
  IF has_function_privilege('public', 'public.approve_quote_with_pdf_atomic(uuid, integer, text, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'PUBLIC ainda executa RPC de aprovação com PDF';
  END IF;
END;
$$;
"""


def main() -> int:
    for migration in MIGRATIONS:
        if not migration.is_file():
            raise FileNotFoundError(f"Migration ausente: {migration}")
    run(["docker", "rm", "-f", CONTAINER], check=False)
    try:
        run([
            "docker", "run", "--rm", "-d", "--name", CONTAINER, "--network", "none",
            "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:17.6-alpine",
        ])
        for _ in range(30):
            if run(["docker", "exec", CONTAINER, "pg_isready", "-U", "postgres"], check=False).returncode == 0:
                break
            time.sleep(1)
        else:
            raise RuntimeError("PostgreSQL isolado não iniciou")
        sql(BOOTSTRAP)
        for migration in MIGRATIONS:
            sql(migration.read_text(encoding="utf-8"))
        output = sql(VERIFY)
        print(json.dumps({"cenario": "aprovacao_desconto_atomica", "resultado": "aprovado", "retornos": output.splitlines()}, ensure_ascii=False))
        return 0
    finally:
        run(["docker", "rm", "-f", CONTAINER], check=False)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"SIMULAÇÃO FALHOU: {error}", file=sys.stderr)
        raise SystemExit(1)
