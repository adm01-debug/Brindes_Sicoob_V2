"""Cruza achados estáticos com o contrato atual da API, sem consultar serviços."""
from collections import Counter
from datetime import datetime, timezone
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent


def read(name):
    return json.loads((BASE / name).read_text())


api = read('openapi-servidor.json')
relations = set(api['definitions'])
rpcs = {p.removeprefix('/rpc/') for p in api['paths'] if p.startswith('/rpc/')}
findings = []
for entry in read('referencias-verificador.json')['broken']:
    found = entry['name'] in (rpcs if entry['kind'] == 'rpc' else relations)
    findings.append({'file': entry['file'], 'line': entry['line'], 'resource': entry['name'],
        'kind': entry['kind'], 'present_in_api': found, 'source': 'verificador existente'})
for entry in read('referencias-wrappers.json')['calls']:
    if entry['resource'] not in relations:
        findings.append({'file': entry['file'], 'line': entry['line'], 'resource': entry['resource'],
            'kind': 'from', 'present_in_api': False, 'source': 'AST untypedFrom'})
unique = {(f['file'], f['line'], f['resource']): f for f in findings}
missing = [f for f in unique.values() if not f['present_in_api']]
out = {'live_api_metadata': True, 'scope': 'Revalidação dos achados do scanner histórico e de todos os wrappers untypedFrom.',
    'count': len(missing), 'resources_count': len({f['resource'] for f in missing}),
    'counts_per_resource': dict(sorted(Counter(f['resource'] for f in missing).items())), 'calls': missing}
(BASE / 'referencias-versus-api.json').write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: v for k, v in out.items() if k != 'calls'}, ensure_ascii=False))
