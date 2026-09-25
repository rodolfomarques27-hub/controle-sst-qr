export async function verificarIdentidadeContaMestreService({
    supabase,
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "usuario_conta_mestre_identidade"
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível validar a identidade da Conta Mestre."
        );
    }

    const resultado =
        Array.isArray(data)
            ? data[0]
            : data;

    return resultado === true;
}
export async function obterStatusRotacaoSenhaContaMestreService({
    supabase,
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "admin_status_rotacao_senha_conta_mestre"
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível validar o estado de segurança da Conta Mestre."
        );
    }

    const resultado =
        Array.isArray(data)
            ? data[0]
            : data;

    if (
        !resultado ||
        typeof resultado !==
            "object"
    ) {
        return {
            obrigatoria:
                false,
            motivo:
                null,
            emailReferencia:
                null,
            marcadaEm:
                null,
            senhaRotacionadaEm:
                null,
            concluidaEm:
                null,
        };
    }

    return {
        obrigatoria:
            resultado.rotacao_senha_obrigatoria ===
            true,
        motivo:
            String(
                resultado.motivo_rotacao ||
                ""
            ).trim() ||
            null,
        emailReferencia:
            String(
                resultado.email_referencia ||
                ""
            ).trim() ||
            null,
        marcadaEm:
            resultado.marcada_em ||
            null,
        senhaRotacionadaEm:
            resultado.senha_rotacionada_em ||
            null,
        concluidaEm:
            resultado.concluida_em ||
            null,
    };
}

export async function concluirRotacaoSenhaContaMestreService({
    supabase,
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "admin_concluir_rotacao_senha_conta_mestre"
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível concluir a atualização de segurança da Conta Mestre."
        );
    }

    const resultado =
        Array.isArray(data)
            ? data[0]
            : data;

    if (resultado !== true) {
        throw new Error(
            "A atualização de segurança da Conta Mestre não foi concluída."
        );
    }

    return true;
}

export async function listarTenantsPlataformaService({
    supabase,
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "admin_listar_tenants_plataforma"
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível carregar os clientes da plataforma."
        );
    }

    if (!Array.isArray(data)) {
        return [];
    }

    return data;
}

export async function listarEmpresasTenantAdminService({
    supabase,
    tenantId,
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    if (!tenantId) {
        throw new Error(
            "Tenant não informado."
        );
    }

    const {
        data,
        error,
    } =
        await supabase
            .from("empresas")
            .select(
                "id,nome,cnpj,status,tipo_empresa,created_at"
            )
            .eq(
                "tenant_id",
                tenantId
            )
            .order(
                "nome",
                {
                    ascending:
                        true,
                }
            );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível carregar as empresas do tenant."
        );
    }

    return Array.isArray(data)
        ? data
        : [];
}

export async function listarUsuariosTenantAdminService({
    supabase,
    tenantId,
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    if (!tenantId) {
        throw new Error(
            "Tenant não informado."
        );
    }

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "admin_listar_usuarios_tenant_sistema",
            {
                p_tenant_id:
                    tenantId,
            }
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível carregar os usuários do tenant."
        );
    }

    return Array.isArray(data)
        ? data
        : [];
}

export async function listarModulosTenantAdminService({
    supabase,
    tenantId,
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    if (!tenantId) {
        throw new Error(
            "Tenant não informado."
        );
    }

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "admin_listar_modulos_tenant",
            {
                p_tenant_id:
                    tenantId,
            }
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível carregar os módulos do tenant."
        );
    }

    return Array.isArray(data)
        ? data
        : [];
}

export async function salvarModuloTenantAdminService({
    supabase,
    tenantId,
    moduloChave,
    status,
    observacao = "",
    configuracao = {},
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    if (!tenantId) {
        throw new Error(
            "Tenant não informado."
        );
    }

    const moduloNormalizado =
        String(
            moduloChave || ""
        ).trim();

    if (!moduloNormalizado) {
        throw new Error(
            "Módulo não informado."
        );
    }

    const statusNormalizado =
        String(
            status || ""
        )
            .trim()
            .toLowerCase();

    if (
        ![
            "ativo",
            "suspenso",
            "nao_contratado",
        ].includes(
            statusNormalizado
        )
    ) {
        throw new Error(
            "Status de módulo inválido."
        );
    }

    const configuracaoSegura =
        configuracao &&
        typeof configuracao === "object" &&
        !Array.isArray(
            configuracao
        )
            ? configuracao
            : {};

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "admin_salvar_modulo_tenant",
            {
                p_tenant_id:
                    tenantId,
                p_modulo_chave:
                    moduloNormalizado,
                p_status:
                    statusNormalizado,
                p_observacao:
                    String(
                        observacao || ""
                    ).trim(),
                p_configuracao:
                    configuracaoSegura,
            }
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível atualizar o módulo do tenant."
        );
    }

    return data ?? null;
}

