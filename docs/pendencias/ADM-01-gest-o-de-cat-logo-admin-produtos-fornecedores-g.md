# ADM-01 — Gestão de catálogo admin (produtos, fornecedores, gravação) desligada do menu

- Origem: Painel admin, navegação e rotas (Admin, BI e IA)
- Status auditoria: ORFA | Prioridade: P1 | Esforco: P
- Impacto no negocio: o admin clica em "Fornecedores" ou "Gravação" e cai num formulário de produto; não há lista, edição nem exclusão de produtos, fornecedores ou técnicas.

## Estado real conferido

PARCIAL em main e877d0c58. Rota /admin/cadastros EXISTE (src/routes/config/admin.ts:23 registra AdminCadastrosPage); sidebar dirige Produtos/Fornecedores/Gravacao (src/components/layout/SidebarReorganized.tsx:245-250). Pagina tem ProductsManager com curadoria, SuppliersManager readOnly e personalizacao. NAO ha rota de edicao /admin/cadastros/produto/:id (0 ocorrencias de AdminProductFormPage em src/).

## O que falta (auditoria)

registrar rota de edicao de produto /admin/cadastros/produto/:id (AdminProductFormPage); decidir o destino do formulario simples. Mesmo religado, o salvamento esbarra no ADM-02.

## Camadas afetadas

- 

## Regras de negocio

- ver `docs/agentes/regras-dominio.md`

## Raio de impacto

- 

## Dependencias

- 

## Criterio de aceite

- 

## Estado final

- PARCIAL (rota e abas em main; falta rota de edicao de produto)
