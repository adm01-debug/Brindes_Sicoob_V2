# Schemas

Schemas internos do Supabase ficam fora da introspecção geral (`_analytics, _realtime, _supavisor, auth, cron, extensions, graphql, graphql_public, net, pg_stat_statements, pgbouncer, pgmq, pgsodium, pgsodium_masks, pgtle, realtime, repack, storage, supabase_functions, supabase_migrations, vault`).

| schema | owner | USAGE para roles da API | comentário |
|---|---|---|---|
| public | pg_database_owner | anon, authenticated, service_role | standard public schema |
