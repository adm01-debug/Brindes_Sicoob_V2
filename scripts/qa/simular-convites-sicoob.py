"""Valida convites institucionais e revogação de vínculo sem rede."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib
import json
import subprocess
import time
import uuid

from postgres_ready import wait_for_postgres

ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "supabase/migrations/20260927220000_sicoob_institutional_invitations.sql"
ROLE_HELPER_MIGRATION = ROOT / "supabase/migrations/20260927221000_sicoob_role_helper_target_validation.sql"
ACCOUNT_MIGRATION = ROOT / "supabase/migrations/20260927221500_sicoob_invitation_existing_account.sql"
EVIDENCE = ROOT / "docs/execucao/evidencias/convites-sicoob.json"
CONTAINER = "sicoob-invitations-" + uuid.uuid4().hex[:10]

DEV = "11111111-1111-1111-1111-111111111111"
MANAGER = "22222222-2222-2222-2222-222222222222"
OUTSIDE_MANAGER = "33333333-3333-3333-3333-333333333333"
SUPERVISOR = "12121212-1212-1212-1212-121212121212"
SUPERVISED_USER = "13131313-1313-1313-1313-131313131313"
INVITEE = "44444444-4444-4444-4444-444444444444"
WRONG_USER = "55555555-5555-5555-5555-555555555555"
EXPIRED_USER = "66666666-6666-6666-6666-666666666666"
REVOKED_USER = "77777777-7777-7777-7777-777777777777"
CONFLICT_USER = "88888888-8888-8888-8888-888888888888"
REISSUED_USER = "99999999-9999-9999-9999-999999999999"
COOP = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
OTHER_COOP = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
PA = "cccccccc-cccc-cccc-cccc-cccccccccccc"


def command(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)


def sql(statement, *, check=True):
    response = None
    for _ in range(20):
        response = command([
            "docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres",
            "-v", "ON_ERROR_STOP=1", "-At",
        ], stdin=statement, check=False)
        if response.returncode != 2:
            break
        time.sleep(0.5)
    if check and response.returncode != 0:
        raise RuntimeError(response.stderr.strip())
    return response


def actor_sql(actor, statement, *, check=True):
    return sql(
        "SET ROLE authenticated;\n"
        f"SET request.jwt.claim.sub = '{actor}';\n"
        "SET request.jwt.claim.role = 'authenticated';\n"
        f"{statement}\nRESET ROLE;",
        check=check,
    )


def scalar(response):
    values = [line for line in response.stdout.splitlines() if line and line not in ("SET", "RESET")]
    if not values:
        raise RuntimeError("A consulta não retornou valor")
    return values[-1]


migration_sha256 = hashlib.sha256(MIGRATION.read_bytes()).hexdigest()
canonical_evidence = None
if EVIDENCE.exists():
    try:
        previous = json.loads(EVIDENCE.read_text())
        candidate = previous.get("banco_canonico_construcao")
        if candidate and candidate.get("migration_sha256") == migration_sha256:
            canonical_evidence = candidate
    except (json.JSONDecodeError, OSError):
        pass

result = {
    "ambiente": "PostgreSQL 16 descartável, --network none; somente dados sintéticos",
    "migration": str(MIGRATION.relative_to(ROOT)),
    "migration_helper_papel": str(ROLE_HELPER_MIGRATION.relative_to(ROOT)),
    "migration_conta_existente": str(ACCOUNT_MIGRATION.relative_to(ROOT)),
    "producao_verificada": False,
}

try:
    command([
        "docker", "run", "--rm", "-d", "--name", CONTAINER,
        "--network", "none", "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:16-alpine",
    ])
    wait_for_postgres(command, CONTAINER)
    sql("""
      CREATE ROLE anon NOLOGIN;
      CREATE ROLE authenticated NOLOGIN;
      CREATE ROLE service_role NOLOGIN;
      CREATE SCHEMA auth;
      CREATE SCHEMA extensions;
      CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.role', true), '')
      $$;
      CREATE TABLE auth.users (
        id uuid PRIMARY KEY,
        email text,
        email_confirmed_at timestamptz
      );
      CREATE TABLE auth.sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
      );
      CREATE TYPE public.app_role AS ENUM (
        'admin', 'manager', 'vendedor', 'supervisor', 'dev',
        'gestor_compras', 'gerente_pa', 'comprador_pac', 'comprador_singular'
      );
      CREATE TABLE public.cooperativas (
        id uuid PRIMARY KEY, nome text NOT NULL, codigo text NOT NULL UNIQUE,
        is_active boolean NOT NULL DEFAULT true
      );
      CREATE TABLE public.postos_atendimento (
        id uuid PRIMARY KEY, cooperativa_id uuid NOT NULL REFERENCES public.cooperativas(id),
        nome text NOT NULL, codigo text NOT NULL, is_active boolean NOT NULL DEFAULT true
      );
      CREATE TABLE public.profiles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id),
        email text, is_active boolean DEFAULT true, deleted_at timestamptz,
        cooperativa_id uuid REFERENCES public.cooperativas(id), singular_id uuid REFERENCES public.cooperativas(id),
        pa_id uuid REFERENCES public.postos_atendimento(id), updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE public.user_roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id),
        role public.app_role NOT NULL, UNIQUE(user_id, role)
      );
      GRANT USAGE ON SCHEMA public, auth TO authenticated, anon;
      GRANT SELECT ON public.cooperativas, public.postos_atendimento, public.profiles, public.user_roles TO authenticated;
    """)
    users = [
        (DEV, "dev@qa.sicoob.test"),
        (MANAGER, "gestor@qa.sicoob.test"),
        (OUTSIDE_MANAGER, "gestor-fora@qa.sicoob.test"),
        (SUPERVISOR, "supervisor@qa.sicoob.test"),
        (SUPERVISED_USER, "supervisionado@qa.sicoob.test"),
        (INVITEE, "convidado@qa.sicoob.test"),
        (WRONG_USER, "conta-errada@qa.sicoob.test"),
        (EXPIRED_USER, "expirado@qa.sicoob.test"),
        (REVOKED_USER, "revogado@qa.sicoob.test"),
        (CONFLICT_USER, "conflito@qa.sicoob.test"),
        (REISSUED_USER, "reenviado@qa.sicoob.test"),
    ]
    values = ",".join(f"('{user_id}','{email}',now())" for user_id, email in users)
    sql(f"""
      INSERT INTO auth.users(id,email,email_confirmed_at) VALUES {values};
      INSERT INTO public.cooperativas VALUES
        ('{COOP}','Singular QA','QA-001',true),
        ('{OTHER_COOP}','Singular Externa','QA-002',true);
      INSERT INTO public.postos_atendimento VALUES
        ('{PA}','{COOP}','PA Centro','001',true);
      INSERT INTO public.profiles(id,user_id,email,is_active,cooperativa_id,singular_id,pa_id) VALUES
        ('{DEV}','{DEV}','dev@qa.sicoob.test',true,NULL,NULL,NULL),
        ('{MANAGER}','{MANAGER}','gestor@qa.sicoob.test',true,'{COOP}','{COOP}',NULL),
        ('{OUTSIDE_MANAGER}','{OUTSIDE_MANAGER}','gestor-fora@qa.sicoob.test',true,'{OTHER_COOP}','{OTHER_COOP}',NULL),
        ('{SUPERVISOR}','{SUPERVISOR}','supervisor@qa.sicoob.test',true,NULL,NULL,NULL),
        ('{SUPERVISED_USER}','{SUPERVISED_USER}','supervisionado@qa.sicoob.test',true,NULL,NULL,NULL),
        ('{INVITEE}','{INVITEE}','convidado@qa.sicoob.test',true,NULL,NULL,NULL),
        ('{WRONG_USER}','{WRONG_USER}','conta-errada@qa.sicoob.test',true,NULL,NULL,NULL),
        ('{EXPIRED_USER}','{EXPIRED_USER}','expirado@qa.sicoob.test',true,NULL,NULL,NULL),
        ('{REVOKED_USER}','{REVOKED_USER}','revogado@qa.sicoob.test',true,NULL,NULL,NULL),
        ('{CONFLICT_USER}','{CONFLICT_USER}','conflito@qa.sicoob.test',true,'{OTHER_COOP}','{OTHER_COOP}',NULL),
        ('{REISSUED_USER}','{REISSUED_USER}','reenviado@qa.sicoob.test',true,NULL,NULL,NULL);
      INSERT INTO public.user_roles(user_id,role) VALUES
        ('{DEV}','dev'), ('{MANAGER}','gestor_compras'),
        ('{OUTSIDE_MANAGER}','gestor_compras'),
        ('{SUPERVISOR}','supervisor'),
        ('{SUPERVISED_USER}','vendedor'),
        ('{INVITEE}','vendedor'), ('{WRONG_USER}','vendedor'),
        ('{EXPIRED_USER}','vendedor'), ('{REVOKED_USER}','vendedor'),
        ('{CONFLICT_USER}','vendedor'), ('{REISSUED_USER}','vendedor');
      INSERT INTO auth.sessions(user_id) VALUES ('{INVITEE}');
    """)
    sql(MIGRATION.read_text())
    sql(ROLE_HELPER_MIGRATION.read_text())
    sql(ACCOUNT_MIGRATION.read_text())

    assert scalar(sql("SELECT has_function_privilege('anon','public.get_sicoob_invitation(text)','EXECUTE')::text;")) == "true"
    assert scalar(sql("SELECT has_function_privilege('anon','public.issue_sicoob_invitation(text,uuid,uuid,public.app_role,integer,uuid)','EXECUTE')::text;")) == "false"
    assert scalar(sql("SELECT has_table_privilege('authenticated','public.sicoob_invitations','INSERT')::text;")) == "false"

    elevated = actor_sql(MANAGER, f"""
      SELECT * FROM public.issue_sicoob_invitation(
        'nao-permitido@qa.sicoob.test','{COOP}',NULL,'gestor_compras',48,gen_random_uuid()
      );
    """, check=False)
    assert elevated.returncode != 0 and "não pode conceder" in elevated.stderr
    cross_scope = actor_sql(MANAGER, f"""
      SELECT * FROM public.issue_sicoob_invitation(
        'fora@qa.sicoob.test','{OTHER_COOP}',NULL,'vendedor',48,gen_random_uuid()
      );
    """, check=False)
    assert cross_scope.returncode != 0 and "não pode conceder" in cross_scope.stderr
    missing_pa = actor_sql(MANAGER, f"""
      SELECT * FROM public.issue_sicoob_invitation(
        'sem-pa@qa.sicoob.test','{COOP}',NULL,'gerente_pa',48,gen_random_uuid()
      );
    """, check=False)
    assert missing_pa.returncode != 0 and "exige um PA" in missing_pa.stderr
    supervisor_basic = scalar(actor_sql(SUPERVISOR, f"""
      SELECT length(invitation_token) FROM public.issue_sicoob_invitation(
        'supervisionado@qa.sicoob.test','{OTHER_COOP}',NULL,'vendedor',48,gen_random_uuid()
      );
    """))
    assert supervisor_basic == "64"
    supervisor_elevated = actor_sql(SUPERVISOR, f"""
      SELECT * FROM public.issue_sicoob_invitation(
        'gestor-supervisionado@qa.sicoob.test','{OTHER_COOP}',NULL,'gestor_compras',48,gen_random_uuid()
      );
    """, check=False)
    assert supervisor_elevated.returncode != 0 and "não pode conceder" in supervisor_elevated.stderr
    missing_account = actor_sql(DEV, f"""
      SELECT * FROM public.issue_sicoob_invitation(
        'inexistente@qa.sicoob.test','{COOP}',NULL,'vendedor',48,gen_random_uuid()
      );
    """, check=False)
    assert missing_account.returncode != 0 and "Crie a conta" in missing_account.stderr
    result["autoridade"] = "autoelevação, outra cooperativa, papel sem PA e email sem conta recusados; supervisor concede somente papel operacional"

    key = "f1111111-1111-1111-1111-111111111111"
    issued = scalar(actor_sql(MANAGER, f"""
      SELECT invitation_id || '|' || invitation_token || '|' || reused
      FROM public.issue_sicoob_invitation(
        'convidado@qa.sicoob.test','{COOP}','{PA}','gerente_pa',48,'{key}'
      );
    """))
    invitation_id, token, reused = issued.split("|")
    assert reused == "false" and len(token) == 64
    repeated = scalar(actor_sql(MANAGER, f"""
      SELECT invitation_id || '|' || COALESCE(invitation_token,'NULL') || '|' || reused
      FROM public.issue_sicoob_invitation(
        'convidado@qa.sicoob.test','{COOP}','{PA}','gerente_pa',48,'{key}'
      );
    """))
    assert repeated == f"{invitation_id}|NULL|true"
    preview = scalar(sql(f"""
      SELECT masked_email || '|' || cooperative_name || '|' || pa_code || '|' || invited_role || '|' || invitation_status
      FROM public.get_sicoob_invitation('{token}');
    """))
    assert preview == "c***@qa.sicoob.test|Singular QA|001|gerente_pa|pending"
    wrong = actor_sql(WRONG_USER, f"SELECT public.accept_sicoob_invitation('{token}');", check=False)
    assert wrong.returncode != 0 and "email convidado" in wrong.stderr

    with ThreadPoolExecutor(max_workers=2) as pool:
      accepted = list(pool.map(
          lambda _: actor_sql(INVITEE, f"SELECT public.accept_sicoob_invitation('{token}');"),
          range(2),
      ))
    assert all(response.returncode == 0 for response in accepted), [response.stderr for response in accepted]
    assert len({scalar(response) for response in accepted}) == 1
    accepted_state = scalar(sql(f"""
      SELECT i.status || '|' || p.cooperativa_id || '|' || p.pa_id || '|'
        || (SELECT count(*) FROM public.user_roles WHERE user_id='{INVITEE}' AND role='gerente_pa') || '|'
        || (SELECT count(*) FROM public.user_roles WHERE user_id='{INVITEE}') || '|'
        || (SELECT count(*) FROM public.sicoob_invitation_events WHERE invitation_id=i.id AND action='accepted')
      FROM public.sicoob_invitations i
      JOIN public.profiles p ON p.user_id=i.accepted_by
      WHERE i.id='{invitation_id}';
    """))
    assert accepted_state == f"accepted|{COOP}|{PA}|1|1|1"
    assert scalar(actor_sql(MANAGER, f"SELECT public.has_role('{INVITEE}','gerente_pa')::text;")) == "true"
    result["aceite"] = "email alheio recusado; dois aceites simultâneos criaram um único vínculo, papel mínimo e evento"

    expired_key = "f2222222-2222-2222-2222-222222222222"
    expired_issue = scalar(actor_sql(MANAGER, f"""
      SELECT invitation_id || '|' || invitation_token FROM public.issue_sicoob_invitation(
        'expirado@qa.sicoob.test','{COOP}',NULL,'vendedor',1,'{expired_key}'
      );
    """))
    expired_id, expired_token = expired_issue.split("|")
    sql(f"UPDATE public.sicoob_invitations SET created_at=now()-interval '2 hours', expires_at=now()-interval '1 hour' WHERE id='{expired_id}';")
    assert scalar(sql(f"SELECT invitation_status FROM public.get_sicoob_invitation('{expired_token}');")) == "expired"
    expired_accept = actor_sql(EXPIRED_USER, f"SELECT public.accept_sicoob_invitation('{expired_token}');", check=False)
    assert expired_accept.returncode != 0 and "expirou" in expired_accept.stderr

    revoked_issue = scalar(actor_sql(MANAGER, f"""
      SELECT invitation_id || '|' || invitation_token FROM public.issue_sicoob_invitation(
        'revogado@qa.sicoob.test','{COOP}',NULL,'vendedor',48,'f3333333-3333-3333-3333-333333333333'
      );
    """))
    revoked_id, revoked_token = revoked_issue.split("|")
    actor_sql(MANAGER, f"SELECT public.revoke_sicoob_invitation('{revoked_id}','Revogação solicitada em teste.');")
    revoked_accept = actor_sql(REVOKED_USER, f"SELECT public.accept_sicoob_invitation('{revoked_token}');", check=False)
    assert revoked_accept.returncode != 0 and "revogado" in revoked_accept.stderr
    conflict = actor_sql(DEV, f"""
      SELECT * FROM public.issue_sicoob_invitation(
        'conflito@qa.sicoob.test','{COOP}',NULL,'vendedor',48,'f4444444-4444-4444-4444-444444444444'
      );
    """, check=False)
    assert conflict.returncode != 0 and "outro escopo" in conflict.stderr
    result["validade"] = "expiração, revogação e vínculo ativo conflitante recusados"

    first_reissue = scalar(actor_sql(MANAGER, f"""
      SELECT invitation_id || '|' || invitation_token FROM public.issue_sicoob_invitation(
        'reenviado@qa.sicoob.test','{COOP}',NULL,'vendedor',48,'f5111111-1111-1111-1111-111111111111'
      );
    """))
    first_id, first_token = first_reissue.split("|")
    second_reissue = scalar(actor_sql(MANAGER, f"""
      SELECT invitation_id || '|' || invitation_token FROM public.issue_sicoob_invitation(
        'reenviado@qa.sicoob.test','{COOP}',NULL,'vendedor',48,'f5222222-2222-2222-2222-222222222222'
      );
    """))
    second_id, second_token = second_reissue.split("|")
    assert first_id != second_id
    assert scalar(sql(f"SELECT invitation_status FROM public.get_sicoob_invitation('{first_token}');")) == "superseded"
    assert scalar(sql(f"SELECT invitation_status FROM public.get_sicoob_invitation('{second_token}');")) == "pending"
    sql(f"UPDATE public.profiles SET is_active=false, deleted_at=now() WHERE user_id='{MANAGER}';")
    stale_authority = actor_sql(REISSUED_USER, f"SELECT public.accept_sicoob_invitation('{second_token}');", check=False)
    assert stale_authority.returncode != 0 and "autoridade do emissor" in stale_authority.stderr
    sql(f"UPDATE public.profiles SET is_active=true, deleted_at=NULL WHERE user_id='{MANAGER}';")
    result["reenvio"] = "novo link substituiu o anterior; autoridade revogada do emissor foi reavaliada no aceite"

    actor_sql(MANAGER, f"SELECT public.revoke_sicoob_user_access('{INVITEE}','Vínculo encerrado pelo gestor em teste.');")
    assert scalar(actor_sql(OUTSIDE_MANAGER, "SELECT count(*) FROM public.sicoob_invitation_events WHERE action='access_revoked';")) == "0"
    assert scalar(actor_sql(MANAGER, "SELECT count(*) FROM public.sicoob_invitation_events WHERE action='access_revoked';")) == "1"
    revoked_access = scalar(sql(f"""
      SELECT p.is_active || '|' || (p.deleted_at IS NOT NULL) || '|'
        || (SELECT count(*) FROM public.user_roles WHERE user_id='{INVITEE}') || '|'
        || (SELECT count(*) FROM auth.sessions WHERE user_id='{INVITEE}')
      FROM public.profiles p WHERE p.user_id='{INVITEE}';
    """))
    assert revoked_access == "false|true|0|0"
    assert scalar(sql(f"SELECT (access_revoked_at IS NOT NULL)::text FROM public.sicoob_invitations WHERE id='{invitation_id}';")) == "true"
    assert scalar(actor_sql(INVITEE, "SELECT active || '|' || reason FROM public.get_sicoob_access_state();")) == "false|membership_revoked"
    assert scalar(actor_sql(INVITEE, "SELECT public.has_role(auth.uid(),'gerente_pa')::text;")) == "false"
    manager_cannot_revoke_dev = actor_sql(MANAGER, f"SELECT public.revoke_sicoob_user_access('{DEV}','Tentativa indevida contra acesso técnico.');", check=False)
    assert manager_cannot_revoke_dev.returncode != 0 and "não pode revogar" in manager_cannot_revoke_dev.stderr
    result["revogacao_de_vinculo"] = "perfil, papéis e sessões revogados atomicamente; JWT antigo perdeu has_role imediatamente; gestor não revogou dev"

    direct_write = actor_sql(MANAGER, f"""
      INSERT INTO public.sicoob_invitations(
        token_hash,email,cooperative_id,role,expires_at,invited_by,idempotency_key
      ) VALUES (
        extensions.digest('token','sha256'),'direto@qa.sicoob.test','{COOP}','vendedor',now()+interval '1 day','{MANAGER}',gen_random_uuid()
      );
    """, check=False)
    assert direct_write.returncode != 0
    immutable = sql("UPDATE public.sicoob_invitation_events SET details='{}'::jsonb;", check=False)
    assert immutable.returncode != 0 and "imutáveis" in immutable.stderr
    result["integridade"] = "escrita direta negada por ACL/RLS e trilha de eventos imutável"
    result["resultado"] = "aprovado"
    if canonical_evidence:
        result["banco_canonico_construcao"] = canonical_evidence
    EVIDENCE.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=False))
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
