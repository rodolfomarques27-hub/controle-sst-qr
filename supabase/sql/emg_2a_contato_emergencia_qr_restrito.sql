-- EMG.2A - contato de emergencia QR restrito por senha/PIN da empresa
-- SafeScan Brasil / controle-sst-qr

create extension if not exists pgcrypto with schema extensions;

alter table public.empresas
    add column if not exists emergencia_qr_ativo boolean not null default false,
    add column if not exists senha_emergencia_qr_hash text,
    add column if not exists senha_emergencia_qr_atualizada_em timestamp with time zone;

comment on column public.empresas.emergencia_qr_ativo is
'Ativa a liberacao do contato de emergencia do colaborador via QR publico mediante senha/PIN da empresa.';

comment on column public.empresas.senha_emergencia_qr_hash is
'Hash da senha/PIN de emergencia da empresa. Nao armazenar senha em texto puro.';

comment on column public.empresas.senha_emergencia_qr_atualizada_em is
'Data/hora da ultima atualizacao da senha/PIN de emergencia da empresa.';

create or replace function public.definir_senha_emergencia_empresa(
    p_empresa_id uuid,
    p_senha text,
    p_ativo boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path to public
as $function$
declare
    v_senha text;
begin
    if auth.uid() is null then
        return jsonb_build_object(
            'ok', false,
            'mensagem', 'Usuario autenticado obrigatorio para configurar senha de emergencia.'
        );
    end if;

    if p_empresa_id is null then
        return jsonb_build_object(
            'ok', false,
            'mensagem', 'Empresa nao informada.'
        );
    end if;

    v_senha := trim(coalesce(p_senha, ''));

    if coalesce(p_ativo, true) is true and length(v_senha) < 4 then
        return jsonb_build_object(
            'ok', false,
            'mensagem', 'Informe uma senha/PIN com pelo menos 4 caracteres.'
        );
    end if;

    update public.empresas
       set emergencia_qr_ativo = coalesce(p_ativo, true),
           senha_emergencia_qr_hash = case
               when coalesce(p_ativo, true) is true then extensions.crypt(v_senha, extensions.gen_salt('bf'))
               else null
           end,
           senha_emergencia_qr_atualizada_em = now()
     where id = p_empresa_id;

    if not found then
        return jsonb_build_object(
            'ok', false,
            'mensagem', 'Empresa nao encontrada.'
        );
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
        auth.uid(),
        auth.email(),
        case when coalesce(p_ativo, true) is true then 'CONFIG_EMERGENCIA_QR' else 'DESATIVAR_EMERGENCIA_QR' end,
        'empresas',
        p_empresa_id::text,
        case when coalesce(p_ativo, true) is true
            then 'Configurou senha/PIN de emergencia QR da empresa'
            else 'Desativou emergencia QR da empresa'
        end,
        jsonb_build_object(
            'empresa_id', p_empresa_id,
            'emergencia_qr_ativo', coalesce(p_ativo, true)
        )
    );

    return jsonb_build_object(
        'ok', true,
        'mensagem', case when coalesce(p_ativo, true) is true
            then 'Senha/PIN de emergencia configurada.'
            else 'Emergencia QR desativada.'
        end
    );
end;
$function$;

create or replace function public.validar_contato_emergencia_qr(
    p_token text,
    p_senha text
)
returns jsonb
language plpgsql
security definer
set search_path to public
as $function$
declare
    v_token text;
    v_senha text;
    v_colaborador record;
    v_senha_valida boolean := false;
