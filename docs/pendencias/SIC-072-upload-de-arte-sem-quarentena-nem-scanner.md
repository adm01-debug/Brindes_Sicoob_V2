# SIC-072 — Upload de arte sem quarentena nem scanner

- Origem: 8. Arte/artwork (Fluxos Sicoob)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: P
- Impacto no negocio: um arquivo malicioso enviado como arte chega a quem aprova e ao fornecedor.

## Estado real conferido

CONFIRMADO - arte de mockup/pedido (src/components/mockup/ArtFileUpload.tsx) usa supabase.storage.from(ART_FILES_BUCKET).upload direto (sem scanner); allowlist de extensao so client-side (ACCEPTED_EXTENSIONS). Edge secure-upload com VirusTotal+quarentena existe e e usado por ImageUploadButton/SecureUploadManager, mas o fluxo de arte nao passa por ele.

## O que falta (auditoria)

edge — passar a arte pela ingestão com scanner (finalidade `artwork`).

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

- NAO INICIADO
