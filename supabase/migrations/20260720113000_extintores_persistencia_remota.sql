-- SafeScan Brasil
-- Persistência remota de extintores, inspeções e manutenções.
-- Esta migration não libera acesso anônimo direto às tabelas.
-- A vistoria pública deverá utilizar uma Edge Function controlada.

begin;

do $$
begin
    if to_regclass('public.empresas') is null then
        raise exception
            'Tabela obrigatória public.empresas não encontrada.';
    end if;

    if to_regclass('public.obras') is null then
        raise exception
            'Tabela obrigatória public.obras não encontrada.';
    end if;

    if to_regclass('public.empresas_obras') is null then
        raise exception
            'Tabela obrigatória public.empresas_obras não encontrada.';
    end if;

    if to_regclass('public.mapas_pontos') is null then
        raise exception
            'Tabela obrigatória public.mapas_pontos não encontrada.';
    end if;

    if to_regclass('public.mapas_itens') is null then
        raise exception
            'Tabela obrigatória public.mapas_itens não encontrada.';
    end if;

    if to_regprocedure('public.usuario_ativo_sistema()') is null then
        raise exception
            'Função obrigatória public.usuario_ativo_sistema() não encontrada.';
    end if;

    if to_regprocedure(
        'public.usuario_tem_acesso_empresa(uuid)'
    ) is null then
        raise exception
            'Função obrigatória public.usuario_tem_acesso_empresa(uuid) não encontrada.';
    end if;
end;
$$;

create table if not exists public.extintores (
    id uuid primary key default gen_random_uuid(),

    empresa_id uuid null
        references public.empresas(id)
        on delete set null,

    obra_id uuid not null
        references public.obras(id)
        on delete cascade,

    ponto_id uuid null
        references public.mapas_pontos(id)
        on delete set null,

    codigo text not null,
    token_publico text not null
        default gen_random_uuid()::text,

    localizacao text not null,
    ponto_nome text,
    ponto_referencia_local text,

    tipo text not null,
    capacidade text not null,

    status text not null
        default 'Ativo',

    situacao_operacional text not null
        default 'Em operação',

    data_aquisicao date,
    fabricante text,
    numero_serie text,

    ultima_manutencao date,
    proxima_manutencao date,
    proximo_ensaio_hidrostatico date,

    referencia_local text,

    metadados jsonb not null
        default '{}'::jsonb,

    criado_por uuid null
        default auth.uid()
        references auth.users(id)
        on delete set null,

    atualizado_por uuid null
        default auth.uid()
        references auth.users(id)
        on delete set null,

    criado_em timestamptz not null
        default now(),

    atualizado_em timestamptz not null
        default now(),

    constraint extintores_codigo_preenchido_check
        check (length(trim(codigo)) > 0),

    constraint extintores_localizacao_preenchida_check
        check (length(trim(localizacao)) > 0),

    constraint extintores_tipo_preenchido_check
        check (length(trim(tipo)) > 0),

    constraint extintores_capacidade_preenchida_check
        check (length(trim(capacidade)) > 0),

    constraint extintores_status_check
        check (
            status in (
                'Ativo',
                'Inativo'
            )
        ),

    constraint extintores_situacao_operacional_check
        check (
            situacao_operacional in (
                'Em operação',
                'Em inspeção',
                'Em manutenção',
                'Em recarga',
                'Aguardando retorno',
                'Baixado'
            )
        ),

    constraint extintores_metadados_objeto_check
        check (jsonb_typeof(metadados) = 'object')
);

create table if not exists public.extintores_inspecoes (
    id uuid primary key default gen_random_uuid(),

    extintor_id uuid not null
        references public.extintores(id)
        on delete cascade,

    competencia date not null,

    respostas jsonb not null
        default '{}'::jsonb,

    observacoes text,
    responsavel text,

    status text not null
        default 'Em andamento',

    origem text not null
        default 'sistema',

    criado_por uuid null
        default auth.uid()
        references auth.users(id)
        on delete set null,

    atualizado_por uuid null
        default auth.uid()
        references auth.users(id)
        on delete set null,

    criado_em timestamptz not null
        default now(),

    atualizado_em timestamptz not null
        default now(),

    constraint extintores_inspecoes_competencia_mes_check
        check (
            competencia =
            date_trunc('month', competencia)::date
        ),

    constraint extintores_inspecoes_respostas_objeto_check
        check (jsonb_typeof(respostas) = 'object'),

    constraint extintores_inspecoes_status_check
        check (
            status in (
                'Conforme',
                'Atenção',
                'Em andamento'
            )
        ),

    constraint extintores_inspecoes_origem_check
        check (
            origem in (
                'sistema',
                'qr_publico',
                'migracao_local'
            )
        )
);

