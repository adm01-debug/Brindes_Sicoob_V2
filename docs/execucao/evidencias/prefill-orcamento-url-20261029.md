# Pré-carga do orçamento por URL — 29/10/2026

## Escopo validado

O construtor de orçamento agora consome `product_id`, `products`, `produto` e o formato legado `items[]`. A identificação do item e seus dados comerciais são reidratados pelo catálogo externo somente leitura. Nome, SKU, imagem, preço, estoque e quantidade mínima enviados na URL não substituem o cadastro canônico. A quantidade escolhida em `items[]` é mantida apenas quando atende ao mínimo vigente.

Links de detalhe, comparação e tendências passam a carregar produtos no orçamento. `client_id` pode ser reaproveitado para o seletor autorizado; `client_name` e dados de preço enviados pela URL são ignorados. IDs repetidos são consultados uma vez, a carga é limitada a 20 produtos, e itens inexistentes ou inválidos geram retorno visível.

## Relação com os achados documentados

- Corrige o consumo de `produto` descrito em FE-087 para o fluxo Tendências → Orçamento.
- Conecta os parâmetros `product_id` e `products` já enviados pelas páginas de detalhe e comparação.
- FE-060 (Coleção → Orçamento) e os CTAs dos simuladores que ainda navegam à lista permanecem pendentes; este registro não os considera concluídos.

## Limites e dados

- Não houve escrita no Supabase Sicoob nem no catálogo externo.
- A leitura de preço, estoque e quantidade mínima continua respeitando o catálogo externo configurado como somente leitura.
- A auditoria original de 11/10/2026 permanece histórica; este arquivo registra o resultado posterior sem reclassificar outros achados.

## Validação

- Baseline em `origin/main` `e9d59026793b84fabeaeec9da890a068f64d49c3`: `npm ci`, build e typecheck aprovados; lint com 0 erros e 873 avisos; 5.839 testes aprovados e 68 ignorados.
- Testes específicos cobrem preço adulterado, produto removido, IDs duplicados, limite de 20 produtos, formato legado, quantidade mínima e integração do hook.
- Após a alteração: build aprovado (aviso existente de chunks acima de 600 kB), typecheck aprovado, lint com 0 erros e 873 avisos, suíte completa com 5.849 testes aprovados e 68 ignorados.
- Os 10 testes novos passaram; ESLint focal e verificação focal de TypeScript não encontraram erros.
- Instalação limpa pelo lockfile: `npm ci` concluído; o audit reportou duas vulnerabilidades altas já existentes no baseline.
- Este registro descreve validação local anterior ao commit; CI do PR ainda precisa validar a revisão publicada.
