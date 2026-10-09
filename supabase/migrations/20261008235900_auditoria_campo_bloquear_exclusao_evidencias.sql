begin;

do $preflight$
begin
  if to_regclass('public.auditoria_campo_fotos') is null then
    raise exception 'Tabela multifotos ausente.';
  end if;

  if to_regprocedure(
    'public.auditoria_campo_pode_remover_fotos_pendentes(text[])'
  ) is not null then
    raise exception 'Funcao de protecao ja existe.';
  end if;
end;
$preflight$;

create function public.auditoria_campo_pode_remover_fotos_pendentes(
  p_caminhos text[]
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $guard$
declare
  v_caminho text;
begin
  if p_caminhos is null
     or cardinality(p_caminhos) < 1
     or cardinality(p_caminhos) > 10 then
    return false;
  end if;

  -- Na ausencia da tabela esperada, negar a exclusao.
  if to_regclass('public.auditoria_campo_fotos') is null then
    return false;
  end if;

  foreach v_caminho in array p_caminhos loop
    if v_caminho is null or btrim(v_caminho) = '' then
      return false;
    end if;

    -- Proteger fotos das auditorias, incluindo campos JSON
    -- e historico textual de correcoes.
    if exists (
      select 1
      from public.auditorias_campo a
      where position(v_caminho in coalesce(a.foto_antes_url, '')) > 0
         or position(v_caminho in coalesce(a.foto_depois_url, '')) > 0
         or position(v_caminho in coalesce(a.notificacao::text, '')) > 0
         or position(v_caminho in coalesce(a.observacoes_gerais, '')) > 0
         or position(v_caminho in coalesce(a.observacao, '')) > 0
    ) then
      return false;
    end if;

    -- Proteger fotografias de desvios e tratativas.
    if exists (
      select 1
      from public.auditoria_campo_desvios d
      where position(v_caminho in coalesce(d.foto_antes_url, '')) > 0
         or position(v_caminho in coalesce(d.foto_depois_url, '')) > 0
         or position(v_caminho in coalesce(d.notificacao::text, '')) > 0
         or position(v_caminho in coalesce(d.observacao, '')) > 0
         or position(v_caminho in coalesce(d.observacao_aberto, '')) > 0
         or position(v_caminho in coalesce(d.observacao_tratativa, '')) > 0
         or position(v_caminho in coalesce(d.observacao_corrigido, '')) > 0
    ) then
      return false;
    end if;

    -- Proteger todos os registros da nova tabela multifotos.
    if exists (
      select 1
      from public.auditoria_campo_fotos f
      where f.caminho_storage = v_caminho
    ) then
      return false;
    end if;
  end loop;

  return true;
end;
$guard$;

revoke all on function
  public.auditoria_campo_pode_remover_fotos_pendentes(text[])
from public, anon, authenticated;

grant execute on function
  public.auditoria_campo_pode_remover_fotos_pendentes(text[])
to service_role;

commit;
