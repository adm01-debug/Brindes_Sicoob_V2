# Proteção da branch `main`

## Estado observado em 22/09/2026

A regra remota exige uma revisão, mas não possui status checks obrigatórios e
permite bypass administrativo. PRs recentes foram mesclados com jobs em falha
porque o orçamento do GitHub Actions impediu a inicialização. Portanto, a
proteção atual não comprova qualidade nem segurança do conteúdo mesclado.

## Estado configurado em 31/10/2026

Ajustes aplicados via API (`gh api`) por `adm01-debug`:

- `allow_auto_merge: true` — PR verde entra sozinho após `gh pr merge --auto --squash`.
- `delete_branch_on_merge: true` — branch remota removida após merge.
- `required_approving_review_count: 0` (antes: 1) — o repositório possui um
  único colaborador humano e o GitHub proíbe aprovar o próprio PR; a exigência
  de 1 review tornava todo PR estruturalmente não mesclável sem bypass.
  Os 10 status checks obrigatórios, `strict` (branch atualizada), `enforce_admins`,
  bloqueio de force push e de exclusão permanecem ativos.
- `dismiss_stale_reviews: true` mantido.

Quando houver um segundo revisor humano, restaurar `required_approving_review_count: 1`.

## Configuração alvo

Em <https://github.com/adm01-debug/Brindes_Sicoob_V2/settings/branches>, a
regra de `main` deve exigir:

- pull request com pelo menos uma aprovação;
- descarte de aprovação após novo commit;
- resolução de todas as conversas;
- branch atualizada antes do merge;
- checks de qualidade, Sicoob, segurança, drift de migrations e E2E aplicáveis;
- aplicação da regra também a administradores;
- force push e exclusão desativados.

Os nomes exatos dos checks devem ser selecionados a partir de uma execução
verde, pois o GitHub registra o nome do job, não apenas o arquivo do workflow.
O `branch-protection-sentinel.yml` fornece auditoria complementar; ele não
substitui a regra do GitHub.

## Validação após configurar

1. Abrir um PR sem aprovação e confirmar que o merge está bloqueado.
2. Fazer um check obrigatório falhar e confirmar que uma aprovação não libera o merge.
3. Tentar bypass com conta administrativa e confirmar a recusa.
4. Confirmar que force push e exclusão de `main` são recusados.
5. Registrar data, responsável e captura da configuração na evidência de release.

Hotfixes seguem PR, revisão e checks. Exceções precisam de incidente registrado
e revisão posterior; não devem permanecer como bypass permanente.
