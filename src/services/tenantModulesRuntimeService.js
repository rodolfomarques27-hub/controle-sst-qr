import {
    moduloPlanoBaseSafeScan,
    obterDefinicaoComercialModuloSafeScan,
    telaPlanoBaseSafeScan,
} from "../constants/tenantModulesCommercialMatrix.js";
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


const PAPEIS_MEMBERSHIP_TENANT_VALIDOS =
    new Set([
        "administrador",
        "gestor",
        "tecnico_sst",
        "auditor",
        "consulta",
    ]);

const ROTULOS_PAPEL_MEMBERSHIP_TENANT =
    Object.freeze({
        administrador: "Administrador do ambiente",
        gestor: "Gestor",
        tecnico_sst: "Técnico SST",
        auditor: "Auditor",
        consulta: "Consulta",
    });

function normalizarPapelMembershipTenant(valor = "") {
    const papel = textoSeguro(valor).toLowerCase();
    return PAPEIS_MEMBERSHIP_TENANT_VALIDOS.has(papel) ? papel : "";
}

export function membershipTenantRuntimeAtiva({ membership = null, tenantId = "", userId = "" } = {}) {
    if (!membership) {
        return false;
    }

    const status = textoSeguro(membership.status).toLowerCase();
    const papel = normalizarPapelMembershipTenant(membership.papel);
    const tenantEsperado = textoSeguro(tenantId);
    const usuarioEsperado = textoSeguro(userId);
    const tenantMembership = textoSeguro(membership.tenant_id);
    const usuarioMembership = textoSeguro(membership.user_id);

    if (status !== "ativo" || !papel) {
        return false;
    }

    if (tenantEsperado && tenantMembership !== tenantEsperado) {
        return false;
    }

    if (usuarioEsperado && usuarioMembership !== usuarioEsperado) {
        return false;
    }

    return true;
}

function nomeSeguroUsuarioTenant(email = "") {
    const emailNormalizado = textoSeguro(email).toLowerCase();
    if (!emailNormalizado.includes("@")) {
        return "Usuário";
    }

    const local = emailNormalizado.split("@")[0].replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
    if (!local) {
        return "Usuário";
    }

    return local.replace(/\b\p{L}/gu, (letra) => letra.toUpperCase());
}

export function montarUsuarioMembershipTenantRuntime({ usuario = null, membership = null } = {}) {
    if (!usuario) {
        return usuario;
    }

    const email = textoSeguro(usuario.email).toLowerCase();
    const papel = normalizarPapelMembershipTenant(membership?.papel) || "consulta";
    const status = textoSeguro(membership?.status).toLowerCase();
    const nome = nomeSeguroUsuarioTenant(email);
    const funcao = ROTULOS_PAPEL_MEMBERSHIP_TENANT[papel] || "Usuário do ambiente";

    return {
        ...usuario,
        email,
        nome,
        name: nome,
        displayName: nome,
        funcao,
        cargo: funcao,
        perfil: papel,
        ativo: status === "ativo",
        bloqueado: status !== "ativo",
        acesso_global: false,
    };
}

export function montarPermissaoMembershipTenantRuntime({
    membership = null,
    permissaoLegada = null,
} = {}) {
    if (!membership) {
        return null;
    }

    const status = textoSeguro(membership.status).toLowerCase();
    const papel = normalizarPapelMembershipTenant(membership.papel);

    return {
        email: textoSeguro(permissaoLegada?.email).toLowerCase(),
        perfil: papel || "consulta",
        ativo: status === "ativo",
        bloqueado: status !== "ativo",
        acesso_global: false,
        permissoes: objetoSeguro(membership.permissoes),
        precisa_trocar_senha: permissaoLegada?.precisa_trocar_senha === true,
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

                const definicaoComercial =
                    obterDefinicaoComercialModuloSafeScan(
                        chave
                    );

                const planoBase =
                    moduloPlanoBaseSafeScan(
                        chave
                    );

                const status =
                    planoBase
                        ? "base"
                        : (
                            obrigatorio
                                ? "core"
                                : (
                                    statusPorModulo.get(
                                        chave
                                    )
                                    || "nao_contratado"
                                )
                        );

                const telasCatalogo =
                    normalizarTelasModulo(
                        modulo?.metadados
                    );

                const telasCanonicas =
                    Array.isArray(
                        definicaoComercial?.telas
                    )
                        ? definicaoComercial.telas
                        : [];

                const telas =
                    [
                        ...new Set([
                            ...telasCatalogo,
                            ...telasCanonicas,
                        ]),
                    ];

                return {
                    chave,
                    nome:
                        textoSeguro(
                            modulo?.nome
                        ),
                    obrigatorio,
                    planoBase,
                    grupoComercial:
                        definicaoComercial?.grupo ||
                        (
                            planoBase
                                ? "plano_base"
                                : "adicional"
                        ),
                    status,
                    telas,
                    disponivel:
                        modulo?.ativo ===
                            true
                        && (
                            planoBase
                            || obrigatorio
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
        telaPlanoBaseSafeScan(
            telaNormalizada
        )
    ) {
        return true;
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

    const modulosComerciaisDaTela =
        modulosDaTela.filter(
            (modulo) =>
                modulo?.obrigatorio !==
                true
        );

    if (
        modulosComerciaisDaTela.length >
        0
    ) {
        return modulosComerciaisDaTela.some(
            (modulo) =>
                modulo?.disponivel ===
                true
        );
    }

    return modulosDaTela.some(
        (modulo) =>
            modulo?.disponivel ===
            true
    );
}