export async function obterEscopoEmpresasMembershipAdminService({
    supabase,
    membershipId,
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    if (!membershipId) {
        throw new Error(
            "Membership não informado."
        );
    }

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "admin_obter_escopo_empresas_membership",
            {
                p_membership_id:
                    membershipId,
            }
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível carregar o escopo empresarial."
        );
    }

    const resultado =
        Array.isArray(data)
            ? data[0]
            : data;

    if (
        !resultado ||
        typeof resultado !== "object"
    ) {
        throw new Error(
            "Resposta inválida do escopo empresarial."
        );
    }

    return resultado;
}

export async function salvarEscopoEmpresasMembershipAdminService({
    supabase,
    membershipId,
    escopoEmpresas,
    empresaIds = [],
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    if (!membershipId) {
        throw new Error(
            "Membership não informado."
        );
    }

    const escopo =
        String(
            escopoEmpresas || ""
        )
            .trim()
            .toLowerCase();

    if (
        ![
            "todas",
            "selecionadas",
        ].includes(
            escopo
        )
    ) {
        throw new Error(
            "Escopo empresarial inválido."
        );
    }

    const ids =
        Array.isArray(
            empresaIds
        )
            ? [
                ...new Set(
                    empresaIds
                        .map(
                            (id) =>
                                String(
                                    id || ""
                                ).trim()
                        )
                        .filter(
                            Boolean
                        )
                ),
            ]
            : [];

    if (
        escopo ===
            "selecionadas" &&
        ids.length === 0
    ) {
        throw new Error(
            "Selecione ao menos uma empresa."
        );
    }

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "admin_salvar_escopo_empresas_membership",
            {
                p_membership_id:
                    membershipId,
                p_escopo_empresas:
                    escopo,
                p_empresa_ids:
                    escopo ===
                    "selecionadas"
                        ? ids
                        : [],
            }
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível salvar o escopo empresarial."
        );
    }

    return data ?? null;
}

const SLUGS_TENANT_RESERVADOS =
    new Set([
        "www",
        "app",
        "admin",
        "api",
        "qr",
        "status",
        "assets",
        "static",
        "auth",
    ]);

export function montarProvisionamentoTenantRascunhoPayload({
    nomeTenant,
    slug,
    empresaNome,
    empresaTipo = "Contratante",
} = {}) {
    const nomeTenantNormalizado =
        String(
            nomeTenant || ""
        ).trim();

    const slugNormalizado =
        String(
            slug || ""
        )
            .trim()
            .toLowerCase();

    const empresaNomeNormalizado =
        String(
            empresaNome || ""
        ).trim();

    const tiposPermitidos =
        {
            contratante:
                "Contratante",
            terceirizada:
                "Terceirizada",
            subcontratada:
                "Subcontratada",
        };

    const empresaTipoNormalizado =
        tiposPermitidos[
            String(
                empresaTipo || ""
            )
                .trim()
                .toLowerCase()
        ];

    if (
        nomeTenantNormalizado.length <
            2 ||
        nomeTenantNormalizado.length >
            160
    ) {
        throw new Error(
            "Nome do cliente deve possuir entre 2 e 160 caracteres."
        );
    }

    if (
        slugNormalizado.length <
            2 ||
        slugNormalizado.length >
            63 ||
        !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(
            slugNormalizado
        )
    ) {
        throw new Error(
            "Slug inválido. Use letras minúsculas, números e hífens."
        );
    }

    if (
        SLUGS_TENANT_RESERVADOS.has(
            slugNormalizado
        )
    ) {
        throw new Error(
            "Este slug é reservado pela plataforma SafeScan."
        );
    }

    if (
        empresaNomeNormalizado.length <
            2 ||
        empresaNomeNormalizado.length >
            160
    ) {
        throw new Error(
            "Nome da empresa inicial deve possuir entre 2 e 160 caracteres."
        );
    }

    if (!empresaTipoNormalizado) {
        throw new Error(
            "Tipo da empresa inicial inválido."
        );
    }

    const hostname =
        slugNormalizado +
        ".safescanbrasil.com.br";

    return {
        p_nome_tenant:
            nomeTenantNormalizado,
        p_slug:
            slugNormalizado,
        p_empresa_nome:
            empresaNomeNormalizado,
        p_hostname:
            hostname,
        p_empresa_tipo:
            empresaTipoNormalizado,
    };
}

