import { useEffect, useMemo, useState } from "react";
import { Header } from "../../../components/commonComponents";
import { obterUrlLogoEmpresa } from "../../../services/supabaseServices";
import "../../../styles/pages/certidao-mensal-documental.css";
import "../../../styles/pages/certidao-mensal-pdf-laboratorio.css";
import { CertidaoMensalHero } from "../components/CertidaoMensalHero";
import { CertidaoMensalResumo } from "../components/CertidaoMensalResumo";
import { EmpresasFiscalizadasPanel } from "../components/EmpresasFiscalizadasPanel";
import { CompetenciaDocumentalPanel } from "../components/CompetenciaDocumentalPanel";
import { PerfilDocumentalConfigModal } from "../components/PerfilDocumentalConfigModal";
import { EvidenciaConferenciaPanel } from "../components/EvidenciaConferenciaPanel";
import { CertidaoPdfLaboratorioModal } from "../components/CertidaoPdfLaboratorioModal";
import { useCertidaoPdfLaboratorio } from "../hooks/useCertidaoPdfLaboratorio";
import { useCertidaoMensalCiclo } from "../hooks/useCertidaoMensalCiclo.js";
import {
    CERTIDAO_MENSAL_DOCUMENTOS,
    CERTIDAO_MENSAL_POLITICA_DOCUMENTAL,
    resolverDocumentoNaCompetencia,
} from "../domain/certidaoMensalRegraCompetencia.js";
import {
    classificarCompetenciaVigenciaContratual,
} from "../domain/certidaoMensalVigenciaContratual.js";
import {
    montarPerfilDocumentalCompetencia,
} from "../domain/certidaoMensalPerfilDocumental.js";
import {
    obterDataReferenciaCertidaoMensal,
} from "../domain/certidaoMensalPersistenceContract.js";
import {
    executarPreAvaliacaoDocumental,
} from "../analysis/certidaoDocumentPreAssessment.js";
import {
    listarRegrasPerfilDocumentalCertidaoMensal,
    salvarRegraPerfilDocumentalCertidaoMensal,
} from "../services/certidaoMensalPerfilDocumentalService.js";
import {
    buscarDocumentoAtualCertidaoMensal,
    criarUrlAssinadaPdfCertidaoMensal,
} from "../services/certidaoMensalDocumentPersistenceService";
import {
    buscarAplicabilidadeEsocialCertidaoMensal,
    definirAplicabilidadeEsocialCertidaoMensal,
} from "../services/certidaoMensalAplicabilidadeService.js";
import {
    registrarDecisaoDocumentoCertidaoMensal,
} from "../services/certidaoMensalConferenciaService.js";
import {
    DOCUMENTOS_CERTIDAO_MENSAL_BASE,
    obterCompetenciaAtual,
} from "../constants/certidaoMensalConstants";
import {
    montarEvidenciasInternasCertidaoMensal,
    recalcularEvidenciaOcupacionalComSnapshotMaoDeObra,
} from "../services/certidaoMensalInternalEvidenceService.js";
import {
    listarMovimentacoesEmpresa,
} from "../../../services/colaboradoresMovimentacoesService.js";
import {
    listarCnpjsEmpresa,
} from "../../../services/empresaCnpjsService.js";

import {
    criarSnapshotMaoDeObraAPartirDaEvidenciaInterna,
} from "../services/certidaoMensalWorkforceSnapshotController.js";
import {
    criarSnapshotMaoDeObraCertidaoMensal,
} from "../services/certidaoMensalWorkforceSnapshotService.js";
import {
    criarSnapshotAsoPcmsoAPartirDaEvidenciaInterna,
    montarItensAutomaticosCertidaoMensal,
} from "../services/certidaoMensalAutomaticItemsService.js";

const CICLO_ANUAL_REMOTO_HABILITADO =
    true;

const PERFIL_DOCUMENTAL_REMOTO_HABILITADO =
    true;

const PERFIL_DOCUMENTAL_PERSISTENCIA_HABILITADA =
    true;