create table if not exists public.extintores_manutencoes (
    id uuid primary key default gen_random_uuid(),

    extintor_id uuid not null
        references public.extintores(id)
        on delete cascade,

    tipo_servico text not null,
    motivo text not null
        default 'Programada',

    empresa_nome text,
    empresa_cnpj text,
    registro_inmetro text,
    ordem_servico text,

    data_saida date not null
        default current_date,

    previsao_retorno date,
    data_retorno date,

    selo_conformidade text,

    observacoes text,
    observacoes_retorno text,

    proxima_manutencao date,
    proximo_ensaio_hidrostatico date,

    status text not null
        default 'Em andamento',

    criado_por uuid null
        default auth.uid()
        references auth.users(id)
        on delete set null,

    atualizado_por uuid null
        default auth.uid()
        references auth.users(id)
        on delete set null,

    criado_em timestamptz not null
        default now(),

    atualizado_em timestamptz not null
        default now(),

    constraint extintores_manutencoes_tipo_preenchido_check
        check (length(trim(tipo_servico)) > 0),

    constraint extintores_manutencoes_status_check
        check (
            status in (
                'Em andamento',
                'Concluído',
                'Cancelado'
            )
        ),

    constraint extintores_manutencoes_datas_check
        check (
            data_retorno is null
            or data_retorno >= data_saida
        )
);

create unique index if not exists
    extintores_token_publico_unique_idx
on public.extintores (token_publico);

create unique index if not exists
    extintores_obra_codigo_unique_idx
on public.extintores (
    obra_id,
    lower(trim(codigo))
);

create unique index if not exists
    extintores_obra_referencia_local_unique_idx
on public.extintores (
    obra_id,
    referencia_local
)
where referencia_local is not null
  and length(trim(referencia_local)) > 0;

create index if not exists
    extintores_empresa_id_idx
on public.extintores (empresa_id);

create index if not exists
    extintores_obra_id_idx
on public.extintores (obra_id);

create index if not exists
    extintores_ponto_id_idx
on public.extintores (ponto_id);

create index if not exists
    extintores_status_idx
on public.extintores (
    obra_id,
    status,
    situacao_operacional
);

create index if not exists
    extintores_inspecoes_extintor_competencia_idx
on public.extintores_inspecoes (
    extintor_id,
    competencia desc,
    criado_em desc
);

create index if not exists
    extintores_inspecoes_status_idx
on public.extintores_inspecoes (
    status,
    atualizado_em desc
);

create index if not exists
    extintores_manutencoes_extintor_idx
on public.extintores_manutencoes (
    extintor_id,
    atualizado_em desc
);

create index if not exists
    extintores_manutencoes_status_idx
on public.extintores_manutencoes (
    status,
    atualizado_em desc
);

create unique index if not exists
    extintores_manutencoes_aberta_unique_idx
on public.extintores_manutencoes (extintor_id)
where status = 'Em andamento';

create or replace function
    public.extintores_validar_vinculos()
returns trigger
language plpgsql
set search_path = public
as $$
declare
    v_obra_ponto uuid;
begin
    if new.empresa_id is not null
       and not exists (
            select 1
            from public.empresas_obras eo
            where eo.empresa_id = new.empresa_id
              and eo.obra_id = new.obra_id
       ) then
        raise exception
            'A empresa informada não está vinculada à obra do extintor.';
    end if;

    if new.ponto_id is not null then
        select m.obra_id
        into v_obra_ponto
        from public.mapas_pontos p
        join public.mapas_obras m
          on m.id = p.mapa_id
        where p.id = new.ponto_id;

        if v_obra_ponto is null then
            raise exception
                'O ponto informado não foi localizado.';
        end if;

        if v_obra_ponto <> new.obra_id then
            raise exception
                'O ponto informado pertence a outra obra.';
        end if;
    end if;

    return new;
end;
$$;

revoke all privileges
on function public.extintores_validar_vinculos()
from public;

revoke all privileges
on function public.extintores_validar_vinculos()
from anon;

revoke all privileges
on function public.extintores_validar_vinculos()
from authenticated;

grant execute
on function public.extintores_validar_vinculos()
to service_role;

drop trigger if exists
    extintores_validar_vinculos_trigger
on public.extintores;

create trigger
    extintores_validar_vinculos_trigger
before insert or update of
    empresa_id,
    obra_id,
    ponto_id
on public.extintores
for each row
execute function
    public.extintores_validar_vinculos();

create or replace function
    public.extintores_atualizar_timestamp()
returns trigger
language plpgsql
set search_path = public, auth
as $$
begin
    new.atualizado_em = now();

    new.atualizado_por = coalesce(
        auth.uid(),
        new.atualizado_por,
        old.atualizado_por
    );

    return new;
end;
$$;

revoke all privileges
on function public.extintores_atualizar_timestamp()
from public;

revoke all privileges
on function public.extintores_atualizar_timestamp()
from anon;

