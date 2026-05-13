# 🛠️ Procedimento de Hotfix

Este documento descreve o fluxo para correções emergenciais em produção.

## 1. Identificação
Qualquer erro que cause **parada total** de uma funcionalidade crítica (Orçamentos, Auth, Bridge) é classificado como **P0**.

## 2. Fluxo de Execução
1. **Branch**: Criar uma branch a partir da `main` com prefixo `hotfix/` (ex: `hotfix/corrigir-timeout-bridge`).
2. **Reprodução**: Criar um caso de teste (Vitest ou Playwright) que falhe antes da correção.
3. **Correção**: Implementar a mudança mínima necessária.
4. **Validação**: Executar suíte de `smoke tests` localmente:
   ```bash
   npm run test:smoke
   ```
5. **Merge**: Realizar PR para `main`. O merge deve disparar o workflow `quality` automaticamente.

## 3. Checklist Pós-Deploy
- [ ] Verificar `Dashboard de Telemetria` (/admin/telemetria) por 5 minutos.
- [ ] Monitorar logs de erro no Supabase.
- [ ] Validar correção no ambiente de produção usando uma conta de teste.

## 4. Post-Mortem
Incidentes P0 exigem um breve post-mortem no diretório `docs/incidents/` detalhando a causa raiz e ações preventivas.
