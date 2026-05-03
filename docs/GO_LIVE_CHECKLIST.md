# Checklist de Go-Live — Sicoob Platform (v2026)

Este checklist DEVE ser completado antes de qualquer deploy em produção.

## 1. Segurança & Auth
- [ ] RLS habilitada em todas as novas tabelas (`system-auth-governance`).
- [ ] `SECURITY DEFINER` com `search_path = public` em todas as novas funções.
- [ ] Teste de escalonamento de privilégios (usuário não pode ver dados de outro PA).
- [ ] Token de Cleanup E2E configurado e rotacionado.

## 2. Performance & Resiliência
- [ ] Preflight check passando (`npm run healthcheck`).
- [ ] `X-Request-Id` propagado em todas as chamadas client-side.
- [ ] Limiares de latência P95 configurados para bridges externas.
- [ ] Circuit-breaker testado para falhas no CRM.

## 3. Alçada & Negócio
- [ ] Verbas do mês atual importadas/configuradas para todos os PAs.
- [ ] Workflow de aprovação testado com o papel `gestor`.
- [ ] Notificações de alçada verificadas no dashboard do usuário.
- [ ] Auditoria de ações do gestor registrando corretamente.

## 4. Infraestrutura & Ops
- [ ] Monitor de erros (`error-monitor`) ativo e alertando.
- [ ] Dashboards de telemetria acessíveis para o time de suporte.
- [ ] Scripts de cleanup de massa de teste funcionando.
- [ ] Backup do banco de dados verificado.

---
**Responsável:** [Nome do Engenheiro]
**Data:** [Data]
**Status:** 🔴 BLOQUEADO | 🟡 RISCO | 🟢 LIBERADO
