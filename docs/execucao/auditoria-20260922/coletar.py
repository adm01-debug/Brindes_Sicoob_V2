"""Coleta evidências locais/GitHub sem alterar código, branches ou serviços.

Não lê valores de credenciais. Consultas ao banco devem ser anexadas
separadamente; o inventário versionado é uma evidência histórica.
"""
import collections
import hashlib
import json
from pathlib import Path
import re
import subprocess
from datetime import datetime, timezone

ROOT = Path('/home/joaquim_ataides/projetos/Brindes_Sicoob_V2')
AUDIT = Path(__file__).resolve().parent
SNAPSHOT = AUDIT.parents[2]


def run(args, cwd=ROOT):
    r = subprocess.run(args, cwd=cwd, capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(f'Falha ao executar {args[0]} (código {r.returncode})')
    return r.stdout


def git(*args, cwd=ROOT):
    return run(['git', *args], cwd)


def save(name, value):
    (AUDIT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def tree(ref):
    result = {}
    for line in git('ls-tree', '-r', ref).splitlines():
        meta, path = line.split('\t', 1)
        mode, kind, sha = meta.split()
        if kind == 'blob':
            result[path] = sha
    return result


now = datetime.now(timezone.utc).isoformat()
remote = {ref.removeprefix('refs/heads/'): sha for sha, ref in
          (line.split() for line in git('ls-remote', '--heads', 'origin').splitlines())}
trees = {name: tree(sha) for name, sha in remote.items()}
all_blobs = collections.defaultdict(list)
for branch, entries in trees.items():
    for path, sha in entries.items():
        all_blobs[sha].append({'branch': branch, 'path': path})

worktrees = []
for part in git('worktree', 'list', '--porcelain').strip().split('\n\n'):
    fields = dict(line.split(' ', 1) for line in part.splitlines() if ' ' in line)
    path = Path(fields['worktree'])
    if path == SNAPSHOT:
        continue
    dirty = []
    for raw in git('status', '--porcelain=v1', '--untracked-files=all', cwd=path).splitlines():
        file = raw[3:]
        actual = path / file
        blob = git('hash-object', '--', file, cwd=path).strip() if actual.is_file() else None
        dirty.append({'status': raw[:2], 'file': file, 'blob': blob,
                      'same_blob_at_remote_head': all_blobs.get(blob, [])})
    branch = fields.get('branch', '').removeprefix('refs/heads/')
    ignored = git('ls-files', '--others', '--ignored', '--exclude-standard', '-z', cwd=path).split('\0')
    grouped = collections.Counter(f.split('/')[0] for f in ignored if f)
    worktrees.append({'path': str(path), 'branch': branch, 'head': fields['HEAD'],
                      'remote_head': remote.get(branch), 'head_equals_remote': fields['HEAD'] == remote.get(branch),
                      'dirty': dirty, 'ignored_count_by_root': dict(grouped)})

local_refs = []
for line in git('for-each-ref', '--format=%(refname:short) %(objectname)', 'refs/heads').splitlines():
    name, sha = line.split()
    if name == 'audit/sicoob-20260922':
        continue
    local_refs.append({'branch': name, 'sha': sha, 'remote_sha': remote.get(name), 'identical': remote.get(name) == sha})
main = trees['main']
save('git.json', {'collected_at': now, 'snapshot_commit': git('rev-parse', 'HEAD', cwd=SNAPSHOT).strip(),
                  'root_head': git('rev-parse', 'HEAD').strip(), 'github_main': remote['main'],
                  'github_main_tree': git('rev-parse', remote['main'] + '^{tree}').strip(),
                  'tracked_blobs_main': len(main), 'local_branches': local_refs, 'github_branches': remote,
                  'remote_branches_without_local_branch': sorted(set(remote) - {x['branch'] for x in local_refs}),
                  'worktrees': worktrees})

external = []
for folder in ['Brindes Sicoob V2 - Docs', 'Brindes Sicoob V2 - Analise', 'Brindes Sicoob V2 - Plano de Implementacao']:
    base = ROOT.parent / folder
    for file in sorted(base.rglob('*')):
        if not file.is_file():
            continue
        raw = file.read_bytes()
        oid = hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
        external.append({'folder': folder, 'file': str(file.relative_to(base)), 'bytes': len(raw),
                         'sha256': hashlib.sha256(raw).hexdigest(), 'git_blob': oid,
                         'identical_on_github_heads': all_blobs.get(oid, [])})
save('arquivos-externos.json', external)

migrations = []
for folder in ['migrations', 'migrations_archive']:
    for file in sorted((SNAPSHOT / 'supabase' / folder).rglob('*.sql')):
        migrations.append({'path': str(file.relative_to(SNAPSHOT)), 'version': file.name.split('_')[0],
                           'sha256': hashlib.sha256(file.read_bytes()).hexdigest(),
                           'active': folder == 'migrations'})
duplicates = collections.defaultdict(list)
for item in migrations:
    if item['active']:
        duplicates[item['version']].append(item['path'])
save('migrations.json', {'files': migrations, 'duplicate_active_versions': {k: v for k, v in duplicates.items() if len(v) > 1},
                        'remote_ledger_verified': False})

cache = json.loads((SNAPSHOT / 'scripts/db/.inventory-cache.json').read_text())
types = (SNAPSHOT / 'src/integrations/supabase/types.ts').read_text()
type_sections = {}
for kind, end in [('Tables', 'Views'), ('Views', 'Functions'), ('Functions', 'Enums')]:
    section = types.split('    ' + kind + ': {', 1)[1].split('    ' + end + ': {', 1)[0]
    type_sections[kind.lower()] = re.findall(r'^      (\w+): \{', section, re.M)
comparison = {}
for kind, values in type_sections.items():
    comparison[kind] = {'types_count': len(values), 'cache_count': len(cache[kind]),
                        'types_only': sorted(set(values) - set(cache[kind])),
                        'cache_only': sorted(set(cache[kind]) - set(values))}
save('tipos-versus-cache.json', {'cache_date': cache.get('generated_at'), 'live_database_verified': False,
                                'comparison': comparison})

r = subprocess.run(['node', 'scripts/db/check-runtime-refs.mjs', '--json'], cwd=SNAPSHOT, text=True, capture_output=True)
runtime_exit = r.returncode
save('referencias-runtime.json', {'exit_code': r.returncode, 'live_database_verified': False, 'result': json.loads(r.stdout)})

save('github-prs.json', json.loads(run(['gh', 'pr', 'list', '--state', 'all', '--limit', '100', '--json',
    'number,title,state,mergedAt,headRefName,headRefOid,url'])))
save('github-protecao.json', json.loads(run(['gh', 'api', 'repos/adm01-debug/Brindes_Sicoob_V2/branches/main/protection'])))
save('github-secrets-nomes.json', json.loads(run(['gh', 'secret', 'list', '--json', 'name,updatedAt'])))
runs = json.loads(run(['gh', 'run', 'list', '--limit', '100', '--json',
                     'databaseId,headSha,workflowName,status,conclusion,createdAt,event,url']))
latest = {}
for r in runs:
    latest.setdefault(r['workflowName'], r)
for r in latest.values():
    data = json.loads(run(['gh', 'api', f'repos/adm01-debug/Brindes_Sicoob_V2/actions/runs/{r["databaseId"]}/jobs']))
    r['jobs'] = []
    for job in data.get('jobs', []):
        item = {key: job.get(key) for key in ['id', 'name', 'conclusion', 'steps', 'started_at', 'completed_at']}
        item['annotations'] = json.loads(run(['gh', 'api', f'repos/adm01-debug/Brindes_Sicoob_V2/check-runs/{job["id"]}/annotations']))
        r['jobs'].append(item)
save('github-ci.json', list(latest.values()))

print(json.dumps({'worktrees': len(worktrees), 'dirty_files': sum(len(w['dirty']) for w in worktrees),
                  'external_files': len(external), 'external_without_identical_github_blob': sum(not x['identical_on_github_heads'] for x in external),
                  'migrations': len(migrations), 'runtime_exit': runtime_exit, 'evidence_directory': str(AUDIT)}, ensure_ascii=False))
