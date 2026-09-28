create or replace function public.listar_modelos_email_sst_tenant(
    p_tenant_id uuid
)
returns table (
    tipo text,
    nome text,
    descricao text,
    assunto text,
    corpo text,
    remetente_nome text,
    ativo boolean,
    versao integer,
    atualizado_em timestamptz,
    atualizado_por uuid,
    assunto_padrao text,
    corpo_padrao text,
    remetente_nome_padrao text
)
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
begin
    if auth.uid() is null then
        raise exception
            'Autenticação obrigatória para consultar modelos de e-mail SST.'
            using errcode = '42501';
    end if;

    if p_tenant_id is null then
        raise exception
            'Tenant não informado.'
            using errcode = '22023';
    end if;

    if not public.usuario_tem_acesso_tenant(
        p_tenant_id
    ) then
        raise exception
            'Sem acesso ao tenant informado.'
            using errcode = '42501';
    end if;

    return query
    select
        modelo.tipo,
        modelo.nome,
        modelo.descricao,
        modelo.assunto,
        modelo.corpo,
        modelo.remetente_nome,
        modelo.ativo,
        modelo.versao,
        modelo.atualizado_em,
        modelo.atualizado_por,
        modelo.assunto_padrao,
        modelo.corpo_padrao,
        modelo.remetente_nome_padrao
    from public.modelos_email_sst modelo
    where
        modelo.tipo <> 'acesso_usuario_criado'
        and (
            (
                public.tenant_tem_modulo(
                    p_tenant_id,
                    'gestao_documental_sst'
                )
                and modelo.tipo in (
                    'alerta_documento_colaborador',
                    'alerta_documento_empresa',
                    'alerta_documentos_lote'
                )
            )
            or
            (
                public.tenant_tem_modulo(
                    p_tenant_id,
                    'treinamentos'
                )
                and modelo.tipo =
                    'alerta_treinamentos'
            )
            or
            (
                public.tenant_tem_modulo(
                    p_tenant_id,
                    'auditoria_campo'
                )
                and modelo.tipo =
                    'alerta_auditoria'
            )
        )
    order by
        case modelo.tipo
            when 'alerta_documento_colaborador'
                then 1
            when 'alerta_documento_empresa'
                then 2
            when 'alerta_documentos_lote'
                then 3
            when 'alerta_treinamentos'
                then 4
            when 'alerta_auditoria'
                then 5
            else 99
        end,
        modelo.tipo;
end;
$function$;

revoke all
on function public.listar_modelos_email_sst_tenant(uuid)
from public;

revoke all
on function public.listar_modelos_email_sst_tenant(uuid)
from anon;

grant execute
on function public.listar_modelos_email_sst_tenant(uuid)
to authenticated;
