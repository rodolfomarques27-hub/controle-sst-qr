begin;

do $preflight$
begin
    if to_regprocedure(
        'public.validar_contato_emergencia_qr(text,text)'
    ) is null
       or to_regprocedure(
        'public.validar_contato_emergencia_qr_individual(text,text,text)'
    ) is null
       or to_regprocedure(
        'private.emergencia_qr_pin_usuario_valido(uuid,uuid,text,text)'
    ) is null
       or to_regclass('public.empresas') is null then

        raise exception 'Dependencias de roteamento ausentes.';
    end if;

    if to_regprocedure(
        'public.validar_contato_emergencia_qr_empresa_legado(text,text)'
    ) is not null
       or to_regclass(
        'private.emergencia_qr_modos_empresa'
    ) is not null then

        raise exception 'Roteamento ja existente.';
    end if;
end;
$preflight$;

create table private.emergencia_qr_modos_empresa (
    empresa_id uuid primary key
        references public.empresas(id)
        on delete cascade,

    modo text not null default 'empresa'
        check (modo in ('empresa', 'individual')),

    atualizado_em timestamptz not null
        default pg_catalog.now()
);

revoke all on table
    private.emergencia_qr_modos_empresa
from public, anon, authenticated;

alter function
    public.validar_contato_emergencia_qr(text,text)
rename to
    validar_contato_emergencia_qr_empresa_legado;

revoke all on function
    public.validar_contato_emergencia_qr_empresa_legado(text,text)
from public, anon, authenticated;

revoke all on function
    public.validar_contato_emergencia_qr_individual(text,text,text)
from public, anon, authenticated;

create function public.validar_contato_emergencia_qr(
    p_token text,
    p_senha text,
    p_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $func$
declare
    v_empresa_id uuid;
    v_modo text;
begin
    if nullif(pg_catalog.btrim(coalesce(p_token, '')), '') is null then
        return pg_catalog.jsonb_build_object(
            'ok', false,
            'autorizado', false,
            'mensagem', 'Token QR nao informado.'
        );
    end if;

    select c.empresa_id
      into v_empresa_id
      from public.colaboradores c
     where pg_catalog.btrim(coalesce(c.token_qr, ''))
           = pg_catalog.btrim(coalesce(p_token, ''))
     limit 1;

    if v_empresa_id is null then
        return public.validar_contato_emergencia_qr_empresa_legado(
            p_token,
            p_senha
        );
    end if;

    select m.modo
      into v_modo
      from private.emergencia_qr_modos_empresa m
     where m.empresa_id = v_empresa_id;

    if coalesce(v_modo, 'empresa') = 'individual' then
        return public.validar_contato_emergencia_qr_individual(
            p_token,
            p_senha,
            p_email
        );
    end if;

    return public.validar_contato_emergencia_qr_empresa_legado(
        p_token,
        p_senha
    );
end;
$func$;

revoke all on function
    public.validar_contato_emergencia_qr(text,text,text)
from public, anon, authenticated;

grant execute on function
    public.validar_contato_emergencia_qr(text,text,text)
to anon, authenticated;

commit;