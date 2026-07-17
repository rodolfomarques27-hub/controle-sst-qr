create or replace function public.obter_estado_fundo_login_publico()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, storage
as $function$
    with objetos as (
        select
            name,
            updated_at
        from storage.objects
        where bucket_id = 'logos-empresas'
          and name in (
              'configuracoes/login/fundo-login.jpg',
              'configuracoes/login/fundo-login-config.json'
          )
    )
    select jsonb_build_object(
        'imagem_disponivel',
            exists (
                select 1
                from objetos
                where name = 'configuracoes/login/fundo-login.jpg'
            ),
        'configuracao_disponivel',
            exists (
                select 1
                from objetos
                where name = 'configuracoes/login/fundo-login-config.json'
            ),
        'versao',
            coalesce(
                (
                    select (
                        extract(epoch from max(updated_at)) * 1000
                    )::bigint::text
                    from objetos
                ),
                ''
            )
    );
$function$;

revoke all
on function public.obter_estado_fundo_login_publico()
from public;

grant execute
on function public.obter_estado_fundo_login_publico()
to anon, authenticated, service_role;

comment on function public.obter_estado_fundo_login_publico()
is 'Informa somente a existência e a versão dos dois arquivos fixos do fundo público do login.';