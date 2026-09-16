-- SafeScan Brasil
-- M11.6-I3B
-- Remocao dos fallbacks legados de escopo das policies.
--
-- Objetivo:
--   - remover o bypass baseado em usuario_tem_escopo_empresa_atribuido();
--   - manter as mesmas 18 policies, comandos, roles e modo permissivo;
--   - fazer as policies dependerem dos gates tenant-aware aprovados na I3A;
--   - nao remover a funcao legada nesta etapa;
--   - nao alterar grants, tabelas, dados, Storage ou status de tenant.
--
-- Importante:
--   empresas.tenant_id ainda tera hardening proprio na I3C.
--   Esta migration nao resolve reassociacao de tenant via UPDATE.

begin;

-- =============================================================
-- PREFLIGHT I3B
-- =============================================================

do $preflight$
declare
    v_fallbacks_afetados bigint;
    v_fallbacks_globais bigint;
    v_total_policies bigint;
    v_expected_found bigint;
    v_ativos_sem_empresa_nao_globais bigint;
    v_tenants_ativos bigint;
    v_empresas_sem_tenant bigint;
    v_registros_sem_empresa bigint;
begin
    if to_regprocedure(
        'public.usuario_ativo_sistema()'
    ) is null then
        raise exception
            'M11.6-I3B: usuario_ativo_sistema() ausente.';
    end if;

    if to_regprocedure(
        'public.usuario_tem_acesso_empresa(uuid)'
    ) is null then
        raise exception
            'M11.6-I3B: usuario_tem_acesso_empresa(uuid) ausente.';
    end if;

    if to_regprocedure(
        'public.usuario_tem_acesso_tenant(uuid)'
    ) is null then
        raise exception
            'M11.6-I3B: usuario_tem_acesso_tenant(uuid) ausente.';
    end if;

    if to_regclass('public.colaboradores') is null
       or to_regclass('public.colaboradores_condicoes_temporarias') is null
       or to_regclass('public.colaboradores_movimentacoes') is null
       or to_regclass('public.colaboradores_qr_impressoes') is null
       or to_regclass('public.dds_registros') is null
       or to_regclass('public.empresas') is null
       or to_regclass('public.empresas_cnpjs') is null then
        raise exception
            'M11.6-I3B: uma ou mais tabelas esperadas estao ausentes.';
    end if;

    select count(*)
    into v_fallbacks_afetados
    from pg_policies
    where schemaname = 'public'
      and tablename in (
          'colaboradores',
          'colaboradores_condicoes_temporarias',
          'colaboradores_movimentacoes',
          'colaboradores_qr_impressoes',
          'dds_registros',
          'empresas',
          'empresas_cnpjs'
      )
      and (
          coalesce(qual, '') ilike
              '%usuario_tem_escopo_empresa_atribuido%'
          or
          coalesce(with_check, '') ilike
              '%usuario_tem_escopo_empresa_atribuido%'
      );

    if v_fallbacks_afetados <> 18 then
        raise exception
            'M11.6-I3B: esperado 18 fallbacks nas tabelas alvo; encontrados %.',
            v_fallbacks_afetados;
    end if;

    select count(*)
    into v_fallbacks_globais
    from pg_policies
    where schemaname = 'public'
      and (
          coalesce(qual, '') ilike
              '%usuario_tem_escopo_empresa_atribuido%'
          or
          coalesce(with_check, '') ilike
              '%usuario_tem_escopo_empresa_atribuido%'
      );

    if v_fallbacks_globais <> 18 then
        raise exception
            'M11.6-I3B: esperado 18 fallbacks globais; encontrados %.',
            v_fallbacks_globais;
    end if;

    select count(*)
    into v_total_policies
    from pg_policies
    where schemaname = 'public'
      and tablename in (
          'colaboradores',
          'colaboradores_condicoes_temporarias',
          'colaboradores_movimentacoes',
          'colaboradores_qr_impressoes',
          'dds_registros',
          'empresas',
          'empresas_cnpjs'
      );

    if v_total_policies <> 18 then
        raise exception
            'M11.6-I3B: esperado exatamente 18 policies nas 7 tabelas; encontradas %.',
            v_total_policies;
    end if;

    with expected(
        tablename,
        policyname,
        cmd
    ) as (
        values
            (
                'colaboradores',
                'colaboradores_delete_usuarios_ativos',
                'DELETE'
            ),
            (
                'colaboradores',
                'colaboradores_insert_usuarios_ativos',
                'INSERT'
            ),
            (
                'colaboradores',
                'colaboradores_select_usuarios_ativos',
                'SELECT'
            ),
            (
                'colaboradores',
                'colaboradores_update_usuarios_ativos',
                'UPDATE'
            ),
            (
                'colaboradores_condicoes_temporarias',
                'colaboradores_cond_temp_select_usuarios_ativos',
                'SELECT'
            ),
            (
                'colaboradores_movimentacoes',
                'colaboradores_movimentacoes_select_usuarios_ativos',
                'SELECT'
            ),
            (
                'colaboradores_qr_impressoes',
                'colaboradores_qr_impressoes_select_usuarios_ativos',
                'SELECT'
            ),
            (
                'dds_registros',
                'dds_registros_delete_usuarios_ativos',
                'DELETE'
            ),
            (
                'dds_registros',
                'dds_registros_insert_usuarios_ativos',
                'INSERT'
            ),
            (
                'dds_registros',
                'dds_registros_select_usuarios_ativos',
                'SELECT'
            ),
            (
                'dds_registros',
                'dds_registros_update_usuarios_ativos',
                'UPDATE'
            ),
            (
                'empresas',
                'empresas_insert_usuarios_ativos',
                'INSERT'
            ),
            (
                'empresas',
                'empresas_select_usuarios_ativos',
                'SELECT'
            ),
            (
                'empresas',
                'empresas_update_usuarios_ativos',
                'UPDATE'
            ),
            (
                'empresas_cnpjs',
                'empresas_cnpjs_delete_usuarios_ativos',
                'DELETE'
            ),
            (
                'empresas_cnpjs',
                'empresas_cnpjs_insert_usuarios_ativos',
                'INSERT'
            ),
            (
                'empresas_cnpjs',
                'empresas_cnpjs_select_usuarios_ativos',
                'SELECT'
            ),
            (
                'empresas_cnpjs',
                'empresas_cnpjs_update_usuarios_ativos',
                'UPDATE'
            )
    )
    select count(*)
    into v_expected_found
    from expected e
    join pg_policies p
      on p.schemaname = 'public'
     and p.tablename = e.tablename
     and p.policyname = e.policyname
     and p.cmd = e.cmd
     and p.permissive = 'PERMISSIVE'
     and p.roles::text = '{authenticated}';

    if v_expected_found <> 18 then
        raise exception
            'M11.6-I3B: conjunto de policies divergente; esperadas 18, validadas %.',
            v_expected_found;
    end if;

    select count(*)
    into v_ativos_sem_empresa_nao_globais
    from public.usuarios_permissoes_sistema u
    where coalesce(u.ativo, false) = true
      and coalesce(u.bloqueado, false) = false
      and coalesce(u.acesso_global, false) = false
      and u.empresa_id is null;

    if v_ativos_sem_empresa_nao_globais <> 0 then
        raise exception
            'M11.6-I3B: existem % usuarios ativos nao globais sem empresa.',
            v_ativos_sem_empresa_nao_globais;
    end if;

    select count(*)
    into v_tenants_ativos
    from public.tenants
    where status = 'ativo';

    if v_tenants_ativos <> 0 then
        raise exception
            'M11.6-I3B: esperado 0 tenant ativo; encontrados %.',
            v_tenants_ativos;
    end if;

    select count(*)
    into v_empresas_sem_tenant
    from public.empresas
    where tenant_id is null;

    if v_empresas_sem_tenant <> 0 then
        raise exception
            'M11.6-I3B: existem % empresas sem tenant_id.',
            v_empresas_sem_tenant;
    end if;

    select
        (select count(*)
         from public.colaboradores
         where empresa_id is null)
        +
        (select count(*)
         from public.colaboradores_condicoes_temporarias
         where empresa_id is null)
        +
        (select count(*)
         from public.colaboradores_movimentacoes
         where empresa_id is null)
        +
        (select count(*)
         from public.colaboradores_qr_impressoes
         where empresa_id is null)
        +
        (select count(*)
         from public.dds_registros
         where empresa_id is null)
    into v_registros_sem_empresa;

    if v_registros_sem_empresa <> 0 then
        raise exception
            'M11.6-I3B: existem % registros sem empresa_id nas tabelas nullable.',
            v_registros_sem_empresa;
    end if;
