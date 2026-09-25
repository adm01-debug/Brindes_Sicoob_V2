"""Lê RPCs de auditoria, metadados de Storage e integridade nominal de usuários.

GETs não executam SQL de escrita. POST é usado apenas pelo endpoint documentado
de listagem de objetos de Storage, que não altera objetos.
"""
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE = Path(__file__).resolve().parent
KEYS = json.load(sys.stdin)
URL = 'https://cfmzkthhgliqelozlmwu.supabase.co'


def query(path, kind='secret', body=None):
    assert body is None or path.startswith('/storage/v1/object/list/')
    headers = {'apikey': KEYS[kind], 'User-Agent': 'Auditoria-Sicoob/1.0'}
    if body is not None:
        headers['Content-Type'] = 'application/json'
    req = urllib.request.Request(URL + path, headers=headers,
        data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.load(r)
            return {'http': r.status}, data
    except urllib.error.HTTPError as e:
        try:
            d = json.loads(e.read())
        except ValueError:
            d = {}
        return {'http': e.code, 'code': d.get('code'), 'message': d.get('message', d.get('error'))}, None


def save(name, data):
    value = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    assert all(key not in value for key in KEYS.values())
    (BASE / name).write_text(value)


results = {'collected_at': datetime.now(timezone.utc).isoformat(), 'rpcs': {}}
for rpc in ['audit_rls_coverage', 'audit_rls_matrix', 'audit_security_definer_acl', 'check_tables_rls']:
    status, data = query('/rest/v1/rpc/' + rpc)
    results['rpcs'][rpc] = {**status, 'result': data}
save('controles-rls.json', results)

# Divergências encontradas no primeiro relatório, verificadas na API atual.
missing_names = ['bitrix_clients', 'bitrix_deals', 'bitrix_sync_logs', 'color_nuances',
    'companies', 'error_logs', 'personalization_simulations', 'personalization_techniques',
    'product_component_location_techniques', 'product_group_components',
    'product_group_location_techniques', 'product_group_locations', 'products',
    'roles', 'sales_goals', 'sicoob_budgets', 'user_2fa_settings', 'user_passkeys']
probes = {}
for name in missing_names + ['v_full_scope_grants']:
    meta, _ = query('/rest/v1/' + name + '?select=*&limit=0')
    probes[name] = meta
save('recursos-verificados.json', probes)

# IDs são comparados somente em memória. Não persistimos emails ou UUIDs pessoais.
users = []
page = 1
while True:
    meta, data = query('/auth/v1/admin/users?' + urllib.parse.urlencode({'page': page, 'per_page': 100}))
    if data is None:
        break
    batch = data.get('users', [])
    users.extend(batch)
    if len(batch) < 100:
        break
    page += 1
assert data is not None, 'A paginação de usuários não foi concluída.'
profile_status, profiles = query('/rest/v1/profiles?select=user_id')
role_status, roles = query('/rest/v1/user_roles?select=user_id,role')
if profiles is not None and roles is not None:
    uids = {u['id'] for u in users}
    pids = {p['user_id'] for p in profiles}
    rids = {r['user_id'] for r in roles}
    save('integridade-usuarios.json', {'auth_count': len(users), 'profiles_count': len(profiles),
        'role_rows': len(roles), 'users_without_profile': len(uids - pids),
        'profiles_without_auth': len(pids - uids), 'users_without_role_row': len(uids - rids),
        'roles_without_auth': len(rids - uids), 'roles_count': dict(Counter(r['role'] for r in roles)),
        'complete': len(profiles) < 1000 and len(roles) < 1000,
        'limitation': 'Perfis/papéis devem ser paginados se atingirem o limite de 1000 linhas.'})

inventory = []
for bucket in json.loads((BASE / 'buckets.json').read_text()):
    pending = ['']
    objects = []
    status = {'http': 200}
    while pending:
        prefix = pending.pop()
        offset = 0
        while True:
            status, batch = query('/storage/v1/object/list/' + urllib.parse.quote(bucket['id'], safe=''),
                body={'prefix': prefix, 'limit': 100, 'offset': offset, 'sortBy': {'column': 'name', 'order': 'asc'}})
            if batch is None:
                break
            for item in batch:
                name = prefix + item['name']
                if item.get('id') is None:
                    pending.append(name + '/')
                else:
                    metadata = item.get('metadata') or {}
                    objects.append({'path_sha256': hashlib.sha256(name.encode()).hexdigest(),
                        'bytes': metadata.get('size'), 'etag': metadata.get('eTag'),
                        'mime_type': metadata.get('mimetype')})
            if len(batch) < 100:
                break
            offset += 100
        if status['http'] != 200:
            break
    inventory.append({'bucket': bucket['id'], 'status': status, 'objects': objects,
        'count': len(objects), 'bytes': sum(o['bytes'] or 0 for o in objects)})
save('objetos-storage.json', inventory)
print(json.dumps({'rpc_status': {k:v['http'] for k,v in results['rpcs'].items()},
    'missing_resources_status': dict(Counter(p['http'] for p in probes.values())),
    'users_count': len(users), 'storage_objects': sum(b['count'] for b in inventory),
    'storage_buckets_listed': sum(b['status']['http'] == 200 for b in inventory)}, ensure_ascii=False))
