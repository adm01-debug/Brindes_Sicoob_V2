# Revisão das 32 melhorias do benchmark Promo Gifts

As marcas anteriores eram um resumo de execução local. Três foram reabertas: histórico isolado, ocultação de custos e atomicidade integral. Componentes herdados existentes não foram classificados como ausentes apenas por ainda estarem desmarcados.

| ID | Melhoria | Plano | Situação | Diagnóstico |
|---|---|---|---|---|
| B01 | Expor histórico de busca com seleção e limpeza. Interface implementada; a revisão encontrou armazenamento global sem isolamento por usuário/cooperativa (A09). | E023 E044 E025 | Parcial | UI pronta; histórico global precisa de isolamento e limpeza entre contas. A09. |
| B02 | Permitir entrada por faixa de orçamento no catálogo. | E024 E043 | Local delimitado | Atalhos por orçamento unitário implementados; não representam custo entregue firme. |
| B03 | Compactar atalhos de intenção e orçamento no mobile. | E032 E043 | Local delimitado | Trilhos móveis compactos implementados; sem homologação com aparelhos reais. |
| B04 | Manter catálogo externo protegido por contrato somente leitura. | E003 | Local delimitado | Contrato local bloqueia escrita; privilégio mínimo da identidade remota não confirmado. |
| B05 | Remover custo e margem das respostas ao comprador. A lista local não cobre `setup_cost` e `unit_cost` (A10). | E003 E048 E086 | Parcial | Seis campos removidos; setup_cost/unit_cost persistem. A10. |
| B06 | Garantir orçamento/pedido atômico com versão e idempotência. Aprovação e verba foram protegidas; criação/versionamento de orçamento ainda não são uma transação integral (A07). | E017 E018 E059 E061 | Parcial | Verba/aprovação transacionais; versionamento e envio integral ainda incompletos. A07/A15. |
| B07 | Bloquear indexação do portal privado e remover sitemap provisório. | E026 E087 | Local delimitado | Noindex, robots e retirada de sitemap aplicados no código revisado. |
| B08 | Confirmar privilégios somente leitura da identidade no banco de catálogo. | E003 E096 | Validação externa | ACL da identidade no mestre não foi inspecionada administrativamente. |
| B09 | Executar login, busca, primeiro orçamento e aprovação em homologação real. | E015 E091 | Validação externa | Sem jornada autenticada real comprovada; E2E remoto falha. A14. |
| B10 | Validar política de verba, alçada, arte e cancelamento com responsáveis. | E008 E017 E065 E069 | Validação externa | Documentos históricos não substituem política vigente e aceite local. |
| B11 | Revisar toda a jornada real por teclado, zoom 200/400% e leitor de tela. | E081 | Parcial | Axe em amostras locais; teclado, zoom e leitor da compra inteira não homologados. |
| B12 | Definir SLA e origem do dado de preço, estoque e prazo mostrados ao comprador. | E007 E043 E073 | Validação externa | SLA e responsabilidade por dados comerciais ainda não confirmados. |
| B13 | Levar seleção de cor ao card com estoque por variante. | E035 E043 E046 | Parcial | Cores existentes; card por variante e validade de estoque precisam de contrato íntegro. |
| B14 | Criar vistos recentemente por usuário. | E025 E050 | Parcial | Store de vistos existe, mas chave global; revisar usuário, organização e logout. |
| B15 | Ajustar comparação às dimensões de decisão Sicoob. | E049 E060 | Parcial | Comparador de produtos existe; decisão institucional exige dimensões e cotações equivalentes. |
| B16 | Criar autosave e recuperação do orçamento com estado explícito. | E027 E055 E057 | Parcial | Há autosave de kit; falha silenciosa reproduzida. Recuperação de orçamento integral pendente. A04. |
| B17 | Exibir validade do preço e timestamp da consulta de estoque. | E043 E046 E073 | Parcial | Componentes de atualidade existem; timestamp e reconfirmação não uniformes. |
| B18 | Implementar modelos de kit por ocasião e faixa de orçamento. | E051 E055 | Parcial | Templates de kits existem; curadoria por orçamento precisa de validação comercial e estoque. |
| B19 | Validar capacidade de embalagem, preço e estoque do kit no servidor. | E047 E055 | Não demonstrado | Cálculos clientes não substituem validação completa no servidor. |
| B20 | Criar resumo fixo desktop e barra de ação mobile sem cobrir conteúdo. | E032 E057 | Parcial | Kit possui resumos responsivos; cobertura da solicitação completa e foco ainda parcial. |
| B21 | Exibir linha do tempo única de orçamento, verba, arte, pedido e entrega. | E059 E068 E070 | Parcial | Históricos existem em modelos distintos; linha canônica completa ausente. |
| B22 | Implementar compartilhamento seguro e expirável para aprovação. | E013 E050 E065 | Parcial | Tokens, validade e revogação existem; escopo e decisão formal não homologados. |
| B23 | Adicionar métricas do funil sem dados fictícios. | E009 E089 | Parcial | Persistem números fixos, projeção artificial e contador aleatório. A06. |
| B24 | Medir Core Web Vitals no domínio de homologação. | E084 E098 | Parcial | Lighthouse local/CI mede login; domínio de homologação e campo ainda pendentes. |
| B25 | Recomendações por ocasião, histórico e regras comerciais explicáveis. | E022 E044 E089 | Parcial | Sugestões existentes; histórico e regras explicáveis não validados pelo público. |
| B26 | Estoque futuro com níveis de confiança. | E073 E089 | Não demonstrado | Forecast na interface não comprova modelo validado nem intervalo de confiança. |
| B27 | Recompra com nova consulta de preço e disponibilidade. | E079 | Parcial | Duplicação existe; botão usa legado, rota inválida e preços antigos. A03. |
| B28 | Modelos de campanha salvos pela cooperativa. | E051 E052 | Parcial | Campanha genérica existe; modelo por cooperativa com marcos/destinos incompleto. |
| B29 | Assistente de briefing para kits e campanhas. | E051 E055 | Não demonstrado | Não foi demonstrado assistente de briefing institucional com dados e restrições suficientes. |
| B30 | Mockup assistido com versionamento de arte. | E053 E054 E065 | Parcial | Mockups existentes; prova técnica e versão imutável vinculada ao aceite não asseguradas. |
| B31 | Entrega distribuída entre unidades com reconciliação de quantidades. | E056 E074 E076 E078 | Não demonstrado | Consolidação não equivale a distribuição por destino e conciliação. A16. |
| B32 | Personalização do catálogo por cooperativa sem bifurcar código. | E008 E025 E099 | Parcial | Membership existe; política/curadoria por cooperativa e troca segura ainda incompletas. A08. |