revoke all privileges
on function public.extintores_atualizar_timestamp()
from authenticated;

grant execute
on function public.extintores_atualizar_timestamp()
to service_role;

drop trigger if exists
    extintores_atualizar_timestamp_trigger
on public.extintores;

create trigger
    extintores_atualizar_timestamp_trigger
before update
on public.extintores
for each row
execute function
    public.extintores_atualizar_timestamp();

drop trigger if exists
    extintores_inspecoes_atualizar_timestamp_trigger
on public.extintores_inspecoes;

create trigger
    extintores_inspecoes_atualizar_timestamp_trigger
before update
on public.extintores_inspecoes
for each row
execute function
    public.extintores_atualizar_timestamp();

drop trigger if exists
    extintores_manutencoes_atualizar_timestamp_trigger
on public.extintores_manutencoes;

create trigger
    extintores_manutencoes_atualizar_timestamp_trigger
before update
on public.extintores_manutencoes
for each row
execute function
    public.extintores_atualizar_timestamp();

create or replace function
    public.usuario_tem_acesso_extintor(
        p_extintor_id uuid
    )
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
    select
        public.usuario_ativo_sistema()
        and exists (
            select 1
            from public.extintores e
            where e.id = p_extintor_id
              and exists (
                    select 1
                    from public.empresas_obras eo
                    where eo.obra_id = e.obra_id
                      and public.usuario_tem_acesso_empresa(
                            eo.empresa_id
                      )
              )
              and (
                    e.empresa_id is null
                    or public.usuario_tem_acesso_empresa(
                        e.empresa_id
                    )
              )
        );
$$;

revoke all privileges
on function public.usuario_tem_acesso_extintor(uuid)
from public;

revoke all privileges
on function public.usuario_tem_acesso_extintor(uuid)
from anon;

grant execute
on function public.usuario_tem_acesso_extintor(uuid)
to authenticated;

grant execute
on function public.usuario_tem_acesso_extintor(uuid)
to service_role;

alter table public.extintores
    enable row level security;

alter table public.extintores_inspecoes
    enable row level security;

alter table public.extintores_manutencoes
    enable row level security;

drop policy if exists
    extintores_select_escopo
on public.extintores;

create policy
    extintores_select_escopo
on public.extintores
for select
to authenticated
using (
    public.usuario_ativo_sistema()
    and exists (
        select 1
        from public.empresas_obras eo
        where eo.obra_id = extintores.obra_id
          and public.usuario_tem_acesso_empresa(
                eo.empresa_id
          )
    )
    and (
        extintores.empresa_id is null
        or public.usuario_tem_acesso_empresa(
            extintores.empresa_id
        )
    )
);

drop policy if exists
    extintores_insert_escopo
on public.extintores;

create policy
    extintores_insert_escopo
on public.extintores
for insert
to authenticated
with check (
    public.usuario_ativo_sistema()
    and exists (
        select 1
        from public.empresas_obras eo
        where eo.obra_id = extintores.obra_id
          and public.usuario_tem_acesso_empresa(
                eo.empresa_id
          )
    )
    and (
        extintores.empresa_id is null
        or public.usuario_tem_acesso_empresa(
            extintores.empresa_id
        )
    )
);

drop policy if exists
    extintores_update_escopo
on public.extintores;

create policy
    extintores_update_escopo
on public.extintores
for update
to authenticated
using (
    public.usuario_ativo_sistema()
    and exists (
        select 1
        from public.empresas_obras eo
        where eo.obra_id = extintores.obra_id
          and public.usuario_tem_acesso_empresa(
                eo.empresa_id
          )
    )
    and (
        extintores.empresa_id is null
        or public.usuario_tem_acesso_empresa(
            extintores.empresa_id
        )
    )
)
with check (
    public.usuario_ativo_sistema()
    and exists (
        select 1
        from public.empresas_obras eo
        where eo.obra_id = extintores.obra_id
          and public.usuario_tem_acesso_empresa(
                eo.empresa_id
          )
    )
    and (
        extintores.empresa_id is null
        or public.usuario_tem_acesso_empresa(
            extintores.empresa_id
        )
    )
);

drop policy if exists
    extintores_delete_escopo
on public.extintores;

create policy
    extintores_delete_escopo
on public.extintores
for delete
to authenticated
using (
    public.usuario_ativo_sistema()
    and exists (
        select 1
        from public.empresas_obras eo
        where eo.obra_id = extintores.obra_id
          and public.usuario_tem_acesso_empresa(
                eo.empresa_id
          )
    )
    and (
        extintores.empresa_id is null
        or public.usuario_tem_acesso_empresa(
            extintores.empresa_id
        )
    )
);

drop policy if exists
    extintores_inspecoes_select_escopo
on public.extintores_inspecoes;

