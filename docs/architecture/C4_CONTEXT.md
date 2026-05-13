# 🌐 Diagrama de Contexto C4

Este diagrama descreve o ecossistema de alto nível do Promo Gifts e suas integrações.

```mermaid
graph TD
    User((Vendedor / Admin))
    UI[Promo Gifts React App]
    
    subgraph Supabase_SSOT [Supabase Principal - SSOT]
        Auth[Supabase Auth]
        DB_Local[(DB Local: Orçamentos/Roles)]
        Edge[Edge Functions: Bridge / Sync]
    end
    
    subgraph External_Systems [Ecossistema Externo]
        DB_Catalog[(DB Catálogo: Produtos)]
        DB_CRM[(DB CRM: Clientes)]
        Bitrix[Bitrix24 CRM]
        N8N[n8n Workflows]
    end

    User -->|Navega / Cota| UI
    UI -->|Autentica| Auth
    UI -->|Persiste| DB_Local
    UI -->|Fetch Catalog| Edge
    UI -->|Fetch CRM| Edge
    
    Edge -->|Proxy Query| DB_Catalog
    Edge -->|Proxy Query| DB_CRM
    
    N8N -->|Ingere Dados| DB_Catalog
    N8N -->|Sincroniza| Bitrix
    Bitrix -->|Webhook| N8N
    
    Edge -->|Push Quote| Bitrix
```

## Entidades Principais
- **User**: Atua no front-office (venda) ou back-office (gestão).
- **Promo Gifts App**: Integrador de dados via Federação de Bancos.
- **n8n**: O "maestro" do backend, garantindo que o catálogo esteja sempre atualizado via APIs de fornecedores.
- **Bitrix24**: Sistema de registro de oportunidades e funil de vendas.
