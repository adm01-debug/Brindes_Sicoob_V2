from pathlib import Path
from collections import Counter
import json
from graphify.detect import detect, save_manifest
from graphify.extract import extract
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json
from graphify.diagnostics import diagnose_extraction, format_diagnostic_report

root = Path('supabase/functions').resolve()
out = Path('graphify-out')
detection = detect(root)
assert not any(detection['files'].get(k) for k in ('document', 'paper', 'image', 'video'))
extraction = extract([Path(p) for p in detection['files']['code']], cache_root=root)
graph = build_from_json(extraction, root=str(root), directed=True)
assert graph.number_of_nodes() > 0
communities = cluster(graph)
labels = {}
for key, nodes in communities.items():
    names = Counter(Path(graph.nodes[n].get('source_file', 'sem_origem')).parts[0] for n in nodes if graph.nodes[n].get('source_file'))
    labels[key] = 'Backend: ' + (names.most_common(1)[0][0] if names else str(key))
cohesion = score_all(graph, communities)
gods = god_nodes(graph)
surprises = surprising_connections(graph, communities)
questions = suggest_questions(graph, communities, labels)
assert to_json(graph, communities, str(out / 'graph.json'), community_labels=labels)
report = generate(graph, communities, cohesion, labels, gods, surprises, detection, {'input': 0, 'output': 0}, str(root), suggested_questions=questions)
(out / 'GRAPH_REPORT.md').write_text(report)
(out / '.graphify_root').write_text(str(root))
save_manifest(detection['files'], root=str(root))
health = diagnose_extraction(extraction, directed=True, root=str(root))
(out / 'diagnostico.json').write_text(json.dumps(health, ensure_ascii=False, indent=2))
(out / 'cost.json').write_text(json.dumps({'input_tokens': 0, 'output_tokens': 0, 'method': 'AST determinística; sem extração semântica'}, ensure_ascii=False))
print(f"{detection['total_files']} arquivos; {graph.number_of_nodes()} nós; {graph.number_of_edges()} relações; {len(communities)} comunidades")
print(format_diagnostic_report(health))
