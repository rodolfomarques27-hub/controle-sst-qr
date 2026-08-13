-- SafeScan Brasil
-- Inicialização idempotente da competência mensal documental.
-- Esta migration apenas cria a RPC e seus privilégios.
-- Não cria itens, versões ou documentos automaticamente.

begin;

do $preflight$
begin
    if to_regclass(
        'public.certidao_mensal_competencias'
    ) is null then
        raise exception
            'Tabela public.certidao_mensal_competencias não localizada.';
    end if;

    if to_regclass(
        'public.certidao_mensal_auditoria'
    ) is null then
        raise exception
            'Tabela public.certidao_mensal_auditoria não localizada.';
    end if;

    if to_regprocedure(
        'public.certidao_mensal_usuario_pode_acessar_empresa(uuid)'
    ) is null then
        raise exception
            'Função de autorização da empresa não localizada.';
    end if;

    if not exists (
        select 1
        from pg_catalog.pg_constraint constraint_record
        where constraint_record.conrelid =
                  'public.certidao_mensal_competencias'::regclass
          and constraint_record.conname =
                  'certidao_mensal_competencias_empresa_mes_key'
          and constraint_record.contype =
                  'u'
    ) then
        raise exception
            'Restrição única empresa/mês da competência não localizada.';
    end if;

    if (
        select count(*)
        from information_schema.columns column_record
        where column_record.table_schema =
                  'public'
          and column_record.table_name =
                  'certidao_mensal_competencias'
          and column_record.column_name in (
                  'fechado_em',
                  'fechado_por'
              )
    ) <> 2 then
        raise exception
            'Colunas de fechamento anual da competência não localizadas.';
    end if;
end;
$preflight$;

create or replace function
    public.obter_ou_criar_competencia_certidao_mensal(
        p_empresa_id uuid,
        p_competencia date
    )
returns jsonb
language plpgsql
volatile
security invoker
set search_path = pg_catalog, public, auth
as $function$
declare
    v_competencia
        public.certidao_mensal_competencias%rowtype;

    v_criada boolean :=
        false;
begin
    if auth.uid() is null then
        raise exception using
            errcode = '42501',
            message = 'Usuário não autenticado.';
    end if;

    if p_empresa_id is null then
        raise exception using
            errcode = '22023',
            message = 'A empresa é obrigatória.';
    end if;

    if p_competencia is null
       or p_competencia <>
            date_trunc(
                'month',
                p_competencia
            )::date
    then
        raise exception using
            errcode = '22023',
            message = 'A competência deve representar o primeiro dia do mês.';
    end if;

    if not public.certidao_mensal_usuario_pode_acessar_empresa(
        p_empresa_id
    ) then
        raise exception using
            errcode = '42501',
            message = 'Usuário sem acesso à empresa informada.';
    end if;

    insert into
        public.certidao_mensal_competencias (
            empresa_id,
            competencia,
            status,
            contrato_versao,
            resumo,
            criado_por,
            atualizado_por
        )
    values (
        p_empresa_id,
        p_competencia,
        'ABERTA',
        1,
        '{}'::jsonb,
        auth.uid(),
        auth.uid()
    )
    on conflict (
        empresa_id,
        competencia
    )
    do nothing
    returning *
    into v_competencia;

    v_criada :=
        found;

    if not v_criada then
        select
            competencia_record.*
        into
            v_competencia
        from
            public.certidao_mensal_competencias
                competencia_record
        where competencia_record.empresa_id =
                  p_empresa_id
          and competencia_record.competencia =
                  p_competencia;

        if not found then
            raise exception using
                errcode = 'P0002',
                message = 'A competência não foi localizada após a inicialização concorrente.';
        end if;
    end if;

    if v_criada then
        insert into
            public.certidao_mensal_auditoria (
                competencia_id,
                item_id,
                versao_id,
                tipo_evento,
                dados,
                usuario_id
            )
        values (
            v_competencia.id,
            null,
            null,
            'COMPETENCIA_ABERTA',
            jsonb_build_object(
                'contratoVersao',
                    '1.0',
                'empresaId',
                    v_competencia.empresa_id,
                'competencia',
                    v_competencia.competencia,
                'statusDestino',
                    v_competencia.status,
                'origem',
                    'INICIALIZACAO_EXPLICITA'
            ),
            auth.uid()
        );
    end if;

    return jsonb_build_object(
        'competenciaId',
            v_competencia.id,
        'empresaId',
            v_competencia.empresa_id,
        'competencia',
            v_competencia.competencia,
        'status',
            v_competencia.status,
        'contratoVersao',
            v_competencia.contrato_versao,
        'criada',
            v_criada,
        'reutilizada',
            not v_criada,
        'fechadoEm',
            v_competencia.fechado_em,
        'fechadoPor',
            v_competencia.fechado_por,
        'atualizadoEm',
            v_competencia.atualizado_em
    );
