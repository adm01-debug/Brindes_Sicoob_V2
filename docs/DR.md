# 🆘 Plano de Recuperação de Desastres (DR)

Este documento estabelece os procedimentos e métricas de recuperação para o sistema.

## 1. Métricas de Recuperação (RTO / RPO)

| Métrica | Definição | Meta |
|---|---|---|
| **RTO** (Recovery Time Objective) | Tempo máximo para o sistema voltar a operar após falha | 2 horas |
| **RPO** (Recovery Point Objective) | Perda máxima de dados aceitável (idade do backup) | 24 horas |

## 2. Estratégia de Backup (SSOT)

*   **Banco de Dados (Supabase)**:
    *   Backups automáticos diários gerenciados pela plataforma.
    *   Snapshots PITR (Point-in-Time Recovery) ativos para os últimos 7 dias.
    *   Logs de transações replicados em tempo real.
*   **Storage (Arquivos)**:
    *   Versioning ativo em buckets de orçamentos e artes.
    *   Replicação regional automática.

## 3. Cenários de Falha e Resposta

### A. Indisponibilidade Regional (Cloud Provider)
1.  Monitorar status oficial do provedor via `useCloudStatus`.
2.  Ativar aviso de "Modo de Leitura" via Feature Flag se o banco de dados principal estiver instável.
3.  Redirecionar tráfego para página de manutenção estática (Edge Runtime).

### B. Corrupção de Dados / Erro Humano
1.  Identificar o `transaction_id` ou timestamp exato do incidente via `admin_audit_log`.
2.  Utilizar o PITR do Supabase para restaurar uma nova instância do banco até 1 minuto antes do erro.
3.  Re-executar webhooks de entrada (n8n logs) para preencher o gap de dados entre o restore e o tempo atual.

## 4. Testes de DR
*   Simulação semestral de restauração de banco de dados em ambiente de `staging`.
*   Verificação de integridade de secrets e chaves de integração.
