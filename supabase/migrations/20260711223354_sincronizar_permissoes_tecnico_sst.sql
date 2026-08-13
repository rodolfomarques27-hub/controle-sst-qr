
    update public.usuarios_permissoes_sistema u
       set permissoes = p.permissoes_json,
           updated_at = now()
      from public.perfis_permissoes_sistema p
     where lower(coalesce(u.perfil, '')) = 'tecnico_sst'
       and lower(coalesce(p.chave, '')) = 'tecnico_sst'
       and coalesce(p.ativo, false) = true
       and coalesce(u.ativo, false) = true
       and coalesce(u.bloqueado, false) = false
       and coalesce(u.permissoes -> 'modulos', '{}'::jsonb) = '{}'::jsonb;
  ;
