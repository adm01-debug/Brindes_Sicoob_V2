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

2. Configurar `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e
   `VITE_SUPABASE_PROJECT_ID` no provedor de hospedagem. Use
   `.env.production.example` apenas como referência local; o arquivo
   `.env.production` nunca deve ser versionado.

3. Antes das migrations de operações internas, configurar `INTERNAL_FUNCTION_SECRET`
   nas Edge Functions e os segredos `sicoob_project_url` e
   `sicoob_internal_function_secret` no Vault. Os dois segredos internos devem
   ter o mesmo valor aleatório de pelo menos 32 caracteres.

4. Publicar primeiro as Edge Functions que substituem os caminhos privilegiados
   legados. Isso garante que a revogação das RPCs no banco não deixa a aplicação
   sem um caminho autenticado equivalente:
```bash
npx supabase functions deploy send-notification process-batch-export monthly-health-report connections-auto-test system-healthcheck external-connections-sync --project-ref cfmzkthhgliqelozlmwu
```

5. Compilar:
```bash
npm run build
```

6. Publicar o frontend pelo provedor configurado.

7. Aplicar somente as migrations autorizadas pelo arquivo
   `scripts/db/apply-sicoob-migrations.mjs`. **Não executar
   `supabase db push --linked`** enquanto o ledger histórico estiver divergente:
   ele tentaria reaplicar centenas de arquivos que não representam o baseline
   remoto. O aplicador contém 37 versões com hash SHA-256 fixo, valida o destino,
   aplica o lote numa transação e grava o mesmo hash no ledger.

8. Verificar após a aplicação com o próprio aplicador e com os contratos de QA.
   O lote de 16/10/2026 inclui validação de `search_analytics`, quotas de IA,
   compartilhamento público seguro de favoritos e remoção da policy redundante
   de `pa_budgets`. As seis versões `20261016160000` a `20261016173000` estão no
   ledger canônico com seus hashes autorizados.

9. Para o lote de idempotência de 28/09/2026, usar exclusivamente o workflow
   manual `Aplicar migrations Sicoob` a partir da branch protegida `main`. Ele
   autoriza pelos hashes SHA-256 somente as versões `20260928162048`,
   `20260928173500` e `20260928182000`, faz preflight read-only e registra todo
   o lote no ledger na mesma transação. O pós-check valida o corpo crítico das
   RPCs, RLS, políticas, privilégios, constraints e o trigger de notificação
   transacional. Não substituir esse fluxo por `db push --include-all`: o
   backlog histórico fora do ledger continua existindo e não é uma fila de
   migrations autorizadas.

## Checklist para produção

- [ ] Segredos externos homologados, incluindo `LOVABLE_API_KEY`
- [x] Migrations autorizadas aplicadas no banco de construção
- [x] Edge Functions alteradas publicadas no banco de construção
- [ ] Frontend publicado pelo provedor após merge e CI verde
- [ ] Monitoramento e alertas homologados com tráfego real
