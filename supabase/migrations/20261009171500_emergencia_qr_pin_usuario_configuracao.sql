begin;

do $preflight$
begin
    if to_regclass('private.emergencia_qr_pins_usuarios') is null
       or to_regprocedure(
           'private.emergencia_qr_usuario_elegivel(uuid,uuid)'
       ) is null
       or to_regprocedure(
           'public.usuario_pode_gerenciar_tenant(uuid)'
       ) is null
       or to_regclass('public.auditoria_sistema') is null then

        raise exception
            'Fundacao do PIN individual ausente ou incompatível.';
    end if;

    if to_regprocedure(
        'public.definir_pin_emergencia_usuario(uuid,uuid,text,boolean)'
    ) is not null then
        raise exception 'RPC de PIN individual ja existe.';
    end if;
end;
$preflight$;

create function public.definir_pin_emergencia_usuario(
    p_tenant_id uuid,
    p_user_id uuid,
    p_pin text,
    p_ativo boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $func$
declare
    v_autor uuid;
    v_pin text;
    v_hash text;
    v_agora timestamptz;
    v_ativo boolean;
begin
    v_autor := auth.uid();
    v_ativo := coalesce(p_ativo, true);
    v_agora := pg_catalog.now();

    if v_autor is null then
        return pg_catalog.jsonb_build_object(
            'ok', false,
            'mensagem', 'Autenticacao obrigatoria.'
        );
    end if;

    if p_tenant_id is null or p_user_id is null then
        return pg_catalog.jsonb_build_object(
            'ok', false,
            'mensagem', 'Tenant ou usuario invalido.'
        );
    end if;

    if not coalesce(
        private.emergencia_qr_usuario_elegivel(
            p_tenant_id, p_user_id
        ),
        false
    ) then
        return pg_catalog.jsonb_build_object(
            'ok', false,
            'mensagem', 'Usuario nao autorizado neste tenant.'
        );
    end if;

    if v_autor <> p_user_id
       and not coalesce(
           public.usuario_pode_gerenciar_tenant(p_tenant_id),
           false
       ) then
        return pg_catalog.jsonb_build_object(
            'ok', false,
            'mensagem', 'Permissao insuficiente.'
        );
    end if;

    if v_ativo then
        v_pin := pg_catalog.btrim(coalesce(p_pin, ''));

        if v_pin !~ '^[0-9]{6,10}$' then
            return pg_catalog.jsonb_build_object(
                'ok', false,
                'mensagem', 'Informe um PIN numerico de 6 a 10 digitos.'
            );
        end if;

        v_hash := extensions.crypt(
            v_pin,
            extensions.gen_salt('bf', 10)
        );

        insert into private.emergencia_qr_pins_usuarios (
            tenant_id,
            user_id,
            senha_hash,
            ativo,
            created_at,
            updated_at,
            created_by,
            updated_by
        )
        values (
            p_tenant_id,
            p_user_id,
            v_hash,
            true,
            v_agora,
            v_agora,
            v_autor,
            v_autor
        )
        on conflict (tenant_id, user_id)
        do update set
            senha_hash = excluded.senha_hash,
            ativo = true,
            updated_at = excluded.updated_at,
            updated_by = excluded.updated_by;
    else
        update private.emergencia_qr_pins_usuarios
           set ativo = false,
               updated_at = v_agora,
               updated_by = v_autor
         where tenant_id = p_tenant_id
           and user_id = p_user_id;

        if not found then
            return pg_catalog.jsonb_build_object(
                'ok', false,
                'mensagem', 'Nenhum PIN individual cadastrado.'
            );
        end if;
    end if;

    insert into public.auditoria_sistema (
        usuario_id,
        usuario_email,
        acao,
        tabela,
        registro_id,
        descricao,
        dados
    )
    values (
        v_autor,
        auth.email(),
        case
            when v_ativo then 'CONFIG_PIN_EMERGENCIA_USUARIO'
            else 'DESATIVAR_PIN_EMERGENCIA_USUARIO'
        end,
        'emergencia_qr_pins_usuarios',
        p_user_id::text,
        'Alteracao de PIN individual de emergencia',
        pg_catalog.jsonb_build_object(
            'tenant_id', p_tenant_id,
            'user_id', p_user_id,
            'ativo', v_ativo
        )
    );

    return pg_catalog.jsonb_build_object(
        'ok', true,
        'mensagem',
        case
            when v_ativo then 'PIN individual atualizado.'
            else 'PIN individual desativado.'
        end
    );
end;
$func$;

revoke all on function
    public.definir_pin_emergencia_usuario(
        uuid, uuid, text, boolean
    )
from public, anon, authenticated;

grant execute on function
    public.definir_pin_emergencia_usuario(
        uuid, uuid, text, boolean
    )
to authenticated;

commit;