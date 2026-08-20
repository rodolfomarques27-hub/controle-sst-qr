-- ============================================================
-- CERT-HIST-G1-R2-F1
--
-- Generaliza o histórico físico para todos os registros de
-- public.certificados.
--
-- Não realiza backfill.
-- Não altera snapshots atuais.
-- Não apaga objetos do Storage.
--
-- ACL preservada conforme migration de segurança homologada:
--
-- public ............. sem EXECUTE
-- anon ............... sem EXECUTE
-- authenticated ...... sem EXECUTE
-- service_role ....... com EXECUTE
-- ============================================================

begin;

create or replace function
public.arquivar_certificado_antes_substituicao()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
    v_arquivo_url_anterior text;
    v_arquivo_url_novo text;
    v_url_legada_anterior text;
    v_url_legada_nova text;
    v_arquivo_substituto text;
begin
    v_arquivo_url_anterior :=
        nullif(
            btrim(
                coalesce(
                    old.arquivo_url,
                    ''
                )
            ),
            ''
        );

    v_arquivo_url_novo :=
        nullif(
            btrim(
                coalesce(
                    new.arquivo_url,
                    ''
                )
            ),
            ''
        );

    v_url_legada_anterior :=
        nullif(
            btrim(
                coalesce(
                    old.url_do_arquivo,
                    ''
                )
            ),
            ''
        );

    v_url_legada_nova :=
        nullif(
            btrim(
                coalesce(
                    new.url_do_arquivo,
                    ''
                )
            ),
            ''
        );

    if
        v_arquivo_url_anterior
            is not distinct from
        v_arquivo_url_novo

        and

        v_url_legada_anterior
            is not distinct from
        v_url_legada_nova
    then
        return new;
    end if;

    v_arquivo_substituto :=
        coalesce(
            v_arquivo_url_novo,
            v_url_legada_nova
        );

    insert into
    public.certificados_historico (
        certificado_origem_id,
        colaborador_id,
        treinamento_id,
        treinamento_codigo,
        tipo_treinamento,
        nome_treinamento,
        data_realizacao,
        data_vencimento,
        arquivo_url,
        url_do_arquivo,
        arquivo_nome,
        nome_do_arquivo,
        observacao,
        status_validacao,
        certificado_created_at,
        certificado_updated_at,
        arquivo_substituto_url,
        motivo,
        arquivado_em
    )
    values (
        old.id,
        old.colaborador_id,
        old.treinamento_id,
        old.treinamento_codigo,
        old.tipo_treinamento,
        old.nome_treinamento,
        old.data_realizacao,
        old.data_vencimento,
        old.arquivo_url,
        old.url_do_arquivo,
        old.arquivo_nome,
        old.nome_do_arquivo,
        old.observacao,
        old.status_validacao,
        old.created_at,
        old.updated_at,
        v_arquivo_substituto,
        'substituicao_arquivo',
        now()
    );

    return new;
end;
$function$;

revoke execute
on function
public.arquivar_certificado_antes_substituicao()
from public;

revoke execute
on function
public.arquivar_certificado_antes_substituicao()
from anon;

revoke execute
on function
public.arquivar_certificado_antes_substituicao()
from authenticated;

grant execute
on function
public.arquivar_certificado_antes_substituicao()
to service_role;

drop trigger if exists
trg_certificados_historico_antes_substituicao
on public.certificados;

create trigger
trg_certificados_historico_antes_substituicao
before update of
    arquivo_url,
    url_do_arquivo
on public.certificados
for each row
when (
    old.arquivo_url
        is distinct from
    new.arquivo_url

    or

    old.url_do_arquivo
        is distinct from
    new.url_do_arquivo
)
execute function
public.arquivar_certificado_antes_substituicao();

notify pgrst, 'reload schema';

commit;