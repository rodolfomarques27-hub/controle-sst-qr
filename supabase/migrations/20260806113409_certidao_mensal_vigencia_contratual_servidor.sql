begin;

do $$
begin
    if not exists (
        select
            1
        from pg_constraint
        where conname =
            'empresas_contrato_datas_ordem_check'
          and conrelid =
            'public.empresas'::regclass
    ) then
        alter table public.empresas
            add constraint empresas_contrato_datas_ordem_check
            check (
                data_fim_contrato is null
                or data_inicio_contrato is null
                or data_fim_contrato >= data_inicio_contrato
            )
            not valid;
    end if;
end;
$$;

alter table public.empresas
    validate constraint empresas_contrato_datas_ordem_check;

create or replace function
    public.certidao_mensal_classificar_vigencia_contratual_valores(
        p_tipo_empresa text,
        p_data_inicio_contrato date,
        p_data_fim_contrato date,
        p_competencia date
    )
returns text
language plpgsql
immutable
set search_path to
    pg_catalog,
    public
as $function$
declare
    v_tipo_empresa text :=
        lower(
            btrim(
                coalesce(
                    p_tipo_empresa,
                    ''
                )
            )
        );

    v_competencia_mes date;
    v_inicio_mes date;
    v_fim_mes date;
begin
    if v_tipo_empresa not in (
        'terceirizada',
        'subcontratada'
    ) then
        return 'EMPRESA_NAO_FISCALIZAVEL';
    end if;

    if p_data_inicio_contrato is null then
        return 'SEM_INICIO_CONTRATO';
    end if;

    if p_data_fim_contrato is not null
       and p_data_fim_contrato <
            p_data_inicio_contrato
    then
        return 'VIGENCIA_INVALIDA';
    end if;

    if p_competencia is null then
        return 'VIGENCIA_INVALIDA';
    end if;

    v_competencia_mes :=
        date_trunc(
            'month',
            p_competencia
        )::date;

    v_inicio_mes :=
        date_trunc(
            'month',
            p_data_inicio_contrato
        )::date;

    v_fim_mes :=
        case
            when p_data_fim_contrato is null
                then null
            else
                date_trunc(
                    'month',
                    p_data_fim_contrato
                )::date
        end;

    if v_competencia_mes <
        v_inicio_mes
    then
        return 'ANTES_DO_CONTRATO';
    end if;

    if v_fim_mes is not null
       and v_competencia_mes >
            v_fim_mes
    then
        return 'APOS_DO_CONTRATO';
    end if;

    return 'DURANTE_DO_CONTRATO';
end;
$function$;

comment on function
    public.certidao_mensal_classificar_vigencia_contratual_valores(
        text,
        date,
        date,
        date
    )
is
    'Classifica a competência mensal em relação à vigência contratual sem consultar dados externos.';

revoke all on function
    public.certidao_mensal_classificar_vigencia_contratual_valores(
        text,
        date,
        date,
        date
    )
from public;

grant execute on function
    public.certidao_mensal_classificar_vigencia_contratual_valores(
        text,
        date,
        date,
        date
    )
to authenticated, service_role;

create or replace function
    public.certidao_mensal_validar_vigencia_contratual(
        p_empresa_id uuid,
        p_competencia date,
        p_operacao text default null
    )
returns text
language plpgsql
security definer
set search_path to
    pg_catalog,
    public,
    auth
as $function$
declare
    v_tipo_empresa text;
    v_data_inicio_contrato date;
    v_data_fim_contrato date;
    v_classificacao text;
    v_operacao text :=
        btrim(
            coalesce(
                p_operacao,
                ''
            )
        );
