begin;

do $preflight$
begin
    if to_regprocedure(
        'public.consolidar_itens_automaticos_certidao_mensal(uuid,jsonb)'
    ) is null then
        raise exception
            'RPC de consolidação não localizada.';
    end if;

    if to_regprocedure(
        'public.fechar_competencia_certidao_mensal(uuid)'
    ) is null then
        raise exception
            'RPC de fechamento não localizada.';
    end if;

    if to_regprocedure(
        'public.reabrir_competencia_certidao_mensal(uuid,text)'
    ) is null then
        raise exception
            'RPC de reabertura não localizada.';
    end if;

    if to_regprocedure(
        'public.listar_historico_anual_certidao_mensal(uuid,integer)'
    ) is null then
        raise exception
            'RPC de histórico anual não localizada.';
    end if;
end;
$preflight$;

revoke all on function
    public.consolidar_itens_automaticos_certidao_mensal(
        uuid,
        jsonb
    )
from public;

revoke all on function
    public.consolidar_itens_automaticos_certidao_mensal(
        uuid,
        jsonb
    )
from anon;

revoke all on function
    public.fechar_competencia_certidao_mensal(
        uuid
    )
from public;

revoke all on function
    public.fechar_competencia_certidao_mensal(
        uuid
    )
from anon;

revoke all on function
    public.reabrir_competencia_certidao_mensal(
        uuid,
        text
    )
from public;

revoke all on function
    public.reabrir_competencia_certidao_mensal(
        uuid,
        text
    )
from anon;

revoke all on function
    public.listar_historico_anual_certidao_mensal(
        uuid,
        integer
    )
from public;

revoke all on function
    public.listar_historico_anual_certidao_mensal(
        uuid,
        integer
    )
from anon;

grant execute on function
    public.consolidar_itens_automaticos_certidao_mensal(
        uuid,
        jsonb
    )
to authenticated;

grant execute on function
    public.consolidar_itens_automaticos_certidao_mensal(
        uuid,
        jsonb
    )
to service_role;

grant execute on function
    public.fechar_competencia_certidao_mensal(
        uuid
    )
to authenticated;

grant execute on function
    public.fechar_competencia_certidao_mensal(
        uuid
    )
to service_role;

grant execute on function
    public.reabrir_competencia_certidao_mensal(
        uuid,
        text
    )
to authenticated;

grant execute on function
    public.reabrir_competencia_certidao_mensal(
        uuid,
        text
    )
to service_role;

grant execute on function
    public.listar_historico_anual_certidao_mensal(
        uuid,
        integer
    )
to authenticated;

grant execute on function
    public.listar_historico_anual_certidao_mensal(
        uuid,
        integer
    )
to service_role;

do $validacao$
begin
    if has_function_privilege(
        'anon',
        'public.consolidar_itens_automaticos_certidao_mensal(uuid,jsonb)',
        'EXECUTE'
    ) then
        raise exception
            'Anon ainda possui acesso à consolidação.';
    end if;

    if has_function_privilege(
        'anon',
        'public.fechar_competencia_certidao_mensal(uuid)',
        'EXECUTE'
    ) then
        raise exception
            'Anon ainda possui acesso ao fechamento.';
    end if;

    if has_function_privilege(
        'anon',
        'public.reabrir_competencia_certidao_mensal(uuid,text)',
        'EXECUTE'
    ) then
        raise exception
            'Anon ainda possui acesso à reabertura.';
    end if;

    if has_function_privilege(
        'anon',
        'public.listar_historico_anual_certidao_mensal(uuid,integer)',
        'EXECUTE'
    ) then
        raise exception
            'Anon ainda possui acesso ao histórico anual.';
    end if;

    if not has_function_privilege(
        'authenticated',
        'public.consolidar_itens_automaticos_certidao_mensal(uuid,jsonb)',
        'EXECUTE'
    ) then
        raise exception
            'Authenticated perdeu acesso à consolidação.';
    end if;

    if not has_function_privilege(
        'authenticated',
        'public.fechar_competencia_certidao_mensal(uuid)',
        'EXECUTE'
    ) then
        raise exception
            'Authenticated perdeu acesso ao fechamento.';
    end if;

    if not has_function_privilege(
        'authenticated',
        'public.reabrir_competencia_certidao_mensal(uuid,text)',
        'EXECUTE'
    ) then
        raise exception
            'Authenticated perdeu acesso à reabertura.';
    end if;

    if not has_function_privilege(
        'authenticated',
        'public.listar_historico_anual_certidao_mensal(uuid,integer)',
        'EXECUTE'
    ) then
        raise exception
            'Authenticated perdeu acesso ao histórico anual.';
    end if;
end;
$validacao$;

notify pgrst, 'reload schema';

commit;
