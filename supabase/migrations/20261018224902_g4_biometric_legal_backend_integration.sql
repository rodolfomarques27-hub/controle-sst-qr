-- SafeScan Brasil | G4-E2-K
-- GENERATED LOCAL IMPLEMENTATION DRAFT
--
-- Source legal draft SHA256:
-- 6BAFFF81CF9A94216CC746E4B075B3CDE26C1C8BF73AD6DC6B20A44EEE5A575A
--
-- This migration is NOT applied by this step.
-- Real Supabase migration requires separate authorization.

begin;
-- SAFESCAN BRASIL — DEMO-01D2C-G4
-- RASCUNHO: NAO EXECUTAR NO BANCO.
-- Requer revisao juridica, de seguranca e de RLS.
--
-- Reutiliza private.biometric_reference_sets,
-- private.biometric_references,
-- private.biometric_centroids e auditoria existente.
--
-- Nao contem imagem, CPF, nome, embedding ou template facial.
-- Nao concede acesso ao cliente web.
--
-- Status AUTHORIZED nao equivale a identidade comprovada.
-- A autorizacao legal e apenas uma das pre-condicoes.
--
-- Antes de aplicar:
-- 1. Revisar a hipotese legal do art. 11 da LGPD.
-- 2. Validar responsaveis e provas documentais.
-- 3. Revisar permissoes, transicoes e trilha de auditoria.
-- 4. Implementar backend isolado, fora do Vite.
-- 5. Obter nova autorizacao para qualquer migration.


CREATE TABLE private.biometric_legal_authorizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id uuid NOT NULL,
    empresa_id uuid NOT NULL,
    colaborador_id uuid NOT NULL,

    purpose_code text NOT NULL
        DEFAULT 'ACCESS_VERIFICATION_1_TO_1'
        CHECK (
            purpose_code = 'ACCESS_VERIFICATION_1_TO_1'
        ),

    -- ========================================================
    -- G4-E2-C — FINALIDADE BIOMETRICA ESTRITAMENTE 1:1
    -- ========================================================
    -- Esta autorizacao cobre exclusivamente verificacao 1:1,
    -- quando a identidade/candidato ja esta previamente definida.
    --
    -- NAO abrange identificacao ou pesquisa biometrica 1:N,
    -- candidate discovery, watchlist, reconhecimento em massa
    -- ou selecao entre multiplas pessoas.
    --
    -- Uma autorizacao ACCESS_VERIFICATION_1_TO_1 jamais deve ser
    -- reutilizada como autorizacao para finalidade 1:N.
    --
    -- Qualquer futura finalidade 1:N exige purpose_code proprio,
    -- revisao legal especifica, evidencias proprias, politica de
    -- retencao, revogacao, controles tecnicos e autorizacao
    -- separada antes de qualquer migration ou ativacao.

    status text NOT NULL
        DEFAULT 'PENDING_REVIEW'
        CHECK (
            status IN (
                'PENDING_REVIEW',
                'AUTHORIZED',
                'REJECTED',
                'REVOKED',
                'EXPIRED'
            )
        ),

    legal_basis_code text
        CHECK (
            legal_basis_code IS NULL OR
            legal_basis_code IN (
                'LGPD_ART11_I',
                'LGPD_ART11_II_A',
                'LGPD_ART11_II_B',
                'LGPD_ART11_II_C',
                'LGPD_ART11_II_D',
                'LGPD_ART11_II_E',
                'LGPD_ART11_II_F',
                'LGPD_ART11_II_G'
            )
        ),

    legal_review_ref text,
    evidence_ref text,
    privacy_notice_version text,
    identity_verification_ref text,
    retention_policy_version text,

    approved_by uuid,
    approved_at timestamptz,
    valid_until timestamptz,

    revoked_at timestamptz,
    revocation_reason_code text,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT biometric_authorization_empresa_fk
        FOREIGN KEY (tenant_id, empresa_id)
        REFERENCES public.empresas (tenant_id, id)
        ON DELETE RESTRICT,

    CONSTRAINT biometric_authorization_colaborador_fk
        FOREIGN KEY (empresa_id, colaborador_id)
        REFERENCES public.colaboradores (empresa_id, id)
        ON DELETE RESTRICT,

    CONSTRAINT biometric_authorization_approved_requirements
        CHECK (
            status <> 'AUTHORIZED'
            OR (
                legal_basis_code IS NOT NULL
                AND NULLIF(btrim(legal_review_ref), '') IS NOT NULL
                AND NULLIF(btrim(evidence_ref), '') IS NOT NULL
                AND NULLIF(btrim(privacy_notice_version), '') IS NOT NULL
                AND NULLIF(btrim(identity_verification_ref), '') IS NOT NULL
                AND NULLIF(btrim(retention_policy_version), '') IS NOT NULL
                AND approved_by IS NOT NULL
                AND approved_at IS NOT NULL
                AND valid_until IS NOT NULL
                AND valid_until > approved_at
                AND revoked_at IS NULL
            )
        ),

    CONSTRAINT biometric_authorization_revoked_requirements
        CHECK (
            status <> 'REVOKED'
            OR revoked_at IS NOT NULL
        )
);

CREATE UNIQUE INDEX biometric_authorization_active_unique
    ON private.biometric_legal_authorizations (
        tenant_id,
        empresa_id,
        colaborador_id,
        purpose_code
    )
    WHERE status = 'AUTHORIZED';

CREATE INDEX biometric_authorization_lookup_idx
    ON private.biometric_legal_authorizations (
        tenant_id,
        empresa_id,
        colaborador_id,
        status
    );

ALTER TABLE private.biometric_legal_authorizations
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE private.biometric_legal_authorizations
    FORCE ROW LEVEL SECURITY;

REVOKE ALL
    ON private.biometric_legal_authorizations
    FROM PUBLIC, anon, authenticated;

-- A politica de transicao e as funcoes privilegiadas
-- devem ser implementadas e revisadas separadamente.
-- Nenhuma permissao de escrita e concedida neste rascunho.

COMMENT ON TABLE private.biometric_legal_authorizations IS
    'Governanca legal biometrica; sem dados faciais. '
    'Requer backend privilegiado e autorizacao revisada.';

-- ============================================================
-- DEMO-01D2C-G4-B — REVISAO DE CICLO DE VIDA E AUDITORIA
-- RASCUNHO NAO EXECUTAVEL SEM HOMOLOGACAO.
-- ============================================================
--
-- Esta camada NAO autoriza por si so coleta ou uso biometrico.
-- O backend privilegiado devera validar:
--   1. identidade e permissao do executor autenticado;
--   2. papel do aprovador segundo politica do controlador;
--   3. base legal e evidencias, inclusive voluntariedade
--      quando a hipotese depender de consentimento;
--   4. finalidade, minimizacao e prazo de retencao;
--   5. separacao tenant/empresa/colaborador.
--
-- Os UUIDs de atores fornecidos pelo backend nao sao,
-- isoladamente, prova criptografica de quem realizou a acao.
--
-- Somente o servico autorizado podera executar as transicoes.
-- Nenhuma permissao de navegador e concedida por este draft.

ALTER TABLE private.biometric_legal_authorizations

    ADD COLUMN requested_by uuid NOT NULL
        REFERENCES auth.users(id) ON DELETE RESTRICT,

    ADD COLUMN last_action_by uuid
        REFERENCES auth.users(id) ON DELETE RESTRICT,

    ADD COLUMN reviewed_by uuid
        REFERENCES auth.users(id) ON DELETE RESTRICT,

    ADD COLUMN rejected_at timestamptz,
    ADD COLUMN rejection_reason_code text,

    ADD COLUMN revoked_by uuid
        REFERENCES auth.users(id) ON DELETE RESTRICT,

    ADD COLUMN expired_at timestamptz,

    ADD CONSTRAINT biometric_authorization_approver_fk
        FOREIGN KEY (approved_by)
        REFERENCES auth.users(id)
        ON DELETE RESTRICT,

    ADD CONSTRAINT biometric_authorization_boundary_unique
        UNIQUE (id, tenant_id, empresa_id, colaborador_id),

    ADD CONSTRAINT biometric_authorization_review_check
        CHECK (
            status <> 'AUTHORIZED'
            OR (
                reviewed_by IS NOT NULL
                AND reviewed_by = approved_by
            )
        ),

    ADD CONSTRAINT biometric_authorization_rejection_check
        CHECK (
            status <> 'REJECTED'
            OR (
                reviewed_by IS NOT NULL
                AND rejected_at IS NOT NULL
                AND NULLIF(
                    btrim(rejection_reason_code), ''
                ) IS NOT NULL
            )
        ),

    ADD CONSTRAINT biometric_authorization_revocation_check
        CHECK (
            status <> 'REVOKED'
            OR (
                revoked_by IS NOT NULL
                AND revoked_at IS NOT NULL
                AND NULLIF(
                    btrim(revocation_reason_code), ''
                ) IS NOT NULL
            )
        ),

    ADD CONSTRAINT biometric_authorization_expiration_check
        CHECK (
            status <> 'EXPIRED'
            OR expired_at IS NOT NULL
        );

