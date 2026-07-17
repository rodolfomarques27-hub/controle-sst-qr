-- Roteiro 2 - Etapa 104
-- Persistencia segura do ajuste visual do fundo publico do login.
-- Mantem o bucket logos-empresas restrito a imagens e grava size, position e overlay no banco.

create table if not exists public.configuracoes_publicas_sistema (
    chave text primary key,
    valor jsonb not null default '{}'::jsonb,
    atualizado_em timestamptz not null default now(),
    atualizado_por uuid null references auth.users(id) on delete set null
);

alter table public.configuracoes_publicas_sistema enable row level security;

revoke all on table public.configuracoes_publicas_sistema from anon, authenticated;
grant select, insert, update, delete on table public.configuracoes_publicas_sistema to service_role;

insert into public.configuracoes_publicas_sistema (
    chave,
    valor,
    atualizado_em,
    atualizado_por
)
values (
    'fundo_login',
    jsonb_build_object(
        'size', 'cover',
        'position', 'center center',
        'overlay', 0.62
    ),
    now(),
    null
)
on conflict (chave) do nothing;

create or replace function public.obter_estado_fundo_login_publico()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, storage
as $function$
    with imagem as (
        select updated_at
        from storage.objects
        where bucket_id = 'logos-empresas'
          and name = 'configuracoes/login/fundo-login.jpg'
        limit 1
    ),
    configuracao as (
        select valor, atualizado_em
        from public.configuracoes_publicas_sistema
        where chave = 'fundo_login'
        limit 1
    ),
    ultima_atualizacao as (
        select max(dados.atualizado_em) as atualizado_em
        from (
            select imagem.updated_at as atualizado_em
            from imagem
            union all
            select configuracao.atualizado_em
            from configuracao
        ) dados
    )
    select jsonb_build_object(
        'imagem_disponivel', exists (select 1 from imagem),
        'configuracao_disponivel', exists (select 1 from configuracao),
        'ajuste', coalesce(
            (select configuracao.valor from configuracao),
            jsonb_build_object(
                'size', 'cover',
                'position', 'center center',
                'overlay', 0.62
            )
        ),
        'versao', coalesce(
            (
                select (
                    extract(epoch from ultima_atualizacao.atualizado_em) * 1000
                )::bigint::text
                from ultima_atualizacao
            ),
            ''
        )
    );
$function$;

