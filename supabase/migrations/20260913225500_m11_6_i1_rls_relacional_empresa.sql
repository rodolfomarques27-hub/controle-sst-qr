begin;

-- ============================================================
-- SafeScan Brasil
-- M11.6-I1
--
-- Endurecimento relacional antes do segundo tenant.
--
-- Escopo:
--   documentos_empresas
--   emails_enviados
--   empresas_obras
--   obras_empresas
--   verificacoes_documentais
--
-- Regra:
--   usuario ativo
--   +
--   usuario_tem_acesso_empresa(empresa_id)
--
-- A semantica de usuario_tem_acesso_empresa() nao e alterada.
-- ============================================================

do $preflight$
declare
    v_tabela text;
    v_qtd bigint;
    v_rls boolean;
begin
    if to_regprocedure(
        'public.usuario_ativo_sistema()'
    ) is null then
        raise exception
            'M11.6-I1: usuario_ativo_sistema() ausente.';
    end if;

    if to_regprocedure(
        'public.usuario_tem_acesso_empresa(uuid)'
    ) is null then
        raise exception
            'M11.6-I1: usuario_tem_acesso_empresa(uuid) ausente.';
    end if;

    foreach v_tabela in array array[
        'documentos_empresas',
        'emails_enviados',
        'empresas_obras',
        'obras_empresas',
        'verificacoes_documentais'
    ]
    loop
        if to_regclass(
            format(
                'public.%I',
                v_tabela
            )
        ) is null then
            raise exception
                'M11.6-I1: tabela public.% ausente.',
                v_tabela;
        end if;

        select c.relrowsecurity
        into v_rls
        from pg_class c
        where c.oid = to_regclass(
            format(
                'public.%I',
                v_tabela
            )
        );

        if v_rls is distinct from true then
            raise exception
                'M11.6-I1: RLS nao esta habilitado em public.%.',
                v_tabela;
        end if;

        if not exists (
            select 1
            from information_schema.columns
            where table_schema = 'public'
              and table_name = v_tabela
              and column_name = 'empresa_id'
              and data_type = 'uuid'
        ) then
            raise exception
                'M11.6-I1: public.%.empresa_id uuid ausente.',
                v_tabela;
        end if;

        execute format(
            'select count(*) from public.%I where empresa_id is null',
            v_tabela
        )
        into v_qtd;

        if v_qtd <> 0 then
            raise exception
                'M11.6-I1: public.% possui % registros sem empresa_id.',
                v_tabela,
                v_qtd;
        end if;
    end loop;

    select count(*)
    into v_qtd
    from pg_policies
    where schemaname = 'public'
      and tablename in (
          'documentos_empresas',
          'emails_enviados',
          'empresas_obras',
          'obras_empresas',
          'verificacoes_documentais'
      );

    if v_qtd <> 19 then
        raise exception
            'M11.6-I1: esperado exatamente 19 policies nas cinco tabelas; encontrado %.',
            v_qtd;
    end if;

    select count(*)
    into v_qtd
    from pg_policies
    where schemaname = 'public'
      and (
          (
              tablename = 'documentos_empresas'
              and policyname in (
                  'usuarios logados podem consultar documentos empresas',
                  'usuarios ativos podem cadastrar documentos empresas',
                  'usuarios ativos podem atualizar documentos empresas',
                  'usuarios ativos podem excluir documentos empresas'
              )
          )
          or
          (
              tablename = 'emails_enviados'
              and policyname in (
                  'emails_enviados_select_authenticated',
                  'emails_enviados_insert_usuarios_ativos',
                  'emails_enviados_update_usuarios_ativos'
              )
          )
          or
          (
              tablename = 'empresas_obras'
              and policyname in (
                  'empresas_obras_select_authenticated',
                  'empresas_obras_insert_usuarios_ativos',
                  'empresas_obras_update_usuarios_ativos',
                  'empresas_obras_delete_usuarios_ativos'
              )
          )
          or
          (
              tablename = 'obras_empresas'
              and policyname in (
                  'obras_empresas_select_authenticated',
                  'obras_empresas_insert_authenticated',
                  'obras_empresas_update_authenticated',
                  'obras_empresas_delete_authenticated'
              )
          )
          or
          (
              tablename = 'verificacoes_documentais'
              and policyname in (
                  'usuarios logados podem consultar verificacoes documentais',
                  'usuarios ativos podem cadastrar verificacoes documentais',
                  'usuarios ativos podem atualizar verificacoes documentais',
                  'usuarios ativos podem excluir verificacoes documentais'
              )
          )
      );

    if v_qtd <> 19 then
        raise exception
            'M11.6-I1: conjunto de policies atuais divergiu; encontrado % de 19.',
            v_qtd;
    end if;
