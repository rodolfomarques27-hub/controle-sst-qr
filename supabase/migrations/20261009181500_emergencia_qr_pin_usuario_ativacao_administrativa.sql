begin;

do $preflight$
begin
    if to_regclass('private.emergencia_qr_modos_empresa') is null
       or to_regclass('private.emergencia_qr_pins_usuarios') is null
       or to_regclass('private.emergencia_qr_segredos') is null
       or to_regprocedure(
           'private.emergencia_qr_usuario_elegivel(uuid,uuid)'
       ) is null
       or to_regprocedure(
           'public.usuario_pode_gerenciar_tenant(uuid)'
       ) is null
       or to_regprocedure(
           'public.membership_tem_empresa_selecionada(uuid,uuid)'
       ) is null then
        raise exception 'Dependencias da ativacao nao localizadas.';
    end if;

    if to_regprocedure(
        'public.definir_modo_emergencia_qr_empresa(uuid,text)'
    ) is not null then
        raise exception 'RPC administrativa ja existe.';
    end if;
end;
$preflight$;

create function public.definir_modo_emergencia_qr_empresa(
    p_empresa_id uuid,
    p_modo text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $func$
declare
    v_autor uuid := auth.uid();
    v_tenant_id uuid;
    v_ativo boolean;
    v_modo text := pg_catalog.lower(
        pg_catalog.btrim(coalesce(p_modo, ''))
    );
begin
    if v_autor is null or p_empresa_id is null then
        return pg_catalog.jsonb_build_object(
            'ok', false,
            'mensagem', 'Acesso nao autorizado.'
        );
    end if;

    if v_modo not in ('empresa', 'individual') then
        return pg_catalog.jsonb_build_object(
            'ok', false,
            'mensagem', 'Modo de emergencia invalido.'
        );
    end if;

    select e.tenant_id, coalesce(e.emergencia_qr_ativo, false)
      into v_tenant_id, v_ativo
      from public.empresas e
     where e.id = p_empresa_id;

    if v_tenant_id is null
       or not coalesce(
           public.usuario_pode_gerenciar_tenant(v_tenant_id),
           false
       ) then
        return pg_catalog.jsonb_build_object(
            'ok', false,
            'mensagem', 'Permissao insuficiente.'
        );
    end if;

    perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(
            'emergencia-pin-empresa:' || p_empresa_id::text,
            0
        )
    );

    if v_ativo is not true then
        return pg_catalog.jsonb_build_object(
            'ok', false,
            'mensagem', 'Ative a emergencia QR da empresa primeiro.'
        );
    end if;

    if v_modo = 'individual' then
        if not exists (
            select 1
              from private.emergencia_qr_pins_usuarios p
             where p.tenant_id = v_tenant_id
               and p.ativo is true
               and private.emergencia_qr_usuario_elegivel(
                   v_tenant_id,
                   p.user_id
               )
               and (
                   exists (
                       select 1
                         from public.tenant_memberships tm
                         join public.tenants t
                           on t.id = tm.tenant_id
                        where tm.tenant_id = v_tenant_id
                          and tm.user_id = p.user_id
                          and tm.status = 'ativo'
                          and t.status = 'ativo'
                          and (
                              tm.papel = 'administrador'
                              or tm.escopo_empresas = 'todas'
                              or (
                                  tm.escopo_empresas = 'selecionadas'
                                  and public.membership_tem_empresa_selecionada(
                                      tm.id,
                                      p_empresa_id
                                  )
                              )
                          )
                   )
                   or (
                       not exists (
                           select 1
                             from public.tenant_memberships tm
                            where tm.tenant_id = v_tenant_id
                              and tm.user_id = p.user_id
                       )
                       and exists (
                           select 1
                             from public.usuarios_permissoes_sistema u
                            where u.user_id = p.user_id
                              and u.empresa_id = p_empresa_id
                              and u.ativo is true
                              and coalesce(u.bloqueado, false) = false
                              and coalesce(u.excluido, false) = false
                       )
                   )
               )
        ) then
            return pg_catalog.jsonb_build_object(
                'ok', false,
                'mensagem',
                'Nao existe PIN individual ativo e autorizado para esta empresa.'
            );
        end if;
    else
        if not exists (
            select 1
              from private.emergencia_qr_segredos s
             where s.empresa_id = p_empresa_id
               and nullif(pg_catalog.btrim(s.senha_hash), '') is not null
        ) then
            return pg_catalog.jsonb_build_object(
                'ok', false,
                'mensagem',
                'Configure a senha empresarial antes de retornar ao modo empresa.'
            );
        end if;
    end if;

    declare
        v_modo_anterior text;
    begin
        perform pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtextextended(
                'emergencia-qr:modo:' || p_empresa_id::text,
                0
            )
        );

        select m.modo
          into v_modo_anterior
          from private.emergencia_qr_modos_empresa m
         where m.empresa_id = p_empresa_id;

        v_modo_anterior := coalesce(v_modo_anterior, 'empresa');

    insert into private.emergencia_qr_modos_empresa (
        empresa_id, modo, atualizado_em
    )
    values (
        p_empresa_id, v_modo, pg_catalog.now()
    )
    on conflict (empresa_id)
    do update set
        modo = excluded.modo,
        atualizado_em = excluded.atualizado_em;

    insert into public.auditoria_sistema (
        usuario_id, acao, tabela,
        registro_id, descricao, dados
    )
    values (
        v_autor,
        'ALTERAR_MODO_EMERGENCIA_QR',
        'emergencia_qr_modos_empresa',
        p_empresa_id::text,
        'Alteracao administrativa do modo de PIN de emergencia',
        pg_catalog.jsonb_build_object(
            'empresa_id', p_empresa_id,
            'tenant_id', v_tenant_id,
            'modo_anterior', v_modo_anterior,
            'modo_novo', v_modo,
            'modo', v_modo,
            'alterado_em', pg_catalog.now()
        )
    );
    end;

    return pg_catalog.jsonb_build_object(
        'ok', true,
        'modo', v_modo,
        'mensagem', 'Modo de emergencia atualizado.'
    );
end;
$func$;

revoke all on function
    public.definir_modo_emergencia_qr_empresa(uuid,text)
from public, anon, authenticated;

grant execute on function
    public.definir_modo_emergencia_qr_empresa(uuid,text)
to authenticated;

commit;