export function CertidaoMensalDocumentalPage({
    supabase = null,
    empresasBanco = [],
    colaboradores = [],
    documentosEmpresas = [],
    obrasEmpresasBanco = [],
    usuario = null,
}) {
    const [competencia, setCompetencia] = useState(() => obterCompetenciaAtual());

    const [perfilDocumentalConfigAberto, setPerfilDocumentalConfigAberto] = useState(false);

    const [
        perfilDocumentalEmpresasEstado,
        setPerfilDocumentalEmpresasEstado,
    ] = useState(() => ({
        regrasPorEmpresa: {},
        carregando: false,
        erro: "",
    }));

    useEffect(() => {
        let efeitoAtivo =
            true;

        const normalizarTipoEmpresa =
            (valor = "") =>
                String(valor)
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase();

        const empresaIds =
            [
                ...new Set(
                    (
                        Array.isArray(empresasBanco)
                            ? empresasBanco
                            : []
                    )
                        .filter(
                            (empresa) =>
                                empresa?.id &&
                                empresa?.nome &&
                                !normalizarTipoEmpresa(
                                    empresa?.tipo_empresa ||
                                    empresa?.tipoEmpresa ||
                                    "",
                                ).includes(
                                    "contratante",
                                ),
                        )
                        .map(
                            (empresa) =>
                                String(
                                    empresa.id,
                                ).trim(),
                        )
                        .filter(Boolean),
                ),
            ];

        if (
            !PERFIL_DOCUMENTAL_REMOTO_HABILITADO ||
            !empresaIds.length ||
            !supabase ||
            typeof supabase.from !== "function"
        ) {
            setPerfilDocumentalEmpresasEstado({
                regrasPorEmpresa: {},
                carregando: false,
                erro: "",
            });

            return () => {
                efeitoAtivo =
                    false;
            };
        }

        setPerfilDocumentalEmpresasEstado(
            (estadoAtual) => ({
                ...estadoAtual,
                carregando: true,
                erro: "",
            }),
        );

        async function carregarPerfisEmpresas() {
            try {
                const registros =
                    [];

                const tamanhoLote =
                    40;

                for (
                    let indice = 0;
                    indice < empresaIds.length;
                    indice += tamanhoLote
                ) {
                    const lote =
                        empresaIds.slice(
                            indice,
                            indice + tamanhoLote,
                        );

                    const {
                        data,
                        error,
                    } =
                        await supabase
                            .from(
                                "certidao_mensal_perfil_documental_regras",
                            )
                            .select(
                                "id, empresa_id, tipo_documento, exigido, competencia_inicio, motivo, criado_em, atualizado_em",
                            )
                            .in(
                                "empresa_id",
                                lote,
                            )
                            .order(
                                "competencia_inicio",
                                {
                                    ascending: true,
                                },
                            );

                    if (error) {
                        throw error;
                    }

                    registros.push(
                        ...(
                            Array.isArray(data)
                                ? data
                                : []
                        ),
                    );
                }

                if (!efeitoAtivo) {
                    return;
                }

                const regrasPorEmpresa =
                    {};

                for (const regra of registros) {
                    const empresaId =
                        String(
                            regra?.empresa_id ||
                            regra?.empresaId ||
                            "",
                        ).trim();

                    if (!empresaId) {
                        continue;
                    }

                    if (
                        !Array.isArray(
                            regrasPorEmpresa[empresaId],
                        )
                    ) {
                        regrasPorEmpresa[empresaId] =
                            [];
                    }

                    regrasPorEmpresa[empresaId].push(
                        regra,
                    );
                }

                setPerfilDocumentalEmpresasEstado({
                    regrasPorEmpresa,
                    carregando: false,
                    erro: "",
                });
            }
            catch (erro) {
                if (!efeitoAtivo) {
                    return;
                }

                setPerfilDocumentalEmpresasEstado({
                    regrasPorEmpresa: {},
                    carregando: false,
                    erro:
                        erro?.message ||
                        "Não foi possível carregar os perfis documentais das empresas.",
                });
            }
        }

        carregarPerfisEmpresas();

        return () => {
            efeitoAtivo =
                false;
        };
    }, [
        empresasBanco,
        supabase,
    ]);

    const empresas = useMemo(() => {
        const normalizarTipo = (valor = "") => String(valor)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
        const baseCompleta = (Array.isArray(empresasBanco) ? empresasBanco : [])
            .filter((empresa) => empresa?.id && empresa?.nome);
        const base = baseCompleta
            .filter((empresa) => !normalizarTipo(empresa.tipo_empresa).includes("contratante"))
            .map((empresa) => {
                const empresaNormalizada = {
                    id: empresa.id,
                    nome: empresa.nome,
                    cnpj: empresa.cnpj || "CNPJ não informado",
                    empresaPaiId: empresa.empresa_pai_id || "",
                    tipoEmpresa: empresa.tipo_empresa || "",
                    logoUrl: obterUrlLogoEmpresa(empresa.logo_url),
                    dataInicioContrato:
                        empresa.data_inicio_contrato ||
                        empresa.dataInicioContrato ||
                        "",
                    dataFimContrato:
                        empresa.data_fim_contrato ||
                        empresa.dataFimContrato ||
                        "",
                };

                const vigenciaContratual =
                    classificarCompetenciaVigenciaContratual({
                        empresa:
                            empresaNormalizada,
                        competencia,
                    });

                const regrasPerfilEmpresa =
                    perfilDocumentalEmpresasEstado
                        .regrasPorEmpresa?.[
                            empresaNormalizada.id
                        ] ||
                    [];

                const perfilDocumentalEmpresa =
                    montarPerfilDocumentalCompetencia({
                        empresaId:
                            empresaNormalizada.id,
                        competencia,
                        regras:
                            regrasPerfilEmpresa,
                    });

                const totalExigiveisEmpresa =
                    vigenciaContratual.exigivel
                        ? perfilDocumentalEmpresa
                            .totalExigiveis
                        : 0;

                return {
                    ...empresaNormalizada,
                    pendencias:
                        totalExigiveisEmpresa,
                    status:
                        !vigenciaContratual.exigivel
                            ? "nao-aplicavel"
                            : totalExigiveisEmpresa > 0
                                ? "pendente"
                                : "conforme",
                    totalDocumentosExigiveis:
                        totalExigiveisEmpresa,
                    totalDocumentosNaoExigiveis:
                        vigenciaContratual.exigivel
                            ? perfilDocumentalEmpresa
                                .totalNaoExigiveis
                            : 0,
                    vigenciaContratual,
                };
            });

        const porId = new Map(base.map((empresa) => [empresa.id, empresa]));
        const filhosPorPai = new Map();

        base.forEach((empresa) => {
            if (!empresa.empresaPaiId || !porId.has(empresa.empresaPaiId)) return;
            const filhos = filhosPorPai.get(empresa.empresaPaiId) || [];
            filhos.push(empresa);
            filhosPorPai.set(empresa.empresaPaiId, filhos);
        });

        const ordenar = (lista) => [...lista].sort((a, b) =>
            a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
        const resultado = [];
        const visitados = new Set();

        const adicionarComFilhos = (empresa, nivel = 0, empresaPaiNome = "") => {
            if (visitados.has(empresa.id)) return;
            visitados.add(empresa.id);
            resultado.push({ ...empresa, nivel, empresaPaiNome });
            ordenar(filhosPorPai.get(empresa.id) || []).forEach((filha) =>
                adicionarComFilhos(filha, nivel + 1, empresa.nome));
        };

        ordenar(base.filter((empresa) => !empresa.empresaPaiId || !porId.has(empresa.empresaPaiId)))
            .forEach((empresa) => adicionarComFilhos(empresa));
        ordenar(base.filter((empresa) => !visitados.has(empresa.id)))
            .forEach((empresa) => adicionarComFilhos(empresa));

        return resultado;
    }, [
        competencia,
        empresasBanco,
        perfilDocumentalEmpresasEstado
            .regrasPorEmpresa,
    ]);

    const [empresaSelecionadaId, setEmpresaSelecionadaId] =
        useState("");

    const [documentoSelecionadoId, setDocumentoSelecionadoId] =
        useState(DOCUMENTOS_CERTIDAO_MENSAL_BASE[0].id);

    const [
        relatorioAnualGerando,
        setRelatorioAnualGerando,
    ] = useState(false);

    const [
        snapshotsMaoDeObraConfirmados,
        setSnapshotsMaoDeObraConfirmados,
    ] = useState({});

    const empresasVisiveisCompetencia =
        useMemo(
            () =>
                empresas.filter(
                    (empresa) =>
                        empresa
                            .vigenciaContratual
                            ?.exigivel === true
                ),
            [empresas]
        );

    useEffect(() => {
        if (
            !empresasVisiveisCompetencia.some(
                (empresa) =>
                    empresa.id ===
                    empresaSelecionadaId
            )
        ) {
            setEmpresaSelecionadaId(
                empresasVisiveisCompetencia[0]
                    ?.id ||
                ""
            );
        }
    }, [
        empresaSelecionadaId,
        empresasVisiveisCompetencia,
    ]);

    const [
        resumoDocumentalEstado,
        setResumoDocumentalEstado,
    ] = useState(() => ({
        chave:
            "",

        carregando:
            false,

        erro:
            "",

        totalExigiveis:
            0,

        confirmados:
            0,

        emAnalise:
            0,

        pendentes:
            0,

        vencidas:
            0,

        pendenciasCriticas:
            0,

        ultimaAtualizacao:
            "",

        conformidadeMes:
            0,
    }));
    const laboratorioPdf =
        useCertidaoPdfLaboratorio();

    const [
        documentosPersistidosEstado,
        setDocumentosPersistidosEstado,
    ] = useState(() => ({
        chave: "",
        itens: {},
    }));

    useEffect(() => {
        let efeitoAtivo =
            true;

        const empresasExigiveis =
            empresas.filter(
                (empresa) =>
                    empresa
                        ?.vigenciaContratual
                        ?.exigivel ===
                    true
            );

        const empresaIds =
            [
                ...new Set(
                    empresasExigiveis
                        .map(
                            (empresa) =>
                                String(
                                    empresa?.id ||
                                    ""
                                ).trim()
                        )
                        .filter(Boolean)
                ),
            ];

        const correspondenciaCompetencia =
            /^(0[1-9]|1[0-2])\/(\d{4})$/
                .exec(
                    String(
                        competencia ||
                        ""
                    ).trim()
                );

        const competenciaIso =
            correspondenciaCompetencia
                ? (
                    correspondenciaCompetencia[2] +
                    "-" +
                    correspondenciaCompetencia[1] +
                    "-01"
                )
                : "";

        const exigiveisPorEmpresa =
            new Map();

        let totalExigiveis =
            0;

        for (
            const empresa of
                empresasExigiveis
        ) {
            const empresaId =
                String(
                    empresa?.id ||
                    ""
                ).trim();

            if (!empresaId) {
                continue;
            }

            const regrasEmpresa =
                perfilDocumentalEmpresasEstado
                    .regrasPorEmpresa?.[
                        empresaId
                    ] ||
                [];

            const perfilEmpresa =
                montarPerfilDocumentalCompetencia({
                    empresaId,
                    competencia,
                    regras:
                        regrasEmpresa,
                });

            const idsExigiveis =
                new Set(
                    (
                        Array.isArray(
                            perfilEmpresa
                                ?.idsExigiveis
                        )
                            ? perfilEmpresa
                                .idsExigiveis
                            : []
                    )
                        .map(
                            (id) =>
                                String(
                                    id ||
                                    ""
                                ).trim()
                        )
                        .filter(Boolean)
                );

            exigiveisPorEmpresa.set(
                empresaId,
                idsExigiveis
            );

            totalExigiveis +=
                idsExigiveis.size;
        }

        const chaveResumo =
            (
                empresaIds
                    .slice()
                    .sort()
                    .join("|") +
                "|" +
                competenciaIso
            );

        if (
            !empresaIds.length ||
            !competenciaIso
        ) {
            setResumoDocumentalEstado({
                chave:
                    chaveResumo,

                carregando:
                    false,

                erro:
                    "",

                totalExigiveis:
                    0,

                confirmados:
                    0,

                emAnalise:
                    0,

                pendentes:
                    0,

                vencidas:
                    0,

                pendenciasCriticas:
                    0,

                ultimaAtualizacao:
                    "Nenhum contrato exigível na competência",

                conformidadeMes:
                    0,
            });

            return () => {
                efeitoAtivo =
                    false;
            };
        }

        if (
            !supabase ||
            typeof supabase.from !==
                "function"
        ) {
            setResumoDocumentalEstado({
                chave:
                    chaveResumo,

                carregando:
                    false,

                erro:
                    "Resumo documental indisponível.",

                totalExigiveis,

                confirmados:
                    0,

                emAnalise:
                    0,

                pendentes:
                    totalExigiveis,

                vencidas:
                    0,

                pendenciasCriticas:
                    0,

                ultimaAtualizacao:
                    "Resumo documental indisponível",

                conformidadeMes:
                    0,
            });

            return () => {
                efeitoAtivo =
                    false;
            };
        }

        setResumoDocumentalEstado(
            (estadoAtual) => ({
                ...estadoAtual,

                chave:
                    chaveResumo,

                carregando:
                    true,

                erro:
                    "",

                totalExigiveis,
            })
        );

        async function carregarResumoDocumental() {
            try {
                const anoAlvo =
                    Number(
                        competenciaIso.slice(
                            0,
                            4
                        )
                    );

                if (
                    !Number.isInteger(
                        anoAlvo
                    )
                ) {
                    throw new Error(
                        "Ano da competência inválido para o resumo documental."
                    );
                }

                /*
                 * Mantemos a mesma janela utilizada pelo serviço
                 * buscarDocumentoAtualCertidaoMensal.
                 *
                 * Isso permite que documentos regidos por VALIDADE
                 * sejam resolvidos por competências anteriores ou,
                 * quando tecnicamente aplicável, posteriores.
                 *
                 * Documentos de COMPETENCIA_MENSAL continuam presos
                 * exclusivamente ao mês correspondente porque essa
                 * decisão pertence ao resolvedor central.
                 */
                const inicioJanela =
                    `${anoAlvo - 1}-01-01`;

                const fimJanela =
                    `${anoAlvo + 2}-01-01`;

                const tiposExigiveis =
                    [
                        ...new Set(
                            [
                                ...exigiveisPorEmpresa
                                    .values(),
                            ].flatMap(
                                (ids) =>
                                    [
                                        ...ids,
                                    ]
                            )
                        ),
                    ];

                const respostaCompetencias =
                    await supabase
                        .from(
                            "certidao_mensal_competencias"
                        )
                        .select(
                            [
                                "id",
                                "empresa_id",
                                "competencia",
                                "status",
                                "atualizado_em",
                            ].join(",")
                        )
                        .in(
                            "empresa_id",
                            empresaIds
                        )
                        .gte(
                            "competencia",
                            inicioJanela
                        )
                        .lt(
                            "competencia",
                            fimJanela
                        );

                if (
                    respostaCompetencias
                        ?.error
                ) {
                    throw respostaCompetencias
                        .error;
                }

                const competenciasBanco =
                    Array.isArray(
                        respostaCompetencias
                            ?.data
                    )
                        ? respostaCompetencias
                            .data
                        : [];

                const competenciaIds =
                    competenciasBanco
                        .map(
                            (registro) =>
                                String(
                                    registro?.id ||
                                    ""
                                ).trim()
                        )
                        .filter(Boolean);

                let itensBanco =
                    [];

                if (
                    competenciaIds.length >
                        0 &&
                    tiposExigiveis.length >
                        0
                ) {
                    const respostaItens =
                        await supabase
                            .from(
                                "certidao_mensal_itens"
                            )
                            .select(
                                [
                                    "id",
                                    "competencia_id",
                                    "tipo_documento",
                                    "status",
                                    "versao_atual_id",
                                    "atualizado_em",
                                ].join(",")
                            )
                            .in(
                                "competencia_id",
                                competenciaIds
                            )
                            .in(
                                "tipo_documento",
                                tiposExigiveis
                            );

                    if (
                        respostaItens
                            ?.error
                    ) {
                        throw respostaItens
                            .error;
                    }

                    itensBanco =
                        Array.isArray(
                            respostaItens
                                ?.data
                        )
                            ? respostaItens
                                .data
                            : [];
                }

                const versaoIds =
                    [
                        ...new Set(
                            itensBanco
                                .map(
                                    (item) =>
                                        String(
                                            item
                                                ?.versao_atual_id ||
                                            ""
                                        ).trim()
                                )
                                .filter(Boolean)
                        ),
                    ];

                let versoesBanco =
                    [];

                if (
                    versaoIds.length >
                    0
                ) {
                    const respostaVersoes =
                        await supabase
                            .from(
                                "certidao_mensal_versoes"
                            )
                            .select(
                                [
                                    "id",
                                    "item_id",
                                    "numero_versao",
                                    "status_resultado",
                                    "diagnostico",
                                    "payload",
                                    "criado_em",
                                ].join(",")
                            )
                            .in(
                                "id",
                                versaoIds
                            );

                    if (
                        respostaVersoes
                            ?.error
                    ) {
                        throw respostaVersoes
                            .error;
                    }

                    versoesBanco =
                        Array.isArray(
                            respostaVersoes
                                ?.data
                        )
                            ? respostaVersoes
                                .data
                            : [];
                }

                if (!efeitoAtivo) {
                    return;
                }

                const competenciasPorId =
                    new Map(
                        competenciasBanco.map(
                            (registro) => [
                                String(
                                    registro?.id ||
                                    ""
                                ).trim(),

                                registro,
                            ]
                        )
                    );

                const competenciasAlvoPorEmpresa =
                    new Map(
                        competenciasBanco
                            .filter(
                                (registro) =>
                                    String(
                                        registro
                                            ?.competencia ||
                                        ""
                                    ).trim() ===
                                    competenciaIso
                            )
                            .map(
                                (registro) => [
                                    String(
                                        registro
                                            ?.empresa_id ||
                                        ""
                                    ).trim(),

                                    registro,
                                ]
                            )
                    );

                const versoesPorId =
                    new Map(
                        versoesBanco.map(
                            (versao) => [
                                String(
                                    versao?.id ||
                                    ""
                                ).trim(),

                                versao,
                            ]
                        )
                    );

                const itensPorEmpresaDocumento =
                    new Map();

                for (
                    const item of
                        itensBanco
                ) {
                    const competenciaOrigem =
                        competenciasPorId.get(
                            String(
                                item
                                    ?.competencia_id ||
                                ""
                            ).trim()
                        );

                    const empresaId =
                        String(
                            competenciaOrigem
                                ?.empresa_id ||
                            ""
                        ).trim();

                    const tipoDocumento =
                        String(
                            item
                                ?.tipo_documento ||
                            ""
                        )
                            .trim()
                            .toLowerCase();

                    if (
                        !empresaId ||
                        !tipoDocumento
                    ) {
                        continue;
                    }

                    const chave =
                        (
                            empresaId +
                            "|" +
                            tipoDocumento
                        );

                    const listaAtual =
                        itensPorEmpresaDocumento
                            .get(
                                chave
                            ) ||
                        [];

                    listaAtual.push(
                        item
                    );

                    itensPorEmpresaDocumento
                        .set(
                            chave,
                            listaAtual
                        );
                }

                let confirmados =
                    0;

                let emAnalise =
                    0;

                let pendentes =
                    0;

                let vencidas =
                    0;

                let pendenciasCriticas =
                    0;

                let naoAplicaveis =
                    0;

                const atualizacoes =
                    [];

                for (
                    const [
                        empresaId,
                        idsExigiveis
                    ] of exigiveisPorEmpresa
                ) {
                    const competenciaAlvo =
                        competenciasAlvoPorEmpresa
                            .get(
                                empresaId
                            ) ||
                        null;

                    for (
                        const tipoDocumento of
                            idsExigiveis
                    ) {
                        const chave =
                            (
                                empresaId +
                                "|" +
                                tipoDocumento
                            );

                        const itensDocumento =
                            itensPorEmpresaDocumento
                                .get(
                                    chave
                                ) ||
                            [];

                        const itemAlvo =
                            itensDocumento.find(
                                (item) => {
                                    const registroCompetencia =
                                        competenciasPorId
                                            .get(
                                                String(
                                                    item
                                                        ?.competencia_id ||
                                                    ""
                                                ).trim()
                                            );

                                    return (
                                        String(
                                            registroCompetencia
                                                ?.competencia ||
                                            ""
                                        ).trim() ===
                                        competenciaIso
                                    );
                                }
                            ) ||
                            null;

                        const montarVersaoCandidata =
                            (item) => {
                                const versaoId =
                                    String(
                                        item
                                            ?.versao_atual_id ||
                                        ""
                                    ).trim();

                                if (!versaoId) {
                                    return null;
                                }

                                const versao =
                                    versoesPorId.get(
                                        versaoId
                                    );

                                const competenciaOrigem =
                                    competenciasPorId
                                        .get(
                                            String(
                                                item
                                                    ?.competencia_id ||
                                                ""
                                            ).trim()
                                        );

                                if (
                                    !versao ||
                                    !competenciaOrigem
                                ) {
                                    return null;
                                }

                                return {
                                    ...versao,

                                    tipoDocumento,

                                    competencia:
                                        String(
                                            competenciaOrigem
                                                ?.competencia ||
                                            ""
                                        ).trim(),

                                    status:
                                        String(
                                            item?.status ||
                                            versao
                                                ?.status_resultado ||
                                            ""
                                        )
                                            .trim()
                                            .toUpperCase(),

                                    item,
                                };
                            };

                        const candidatas =
                            itensDocumento
                                .map(
                                    montarVersaoCandidata
                                )
                                .filter(Boolean);

                        const versaoAtualItem =
                            itemAlvo
                                ? montarVersaoCandidata(
                                    itemAlvo
                                )
                                : null;

                        const competenciaAlvoFechada =
                            String(
                                competenciaAlvo
                                    ?.status ||
                                ""
                            )
                                .trim()
                                .toUpperCase() ===
                            "FECHADA";

                        /*
                         * Competência fechada mantém a fotografia
                         * documental já consolidada.
                         *
                         * Competência aberta sempre passa pelo
                         * resolvedor central, inclusive quando já
                         * existe versao_atual_id. Assim documentos
                         * regidos por VALIDADE podem ser substituídos
                         * logicamente por uma certidão mais recente
                         * ainda válida, sem apagar o histórico antigo.
                         */
                        const resolucao =
                            competenciaAlvoFechada &&
                            versaoAtualItem
                                ? {
                                    status:
                                        String(
                                            itemAlvo
                                                ?.status ||
                                            versaoAtualItem
                                                ?.status_resultado ||
                                            "EM_ANALISE"
                                        )
                                            .trim()
                                            .toUpperCase(),

                                    origemResolucao:
                                        "DOCUMENTO_PROPRIO_COMPETENCIA",

                                    herdado:
                                        false,

                                    versao:
                                        versaoAtualItem,

                                    motivo:
                                        "VERSAO_ATUAL_DA_COMPETENCIA",
                                }
                                : resolverDocumentoNaCompetencia({
                                    tipoDocumento,

                                    competencia:
                                        competenciaIso,

                                    versoes:
                                        candidatas,

                                    itemPersistido:
                                        itemAlvo,

                                    competenciaFechada:
                                        competenciaAlvoFechada,
                                });

                        const status =
                            String(
                                resolucao
                                    ?.status ||
                                ""
                            )
                                .trim()
                                .toUpperCase();

                        const itemResolvido =
                            resolucao
                                ?.versao
                                ?.item ||
                            itemAlvo ||
                            null;

                        if (
                            itemResolvido
                                ?.atualizado_em
                        ) {
                            const timestamp =
                                Date.parse(
                                    itemResolvido
                                        .atualizado_em
                                );

                            if (
                                Number.isFinite(
                                    timestamp
                                )
                            ) {
                                atualizacoes.push(
                                    timestamp
                                );
                            }
                        }

                        if (
                            [
                                "NAO_APLICAVEL",
                                "NÃO_APLICÁVEL",
                                "DISPENSADO",
                            ].includes(
                                status
                            )
                        ) {
                            naoAplicaveis +=
                                1;

                            continue;
                        }

                        if (
                            status ===
                            "VENCIDO"
                        ) {
                            vencidas +=
                                1;

                            pendenciasCriticas +=
                                1;

                            continue;
                        }

                        if (
                            [
                                "REENVIO_SOLICITADO",
                                "NAO_CONFORME",
                                "NÃO_CONFORME",
                                "REPROVADO",
                                "DIVERGENTE",
                                "INVALIDO",
                                "INVÁLIDO",
                            ].includes(
                                status
                            )
                        ) {
                            pendentes +=
                                1;

                            pendenciasCriticas +=
                                1;

                            continue;
                        }

                        if (
                            [
                                "CONFORME",
                                "APROVADO",
                                "CONFIRMADO",
                            ].includes(
                                status
                            )
                        ) {
                            confirmados +=
                                1;

                            continue;
                        }

                        const possuiVersao =
                            Boolean(
                                resolucao
                                    ?.versao
                            );

                        if (
                            possuiVersao ||
                            [
                                "ENVIADO",
                                "EM_ANALISE",
                                "EM ANÁLISE",
                                "EM_CONFERENCIA",
                                "EM CONFERÊNCIA",
                                "AGUARDANDO_CONFERENCIA",
                            ].includes(
                                status
                            )
                        ) {
                            emAnalise +=
                                1;

                            continue;
                        }

                        pendentes +=
                            1;
                    }
                }

                const totalConsiderado =
                    Math.max(
                        totalExigiveis -
                            naoAplicaveis,
                        0
                    );

                const conformidadeMes =
                    totalConsiderado > 0
                        ? Math.round(
                            (
                                confirmados /
                                totalConsiderado
                            ) *
                            100
                        )
                        : 0;

                const ultimaAtualizacaoTimestamp =
                    atualizacoes.length
                        ? Math.max(
                            ...atualizacoes
                        )
                        : null;

                const ultimaAtualizacao =
                    ultimaAtualizacaoTimestamp
                        ? new Date(
                            ultimaAtualizacaoTimestamp
                        ).toLocaleString(
                            "pt-BR",
                            {
                                day:
                                    "2-digit",

                                month:
                                    "2-digit",

                                year:
                                    "numeric",

                                hour:
                                    "2-digit",

                                minute:
                                    "2-digit",
                            }
                        )
                        : "Aguardando documentos reais";

                setResumoDocumentalEstado({
                    chave:
                        chaveResumo,

                    carregando:
                        false,

                    erro:
                        "",

                    totalExigiveis:
                        totalConsiderado,

                    confirmados,

                    emAnalise,

                    pendentes,

                    vencidas,

                    pendenciasCriticas,

                    ultimaAtualizacao,

                    conformidadeMes,
                });
            }
            catch (erro) {
                if (!efeitoAtivo) {
                    return;
                }

                console.error(
                    "[Certidões Mensais] Falha ao carregar resumo documental.",
                    erro
                );

                setResumoDocumentalEstado({
                    chave:
                        chaveResumo,

                    carregando:
                        false,

                    erro:
                        String(
                            erro?.message ||
                            "Falha ao carregar resumo documental."
                        ).trim(),

                    totalExigiveis,

                    confirmados:
                        0,

                    emAnalise:
                        0,

                    pendentes:
                        totalExigiveis,

                    vencidas:
                        0,

                    pendenciasCriticas:
                        0,

                    ultimaAtualizacao:
                        "Resumo documental temporariamente indisponível",

                    conformidadeMes:
                        0,
                });
            }
        }
        carregarResumoDocumental();

        return () => {
            efeitoAtivo =
                false;
        };
    }, [
        competencia,
        empresas,
        laboratorioPdf
            .resultadoPersistencia,
        documentosPersistidosEstado,
        perfilDocumentalEmpresasEstado
            .regrasPorEmpresa,
        supabase,
    ]);

    const resumo =
        useMemo(() => {
            const empresasExigiveis =
                empresas.filter(
                    (empresa) =>
                        empresa
                            ?.vigenciaContratual
                            ?.exigivel ===
                        true
                );

            let ultimaAtualizacao =
                resumoDocumentalEstado
                    .ultimaAtualizacao ||
                (
                    empresasExigiveis.length >
                    0
                        ? "Aguardando documentos reais"
                        : "Nenhum contrato exigível na competência"
                );

            if (
                perfilDocumentalEmpresasEstado
                    .carregando
            ) {
                ultimaAtualizacao =
                    "Carregando exigibilidade documental";
            }
            else if (
                resumoDocumentalEstado
                    .carregando
            ) {
                ultimaAtualizacao =
                    "Atualizando situação documental";
            }
            else if (
                resumoDocumentalEstado
                    .erro
            ) {
                ultimaAtualizacao =
                    "Resumo documental parcial";
            }
            else if (
                perfilDocumentalEmpresasEstado
                    .erro
            ) {
                ultimaAtualizacao =
                    "Exigibilidade parcial; usando fallback seguro";
            }

            return {
                contratadasFiscalizadas:
                    empresasExigiveis.length,

                pendenciasCriticas:
                    resumoDocumentalEstado
                        .pendenciasCriticas,

                certidoesValidas:
                    resumoDocumentalEstado
                        .confirmados,

                emAnalise:
                    resumoDocumentalEstado
                        .emAnalise,

                pendentes:
                    resumoDocumentalEstado
                        .pendentes,

                vencidas:
                    resumoDocumentalEstado
                        .vencidas,

                ultimaAtualizacao,

                conformidadeMes:
                    resumoDocumentalEstado
                        .conformidadeMes,
            };
        }, [
            empresas,
            perfilDocumentalEmpresasEstado
                .carregando,
            perfilDocumentalEmpresasEstado
                .erro,
            resumoDocumentalEstado,
        ]);
    const [
        aplicabilidadeEsocialEstado,
        setAplicabilidadeEsocialEstado,
    ] = useState(() => ({
        chave: "",
        item: null,
        suporteAplicabilidade:
            false,
        erro: "",
    }));

    const empresaSelecionada =
        empresasVisiveisCompetencia.find(
            (empresa) =>
                empresa.id ===
                empresaSelecionadaId
        ) ||
        empresasVisiveisCompetencia[0];

    const [
        perfilDocumentalRemotoEstado,
        setPerfilDocumentalRemotoEstado,
    ] = useState(() => ({
        empresaId: "",
        regras: [],
        carregando: false,
        erro: "",
    }));

    useEffect(() => {
        let efeitoAtivo =
            true;

        const empresaId =
            String(
                empresaSelecionada?.id ||
                ""
            ).trim();

        if (
            !PERFIL_DOCUMENTAL_REMOTO_HABILITADO ||
            !empresaId
        ) {
            setPerfilDocumentalRemotoEstado({
                empresaId,
                regras: [],
                carregando: false,
                erro: "",
            });

            return () => {
                efeitoAtivo =
                    false;
            };
        }

        setPerfilDocumentalRemotoEstado({
            empresaId,
            regras: [],
            carregando: true,
            erro: "",
        });

        async function carregarPerfilDocumental() {
            try {
                const regras =
                    await listarRegrasPerfilDocumentalCertidaoMensal(
                        empresaId,
                        {
                            clienteSupabase:
                                supabase,
                        }
                    );

                if (!efeitoAtivo) {
                    return;
                }

                setPerfilDocumentalRemotoEstado({
                    empresaId,
                    regras,
                    carregando: false,
                    erro: "",
                });
            }
            catch (erro) {
                if (!efeitoAtivo) {
                    return;
                }

                setPerfilDocumentalRemotoEstado({
                    empresaId,
                    regras: [],
                    carregando: false,
                    erro:
                        erro?.message ||
                        "Não foi possível carregar o perfil documental.",
                });
            }
        }

        carregarPerfilDocumental();

        return () => {
            efeitoAtivo =
                false;
        };
    }, [
        empresaSelecionada?.id,
        supabase,
    ]);

    const regrasPerfilDocumentalAtuais =
        perfilDocumentalRemotoEstado.empresaId ===
        String(
            empresaSelecionada?.id ||
            ""
        ).trim()
            ? perfilDocumentalRemotoEstado.regras
            : [];

    async function salvarPerfilDocumental(
        dadosRegra = {},
    ) {
        if (
            !PERFIL_DOCUMENTAL_PERSISTENCIA_HABILITADA
        ) {
            throw new Error(
                "A persistência do perfil documental permanece bloqueada para validação controlada.",
            );
        }

        const empresaId =
            String(
                empresaSelecionada?.id ||
                "",
            ).trim();

        if (!empresaId) {
            throw new Error(
                "Selecione uma empresa antes de salvar a exigibilidade documental.",
            );
        }

        const tiposDocumento =
            Array.from(
                new Set(
                    (
                        Array.isArray(
                            dadosRegra
                                ?.tiposDocumento,
                        )
                            ? dadosRegra
                                .tiposDocumento
                            : [
                                dadosRegra
                                    ?.tipoDocumento,
                            ]
                    )
                        .map(
                            (valor) =>
                                String(
                                    valor ||
                                    "",
                                ).trim(),
                        )
                        .filter(Boolean),
                ),
            );

        if (tiposDocumento.length === 0) {
            throw new Error(
                "Selecione ao menos um documento antes de salvar a exigibilidade documental.",
            );
        }

        const dadosBase = {
            ...dadosRegra,
        };

        delete dadosBase.tiposDocumento;
        delete dadosBase.tipoDocumento;

        for (
            const tipoDocumento of
            tiposDocumento
        ) {
            await salvarRegraPerfilDocumentalCertidaoMensal(
                {
                    ...dadosBase,
                    tipoDocumento,
                    empresaId,
                },
                {
                    clienteSupabase:
                        supabase,
                },
            );
        }

        const regras =
            await listarRegrasPerfilDocumentalCertidaoMensal(
                empresaId,
                {
                    clienteSupabase:
                        supabase,
                },
            );

        setPerfilDocumentalRemotoEstado({
            empresaId,
            regras,
            carregando:
                false,
            erro:
                "",
        });

        return {
            totalSalvo:
                tiposDocumento.length,
            tiposDocumento,
        };
    }
    useEffect(() => {
        const empresaId =
            String(
                perfilDocumentalRemotoEstado
                    ?.empresaId ||
                "",
            ).trim();

        if (
            !empresaId ||
            perfilDocumentalRemotoEstado
                ?.carregando ||
            perfilDocumentalRemotoEstado
                ?.erro
        ) {
            return;
        }

        const regras =
            Array.isArray(
                perfilDocumentalRemotoEstado
                    ?.regras,
            )
                ? perfilDocumentalRemotoEstado
                    .regras
                : [];

        setPerfilDocumentalEmpresasEstado(
            (estadoAtual) => ({
                ...estadoAtual,
                regrasPorEmpresa: {
                    ...(
                        estadoAtual
                            ?.regrasPorEmpresa ||
                        {}
                    ),
                    [empresaId]:
                        regras,
                },
            }),
        );
    }, [
        perfilDocumentalRemotoEstado
            .empresaId,
        perfilDocumentalRemotoEstado
            .regras,
        perfilDocumentalRemotoEstado
            .carregando,
        perfilDocumentalRemotoEstado
            .erro,
    ]);

    const perfilDocumentalCompetencia =
        useMemo(
            () =>
                montarPerfilDocumentalCompetencia({
                    empresaId:
                        empresaSelecionada?.id ||
                        "",
                    competencia,
                    regras:
                        regrasPerfilDocumentalAtuais,
                }),
            [
                competencia,
                empresaSelecionada?.id,
                regrasPerfilDocumentalAtuais,
            ]
        );

    const cicloMensal =
        useCertidaoMensalCiclo({
            empresaId:
                empresaSelecionada?.id ||
                "",

            competencia,

            empresa:
                empresaSelecionada ||
                {},

            habilitado:
                CICLO_ANUAL_REMOTO_HABILITADO &&
                Boolean(
                    usuario?.id &&
                    empresaSelecionada?.id
                ),
        });

    const chaveDocumentosPersistidos =
        (
            (empresaSelecionada?.id || "") +
            "|" +
            competencia
        );

    const documentosPersistidosAtuais =
        documentosPersistidosEstado.chave ===
        chaveDocumentosPersistidos
            ? documentosPersistidosEstado.itens
            : {};

    const aplicabilidadeEsocialAtual =
        aplicabilidadeEsocialEstado.chave ===
        chaveDocumentosPersistidos
            ? aplicabilidadeEsocialEstado
            : {
                chave:
                    chaveDocumentosPersistidos,
                item:
                    null,
                suporteAplicabilidade:
                    false,
                erro:
                    "",
            };

    useEffect(() => {
        let ativo =
            true;

        const empresaId =
            String(
                empresaSelecionada?.id ||
                ""
            ).trim();

        if (
            !empresaId ||
            !supabase
        ) {
            setAplicabilidadeEsocialEstado({
                chave:
                    chaveDocumentosPersistidos,
                item:
                    null,
                suporteAplicabilidade:
                    false,
                erro:
                    "",
            });

            return () => {
                ativo =
                    false;
            };
        }

        async function carregarAplicabilidadeEsocial() {
            try {
                const resultado =
                    await buscarAplicabilidadeEsocialCertidaoMensal({
                        clienteSupabase:
                            supabase,
                        empresaId,
                        competencia,
                    });

                if (!ativo) {
                    return;
                }

                setAplicabilidadeEsocialEstado({
                    chave:
                        chaveDocumentosPersistidos,
                    item:
                        resultado?.item ||
                        null,
                    suporteAplicabilidade:
                        resultado
                            ?.suporteAplicabilidade ===
                        true,
                    erro:
                        "",
                });
            }
            catch (erro) {
                if (!ativo) {
                    return;
                }

                setAplicabilidadeEsocialEstado({
                    chave:
                        chaveDocumentosPersistidos,
                    item:
                        null,
                    suporteAplicabilidade:
                        false,
                    erro:
                        String(
                            erro?.message ||
                            "Falha ao consultar aplicabilidade."
                        ).trim(),
                });
            }
        }

        carregarAplicabilidadeEsocial();

        return () => {
            ativo =
                false;
        };
    }, [
        chaveDocumentosPersistidos,
        competencia,
        empresaSelecionada?.id,
        supabase,
    ]);

    const processarArquivoLaboratorioComCnpjs =
        async (
            arquivo,
            contexto = {}
        ) => {
            const empresaBase =
                contexto?.empresa ||
                empresaSelecionada ||
                null;

            const empresaId =
                String(
                    empresaBase?.id ||
                    ""
                ).trim();

            if (
                !empresaId ||
                !supabase
            ) {
                return laboratorioPdf
                    .processarArquivo(
                        arquivo,
                        contexto
                    );
            }

            try {
                const cnpjsVinculados =
                    await listarCnpjsEmpresa({
                        supabase,
                        empresaId,
                    });

                return await laboratorioPdf
                    .processarArquivo(
                        arquivo,
                        {
                            ...contexto,

                            empresa: {
                                ...empresaBase,
                                cnpjsVinculados,
                            },
                        }
                    );
            }
            catch (erro) {
                console.error(
                    "Falha ao carregar CNPJs vinculados da empresa para a análise documental:",
                    erro
                );

                if (
                    typeof window !==
                    "undefined"
                ) {
                    window.alert(
                        "Não foi possível carregar os CNPJs vinculados da empresa. O documento não será analisado para evitar uma validação incorreta."
                    );
                }

                return null;
            }
        };
    const abrirLaboratorioDocumento =
        (documento) => {
            if (
                documento?.exigido === false
            ) {
                return;
            }

            if (
                documento?.id ===
                    "esocial" &&
                String(
                    documento
                        ?.aplicabilidade ||
                    "PENDENTE_DEFINICAO"
                )
                    .trim()
                    .toUpperCase() !==
                    "APLICAVEL"
            ) {
                if (
                    typeof window !==
                    "undefined"
                ) {
                    window.alert(
                        "Defina a aplicabilidade do eSocial SST nesta competência antes do envio."
                    );
                }

                return;
            }

            laboratorioPdf
                .abrirLaboratorio({
                    ...documento,
                    competenciaEsperada:
                        competencia,
                    empresaId:
                        empresaSelecionada?.id ||
                        "",
                });
        };

    useEffect(() => {
        let efeitoAtivo =
            true;

        const empresaId =
            String(
                empresaSelecionada?.id ||
                ""
            ).trim();

        if (!empresaId) {
            return () => {
                efeitoAtivo =
                    false;
            };
        }

        const documentosConsultaveis =
            DOCUMENTOS_CERTIDAO_MENSAL_BASE
                .filter(
                    (documento) =>
                        !documento.origemSistema
                );

        async function carregarDocumentosPersistidos() {
            const resultados =
                await Promise.all(
                    documentosConsultaveis.map(
                        async (documento) => {
                            try {
                                const registro =
                                    await buscarDocumentoAtualCertidaoMensal({
                                        empresaId,
                                        competencia,
                                        tipoDocumento:
                                            documento.id,
                                    });

                                if (
                                    !registro?.versao ||
                                    !registro?.caminhoStorage
                                ) {
                                    return [
                                        documento.id,
                                        registro,
                                    ];
                                }

                                let urlAssinada =
                                    "";

                                try {
                                    urlAssinada =
                                        await criarUrlAssinadaPdfCertidaoMensal({
                                            caminhoStorage:
                                                registro.caminhoStorage,
                                            duracaoSegundos:
                                                3600,
                                        });
                                }
                                catch (erroUrl) {
                                    console.warn(
                                        (
                                            "Não foi possível gerar a URL temporária do documento " +
                                            documento.id +
                                            "."
                                        ),
                                        erroUrl
                                    );
                                }

                                return [
                                    documento.id,
                                    {
                                        ...registro,
                                        urlAssinada,
                                    },
                                ];
                            }
                            catch (error) {
                                console.warn(
                                    (
                                        "Não foi possível consultar o documento " +
                                        documento.id +
                                        " da competência."
                                    ),
                                    error
                                );

                                return [
                                    documento.id,
                                    null,
                                ];
                            }
                        }
                    )
                );

            if (!efeitoAtivo) {
                return;
            }

            const itens =
                Object.fromEntries(
                    resultados.filter(
                        ([, registro]) =>
                            Boolean(
                                registro?.versao
                            )
                    )
                );

            setDocumentosPersistidosEstado({
                chave:
                    chaveDocumentosPersistidos,
                itens,
            });
        }

        carregarDocumentosPersistidos();

        return () => {
            efeitoAtivo =
                false;
        };
    }, [
        chaveDocumentosPersistidos,
        competencia,
        empresaSelecionada?.id,
        laboratorioPdf.resultadoPersistencia,
    ]);

    useEffect(() => {
        const competenciaPersistidaIso =
            String(
                laboratorioPdf
                    .resultadoPersistencia
                    ?.payload
                    ?.competencia ||
                ""
            ).trim();

        const correspondencia =
            /^(\d{4})-(0[1-9]|1[0-2])-01$/
                .exec(
                    competenciaPersistidaIso
                );

        if (!correspondencia) {
            return;
        }

        const competenciaPersistida =
            (
                correspondencia[2] +
                "/" +
                correspondencia[1]
            );

        setCompetencia(
            (competenciaAtual) =>
                competenciaAtual ===
                    competenciaPersistida
                    ? competenciaAtual
                    : competenciaPersistida
        );
    }, [
        laboratorioPdf.resultadoPersistencia,
    ]);

    const [
        movimentacoesVinculo,
        setMovimentacoesVinculo,
    ] =
        useState(
            []
        );

    const [
        historicoVinculoCarregado,
        setHistoricoVinculoCarregado,
    ] =
        useState(
            false
        );

    const [
        erroHistoricoVinculo,
        setErroHistoricoVinculo,
    ] =
        useState(
            ""
        );

    useEffect(
        () => {
            let componenteAtivo =
                true;

            const empresaId =
                String(
                    empresaSelecionada
                        ?.id ||
                    ""
                ).trim();

            setMovimentacoesVinculo(
                []
            );

            setHistoricoVinculoCarregado(
                false
            );

            setErroHistoricoVinculo(
                ""
            );

            if (
                !empresaId ||
                !supabase
            ) {
                return () => {
                    componenteAtivo =
                        false;
                };
            }

            void (
                async () => {
                    try {
                        const lista =
                            await listarMovimentacoesEmpresa({
                                supabase,
                                empresaId,
                                limite:
                                    5000,
                            });

                        if (!componenteAtivo) {
                            return;
                        }

                        setMovimentacoesVinculo(
                            lista
                        );

                        setHistoricoVinculoCarregado(
                            true
                        );
                    }
                    catch (erro) {
                        if (!componenteAtivo) {
                            return;
                        }

                        setMovimentacoesVinculo(
                            []
                        );

                        setHistoricoVinculoCarregado(
                            false
                        );

                        setErroHistoricoVinculo(
                            erro?.message ||
                            String(
                                erro
                            )
                        );
                    }
                }
            )();

            return () => {
                componenteAtivo =
                    false;
            };
        },
        [
            empresaSelecionada?.id,
            supabase,
        ]
    );
    const evidenciaInterna =
        useMemo(() => {
            if (!empresaSelecionada?.id) {
                return null;
            }

            return montarEvidenciasInternasCertidaoMensal({
                competencia,
                empresaId:
                    empresaSelecionada.id,
                colaboradores,
                documentosEmpresas,
                movimentacoesVinculo,
                historicoVinculoCarregado,
            });
        }, [
            colaboradores,
            competencia,
            documentosEmpresas,
            empresaSelecionada?.id,
            historicoVinculoCarregado,
            movimentacoesVinculo,
        ]);

    const snapshotMaoDeObraRascunho =
        useMemo(() => {
            if (
                !evidenciaInterna ||
                !empresaSelecionada?.id
            ) {
                return null;
            }

            if (
                evidenciaInterna.competencia >
                evidenciaInterna.competenciaAtual
            ) {
                return null;
            }

            return criarSnapshotMaoDeObraAPartirDaEvidenciaInterna({
                competencia,
                empresaId:
                    empresaSelecionada.id,
                evidenciaInterna,
                usuarioId:
                    usuario?.id || "",
            });
        }, [
            competencia,
            empresaSelecionada?.id,
            evidenciaInterna,
            usuario?.id,
        ]);

    const chaveSnapshotMaoDeObra =
        empresaSelecionada?.id
            ? `${empresaSelecionada.id}:${competencia}`
            : "";

    const itemRelacaoEmpregadosPersistido =
        useMemo(() => {
            const itens =
                Array.isArray(
                    cicloMensal?.itensAutomaticos
                )
                    ? cicloMensal.itensAutomaticos
                    : [];

            return itens.find(
                (item) =>
                    String(
                        item?.tipoDocumento ||
                        ""
                    ).trim() ===
                    "relacao-empregados"
            ) || null;
        }, [
            cicloMensal?.itensAutomaticos,
        ]);

    const snapshotMaoDeObraPersistido =
        useMemo(() => {
            const item =
                itemRelacaoEmpregadosPersistido;

            if (!item) {
                return null;
            }

            if (
                String(
                    item.status ||
                    ""
                )
                    .trim()
                    .toUpperCase() !==
                "CONFORME"
            ) {
                return null;
            }

            const snapshot =
                item.snapshotAutomatico ||
                item.snapshot ||
                item.snapshot_automatico ||
                null;

            if (
                !snapshot ||
                typeof snapshot !==
                    "object" ||
                Array.isArray(snapshot) ||
                snapshot.statusSnapshot !==
                    "confirmado"
            ) {
                return null;
            }

            if (
                String(
                    snapshot.empresaId ||
                    ""
                ).trim() !==
                String(
                    empresaSelecionada?.id ||
                    ""
                ).trim()
            ) {
                return null;
            }

            const normalizarMesCompetencia = (valor) => {                 const textoCompetencia =                     String(                         valor ||                         ""                     ).trim();                  const formatoIso =                     textoCompetencia.match(                         /^(\d{4})-(\d{2})(?:-\d{2})?$/                     );                  if (formatoIso) {                     return (                         formatoIso[1] +                         "-" +                         formatoIso[2]                     );                 }                  const formatoBr =                     textoCompetencia.match(                         /^(\d{2})\/(\d{4})$/                     );                  if (formatoBr) {                     return (                         formatoBr[2] +                         "-" +                         formatoBr[1]                     );                 }                  return "";             };              const mesSnapshotPersistido =                 normalizarMesCompetencia(                     snapshot.competencia                 );              const mesCompetenciaSelecionada =                 normalizarMesCompetencia(                     competencia                 );

            if (
                !mesSnapshotPersistido ||
                mesSnapshotPersistido !==
                    mesCompetenciaSelecionada
            ) {
                return null;
            }

            return snapshot;
        }, [
            competencia,
            empresaSelecionada?.id,
            evidenciaInterna
                ?.historicoConfiavel,
            itemRelacaoEmpregadosPersistido,
            snapshotMaoDeObraRascunho,
        ]);

    const snapshotConfirmadoRegistrado =
        chaveSnapshotMaoDeObra
            ? snapshotsMaoDeObraConfirmados[
                chaveSnapshotMaoDeObra
            ] || null
            : null;

    const snapshotMaoDeObraConfirmado =
        useMemo(() => {
            if (snapshotMaoDeObraPersistido) {
                return snapshotMaoDeObraPersistido;
            }

            if (!snapshotConfirmadoRegistrado) {
                return null;
            }

            if (
                snapshotConfirmadoRegistrado
                    ?.origemDados ===
                    "confirmacao_manual" &&
                snapshotConfirmadoRegistrado
                    ?.statusSnapshot ===
                    "confirmado"
            ) {
                return snapshotConfirmadoRegistrado;
            }

            if (!snapshotMaoDeObraRascunho) {
                return null;
            }

            const colaboradoresConfirmados =
                JSON.stringify(
                    snapshotConfirmadoRegistrado
                        .colaboradores || []
                );

            const colaboradoresAtuais =
                JSON.stringify(
                    snapshotMaoDeObraRascunho
                        .colaboradores || []
                );

            return colaboradoresConfirmados ===
                colaboradoresAtuais
                ? snapshotConfirmadoRegistrado
                : null;
        }, [
            snapshotConfirmadoRegistrado,
            snapshotMaoDeObraPersistido,
            snapshotMaoDeObraRascunho,
        ]);

    const snapshotMaoDeObraAtual =
        snapshotMaoDeObraConfirmado ||
        snapshotMaoDeObraRascunho;

    const evidenciaOcupacional =
        useMemo(
            () => {
                if (!evidenciaInterna) {
                    return null;
                }

                return recalcularEvidenciaOcupacionalComSnapshotMaoDeObra({
                    evidenciaInterna,
                    snapshotMaoDeObra:
                        snapshotMaoDeObraAtual,
                    colaboradores,
                });
            },
            [
                colaboradores,
                evidenciaInterna,
                snapshotMaoDeObraAtual,
            ]
        );

    const regularizacaoHistoricaNecessaria =
        Boolean(
            evidenciaInterna &&
            evidenciaInterna.competencia <
                evidenciaInterna.competenciaAtual &&
            evidenciaInterna
                .historicoRelacaoConfiavel !==
                true &&
            snapshotMaoDeObraAtual
                ?.statusSnapshot !==
                "confirmado"
        );

    const colaboradoresEmpresaRegularizacao =
        useMemo(
            () => {
                const empresaId =
                    String(
                        empresaSelecionada
                            ?.id ||
                        ""
                    ).trim();

                if (!empresaId) {
                    return [];
                }

                return (
                    Array.isArray(
                        colaboradores
                    )
                        ? colaboradores
                        : []
                )
                    .filter(
                        (colaborador) =>
                            String(
                                colaborador
                                    ?.empresaId ||
                                colaborador
                                    ?.empresa_id ||
                                colaborador
                                    ?.empresa
                                    ?.id ||
                                colaborador
                                    ?.empresas
                                    ?.id ||
                                ""
                            ).trim() ===
                            empresaId
                    )
                    .slice()
                    .sort(
                        (
                            primeiro,
                            segundo
                        ) =>
                            String(
                                primeiro?.nome ||
                                ""
                            ).localeCompare(
                                String(
                                    segundo?.nome ||
                                    ""
                                ),
                                "pt-BR",
                                {
                                    sensitivity:
                                        "base",
                                }
                            )
                    );
            },
            [
                colaboradores,
                empresaSelecionada?.id,
            ]
        );

    const idsPreSelecionadosRegularizacao =
        useMemo(
            () => {
                if (
                    !regularizacaoHistoricaNecessaria ||
                    !snapshotMaoDeObraRascunho
                ) {
                    return [];
                }

                const dataReferencia =
                    String(
                        evidenciaInterna
                            ?.dataReferencia ||
                        ""
                    )
                        .slice(
                            0,
                            10
                        );

                if (!dataReferencia) {
                    return [];
                }

                const idsBaseAtual =
                    new Set(
                        (
                            snapshotMaoDeObraRascunho
                                ?.colaboradores ||
                            []
                        )
                            .map(
                                (colaborador) =>
                                    String(
                                        colaborador
                                            ?.id ||
                                        ""
                                    ).trim()
                            )
                            .filter(
                                Boolean
                            )
                    );

                return colaboradoresEmpresaRegularizacao
                    .filter(
                        (colaborador) => {
                            const id =
                                String(
                                    colaborador
                                        ?.id ||
                                    ""
                                ).trim();

                            const admissao =
                                String(
                                    colaborador
                                        ?.dataAdmissao ||
                                    colaborador
                                        ?.data_admissao ||
                                    ""
                                )
                                    .slice(
                                        0,
                                        10
                                    );

                            return (
                                id &&
                                idsBaseAtual.has(
                                    id
                                ) &&
                                admissao &&
                                admissao <=
                                    dataReferencia
                            );
                        }
                    )
                    .map(
                        (colaborador) =>
                            String(
                                colaborador.id
                            )
                    );
            },
            [
                colaboradoresEmpresaRegularizacao,
                evidenciaInterna?.dataReferencia,
                regularizacaoHistoricaNecessaria,
                snapshotMaoDeObraRascunho,
            ]
        );

    const [
        regularizacaoHistoricaAberta,
        setRegularizacaoHistoricaAberta,
    ] =
        useState(
            false
        );

    const [
        regularizacaoHistoricaSelecionados,
        setRegularizacaoHistoricaSelecionados,
    ] =
        useState(
            []
        );

    const [
        regularizacaoHistoricaSalvando,
        setRegularizacaoHistoricaSalvando,
    ] =
        useState(
            false
        );

    const [
        regularizacaoHistoricaErro,
        setRegularizacaoHistoricaErro,
    ] =
        useState(
            ""
        );

    const relacaoHistoricaManualConfirmada =
        Boolean(
            snapshotMaoDeObraAtual
                ?.statusSnapshot ===
                "confirmado" &&
            snapshotMaoDeObraAtual
                ?.origemDados ===
                "confirmacao_manual" &&
            snapshotMaoDeObraAtual
                ?.confirmadoPorUsuario ===
                true &&
            snapshotMaoDeObraAtual
                ?.requerConfirmacaoHumana ===
                false
        );

    const obterColaboradoresRelacaoHistoricaSalva =
        () => {
            if (
                Array.isArray(
                    snapshotMaoDeObraAtual
                        ?.colaboradores
                )
            ) {
                return snapshotMaoDeObraAtual
                    .colaboradores;
            }

            if (
                Array.isArray(
                    snapshotMaoDeObraAtual
                        ?.colaboradoresResolvidos
                )
            ) {
                return snapshotMaoDeObraAtual
                    .colaboradoresResolvidos;
            }

            return [];
        };

    const obterIdsRelacaoHistoricaSalva =
        () =>
            obterColaboradoresRelacaoHistoricaSalva()
                .map(
                    (colaborador) =>
                        String(
                            colaborador?.id ||
                            colaborador?.colaboradorId ||
                            colaborador?.colaborador_id ||
                            ""
                        ).trim()
                )
                .filter(Boolean);

    const abrirRevisaoRelacaoConfirmada =
        () => {
            if (
                !relacaoHistoricaManualConfirmada
            ) {
                return;
            }

            setRegularizacaoHistoricaSelecionados(
                obterIdsRelacaoHistoricaSalva()
            );

            setRegularizacaoHistoricaErro(
                ""
            );

            setRegularizacaoHistoricaAberta(
                true
            );
        };

    const restaurarRelacaoHistoricaSalva =
        () => {
            setRegularizacaoHistoricaSelecionados(
                obterIdsRelacaoHistoricaSalva()
            );

            setRegularizacaoHistoricaErro(
                ""
            );
        };


    const fecharRegularizacaoHistorica =
        () => {
            if (
                regularizacaoHistoricaSalvando
            ) {
                return;
            }

            setRegularizacaoHistoricaAberta(
                false
            );

            setRegularizacaoHistoricaErro(
                ""
            );
        };

    const alternarColaboradorRegularizacao =
        (colaboradorId) => {
            const id =
                String(
                    colaboradorId ||
                    ""
                ).trim();

            if (!id) {
                return;
            }

            setRegularizacaoHistoricaSelecionados(
                (idsAtuais) =>
                    idsAtuais.includes(
                        id
                    )
                        ? idsAtuais.filter(
                            (item) =>
                                item !== id
                        )
                        : [
                            ...idsAtuais,
                            id,
                        ]
            );
        };

    const restaurarPreSelecaoRegularizacao =
        () => {
            setRegularizacaoHistoricaSelecionados(
                idsPreSelecionadosRegularizacao
            );

            setRegularizacaoHistoricaErro(
                ""
            );
        };

    const limparSelecaoRegularizacao =
        () => {
            setRegularizacaoHistoricaSelecionados(
                []
            );

            setRegularizacaoHistoricaErro(
                ""
            );
        };

    const confirmarRegularizacaoHistorica =
        async () => {
            if (
                regularizacaoHistoricaSalvando
            ) {
                return;
            }

            const usuarioConfirmacaoId =
                String(
                    usuario?.id ||
                    ""
                ).trim();

            if (
                !empresaSelecionada?.id ||
                !usuarioConfirmacaoId ||
                !chaveSnapshotMaoDeObra
            ) {
                setRegularizacaoHistoricaErro(
                    "Não foi possível identificar a empresa ou o usuário responsável pela confirmação."
                );

                return;
            }

            if (
                !cicloMensal?.pronto ||
                typeof cicloMensal
                    ?.consolidarRelacaoEmpregados !==
                    "function"
            ) {
                setRegularizacaoHistoricaErro(
                    "Aguarde o carregamento da competência antes de confirmar a relação histórica."
                );

                return;
            }

            const idsSelecionados =
                new Set(
                    (
                        Array.isArray(
                            regularizacaoHistoricaSelecionados
                        )
                            ? regularizacaoHistoricaSelecionados
                            : []
                    )
                        .map(
                            (id) =>
                                String(
                                    id ||
                                    ""
                                ).trim()
                        )
                        .filter(Boolean)
                );

            const colaboradoresSelecionados =
                colaboradoresEmpresaRegularizacao
                    .filter(
                        (colaborador) =>
                            idsSelecionados.has(
                                String(
                                    colaborador?.id ||
                                    ""
                                ).trim()
                            )
                    );

            if (
                colaboradoresSelecionados.length !==
                idsSelecionados.size
            ) {
                setRegularizacaoHistoricaErro(
                    "A seleção histórica mudou. Feche a revisão, abra novamente e confira os colaboradores."
                );

                return;
            }

            if (
                relacaoHistoricaManualConfirmada
            ) {
                const totalAnterior =
                    obterColaboradoresRelacaoHistoricaSalva()
                        .length;

                const totalNovo =
                    colaboradoresSelecionados
                        .length;

                const confirmarAlteracao =
                    window.confirm(
                        `Você está alterando uma Relação de Empregados histórica já confirmada.

Total anteriormente salvo: ${totalAnterior}
Novo total selecionado: ${totalNovo}

A alteração substituirá somente o Item 14 desta competência.
A confirmação anterior permanecerá registrada na auditoria.

Deseja salvar as alterações?`
                    );

                if (!confirmarAlteracao) {
                    return;
                }
            }

            if (
                colaboradoresSelecionados.length ===
                0
            ) {
                const confirmarSemColaboradores =
                    window.confirm(
                        "Você está confirmando que não havia colaboradores vinculados a esta empresa nesta competência. Deseja continuar?"
                    );

                if (
                    !confirmarSemColaboradores
                ) {
                    return;
                }
            }

            setRegularizacaoHistoricaSalvando(
                true
            );

            setRegularizacaoHistoricaErro(
                ""
            );

            try {
                const snapshotConfirmado =
                    criarSnapshotMaoDeObraCertidaoMensal({
                        competencia,
                        empresaId:
                            empresaSelecionada.id,
                        colaboradoresResolvidos:
                            colaboradoresSelecionados,
                        origemDados:
                            "confirmacao_manual",
                        confirmadoPorUsuario:
                            true,
                        usuarioConfirmacaoId,
                    });

                if (
                    snapshotConfirmado
                        ?.statusSnapshot !==
                        "confirmado" ||
                    snapshotConfirmado
                        ?.confirmadoPorUsuario !==
                        true ||
                    snapshotConfirmado
                        ?.requerConfirmacaoHumana !==
                        false
                ) {
                    throw new Error(
                        "O snapshot histórico não atingiu o estado confirmado esperado."
                    );
                }

                const evidenciaOcupacionalConfirmada =
                    recalcularEvidenciaOcupacionalComSnapshotMaoDeObra({
                        evidenciaInterna,
                        snapshotMaoDeObra:
                            snapshotConfirmado,
                        colaboradores,
                    });

                const snapshotAsoPcmso =
                    criarSnapshotAsoPcmsoAPartirDaEvidenciaInterna({
                        competencia,
                        empresaId:
                            empresaSelecionada.id,
                        evidenciaInterna:
                            evidenciaOcupacionalConfirmada,
                    });

                const itensAutomaticos =
                    montarItensAutomaticosCertidaoMensal({
                        snapshotMaoDeObra:
                            snapshotConfirmado,
                        snapshotAsoPcmso,
                    });

                await cicloMensal
                    .consolidarItensAutomaticos(
                        itensAutomaticos
                    );

                setSnapshotsMaoDeObraConfirmados(
                    (estadoAtual) => ({
                        ...estadoAtual,
                        [chaveSnapshotMaoDeObra]:
                            snapshotConfirmado,
                    })
                );

                setRegularizacaoHistoricaErro(
                    ""
                );

                setRegularizacaoHistoricaAberta(
                    false
                );
            }
            catch (erro) {
                console.error(
                    "[Certidões Mensais] Falha ao confirmar a Relação de Empregados histórica.",
                    erro
                );

                setRegularizacaoHistoricaErro(
                    String(
                        erro?.message ||
                        "Não foi possível salvar a Relação de Empregados histórica."
                    )
                );
            }
            finally {
                setRegularizacaoHistoricaSalvando(
                    false
                );
            }
        };


    const confirmarSnapshotMaoDeObra =
        async () => {
            if (
                !chaveSnapshotMaoDeObra ||
                !empresaSelecionada?.id ||
                !evidenciaInterna ||
                !snapshotMaoDeObraRascunho ||
                !usuario?.id
            ) {
                return;
            }

            if (
                !cicloMensal?.pronto ||
                typeof cicloMensal
                    ?.consolidarItensAutomaticos !==
                    "function"
            ) {
                if (
                    typeof window !==
                    "undefined"
                ) {
                    window.alert(
                        "Aguarde o carregamento da competência antes de confirmar a relação mensal."
                    );
                }

                return;
            }

            if (
                regularizacaoHistoricaNecessaria
            ) {
                setRegularizacaoHistoricaSelecionados(
                    idsPreSelecionadosRegularizacao
                );

                setRegularizacaoHistoricaErro(
                    ""
                );

                setRegularizacaoHistoricaAberta(
                    true
                );

                return;
            }

            try {
                const snapshotConfirmado =
                    criarSnapshotMaoDeObraAPartirDaEvidenciaInterna({
                        competencia,
                        empresaId:
                            empresaSelecionada.id,
                        evidenciaInterna,
                        confirmar:
                            true,
                        usuarioId:
                            usuario.id,
                    });

                const snapshotAsoPcmso =
                    criarSnapshotAsoPcmsoAPartirDaEvidenciaInterna({
                        competencia,
                        empresaId:
                            empresaSelecionada.id,
                        evidenciaInterna:
                            evidenciaOcupacional ||
                            evidenciaInterna,
                    });

                const itensAutomaticos =
                    montarItensAutomaticosCertidaoMensal({
                        snapshotMaoDeObra:
                            snapshotConfirmado,
                        snapshotAsoPcmso,
                    });

                await cicloMensal
                    .consolidarItensAutomaticos(
                        itensAutomaticos
                    );

                setSnapshotsMaoDeObraConfirmados(
                    (estadoAtual) => ({
                        ...estadoAtual,
                        [chaveSnapshotMaoDeObra]:
                            snapshotConfirmado,
                    })
                );
            }
            catch (erro) {
                console.error(
                    "[Certidões Mensais] Falha ao persistir os itens automáticos 14 e 15.",
                    erro
                );

                if (
                    typeof window !==
                    "undefined"
                ) {
                    window.alert(
                        String(
                            erro?.message ||
                            "Não foi possível salvar a confirmação mensal."
                        )
                    );
                }
            }
        };

    const documentosCompetencia = useMemo(() => {
        const formatarData =
            (valor = "") => {
                const partes =
                    String(valor)
                        .slice(0, 10)
                        .split("-");

                return partes.length === 3
                    ? `${partes[2]}/${partes[1]}/${partes[0]}`
                    : "Não informada";
            };

        const aplicarDocumentoPersistido =
            (documento) => {
                const documentoPersistido =
                    documentosPersistidosAtuais[
                        documento.id
                    ];

                const ehEsocial =
                    documento.id ===
                    "esocial";

                const itemAplicabilidade =
                    ehEsocial
                        ? aplicabilidadeEsocialAtual.item
                        : null;

                const metadadosAplicabilidade =
                    ehEsocial
                        ? {
                            aplicabilidade:
                                String(
                                    itemAplicabilidade
                                        ?.aplicabilidade ||
                                    "PENDENTE_DEFINICAO"
                                )
                                    .trim()
                                    .toUpperCase(),

                            aplicabilidadeMotivo:
                                String(
                                    itemAplicabilidade
                                        ?.aplicabilidade_motivo ||
                                    ""
                                ).trim(),

                            aplicabilidadeItemId:
                                String(
                                    itemAplicabilidade
                                        ?.id ||
                                    ""
                                ).trim(),

                            aplicabilidadeSuportada:
                                Boolean(
                                    itemAplicabilidade
                                        ?.id
                                ) &&
                                aplicabilidadeEsocialAtual
                                    .suporteAplicabilidade ===
                                    true,

                            aplicabilidadeErro:
                                String(
                                    aplicabilidadeEsocialAtual
                                        .erro ||
                                    ""
                                ).trim(),
                        }
                        : {};

                if (
                    !documentoPersistido?.versao
                ) {
                    return ehEsocial
                        ? {
                            ...documento,
                            ...metadadosAplicabilidade,
                        }
                        : documento;
                }

                const versao =
                    documentoPersistido.versao;

                const item =
                    documentoPersistido.item || {};

                const diagnosticoPersistido =
                    (
                        versao?.diagnostico &&
                        typeof versao.diagnostico === "object"
                    )
                        ? versao.diagnostico
                        : {};

                /*
                 * SAFESCAN-ISSQN-D7-REAVALIACAO-VISUAL
                 *
                 * O diagnóstico original salvo no banco permanece
                 * preservado. Para ISSQN, quando o texto extraído
                 * da versão continua disponível, o avaliador atual
                 * é reaplicado somente em memória para a interface.
                 *
                 * Nenhum UPDATE, INSERT, RPC, upload, nova versão
                 * ou alteração de status é realizado neste bloco.
                 */
                const leituraPersistida =
                    (
                        diagnosticoPersistido?.leitura &&
                        typeof diagnosticoPersistido.leitura === "object"
                    )
                        ? diagnosticoPersistido.leitura
                        : {};

                const textoExtraidoPersistido =
                    String(
                        leituraPersistida?.textoExtraido ||
                        leituraPersistida?.textoPrevia ||
                        ""
                    ).trim();

                const preAvaliacaoIssqnAtual =
                    (
                        documento.id === "iss" &&
                        textoExtraidoPersistido
                    )
                        ? executarPreAvaliacaoDocumental({
                            textoExtraido:
                                textoExtraidoPersistido,
                            documentoEsperado:
                                documento,
                            empresaEsperada:
                                empresaSelecionada ||
                                null,
                            dataReferencia:
                                new Date(
                                    obterDataReferenciaCertidaoMensal(
                                        competencia
                                    ) +
                                    "T12:00:00.000Z"
                                ),
                        })
                        : null;

                const avaliacao =
                    preAvaliacaoIssqnAtual?.avaliacao ||
                    diagnosticoPersistido?.avaliacao ||
                    {};

                const dadosTemporais =
                    avaliacao.dadosTemporais || {};

                const dadosFgts =
                    avaliacao.dadosFgts || {};

                const dadosFolhaPonto =
                    avaliacao.dadosFolhaPonto || {};

                const dadosInssDctfweb =
                    avaliacao.dadosInssDctfweb || {};

                const situacaoValidade =
                    dadosTemporais
                        .situacaoValidade || {};

                /*
                 * Para documentos com política de validade, o mês
                 * permanece coberto quando a validade alcança pelo
                 * menos um dia da competência.
                 *
                 * Exemplo:
                 * validade até 22/03/2026 cobre MAR/2026 e passa a
                 * ser considerada vencida somente a partir de ABR/2026.
                 *
                 * O diagnóstico original permanece preservado.
                 */
                const dataReferenciaCompetencia =
                    obterDataReferenciaCertidaoMensal(
                        competencia
                    );

                const dataInicioCompetencia =
                    /^\d{4}-\d{2}-\d{2}$/.test(
                        dataReferenciaCompetencia
                    )
                        ? (
                            dataReferenciaCompetencia
                                .slice(
                                    0,
                                    7
                                ) +
                            "-01"
                        )
                        : "";

                const dataValidadeIso =
                    String(
                        dadosTemporais
                            .dataValidadeIso ||
                        ""
                    )
                        .trim()
                        .slice(
                            0,
                            10
                        );

                const validadeComparavel =
                    /^\d{4}-\d{2}-\d{2}$/.test(
                        dataInicioCompetencia
                    ) &&
                    /^\d{4}-\d{2}-\d{2}$/.test(
                        dataValidadeIso
                    );

                const documentoVencidoNaCompetencia =
                    validadeComparavel
                        ? (
                            dataValidadeIso <
                            dataInicioCompetencia
                        )
                        : null;

                const resolucaoCompetencia =
                    documentoPersistido
                        .resolucaoCompetencia ||
                    null;

                const statusResolvido =
                    String(
                        resolucaoCompetencia
                            ?.status ||
                        ""
                    ).toUpperCase();

                const statusBanco =
                    String(
                        item.status ||
                        versao.status_resultado ||
                        ""
                    ).toUpperCase();

                const statusEfetivo =
                    statusResolvido ||
                    statusBanco;

                const documentoHerdado =
                    Boolean(
                        documentoPersistido
                            ?.herdado ||
                        resolucaoCompetencia
                            ?.herdado
                    );

                /*
                 * A resolução da competência representa o estado
                 * documental efetivo para cobertura histórica.
                 *
                 * Para documento da própria competência, porém,
                 * a decisão humana deve refletir primeiro o status
                 * realmente persistido no item.
                 */
                const documentoRegidoPorValidade =
                    CERTIDAO_MENSAL_DOCUMENTOS
                        .some(
                            (definicaoDocumento) =>
                                definicaoDocumento
                                    .tipoDocumento ===
                                    documento.id &&
                                definicaoDocumento
                                    .politica ===
                                    CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
                                        .VALIDADE
                        );

                const reenvioResolvidoPorValidade =
                    documentoRegidoPorValidade &&
                    statusBanco ===
                        "REENVIO_SOLICITADO" &&
                    [
                        "CONFORME",
                        "VENCIDO",
                    ].includes(
                        statusResolvido
                    );

                const statusDecisaoHumana =
                    (
                        documentoHerdado ||
                        reenvioResolvidoPorValidade
                    )
                        ? (
                            statusResolvido ||
                            statusBanco
                        )
                        : (
                            statusBanco ||
                            statusResolvido
                        );

                const documentoVencido =
                    documentoVencidoNaCompetencia !==
                        null
                        ? documentoVencidoNaCompetencia
                        : resolucaoCompetencia
                            ? (
                                statusDecisaoHumana ===
                                "VENCIDO"
                            )
                            : Boolean(
                                avaliacao.codigo ===
                                    "DOCUMENTO_VENCIDO" ||
                                situacaoValidade.vencida ===
                                    true ||
                                statusBanco ===
                                    "VENCIDO"
                            );

                const documentoConfirmado =
                    [
                        "CONFIRMADO",
                        "CONFORME",
                        "APROVADO",
                    ].includes(
                        statusDecisaoHumana
                    );

                const reenvioSolicitado =
                    statusDecisaoHumana ===
                    "REENVIO_SOLICITADO";

                const competenciaOrigem =
                    String(
                        documentoPersistido
                            ?.competenciaOrigem
                            ?.competencia ||
                        resolucaoCompetencia
                            ?.competenciaOrigem ||
                        ""
                    );

                const competenciaOrigemFormatada =
                    /^\d{4}-\d{2}/
                        .test(
                            competenciaOrigem
                        )
                        ? (
                            competenciaOrigem
                                .slice(
                                    5,
                                    7
                                ) +
                            "/" +
                            competenciaOrigem
                                .slice(
                                    0,
                                    4
                                )
                        )
                        : competenciaOrigem;

                const statusVisual =
                    documentoVencido
                        ? "vencido"
                        : reenvioSolicitado
                            ? "reenvioSolicitado"
                            : documentoConfirmado
                                ? "confirmado"
                                : "emAnalise";

                const numeroVersao =
                    Number(
                        versao.numero_versao ||
                        1
                    );

                const totalPaginas =
                    Math.max(
                        Number(
                            versao.total_paginas ||
                            1
                        ),
                        1
                    );

                const arquivoNome =
                    String(
                        versao.nome_original ||
                        "Documento salvo.pdf"
                    );

                const regrasOriginais =
                    Array.isArray(
                        avaliacao.regras
                    )
                        ? avaliacao.regras
                        : [];

                const regras =
                    regrasOriginais.length
                        ? regrasOriginais.map(
                            (regra) => {
                                let statusRegra =
                                    String(
                                        regra.status ||
                                        ""
                                    ).toUpperCase();

                                let mensagemRegra =
                                    String(
                                        regra.mensagem ||
                                        "Regra documental avaliada."
                                    );

                                const codigoRegra =
                                    String(
                                        regra.codigo ||
                                        ""
                                    ).toUpperCase();

                                const dataEmissaoRegra =
                                    dadosTemporais
                                        .dataEmissaoIso ||
                                    dadosTemporais
                                        .dataEmissao ||
                                    "";

                                const dataValidadeRegra =
                                    dadosTemporais
                                        .dataValidadeIso ||
                                    dadosTemporais
                                        .dataValidade ||
                                    "";

                                const regraEhValidade =
                                    [
                                        "VALIDADE_DOCUMENTO",
                                        "VALIDADE_DOCUMENTAL",
                                    ].includes(
                                        codigoRegra
                                    );

                                if (
                                    regraEhValidade &&
                                    documentoVencidoNaCompetencia ===
                                        false &&
                                    dataValidadeRegra
                                ) {
                                    statusRegra =
                                        "APROVADA";

                                    mensagemRegra =
                                        (
                                            "Documento válido na data de referência da competência, " +
                                            "com validade até " +
                                            formatarData(
                                                dataValidadeRegra
                                            ) +
                                            "."
                                        );
                                }
                                else if (
                                    statusResolvido ===
                                        "CONFORME" &&
                                    codigoRegra ===
                                        "VALIDADE_DOCUMENTO" &&
                                    dataEmissaoRegra &&
                                    dataValidadeRegra
                                ) {
                                    statusRegra =
                                        "APROVADA";

                                    mensagemRegra =
                                        (
                                            "Documento cobre a competência " +
                                            competencia +
                                            " pelo período de " +
                                            formatarData(
                                                dataEmissaoRegra
                                            ) +
                                            " a " +
                                            formatarData(
                                                dataValidadeRegra
                                            ) +
                                            "."
                                        );
                                }

                                
                                /*
                                 * SAFESCAN-ISSQN-D8-CONFERENCIA-HUMANA-CONCLUIDA
                                 *
                                 * A regra automática continua exigindo conferência
                                 * humana antes da decisão. Depois que o documento
                                 * já foi confirmado pelo usuário, a interface passa
                                 * a refletir que essa conferência foi concluída.
                                 */
                                if (
                                    documento.id === "iss" &&
                                    documentoConfirmado &&
                                    statusRegra !== "APROVADA" &&
                                    codigoRegra ===
                                        "CONFERENCIA_FISCAL_MUNICIPAL"
                                ) {
                                    statusRegra =
                                        "APROVADA";

                                    mensagemRegra =
                                        "Conferência fiscal municipal concluída por decisão humana registrada.";
                                }
return {
                                    texto:
                                        (
                                            regra.titulo
                                                ? (
                                                    regra.titulo +
                                                    ": "
                                                )
                                                : ""
                                        ) +
                                        mensagemRegra,
                                    resultado:
                                        statusRegra ===
                                        "APROVADA"
                                            ? "aprovada"
                                            : statusRegra ===
                                                "REPROVADA"
                                                ? "reprovada"
                                                : "alerta",
                                };
                            }
                        )
                        : [
                            {
                                texto:
                                    "Documento armazenado e aguardando conferência humana.",
                                resultado:
                                    "alerta",
                            },
                        ];

                const camposExtraidos = [
                    {
                        rotulo:
                            "Empresa",
                        valor:
                            avaliacao
                                .razaoSocialDocumento ||
                            empresaSelecionada
                                ?.nome ||
                            "Não localizada",
                    },
                    {
                        rotulo:
                            "CNPJ",
                        valor:
                            avaliacao
                                .cnpjDocumento ||
                            empresaSelecionada
                                ?.cnpj ||
                            "Não localizado",
                    },
                    {
                        rotulo:
                            documento.id ===
                                "fgts"
                                ? "Competência / Geração da guia"
                                : documento.id ===
                                    "folha-ponto"
                                    ? "Período apurado"
                                    : documento.id ===
                                        "inss-dctfweb"
                                        ? "Período de apuração"
                                        : "Emissão",
                        valor:
                            documento.id ===
                                "fgts"
                                ? (
                                    (
                                        dadosFgts
                                            .competencia ||
                                        "Competência não localizada"
                                    ) +
                                    " / " +
                                    (
                                        dadosFgts
                                            .dataGeracao ||
                                        dadosTemporais
                                            .dataEmissao ||
                                        "data não localizada"
                                    )
                                )
                                : documento.id ===
                                    "folha-ponto"
                                    ? (
                                        dadosFolhaPonto
                                            .periodoApurado ||
                                        "Não localizado"
                                    )
                                    : documento.id ===
                                        "inss-dctfweb"
                                        ? (
                                            dadosInssDctfweb
                                                .competencia ||
                                            avaliacao
                                                .competenciaDocumento ||
                                            "Não localizado"
                                        )
                                        : (
                                            dadosTemporais
                                                .dataEmissao ||
                                            "Não localizada"
                                        ),
                    },
                    {
                        rotulo:
                            documento.id ===
                                "fgts"
                                ? "Vencimento"
                                : "Validade",
                        valor:
                            documento.id ===
                                "fgts"
                                ? (
                                    dadosFgts
                                        .vencimento ||
                                    dadosTemporais
                                        .dataValidade ||
                                    "Não localizado"
                                )
                                : (
                                    dadosTemporais
                                        .dataValidade ||
                                    "Não localizada"
                                ),
                    },
                    {
                        rotulo:
                            "Código de controle",
                        valor:
                            avaliacao
                                .codigoControle ||
                            "Não localizado",
                    },
                    {
                        rotulo:
                            "Situação",
                        valor:
                            avaliacao
                                .mensagem ||
                            (
                                documentoVencido
                                    ? "Documento vencido"
                                    : "Aguardando conferência"
                            ),
                    },
                ];

                return {
                    ...documento,
                    temEvidencia:
                        true,
                    status:
                        statusVisual,
                    documentoVencido,
                    documentoHerdado,
                    origemResolucao:
                        resolucaoCompetencia
                            ?.origemResolucao ||
                        "",
                    acaoLabel:
                        "Atualizar",
                    detalhePrincipal:
                        documentoHerdado &&
                        documentoConfirmado
                            ? (
                                "Documento válido para esta competência" +
                                (
                                    competenciaOrigemFormatada
                                        ? (
                                            " · origem " +
                                            competenciaOrigemFormatada
                                        )
                                        : ""
                                )
                            )
                            : reenvioSolicitado
                                ? "Reenvio solicitado · aguardando documento atualizado"
                                : documentoVencido
                                    ? (
                                        "Documento salvo · validade vencida" +
                                        (
                                            dadosTemporais
                                                .dataValidade
                                                ? (
                                                    " em " +
                                                    dadosTemporais
                                                        .dataValidade
                                                )
                                                : ""
                                        )
                                    )
                                    : "Documento salvo no sistema",
                    detalheSecundario:
                        (
                            "Versão " +
                            numeroVersao +
                            " · " +
                            arquivoNome
                        ),
                    arquivoNome,
                    pagina:
                        (
                            "1 / " +
                            totalPaginas
                        ),
                    zoom:
                        "100%",
                    documentoOficialTitulo:
                        avaliacao
                            .documentoIdentificado ||
                        documento.titulo,
                    camposExtraidos,
                    regras,
                    urlArquivo:
                        documentoPersistido
                            .urlAssinada ||
                        "",
                    ...metadadosAplicabilidade,
                    documentoPersistido,
                };
            };

        if (!evidenciaInterna) {
            return perfilDocumentalCompetencia.documentos
                .map(
                    aplicarDocumentoPersistido
                );
        }

        const {
            historicoConfiavel,
            motivoHistorico,
            historicoRelacaoConfiavel,
            motivoHistoricoRelacao,
            dataReferencia,
            totalAtivos,
            totalRelacaoCompetencia,
            asosValidos,
            asosPendentes,
            pcmso,
            validadePcmso,
            pcmsoVigente,
        } = evidenciaInterna;

        return perfilDocumentalCompetencia.documentos.map(
            (documento) => {
                if (
                    documento.id ===
                    "relacao-empregados"
                ) {
                    const historicoRelacaoConfiavelEfetivo =
                        historicoRelacaoConfiavel ===
                        true;

                    const motivoHistoricoRelacaoEfetivo =
                        String(
                            motivoHistoricoRelacao ||
                            motivoHistorico ||
                            ""
                        );

                    const totalRelacaoEmpregados =
                        Number(
                            totalRelacaoCompetencia ??
                            totalAtivos ??
                            0
                        );
                    const snapshotHistoricoConfirmadoManualmente =
                        Boolean(
                            snapshotMaoDeObraAtual
                                ?.statusSnapshot ===
                                "confirmado" &&
                            snapshotMaoDeObraAtual
                                ?.origemDados ===
                                "confirmacao_manual" &&
                            snapshotMaoDeObraAtual
                                ?.confirmadoPorUsuario ===
                                true &&
                            snapshotMaoDeObraAtual
                                ?.requerConfirmacaoHumana ===
                                false
                        );

                    if (
                        snapshotHistoricoConfirmadoManualmente
                    ) {
                        const totalHistoricoConfirmado =
                            Number(
                                snapshotMaoDeObraAtual
                                    ?.totalColaboradores ??
                                snapshotMaoDeObraAtual
                                    ?.colaboradores?.length ??
                                0
                            );

                        return {
                            ...documento,
                            snapshotMaoDeObra:
                                snapshotMaoDeObraAtual,
                            status:
                                "confirmado",
                            detalhePrincipal:
                                `Relação histórica confirmada: ${totalHistoricoConfirmado} colaborador(es)`,
                            detalheSecundario:
                                "Composição confirmada manualmente para esta competência.",
                            resumoItens: [
                                {
                                    rotulo:
                                        "Ativos",
                                    valor:
                                        String(
                                            totalHistoricoConfirmado
                                        ),
                                    tom:
                                        "info",
                                },
                                {
                                    rotulo:
                                        "Situação",
                                    valor:
                                        "Confirmada",
                                    tom:
                                        "sucesso",
                                },
                                {
                                    rotulo:
                                        "Referência",
                                    valor:
                                        formatarData(
                                            snapshotMaoDeObraAtual
                                                ?.dataReferencia ||
                                            dataReferencia
                                        ),
                                    tom:
                                        "neutro",
                                },
                            ],
                            camposExtraidos: [
                                {
                                    rotulo:
                                        "Empresa",
                                    valor:
                                        empresaSelecionada
                                            ?.nome ||
                                        "",
                                },
                                {
                                    rotulo:
                                        "Competência",
                                    valor:
                                        competencia,
                                },
                                {
                                    rotulo:
                                        "Colaboradores ativos",
                                    valor:
                                        String(
                                            totalHistoricoConfirmado
                                        ),
                                },
                                {
                                    rotulo:
                                        "Origem",
                                    valor:
                                        "Confirmação manual",
                                },
                            ],
                        };
                    }



                    if (!historicoRelacaoConfiavelEfetivo) {
                        return {
                            ...documento,
                            snapshotMaoDeObra:
                                snapshotMaoDeObraAtual,
                            status:
                                snapshotMaoDeObraAtual
                                    ?.statusSnapshot ===
                                "confirmado"
                                    ? "confirmado"
                                    : "pendente",
                            detalhePrincipal:
                                "Histórico insuficiente — requer confirmação",
                            detalheSecundario:
                                motivoHistoricoRelacaoEfetivo,
                            resumoItens: [
                                {
                                    rotulo: "Competência",
                                    valor:
                                        competencia,
                                    tom: "alerta",
                                },
                                {
                                    rotulo: "Prévia da competência",
                                    valor:
                                        String(totalRelacaoEmpregados),
                                    detalhe: "requer confirmação humana",
                                    tom: "neutro",
                                },
                                {
                                    rotulo: "Referência",
                                    valor:
                                        formatarData(
                                            dataReferencia
                                        ),
                                    tom: "neutro",
                                },
                            ],
                            camposExtraidos: [
                                {
                                    rotulo: "Empresa",
                                    valor:
                                        empresaSelecionada?.nome || "",
                                },
                                {
                                    rotulo: "Competência",
                                    valor:
                                        competencia,
                                },
                                {
                                    rotulo: "Situação",
                                    valor: "Histórico requer confirmação",
                                },
                                {
                                    rotulo: "Base disponível",
                                    valor: `${totalRelacaoEmpregados} colaborador(es) sugerido(s) para a competência`,
                                },
                            ],
                        };
                    }

                    return {
                        ...documento,
                        snapshotMaoDeObra:
                            snapshotMaoDeObraAtual,
                        status:
                            snapshotMaoDeObraAtual
                                ?.statusSnapshot ===
                            "confirmado"
                                ? "confirmado"
                                : totalRelacaoEmpregados
                                    ? "emAnalise"
                                    : "pendente",
                        detalhePrincipal:
                            `Total: ${totalRelacaoEmpregados} colaborador(es) ativo(s)`,
                        detalheSecundario:
                            "Consolidado automaticamente pelo cadastro",
                        resumoItens: [
                            {
                                rotulo: "Ativos",
                                valor:
                                    String(totalRelacaoEmpregados),
                                tom:
                                    totalRelacaoEmpregados
                                        ? "info"
                                        : "neutro",
                            },
                            {
                                rotulo: "Situação",
                                valor:
                                    totalRelacaoEmpregados
                                        ? "Consolidada"
                                        : "Sem ativos",
                                tom:
                                    totalRelacaoEmpregados
                                        ? "sucesso"
                                        : "neutro",
                            },
                            {
                                rotulo: "Referência",
                                valor:
                                    formatarData(
                                        dataReferencia
                                    ),
                                tom: "neutro",
                            },
                        ],
                        camposExtraidos: [
                            {
                                rotulo: "Empresa",
                                valor:
                                    empresaSelecionada?.nome || "",
                            },
                            {
                                rotulo: "Competência",
                                valor:
                                    competencia,
                            },
                            {
                                rotulo: "Colaboradores ativos",
                                valor:
                                    String(totalRelacaoEmpregados),
                            },
                            {
                                rotulo: "Origem",
                                valor: "Cadastro de colaboradores",
                            },
                        ],
                    };
                }

                if (
                    documento.id ===
                    "aso-pcmso"
                ) {
                    const evidenciaItem15 =
                        evidenciaOcupacional ||
                        evidenciaInterna;

                    const historicoConfiavelItem15 =
                        evidenciaItem15
                            ?.historicoConfiavel ===
                        true;

                    const motivoHistoricoItem15 =
                        String(
                            evidenciaItem15
                                ?.motivoHistorico ||
                            ""
                        );

                    const totalAtivosItem15 =
                        Number(
                            evidenciaItem15
                                ?.totalAtivos ??
                            0
                        );

                    const asosValidosItem15 =
                        Number(
                            evidenciaItem15
                                ?.asosValidos ??
                            0
                        );

                    const asosPendentesItem15 =
                        Number(
                            evidenciaItem15
                                ?.asosPendentes ??
                            Math.max(
                                totalAtivosItem15 -
                                asosValidosItem15,
                                0
                            )
                        );

                    const pcmsoItem15 =
                        evidenciaItem15
                            ?.pcmso ||
                        null;

                    const validadePcmsoItem15 =
                        evidenciaItem15
                            ?.validadePcmso ||
                        "";

                    const pcmsoVigenteItem15 =
                        evidenciaItem15
                            ?.pcmsoVigente ===
                        true;

                    const dataReferenciaItem15 =
                        evidenciaItem15
                            ?.dataReferencia ||
                        dataReferencia;

                    if (
                        !historicoConfiavelItem15
                    ) {
                        return {
                            ...documento,
                            status:
                                "pendente",
                            detalhePrincipal:
                                "Histórico insuficiente — requer confirmação",
                            detalheSecundario:
                                motivoHistoricoItem15,
                            resumoItens: [
                                {
                                    rotulo:
                                        "Competência",
                                    valor:
                                        competencia,
                                    tom:
                                        "alerta",
                                },
                                {
                                    rotulo:
                                        "ASOs na referência",
                                    valor:
                                        `${asosValidosItem15}/${totalAtivosItem15}`,
                                    detalhe:
                                        evidenciaItem15
                                            ?.origemUniversoOcupacional ===
                                        "snapshot_mao_de_obra_confirmado"
                                            ? "universo alinhado à relação confirmada"
                                            : "cálculo temporal; confirmação necessária",
                                    tom:
                                        "neutro",
                                },
                                {
                                    rotulo:
                                        "PCMSO na referência",
                                    valor:
                                        pcmsoVigenteItem15
                                            ? "Vigente"
                                            : "Pendente",
                                    detalhe:
                                        pcmsoItem15
                                            ? `até ${formatarData(validadePcmsoItem15)}`
                                            : "não localizado",
                                    tom:
                                        "neutro",
                                },
                            ],
                            camposExtraidos: [
                                {
                                    rotulo:
                                        "Situação",
                                    valor:
                                        "Histórico requer confirmação",
                                },
                                {
                                    rotulo:
                                        "Data de referência",
                                    valor:
                                        formatarData(
                                            dataReferenciaItem15
                                        ),
                                },
                                {
                                    rotulo:
                                        "Universo de colaboradores",
                                    valor:
                                        `${totalAtivosItem15} colaborador(es) da relação confirmada`,
                                },
                                {
                                    rotulo:
                                        "Origem disponível",
                                    valor:
                                        evidenciaItem15
                                            ?.origemUniversoOcupacional ===
                                        "snapshot_mao_de_obra_confirmado"
                                            ? "Relação de Empregados confirmada + documentos disponíveis"
                                            : "Cadastros, vínculo e documentos disponíveis",
                                },
                            ],
                        };
                    }

                    return {
                        ...documento,
                        status:
                            totalAtivosItem15 > 0 &&
                            asosValidosItem15 ===
                                totalAtivosItem15 &&
                            pcmsoVigenteItem15
                                ? "confirmado"
                                : "pendente",
                        detalhePrincipal:
                            `ASO válidos: ${asosValidosItem15}/${totalAtivosItem15} | PCMSO: ${pcmsoVigenteItem15 ? "Vigente" : "Pendente"}`,
                        detalheSecundario:
                            pcmsoItem15
                                ? `Validade PCMSO: ${formatarData(validadePcmsoItem15)}`
                                : "PCMSO não localizado para a empresa",
                        resumoItens: [
                            {
                                rotulo:
                                    "ASOs válidos",
                                valor:
                                    String(
                                        asosValidosItem15
                                    ),
                                detalhe:
                                    `de ${totalAtivosItem15} colaboradores`,
                                tom:
                                    asosPendentesItem15 ===
                                        0 &&
                                    totalAtivosItem15 > 0
                                        ? "sucesso"
                                        : "info",
                            },
                            {
                                rotulo:
                                    "ASOs pendentes",
                                valor:
                                    String(
                                        asosPendentesItem15
                                    ),
                                detalhe:
                                    asosPendentesItem15
                                        ? "requer regularização"
                                        : "nenhuma pendência",
                                tom:
                                    asosPendentesItem15
                                        ? "alerta"
                                        : "sucesso",
                            },
                            {
                                rotulo:
                                    "PCMSO",
                                valor:
                                    pcmsoVigenteItem15
                                        ? "Vigente"
                                        : "Pendente",
                                detalhe:
                                    pcmsoItem15
                                        ? `até ${formatarData(validadePcmsoItem15)}`
                                        : "não localizado",
                                tom:
                                    pcmsoVigenteItem15
                                        ? "sucesso"
                                        : "alerta",
                            },
                        ],
                        camposExtraidos: [
                            {
                                rotulo:
                                    "ASOs válidos",
                                valor:
                                    `${asosValidosItem15} de ${totalAtivosItem15}`,
                            },
                            {
                                rotulo:
                                    "PCMSO",
                                valor:
                                    pcmsoVigenteItem15
                                        ? "Vigente"
                                        : "Pendente",
                            },
                            {
                                rotulo:
                                    "Validade",
                                valor:
                                    pcmsoItem15
                                        ? formatarData(
                                            validadePcmsoItem15
                                        )
                                        : "Não localizada",
                            },
                            {
                                rotulo:
                                    "Referência",
                                valor:
                                    formatarData(
                                        dataReferenciaItem15
                                    ),
                            },
                            {
                                rotulo:
                                    "Origem",
                                valor:
                                    evidenciaItem15
                                        ?.origemUniversoOcupacional ===
                                    "snapshot_mao_de_obra_confirmado"
                                        ? "Relação de Empregados confirmada"
                                        : "Cadastros e documentos existentes",
                            },
                        ],
                    };
                }


                return aplicarDocumentoPersistido(
                    documento
                );
            }
        );
    }, [
        aplicabilidadeEsocialAtual,
        competencia,
        documentosPersistidosAtuais,
        evidenciaInterna,
        evidenciaOcupacional,
        empresaSelecionada,
        perfilDocumentalCompetencia,
        snapshotMaoDeObraAtual,
    ]);

    const definirAplicabilidadeEsocial =
        async (
            documento,
            aplicabilidade
        ) => {
            if (
                documento?.id !==
                "esocial"
            ) {
                return;
            }

            if (
                documento
                    ?.aplicabilidadeSuportada !==
                    true ||
                !documento
                    ?.aplicabilidadeItemId
            ) {
                if (
                    typeof window !==
                    "undefined"
                ) {
                    window.alert(
                        "A aplicabilidade ficará disponível após a migration candidata ser aplicada ao backend."
                    );
                }

                return;
            }

            const decisao =
                String(
                    aplicabilidade ||
                    ""
                )
                    .trim()
                    .toUpperCase();

            let motivo =
                "";

            if (
                decisao ===
                "NAO_APLICAVEL"
            ) {
                motivo =
                    typeof window !==
                        "undefined"
                        ? String(
                            window.prompt(
                                "Informe o motivo da não aplicabilidade do eSocial SST:"
                            ) ||
                            ""
                        ).trim()
                        : "";

                if (!motivo) {
                    return;
                }

                if (
                    motivo.length >
                    500
                ) {
                    window.alert(
                        "O motivo deve possuir no máximo 500 caracteres."
                    );

                    return;
                }
            }

            try {
                const resultado =
                    await definirAplicabilidadeEsocialCertidaoMensal({
                        clienteSupabase:
                            supabase,

                        itemId:
                            documento
                                .aplicabilidadeItemId,

                        aplicabilidade:
                            decisao,

                        motivo,
                    });

                setAplicabilidadeEsocialEstado(
                    (estadoAtual) => ({
                        ...estadoAtual,

                        chave:
                            chaveDocumentosPersistidos,

                        suporteAplicabilidade:
                            true,

                        erro:
                            "",

                        item: {
                            ...(estadoAtual.item || {}),

                            id:
                                resultado?.itemId ||
                                documento
                                    .aplicabilidadeItemId,

                            tipo_documento:
                                "esocial",

                            aplicabilidade:
                                resultado
                                    ?.aplicabilidade ||
                                decisao,

                            aplicabilidade_motivo:
                                resultado?.motivo ||
                                motivo ||
                                null,

                            aplicabilidade_definida_em:
                                resultado?.definidaEm ||
                                null,

                            aplicabilidade_definida_por:
                                resultado?.definidaPor ||
                                null,
                        },
                    })
                );
            }
            catch (erro) {
                if (
                    typeof window !==
                    "undefined"
                ) {
                    window.alert(
                        String(
                            erro?.message ||
                            "Não foi possível atualizar a aplicabilidade do eSocial SST."
                        )
                    );
                }
            }
        };

    const confirmarDocumentoPersistido =
        async (documento) => {
            if (
                documento?.exigido === false
            ) {
                throw new Error(
                    "Documento não exigido para este contrato. A confirmação está bloqueada."
                );
            }

            if (
                documento?.id ===
                    "esocial" &&
                String(
                    documento
                        ?.aplicabilidade ||
                    "PENDENTE_DEFINICAO"
                )
                    .trim()
                    .toUpperCase() !==
                    "APLICAVEL"
            ) {
                throw new Error(
                    "Defina o eSocial SST como aplicável antes da confirmação documental."
                );
            }

            const itemId =
                String(
                    documento
                        ?.documentoPersistido
                        ?.item
                        ?.id ||
                    ""
                ).trim();

            const versaoAtualId =
                String(
                    documento
                        ?.documentoPersistido
                        ?.item
                        ?.versao_atual_id ||
                    documento
                        ?.documentoPersistido
                        ?.item
                        ?.versaoAtualId ||
                    documento
                        ?.documentoPersistido
                        ?.versao
                        ?.id ||
                    ""
                ).trim();

            if (!itemId || !versaoAtualId) {
                throw new Error(
                    "Documento persistido sem item ou versão atual para confirmação."
                );
            }

            const itemPersistido =
                documento
                    ?.documentoPersistido
                    ?.item || {};

            const requerConsultaOficial =
                itemPersistido
                    ?.requer_consulta_oficial ===
                    true ||
                itemPersistido
                    ?.requerConsultaOficial ===
                    true;

            const statusConsultaOficialAtual =
                String(
                    itemPersistido
                        ?.status_consulta_oficial ||
                    itemPersistido
                        ?.statusConsultaOficial ||
                    ""
                )
                    .trim()
                    .toUpperCase();

            const confirmandoConsultaOficial =
                requerConsultaOficial &&
                statusConsultaOficialAtual ===
                    "PENDENTE";

            const resultado =
                await registrarDecisaoDocumentoCertidaoMensal({
                    itemId,
                    versaoAtualId,
                    decisao:
                        "CONFORME",
                    observacao:
                        confirmandoConsultaOficial
                            ? "Documento e autenticidade na fonte oficial confirmados na Conferência Assistida do SafeScan."
                            : "Documento confirmado na Conferência Assistida do SafeScan.",
                    decididoEm:
                        new Date().toISOString(),
                });

            setDocumentosPersistidosEstado(
                (estadoAtual) => {
                    if (
                        estadoAtual.chave !==
                        chaveDocumentosPersistidos
                    ) {
                        return estadoAtual;
                    }

                    const registroAtual =
                        estadoAtual.itens[
                            documento.id
                        ];

                    if (!registroAtual) {
                        return estadoAtual;
                    }

                    return {
                        ...estadoAtual,
                        itens: {
                            ...estadoAtual.itens,
                            [documento.id]: {
                                ...registroAtual,
                                item: {
                                    ...(registroAtual.item || {}),
                                    status:
                                        resultado
                                            ?.statusAtual ||
                                        "CONFORME",

                                    status_consulta_oficial:
                                        resultado
                                            ?.statusConsultaOficial ||
                                        registroAtual
                                            ?.item
                                            ?.status_consulta_oficial ||
                                        registroAtual
                                            ?.item
                                            ?.statusConsultaOficial ||
                                        "",
                                },
                                resolucaoCompetencia: {
                                    ...(
                                        registroAtual
                                            .resolucaoCompetencia ||
                                        {}
                                    ),
                                    status:
                                        resultado
                                            ?.statusAtual ||
                                        "CONFORME",
                                },
                            },
                        },
                    };
                }
            );

            return resultado;
        };

    const solicitarReenvioDocumentoPersistido =
        async (
            documento,
            motivo
        ) => {
            if (
                documento?.exigido === false
            ) {
                throw new Error(
                    "Documento não exigido para este contrato. A solicitação de reenvio está bloqueada."
                );
            }

            if (
                documento?.id ===
                    "esocial" &&
                String(
                    documento
                        ?.aplicabilidade ||
                    "PENDENTE_DEFINICAO"
                )
                    .trim()
                    .toUpperCase() !==
                    "APLICAVEL"
            ) {
                throw new Error(
                    "eSocial SST não aplicável ou ainda sem definição não deve gerar reenvio."
                );
            }

            const itemId =
                String(
                    documento
                        ?.documentoPersistido
                        ?.item
                        ?.id ||
                    ""
                ).trim();

            const versaoAtualId =
                String(
                    documento
                        ?.documentoPersistido
                        ?.item
                        ?.versao_atual_id ||
                    documento
                        ?.documentoPersistido
                        ?.item
                        ?.versaoAtualId ||
                    documento
                        ?.documentoPersistido
                        ?.versao
                        ?.id ||
                    ""
                ).trim();

            const motivoNormalizado =
                String(
                    motivo || ""
                ).trim();

            if (!itemId || !versaoAtualId) {
                throw new Error(
                    "Documento persistido sem item ou versão atual para solicitação de reenvio."
                );
            }

            if (!motivoNormalizado) {
                throw new Error(
                    "Informe o motivo da solicitação de reenvio."
                );
            }

            const resultado =
                await registrarDecisaoDocumentoCertidaoMensal({
                    itemId,
                    versaoAtualId,
                    decisao:
                        "REENVIO_SOLICITADO",
                    motivo:
                        motivoNormalizado,
                    observacao:
                        "Atualização documental solicitada pela Conferência Assistida do SafeScan.",
                    decididoEm:
                        new Date().toISOString(),
                });

            setDocumentosPersistidosEstado(
                (estadoAtual) => {
                    if (
                        estadoAtual.chave !==
                        chaveDocumentosPersistidos
                    ) {
                        return estadoAtual;
                    }

                    const registroAtual =
                        estadoAtual.itens[
                            documento.id
                        ];

                    if (!registroAtual) {
                        return estadoAtual;
                    }

                    return {
                        ...estadoAtual,
                        itens: {
                            ...estadoAtual.itens,
                            [documento.id]: {
                                ...registroAtual,
                                item: {
                                    ...(registroAtual.item || {}),
                                    status:
                                        resultado
                                            ?.statusAtual ||
                                        "REENVIO_SOLICITADO",
                                },
                                resolucaoCompetencia: {
                                    ...(
                                        registroAtual
                                            .resolucaoCompetencia ||
                                        {}
                                    ),
                                    status:
                                        resultado
                                            ?.statusAtual ||
                                        "REENVIO_SOLICITADO",
                                },
                            },
                        },
                    };
                }
            );

            return resultado;
        };

    const documentosVisiveisCompetencia =
        documentosCompetencia.filter(
            (documento) =>
                documento?.exigido !== false
        );

    const documentoSelecionadoDireto =
        documentosVisiveisCompetencia.find(
            (documento) =>
                documento.id === documentoSelecionadoId
        );

    const indiceDocumentoSelecionado =
        documentosCompetencia.findIndex(
            (documento) =>
                documento.id === documentoSelecionadoId
        );

    const documentoVisivelSeguinte =
        indiceDocumentoSelecionado >= 0
            ? documentosCompetencia
                .slice(
                    indiceDocumentoSelecionado + 1
                )
                .find(
                    (documento) =>
                        documento?.exigido !== false
                )
            : null;

    const documentoVisivelAnterior =
        indiceDocumentoSelecionado >= 0
            ? documentosCompetencia
                .slice(
                    0,
                    indiceDocumentoSelecionado
                )
                .reverse()
                .find(
                    (documento) =>
                        documento?.exigido !== false
                )
            : null;

    const documentoSelecionado =
        documentoSelecionadoDireto ||
        documentoVisivelSeguinte ||
        documentoVisivelAnterior ||
        documentosVisiveisCompetencia[0] ||
        null;

    useEffect(() => {
        const documentoVisivelId =
            String(
                documentoSelecionado?.id ||
                ""
            ).trim();

        if (
            !documentoVisivelId ||
            documentoVisivelId ===
                documentoSelecionadoId
        ) {
            return;
        }

        setDocumentoSelecionadoId(
            documentoVisivelId
        );
    }, [
        documentoSelecionado?.id,
        documentoSelecionadoId,
    ]);

    const imprimirRelatorioEmpresa =
        async () => {
            try {
                const {
                    imprimirRelatorioCertidaoMensal,
                } = await import(
                    "../services/certidaoMensalRelatorioService.js"
                );


                const {
                    agruparRelatorioAnualPorObras,
                } = await import(
                    "../services/certidaoMensalRelatorioAnualObrasService.js"
                );


                /*
                 * SAFESCAN J.49-P4-R1 - CONTRATANTE MENSAL
                 *
                 * A contratante é resolvida pela mesma regra
                 * já utilizada pelo relatório anual.
                 */
                const empresasBancoRelatorioMensal =
                    (
                        Array.isArray(
                            empresasBanco
                        )
                            ? empresasBanco
                            : []
                    ).map(
                        (empresaBanco) => {
                            const logoInformado =
                                empresaBanco?.logoUrl ||
                                empresaBanco?.logoURL ||
                                empresaBanco?.logo_url ||
                                "";

                            const logoPublico =
                                /^https?:\/\//i.test(
                                    String(
                                        logoInformado
                                    )
                                );

                            return {
                                ...empresaBanco,

                                logoUrl:
                                    logoInformado
                                        ? (
                                            logoPublico
                                                ? logoInformado
                                                : obterUrlLogoEmpresa(
                                                    logoInformado
                                                )
                                        )
                                        : "",
                            };
                        }
                    );

                const agrupamentoMensal =
                    agruparRelatorioAnualPorObras({
                        relatorio: {
                            empresas:
                                empresaSelecionada
                                    ? [
                                        empresaSelecionada
                                    ]
                                    : [],
                        },

                        empresasBanco:
                            empresasBancoRelatorioMensal,

                        obrasEmpresasBanco:
                            Array.isArray(
                                obrasEmpresasBanco
                            )
                                ? obrasEmpresasBanco
                                : [],
                    });

                /*
                 * OBRA NO RELATÓRIO MENSAL — reutiliza o agrupamento já resolvido pelo relatório anual
                 * Reutiliza o agrupamento de obras já usado pelo anual.
                 */
                const obrasRelatorioMensal =
                    (
                        Array.isArray(
                            agrupamentoMensal
                        )
                            ? agrupamentoMensal
                            : []
                    )
                        .filter(
                            (obra) =>
                                obra &&
                                typeof obra ===
                                    "object" &&
                                obra.semVinculo !==
                                    true &&
                                String(
                                    obra.id ||
                                    ""
                                ).trim() !==
                                    "__sem_obra__"
                        );
                const contratantesEncontradas =
                    [];

                const contratantesVistas =
                    new Set();

                (
                    Array.isArray(
                        agrupamentoMensal
                    )
                        ? agrupamentoMensal
                        : []
                )
                    .map(
                        (obra) =>
                            obra?.contratante ||
                            null
                    )
                    .filter(Boolean)
                    .forEach(
                        (contratante) => {
                            const chave =
                                String(
                                    contratante?.id ||
                                    (
                                        String(
                                            contratante?.nome ||
                                            ""
                                        ) +
                                        "|" +
                                        String(
                                            contratante?.cnpj ||
                                            ""
                                        )
                                    )
                                ).trim();

                            if (
                                !chave ||
                                contratantesVistas.has(
                                    chave
                                )
                            ) {
                                return;
                            }

                            contratantesVistas.add(
                                chave
                            );

                            contratantesEncontradas.push(
                                contratante
                            );
                        }
                    );

                /*
                 * SAFESCAN J.49-P4-R2
                 *
                 * Estratégia:
                 *
                 * 1. mantém prioridade total para o resolvedor
                 *    oficial por obra/empresa-pai;
                 *
                 * 2. se ele não encontrar nenhuma contratante,
                 *    aceita fallback somente quando houver
                 *    exatamente uma empresa cadastrada como
                 *    CONTRATANTE;
                 *
                 * 3. se existirem múltiplas contratantes,
                 *    permanece neutro para não adivinhar.
                 */
                const normalizarTipoContratanteMensal =
                    (valor = "") =>
                        String(
                            valor ||
                            ""
                        )
                            .normalize("NFD")
                            .replace(
                                /[\u0300-\u036f]/g,
                                ""
                            )
                            .toLowerCase()
                            .replace(
                                /[^a-z0-9]+/g,
                                " "
                            )
                            .trim();

                const contratantesCadastroMensal =
                    empresasBancoRelatorioMensal
                        .filter(
                            (empresaBanco) =>
                                normalizarTipoContratanteMensal(
                                    empresaBanco?.tipoEmpresa ||
                                    empresaBanco?.tipo_empresa ||
                                    empresaBanco?.tipo ||
                                    ""
                                )
                                    .includes(
                                        "contratante"
                                    )
                        );

                const contratanteUnicaCadastroMensal =
                    contratantesCadastroMensal.length === 1
                        ? contratantesCadastroMensal[0]
                        : null;

                const contratanteRelatorioMensal =
                    contratantesEncontradas.length === 1
                        ? contratantesEncontradas[0]
                        : (
                            contratantesEncontradas.length === 0
                                ? contratanteUnicaCadastroMensal
                                : null
                        );

                imprimirRelatorioCertidaoMensal({
                    competencia,
                    empresa:
                        empresaSelecionada,

                    contratante:
                        contratanteRelatorioMensal,

                    obras:
                        obrasRelatorioMensal,

                    competenciaAtual:
                        cicloMensal.competenciaAtual,
                    historicoAnual:
                        cicloMensal.historicoAnual,
                    documentos:
                        documentosVisiveisCompetencia,
                });
            }
            catch (erro) {
                window.alert(
                    erro?.message ||
                    "Não foi possível gerar o relatório individual da empresa."
                );
            }
        };

    const imprimirRelatorioAnual =
        async () => {
            if (relatorioAnualGerando) {
                return;
            }

            const janelaRelatorio =
                window.open("", "_blank");

            if (!janelaRelatorio) {
                window.alert(
                    "Libere os pop-ups para gerar o relatório anual."
                );
                return;
            }

            janelaRelatorio.document.open();
            janelaRelatorio.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Preparando relatório anual</title>
    <style>
        body {
            display: grid;
            min-height: 100vh;
            margin: 0;
            place-items: center;
            background: #f2f6f4;
            color: #173126;
            font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }

        main {
            width: min(460px, calc(100% - 32px));
            border: 1px solid #d5e2db;
            border-radius: 14px;
            padding: 28px;
            background: #ffffff;
            box-shadow: 0 18px 48px rgba(8, 62, 38, 0.12);
            text-align: center;
        }

        strong {
            display: block;
            margin-bottom: 8px;
            color: #08763a;
            font-size: 20px;
        }

        span {
            color: #5c6d64;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <main>
        <strong>Preparando relatório anual</strong>
        <span>Carregando as competências de todas as empresas...</span>
    </main>
</body>
</html>`);
            janelaRelatorio.document.close();

            setRelatorioAnualGerando(true);

            try {
                const {
                    imprimirRelatorioAnualCertidaoMensal,
                } = await import(
                    "../services/certidaoMensalRelatorioAnualService.js"
                );

                const ano = Number(
                    String(competencia || "")
                        .split("/")
                        .at(-1)
                );

                await imprimirRelatorioAnualCertidaoMensal({
                    janela:
                        janelaRelatorio,
                    ano,
                    empresas:
                        empresasVisiveisCompetencia,
                    colaboradores,
                    empresasBanco:
                        empresasBanco.map((empresa) => {
                            const logoInformado =
                                empresa.logoUrl ||
                                empresa.logoURL ||
                                empresa.logo_url ||
                                "";

                            const logoJaPublico =
                                /^https?:\/\//i.test(
                                    String(logoInformado),
                                );

                            return {
                                ...empresa,
                                logoUrl:
                                    logoJaPublico
                                        ? logoInformado
                                        : obterUrlLogoEmpresa(
                                            logoInformado,
                                        ),
                            };
                        }),
                    obrasEmpresasBanco,
                });
            }
            catch (erro) {
                const mensagem =
                    erro?.message ||
                    "Não foi possível gerar o relatório anual de pendências documentais.";

                if (!janelaRelatorio.closed) {
                    janelaRelatorio.document.body.textContent =
                        mensagem;
                }

                window.alert(mensagem);
            }
            finally {
                setRelatorioAnualGerando(false);
            }
        };

    return (
        <div
            className="page-shell certidao-mensal-page"
            aria-busy={
                cicloMensal.carregando
            }
            data-certidao-ciclo-status={
                cicloMensal.status
            }
            data-certidao-ciclo-ano={
                cicloMensal.ano ||
                ""
            }
        >
            <Header
                className="hero-integrated-page-header hero-header--certidao-mensal"
                titulo="Certidões Mensais"
                subtitulo={null}
            />

            <CertidaoMensalHero
                competencia={competencia}
                resumo={resumo}
                onSelecionarCompetencia={setCompetencia}
                onImprimirRelatorio={
                    usuario?.id &&
                    empresas.length > 0
                        ? imprimirRelatorioAnual
                        : undefined
                }
                relatorioCarregando={
                    relatorioAnualGerando
                }
            />

            <CertidaoMensalResumo resumo={resumo} />

            <main className="certidao-mensal-workspace">
                {empresaSelecionada ? (
                    <>
                        <EmpresasFiscalizadasPanel
                            empresas={empresasVisiveisCompetencia}
                            empresaSelecionadaId={empresaSelecionadaId}
                            onSelecionarEmpresa={setEmpresaSelecionadaId}
                            totalEmpresasSistema={empresasVisiveisCompetencia.length}
                        />

                        <CompetenciaDocumentalPanel
                            key={`${empresaSelecionada.id}:${competencia}`}
                            competencia={competencia}
                            empresa={empresaSelecionada}
                            competenciaAtual={cicloMensal.competenciaAtual}
                            historicoAnual={cicloMensal.historicoAnual}
                            cicloCarregando={cicloMensal.carregando}
                            cicloErro={cicloMensal.erro}
                            vigenciaContratual={
                                cicloMensal.vigenciaContratual ||
                                empresaSelecionada.vigenciaContratual
                            }
                            documentos={documentosVisiveisCompetencia}
                            documentoSelecionadoId={
                                documentoSelecionado?.id ||
                                ""
                            }
                            onSelecionarDocumento={setDocumentoSelecionadoId}
                            onEnviarDocumento={abrirLaboratorioDocumento}
                            onDefinirAplicabilidadeEsocial={
                                definirAplicabilidadeEsocial
                            }
                            onImprimirRelatorioEmpresa={
                                cicloMensal
                                    .vigenciaContratual
                                    ?.exigivel
                                    ? imprimirRelatorioEmpresa
                                    : undefined
                            }
                            onAbrirExigibilidade={() =>
                                setPerfilDocumentalConfigAberto(
                                    true
                                )
                            }
                        />

                        <EvidenciaConferenciaPanel
                            empresa={empresaSelecionada}
                            documento={documentoSelecionado}
                            competencia={competencia}
                            usuarioDisponivel={Boolean(
                                usuario?.id &&
                                cicloMensal
                                    .vigenciaContratual
                                    ?.exigivel &&
                                documentoSelecionado
                                    ?.exigido !== false
                            )}
                            onConfirmarSnapshotMaoDeObra={
                                documentoSelecionado
                                    ?.exigido === false
                                    ? undefined
                                    : confirmarSnapshotMaoDeObra
                            }
                    onRevisarSnapshotMaoDeObra={
                        relacaoHistoricaManualConfirmada
                            ? abrirRevisaoRelacaoConfirmada
                            : null
                    }
                            onConfirmarDocumento={
                                documentoSelecionado
                                    ?.exigido === false
                                    ? undefined
                                    : confirmarDocumentoPersistido
                            }
                            onSolicitarReenvioDocumento={
                                documentoSelecionado
                                    ?.exigido === false
                                    ? undefined
                                    : solicitarReenvioDocumentoPersistido
                            }
                        />
                    </>
                ) : (
                    <section className="certidao-mensal-panel certidao-mensal-evidencia__arquivo">
                        <div className="certidao-mensal-evidencia__arquivo-page">
                            <strong>Nenhuma empresa com contrato vigente</strong>
                            <span>Não há empresas com contrato aplicável nesta competência.</span>
                        </div>
                    </section>
                )}
            </main>

            {perfilDocumentalConfigAberto &&
                empresaSelecionada && (
                    <PerfilDocumentalConfigModal
                        empresa={empresaSelecionada}
                        competencia={competencia}
                        documentos={documentosCompetencia}
                        regras={regrasPerfilDocumentalAtuais}
                        carregando={
                            perfilDocumentalRemotoEstado
                                .carregando
                        }
                        erro={
                            perfilDocumentalRemotoEstado
                                .erro
                        }
                        documentoSelecionadoId={
                            documentoSelecionadoId
                        }
                        persistenciaHabilitada={
                            PERFIL_DOCUMENTAL_PERSISTENCIA_HABILITADA
                        }
                        onSalvar={
                            salvarPerfilDocumental
                        }
                        onCancelar={() =>
                            setPerfilDocumentalConfigAberto(
                                false
                            )
                        }
                    />
                )}

            <CertidaoPdfLaboratorioModal
                {...laboratorioPdf}
                processarArquivo={processarArquivoLaboratorioComCnpjs}
                empresa={empresaSelecionada}
                competencia={competencia}
                usuarioId={usuario?.id || ""}
                persistenciaDisponivel={Boolean(
                    cicloMensal
                        .vigenciaContratual
                        ?.exigivel &&
                    documentoSelecionado
                        ?.exigido !== false
                )}
            />

            {regularizacaoHistoricaAberta && (
                <div
                    className="certidao-mensal-regularizacao-modal__overlay"
                    role="presentation"
                    data-j48-modo="confirmacao-manual"
                >
                    <section
                        className="certidao-mensal-regularizacao-modal__dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="certidao-regularizacao-historica-titulo"
                    >
                        <header className="certidao-mensal-regularizacao-modal__header">
                            <div>
                                <p>
                                    Regularização histórica assistida
                                </p>

                                <h2 id="certidao-regularizacao-historica-titulo">
                                    Relação de empregados · {competencia}
                                </h2>

                                <span>
                                    {empresaSelecionada?.nome ||
                                        "Empresa selecionada"}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    fecharRegularizacaoHistorica
                                }
                                aria-label="Fechar revisão histórica"
                            >
                                ×
                            </button>
                        </header>

                        <div className="certidao-mensal-regularizacao-modal__aviso">
                            <strong>
                                Revisão necessária antes da confirmação histórica
                            </strong>

                            <span>
                                A relação abaixo foi preparada apenas para conferência.
                                O estado atual dos colaboradores não comprova sozinho
                                a composição desta competência passada. Nesta etapa,
                                nenhuma seleção será salva.
                            </span>
                        </div>

                        <div className="certidao-mensal-regularizacao-modal__resumo">
                            <article>
                                <span>
                                    Competência
                                </span>

                                <strong>
                                    {competencia}
                                </strong>
                            </article>

                            <article>
                                <span>
                                    Pré-seleção segura
                                </span>

                                <strong>
                                    {idsPreSelecionadosRegularizacao.length}
                                </strong>
                            </article>

                            <article>
                                <span>
                                    Selecionados agora
                                </span>

                                <strong>
                                    {regularizacaoHistoricaSelecionados.length}
                                </strong>
                            </article>
                        </div>

                        <div className="certidao-mensal-regularizacao-modal__atalhos">
                            <button
                                type="button"
                                onClick={
                            relacaoHistoricaManualConfirmada
                                ? restaurarRelacaoHistoricaSalva
                                : restaurarPreSelecaoRegularizacao
                        }
                            >
                                {
                            relacaoHistoricaManualConfirmada
                                ? "Restaurar relação salva"
                                : "Restaurar pré-seleção"
                        }
                            </button>

                            <button
                                type="button"
                                onClick={
                                    limparSelecaoRegularizacao
                                }
                            >
                                Limpar seleção
                            </button>
                        </div>

                        <div className="certidao-mensal-regularizacao-modal__lista">
                            {colaboradoresEmpresaRegularizacao.length ? (
                                colaboradoresEmpresaRegularizacao.map(
                                    (colaborador) => {
                                        const id =
                                            String(
                                                colaborador?.id ||
                                                ""
                                            ).trim();

                                        const nome =
                                            String(
                                                colaborador?.nome ||
                                                "Colaborador sem nome"
                                            );

                                        const funcao =
                                            String(
                                                colaborador?.funcao ||
                                                colaborador?.cargo ||
                                                "Função não informada"
                                            );

                                        const admissao =
                                            String(
                                                colaborador
                                                    ?.dataAdmissao ||
                                                colaborador
                                                    ?.data_admissao ||
                                                ""
                                            )
                                                .slice(
                                                    0,
                                                    10
                                                );

                                        const status =
                                            String(
                                                colaborador?.status ||
                                                colaborador?.situacao ||
                                                "Não informado"
                                            );

                                        const mobilizacao =
                                            String(
                                                colaborador
                                                    ?.statusMobilizacao ||
                                                colaborador
                                                    ?.status_mobilizacao ||
                                                colaborador
                                                    ?.situacao_operacional ||
                                                "Não informada"
                                            );

                                        const selecionado =
                                            regularizacaoHistoricaSelecionados
                                                .includes(
                                                    id
                                                );

                                        return (
                                            <label
                                                key={id}
                                                className={`certidao-mensal-regularizacao-modal__colaborador ${
                                                    selecionado
                                                        ? "is-selecionado"
                                                        : ""
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        selecionado
                                                    }
                                                    onChange={
                                                        () =>
                                                            alternarColaboradorRegularizacao(
                                                                id
                                                            )
                                                    }
                                                />

                                                <span>
                                                    <strong>
                                                        {nome}
                                                    </strong>

                                                    <small>
                                                        {funcao}
                                                        {" · "}
                                                        Admissão: {
                                                            admissao ||
                                                            "não informada"
                                                        }
                                                        {" · "}
                                                        Situação atual: {
                                                            status
                                                        }
                                                        {" · "}
                                                        Mobilização atual: {
                                                            mobilizacao
                                                        }
                                                    </small>
                                                </span>
                                            </label>
                                        );
                                    }
                                )
                            ) : (
                                <p className="certidao-mensal-regularizacao-modal__vazio">
                                    Nenhum colaborador da empresa foi localizado
                                    para revisão.
                                </p>
                            )}
                        </div>

                        {regularizacaoHistoricaErro && (
                            <p className="certidao-mensal-regularizacao-modal__erro">
                                {regularizacaoHistoricaErro}
                            </p>
                        )}

                        <footer className="certidao-mensal-regularizacao-modal__footer">
                            <div>
                                <strong>
                                    {regularizacaoHistoricaSelecionados.length}
                                </strong>

                                <span>
                                    colaborador(es) selecionado(s) para confirmação histórica
                                </span>
                            </div>

                            <span className="certidao-mensal-regularizacao-modal__modo">
                                Confirmação manual · salva somente a Relação de Empregados
                            </span>

                                                <button
                        type="button"
                        className="is-principal"
                        onClick={
                            confirmarRegularizacaoHistorica
                        }
                        disabled={
                            regularizacaoHistoricaSalvando
                        }
                    >
                        {
                            regularizacaoHistoricaSalvando
                                ? "Salvando..."
                                : relacaoHistoricaManualConfirmada
                                    ? "Salvar alterações"
                                    : "Confirmar e salvar"
                        }
                    </button>
<button
                                type="button"
                                onClick={
                                    fecharRegularizacaoHistorica
                                }
                            >
                                Fechar revisão
                            </button>
                        </footer>
                    </section>
                </div>
            )}
        </div>
    );
}

export default CertidaoMensalDocumentalPage;
