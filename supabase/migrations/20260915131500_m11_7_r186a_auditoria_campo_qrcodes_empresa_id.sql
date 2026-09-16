begin;

alter table public.auditoria_campo_qrcodes
    add column if not exists empresa_id uuid;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'auditoria_campo_qrcodes_empresa_id_fkey'
          and conrelid = 'public.auditoria_campo_qrcodes'::regclass
    ) then
        alter table public.auditoria_campo_qrcodes
            add constraint auditoria_campo_qrcodes_empresa_id_fkey
            foreign key (empresa_id)
            references public.empresas(id)
            on delete set null
            not valid;
    end if;
end
$$;

alter table public.auditoria_campo_qrcodes
    validate constraint auditoria_campo_qrcodes_empresa_id_fkey;

create index if not exists auditoria_campo_qrcodes_empresa_id_idx
    on public.auditoria_campo_qrcodes (empresa_id);

comment on column public.auditoria_campo_qrcodes.empresa_id is
    'Empresa estrutural responsável pelo QR Code de campo. A empresa_responsavel textual permanece apenas para compatibilidade e apresentação.';

with empresas_nome_unico as (
    select
        lower(btrim(e.nome)) as nome_normalizado,
        (array_agg(e.id order by e.id::text))[1] as empresa_id
    from public.empresas e
    where nullif(btrim(e.nome), '') is not null
    group by lower(btrim(e.nome))
    having count(*) = 1
)
update public.auditoria_campo_qrcodes q
set empresa_id = u.empresa_id
from empresas_nome_unico u
where q.empresa_id is null
  and nullif(btrim(q.empresa_responsavel), '') is not null
  and lower(btrim(q.empresa_responsavel)) = u.nome_normalizado;

do $$
declare
    v_ativos_sem_empresa bigint;
begin
    select count(*)
      into v_ativos_sem_empresa
    from public.auditoria_campo_qrcodes
    where ativo = true
      and empresa_id is null;

    if v_ativos_sem_empresa > 0 then
        raise exception
            'M11.7-R186A bloqueado: existem % QR Codes ativos sem empresa_id estrutural após o backfill seguro.',
            v_ativos_sem_empresa;
    end if;
end
$$;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'auditoria_campo_qrcodes_ativos_exigem_empresa'
          and conrelid = 'public.auditoria_campo_qrcodes'::regclass
    ) then
        alter table public.auditoria_campo_qrcodes
            add constraint auditoria_campo_qrcodes_ativos_exigem_empresa
            check (
                ativo = false
                or empresa_id is not null
            )
            not valid;
    end if;
end
$$;

alter table public.auditoria_campo_qrcodes
    validate constraint auditoria_campo_qrcodes_ativos_exigem_empresa;

alter table public.auditoria_campo_qrcodes
    enable row level security;

drop policy if exists auditoria_campo_qrcodes_insert_authenticated
    on public.auditoria_campo_qrcodes;

drop policy if exists auditoria_campo_qrcodes_select_authenticated
    on public.auditoria_campo_qrcodes;

drop policy if exists auditoria_campo_qrcodes_update_authenticated
    on public.auditoria_campo_qrcodes;

drop policy if exists auditoria_campo_qrcodes_select_empresa_tenant
    on public.auditoria_campo_qrcodes;

drop policy if exists auditoria_campo_qrcodes_insert_empresa_tenant
    on public.auditoria_campo_qrcodes;

drop policy if exists auditoria_campo_qrcodes_update_empresa_tenant
    on public.auditoria_campo_qrcodes;

create policy auditoria_campo_qrcodes_select_empresa_tenant
on public.auditoria_campo_qrcodes
for select
to authenticated
using (
    public.usuario_admin_global()
    or (
        empresa_id is not null
        and public.usuario_tem_acesso_empresa(empresa_id)
    )
);

create policy auditoria_campo_qrcodes_insert_empresa_tenant
on public.auditoria_campo_qrcodes
for insert
to authenticated
with check (
    empresa_id is not null
    and public.usuario_tem_acesso_empresa(empresa_id)
);

create policy auditoria_campo_qrcodes_update_empresa_tenant
on public.auditoria_campo_qrcodes
for update
to authenticated
using (
    public.usuario_admin_global()
    or (
        empresa_id is not null
        and public.usuario_tem_acesso_empresa(empresa_id)
    )
)
with check (
    public.usuario_admin_global()
    or (
        empresa_id is not null
        and public.usuario_tem_acesso_empresa(empresa_id)
    )
);

notify pgrst, 'reload schema';

commit;
