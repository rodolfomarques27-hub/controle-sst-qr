-- SafeScan Brasil - Mapa Interativo da Obra
-- Acrescenta persistência integral do estado visual por snapshot JSON.
-- Não substitui as tabelas normalizadas de pontos e itens.
-- Imagens permanecem no bucket privado mapas-obras.

begin;

do $$
begin
    if to_regclass('public.obras') is null then
        raise exception
            'Tabela obrigatória public.obras não encontrada.';
    end if;

    if to_regclass('public.empresas_obras') is null then
        raise exception
            'Tabela obrigatória public.empresas_obras não encontrada.';
    end if;

    if to_regclass('public.mapas_obras') is null then
        raise exception
            'Tabela obrigatória public.mapas_obras não encontrada.';
    end if;
end;
$$;

alter table public.mapas_obras
    add column if not exists snapshot jsonb
        not null
        default '{}'::jsonb;

alter table public.mapas_obras
    add column if not exists snapshot_versao integer
        not null
        default 1;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.mapas_obras'::regclass
          and conname = 'mapas_obras_snapshot_objeto_check'
    ) then
        alter table public.mapas_obras
            add constraint mapas_obras_snapshot_objeto_check
            check (jsonb_typeof(snapshot) = 'object');
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.mapas_obras'::regclass
          and conname = 'mapas_obras_snapshot_versao_check'
    ) then
        alter table public.mapas_obras
            add constraint mapas_obras_snapshot_versao_check
            check (snapshot_versao >= 1);
    end if;
end;
$$;

comment on column public.mapas_obras.snapshot is
'Estado integral do mapa da obra: pontos, alertas, ambientes, vínculos, posições e metadados visuais. Não armazenar Data URLs ou arquivos binários.';

comment on column public.mapas_obras.snapshot_versao is
'Versão do contrato JSON utilizado no campo snapshot.';

notify pgrst, 'reload schema';

commit;