begin
    if p_empresa_id is null then
        raise exception using
            errcode = '22023',
            message = 'A empresa é obrigatória para validar a vigência contratual.';
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

    if auth.uid() is not null
       and not public.certidao_mensal_usuario_pode_acessar_empresa(
            p_empresa_id
       )
    then
        raise exception using
            errcode = '42501',
            message = 'Usuário sem acesso à empresa informada.';
    end if;

    select
        empresa.tipo_empresa,
        empresa.data_inicio_contrato,
        empresa.data_fim_contrato
    into
        v_tipo_empresa,
        v_data_inicio_contrato,
        v_data_fim_contrato
    from public.empresas empresa
    where empresa.id =
        p_empresa_id;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'Empresa não localizada para validar a vigência contratual.';
    end if;

    v_classificacao :=
        public.certidao_mensal_classificar_vigencia_contratual_valores(
            v_tipo_empresa,
            v_data_inicio_contrato,
            v_data_fim_contrato,
            p_competencia
        );

    if v_classificacao =
        'DURANTE_DO_CONTRATO'
    then
        return v_classificacao;
    end if;

    raise exception using
        errcode = '55000',
        message =
            case v_classificacao
                when 'EMPRESA_NAO_FISCALIZAVEL'
                    then 'A Certidão Mensal Documental é exclusiva para empresas terceirizadas ou subcontratadas.'
                when 'SEM_INICIO_CONTRATO'
                    then 'Início do contrato não informado.'
                when 'VIGENCIA_INVALIDA'
                    then 'A vigência contratual informada é inválida.'
                when 'ANTES_DO_CONTRATO'
                    then 'A competência é anterior ao início do contrato.'
                when 'APOS_DO_CONTRATO'
                    then 'A competência é posterior ao fim do contrato.'
                else
                    'A competência não está liberada pela vigência contratual.'
            end ||
            case
                when v_operacao = ''
                    then ''
                else
                    ' Operação bloqueada: ' ||
                    left(
                        v_operacao,
                        120
                    ) ||
                    '.'
            end,
        detail =
            jsonb_build_object(
                'classificacao',
                    v_classificacao,
                'empresaId',
                    p_empresa_id,
                'competencia',
                    p_competencia,
                'tipoEmpresa',
                    v_tipo_empresa,
                'inicioContrato',
                    v_data_inicio_contrato,
                'fimContrato',
                    v_data_fim_contrato
            )::text;
end;
$function$;

comment on function
    public.certidao_mensal_validar_vigencia_contratual(
        uuid,
        date,
        text
    )
is
    'Valida a vigência contratual antes de operações mutáveis da Certidão Mensal Documental.';

revoke all on function
    public.certidao_mensal_validar_vigencia_contratual(
        uuid,
        date,
        text
    )
from public;

grant execute on function
    public.certidao_mensal_validar_vigencia_contratual(
        uuid,
        date,
        text
    )
to authenticated, service_role;

create or replace function
    public.certidao_mensal_proteger_competencia_por_vigencia()
returns trigger
language plpgsql
security definer
set search_path to
    pg_catalog,
    public,
    auth
as $function$
begin
    if tg_op = 'INSERT' then
        perform
            public.certidao_mensal_validar_vigencia_contratual(
                new.empresa_id,
                new.competencia,
                'criar competência'
            );

        return new;
    end if;

    if new.empresa_id is distinct from
        old.empresa_id
       or new.competencia is distinct from
        old.competencia
    then
        perform
            public.certidao_mensal_validar_vigencia_contratual(
                new.empresa_id,
                new.competencia,
                'alterar identificação da competência'
            );

        return new;
    end if;

    if old.status = 'FECHADA'
       and new.status = 'FECHADA'
    then
        return new;
    end if;

    perform
        public.certidao_mensal_validar_vigencia_contratual(
            new.empresa_id,
            new.competencia,
            'alterar competência'
        );

    return new;
end;
$function$;

drop trigger if exists
    certidao_mensal_competencias_vigencia_guard
on public.certidao_mensal_competencias;

create trigger
    certidao_mensal_competencias_vigencia_guard
before insert or update
on public.certidao_mensal_competencias
for each row
execute function
    public.certidao_mensal_proteger_competencia_por_vigencia();

create or replace function
    public.certidao_mensal_proteger_item_por_vigencia()
returns trigger
language plpgsql
security definer
set search_path to
    pg_catalog,
    public,
    auth
as $function$
declare
    v_empresa_id uuid;
    v_competencia date;
    v_status_competencia text;
begin
    select
        competencia.empresa_id,
        competencia.competencia,
        competencia.status
    into
        v_empresa_id,
        v_competencia,
        v_status_competencia
    from public.certidao_mensal_competencias competencia
    where competencia.id =
        new.competencia_id;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'Competência documental não localizada para validar o item.';
    end if;

    if v_status_competencia <>
        'FECHADA'
    then
        perform
            public.certidao_mensal_validar_vigencia_contratual(
                v_empresa_id,
                v_competencia,
                'alterar item documental'
            );
    end if;

    return new;
end;
$function$;

drop trigger if exists
    certidao_mensal_itens_vigencia_guard
on public.certidao_mensal_itens;

create trigger
    certidao_mensal_itens_vigencia_guard
before insert or update
on public.certidao_mensal_itens
for each row
execute function
    public.certidao_mensal_proteger_item_por_vigencia();

create or replace function
    public.certidao_mensal_proteger_versao_por_vigencia()
returns trigger
language plpgsql
security definer
set search_path to
    pg_catalog,
    public,
    auth
as $function$
declare
    v_empresa_id uuid;
    v_competencia date;
    v_status_competencia text;
