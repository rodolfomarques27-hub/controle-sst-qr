do $patch$
declare
    v_definicao text;
begin
    select pg_get_functiondef(
        'public.resumo_storage_sst_tenant(uuid)'::regprocedure
    )
    into v_definicao;

    if position(
        '#variable_conflict use_column'
        in v_definicao
    ) = 0 then
        v_definicao := replace(
            v_definicao,
            E'AS $function$\\nbegin',
            E'AS $function$\\n#variable_conflict use_column\\nbegin'
        );

        if position(
            '#variable_conflict use_column'
            in v_definicao
        ) = 0 then
            raise exception
                'Não foi possível inserir a diretiva de conflito em resumo_storage_sst_tenant(uuid).';
        end if;

        execute v_definicao;
    end if;
end;
$patch$;
