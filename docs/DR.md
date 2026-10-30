# Plano de Recuperação de Desastres (DR)

Este documento registra objetivos propostos e verificações necessárias. Nenhuma configuração de backup, PITR, replicação regional ou restauração foi comprovada nesta revisão; as metas abaixo não são SLA contratado.

## 1. Métricas de Recuperação (RTO / RPO)

| Métrica | Definição | Meta |
|---|---|---|
| **RTO** (Recovery Time Objective) | Meta proposta para voltar a operar após falha | 2 horas — não medida |
| **RPO** (Recovery Point Objective) | Meta proposta de perda máxima de dados | 24 horas — não comprovada |

## 2. Estratégia de Backup (SSOT)

*   **Banco de Dados (Supabase)**: verificar no painel do projeto de destino se backups e PITR estão habilitados, qual retenção se aplica e qual é a última restauração testada. Não presumir uma retenção padrão.
*   **Storage (Arquivos)**: confirmar versionamento, retenção e replicação por bucket. Não há evidência neste repositório de que esses recursos estejam ativos.

## 3. Cenários de Falha e Resposta

### A. Indisponibilidade Regional (Cloud Provider)
1.  Consultar a página de status oficial do provedor e confirmar o comportamento do hook `useCloudStatus` no ambiente.
2.  Se houver um modo de leitura/manutenção implementado e validado no ambiente, considerar sua ativação conforme decisão operacional. O repositório não comprova uma feature flag global para isso.
3.  Acionar o procedimento de contingência previamente validado; a existência de uma página estática de contingência não foi comprovada.

### B. Corrupção de Dados / Erro Humano
1.  Identificar o intervalo e os registros afetados usando `request_id`, `resource_id`, `created_at` e os campos disponíveis em `admin_audit_log`; essa tabela não possui coluna `transaction_id`.
2.  Antes de solicitar PITR, confirmar que o recurso e o ponto de restauração estão disponíveis para o projeto; restaurar para uma instância isolada, nunca sobrescrever o canônico durante o diagnóstico.
3.  Reprocessar eventos somente após verificar idempotência, origem e intervalo afetado. A existência de logs n8n e a capacidade de replay devem ser comprovadas para o ambiente.

## 4. Testes de DR
*   Planejar simulação de restauração em projeto isolado e registrar duração, ponto restaurado e validação funcional; não existe evidência de simulação concluída.
*   Verificar a integridade de secrets sem expor valores e sem copiar credenciais entre ambientes.