end
$preflight$;

-- ============================================================
-- documentos_empresas
-- ============================================================

drop policy if exists
    "usuarios logados podem consultar documentos empresas"
on public.documentos_empresas;

create policy
    "usuarios logados podem consultar documentos empresas"
on public.documentos_empresas
for select
to authenticated
using (
    (select public.usuario_ativo_sistema())
    and public.usuario_tem_acesso_empresa(empresa_id)
);

drop policy if exists
    "usuarios ativos podem cadastrar documentos empresas"
on public.documentos_empresas;

create policy
    "usuarios ativos podem cadastrar documentos empresas"
on public.documentos_empresas
for insert
to authenticated
with check (
    (select public.usuario_ativo_sistema())
    and public.usuario_tem_acesso_empresa(empresa_id)
);

drop policy if exists
    "usuarios ativos podem atualizar documentos empresas"
on public.documentos_empresas;

create policy
    "usuarios ativos podem atualizar documentos empresas"
on public.documentos_empresas
for update
to authenticated
using (
    (select public.usuario_ativo_sistema())
    and public.usuario_tem_acesso_empresa(empresa_id)
)
with check (
    (select public.usuario_ativo_sistema())
    and public.usuario_tem_acesso_empresa(empresa_id)
);

drop policy if exists
    "usuarios ativos podem excluir documentos empresas"
on public.documentos_empresas;

create policy
    "usuarios ativos podem excluir documentos empresas"
on public.documentos_empresas
for delete
to authenticated
using (
    (select public.usuario_ativo_sistema())
    and public.usuario_tem_acesso_empresa(empresa_id)
);

-- ============================================================
-- emails_enviados
-- ============================================================

drop policy if exists
    emails_enviados_select_authenticated
on public.emails_enviados;

create policy
    emails_enviados_select_authenticated
on public.emails_enviados
for select
to authenticated
using (
    (select public.usuario_ativo_sistema())
    and public.usuario_tem_acesso_empresa(empresa_id)
);

drop policy if exists
    emails_enviados_insert_usuarios_ativos
on public.emails_enviados;

create policy
    emails_enviados_insert_usuarios_ativos
on public.emails_enviados
for insert
to authenticated
with check (
    (select public.usuario_ativo_sistema())
    and public.usuario_tem_acesso_empresa(empresa_id)
);

drop policy if exists
    emails_enviados_update_usuarios_ativos
on public.emails_enviados;

create policy
    emails_enviados_update_usuarios_ativos
on public.emails_enviados
for update
to authenticated
using (
    (select public.usuario_ativo_sistema())
    and public.usuario_tem_acesso_empresa(empresa_id)
)
with check (
    (select public.usuario_ativo_sistema())
    and public.usuario_tem_acesso_empresa(empresa_id)
);

-- ============================================================
-- empresas_obras
-- ============================================================

drop policy if exists
    empresas_obras_select_authenticated
on public.empresas_obras;

create policy
    empresas_obras_select_authenticated
on public.empresas_obras
for select
to authenticated
using (
    (select public.usuario_ativo_sistema())
    and public.usuario_tem_acesso_empresa(empresa_id)
);

drop policy if exists
    empresas_obras_insert_usuarios_ativos
on public.empresas_obras;

create policy
    empresas_obras_insert_usuarios_ativos
on public.empresas_obras
for insert
to authenticated
with check (
    (select public.usuario_ativo_sistema())
    and public.usuario_tem_acesso_empresa(empresa_id)
);

drop policy if exists
    empresas_obras_update_usuarios_ativos
on public.empresas_obras;

create policy
    empresas_obras_update_usuarios_ativos
on public.empresas_obras
for update
to authenticated
using (
    (select public.usuario_ativo_sistema())
    and public.usuario_tem_acesso_empresa(empresa_id)
)
with check (
    (select public.usuario_ativo_sistema())
    and public.usuario_tem_acesso_empresa(empresa_id)
);

drop policy if exists
    empresas_obras_delete_usuarios_ativos
on public.empresas_obras;

create policy
    empresas_obras_delete_usuarios_ativos
on public.empresas_obras
for delete
to authenticated
using (
    (select public.usuario_ativo_sistema())
    and public.usuario_tem_acesso_empresa(empresa_id)
);

-- ============================================================
-- obras_empresas
-- ============================================================

drop policy if exists
    obras_empresas_select_authenticated
on public.obras_empresas;

create policy
    obras_empresas_select_authenticated
on public.obras_empresas
for select
to authenticated
using (
    (select public.usuario_ativo_sistema())
    and public.usuario_tem_acesso_empresa(empresa_id)
);

drop policy if exists
    obras_empresas_insert_authenticated
on public.obras_empresas;