end;
$function$;

revoke all on function
    public.obter_ou_criar_competencia_certidao_mensal(
        uuid,
        date
    )
from public;

revoke all on function
    public.obter_ou_criar_competencia_certidao_mensal(
        uuid,
        date
    )
from anon;

revoke all on function
    public.obter_ou_criar_competencia_certidao_mensal(
        uuid,
        date
    )
from authenticated;

revoke all on function
    public.obter_ou_criar_competencia_certidao_mensal(
        uuid,
        date
    )
from service_role;

grant execute on function
    public.obter_ou_criar_competencia_certidao_mensal(
        uuid,
        date
    )
to authenticated, service_role;

comment on function
    public.obter_ou_criar_competencia_certidao_mensal(
        uuid,
        date
    )
is
    'Obtém ou cria de forma idempotente a competência mensal sem gerar itens, versões ou documentos fictícios.';

do $validacao$
declare
    v_security_definer boolean;
    v_volatilidade "char";
    v_configuracao text;
begin
    if to_regprocedure(
        'public.obter_ou_criar_competencia_certidao_mensal(uuid,date)'
    ) is null then
        raise exception
            'RPC de inicialização não foi criada.';
    end if;

    if has_function_privilege(
        'anon',
        'public.obter_ou_criar_competencia_certidao_mensal(uuid,date)',
        'EXECUTE'
    ) then
        raise exception
            'Anon possui acesso indevido à RPC de inicialização.';
    end if;

    if not has_function_privilege(
        'authenticated',
        'public.obter_ou_criar_competencia_certidao_mensal(uuid,date)',
        'EXECUTE'
    ) then
        raise exception
            'Authenticated não possui acesso à RPC de inicialização.';
    end if;

    if not has_function_privilege(
        'service_role',
        'public.obter_ou_criar_competencia_certidao_mensal(uuid,date)',
        'EXECUTE'
    ) then
        raise exception
            'Service role não possui acesso à RPC de inicialização.';
    end if;

    select
        procedure_record.prosecdef,
        procedure_record.provolatile,
        coalesce(
            array_to_string(
                procedure_record.proconfig,
                ','
            ),
            ''
        )
    into
        v_security_definer,
        v_volatilidade,
        v_configuracao
    from pg_catalog.pg_proc procedure_record
    where procedure_record.oid =
        to_regprocedure(
            'public.obter_ou_criar_competencia_certidao_mensal(uuid,date)'
        );

    if v_security_definer then
        raise exception
            'A RPC de inicialização não pode ser SECURITY DEFINER.';
    end if;

    if v_volatilidade <> 'v' then
        raise exception
            'A RPC de inicialização precisa permanecer VOLATILE.';
    end if;

    if position(
        'search_path=pg_catalog, public, auth'
        in v_configuracao
    ) = 0 then
        raise exception
            'Search path fixo da RPC de inicialização não foi preservado.';
    end if;
end;
$validacao$;

notify pgrst, 'reload schema';

commit;
