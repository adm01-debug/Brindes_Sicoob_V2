# ADM-01 — Gestão de catálogo admin (produtos, fornecedores, gravação) desligada do menu

- Origem: Painel admin, navegação e rotas (Admin, BI e IA)
- Status auditoria: ORFA | Prioridade: P1 | Esforco: P
- Impacto no negocio: o admin clica em "Fornecedores" ou "Gravação" e cai num formulário de produto; não há lista, edição nem exclusão de produtos, fornecedores ou técnicas.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

registrar `AdminCadastrosPage` em `/admin/cadastros` e `AdminProductFormPage` em `/admin/cadastros/produto/:id`; decidir o destino do formulário simples. Mesmo religado, o salvamento esbarra no ADM-02.

## Camadas afetadas

- 

## Regras de negocio

- ver `_regras-de-negocio.md`

## Raio de impacto

- 

## Dependencias

- 

## Criterio de aceite

- 

## Estado final

- NAO INICIADO
