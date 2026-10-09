begin;

do $$
begin
    if to_regclass('public.auditoria_campo_fotos') is null then
        raise exception 'Tabela de fotos multiplas ausente.';
    end if;

    if to_regclass('storage.objects') is null then
        raise exception 'Catalogo Storage indisponivel.';
    end if;

    if to_regprocedure(
        'public.salvar_auditoria_campo_publica(text,text,jsonb)'
    ) is null then
        raise exception 'RPC publica canonica indisponivel.';
    end if;
end;
$$;

create function public.salvar_auditoria_campo_publica_multifotos(
    p_token text,
    p_senha text,
    p_dados jsonb,
    p_fotos jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog, public, auth, storage
as $function$
declare
    v_token text;
    v_prefixo text;
    v_resultado jsonb;
    v_auditoria_id uuid;
    v_empresa_id uuid;
    v_foto jsonb;
    v_fase text;
    v_caminho text;
    v_mime text;
    v_nome text;
    v_antes integer := 0;
    v_depois integer := 0;
    v_ordem integer;
    v_primeira_antes text;
    v_primeira_depois text;
begin
    v_token := trim(coalesce(p_token, ''));

    if length(v_token) < 1
       or length(v_token) > 200
       or v_token !~ '^[A-Za-z0-9._~-]+$' then
        raise exception 'Token publico invalido.';
    end if;

    if jsonb_typeof(p_dados) is distinct from 'object' then
        raise exception 'Dados da auditoria invalidos.';
    end if;

    if jsonb_typeof(p_fotos) is distinct from 'array' then
        raise exception 'Lista de fotos invalida.';
    end if;

    if jsonb_array_length(p_fotos) < 1
       or jsonb_array_length(p_fotos) > 16 then
        raise exception 'Quantidade de fotos fora do limite.';
    end if;

    v_prefixo := 'auditorias-publicas/' || v_token || '/';

    -- Reutiliza a validacao canonica de senha, token,
    -- QR, empresa e tenant.
    v_resultado := public.salvar_auditoria_campo_publica(
        v_token,
        p_senha,
        p_dados
    );

    if coalesce((v_resultado ->> 'ok')::boolean, false) is not true
       or nullif(v_resultado ->> 'id', '') is null
       or nullif(v_resultado ->> 'empresa_id', '') is null then
        raise exception 'Auditoria publica nao confirmada.';
    end if;

    v_auditoria_id := (v_resultado ->> 'id')::uuid;
    v_empresa_id := (v_resultado ->> 'empresa_id')::uuid;

    for v_foto in
        select value
        from jsonb_array_elements(p_fotos)
    loop
        if jsonb_typeof(v_foto) is distinct from 'object' then
            raise exception 'Registro fotografico invalido.';
        end if;

        v_fase := v_foto ->> 'fase';
        v_caminho := trim(coalesce(v_foto ->> 'caminho', ''));
        v_mime := lower(trim(coalesce(v_foto ->> 'mimeType', '')));
        v_nome := left(coalesce(v_foto ->> 'nome', ''), 255);

        if v_fase is null
           or v_fase not in ('antes', 'depois') then
            raise exception 'Fase fotografica invalida.';
        end if;

        if v_mime not in (
            'image/jpeg',
            'image/png',
            'image/webp'
        ) then
            raise exception 'Tipo de imagem invalido.';
        end if;

        if length(v_caminho) <= length(v_prefixo)
           or length(v_caminho) > 1024
           or left(v_caminho, length(v_prefixo)) <> v_prefixo
           or position('..' in v_caminho) > 0
           or position(chr(92) in v_caminho) > 0 then
            raise exception 'Caminho da foto nao autorizado.';
        end if;

        if not exists (
            select 1
            from storage.objects o
            where o.bucket_id = 'auditorias-campo'
              and o.name = v_caminho
        ) then
            raise exception 'Arquivo fotografico nao localizado no Storage.';
        end if;

        if v_fase = 'antes' then
            v_antes := v_antes + 1;
            v_ordem := v_antes;

            if v_antes = 1 then
                v_primeira_antes := v_caminho;
            end if;
        else
            v_depois := v_depois + 1;
            v_ordem := v_depois;

            if v_depois = 1 then
                v_primeira_depois := v_caminho;
            end if;
        end if;

        if v_ordem > 8 then
            raise exception 'Limite de oito fotos por fase excedido.';
        end if;

        insert into public.auditoria_campo_fotos (
            auditoria_id,
            empresa_id,
            fase,
            ordem,
            bucket_id,
            caminho_storage,
            nome_original,
            mime_type
        )
        values (
            v_auditoria_id,
            v_empresa_id,
            v_fase,
            v_ordem,
            'auditorias-campo',
            v_caminho,
            v_nome,
            v_mime
        );
    end loop;

    if nullif(p_dados ->> 'foto_antes_url', '')
       is distinct from v_primeira_antes then
        raise exception 'Foto principal antes inconsistente.';
    end if;

    if nullif(p_dados ->> 'foto_depois_url', '')
       is distinct from v_primeira_depois then
        raise exception 'Foto principal depois inconsistente.';
    end if;

    return v_resultado || jsonb_build_object(
        'fotos_registradas', v_antes + v_depois
    );
end;
$function$;

revoke all
on function public.salvar_auditoria_campo_publica_multifotos(
    text, text, jsonb, jsonb
)
from public, anon, authenticated;

grant execute
on function public.salvar_auditoria_campo_publica_multifotos(
    text, text, jsonb, jsonb
)
to anon, authenticated;

comment on function
public.salvar_auditoria_campo_publica_multifotos(
    text, text, jsonb, jsonb
) is
'Salvamento publico transacional com multiplas evidencias fotograficas.';

commit;
