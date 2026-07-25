-- SafeScan Brasil
-- Permite que as datas documentais sejam confirmadas após a análise do arquivo.
-- Nenhuma data de upload deve ser usada como emissão, revisão ou vencimento.

begin;

do $$
begin
    if to_regclass('public.documentos_empresas') is null then
        raise exception
            'Tabela public.documentos_empresas não localizada.';
    end if;
end
$$;

alter table public.documentos_empresas
    alter column data_emissao drop not null,
    alter column data_vencimento drop not null;

commit;