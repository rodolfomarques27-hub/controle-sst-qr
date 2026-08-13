begin;

alter table public.certidao_mensal_email_configuracoes
    alter column anexar_pdfs
    set default false;

update public.certidao_mensal_email_configuracoes
set
    anexar_pdfs = false,
    atualizado_em = now()
where anexar_pdfs is distinct from false;

alter table public.certidao_mensal_email_configuracoes
    drop constraint if exists
        certidao_mensal_email_config_sem_anexos_check;

alter table public.certidao_mensal_email_configuracoes
    add constraint
        certidao_mensal_email_config_sem_anexos_check
    check (
        anexar_pdfs = false
    );

comment on column
    public.certidao_mensal_email_configuracoes.anexar_pdfs
is
    'Campo legado preservado por compatibilidade. Notificações de pendências nunca anexam PDFs.';

alter table public.certidao_mensal_envio_itens
    add column if not exists documento_titulo text;

update public.certidao_mensal_envio_itens envio_item
set documento_titulo =
    coalesce(
        nullif(
            btrim(item.titulo),
            ''
        ),
        nullif(
            btrim(envio_item.documento_tipo),
            ''
        ),
        'Documento'
    )
from public.certidao_mensal_itens item
where item.id = envio_item.item_id
  and envio_item.documento_titulo is null;

update public.certidao_mensal_envio_itens
set documento_titulo =
    coalesce(
        nullif(
            btrim(documento_tipo),
            ''
        ),
        'Documento'
    )
where documento_titulo is null;

alter table public.certidao_mensal_envio_itens
    alter column documento_titulo
    set not null;

alter table public.certidao_mensal_envio_itens
    alter column versao_id
    drop not null;

alter table public.certidao_mensal_envio_itens
    alter column numero_versao
    drop not null;

alter table public.certidao_mensal_envio_itens
    alter column bucket
    drop not null;

alter table public.certidao_mensal_envio_itens
    alter column caminho_storage
    drop not null;

alter table public.certidao_mensal_envio_itens
    alter column nome_arquivo
    drop not null;

alter table public.certidao_mensal_envio_itens
    alter column tipo_mime
    drop not null;

alter table public.certidao_mensal_envio_itens
    alter column tamanho_bytes
    drop not null;

alter table public.certidao_mensal_envio_itens
    drop constraint if exists
        certidao_mensal_envio_itens_snapshot_coerencia_check;

alter table public.certidao_mensal_envio_itens
    add constraint
        certidao_mensal_envio_itens_snapshot_coerencia_check
    check (
        (
            versao_id is null
            and numero_versao is null
            and bucket is null
            and caminho_storage is null
            and nome_arquivo is null
            and tipo_mime is null
            and tamanho_bytes is null
            and hash_sha256 is null
            and total_paginas is null
        )
        or
        (
            versao_id is not null
            and numero_versao is not null
            and bucket is not null
            and caminho_storage is not null
            and nome_arquivo is not null
            and tipo_mime is not null
            and tamanho_bytes is not null
        )
    );

comment on column
    public.certidao_mensal_envio_itens.documento_titulo
is
    'Título imutável do item incluído na notificação consolidada de pendências.';

comment on table
    public.certidao_mensal_envio_itens
is
    'Fotografia imutável das pendências incluídas em cada notificação, com ou sem versão documental.';

notify pgrst, 'reload schema';

commit;