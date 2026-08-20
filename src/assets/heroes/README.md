# Heroes visuais — SafeScan Brasil

Este diretório concentra exclusivamente os assets de hero/banner utilizados pelo sistema.

## Estrutura

- `relatorios/` — heroes de PDFs, relatórios e documentos impressos.
- `modulos/` — heroes das telas e módulos funcionais.
- `dashboard/` — heroes de dashboards e páginas iniciais.

As subpastas `modulos/` e `dashboard/` devem ser criadas quando o primeiro asset dessas categorias for organizado.

## Regra de arquitetura

A centralização aqui é somente dos arquivos visuais.

Não compartilhar HTML, CSS, paginação ou renderer entre relatórios apenas porque utilizam heroes armazenados neste diretório.

Cada relatório continua responsável por sua própria estrutura, geometria física e paginação.

## Nomenclatura

Preferir:

`hero-<contexto>-<finalidade>-vN.<ext>`

Exemplo:

`hero-pendencias-treinamentos-obras-v1.png`

## Hero aprovado — Pendências de Treinamentos

Arquivo:

`relatorios/hero-pendencias-treinamentos-obras-v1.png`

Uso:

Relatório de Pendências de Treinamentos.

Tema:

Documentação técnica e acompanhamento de obras.

Status:

Aprovado visualmente em 17/08/2026.