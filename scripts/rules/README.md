# rules — levantamento de falhas, gaps e melhorias, sem IA

**O que faz:** roda regras determinísticas sobre o repositório e gera um relatório
(`latest.md` + `latest.json`) ordenado por severidade. Cada regra checa algo que o projeto **já
definiu** (doc, gate de CI, convenção); o runner não inventa regra de negócio. Hoje: RLS estático
das migrations, `SECURITY DEFINER` sem `search_path`, edge functions fora do inventário/sem teste,
etapas verificáveis do `docs/plano-melhorias-50-etapas.md` e os gates `check-*.mjs` já existentes.
Só lê o repositório (os gates existentes rodam em sequência, um por vez).

**Como rodar:**

```bash
npm run gaps                                 # tudo -> reports/gaps/latest.{md,json} (ignorado pelo git)
node scripts/rules/run.mjs --list            # lista as regras
node scripts/rules/run.mjs --only rls,edge   # filtra por prefixo de id
node scripts/rules/run.mjs --strict          # exit 1 se houver achado alto OU regra com erro
```

**Limites:** RLS e `SECURITY DEFINER` são análise **estática** (não seguem `RENAME` nem SQL dinâmico
completo): é levantamento, não prova. A confirmação definitiva é `scripts/scan-rls-security.mjs`
(precisa de service key). Regra com `error` é inconclusiva, nunca "sem achados".

**Rotina agendada (`rotina.mjs`):** faz `git fetch`, analisa um worktree temporário do
`origin/main` (resolve clone defasado e não toca no working tree), compara com a execução anterior
(`diff.mjs`: novos/resolvidos; regra com erro fica fora da comparação) e grava em
`~/relatorios/gaps-brindes-sicoob-v2/AAAA-MM-DD/` + `ULTIMO.md` (retém 30 dias). Pula se a carga
estiver alta ou se já houver execução. Exemplo de timer systemd de usuário:

```ini
# ~/.config/systemd/user/gaps-brindes-sicoob.service
[Service]
Type=oneshot
ExecStart=/caminho/do/node %h/projetos/Brindes_Sicoob_V2/scripts/rules/rotina.mjs
Nice=15
# ~/.config/systemd/user/gaps-brindes-sicoob.timer
[Timer]
OnCalendar=*-*-* 07:30:00
Persistent=true
[Install]
WantedBy=timers.target
```

**Nova regra:** um arquivo em `scripts/rules/rules/` exportando `{ id, kind, severity, title, fix,
run(ctx) -> { items, note? } }` (ou um array delas). Valide contra a base real antes de confiar —
o analisador estático já errou por partições, SQL dentro de string e `search_path` aplicado em lote.

**Secrets:** nenhum (a rotina só faz `git fetch`). **Testes:** `tests/scripts/rules-*.test.ts`.
