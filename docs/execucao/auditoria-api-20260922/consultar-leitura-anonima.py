"""HEADs conferem visibilidade anônima sem baixar registros de negócio."""
import concurrent.futures
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
import urllib.error
import urllib.request

BASE = Path(__file__).resolve().parent
key = json.load(sys.stdin)['public']
resources = json.loads((BASE / 'acesso-atual.json').read_text())['relations']


def check(name):
    url = 'https://cfmzkthhgliqelozlmwu.supabase.co/rest/v1/' + name + '?select=*&limit=0'
    req = urllib.request.Request(url, method='HEAD', headers={
        'apikey': key, 'Prefer': 'count=exact', 'User-Agent': 'Auditoria-Sicoob/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            total = (response.headers.get('Content-Range') or '').split('/')[-1]
            return {'resource': name, 'http': response.status, 'rows': int(total) if total.isdigit() else None}
    except urllib.error.HTTPError as err:
        return {'resource': name, 'http': err.code, 'rows': None}
    except (TimeoutError, urllib.error.URLError) as err:
        return {'resource': name, 'error': type(err).__name__, 'rows': None}


with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    rows = list(pool.map(check, resources))
result = {'collected_at': datetime.now(timezone.utc).isoformat(), 'method': 'HEAD',
    'credential': 'publishable, sem sessão de usuário', 'probes': rows}
(BASE / 'leitura-anonima.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'total': len(rows), 'with_visible_rows': [r for r in rows if r['rows']],
                  'request_errors': [r for r in rows if 'error' in r]}, ensure_ascii=False))