-- Auditoria propria da autorizacao legal.
-- NAO duplica private.biometric_audit_events, que possui
-- contrato de eventos de referencias biométricas diferente.

CREATE TABLE private.biometric_legal_authorization_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    authorization_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    empresa_id uuid NOT NULL,
    colaborador_id uuid NOT NULL,

    event_code text NOT NULL
        CHECK (
            event_code IN (
                'REQUESTED',
                'DOSSIER_UPDATED',
                'AUTHORIZED',
                'REJECTED',
                'REVOKED',
                'EXPIRED'
            )
        ),

    actor_user_id uuid
        REFERENCES auth.users(id) ON DELETE RESTRICT,

    previous_status text,
    next_status text NOT NULL,
    reason_code text,

    occurred_at timestamptz NOT NULL
        DEFAULT clock_timestamp(),

    CONSTRAINT biometric_legal_event_boundary_fk
        FOREIGN KEY (
            authorization_id,
            tenant_id,
            empresa_id,
            colaborador_id
        )
        REFERENCES private.biometric_legal_authorizations (
            id,
            tenant_id,
            empresa_id,
            colaborador_id
        )
        ON DELETE RESTRICT
);

CREATE INDEX biometric_legal_event_history_idx
    ON private.biometric_legal_authorization_events (
        authorization_id,
        occurred_at
    );

ALTER TABLE private.biometric_legal_authorization_events
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE private.biometric_legal_authorization_events
    FORCE ROW LEVEL SECURITY;

REVOKE ALL
    ON private.biometric_legal_authorization_events
    FROM PUBLIC, anon, authenticated;

-- Controle de transicoes.
-- A legitimidade do papel do executor deve ser verificada
-- em backend separado; nao basta fornecer seu UUID.

CREATE FUNCTION private.biometric_legal_auth_guard_g4()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, private
AS $g4$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'AUTHORIZATION_DELETE_FORBIDDEN';
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF (
            NEW.status <> 'PENDING_REVIEW'
            OR NEW.requested_by IS NULL
            OR NEW.last_action_by IS DISTINCT FROM NEW.requested_by
            OR NEW.approved_by IS NOT NULL
            OR NEW.approved_at IS NOT NULL
            OR NEW.reviewed_by IS NOT NULL
            OR NEW.revoked_at IS NOT NULL
            OR NEW.revoked_by IS NOT NULL
            OR NEW.rejected_at IS NOT NULL
            OR NEW.rejection_reason_code IS NOT NULL
            OR NEW.revocation_reason_code IS NOT NULL
            OR NEW.expired_at IS NOT NULL
        ) THEN
            RAISE EXCEPTION 'INVALID_AUTHORIZATION_INITIAL_STATE';
        END IF;

        NEW.created_at := clock_timestamp();
        NEW.updated_at := NEW.created_at;

        RETURN NEW;
    END IF;

    IF (
        NEW.id IS DISTINCT FROM OLD.id
        OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
        OR NEW.empresa_id IS DISTINCT FROM OLD.empresa_id
        OR NEW.colaborador_id IS DISTINCT FROM OLD.colaborador_id
        OR NEW.purpose_code IS DISTINCT FROM OLD.purpose_code
        OR NEW.requested_by IS DISTINCT FROM OLD.requested_by
        OR NEW.created_at IS DISTINCT FROM OLD.created_at
    ) THEN
        RAISE EXCEPTION 'AUTHORIZATION_BOUNDARY_IMMUTABLE';
    END IF;

    IF OLD.status IN ('REJECTED', 'REVOKED', 'EXPIRED') THEN
        RAISE EXCEPTION 'AUTHORIZATION_TERMINAL_STATE';
    END IF;

    IF OLD.status = 'PENDING_REVIEW' THEN

        IF NEW.status = 'PENDING_REVIEW' THEN
            IF (
                NEW.last_action_by IS NULL
                OR NEW.approved_by IS NOT NULL
                OR NEW.approved_at IS NOT NULL
                OR NEW.revoked_at IS NOT NULL
                OR NEW.reviewed_by IS NOT NULL
                OR NEW.rejected_at IS NOT NULL
                OR NEW.expired_at IS NOT NULL
            ) THEN
                RAISE EXCEPTION 'INVALID_PENDING_UPDATE';
            END IF;

        ELSIF NEW.status = 'AUTHORIZED' THEN
            IF (
                NEW.approved_by IS NULL
                OR NEW.reviewed_by IS DISTINCT FROM NEW.approved_by
                OR NEW.last_action_by IS DISTINCT FROM NEW.approved_by
                OR NEW.valid_until IS NULL
                OR NEW.valid_until <= clock_timestamp()
            ) THEN
                RAISE EXCEPTION 'APPROVAL_REQUIREMENTS_NOT_MET';
            END IF;

            NEW.approved_at := clock_timestamp();

        ELSIF NEW.status = 'REJECTED' THEN
            IF (
                NEW.reviewed_by IS NULL
                OR NEW.last_action_by IS DISTINCT FROM NEW.reviewed_by
                OR NULLIF(
                    btrim(NEW.rejection_reason_code), ''
                ) IS NULL
            ) THEN
                RAISE EXCEPTION 'REJECTION_REQUIREMENTS_NOT_MET';
            END IF;

            NEW.rejected_at := clock_timestamp();

        ELSE
            RAISE EXCEPTION 'INVALID_AUTHORIZATION_TRANSITION';
        END IF;

    ELSIF OLD.status = 'AUTHORIZED' THEN

        IF ROW(
            NEW.legal_basis_code,
            NEW.legal_review_ref,
            NEW.evidence_ref,
            NEW.privacy_notice_version,
            NEW.identity_verification_ref,
            NEW.retention_policy_version,
            NEW.approved_by,
            NEW.approved_at,
            NEW.valid_until
        ) IS DISTINCT FROM ROW(
            OLD.legal_basis_code,
            OLD.legal_review_ref,
            OLD.evidence_ref,
            OLD.privacy_notice_version,
            OLD.identity_verification_ref,
            OLD.retention_policy_version,
            OLD.approved_by,
            OLD.approved_at,
            OLD.valid_until
        ) THEN
            RAISE EXCEPTION 'APPROVED_DOSSIER_IMMUTABLE';
        END IF;

        IF NEW.status = 'REVOKED' THEN
            IF (
                NEW.revoked_by IS NULL
                OR NEW.last_action_by IS DISTINCT FROM NEW.revoked_by
                OR NULLIF(
                    btrim(NEW.revocation_reason_code), ''
                ) IS NULL
            ) THEN
                RAISE EXCEPTION 'REVOCATION_REQUIREMENTS_NOT_MET';
            END IF;

            NEW.revoked_at := clock_timestamp();

        ELSIF NEW.status = 'EXPIRED' THEN
            IF OLD.valid_until > clock_timestamp() THEN
                RAISE EXCEPTION 'AUTHORIZATION_NOT_EXPIRED';
            END IF;

            -- Vencimento automático: ator humano não atribuído.
            NEW.last_action_by := NULL;
            NEW.expired_at := clock_timestamp();

        ELSE
            RAISE EXCEPTION 'INVALID_AUTHORIZATION_TRANSITION';
        END IF;

    ELSE
        RAISE EXCEPTION 'INVALID_AUTHORIZATION_STATUS';
    END IF;

    -- ========================================================
    -- DEMO-01D2C-G4-C — INVARIANTES DOS ESTADOS
    -- ========================================================

    -- Uma decisão deve utilizar o dossiê anteriormente
    -- submetido, sem modificá-lo na mesma operação.
    IF OLD.status = 'PENDING_REVIEW'
        AND NEW.status IN ('AUTHORIZED', 'REJECTED')
        AND ROW(
            NEW.legal_basis_code,
            NEW.legal_review_ref,
            NEW.evidence_ref,
            NEW.privacy_notice_version,
            NEW.identity_verification_ref,
            NEW.retention_policy_version,
            NEW.valid_until
        ) IS DISTINCT FROM ROW(
            OLD.legal_basis_code,
            OLD.legal_review_ref,
            OLD.evidence_ref,
            OLD.privacy_notice_version,
            OLD.identity_verification_ref,
            OLD.retention_policy_version,
            OLD.valid_until
        )
    THEN
        RAISE EXCEPTION 'DOSSIER_CHANGE_DURING_DECISION';
    END IF;

    -- Estados pendente e autorizado não podem carregar
    -- dados de rejeição, revogação ou vencimento.
    IF NEW.status IN ('PENDING_REVIEW', 'AUTHORIZED')
        AND (
            NEW.rejected_at IS NOT NULL
            OR NEW.rejection_reason_code IS NOT NULL
            OR NEW.revoked_at IS NOT NULL
            OR NEW.revoked_by IS NOT NULL
            OR NEW.revocation_reason_code IS NOT NULL
            OR NEW.expired_at IS NOT NULL
        )
    THEN
        RAISE EXCEPTION 'CONFLICTING_STATE_METADATA';
    END IF;

    -- Enquanto pendente, não pode haver aprovador,
    -- revisor ou carimbo de aprovação.
    IF NEW.status = 'PENDING_REVIEW'
        AND (
            NEW.approved_by IS NOT NULL
            OR NEW.approved_at IS NOT NULL
            OR NEW.reviewed_by IS NOT NULL
        )
    THEN
        RAISE EXCEPTION 'PREMATURE_APPROVAL_METADATA';
    END IF;

    -- Rejeição não pode coexistir com aprovação,
    -- revogação ou vencimento.
    IF NEW.status = 'REJECTED'
        AND (
            NEW.approved_by IS NOT NULL
            OR NEW.approved_at IS NOT NULL
            OR NEW.revoked_at IS NOT NULL
            OR NEW.revoked_by IS NOT NULL
            OR NEW.revocation_reason_code IS NOT NULL
            OR NEW.expired_at IS NOT NULL
        )
    THEN
        RAISE EXCEPTION 'INVALID_REJECTED_METADATA';
    END IF;

    -- Após aprovação, informações do revisor e campos
    -- de rejeição não podem ser adulterados na transição.
    IF OLD.status = 'AUTHORIZED'
        AND NEW.status IN ('REVOKED', 'EXPIRED')
        AND ROW(
            NEW.reviewed_by,
            NEW.rejected_at,
            NEW.rejection_reason_code
        ) IS DISTINCT FROM ROW(
            OLD.reviewed_by,
            OLD.rejected_at,
            OLD.rejection_reason_code
        )
    THEN
        RAISE EXCEPTION 'APPROVAL_HISTORY_IMMUTABLE';
    END IF;

    -- Revogação deve conter somente seus próprios
    -- metadados terminais.
    IF NEW.status = 'REVOKED'
        AND (
            NEW.rejected_at IS NOT NULL
            OR NEW.rejection_reason_code IS NOT NULL
            OR NEW.expired_at IS NOT NULL
            OR NEW.revoked_at IS NULL
            OR NEW.revoked_by IS NULL
        )
    THEN
        RAISE EXCEPTION 'INVALID_REVOKED_METADATA';
    END IF;

    -- Expiração automática não pode conter informação
    -- de revogação, rejeição ou ator humano fictício.
    IF NEW.status = 'EXPIRED'
        AND (
            NEW.last_action_by IS NOT NULL
            OR NEW.revoked_at IS NOT NULL
            OR NEW.revoked_by IS NOT NULL
            OR NEW.revocation_reason_code IS NOT NULL
            OR NEW.rejected_at IS NOT NULL
            OR NEW.rejection_reason_code IS NOT NULL
            OR NEW.expired_at IS NULL
        )
    THEN
        RAISE EXCEPTION 'INVALID_EXPIRED_METADATA';
    END IF;
    NEW.updated_at := clock_timestamp();

    RETURN NEW;
