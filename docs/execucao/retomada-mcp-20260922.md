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
- Consultas ao catálogo sem configuração agora falham sem repetição inútil nos hooks de produtos. A vitrine distingue falha de integração de busca sem resultados e oferece nova tentativa para erros transitórios. Respostas batch incompletas são verificadas antes de compor a lista; a página individual é consultada como fallback.
- O filtro de clientes do Kanban passou a usar apenas os clientes dos orçamentos visíveis; a consulta à tabela Bitrix local inexistente foi removida. A tela de perfis agora mostra os valores reais de `app_role` e encaminha para gestão de usuários/permissões, sem oferecer CRUD falso sobre `roles`.
- O 2FA legado que gerava/validava segredo no navegador foi substituído, na área de segurança, pelas APIs de MFA do Supabase Auth já usadas no acesso administrativo. A própria conta pode cadastrar TOTP e removê-lo após desafio e verificação; a tela não permite administrar fatores de outra conta pelo cliente. Falha de consulta e status alheio são exibidos como indisponíveis, não como MFA desligado. O esquema histórico `user_2fa_settings` permaneceu sem aplicação. O fluxo segue a [documentação de MFA TOTP](https://supabase.com/docs/guides/auth/auth-mfa/totp) e [remoção de fator com AAL2](https://supabase.com/docs/reference/javascript/auth-mfa-unenroll).
- O cache local da Edge Function `bitrix-sync` foi criado pela migration `20260922160000`, substituindo o desenho histórico com policy aberta. `bitrix_clients`, `bitrix_deals` e `bitrix_sync_logs` têm RLS e acesso direto restrito a `service_role`. Inserções sintéticas nas três tabelas passaram como servidor e foram revertidas; `authenticated` recebeu `42501` ao ler clientes. O webhook Bitrix e a função publicada não foram homologados ponta a ponta.
- A [auditoria estrutural das versões sem corpo e suas ACLs](evidencias/retomada-mcp-20260922/approval-policy-and-acl-audit.json) encontrou 20/20 relações, 84/84 índices, mas inicialmente apenas 47/49 funções e 18/21 triggers esperados. A versão `20260912160000` estava parcialmente materializada: faltavam captura e imutabilidade da fotografia da política de aprovação, e o trigger anterior congelava apenas o valor do pedido. A migration corretiva `20260922161000` restaurou as funções e triggers. Em teste revertido, a política foi capturada e alterações da versão, valor e PA foram negadas.
- A mesma revisão encontrou 43 de 48 assinaturas do pacote Sicoob executáveis por `anon`, porque os default privileges concedem os papéis diretamente e `REVOKE FROM PUBLIC` não os remove. A migration `20260922162000` deixou zero assinaturas executáveis por `anon`, 17 RPCs necessárias ao frontend por `authenticated` e as 48 disponíveis ao `service_role`; helpers e funções de trigger não são mais RPCs de cliente.

Todas as quatorze migrations aplicadas nesta rodada têm `md5(statements[1])` idêntico ao arquivo SQL local. O ledger totaliza **36 versões**; **18** delas não armazenam `statements`, impedindo comprovação integral de conteúdo por esse meio. O inventário bidirecional está em [ledger.json](evidencias/retomada-mcp-20260922/ledger.json): **504 arquivos/versões locais**, **468 versões sem registro no ledger**, **14 hashes de arquivo idênticos**, **4 correspondências por normalização textual preliminar** e nenhum arquivo de ledger sem correspondente local. A normalização não prova equivalência semântica, especialmente dentro de strings SQL. Versão ausente do ledger também não prova objeto ausente no PostgreSQL.

As 468 versões fora do ledger receberam uma primeira classificação estática reproduzível em [migration-backlog-classification.md](evidencias/retomada-mcp-20260922/migration-backlog-classification.md), com o inventário integral em JSON. O classificador encontrou 51 arquivos com DDL/DML destrutivo bloqueado para aplicação automática, 192 que exigem revisão manual prioritária, 10 com dependência ausente, 72 possivelmente aplicados fora do ledger e 143 candidatos apenas a dry-run com verificação de dependências. Essa triagem não substitui comparação semântica nem autoriza aplicação.

## Verificações de aplicação

| Verificação | Resultado |
|---|---|
| Referências de runtime | Gate aprovado: 0 referências quebradas em 1.128 chamadas analisadas |
| Typecheck completo | Reprovado: 751 erros globais preexistentes; baseline de 768 aprovado, sem regressão |
| Build Vite | Aprovado |
| Vitest completo e cenários Node | 5.430 aprovados, 115 ignorados; 89/89 cenários Node aprovados |
| Regressão direcionada do catálogo após correção | 19/19 testes aprovados, inclusive lote incompleto e integração não configurada |
| Lint baseline | Aprovado sem regressão; 12 erros preexistentes eliminados nos arquivos alterados |
| RPC de versão no banco | Versão 2, item e histórico confirmados; rollback confirmado |
| Metas no banco | Inserção/leitura autenticada confirmadas; leitura anônima negada; rollback confirmado |
| Simulações e cache Bitrix no banco | Acesso do autor/servidor confirmado e leitura indevida negada; rollback confirmado |
| Fotografia da política de aprovação | Drift parcial reparado; captura e bloqueios de versão/valor/PA confirmados com rollback |
| ACL das funções Sicoob | 0/48 assinaturas para `anon`; 17/48 contratos de frontend para `authenticated`; 48/48 para `service_role` |
| Ponte do catálogo externo | **Não configurada no ambiente**: resposta publicada HTTP 200 com `_unconfigured: true` e zero registros |

A investigação da origem `doufsxqlfjyuvxuezpln` encontrou uma chave **publicável** local, sem divulgar seu valor. Ela lê algumas tabelas auxiliares (`color_groups`, `color_variations`, `color_nuances`, `product_variants`, `tecnicas_gravacao`), mas recebe `42501` para `products` com projeção completa, `product_images` e `stock_daily_summary`. Portanto, configurá-la no bridge não entregaria a loja nem o estoque. A tabela `integration_credentials` do portal permite `SELECT` a administradores por policy; armazenar ali uma chave privilegiada da origem ampliaria seu alcance indevidamente. A CLI local também recebeu `403` ao listar segredos do projeto, então não há acesso administrativo para instalar um segredo Edge protegido. Nenhuma credencial da origem foi copiada ou gravada no portal.

O snapshot de API/Storage em `scripts/db/.inventory-cache.json` recebeu somente um delta SQL verificado de relações e funções. Isso registra presença física e ACL, mas não comprova que todas as rotas PostgREST foram expostas nem que Edge Functions locais coincidam com as publicadas.

O gate de referências passou sem usar sua allowlist. Ele verifica nomes estáticos no código contra o inventário atualizado; não substitui teste de exposição PostgREST, permissões por usuário nem execução real de todas as funções.

## Checklist ainda aberto para aceite integral

- [ ] Disponibilizar uma credencial com leitura completa e somente leitura da origem (ou acesso para configurar segredo Edge protegido) e testar o bridge; hoje produtos, imagens e estoque não podem ser homologados. Não habilitar escrita no banco de produtos nem guardar chave privilegiada em `integration_credentials` com acesso de administrador.
- [ ] Homologar `bitrix-sync` publicada com credenciais de construção, volume, paginação e política de dados. A migration histórica de simulações depende de `products` local ausente; não aplicá-la após a substituição compatível. A migration histórica Bitrix contém políticas `FOR ALL USING (true)` e não deve ser aplicada após o cache seguro.
- [ ] Homologar cadastro, desafio, login e remoção de MFA com contas reais de teste. WebAuthn/passkeys permanecem indisponíveis até haver verificação de assinatura no servidor. Não aplicar `user_2fa_settings` apenas para satisfazer o gate.
- [ ] Revisar semanticamente as 468 classificações estáticas por dependência, objeto real, RLS/ACL e necessidade de negócio; a cobertura automática já está em 468/468. Investigar as 18 versões sem corpo SQL no ledger com fontes adicionais.
- [ ] Comparar código e configuração das Edge Functions publicadas, revogar credenciais expostas anteriormente e validar integrações externas sem registrar segredos no Git.
- [ ] Ensaiar concorrência real da RPC de versões, fluxos completos de comprador/gestor/admin, isolamento entre cooperativas, acessibilidade e preview visual.
- [ ] Executar CI no SHA final; a indisponibilidade anterior de GitHub Actions por orçamento não equivale a aprovação de testes.

**Estado:** lote funcional e de segurança avançou no banco de construção; a meta de 10/10 e a implementação integral do plano **não estão comprovadas**.