create policy
    obras_empresas_insert_authenticated
on public.obras_empresas
for insert
to authenticated
with check (
    (select public.usuario_ativo_sistema())
    and public.usuario_tem_acesso_empresa(empresa_id)
);

drop policy if exists
    obras_empresas_update_authenticated
on public.obras_empresas;

create policy
    obras_empresas_update_authenticated
on public.obras_empresas
for update
to authenticated
using (
    (select public.usuario_ativo_sistema())
    and public.usuario_tem_acesso_empresa(empresa_id)
)
with check (
    (select public.usuario_ativo_sistema())
    and public.usuario_tem_acesso_empresa(empresa_id)
);

drop policy if exists
    obras_empresas_delete_authenticated
on public.obras_empresas;

create policy
    obras_empresas_delete_authenticated
on public.obras_empresas
for delete
to authenticated
using (
    (select public.usuario_ativo_sistema())
    and public.usuario_tem_acesso_empresa(empresa_id)
);

-- ============================================================
-- verificacoes_documentais
-- ============================================================

drop policy if exists
    "usuarios logados podem consultar verificacoes documentais"
on public.verificacoes_documentais;

create policy
    "usuarios logados podem consultar verificacoes documentais"
on public.verificacoes_documentais
for select
to authenticated
using (
    (select public.usuario_ativo_sistema())
    and public.usuario_tem_acesso_empresa(empresa_id)
);

drop policy if exists
    "usuarios ativos podem cadastrar verificacoes documentais"
on public.verificacoes_documentais;

create policy
    "usuarios ativos podem cadastrar verificacoes documentais"
on public.verificacoes_documentais
for insert
to authenticated
with check (
    (select public.usuario_ativo_sistema())
    and public.usuario_tem_acesso_empresa(empresa_id)
);

drop policy if exists
    "usuarios ativos podem atualizar verificacoes documentais"
on public.verificacoes_documentais;

create policy
    "usuarios ativos podem atualizar verificacoes documentais"
on public.verificacoes_documentais
for update
to authenticated
using (
    (select public.usuario_ativo_sistema())
    and public.usuario_tem_acesso_empresa(empresa_id)
)
with check (
    (select public.usuario_ativo_sistema())
    and public.usuario_tem_acesso_empresa(empresa_id)
);

drop policy if exists
    "usuarios ativos podem excluir verificacoes documentais"
on public.verificacoes_documentais;

create policy
    "usuarios ativos podem excluir verificacoes documentais"
on public.verificacoes_documentais
for delete
to authenticated
using (
    (select public.usuario_ativo_sistema())
    and public.usuario_tem_acesso_empresa(empresa_id)
);

-- ============================================================
-- POS-CHECK
-- ============================================================

do $poscheck$
declare
    v_qtd bigint;
begin
    select count(*)
    into v_qtd
    from pg_policies
    where schemaname = 'public'
      and tablename in (
          'documentos_empresas',
          'emails_enviados',
          'empresas_obras',
          'obras_empresas',
          'verificacoes_documentais'
      );

    if v_qtd <> 19 then
        raise exception
            'M11.6-I1: total de policies pos-migration divergente: %.',
            v_qtd;
    end if;

    if exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename in (
              'documentos_empresas',
              'emails_enviados',
              'empresas_obras',
              'obras_empresas',
              'verificacoes_documentais'
          )
          and (
              coalesce(qual, '') = 'true'
              or coalesce(with_check, '') = 'true'
          )
    ) then
        raise exception
            'M11.6-I1: policy ampla true ainda localizada.';
    end if;

    if exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename in (
              'documentos_empresas',
              'emails_enviados',
              'empresas_obras',
              'obras_empresas',
              'verificacoes_documentais'
          )
          and cmd in (
              'SELECT',
              'UPDATE',
              'DELETE'
          )
          and (
              coalesce(qual, '')
                  not like '%usuario_ativo_sistema%'
              or
              coalesce(qual, '')
                  not like '%usuario_tem_acesso_empresa%'
          )
    ) then
        raise exception
            'M11.6-I1: USING sem os dois gates obrigatorios.';
    end if;

    if exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename in (
              'documentos_empresas',
              'emails_enviados',
              'empresas_obras',
              'obras_empresas',
              'verificacoes_documentais'
          )
          and cmd in (
              'INSERT',
              'UPDATE'
          )
          and (
              coalesce(with_check, '')
                  not like '%usuario_ativo_sistema%'
              or
              coalesce(with_check, '')
                  not like '%usuario_tem_acesso_empresa%'
          )
    ) then
        raise exception
            'M11.6-I1: WITH CHECK sem os dois gates obrigatorios.';
    end if;
end
$poscheck$;

commit;