export async function provisionarTenantRascunhoService({
    supabase,
    nomeTenant,
    slug,
    empresaNome,
    empresaTipo = "Contratante",
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    const payload =
        montarProvisionamentoTenantRascunhoPayload({
            nomeTenant,
            slug,
            empresaNome,
            empresaTipo,
        });

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "admin_provisionar_tenant_rascunho",
            payload
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível provisionar o novo cliente."
        );
    }

    return data ?? null;
}

function validarClienteMfaContaMestre(
    supabase
) {
    if (
        !supabase?.auth?.mfa ||
        typeof supabase.auth.mfa.listFactors !==
            "function" ||
        typeof supabase.auth.mfa
            .getAuthenticatorAssuranceLevel !==
            "function" ||
        typeof supabase.auth.mfa.enroll !==
            "function" ||
        typeof supabase.auth.mfa.unenroll !==
            "function" ||
        typeof supabase.auth.mfa
            .challengeAndVerify !==
            "function"
    ) {
        throw new Error(
            "MFA não está disponível no cliente de autenticação."
        );
    }
}

export async function obterEstadoMfaContaMestreService({
    supabase,
}) {
    validarClienteMfaContaMestre(
        supabase
    );

    const {
        data:
            assuranceData,
        error:
            assuranceError,
    } =
        await supabase.auth.mfa
            .getAuthenticatorAssuranceLevel();

    if (assuranceError) {
        throw assuranceError;
    }

    const {
        data:
            factorsData,
        error:
            factorsError,
    } =
        await supabase.auth.mfa
            .listFactors();

    if (factorsError) {
        throw factorsError;
    }

    const fatoresTotp =
        Array.isArray(
            factorsData?.totp
        )
            ? factorsData.totp
            : [];

    const fatoresTotpVerificados =
        fatoresTotp.filter(
            (fator) =>
                fator?.status ===
                "verified"
        );

    const fatoresTotpPendentes =
        fatoresTotp.filter(
            (fator) =>
                fator?.status !==
                "verified"
        );

    return {
        currentLevel:
            assuranceData
                ?.currentLevel ||
            null,

        nextLevel:
            assuranceData
                ?.nextLevel ||
            null,

        fatoresTotp,

        fatoresTotpVerificados,

        fatoresTotpPendentes,
    };
}

export async function iniciarCadastroMfaTotpContaMestreService({
    supabase,
}) {
    validarClienteMfaContaMestre(
        supabase
    );

    const estado =
        await obterEstadoMfaContaMestreService({
            supabase,
        });

    if (
        estado
            .fatoresTotpVerificados
            .length >
        0
    ) {
        throw new Error(
            "A Conta Mestre já possui fator TOTP verificado."
        );
    }

    for (
        const fator of
        estado.fatoresTotpPendentes
    ) {
        if (!fator?.id) {
            continue;
        }

        const {
            error,
        } =
            await supabase.auth.mfa
                .unenroll({
                    factorId:
                        fator.id,
                });

        if (error) {
            throw error;
        }
    }

    const {
        data,
        error,
    } =
        await supabase.auth.mfa
            .enroll({
                factorType:
                    "totp",
                friendlyName:
                    "SafeScan Conta Mestre",
            });

    if (error) {
        throw error;
    }

    if (
        !data?.id ||
        !data?.totp?.secret
    ) {
        throw new Error(
            "O Supabase não retornou os dados necessários para cadastrar o TOTP."
        );
    }

    return {
        factorId:
            data.id,

        qrCode:
            data.totp
                ?.qr_code ||
            "",

        secret:
            data.totp
                ?.secret ||
            "",

        uri:
            data.totp
                ?.uri ||
            "",
    };
}

