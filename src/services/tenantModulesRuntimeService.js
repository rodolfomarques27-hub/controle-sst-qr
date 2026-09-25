function textoSeguro(valor = "") {
    return String(valor ?? "").trim();
}

function objetoSeguro(valor = null) {
    return valor && typeof valor === "object" && !Array.isArray(valor)
        ? valor
        : {};
}

function normalizarTelasModulo(metadados = null) {
    const telas = objetoSeguro(metadados).telas;

    if (!Array.isArray(telas)) {
        return [];
    }

    return [
        ...new Set(
            telas
                .map((tela) => textoSeguro(tela))
                .filter(Boolean)
        ),
    ];
}

const TELAS_OCULTAS_RUNTIME_TENANT =
    new Set([
        "aniversariantes",
    ]);

export function montarPermissaoMembershipTenantRuntime({
    membership = null,
    permissaoLegada = null,
} = {}) {
    if (!membership) {
        return permissaoLegada || null;
    }

    const status = textoSeguro(
        membership.status
    ).toLowerCase();

    const papel = textoSeguro(
        membership.papel
    ).toLowerCase();

    return {
        ...(permissaoLegada || {}),
        perfil:
            papel
            || permissaoLegada?.perfil
            || "consulta",
        ativo:
            status === "ativo",
        bloqueado:
            status !== "ativo",
        acesso_global:
            false,
        permissoes:
            objetoSeguro(
                membership.permissoes
            ),
        precisa_trocar_senha:
            permissaoLegada?.precisa_trocar_senha ===
            true,
    };
}

export async function carregarModulosTenantRuntimeService({
    supabase,
    tenantId,
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado para carregar módulos do tenant."
        );
    }

    const tenantIdNormalizado =
        textoSeguro(
            tenantId
        );

    if (!tenantIdNormalizado) {
        throw new Error(
            "Tenant não informado para carregar módulos."
        );
    }

    const [
        catalogoResposta,
        entitlementResposta,
    ] =
        await Promise.all([
            supabase
                .from(
                    "modulos_sistema"
                )
                .select(
                    "chave,nome,obrigatorio,ativo,metadados"
                )
                .eq(
                    "ativo",
                    true
                ),
            supabase
                .from(
                    "tenant_modulos"
                )
                .select(
                    "modulo_chave,status"
                )
                .eq(
                    "tenant_id",
                    tenantIdNormalizado
                ),
        ]);

    if (catalogoResposta.error) {
        throw new Error(
            catalogoResposta.error.message
            || "Não foi possível carregar o catálogo de módulos."
        );
    }

    if (entitlementResposta.error) {
        throw new Error(
            entitlementResposta.error.message
            || "Não foi possível carregar os módulos contratados."
        );
    }

    const catalogo =
        Array.isArray(
            catalogoResposta.data
        )
            ? catalogoResposta.data
            : [];

    if (catalogo.length === 0) {
        throw new Error(
            "Catálogo de módulos indisponível para este ambiente."
        );
    }

    const statusPorModulo =
        new Map(
            (
                Array.isArray(
                    entitlementResposta.data
                )
                    ? entitlementResposta.data
                    : []
            )
                .map(
                    (item) => [
                        textoSeguro(
                            item?.modulo_chave
                        ).toLowerCase(),
                        textoSeguro(
                            item?.status
                        ).toLowerCase(),
                    ]
                )
                .filter(
                    ([chave]) =>
                        Boolean(
                            chave
                        )
                )
        );

    return catalogo
        .map(
            (modulo) => {
                const chave =
                    textoSeguro(
                        modulo?.chave
                    ).toLowerCase();

                const obrigatorio =
                    modulo?.obrigatorio ===
                    true;

                const status =
                    obrigatorio
                        ? "core"
                        : (
                            statusPorModulo.get(
                                chave
                            )
                            || "nao_contratado"
                        );

                return {
                    chave,
                    nome:
                        textoSeguro(
                            modulo?.nome
                        ),
                    obrigatorio,
                    status,
                    telas:
                        normalizarTelasModulo(
                            modulo?.metadados
                        ),
                    disponivel:
                        modulo?.ativo ===
                            true
                        && (
                            obrigatorio
                            || status ===
                                "ativo"
                        ),
                };
            }
        )
        .filter(
            (modulo) =>
                Boolean(
                    modulo.chave
                )
        );
}

export function moduloDisponivelTenantRuntime(
    modulos = [],
    chaveModulo = ""
) {
    const chaveNormalizada =
        textoSeguro(
            chaveModulo
        ).toLowerCase();

    if (!chaveNormalizada) {
        return false;
    }

    return (
        Array.isArray(
            modulos
        )
        && modulos.some(
            (modulo) =>
                textoSeguro(
                    modulo?.chave
                ).toLowerCase() ===
                    chaveNormalizada
                && modulo?.disponivel ===
                    true
        )
    );
}

export function telaTemMapeamentoModuloTenantRuntime(
    modulos = [],
    tela = ""
) {
    const telaNormalizada =
        textoSeguro(
            tela
        );

    if (!telaNormalizada) {
        return false;
    }

    if (
        TELAS_OCULTAS_RUNTIME_TENANT.has(
            telaNormalizada
        )
    ) {
        return true;
    }

    return (
        Array.isArray(
            modulos
        )
        && modulos.some(
            (modulo) =>
                Array.isArray(
                    modulo?.telas
                )
                && modulo.telas.includes(
                    telaNormalizada
                )
        )
    );
}

export function telaDisponivelTenantRuntime(
    modulos = [],
    tela = ""
) {
    const telaNormalizada =
        textoSeguro(
            tela
        );

    if (!telaNormalizada) {
        return true;
    }

    if (
        TELAS_OCULTAS_RUNTIME_TENANT.has(
            telaNormalizada
        )
    ) {
        return false;
    }

    const modulosDaTela =
        (
            Array.isArray(
                modulos
            )
                ? modulos
                : []
        ).filter(
            (modulo) =>
                Array.isArray(
                    modulo?.telas
                )
                && modulo.telas.includes(
                    telaNormalizada
                )
        );

    if (
        modulosDaTela.length ===
        0
    ) {
        return true;
    }

    return modulosDaTela.some(
        (modulo) =>
            modulo?.disponivel ===
            true
    );
}
