"""Auditoria de leitura da API Sicoob; recebe chaves via stdin, sem persistência."""
import concurrent.futures
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import subprocess
import sys
import urllib.error
import urllib.request

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[2]
URL = 'https://cfmzkthhgliqelozlmwu.supabase.co'
keys = json.load(sys.stdin)
assert keys['public'].startswith('sb_publishable_')
assert keys['secret'].startswith('sb_secret_')


def save(name, data):
    text = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    for value in keys.values():
        text = text.replace(value, '[CREDENCIAL OMITIDA]')
    text = re.sub(r'sb_secret_[A-Za-z0-9_-]+', '[CREDENCIAL OMITIDA]', text)
    (BASE / name).write_text(text)


def request(path, kind='secret', method='GET', extra=None):
    assert method in ('GET', 'HEAD')
    headers = {'User-Agent': 'Auditoria-Sicoob/1.0'}
    if kind:
        headers['apikey'] = keys[kind]
    headers.update(extra or {})
    req = urllib.request.Request(URL + path, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read()
            data = json.loads(raw) if raw else None
            return {'http': r.status, 'range': r.headers.get('Content-Range')}, data
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            data = json.loads(raw) if raw else {}
        except ValueError:
            data = {}
        return {'http': e.code, 'code': data.get('code'),
                'message': data.get('message', data.get('msg', data.get('error')))}, None
    except (TimeoutError, urllib.error.URLError) as e:
        return {'error': type(e).__name__}, None


started = datetime.now(timezone.utc).isoformat()
status, schema = request('/rest/v1/')
assert status.get('http') == 200, 'A API administrativa não autorizou a leitura de metadados.'
save('openapi-servidor.json', schema)
paths = schema['paths']
relations = sorted(p[1:] for p in paths if p != '/' and not p.startswith('/rpc/'))
rpcs = sorted(p.removeprefix('/rpc/') for p in paths if p.startswith('/rpc/'))
result = {'started_at': started, 'project': 'cfmzkthhgliqelozlmwu',
          'snapshot_sha': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
          'openapi': status, 'relations': relations, 'rpcs': rpcs,
          'limitations': ['OpenAPI não fornece corpos SQL, ledger, políticas RLS ou código de Edge Functions.']}

bucket_status, buckets = request('/storage/v1/bucket')
result['storage_status'] = bucket_status
if buckets is not None:
    save('buckets.json', [{k: b.get(k) for k in ['id', 'name', 'public', 'file_size_limit', 'allowed_mime_types', 'type']} for b in buckets])
jwks_status, jwks = request('/auth/v1/.well-known/jwks.json', None)
result['jwks'] = {'status': jwks_status, 'keys': [{k: v.get(k) for k in ['kty', 'alg', 'use']} for v in (jwks or {}).get('keys', [])]}
result['public_probes'] = {}
for path in ['/rest/v1/', '/rest/v1/profiles?select=id&limit=0', '/auth/v1/settings']:
    probe, _ = request(path, 'public')
    result['public_probes'][path] = probe

# Somente HEAD: contagem exata sem devolver dados de pessoas ou negócios.
def count_table(table):
    meta, _ = request('/rest/v1/' + table + '?select=*&limit=0', method='HEAD', extra={'Prefer': 'count=exact'})
    total = (meta.get('range') or '').split('/')[-1]
    return {'resource': table, **meta, 'rows': int(total) if total.isdigit() else None}

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    counts = list(pool.map(count_table, relations))
save('contagens-api.json', counts)

# Testes explícitos de metadados restritos; não há execução de SQL arbitrário.
result['restricted_schema_probes'] = {}
for schema_name, table in [('supabase_migrations', 'schema_migrations'), ('pg_catalog', 'pg_class'), ('information_schema', 'tables'), ('storage', 'objects')]:
    meta, _ = request('/rest/v1/' + table + '?select=*&limit=0', extra={'Accept-Profile': schema_name})
    result['restricted_schema_probes'][schema_name] = meta

meta, users = request('/auth/v1/admin/users?page=1&per_page=1')
result['auth_admin_probe'] = meta
if users is not None:
    result['auth_total_reported'] = users.get('total')
    result['auth_first_page_count'] = len(users.get('users', []))
result['finished_at'] = datetime.now(timezone.utc).isoformat()
save('acesso-atual.json', result)
print(json.dumps({'relations': len(relations), 'rpcs': len(rpcs), 'buckets': len(buckets or []),
                  'count_successes': sum(c.get('http') in (200, 206) for c in counts),
                  'public_probes': result['public_probes'], 'restricted_schema_probes': result['restricted_schema_probes'],
                  'auth_admin_probe': meta}, ensure_ascii=False))