end;
$preflight$;

-- =============================================================
-- POLICIES I3B
-- =============================================================

-- -------------------------------------------------------------
-- colaboradores
-- -------------------------------------------------------------

alter policy colaboradores_delete_usuarios_ativos
on public.colaboradores
using (
    public.usuario_ativo_sistema()
    and empresa_id is not null
    and public.usuario_tem_acesso_empresa(empresa_id)
);

alter policy colaboradores_insert_usuarios_ativos
on public.colaboradores
with check (
    public.usuario_ativo_sistema()
    and empresa_id is not null
    and public.usuario_tem_acesso_empresa(empresa_id)
);

alter policy colaboradores_select_usuarios_ativos
on public.colaboradores
using (
    public.usuario_ativo_sistema()
    and empresa_id is not null
    and public.usuario_tem_acesso_empresa(empresa_id)
);

alter policy colaboradores_update_usuarios_ativos
on public.colaboradores
using (
    public.usuario_ativo_sistema()
    and empresa_id is not null
    and public.usuario_tem_acesso_empresa(empresa_id)
)
with check (
    public.usuario_ativo_sistema()
    and empresa_id is not null
    and public.usuario_tem_acesso_empresa(empresa_id)
);

-- -------------------------------------------------------------
-- colaboradores_condicoes_temporarias
-- -------------------------------------------------------------

