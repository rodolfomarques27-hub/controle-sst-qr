begin;

-- ============================================================
-- E3-IDEMP-1
-- ============================================================

do $$
declare
    v_policies integer;
begin
    if to_regclass('public.certificados_evidencias') is null then
        raise exception 'Tabela public.certificados_evidencias não existe.';
    end if;

    if to_regclass('public.certificados') is null then
        raise exception 'Tabela public.certificados não existe.';
    end if;

    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'certificados_evidencias'
          and column_name = 'arquivo_sha256'
    ) then
        raise exception 'Coluna arquivo_sha256 já existe.';
    end if;

    if to_regclass('public.certificados_evidencias_corrente_sha256_tipo_uidx') is not null then
        raise exception 'Índice SHA-256 já existe.';
    end if;

    if exists (
        select 1
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'registrar_certificado_evidencia_corrente_sha256'
    ) then
        raise exception 'RPC SHA-aware já existe.';
    end if;

    select count(*)
      into v_policies
      from pg_policies
     where schemaname = 'public'
       and tablename = 'certificados_evidencias';

    if v_policies <> 4 then
        raise exception 'Quantidade inesperada de policies em certificados_evidencias: %', v_policies;
    end if;

    if not exists (
        select 1
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'registrar_certificado_evidencia_corrente'
          and p.prosecdef is false
    ) then
        raise exception 'RPC E3R SECURITY INVOKER esperada não localizada.';
    end if;
end;
$$;

alter table public.certificados_evidencias
    add column arquivo_sha256 text null;

comment on column public.certificados_evidencias.arquivo_sha256
is 'SHA-256 hexadecimal lowercase do arquivo físico utilizado para idempotência de novas evidências. Evidências anteriores à E3-IDEMP-1 podem permanecer NULL.';

alter table public.certificados_evidencias
    add constraint certificados_evidencias_arquivo_sha256_chk
    check (
        arquivo_sha256 is null
        or arquivo_sha256 ~ '^[0-9a-f]{64}$'
    );

create unique index certificados_evidencias_corrente_sha256_tipo_uidx
on public.certificados_evidencias (
    colaborador_id,
    treinamento_codigo,
    data_realizacao,
    tipo_evidencia,
    arquivo_sha256
)
where
    historica is false
    and arquivo_sha256 is not null;

create function public.registrar_certificado_evidencia_corrente_sha256(
    p_certificado_origem_id uuid,
    p_colaborador_id uuid,
    p_treinamento_codigo integer,
    p_tipo_evidencia text,
    p_arquivo_url text,
    p_arquivo_sha256 text,
    p_treinamento_id uuid default null,
    p_tipo_treinamento text default null,
    p_nome_treinamento text default null,
    p_data_realizacao date default null,
    p_data_vencimento date default null,
    p_arquivo_nome text default null,
    p_observacao text default null,
    p_status_validacao text default 'Pendente de verificação',
    p_principal boolean default false
)
returns public.certificados_evidencias
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
    v_certificado public.certificados%rowtype;
    v_existente public.certificados_evidencias%rowtype;
    v_resultado public.certificados_evidencias%rowtype;
    v_sha256 text;
    v_tipo_evidencia text;
    v_arquivo_url text;
    v_deve_ser_principal boolean;
