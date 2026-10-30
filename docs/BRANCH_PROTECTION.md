# Proteção da branch `main`

## Estado observado em 30/10/2026

Consulta read-only às configurações remotas de `main` confirmou: PR obrigatória,
uma aprovação, descarte de aprovações antigas, aprovação após o último push,
branch atualizada antes do merge, resolução de conversas, 10 checks obrigatórios,
aplicação da regra a administradores, force push e exclusão desativados. Os nomes
e o resultado por SHA devem ser conferidos no GitHub antes de cada merge; a lista
de checks obrigatórios não prova que um workflow específico esteja verde.

Os cenários negativos abaixo (bypass administrativo, force push e exclusão) não
foram executados nesta revisão. A configuração observada é evidência de política,
mas não substitui um teste controlado e autorizado desses bloqueios.

## Configuração alvo

Em <https://github.com/adm01-debug/Brindes_Sicoob_V2/settings/branches>, a
regra remota de `main` foi observada exigindo:

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
