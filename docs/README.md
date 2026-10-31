# Documentação do Portal de Brindes Sicoob V2

Este índice aponta para a documentação mantida neste repositório. Relatórios de
execução registram um retrato com data e commit; não comprovam, por si só, o
estado atual do banco, dos serviços externos ou de uma operação em produção.
O projeto permanece em construção até que os critérios de piloto e go-live
sejam atendidos.

## Comece por aqui

1. [README do projeto](../README.md) — visão geral, arquitetura e instalação local.
2. [Alinhamento de escopo Sicoob](./SCOPE_ALIGNMENT.md) — escopo de produto e limites das integrações.
3. [Plano de encerramento em 100 etapas](./plano-implementacao/plano-encerramento-100-etapas-20261001/plano.md) — etapas, dependências e critérios de conclusão.
4. [Revisão do plano de 01/10/2026](./execucao/revisao-do-plano-2026-10-01.md) — evidências e pendências daquele retrato.
5. [Fechamento técnico de 08/10/2026](./execucao/fechamento-tecnico-2026-10-08.md) — validações do candidato de construção naquela data; não é confirmação do estado atual.

## Referências por assunto

- [Arquitetura](./03_ARQUITETURA_DO_SISTEMA.md)
- [Rotas](./ROUTES.md)
- [Autenticação e passkeys](./AUTH_PASSKEYS.md)
- [Segurança](./SECURITY.md) e [plano de segurança](./SECURITY_PLAN.md)
- [Banco de dados e dicionário](./DATA_DICTIONARY.md)
- [Edge Functions](./EDGE_FUNCTIONS.md) e [drift conhecido](./EDGE_FUNCTIONS_DRIFT.md)
- [Testes](./TESTING.md), [cenários E2E por papel](./CASOS_TESTE_E2E_POR_PAPEL.md) e [cobertura smoke](./E2E_SMOKE_COVERAGE.md)
- [CI/CD](./CI_CD.md), [proteção de branches](./BRANCH_PROTECTION.md) e [deploy](./DEPLOYMENT.md)
- [Observabilidade](./OBSERVABILITY.md), [recuperação de desastre](./DR.md) e [runbooks](./RUNBOOK.md)
- [Checklist de go-live](./GO_LIVE_CHECKLIST.md)

## Planos e auditorias

Os documentos abaixo são registros versionados; consulte a data, o commit e os
limites declarados dentro de cada relatório antes de usar seus resultados como
evidência atual.

- [Planos de implementação](./plano-implementacao/README.md)
- [Lacunas funcionais identificadas em 11/10/2026](./execucao/lacunas-funcionalidades-2026-10-11/01-plano-encerramento.md)
- [Auditorias e revisões de execução](./execucao/)
- [Pendências e decisões de produto](./execucao/decisoes_pendentes.md)

## Regras de segurança operacional

- Não aplique migrations diretamente com `supabase db push` neste projeto. O
  ledger histórico exige os fluxos allowlisted e protegidos documentados em
  [DEPLOYMENT.md](./DEPLOYMENT.md) e
  [MCP_DDL_APPLICATION.md](./RUNBOOKS/MCP_DDL_APPLICATION.md).
- Nunca registre tokens, senhas, chaves privadas ou conteúdo de secrets em
  commits, issues, relatórios ou logs.
- Marque uma funcionalidade como concluída somente com critério de aceite e
  evidência compatível com o ambiente e o fluxo descritos.
