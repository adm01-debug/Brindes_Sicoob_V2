"""Sondas GET autenticadas; registra somente status e mensagens sem credenciais."""
from pathlib import Path
import json
import urllib.request
import urllib.error
from datetime import datetime, timezone
import tomllib

ROOT = Path('/home/joaquim_ataides/projetos/Brindes_Sicoob_V2')
PROJECT = 'cfmzkthhgliqelozlmwu'
result = {'collected_at': datetime.now(timezone.utc).isoformat(), 'project': PROJECT,
          'environment': 'construção, conforme confirmação do usuário', 'probes': []}


def get(url, headers, label):
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=25) as response:
            result['probes'].append({'name': label, 'http': response.status})
    except urllib.error.HTTPError as err:
        try:
            message = json.loads(err.read()).get('message', '')
        except (ValueError, UnicodeError):
            message = 'Resposta não JSON'
        result['probes'].append({'name': label, 'http': err.code, 'message': message})
    except Exception as err:
        result['probes'].append({'name': label, 'error': type(err).__name__})


env = {}
for line in (ROOT / '.env.production').read_text().splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        key, value = line.split('=', 1)
        env[key.strip()] = value.strip().strip('"').strip("'")
expected = 'https://' + PROJECT + '.supabase.co'
assert env.get('VITE_SUPABASE_URL') == expected, 'Projeto diferente: sonda cancelada'
for name in ['VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY']:
    key = env.get(name)
    if key:
        get(expected + '/rest/v1/', {'apikey': key, 'Authorization': 'Bearer ' + key}, name)
pat = Path('/home/joaquim_ataides/.supabase/access-token')
if pat.exists() and pat.read_text().strip().startswith('sbp_'):
    get('https://api.supabase.com/v1/projects/' + PROJECT,
        {'Authorization': 'Bearer ' + pat.read_text().strip()}, 'CLI: leitura de metadados do projeto')
config = tomllib.loads(Path('/home/joaquim_ataides/.codex/config.toml').read_text())
result['mcp_configured'] = 'brindes_sicoob_v2' in config.get('mcp_servers', {})
credentials = json.loads(Path('/home/joaquim_ataides/.codex/.credentials.json').read_text())
entry = next((v for k, v in credentials.items() if k.startswith('brindes_sicoob_v2|')), {})
expiry = entry.get('expires_at', 0)
result['mcp_saved_session_expired'] = expiry < datetime.now(timezone.utc).timestamp() * 1000
result['database_catalogues_read_successfully'] = False
Path(__file__).with_name('acesso-banco.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(result, ensure_ascii=False))
