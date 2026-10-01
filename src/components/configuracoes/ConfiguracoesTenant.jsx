import {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    BadgeCheck,
    Blocks,
    Building2,
    ChevronDown,
    Globe2,
    LockKeyhole,
    ShieldCheck,
    UserRound,
} from "lucide-react";

import dashboardHeroBackground from "../../assets/dashboard-hero-sst.webp";
import {
    useTenantRuntimeContext,
} from "../layout/TenantRuntimeContext.js";
import {
    CertidaoMensalEmailConfiguracoes,
} from "./CertidaoMensalEmailConfiguracoes";
import {
    ModelosEmailSstConfiguracoes,
} from "./ModelosEmailSstConfiguracoes";
import {
    TIPOS_MODELO_EMAIL_SST,
} from "../../constants/modelosEmailSstConstants";
import {
    CANAIS_EMAIL_SST_EMPRESA,
    emailSstCanalEmpresaValido,
    listarConfiguracoesEmailSstEmpresaTenant,
    obterUltimaAtualizacaoAuditoriaEmpresaTenant,
    salvarConfiguracaoEmailSstEmpresaTenant,
} from "../../services/emailSstCanalEmpresaService.js";
import {
    RECURSOS_OPERACIONAIS_PLANO_BASE,
    listarRecursosOperacionaisTenant,
    recursoOperacionalDisponivelTenantRuntime,
    salvarRecursoOperacionalTenant,
} from "../../services/tenantOperationalResourcesService.js";

const TIPOS_MODELO_DOCUMENTOS =
    Object.freeze([
        TIPOS_MODELO_EMAIL_SST.DOCUMENTO_COLABORADOR,
        TIPOS_MODELO_EMAIL_SST.DOCUMENTO_EMPRESA,
        TIPOS_MODELO_EMAIL_SST.DOCUMENTOS_LOTE,
    ]);

const TIPOS_MODELO_TREINAMENTOS =
    Object.freeze([
        TIPOS_MODELO_EMAIL_SST.TREINAMENTOS,
    ]);

const TIPOS_MODELO_AUDITORIA =
    Object.freeze([
        TIPOS_MODELO_EMAIL_SST.AUDITORIA,
    ]);

function textoSeguro(valor = "") {
    return String(valor ?? "").trim();
}

// R22_E3_C5A1_UX_ULTIMA_ATUALIZACAO
function formatarDataHoraAtualizacao(valor = "") {
    const timestamp =
        textoSeguro(
            valor
        );

    if (!timestamp) {
        return "";
    }

    const data =
        new Date(
            timestamp
        );

    if (
        Number.isNaN(
            data.getTime()
        )
    ) {
        return "";
    }

    const dataFormatada =
        new Intl.DateTimeFormat(
            "pt-BR",
            {
                day:
                    "2-digit",

                month:
                    "2-digit",

                year:
                    "numeric",
            }
        ).format(
            data
        );

    const horaFormatada =
        new Intl.DateTimeFormat(
            "pt-BR",
            {
                hour:
                    "2-digit",

                minute:
                    "2-digit",

                hour12:
                    false,
            }
        ).format(
            data
        );

    return (
        dataFormatada +
        " às " +
        horaFormatada
    );
}

function nomePerfilAcesso(valor = "") {
    const perfil =
        textoSeguro(valor)
            .toLowerCase();

    const rotulos = {
        administrador: "Administrador",
        tecnico_sst: "Técnico SST",
        auditor: "Auditor",
        consulta: "Consulta",
    };

    return (
        rotulos[perfil]
        || textoSeguro(valor)
        || "Não informado"
    );
}

function nomeEmpresa(empresa = null) {
    return (
        textoSeguro(empresa?.nome)
        || textoSeguro(empresa?.razao_social)
        || textoSeguro(empresa?.nome_fantasia)
        || "Empresa sem nome"
    );
}

function descricaoModulo(modulo = null) {
    if (
        modulo?.obrigatorio === true
        || textoSeguro(modulo?.status).toLowerCase() === "core"
    ) {
        return "Núcleo SafeScan";
    }

    return "Contratado";
}

function CartaoResumo({
    icone: Icone,
    titulo,
    valor,
    descricao,
}) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <Icone className="h-5 w-5" />
                </span>

                <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                        {titulo}
                    </p>

                    <p className="mt-1 break-words text-lg font-bold text-slate-950">
                        {valor}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                        {descricao}
                    </p>
                </div>
            </div>
        </article>
    );
}

