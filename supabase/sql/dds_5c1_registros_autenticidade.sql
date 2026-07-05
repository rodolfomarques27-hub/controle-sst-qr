-- DDS 5C.1 - Registros de autenticidade do DDS
-- SafeScan Brasil / controle-sst-qr
-- Objetivo: criar base propria para QR publico de conferencia/autenticidade do DDS.

create table if not exists public.dds_registros (
    id uuid primary key default extensions.gen_random_uuid(),
    codigo text not null,
    token_publico text not null default upper(
        'DDS-' ||
        replace(extensions.gen_random_uuid()::text, '-', '') ||
        replace(extensions.gen_random_uuid()::text, '-', '')
    ),
    empresa_id uuid null references public.empresas(id) on delete set null,
    obra_id uuid null references public.obras(id) on delete set null,
    empresa_nome text,
    obra_nome text,
    periodo_inicio date not null,
    periodo_fim date not null,
    responsavel_nome text,
    fiscal_idealiza text,
    lider_encarregado text,
    dados jsonb not null default '{}'::jsonb,
    status text not null default 'Ativo',
    criado_por uuid default auth.uid(),
    atualizado_por uuid default auth.uid(),
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint dds_registros_status_check
        check (status in ('Ativo', 'Inativo', 'Cancelado'))
);

comment on table public.dds_registros is
'Registros digitais de DDS semanal usados para conferencia/autenticidade via QR publico.';

comment on column public.dds_registros.codigo is
'Codigo operacional impresso no DDS. Exemplo: DDS-2026-07-RA-05.';

comment on column public.dds_registros.token_publico is
'Token publico do QR de conferencia do DDS. Nao deve expor dados internos sensiveis.';

comment on column public.dds_registros.dados is
'Snapshot tecnico do DDS no momento da geracao/impressao. Evitar dados sensiveis desnecessarios.';

create unique index if not exists dds_registros_codigo_unique_idx
    on public.dds_registros (codigo);

create unique index if not exists dds_registros_token_publico_unique_idx
    on public.dds_registros (token_publico);

create index if not exists dds_registros_empresa_id_idx
    on public.dds_registros (empresa_id);

create index if not exists dds_registros_obra_id_idx
    on public.dds_registros (obra_id);

create index if not exists dds_registros_periodo_idx
    on public.dds_registros (periodo_inicio, periodo_fim);

create index if not exists dds_registros_status_idx
    on public.dds_registros (status);

create or replace function public.atualizar_updated_at_dds_registros()
returns trigger
language plpgsql
set search_path to public
as $$
begin
    new.updated_at = now();
    new.atualizado_por = coalesce(auth.uid(), new.atualizado_por);
    return new;
end;
$$;

drop trigger if exists trg_dds_registros_updated_at on public.dds_registros;

create trigger trg_dds_registros_updated_at
before update on public.dds_registros
for each row
execute function public.atualizar_updated_at_dds_registros();

alter table public.dds_registros enable row level security;

drop policy if exists dds_registros_select_authenticated on public.dds_registros;
drop policy if exists dds_registros_insert_authenticated on public.dds_registros;
drop policy if exists dds_registros_update_authenticated on public.dds_registros;
drop policy if exists dds_registros_delete_authenticated on public.dds_registros;

create policy dds_registros_select_authenticated
on public.dds_registros
for select
to authenticated
using (true);

create policy dds_registros_insert_authenticated
on public.dds_registros
for insert
to authenticated
with check (true);

create policy dds_registros_update_authenticated
on public.dds_registros
for update
to authenticated
using (true)
with check (true);

create policy dds_registros_delete_authenticated
on public.dds_registros
for delete
to authenticated
using (true);

grant select, insert, update, delete on public.dds_registros to authenticated;

create or replace function public.consulta_publica_dds(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to public
as $$
declare
    v_token text;
    v_registro record;
begin
    v_token := trim(coalesce(p_token, ''));

    if v_token = '' then
        return jsonb_build_object(
            'ok', false,
            'mensagem', 'Token do DDS nao informado.'
        );
    end if;

    select
        d.id,
        d.codigo,
        d.token_publico,
        coalesce(e.nome, d.empresa_nome) as empresa_nome,
        coalesce(o.nome, d.obra_nome) as obra_nome,
        d.periodo_inicio,
        d.periodo_fim,
        d.responsavel_nome,
        d.fiscal_idealiza,
        d.lider_encarregado,
        d.status,
        d.created_at,
        d.updated_at
    into v_registro
    from public.dds_registros d
    left join public.empresas e on e.id = d.empresa_id
    left join public.obras o on o.id = d.obra_id
    where trim(coalesce(d.token_publico, '')) = v_token
    limit 1;

    if not found then
        return jsonb_build_object(
            'ok', false,
            'mensagem', 'DDS nao localizado ou token invalido.'
        );
    end if;

    if coalesce(v_registro.status, '') <> 'Ativo' then
        return jsonb_build_object(
            'ok', false,
            'mensagem', 'DDS inativo ou cancelado.',
            'status', v_registro.status
        );
    end if;

    return jsonb_build_object(
        'ok', true,
        'tipo', 'dds',
        'codigo', v_registro.codigo,
        'empresa', v_registro.empresa_nome,
        'obra', v_registro.obra_nome,
        'periodoInicio', to_char(v_registro.periodo_inicio, 'YYYY-MM-DD'),
        'periodoFim', to_char(v_registro.periodo_fim, 'YYYY-MM-DD'),
        'responsavel', v_registro.responsavel_nome,
        'fiscalIdealiza', v_registro.fiscal_idealiza,
        'liderEncarregado', v_registro.lider_encarregado,
        'status', v_registro.status,
        'geradoEm', v_registro.created_at,
        'atualizadoEm', v_registro.updated_at,
        'autenticidade', jsonb_build_object(
            'status', 'Documento localizado',
            'mensagem', 'DDS conferido na base SafeScan Brasil.',
            'conferidoEm', now()
        )
    );
end;
$$;

revoke all on function public.consulta_publica_dds(text) from public;
grant execute on function public.consulta_publica_dds(text) to anon, authenticated;

notify pgrst, 'reload schema';