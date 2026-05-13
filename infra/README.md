# ☁️ Infraestrutura como Código (IaC) — Promo Brindes

Este diretório contém a definição da infraestrutura do Promo Gifts utilizando Terraform.

## Estrutura
- `modules/cloudflare`: Gerenciamento de zonas DNS e regras de WAF/CORS.
- `modules/supabase`: Configuração de buckets de storage e secrets.
- `environments/prod`: Configurações específicas de produção.

## Uso (Roadmap 10/10)
Atualmente em fase de migração. O provisionamento manual via dashboard está sendo substituído progressivamente por estes scripts.

```bash
cd infra/environments/prod
terraform init
terraform plan
```
