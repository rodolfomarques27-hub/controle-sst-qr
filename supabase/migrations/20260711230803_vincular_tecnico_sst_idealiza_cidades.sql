update public.usuarios_permissoes_sistema as ups
set empresa_id = e.id,
    empresa = e.nome
from public.empresas as e
where lower(trim(ups.email)) = 'rodolfomarques@gmail.com'
  and lower(trim(e.nome)) = lower(trim('IDEALIZA CIDADES'))
  and ups.ativo = true
  and coalesce(ups.bloqueado, false) = false
  and lower(coalesce(ups.perfil, '')) = 'tecnico_sst'
  and ups.empresa_id is null;;
