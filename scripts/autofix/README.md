# autofix — correções mecânicas do código, sem IA

**O que faz:** aplica só correções determinísticas (mesma entrada, mesma saída), sem chamar IA nem
rede. Passos: `eslint-fix` e `prettier` (ambos só nos arquivos alterados em relação ao
`origin/main`, como o `lint-staged` já faz no commit), `docs-drift` (regenera
`docs/EDGE_FUNCTIONS_DRIFT.md`, só grava se mudar algo além do timestamp) e, **opt-in**, `colors`
(cores `amber/blue/emerald/red` → tokens `warning/info/success/destructive`, convenção já usada no
código). `colors` fica fora do padrão porque muda a aparência.

**Como rodar:**

```bash
npm run autofix                        # simula: mostra o que mudaria e desfaz
npm run autofix:apply                  # aplica no working tree (não faz git add/commit)
node scripts/autofix/run.mjs --steps colors,prettier
node scripts/autofix/run.mjs --all     # todos os arquivos de src/ (cuidado: churn de prettier)
node scripts/autofix/run.mjs --base origin/main --json out.json
```

**Segurança:** snapshot em memória de cada arquivo tocado. Ao final valida com eslint (sem novos
erros) e com o gate de typecheck (`check-typecheck-baseline.mjs`) quando um passo que pode alterar
tipos mexeu em `.ts/.tsx`; se falhar, **reverte tudo**. Simulação sempre reverte. Nunca usa git para
desfazer (não atropela alterações suas). Uma trava por repositório impede duas execuções ao mesmo
tempo. Saída: `0` ok · `1` validação falhou (revertido) · `2` uso/trava · `3` simulação com pendências.

**Secrets:** nenhum. **Testes:** `tests/scripts/autofix-*.test.ts`.
