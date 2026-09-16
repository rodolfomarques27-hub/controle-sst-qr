begin;

do $preflight$
begin
  if to_regclass('public.tenants') is null
     or to_regclass('public.empresas') is null
     or to_regclass('public.tenant_memberships') is null
     or to_regclass('public.usuarios_permissoes_sistema') is null then
    raise exception
      'I4C-A preflight: estrutura tenant/usuarios incompleta.';
  end if;

  if to_regprocedure('public.usuario_admin_global()') is null
     or to_regprocedure(
       'public.montar_permissoes_padrao_usuario_sistema(text)'
     ) is null then
    raise exception
      'I4C-A preflight: helpers canonicos ausentes.';
  end if;

  if to_regprocedure(
       'public.admin_salvar_usuario_permissao_sistema(text,text,text,text,boolean,boolean,boolean,text,text,text,uuid)'
     ) is null
     or to_regprocedure(
       'public.admin_listar_usuarios_permissoes_sistema()'
     ) is null
     or to_regprocedure(
       'public.admin_excluir_usuario_permissao_sistema(text,uuid,text)'
     ) is null
     or to_regprocedure(
       'public.admin_aplicar_perfil_permissao_usuarios_sistema(text,text)'
     ) is null then
    raise exception
      'I4C-A preflight: RPC administrativa legada ausente.';
  end if;

  if to_regprocedure(
       'public.admin_salvar_usuario_permissao_sistema_i4c_core(text,text,text,text,boolean,boolean,boolean,text,text,text,uuid)'
     ) is not null
     or to_regprocedure(
       'public.admin_listar_usuarios_permissoes_sistema_i4c_core()'
     ) is not null
     or to_regprocedure(
       'public.admin_excluir_usuario_permissao_sistema_i4c_core(text,uuid,text)'
     ) is not null
     or to_regprocedure(
       'public.admin_aplicar_perfil_permissao_usuarios_sistema_i4c_core(text,text)'
     ) is not null
     or to_regprocedure(
       'public.usuario_pode_gerenciar_tenant(uuid)'
     ) is not null
     or to_regprocedure(
       'public.admin_listar_usuarios_tenant_sistema(uuid)'
     ) is not null
     or to_regprocedure(
       'public.admin_salvar_usuario_tenant_sistema(uuid,uuid,text,text,text,text,text,uuid,text,text,text,jsonb)'
     ) is not null
     or to_regprocedure(
       'public.admin_revogar_usuario_tenant_sistema(uuid,uuid)'
     ) is not null then
    raise exception
      'I4C-A preflight: objetos I4C ja existem.';
  end if;

  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.tenant_memberships'::regclass
      and c.conname =
        'tenant_memberships_tenant_user_unique'
      and c.contype = 'u'
  ) then
    raise exception
      'I4C-A preflight: UNIQUE tenant/user ausente.';
  end if;
end
$preflight$;

-- ============================================================
-- 1. PRESERVAR RPCs LEGADAS COMO CORES INTERNOS
-- ============================================================

alter function
  public.admin_salvar_usuario_permissao_sistema(
    text,
    text,
    text,
    text,
    boolean,
    boolean,
    boolean,
    text,
    text,
    text,
    uuid
  )
rename to
  admin_salvar_usuario_permissao_sistema_i4c_core;

alter function
  public.admin_listar_usuarios_permissoes_sistema()
rename to
  admin_listar_usuarios_permissoes_sistema_i4c_core;

alter function
  public.admin_excluir_usuario_permissao_sistema(
    text,
    uuid,
    text
  )
rename to
  admin_excluir_usuario_permissao_sistema_i4c_core;

alter function
  public.admin_aplicar_perfil_permissao_usuarios_sistema(
    text,
    text
  )
rename to
  admin_aplicar_perfil_permissao_usuarios_sistema_i4c_core;

revoke all
on function
  public.admin_salvar_usuario_permissao_sistema_i4c_core(
    text,
    text,
    text,
    text,
    boolean,
    boolean,
    boolean,
    text,
    text,
    text,
    uuid
  )
from public, anon, authenticated, service_role;

