import {
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    Database,
    FolderSearch,
    RefreshCw,
    ScrollText,
    Trash2,
    UserRound,
} from "lucide-react";

import dashboardHero from "../../../assets/dashboard-hero-sst.webp";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    supabase,
} from "../../../lib/supabaseClient.js";

import {
    TenantAdminHero,
} from "../components/TenantAdminHero.jsx";

import {
    listarTenantsPlataformaService,
} from "../services/tenantAdminService.js";

import {
    carregarAuditoriaSistemaService,
    registrarAuditoriaSistemaService,
} from "../../../services/auditoriaSistemaCrudService.js";

import {
    excluirArquivoStorageAuditoriaService,
    listarArquivosCertificadosStorageService,
} from "../../../services/storageAuditoriaService.js";

import {
    calcularUsoStorageRealSistema,
} from "../../../services/storageSegurancaService.js";

import {
    buscarTodosRegistrosSupabase,
} from "../../../services/supabaseServices.js";

import {
    LIMITE_STORAGE_MB,
} from "../../../constants/sistemaConstants.js";

const LIMITE_AUDITORIA =
    500;

function texto(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

function normalizar(
    valor
) {
    return texto(
        valor
    )
        .toLowerCase()
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        );
}

function formatarDataHora(
    valor
) {
    if (!valor) {
        return "—";
    }

    const data =
        new Date(
            valor
        );

    if (
        Number.isNaN(
            data.getTime()
        )
    ) {
        return texto(
            valor
        ) || "—";
    }

    return new Intl.DateTimeFormat(
        "pt-BR",
        {
            dateStyle:
                "short",
            timeStyle:
                "short",
        }
    ).format(
        data
    );
}

const CATEGORIAS_STORAGE =
    Object.freeze([
        {
            id:
                "colaboradores",
            rotulo:
                "Documentos de funcionários",
        },
        {
            id:
                "certidoes",
            rotulo:
                "Certidões mensais",
        },
        {
            id:
                "empresa",
            rotulo:
                "Documentos da empresa",
        },
        {
            id:
                "contratos",
            rotulo:
                "Contratos",
        },
        {
            id:
                "dds",
            rotulo:
                "DDS",
        },
        {
            id:
                "auditorias",
            rotulo:
                "Auditorias",
        },
        {
            id:
                "fotos",
            rotulo:
                "Fotos de funcionários",
        },
        {
            id:
                "mapas",
            rotulo:
                "Mapas / obras",
        },
        {
            id:
                "identidade",
            rotulo:
                "Identidade / logos",
        },
        {
            id:
                "outros",
            rotulo:
                "Outros",
        },
    ]);

function obterCategoriaStorage(
    arquivo
) {
    const bucket =
        texto(
            arquivo?.bucket
        );

    if (
        bucket ===
            "certificados-treinamentos" ||
        bucket ===
            "revisoes-treinamentos"
    ) {
        return "colaboradores";
    }

    if (
        bucket ===
        "certidao-mensal-documentos"
    ) {
        return "certidoes";
    }

    if (
        bucket ===
        "documentos-empresas"
    ) {
        return "empresa";
    }

    if (
        bucket ===
        "contratos-empresas"
    ) {
        return "contratos";
    }

    if (
        bucket ===
        "dds-assinados"
    ) {
        return "dds";
    }

    if (
        bucket ===
        "auditorias-campo"
    ) {
        return "auditorias";
    }

    if (
        bucket ===
        "fotos-colaboradores"
    ) {
        return "fotos";
    }

    if (
        bucket ===
        "mapas-obras"
    ) {
        return "mapas";
    }

    if (
        bucket ===
        "logos-empresas"
    ) {
        return "identidade";
    }

    return "outros";
}
function formatarDuracaoAuditoria(
    valor
) {
    const milissegundos =
        Math.max(
            0,
            Number(
                valor
            ) || 0
        );

    if (
        milissegundos <
        1000
    ) {
        return `${Math.round(
            milissegundos
        )} ms`;
    }

    const segundos =
        milissegundos /
        1000;

    if (
        segundos <
        60
    ) {
        return `${new Intl.NumberFormat(
            "pt-BR",
            {
                minimumFractionDigits:
                    1,
                maximumFractionDigits:
                    1,
            }
        ).format(
            segundos
        )} s`;
    }

    const minutos =
        Math.floor(
            segundos /
            60
        );

    const segundosRestantes =
        Math.round(
            segundos %
            60
        );

    return segundosRestantes >
        0
        ? `${minutos} min ${segundosRestantes} s`
        : `${minutos} min`;
}

function formatarBytesStorage(
    valor
) {
    const bytes =
        Math.max(
            0,
            Number(
                valor
            ) || 0
        );

    if (bytes === 0) {
        return "0 MB";
    }

    const unidades =
        [
            "B",
            "KB",
            "MB",
            "GB",
            "TB",
        ];

    const indice =
        Math.min(
            Math.floor(
                Math.log(
                    bytes
                ) /
                Math.log(
                    1024
                )
            ),
            unidades.length - 1
        );

    const quantidade =
        bytes /
        (
            1024 **
            indice
        );

    return (
        new Intl.NumberFormat(
            "pt-BR",
            {
                maximumFractionDigits:
                    indice >= 3
                        ? 2
                        : 1,
            }
        ).format(
            quantidade
        ) +
        " " +
        unidades[indice]
    );
}

function obterHostEvento(
    registro
) {
    const url =
        texto(
            registro?.dados
                ?.origemAcesso
                ?.url
        );

    if (!url) {
        return "";
    }

    try {
        return new URL(
            url
        ).host
            .toLowerCase();
    }
    catch {
        return "";
    }
}

function obterEmpresaIdExplicita(
    registro
) {
    return texto(
        registro?.dados
            ?.empresa_id ||
        registro?.dados
            ?.empresaId
    );
}

function obterTenantIdExplicito(
    registro
) {
    return texto(
        registro?.dados
            ?.tenant_id ||
        registro?.dados
            ?.tenantId
    );
}

function hostEhGlobalSafeScan(
    host
) {
    const hostBase =
        texto(
            host
        )
            .split(":")[0]
            .toLowerCase();

    return [
        "safescanbrasil.com.br",
        "www.safescanbrasil.com.br",
        "app.safescanbrasil.com.br",
        "admin.safescanbrasil.com.br",
    ].includes(
        hostBase
    );
}

function obterColaboradorId(
    registro
) {
    const dadosId =
        texto(
            registro?.dados
                ?.colaborador_id ||
            registro?.dados
                ?.colaboradorId
        );

    if (dadosId) {
        return dadosId;
    }

    if (
        normalizar(
            registro?.tabela
        ) ===
        "colaboradores"
    ) {
        return texto(
            registro?.registro_id
        );
    }

    return "";
}

function obterModuloEvento(
    registro
) {
    return (
        texto(
            registro?.tabela
        ) ||
        texto(
            registro?.dados
                ?.modulo
        ) ||
        "sistema"
    );
}

function rotuloModulo(
    modulo
) {
    const chave =
        normalizar(
            modulo
        );

    if (
        chave ===
        "navegacao"
    ) {
        return "Navegação";
    }

    if (
        chave ===
        "sistema"
    ) {
        return "Sistema";
    }

    return texto(
        modulo
    )
        .replace(
            /_/g,
            " "
        )
        .replace(
            /\b\w/g,
            (
                letra
            ) =>
                letra.toUpperCase()
        );
}

function arquivoStorageForaDiretorio(
    arquivo
) {
    if (
        arquivo?.emUso ||
        arquivo?.protegidoSistema
    ) {
        return false;
    }

    const caminho =
        texto(
            arquivo?.caminho
        )
            .replace(
                /^\/+/,
                ""
            );

    return (
        Boolean(
            caminho
        ) &&
        !caminho.includes(
            "/"
        )
    );
}

function toggleEstado(
    setter,
    chave
) {
    setter(
        (
            atual
        ) => ({
            ...atual,
            [chave]:
                !atual[chave],
        })
    );
}

