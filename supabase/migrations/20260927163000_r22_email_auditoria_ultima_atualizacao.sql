-- R2.2-E3-C5D
-- Última alteração real da configuração legada de Auditoria.
-- Não cria tabela, coluna ou política e não altera dados.

create or replace function public.obter_ultima_atualizacao_auditoria_empresa_tenant(
    p_tenant_id uuid,
    p_empresa_id uuid
)
returns timestamptz
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
    v_atualizado_em timestamptz;
begin
    if auth.uid() is null then
        raise exception
            'Autenticação obrigatória para consultar a última atualização da Auditoria.'
            using errcode = '42501';
    end if;

    if p_tenant_id is null then
        raise exception
            'Tenant não informado.'
            using errcode = '22023';
    end if;

    if p_empresa_id is null then
        raise exception
            'Empresa não informada.'
            using errcode = '22023';
    end if;

    if not public.usuario_tem_acesso_tenant(
        p_tenant_id
    ) then
        raise exception
            'Sem acesso ao tenant informado.'
            using errcode = '42501';
    end if;

    if not public.tenant_tem_modulo(
        p_tenant_id,
        'auditoria_campo'
    ) then
        raise exception
            'Módulo de Auditoria não contratado para o tenant informado.'
            using errcode = '42501';
    end if;

    if not exists (
        select 1
        from public.empresas empresa
        where empresa.id = p_empresa_id
          and empresa.tenant_id = p_tenant_id
    ) then
        raise exception
            'Empresa não pertence ao tenant informado.'
            using errcode = '42501';
    end if;

    with historico as (
        select
            auditoria.id,
            auditoria.created_at,
            auditoria.acao,

            auditoria.dados
                -> 'registro'
                ->> 'receber_auditoria'
                as receber_auditoria,

            auditoria.dados
                -> 'registro'
                ->> 'responsavel_auditoria'
                as responsavel_auditoria,

            auditoria.dados
                -> 'registro'
                ->> 'email_auditoria'
                as email_auditoria,

            lag(
                auditoria.created_at
            ) over (
                order by
                    auditoria.created_at,
                    auditoria.id
            ) as anterior_created_at,

            lag(
                auditoria.dados
                    -> 'registro'
                    ->> 'receber_auditoria'
            ) over (
                order by
                    auditoria.created_at,
                    auditoria.id
            ) as anterior_receber_auditoria,

            lag(
                auditoria.dados
                    -> 'registro'
                    ->> 'responsavel_auditoria'
            ) over (
                order by
                    auditoria.created_at,
                    auditoria.id
            ) as anterior_responsavel_auditoria,

            lag(
                auditoria.dados
                    -> 'registro'
                    ->> 'email_auditoria'
            ) over (
                order by
                    auditoria.created_at,
                    auditoria.id
            ) as anterior_email_auditoria

        from public.auditoria_sistema auditoria
        where auditoria.tabela = 'empresas'
          and auditoria.registro_id = p_empresa_id::text
          and auditoria.acao in (
              'INSERT',
              'UPDATE'
          )
          and auditoria.dados ? 'registro'
    ),
    mudancas_reais as (
        select
            historico.created_at
        from historico
        where historico.acao = 'UPDATE'
          and historico.anterior_created_at is not null
          and (
              historico.receber_auditoria
                  is distinct from
              historico.anterior_receber_auditoria

              or

              historico.responsavel_auditoria
                  is distinct from
              historico.anterior_responsavel_auditoria

              or

              historico.email_auditoria
                  is distinct from
              historico.anterior_email_auditoria
          )
    )
    select
        max(
            mudancas_reais.created_at
        )
    into
        v_atualizado_em
    from mudancas_reais;

    return v_atualizado_em;
end;
$function$;

revoke all
on function public.obter_ultima_atualizacao_auditoria_empresa_tenant(
    uuid,
    uuid
)
from public;

revoke all
on function public.obter_ultima_atualizacao_auditoria_empresa_tenant(
    uuid,
    uuid
)
from anon;

grant execute
on function public.obter_ultima_atualizacao_auditoria_empresa_tenant(
    uuid,
    uuid
)
to authenticated;
