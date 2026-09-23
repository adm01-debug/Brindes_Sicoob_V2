# Proteção da branch `main`

## Estado observado em 22/09/2026

A regra remota exige uma revisão, mas não possui status checks obrigatórios e
permite bypass administrativo. PRs recentes foram mesclados com jobs em falha
porque o orçamento do GitHub Actions impediu a inicialização. Portanto, a
proteção atual não comprova qualidade nem segurança do conteúdo mesclado.

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
