# Remoção da edge function `migrate-helper`

## Situação atual (verificada)

A função **já existe** no projeto em `supabase/functions/migrate-helper/index.ts` e está declarada em `supabase/config.toml` com `verify_jwt = false`. O código idêntico ao que você colou já está no repositório — portanto, muito provavelmente já está publicado e acessível na internet.

O que ela faz hoje:

- Expõe a ação `credentials`, que retorna em JSON o `SUPABASE_SERVICE_ROLE_KEY` e o `SUPABASE_DB_URL`.
- Protege isso apenas com uma chave fixa escrita em texto claro no próprio código-fonte.
- Roda com `verify_jwt = false` e `Access-Control-Allow-Origin: *`, ou seja, qualquer origem pode chamá-la.

A service role key ignora todo o RLS do banco. Quem obtiver essa resposta lê, altera e apaga qualquer tabela do projeto, incluindo dados de clientes, orçamentos e pedidos. Não vou manter, estender nem republicar essa função.

## Plano

1. **Apagar o código**: remover o diretório `supabase/functions/migrate-helper/` e o bloco `[functions.migrate-helper]` de `supabase/config.toml`.
2. **Desativar a função publicada**: excluir a função implantada para que a URL pare de responder imediatamente (não basta apagar o código — o deploy atual continua no ar).
3. **Rotacionar credenciais**: como a chave pode já ter vazado, rotacionar as chaves de API do backend após a remoção. Isso invalida qualquer cópia obtida por terceiros.
4. **Verificar exposição**: consultar os logs de invocação da função para checar se houve chamadas com a ação `credentials` de origens desconhecidas.
5. **Gate de CI**: adicionar a regra ao `scripts/check-edge-authorization.mjs` (ou gate equivalente) que falha o build se uma edge function ler `SUPABASE_SERVICE_ROLE_KEY` ou `SUPABASE_DB_URL` dentro de um corpo de resposta.

## Se o objetivo era migrar o banco

Diga qual é a migração pretendida (mover dados para outro projeto, exportar um dump, rodar DDL) e eu monto o caminho seguro: migrações SQL versionadas pelo próprio fluxo do Cloud, ou uma edge function com escopo restrito, autenticada por JWT + `has_role('dev')`, que executa apenas as operações específicas — nunca uma que devolva credenciais.

## Detalhes técnicos

- Arquivos afetados: `supabase/functions/migrate-helper/index.ts` (deletado), `supabase/config.toml` (remover o bloco da função).
- A exclusão do deploy usa a ferramenta de remoção de edge functions do backend.
- A rotação de chaves invalida a anon key atual; o `.env` gerenciado é atualizado automaticamente e o app precisa de um novo publish depois.