alter policy colaboradores_cond_temp_select_usuarios_ativos
on public.colaboradores_condicoes_temporarias
using (
    public.usuario_ativo_sistema()
    and empresa_id is not null
    and public.usuario_tem_acesso_empresa(empresa_id)
);

-- -------------------------------------------------------------
-- colaboradores_movimentacoes
-- -------------------------------------------------------------

alter policy colaboradores_movimentacoes_select_usuarios_ativos
on public.colaboradores_movimentacoes
using (
    public.usuario_ativo_sistema()
    and empresa_id is not null
    and public.usuario_tem_acesso_empresa(empresa_id)
);

-- -------------------------------------------------------------
-- colaboradores_qr_impressoes
-- -------------------------------------------------------------

alter policy colaboradores_qr_impressoes_select_usuarios_ativos
on public.colaboradores_qr_impressoes
using (
    public.usuario_ativo_sistema()
    and empresa_id is not null
    and public.usuario_tem_acesso_empresa(empresa_id)
);

-- -------------------------------------------------------------
-- dds_registros
-- -------------------------------------------------------------

alter policy dds_registros_delete_usuarios_ativos
on public.dds_registros
using (
    public.usuario_ativo_sistema()
    and empresa_id is not null
    and public.usuario_tem_acesso_empresa(empresa_id)
);

alter policy dds_registros_insert_usuarios_ativos
on public.dds_registros
with check (
    public.usuario_ativo_sistema()
    and empresa_id is not null
    and public.usuario_tem_acesso_empresa(empresa_id)
);

alter policy dds_registros_select_usuarios_ativos
on public.dds_registros
using (
    public.usuario_ativo_sistema()
    and empresa_id is not null
    and public.usuario_tem_acesso_empresa(empresa_id)
);

alter policy dds_registros_update_usuarios_ativos
on public.dds_registros
using (
    public.usuario_ativo_sistema()
    and empresa_id is not null
    and public.usuario_tem_acesso_empresa(empresa_id)
)
with check (
    public.usuario_ativo_sistema()
    and empresa_id is not null
    and public.usuario_tem_acesso_empresa(empresa_id)
);

-- -------------------------------------------------------------
-- empresas
-- -------------------------------------------------------------

alter policy empresas_insert_usuarios_ativos
on public.empresas
with check (
    public.usuario_ativo_sistema()
    and (
        public.usuario_admin_global()
        or public.usuario_tem_acesso_tenant(tenant_id)
    )
);