revoke all
on function
  public.admin_listar_usuarios_permissoes_sistema_i4c_core()
from public, anon, authenticated, service_role;

revoke all
on function
  public.admin_excluir_usuario_permissao_sistema_i4c_core(
    text,
    uuid,
    text
  )
from public, anon, authenticated, service_role;

revoke all
on function
  public.admin_aplicar_perfil_permissao_usuarios_sistema_i4c_core(
    text,
    text
  )
from public, anon, authenticated, service_role;

-- ============================================================
-- 2. GATE CANONICO DE ADMINISTRACAO DO TENANT
-- ============================================================

create or replace function
  public.usuario_pode_gerenciar_tenant(
    p_tenant_id uuid
  )
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select
    p_tenant_id is not null
    and exists (
      select 1
      from public.tenants t0
      where t0.id = p_tenant_id
    )
    and (
      public.usuario_admin_global()
      or exists (
        select 1
        from public.tenant_memberships tm
        join public.tenants t
          on t.id = tm.tenant_id
        where tm.tenant_id = p_tenant_id
          and tm.user_id = auth.uid()
          and tm.status = 'ativo'
          and tm.papel = 'administrador'
          and t.status = 'ativo'
      )
    );
$function$;

comment on function
  public.usuario_pode_gerenciar_tenant(uuid)
is
  'Admin global gerencia qualquer tenant existente; administrador tenant-scoped exige tenant ativo + membership ativa.';

revoke all
on function
  public.usuario_pode_gerenciar_tenant(uuid)
from public, anon;

grant execute
on function
  public.usuario_pode_gerenciar_tenant(uuid)
to authenticated, service_role;

-- ============================================================
-- 3. WRAPPER LEGADO — SAVE GLOBAL-ONLY
-- ============================================================

create or replace function
  public.admin_salvar_usuario_permissao_sistema(
    p_email text,
    p_nome text default ''::text,
    p_funcao text default ''::text,
    p_perfil text default 'consulta'::text,
    p_ativo boolean default true,
    p_bloqueado boolean default false,
    p_acesso_global boolean default false,
    p_observacao text default ''::text,
    p_empresa text default ''::text,
    p_foto_url text default ''::text,
    p_empresa_id uuid default null::uuid
  )
