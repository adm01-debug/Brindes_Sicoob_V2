# Retomada com acesso administrativo — 22/09/2026

Projeto `cfmzkthhgliqelozlmwu`, ambiente de **construção**. As verificações usaram o MCP administrativo fornecido pelo responsável; nenhum token ou URL de capacidade foi gravado no repositório. Este documento atualiza o relatório anterior sem transformar testes parciais em aceite de produção.

## Resultado verificado

- O baseline `20260915143442` já estava no ledger e seu SQL local coincidiu após normalização textual preliminar; não houve reparo de ledger para ele.
- Três migrations de auditoria, health-check e templates de personalização foram aplicadas e registradas com o conteúdo integral de cada arquivo SQL. As quatro tabelas de template têm RLS; a cópia de regras foi executada como administrador autenticado em transação de teste e revertida sem deixar grupos ou componentes.
- O pacote de versionamento `20260912100000`, `20260912130000`, `20260912150000` e `20260913120001` passou por dry-run com rollback, foi aplicado em ordem e registrado no ledger. Em teste com orçamento e item sintéticos, a RPC criou a versão 2, copiou a variante e registrou histórico; uma segunda chamada sequencial à mesma origem foi rejeitada com `40001` e a família permaneceu com duas versões. As transações foram revertidas e o banco voltou a zero orçamentos. Concorrência real entre duas sessões ainda não foi ensaiada.
- A ACL das três funções de versionamento era insegura: `anon` tinha `EXECUTE` diretamente apesar de `REVOKE FROM PUBLIC`. A migration nova `20260922153000` retirou esse acesso; `authenticated` continua autorizado apenas na RPC pública, e funções de gatilho não são executáveis pelo cliente.
- A tabela `sales_goals` prevista pela migration histórica `20251220181321` passou por dry-run e foi aplicada com RLS. A migration `20260922154000` removeu o `SELECT` direto de `anon`. Um usuário autenticado conseguiu criar e ler sua própria meta em transação revertida; leitura anônima retornou `42501`.
- A tabela local `personalization_simulations` foi criada pela migration `20260922155000` com IDs externos de produto/cliente em `text`, sem as FKs incompatíveis da migration histórica. A interface deixou de tentar fazer join com `bitrix_clients` ausente. Um usuário autenticado leu sua simulação sintética; outro usuário não a enxergou. O teste foi revertido.
- Os IDs de produtos, técnicas e clientes nos rascunhos/mockups são `text` sem FK local. O código agora preserva os IDs externos, permitindo restaurar seleção e histórico. Nuances passam pela ponte externa de consulta. A resposta `_unconfigured` dessa ponte passou a ser tratada como erro, em vez de catálogo vazio.
- O PDF de comparação passou a obter nome e logo da empresa pelo CRM externo já usado pelo restante do portal. O CRM não declara cor de marca nesse contrato; o PDF usa sua cor padrão quando não houver outra fonte.
- O filtro de clientes do Kanban passou a usar apenas os clientes dos orçamentos visíveis; a consulta à tabela Bitrix local inexistente foi removida. A tela de perfis agora mostra os valores reais de `app_role` e encaminha para gestão de usuários/permissões, sem oferecer CRUD falso sobre `roles`.
- O 2FA legado que gerava/validava segredo no navegador foi substituído, na área de segurança, pelas APIs de MFA do Supabase Auth já usadas no acesso administrativo. A própria conta pode cadastrar TOTP e removê-lo após desafio e verificação; a tela não permite administrar fatores de outra conta pelo cliente. Falha de consulta e status alheio são exibidos como indisponíveis, não como MFA desligado. O esquema histórico `user_2fa_settings` permaneceu sem aplicação. O fluxo segue a [documentação de MFA TOTP](https://supabase.com/docs/guides/auth/auth-mfa/totp) e [remoção de fator com AAL2](https://supabase.com/docs/reference/javascript/auth-mfa-unenroll).
- O cache local da Edge Function `bitrix-sync` foi criado pela migration `20260922160000`, substituindo o desenho histórico com policy aberta. `bitrix_clients`, `bitrix_deals` e `bitrix_sync_logs` têm RLS e acesso direto restrito a `service_role`. Inserções sintéticas nas três tabelas passaram como servidor e foram revertidas; `authenticated` recebeu `42501` ao ler clientes. O webhook Bitrix e a função publicada não foram homologados ponta a ponta.

Todas as doze migrations aplicadas nesta rodada têm `md5(statements[1])` idêntico ao arquivo SQL local. O ledger totaliza **34 versões**; **18** delas não armazenam `statements`, impedindo comprovação de conteúdo por esse meio. O inventário bidirecional está em [ledger.json](evidencias/retomada-mcp-20260922/ledger.json): **502 arquivos/versões locais**, **468 versões sem registro no ledger**, **12 hashes de arquivo idênticos**, **4 correspondências por normalização textual preliminar** e nenhum arquivo de ledger sem correspondente local. A normalização não prova equivalência semântica, especialmente dentro de strings SQL. Versão ausente do ledger também não prova objeto ausente no PostgreSQL.

## Verificações de aplicação

| Verificação | Resultado |
|---|---|
| Referências de runtime | Gate aprovado: 0 referências quebradas em 1.128 chamadas analisadas |
| Typecheck completo | Reprovado: 751 erros globais preexistentes; baseline de 768 aprovado, sem regressão |
| Build Vite | Aprovado |
| Vitest completo e cenários Node | 5.422 aprovados, 115 ignorados; 89/89 cenários Node aprovados |
| Lint baseline | Aprovado sem regressão; 12 erros preexistentes eliminados nos arquivos alterados |
| RPC de versão no banco | Versão 2, item e histórico confirmados; rollback confirmado |
| Metas no banco | Inserção/leitura autenticada confirmadas; leitura anônima negada; rollback confirmado |
| Simulações e cache Bitrix no banco | Acesso do autor/servidor confirmado e leitura indevida negada; rollback confirmado |
| Ponte do catálogo externo | **Não configurada no ambiente**: resposta publicada HTTP 200 com `_unconfigured: true` e zero registros |

O snapshot de API/Storage em `scripts/db/.inventory-cache.json` recebeu somente um delta SQL verificado de relações e funções. Isso registra presença física e ACL, mas não comprova que todas as rotas PostgREST foram expostas nem que Edge Functions locais coincidam com as publicadas.

O gate de referências passou sem usar sua allowlist. Ele verifica nomes estáticos no código contra o inventário atualizado; não substitui teste de exposição PostgREST, permissões por usuário nem execução real de todas as funções.

## Checklist ainda aberto para aceite integral

- [ ] Configurar e testar as credenciais de **consulta** do catálogo externo no ambiente; hoje produtos, cores e estoque não podem ser homologados pela ponte. Não habilitar escrita no banco de produtos.
- [ ] Homologar `bitrix-sync` publicada com credenciais de construção, volume, paginação e política de dados. A migration histórica de simulações depende de `products` local ausente; não aplicá-la após a substituição compatível. A migration histórica Bitrix contém políticas `FOR ALL USING (true)` e não deve ser aplicada após o cache seguro.
- [ ] Homologar cadastro, desafio, login e remoção de MFA com contas reais de teste. WebAuthn/passkeys permanecem indisponíveis até haver verificação de assinatura no servidor. Não aplicar `user_2fa_settings` apenas para satisfazer o gate.
- [ ] Classificar individualmente as 468 versões sem ledger por dependência, objeto real, RLS/ACL e necessidade de negócio. Investigar as 18 versões sem corpo SQL no ledger com fontes adicionais.
- [ ] Comparar código e configuração das Edge Functions publicadas, revogar credenciais expostas anteriormente e validar integrações externas sem registrar segredos no Git.
- [ ] Ensaiar concorrência real da RPC de versões, fluxos completos de comprador/gestor/admin, isolamento entre cooperativas, acessibilidade e preview visual.
- [ ] Executar CI no SHA final; a indisponibilidade anterior de GitHub Actions por orçamento não equivale a aprovação de testes.

**Estado:** lote funcional e de segurança avançou no banco de construção; a meta de 10/10 e a implementação integral do plano **não estão comprovadas**.
