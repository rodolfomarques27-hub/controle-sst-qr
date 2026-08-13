
    do $migration$
    begin
      if not exists (
        select 1
        from pg_constraint
        where conname = 'usuarios_operacionais_ativos_exigem_empresa'
          and conrelid = 'public.usuarios_permissoes_sistema'::regclass
      ) then
        alter table public.usuarios_permissoes_sistema
          add constraint usuarios_operacionais_ativos_exigem_empresa
          check (
            not (
              coalesce(ativo, false) = true
              and coalesce(bloqueado, false) = false
              and lower(coalesce(perfil, '')) <> 'administrador'
              and empresa_id is null
            )
          ) not valid;
      end if;
    end;
    $migration$;
  ;