begin
    v_token := trim(coalesce(p_token, ''));
    v_senha := trim(coalesce(p_senha, ''));

    if v_token = '' then
        return jsonb_build_object(
            'ok', false,
            'autorizado', false,
            'mensagem', 'Token do QR nao informado.'
        );
    end if;

    select
        c.id as colaborador_id,
        c.nome as colaborador_nome,
        c.token_qr,
        c.contato_emergencia_nome,
        c.contato_emergencia_parentesco,
        c.contato_emergencia_telefone,
        e.id as empresa_id,
        e.nome as empresa_nome,
        coalesce(e.emergencia_qr_ativo, false) as emergencia_qr_ativo,
        e.senha_emergencia_qr_hash
    into v_colaborador
    from public.colaboradores c
    left join public.empresas e on e.id = c.empresa_id
    where trim(coalesce(c.token_qr, '')) = v_token
    limit 1;

    if not found then
        return jsonb_build_object(
            'ok', false,
            'autorizado', false,
            'mensagem', 'QR do colaborador nao localizado.'
        );
    end if;

    if nullif(trim(coalesce(v_colaborador.contato_emergencia_telefone, '')), '') is null then
        return jsonb_build_object(
            'ok', false,
            'autorizado', false,
            'mensagem', 'Contato de emergencia nao cadastrado para este colaborador.'
        );
    end if;

    if coalesce(v_colaborador.emergencia_qr_ativo, false) is not true
       or nullif(trim(coalesce(v_colaborador.senha_emergencia_qr_hash, '')), '') is null then

        insert into public.auditoria_sistema (
            acao,
            tabela,
            registro_id,
            descricao,
            dados
        )
        values (
            'ACESSO_CONTATO_EMERGENCIA_QR_BLOQUEADO',
            'colaboradores',
            v_colaborador.colaborador_id::text,
            'Tentativa de acesso ao contato de emergencia QR sem configuracao ativa',
            jsonb_build_object(
                'token', v_token,
                'colaborador_id', v_colaborador.colaborador_id,
                'empresa_id', v_colaborador.empresa_id,
                'motivo', 'emergencia_qr_inativa_ou_sem_senha'
            )
        );

        return jsonb_build_object(
            'ok', false,
            'autorizado', false,
            'mensagem', 'Contato de emergencia restrito. Senha/PIN da empresa ainda nao configurada.'
        );
    end if;

    v_senha_valida := v_colaborador.senha_emergencia_qr_hash = extensions.crypt(v_senha, v_colaborador.senha_emergencia_qr_hash);

    if v_senha_valida is not true then
        insert into public.auditoria_sistema (
            acao,
            tabela,
            registro_id,
            descricao,
            dados
        )
        values (
            'ACESSO_CONTATO_EMERGENCIA_QR_NEGADO',
            'colaboradores',
            v_colaborador.colaborador_id::text,
            'Senha/PIN invalida no acesso ao contato de emergencia QR',
            jsonb_build_object(
                'token', v_token,
                'colaborador_id', v_colaborador.colaborador_id,
                'empresa_id', v_colaborador.empresa_id
            )
        );

        return jsonb_build_object(
            'ok', false,
            'autorizado', false,
            'mensagem', 'Senha/PIN de emergencia invalida.'
        );
    end if;

    insert into public.auditoria_sistema (
        acao,
        tabela,
        registro_id,
        descricao,
        dados
    )
    values (
        'ACESSO_CONTATO_EMERGENCIA_QR_LIBERADO',
        'colaboradores',
        v_colaborador.colaborador_id::text,
        'Contato de emergencia QR liberado mediante senha/PIN da empresa',
        jsonb_build_object(
            'token', v_token,
            'colaborador_id', v_colaborador.colaborador_id,
            'empresa_id', v_colaborador.empresa_id
        )
    );

    return jsonb_build_object(
        'ok', true,
        'autorizado', true,
        'mensagem', 'Contato de emergencia liberado.',
        'contatoEmergencia', jsonb_build_object(
            'nome', v_colaborador.contato_emergencia_nome,
            'parentesco', v_colaborador.contato_emergencia_parentesco,
            'telefone', v_colaborador.contato_emergencia_telefone
        )
    );
end;
$function$;

create or replace function public.consulta_publica_qr(token_param text)
returns jsonb
language plpgsql
security definer
set search_path to public
as $function$
declare
    resultado jsonb;
    colaborador_nome text;
    colaborador_id_encontrado uuid;
begin
    select
        c.id,
        c.nome,
        jsonb_build_object(
            'colaborador', jsonb_build_object(
                'id', c.id,
                'nome', c.nome,
                'funcao', c.funcao,
                'codigoFuncionario', c.codigo_funcionario,
                'statusMobilizacao', coalesce(c.status_mobilizacao, 'Mobilizado'),
                'fotoUrl', c.foto_url,
                'empresa',
                    case
                        when ep.nome is not null then ep.nome || ' / Subcontratada: ' || coalesce(e.nome, 'Empresa nao informada')
                        else coalesce(e.nome, 'Empresa nao informada')
                    end,
                'token', c.token_qr,
                'matriculaEsocial', c.matricula_esocial,
                'contatoEmergenciaDisponivel',
                    (
                        nullif(trim(coalesce(c.contato_emergencia_telefone, '')), '') is not null
                        and coalesce(e.emergencia_qr_ativo, false) is true
                        and nullif(trim(coalesce(e.senha_emergencia_qr_hash, '')), '') is not null
                    ),
                'contatoEmergenciaRestrito', true
            ),
            'treinamentos', coalesce((
                select jsonb_agg(
                    jsonb_build_object(
                        'id', cert.id,
                        'treinamentoId', coalesce(cert.treinamento_codigo, 0),
                        'nomeTreinamento', coalesce(cert.nome_treinamento, cert.tipo_treinamento, ''),
                        'realizado', cert.data_realizacao,
                        'vencimento', cert.data_vencimento
                    )
                    order by cert.data_vencimento asc
                )
                from public.certificados cert
                where cert.colaborador_id = c.id
            ), '[]'::jsonb),
            'statusGeral', jsonb_build_object(
                'texto', 'Consulta SST',
                'classe', 'bg-slate-950 text-white',
                'detalhe', 'Consulta publica de documentos SST.'
            )
        )
    into colaborador_id_encontrado, colaborador_nome, resultado
    from public.colaboradores c
    left join public.empresas e on e.id = c.empresa_id
    left join public.empresas ep on ep.id = e.empresa_pai_id
    where c.token_qr = token_param
    limit 1;

    insert into public.auditoria_sistema (
        acao,
        tabela,
        registro_id,
        descricao,
        dados
    )
    values (
        'ACESSO_QR_PUBLICO',
        'consulta_publica_qr',
        colaborador_id_encontrado::text,
        coalesce('Consulta publica QR: ' || colaborador_nome, 'Consulta publica QR sem colaborador localizado'),
        jsonb_build_object(
            'token', token_param,
            'colaborador_id', colaborador_id_encontrado
        )
    );

    return resultado;
end;
$function$;

revoke all on function public.definir_senha_emergencia_empresa(uuid, text, boolean) from public;
revoke all on function public.validar_contato_emergencia_qr(text, text) from public;
revoke all on function public.consulta_publica_qr(text) from public;

grant execute on function public.definir_senha_emergencia_empresa(uuid, text, boolean) to authenticated;
grant execute on function public.validar_contato_emergencia_qr(text, text) to anon, authenticated;
grant execute on function public.consulta_publica_qr(text) to anon, authenticated;