END;
$g4$;

CREATE TRIGGER biometric_legal_auth_guard_trigger
BEFORE INSERT OR UPDATE OR DELETE
ON private.biometric_legal_authorizations
FOR EACH ROW
EXECUTE FUNCTION private.biometric_legal_auth_guard_g4();

-- Trilha automatica de auditoria.
-- A funcao precisa ser executada pelo proprietario privilegiado
-- validado na migration. Nao disponibilizar chamada publica.

CREATE FUNCTION private.biometric_legal_auth_event_g4()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, private
AS $g4$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO private.biometric_legal_authorization_events (
            authorization_id,
            tenant_id,
            empresa_id,
            colaborador_id,
            event_code,
            actor_user_id,
            previous_status,
            next_status
        )
        VALUES (
            NEW.id,
            NEW.tenant_id,
            NEW.empresa_id,
            NEW.colaborador_id,
            'REQUESTED',
            NEW.requested_by,
            NULL,
            NEW.status
        );

        RETURN NEW;
    END IF;

    INSERT INTO private.biometric_legal_authorization_events (
        authorization_id,
        tenant_id,
        empresa_id,
        colaborador_id,
        event_code,
        actor_user_id,
        previous_status,
        next_status,
        reason_code
    )
    VALUES (
        NEW.id,
        NEW.tenant_id,
        NEW.empresa_id,
        NEW.colaborador_id,

        CASE
            WHEN NEW.status = 'PENDING_REVIEW'
                THEN 'DOSSIER_UPDATED'
            WHEN NEW.status = 'AUTHORIZED'
                THEN 'AUTHORIZED'
            WHEN NEW.status = 'REJECTED'
                THEN 'REJECTED'
            WHEN NEW.status = 'REVOKED'
                THEN 'REVOKED'
            WHEN NEW.status = 'EXPIRED'
                THEN 'EXPIRED'
        END,

        NEW.last_action_by,
        OLD.status,
        NEW.status,

        CASE
            WHEN NEW.status = 'REJECTED'
                THEN NEW.rejection_reason_code
            WHEN NEW.status = 'REVOKED'
                THEN NEW.revocation_reason_code
            ELSE NULL
        END
    );

    RETURN NEW;
END;
$g4$;

CREATE TRIGGER biometric_legal_auth_event_trigger
AFTER INSERT OR UPDATE
ON private.biometric_legal_authorizations
FOR EACH ROW
EXECUTE FUNCTION private.biometric_legal_auth_event_g4();

CREATE FUNCTION private.biometric_legal_auth_audit_immutable_g4()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, private
AS $g4$
BEGIN
    RAISE EXCEPTION 'BIOMETRIC_AUTHORIZATION_AUDIT_APPEND_ONLY';
END;
$g4$;

CREATE TRIGGER biometric_legal_auth_audit_immutable_trigger
BEFORE UPDATE OR DELETE
ON private.biometric_legal_authorization_events
FOR EACH ROW
EXECUTE FUNCTION private.biometric_legal_auth_audit_immutable_g4();

REVOKE ALL ON FUNCTION
    private.biometric_legal_auth_guard_g4(),
    private.biometric_legal_auth_event_g4(),
    private.biometric_legal_auth_audit_immutable_g4()
FROM PUBLIC, anon, authenticated;

-- ============================================================
-- DEMO-01D2C-G4-D4 — ESCRITOR RESTRITO DE AUDITORIA
-- SQL DRAFT. Validar este conjunto em PostgreSQL isolado
-- antes de converter o arquivo em migration.
-- ============================================================

-- Papel dedicado, sem login e sem BYPASSRLS.
-- A existencia previa desse nome deve interromper a migration,
-- exigindo auditoria do papel, em vez de reutiliza-lo cegamente.

DO $g4_role$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_roles
        WHERE rolname = 'g4_biometric_audit_writer'
    ) THEN
        RAISE EXCEPTION 'G4_AUDIT_WRITER_ROLE_CONFLICT';
    END IF;

    CREATE ROLE g4_biometric_audit_writer
        NOLOGIN
        NOINHERIT
        NOBYPASSRLS;
