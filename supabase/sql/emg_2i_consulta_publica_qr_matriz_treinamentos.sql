-- EMG.2I
-- Atualiza a consulta publica do QR para devolver treinamentos removidos/adicionais.
-- Necessario para o QR respeitar exclusoes da matriz do colaborador.

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
                'treinamentosRemovidos', coalesce(to_jsonb(c.treinamentos_removidos), '[]'::jsonb),
                'treinamentosAdicionais', coalesce(to_jsonb(c.treinamentos_adicionais), '[]'::jsonb),
                'treinamentos_removidos', coalesce(to_jsonb(c.treinamentos_removidos), '[]'::jsonb),
                'treinamentos_adicionais', coalesce(to_jsonb(c.treinamentos_adicionais), '[]'::jsonb),
                'contatoEmergenciaDisponivel',
                    nullif(trim(coalesce(c.contato_emergencia_telefone, '')), '') is not null,
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

revoke all on function public.consulta_publica_qr(text) from public;
grant execute on function public.consulta_publica_qr(text) to anon, authenticated;

notify pgrst, 'reload schema';