alter policy empresas_select_usuarios_ativos
on public.empresas
using (
    public.usuario_ativo_sistema()
    and public.usuario_tem_acesso_empresa(id)
);

alter policy empresas_update_usuarios_ativos
on public.empresas
using (
    public.usuario_ativo_sistema()
    and public.usuario_tem_acesso_empresa(id)
)
with check (
    public.usuario_ativo_sistema()
    and public.usuario_tem_acesso_empresa(id)
);

-- -------------------------------------------------------------
-- empresas_cnpjs
-- -------------------------------------------------------------

alter policy empresas_cnpjs_delete_usuarios_ativos
on public.empresas_cnpjs
using (
    public.usuario_ativo_sistema()
    and public.usuario_tem_acesso_empresa(empresa_id)
);

alter policy empresas_cnpjs_insert_usuarios_ativos
on public.empresas_cnpjs
with check (
    public.usuario_ativo_sistema()
    and public.usuario_tem_acesso_empresa(empresa_id)
);

alter policy empresas_cnpjs_select_usuarios_ativos
on public.empresas_cnpjs
using (
    public.usuario_ativo_sistema()
    and public.usuario_tem_acesso_empresa(empresa_id)
);

alter policy empresas_cnpjs_update_usuarios_ativos
on public.empresas_cnpjs
using (
    public.usuario_ativo_sistema()
    and public.usuario_tem_acesso_empresa(empresa_id)
)
with check (
    public.usuario_ativo_sistema()
    and public.usuario_tem_acesso_empresa(empresa_id)
);

-- =============================================================
-- POSTFLIGHT I3B
-- =============================================================

do $postflight$
declare
    v_fallbacks_globais bigint;
    v_total_policies bigint;
    v_gate_empresa bigint;
    v_gate_tenant_insert bigint;
begin
    select count(*)
    into v_fallbacks_globais
    from pg_policies
    where schemaname = 'public'
      and (
          coalesce(qual, '') ilike
              '%usuario_tem_escopo_empresa_atribuido%'
          or
          coalesce(with_check, '') ilike
              '%usuario_tem_escopo_empresa_atribuido%'
      );

    if v_fallbacks_globais <> 0 then
        raise exception
            'M11.6-I3B: ainda existem % policies com fallback legado.',
            v_fallbacks_globais;
    end if;

    select count(*)
    into v_total_policies
    from pg_policies
    where schemaname = 'public'
      and tablename in (
          'colaboradores',
          'colaboradores_condicoes_temporarias',
          'colaboradores_movimentacoes',
          'colaboradores_qr_impressoes',
          'dds_registros',
          'empresas',
          'empresas_cnpjs'
      );

    if v_total_policies <> 18 then
        raise exception
            'M11.6-I3B: quantidade de policies mudou; atual %.',
            v_total_policies;
    end if;

    select count(*)
    into v_gate_empresa
    from pg_policies
    where schemaname = 'public'
      and tablename in (
          'colaboradores',
          'colaboradores_condicoes_temporarias',
          'colaboradores_movimentacoes',
          'colaboradores_qr_impressoes',
          'dds_registros',
          'empresas',
          'empresas_cnpjs'
      )
      and (
          coalesce(qual, '') ilike
              '%usuario_tem_acesso_empresa%'
          or
          coalesce(with_check, '') ilike
              '%usuario_tem_acesso_empresa%'
      );

    if v_gate_empresa <> 17 then
        raise exception
            'M11.6-I3B: esperado gate de empresa em 17 policies; atual %.',
            v_gate_empresa;
    end if;

    select count(*)
    into v_gate_tenant_insert
    from pg_policies
    where schemaname = 'public'
      and tablename = 'empresas'
      and policyname = 'empresas_insert_usuarios_ativos'
      and cmd = 'INSERT'
      and coalesce(with_check, '') ilike
          '%usuario_tem_acesso_tenant%';

    if v_gate_tenant_insert <> 1 then
        raise exception
            'M11.6-I3B: policy de INSERT de empresas nao ficou tenant-aware.';
    end if;
end;
$postflight$;

commit;
