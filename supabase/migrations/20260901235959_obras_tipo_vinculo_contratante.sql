-- =====================================================================
-- SafeScan Brasil
-- OBRAS-REFATORACAO-001-A1
--
-- Separação semântica:
--   Contratante x Executora
--
-- Estratégia de compatibilidade:
--   1. não remove nenhum vínculo existente;
--   2. não remove colunas legadas;
--   3. todos os vínculos continuam em public.empresas_obras;
--   4. vínculos genéricos futuros permanecem Executora por padrão;
--   5. IDEALIZA CIDADES é reclassificada como Contratante nos vínculos
--      existentes;
--   6. somente uma Contratante ativa pode existir por obra;
--   7. fiscal_idealiza e tecnico_seguranca_idealiza são preservados;
--   8. novos campos genéricos recebem backfill dos campos legados.
-- =====================================================================

begin;


-- =====================================================================
-- 1. PRÉ-CONDIÇÕES
-- =====================================================================

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

    if to_regclass('public.empresas') is null then
        raise exception
            'Tabela obrigatória public.empresas não encontrada.';
    end if;
end;
$$;


-- =====================================================================
-- 2. CAMPOS GENÉRICOS DA CONTRATANTE NA OBRA
--
-- As colunas antigas são preservadas nesta fase.
-- =====================================================================

alter table public.obras
    add column if not exists fiscal_contratante text;

alter table public.obras
    add column if not exists tecnico_seguranca_contratante text;


comment on column public.obras.fiscal_contratante is
    'Fiscal responsável da empresa contratante da obra.';

comment on column public.obras.tecnico_seguranca_contratante is
    'Profissional de SST responsável pela empresa contratante da obra.';


-- Backfill sem apagar nem sobrescrever informação nova já existente.

update public.obras
set
    fiscal_contratante =
        nullif(
            trim(fiscal_idealiza),
            ''
        )
where
    coalesce(
        trim(fiscal_contratante),
        ''
    ) = ''
    and
    coalesce(
        trim(fiscal_idealiza),
        ''
    ) <> '';


update public.obras
set
    tecnico_seguranca_contratante =
        nullif(
            trim(tecnico_seguranca_idealiza),
            ''
        )
where
    coalesce(
        trim(tecnico_seguranca_contratante),
        ''
    ) = ''
    and
    coalesce(
        trim(tecnico_seguranca_idealiza),
        ''
    ) <> '';


-- =====================================================================
-- 3. PAPEL DO VÍNCULO EMPRESA/OBRA
-- =====================================================================

alter table public.empresas_obras
    add column if not exists tipo_vinculo text;


-- Primeiro classifica qualquer vínculo ainda sem papel como Executora.
-- Isso mantém compatibilidade com a semântica histórica.

update public.empresas_obras
set
    tipo_vinculo = 'Executora'
where
    tipo_vinculo is null
    or trim(tipo_vinculo) = '';


-- =====================================================================
-- 4. CLASSIFICAR IDEALIZA CIDADES COMO CONTRATANTE
--
-- A migration exige exatamente um cadastro com este nome.
-- Isso evita classificar silenciosamente a empresa errada.
-- =====================================================================

do $$
declare
    v_empresa_idealiza_id uuid;
    v_quantidade integer;
begin
    select
        count(*)
    into
        v_quantidade
    from public.empresas
    where
        upper(
            trim(nome)
        ) = 'IDEALIZA CIDADES';

    if v_quantidade <> 1 then
        raise exception
            'Esperado exatamente 1 cadastro IDEALIZA CIDADES; encontrados %.',
            v_quantidade;
    end if;


    select
        id
    into
        v_empresa_idealiza_id
    from public.empresas
    where
        upper(
            trim(nome)
        ) = 'IDEALIZA CIDADES';


    update public.empresas_obras
    set
        tipo_vinculo = 'Contratante'
    where
        empresa_id = v_empresa_idealiza_id;
end;
$$;


-- Qualquer outro valor inesperado permanece fail-closed como erro antes
-- de adicionarmos a constraint.

do $$
begin
    if exists (
        select 1
        from public.empresas_obras
        where
            tipo_vinculo not in (
                'Contratante',
                'Executora'
            )
            or tipo_vinculo is null
    ) then
        raise exception
            'Existem vínculos com tipo_vinculo inválido.';
    end if;
end;
$$;


-- =====================================================================
-- 5. DEFAULT + NOT NULL + CHECK
--
-- O default Executora garante compatibilidade temporária com a versão
-- atual de obrasService.js até a A2 ser implantada.
-- =====================================================================

alter table public.empresas_obras
    alter column tipo_vinculo
    set default 'Executora';

alter table public.empresas_obras
    alter column tipo_vinculo
    set not null;


do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where
            conname = 'empresas_obras_tipo_vinculo_check'
            and conrelid = 'public.empresas_obras'::regclass
    ) then
        alter table public.empresas_obras
            add constraint empresas_obras_tipo_vinculo_check
            check (
                tipo_vinculo in (
                    'Contratante',
                    'Executora'
                )
            );
    end if;
end;
$$;


comment on column public.empresas_obras.tipo_vinculo is
    'Papel da empresa na obra: Contratante ou Executora.';


-- =====================================================================
-- 6. GARANTIA: UMA ÚNICA CONTRATANTE ATIVA POR OBRA
-- =====================================================================

do $$
begin
    if exists (
        select
            obra_id
        from public.empresas_obras
        where
            tipo_vinculo = 'Contratante'
            and status = 'Ativa'
        group by
            obra_id
        having
            count(*) > 1
    ) then
        raise exception
            'Há obra com mais de uma Contratante ativa.';
    end if;
end;
$$;


create unique index if not exists
    empresas_obras_uma_contratante_ativa_por_obra_uidx
on public.empresas_obras (
    obra_id
)
where
    tipo_vinculo = 'Contratante'
    and status = 'Ativa';


create index if not exists
    empresas_obras_tipo_vinculo_idx
on public.empresas_obras (
    tipo_vinculo
);


-- =====================================================================
-- 7. VALIDAÇÕES PÓS-BACKFILL
-- =====================================================================

do $$
declare
    v_empresa_idealiza_id uuid;
begin
    select
        id
    into
        v_empresa_idealiza_id
    from public.empresas
    where
        upper(
            trim(nome)
        ) = 'IDEALIZA CIDADES';


    if exists (
        select 1
        from public.empresas_obras
        where
            empresa_id = v_empresa_idealiza_id
            and tipo_vinculo <> 'Contratante'
    ) then
        raise exception
            'Existe vínculo da IDEALIZA CIDADES que não foi classificado como Contratante.';
    end if;


    if exists (
        select 1
        from public.empresas_obras
        where
            empresa_id <> v_empresa_idealiza_id
            and tipo_vinculo <> 'Executora'
    ) then
        raise exception
            'Existe empresa diferente da IDEALIZA CIDADES classificada incorretamente.';
    end if;
end;
$$;


-- Garante novamente que não existe duplicidade ativa.

do $$
begin
    if exists (
        select
            obra_id
        from public.empresas_obras
        where
            tipo_vinculo = 'Contratante'
            and status = 'Ativa'
        group by
            obra_id
        having
            count(*) > 1
    ) then
        raise exception
            'Validação final falhou: mais de uma Contratante ativa na mesma obra.';
    end if;
end;
$$;


-- =====================================================================
-- 8. RELOAD DO SCHEMA
-- =====================================================================

notify pgrst, 'reload schema';


commit;
