# Guia de deploy

## Pré-requisitos
- Node.js 24+
- Projeto Supabase vinculado ao ambiente de construção
- Segredos configurados no painel/Vault do ambiente; nunca em `.env` versionado

## Etapas

1. Instalar dependências reproduzíveis:
```bash
npm ci
```

2. Configurar `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no provedor de hospedagem. Este repositório não possui `.env.example` e não deve receber segredos administrativos em arquivos locais versionados.

3. Antes das migrations de operações internas, configurar `INTERNAL_FUNCTION_SECRET`
   nas Edge Functions e os segredos `sicoob_project_url` e
   `sicoob_internal_function_secret` no Vault. Os dois segredos internos devem
   ter o mesmo valor aleatório de pelo menos 32 caracteres.

4. Publicar primeiro as Edge Functions que substituem os caminhos privilegiados
   legados. Isso garante que a revogação das RPCs no banco não deixa a aplicação
   sem um caminho autenticado equivalente:
```bash
npx supabase functions deploy send-notification process-batch-export monthly-health-report system-healthcheck external-connections-sync --project-ref cfmzkthhgliqelozlmwu
```

5. Compilar:
```bash
npm run build
```

6. Publicar o frontend pelo provedor configurado.

7. Aplicar somente as migrations novas e revisadas em ordem de versão no ambiente
   de construção. **Não executar `supabase db push --linked`** enquanto o ledger
   histórico estiver divergente: ele tentaria reaplicar centenas de arquivos que
   não representam o baseline remoto. Neste lote, aplicar
   `20260923110000_harden_internal_operations.sql`,
   `20260923111000_schedule_secure_export_worker.sql`,
   `20260923112000_fix_connection_sync_and_favorites.sql` e
   `20260923130000_secure_sicoob_documents_and_exports.sql`, registrando cada uma
   no ledger na mesma transação de aplicação.

8. Verificar após a aplicação: as três versões aparecem no ledger, as chamadas
   anônimas às funções internas retornam `401` ou `503`, a sincronização externa
   exige sessão de supervisor e o cron `process-export-queue` existe somente
   quando os dois segredos do Vault foram configurados.

## Production Checklist
- [ ] Environment variables configured
- [ ] Database migrated
- [ ] SSL certificates installed
- [ ] CDN configured
- [ ] Monitoring enabled
