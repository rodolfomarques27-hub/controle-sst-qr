-- SafeScan Brasil
-- Persistência remota das funções e matrizes de treinamentos.
-- Funções fixas continuam no código e podem receber ajustes remotos.
-- Funções personalizadas passam a ficar disponíveis em todos os computadores.

do $verificacao$
begin
    if to_regprocedure(
        'public.usuario_ativo_sistema()'
    ) is null then
        raise exception
            'Função obrigatória public.usuario_ativo_sistema() não encontrada.';
    end if;

    if to_regprocedure(
        'public.usuario_tem_permissao_sistema(text,text)'
    ) is null then
        raise exception
            'Função obrigatória public.usuario_tem_permissao_sistema(text,text) não encontrada.';
    end if;
end;
$verificacao$;

create table if not exists public.funcoes_treinamentos (
    chave text primary key,

    rotulo text not null,

    termos jsonb not null
        default '[]'::jsonb,

    treinamentos jsonb not null
        default '[]'::jsonb,

    tipo text not null
        default 'personalizada',

    ativa boolean not null
        default true,

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

    constraint funcoes_treinamentos_chave_preenchida_check
        check (
            length(trim(chave)) > 0
        ),

    constraint funcoes_treinamentos_rotulo_preenchido_check
        check (
            length(trim(rotulo)) > 0
        ),

    constraint funcoes_treinamentos_termos_array_check
        check (
            jsonb_typeof(termos) = 'array'
        ),

    constraint funcoes_treinamentos_treinamentos_array_check
        check (
            jsonb_typeof(treinamentos) = 'array'
        ),

    constraint funcoes_treinamentos_tipo_check
        check (
            tipo in (
                'personalizada',
                'ajuste_fixa'
            )
        ),

    constraint funcoes_treinamentos_chave_tipo_check
        check (
            (
                tipo = 'personalizada'
                and chave like 'custom-%'
            )
            or
            (
                tipo = 'ajuste_fixa'
                and chave not like 'custom-%'
            )
        )
);

create or replace function
    public.funcoes_treinamentos_atualizar_timestamp()
returns trigger
language plpgsql
set search_path = public, auth
as $function$
begin
    new.atualizado_em = now();

    new.atualizado_por = coalesce(
        auth.uid(),
        new.atualizado_por,
        old.atualizado_por
    );

    return new;
end;
$function$;

revoke all privileges
on function public.funcoes_treinamentos_atualizar_timestamp()
from public;

revoke all privileges
on function public.funcoes_treinamentos_atualizar_timestamp()
from anon;

revoke all privileges
on function public.funcoes_treinamentos_atualizar_timestamp()
from authenticated;

grant execute
on function public.funcoes_treinamentos_atualizar_timestamp()
to service_role;

drop trigger if exists
    funcoes_treinamentos_atualizar_timestamp_trigger
on public.funcoes_treinamentos;

create trigger
    funcoes_treinamentos_atualizar_timestamp_trigger
before update
on public.funcoes_treinamentos
for each row
execute function
    public.funcoes_treinamentos_atualizar_timestamp();

alter table public.funcoes_treinamentos
    enable row level security;

drop policy if exists
    funcoes_treinamentos_select_usuarios_ativos
on public.funcoes_treinamentos;

create policy
    funcoes_treinamentos_select_usuarios_ativos
on public.funcoes_treinamentos
for select
to authenticated
using (
    public.usuario_ativo_sistema()
);

drop policy if exists
    funcoes_treinamentos_insert_edicao_colaboradores
on public.funcoes_treinamentos;

create policy
    funcoes_treinamentos_insert_edicao_colaboradores
on public.funcoes_treinamentos
for insert
to authenticated
with check (
    public.usuario_ativo_sistema()
    and public.usuario_tem_permissao_sistema(
        'colaboradores',
        'editar'
    )
);

drop policy if exists
    funcoes_treinamentos_update_edicao_colaboradores
on public.funcoes_treinamentos;

create policy
    funcoes_treinamentos_update_edicao_colaboradores
on public.funcoes_treinamentos
for update
to authenticated
using (
    public.usuario_ativo_sistema()
    and public.usuario_tem_permissao_sistema(
        'colaboradores',
        'editar'
    )
)
with check (
    public.usuario_ativo_sistema()
    and public.usuario_tem_permissao_sistema(
        'colaboradores',
        'editar'
    )
);

drop policy if exists
    funcoes_treinamentos_delete_exclusao_colaboradores
on public.funcoes_treinamentos;

create policy
    funcoes_treinamentos_delete_exclusao_colaboradores
on public.funcoes_treinamentos
for delete
to authenticated
using (
    public.usuario_ativo_sistema()
    and public.usuario_tem_permissao_sistema(
        'colaboradores',
        'excluir'
    )
);

revoke all privileges
on table public.funcoes_treinamentos
from public;

revoke all privileges
on table public.funcoes_treinamentos
from anon;

revoke all privileges
on table public.funcoes_treinamentos
from authenticated;

grant
    select,
    insert,
    update,
    delete
on table public.funcoes_treinamentos
to authenticated;

grant all privileges
on table public.funcoes_treinamentos
to service_role;

comment on table public.funcoes_treinamentos
is
    'Ajustes das matrizes fixas e funções personalizadas de treinamentos do SafeScan.';

comment on column public.funcoes_treinamentos.tipo
is
    'personalizada cria uma nova função; ajuste_fixa sobrescreve uma matriz fixa sem remover sua definição original.';

comment on column public.funcoes_treinamentos.termos
is
    'Lista JSON de palavras-chave utilizadas para identificar a função-base.';

comment on column public.funcoes_treinamentos.treinamentos
is
    'Lista JSON de identificadores dos treinamentos e documentos obrigatórios.';
