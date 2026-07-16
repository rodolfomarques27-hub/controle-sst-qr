-- SafeScan Brasil - Mapa Interativo da Obra
-- PROPOSTA DE MIGRATION. Nao executar automaticamente.
-- Antes da aplicacao, revisar os tipos reais de empresas.id, obras.id e a regra de tenant/RLS.

create table if not exists public.mapas_obras (
    id uuid primary key default gen_random_uuid(),
    empresa_id uuid null,
    obra_id uuid not null,
    nome text not null,
    descricao text,
    imagem_path text,
    imagem_tipo text,
    largura_original integer,
    altura_original integer,
    status text not null default 'Ativo',
    criado_por uuid references auth.users(id),
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now(),
    constraint mapas_obras_status_check check (status in ('Ativo', 'Inativo')),
    constraint mapas_obras_obra_nome_unique unique (obra_id, nome)
);

create table if not exists public.mapas_pontos (
    id uuid primary key default gen_random_uuid(),
    mapa_id uuid not null references public.mapas_obras(id) on delete cascade,
    empresa_id uuid references public.empresas(id) on delete set null,
    nome text not null,
    tipo text not null default 'Outro ponto',
    descricao text,
    posicao_x numeric(6,2) not null default 50,
    posicao_y numeric(6,2) not null default 50,
    icone text not null default 'map-pin',
    cor text not null default '#2563eb',
    status text not null default 'Ativo',
    token_publico text not null unique default gen_random_uuid()::text,
    planta_detalhada_path text,
    criado_por uuid references auth.users(id),
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now(),
    constraint mapas_pontos_x_check check (posicao_x >= 0 and posicao_x <= 100),
    constraint mapas_pontos_y_check check (posicao_y >= 0 and posicao_y <= 100),
    constraint mapas_pontos_status_check check (status in ('Ativo', 'Inativo'))
);

create table if not exists public.mapas_itens (
    id uuid primary key default gen_random_uuid(),
    ponto_id uuid not null references public.mapas_pontos(id) on delete cascade,
    extintor_id uuid,
    nome text not null,
    tipo text not null default 'Outro item',
    descricao text,
    posicao_x numeric(6,2) not null default 50,
    posicao_y numeric(6,2) not null default 50,
    icone text not null default 'circle-dot',
    cor text not null default '#dc2626',
    status text not null default 'Ativo',
    numero_identificacao text,
    data_inspecao date,
    proxima_inspecao date,
    data_validade date,
    observacao text,
    criado_por uuid references auth.users(id),
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now(),
    constraint mapas_itens_x_check check (posicao_x >= 0 and posicao_x <= 100),
    constraint mapas_itens_y_check check (posicao_y >= 0 and posicao_y <= 100),
    constraint mapas_itens_status_check check (status in ('Ativo', 'Inativo'))
);

create index if not exists mapas_obras_obra_idx on public.mapas_obras (obra_id);
create index if not exists mapas_pontos_empresa_idx on public.mapas_pontos (empresa_id);
create index if not exists mapas_pontos_mapa_idx on public.mapas_pontos (mapa_id);
create index if not exists mapas_pontos_token_publico_idx on public.mapas_pontos (token_publico);
create index if not exists mapas_itens_ponto_idx on public.mapas_itens (ponto_id);

-- Consulta publica do QR Code: implementar em Edge Function ou em schema
-- nao exposto. Nao criar SECURITY DEFINER em public sem revisar RLS,
-- auth.uid(), validacao do token e retorno de imagens assinadas.
-- O servico da aplicacao ja reserva o contrato:
-- consulta_publica_ponto_mapa(token_param text).

-- RLS e policies devem ser definidos apos confirmar como o sistema relaciona
-- auth.uid() ao empresa_id e ao vinculo empresa/obra.
-- Nao liberar select publico diretamente nas tabelas. A consulta por token
-- deve usar uma RPC/Edge Function que retorne somente campos autorizados.
-- Imagens devem ser entregues por URL assinada ou bucket publico controlado;
-- nao expor imagem_path/planta_detalhada_path diretamente nesta RPC.
