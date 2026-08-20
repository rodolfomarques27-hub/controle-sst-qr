begin;

revoke execute
on function public.arquivar_certificado_antes_substituicao()
from authenticated;

revoke execute
on function public.arquivar_certificado_antes_substituicao()
from anon;

revoke execute
on function public.arquivar_certificado_antes_substituicao()
from public;

grant execute
on function public.arquivar_certificado_antes_substituicao()
to service_role;

commit;
