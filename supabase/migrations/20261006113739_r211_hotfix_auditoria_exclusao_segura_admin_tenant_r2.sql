create or replace function public.excluir_auditoria_campo_segura(
    p_auditoria_id uuid,
    p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public, auth
as $function$
declare
    v_uid uuid :=
        auth.uid();

    v_motivo text :=
        btrim(
            coalesce(
                p_motivo,
                ''
            )
        );

    v_agora timestamptz :=
        clock_timestamp();

    v_numero_auditoria text;
    v_empresa_id uuid;
    v_tenant_id uuid;
    v_email_usuario text;
    v_last_sign_in_at timestamptz;

    v_admin_global boolean := false;
    v_admin_tenant boolean := false;
    v_acesso_legado boolean := false;
    v_acesso_empresa boolean := false;

    v_excluidos integer := 0;
begin
    if v_uid is null then
        raise exception
            'Usuário não autenticado. Faça login novamente antes de excluir auditorias.';
    end if;

    if p_auditoria_id is null then
        raise exception
            'Auditoria inválida para exclusão.';
    end if;

    if v_motivo = '' then
        raise exception
            'Informe o motivo da exclusão para manter a rastreabilidade.';
    end if;

    select
        auditoria.numero_auditoria,
        auditoria.empresa_id,
        empresa.tenant_id
    into
        v_numero_auditoria,
        v_empresa_id,
        v_tenant_id
    from public.auditorias_campo as auditoria
    left join public.empresas as empresa
        on empresa.id =
            auditoria.empresa_id
    where auditoria.id =
        p_auditoria_id
    for update of auditoria;

    if not found then
        raise exception
            'Auditoria não encontrada ou já excluída.';
    end if;

    v_admin_global :=
        public.usuario_admin_global();

    v_admin_tenant :=
        case
            when v_tenant_id is null
                then false
            else
                public.usuario_pode_gerenciar_tenant(
                    v_tenant_id
                )
        end;

    v_acesso_legado :=
        public.usuario_pode_acessar_auditoria();

    v_acesso_empresa :=
        case
            when v_empresa_id is null
                then false
            else
                public.usuario_pode_acessar_auditoria_campo_empresa(
                    v_empresa_id
                )
        end;

    if not (
        v_admin_global
        or v_admin_tenant
        or (
            v_acesso_legado
            and v_acesso_empresa
        )
    ) then
        raise exception
            'Seu usuário não possui permissão para excluir esta auditoria.';
    end if;

    select
        usuario.email,
        usuario.last_sign_in_at
    into
        v_email_usuario,
        v_last_sign_in_at
    from auth.users as usuario
    where usuario.id =
        v_uid;

    if not found then
        raise exception
            'Usuário autenticado não localizado.';
    end if;

    if
        v_last_sign_in_at is null
        or v_last_sign_in_at <
            (
                v_agora -
                interval '120 seconds'
            )
    then
        raise exception
            'Confirmação de senha expirada. Informe novamente a senha do usuário logado.';
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
        v_uid,
        v_email_usuario,
        'DELETE',
        'auditorias_campo',
        p_auditoria_id::text,
        concat(
            'Auditoria de campo excluída por ',
            coalesce(
                v_email_usuario,
                v_uid::text
            ),
            '. Auditoria: ',
            coalesce(
                v_numero_auditoria,
                p_auditoria_id::text
            ),
            '. Motivo: ',
            v_motivo,
            '.'
        ),
        jsonb_build_object(
            'auditoriaId',
            p_auditoria_id,
            'numeroAuditoria',
            v_numero_auditoria,
            'empresaId',
            v_empresa_id,
            'tenantId',
            v_tenant_id,
            'motivo',
            v_motivo,
            'usuarioId',
            v_uid,
            'usuarioEmail',
            v_email_usuario,
            'adminGlobal',
            v_admin_global,
            'adminTenant',
            v_admin_tenant,
            'acessoLegadoAuditoria',
            v_acesso_legado,
            'acessoEmpresa',
            v_acesso_empresa,
            'confirmadoPorReautenticacao',
            true,
            'excluidoEm',
            v_agora
        )
    );

    delete from public.auditorias_campo
    where id =
        p_auditoria_id;

    get diagnostics
        v_excluidos =
            row_count;

    if v_excluidos <> 1 then
        raise exception
            'Não foi possível concluir a exclusão da auditoria.';
    end if;

    return jsonb_build_object(
        'ok',
        true,
        'auditoria_id',
        p_auditoria_id,
        'numero_auditoria',
        v_numero_auditoria,
        'empresa_id',
        v_empresa_id,
        'tenant_id',
        v_tenant_id,
        'usuario_email',
        v_email_usuario,
        'excluido_em',
        v_agora
    );
end;
$function$;

revoke all
on function public.excluir_auditoria_campo_segura(uuid, text)
from public;

revoke all
on function public.excluir_auditoria_campo_segura(uuid, text)
from anon;

grant execute
on function public.excluir_auditoria_campo_segura(uuid, text)
to authenticated;