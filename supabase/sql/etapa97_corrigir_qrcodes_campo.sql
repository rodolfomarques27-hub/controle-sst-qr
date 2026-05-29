-- Roteiro 2 - Etapa 97
-- Corrigir QR Codes de campo: máquina/equipamento/container/área
-- Objetivo: garantir que a tabela auditoria_campo_qrcodes tenha as colunas esperadas pelo app.

alter table public.auditoria_campo_qrcodes
    add column if not exists codigo text,
    add column if not exists tipo text,
    add column if not exists tipo_label text,
    add column if not exists identificacao text,
    add column if not exists area text,
    add column if not exists local text,
    add column if not exists empresa_responsavel text,
    add column if not exists token_publico text,
    add column if not exists link text,
    add column if not exists observacao text,
    add column if not exists criado_por uuid,
    add column if not exists criado_em timestamptz default now(),
    add column if not exists atualizado_em timestamptz;

-- Necessário para o upsert(payload, { onConflict: "codigo" }) usado pelo app.
create unique index if not exists auditoria_campo_qrcodes_codigo_idx
    on public.auditoria_campo_qrcodes (codigo);

create index if not exists auditoria_campo_qrcodes_criado_em_idx
    on public.auditoria_campo_qrcodes (criado_em desc);

create index if not exists auditoria_campo_qrcodes_tipo_idx
    on public.auditoria_campo_qrcodes (tipo);

create index if not exists auditoria_campo_qrcodes_token_publico_idx
    on public.auditoria_campo_qrcodes (token_publico);

-- Atualiza registros antigos, caso existam, para evitar campos nulos importantes.
update public.auditoria_campo_qrcodes
set
    codigo = coalesce(codigo, upper(regexp_replace(coalesce(tipo, 'QR') || '-' || coalesce(identificacao, id::text), '[^A-Za-z0-9_-]+', '-', 'g'))),
    tipo_label = coalesce(tipo_label, tipo),
    token_publico = coalesce(token_publico, 'TOKEN-AUDITORIA-CAMPO-2026'),
    atualizado_em = coalesce(atualizado_em, now())
where codigo is null
   or tipo_label is null
   or token_publico is null
   or atualizado_em is null;

-- Recarrega o cache de schema do PostgREST/Supabase.
notify pgrst, 'reload schema';
