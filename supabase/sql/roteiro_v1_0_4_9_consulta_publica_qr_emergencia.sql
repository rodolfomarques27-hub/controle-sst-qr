-- Roteiro v1.0.4.9
-- Atualiza consulta pública do QR do colaborador para incluir contato de emergência.
-- CPF continua oculto na consulta pública.

CREATE OR REPLACE FUNCTION public.consulta_publica_qr(token_param text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
                        when ep.nome is not null then ep.nome || ' / Subcontratada: ' || coalesce(e.nome, 'Empresa não informada')
                        else coalesce(e.nome, 'Empresa não informada')
                    end,
                'token', c.token_qr,
                'matriculaEsocial', c.matricula_esocial,
                'contatoEmergenciaNome', c.contato_emergencia_nome,
                'contatoEmergenciaParentesco', c.contato_emergencia_parentesco,
                'contatoEmergenciaTelefone', c.contato_emergencia_telefone
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
                'detalhe', 'Consulta pública de documentos SST.'
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
        coalesce('Consulta pública QR: ' || colaborador_nome, 'Consulta pública QR sem colaborador localizado'),
        jsonb_build_object(
            'token', token_param,
            'colaborador_id', colaborador_id_encontrado
        )
    );

    return resultado;
end;
$function$;
