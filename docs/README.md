# Documentação do Brindes Sicoob V2

**Atualizado em:** 30/10/2026. O portal está em construção. Os documentos abaixo registram código, planejamento e evidências locais; não certificam implantação, operação comercial, configuração de terceiros nem estado de banco remoto.

## Estado e execução

- [Progresso técnico de 30/10/2026](execucao/progresso-plano-2026-10-30.md) — alterações e validações locais, com limites explícitos.
- [Plano de encerramento em 100 etapas](plano-implementacao/README.md) — 1.000 evidências obrigatórias; nenhuma etapa é encerrada apenas por existir código.
- [Relatório CI](../RELATORIO_CI.md) e [pendências de CI](../PENDENCIAS.md) — resultados e bloqueios registrados com links para runs.
- [Inventário de funcionalidades v2](INVENTARIO_FUNCIONALIDADES_v2.md) — referência histórica de 03/05/2026, não é inventário atual nem fonte de verdade.
- [Índice de módulos](MODULES.md) — mapa técnico sujeito à validação do código e do runtime.

## Operação e infraestrutura

- [CI e entrega](CI_CD.md)
- [Publicação e migrações](DEPLOYMENT.md)
- [Secrets exigidos pelos workflows](secrets.md)
- [Runbook operacional](RUNBOOK.md)
- [Recuperação de desastres](DR.md) — metas propostas; backups, PITR e restauração ainda precisam de comprovação por ambiente.
- [Plano de segurança](SECURITY_PLAN.md) — planejamento; não comprova pentest ou monitoramento externo ativos.
- [Observabilidade](OBSERVABILITY.md) — instrumentação no código e propostas externas, com limites de cobertura.

## Políticas e contexto

- [Política de idioma pt-BR](POLITICA_IDIOMA_PT_BR.md)
- [Configuração de locale pt-BR](CONFIGURACAO_LOCALE_PT_BR.md)
- [Plano Sicoob](plano-implementacao/plano-encerramento-100-etapas-20261001/plano.md)
- [Auditoria histórica de lacunas, 11/10/2026](execucao/lacunas-funcionalidades-2026-10-11/01-plano-encerramento.md) — baseada no commit `dc08200`; seus achados precisam ser revalidados antes de uso como backlog atual.

Os inventários e planos antigos são preservados para rastreabilidade. Quando divergirem do progresso datado, trate-os como histórico e confirme os fatos no código, workflows e evidências do ambiente correspondente.