begin
    select
        competencia.empresa_id,
        competencia.competencia,
        competencia.status
    into
        v_empresa_id,
        v_competencia,
        v_status_competencia
    from public.certidao_mensal_itens item
    join public.certidao_mensal_competencias competencia
      on competencia.id =
            item.competencia_id
    where item.id =
        new.item_id;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'Item documental não localizado para validar a versão.';
    end if;

    if v_status_competencia <>
        'FECHADA'
    then
        perform
            public.certidao_mensal_validar_vigencia_contratual(
                v_empresa_id,
                v_competencia,
                'salvar versão documental'
            );
    end if;

    return new;
end;
$function$;

drop trigger if exists
    certidao_mensal_versoes_vigencia_guard
on public.certidao_mensal_versoes;

create trigger
    certidao_mensal_versoes_vigencia_guard
before insert or update
on public.certidao_mensal_versoes
for each row
execute function
    public.certidao_mensal_proteger_versao_por_vigencia();

create or replace function
    public.certidao_mensal_proteger_envio_por_vigencia()
returns trigger
language plpgsql
security definer
set search_path to
    pg_catalog,
    public,
    auth
as $function$
declare
    v_empresa_id uuid;
    v_competencia date;
begin
    select
        competencia.empresa_id,
        competencia.competencia
    into
        v_empresa_id,
        v_competencia
    from public.certidao_mensal_competencias competencia
    where competencia.id =
        new.competencia_id;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'Competência documental não localizada para validar o envio.';
    end if;

    if new.empresa_id is distinct from
        v_empresa_id
    then
        raise exception using
            errcode = '23514',
            message = 'A empresa do envio não corresponde à competência informada.';
    end if;

    perform
        public.certidao_mensal_validar_vigencia_contratual(
            v_empresa_id,
            v_competencia,
            'criar envio de cobrança'
        );

    return new;
end;
$function$;

drop trigger if exists
    certidao_mensal_envios_vigencia_guard
on public.certidao_mensal_envios;

create trigger
    certidao_mensal_envios_vigencia_guard
before insert
on public.certidao_mensal_envios
for each row
execute function
    public.certidao_mensal_proteger_envio_por_vigencia();

create or replace function
    public.obter_ou_criar_competencia_certidao_mensal(
        p_empresa_id uuid,
        p_competencia date
    )
returns jsonb
language plpgsql
set search_path to
    pg_catalog,
    public,
    auth
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

    select
        competencia_record.*
    into
        v_competencia
    from public.certidao_mensal_competencias
        competencia_record
    where competencia_record.empresa_id =
            p_empresa_id
      and competencia_record.competencia =
            p_competencia;

    if found then
        if v_competencia.status <>
            'FECHADA'
        then
            perform
                public.certidao_mensal_validar_vigencia_contratual(
                    p_empresa_id,
                    p_competencia,
                    'reutilizar competência operacional'
                );
        end if;
    else
        perform
            public.certidao_mensal_validar_vigencia_contratual(
                p_empresa_id,
                p_competencia,
                'criar competência'
            );

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
            from public.certidao_mensal_competencias
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

            if v_competencia.status <>
                'FECHADA'
            then
                perform
                    public.certidao_mensal_validar_vigencia_contratual(
                        p_empresa_id,
                        p_competencia,
                        'reutilizar competência concorrente'
                    );
            end if;
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
                    '1.1',
                'empresaId',
                    v_competencia.empresa_id,
                'competencia',
                    v_competencia.competencia,
                'statusDestino',
                    v_competencia.status,
                'origem',
                    'INICIALIZACAO_EXPLICITA',
                'vigenciaContratual',
                    'DURANTE_DO_CONTRATO'
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

grant execute on function
    public.obter_ou_criar_competencia_certidao_mensal(
        uuid,
        date
    )
to authenticated, service_role;

do $$
declare
    v_total_inconsistencias integer;
begin
    select
        count(*)
    into
        v_total_inconsistencias
    from public.certidao_mensal_competencias competencia
    join public.empresas empresa
      on empresa.id =
            competencia.empresa_id
    where competencia.status <>
            'FECHADA'
      and public.certidao_mensal_classificar_vigencia_contratual_valores(
            empresa.tipo_empresa,
            empresa.data_inicio_contrato,
            empresa.data_fim_contrato,
            competencia.competencia
          ) <>
            'DURANTE_DO_CONTRATO';

    if v_total_inconsistencias > 0 then
        raise exception using
            errcode = '55000',
            message =
                format(
                    'A proteção contratual não foi ativada porque existem %s competência(s) operacional(is) fora da vigência.',
                    v_total_inconsistencias
                );
    end if;
end;
$$;

commit;