END;
$g4_role$;

-- Somente as permissoes necessarias para criar eventos.
-- Nenhum SELECT, UPDATE ou DELETE e concedido.

GRANT USAGE ON SCHEMA private
    TO g4_biometric_audit_writer;

GRANT INSERT
    ON private.biometric_legal_authorization_events
    TO g4_biometric_audit_writer;

-- A tabela permanece com FORCE ROW LEVEL SECURITY.
-- A politica habilita somente o INSERT pelo escritor dedicado.
-- Nao libera acesso para anon ou authenticated.

CREATE POLICY biometric_legal_event_writer_insert_g4
    ON private.biometric_legal_authorization_events
    FOR INSERT
    TO g4_biometric_audit_writer
    WITH CHECK (true);

-- A funcao SECURITY DEFINER nao deve operar sob um
-- proprietario com BYPASSRLS.
-- Homologar a troca de owner com os privilegios reais
-- do executor da migration antes de qualquer aplicacao.

-- ============================================================
-- DEMO-01D2C-G4-D5-B — TRANSFERENCIA SEGURA DE OWNER
-- ============================================================
-- Permissoes transitorias, somente durante a transacao DDL.
-- O executor deve ter CREATEROLE e capacidade de administrar
-- o papel criado nesta mesma migration.

GRANT CREATE ON SCHEMA private
    TO g4_biometric_audit_writer;

GRANT g4_biometric_audit_writer TO CURRENT_USER
    WITH SET TRUE, INHERIT FALSE;

ALTER FUNCTION private.biometric_legal_auth_event_g4()
    OWNER TO g4_biometric_audit_writer;

-- Retirar as duas capacidades transitorias antes do COMMIT.

REVOKE CREATE ON SCHEMA private
    FROM g4_biometric_audit_writer;

GRANT g4_biometric_audit_writer TO CURRENT_USER
    WITH SET FALSE, INHERIT FALSE;

-- Nao conceder SELECT, UPDATE, DELETE ou BYPASSRLS.
-- A auditoria permanece restrita ao INSERT pela policy.
-- Homologar a sequencia completa sob executor nao superuser
-- antes de converter o SQL DRAFT em migration.

-- BLOQUEIOS DE IMPLANTACAO:
-- 1. Verificar CREATE ROLE e ALTER FUNCTION OWNER no PG 17.6.
-- 2. Comprovar owner NOBYPASSRLS e politica INSERT efetiva.
-- 3. Comprovar rollback atomico quando auditoria falhar.
-- 4. Negar SELECT, UPDATE e DELETE ao escritor dedicado.
-- 5. Nao ampliar privilegios de anon ou authenticated.
-- 6. Validar o broker que identifica os atores reais.
-- 7. Integrar revogacao legal com referencias biometricas.
-- 8. Nao habilitar SFace, cadastro ou verificacao 1:1 ainda.
-- 9. Exigir autorizacao separada antes da migration real.


-- ============================================================
-- GATES OBRIGATORIOS ANTES DA APLICACAO
-- ============================================================
--
-- GATE 1: somente o backend privilegiado podera escrever.
-- Validar executor real a partir da sessao autenticada,
-- autorizacoes do tenant e perfil efetivamente permitido.
--
-- GATE 2: a consulta de elegibilidade devera exigir:
--   status = 'AUTHORIZED'
--   AND revoked_at IS NULL
--   AND valid_until > clock_timestamp()
--   AND tenant_id, empresa_id, colaborador_id correspondentes.
-- Na ausencia de qualquer condicao, negar.
--
-- GATE 2A: AUTORIZACAO 1:1 NAO AUTORIZA IDENTIFICACAO 1:N.
-- O purpose_code ACCESS_VERIFICATION_1_TO_1 e restrito a
-- verificacao de identidade previamente determinada.
--
-- A funcao de candidate discovery 1:N e qualquer fluxo que
-- compare uma observacao contra multiplos colaboradores devem
-- permanecer fail-closed e nao podem reutilizar esta autorizacao.
--
-- Uma futura operacao 1:N devera possuir finalidade legal propria,
-- contrato SQL separado, controles de acesso, revogacao e auditoria
-- especificos, alem de autorizacao independente antes da ativacao.
--
-- GATE 3: o indice unique WHERE status='AUTHORIZED'
-- nao ignora automaticamente autorizações vencidas.
-- Antes de nova autorizacao, o broker devera transicionar
-- a anterior para EXPIRED na mesma operacao controlada.
--
-- GATE 4: revogacao legal deve invalidar qualquer possibilidade
-- de consulta/uso de referencias biométricas existentes.
-- A revogacao, quarentena e exclusao das referencias, quando
-- cabiveis, exigem fluxo transacional e auditoria proprios.
-- Nao executar SFace enquanto essa integracao nao existir.
--
-- ============================================================
-- G4-E2-E — DESENHO TRANSACIONAL DE REVOGACAO 1:1
-- ============================================================
--
-- ESCOPO:
-- Este contrato se aplica exclusivamente a finalidade
-- ACCESS_VERIFICATION_1_TO_1.
--
-- Nao habilita, autoriza ou altera candidate discovery 1:N.
-- A identificacao 1:N permanece fail-closed.
--
-- PRINCIPIO DE ATOMICIDADE:
-- A revogacao legal e a invalidacao tecnica das referencias
-- devem ocorrer em uma unica transacao de banco.
--
-- Nenhum commit parcial e aceitavel.
-- Se qualquer atualizacao ou evento de auditoria falhar,
-- toda a operacao deve sofrer rollback.
--
-- ORDEM LOGICA PROPOSTA PARA A FUTURA OPERACAO PRIVILEGIADA:
--
-- 1. Resolver o executor autenticado no backend e validar sua
--    permissao real. UUID recebido do cliente nao e prova de ator.
--
-- 2. Localizar e bloquear FOR UPDATE a autorizacao legal exata
--    de tenant_id + empresa_id + colaborador_id +
--    purpose_code = ACCESS_VERIFICATION_1_TO_1.
--
-- 3. Validar fronteira tenant/empresa/colaborador e o estado
--    atual da autorizacao antes da transicao.
--
-- 4. Registrar a revogacao legal com status REVOKED,
--    revoked_by, revoked_at, revocation_reason_code,
--    last_action_by e trilha legal correspondente.
--
-- 5. Na mesma transacao, bloquear os biometric_reference_sets
--    pertencentes ao mesmo tenant/empresa/colaborador.
--
-- 6. Todo reference_set ainda nao REVOKED deve transicionar
--    para REVOKED quando a transicao de lifecycle permitir,
--    preenchendo revoked_at, lifecycle_reason_code e gerando
--    REFERENCE_SET_REVOKED.
--
-- 7. Todas as biometric_references ainda nao REVOKED dos sets
--    afetados devem transicionar para REVOKED, preenchendo
--    revoked_at, lifecycle_reason_code e gerando
--    REFERENCE_REVOKED.
--
-- 8. A operacao nao deve reutilizar o RPC individual atual para
--    revogar referencias ACTIVE de um set ACTIVE, pois esse RPC
--    deliberadamente exige fluxo de revogacao/substituicao do set.
--
-- 9. O current_centroid_id e o ciphertext do centroid podem ser
--    preservados imediatamente apos a revogacao.
--    O bloqueio de uso decorre do reference_set deixar ACTIVE.
--
-- 10. Exclusao fisica de embeddings, centroids ou fontes nao deve
--     ser confundida com revogacao. Ela deve obedecer politica de
--     retencao aprovada, requisitos legais e auditoria especifica.
--
-- CONCORRENCIA COM FUTURA LEITURA 1:1:
--
-- 11. A futura consulta privilegiada de bundle 1:1 deve obter,
--     antes de liberar qualquer ciphertext, lock de leitura que
--     conflite com a revogacao FOR UPDATE da mesma autorizacao.
--
-- 12. A consulta deve revalidar, sob esse lock:
--       status = AUTHORIZED;
--       revoked_at IS NULL;
--       valid_until > clock_timestamp();
--       purpose_code = ACCESS_VERIFICATION_1_TO_1;
--       tenant_id, empresa_id e colaborador_id correspondentes.
--
-- 13. O lock deve permanecer valido durante a leitura do bundle
--     na mesma transacao. Assim, uma revogacao concorrente espera
--     a leitura terminar; novas leituras aguardam a revogacao e,
--     apos o commit, devem falhar na reelegibilidade.
--
-- 14. Nenhuma consulta deve entregar ciphertext primeiro e
--     validar a autorizacao depois.
--
-- RESULTADO DE SEGURANCA ESPERADO:
-- Apos o commit da revogacao, nenhum reference_set daquele
-- colaborador permanece elegivel para get_active_bundle 1:1;
-- nenhuma autorizacao 1:1 revogada pode liberar novo material;
-- e qualquer falha de auditoria ou lifecycle invalida a transacao.
--
-- IMPLEMENTACAO:
-- Este bloco e somente desenho tecnico. Nao cria funcao, RPC,
-- trigger, policy, grant ou migration.
-- A implementacao futura exige microetapa e autorizacao separadas.
--
-- GATE 5: revisar e testar SECURITY DEFINER, FORCE RLS,
-- permissao do proprietario da funcao e restricoes de EXECUTE
-- em ambiente isolado. Nenhum privilegio de browser.
--
-- GATE 6: a exclusao/retencao de dados pessoais e a conservacao
-- de trilhas devem observar a politica aprovada pelo controlador.
-- ON DELETE RESTRICT requer revisao de ciclo de vida.
--
-- GATE 7: SQL DRAFT. Ainda nao revisado em PostgreSQL real.
-- Nao converter para migration sem autorizacao separada.

