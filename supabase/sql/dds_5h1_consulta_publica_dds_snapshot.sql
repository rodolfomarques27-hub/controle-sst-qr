-- DDS 5H.1 - Consulta pública do DDS com snapshot completo
-- SafeScan Brasil / controle-sst-qr
-- Aplicado manualmente no Supabase em 2026-07-06.
--
-- Objetivo:
-- - fazer o QR público retornar o campo dados;
-- - expor temas, recados, orientações, aniversariantes e participantes;
-- - manter compatibilidade com registros antigos.

create or replace function public.consulta_publica_dds(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to public
as $$
declare
    v_token text;
    v_registro record;
    v_dados jsonb;
begin
    v_token := trim(coalesce(p_token, ''));

    if v_token = '' then
        return jsonb_build_object(
            'ok', false,
            'mensagem', 'Token do DDS nao informado.'
        );
    end if;

    select
        d.id,
        d.codigo,
        d.token_publico,
        coalesce(e.nome, d.empresa_nome) as empresa_nome,
        coalesce(o.nome, d.obra_nome) as obra_nome,
        d.periodo_inicio,
        d.periodo_fim,
        d.responsavel_nome,
        d.fiscal_idealiza,
        d.lider_encarregado,
        coalesce(d.dados, '{}'::jsonb) as dados,
        d.status,
        d.created_at,
        d.updated_at
    into v_registro
    from public.dds_registros d
    left join public.empresas e on e.id = d.empresa_id
    left join public.obras o on o.id = d.obra_id
    where trim(coalesce(d.token_publico, '')) = v_token
    limit 1;

    if not found then
        return jsonb_build_object(
            'ok', false,
            'mensagem', 'DDS nao localizado ou token invalido.'
        );
    end if;

    if coalesce(v_registro.status, '') <> 'Ativo' then
        return jsonb_build_object(
            'ok', false,
            'mensagem', 'DDS inativo ou cancelado.',
            'status', v_registro.status
        );
    end if;

    v_dados := coalesce(v_registro.dados, '{}'::jsonb);

    return jsonb_build_object(
        'ok', true,
        'tipo', 'dds',
        'codigo', v_registro.codigo,
        'empresa', v_registro.empresa_nome,
        'obra', v_registro.obra_nome,
        'periodoInicio', to_char(v_registro.periodo_inicio, 'YYYY-MM-DD'),
        'periodoFim', to_char(v_registro.periodo_fim, 'YYYY-MM-DD'),
        'responsavel', v_registro.responsavel_nome,
        'fiscalIdealiza', v_registro.fiscal_idealiza,
        'liderEncarregado', v_registro.lider_encarregado,
        'status', v_registro.status,
        'geradoEm', v_registro.created_at,
        'atualizadoEm', v_registro.updated_at,

        'dados', v_dados,

        'diasSemana',
            case
                when jsonb_typeof(v_dados -> 'diasSemana') = 'array'
                    then v_dados -> 'diasSemana'
                else '[]'::jsonb
            end,

        'recadosSemana',
            coalesce(
                v_dados ->> 'recadosSemana',
                v_dados ->> 'recados',
                ''
            ),

        'orientacoesImportantes',
            case
                when jsonb_typeof(v_dados -> 'orientacoesImportantes') = 'array'
                    then v_dados -> 'orientacoesImportantes'
                else '[]'::jsonb
            end,

        'aniversariantesSemana',
            case
                when jsonb_typeof(v_dados -> 'aniversariantesSemana') = 'array'
                    then v_dados -> 'aniversariantesSemana'
                else '[]'::jsonb
            end,

        'participantes',
            case
                when jsonb_typeof(v_dados -> 'participantes') = 'array'
                    then v_dados -> 'participantes'
                else '[]'::jsonb
            end,

        'totalParticipantes',
            coalesce(
                nullif(v_dados ->> 'totalParticipantes', '')::integer,
                case
                    when jsonb_typeof(v_dados -> 'participantes') = 'array'
                        then jsonb_array_length(v_dados -> 'participantes')
                    else 0
                end
            ),

        'totalFolhas',
            coalesce(
                nullif(v_dados ->> 'totalFolhas', '')::integer,
                1
            ),

        'turno', coalesce(v_dados ->> 'turno', ''),
        'funcaoResponsavel', coalesce(v_dados ->> 'funcaoResponsavel', ''),
        'resumoSemana', coalesce(v_dados ->> 'resumoSemana', ''),

        'autenticidade', jsonb_build_object(
            'status', 'Documento localizado',
            'mensagem', 'DDS conferido na base SafeScan Brasil.',
            'conferidoEm', now()
        )
    );
end;
$$;

revoke all on function public.consulta_publica_dds(text) from public;
grant execute on function public.consulta_publica_dds(text) to anon, authenticated;

notify pgrst, 'reload schema';