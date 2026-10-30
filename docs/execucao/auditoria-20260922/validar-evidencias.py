"""Confere consistência do pacote datado; não consulta nem altera serviços."""
from collections import Counter
import hashlib
import json
from pathlib import Path
import re

BASE = Path(__file__).resolve().parent
REPO = BASE.parents[2]


def read(name):
    return json.loads((BASE / name).read_text())


git = read('git.json')
assert git['snapshot_commit'] == git['root_head'] == git['github_main']
assert git['tracked_blobs_main'] == 3551
assert len(git['local_branches']) == 5
assert all(b['identical'] for b in git['local_branches'])
assert not git['remote_branches_without_local_branch']
dirty = [f for w in git['worktrees'] for f in w['dirty']]
assert len(dirty) == 11
assert all(not f['same_blob_at_remote_head'] for f in dirty)

external = read('arquivos-externos.json')
assert len(external) == 101
missing = [f for f in external if not f['identical_on_github_heads']]
assert len(missing) == 66
assert sum(f['bytes'] for f in missing) == 103457061
assert Counter(f['folder'] for f in external) == {
    'Brindes Sicoob V2 - Docs': 26,
    'Brindes Sicoob V2 - Analise': 53,
    'Brindes Sicoob V2 - Plano de Implementacao': 22,
}

migrations = read('migrations.json')
assert len(migrations['files']) == 515
assert sum(f['active'] for f in migrations['files']) == 495
assert not migrations['duplicate_active_versions']
edge = read('edge-local.json')
assert edge['entrypoint_count'] == len(edge['functions']) == 103
manifest = migrations['files'] + edge['shared_files'] + edge['configuration_files']
manifest += [f for function in edge['functions'] for f in function['files']]
for f in manifest:
    file = REPO / f.get('path', f.get('file'))
    assert hashlib.sha256(file.read_bytes()).hexdigest() == f['sha256'], str(file)

consolidated = read('referencias-consolidadas.json')
calls = [c for calls in consolidated['resources'].values() for c in calls]
assert consolidated['calls_count'] == len(calls) == 83
assert consolidated['resource_count'] == len(consolidated['resources']) == 22
assert len({(c['file'], c['line'], c['resource']) for c in calls}) == 83
assert not consolidated['live_database_verified']
for c in calls:
    lines = (REPO / c['file']).read_text().splitlines()
    # O scanner informa o início da expressão; .from/.rpc pode vir abaixo.
    start = c['line'] - 1
    assert any(c['resource'] in line for line in lines[start:start + 8]), f"{c['file']}:{c['line']}"

ci = read('github-ci.json')
assert len(ci) == 10
for workflow in ci:
    assert workflow['conclusion'] == 'failure'
    assert workflow['jobs']
    assert any(job['conclusion'] == 'failure' for job in workflow['jobs'])
    for job in workflow['jobs']:
        assert not job['steps']
        assert job['conclusion'] in ('failure', 'skipped')
        if job['conclusion'] == 'failure':
            assert any('Actions budget' in a.get('message', '') for a in job['annotations'])

access = read('acesso-banco.json')
assert not access['database_catalogues_read_successfully']
assert [p['http'] for p in access['probes']] == [401, 401, 403]

report = (BASE / 'RELATORIO.md').read_text()
for target in re.findall(r'\]\(([^)]+)\)', report):
    if not target.startswith(('https://', 'http://', '#')):
        assert (BASE / target).is_file(), target

# Evita que uma captura inclua acidentalmente credenciais reconhecíveis.
patterns = [r'eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}',
            r'sbp_[A-Za-z0-9]{24,}', r'gh[pousr]_[A-Za-z0-9]{24,}',
            r'github_pat_[A-Za-z0-9_]{30,}']
for file in BASE.iterdir():
    if file.is_file():
        content = file.read_text()
        assert not any(re.search(pattern, content) for pattern in patterns), file.name

print('Pacote consistente: contagens, hashes locais, referências, links e ausência dos padrões de credenciais conferidos. Banco atual continua não validado.')