export async function verificarMfaTotpContaMestreService({
    supabase,
    factorId,
    codigo,
}) {
    validarClienteMfaContaMestre(
        supabase
    );

    const codigoTratado =
        String(
            codigo ||
            ""
        )
            .replace(
                /\s+/g,
                ""
            );

    if (
        !factorId ||
        !/^\d{6}$/.test(
            codigoTratado
        )
    ) {
        throw new Error(
            "Informe o código de 6 dígitos do aplicativo autenticador."
        );
    }

    const {
        error,
    } =
        await supabase.auth.mfa
            .challengeAndVerify({
                factorId,
                code:
                    codigoTratado,
            });

    if (error) {
        throw error;
    }

    const estado =
        await obterEstadoMfaContaMestreService({
            supabase,
        });

    if (
        estado.currentLevel !==
            "aal2" ||
        estado
            .fatoresTotpVerificados
            .length ===
            0
    ) {
        throw new Error(
            "A sessão não atingiu o nível AAL2 após a verificação MFA."
        );
    }

    /*
     * A3-A12:
     * challengeAndVerify e confirmação AAL2
     * já ocorreram antes deste ponto.
     *
     * Nenhum fator, código ou segredo é enviado
     * para a auditoria.
     */
    const {
        error:
            auditoriaError,
    } =
        await supabase.rpc(
            "registrar_auditoria_mfa_conta_mestre"
        );

    if (auditoriaError) {
        console.error(
            "MASTER_MFA_AUDIT_FAILED"
        );
    }

    return estado;
}

function decodificarJwtPayloadContaMestre(
    accessToken
) {
    const partes =
        String(
            accessToken ||
            ""
        ).split(".");

    if (
        partes.length !== 3
    ) {
        throw new Error(
            "Access token inválido para leitura da sessão."
        );
    }

    const base64 =
        partes[1]
            .replace(
                /-/g,
                "+"
            )
            .replace(
                /_/g,
                "/"
            );

    const preenchimento =
        base64 +
        "=".repeat(
            (
                4 -
                (
                    base64.length %
                    4
                )
            ) %
            4
        );

    let json;

    try {
        json =
            decodeURIComponent(
                Array.from(
                    atob(
                        preenchimento
                    )
                )
                    .map(
                        (caractere) =>
                            "%" +
                            caractere
                                .charCodeAt(0)
                                .toString(16)
                                .padStart(
                                    2,
                                    "0"
                                )
                    )
                    .join("")
            );
    }
    catch {
        throw new Error(
            "Não foi possível interpretar os dados da sessão."
        );
    }

    return JSON.parse(
        json
    );
}

export async function obterEstadoSessaoContaMestreService({
    supabase,
}) {
    if (
        !supabase?.auth ||
        typeof supabase.auth
            .getSession !==
            "function"
    ) {
        throw new Error(
            "Serviço de sessão indisponível."
        );
    }

    const {
        data,
        error,
    } =
        await supabase.auth
            .getSession();

    if (error) {
        throw error;
    }

    const sessao =
        data?.session;

    if (
        !sessao?.access_token ||
        !sessao?.user?.id
    ) {
        throw new Error(
            "Nenhuma sessão autenticada foi encontrada."
        );
    }

    const payload =
        decodificarJwtPayloadContaMestre(
            sessao.access_token
        );

    return {
        userId:
            sessao.user.id,

        email:
            sessao.user.email ||
            "",

        sessionId:
            String(
                payload?.session_id ||
                ""
            ),

        aal:
            String(
                payload?.aal ||
                ""
            ),

        issuedAt:
            Number(
                payload?.iat
            ) || null,

        expiresAt:
            Number(
                payload?.exp
            ) || null,
    };
}

export async function revogarSessoesContaMestreService({
    supabase,
    escopo,
}) {
    const scope =
        String(
            escopo ||
            ""
        )
            .trim()
            .toLowerCase();

    if (
        scope !== "others" &&
        scope !== "global"
    ) {
        throw new Error(
            "Escopo de revogação de sessões inválido."
        );
    }

    const estadoAntes =
        await obterEstadoSessaoContaMestreService({
            supabase,
        });

    if (
        estadoAntes.aal !==
        "aal2"
    ) {
        throw new Error(
            "A revogação de sessões exige uma sessão AAL2."
        );
    }

    if (
        !supabase?.functions ||
        typeof supabase.functions
            .invoke !==
            "function"
    ) {
        throw new Error(
            "Serviço seguro de revogação de sessões indisponível."
        );
    }

    const {
        data,
        error,
    } =
        await supabase.functions
            .invoke(
                "master-session-revoke",
                {
                    body: {
                        scope,
                    },
                }
            );

    if (error) {
        throw error;
    }

    if (
        data?.ok !== true ||
        data?.scope !==
            scope
    ) {
        throw new Error(
            "A revogação de sessões não foi confirmada pelo servidor."
        );
    }

    if (
        scope ===
        "global"
    ) {
        const {
            error:
                localError,
        } =
            await supabase.auth
                .signOut({
                    scope:
                        "local",
                });

        return {
            ...data,
            localSignOutError:
                localError?.message ||
                "",
        };
    }

    return data;
}