-- ============================================================
-- G4-C — BLOQUEIOS ANTES DE UMA MIGRATION REAL
-- ============================================================
--
-- 1. Validar este SQL num PostgreSQL isolado.
--    Verificacao textual nao equivale a teste de trigger.
--
-- 2. Verificar o proprietario da funcao SECURITY DEFINER,
--    seus privilegios efetivos e BYPASSRLS diante do FORCE RLS.
--    A auditoria deve conseguir gravar eventos atomicamente.
--    Falha na auditoria deve impedir a transicao.
--
-- 3. O backend deve comprovar a identidade e a permissao
--    do executor. UUID fornecido pelo cliente nao e prova.
--
-- 4. Vencimento automatico registra last_action_by NULL.
--    A trilha devera identificar a origem SYSTEM no contrato
--    definitivo, sem atribuir acao a um humano ficticio.
--
-- 5. A consulta de elegibilidade deve exigir explicitamente
--    valid_until > clock_timestamp(), status AUTHORIZED,
--    ausência de revogacao e correspondencia de tenant,
--    empresa e colaborador. Na duvida, negar.
--
-- 6. Revogacao exige bloqueio transacional do uso posterior
--    de referencias biometricas. Ainda nao implementado.
--
-- 7. Nenhuma autorizacao legal equivale a aprovacao SFace.
--    PAD, referencia, politica de decisao e acesso fisico
--    continuam bloqueados.
--
-- 8. Revisao juridica LGPD art. 11, retencao, exclusao,
--    papeis e evidencias ainda obrigatoria.
--
-- DRAFT ONLY. NAO APLICAR AO SUPABASE NESTA ETAPA.

-- =============================================================================
-- G4-E2-K — BIOMETRIC LEGAL BACKEND INTEGRATION
-- =============================================================================
--
-- Finalidade suportada:
--   ACCESS_VERIFICATION_1_TO_1
--
-- Candidate discovery / identificacao 1:N NAO e habilitada aqui.
--
-- Principios:
--   * executor humano deve ser previamente autenticado pelo broker;
--   * UUID fornecido pelo cliente nao e trust anchor;
--   * nenhum ciphertext 1:1 sai antes do gate legal;
--   * leitura e revogacao serializam pela mesma autorizacao legal;
--   * ativacao de ReferenceSet exige autorizacao legal vigente;
--   * revogacao legal + invalidacao tecnica + auditoria sao atomicas;
--   * revogacao NAO significa delecao fisica imediata.
-- =============================================================================

create or replace function private.biometric_backend_require_legal_auth_1_to_1(
  p_tenant_id uuid,
  p_empresa_id uuid,
  p_colaborador_id uuid,
  p_executor_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  v_authorization_id uuid;
  v_latest_status text;
  v_latest_valid_until timestamptz;
begin
  if p_executor_id is null then
    raise exception using
      errcode = '42501',
      message = 'BIOMETRIC_EXECUTOR_REQUIRED';
  end if;

  select a.id
    into v_authorization_id
  from private.biometric_legal_authorizations a
  where a.tenant_id = p_tenant_id
    and a.empresa_id = p_empresa_id
    and a.colaborador_id = p_colaborador_id
    and a.purpose_code = 'ACCESS_VERIFICATION_1_TO_1'
    and a.status = 'AUTHORIZED'
    and a.revoked_at is null
    and a.valid_until > clock_timestamp()
  order by a.id
  limit 1
  for share;

  if found then
    return v_authorization_id;
  end if;

  select
    a.status,
    a.valid_until
  into
    v_latest_status,
    v_latest_valid_until
  from private.biometric_legal_authorizations a
  where a.tenant_id = p_tenant_id
    and a.empresa_id = p_empresa_id
    and a.colaborador_id = p_colaborador_id
    and a.purpose_code = 'ACCESS_VERIFICATION_1_TO_1'
  order by a.updated_at desc, a.id desc
  limit 1;

  if v_latest_status = 'REVOKED' then
    raise exception using
      errcode = 'P0001',
      message = 'BIOMETRIC_LEGAL_AUTH_REVOKED';
  end if;

  if v_latest_status = 'EXPIRED'
     or (
       v_latest_status = 'AUTHORIZED'
       and (
         v_latest_valid_until is null
         or v_latest_valid_until <= clock_timestamp()
       )
     )
  then
    raise exception using
      errcode = 'P0001',
      message = 'BIOMETRIC_LEGAL_AUTH_EXPIRED';
  end if;

  raise exception using
    errcode = 'P0001',
    message = 'BIOMETRIC_LEGAL_AUTH_REQUIRED';
end;
$$;

create or replace function private.biometric_backend_get_active_bundle_g4_impl(
  p_tenant_id uuid,
  p_empresa_id uuid,
  p_colaborador_id uuid,
  p_profile_id text,
  p_request_id uuid,
  p_executor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_authorization_id uuid;
  v_result jsonb;
begin
  perform private.biometric_assert_boundary(
    p_tenant_id,
    p_empresa_id,
    p_colaborador_id
  );

  v_authorization_id :=
    private.biometric_backend_require_legal_auth_1_to_1(
      p_tenant_id,
      p_empresa_id,
      p_colaborador_id,
      p_executor_id
    );

  if v_authorization_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'BIOMETRIC_LEGAL_AUTH_REQUIRED';
  end if;

  select jsonb_build_object(
    'requestId',
    p_request_id,
    'referenceSetId',
    s.id,
    'tenantId',
    s.tenant_id,
    'empresaId',
    s.empresa_id,
    'colaboradorId',
    s.colaborador_id,
    'profileId',
    s.profile_id,
    'qualityProfileId',
    s.quality_profile_id,
    'centroid',
    jsonb_build_object(
      'centroidId',
      c.id,
      'ciphertextBase64',
      encode(c.centroid_ciphertext, 'base64'),
      'ivBase64',
      encode(c.centroid_iv, 'base64'),
      'keyVersion',
      c.centroid_key_version,
      'cipherVersion',
      c.centroid_cipher_version,
      'cipherSha256',
      c.centroid_cipher_sha256
    ),
    'references',
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'referenceId',
            r.id,
            'sourceRef',
            r.source_ref,
            'ciphertextBase64',
            encode(r.embedding_ciphertext, 'base64'),
            'ivBase64',
            encode(r.embedding_iv, 'base64'),
            'keyVersion',
            r.embedding_key_version,
            'cipherVersion',
            r.embedding_cipher_version,
            'cipherSha256',
            r.embedding_cipher_sha256
          )
          order by r.id
        ),
        '[]'::jsonb
      )
      from private.biometric_references r
      where r.reference_set_id = s.id
        and r.status = 'ACTIVE'
        and r.material_deleted_at is null
    )
  )
  into v_result
  from private.biometric_reference_sets s
  join private.biometric_centroids c
    on c.id = s.current_centroid_id
   and c.reference_set_id = s.id
  where s.tenant_id = p_tenant_id
    and s.empresa_id = p_empresa_id
    and s.colaborador_id = p_colaborador_id
    and s.profile_id = p_profile_id
    and s.status = 'ACTIVE'
    and c.material_deleted_at is null;

  if v_result is null then
    raise exception using
      errcode = 'P0002',
      message = 'active biometric bundle not found';
  end if;

  return v_result;