export function TenantAdminAuditPage() {
    const [
        aba,
        setAba,
    ] =
        useState(
            "sistema"
        );

    const [
        escopoSelecionado,
        setEscopoSelecionado,
    ] =
        useState(
            "todos"
        );

    const [
        carregando,
        setCarregando,
    ] =
        useState(
            true
        );

    const [
        erro,
        setErro,
    ] =
        useState(
            ""
        );

    const [
        auditoriaSistema,
        setAuditoriaSistema,
    ] =
        useState([]);

    const [
        tenants,
        setTenants,
    ] =
        useState([]);

    const [
        empresas,
        setEmpresas,
    ] =
        useState([]);

    const [
        colaboradores,
        setColaboradores,
    ] =
        useState([]);

    const [
        empresasAbertas,
        setEmpresasAbertas,
    ] =
        useState({});

    const [
        usuariosAbertos,
        setUsuariosAbertos,
    ] =
        useState({});

    const [
        modulosAbertos,
        setModulosAbertos,
    ] =
        useState({});

    const [
        resumoStorage,
        setResumoStorage,
    ] =
        useState(null);

    const [
        carregandoResumoStorage,
        setCarregandoResumoStorage,
    ] =
        useState(false);

    const [
        arquivosStorage,
        setArquivosStorage,
    ] =
        useState([]);

    const [
        storageAuditado,
        setStorageAuditado,
    ] =
        useState(false);

    const [
        storageConfiavel,
        setStorageConfiavel,
    ] =
        useState(false);

    const [
        carregandoStorage,
        setCarregandoStorage,
    ] =
        useState(false);

    const [
        limpandoStorage,
        setLimpandoStorage,
    ] =
        useState(false);

    const [
        erroStorage,
        setErroStorage,
    ] =
        useState("");

    const [
        progressoStorage,
        setProgressoStorage,
    ] =
        useState({
            atual:
                0,
            total:
                0,
            mensagem:
                "",
            falhas:
                0,
        });

    const carregarSistema =
        useCallback(
            async () => {
                setCarregando(
                    true
                );

                setErro(
                    ""
                );

                try {
                    const [
                        resultadoAuditoria,
                        listaTenants,
                        listaEmpresas,
                        listaColaboradores,
                    ] =
                        await Promise.all([
                            carregarAuditoriaSistemaService({
                                supabase,
                                limite:
                                    LIMITE_AUDITORIA,
                            }),

                            listarTenantsPlataformaService({
                                supabase,
                            }),

                            buscarTodosRegistrosSupabase(
                                "empresas",
                                "id,nome,tenant_id"
                            ),

                            buscarTodosRegistrosSupabase(
                                "colaboradores",
                                "id,empresa_id"
                            ),
                        ]);

                    setAuditoriaSistema(
                        Array.isArray(
                            resultadoAuditoria
                                ?.registros
                        )
                            ? resultadoAuditoria
                                .registros
                            : []
                    );

                    setTenants(
                        Array.isArray(
                            listaTenants
                        )
                            ? listaTenants
                            : []
                    );

                    setEmpresas(
                        Array.isArray(
                            listaEmpresas
                        )
                            ? listaEmpresas
                            : []
                    );

                    setColaboradores(
                        Array.isArray(
                            listaColaboradores
                        )
                            ? listaColaboradores
                            : []
                    );
                }
                catch (error) {
                    setErro(
                        error?.message ||
                        "Não foi possível carregar a auditoria do sistema."
                    );
                }
                finally {
                    setCarregando(
                        false
                    );
                }
            },
            []
        );

    useEffect(
        () => {
            const timeoutId =
                window.setTimeout(
                    () => {
                        carregarSistema();
                    },
                    0
                );

            return () => {
                window.clearTimeout(
                    timeoutId
                );
            };
        },
        [
            carregarSistema,
        ]
    );

    const mapaEmpresas =
        useMemo(
            () => {
                const mapa =
                    new Map();

                empresas.forEach(
                    (
                        empresa
                    ) => {
                        const id =
                            texto(
                                empresa?.id
                            );

                        if (id) {
                            mapa.set(
                                id,
                                empresa
                            );
                        }
                    }
                );

                return mapa;
            },
            [
                empresas,
            ]
        );

    const mapaColaboradorEmpresa =
        useMemo(
            () => {
                const mapa =
                    new Map();

                colaboradores.forEach(
                    (
                        colaborador
                    ) => {
                        const colaboradorId =
                            texto(
                                colaborador?.id
                            );

                        const empresaId =
                            texto(
                                colaborador
                                    ?.empresa_id
                            );

                        if (
                            colaboradorId &&
                            empresaId
                        ) {
                            mapa.set(
                                colaboradorId,
                                empresaId
                            );
                        }
                    }
                );

                return mapa;
            },
            [
                colaboradores,
            ]
        );

    const tenantPorId =
        useMemo(
            () => {
                const mapa =
                    new Map();

                tenants.forEach(
                    (
                        tenant
                    ) => {
                        const id =
                            texto(
                                tenant?.tenant_id ||
                                tenant?.id
                            );

                        if (id) {
                            mapa.set(
                                id,
                                tenant
                            );
                        }
                    }
                );

                return mapa;
            },
            [
                tenants,
            ]
        );
    const tenantPorSlug =
        useMemo(
            () => {
                const mapa =
                    new Map();

                tenants.forEach(
                    (
                        tenant
                    ) => {
                        const slug =
                            texto(
                                tenant
                                    ?.tenant_slug ||
                                tenant?.slug
                            )
                                .toLowerCase();

                        if (slug) {
                            mapa.set(
                                slug,
                                tenant
                            );
                        }
                    }
                );

                return mapa;
            },
            [
                tenants,
            ]
        );

    const resolverGrupoCliente =
        useCallback(
            (
                registro
            ) => {
                const tenantIdExplicito =
                    obterTenantIdExplicito(
                        registro
                    );

                if (tenantIdExplicito) {
                    const tenant =
                        tenantPorId.get(
                            tenantIdExplicito
                        );

                    if (tenant) {
                        return {
                            chave:
                                `tenant:${tenantIdExplicito}`,
                            nome:
                                tenant?.tenant_nome ||
                                tenant?.nome ||
                                tenant?.tenant_slug ||
                                tenant?.slug ||
                                "Cliente",
                            tenantId:
                                tenantIdExplicito,
                            tipo:
                                "tenant",
                        };
                    }
                }

                let empresaId =
                    obterEmpresaIdExplicita(
                        registro
                    );

                if (
                    !empresaId &&
                    normalizar(
                        registro?.tabela
                    ) ===
                        "empresas"
                ) {
                    empresaId =
                        texto(
                            registro
                                ?.registro_id
                        );
                }

                if (!empresaId) {
                    const colaboradorId =
                        obterColaboradorId(
                            registro
                        );

                    if (colaboradorId) {
                        empresaId =
                            mapaColaboradorEmpresa
                                .get(
                                    colaboradorId
                                ) ||
                            "";
                    }
                }

                if (empresaId) {
                    const empresa =
                        mapaEmpresas.get(
                            empresaId
                        );

                    const tenantId =
                        texto(
                            empresa?.tenant_id
                        );

                    const tenant =
                        tenantId
                            ? tenantPorId.get(
                                tenantId
                            )
                            : null;

                    if (
                        tenant &&
                        tenantId
                    ) {
                        return {
                            chave:
                                `tenant:${tenantId}`,
                            nome:
                                tenant?.tenant_nome ||
                                tenant?.nome ||
                                tenant?.tenant_slug ||
                                tenant?.slug ||
                                "Cliente",
                            tenantId,
                            tipo:
                                "tenant",
                        };
                    }
                }

                const host =
                    obterHostEvento(
                        registro
                    );

                const hostBase =
                    host
                        .split(":")[0]
                        .toLowerCase();

                if (
                    hostBase &&
                    hostBase.endsWith(
                        ".safescanbrasil.com.br"
                    ) &&
                    !hostEhGlobalSafeScan(
                        hostBase
                    )
                ) {
                    const slug =
                        hostBase.split(
                            "."
                        )[0];

                    const tenant =
                        tenantPorSlug.get(
                            slug
                        );

                    const tenantId =
                        texto(
                            tenant?.tenant_id ||
                            tenant?.id
                        );

                    if (
                        tenant &&
                        tenantId
                    ) {
                        return {
                            chave:
                                `tenant:${tenantId}`,
                            nome:
                                tenant?.tenant_nome ||
                                tenant?.nome ||
                                tenant?.tenant_slug ||
                                tenant?.slug ||
                                slug,
                            tenantId,
                            tipo:
                                "tenant",
                        };
                    }
                }

                if (
                    hostEhGlobalSafeScan(
                        hostBase
                    ) ||
                    normalizar(
                        registro?.tabela
                    ) ===
                        "storage"
                ) {
                    return {
                        chave:
                            "global",
                        nome:
                            "SafeScan / Global",
                        tenantId:
                            "",
                        tipo:
                            "global",
                    };
                }

                return {
                    chave:
                        "unidentified",
                    nome:
                        "Sem vínculo de cliente",
                    tenantId:
                        "",
                    tipo:
                        "unidentified",
                };
            },
            [
                mapaColaboradorEmpresa,
                mapaEmpresas,
                tenantPorId,
                tenantPorSlug,
            ]
        );

    const gruposClientes =
        useMemo(
            () => {
                const mapa =
                    new Map();

                tenants.forEach(
                    (
                        tenant
                    ) => {
                        const tenantId =
                            texto(
                                tenant?.tenant_id ||
                                tenant?.id
                            );

                        if (!tenantId) {
                            return;
                        }

                        mapa.set(
                            `tenant:${tenantId}`,
                            {
                                chave:
                                    `tenant:${tenantId}`,

                                nome:
                                    tenant?.tenant_nome ||
                                    tenant?.nome ||
                                    tenant?.tenant_slug ||
                                    tenant?.slug ||
                                    "Cliente",

                                tenantId,

                                identificado:
                                    true,

                                eventos:
                                    [],
                            }
                        );
                    }
                );

                auditoriaSistema.forEach(
                    (
                        registro
                    ) => {
                        const grupo =
                            resolverGrupoCliente(
                                registro
                            );

                        if (
                            !mapa.has(
                                grupo.chave
                            )
                        ) {
                            mapa.set(
                                grupo.chave,
                                {
                                    ...grupo,
                                    eventos:
                                        [],
                                }
                            );
                        }

                        mapa
                            .get(
                                grupo.chave
                            )
                            .eventos
                            .push(
                                registro
                            );
                    }
                );

                return Array
                    .from(
                        mapa.values()
                    )
                    .map(
                        (
                            grupo
                        ) => {
                            const usuarios =
                                new Map();

                            grupo.eventos.forEach(
                                (
                                    registro
                                ) => {
                                    const email =
                                        texto(
                                            registro
                                                ?.usuario_email
                                        ) ||
                                        "Sistema / consulta pública";

                                    if (
                                        !usuarios.has(
                                            email
                                        )
                                    ) {
                                        usuarios.set(
                                            email,
                                            {
                                                email,
                                                eventos:
                                                    [],
                                                modulos:
                                                    new Map(),
                                            }
                                        );
                                    }

                                    const usuario =
                                        usuarios.get(
                                            email
                                        );

                                    usuario.eventos.push(
                                        registro
                                    );

                                    const modulo =
                                        obterModuloEvento(
                                            registro
                                        );

                                    const chaveModulo =
                                        normalizar(
                                            modulo
                                        ) ||
                                        "sistema";

                                    if (
                                        !usuario.modulos.has(
                                            chaveModulo
                                        )
                                    ) {
                                        usuario.modulos.set(
                                            chaveModulo,
                                            {
                                                chave:
                                                    chaveModulo,

                                                nome:
                                                    rotuloModulo(
                                                        modulo
                                                    ),

                                                eventos:
                                                    [],
                                            }
                                        );
                                    }

                                    usuario.modulos
                                        .get(
                                            chaveModulo
                                        )
                                        .eventos
                                        .push(
                                            registro
                                        );
                                }
                            );

                            return {
                                ...grupo,

                                usuarios:
                                    Array
                                        .from(
                                            usuarios
                                                .values()
                                        )
                                        .map(
                                            (
                                                usuario
                                            ) => ({
                                                ...usuario,

                                                modulos:
                                                    Array
                                                        .from(
                                                            usuario
                                                                .modulos
                                                                .values()
                                                        )
                                                        .sort(
                                                            (
                                                                a,
                                                                b
                                                            ) =>
                                                                a.nome
                                                                    .localeCompare(
                                                                        b.nome,
                                                                        "pt-BR"
                                                                    )
                                                        ),
                                            })
                                        )
                                        .sort(
                                            (
                                                a,
                                                b
                                            ) =>
                                                b.eventos
                                                    .length -
                                                a.eventos
                                                    .length ||
                                                a.email
                                                    .localeCompare(
                                                        b.email
                                                    )
                                        ),
                            };
                        }
                    )
                    .sort(
                        (
                            a,
                            b
                        ) => {
                            if (
                                a.identificado !==
                                b.identificado
                            ) {
                                return a.identificado
                                    ? -1
                                    : 1;
                            }

                            return (
                                b.eventos.length -
                                    a.eventos.length ||
                                a.nome.localeCompare(
                                    b.nome,
                                    "pt-BR"
                                )
                            );
                        }
                    );
            },
            [
                tenants,
                auditoriaSistema,
                resolverGrupoCliente,
            ]
        );
    const gruposPorChave =
        useMemo(
            () =>
                new Map(
                    gruposClientes.map(
                        (
                            grupo
                        ) => [
                            grupo.chave,
                            grupo,
                        ]
                    )
                ),
            [
                gruposClientes,
            ]
        );

    const gruposAuditoriaVisiveis =
        useMemo(
            () => {
                if (
                    escopoSelecionado ===
                    "todos"
                ) {
                    return gruposClientes.filter(
                        (
                            grupo
                        ) =>
                            Boolean(
                                grupo.tenantId
                            )
                    );
                }

                const grupo =
                    gruposPorChave.get(
                        escopoSelecionado
                    );

                return grupo
                    ? [
                        grupo,
                    ]
                    : [];
            },
            [
                escopoSelecionado,
                gruposClientes,
                gruposPorChave,
            ]
        );

    const rotuloEscopoSelecionado =
        useMemo(
            () => {
                if (
                    escopoSelecionado ===
                    "todos"
                ) {
                    return "Todos os clientes";
                }

                if (
                    escopoSelecionado ===
                    "global"
                ) {
                    return "SafeScan / Global";
                }

                if (
                    escopoSelecionado ===
                    "unidentified"
                ) {
                    return "Sem vínculo de cliente";
                }

                return (
                    gruposPorChave.get(
                        escopoSelecionado
                    )?.nome ||
                    "Escopo selecionado"
                );
            },
            [
                escopoSelecionado,
                gruposPorChave,
            ]
        );

    const eventosAuditoriaVisiveis =
        useMemo(
            () =>
                gruposAuditoriaVisiveis.flatMap(
                    (
                        grupo
                    ) =>
                        grupo.eventos
                ),
            [
                gruposAuditoriaVisiveis,
            ]
        );

    const metricasSistema =
        useMemo(
            () => {
                const usuarios =
                    new Set();

                const modulos =
                    new Set();

                eventosAuditoriaVisiveis.forEach(
                    (
                        registro
                    ) => {
                        usuarios.add(
                            texto(
                                registro?.usuario_email
                            ) ||
                            "Sistema / consulta pública"
                        );

                        modulos.add(
                            normalizar(
                                obterModuloEvento(
                                    registro
                                )
                            )
                        );
                    }
                );

                return {
                    eventos:
                        eventosAuditoriaVisiveis.length,

                    usuarios:
                        usuarios.size,

                    modulos:
                        modulos.size,

                    clientes:
                        gruposAuditoriaVisiveis.filter(
                            (
                                grupo
                            ) =>
                                Boolean(
                                    grupo.tenantId
                                ) &&
                                grupo.eventos.length >
                                    0
                        ).length,
                };
            },
            [
                eventosAuditoriaVisiveis,
                gruposAuditoriaVisiveis,
            ]
        );

    const [
        duracaoAuditoriaMs,
        setDuracaoAuditoriaMs,
    ] =
        useState(
            null
        );

    const carregarResumoStorage =
        useCallback(
            async () => {
                setCarregandoResumoStorage(
                    true
                );

                try {
                    setResumoStorage(
                        await calcularUsoStorageRealSistema({
                            supabase,
                        })
                    );
                }
                catch (error) {
                    setErroStorage(
                        error?.message ||
                        "Não foi possível calcular o uso do Storage."
                    );
                }
                finally {
                    setCarregandoResumoStorage(
                        false
                    );
                }
            },
            []
        );

    const auditarStorage =
        useCallback(
            async () => {
                if (
                    carregandoStorage ||
                    limpandoStorage
                ) {
                    return;
                }

                const inicioAuditoria =
                    Date.now();

                setDuracaoAuditoriaMs(
                    null
                );

                setCarregandoStorage(
                    true
                );

                setStorageAuditado(
                    false
                );

                setStorageConfiavel(
                    false
                );

                setErroStorage(
                    ""
                );

                setProgressoStorage({
                    atual:
                        0,
                    total:
                        0,
                    mensagem:
                        "Preparando análise do Storage...",
                    falhas:
                        0,
                });

                let ultimoProgresso =
                    {
                        atual:
                            0,
                        total:
                            0,
                        mensagem:
                            "",
                        falhas:
                            0,
                    };

                try {
                    const [
                        colaboradoresBanco,
                        empresasBanco,
                    ] =
                        await Promise.all([
                            buscarTodosRegistrosSupabase(
                                "colaboradores",
                                "*"
                            ),
                            buscarTodosRegistrosSupabase(
                                "empresas",
                                "*"
                            ),
                        ]);

                    const lista =
                        await listarArquivosCertificadosStorageService({
                            colaboradores:
                                colaboradoresBanco ||
                                [],

                            empresasBanco:
                                empresasBanco ||
                                [],

                            onProgress:
                                (
                                    progresso
                                ) => {
                                    ultimoProgresso =
                                        {
                                            atual:
                                                Number(
                                                    progresso
                                                        ?.atual
                                                ) || 0,

                                            total:
                                                Number(
                                                    progresso
                                                        ?.total
                                                ) || 0,

                                            mensagem:
                                                progresso
                                                    ?.mensagem ||
                                                "",

                                            falhas:
                                                Number(
                                                    progresso
                                                        ?.falhas
                                                ) || 0,
                                        };

                                    setProgressoStorage(
                                        ultimoProgresso
                                    );
                                },
                        });

                    setArquivosStorage(
                        Array.isArray(
                            lista
                        )
                            ? lista
                            : []
                    );

                    const confiavel =
                        ultimoProgresso.falhas ===
                        0;

                    setStorageAuditado(
                        true
                    );

                    setStorageConfiavel(
                        confiavel
                    );

                    setProgressoStorage({
                        atual:
                            ultimoProgresso.total ||
                            ultimoProgresso.atual,

                        total:
                            ultimoProgresso.total,

                        mensagem:
                            confiavel
                                ? "Análise concluída com sucesso."
                                : `Análise concluída com ${ultimoProgresso.falhas} falha(s).`,

                        falhas:
                            ultimoProgresso.falhas,
                    });

                    if (!confiavel) {
                        setErroStorage(
                            `A análise terminou com ${ultimoProgresso.falhas} falha(s) de leitura/conferência. A limpeza foi bloqueada até uma auditoria 100% íntegra.`
                        );
                    }

                    await carregarResumoStorage();
                }
                catch (error) {
                    setStorageConfiavel(
                        false
                    );

                    setErroStorage(
                        error?.message ||
                        "Não foi possível auditar os arquivos do Storage."
                    );
                }
                finally {
                    setDuracaoAuditoriaMs(
                        Math.max(
                            0,
                            Date.now() -
                            inicioAuditoria
                        )
                    );

                    setCarregandoStorage(
                        false
                    );
                }
            },
            [
                carregandoStorage,
                limpandoStorage,
                carregarResumoStorage,
            ]
        );
    useEffect(
        () => {
            if (
                resumoStorage ||
                carregandoResumoStorage
            ) {
                return undefined;
            }

            const timeoutId =
                window.setTimeout(
                    () => {
                        carregarResumoStorage();
                    },
                    0
                );

            return () => {
                window.clearTimeout(
                    timeoutId
                );
            };
        },
        [
            resumoStorage,
            carregandoResumoStorage,
            carregarResumoStorage,
        ]
    );

    const arquivoPertenceAoEscopo =
        useCallback(
            (
                arquivo
            ) => {
                if (
                    escopoSelecionado ===
                    "todos"
                ) {
                    return Boolean(
                        arquivo?.tenantId
                    );
                }

                if (
                    escopoSelecionado ===
                    "global"
                ) {
                    return (
                        arquivo?.escopoStorage ===
                        "global"
                    );
                }

                if (
                    escopoSelecionado ===
                    "unidentified"
                ) {
                    return (
                        arquivo?.escopoStorage ===
                        "unidentified"
                    );
                }

                if (
                    escopoSelecionado.startsWith(
                        "tenant:"
                    )
                ) {
                    return (
                        texto(
                            arquivo?.tenantId
                        ) ===
                        escopoSelecionado.slice(
                            "tenant:".length
                        )
                    );
                }

                return false;
            },
            [
                escopoSelecionado,
            ]
        );

    const [
        categoriaStorageSelecionada,
        setCategoriaStorageSelecionada,
    ] =
        useState(
            "todos"
        );

    const arquivosStorageEscopo =
        useMemo(
            () =>
                arquivosStorage.filter(
                    arquivoPertenceAoEscopo
                ),
            [
                arquivosStorage,
                arquivoPertenceAoEscopo,
            ]
        );

    const arquivosStorageSemUso =
        useMemo(
            () =>
                arquivosStorageEscopo.filter(
                    (
                        arquivo
                    ) =>
                        !arquivo?.emUso &&
                        !arquivo
                            ?.protegidoSistema
                ),
            [
                arquivosStorageEscopo,
            ]
        );

    const arquivosForaDiretorio =
        useMemo(
            () =>
                arquivosStorageSemUso.filter(
                    arquivoStorageForaDiretorio
                ),
            [
                arquivosStorageSemUso,
            ]
        );

    const bytesStorageEscopo =
        useMemo(
            () =>
                arquivosStorageEscopo.reduce(
                    (
                        total,
                        arquivo
                    ) =>
                        total +
                        (
                            Number(
                                arquivo?.tamanho
                            ) || 0
                        ),
                    0
                ),
            [
                arquivosStorageEscopo,
            ]
        );

    const distribuicaoStorage =
        useMemo(
            () => {
                const acumulado =
                    new Map(
                        CATEGORIAS_STORAGE.map(
                            (
                                categoria
                            ) => [
                                categoria.id,
                                {
                                    ...categoria,
                                    arquivos:
                                        0,
                                    bytes:
                                        0,
                                },
                            ]
                        )
                    );

                for (
                    const arquivo of
                    arquivosStorageEscopo
                ) {
                    const categoria =
                        acumulado.get(
                            obterCategoriaStorage(
                                arquivo
                            )
                        );

                    if (!categoria) {
                        continue;
                    }

                    categoria.arquivos +=
                        1;

                    categoria.bytes +=
                        Number(
                            arquivo?.tamanho
                        ) || 0;
                }

                return Array.from(
                    acumulado.values()
                )
                    .filter(
                        (
                            categoria
                        ) =>
                            categoria.arquivos >
                            0
                    )
                    .map(
                        (
                            categoria
                        ) => ({
                            ...categoria,

                            percentual:
                                bytesStorageEscopo >
                                0
                                    ? (
                                        categoria.bytes /
                                        bytesStorageEscopo
                                    ) *
                                    100
                                    : 0,
                        })
                    )
                    .sort(
                        (
                            primeiro,
                            segundo
                        ) =>
                            segundo.bytes -
                            primeiro.bytes
                    );
            },
            [
                arquivosStorageEscopo,
                bytesStorageEscopo,
            ]
        );

    const categoriaStorageAtiva =
        categoriaStorageSelecionada ===
            "todos" ||
        distribuicaoStorage.some(
            (
                categoria
            ) =>
                categoria.id ===
                categoriaStorageSelecionada
        )
            ? categoriaStorageSelecionada
            : "todos";

    const arquivosStorageSemUsoFiltrados =
        useMemo(
            () =>
                categoriaStorageAtiva ===
                "todos"
                    ? arquivosStorageSemUso
                    : arquivosStorageSemUso.filter(
                        (
                            arquivo
                        ) =>
                            obterCategoriaStorage(
                                arquivo
                            ) ===
                            categoriaStorageAtiva
                    ),
            [
                arquivosStorageSemUso,
                categoriaStorageAtiva,
            ]
        );

    const bytesSemUso =
        useMemo(
            () =>
                arquivosStorageSemUso.reduce(
                    (
                        total,
                        arquivo
                    ) =>
                        total +
                        (
                            Number(
                                arquivo?.tamanho
                            ) || 0
                        ),
                    0
                ),
            [
                arquivosStorageSemUso,
            ]
        );

    const percentualStorage =
        storageAuditado &&
        LIMITE_STORAGE_MB > 0
            ? Math.min(
                100,
                (
                    bytesStorageEscopo /
                    (
                        LIMITE_STORAGE_MB *
                        1024 *
                        1024
                    )
                ) *
                100
            )
            : 0;

    const bytesStorageGlobal =
        Math.max(
            0,
            Number(
                resumoStorage
                    ?.totalBytes
            ) || 0
        );

    const percentualStorageGlobalEscopo =
        storageAuditado &&
        bytesStorageGlobal >
            0
            ? Math.min(
                100,
                (
                    bytesStorageEscopo /
                    bytesStorageGlobal
                ) *
                100
            )
            : 0;

    const percentualAnaliseStorage =
        progressoStorage.total > 0
            ? Math.min(
                100,
                Math.round(
                    (
                        progressoStorage.atual /
                        progressoStorage.total
                    ) *
                    100
                )
            )
            : storageAuditado
                ? 100
                : 0;

    const percentualIntegridadeStorage =
        progressoStorage.total > 0
            ? Math.max(
                0,
                Math.min(
                    100,
                    Math.round(
                        (
                            (
                                progressoStorage.total -
                                progressoStorage.falhas
                            ) /
                            progressoStorage.total
                        ) *
                        100
                    )
                )
            )
            : storageConfiavel
                ? 100
                : 0;

    const [
        confirmacaoLimpezaAberta,
        setConfirmacaoLimpezaAberta,
    ] =
        useState(
            false
        );

    const [
        resultadoLimpeza,
        setResultadoLimpeza,
    ] =
        useState(
            null
        );

    function solicitarLimpezaStorage() {
        if (
            limpandoStorage ||
            carregandoStorage ||
            escopoSelecionado ===
                "todos" ||
            !storageConfiavel ||
            arquivosStorageSemUso.length ===
                0
        ) {
            return;
        }

        setConfirmacaoLimpezaAberta(
            true
        );
    }

    async function limparStorage() {
        if (
            limpandoStorage ||
            carregandoStorage ||
            escopoSelecionado ===
                "todos" ||
            !storageConfiavel ||
            arquivosStorageSemUso.length ===
                0
        ) {
            return;
        }


        const quantidade =
            arquivosStorageSemUso.length;
        setLimpandoStorage(
            true
        );

        let excluidos =
            0;

        let falhas =
            0;

        try {
            const {
                data,
                error,
            } =
                await supabase.auth.getUser();

            if (
                error ||
                !data?.user?.email
            ) {
                throw new Error(
                    "Usuário autenticado não identificado."
                );
            }

            for (
                const [
                    indice,
                    arquivo,
                ] of
                arquivosStorageSemUso.entries()
            ) {
                try {
                    await excluirArquivoStorageAuditoriaService({
                        supabase,
                        arquivo,
                    });

                    excluidos +=
                        1;

                    await registrarAuditoriaSistemaService({
                        supabase,
                        usuario:
                            data.user,
                        acao:
                            "DELETE_STORAGE",
                        tabela:
                            arquivo.bucket ||
                            "storage",
                        registroId:
                            arquivo.caminho,
                        descricao:
                            `Excluiu arquivo sem vínculo: ${arquivo.nome || arquivo.caminho}`,
                        dados:
                            {
                                bucket:
                                    arquivo.bucket,
                                caminho:
                                    arquivo.caminho,
                                tamanhoBytes:
                                    Number(
                                        arquivo.tamanho
                                    ) || 0,
                            },
                    });
                }
                catch (error) {
                    falhas +=
                        1;

                    console.warn(
                        "Falha ao limpar Storage:",
                        error
                    );
                }
                finally {
                    setProgressoStorage({
                        atual:
                            indice + 1,
                        total:
                            quantidade,
                        mensagem:
                            `Processando ${indice + 1} de ${quantidade}`,
                    });
                }
            }

            await registrarAuditoriaSistemaService({
                supabase,
                usuario:
                    data.user,
                acao:
                    "LIMPEZA_STORAGE_EXECUTADA",
                tabela:
                    "storage",
                descricao:
                    `Limpeza do Storage: ${excluidos} excluído(s), ${falhas} falha(s).`,
                dados:
                    {
                        candidatos:
                            quantidade,
                        excluidos,
                        falhas,
                        bytesEstimados:
                            bytesSemUso,
                    },
            });

            await auditarStorage();

            setResultadoLimpeza({
                excluidos,
                falhas,
                escopo:
                    rotuloEscopoSelecionado,
            });
        }
        catch (error) {
            setErroStorage(
                error?.message ||
                "Não foi possível limpar o Storage."
            );
        }
        finally {
            setLimpandoStorage(
                false
            );

            setProgressoStorage({
                atual:
                    0,
                total:
                    0,
                mensagem:
                    "",
            });
        }
    }

    return (
        <div className="mx-auto w-full max-w-[1500px]">
            <TenantAdminHero
                titulo="Auditoria"
                subtitulo="Acompanhe o uso do SafeScan por empresa, usuário e módulo, além da integridade do armazenamento."
                acoes={
                    <button
                        type="button"
                        onClick={
                            carregarSistema
                        }
                        disabled={
                            carregando
                        }
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-lg shadow-black/10 transition hover:bg-emerald-500 disabled:cursor-wait disabled:bg-slate-500"
                    >
                        <RefreshCw
                            className={
                                carregando
                                    ? "h-4 w-4 animate-spin"
                                    : "h-4 w-4"
                            }
                        />

                        {carregando
                            ? "Atualizando..."
                            : "Atualizar auditoria"}
                    </button>
                }
            />

            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <article className="flex min-h-[122px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                    <p className="text-xs font-semibold text-slate-500">
                        Eventos do sistema
                    </p>

                    <p className="mt-2 text-3xl font-black text-slate-950">
                        {carregando
                            ? "—"
                            : metricasSistema.eventos}
                    </p>

                    <p className="mt-1 text-[11px] text-slate-400">
                        Últimos eventos carregados
                    </p>
                </article>

                <article className="flex min-h-[122px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                    <p className="text-xs font-semibold text-slate-500">
                        Usuários
                    </p>

                    <p className="mt-2 text-3xl font-black text-slate-950">
                        {carregando
                            ? "—"
                            : metricasSistema.usuarios}
                    </p>

                    <p className="mt-1 text-[11px] text-slate-400">
                        Usuários com atividade
                    </p>
                </article>

                <article className="flex min-h-[122px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                    <p className="text-xs font-semibold text-slate-500">
                        Módulos / tabelas
                    </p>

                    <p className="mt-2 text-3xl font-black text-slate-950">
                        {carregando
                            ? "—"
                            : metricasSistema.modulos}
                    </p>

                    <p className="mt-1 text-[11px] text-slate-400">
                        Grupos de atividade
                    </p>
                </article>

                <article className="flex min-h-[122px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                    <p className="text-xs font-semibold text-slate-500">
                        Clientes com atividade
                    </p>

                    <p className="mt-2 text-3xl font-black text-slate-950">
                        {carregando
                            ? "—"
                            : metricasSistema.clientes}
                    </p>

                    <p className="mt-1 text-[11px] text-slate-400">
                        Ambientes com eventos
                    </p>
                </article>

                <article className="flex min-h-[122px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
                    <p className="text-xs font-semibold text-slate-500">
                        Capacidade de armazenamento
                    </p>

                    <p className="mt-2 text-3xl font-black text-slate-950">
                        {formatarBytesStorage(
                            LIMITE_STORAGE_MB *
                            1024 *
                            1024
                        )}
                    </p>

                    <p className="mt-1 text-[11px] text-slate-400">
                        {carregandoResumoStorage
                            ? "Calculando uso atual..."
                            : resumoStorage
                                ? `${formatarBytesStorage(
                                    resumoStorage.totalBytes
                                )} utilizados • ${Math.round(
                                    (
                                        Number(
                                            resumoStorage.totalMb
                                        ) /
                                        LIMITE_STORAGE_MB
                                    ) *
                                    100
                                )}%`
                                : "Uso atual indisponível"}
                    </p>

                    <div className="mt-3 h-1.5 w-full max-w-[190px] overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="h-full rounded-full bg-emerald-600 transition-all"
                            style={{
                                width:
                                    `${resumoStorage
                                        ? Math.min(
                                            100,
                                            Math.round(
                                                (
                                                    Number(
                                                        resumoStorage.totalMb
                                                    ) /
                                                    LIMITE_STORAGE_MB
                                                ) *
                                                100
                                            )
                                        )
                                        : 0}%`,
                            }}
                        />
                    </div>
                </article>
            </section>

            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <h2 className="text-sm font-black text-slate-900">
                                Auditoria administrativa
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                Eventos organizados por cliente, usuário e módulo do sistema.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                                    Cliente / ambiente
                                </span>

                                <select
                                    value={
                                        escopoSelecionado
                                    }
                                    onChange={
                                        (
                                            event
                                        ) => {
                                            setEscopoSelecionado(
                                                event.target.value
                                            );

                                            setEmpresasAbertas(
                                                {}
                                            );

                                            setUsuariosAbertos(
                                                {}
                                            );

                                            setModulosAbertos(
                                                {}
                                            );
                                        }
                                    }
                                    className="h-10 min-w-[240px] rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none transition focus:border-emerald-400"
                                >
                                    <option value="todos">
                                        Todos os clientes
                                    </option>

                                    {tenants.map(
                                        (
                                            tenant
                                        ) => {
                                            const tenantId =
                                                texto(
                                                    tenant?.tenant_id ||
                                                    tenant?.id
                                                );

                                            return (
                                                <option
                                                    key={
                                                        tenantId
                                                    }
                                                    value={
                                                        `tenant:${tenantId}`
                                                    }
                                                >
                                                    {tenant?.tenant_nome ||
                                                        tenant?.nome ||
                                                        tenant?.tenant_slug ||
                                                        tenant?.slug ||
                                                        "Cliente"}
                                                </option>
                                            );
                                        }
                                    )}

                                    <option
                                        disabled
                                        value="separator"
                                    >
                                        ─────────────
                                    </option>

                                    <option value="global">
                                        SafeScan / Global
                                    </option>

                                    <option value="unidentified">
                                        Sem vínculo de cliente
                                    </option>
                                </select>
                            </label>

                            <div className="inline-flex rounded-xl bg-slate-100 p-1">
                                <button
                                    type="button"
                                    onClick={
                                        () =>
                                            setAba(
                                                "sistema"
                                            )
                                    }
                                    className={
                                        aba ===
                                        "sistema"
                                            ? "rounded-lg bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-sm"
                                            : "rounded-lg px-4 py-2 text-xs font-bold text-slate-600 hover:bg-white"
                                    }
                                >
                                    Auditoria do Sistema
                                </button>

                                <button
                                    type="button"
                                    onClick={
                                        () =>
                                            setAba(
                                                "storage"
                                            )
                                    }
                                    className={
                                        aba ===
                                        "storage"
                                            ? "rounded-lg bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-sm"
                                            : "rounded-lg px-4 py-2 text-xs font-bold text-slate-600 hover:bg-white"
                                    }
                                >
                                    Armazenamento
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {erro ? (
                    <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
                        {erro}
                    </div>
                ) : null}

                {!erro &&
                carregando ? (
                    <div className="flex min-h-[240px] items-center justify-center">
                        <RefreshCw className="h-7 w-7 animate-spin text-emerald-600" />
                    </div>
                ) : null}

                {!erro &&
                !carregando &&
                aba ===
                    "sistema" ? (
                    <div className="p-5">
                        <div className="space-y-3">
                            {gruposAuditoriaVisiveis.map(
                                (
                                    empresa
                                ) => {
                                    const empresaAberta =
                                        Boolean(
                                            empresasAbertas[
                                                empresa.chave
                                            ]
                                        );

                                    return (
                                        <div
                                            key={
                                                empresa.chave
                                            }
                                            className="overflow-hidden rounded-2xl border border-slate-200"
                                        >
                                            <button
                                                type="button"
                                                onClick={
                                                    () =>
                                                        toggleEstado(
                                                            setEmpresasAbertas,
                                                            empresa.chave
                                                        )
                                                }
                                                className="flex w-full items-center justify-between gap-4 bg-slate-50 px-5 py-4 text-left transition hover:bg-slate-100"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {empresaAberta ? (
                                                        <ChevronDown className="h-4 w-4 text-slate-500" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4 text-slate-500" />
                                                    )}

                                                    <div>
                                                        <p className="text-sm font-black text-slate-950">
                                                            {empresa.nome}
                                                        </p>

                                                        <p className="mt-1 text-[10px] font-semibold text-slate-400">
                                                            {empresa.usuarios.length} usuário(s)
                                                        </p>
                                                    </div>
                                                </div>

                                                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200">
                                                    {empresa.eventos.length} eventos
                                                </span>
                                            </button>

                                            {empresaAberta ? (
                                                <div className="space-y-3 border-t border-slate-200 bg-white p-4">
                                                    {empresa.usuarios.map(
                                                        (
                                                            usuario
                                                        ) => {
                                                            const usuarioKey =
                                                                `${empresa.chave}:${usuario.email}`;

                                                            const usuarioAberto =
                                                                Boolean(
                                                                    usuariosAbertos[
                                                                        usuarioKey
                                                                    ]
                                                                );

                                                            return (
                                                                <div
                                                                    key={
                                                                        usuarioKey
                                                                    }
                                                                    className="overflow-hidden rounded-xl border border-slate-200"
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        onClick={
                                                                            () =>
                                                                                toggleEstado(
                                                                                    setUsuariosAbertos,
                                                                                    usuarioKey
                                                                                )
                                                                        }
                                                                        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-slate-50"
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            {usuarioAberto ? (
                                                                                <ChevronDown className="h-4 w-4 text-slate-400" />
                                                                            ) : (
                                                                                <ChevronRight className="h-4 w-4 text-slate-400" />
                                                                            )}

                                                                            <UserRound className="h-4 w-4 text-emerald-700" />

                                                                            <span className="text-xs font-black text-slate-800">
                                                                                {usuario.email}
                                                                            </span>
                                                                        </div>

                                                                        <span className="text-[10px] font-bold text-slate-400">
                                                                            {usuario.eventos.length} eventos
                                                                        </span>
                                                                    </button>

                                                                    {usuarioAberto ? (
                                                                        <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 p-3">
                                                                            {usuario.modulos.map(
                                                                                (
                                                                                    modulo
                                                                                ) => {
                                                                                    const moduloKey =
                                                                                        `${usuarioKey}:${modulo.chave}`;

                                                                                    const moduloAberto =
                                                                                        Boolean(
                                                                                            modulosAbertos[
                                                                                                moduloKey
                                                                                            ]
                                                                                        );

                                                                                    return (
                                                                                        <div
                                                                                            key={
                                                                                                moduloKey
                                                                                            }
                                                                                            className="overflow-hidden rounded-lg bg-white ring-1 ring-slate-200"
                                                                                        >
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={
                                                                                                    () =>
                                                                                                        toggleEstado(
                                                                                                            setModulosAbertos,
                                                                                                            moduloKey
                                                                                                        )
                                                                                                }
                                                                                                className="flex w-full items-center justify-between px-4 py-3 text-left"
                                                                                            >
                                                                                                <div className="flex items-center gap-2">
                                                                                                    {moduloAberto ? (
                                                                                                        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                                                                                                    ) : (
                                                                                                        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                                                                                                    )}

                                                                                                    <ScrollText className="h-4 w-4 text-slate-500" />

                                                                                                    <span className="text-xs font-black text-slate-700">
                                                                                                        {modulo.nome}
                                                                                                    </span>
                                                                                                </div>

                                                                                                <span className="text-[10px] font-bold text-slate-400">
                                                                                                    {modulo.eventos.length}
                                                                                                </span>
                                                                                            </button>

                                                                                            {moduloAberto ? (
                                                                                                <div className="overflow-x-auto border-t border-slate-100">
                                                                                                    <table className="min-w-full">
                                                                                                        <thead className="bg-slate-50">
                                                                                                            <tr>
                                                                                                                <th className="px-4 py-2 text-left text-[9px] font-black uppercase tracking-wide text-slate-400">
                                                                                                                    Evento
                                                                                                                </th>

                                                                                                                <th className="px-4 py-2 text-left text-[9px] font-black uppercase tracking-wide text-slate-400">
                                                                                                                    Descrição
                                                                                                                </th>

                                                                                                                <th className="px-4 py-2 text-right text-[9px] font-black uppercase tracking-wide text-slate-400">
                                                                                                                    Data
                                                                                                                </th>
                                                                                                            </tr>
                                                                                                        </thead>

                                                                                                        <tbody>
                                                                                                            {modulo.eventos.map(
                                                                                                                (
                                                                                                                    registro
                                                                                                                ) => (
                                                                                                                    <tr
                                                                                                                        key={
                                                                                                                            registro.id
                                                                                                                        }
                                                                                                                        className="border-t border-slate-100"
                                                                                                                    >
                                                                                                                        <td className="px-4 py-3 text-[11px] font-black text-slate-800">
                                                                                                                            {registro.acao ||
                                                                                                                                "Evento"}
                                                                                                                        </td>

                                                                                                                        <td className="px-4 py-3 text-[11px] text-slate-600">
                                                                                                                            {registro.descricao ||
                                                                                                                                "Sem descrição"}
                                                                                                                        </td>

                                                                                                                        <td className="whitespace-nowrap px-4 py-3 text-right text-[10px] text-slate-500">
                                                                                                                            {formatarDataHora(
                                                                                                                                registro.created_at
                                                                                                                            )}
                                                                                                                        </td>
                                                                                                                    </tr>
                                                                                                                )
                                                                                                            )}
                                                                                                        </tbody>
                                                                                                    </table>
                                                                                                </div>
                                                                                            ) : null}
                                                                                        </div>
                                                                                    );
                                                                                }
                                                                            )}
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            );
                                                        }
                                                    )}
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                }
                            )}
                        </div>
                    </div>
                ) : null}

                {!erro &&
                !carregando &&
                aba ===
                    "storage" ? (
                    <div className="p-5">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div>
                                <h3 className="text-sm font-black text-slate-950">
                                    Armazenamento e integridade
                                </h3>

                                <p className="mt-1 text-xs text-slate-500">
                                    Inventário único do Storage, filtrado pelo cliente/escopo selecionado.
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={
                                        auditarStorage
                                    }
                                    disabled={
                                        carregandoStorage ||
                                        limpandoStorage
                                    }
                                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-black text-slate-700"
                                >
                                    <FolderSearch className="h-4 w-4" />

                                    Auditar arquivos
                                </button>

                                <button
                                    type="button"
                                    onClick={
                                        solicitarLimpezaStorage
                                    }
                                    disabled={
                                        !storageAuditado ||
                                        escopoSelecionado ===
                                            "todos" ||
                                        !storageConfiavel ||
                                        arquivosStorageSemUso.length ===
                                            0 ||
                                        limpandoStorage
                                    }
                                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-xs font-black text-white disabled:bg-slate-300"
                                >
                                    <Trash2 className="h-4 w-4" />

                                    Limpar arquivos sem utilização
                                </button>

                                {confirmacaoLimpezaAberta && (
                                    <div
                                        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]"
                                        role="dialog"
                                        aria-modal="true"
                                        aria-labelledby="modal-limpeza-storage-titulo"
                                    >
                                        <div className="w-full max-w-[540px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
                                            <div
                                                className="relative isolate min-h-[154px] overflow-hidden bg-[#071b14] text-white"
                                                style={{
                                                    backgroundImage:
                                                        `linear-gradient(90deg, rgba(4, 22, 16, 0.96) 0%, rgba(4, 28, 19, 0.88) 40%, rgba(4, 27, 18, 0.36) 72%, rgba(4, 20, 15, 0.16) 100%), url(${dashboardHero})`,
                                                    backgroundSize:
                                                        "cover",
                                                    backgroundPosition:
                                                        "center 48%",
                                                }}
                                            >
                                                <div className="relative z-10 flex min-h-[154px] flex-col justify-center px-7 py-6">
                                                    <div className="max-w-[460px]">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                                                            SAFESCAN BRASIL
                                                        </p>

                                                        <h2
                                                            id="modal-limpeza-storage-titulo"
                                                            className="mt-2 text-[clamp(1.35rem,3vw,1.65rem)] font-black leading-[1.05] tracking-tight text-white drop-shadow-sm sm:whitespace-nowrap"
                                                        >
                                                            Confirmar limpeza de arquivos
                                                        </h2>

                                                        <p className="mt-2 max-w-[440px] text-[clamp(0.78rem,1.8vw,0.9rem)] font-medium leading-6 text-slate-100/95">
                                                            Revise o escopo antes de confirmar a exclusão dos arquivos.
                                                        </p>

                                                        <span
                                                            aria-hidden="true"
                                                            className="mt-4 block h-[3px] w-16 rounded-full bg-emerald-400"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-5 px-6 py-5">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                                                        Cliente / ambiente
                                                    </p>

                                                    <div className="mt-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800">
                                                        {rotuloEscopoSelecionado}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center">
                                                        <p className="text-[11px] font-bold text-slate-500">
                                                            Arquivos
                                                        </p>

                                                        <p className="mt-1 text-3xl font-black text-slate-950">
                                                            {arquivosStorageSemUso.length}
                                                        </p>

                                                        <p className="mt-1 text-[11px] text-slate-400">
                                                            sem utilização
                                                        </p>
                                                    </div>

                                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center">
                                                        <p className="text-[11px] font-bold text-slate-500">
                                                            Espaço estimado
                                                        </p>

                                                        <p className="mt-1 text-2xl font-black text-slate-950">
                                                            {formatarBytesStorage(
                                                                bytesSemUso
                                                            )}
                                                        </p>

                                                        <p className="mt-1 text-[11px] text-slate-400">
                                                            a liberar
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5">
                                                    <div className="flex items-start gap-3">
                                                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />

                                                        <div>
                                                            <p className="text-xs font-black text-red-800">
                                                                Esta ação não pode ser desfeita.
                                                            </p>

                                                            <p className="mt-1 text-xs leading-5 text-red-700">
                                                                Os arquivos confirmados serão removidos definitivamente do Storage.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3.5">
                                                    <p className="text-xs font-bold leading-5 text-emerald-900">
                                                        Proteção de escopo ativa
                                                    </p>

                                                    <p className="mt-1 text-xs leading-5 text-emerald-800">
                                                        Somente arquivos sem utilização deste cliente serão considerados. Arquivos em uso, protegidos ou fora do escopo selecionado serão preservados.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setConfirmacaoLimpezaAberta(
                                                            false
                                                        )
                                                    }
                                                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                                                >
                                                    Cancelar
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={
                                                        async () => {
                                                            setConfirmacaoLimpezaAberta(
                                                                false
                                                            );

                                                            await limparStorage();
                                                        }
                                                    }
                                                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-xs font-black text-white transition hover:bg-red-700"
                                                >
                                                    <Trash2 className="h-4 w-4" />

                                                    Excluir{" "}
                                                    {arquivosStorageSemUso.length}{" "}
                                                    {arquivosStorageSemUso.length ===
                                                    1
                                                        ? "arquivo"
                                                        : "arquivos"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <article className="flex min-h-[156px] flex-col items-center justify-center rounded-2xl border border-slate-200 p-4 text-center">
                                <Database className="h-5 w-5 text-blue-700" />

                                <p className="mt-2 text-xs font-bold text-slate-500">
                                    Uso total
                                </p>

                                <p className="mt-1 text-2xl font-black text-slate-950">
                                    {!storageAuditado
                                        ? "—"
                                        : storageConfiavel
                                            ? formatarBytesStorage(
                                                bytesStorageEscopo
                                            )
                                            : bytesStorageEscopo >
                                                0
                                                ? `≥ ${formatarBytesStorage(
                                                    bytesStorageEscopo
                                                )}`
                                                : "Não confirmado"}
                                </p>

                                <p className="mt-2 text-[10px] font-black text-emerald-700">
                                    {!storageAuditado
                                        ? "Execute a auditoria"
                                        : storageConfiavel
                                            ? `${percentualStorage.toLocaleString(
                                                "pt-BR",
                                                {
                                                    minimumFractionDigits:
                                                        1,
                                                    maximumFractionDigits:
                                                        1,
                                                }
                                            )}% da capacidade de ${formatarBytesStorage(
                                                LIMITE_STORAGE_MB *
                                                1024 *
                                                1024
                                            )}`
                                            : "Capacidade não confirmada"}
                                </p>

                                <p className="mt-1 text-[10px] font-semibold text-slate-500">
                                    {!storageAuditado
                                        ? "Participação aguardando auditoria"
                                        : storageConfiavel &&
                                            bytesStorageGlobal >
                                                0
                                            ? `${percentualStorageGlobalEscopo.toLocaleString(
                                                "pt-BR",
                                                {
                                                    minimumFractionDigits:
                                                        1,
                                                    maximumFractionDigits:
                                                        1,
                                                }
                                            )}% do Storage utilizado`
                                            : "Participação não confirmada"}
                                </p>

                                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                                    <div
                                        className="h-full rounded-full bg-emerald-500"
                                        style={{
                                            width:
                                                `${Math.min(
                                                    100,
                                                    percentualStorage
                                                )}%`,
                                        }}
                                    />
                                </div>
                            </article>

                            <article className="flex min-h-[156px] flex-col items-center justify-center rounded-2xl border border-slate-200 p-4 text-center">
                                <p className="text-xs font-bold text-slate-500">
                                    Arquivos
                                </p>

                                <p className="mt-2 text-2xl font-black">
                                    {!storageAuditado
                                        ? "—"
                                        : storageConfiavel
                                            ? arquivosStorageEscopo.length
                                            : arquivosStorageEscopo.length >
                                                0
                                                ? `≥ ${arquivosStorageEscopo.length}`
                                                : "Não confirmado"}
                                </p>
                            </article>

                            <article className="flex min-h-[156px] flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
                                <p className="text-xs font-bold text-amber-700">
                                    Sem utilização
                                </p>

                                <p className="mt-2 text-2xl font-black text-amber-900">
                                    {!storageAuditado
                                        ? "—"
                                        : storageConfiavel
                                            ? arquivosStorageSemUso.length
                                            : "Não confirmado"}
                                </p>

                                <p className="mt-1 text-[10px] text-amber-700">
                                    {!storageAuditado
                                        ? "Execute a auditoria"
                                        : storageConfiavel
                                            ? formatarBytesStorage(
                                                bytesSemUso
                                            )
                                            : "Aguardando análise íntegra"}
                                </p>
                            </article>

                            <article className="flex min-h-[156px] flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-4 text-center">
                                <p className="text-xs font-bold text-red-700">
                                    Fora de diretórios
                                </p>

                                <p className="mt-2 text-2xl font-black text-red-900">
                                    {!storageAuditado
                                        ? "—"
                                        : storageConfiavel
                                            ? arquivosForaDiretorio.length
                                            : "Não confirmado"}
                                </p>
                            </article>
                        </div>

                        {progressoStorage.mensagem ? (
                            <div
                                className={
                                    progressoStorage.falhas > 0
                                        ? "mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4"
                                        : "mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-4"
                                }
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p
                                            className={
                                                progressoStorage.falhas > 0
                                                    ? "text-xs font-black text-amber-800"
                                                    : "text-xs font-black text-blue-800"
                                            }
                                        >
                                            Progresso da análise
                                        </p>

                                        <p
                                            className={
                                                progressoStorage.falhas > 0
                                                    ? "mt-1 text-[10px] font-semibold text-amber-700"
                                                    : "mt-1 text-[10px] font-semibold text-blue-700"
                                            }
                                        >
                                            {progressoStorage.mensagem}
                                        </p>

                                        {storageAuditado &&
                                        duracaoAuditoriaMs !==
                                            null ? (
                                            <p className="mt-1 text-[10px] font-bold text-slate-500">
                                                Tempo da auditoria:{" "}
                                                <span className="text-slate-700">
                                                    {formatarDuracaoAuditoria(
                                                        duracaoAuditoriaMs
                                                    )}
                                                </span>
                                            </p>
                                        ) : null}
                                    </div>

                                    <div className="text-right">
                                        <p
                                            className={
                                                progressoStorage.falhas > 0
                                                    ? "text-xl font-black text-amber-900"
                                                    : "text-xl font-black text-blue-900"
                                            }
                                        >
                                            {percentualAnaliseStorage}%
                                        </p>

                                        {progressoStorage.total > 0 ? (
                                            <p className="text-[10px] font-bold text-slate-500">
                                                {progressoStorage.atual}/
                                                {progressoStorage.total}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80 ring-1 ring-black/5">
                                    <div
                                        className={
                                            progressoStorage.falhas > 0
                                                ? "h-full rounded-full bg-amber-500 transition-all duration-300"
                                                : "h-full rounded-full bg-blue-600 transition-all duration-300"
                                        }
                                        style={{
                                            width:
                                                `${percentualAnaliseStorage}%`,
                                        }}
                                    />
                                </div>

                                {progressoStorage.falhas > 0 ? (
                                    <p className="mt-2 text-[10px] font-black text-amber-800">
                                        {progressoStorage.falhas} falha(s) detectada(s) — limpeza bloqueada
                                    </p>
                                ) : null}
                            </div>
                        ) : null}

                        {storageAuditado ? (
                            <div
                                className={
                                    storageConfiavel
                                        ? "mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4"
                                        : "mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4"
                                }
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p
                                            className={
                                                storageConfiavel
                                                    ? "text-xs font-black text-emerald-800"
                                                    : "text-xs font-black text-amber-800"
                                            }
                                        >
                                            Integridade da análise
                                        </p>

                                        <p className="mt-1 text-[10px] font-semibold text-slate-600">
                                            {Math.max(
                                                0,
                                                progressoStorage.total -
                                                progressoStorage.falhas
                                            )}
                                            /
                                            {progressoStorage.total} etapas sem falha
                                        </p>
                                    </div>

                                    <p
                                        className={
                                            storageConfiavel
                                                ? "text-xl font-black text-emerald-900"
                                                : "text-xl font-black text-amber-900"
                                        }
                                    >
                                        {percentualIntegridadeStorage}%
                                    </p>
                                </div>

                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80 ring-1 ring-black/5">
                                    <div
                                        className={
                                            storageConfiavel
                                                ? "h-full rounded-full bg-emerald-600 transition-all duration-300"
                                                : "h-full rounded-full bg-amber-500 transition-all duration-300"
                                        }
                                        style={{
                                            width:
                                                `${percentualIntegridadeStorage}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        ) : null}

                        {storageAuditado ? (
                            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <div className="border-b border-slate-200 px-5 py-4">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <div>
                                            <p className="text-sm font-black text-slate-950">
                                                Distribuição do armazenamento
                                            </p>

                                            <p className="mt-1 text-xs text-slate-500">
                                                Veja onde o cliente está utilizando mais espaço.
                                            </p>
                                        </div>

                                        <div className="text-left lg:text-right">
                                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                                                Cliente / ambiente
                                            </p>

                                            <p className="mt-1 text-xs font-black text-slate-700">
                                                {rotuloEscopoSelecionado}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            aria-pressed={
                                                categoriaStorageAtiva ===
                                                "todos"
                                            }
                                            onClick={() =>
                                                setCategoriaStorageSelecionada(
                                                    "todos"
                                                )
                                            }
                                            className={
                                                categoriaStorageAtiva ===
                                                "todos"
                                                    ? "rounded-full bg-slate-950 px-3 py-2 text-[10px] font-black text-white"
                                                    : "rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-600 transition hover:bg-slate-50"
                                            }
                                        >
                                            Todos
                                        </button>

                                        {distribuicaoStorage.map(
                                            (
                                                categoria
                                            ) => (
                                                <button
                                                    key={
                                                        categoria.id
                                                    }
                                                    type="button"
                                                    aria-pressed={
                                                        categoriaStorageAtiva ===
                                                        categoria.id
                                                    }
                                                    onClick={() =>
                                                        setCategoriaStorageSelecionada(
                                                            categoria.id
                                                        )
                                                    }
                                                    className={
                                                        categoriaStorageAtiva ===
                                                        categoria.id
                                                            ? "rounded-full bg-emerald-700 px-3 py-2 text-[10px] font-black text-white"
                                                            : "rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                                                    }
                                                >
                                                    {
                                                        categoria.rotulo
                                                    }
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>

                                <div className="divide-y divide-slate-100">
                                    {distribuicaoStorage.length >
                                    0 ? (
                                        distribuicaoStorage.map(
                                            (
                                                categoria,
                                                indice
                                            ) => (
                                                <button
                                                    key={
                                                        categoria.id
                                                    }
                                                    type="button"
                                                    aria-pressed={
                                                        categoriaStorageAtiva ===
                                                        categoria.id
                                                    }
                                                    onClick={() =>
                                                        setCategoriaStorageSelecionada(
                                                            categoria.id
                                                        )
                                                    }
                                                    className={
                                                        categoriaStorageAtiva ===
                                                        categoria.id
                                                            ? "grid w-full gap-3 bg-emerald-50/50 px-5 py-4 text-left lg:grid-cols-[minmax(240px,1fr)_110px_140px_90px]"
                                                            : "grid w-full gap-3 px-5 py-4 text-left transition hover:bg-slate-50 lg:grid-cols-[minmax(240px,1fr)_110px_140px_90px]"
                                                    }
                                                >
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-black text-slate-600">
                                                                {indice +
                                                                    1}
                                                            </div>

                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <p className="truncate text-xs font-black text-slate-800">
                                                                        {
                                                                            categoria.rotulo
                                                                        }
                                                                    </p>

                                                                    <p className="text-[10px] font-black text-emerald-700 lg:hidden">
                                                                        {categoria.percentual.toLocaleString(
                                                                            "pt-BR",
                                                                            {
                                                                                minimumFractionDigits:
                                                                                    1,
                                                                                maximumFractionDigits:
                                                                                    1,
                                                                            }
                                                                        )}
                                                                        %
                                                                    </p>
                                                                </div>

                                                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                                                    <div
                                                                        className="h-full rounded-full bg-emerald-600"
                                                                        style={{
                                                                            width:
                                                                                `${Math.min(
                                                                                    100,
                                                                                    categoria.percentual
                                                                                )}%`,
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center text-xs text-slate-500">
                                                        <span className="font-black text-slate-900">
                                                            {
                                                                categoria.arquivos
                                                            }
                                                        </span>
                                                        <span className="ml-1">
                                                            arquivo(s)
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center text-xs font-black text-slate-900">
                                                        {formatarBytesStorage(
                                                            categoria.bytes
                                                        )}
                                                    </div>

                                                    <div className="hidden items-center justify-end text-xs font-black text-emerald-700 lg:flex">
                                                        {categoria.percentual.toLocaleString(
                                                            "pt-BR",
                                                            {
                                                                minimumFractionDigits:
                                                                    1,
                                                                maximumFractionDigits:
                                                                    1,
                                                            }
                                                        )}
                                                        %
                                                    </div>
                                                </button>
                                            )
                                        )
                                    ) : (
                                        <div className="px-5 py-7 text-center">
                                            <p className="text-xs font-bold text-slate-500">
                                                Nenhum arquivo identificado neste escopo.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        ) : null}

                        {resultadoLimpeza ? (
                            <div
                                className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]"
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="modal-resultado-limpeza-titulo"
                            >
                                <div className="w-full max-w-[540px] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl">
                                    <div
                                        className="relative isolate min-h-[148px] overflow-hidden bg-[#071b14] text-white"
                                        style={{
                                            backgroundImage:
                                                `linear-gradient(90deg, rgba(4, 22, 16, 0.96) 0%, rgba(4, 28, 19, 0.88) 40%, rgba(4, 27, 18, 0.36) 72%, rgba(4, 20, 15, 0.16) 100%), url(${dashboardHero})`,
                                            backgroundSize:
                                                "cover",
                                            backgroundPosition:
                                                "center 48%",
                                        }}
                                    >
                                        <div className="relative z-10 flex min-h-[148px] flex-col justify-center px-7 py-6">
                                            <div className="max-w-[470px]">
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                                                    SAFESCAN BRASIL
                                                </p>

                                                <h2
                                                    id="modal-resultado-limpeza-titulo"
                                                    className="mt-2 text-[clamp(1.45rem,3vw,1.8rem)] font-black leading-[1.05] tracking-tight text-white drop-shadow-sm"
                                                >
                                                    {resultadoLimpeza.falhas >
                                                    0
                                                        ? "Limpeza concluída com ressalvas"
                                                        : "Limpeza concluída"}
                                                </h2>

                                                <p className="mt-2 max-w-[450px] text-[clamp(0.78rem,1.8vw,0.9rem)] font-medium leading-6 text-slate-100/95">
                                                    O inventário do armazenamento foi atualizado após a operação.
                                                </p>

                                                <span
                                                    aria-hidden="true"
                                                    className="mt-4 block h-[3px] w-16 rounded-full bg-emerald-400"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-5 px-6 py-5">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                                                Cliente / ambiente
                                            </p>

                                            <div className="mt-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800">
                                                {resultadoLimpeza.escopo}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center">
                                                <p className="text-[11px] font-bold text-slate-500">
                                                    Arquivos excluídos
                                                </p>

                                                <p className="mt-1 text-3xl font-black text-slate-950">
                                                    {resultadoLimpeza.excluidos}
                                                </p>

                                                <p className="mt-1 text-[11px] text-slate-400">
                                                    removidos do Storage
                                                </p>
                                            </div>

                                            <div
                                                className={
                                                    resultadoLimpeza.falhas >
                                                    0
                                                        ? "rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-center"
                                                        : "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center"
                                                }
                                            >
                                                <p
                                                    className={
                                                        resultadoLimpeza.falhas >
                                                        0
                                                            ? "text-[11px] font-bold text-amber-700"
                                                            : "text-[11px] font-bold text-emerald-700"
                                                    }
                                                >
                                                    Falhas
                                                </p>

                                                <p
                                                    className={
                                                        resultadoLimpeza.falhas >
                                                        0
                                                            ? "mt-1 text-3xl font-black text-amber-900"
                                                            : "mt-1 text-3xl font-black text-emerald-900"
                                                    }
                                                >
                                                    {resultadoLimpeza.falhas}
                                                </p>

                                                <p
                                                    className={
                                                        resultadoLimpeza.falhas >
                                                        0
                                                            ? "mt-1 text-[11px] text-amber-700"
                                                            : "mt-1 text-[11px] text-emerald-700"
                                                    }
                                                >
                                                    ocorrências
                                                </p>
                                            </div>
                                        </div>

                                        <div
                                            className={
                                                resultadoLimpeza.falhas >
                                                0
                                                    ? "rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4"
                                                    : "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4"
                                            }
                                        >
                                            <div className="flex items-start gap-3">
                                                <div
                                                    className={
                                                        resultadoLimpeza.falhas >
                                                        0
                                                            ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-black text-amber-700"
                                                            : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700"
                                                    }
                                                >
                                                    {resultadoLimpeza.falhas >
                                                    0
                                                        ? "!"
                                                        : "✓"}
                                                </div>

                                                <div>
                                                    <p
                                                        className={
                                                            resultadoLimpeza.falhas >
                                                            0
                                                                ? "text-xs font-black text-amber-900"
                                                                : "text-xs font-black text-emerald-900"
                                                        }
                                                    >
                                                        {resultadoLimpeza.falhas >
                                                        0
                                                            ? "Limpeza finalizada com ocorrências"
                                                            : "Limpeza finalizada sem falhas"}
                                                    </p>

                                                    <p
                                                        className={
                                                            resultadoLimpeza.falhas >
                                                            0
                                                                ? "mt-1 text-xs leading-5 text-amber-800"
                                                                : "mt-1 text-xs leading-5 text-emerald-800"
                                                        }
                                                    >
                                                        {resultadoLimpeza.falhas >
                                                        0
                                                            ? "Alguns arquivos não puderam ser removidos. O inventário foi atualizado e as ocorrências permanecem disponíveis para conferência."
                                                            : "Todos os arquivos selecionados foram processados. O inventário foi atualizado automaticamente após a limpeza."}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end border-t border-slate-100 bg-slate-50/70 px-6 py-4">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setResultadoLimpeza(
                                                    null
                                                )
                                            }
                                            className={
                                                resultadoLimpeza.falhas >
                                                0
                                                    ? "inline-flex h-11 items-center justify-center rounded-xl bg-amber-600 px-6 text-xs font-black text-white transition hover:bg-amber-700"
                                                    : "inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-6 text-xs font-black text-white transition hover:bg-emerald-800"
                                            }
                                        >
                                            Concluir
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        {erroStorage ? (
                            <div className="mt-4 flex gap-2 rounded-xl bg-red-50 p-4 text-xs font-semibold text-red-700">
                                <AlertTriangle className="h-4 w-4" />
                                {erroStorage}
                            </div>
                        ) : null}

                        {storageAuditado ? (
                            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black">
                                    {storageConfiavel
                                        ? "Candidatos à limpeza"
                                        : "Prévia parcial de candidatos"}
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <tbody>
                                            {arquivosStorageSemUsoFiltrados
                                                .slice(
                                                    0,
                                                    200
                                                )
                                                .map(
                                                    (
                                                        arquivo
                                                    ) => (
                                                        <tr
                                                            key={
                                                                `${arquivo.bucket}:${arquivo.caminho}`
                                                            }
                                                            className="border-b border-slate-100"
                                                        >
                                                            <td className="px-4 py-3 text-[10px] font-bold">
                                                                {arquivo.bucket}
                                                            </td>

                                                            <td className="px-4 py-3 font-mono text-[10px] text-slate-600">
                                                                {arquivo.caminho}
                                                            </td>

                                                            <td className="px-4 py-3 text-right text-[10px]">
                                                                {formatarBytesStorage(
                                                                    arquivo.tamanho
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )
                                                )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </section>
        </div>
    );
}