begin
    v_sha256 := lower(trim(coalesce(p_arquivo_sha256, '')));
    v_tipo_evidencia := lower(trim(coalesce(p_tipo_evidencia, '')));
    v_arquivo_url := trim(coalesce(p_arquivo_url, ''));

    if p_certificado_origem_id is null then
        raise exception 'certificado_origem_id é obrigatório.';
    end if;

    if p_colaborador_id is null then
        raise exception 'colaborador_id é obrigatório.';
    end if;

    if p_treinamento_codigo is null or p_treinamento_codigo <= 0 then
        raise exception 'treinamento_codigo inválido.';
    end if;

    if p_data_realizacao is null then
        raise exception 'data_realizacao é obrigatória para idempotência SHA-256.';
    end if;

    if v_arquivo_url = '' then
        raise exception 'arquivo_url é obrigatório.';
    end if;

    if v_sha256 !~ '^[0-9a-f]{64}$' then
        raise exception 'arquivo_sha256 deve conter exatamente 64 caracteres hexadecimais.';
    end if;

    if v_tipo_evidencia not in (
        'certificado_individual',
        'lista_presenca',
        'evidencia_complementar'
    ) then
        raise exception 'Tipo de evidência não permitido: %', v_tipo_evidencia;
    end if;

    select c.*
      into v_certificado
      from public.certificados c
     where c.id = p_certificado_origem_id
       and c.colaborador_id = p_colaborador_id
     for update;

    if not found then
        raise exception 'Certificado lógico não localizado para o colaborador informado.';
    end if;

    if v_certificado.treinamento_codigo is distinct from p_treinamento_codigo then
        raise exception 'Treinamento da evidência diverge do certificado lógico.';
    end if;

    if v_certificado.data_realizacao is distinct from p_data_realizacao then
        raise exception 'Data da evidência diverge da realização do certificado lógico.';
    end if;

    select e.*
      into v_existente
      from public.certificados_evidencias e
     where e.historica is false
       and e.colaborador_id = p_colaborador_id
       and e.treinamento_codigo = p_treinamento_codigo
       and e.data_realizacao = p_data_realizacao
       and e.tipo_evidencia = v_tipo_evidencia
       and e.arquivo_sha256 = v_sha256
     order by e.created_at asc, e.id asc
     limit 1
     for update;

    if found then
        if v_existente.certificado_origem_id is distinct from p_certificado_origem_id then
            raise exception 'Fingerprint já está vinculado a outro certificado lógico.';
        end if;

        if coalesce(p_principal, false) and not v_existente.principal then
            update public.certificados_evidencias
               set principal = false,
                   updated_at = now()
             where certificado_origem_id = p_certificado_origem_id
               and historica is false
               and principal is true
               and id <> v_existente.id;

            update public.certificados_evidencias
               set principal = true,
                   updated_at = now()
             where id = v_existente.id
            returning * into v_existente;
        end if;

        return v_existente;
    end if;

    v_deve_ser_principal :=
        coalesce(p_principal, false)
        or not exists (
            select 1
              from public.certificados_evidencias e
             where e.certificado_origem_id = p_certificado_origem_id
               and e.historica is false
               and e.principal is true
        );

    if v_deve_ser_principal then
        update public.certificados_evidencias
           set principal = false,
               updated_at = now()
         where certificado_origem_id = p_certificado_origem_id
           and historica is false
           and principal is true;
    end if;

    insert into public.certificados_evidencias (
        certificado_origem_id,
        certificado_historico_origem_id,
        colaborador_id,
        treinamento_id,
        treinamento_codigo,
        tipo_treinamento,
        nome_treinamento,
        data_realizacao,
        data_vencimento,
        tipo_evidencia,
        arquivo_url,
        arquivo_nome,
        arquivo_sha256,
        arquivo_substituto_url,
        observacao,
        status_validacao,
        principal,
        historica,
        origem,
        origem_legada_tabela,
        origem_legada_id,
        created_by
    )
    values (
        p_certificado_origem_id,
        null,
        p_colaborador_id,
        p_treinamento_id,
        p_treinamento_codigo,
        nullif(trim(coalesce(p_tipo_treinamento, '')), ''),
        nullif(trim(coalesce(p_nome_treinamento, '')), ''),
        p_data_realizacao,
        p_data_vencimento,
        v_tipo_evidencia,
        v_arquivo_url,
        nullif(trim(coalesce(p_arquivo_nome, '')), ''),
        v_sha256,
        null,
        p_observacao,
        coalesce(nullif(trim(coalesce(p_status_validacao, '')), ''), 'Pendente de verificação'),
        v_deve_ser_principal,
        false,
        'upload',
        null,
        null,
        auth.uid()
    )
    returning * into v_resultado;

    return v_resultado;
end;
$$;

revoke execute
on function public.registrar_certificado_evidencia_corrente_sha256(
    uuid, uuid, integer, text, text, text, uuid, text, text,
    date, date, text, text, text, boolean
)
from public;

revoke execute
on function public.registrar_certificado_evidencia_corrente_sha256(
    uuid, uuid, integer, text, text, text, uuid, text, text,
    date, date, text, text, text, boolean
)
from anon;

grant execute
on function public.registrar_certificado_evidencia_corrente_sha256(
    uuid, uuid, integer, text, text, text, uuid, text, text,
    date, date, text, text, text, boolean
)
to authenticated;

grant execute
on function public.registrar_certificado_evidencia_corrente_sha256(
    uuid, uuid, integer, text, text, text, uuid, text, text,
    date, date, text, text, text, boolean
)
to service_role;

do $$
declare
    v_policies integer;
    v_security_definer boolean;
begin
    if not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'certificados_evidencias'
          and column_name = 'arquivo_sha256'
          and is_nullable = 'YES'
    ) then
        raise exception 'Coluna arquivo_sha256 não foi criada como nullable.';
    end if;

    if not exists (
        select 1
        from pg_constraint c
        join pg_class t on t.oid = c.conrelid
        join pg_namespace n on n.oid = t.relnamespace
        where n.nspname = 'public'
          and t.relname = 'certificados_evidencias'
          and c.conname = 'certificados_evidencias_arquivo_sha256_chk'
    ) then
        raise exception 'CHECK arquivo_sha256 não localizado.';
    end if;

    if to_regclass('public.certificados_evidencias_corrente_sha256_tipo_uidx') is null then
        raise exception 'Índice único SHA-256 não foi criado.';
    end if;

    select p.prosecdef
      into v_security_definer
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'registrar_certificado_evidencia_corrente_sha256';

    if not found then
        raise exception 'RPC SHA-aware não foi criada.';
    end if;

    if v_security_definer then
        raise exception 'RPC SHA-aware não pode ser SECURITY DEFINER.';
    end if;

    select count(*)
      into v_policies
      from pg_policies
     where schemaname = 'public'
       and tablename = 'certificados_evidencias';

    if v_policies <> 4 then
        raise exception 'Policies foram alteradas inesperadamente: %', v_policies;
    end if;

    if exists (
        select 1
        from public.certificados_evidencias
        where arquivo_sha256 is not null
    ) then
        raise exception 'Migration não deve executar backfill de arquivo_sha256.';
    end if;

    if not exists (
        select 1
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'registrar_certificado_evidencia_corrente'
          and p.prosecdef is false
    ) then
        raise exception 'RPC E3R anterior deixou de existir ou mudou de segurança.';
    end if;
end;
$$;

notify pgrst, 'reload schema';

commit;