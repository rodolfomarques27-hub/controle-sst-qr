begin;

-- ============================================================
-- SafeScan Brasil
-- M11.6-I2A
--
-- Endurecimento de Storage:
--   1. fotos-colaboradores com gate por colaborador -> empresa;
--   2. acessos-app/* apenas usuario ativo + admin global;
--   3. remocao das leituras anonimas amplas de fotos;
--   4. fotos-colaboradores deixa o helper generico;
--   5. auditoria publica fica somente com token controlado.
--
-- Nenhum arquivo e movido ou excluido.
-- Nenhum frontend ou Edge Function e alterado.
-- ============================================================

do $preflight$
declare
    v_qtd bigint;
    v_public boolean;
    v_policy text;
begin
    -- --------------------------------------------------------
    -- ESTRUTURA
    -- --------------------------------------------------------

    if to_regclass('storage.objects') is null then
        raise exception
            'M11.6-I2A: storage.objects ausente.';
    end if;

    if to_regclass('storage.buckets') is null then
        raise exception
            'M11.6-I2A: storage.buckets ausente.';
    end if;

    if to_regclass('public.colaboradores') is null then
        raise exception
            'M11.6-I2A: public.colaboradores ausente.';
    end if;

    if to_regprocedure(
        'public.usuario_ativo_sistema()'
    ) is null then
        raise exception
            'M11.6-I2A: usuario_ativo_sistema() ausente.';
    end if;

    if to_regprocedure(
        'public.usuario_admin_global()'
    ) is null then
        raise exception
            'M11.6-I2A: usuario_admin_global() ausente.';
    end if;

    if to_regprocedure(
        'public.usuario_tem_acesso_empresa(uuid)'
    ) is null then
        raise exception
            'M11.6-I2A: usuario_tem_acesso_empresa(uuid) ausente.';
    end if;

if to_regprocedure(
        'public.usuario_tem_acesso_foto_colaborador_path(text)'
    ) is not null then
        raise exception
            'M11.6-I2A: helper dedicado de fotos ja existe.';
    end if;

    -- --------------------------------------------------------
    -- BUCKET DE FOTOS DEVE CONTINUAR PRIVADO
    -- --------------------------------------------------------

    select b.public
    into v_public
    from storage.buckets b
    where b.id = 'fotos-colaboradores';

    if v_public is null then
        raise exception
            'M11.6-I2A: bucket fotos-colaboradores ausente.';
    end if;

    if v_public is distinct from false then
        raise exception
            'M11.6-I2A: fotos-colaboradores nao esta privado.';
    end if;

    -- --------------------------------------------------------
    -- NAMESPACES EXISTENTES
    --
    -- Permitidos:
    --   acessos-app/*
    --   {colaborador_uuid}/*
    --
    -- Um UUID legado sem colaborador atual e permitido:
    -- o novo helper apenas falhara fechado para ele.
    -- --------------------------------------------------------

    select count(*)
    into v_qtd
    from storage.objects o
    where o.bucket_id = 'fotos-colaboradores'
      and coalesce(
          (storage.foldername(o.name))[1],
          ''
      ) <> 'acessos-app'
      and coalesce(
          (storage.foldername(o.name))[1],
          ''
      ) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    if v_qtd <> 0 then
        raise exception
            'M11.6-I2A: encontrados % objetos em namespace inesperado de fotos.',
            v_qtd;
    end if;

    -- --------------------------------------------------------
    -- 3 POLICIES SELECT AMPLAS ESPERADAS
    -- --------------------------------------------------------

    select count(*)
    into v_qtd
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
          'Permitir leitura publica fotos colaboradores',
          'fotos_colaboradores_select_anon',
          'fotos_colaboradores_select_authenticated'
      );

    if v_qtd <> 3 then
        raise exception
            'M11.6-I2A: esperado conjunto de 3 SELECTs amplos; encontrado %.',
            v_qtd;
    end if;

    -- --------------------------------------------------------
    -- 4 POLICIES GENERICAS PRIVADAS
    -- --------------------------------------------------------

    select count(*)
    into v_qtd
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
          'sst_storage_select_authenticated_private',
          'sst_storage_insert_authenticated_private',
          'sst_storage_update_authenticated_private',
          'sst_storage_delete_authenticated_private'
      );

    if v_qtd <> 4 then
        raise exception
            'M11.6-I2A: esperado conjunto de 4 policies privadas; encontrado %.',
            v_qtd;
    end if;

    -- As quatro ainda devem conter fotos-colaboradores antes
    -- desta migration.
    select count(*)
    into v_qtd
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
          'sst_storage_select_authenticated_private',
          'sst_storage_insert_authenticated_private',
          'sst_storage_update_authenticated_private',
          'sst_storage_delete_authenticated_private'
      )
      and (
          coalesce(qual, '') ||
          coalesce(with_check, '')
      ) like '%fotos-colaboradores%';

    if v_qtd <> 4 then
        raise exception
            'M11.6-I2A: fotos-colaboradores nao aparece nas 4 policies genericas atuais.';
    end if;

    -- --------------------------------------------------------
    -- AUDITORIA PUBLICA
    -- --------------------------------------------------------

    if not exists (
        select 1
        from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname =
              'sst_storage_insert_anon_auditorias_publicas'
          and cmd = 'INSERT'
    ) then
        raise exception
            'M11.6-I2A: policy anonima ampla de auditoria nao localizada.';
    end if;

    select with_check
    into v_policy
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname =
          'upload_publico_controlado_auditorias_campo'
      and cmd = 'INSERT';

    if v_policy is null then
        raise exception
            'M11.6-I2A: policy controlada de auditoria ausente.';
    end if;

    if position(
        'auditoria_tokens_publicos'
        in v_policy
    ) = 0 then
        raise exception
            'M11.6-I2A: policy controlada nao referencia token persistido.';
    end if;

    if position(
        'data_expiracao'
        in v_policy
    ) = 0 then
        raise exception
            'M11.6-I2A: policy controlada nao valida expiracao.';
    end if;

    -- --------------------------------------------------------
    -- NOVAS POLICIES NAO PODEM EXISTIR AINDA
    -- --------------------------------------------------------

    select count(*)
    into v_qtd
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
          'fotos_colaboradores_select_authenticated_scoped',
          'fotos_colaboradores_insert_authenticated_scoped',
          'fotos_colaboradores_update_authenticated_scoped',
          'fotos_colaboradores_delete_authenticated_scoped'
      );

    if v_qtd <> 0 then
        raise exception
            'M11.6-I2A: policy dedicada de fotos ja existe.';
    end if;
end
$preflight$;

-- ============================================================
-- HELPER DEDICADO PARA fotos-colaboradores
-- ============================================================

create or replace function
    public.usuario_tem_acesso_foto_colaborador_path(
        p_name text
    )
returns boolean
language plpgsql
stable
security definer
set search_path = public, storage
as $function$
declare
    v_primeiro_segmento text;
    v_colaborador_id uuid;
begin
    if nullif(
        btrim(p_name),
        ''
    ) is null then
        return false;
    end if;

    v_primeiro_segmento :=
        (storage.foldername(p_name))[1];

    -- Namespace especial:
    -- somente usuario ativo + administrador global.
    if v_primeiro_segmento = 'acessos-app' then
        return
            public.usuario_ativo_sistema()
            and public.usuario_admin_global();
    end if;

    -- Namespace normal:
    -- primeiro segmento = colaborador_id UUID canonico.
    if coalesce(
        v_primeiro_segmento,
        ''
    ) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then
        return false;
    end if;

    v_colaborador_id :=
        v_primeiro_segmento::uuid;

    return
        public.usuario_ativo_sistema()
        and exists (
            select 1
            from public.colaboradores c
            where c.id = v_colaborador_id
              and c.empresa_id is not null
              and public.usuario_tem_acesso_empresa(
                  c.empresa_id
              )
        );
end;
$function$;

revoke all
on function
    public.usuario_tem_acesso_foto_colaborador_path(text)
from public;

revoke all
on function
    public.usuario_tem_acesso_foto_colaborador_path(text)
from anon;

revoke all
on function
    public.usuario_tem_acesso_foto_colaborador_path(text)
from authenticated;

grant execute
on function
    public.usuario_tem_acesso_foto_colaborador_path(text)
to authenticated;

grant execute
on function
    public.usuario_tem_acesso_foto_colaborador_path(text)
to service_role;

comment on function
    public.usuario_tem_acesso_foto_colaborador_path(text)
is
    'M11.6-I2A: resolve fotos-colaboradores por colaborador->empresa; acessos-app exige usuario ativo e admin global.';

-- ============================================================
-- RETIRAR fotos-colaboradores DAS POLICIES GENERICAS
--
-- Os quatro buckets restantes conservam exatamente o gate
-- anterior: admin global OU usuario_tem_acesso_storage_path.
-- ============================================================

alter policy
    sst_storage_select_authenticated_private
on storage.objects
using (
    (
        bucket_id = any (
            array[
                'auditorias-campo'::text,
                'certificados-treinamentos'::text,
                'documentos-empresas'::text,
                'contratos-empresas'::text
            ]
        )
    )
    and (
        public.usuario_admin_global()
        or public.usuario_tem_acesso_storage_path(name)
    )
);

alter policy
    sst_storage_insert_authenticated_private
on storage.objects
with check (
    (
        bucket_id = any (
            array[
                'auditorias-campo'::text,
                'certificados-treinamentos'::text,
                'documentos-empresas'::text,
                'contratos-empresas'::text
            ]
        )
    )
    and (
        public.usuario_admin_global()
        or public.usuario_tem_acesso_storage_path(name)
    )
);

alter policy
    sst_storage_update_authenticated_private
on storage.objects
using (
    (
        bucket_id = any (
            array[
                'auditorias-campo'::text,
                'certificados-treinamentos'::text,
                'documentos-empresas'::text,
                'contratos-empresas'::text
            ]
        )
    )
    and (
        public.usuario_admin_global()
        or public.usuario_tem_acesso_storage_path(name)
    )
)
with check (
    (
        bucket_id = any (
            array[
                'auditorias-campo'::text,
                'certificados-treinamentos'::text,
                'documentos-empresas'::text,
                'contratos-empresas'::text
            ]
        )
    )
    and (
        public.usuario_admin_global()
        or public.usuario_tem_acesso_storage_path(name)
    )
);

alter policy
    sst_storage_delete_authenticated_private
on storage.objects
using (
    (
        bucket_id = any (
            array[
                'auditorias-campo'::text,
                'certificados-treinamentos'::text,
                'documentos-empresas'::text,
                'contratos-empresas'::text
            ]
        )
    )
    and (
        public.usuario_admin_global()
        or public.usuario_tem_acesso_storage_path(name)
    )
);

-- ============================================================
-- REMOVER SELECTS AMPLOS DE fotos-colaboradores
-- ============================================================

drop policy
    "Permitir leitura publica fotos colaboradores"
on storage.objects;

drop policy
    fotos_colaboradores_select_anon
on storage.objects;

drop policy
    fotos_colaboradores_select_authenticated
on storage.objects;

-- ============================================================
-- POLICIES DEDICADAS DE fotos-colaboradores
-- ============================================================

create policy
    fotos_colaboradores_select_authenticated_scoped
on storage.objects
for select
to authenticated
using (
    bucket_id = 'fotos-colaboradores'
    and public.usuario_tem_acesso_foto_colaborador_path(
        name
    )
);

create policy
    fotos_colaboradores_insert_authenticated_scoped
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'fotos-colaboradores'
    and public.usuario_tem_acesso_foto_colaborador_path(
        name
    )
);

create policy
    fotos_colaboradores_update_authenticated_scoped
on storage.objects
for update
to authenticated
using (
    bucket_id = 'fotos-colaboradores'
    and public.usuario_tem_acesso_foto_colaborador_path(
        name
    )
)
with check (
    bucket_id = 'fotos-colaboradores'
    and public.usuario_tem_acesso_foto_colaborador_path(
        name
    )
);

create policy
    fotos_colaboradores_delete_authenticated_scoped
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'fotos-colaboradores'
    and public.usuario_tem_acesso_foto_colaborador_path(
        name
    )
);

-- ============================================================
-- AUDITORIAS PUBLICAS
--
-- Remove somente a regra ampla.
-- upload_publico_controlado_auditorias_campo permanece intacta.
-- ============================================================

drop policy
    sst_storage_insert_anon_auditorias_publicas
on storage.objects;

-- ============================================================
-- POS-CHECK
-- ============================================================

do $poscheck$
declare
    v_qtd bigint;
    v_public boolean;
    v_policy text;
begin
    -- Bucket continua privado.
    select b.public
    into v_public
    from storage.buckets b
    where b.id = 'fotos-colaboradores';

    if v_public is distinct from false then
        raise exception
            'M11.6-I2A: bucket de fotos deixou de ser privado.';
    end if;

    -- Helper existe.
    if to_regprocedure(
        'public.usuario_tem_acesso_foto_colaborador_path(text)'
    ) is null then
        raise exception
            'M11.6-I2A: helper dedicado nao foi criado.';
    end if;

    -- Anon nao pode executar helper.
    if has_function_privilege(
        'anon',
        'public.usuario_tem_acesso_foto_colaborador_path(text)',
        'EXECUTE'
    ) then
        raise exception
            'M11.6-I2A: anon recebeu EXECUTE no helper.';
    end if;

    if not has_function_privilege(
        'authenticated',
        'public.usuario_tem_acesso_foto_colaborador_path(text)',
        'EXECUTE'
    ) then
        raise exception
            'M11.6-I2A: authenticated sem EXECUTE no helper.';
    end if;

    -- Policies amplas antigas devem sumir.
    select count(*)
    into v_qtd
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
          'Permitir leitura publica fotos colaboradores',
          'fotos_colaboradores_select_anon',
          'fotos_colaboradores_select_authenticated'
      );

    if v_qtd <> 0 then
        raise exception
            'M11.6-I2A: SELECT amplo antigo de fotos permaneceu.';
    end if;

    -- Nenhuma policy anon pode conceder leitura ao bucket.
    if exists (
        select 1
        from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and cmd = 'SELECT'
          and 'anon' = any(roles)
          and (
              coalesce(qual, '') ||
              coalesce(with_check, '')
          ) like '%fotos-colaboradores%'
    ) then
        raise exception
            'M11.6-I2A: leitura anonima de fotos ainda localizada.';
    end if;

    -- Exatamente 4 policies dedicadas.
    select count(*)
    into v_qtd
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
          'fotos_colaboradores_select_authenticated_scoped',
          'fotos_colaboradores_insert_authenticated_scoped',
          'fotos_colaboradores_update_authenticated_scoped',
          'fotos_colaboradores_delete_authenticated_scoped'
      );

    if v_qtd <> 4 then
        raise exception
            'M11.6-I2A: esperado 4 policies dedicadas; encontrado %.',
            v_qtd;
    end if;

    -- Todas as 4 devem usar o helper dedicado.
    select count(*)
    into v_qtd
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
          'fotos_colaboradores_select_authenticated_scoped',
          'fotos_colaboradores_insert_authenticated_scoped',
          'fotos_colaboradores_update_authenticated_scoped',
          'fotos_colaboradores_delete_authenticated_scoped'
      )
      and (
          coalesce(qual, '') ||
          coalesce(with_check, '')
      ) like
          '%usuario_tem_acesso_foto_colaborador_path%';

    if v_qtd <> 4 then
        raise exception
            'M11.6-I2A: policy dedicada sem helper localizada.';
    end if;

    -- Generic private continua com 4 policies,
    -- sem fotos-colaboradores.
    select count(*)
    into v_qtd
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
          'sst_storage_select_authenticated_private',
          'sst_storage_insert_authenticated_private',
          'sst_storage_update_authenticated_private',
          'sst_storage_delete_authenticated_private'
      );

    if v_qtd <> 4 then
        raise exception
            'M11.6-I2A: conjunto generico deixou de ter 4 policies.';
    end if;

    if exists (
        select 1
        from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname in (
              'sst_storage_select_authenticated_private',
              'sst_storage_insert_authenticated_private',
              'sst_storage_update_authenticated_private',
              'sst_storage_delete_authenticated_private'
          )
          and (
              coalesce(qual, '') ||
              coalesce(with_check, '')
          ) like '%fotos-colaboradores%'
    ) then
        raise exception
            'M11.6-I2A: fotos-colaboradores permaneceu na policy generica.';
    end if;

    -- Os quatro buckets anteriores restantes devem continuar
    -- contemplados nas quatro policies genericas.
    select count(*)
    into v_qtd
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
          'sst_storage_select_authenticated_private',
          'sst_storage_insert_authenticated_private',
          'sst_storage_update_authenticated_private',
          'sst_storage_delete_authenticated_private'
      )
      and (
          coalesce(qual, '') ||
          coalesce(with_check, '')
      ) like '%auditorias-campo%'
      and (
          coalesce(qual, '') ||
          coalesce(with_check, '')
      ) like '%certificados-treinamentos%'
      and (
          coalesce(qual, '') ||
          coalesce(with_check, '')
      ) like '%documentos-empresas%'
      and (
          coalesce(qual, '') ||
          coalesce(with_check, '')
      ) like '%contratos-empresas%';

    if v_qtd <> 4 then
        raise exception
            'M11.6-I2A: bucket anterior foi perdido da policy generica.';
    end if;

    -- A policy ampla anonima da auditoria deve sumir.
    if exists (
        select 1
        from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname =
              'sst_storage_insert_anon_auditorias_publicas'
    ) then
        raise exception
            'M11.6-I2A: policy anonima ampla de auditoria permaneceu.';
    end if;

    -- A policy controlada por token deve continuar intacta
    -- em seus elementos de segurança essenciais.
    select with_check
    into v_policy
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname =
          'upload_publico_controlado_auditorias_campo'
      and cmd = 'INSERT'
      and 'anon' = any(roles);

    if v_policy is null then
        raise exception
            'M11.6-I2A: policy controlada de auditoria desapareceu.';
    end if;

    if position(
        'auditoria_tokens_publicos'
        in v_policy
    ) = 0 then
        raise exception
            'M11.6-I2A: policy controlada perdeu o gate de token.';
    end if;

    if position(
        'ativo'
        in v_policy
    ) = 0 then
        raise exception
            'M11.6-I2A: policy controlada perdeu o gate ativo.';
    end if;

    if position(
        'data_expiracao'
        in v_policy
    ) = 0 then
        raise exception
            'M11.6-I2A: policy controlada perdeu expiracao.';
    end if;

    -- Continua sem namespace estranho no bucket de fotos.
    select count(*)
    into v_qtd
    from storage.objects o
    where o.bucket_id = 'fotos-colaboradores'
      and coalesce(
          (storage.foldername(o.name))[1],
          ''
      ) <> 'acessos-app'
      and coalesce(
          (storage.foldername(o.name))[1],
          ''
      ) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    if v_qtd <> 0 then
        raise exception
            'M11.6-I2A: namespace inesperado localizado no pos-check.';
    end if;
end
$poscheck$;

commit;
