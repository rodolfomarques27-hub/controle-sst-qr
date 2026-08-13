begin;

revoke execute on function
    public.certidao_mensal_classificar_vigencia_contratual_valores(
        text,
        date,
        date,
        date
    )
from public, anon;

grant execute on function
    public.certidao_mensal_classificar_vigencia_contratual_valores(
        text,
        date,
        date,
        date
    )
to authenticated, service_role;

revoke execute on function
    public.certidao_mensal_validar_vigencia_contratual(
        uuid,
        date,
        text
    )
from public, anon;

grant execute on function
    public.certidao_mensal_validar_vigencia_contratual(
        uuid,
        date,
        text
    )
to authenticated, service_role;

revoke execute on function
    public.certidao_mensal_proteger_competencia_por_vigencia()
from public, anon, authenticated;

revoke execute on function
    public.certidao_mensal_proteger_item_por_vigencia()
from public, anon, authenticated;

revoke execute on function
    public.certidao_mensal_proteger_versao_por_vigencia()
from public, anon, authenticated;

revoke execute on function
    public.certidao_mensal_proteger_envio_por_vigencia()
from public, anon, authenticated;

grant execute on function
    public.certidao_mensal_proteger_competencia_por_vigencia()
to service_role;

grant execute on function
    public.certidao_mensal_proteger_item_por_vigencia()
to service_role;

grant execute on function
    public.certidao_mensal_proteger_versao_por_vigencia()
to service_role;

grant execute on function
    public.certidao_mensal_proteger_envio_por_vigencia()
to service_role;

commit;