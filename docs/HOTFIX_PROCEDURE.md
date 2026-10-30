# Procedimento de hotfix

Este documento descreve o fluxo para correções emergenciais em produção.

## 1. Identificação
Qualquer erro que cause **parada total** de uma funcionalidade crítica (Orçamentos, Auth, Bridge) é classificado como **P0**.

## 2. Fluxo de Execução
1. **Branch**: Criar uma branch a partir da `main` com prefixo `hotfix/` (ex: `hotfix/corrigir-timeout-bridge`).
2. **Reprodução**: Criar um caso de teste (Vitest ou Playwright) que falhe antes da correção.
3. **Correção**: Implementar a mudança mínima necessária.
4. **Validação**: Executar primeiro o teste de regressão criado e depois os gates locais aplicáveis:
   ```bash
   npm test
   npm run typecheck
   npm run lint
   npm run build
   ```
5. **Merge**: Abrir PR para `main`, aguardar revisão e todos os checks obrigatórios. O workflow de qualidade atual chama-se `Qualidade contínua`; não fazer merge com checks falhos ou pendentes.

6. **Publicação**: Seguir o procedimento versionado em [DEPLOYMENT.md](./DEPLOYMENT.md). O deploy de Edge Functions Sicoob é manual e restrito ao projeto `construction`; não executar comandos que apontem ao banco canônico.

## 3. Checklist Pós-Deploy
- [ ] Verificar `Dashboard de Telemetria` (/admin/telemetria) por 5 minutos.
- [ ] Monitorar logs de erro no Supabase.
- [ ] Validar no ambiente autorizado de construção/homologação com persona de teste.
- [ ] Só promover para produção depois de autorização formal e evidências próprias do release.

## 4. Post-Mortem
Incidentes P0 exigem um breve post-mortem no diretório `docs/incidents/` detalhando a causa raiz e ações preventivas.