create or replace function public.salvar_ajuste_fundo_login_sistema(
    p_size text,
    p_position text,
    p_overlay numeric
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
    v_size text := lower(btrim(coalesce(p_size, '')));
    v_position text := lower(regexp_replace(btrim(coalesce(p_position, '')), '\s+', ' ', 'g'));
    v_overlay numeric := p_overlay;
    v_ajuste jsonb;
    v_atualizado_em timestamptz;
begin
    if auth.uid() is null then
        raise exception 'Sessao autenticada obrigatoria para alterar o fundo do login.'
            using errcode = '42501';
    end if;

    if not exists (
        select 1
        from public.usuario_permissao_sistema_atual() permissao
        where coalesce(permissao.ativo, false) = true
          and coalesce(permissao.bloqueado, false) = false
          and (
              coalesce(permissao.acesso_global, false) = true
              or lower(coalesce(permissao.perfil, '')) in ('admin', 'administrador')
              or coalesce(permissao.permissoes ->> 'acessoTotal', 'false') = 'true'
              or coalesce(
                  permissao.permissoes -> 'acoesCriticas' ->> 'configuracoes_criticas',
                  'false'
              ) = 'true'
              or coalesce(
                  permissao.permissoes -> 'modulos' -> 'configuracoes' ->> 'editar',
                  'false'
              ) = 'true'
          )
    ) then
        raise exception 'Sem permissao para alterar configuracoes criticas do sistema.'
            using errcode = '42501';
    end if;

    if v_size not in ('cover', 'contain', '115% auto') then
        raise exception 'Ajuste de tamanho invalido para o fundo do login.'
            using errcode = '22023';
    end if;

    if v_position not in (
        'center center',
        'center 30%',
        'center 70%',
        '30% center',
        '70% center'
    ) then
        raise exception 'Ajuste de posicao invalido para o fundo do login.'
            using errcode = '22023';
    end if;

    if v_overlay is null or v_overlay < 0.28 or v_overlay > 0.82 then
        raise exception 'Ajuste de contraste invalido para o fundo do login.'
            using errcode = '22023';
    end if;

    v_ajuste := jsonb_build_object(
        'size', v_size,
        'position', v_position,
        'overlay', v_overlay
    );

    insert into public.configuracoes_publicas_sistema (
        chave,
        valor,
        atualizado_em,
        atualizado_por
    )
    values (
        'fundo_login',
        v_ajuste,
        now(),
        auth.uid()
    )
    on conflict (chave) do update
    set valor = excluded.valor,
        atualizado_em = excluded.atualizado_em,
        atualizado_por = excluded.atualizado_por
    returning atualizado_em into v_atualizado_em;

    return jsonb_build_object(
        'ajuste', v_ajuste,
        'versao', (
            extract(epoch from v_atualizado_em) * 1000
        )::bigint::text
    );
end;
$function$;

create or replace function public.restaurar_ajuste_fundo_login_sistema()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
    v_ajuste constant jsonb := jsonb_build_object(
        'size', 'cover',
        'position', 'center center',
        'overlay', 0.62
    );
    v_atualizado_em timestamptz;
begin
    if auth.uid() is null then
        raise exception 'Sessao autenticada obrigatoria para restaurar o fundo do login.'
            using errcode = '42501';
    end if;

    if not exists (
        select 1
        from public.usuario_permissao_sistema_atual() permissao
        where coalesce(permissao.ativo, false) = true
          and coalesce(permissao.bloqueado, false) = false
          and (
              coalesce(permissao.acesso_global, false) = true
              or lower(coalesce(permissao.perfil, '')) in ('admin', 'administrador')
              or coalesce(permissao.permissoes ->> 'acessoTotal', 'false') = 'true'
              or coalesce(
                  permissao.permissoes -> 'acoesCriticas' ->> 'configuracoes_criticas',
                  'false'
              ) = 'true'
              or coalesce(
                  permissao.permissoes -> 'modulos' -> 'configuracoes' ->> 'editar',
                  'false'
              ) = 'true'
          )
    ) then
        raise exception 'Sem permissao para alterar configuracoes criticas do sistema.'
            using errcode = '42501';
    end if;

    insert into public.configuracoes_publicas_sistema (
        chave,
        valor,
        atualizado_em,
        atualizado_por
    )
    values (
        'fundo_login',
        v_ajuste,
        now(),
        auth.uid()
    )
    on conflict (chave) do update
    set valor = excluded.valor,
        atualizado_em = excluded.atualizado_em,
        atualizado_por = excluded.atualizado_por
    returning atualizado_em into v_atualizado_em;

    return jsonb_build_object(
        'ajuste', v_ajuste,
        'versao', (
            extract(epoch from v_atualizado_em) * 1000
        )::bigint::text
    );
end;
$function$;

revoke all on function public.obter_estado_fundo_login_publico() from public;
revoke all on function public.salvar_ajuste_fundo_login_sistema(text, text, numeric) from public;
revoke all on function public.restaurar_ajuste_fundo_login_sistema() from public;

grant execute on function public.obter_estado_fundo_login_publico()
to anon, authenticated, service_role;

grant execute on function public.salvar_ajuste_fundo_login_sistema(text, text, numeric)
to authenticated, service_role;

grant execute on function public.restaurar_ajuste_fundo_login_sistema()
to authenticated, service_role;

comment on table public.configuracoes_publicas_sistema
is 'Configuracoes publicas nao sensiveis expostas somente por RPCs controladas.';

comment on function public.obter_estado_fundo_login_publico()
is 'Retorna existencia, versao e ajuste visual seguro do fundo publico do login.';

comment on function public.salvar_ajuste_fundo_login_sistema(text, text, numeric)
is 'Salva o ajuste visual do fundo do login para usuario autorizado em Configuracoes.';

comment on function public.restaurar_ajuste_fundo_login_sistema()
is 'Restaura o ajuste visual padrao do fundo do login para usuario autorizado.';