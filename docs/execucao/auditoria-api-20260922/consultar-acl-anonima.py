"""Sondas GET sem sessão de usuário, com IDs nulos e sem operações de escrita."""
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
import urllib.error
import urllib.parse
import urllib.request

key = json.load(sys.stdin)['public']
zero = '00000000-0000-0000-0000-000000000000'
common = {'p_actor_id': zero, 'p_idempotency_key': 'auditoria-somente-leitura', 'p_request_hash': '0' * 64}
probes = [
    ('get_sicoob_reorder_idempotency', {**common, 'p_order_id': zero}),
    ('get_sicoob_kit_quote_idempotency', common),
    ('check_sicoob_access_matrix', {'_test_role': 'admin'}),
    ('audit_security_definer_acl', {}),
]
results = []
for name, params in probes:
    url = 'https://cfmzkthhgliqelozlmwu.supabase.co/rest/v1/rpc/' + name + '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={'apikey': key, 'User-Agent': 'Auditoria-Sicoob/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.load(response)
            results.append({'rpc': name, 'http': response.status, 'result_type': type(data).__name__,
                'result_count': len(data) if isinstance(data, list) else None})
    except urllib.error.HTTPError as err:
        body = json.loads(err.read())
        results.append({'rpc': name, 'http': err.code, 'code': body.get('code'), 'message': body.get('message')})
result = {'collected_at': datetime.now(timezone.utc).isoformat(),
    'credential': 'publishable, sem sessão de usuário', 'method': 'GET', 'probes': results}
Path(__file__).with_name('acl-anonima.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(result, ensure_ascii=False))
