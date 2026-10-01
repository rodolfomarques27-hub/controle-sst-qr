-- R2.10-B1-A0
-- Alinha o catálogo técnico ao Plano Base SafeScan homologado.
--
-- Plano Base técnico:
--   - nucleo_safescan
--   - treinamentos
--   - gestao_documental_sst
--
-- Esta migration:
--   1. torna treinamentos obrigatório e não contratável;
--   2. torna gestao_documental_sst obrigatório e não contratável;
--   3. preserva ambos ativos sem alterar a coluna ativo;
--   4. adiciona "obras" às telas do nucleo_safescan;
--   5. preserva todos os demais metadados.
--
-- Não altera tenant_modulos nem empresa_modulos.

begin;

do $$
declare
    v_total_base integer;
    v_nucleo_metadados jsonb;
begin
    select count(*)::integer
    into v_total_base
    from public.modulos_sistema
    where chave in (
        'treinamentos',
        'gestao_documental_sst'
    );

    if v_total_base <> 2 then
        raise exception
            'R2.10-B1-A0: catálogo Base incompleto. Esperados treinamentos e gestao_documental_sst.';
    end if;

    if exists (
        select 1
        from public.modulos_sistema
        where chave in (
            'treinamentos',
            'gestao_documental_sst'
        )
          and ativo is not true
    ) then
        raise exception
            'R2.10-B1-A0: treinamentos e gestao_documental_sst devem estar ativos antes do alinhamento.';
    end if;

    select metadados
    into v_nucleo_metadados
    from public.modulos_sistema
    where chave = 'nucleo_safescan';

    if not found then
        raise exception
            'R2.10-B1-A0: nucleo_safescan não localizado no catálogo.';
    end if;

    if jsonb_typeof(
        coalesce(
            v_nucleo_metadados,
            '{}'::jsonb
        )
    ) <> 'object' then
        raise exception
            'R2.10-B1-A0: metadados de nucleo_safescan não são objeto JSON.';
    end if;

    if jsonb_typeof(
        coalesce(
            v_nucleo_metadados -> 'telas',
            '[]'::jsonb
        )
    ) <> 'array' then
        raise exception
            'R2.10-B1-A0: metadados.telas de nucleo_safescan não é array.';
    end if;
end
$$;


update public.modulos_sistema
set
    obrigatorio = true,
    contratavel = false
where chave in (
    'treinamentos',
    'gestao_documental_sst'
);


update public.modulos_sistema
set metadados =
    case
        when coalesce(
            metadados -> 'telas',
            '[]'::jsonb
        ) @> '["obras"]'::jsonb
        then metadados

        else jsonb_set(
            coalesce(
                metadados,
                '{}'::jsonb
            ),
            '{telas}',
            coalesce(
                metadados -> 'telas',
                '[]'::jsonb
            ) || '["obras"]'::jsonb,
            true
        )
    end
where chave = 'nucleo_safescan';


do $$
declare
    v_obras_count integer;
begin
    if exists (
        select 1
        from public.modulos_sistema
        where chave in (
            'treinamentos',
            'gestao_documental_sst'
        )
          and (
              obrigatorio is not true
              or contratavel is not false
              or ativo is not true
          )
    ) then
        raise exception
            'R2.10-B1-A0: estado final inválido dos módulos Base.';
    end if;

    select count(*)::integer
    into v_obras_count
    from jsonb_array_elements_text(
        coalesce(
            (
                select metadados -> 'telas'
                from public.modulos_sistema
                where chave = 'nucleo_safescan'
            ),
            '[]'::jsonb
        )
    ) as tela(valor)
    where valor = 'obras';

    if v_obras_count <> 1 then
        raise exception
            'R2.10-B1-A0: tela obras deve existir exatamente uma vez no nucleo_safescan.';
    end if;
end
$$;

commit;