
create table if not exists public.mapas_obras (
    id uuid primary key default gen_random_uuid(),
    empresa_id uuid not null references public.empresas(id),
    obra_id uuid not null references public.obras(id),
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
    constraint mapas_obras_empresa_obra_nome_unique unique (empresa_id, obra_id, nome)
);

create table if not exists public.mapas_pontos (
    id uuid primary key default gen_random_uuid(),
    mapa_id uuid not null references public.mapas_obras(id) on delete cascade,
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

create index if not exists mapas_obras_empresa_obra_idx on public.mapas_obras (empresa_id, obra_id);
create index if not exists mapas_pontos_mapa_idx on public.mapas_pontos (mapa_id);
create index if not exists mapas_pontos_token_publico_idx on public.mapas_pontos (token_publico);
create index if not exists mapas_itens_ponto_idx on public.mapas_itens (ponto_id);

alter table public.mapas_obras enable row level security;
alter table public.mapas_pontos enable row level security;
alter table public.mapas_itens enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mapas-obras', 'mapas-obras', false, 8388608, array['image/png', 'image/jpeg'])
on conflict (id) do update
set public = false,
    file_size_limit = 8388608,
    allowed_mime_types = array['image/png', 'image/jpeg'];
;
