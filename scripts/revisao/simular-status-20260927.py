#!/usr/bin/env python3
"""Sondas isoladas: confirmação da lacuna é sucesso da sonda, não do produto."""
import json
import pathlib
import subprocess
import time
import uuid

raiz = pathlib.Path(__file__).resolve().parents[2]
nome = 'sicoob-revisao-' + uuid.uuid4().hex[:10]


def sql(texto, conferir=True):
    resultado = subprocess.run(
        ['docker', 'exec', '-i', nome, 'psql', '-h', '127.0.0.1', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'],
        input=texto, text=True, capture_output=True,
    )
    if conferir and resultado.returncode:
        raise RuntimeError(resultado.stderr)
    return resultado


try:
    subprocess.run(['docker', 'run', '--rm', '-d', '--name', nome, '--network', 'none',
                    '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17'], check=True, capture_output=True)
    for _ in range(60):
        if subprocess.run(['docker', 'exec', nome, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres'], capture_output=True).returncode == 0:
            break
        time.sleep(0.5)
    else:
        raise RuntimeError('PostgreSQL descartável não iniciou.')
    sql('''
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS
        $$ SELECT '00000000-0000-0000-0000-000000000001'::uuid $$;
      CREATE TABLE quotes(id uuid PRIMARY KEY, seller_id uuid NOT NULL,
        status text NOT NULL, row_version integer NOT NULL DEFAULT 1,
        rejection_notes text, approved_at timestamptz, approved_by uuid, updated_at timestamptz);
      CREATE TABLE quote_history(quote_id uuid, user_id uuid, action text,
        description text, field_changed text, old_value text, new_value text, metadata jsonb);
      CREATE FUNCTION can_manage_quotes(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
      CREATE FUNCTION log_quote_status_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        INSERT INTO quote_history(quote_id,old_value,new_value) VALUES(NEW.id,OLD.status,NEW.status);
        RETURN NEW; END $$;
      CREATE TRIGGER tr_log_quote_status_change AFTER UPDATE ON quotes
        FOR EACH ROW EXECUTE FUNCTION log_quote_status_change();
    ''')
    migracoes = raiz / 'supabase/migrations'
    sql((migracoes / '20260927110000_bulk_quote_status_atomic.sql').read_text())
    falta_enum = sql((migracoes / '20260927110100_quote_status_workflow_enum.sql').read_text(), False)
    assert falta_enum.returncode != 0 and 'quote_status' in falta_enum.stderr
    sql('''
      INSERT INTO quotes(id,seller_id,status) VALUES
        ('00000000-0000-0000-0000-000000000011',auth.uid(),'draft');
      UPDATE quotes SET status='pending';
      DO $$ BEGIN
        IF (SELECT count(*) FROM quote_history) <> 0 THEN
          RAISE EXCEPTION 'A hipótese de histórico ausente não foi reproduzida';
        END IF;
      END $$;
    ''')
    resultado = {
      'base': '3094cbab22adfa012edcca5278680fa739df46ca',
      'ambiente': 'PostgreSQL 17 descartável, sem rede e sem portas publicadas',
      'resultado': 'Duas lacunas reproduzidas',
      'cenarios': [
        'Migration 20260927110100 falha em schema com quotes.status text e sem enum quote_status.',
        'Após 20260927110000, atualização direta de status não gera histórico pelo gatilho legado.',
      ],
      'limite': 'Fixture mínimo; não reproduz todas as constraints, policies e triggers do Supabase canônico.',
    }
    destino = raiz / 'docs/execucao/revisao-plano-20260927/sondas-status.json'
    destino.write_text(json.dumps(resultado, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(resultado, ensure_ascii=False))
finally:
    subprocess.run(['docker', 'rm', '-f', nome], capture_output=True)