end;
$$;

create or replace function public.backend_biometric_get_active_bundle(
  p_tenant_id uuid,
  p_empresa_id uuid,
  p_colaborador_id uuid,
  p_profile_id text,
  p_request_id uuid,
  p_executor_id uuid
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.biometric_backend_get_active_bundle_g4_impl(
    p_tenant_id,
    p_empresa_id,
    p_colaborador_id,
    p_profile_id,
    p_request_id,
    p_executor_id
  );
$$;

create or replace function private.biometric_backend_activate_reference_set_impl(
  p_reference_set_id uuid,
  p_centroid_id uuid,
  p_request_id uuid,
  p_executor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_set private.biometric_reference_sets%rowtype;
  v_pre_tenant_id uuid;
  v_pre_empresa_id uuid;
  v_pre_colaborador_id uuid;
  v_old_active_id uuid;
  v_active_count integer;
  v_authorization_id uuid;
begin
  if p_executor_id is null then
    raise exception using
      errcode = '42501',
      message = 'BIOMETRIC_EXECUTOR_REQUIRED';
  end if;

  select *
    into v_set
  from private.biometric_reference_sets
  where id = p_reference_set_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'biometric reference set not found';
  end if;

  v_pre_tenant_id := v_set.tenant_id;
  v_pre_empresa_id := v_set.empresa_id;
  v_pre_colaborador_id := v_set.colaborador_id;

  v_authorization_id :=
    private.biometric_backend_require_legal_auth_1_to_1(
      v_pre_tenant_id,
      v_pre_empresa_id,
      v_pre_colaborador_id,
      p_executor_id
    );

  if v_authorization_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'BIOMETRIC_LEGAL_AUTH_REQUIRED';
  end if;

  select *
    into v_set
  from private.biometric_reference_sets
  where id = p_reference_set_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'biometric reference set not found';
  end if;

  if v_set.tenant_id is distinct from v_pre_tenant_id
     or v_set.empresa_id is distinct from v_pre_empresa_id
     or v_set.colaborador_id is distinct from v_pre_colaborador_id
  then
    raise exception using
      errcode = '42501',
      message = 'biometric reference set boundary changed during activation';
  end if;

  if v_set.status <> 'READY'
     or v_set.current_centroid_id is distinct from p_centroid_id
  then
    raise exception using
      errcode = '23514',
      message =
        'reference set is not READY with requested centroid';
  end if;

  if not exists (
    select 1
    from private.biometric_centroids c
    where c.id = p_centroid_id
      and c.reference_set_id = v_set.id
      and c.material_deleted_at is null
      and c.centroid_ciphertext is not null
  ) then
    raise exception using
      errcode = '23514',
      message = 'valid centroid not found for reference set';
  end if;

  select count(*)
    into v_active_count
  from private.biometric_references
  where reference_set_id = v_set.id
    and status = 'ACTIVE';

  if v_active_count not between 3 and 5 then
    raise exception using
      errcode = '23514',
      message = 'activation requires 3 to 5 ACTIVE references';
  end if;

  select id
    into v_old_active_id
  from private.biometric_reference_sets
  where tenant_id = v_set.tenant_id
    and empresa_id = v_set.empresa_id
    and colaborador_id = v_set.colaborador_id
    and profile_id = v_set.profile_id
    and status = 'ACTIVE'
    and id <> v_set.id
  for update;

  if v_old_active_id is not null then
    update private.biometric_reference_sets
    set status = 'SUPERSEDED',
        superseded_at = now(),
        lifecycle_reason_code = 'PROFILE_SET_REPLACED',
        updated_at = now()
    where id = v_old_active_id;

    insert into private.biometric_audit_events (
      tenant_id,
      empresa_id,
      colaborador_id,
      event_code,
      object_kind,
      object_id,
      profile_id,
      quality_profile_id,
      reference_set_id,
      reason_code,
      actor_kind,
      actor_user_id,
      request_id
    )
    select
      tenant_id,
      empresa_id,
      colaborador_id,
      'REFERENCE_SET_SUPERSEDED',
      'REFERENCE_SET',
      id,
      profile_id,
      quality_profile_id,
      id,
      'PROFILE_SET_REPLACED',
      'USER',
      p_executor_id,
      p_request_id
    from private.biometric_reference_sets
    where id = v_old_active_id;
  end if;

  update private.biometric_reference_sets
  set status = 'ACTIVE',
      activated_at = now(),
      updated_at = now()
  where id = v_set.id;

  insert into private.biometric_audit_events (
    tenant_id,
    empresa_id,
    colaborador_id,
    event_code,
    object_kind,
    object_id,
    profile_id,
    quality_profile_id,
    reference_set_id,
    centroid_id,
    actor_kind,
    actor_user_id,
    request_id
  )
  values (
    v_set.tenant_id,
    v_set.empresa_id,
    v_set.colaborador_id,
    'REFERENCE_SET_ACTIVATED',
    'REFERENCE_SET',
    v_set.id,
    v_set.profile_id,
    v_set.quality_profile_id,
    v_set.id,
    p_centroid_id,
    'USER',
    p_executor_id,
    p_request_id
  );

  return jsonb_build_object(
    'referenceSetId',
    v_set.id,
    'status',
    'ACTIVE',
    'supersededReferenceSetId',
    v_old_active_id
  );
end;
$$;

create or replace function private.biometric_backend_revoke_legal_authorization_impl(
  p_authorization_id uuid,
  p_tenant_id uuid,
  p_empresa_id uuid,
  p_colaborador_id uuid,
  p_purpose_code text,
  p_reason_code text,
  p_request_id uuid,
  p_executor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_authorization private.biometric_legal_authorizations%rowtype;
  v_set_id uuid;
  v_reference_id uuid;
  v_set_ids uuid[] := '{}'::uuid[];
  v_reference_ids uuid[] := '{}'::uuid[];
  v_set_count integer := 0;
  v_reference_count integer := 0;
begin
  if p_executor_id is null then
    raise exception using
      errcode = '42501',
      message = 'BIOMETRIC_EXECUTOR_REQUIRED';
  end if;

  if p_purpose_code is distinct from 'ACCESS_VERIFICATION_1_TO_1' then
    raise exception using
      errcode = '23514',
      message = 'BIOMETRIC_PURPOSE_NOT_SUPPORTED';
  end if;

  if nullif(btrim(p_reason_code), '') is null then
    raise exception using
      errcode = '23502',
      message = 'BIOMETRIC_REVOCATION_REASON_REQUIRED';
  end if;

  select *
    into v_authorization
  from private.biometric_legal_authorizations
  where id = p_authorization_id
    and tenant_id = p_tenant_id
    and empresa_id = p_empresa_id
    and colaborador_id = p_colaborador_id
    and purpose_code = p_purpose_code
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'BIOMETRIC_LEGAL_AUTH_NOT_FOUND';
  end if;

  if v_authorization.status = 'REVOKED' then
    return jsonb_build_object(
      'authorizationId',
      v_authorization.id,
      'status',
      'REVOKED',
      'referenceSetsRevoked',
      0,
      'referencesRevoked',
      0,
      'idempotent',
      true
    );
  end if;

  if v_authorization.status <> 'AUTHORIZED' then
    raise exception using
      errcode = '23514',
      message = 'BIOMETRIC_LEGAL_AUTH_NOT_AUTHORIZED';
  end if;

  for v_set_id in
    select s.id
    from private.biometric_reference_sets s
    where s.tenant_id = p_tenant_id
      and s.empresa_id = p_empresa_id
      and s.colaborador_id = p_colaborador_id
      and s.status <> 'REVOKED'
    order by s.id
    for update
  loop
    v_set_ids :=
      array_append(
        v_set_ids,
        v_set_id
      );
  end loop;

  for v_reference_id in
    select r.id
    from private.biometric_references r
    where r.tenant_id = p_tenant_id
      and r.empresa_id = p_empresa_id
      and r.colaborador_id = p_colaborador_id
      and r.status <> 'REVOKED'
    order by r.reference_set_id, r.id
    for update
  loop
    v_reference_ids :=
      array_append(
        v_reference_ids,
        v_reference_id
      );
  end loop;

  update private.biometric_legal_authorizations
  set status = 'REVOKED',
      revoked_by = p_executor_id,
      revoked_at = clock_timestamp(),
      revocation_reason_code = p_reason_code,
      last_action_by = p_executor_id,
      updated_at = clock_timestamp()
  where id = v_authorization.id;

  if cardinality(v_set_ids) > 0 then
    update private.biometric_reference_sets
    set status = 'REVOKED',
        revoked_at = clock_timestamp(),
        lifecycle_reason_code = p_reason_code,
        updated_at = clock_timestamp()
    where id = any(v_set_ids);

    get diagnostics v_set_count = row_count;

    insert into private.biometric_audit_events (
      tenant_id,
      empresa_id,
      colaborador_id,
      event_code,
      object_kind,
      object_id,
      profile_id,
      quality_profile_id,
      reference_set_id,
      reason_code,
      actor_kind,
      actor_user_id,
      request_id
    )
    select
      s.tenant_id,
      s.empresa_id,
      s.colaborador_id,
      'REFERENCE_SET_REVOKED',
      'REFERENCE_SET',
      s.id,
      s.profile_id,
      s.quality_profile_id,
      s.id,
      p_reason_code,
      'USER',
      p_executor_id,
      p_request_id
    from private.biometric_reference_sets s
    where s.id = any(v_set_ids)
    order by s.id;
  end if;

  if cardinality(v_reference_ids) > 0 then
    update private.biometric_references
    set status = 'REVOKED',
        revoked_at = clock_timestamp(),
        lifecycle_reason_code = p_reason_code,
        updated_at = clock_timestamp()
    where id = any(v_reference_ids);

    get diagnostics v_reference_count = row_count;

    insert into private.biometric_audit_events (
      tenant_id,
      empresa_id,
      colaborador_id,
      event_code,
      object_kind,
      object_id,
      profile_id,
      quality_profile_id,
      reference_set_id,
      reference_id,
      reason_code,
      actor_kind,
      actor_user_id,
      request_id
    )
    select
      r.tenant_id,
      r.empresa_id,
      r.colaborador_id,
      'REFERENCE_REVOKED',
      'REFERENCE',
      r.id,
      r.profile_id,
      r.quality_profile_id,
      r.reference_set_id,
      r.id,
      p_reason_code,
      'USER',
      p_executor_id,
      p_request_id
    from private.biometric_references r
    where r.id = any(v_reference_ids)
    order by r.reference_set_id, r.id;
  end if;

  return jsonb_build_object(
    'authorizationId',
    v_authorization.id,
    'status',
    'REVOKED',
    'referenceSetsRevoked',
    v_set_count,
    'referencesRevoked',
    v_reference_count,
    'idempotent',
    false
  );
end;
$$;

create or replace function public.backend_biometric_revoke_legal_authorization(
  p_authorization_id uuid,
  p_tenant_id uuid,
  p_empresa_id uuid,
  p_colaborador_id uuid,
  p_purpose_code text,
  p_reason_code text,
  p_request_id uuid,
  p_executor_id uuid
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.biometric_backend_revoke_legal_authorization_impl(
    p_authorization_id,
    p_tenant_id,
    p_empresa_id,
    p_colaborador_id,
    p_purpose_code,
    p_reason_code,
    p_request_id,
    p_executor_id
  );
$$;

revoke all on function private.biometric_backend_require_legal_auth_1_to_1(
  uuid,
  uuid,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function private.biometric_backend_get_active_bundle_g4_impl(
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function private.biometric_backend_revoke_legal_authorization_impl(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function private.biometric_backend_get_active_bundle_impl(
  uuid,
  uuid,
  uuid,
  text,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function public.backend_biometric_get_active_bundle(
  uuid,
  uuid,
  uuid,
  text,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function public.backend_biometric_get_active_bundle(
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function public.backend_biometric_revoke_legal_authorization(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

grant usage on schema private to service_role;

grant execute on function private.biometric_backend_require_legal_auth_1_to_1(
  uuid,
  uuid,
  uuid,
  uuid
) to service_role;

grant execute on function private.biometric_backend_get_active_bundle_g4_impl(
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  uuid
) to service_role;

grant execute on function private.biometric_backend_revoke_legal_authorization_impl(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  uuid,
  uuid
) to service_role;

grant execute on function public.backend_biometric_get_active_bundle(
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  uuid
) to service_role;

grant execute on function public.backend_biometric_revoke_legal_authorization(
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  uuid,
  uuid
) to service_role;

-- =============================================================================
-- G4-E2-K4-B2 — split-auth final overrides
--
-- HUMAN_REQUIRED:
--   create/register/change/store/activate
--   actor humano autenticado e autorizado no broker.
--
-- COMPONENT_ONLY:
--   getActiveBundle
--   broker server-side + autorizacao legal 1:1 vigente.
--
-- SECURITY:
--   * tenant alegado nunca e trust anchor isolado;
--   * change/activate conferem tenant real do recurso sob lock;
--   * wrappers legados sem tenant deixam de ser executaveis por service_role;
--   * getActiveBundle nao inventa executor humano.
-- =============================================================================

create or replace function private.biometric_backend_require_legal_auth_1_to_1_component(
  p_tenant_id uuid,
  p_empresa_id uuid,
  p_colaborador_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  v_authorization_id uuid;
  v_latest_status text;
  v_latest_valid_until timestamptz;
begin
  select a.id
    into v_authorization_id
  from private.biometric_legal_authorizations a
  where a.tenant_id = p_tenant_id
    and a.empresa_id = p_empresa_id
    and a.colaborador_id = p_colaborador_id
    and a.purpose_code = 'ACCESS_VERIFICATION_1_TO_1'
    and a.status = 'AUTHORIZED'
    and a.revoked_at is null
    and a.valid_until > clock_timestamp()
  order by a.id
  limit 1
  for share;

  if found then
    return v_authorization_id;
  end if;

  select
    a.status,
    a.valid_until
  into
    v_latest_status,
    v_latest_valid_until
  from private.biometric_legal_authorizations a
  where a.tenant_id = p_tenant_id
    and a.empresa_id = p_empresa_id
    and a.colaborador_id = p_colaborador_id
    and a.purpose_code = 'ACCESS_VERIFICATION_1_TO_1'
  order by a.updated_at desc, a.id desc
  limit 1;

  if v_latest_status = 'REVOKED' then
    raise exception using
      errcode = 'P0001',
      message = 'BIOMETRIC_LEGAL_AUTH_REVOKED';
  end if;

  if v_latest_status = 'EXPIRED'
     or (
       v_latest_status = 'AUTHORIZED'
       and (
         v_latest_valid_until is null
         or v_latest_valid_until <= clock_timestamp()
       )
     )
  then
    raise exception using
      errcode = 'P0001',
      message = 'BIOMETRIC_LEGAL_AUTH_EXPIRED';
  end if;

  raise exception using
    errcode = 'P0001',
    message = 'BIOMETRIC_LEGAL_AUTH_REQUIRED';
end;
$$;

create or replace function private.biometric_backend_get_active_bundle_component_g4_impl(
  p_tenant_id uuid,
  p_empresa_id uuid,
  p_colaborador_id uuid,
  p_profile_id text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_authorization_id uuid;
begin
  perform private.biometric_assert_boundary(
    p_tenant_id,
    p_empresa_id,
    p_colaborador_id
  );

  v_authorization_id :=
    private.biometric_backend_require_legal_auth_1_to_1_component(
      p_tenant_id,
      p_empresa_id,
      p_colaborador_id
    );

  if v_authorization_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'BIOMETRIC_LEGAL_AUTH_REQUIRED';
  end if;

  return private.biometric_backend_get_active_bundle_impl(
    p_tenant_id,
    p_empresa_id,
    p_colaborador_id,
    p_profile_id,
    p_request_id
  );
end;
$$;

create or replace function public.backend_biometric_get_active_bundle(
  p_tenant_id uuid,
  p_empresa_id uuid,
  p_colaborador_id uuid,
  p_profile_id text,
  p_request_id uuid
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.biometric_backend_get_active_bundle_component_g4_impl(
    p_tenant_id,
    p_empresa_id,
    p_colaborador_id,
    p_profile_id,
    p_request_id
  );
$$;

create or replace function private.biometric_backend_change_reference_status_tenant_g4_impl(
  p_tenant_id uuid,
  p_reference_id uuid,
  p_next_status text,
  p_reason_code text,
  p_request_id uuid,
  p_executor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_reference_set_id uuid;
  v_pre_tenant_id uuid;
  v_locked_tenant_id uuid;
begin
  if p_executor_id is null then
    raise exception using
      errcode = '42501',
      message = 'BIOMETRIC_EXECUTOR_REQUIRED';
  end if;

  if p_tenant_id is null then
    raise exception using
      errcode = '42501',
      message = 'BIOMETRIC_TENANT_REQUIRED';
  end if;

  -- Pre-read sem lock: descobre o boundary declarado pelo recurso.
  select
    r.reference_set_id,
    s.tenant_id
  into
    v_reference_set_id,
    v_pre_tenant_id
  from private.biometric_references r
  join private.biometric_reference_sets s
    on s.id = r.reference_set_id
  where r.id = p_reference_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'biometric reference not found';
  end if;

  if v_pre_tenant_id is distinct from p_tenant_id then
    raise exception using
      errcode = '42501',
      message = 'BIOMETRIC_TENANT_RESOURCE_MISMATCH';
  end if;

  -- Ordem determinística: SET primeiro, depois REFERENCE.
  select s.tenant_id
    into v_locked_tenant_id
  from private.biometric_reference_sets s
  where s.id = v_reference_set_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'biometric reference set not found';
  end if;

  if v_locked_tenant_id is distinct from p_tenant_id
     or v_locked_tenant_id is distinct from v_pre_tenant_id
  then
    raise exception using
      errcode = '42501',
      message = 'BIOMETRIC_TENANT_RESOURCE_MISMATCH';
  end if;

  perform 1
  from private.biometric_references r
  where r.id = p_reference_id
    and r.reference_set_id = v_reference_set_id
  for update;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'biometric reference boundary changed during status change';
  end if;

  return private.biometric_backend_change_reference_status_impl(
    p_reference_id,
    p_next_status,
    p_reason_code,
    p_request_id,
    p_executor_id
  );
end;
$$;

create or replace function public.backend_biometric_change_reference_status(
  p_tenant_id uuid,
  p_reference_id uuid,
  p_next_status text,
  p_reason_code text,
  p_request_id uuid,
  p_executor_id uuid
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.biometric_backend_change_reference_status_tenant_g4_impl(
    p_tenant_id,
    p_reference_id,
    p_next_status,
    p_reason_code,
    p_request_id,
    p_executor_id
  );
$$;

create or replace function private.biometric_backend_activate_reference_set_tenant_g4_impl(
  p_tenant_id uuid,
  p_reference_set_id uuid,
  p_centroid_id uuid,
  p_request_id uuid,
  p_executor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_set private.biometric_reference_sets%rowtype;
  v_pre_tenant_id uuid;
  v_pre_empresa_id uuid;
  v_pre_colaborador_id uuid;
  v_authorization_id uuid;
begin
  if p_executor_id is null then
    raise exception using
      errcode = '42501',
      message = 'BIOMETRIC_EXECUTOR_REQUIRED';
  end if;

  if p_tenant_id is null then
    raise exception using
      errcode = '42501',
      message = 'BIOMETRIC_TENANT_REQUIRED';
  end if;

  -- Pre-read sem lock para descobrir o boundary.
  select *
    into v_set
  from private.biometric_reference_sets
  where id = p_reference_set_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'biometric reference set not found';
  end if;

  if v_set.tenant_id is distinct from p_tenant_id then
    raise exception using
      errcode = '42501',
      message = 'BIOMETRIC_TENANT_RESOURCE_MISMATCH';
  end if;

  v_pre_tenant_id := v_set.tenant_id;
  v_pre_empresa_id := v_set.empresa_id;
  v_pre_colaborador_id := v_set.colaborador_id;

  -- IMPORTANTE: legal-auth antes do lock do set.
  -- Mantém a mesma ordem usada pela revogação concorrente.
  v_authorization_id :=
    private.biometric_backend_require_legal_auth_1_to_1(
      v_pre_tenant_id,
      v_pre_empresa_id,
      v_pre_colaborador_id,
      p_executor_id
    );

  if v_authorization_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'BIOMETRIC_LEGAL_AUTH_REQUIRED';
  end if;

  -- Só depois do legal-auth o recurso é bloqueado.
  select *
    into v_set
  from private.biometric_reference_sets
  where id = p_reference_set_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'biometric reference set not found';
  end if;

  if v_set.tenant_id is distinct from p_tenant_id
     or v_set.tenant_id is distinct from v_pre_tenant_id
     or v_set.empresa_id is distinct from v_pre_empresa_id
     or v_set.colaborador_id is distinct from v_pre_colaborador_id
  then
    raise exception using
      errcode = '42501',
      message = 'biometric reference set boundary changed during activation';
  end if;

  -- O impl G4 existente preserva todas as regras funcionais:
  -- READY/current centroid, 3-5 ACTIVE refs, supersede, audit etc.
  -- Os locks já adquiridos nesta transação são reutilizados.
  return private.biometric_backend_activate_reference_set_impl(
    p_reference_set_id,
    p_centroid_id,
    p_request_id,
    p_executor_id
  );
end;
$$;

create or replace function public.backend_biometric_activate_reference_set(
  p_tenant_id uuid,
  p_reference_set_id uuid,
  p_centroid_id uuid,
  p_request_id uuid,
  p_executor_id uuid
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.biometric_backend_activate_reference_set_tenant_g4_impl(
    p_tenant_id,
    p_reference_set_id,
    p_centroid_id,
    p_request_id,
    p_executor_id
  );
$$;

-- Remove execute dos caminhos antigos/bypass.
revoke all on function public.backend_biometric_get_active_bundle(
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function private.biometric_backend_get_active_bundle_g4_impl(
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function public.backend_biometric_change_reference_status(
  uuid,
  text,
  text,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function private.biometric_backend_change_reference_status_impl(
  uuid,
  text,
  text,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function public.backend_biometric_activate_reference_set(
  uuid,
  uuid,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function private.biometric_backend_activate_reference_set_impl(
  uuid,
  uuid,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

-- Novos helpers: service-role only.
revoke all on function private.biometric_backend_require_legal_auth_1_to_1_component(
  uuid,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function private.biometric_backend_get_active_bundle_component_g4_impl(
  uuid,
  uuid,
  uuid,
  text,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function private.biometric_backend_change_reference_status_tenant_g4_impl(
  uuid,
  uuid,
  text,
  text,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function private.biometric_backend_activate_reference_set_tenant_g4_impl(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function public.backend_biometric_get_active_bundle(
  uuid,
  uuid,
  uuid,
  text,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function public.backend_biometric_change_reference_status(
  uuid,
  uuid,
  text,
  text,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function public.backend_biometric_activate_reference_set(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

grant usage on schema private to service_role;

grant execute on function private.biometric_backend_require_legal_auth_1_to_1_component(
  uuid,
  uuid,
  uuid
) to service_role;

grant execute on function private.biometric_backend_get_active_bundle_component_g4_impl(
  uuid,
  uuid,
  uuid,
  text,
  uuid
) to service_role;

grant execute on function private.biometric_backend_change_reference_status_tenant_g4_impl(
  uuid,
  uuid,
  text,
  text,
  uuid,
  uuid
) to service_role;

grant execute on function private.biometric_backend_activate_reference_set_tenant_g4_impl(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid
) to service_role;

grant execute on function public.backend_biometric_get_active_bundle(
  uuid,
  uuid,
  uuid,
  text,
  uuid
) to service_role;

grant execute on function public.backend_biometric_change_reference_status(
  uuid,
  uuid,
  text,
  text,
  uuid,
  uuid
) to service_role;

grant execute on function public.backend_biometric_activate_reference_set(
  uuid,
  uuid,
  uuid,
  uuid,
  uuid
) to service_role;

-- =============================================================================
-- END G4-E2-K4-B2
-- =============================================================================
-- Candidate discovery / identificacao 1:N permanece fora deste contrato.


commit;