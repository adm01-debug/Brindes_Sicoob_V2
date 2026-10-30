# 📘 Runbook Operacional — Promo Brindes

> Guia de referência. Instruções que dependem de provedor, credenciais ou configuração remota devem ser confirmadas no ambiente antes do uso.
> **Última revisão:** 30/10/2026

---

## 🚨 Resposta a Incidentes

### Classificação de Severidade

| Nível | Descrição | SLA Resposta | SLA Resolução |
|-------|-----------|-------------|---------------|
| **P0** | Sistema fora do ar / dados corrompidos | 15 min | 1 hora |
| **P1** | Funcionalidade crítica indisponível | 30 min | 4 horas |
| **P2** | Bug impactando fluxo de vendas | 2 horas | 24 horas |
| **P3** | Bug cosmético / melhoria | 24 horas | Sprint seguinte |

### Fluxo de Resposta

```
1. DETECTAR → Alerta automático (error-reporter) ou relato manual
2. CLASSIFICAR → Determinar severidade (P0-P3)
3. COMUNICAR → Notificar equipe no canal de incidentes
4. INVESTIGAR → Checar logs, métricas e banco de dados
5. MITIGAR → Aplicar fix temporário se possível
6. RESOLVER → Implementar correção definitiva
7. POSTMORTEM → Documentar usando [`docs/POSTMORTEM_TEMPLATE.md`](./POSTMORTEM_TEMPLATE.md)
```

> **Pós-incidente obrigatório:** todo P0/P1 gera post-mortem em até 48h usando o template padrão. Arquivar em `docs/postmortems/YYYY-MM-DD-slug.md`.


---

## 🔄 Procedimentos de Rotina

### Deploy de Edge Functions

Use o fluxo documentado em [`DEPLOYMENT.md`](./DEPLOYMENT.md) e [`CI_CD.md`](./CI_CD.md). Este repositório não comprova publicação automática via Lovable Cloud. Não execute deploy manual fora do fluxo aprovado e do ambiente `construction`.

### Verificação de Saúde

1. **Frontend:** Acessar a URL publicada e verificar carregamento
2. **Backend:** Verificar status e logs das Edge Functions no provedor configurado para o ambiente.
3. **Banco:** Executar query de healthcheck:
   ```sql
   SELECT count(*) FROM profiles WHERE is_active = true;
   ```
4. **Integrações:** Testar endpoint Bitrix24 via Edge Function `quote-sync`

### Rotação de secrets

1. Gerar nova chave no provedor (Bitrix24, Dropbox, etc.)
2. Atualizar no gerenciador de secrets do ambiente autorizado, seguindo [`secrets.md`](./secrets.md). Não registrar valores em logs, commits ou relatórios.
3. Verificar Edge Functions afetadas
4. Testar endpoints críticos

---

## 🗄️ Banco de Dados

### Backup e Restauração

- A frequência de backup, retenção, PITR e cobertura de Storage não foram confirmadas para os projetos conectados. Verifique a configuração efetiva e registre evidência antes de depender de restauração.
- Faça qualquer ensaio de restauração somente em projeto isolado de construção/homologação, conforme [`DR.md`](./DR.md).
- **Exportação manual:**
  ```sql
  -- Exportar orçamentos dos últimos 30 dias
  SELECT * FROM quotes 
  WHERE created_at >= now() - interval '30 days'
  ORDER BY created_at DESC;
  ```

### Queries de Diagnóstico

```sql
-- Orçamentos travados (sem atualização > 7 dias)
SELECT id, quote_number, status, updated_at 
FROM quotes 
WHERE status NOT IN ('approved', 'rejected', 'cancelled')
AND updated_at < now() - interval '7 days';

-- Usuários inativos (sem login > 30 dias)
SELECT id, full_name, email, last_login_at 
FROM profiles 
WHERE last_login_at < now() - interval '30 days'
AND is_active = true;

-- Erros recentes (últimas 24h)
SELECT action, details->>'message' as error_msg, created_at
FROM admin_audit_log 
WHERE action = 'client_error'
AND created_at >= now() - interval '24 hours'
ORDER BY created_at DESC
LIMIT 20;
```

### Manutenção — somente diagnóstico nesta referência

Esta documentação não autoriza exclusão de dados. Antes de retenção/expurgo, confirme política aprovada, escopo, backup, RLS e ambiente. Faça primeiro uma consulta somente leitura de contagem e faixa de datas em ambiente isolado. Não execute `DELETE`, `TRUNCATE` ou limpeza manual no banco canônico com base neste runbook.

---

## 🔐 Segurança

### Resposta a Vazamento de Credenciais

1. **Revogar imediatamente** a credencial comprometida
2. Rotacionar todas as chaves do mesmo provedor
3. Auditar `admin_audit_log` para acessos suspeitos
4. Verificar `login_attempts` para tentativas anômalas
5. Notificar equipe e documentar no postmortem

### Bloqueio de Usuário

```sql
-- Desativar usuário comprometido
UPDATE profiles SET is_active = false WHERE user_id = '<UUID>';

-- Verificar últimas ações do usuário
SELECT * FROM admin_audit_log 
WHERE user_id = '<UUID>' 
ORDER BY created_at DESC LIMIT 50;
```

### Auditoria de RLS

```sql
-- Verificar tabelas sem RLS
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT IN (
  SELECT tablename FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE c.relrowsecurity = true
);
```

---

## 🔥 Disaster Recovery

### Cenários e Procedimentos

#### Cenário 1: Frontend Inacessível
1. Verificar o status oficial do provedor configurado para o ambiente
2. Checar DNS e certificado SSL
3. Verificar se o build está válido (último deploy)
4. Restaurar versão anterior se necessário

#### Cenário 2: Edge Functions Falhando
1. Verificar logs da função específica
2. Checar se secrets estão configurados
3. Verificar limites de memória/CPU
4. Re-deploy da função

#### Cenário 3: Banco de Dados Corrompido
1. **NÃO tente corrigir manualmente**
2. Contactar o suporte do provedor contratado
3. Solicitar restauração conforme o plano de DR e apenas após confirmar ponto, escopo e destino isolado
4. Validar integridade após restauração

#### Cenário 4: Integração Bitrix24 Offline
1. Orçamentos continuam funcionando localmente
2. Sincronizações pendentes ficam na fila
3. Quando Bitrix voltar, executar sync manual
4. Verificar dados duplicados

---

## 📊 Métricas de Monitoramento

| Métrica | Threshold Alerta | Threshold Crítico |
|---------|------------------|--------------------|
| Tempo de resposta API | > 2s | > 5s |
| Taxa de erro (5xx) | > 1% | > 5% |
| Erros JS no cliente | > 10/hora | > 50/hora |
| Login failures | > 5/min | > 20/min |
| Queries lentas (>1s) | > 5/hora | > 20/hora |

---

## 📞 Contatos de Escalação

| Nível | Quem | Quando |
|-------|------|--------|
| L1 | Desenvolvedor de plantão | P2-P3 |
| L2 | Tech Lead | P1 |
| L3 | CTO + Suporte Lovable | P0 |

---

**Mantido por:** Equipe de Desenvolvimento  
**Revisão:** Trimestral  
**Próxima revisão:** Julho 2026
