"""Valida consistência do pacote, sem novas consultas ou alterações no banco."""
from collections import Counter
import hashlib
import json
from pathlib import Path
import re

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[2]


def read(name):
    return json.loads((BASE / name).read_text())


api = read('openapi-servidor.json')
access = read('acesso-atual.json')
assert len(api['definitions']) == len(access['relations']) == 202
assert len(access['rpcs']) == 167
assert access['project'] == 'cfmzkthhgliqelozlmwu'
assert access['public_probes']['/rest/v1/profiles?select=id&limit=0']['http'] == 200
assert all(p['code'] == 'PGRST106' for p in access['restricted_schema_probes'].values())
counts = read('contagens-api.json')
assert len(counts) == 202
assert sum(c['http'] in (200, 206) for c in counts) == 201
assert {c['resource'] for c in counts if c['http'] == 403} == {'v_full_scope_grants'}
anonymous = read('leitura-anonima.json')['probes']
assert len(anonymous) == 202
assert {r['resource']: r['rows'] for r in anonymous if r['rows']} == {'cms_banners': 3, 'sicoob_temas': 4}
assert not any('error' in p for p in anonymous)

assert len(read('buckets.json')) == 13
assert len(read('objetos-storage.json')) == 13
assert all(b['count'] == 0 and b['status']['http'] == 200 for b in read('objetos-storage.json'))
users = read('integridade-usuarios.json')
assert users['complete']
assert users['auth_count'] == users['profiles_count'] == 5
assert users['users_without_profile'] == users['profiles_without_auth'] == users['roles_without_auth'] == 0
assert users['users_without_role_row'] == 2

controls = read('controles-rls.json')['rpcs']
assert all(v['http'] == 200 for v in controls.values())
regular = controls['check_tables_rls']['result']
assert len(regular) == 215 and all(r['relrowsecurity'] for r in regular)
assert len(controls['audit_rls_matrix']['result']) == 476
acl = controls['audit_security_definer_acl']['result']
assert len(acl) == 391
assert len({(r['function_name'], r['arguments']) for r in acl}) == 186
assert Counter(r['granted_to'] for r in acl) == {'PUBLIC': 147, 'anon': 184, 'authenticated': 60}
assert {r['table'] for r in controls['audit_rls_coverage']['result'] if r['severity'] == 'high'} == {'access_blocked_log', 'webhook_configs'}

probes = read('recursos-verificados.json')
assert sum(p.get('code') == 'PGRST205' for p in probes.values()) == 18
assert probes['v_full_scope_grants']['code'] == '42501'
anonymous_rpc = {p['rpc']: p for p in read('acl-anonima.json')['probes']}
for rpc in ['get_sicoob_reorder_idempotency', 'get_sicoob_kit_quote_idempotency']:
    assert anonymous_rpc[rpc]['code'] == '42501'
assert anonymous_rpc['check_sicoob_access_matrix']['code'] == '42883'
assert anonymous_rpc['audit_security_definer_acl']['result_count'] == 391

types = read('tipos-versus-api.json')
assert len(types['relations_only_api']) == 8
assert sum(len(r['only_api']) for r in types['columns_differences']) == 4
assert len(types['functions_only_api']) == 17
assert types['rpc_argument_differences'] == [{'name': 'reorder_sicoob_order_as_quote', 'only_types': [], 'only_api': ['p_request_hash']}]
refs = read('referencias-versus-api.json')
assert refs['count'] == len(refs['calls']) == 83
assert refs['resources_count'] == len(refs['counts_per_resource']) == 22
for c in refs['calls']:
    lines = (ROOT / c['file']).read_text().splitlines()
    assert any(c['resource'] in line for line in lines[c['line'] - 1:c['line'] + 7])

manifest = read('manifesto-contratos-locais.json')
assert len(manifest['migrations']) == 515
assert sum(m['active'] for m in manifest['migrations']) == 495
assert not manifest['migrations_changed_since_first_audit']
for item in manifest['migrations'] + manifest['edge_files'] + [manifest['configuration'], manifest['types']]:
    assert hashlib.sha256((ROOT / item['path']).read_bytes()).hexdigest() == item['sha256'], item['path']

for target in re.findall(r'\]\(([^)]+)\)', (BASE / 'RELATORIO.md').read_text()):
    if not target.startswith(('https://', 'http://', '#')):
        assert (BASE / target).is_file(), target
patterns = [r'sb_secret_[A-Za-z0-9_-]{25,}', r'sb_publishable_[A-Za-z0-9_-]{25,}',
    r'eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}',
    r'sbp_[A-Za-z0-9]{24,}', r'github_pat_[A-Za-z0-9_]{30,}']
for file in BASE.iterdir():
    if file.is_file():
        text = file.read_text()
        assert not any(re.search(pattern, text) for pattern in patterns), file.name
print('Evidências consistentes: dados da API, contagens, hashes locais, links, referências e padrões de credenciais verificados. Ledger e implantação de Edge Functions continuam pendentes.')
