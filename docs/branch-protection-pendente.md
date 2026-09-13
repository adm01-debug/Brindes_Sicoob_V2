# Proteção de branch em `main` — pendente de aprovação

Etapa 07 do [plano de 50 etapas](./plano-melhorias-50-etapas.md). Bloqueado pelo
classificador de permissão do modo automático (mudança de governança em todo o
repositório) — corretamente, dado que decide se o Lovable consegue continuar
sincronizando o projeto.

## O que foi confirmado

- Você confirmou: **o Lovable às vezes empurra direto para `main`** (sem PR).
- Identidade do Lovable no GitHub: usuário bot **`lovable-dev[bot]`**, id numérico
  **`159125892`** (confirmado via `gh api users/lovable-dev%5Bbot%5D`).
- Hoje `main` não tem nenhum ruleset (`gh api .../rulesets` retorna `[]`).

## Comando pronto para rodar (com bypass explícito para o Lovable)

```bash
cat > /tmp/ruleset.json <<'EOF'
{
  "name": "main-protection",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [
    { "actor_id": 159125892, "actor_type": "Integration", "bypass_mode": "always" }
  ],
  "conditions": { "ref_name": { "include": ["refs/heads/main"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": false
      }
    }
  ]
}
EOF
gh api repos/adm01-debug/Brindes_Sicoob_V2/rulesets --method POST --input /tmp/ruleset.json
```

## O que isso faz e não faz

- **Bloqueia**: push direto de qualquer humano/token que não seja o app do Lovable,
  deleção da branch, force-push (`non_fast_forward`).
- **Não bloqueia**: o app `lovable-dev[bot]` continua podendo empurrar direto —
  `bypass_mode: "always"` isenta esse ator de toda regra do ruleset.
- **`required_approving_review_count: 0`**: propositalmente sem exigir aprovação
  humana ainda, porque os required status checks (CI) dependem dos secrets das
  etapas 03/04 estarem configurados — subir isso para 1 antes disso deixaria
  todo PR travado sem ninguém poder aprovar contra um check que nunca roda.
  Depois de configurar os secrets, trocar para `1` e adicionar
  `required_status_checks` com os nomes exatos dos jobs (`Qualidade contínua`,
  `Portal Sicoob`, `CodeQL`, `Security Scan`, `Bundle Size Check`,
  `E2E (Playwright)`).

## Por que não rodei sozinho

Regra de segurança do Claude Code para ações de escrita em governança de
repositório (outward-facing, difícil de reverter em termos de impacto no seu
fluxo de trabalho caso o bypass esteja errado). Rode o comando acima quando
quiser ativar, ou peça para eu rodar e eu tento de novo — a permissão pode ser
concedida por sessão.
