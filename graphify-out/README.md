# Mapa do backend Supabase

Diagnóstico estrutural capturado em 22/09/2026, antes das correções de aprovação
pública deste lote, sobre a base `0972d00d1`. Não é um retrato do código publicado.

- [Visualização interativa](graph.html).
- [Grafo reutilizável](graph.json).
- [Diagnóstico de qualidade da extração](diagnostico.json).
- [Correções e validação no banco real](../docs/execucao/backend-aprovacao-publica-20260922.md).

O escopo contém 168 arquivos de código em `supabase/functions`: 947 nós,
1.950 relações e 79 comunidades. A extração AST não consumiu tokens de modelo;
isso não inclui os tokens usados na investigação e nas correções desta sessão.
SQL, RLS, triggers, dados e implantação exigem a verificação separada registrada
no relatório de execução.

Os pontos com mais conexões incluem `getCorsHeaders` (77),
`getOrCreateRequestId` (29), `handleCorsPreflightIfNeeded` (26),
`runBotProtection` (23), `createStructuredLogger` (20) e `authorize` (19).
Essa concentração orientou a revisão dos contratos compartilhados. Quantidade
de conexões não mede segurança, qualidade ou cobertura de testes.

O relatório automático arredonda a porcentagem extraída para 100%, mas existem
**7 relações inferidas**. O diagnóstico registra 15 referências a nós ausentes,
170 referências externas, 3 autorrelações e 160 relações colapsadas por par de
extremos. Esses limites impedem usar o mapa como prova de completude. A mudança
posterior em `quote-approval` deve ser consultada no código e no relatório de execução.

O script `mapear_backend.py` reproduz a extração com o pacote Graphify instalado,
a partir da raiz do repositório. Caches e caminhos locais do ambiente estão
excluídos do versionamento. Uma nova execução atualiza o grafo para o código
presente; preserve a identificação da base ao comparar diagnósticos.