export function ConfiguracoesTenant({
    empresasBanco = [],
    supabaseClient = null,
    onAtualizarEmpresa = null,
    usuario = null,
    permissaoSistemaUsuario = null,
    modulosTenantRuntime = [],
}) {
    const {
        tenant,
        hostname,
        dominioCanonico,
    } =
        useTenantRuntimeContext();

    const empresas =
        Array.isArray(empresasBanco)
            ? empresasBanco
            : [];

    // R22_E3_C1_INTERFACE_MODULAR_EMAIL_SST
    const modulosDisponiveis =
        (
            Array.isArray(modulosTenantRuntime)
                ? modulosTenantRuntime
                : []
        )
            .filter(
                (modulo) =>
                    modulo?.disponivel === true
            )
            .sort(
                (a, b) =>
                    textoSeguro(
                        a?.nome || a?.chave
                    ).localeCompare(
                        textoSeguro(
                            b?.nome || b?.chave
                        ),
                        "pt-BR"
                    )
            );

    const tenantNome =
        textoSeguro(tenant?.nome)
        || "Conta SafeScan";

    const tenantSlug =
        textoSeguro(tenant?.slug)
        || "não informado";

    const hostnameAtual =
        textoSeguro(hostname)
        || "não informado";

    const dominioPrincipal =
        textoSeguro(
            dominioCanonico?.hostname
        )
        || hostnameAtual;

    const nomeUsuario =
        textoSeguro(usuario?.nome)
        || textoSeguro(
            permissaoSistemaUsuario?.nome
        )
        || "Usuário do cliente";

    const emailUsuario =
        textoSeguro(usuario?.email)
        || textoSeguro(
            permissaoSistemaUsuario?.email
        )
        || "E-mail não informado";

    const perfilUsuario =
        nomePerfilAcesso(
            permissaoSistemaUsuario?.perfil
        );

    const tenantId =
        textoSeguro(
            tenant?.id
        );

    const perfilUsuarioChave =
        textoSeguro(
            permissaoSistemaUsuario?.perfil
        ).toLowerCase();

    const podeAlterarCertidaoMensal =
        perfilUsuarioChave ===
        "administrador";

    const podeAlterarRecursosOperacionais =
        perfilUsuarioChave ===
        "administrador";

    const certidaoMensalDisponivel =
        modulosDisponiveis.some(
            (modulo) =>
                textoSeguro(
                    modulo?.chave
                ) ===
                    "certidao_mensal_documental"
                && modulo?.disponivel ===
                    true
        );

    const moduloDisponivel =
        (chave = "") =>
            modulosDisponiveis.some(
                (modulo) =>
                    textoSeguro(
                        modulo?.chave
                    ) ===
                        chave
                    &&
                    modulo?.disponivel ===
                        true
            );

    const documentosDisponivelComercial =
        moduloDisponivel(
            "gestao_documental_sst"
        );

    const treinamentosDisponivelComercial =
        moduloDisponivel(
            "treinamentos"
        );

    const auditoriaDisponivel =
        moduloDisponivel(
            "auditoria_campo"
        );

    const [
        empresaSstSelecionadaId,
        setEmpresaSstSelecionadaId,
    ] =
        useState("");

    const [
        formularioDocumentos,
        setFormularioDocumentos,
    ] =
        useState(() => ({
            ativo: false,
            responsavel: "",
            email: "",
        }));

    const [
        formularioTreinamentos,
        setFormularioTreinamentos,
    ] =
        useState(() => ({
            ativo: false,
            responsavel: "",
            email: "",
        }));

    const [
        formularioAuditoria,
        setFormularioAuditoria,
    ] =
        useState(() => ({
            receberAuditoria: false,
            responsavelAuditoria: "",
            emailAuditoria: "",
        }));

    const [
        carregandoCanaisSst,
        setCarregandoCanaisSst,
    ] =
        useState(false);

    const [
        salvandoCanalSst,
        setSalvandoCanalSst,
    ] =
        useState("");

    const [
        retornoCanalSst,
        setRetornoCanalSst,
    ] =
        useState({});

    // R22_E3_C5E_PADRAO_EDICAO_CANAIS_SST
    const [
        canaisSstEmEdicao,
        setCanaisSstEmEdicao,
    ] =
        useState({});

    const [
        canaisSstSnapshotPersistido,
        setCanaisSstSnapshotPersistido,
    ] =
        useState({});

    const [
        retornoAuditoria,
        setRetornoAuditoria,
    ] =
        useState(null);

    // R22_E3_C3_UX_AUDITORIA_LEGADA
    const [
        auditoriaInteragida,
        setAuditoriaInteragida,
    ] =
        useState(false);

    // R22_E3_C5D_UX_EDICAO_AUDITORIA
    const [
        auditoriaEmEdicao,
        setAuditoriaEmEdicao,
    ] =
        useState(false);

    const [
        auditoriaSnapshotPersistido,
        setAuditoriaSnapshotPersistido,
    ] =
        useState(null);

    const [
        auditoriaAtualizadoEm,
        setAuditoriaAtualizadoEm,
    ] =
        useState(null);

    const selecaoSstSequenciaRef =
        useRef(0);

    const [
        recursosOperacionais,
        setRecursosOperacionais,
    ] =
        useState(
            () =>
                RECURSOS_OPERACIONAIS_PLANO_BASE.map(
                    (recurso) => ({
                        ...recurso,
                        ativo:
                            true,
                        configurado:
                            false,
                        atualizadoEm:
                            null,
                    })
                )
        );

    const [
        carregandoRecursosOperacionais,
        setCarregandoRecursosOperacionais,
    ] =
        useState(false);

    const [
        salvandoRecursoOperacional,
        setSalvandoRecursoOperacional,
    ] =
        useState("");

    const [
        retornoRecursosOperacionais,
        setRetornoRecursosOperacionais,
    ] =
        useState(null);

    useEffect(
        () => {
            let efeitoAtivo =
                true;

            if (!tenantId) {
                setRecursosOperacionais(
                    RECURSOS_OPERACIONAIS_PLANO_BASE.map(
                        (recurso) => ({
                            ...recurso,
                            ativo:
                                true,
                            configurado:
                                false,
                            atualizadoEm:
                                null,
                        })
                    )
                );

                setCarregandoRecursosOperacionais(
                    false
                );

                setRetornoRecursosOperacionais(
                    null
                );

                return () => {
                    efeitoAtivo =
                        false;
                };
            }

            setCarregandoRecursosOperacionais(
                true
            );

            setRetornoRecursosOperacionais(
                null
            );

            listarRecursosOperacionaisTenant({
                tenantId,

                supabaseClient:
                    supabaseClient
                    ||
                    undefined,
            })
                .then(
                    (recursos) => {
                        if (!efeitoAtivo) {
                            return;
                        }

                        setRecursosOperacionais(
                            recursos
                        );
                    }
                )
                .catch(
                    (erro) => {
                        if (!efeitoAtivo) {
                            return;
                        }

                        setRetornoRecursosOperacionais({
                            tipo:
                                "erro",

                            mensagem:
                                erro?.message
                                ||
                                "Não foi possível carregar os recursos operacionais do Plano Base.",
                        });
                    }
                )
                .finally(
                    () => {
                        if (!efeitoAtivo) {
                            return;
                        }

                        setCarregandoRecursosOperacionais(
                            false
                        );
                    }
                );

            return () => {
                efeitoAtivo =
                    false;
            };
        },
        [
            tenantId,
            supabaseClient,
        ]
    );

    const alterarRecursoOperacional =
        async (
            recursoChave,
            proximoEstado
        ) => {
            if (
                !podeAlterarRecursosOperacionais
                ||
                !tenantId
                ||
                salvandoRecursoOperacional
            ) {
                return;
            }

            const chave =
                textoSeguro(
                    recursoChave
                ).toLowerCase();

            const recursoExiste =
                recursosOperacionais.some(
                    (recurso) =>
                        recurso.chave ===
                        chave
                );

            if (!recursoExiste) {
                return;
            }

            const estadoAnterior =
                recursosOperacionais.map(
                    (recurso) => ({
                        ...recurso,
                    })
                );

            setRetornoRecursosOperacionais(
                null
            );

            setSalvandoRecursoOperacional(
                chave
            );

            setRecursosOperacionais(
                (atual) =>
                    atual.map(
                        (recurso) =>
                            recurso.chave ===
                                chave
                                ? {
                                    ...recurso,
                                    ativo:
                                        proximoEstado,
                                }
                                : recurso
                    )
            );

            try {
                const salvo =
                    await salvarRecursoOperacionalTenant({
                        tenantId,

                        recursoChave:
                            chave,

                        ativo:
                            proximoEstado,

                        supabaseClient:
                            supabaseClient
                            ||
                            undefined,
                    });

                setRecursosOperacionais(
                    (atual) =>
                        atual.map(
                            (recurso) =>
                                recurso.chave ===
                                    chave
                                    ? {
                                        ...recurso,
                                        ativo:
                                            salvo.ativo,
                                        configurado:
                                            true,
                                        atualizadoEm:
                                            salvo.atualizadoEm,
                                    }
                                    : recurso
                        )
                );

                setRetornoRecursosOperacionais({
                    tipo:
                        "sucesso",

                    mensagem:
                        "Recurso operacional atualizado com sucesso.",
                });
            }
            catch (erro) {
                setRecursosOperacionais(
                    estadoAnterior
                );

                setRetornoRecursosOperacionais({
                    tipo:
                        "erro",

                    mensagem:
                        erro?.message
                        ||
                        "Não foi possível atualizar o recurso operacional.",
                });
            }
            finally {
                setSalvandoRecursoOperacional(
                    ""
                );
            }
        };

    const recursosOperacionaisProntosConfiguracao =
        Boolean(
            !tenantId
            || (
                !carregandoRecursosOperacionais
                && recursosOperacionais.length > 0
                && retornoRecursosOperacionais?.tipo !== "erro"
            )
        );

    const recursoOperacionalConfiguracaoDisponivel =
        (chave) =>
            !tenantId
            || (
                recursosOperacionaisProntosConfiguracao
                && recursoOperacionalDisponivelTenantRuntime(
                    recursosOperacionais,
                    chave
                )
            );

    const documentosDisponivel =
        Boolean(
            documentosDisponivelComercial
            && recursoOperacionalConfiguracaoDisponivel(
                "gestao_documental_sst"
            )
        );

    const treinamentosDisponivel =
        Boolean(
            treinamentosDisponivelComercial
            && recursoOperacionalConfiguracaoDisponivel(
                "treinamentos"
            )
        );

    const sstDisponivel =
        documentosDisponivel
        ||
        treinamentosDisponivel
        ||
        auditoriaDisponivel;

    const empresaSstSelecionada =
        empresas.find(
            (empresa) =>
                textoSeguro(
                    empresa?.id
                ) ===
                textoSeguro(
                    empresaSstSelecionadaId
                )
        ) || null;

    const empresaSstCnpj =
        textoSeguro(
            empresaSstSelecionada?.cnpj
        );

    const criarFormularioCanal =
        (configuracao = null) => ({
            ativo:
                configuracao?.ativo ===
                true,

            responsavel:
                textoSeguro(
                    configuracao?.responsavel
                ),

            email:
                textoSeguro(
                    configuracao?.email
                ),

            atualizadoEm:
                configuracao?.atualizadoEm
                ||
                null,

            versao:
                Number(
                    configuracao?.versao
                )
                ||
                null,
        });

    const criarFormularioAuditoria =
        (empresa = null) => ({
            receberAuditoria:
                empresa
                    ? (
                        empresa?.receber_auditoria !== false
                        &&
                        empresa?.receberAuditoria !== false
                    )
                    : false,

            responsavelAuditoria:
                textoSeguro(
                    empresa?.responsavel_auditoria
                    ||
                    empresa?.responsavelAuditoria
                ),

            emailAuditoria:
                textoSeguro(
                    empresa?.email_auditoria
                    ||
                    empresa?.emailAuditoria
                ),
        });

    const definirRetornoCanal =
        (
            canal,
            retorno = null
        ) => {
            setRetornoCanalSst(
                (atual) => ({
                    ...atual,
                    [canal]:
                        retorno,
                })
            );
        };

    const selecionarEmpresaSst =
        async (
            empresaId = ""
        ) => {
            const idSeguro =
                textoSeguro(
                    empresaId
                );

            const sequencia =
                selecaoSstSequenciaRef.current +
                1;

            selecaoSstSequenciaRef.current =
                sequencia;

            setEmpresaSstSelecionadaId(
                idSeguro
            );

            setFormularioDocumentos(
                criarFormularioCanal()
            );

            setFormularioTreinamentos(
                criarFormularioCanal()
            );

            setRetornoCanalSst(
                {}
            );

            setCanaisSstEmEdicao(
                {}
            );

            setCanaisSstSnapshotPersistido(
                {}
            );

            setRetornoAuditoria(
                null
            );

            setAuditoriaInteragida(
                false
            );

            setAuditoriaEmEdicao(
                false
            );

            setAuditoriaSnapshotPersistido(
                null
            );

            setAuditoriaAtualizadoEm(
                null
            );

            const empresa =
                empresas.find(
                    (item) =>
                        textoSeguro(
                            item?.id
                        ) ===
                        idSeguro
                ) || null;

            const formularioAuditoriaInicial =
                criarFormularioAuditoria(
                    empresa
                );

            setFormularioAuditoria(
                formularioAuditoriaInicial
            );

            setAuditoriaSnapshotPersistido(
                formularioAuditoriaInicial
            );

            if (
                !idSeguro
                ||
                !empresa
                ||
                !tenantId
                ||
                (
                    !documentosDisponivel
                    &&
                    !treinamentosDisponivel
                    &&
                    !auditoriaDisponivel
                )
            ) {
                setCarregandoCanaisSst(
                    false
                );

                return;
            }

            setCarregandoCanaisSst(
                true
            );

            try {
                let configuracoes =
                    [];

                if (
                    documentosDisponivel
                    ||
                    treinamentosDisponivel
                    ||
                    auditoriaDisponivel
                ) {
                    configuracoes =
                        await listarConfiguracoesEmailSstEmpresaTenant({
                            tenantId,

                            supabaseClient:
                                supabaseClient
                                ||
                                undefined,
                        });
                }

                if (
                    selecaoSstSequenciaRef.current !==
                    sequencia
                ) {
                    return;
                }

                const localizarCanal =
                    (canal) =>
                        configuracoes.find(
                            (configuracao) =>
                                textoSeguro(
                                    configuracao?.empresaId
                                ) ===
                                    idSeguro
                                &&
                                configuracao?.canal ===
                                    canal
                        ) || null;

                if (
                    documentosDisponivel
                ) {
                    setFormularioDocumentos(
                        criarFormularioCanal(
                            localizarCanal(
                                CANAIS_EMAIL_SST_EMPRESA.DOCUMENTOS
                            )
                        )
                    );
                }

                if (
                    treinamentosDisponivel
                ) {
                    setFormularioTreinamentos(
                        criarFormularioCanal(
                            localizarCanal(
                                CANAIS_EMAIL_SST_EMPRESA.TREINAMENTOS
                            )
                        )
                    );
                }

                if (
                    auditoriaDisponivel
                ) {
                    // R22_E3_D2B_AUDITORIA_CUTOVER
                    const configuracaoAuditoria =
                        localizarCanal(
                            CANAIS_EMAIL_SST_EMPRESA.AUDITORIA
                        );

                    if (
                        configuracaoAuditoria
                    ) {
                        const formularioAuditoriaCanal = {
                            receberAuditoria:
                                configuracaoAuditoria.ativo ===
                                true,

                            responsavelAuditoria:
                                textoSeguro(
                                    configuracaoAuditoria.responsavel
                                ),

                            emailAuditoria:
                                textoSeguro(
                                    configuracaoAuditoria.email
                                ),
                        };

                        setFormularioAuditoria(
                            formularioAuditoriaCanal
                        );

                        setAuditoriaSnapshotPersistido(
                            formularioAuditoriaCanal
                        );

                        setAuditoriaAtualizadoEm(
                            configuracaoAuditoria.atualizadoEm
                            ||
                            configuracaoAuditoria.atualizado_em
                            ||
                            null
                        );
                    }
                    else {
                        const atualizadoEm =
                            await obterUltimaAtualizacaoAuditoriaEmpresaTenant({
                                tenantId,

                                empresaId:
                                    idSeguro,

                                supabaseClient:
                                    supabaseClient
                                    ||
                                    undefined,
                            });

                        if (
                            selecaoSstSequenciaRef.current !==
                            sequencia
                        ) {
                            return;
                        }

                        setAuditoriaAtualizadoEm(
                            atualizadoEm
                        );
                    }
                }
            }
            catch (erro) {
                if (
                    selecaoSstSequenciaRef.current !==
                    sequencia
                ) {
                    return;
                }

                setRetornoCanalSst({
                    GERAL: {
                        tipo:
                            "erro",

                        mensagem:
                            erro?.message
                            ||
                            "Não foi possível carregar as configurações independentes de e-mail SST.",
                    },
                });
            }
            finally {
                if (
                    selecaoSstSequenciaRef.current ===
                    sequencia
                ) {
                    setCarregandoCanaisSst(
                        false
                    );
                }
            }
        };

    const obterAtualizadorFormularioCanalSst =
        (canal) =>
            canal ===
                CANAIS_EMAIL_SST_EMPRESA.DOCUMENTOS
                ? setFormularioDocumentos
                : setFormularioTreinamentos;

    const atualizarCampoCanal =
        (
            canal,
            campo,
            valor
        ) => {
            const atualizar =
                obterAtualizadorFormularioCanalSst(
                    canal
                );

            atualizar(
                (atual) => ({
                    ...atual,
                    [campo]:
                        valor,
                })
            );

            definirRetornoCanal(
                canal,
                null
            );
        };

    const atualizarCampoAuditoria =
        (
            campo,
            valor
        ) => {
            setFormularioAuditoria(
                (atual) => ({
                    ...atual,
                    [campo]:
                        valor,
                })
            );

            setAuditoriaInteragida(
                true
            );

            setRetornoAuditoria(
                null
            );
        };

    const iniciarEdicaoAuditoria =
        () => {
            if (
                !empresaSstSelecionada
            ) {
                return;
            }

            setAuditoriaSnapshotPersistido({
                receberAuditoria:
                    formularioAuditoria.receberAuditoria ===
                    true,

                responsavelAuditoria:
                    textoSeguro(
                        formularioAuditoria.responsavelAuditoria
                    ),

                emailAuditoria:
                    textoSeguro(
                        formularioAuditoria.emailAuditoria
                    ),
            });

            setAuditoriaInteragida(
                false
            );

            setRetornoAuditoria(
                null
            );

            setAuditoriaEmEdicao(
                true
            );
        };

    const cancelarEdicaoAuditoria =
        () => {
            const formularioOriginal =
                auditoriaSnapshotPersistido
                ||
                criarFormularioAuditoria(
                    empresaSstSelecionada
                );

            setFormularioAuditoria({
                receberAuditoria:
                    formularioOriginal?.receberAuditoria ===
                    true,

                responsavelAuditoria:
                    textoSeguro(
                        formularioOriginal?.responsavelAuditoria
                    ),

                emailAuditoria:
                    textoSeguro(
                        formularioOriginal?.emailAuditoria
                    ),
            });

            setAuditoriaInteragida(
                false
            );

            setRetornoAuditoria(
                null
            );

            setAuditoriaEmEdicao(
                false
            );
        };

    const definirFormularioCanalSst =
        (
            canal,
            formulario
        ) => {
            const atualizar =
                obterAtualizadorFormularioCanalSst(
                    canal
                );

            atualizar(
                criarFormularioCanal(
                    formulario
                )
            );
        };

    const iniciarEdicaoCanalSst =
        (
            canal,
            formulario
        ) => {
            setCanaisSstSnapshotPersistido(
                (atual) => ({
                    ...atual,

                    [canal]:
                        criarFormularioCanal(
                            formulario
                        ),
                })
            );

            setCanaisSstEmEdicao(
                (atual) => ({
                    ...atual,

                    [canal]:
                        true,
                })
            );

            definirRetornoCanal(
                canal,
                null
            );
        };

    const cancelarEdicaoCanalSst =
        (canal) => {
            const snapshot =
                canaisSstSnapshotPersistido[
                    canal
                ];

            if (snapshot) {
                definirFormularioCanalSst(
                    canal,
                    snapshot
                );
            }

            setCanaisSstEmEdicao(
                (atual) => ({
                    ...atual,

                    [canal]:
                        false,
                })
            );

            definirRetornoCanal(
                canal,
                null
            );
        };

    const canalSstTemAlteracoes =
        (
            canal,
            formulario
        ) => {
            const snapshot =
                canaisSstSnapshotPersistido[
                    canal
                ];

            if (!snapshot) {
                return false;
            }

            return Boolean(
                (
                    formulario?.ativo ===
                    true
                ) !==
                (
                    snapshot?.ativo ===
                    true
                )
                ||
                textoSeguro(
                    formulario?.responsavel
                ) !==
                textoSeguro(
                    snapshot?.responsavel
                )
                ||
                textoSeguro(
                    formulario?.email
                ) !==
                textoSeguro(
                    snapshot?.email
                )
            );
        };

    const mensagemValidacaoCanal =
        (formulario) => {
            const email =
                textoSeguro(
                    formulario?.email
                );

            if (
                email
                &&
                !emailSstCanalEmpresaValido(
                    email
                )
            ) {
                return "Informe um e-mail válido.";
            }

            if (
                formulario?.ativo ===
                    true
                &&
                !email
            ) {
                return "Informe o e-mail destinatário para ativar as notificações.";
            }

            return "";
        };

    const mensagemValidacaoAuditoria =
        (() => {
            if (
                formularioAuditoria.receberAuditoria !==
                true
            ) {
                return "";
            }

            if (
                !textoSeguro(
                    formularioAuditoria.responsavelAuditoria
                )
            ) {
                return "Informe o responsável pela auditoria.";
            }

            const email =
                textoSeguro(
                    formularioAuditoria.emailAuditoria
                );

            if (!email) {
                return "Informe o e-mail da auditoria.";
            }

            if (
                !emailSstCanalEmpresaValido(
                    email
                )
            ) {
                return "Informe um e-mail de auditoria válido.";
            }

            return "";
        })();

    const auditoriaCamposObrigatoriosIncompletos =
        Boolean(
            formularioAuditoria.receberAuditoria ===
                true
            &&
            (
                !textoSeguro(
                    formularioAuditoria.responsavelAuditoria
                )
                ||
                !textoSeguro(
                    formularioAuditoria.emailAuditoria
                )
            )
        );

    const auditoriaLegadaIncompleta =
        Boolean(
            empresaSstSelecionada
            &&
            auditoriaCamposObrigatoriosIncompletos
            &&
            !auditoriaInteragida
        );

    const mostrarValidacaoAuditoria =
        Boolean(
            auditoriaInteragida
            &&
            mensagemValidacaoAuditoria
        );

    const auditoriaTemAlteracoes =
        Boolean(
            auditoriaSnapshotPersistido
            &&
            (
                (
                    formularioAuditoria.receberAuditoria ===
                    true
                ) !==
                (
                    auditoriaSnapshotPersistido.receberAuditoria ===
                    true
                )
                ||
                textoSeguro(
                    formularioAuditoria.responsavelAuditoria
                ) !==
                textoSeguro(
                    auditoriaSnapshotPersistido.responsavelAuditoria
                )
                ||
                textoSeguro(
                    formularioAuditoria.emailAuditoria
                ) !==
                textoSeguro(
                    auditoriaSnapshotPersistido.emailAuditoria
                )
            )
        );

    const auditoriaUltimaAtualizacao =
        formatarDataHoraAtualizacao(
            auditoriaAtualizadoEm
        );

    const persistirConfiguracaoCanalSst =
        (configuracao) =>
            salvarConfiguracaoEmailSstEmpresaTenant({
                tenantId,

                empresaId:
                    empresaSstSelecionada.id,

                supabaseClient:
                    supabaseClient
                    ||
                    undefined,

                ...configuracao,
            });

    const salvarCanalSst =
        async (
            canal
        ) => {
            if (
                !empresaSstSelecionada
            ) {
                definirRetornoCanal(
                    canal,
                    {
                        tipo:
                            "erro",

                        mensagem:
                            "Selecione uma empresa antes de salvar.",
                    }
                );

                return;
            }

            const formulario =
                canal ===
                    CANAIS_EMAIL_SST_EMPRESA.DOCUMENTOS
                    ? formularioDocumentos
                    : formularioTreinamentos;

            if (
                !canalSstTemAlteracoes(
                    canal,
                    formulario
                )
            ) {
                return;
            }

            const mensagemValidacao =
                mensagemValidacaoCanal(
                    formulario
                );

            if (
                mensagemValidacao
            ) {
                definirRetornoCanal(
                    canal,
                    {
                        tipo:
                            "erro",

                        mensagem:
                            mensagemValidacao,
                    }
                );

                return;
            }

            setSalvandoCanalSst(
                canal
            );

            definirRetornoCanal(
                canal,
                null
            );

            try {
                const configuracaoSalva =
                    await persistirConfiguracaoCanalSst({
                        canal,

                        ativo:
                            formulario.ativo ===
                            true,

                        responsavel:
                            formulario.responsavel,

                        email:
                            formulario.email,
                    });

                const formularioSalvo =
                    criarFormularioCanal(
                        configuracaoSalva
                    );

                if (
                    canal ===
                    CANAIS_EMAIL_SST_EMPRESA.DOCUMENTOS
                ) {
                    setFormularioDocumentos(
                        formularioSalvo
                    );
                }
                else {
                    setFormularioTreinamentos(
                        formularioSalvo
                    );
                }

                setCanaisSstSnapshotPersistido(
                    (atual) => ({
                        ...atual,

                        [canal]:
                            criarFormularioCanal(
                                formularioSalvo
                            ),
                    })
                );

                setCanaisSstEmEdicao(
                    (atual) => ({
                        ...atual,

                        [canal]:
                            false,
                    })
                );

                const dataHoraSalva =
                    formatarDataHoraAtualizacao(
                        formularioSalvo.atualizadoEm
                    );

                const mensagemSucesso =
                    canal ===
                    CANAIS_EMAIL_SST_EMPRESA.DOCUMENTOS
                        ? "Configuração de Documentos salva com sucesso."
                        : "Configuração de Treinamentos salva com sucesso.";

                definirRetornoCanal(
                    canal,
                    {
                        tipo:
                            "sucesso",

                        mensagem:
                            dataHoraSalva
                                ? (
                                    mensagemSucesso +
                                    " Salvo em " +
                                    dataHoraSalva
                                )
                                : mensagemSucesso,
                    }
                );
            }
            catch (erro) {
                definirRetornoCanal(
                    canal,
                    {
                        tipo:
                            "erro",

                        mensagem:
                            erro?.message
                            ||
                            "Não foi possível salvar a configuração do canal SST.",
                    }
                );
            }
            finally {
                setSalvandoCanalSst(
                    ""
                );
            }
        };

    const montarPayloadAuditoria =
        () => {
            if (
                !empresaSstSelecionada
            ) {
                return null;
            }

            const empresa =
                empresaSstSelecionada;

            return {
                id:
                    empresa.id,

                nome:
                    textoSeguro(
                        empresa.nome
                        ||
                        empresa.razao_social
                        ||
                        empresa.nome_fantasia
                    ),

                cnpj:
                    textoSeguro(
                        empresa.cnpj
                    ),

                responsavel:
                    textoSeguro(
                        empresa.responsavel
                    ),

                email:
                    textoSeguro(
                        empresa.email
                    ),

                telefone:
                    textoSeguro(
                        empresa.telefone
                    ),

                responsavelAuditoria:
                    textoSeguro(
                        formularioAuditoria.responsavelAuditoria
                    ),

                emailAuditoria:
                    textoSeguro(
                        formularioAuditoria.emailAuditoria
                    ),

                whatsappAuditoria:
                    textoSeguro(
                        empresa.whatsapp_auditoria
                        ||
                        empresa.whatsappAuditoria
                    ),

                receberAuditoria:
                    formularioAuditoria.receberAuditoria !==
                    false,

                tstResponsavel:
                    textoSeguro(
                        empresa.tst_responsavel
                        ||
                        empresa.tstResponsavel
                    ),

                tstEmail:
                    textoSeguro(
                        empresa.tst_email
                        ||
                        empresa.tstEmail
                    ),

                tstWhatsapp:
                    textoSeguro(
                        empresa.tst_whatsapp
                        ||
                        empresa.tstWhatsapp
                    ),

                status:
                    empresa.status
                    ||
                    "Ativa",

                tipoEmpresa:
                    empresa.tipo_empresa
                    ||
                    empresa.tipoEmpresa
                    ||
                    "Terceirizada",

                empresaPaiId:
                    empresa.empresa_pai_id
                    ||
                    empresa.empresaPaiId
                    ||
                    null,

                logo:
                    null,

                logoAtual:
                    empresa.logo_url
                    ||
                    empresa.logoAtual
                    ||
                    "",

                logoNomeAtual:
                    empresa.logo_nome
                    ||
                    empresa.logoNomeAtual
                    ||
                    "",

                contratoUrlAtual:
                    empresa.contrato_url
                    ||
                    empresa.contratoUrlAtual
                    ||
                    "",

                contratoNomeAtual:
                    empresa.contrato_nome
                    ||
                    empresa.contratoNomeAtual
                    ||
                    "",

                contratoArquivo:
                    null,

                numeroContrato:
                    textoSeguro(
                        empresa.numero_contrato
                        ||
                        empresa.numeroContrato
                    ),

                dataInicioContrato:
                    empresa.data_inicio_contrato
                    ||
                    empresa.dataInicioContrato
                    ||
                    null,

                dataFimContrato:
                    empresa.data_fim_contrato
                    ||
                    empresa.dataFimContrato
                    ||
                    null,

                responsavelContratante:
                    textoSeguro(
                        empresa.responsavel_contratante
                        ||
                        empresa.responsavelContratante
                    ),

                escopoServico:
                    textoSeguro(
                        empresa.escopo_servico
                        ||
                        empresa.escopoServico
                    ),

                observacaoStatus:
                    textoSeguro(
                        empresa.observacao_status
                        ||
                        empresa.observacaoStatus
                    ),
            };
        };

    const salvarAuditoriaEmpresa =
        async () => {
            if (
                !empresaSstSelecionada
            ) {
                setRetornoAuditoria({
                    tipo:
                        "erro",

                    mensagem:
                        "Selecione uma empresa antes de salvar.",
                });

                return;
            }

            if (
                !tenantId
            ) {
                setRetornoAuditoria({
                    tipo:
                        "erro",

                    mensagem:
                        "Tenant não identificado para salvar Auditoria.",
                });

                return;
            }

            if (
                mensagemValidacaoAuditoria
            ) {
                setRetornoAuditoria({
                    tipo:
                        "erro",

                    mensagem:
                        mensagemValidacaoAuditoria,
                });

                return;
            }

            if (
                !auditoriaTemAlteracoes
            ) {
                return;
            }

            setSalvandoCanalSst(
                CANAIS_EMAIL_SST_EMPRESA.AUDITORIA
            );

            setRetornoAuditoria(
                null
            );

            try {
                // R22_E3_D2B_AUDITORIA_CUTOVER
                const configuracaoSalva =
                    await persistirConfiguracaoCanalSst({
                        canal:
                            CANAIS_EMAIL_SST_EMPRESA.AUDITORIA,

                        ativo:
                            formularioAuditoria.receberAuditoria ===
                            true,

                        responsavel:
                            textoSeguro(
                                formularioAuditoria.responsavelAuditoria
                            ),

                        email:
                            textoSeguro(
                                formularioAuditoria.emailAuditoria
                            ),
                    });

                const formularioPersistido = {
                    receberAuditoria:
                        configuracaoSalva?.ativo ===
                        true,

                    responsavelAuditoria:
                        textoSeguro(
                            configuracaoSalva?.responsavel
                        ),

                    emailAuditoria:
                        textoSeguro(
                            configuracaoSalva?.email
                        ),
                };

                setFormularioAuditoria(
                    formularioPersistido
                );

                setAuditoriaSnapshotPersistido(
                    formularioPersistido
                );

                setAuditoriaInteragida(
                    false
                );

                setAuditoriaEmEdicao(
                    false
                );

                const atualizadoEm =
                    configuracaoSalva?.atualizadoEm
                    ||
                    configuracaoSalva?.atualizado_em
                    ||
                    null;

                setAuditoriaAtualizadoEm(
                    atualizadoEm
                );

                const dataHoraSalva =
                    formatarDataHoraAtualizacao(
                        atualizadoEm
                    );

                const mensagemSucesso =
                    "Configuração de Auditoria salva com sucesso.";

                setRetornoAuditoria({
                    tipo:
                        "sucesso",

                    mensagem:
                        dataHoraSalva
                            ? (
                                mensagemSucesso
                                +
                                " Salvo em "
                                +
                                dataHoraSalva
                            )
                            : mensagemSucesso,
                });
            }
            catch (erro) {
                setRetornoAuditoria({
                    tipo:
                        "erro",

                    mensagem:
                        erro?.message
                        ||
                        "Não foi possível salvar a configuração de Auditoria.",
                });
            }
            finally {
                setSalvandoCanalSst(
                    ""
                );
            }
        };

    const renderizarRetorno =
        (retorno = null) =>
            retorno ? (
                <div
                    className={
                        retorno.tipo ===
                        "sucesso"
                            ? "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"
                            : "rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800"
                    }
                >
                    {retorno.mensagem}
                </div>
            ) : null;

    const renderizarModelosLeitura =
        (
            titulo,
            tiposPermitidos
        ) => (
            <details className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                    {titulo}
                </summary>

                <div className="border-t border-slate-100 p-3">
                    <ModelosEmailSstConfiguracoes
                        supabase={supabaseClient}
                        podeAlterar={false}
                        tiposPermitidos={
                            tiposPermitidos
                        }
                        mensagemBloqueio={
                            "Somente leitura nesta etapa. Os modelos podem ser revisados, mas não alterados."
                        }
                    />
                </div>
            </details>
        );

    const renderizarCanalEmpresa =
        ({
            canal,
            titulo,
            descricao,
            formulario,
            tiposPermitidos,
        }) => {
            const mensagemValidacao =
                mensagemValidacaoCanal(
                    formulario
                );

            const salvando =
                salvandoCanalSst ===
                canal;

            const retorno =
                retornoCanalSst[
                    canal
                ] || null;

            const ultimaAtualizacao =
                formatarDataHoraAtualizacao(
                    formulario?.atualizadoEm
                );

            const canalEmEdicao =
                canaisSstEmEdicao[
                    canal
                ] ===
                true;

            const canalTemAlteracoes =
                canalSstTemAlteracoes(
                    canal,
                    formulario
                );

            return (
                <article className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.08em] text-emerald-700">
                                {titulo}
                            </p>

                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                {descricao}
                            </p>
                        </div>

                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700">
                            <input
                                type="checkbox"
                                checked={
                                    formulario.ativo ===
                                    true
                                }
                                onChange={(
                                    evento
                                ) =>
                                    atualizarCampoCanal(
                                        canal,
                                        "ativo",
                                        evento.target.checked
                                    )
                                }
                                disabled={
                                    !canalEmEdicao
                                }
                                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                            />

                            Ativar notificações
                        </label>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <label className="block">
                            <span className="text-xs font-semibold text-slate-600">
                                Responsável
                            </span>

                            <input
                                type="text"
                                value={
                                    formulario.responsavel
                                }
                                onChange={(
                                    evento
                                ) =>
                                    atualizarCampoCanal(
                                        canal,
                                        "responsavel",
                                        evento.target.value
                                    )
                                }
                                disabled={
                                    !canalEmEdicao
                                }
                                placeholder="Nome do responsável"
                                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-700"
                            />
                        </label>

                        <label className="block">
                            <span className="text-xs font-semibold text-slate-600">
                                E-mail
                            </span>

                            <input
                                type="email"
                                value={
                                    formulario.email
                                }
                                onChange={(
                                    evento
                                ) =>
                                    atualizarCampoCanal(
                                        canal,
                                        "email",
                                        evento.target.value
                                    )
                                }
                                disabled={
                                    !canalEmEdicao
                                }
                                aria-invalid={
                                    Boolean(
                                        textoSeguro(
                                            formulario.email
                                        )
                                        &&
                                        !emailSstCanalEmpresaValido(
                                            formulario.email
                                        )
                                    )
                                }
                                placeholder="responsavel@empresa.com.br"
                                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-700"
                            />

                            {mensagemValidacao ? (
                                <span className="mt-2 block text-xs font-bold text-rose-700">
                                    {mensagemValidacao}
                                </span>
                            ) : null}
                        </label>
                    </div>

                    {/* R22_E3_C4_UX_POSICAO_BOTOES_SALVAR */}
                    {/* R22_E3_C5E_PADRAO_EDICAO_CANAIS_SST_UI */}
                    <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
                        {ultimaAtualizacao ? (
                            <p className="mr-auto text-xs font-semibold text-slate-500">
                                Última atualização:{" "}
                                <span className="font-bold text-slate-700">
                                    {ultimaAtualizacao}
                                </span>
                            </p>
                        ) : null}

                        {canalEmEdicao ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() =>
                                        cancelarEdicaoCanalSst(
                                            canal
                                        )
                                    }
                                    disabled={
                                        salvando
                                    }
                                    className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        salvarCanalSst(
                                            canal
                                        )
                                    }
                                    disabled={
                                        carregandoCanaisSst
                                        ||
                                        salvando
                                        ||
                                        !canalTemAlteracoes
                                        ||
                                        Boolean(
                                            mensagemValidacao
                                        )
                                    }
                                    className="inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {salvando
                                        ? "Salvando..."
                                        : "Salvar alterações"}
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() =>
                                    iniciarEdicaoCanalSst(
                                        canal,
                                        formulario
                                    )
                                }
                                disabled={
                                    carregandoCanaisSst
                                    ||
                                    salvando
                                }
                                className="inline-flex shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-black text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Editar destinatário
                            </button>
                        )}
                    </div>

                    <div className="mt-3">
                        {renderizarRetorno(
                            retorno
                        )}
                    </div>

                    <div className="mt-3">
                        {renderizarModelosLeitura(
                            "Rever modelos de " +
                                titulo,
                            tiposPermitidos
                        )}
                    </div>
                </article>
            );
        };

    return (
        <div className="mx-auto w-full max-w-[1480px] space-y-5 px-4 pb-8 pt-1 sm:px-6">
            <section className="relative overflow-hidden rounded-[28px] border border-slate-800/10 bg-slate-950 shadow-sm">
                <img
                    src={dashboardHeroBackground}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-45"
                />

                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/30" />

                <div className="relative px-6 py-7 sm:px-8">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
                                SafeScan Brasil
                            </p>

                            <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                                Configurações da conta
                            </h1>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
                                Consulte as informações do seu ambiente, empresas vinculadas e recursos disponíveis no contrato.
                            </p>
                        </div>

                        <div className="inline-flex max-w-full items-center gap-2 self-start rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm lg:self-auto">
                            <Globe2 className="h-4 w-4 shrink-0 text-emerald-300" />

                            <span className="truncate">
                                {hostnameAtual}
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />

                    <div>
                        <h2 className="text-sm font-bold text-emerald-950">
                            Ambiente protegido por tenant
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-emerald-900/75">
                            Esta tela exibe somente informações do seu ambiente. Configurações técnicas globais da plataforma permanecem restritas à administração SafeScan.
                        </p>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <CartaoResumo
                    icone={Building2}
                    titulo="Conta"
                    valor={tenantNome}
                    descricao={`Identificador: ${tenantSlug}`}
                />

                <CartaoResumo
                    icone={UserRound}
                    titulo="Perfil de acesso"
                    valor={perfilUsuario}
                    descricao={`${nomeUsuario} • ${emailUsuario}`}
                />

                <CartaoResumo
                    icone={Building2}
                    titulo="Empresas"
                    valor={String(empresas.length)}
                    descricao="Empresas disponíveis neste ambiente"
                />

                <CartaoResumo
                    icone={Blocks}
                    titulo="Módulos disponíveis"
                    valor={String(modulosDisponiveis.length)}
                    descricao="Núcleo e recursos contratados"
                />
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.05fr_1fr]">
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                            <Globe2 className="h-5 w-5" />
                        </span>

                        <div>
                            <h2 className="text-base font-bold text-slate-950">
                                Ambiente
                            </h2>

                            <p className="text-xs text-slate-500">
                                Identificação do ambiente contratado.
                            </p>
                        </div>
                    </div>

                    <dl className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-100">
                        <div className="grid gap-1 px-4 py-3 sm:grid-cols-[150px_1fr] sm:items-center">
                            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                Cliente
                            </dt>

                            <dd className="text-sm font-semibold text-slate-900">
                                {tenantNome}
                            </dd>
                        </div>

                        <div className="grid gap-1 px-4 py-3 sm:grid-cols-[150px_1fr] sm:items-center">
                            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                Host atual
                            </dt>

                            <dd className="break-all text-sm text-slate-700">
                                {hostnameAtual}
                            </dd>
                        </div>

                        <div className="grid gap-1 px-4 py-3 sm:grid-cols-[150px_1fr] sm:items-center">
                            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                Domínio principal
                            </dt>

                            <dd className="break-all text-sm text-slate-700">
                                {dominioPrincipal}
                            </dd>
                        </div>
                    </dl>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                            <UserRound className="h-5 w-5" />
                        </span>

                        <div>
                            <h2 className="text-base font-bold text-slate-950">
                                Acesso atual
                            </h2>

                            <p className="text-xs text-slate-500">
                                Identidade e perfil reconhecidos neste tenant.
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <div className="flex items-start gap-3">
                            <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" />

                            <div className="min-w-0">
                                <p className="font-bold text-slate-950">
                                    {nomeUsuario}
                                </p>

                                <p className="mt-1 break-all text-sm text-slate-600">
                                    {emailUsuario}
                                </p>

                                <span className="mt-3 inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800">
                                    {perfilUsuario}
                                </span>
                            </div>
                        </div>
                    </div>
                </article>
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-bold text-slate-950">
                                Empresas vinculadas
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                Empresas já disponíveis para este ambiente.
                            </p>
                        </div>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                            {empresas.length}
                        </span>
                    </div>

                    <div className="mt-4 space-y-2">
                        {empresas.length > 0 ? (
                            empresas.map(
                                (empresa, indice) => (
                                    <div
                                        key={
                                            textoSeguro(
                                                empresa?.id
                                            )
                                            || `${nomeEmpresa(empresa)}-${indice}`
                                        }
                                        className="flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-3"
                                    >
                                        <Building2 className="h-4 w-4 shrink-0 text-slate-500" />

                                        <span className="min-w-0 truncate text-sm font-semibold text-slate-800">
                                            {nomeEmpresa(empresa)}
                                        </span>
                                    </div>
                                )
                            )
                        ) : (
                            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                                Nenhuma empresa vinculada foi disponibilizada neste ambiente.
                            </div>
                        )}
                    </div>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-bold text-slate-950">
                                Recursos disponíveis
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                Núcleo SafeScan e módulos contratados para esta conta.
                            </p>
                        </div>

                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                            {modulosDisponiveis.length}
                        </span>
                    </div>

                    <div className="mt-4 space-y-2">
                        {modulosDisponiveis.length > 0 ? (
                            modulosDisponiveis.map(
                                (modulo) => (
                                    <div
                                        key={textoSeguro(modulo?.chave)}
                                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <Blocks className="h-4 w-4 shrink-0 text-emerald-700" />

                                            <span className="truncate text-sm font-semibold text-slate-800">
                                                {
                                                    textoSeguro(modulo?.nome)
                                                    || textoSeguro(modulo?.chave)
                                                }
                                            </span>
                                        </div>

                                        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                                            {descricaoModulo(modulo)}
                                        </span>
                                    </div>
                                )
                            )
                        ) : (
                            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                                Nenhum módulo disponível foi informado pelo runtime.
                            </div>
                        )}
                    </div>
                </article>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-bold text-slate-950">
                                Recursos do Plano Base
                            </h2>

                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
                                Incluso no plano
                            </span>
                        </div>

                        <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
                            Controle operacional dos recursos incluídos no Plano Base. Desativar um recurso não exclui seus dados.
                        </p>
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        {
                            podeAlterarRecursosOperacionais
                                ? "Administrador"
                                : "Somente leitura"
                        }
                    </span>
                </div>

                {carregandoRecursosOperacionais ? (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-600">
                        Carregando recursos do Plano Base...
                    </div>
                ) : (
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        {recursosOperacionais.map(
                            (recurso) => {
                                const salvando =
                                    salvandoRecursoOperacional ===
                                    recurso.chave;

                                const bloqueado =
                                    !podeAlterarRecursosOperacionais
                                    ||
                                    Boolean(
                                        salvandoRecursoOperacional
                                    );

                                return (
                                    <article
                                        key={recurso.chave}
                                        className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-4"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-bold text-slate-900">
                                                    {recurso.nome}
                                                </p>

                                                <span
                                                    className={
                                                        recurso.ativo
                                                            ? "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700"
                                                            : "rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-600"
                                                    }
                                                >
                                                    {
                                                        salvando
                                                            ? "Salvando..."
                                                            : (
                                                                recurso.ativo
                                                                    ? "Ativo"
                                                                    : "Desativado"
                                                            )
                                                    }
                                                </span>
                                            </div>

                                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                                {recurso.descricao}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={
                                                recurso.ativo
                                            }
                                            aria-label={
                                                (
                                                    recurso.ativo
                                                        ? "Desativar "
                                                        : "Ativar "
                                                ) +
                                                recurso.nome
                                            }
                                            disabled={
                                                bloqueado
                                            }
                                            onClick={() =>
                                                alterarRecursoOperacional(
                                                    recurso.chave,
                                                    !recurso.ativo
                                                )
                                            }
                                            className={
                                                "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition " +
                                                (
                                                    recurso.ativo
                                                        ? "bg-emerald-600"
                                                        : "bg-slate-300"
                                                ) +
                                                (
                                                    bloqueado
                                                        ? " cursor-not-allowed opacity-60"
                                                        : " cursor-pointer"
                                                )
                                            }
                                        >
                                            <span
                                                aria-hidden="true"
                                                className={
                                                    "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform " +
                                                    (
                                                        recurso.ativo
                                                            ? "translate-x-6"
                                                            : "translate-x-1"
                                                    )
                                                }
                                            />
                                        </button>
                                    </article>
                                );
                            }
                        )}
                    </div>
                )}

                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
                    <p className="text-xs font-semibold leading-5 text-blue-800">
                        Sem configuração específica, o recurso permanece ativo por compatibilidade. A desativação preserva os dados existentes e pode ser revertida posteriormente.
                    </p>
                </div>

                {retornoRecursosOperacionais ? (
                    <div
                        role="status"
                        className={
                            "mt-3 rounded-xl border px-4 py-3 text-xs font-bold " +
                            (
                                retornoRecursosOperacionais.tipo ===
                                    "sucesso"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                    : "border-rose-200 bg-rose-50 text-rose-800"
                            )
                        }
                    >
                        {
                            retornoRecursosOperacionais.mensagem
                        }
                    </div>
                ) : null}

                {!podeAlterarRecursosOperacionais ? (
                    <p className="mt-3 text-xs font-semibold text-slate-500">
                        Somente o perfil Administrador deste ambiente pode alterar os recursos operacionais do Plano Base.
                    </p>
                ) : null}
            </section>

            {(
                sstDisponivel
                ||
                certidaoMensalDisponivel
            ) ? (
                <section
                    id="config-certidao-mensal-email-tenant"
                    className="scroll-mt-24"
                >
                    <details
                        name="configuracoes-tenant"
                        className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                    <Blocks className="h-5 w-5" />
                                </span>

                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-sm font-bold text-slate-950 sm:text-base">
                                            Notificação de pendências documentais
                                        </h2>

                                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
                                            Tenant isolado
                                        </span>
                                    </div>

                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                        Configurações independentes conforme os módulos contratados.
                                    </p>
                                </div>
                            </div>

                            <ChevronDown
                                aria-hidden="true"
                                className="h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-180"
                            />
                        </summary>

                        <div className="space-y-3 border-t border-slate-100 bg-slate-50/40 p-3 sm:p-4">
                            {sstDisponivel ? (
                                <details
                                    name="configuracoes-email-tipo"
                                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                                >
                                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                                <ShieldCheck className="h-5 w-5" />
                                            </span>

                                            <div className="min-w-0">
                                                <h3 className="text-sm font-bold text-slate-950 sm:text-base">
                                                    SST
                                                </h3>

                                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                                    Somente os canais dos módulos contratados.
                                                </p>
                                            </div>
                                        </div>

                                        <ChevronDown
                                            aria-hidden="true"
                                            className="h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-180"
                                        />
                                    </summary>

                                    <div className="space-y-4 border-t border-slate-100 bg-white p-3 sm:p-4">
                                        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                                <label
                                                    htmlFor="configuracao-sst-empresa"
                                                    className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500"
                                                >
                                                    Configuração aplicada
                                                </label>

                                                <select
                                                    id="configuracao-sst-empresa"
                                                    value={
                                                        empresaSstSelecionadaId
                                                    }
                                                    onChange={(
                                                        evento
                                                    ) => {
                                                        void selecionarEmpresaSst(
                                                            evento.target.value
                                                        );
                                                    }}
                                                    className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                                                >
                                                    <option value="">
                                                        Configuração geral
                                                    </option>

                                                    {empresas
                                                        .filter(
                                                            (empresa) =>
                                                                Boolean(
                                                                    textoSeguro(
                                                                        empresa?.id
                                                                    )
                                                                )
                                                        )
                                                        .map(
                                                            (empresa) => {
                                                                const cnpj =
                                                                    textoSeguro(
                                                                        empresa?.cnpj
                                                                    );

                                                                return (
                                                                    <option
                                                                        key={
                                                                            empresa.id
                                                                        }
                                                                        value={
                                                                            empresa.id
                                                                        }
                                                                    >
                                                                        {nomeEmpresa(
                                                                            empresa
                                                                        )}
                                                                        {cnpj
                                                                            ? " — " +
                                                                                cnpj
                                                                            : ""}
                                                                    </option>
                                                                );
                                                            }
                                                        )}
                                                </select>

                                                <p className="mt-2 text-xs leading-5 text-slate-500">
                                                    Selecione uma empresa para configurar cada canal separadamente.
                                                </p>

                                                {carregandoCanaisSst ? (
                                                    <p className="mt-2 text-xs font-semibold text-emerald-700">
                                                        Carregando configurações da empresa...
                                                    </p>
                                                ) : null}

                                                {retornoCanalSst.GERAL ? (
                                                    <div className="mt-3">
                                                        {renderizarRetorno(
                                                            retornoCanalSst.GERAL
                                                        )}
                                                    </div>
                                                ) : null}
                                            </div>

                                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                                {empresaSstSelecionada ? (
                                                    <div className="flex items-start gap-3">
                                                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                                            <Building2 className="h-5 w-5" />
                                                        </span>

                                                        <div className="min-w-0">
                                                            <p className="text-[11px] font-black uppercase tracking-[0.08em] text-emerald-700">
                                                                Empresa em configuração
                                                            </p>

                                                            <h4 className="mt-1 break-words text-base font-black text-slate-950">
                                                                {nomeEmpresa(
                                                                    empresaSstSelecionada
                                                                )}
                                                            </h4>

                                                            <p className="mt-1 text-xs text-slate-500">
                                                                {empresaSstCnpj
                                                                    ||
                                                                    "CNPJ não informado"}
                                                            </p>

                                                            <p className="mt-2 text-xs leading-5 text-slate-500">
                                                                Cada módulo abaixo possui destinatário e ativação independentes.
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-start gap-3">
                                                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                                            <BadgeCheck className="h-5 w-5" />
                                                        </span>

                                                        <div>
                                                            <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                                                                Modelos padrão
                                                            </p>

                                                            <h4 className="mt-1 text-base font-black text-slate-950">
                                                                Configuração geral
                                                            </h4>

                                                            <p className="mt-2 text-xs leading-5 text-slate-500">
                                                                Somente os modelos dos módulos contratados ficam disponíveis para revisão.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {empresaSstSelecionada ? (
                                            <div className="space-y-4">
                                                {documentosDisponivel
                                                    ? renderizarCanalEmpresa({
                                                        canal:
                                                            CANAIS_EMAIL_SST_EMPRESA.DOCUMENTOS,

                                                        titulo:
                                                            "Documentos",

                                                        descricao:
                                                            "Gestão documental SST.",

                                                        formulario:
                                                            formularioDocumentos,

                                                        tiposPermitidos:
                                                            TIPOS_MODELO_DOCUMENTOS,
                                                    })
                                                    : null}

                                                {treinamentosDisponivel
                                                    ? renderizarCanalEmpresa({
                                                        canal:
                                                            CANAIS_EMAIL_SST_EMPRESA.TREINAMENTOS,

                                                        titulo:
                                                            "Treinamentos",

                                                        descricao:
                                                            "Alertas de treinamentos e certificados.",

                                                        formulario:
                                                            formularioTreinamentos,

                                                        tiposPermitidos:
                                                            TIPOS_MODELO_TREINAMENTOS,
                                                    })
                                                    : null}

                                                {auditoriaDisponivel ? (
                                                    <article className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                                            <div>
                                                                <p className="text-[11px] font-black uppercase tracking-[0.08em] text-blue-700">
                                                                    Auditoria
                                                                </p>

                                                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                                                    Alertas de auditorias, desvios e tratativas.
                                                                </p>
                                                            </div>

                                                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-bold text-slate-700">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={
                                                                        formularioAuditoria.receberAuditoria
                                                                    }
                                                                    onChange={(
                                                                        evento
                                                                    ) =>
                                                                        atualizarCampoAuditoria(
                                                                            "receberAuditoria",
                                                                            evento.target.checked
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        !auditoriaEmEdicao
                                                                    }
                                                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                                                                />

                                                                Receber auditorias
                                                            </label>
                                                        </div>

                                                        {auditoriaLegadaIncompleta ? (
                                                            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
                                                                <p className="font-black">
                                                                    Configuração legada
                                                                </p>

                                                                <p className="mt-1">
                                                                    O recebimento de auditorias está habilitado, mas ainda não há responsável e e-mail específicos cadastrados.
                                                                </p>
                                                            </div>
                                                        ) : null}

                                                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                                            <label className="block">
                                                                <span className="text-xs font-semibold text-slate-600">
                                                                    Responsável
                                                                </span>

                                                                <input
                                                                    type="text"
                                                                    value={
                                                                        formularioAuditoria.responsavelAuditoria
                                                                    }
                                                                    onChange={(
                                                                        evento
                                                                    ) =>
                                                                        atualizarCampoAuditoria(
                                                                            "responsavelAuditoria",
                                                                            evento.target.value
                                                                        )
                                                                    }
                                                                    placeholder="Nome do responsável pela auditoria"
                                                                    disabled={
                                                                        !auditoriaEmEdicao
                                                                    }
                                                                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-700"
                                                                />
                                                            </label>

                                                            <label className="block">
                                                                <span className="text-xs font-semibold text-slate-600">
                                                                    E-mail
                                                                </span>

                                                                <input
                                                                    type="email"
                                                                    value={
                                                                        formularioAuditoria.emailAuditoria
                                                                    }
                                                                    onChange={(
                                                                        evento
                                                                    ) =>
                                                                        atualizarCampoAuditoria(
                                                                            "emailAuditoria",
                                                                            evento.target.value
                                                                        )
                                                                    }
                                                                    aria-invalid={
                                                                        Boolean(
                                                                            formularioAuditoria.emailAuditoria
                                                                            &&
                                                                            !emailSstCanalEmpresaValido(
                                                                                formularioAuditoria.emailAuditoria
                                                                            )
                                                                        )
                                                                    }
                                                                    placeholder="auditoria@empresa.com.br"
                                                                    disabled={
                                                                        !auditoriaEmEdicao
                                                                    }
                                                                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-700"
                                                                />

                                                                {mostrarValidacaoAuditoria ? (
                                                                    <span className="mt-2 block text-xs font-bold text-rose-700">
                                                                        {mensagemValidacaoAuditoria}
                                                                    </span>
                                                                ) : null}
                                                            </label>
                                                        </div>

                                                        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
                                                            {auditoriaUltimaAtualizacao ? (
                                                                <p className="mr-auto text-xs font-semibold text-slate-500">
                                                                    Última atualização:{" "}
                                                                    <span className="font-bold text-slate-700">
                                                                        {auditoriaUltimaAtualizacao}
                                                                    </span>
                                                                </p>
                                                            ) : null}

                                                            {auditoriaEmEdicao ? (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={
                                                                            cancelarEdicaoAuditoria
                                                                        }
                                                                        disabled={
                                                                            salvandoCanalSst ===
                                                                            "AUDITORIA"
                                                                        }
                                                                        className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                                    >
                                                                        Cancelar
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={
                                                                            salvarAuditoriaEmpresa
                                                                        }
                                                                        disabled={
                                                                            salvandoCanalSst ===
                                                                                "AUDITORIA"
                                                                            ||
                                                                            !auditoriaTemAlteracoes
                                                                            ||
                                                                            Boolean(
                                                                                mensagemValidacaoAuditoria
                                                                            )
                                                                            ||
                                                                            typeof onAtualizarEmpresa !==
                                                                                "function"
                                                                        }
                                                                        className="inline-flex shrink-0 items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                                    >
                                                                        {salvandoCanalSst ===
                                                                            "AUDITORIA"
                                                                            ? "Salvando..."
                                                                            : "Salvar alterações"}
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={
                                                                        iniciarEdicaoAuditoria
                                                                    }
                                                                    disabled={
                                                                        !empresaSstSelecionada
                                                                        ||
                                                                        typeof onAtualizarEmpresa !==
                                                                            "function"
                                                                    }
                                                                    className="inline-flex shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-black text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                                >
                                                                    Editar destinatário
                                                                </button>
                                                            )}
                                                        </div>

                                                        <div className="mt-3">
                                                            {renderizarRetorno(
                                                                retornoAuditoria
                                                            )}
                                                        </div>

                                                        <div className="mt-3">
                                                            {renderizarModelosLeitura(
                                                                "Rever modelo de Auditoria",
                                                                TIPOS_MODELO_AUDITORIA
                                                            )}
                                                        </div>
                                                    </article>
                                                ) : null}
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {documentosDisponivel
                                                    ? renderizarModelosLeitura(
                                                        "Modelos de Documentos",
                                                        TIPOS_MODELO_DOCUMENTOS
                                                    )
                                                    : null}

                                                {treinamentosDisponivel
                                                    ? renderizarModelosLeitura(
                                                        "Modelo de Treinamentos",
                                                        TIPOS_MODELO_TREINAMENTOS
                                                    )
                                                    : null}

                                                {auditoriaDisponivel
                                                    ? renderizarModelosLeitura(
                                                        "Modelo de Auditoria",
                                                        TIPOS_MODELO_AUDITORIA
                                                    )
                                                    : null}
                                            </div>
                                        )}
                                    </div>
                                </details>
                            ) : null}

                            {certidaoMensalDisponivel ? (
                                <details
                                    name="configuracoes-email-tipo"
                                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                                >
                                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                                                <Building2 className="h-5 w-5" />
                                            </span>

                                            <div className="min-w-0">
                                                <h3 className="text-sm font-bold text-slate-950 sm:text-base">
                                                    Financeiro
                                                </h3>

                                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                                    Certidão Mensal.
                                                </p>
                                            </div>
                                        </div>

                                        <ChevronDown
                                            aria-hidden="true"
                                            className="h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 group-open:rotate-180"
                                        />
                                    </summary>

                                    <div className="border-t border-slate-100 bg-white p-3 sm:p-4">
                                        <CertidaoMensalEmailConfiguracoes
                                            tenantId={tenantId}
                                            exibirCabecalho={false}
                                            empresasBanco={empresasBanco}
                                            podeAlterar={
                                                podeAlterarCertidaoMensal
                                            }
                                            mensagemBloqueio={
                                                "Somente o perfil Administrador deste ambiente pode alterar as configurações operacionais das Certidões Mensais."
                                            }
                                        />
                                    </div>
                                </details>
                            ) : null}
                        </div>
                    </details>
                </section>
            ) : null}

            <section className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex items-start gap-3">
                    <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" />

                    <div>
                        <h2 className="text-sm font-bold text-slate-900">
                            Configurações técnicas protegidas
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-slate-600">
                            Limites globais, tokens, auditoria de sistema, Storage administrativo, provedores de e-mail, aparência global e manutenção da infraestrutura são administrados exclusivamente pela Conta Mestre SafeScan.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}