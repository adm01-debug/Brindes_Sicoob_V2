-- O cache de esquema deste projeto excede o timeout histórico de 8 segundos.
-- Quando isso ocorre, o PostgREST entra em PGRST002 e toda a API REST fica
-- indisponível, embora o PostgreSQL continue saudável. O limite de 30 segundos
-- permite reconstruir o cache e ainda mantém um teto explícito por requisição.
ALTER ROLE authenticator SET statement_timeout = '30s';

-- Os sinais são entregues após o commit da migration. Nessa ordem, o PostgREST
-- relê a configuração do papel antes de reconstruir o cache de esquema.
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
