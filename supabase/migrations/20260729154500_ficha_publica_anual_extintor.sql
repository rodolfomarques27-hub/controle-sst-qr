-- Consulta pública, estritamente somente leitura, da ficha anual do extintor.
-- O token impresso no QR é a credencial de acesso ao registro específico.

create or replace function public.consultar_ficha_publica_extintor(
    p_token text
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
    select jsonb_build_object(
        'extintor', jsonb_build_object(
            'codigo', e.codigo,
            'localizacao', e.localizacao,
            'ponto', e.ponto_nome,
            'tipo', e.tipo,
            'capacidade', e.capacidade,
            'status', e.status,
            'situacao_operacional', e.situacao_operacional,
            'fabricante', e.fabricante,
            'numero_serie', e.numero_serie,
            'ultima_manutencao', e.ultima_manutencao,
            'proxima_manutencao', e.proxima_manutencao,
            'proximo_ensaio_hidrostatico', e.proximo_ensaio_hidrostatico,
            'atualizado_em', e.atualizado_em
        ),
        'inspecoes', coalesce((
            select jsonb_agg(
                jsonb_build_object(
                    'competencia', i.competencia,
                    'respostas', i.respostas,
                    'observacoes', i.observacoes,
                    'responsavel', i.responsavel,
                    'status', i.status,
                    'atualizado_em', i.atualizado_em
                )
                order by i.competencia desc, i.atualizado_em desc
            )
            from public.extintores_inspecoes i
            where i.extintor_id = e.id
        ), '[]'::jsonb)
    )
    from public.extintores e
    where e.token_publico = trim(p_token)
      and length(trim(p_token)) between 8 and 256
    limit 1;
$$;

revoke all privileges
on function public.consultar_ficha_publica_extintor(text)
from public;

grant execute
on function public.consultar_ficha_publica_extintor(text)
to anon, authenticated, service_role;

comment on function public.consultar_ficha_publica_extintor(text) is
'Retorna somente os dados técnicos e o histórico de inspeções do extintor identificado por token público.';
