-- ============================================================
-- SAFESCAN BRASIL
-- RESTRINGIR EXECUCAO DIRETA DE FUNCOES INTERNAS
--
-- Esta migration reproduz o endurecimento aplicado e validado
-- previamente no ambiente de producao.
--
-- Nao altera dados, tabelas, triggers, RLS ou policies.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. VALIDAR AS ASSINATURAS ESPERADAS
-- ------------------------------------------------------------

do $bloco$
declare
    assinatura text;
begin
    foreach assinatura in array array[
        'public.atualizar_empresas_obras_updated_at()',
        'public.atualizar_obras_updated_at()',
        'public.atualizar_updated_at_dds_registros()',
        'public.atualizar_updated_at_obras_empresas()',
        'public.atualizar_updated_at_solicitacoes_acesso_sistema()',
        'public.set_updated_at_usuarios_permissoes_sistema()',
        'public.montar_permissoes_padrao_usuario_sistema(text)'
    ]
    loop
        if to_regprocedure(assinatura) is null then
            raise exception
                'Funcao esperada nao encontrada: %',
                assinatura;
        end if;
    end loop;
end;
$bloco$;

-- ------------------------------------------------------------
-- 2. REMOVER EXECUCAO DIRETA DOS PAPEIS DA APLICACAO
-- ------------------------------------------------------------

revoke execute
on function public.atualizar_empresas_obras_updated_at()
from public, anon, authenticated;

revoke execute
on function public.atualizar_obras_updated_at()
from public, anon, authenticated;

revoke execute
on function public.atualizar_updated_at_dds_registros()
from public, anon, authenticated;

revoke execute
on function public.atualizar_updated_at_obras_empresas()
from public, anon, authenticated;

revoke execute
on function public.atualizar_updated_at_solicitacoes_acesso_sistema()
from public, anon, authenticated;

revoke execute
on function public.set_updated_at_usuarios_permissoes_sistema()
from public, anon, authenticated;

revoke execute
on function public.montar_permissoes_padrao_usuario_sistema(text)
from public, anon, authenticated;

-- ------------------------------------------------------------
-- 3. PRESERVAR EXECUCAO PELO SERVICE ROLE
-- ------------------------------------------------------------

grant execute
on function public.atualizar_empresas_obras_updated_at()
to service_role;

grant execute
on function public.atualizar_obras_updated_at()
to service_role;

grant execute
on function public.atualizar_updated_at_dds_registros()
to service_role;

grant execute
on function public.atualizar_updated_at_obras_empresas()
to service_role;

grant execute
on function public.atualizar_updated_at_solicitacoes_acesso_sistema()
to service_role;

grant execute
on function public.set_updated_at_usuarios_permissoes_sistema()
to service_role;

grant execute
on function public.montar_permissoes_padrao_usuario_sistema(text)
to service_role;

-- ------------------------------------------------------------
-- 4. VALIDAR GRANTS, TRIGGERS E RPCS CHAMADORAS
-- ------------------------------------------------------------

do $bloco$
declare
    assinatura text;
    oid_funcao oid;
    quantidade_triggers integer;
    quantidade_rpcs integer;
    quantidade_rpcs_invalidas integer;
begin
    foreach assinatura in array array[
        'public.atualizar_empresas_obras_updated_at()',
        'public.atualizar_obras_updated_at()',
        'public.atualizar_updated_at_dds_registros()',
        'public.atualizar_updated_at_obras_empresas()',
        'public.atualizar_updated_at_solicitacoes_acesso_sistema()',
        'public.set_updated_at_usuarios_permissoes_sistema()',
        'public.montar_permissoes_padrao_usuario_sistema(text)'
    ]
    loop
        oid_funcao :=
            to_regprocedure(assinatura)::oid;

        if
            has_function_privilege(
                'public',
                oid_funcao,
                'EXECUTE'
            )
            or has_function_privilege(
                'anon',
                oid_funcao,
                'EXECUTE'
            )
            or has_function_privilege(
                'authenticated',
                oid_funcao,
                'EXECUTE'
            )
        then
            raise exception
                'Funcao ainda aberta para papeis da aplicacao: %',
                assinatura;
        end if;

        if not has_function_privilege(
            'service_role',
            oid_funcao,
            'EXECUTE'
        )
        then
            raise exception
                'Service role perdeu EXECUTE na funcao: %',
                assinatura;
        end if;
    end loop;

    select
        count(distinct funcao.oid)
    into
        quantidade_triggers
    from pg_proc funcao
    join pg_namespace schema_funcao
        on schema_funcao.oid = funcao.pronamespace
    join pg_trigger gatilho
        on gatilho.tgfoid = funcao.oid
        and gatilho.tgisinternal = false
    where
        schema_funcao.nspname = 'public'
        and funcao.proname in (
            'atualizar_empresas_obras_updated_at',
            'atualizar_obras_updated_at',
            'atualizar_updated_at_dds_registros',
            'atualizar_updated_at_obras_empresas',
            'atualizar_updated_at_solicitacoes_acesso_sistema',
            'set_updated_at_usuarios_permissoes_sistema'
        );

    if quantidade_triggers <> 6 then
        raise exception
            'Esperadas 6 funcoes de trigger vinculadas; encontradas %.',
            quantidade_triggers;
    end if;

    select
        count(*),
        count(*) filter (
            where
                not funcao.prosecdef
                or has_function_privilege(
                    'public',
                    funcao.oid,
                    'EXECUTE'
                )
                or has_function_privilege(
                    'anon',
                    funcao.oid,
                    'EXECUTE'
                )
                or not has_function_privilege(
                    'authenticated',
                    funcao.oid,
                    'EXECUTE'
                )
        )
    into
        quantidade_rpcs,
        quantidade_rpcs_invalidas
    from pg_proc funcao
    join pg_namespace schema_funcao
        on schema_funcao.oid = funcao.pronamespace
    where
        schema_funcao.nspname = 'public'
        and funcao.proname in (
            'admin_aplicar_perfil_permissao_usuarios_sistema',
            'admin_salvar_usuario_permissao_sistema'
        )
        and funcao.prokind = 'f';

    if quantidade_rpcs <> 2 then
        raise exception
            'Esperadas 2 RPCs administrativas; encontradas %.',
            quantidade_rpcs;
    end if;

    if quantidade_rpcs_invalidas <> 0 then
        raise exception
            'Uma ou mais RPCs administrativas perderam a protecao esperada.';
    end if;
end;
$bloco$;

commit;