create policy
    extintores_inspecoes_select_escopo
on public.extintores_inspecoes
for select
to authenticated
using (
    public.usuario_tem_acesso_extintor(
        extintor_id
    )
);

drop policy if exists
    extintores_inspecoes_insert_escopo
on public.extintores_inspecoes;

create policy
    extintores_inspecoes_insert_escopo
on public.extintores_inspecoes
for insert
to authenticated
with check (
    public.usuario_tem_acesso_extintor(
        extintor_id
    )
);

drop policy if exists
    extintores_inspecoes_update_escopo
on public.extintores_inspecoes;

create policy
    extintores_inspecoes_update_escopo
on public.extintores_inspecoes
for update
to authenticated
using (
    public.usuario_tem_acesso_extintor(
        extintor_id
    )
)
with check (
    public.usuario_tem_acesso_extintor(
        extintor_id
    )
);

drop policy if exists
    extintores_inspecoes_delete_escopo
on public.extintores_inspecoes;

create policy
    extintores_inspecoes_delete_escopo
on public.extintores_inspecoes
for delete
to authenticated
using (
    public.usuario_tem_acesso_extintor(
        extintor_id
    )
);

drop policy if exists
    extintores_manutencoes_select_escopo
on public.extintores_manutencoes;

create policy
    extintores_manutencoes_select_escopo
on public.extintores_manutencoes
for select
to authenticated
using (
    public.usuario_tem_acesso_extintor(
        extintor_id
    )
);

drop policy if exists
    extintores_manutencoes_insert_escopo
on public.extintores_manutencoes;

create policy
    extintores_manutencoes_insert_escopo
on public.extintores_manutencoes
for insert
to authenticated
with check (
    public.usuario_tem_acesso_extintor(
        extintor_id
    )
);

drop policy if exists
    extintores_manutencoes_update_escopo
on public.extintores_manutencoes;

create policy
    extintores_manutencoes_update_escopo
on public.extintores_manutencoes
for update
to authenticated
using (
    public.usuario_tem_acesso_extintor(
        extintor_id
    )
)
with check (
    public.usuario_tem_acesso_extintor(
        extintor_id
    )
);

drop policy if exists
    extintores_manutencoes_delete_escopo
on public.extintores_manutencoes;

create policy
    extintores_manutencoes_delete_escopo
on public.extintores_manutencoes
for delete
to authenticated
using (
    public.usuario_tem_acesso_extintor(
        extintor_id
    )
);

revoke all privileges
on table public.extintores
from public;

revoke all privileges
on table public.extintores_inspecoes
from public;

revoke all privileges
on table public.extintores_manutencoes
from public;

revoke all privileges
on table public.extintores
from anon;

revoke all privileges
on table public.extintores_inspecoes
from anon;

revoke all privileges
on table public.extintores_manutencoes
from anon;

revoke all privileges
on table public.extintores
from authenticated;

revoke all privileges
on table public.extintores_inspecoes
from authenticated;

revoke all privileges
on table public.extintores_manutencoes
from authenticated;

grant
    select,
    insert,
    update,
    delete
on table public.extintores
to authenticated;

grant
    select,
    insert,
    update,
    delete
on table public.extintores_inspecoes
to authenticated;

grant
    select,
    insert,
    update,
    delete
on table public.extintores_manutencoes
to authenticated;

grant all privileges
on table public.extintores
to service_role;

grant all privileges
on table public.extintores_inspecoes
to service_role;

grant all privileges
on table public.extintores_manutencoes
to service_role;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conrelid =
            'public.mapas_itens'::regclass
          and conname =
            'mapas_itens_extintor_id_fkey'
    ) then
        alter table public.mapas_itens
            add constraint
                mapas_itens_extintor_id_fkey
            foreign key (extintor_id)
            references public.extintores(id)
            on delete set null
            not valid;
    end if;
end;
$$;

alter table public.mapas_itens
    validate constraint
        mapas_itens_extintor_id_fkey;

create index if not exists
    mapas_itens_extintor_id_idx
on public.mapas_itens (extintor_id);

comment on table public.extintores is
'Cadastro remoto de extintores por obra, com token público, localização, situação operacional e vínculo opcional ao mapa.';

comment on column public.extintores.token_publico is
'Token opaco utilizado pela consulta e vistoria pública por QR Code. Não concede acesso direto às tabelas.';

comment on column public.extintores.referencia_local is
'Identificador preservado durante a migração controlada dos registros anteriormente mantidos no localStorage.';

comment on table public.extintores_inspecoes is
'Histórico de inspeções mensais dos extintores, incluindo registros internos, públicos e migrados.';

comment on table public.extintores_manutencoes is
'Histórico de envio, manutenção, recarga, retorno e ensaio hidrostático dos extintores.';

notify pgrst, 'reload schema';

commit;