returns table(
  id uuid,
  user_id uuid,
  email text,
  nome text,
  funcao text,
  empresa text,
  empresa_id uuid,
  foto_url text,
  perfil text,
  ativo boolean,
  bloqueado boolean,
  acesso_global boolean,
  permissoes jsonb,
  observacao text,
  precisa_trocar_senha boolean,
  ultimo_login_em timestamptz,
  login_criado_em timestamptz,
  criado_por uuid,
  atualizado_por uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
begin
  if auth.uid() is null
     or not public.usuario_admin_global() then
    raise exception
      'Fluxo administrativo legado restrito ao administrador global SafeScan.';
  end if;

  return query
  select *
  from public.admin_salvar_usuario_permissao_sistema_i4c_core(
    p_email => p_email,
    p_nome => p_nome,
    p_funcao => p_funcao,
    p_perfil => p_perfil,
    p_ativo => p_ativo,
    p_bloqueado => p_bloqueado,
    p_acesso_global => p_acesso_global,
    p_observacao => p_observacao,
    p_empresa => p_empresa,
    p_foto_url => p_foto_url,
    p_empresa_id => p_empresa_id
  );
end;
$function$;

-- ============================================================
-- 4. WRAPPER LEGADO — LIST GLOBAL-ONLY
-- ============================================================

create or replace function
  public.admin_listar_usuarios_permissoes_sistema()
returns table(
  id uuid,
  user_id uuid,
  email text,
  nome text,
  funcao text,
  empresa text,
  empresa_id uuid,
  foto_url text,
  perfil text,
  ativo boolean,
  bloqueado boolean,
  acesso_global boolean,
  permissoes jsonb,
  permissoes_padrao jsonb,
  pode_gerenciar_permissoes boolean,
  observacao text,
  precisa_trocar_senha boolean,
  ultimo_login_em timestamptz,
  login_criado_em timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
begin
  if auth.uid() is null
     or not public.usuario_admin_global() then
    raise exception
      'Listagem administrativa global restrita ao administrador global SafeScan.';
  end if;

  return query
  select *
  from public.admin_listar_usuarios_permissoes_sistema_i4c_core();
end;
$function$;

-- ============================================================
-- 5. WRAPPER LEGADO — DELETE GLOBAL-ONLY
-- ============================================================

create or replace function
  public.admin_excluir_usuario_permissao_sistema(
    p_email text default null::text,
    p_id uuid default null::uuid,
    p_observacao text default null::text
  )
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_user_id uuid;
  v_resultado jsonb;
  v_memberships_revogadas integer := 0;
begin
  if auth.uid() is null
     or not public.usuario_admin_global() then
    raise exception
      'Exclusão administrativa global restrita ao administrador global SafeScan.';
  end if;

  select u.user_id
  into v_user_id
  from public.usuarios_permissoes_sistema u
  where
    (
      p_id is not null
      and u.id = p_id
    )
    or (
      nullif(
        trim(
          coalesce(
            p_email,
            ''
          )
        ),
        ''
      ) is not null
      and lower(
        coalesce(
          u.email,
          ''
        )
      ) = lower(
        trim(
          p_email
        )
      )
    )
  order by
    case
      when p_id is not null
       and u.id = p_id
      then 0
      else 1
    end,
    u.updated_at desc nulls last,
    u.created_at desc nulls last
  limit 1;

  v_resultado :=
    public.admin_excluir_usuario_permissao_sistema_i4c_core(
      p_email => p_email,
      p_id => p_id,
      p_observacao => p_observacao
    );

  if v_user_id is not null then
    update public.tenant_memberships tm
    set
      status = 'revogado',
      updated_by = auth.uid(),
      updated_at = now()
    where tm.user_id = v_user_id
      and tm.status <> 'revogado';

    get diagnostics
      v_memberships_revogadas = row_count;
  end if;

  return
    coalesce(
      v_resultado,
      '{}'::jsonb
    )
    || jsonb_build_object(
      'memberships_revogadas',
      v_memberships_revogadas
    );
end;
$function$;

-- ============================================================
-- 6. WRAPPER LEGADO — PERFIL GLOBAL-ONLY
-- ============================================================

create or replace function
  public.admin_aplicar_perfil_permissao_usuarios_sistema(
    p_chave text,
    p_confirmacao text default ''::text
  )
returns table(
  perfil text,
  usuarios_atualizados integer,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_chave text :=
    lower(
      trim(
        coalesce(
          p_chave,
          ''
        )
      )
    );
begin
  if auth.uid() is null
     or not public.usuario_admin_global() then
    raise exception
      'Aplicação global de perfil restrita ao administrador global SafeScan.';
  end if;

  if v_chave = 'admin' then
    v_chave := 'administrador';
  end if;

  if v_chave = 'administrador'
     and exists (
       select 1
       from public.usuarios_permissoes_sistema u
       where lower(
         coalesce(
           u.perfil,
           ''
         )
       ) = 'administrador'
         and coalesce(
           u.excluido,
           false
         ) = false
         and not exists (
           select 1
           from public.auditoria_usuarios_autorizados aua
           where aua.user_id = u.user_id
             and coalesce(
               aua.ativo,
               false
             ) = true
             and (
               coalesce(
                 aua.acesso_global,
                 false
               ) = true
               or lower(
                 coalesce(
                   aua.perfil,
                   ''
                 )
               ) in (
                 'admin',
                 'administrador'
               )
             )
         )
     ) then
    raise exception
      'Aplicação global de administrador bloqueada: há perfil administrador fora da lista global SafeScan.';
  end if;

  return query
  select *
  from public.admin_aplicar_perfil_permissao_usuarios_sistema_i4c_core(
    p_chave => v_chave,
    p_confirmacao => p_confirmacao
  );
end;
$function$;

-- ============================================================
-- 7. GRANTS DOS WRAPPERS LEGADOS
-- ============================================================

revoke all
on function
  public.admin_salvar_usuario_permissao_sistema(
    text,
    text,
    text,
    text,
    boolean,
    boolean,
    boolean,
    text,
    text,
    text,
    uuid
  )
from public, anon;

grant execute
on function
  public.admin_salvar_usuario_permissao_sistema(
    text,
    text,
    text,
    text,
    boolean,
    boolean,
    boolean,
    text,
    text,
    text,
    uuid
  )
to authenticated, service_role;

revoke all
on function
  public.admin_listar_usuarios_permissoes_sistema()
from public, anon;

grant execute
on function
  public.admin_listar_usuarios_permissoes_sistema()
to authenticated, service_role;

revoke all
on function
  public.admin_excluir_usuario_permissao_sistema(
    text,
    uuid,
    text
  )
from public, anon;

grant execute
on function
  public.admin_excluir_usuario_permissao_sistema(
    text,
    uuid,
    text
  )
to authenticated, service_role;

revoke all
on function
  public.admin_aplicar_perfil_permissao_usuarios_sistema(
    text,
    text
  )
from public, anon;

grant execute
on function
  public.admin_aplicar_perfil_permissao_usuarios_sistema(
    text,
    text
  )
to authenticated, service_role;

-- ============================================================
-- 8. LISTAGEM TENANT-SCOPED
-- ============================================================

create or replace function
  public.admin_listar_usuarios_tenant_sistema(
    p_tenant_id uuid
  )
returns table(
  membership_id uuid,
  tenant_id uuid,
  user_id uuid,
  papel text,
  membership_status text,
  membership_permissoes jsonb,
  email text,
  nome text,
  funcao text,
  empresa text,
  empresa_id uuid,
  foto_url text,
  perfil_legado text,
  ativo_legado boolean,
  bloqueado_legado boolean,
  acesso_global_legado boolean,
  observacao text,
  membership_created_at timestamptz,
  membership_updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
begin
  if auth.uid() is null then
    raise exception
      'Usuário autenticado não identificado.';
  end if;

  if not public.usuario_pode_gerenciar_tenant(
    p_tenant_id
  ) then
    raise exception
      'Sem permissão para listar usuários deste tenant.';
  end if;

  return query
  select
    tm.id,
    tm.tenant_id,
    tm.user_id,
    tm.papel,
    tm.status,
    coalesce(
      tm.permissoes,
      '{}'::jsonb
    ),
    coalesce(
      u.email,
      au.email::text,
      ''
    ),
    coalesce(
      u.nome,
      ''
    ),
    coalesce(
      u.funcao,
      ''
    ),
    coalesce(
      u.empresa,
      ''
    ),
    u.empresa_id,
    u.foto_url,
    u.perfil,
    coalesce(
      u.ativo,
      false
    ),
    coalesce(
      u.bloqueado,
      false
    ),
    coalesce(
      u.acesso_global,
      false
    ),
    u.observacao,
    tm.created_at,
    tm.updated_at
  from public.tenant_memberships tm
  join auth.users au
    on au.id = tm.user_id
  left join lateral (
    select ux.*
    from public.usuarios_permissoes_sistema ux
    where ux.user_id = tm.user_id
    order by
      ux.updated_at desc nulls last,
      ux.created_at desc nulls last
    limit 1
  ) u
    on true
  where tm.tenant_id = p_tenant_id
  order by
    lower(
      coalesce(
        u.nome,
        au.email::text,
        ''
      )
    ),
    tm.created_at;
end;
$function$;

-- ============================================================
-- 9. SAVE TENANT-SCOPED
--
-- IMPORTANTE:
-- papel administrador do tenant NUNCA vira perfil administrador
-- na tabela legada.
-- ============================================================

create or replace function
  public.admin_salvar_usuario_tenant_sistema(
    p_tenant_id uuid,
    p_user_id uuid,
    p_email text,
    p_nome text default ''::text,
    p_funcao text default ''::text,
    p_papel text default 'consulta'::text,
    p_status text default 'ativo'::text,
    p_empresa_id uuid default null::uuid,
    p_empresa text default ''::text,
    p_foto_url text default ''::text,
    p_observacao text default ''::text,
    p_permissoes jsonb default '{}'::jsonb
  )
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_email text :=
    lower(
      trim(
        coalesce(
          p_email,
          ''
        )
      )
    );

  v_auth_email text;

  v_papel text :=
    lower(
      trim(
        coalesce(
          p_papel,
          'consulta'
        )
      )
    );

  v_status text :=
    lower(
      trim(
        coalesce(
          p_status,
          'ativo'
        )
      )
    );

  v_empresa_tenant_id uuid;
  v_empresa_nome text;
  v_empresa_texto text;

  v_membership_permissoes jsonb :=
    coalesce(
      p_permissoes,
      '{}'::jsonb
    );

  v_perfil_legado text;
  v_ativo_legado boolean;
  v_bloqueado_legado boolean;
  v_permissoes_legado jsonb;

  v_permissao_id uuid;
  v_membership_id uuid;

  v_alvo_global boolean := false;
begin
  if auth.uid() is null then
    raise exception
      'Usuário autenticado não identificado.';
  end if;

  if not public.usuario_pode_gerenciar_tenant(
    p_tenant_id
  ) then
    raise exception
      'Sem permissão para salvar usuários neste tenant.';
  end if;

  if p_user_id is null then
    raise exception
      'user_id do Supabase Auth é obrigatório.';
  end if;

  select
    lower(
      coalesce(
        au.email::text,
        ''
      )
    )
  into v_auth_email
  from auth.users au
  where au.id = p_user_id;

  if not found then
    raise exception
      'Usuário do Supabase Auth não encontrado.';
  end if;

  if v_email = ''
     or position(
       '@' in v_email
     ) = 0 then
    raise exception
      'E-mail inválido para salvar usuário do tenant.';
  end if;

  if v_auth_email <> v_email then
    raise exception
      'O e-mail informado não corresponde ao usuário do Supabase Auth.';
  end if;

  if v_papel = 'admin' then
    v_papel := 'administrador';

  elsif v_papel in (
    'tecnico sst',
    'técnico sst',
    'tecnico_de_seguranca',
    'tecnico seguranca'
  ) then
    v_papel := 'tecnico_sst';
  end if;

  if v_papel not in (
    'administrador',
    'gestor',
    'tecnico_sst',
    'auditor',
    'consulta'
  ) then
    raise exception
      'Papel de tenant inválido.';
  end if;

  if v_status not in (
    'pendente',
    'ativo',
    'suspenso',
    'revogado'
  ) then
    raise exception
      'Status de membership inválido.';
  end if;

  if jsonb_typeof(
    v_membership_permissoes
  ) <> 'object' then
    raise exception
      'Permissões da membership devem ser um objeto JSON.';
  end if;

  select
    exists (
      select 1
      from public.auditoria_usuarios_autorizados aua
      where aua.user_id = p_user_id
        and coalesce(
          aua.ativo,
          false
        ) = true
        and (
          coalesce(
            aua.acesso_global,
            false
          ) = true
          or lower(
            coalesce(
              aua.perfil,
              ''
            )
          ) in (
            'admin',
            'administrador'
          )
        )
    )
    or exists (
      select 1
      from public.usuarios_permissoes_sistema ux
      where ux.user_id = p_user_id
        and (
          coalesce(
            ux.acesso_global,
            false
          ) = true
          or lower(
            coalesce(
              ux.perfil,
              ''
            )
          ) = 'administrador'
          or coalesce(
            ux.pode_gerenciar_permissoes,
            false
          ) = true
          or lower(
            coalesce(
              ux.permissoes
                -> 'acoesCriticas'
                ->> 'gerenciar_permissoes',
              'false'
            )
          ) = 'true'
          or lower(
            coalesce(
              ux.permissoes
                -> 'modulos'
                -> 'acessos_app'
                ->> 'gerenciar_permissoes',
              'false'
            )
          ) = 'true'
        )
    )
  into v_alvo_global;

  if v_alvo_global then
    raise exception
      'Administrador global SafeScan deve ser gerenciado pelo fluxo global.';
  end if;

  if exists (
    select 1
    from public.usuarios_permissoes_sistema ux
    where ux.user_id = p_user_id
      and lower(
        coalesce(
          ux.email,
          ''
        )
      ) <> v_email
  ) then
    raise exception
      'O user_id informado já está vinculado a outro e-mail.';
  end if;

  if exists (
    select 1
    from public.usuarios_permissoes_sistema ux
    where lower(
      coalesce(
        ux.email,
        ''
      )
    ) = v_email
      and ux.user_id is not null
      and ux.user_id <> p_user_id
  ) then
    raise exception
      'O e-mail informado já está vinculado a outro user_id.';
  end if;

  if p_empresa_id is not null then
    select
      e.tenant_id,
      e.nome
    into
      v_empresa_tenant_id,
      v_empresa_nome
    from public.empresas e
    where e.id = p_empresa_id;

    if not found then
      raise exception
        'A empresa selecionada não existe.';
    end if;

    if v_empresa_tenant_id
       is distinct from
       p_tenant_id then
      raise exception
        'A empresa selecionada não pertence ao tenant informado.';
    end if;
  end if;

  if v_status = 'ativo'
     and v_papel <> 'administrador'
     and p_empresa_id is null then
    raise exception
      'Usuário tenant-scoped ativo não administrador exige empresa_id enquanto a compatibilidade legada existir.';
  end if;

  if p_empresa_id is null then
    v_empresa_texto := '';
  else
    v_empresa_texto :=
      nullif(
        trim(
          coalesce(
            p_empresa,
            ''
          )
        ),
        ''
      );

    if v_empresa_texto is null then
      v_empresa_texto :=
        coalesce(
          v_empresa_nome,
          ''
        );
    end if;
  end if;

  -- Administrador do tenant NUNCA vira administrador legado.
  if v_papel = 'administrador' then
    v_perfil_legado := 'consulta';
    v_ativo_legado := false;
    v_bloqueado_legado := true;
  else
    v_perfil_legado := v_papel;

    v_ativo_legado :=
      v_status = 'ativo';

    v_bloqueado_legado :=
      not v_ativo_legado;
  end if;

  v_permissoes_legado :=
    public.montar_permissoes_padrao_usuario_sistema(
      v_perfil_legado
    );

  update public.usuarios_permissoes_sistema u
  set
    user_id = p_user_id,
    nome = trim(
      coalesce(
        p_nome,
        ''
      )
    ),
    funcao = trim(
      coalesce(
        p_funcao,
        ''
      )
    ),
    empresa = v_empresa_texto,
    empresa_id = p_empresa_id,
    foto_url = nullif(
      trim(
        coalesce(
          p_foto_url,
          ''
        )
      ),
      ''
    ),
    perfil = v_perfil_legado,
    ativo = v_ativo_legado,
    bloqueado = v_bloqueado_legado,
    acesso_global = false,
    pode_gerenciar_permissoes = false,
    permissoes = v_permissoes_legado,
    permissoes_padrao = v_permissoes_legado,
    observacao = trim(
      coalesce(
        p_observacao,
        ''
      )
    ),
    excluido = false,
    excluido_em = null,
    excluido_por = null,
    atualizado_por = auth.uid(),
    updated_at = now()
  where lower(
    coalesce(
      u.email,
      ''
    )
  ) = v_email
  returning u.id
  into v_permissao_id;

  if not found then
    insert into public.usuarios_permissoes_sistema (
      user_id,
      email,
      nome,
      funcao,
      empresa,
      empresa_id,
      foto_url,
      perfil,
      ativo,
      bloqueado,
      acesso_global,
      pode_gerenciar_permissoes,
      permissoes,
      permissoes_padrao,
      observacao,
      criado_por,
      atualizado_por
    )
    values (
      p_user_id,
      v_email,
      trim(
        coalesce(
          p_nome,
          ''
        )
      ),
      trim(
        coalesce(
          p_funcao,
          ''
        )
      ),
      v_empresa_texto,
      p_empresa_id,
      nullif(
        trim(
          coalesce(
            p_foto_url,
            ''
          )
        ),
        ''
      ),
      v_perfil_legado,
      v_ativo_legado,
      v_bloqueado_legado,
      false,
      false,
      v_permissoes_legado,
      v_permissoes_legado,
      trim(
        coalesce(
          p_observacao,
          ''
        )
      ),
      auth.uid(),
      auth.uid()
    )
    returning id
    into v_permissao_id;
  end if;

  insert into public.tenant_memberships (
    tenant_id,
    user_id,
    papel,
    status,
    permissoes,
    created_by,
    updated_by
  )
  values (
    p_tenant_id,
    p_user_id,
    v_papel,
    v_status,
    v_membership_permissoes,
    auth.uid(),
    auth.uid()
  )
  on conflict on constraint
    tenant_memberships_tenant_user_unique
  do update
  set
    papel = excluded.papel,
    status = excluded.status,
    permissoes = excluded.permissoes,
    updated_by = auth.uid(),
    updated_at = now()
  returning id
  into v_membership_id;

  return jsonb_build_object(
    'ok',
    true,
    'tenant_id',
    p_tenant_id,
    'user_id',
    p_user_id,
    'email',
    v_email,
    'empresa_id',
    p_empresa_id,
    'papel',
    v_papel,
    'status',
    v_status,
    'permissao_id',
    v_permissao_id,
    'membership_id',
    v_membership_id,
    'acesso_global',
    false,
    'perfil_legado',
    v_perfil_legado,
    'ativo_legado',
    v_ativo_legado,
    'bloqueado_legado',
    v_bloqueado_legado
  );
end;
$function$;

-- ============================================================
-- 10. REVOGACAO TENANT-SCOPED
-- ============================================================

create or replace function
  public.admin_revogar_usuario_tenant_sistema(
    p_tenant_id uuid,
    p_user_id uuid
  )
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_membership_id uuid;

  v_alvo_global boolean := false;

  v_fallback_papel text;
  v_fallback_empresa_id uuid;
  v_fallback_empresa_nome text;

  v_perfil_legado text;
  v_ativo_legado boolean;
  v_bloqueado_legado boolean;
  v_permissoes_legado jsonb;
begin
  if auth.uid() is null then
    raise exception
      'Usuário autenticado não identificado.';
  end if;

  if not public.usuario_pode_gerenciar_tenant(
    p_tenant_id
  ) then
    raise exception
      'Sem permissão para revogar usuários deste tenant.';
  end if;

  if p_user_id = auth.uid()
     and not public.usuario_admin_global() then
    raise exception
      'Você não pode revogar a própria membership administrativa.';
  end if;

  select
    exists (
      select 1
      from public.auditoria_usuarios_autorizados aua
      where aua.user_id = p_user_id
        and coalesce(
          aua.ativo,
          false
        ) = true
        and (
          coalesce(
            aua.acesso_global,
            false
          ) = true
          or lower(
            coalesce(
              aua.perfil,
              ''
            )
          ) in (
            'admin',
            'administrador'
          )
        )
    )
    or exists (
      select 1
      from public.usuarios_permissoes_sistema ux
      where ux.user_id = p_user_id
        and (
          coalesce(
            ux.acesso_global,
            false
          ) = true
          or lower(
            coalesce(
              ux.perfil,
              ''
            )
          ) = 'administrador'
          or coalesce(
            ux.pode_gerenciar_permissoes,
            false
          ) = true
        )
    )
  into v_alvo_global;

  if v_alvo_global then
    raise exception
      'Administrador global SafeScan deve ser gerenciado pelo fluxo global.';
  end if;

  select tm.id
  into v_membership_id
  from public.tenant_memberships tm
  where tm.tenant_id = p_tenant_id
    and tm.user_id = p_user_id
  limit 1;

  if not found then
    raise exception
      'Membership não encontrada para o tenant informado.';
  end if;

  update public.tenant_memberships tm
  set
    status = 'revogado',
    updated_by = auth.uid(),
    updated_at = now()
  where tm.id = v_membership_id;

  select
    tm.papel,
    e.id,
    e.nome
  into
    v_fallback_papel,
    v_fallback_empresa_id,
    v_fallback_empresa_nome
  from public.tenant_memberships tm
  join public.tenants t
    on t.id = tm.tenant_id
  left join lateral (
    select
      ex.id,
      ex.nome
    from public.empresas ex
    where ex.tenant_id = tm.tenant_id
    order by
      ex.created_at nulls last,
      ex.id
    limit 1
  ) e
    on true
  where tm.user_id = p_user_id
    and tm.tenant_id <> p_tenant_id
    and tm.status = 'ativo'
    and t.status = 'ativo'
  order by
    tm.updated_at desc nulls last,
    tm.created_at desc
  limit 1;

  if found then
    if v_fallback_papel = 'administrador' then
      -- Admin de outro tenant permanece neutro no legado.
      v_perfil_legado := 'consulta';
      v_ativo_legado := false;
      v_bloqueado_legado := true;
      v_fallback_empresa_id := null;
      v_fallback_empresa_nome := '';

    elsif v_fallback_empresa_id is not null then
      v_perfil_legado :=
        v_fallback_papel;

      v_ativo_legado := true;
      v_bloqueado_legado := false;

    else
      v_perfil_legado :=
        v_fallback_papel;

      v_ativo_legado := false;
      v_bloqueado_legado := true;
    end if;

  else
    v_perfil_legado := 'bloqueado';
    v_ativo_legado := false;
    v_bloqueado_legado := true;
    v_fallback_empresa_id := null;
    v_fallback_empresa_nome := '';
  end if;

  v_permissoes_legado :=
    public.montar_permissoes_padrao_usuario_sistema(
      v_perfil_legado
    );

  update public.usuarios_permissoes_sistema u
  set
    perfil = v_perfil_legado,
    ativo = v_ativo_legado,
    bloqueado = v_bloqueado_legado,
    acesso_global = false,
    pode_gerenciar_permissoes = false,
    empresa_id = v_fallback_empresa_id,
    empresa = coalesce(
      v_fallback_empresa_nome,
      ''
    ),
    permissoes = v_permissoes_legado,
    permissoes_padrao = v_permissoes_legado,
    atualizado_por = auth.uid(),
    updated_at = now()
  where u.user_id = p_user_id;

  return jsonb_build_object(
    'ok',
    true,
    'tenant_id',
    p_tenant_id,
    'user_id',
    p_user_id,
    'membership_id',
    v_membership_id,
    'status',
    'revogado',
    'auth_removido',
    false,
    'perfil_legado',
    v_perfil_legado,
    'ativo_legado',
    v_ativo_legado
  );
end;
$function$;

-- ============================================================
-- 11. GRANTS DAS RPCs TENANT-SCOPED
-- ============================================================

comment on function
  public.admin_listar_usuarios_tenant_sistema(uuid)
is
  'Lista somente memberships do tenant que o chamador pode administrar.';

comment on function
  public.admin_salvar_usuario_tenant_sistema(
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    text,
    uuid,
    text,
    text,
    text,
    jsonb
  )
is
  'Persiste compatibilidade legada neutra e membership tenant-scoped na mesma transação; nunca concede acesso global.';

comment on function
  public.admin_revogar_usuario_tenant_sistema(
    uuid,
    uuid
  )
is
  'Revoga somente a membership do tenant, preservando Auth e outras memberships.';

revoke all
on function
  public.admin_listar_usuarios_tenant_sistema(uuid)
from public, anon, service_role;

grant execute
on function
  public.admin_listar_usuarios_tenant_sistema(uuid)
to authenticated;

revoke all
on function
  public.admin_salvar_usuario_tenant_sistema(
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    text,
    uuid,
    text,
    text,
    text,
    jsonb
  )
from public, anon, service_role;

grant execute
on function
  public.admin_salvar_usuario_tenant_sistema(
    uuid,
    uuid,
    text,
    text,
    text,
    text,
    text,
    uuid,
    text,
    text,
    text,
    jsonb
  )
to authenticated;

revoke all
on function
  public.admin_revogar_usuario_tenant_sistema(
    uuid,
    uuid
  )
from public, anon, service_role;

grant execute
on function
  public.admin_revogar_usuario_tenant_sistema(
    uuid,
    uuid
  )
to authenticated;

commit;
