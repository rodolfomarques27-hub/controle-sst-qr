import {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    createPortal,
} from "react-dom";

import {
    AlertTriangle,
    CheckCircle2,
    FileSearch,
    FolderOpen,
    RotateCcw,
    UploadCloud,
    X,
    XCircle,
} from "lucide-react";

import {
    CertidaoDocumentosLoadingVisual,
} from "./CertidaoDocumentosLoadingVisual.jsx";

import "../../../styles/pages/certidao-mensal-upload-massa.css";
import {
    criarFilaAlvosPersistenciaPrincipalUploadMassa,
    criarPlanoPersistenciaPrincipalUploadMassa,
} from "../services/certidaoMensalUploadMassaPersistencePlanService.js";

// ============================================================
// SAFE_SCAN_REVISAR_DOCUMENTO_SALVO_PREVIEW_R8_R2
// ============================================================
function objetoComparacaoDocumentoSalvo(
    valor
) {
    return (
        valor &&
        typeof valor ===
            "object" &&
        !Array.isArray(
            valor
        )
    )
        ? valor
        : {};
}

function textoComparacaoDocumentoSalvo(
    valor
) {
    return String(
        valor ??
        ""
    ).trim();
}

function normalizarCompetenciaComparacaoDocumentoSalvo(
    valor
) {
    const texto =
        textoComparacaoDocumentoSalvo(
            valor
        );

    const match =
        /^(\d{4})-(\d{2})(?:-\d{2})?$/
            .exec(
                texto
            );

    return match
        ? (
            match[1] +
            "-" +
            match[2]
        )
        : texto;
}

function formatarCompetenciaComparacaoDocumentoSalvo(
    valor
) {
    const normalizada =
        normalizarCompetenciaComparacaoDocumentoSalvo(
            valor
        );

    const match =
        /^(\d{4})-(\d{2})$/
            .exec(
                normalizada
            );

    if (!match) {
        return "Não identificada";
    }

    return (
        match[2] +
        "/" +
        match[1]
    );
}

function normalizarDataComparacaoDocumentoSalvo(
    valor
) {
    const texto =
        textoComparacaoDocumentoSalvo(
            valor
        );

    const iso =
        /^(\d{4})-(\d{2})-(\d{2})/
            .exec(
                texto
            );

    if (iso) {
        return (
            iso[1] +
            "-" +
            iso[2] +
            "-" +
            iso[3]
        );
    }

    const br =
        /^(\d{2})\/(\d{2})\/(\d{4})$/
            .exec(
                texto
            );

    return br
        ? (
            br[3] +
            "-" +
            br[2] +
            "-" +
            br[1]
        )
        : "";
}

function formatarDataComparacaoDocumentoSalvo(
    valor
) {
    const normalizada =
        normalizarDataComparacaoDocumentoSalvo(
            valor
        );

    const match =
        /^(\d{4})-(\d{2})-(\d{2})$/
            .exec(
                normalizada
            );

    if (!match) {
        return "Não identificada";
    }

    return (
        match[3] +
        "/" +
        match[2] +
        "/" +
        match[1]
    );
}

function formatarConfiancaComparacaoDocumentoSalvo(
    valor
) {
    const numero =
        Number(
            valor
        );

    if (!Number.isFinite(numero)) {
        return "Não identificada";
    }

    const percentual =
        numero >= 0 &&
        numero <= 1
            ? numero * 100
            : numero;

    return (
        Math.round(
            percentual
        ) +
        "%"
    );
}

function criarComparacaoDocumentoSalvoUploadMassa(
    item
) {
    const historico =
        objetoComparacaoDocumentoSalvo(
            item
                ?.duplicidade
                ?.historico
        );

    const payloadSalvo =
        objetoComparacaoDocumentoSalvo(
            historico?.payload
        );

    const diagnosticoDireto =
        objetoComparacaoDocumentoSalvo(
            historico?.diagnostico
        );

    const diagnosticoPayload =
        objetoComparacaoDocumentoSalvo(
            payloadSalvo?.diagnostico
        );

    const diagnosticoSalvo =
        Object.keys(
            diagnosticoDireto
        ).length > 0
            ? diagnosticoDireto
            : diagnosticoPayload;

    const classificacaoSalva =
        objetoComparacaoDocumentoSalvo(
            diagnosticoSalvo
                ?.classificacao
        );

    const avaliacaoSalva =
        objetoComparacaoDocumentoSalvo(
            diagnosticoSalvo
                ?.avaliacao
        );

    const temporaisSalvos =
        objetoComparacaoDocumentoSalvo(
            avaliacaoSalva
                ?.dadosTemporais
        );

    const resolucaoAtual =
        objetoComparacaoDocumentoSalvo(
            item?.resolucao
        );

    const avaliacaoAtual =
        objetoComparacaoDocumentoSalvo(
            resolucaoAtual
                ?.avaliacao
        );

    const temporaisAtuais =
        objetoComparacaoDocumentoSalvo(
            avaliacaoAtual
                ?.dadosTemporais
        );

    // ============================================================
    // SAFE_SCAN_INSS_DCTFWEB_REVIEW_TEMPORAL_R11B
    //
    // INSS/DCTFWeb possui semântica temporal própria:
    // - competência / período de apuração;
    // - data de transmissão;
    // - vencimento do DARF.
    //
    // Não converter vencimento em validade genérica.
    // ============================================================
    const dadosInssSalvos =
        objetoComparacaoDocumentoSalvo(
            avaliacaoSalva
                ?.dadosInssDctfweb
        );

    const dadosInssAtuais =
        objetoComparacaoDocumentoSalvo(
            avaliacaoAtual
                ?.dadosInssDctfweb
        );

    const tipoComparacaoCanonico =
        textoComparacaoDocumentoSalvo(
            resolucaoAtual
                ?.tipoDocumento ||
            classificacaoSalva
                ?.tipoDocumento ||
            payloadSalvo
                ?.item
                ?.tipoDocumento
        ).toLowerCase();

    const ehInssDctfweb =
        tipoComparacaoCanonico ===
            "inss-dctfweb";

    const destinoAtual =
        objetoComparacaoDocumentoSalvo(
            resolucaoAtual
                ?.destino
        );

    const competenciaSalvaBruta =
        textoComparacaoDocumentoSalvo(
            payloadSalvo
                ?.competencia
        );

    const competenciaAtualBruta =
        textoComparacaoDocumentoSalvo(
            destinoAtual
                ?.competenciaIso ||
            destinoAtual
                ?.competencia
        );

    const emissaoSalvaBruta =
        textoComparacaoDocumentoSalvo(
            ehInssDctfweb
                ? dadosInssSalvos
                    ?.dataTransmissao
                : (
                    temporaisSalvos
                        ?.dataEmissaoIso ||
                    temporaisSalvos
                        ?.dataEmissao
                )
        );

    const emissaoAtualBruta =
        textoComparacaoDocumentoSalvo(
            ehInssDctfweb
                ? dadosInssAtuais
                    ?.dataTransmissao
                : (
                    temporaisAtuais
                        ?.dataEmissaoIso ||
                    temporaisAtuais
                        ?.dataEmissao
                )
        );

    const validadeSalvaBruta =
        textoComparacaoDocumentoSalvo(
            ehInssDctfweb
                ? dadosInssSalvos
                    ?.vencimento
                : (
                    temporaisSalvos
                        ?.dataValidadeIso ||
                    temporaisSalvos
                        ?.dataValidade
                )
        );

    const validadeAtualBruta =
        textoComparacaoDocumentoSalvo(
            ehInssDctfweb
                ? dadosInssAtuais
                    ?.vencimento
                : (
                    temporaisAtuais
                        ?.dataValidadeIso ||
                    temporaisAtuais
                        ?.dataValidade
                )
        );

    const tipoSalvoCanonico =
        textoComparacaoDocumentoSalvo(
            classificacaoSalva
                ?.tipoDocumento ||
            payloadSalvo
                ?.item
                ?.tipoDocumento
        ).toLowerCase();

    const tipoAtualCanonico =
        textoComparacaoDocumentoSalvo(
            resolucaoAtual
                ?.tipoDocumento
        ).toLowerCase();

    const tipoSalvoVisual =
        textoComparacaoDocumentoSalvo(
            classificacaoSalva
                ?.titulo ||
            classificacaoSalva
                ?.tipoDocumento ||
            payloadSalvo
                ?.item
                ?.titulo ||
            payloadSalvo
                ?.item
                ?.tipoDocumento
        ) ||
        "Não identificado";

    const tipoAtualVisual =
        textoComparacaoDocumentoSalvo(
            resolucaoAtual
                ?.titulo ||
            resolucaoAtual
                ?.tipoDocumento
        ) ||
        "Não identificado";

    const competenciaSalvaCanonica =
        normalizarCompetenciaComparacaoDocumentoSalvo(
            competenciaSalvaBruta
        );

    const competenciaAtualCanonica =
        normalizarCompetenciaComparacaoDocumentoSalvo(
            competenciaAtualBruta
        );

    const emissaoSalvaCanonica =
        normalizarDataComparacaoDocumentoSalvo(
            emissaoSalvaBruta
        );

    const emissaoAtualCanonica =
        normalizarDataComparacaoDocumentoSalvo(
            emissaoAtualBruta
        );

    const validadeSalvaCanonica =
        normalizarDataComparacaoDocumentoSalvo(
            validadeSalvaBruta
        );

    const validadeAtualCanonica =
        normalizarDataComparacaoDocumentoSalvo(
            validadeAtualBruta
        );

    const confiancaSalva =
        formatarConfiancaComparacaoDocumentoSalvo(
            classificacaoSalva
                ?.confianca
        );

    const confiancaAtual =
        formatarConfiancaComparacaoDocumentoSalvo(
            resolucaoAtual
                ?.confianca
        );

    const linhasComparacao = [
        {
            chave: "competencia",
            titulo: "Competência",
            salvo:
                formatarCompetenciaComparacaoDocumentoSalvo(
                    competenciaSalvaBruta
                ),
            atual:
                formatarCompetenciaComparacaoDocumentoSalvo(
                    competenciaAtualBruta
                ),
            mudou:
                competenciaSalvaCanonica !==
                competenciaAtualCanonica,
        },
        {
            chave: "emissao",
            titulo:
                ehInssDctfweb
                    ? "Data de transmissão"
                    : "Data de emissão",
            salvo:
                formatarDataComparacaoDocumentoSalvo(
                    emissaoSalvaBruta
                ),
            atual:
                formatarDataComparacaoDocumentoSalvo(
                    emissaoAtualBruta
                ),
            mudou:
                emissaoSalvaCanonica !==
                emissaoAtualCanonica,
        },
        {
            chave: "validade",
            titulo:
                ehInssDctfweb
                    ? "Vencimento"
                    : "Data de validade",
            salvo:
                formatarDataComparacaoDocumentoSalvo(
                    validadeSalvaBruta
                ),
            atual:
                formatarDataComparacaoDocumentoSalvo(
                    validadeAtualBruta
                ),
            mudou:
                validadeSalvaCanonica !==
                validadeAtualCanonica,
        },
        {
            chave: "tipo",
            titulo: "Tipo documental",
            salvo:
                tipoSalvoVisual,
            atual:
                tipoAtualVisual,
            mudou:
                tipoSalvoCanonico !==
                tipoAtualCanonico,
        },
        {
            chave: "confianca",
            titulo: "Confiança da classificação",
            salvo:
                confiancaSalva,
            atual:
                confiancaAtual,
            mudou:
                confiancaSalva !==
                confiancaAtual,
        },
    ];

    const mudancaEstrutural =
        (
            Boolean(
                competenciaSalvaCanonica
            ) &&
            Boolean(
                competenciaAtualCanonica
            ) &&
            competenciaSalvaCanonica !==
                competenciaAtualCanonica
        ) ||
        (
            Boolean(
                tipoSalvoCanonico
            ) &&
            Boolean(
                tipoAtualCanonico
            ) &&
            tipoSalvoCanonico !==
                tipoAtualCanonico
        );

    return {
        versaoId:
            textoComparacaoDocumentoSalvo(
                historico?.versaoId
            ),

        itemId:
            textoComparacaoDocumentoSalvo(
                historico?.itemId
            ),

        numeroVersao:
            Number(
                historico
                    ?.numeroVersao
            ) ||
            null,

        nomeOriginal:
            textoComparacaoDocumentoSalvo(
                historico?.nomeOriginal
            ),

        criadoEm:
            textoComparacaoDocumentoSalvo(
                historico?.criadoEm
            ),

        statusResultado:
            textoComparacaoDocumentoSalvo(
                historico
                    ?.statusResultado
            ),

        linhas:
            linhasComparacao,

        totalAlteracoes:
            linhasComparacao.filter(
                (linha) =>
                    linha?.mudou ===
                    true
            ).length,

        mudancaEstrutural,
    };
}
function formatarCompetencia(
    resolucao
) {
    const competenciaIso =
        String(
            resolucao
                ?.destino
                ?.competenciaIso ||
            ""
        ).trim();

    const correspondencia =
        /^(\d{4})-(\d{2})-\d{2}$/
            .exec(
                competenciaIso
            );

    if (correspondencia) {
        return (
            correspondencia[2] +
            "/" +
            correspondencia[1]
        );
    }

    if (
        String(
            resolucao?.politica ||
            ""
        )
            .trim()
            .toUpperCase() ===
        "FORA_MATRIZ"
    ) {
        return "Não aplicável";
    }

    if (
        resolucao
            ?.complementar ===
        true
    ) {
        return "Complementar";
    }

    if (
        resolucao
            ?.politica ===
        "VALIDADE"
    ) {
        return "Revisar origem";
    }

    return "Revisar";
}

function obterStatusVisual(
    status = ""
) {
    if (status === "PRONTO") {
        return {
            label:
                "Pronto",

            icone:
                CheckCircle2,

            classe:
                "is-pronto",
        };
    }

    // SAFE_SCAN_27K_STATUS_IGNORADO_VISUAL_R3F
    if (
        status ===
        "IGNORADO"
    ) {
        return {
            label:
                "Ignorado",

            icone:
                CheckCircle2,

            classe:
                "is-pronto",
        };
    }

    if (status === "REVISAR") {
        return {
            label:
                "Revisar",

            icone:
                AlertTriangle,

            classe:
                "is-revisar",
        };
    }

    return {
        label:
            "Bloqueado",

        icone:
            XCircle,

        classe:
            "is-bloqueado",
    };
}

// ============================================================
// SAFE_SCAN_CERTIDAO_DUPLICIDADE_CONFLITO_UI_C1_V1
//
// Tradução SOMENTE visual dos estados decididos pelo motor.
// Não altera regra de negócio, plano, fila ou persistência.
// ============================================================
function obterAvisoSemanticoUploadMassa({
    item = null,
    itemPlano = null,
} = {}) {
    const codigos =
        [
            item?.foraMatrizCert2?.codigo,
            item?.duplicidade?.codigo,
            item?.codigo,
            itemPlano?.codigo,
            itemPlano?.duplicidade?.codigo,
            itemPlano?.preflight?.codigo,
        ]
            .map(
                (valor) =>
                    String(
                        valor ||
                        ""
                    )
                        .trim()
                        .toUpperCase()
            )
            .filter(Boolean);

    const possuiCodigo =
        (codigo) =>
            codigos.includes(
                codigo
            );

    const acaoPlano =
        String(
            itemPlano?.acao ||
            ""
        )
            .trim()
            .toUpperCase();

    if (
        possuiCodigo(
            "DUPLICADO_EXATO_LOTE"
        )
    ) {
        return {
            label:
                "Ignorado",

            icone:
                CheckCircle2,

            classe:
                "is-pronto",

            mensagem:
                "Arquivo duplicado neste lote. " +
                "O SafeScan manterá somente a primeira ocorrência " +
                "e não considerará este PDF novamente.",
        };
    }

    if (
        possuiCodigo(
            "DUPLICADO_EXATO_HISTORICO"
        )
    ) {
        return {
            label:
                "Já existente",

            icone:
                CheckCircle2,

            classe:
                "is-pronto",

            mensagem:
                "Documento já existe no histórico. " +
                "O arquivo é idêntico a uma versão anteriormente registrada " +
                "e nenhuma nova versão será criada.",
        };
    }

    // SAFE_SCAN_FORA_MATRIZ_VISUAL_F10D1
    if (
        possuiCodigo(
            "FORA_MATRIZ_CERT2"
        )
    ) {
        return {
            label:
                "Bloqueado",

            icone:
                XCircle,

            classe:
                "is-bloqueado",

            mensagem:
                "Documento fora da matriz CERT2. " +
                "Este arquivo não será incluído na persistência.",
        };
    }

    // SAFE_SCAN_RENOVACAO_VISUAL_F10B_R3B
    if (
        possuiCodigo(
            "DUPLICADO_DOCUMENTAL_SEMANTICO_LOTE"
        )
    ) {
        return {
            label:
                "Ignorado",

            icone:
                CheckCircle2,

            classe:
                "is-pronto",

            mensagem:
                "A mesma certidão foi identificada pelo número de controle, emissão e validade. " +
                "Somente uma ocorrência será considerada no lote.",
        };
    }

    if (
        possuiCodigo(
            "VERSAO_VALIDADE_SUPERADA_LOTE"
        )
    ) {
        return {
            label:
                "Ignorado",

            icone:
                CheckCircle2,

            classe:
                "is-pronto",

            mensagem:
                "Foi identificada uma renovação posterior deste documento de validade. " +
                "A versão anterior não será salva como documento principal.",
        };
    }

    if (
        possuiCodigo(
            "CONFLITO_MULTIPLO_LOTE"
        )
    ) {
        return {
            label:
                "Revisar",

            icone:
                AlertTriangle,

            classe:
                "is-revisar",

            mensagem:
                "Há mais de um documento diferente para o mesmo destino. " +
                "Revise os arquivos da mesma empresa, competência e tipo " +
                "antes de salvar o lote.",
        };
    }

    if (
            acaoPlano ===
            "IGNORAR_COMPLEMENTAR"
        ) {
            return {
                label:
                    "Ignorado",

                icone:
                    CheckCircle2,

                classe:
                    "is-pronto",

                mensagem:
                    "Documento complementar ignorado. " +
                    "Não gera pendência mensal e não entra na fila principal.",
            };
        }

        if (
            acaoPlano ===
            "IGNORAR_FORA_ESCOPO"
        ) {
            return {
                label:
                    "Ignorado",

                icone:
                    CheckCircle2,

                classe:
                    "is-pronto",

                mensagem:
                    "Documento fora do escopo do CERT2. " +
                    "Não gera pendência e não entra na fila principal.",
            };
        }

        if (
            acaoPlano ===
            "BLOQUEAR_DADOS_INVALIDOS"
        ) {
            return {
                label:
                    "Bloqueado",

                icone:
                    XCircle,

                classe:
                    "is-bloqueado",

                mensagem:
                    "",
            };
        }

        const colaboradorNaoCadastradoBloqueadoVisual =
        String(
            item
                ?.resolucao
                ?.status ||
            ""
        )
            .trim()
            .toUpperCase() ===
            "BLOQUEADO" &&
        String(
            item
                ?.resolucao
                ?.identificacaoColaborador
                ?.status ||
            ""
        )
            .trim()
            .toUpperCase() ===
            "NAO_CADASTRADO_CONFIRMADO";

    if (
        colaboradorNaoCadastradoBloqueadoVisual
    ) {
        return {
            label:
                "Bloqueado",

            icone:
                XCircle,

            classe:
                "is-bloqueado",

            mensagem:
                "Cadastro SafeScan consultado sem correspondência.",
        };
    }

    if (
            acaoPlano ===
            "AGUARDAR_REVISAO"
        ) {
        return {
            label:
                "Revisar",

            icone:
                AlertTriangle,

            classe:
                "is-revisar",

            mensagem:
                "Revisão obrigatória antes de salvar. " +
                "Este documento não entrou na fila de persistência.",
        };
    }

    if (
        acaoPlano ===
        "IGNORAR_DUPLICADO"
    ) {
        return {
            label:
                "Ignorado",

            icone:
                CheckCircle2,

            classe:
                "is-pronto",

            mensagem:
                "Documento duplicado ignorado. " +
                "Nenhuma nova versão será criada para este arquivo.",
        };
    }

    return null;
}
function obterMotivoPrincipal(
    resolucao
) {
    return String(
        resolucao
            ?.motivos?.[0]
            ?.mensagem ||
        ""
    ).trim();
}

function obterTituloEmpresaUploadMassa(
    resolucao
) {
    const empresa =
        resolucao?.empresa ||
        {};

    if (
        empresa.status ===
        "NAO_ENCONTRADA"
    ) {
        return "Empresa não cadastrada";
    }

    if (
        empresa.status ===
        "AMBIGUA"
    ) {
        return "Empresa ambígua";
    }

    return (
        empresa.nome ||
        "Não identificada"
    );
}

function obterDetalheEmpresaUploadMassa(
    resolucao
) {
    const empresa =
        resolucao?.empresa ||
        {};

    const cnpjsDocumento =
        Array.isArray(
            empresa?.cnpjsDocumento
        )
            ? empresa.cnpjsDocumento
                .filter(Boolean)
            : [];

    if (
        empresa.status ===
        "NAO_ENCONTRADA"
    ) {
        return cnpjsDocumento.length
            ? (
                "CNPJ encontrado: " +
                cnpjsDocumento.join(
                    " · "
                )
            )
            : "CNPJ encontrado, mas empresa não cadastrada";
    }

    if (
        empresa.status ===
        "PROPOSTA_COLABORADOR"
    ) {
        return empresa.cnpjProposto
            ? (
                "CNPJ proposto: " +
                empresa.cnpjProposto
            )
            : "Empresa proposta pelo cadastro atual";
    }

    return (
        empresa.cnpjCorrespondente ||
        empresa.status ||
        ""
    );
}

// ============================================================
// SAFE_SCAN_UPLOAD_MASSA_COLABORADOR_VISUAL_D2_R1I
// ============================================================

function formatarNomePessoaUploadMassa(
    valor = ""
) {
    const texto =
        String(
            valor ||
            ""
        ).trim();

    if (!texto) {
        return "";
    }

    const conectores =
        new Set([
            "da",
            "das",
            "de",
            "do",
            "dos",
            "e",
        ]);

    return texto
        .toLocaleLowerCase(
            "pt-BR"
        )
        .split(
            /\s+/
        )
        .filter(Boolean)
        .map(
            (
                parte,
                indice
            ) => {
                if (
                    indice > 0 &&
                    conectores.has(
                        parte
                    )
                ) {
                    return parte;
                }

                return (
                    parte
                        .charAt(0)
                        .toLocaleUpperCase(
                            "pt-BR"
                        ) +
                    parte.slice(1)
                );
            }
        )
        .join(
            " "
        );
}

function obterRotuloCriterioColaboradorUploadMassa(
    criterio = ""
) {
    const codigo =
        String(
            criterio ||
            ""
        )
            .trim()
            .toUpperCase();

    if (codigo === "CPF") {
        return "Identificado pelo CPF";
    }

    if (
        codigo ===
        "MATRICULA_ESOCIAL"
    ) {
        return "Identificado pela matrícula / eSocial";
    }

    if (
        codigo ===
        "NOME_COMPLETO_UNICO"
    ) {
        return "Identificado pelo nome completo";
    }

    return codigo
        ? "Identificado pelo cadastro"
        : "Vínculo localizado no cadastro";
}

function obterDetalheColaboradorUploadMassa(
    resolucao
) {
    const identificacao =
        resolucao
            ?.identificacaoColaborador;

    if (
        !identificacao?.status
    ) {
        return null;
    }

    const nome =
        formatarNomePessoaUploadMassa(
            identificacao.nome
        );

    if (
        identificacao.status ===
        "LOCALIZADO"
    ) {
        return {
            status:
                "LOCALIZADO",

            nome:
                nome ||
                "Colaborador localizado",

            criterio:
                obterRotuloCriterioColaboradorUploadMassa(
                    identificacao.criterio
                ),
        };
    }

    if (
        identificacao.status ===
        "CONFLITO_CPF"
    ) {
        return {
            status:
                "CONFLITO_CPF",

            nome:
                nome ||
                "Colaborador localizado",

            criterio:
                "CPF do documento diverge do cadastro",
        };
    }

    if (
        identificacao.status ===
        "AMBIGUO"
    ) {
        return {
            status:
                "AMBIGUO",

            nome:
                "Correspondência ambígua",

            criterio:
                "Revisão manual necessária",
        };
    }

    if (
        identificacao.status ===
        "NAO_CADASTRADO_CONFIRMADO"
    ) {
        return {
            status:
                "NAO_CADASTRADO_CONFIRMADO",

            nome:
                "Colaborador não cadastrado",

            criterio:
                "Cadastro SafeScan consultado sem correspondência",
        };
    }

    if (
        identificacao.status ===
        "IDENTIDADE_DOCUMENTAL_INSUFICIENTE"
    ) {
        return {
            status:
                "IDENTIDADE_DOCUMENTAL_INSUFICIENTE",

            nome:
                "Identidade do colaborador não confirmada",

            criterio:
                "Conteúdo do PDF insuficiente para associação automática",
        };
    }

    if (
        identificacao.status ===
        "CONSULTA_INCONCLUSIVA"
    ) {
        return {
            status:
                "CONSULTA_INCONCLUSIVA",

            nome:
                "Consulta ao cadastro inconclusiva",

            criterio:
                "Nenhuma ausência de colaborador foi confirmada",
        };
    }

    if (
        identificacao.status ===
        "NAO_LOCALIZADO"
    ) {
        return {
            status:
                "NAO_LOCALIZADO",

            nome:
                "Colaborador não localizado",

            criterio:
                "Conferir cadastro do colaborador",
        };
    }

    return null;
}

function formatarOrigemUploadMassa(
    fonte = ""
) {
    const codigo =
        String(
            fonte ||
            ""
        )
            .trim()
            .toUpperCase();

    const rotulos = {
        CONTEUDO_DOCUMENTAL:
            "Identificado no conteúdo do documento",

        VINCULO_FOLHA_LOTE:
            "Vinculado pela folha do lote",

        VINCULO_COLABORADOR_CADASTRO_ATUAL:
            "Vínculo atual do colaborador",

        CONTEUDO_DOCUMENTAL_COMPLEMENTAR:
            "Identificado no documento complementar",
    };

    if (rotulos[codigo]) {
        return rotulos[codigo];
    }

    if (!codigo) {
        return "Sem definição automática";
    }

    const texto =
        codigo
            .toLocaleLowerCase(
                "pt-BR"
            )
            .replace(
                /_/g,
                " "
            );

    return (
        texto
            .charAt(0)
            .toLocaleUpperCase(
                "pt-BR"
            ) +
        texto.slice(1)
    );
}

// SAFE_SCAN_FORA_MATRIZ_ORIGEM_F10D1
function formatarOrigemResolucaoUploadMassa(
    resolucao
) {
    if (
        String(
            resolucao?.politica ||
            ""
        )
            .trim()
            .toUpperCase() ===
        "FORA_MATRIZ"
    ) {
        return "Fora da matriz documental";
    }

    return formatarOrigemUploadMassa(
        resolucao
            ?.destino
            ?.fonte
    );
}

// SAFE_SCAN_DIRECTORY_PICKER_V1
async function coletarArquivosDiretorioSafeScan(
    diretorio,
    caminhoBase = ""
) {
    const arquivos =
        [];

    const raiz =
        String(
            caminhoBase ||
            diretorio?.name ||
            ""
        ).trim();

    for await (
        const [
            nomeEntrada,
            entrada,
        ] of diretorio.entries()
    ) {
        const nome =
            String(
                nomeEntrada ||
                entrada?.name ||
                ""
            ).trim();

        const caminho =
            [
                raiz,
                nome,
            ]
                .filter(Boolean)
                .join("/");

        if (
            entrada?.kind ===
            "directory"
        ) {
            const filhos =
                await coletarArquivosDiretorioSafeScan(
                    entrada,
                    caminho
                );

            arquivos.push(
                ...filhos
            );

            continue;
        }

        if (
            entrada?.kind !==
            "file"
        ) {
            continue;
        }

        const arquivo =
            await entrada.getFile();

        try {
            Object.defineProperty(
                arquivo,
                "webkitRelativePath",
                {
                    configurable: true,
                    enumerable: true,
                    value: caminho,
                }
            );
        }
        catch {
            // Caminho relativo é apenas proveniência.
            // A análise do conteúdo continua normalmente.
        }

        arquivos.push(
            arquivo
        );
    }

    return arquivos;
}

// ============================================================
// SAFE_SCAN_27K_RESUMO_EFETIVO_HELPER_R3I_START
// ============================================================

function calcularResumoKpiEfetivoUploadMassa({
    itens = [],
    itensPlano = [],
    filaPersistencia = [],
} = {}) {
    const listaItens =
        Array.isArray(
            itens
        )
            ? itens
            : [];

    const listaPlano =
        Array.isArray(
            itensPlano
        )
            ? itensPlano
            : [];

    const listaFila =
        Array.isArray(
            filaPersistencia
        )
            ? filaPersistencia
            : [];

    const planoPorIndice =
        new Map(
            listaPlano
                .filter(
                    (itemPlano) =>
                        Number.isInteger(
                            itemPlano?.indice
                        )
                )
                .map(
                    (itemPlano) => [
                        itemPlano.indice,
                        itemPlano,
                    ]
                )
        );

    const indicesFila =
        new Set(
            listaFila
                .map(
                    (alvo) =>
                        alvo?.indice
                )
                .filter(
                    Number.isInteger
                )
        );

    return listaItens.reduce(
        (
            acumulado,
            item,
            indiceLinha
        ) => {
            const indice =
                Number.isInteger(
                    item?.indice
                )
                    ? item.indice
                    : indiceLinha;

            const statusMotor =
                String(
                    item
                        ?.resolucao
                        ?.status ||
                    ""
                )
                    .trim()
                    .toUpperCase();

            const itemPlano =
                planoPorIndice
                    .get(
                        indice
                    ) ||
                null;

            const acaoPlano =
                String(
                    itemPlano
                        ?.acao ||
                    ""
                )
                    .trim()
                    .toUpperCase();

            const codigoPlano =
                String(
                    itemPlano
                        ?.codigo ||
                    ""
                )
                    .trim()
                    .toUpperCase();

            acumulado.total +=
                1;

            // SAFE_SCAN_CERT2_R7_PLAN_PRECEDENCE_VISUAL
            if (
                acaoPlano ===
                    "IGNORAR_COMPLEMENTAR" ||
                acaoPlano ===
                    "IGNORAR_FORA_ESCOPO" ||
                acaoPlano ===
                    "IGNORAR_DUPLICADO"
            ) {
                acumulado.ignorados +=
                    1;

                return acumulado;
            }

            if (
                acaoPlano ===
                    "BLOQUEAR_DADOS_INVALIDOS"
            ) {
                acumulado.bloqueados +=
                    1;

                return acumulado;
            }

            // SAFE_SCAN_CERT2_M4_E2_H_R2_NAO_CADASTRADO_PRECEDE_REVISAO
            const colaboradorNaoCadastradoBloqueado =
                statusMotor ===
                    "BLOQUEADO" &&
                String(
                    item
                        ?.resolucao
                        ?.identificacaoColaborador
                        ?.status ||
                    ""
                )
                    .trim()
                    .toUpperCase() ===
                    "NAO_CADASTRADO_CONFIRMADO" &&
                codigoPlano !==
                    "CONFLITO_MULTIPLO_LOTE";

            if (
                colaboradorNaoCadastradoBloqueado
            ) {
                acumulado.bloqueados +=
                    1;

                return acumulado;
            }

            if (
                acaoPlano ===
                    "AGUARDAR_REVISAO" ||
                codigoPlano ===
                    "CONFLITO_MULTIPLO_LOTE"
            ) {
                acumulado.revisar +=
                    1;

                return acumulado;
            }

            if (
                indicesFila.has(
                    indice
                )
            ) {
                acumulado.prontos +=
                    1;

                return acumulado;
            }

            if (
                statusMotor ===
                    "IGNORADO"
            ) {
                acumulado.ignorados +=
                    1;

                return acumulado;
            }

            if (
                statusMotor ===
                    "REVISAR"
            ) {
                acumulado.revisar +=
                    1;

                return acumulado;
            }

            acumulado.bloqueados +=
                1;

            return acumulado;
        },
        {
            total:
                0,

            prontos:
                0,

            revisar:
                0,

            bloqueados:
                0,

            ignorados:
                0,
        }
    );
}

// SAFE_SCAN_27K_RESUMO_EFETIVO_HELPER_R3I_END

export function CertidaoUploadMassaPanel({
    uploadMassa,
    disponivel = true,
    embutido = false,
}) {
    const inputRef =
        useRef(
            null
        );

    const pastaInputRef =
        useRef(
            null
        );

    const [
        aberto,
        setAberto,
    ] =
        useState(
            false
        );

    const [
        arquivosSelecionados,
        setArquivosSelecionados,
    ] =
        useState(
            []
        );

    const [
        resumoSelecao,
        setResumoSelecao,
    ] =
        useState(
            null
        );

    const [
        confirmacaoPastaAberta,
        setConfirmacaoPastaAberta,
    ] =
        useState(
            false
        );

    const [
        revisaoDocumentoSalvo,
        setRevisaoDocumentoSalvo,
    ] =
        useState(
            null
        );

    // ============================================================
    // SAFE_SCAN_REVISAR_DOCUMENTO_SALVO_UI_WRITE_R10
    // ============================================================
    const [
        salvamentoDocumentoSalvo,
        setSalvamentoDocumentoSalvo,
    ] =
        useState(
            () => ({
                salvando:
                    false,

                erro:
                    "",

                sucesso:
                    "",
            })
        );

    const abrirRevisaoDocumentoSalvo =
        (item) => {
            setSalvamentoDocumentoSalvo({
                salvando:
                    false,

                erro:
                    "",

                sucesso:
                    "",
            });

            setRevisaoDocumentoSalvo(
                criarComparacaoDocumentoSalvoUploadMassa(
                    item
                )
            );
        };

    const fecharRevisaoDocumentoSalvo =
        () => {
            if (
                salvamentoDocumentoSalvo
                    ?.salvando ===
                true
            ) {
                return;
            }

            setRevisaoDocumentoSalvo(
                null
            );

            setSalvamentoDocumentoSalvo({
                salvando:
                    false,

                erro:
                    "",

                sucesso:
                    "",
            });
        };

    // ============================================================
    // SAFE_SCAN_REVIEW_MODAL_ESCAPE_CAPTURE_R12B
    //
    // O modal de revisão e o upload em massa são portals irmãos.
    // Interceptar Escape em capture impede que o modal de trás
    // receba o mesmo evento quando o foco ainda estiver nele.
    // ============================================================
    const revisaoDocumentoSalvoAberta =
        Boolean(
            revisaoDocumentoSalvo
        );

    const revisaoDocumentoSalvoSalvando =
        salvamentoDocumentoSalvo
            ?.salvando ===
        true;

    useEffect(
        () => {
            if (
                !revisaoDocumentoSalvoAberta
            ) {
                return undefined;
            }

            const interceptarEscapeRevisao =
                (evento) => {
                    if (
                        evento.key !==
                            "Escape"
                    ) {
                        return;
                    }

                    evento.preventDefault();
                    evento.stopPropagation();

                    if (
                        typeof evento
                            .stopImmediatePropagation ===
                            "function"
                    ) {
                        evento
                            .stopImmediatePropagation();
                    }

                    if (
                        revisaoDocumentoSalvoSalvando
                    ) {
                        return;
                    }

                    setRevisaoDocumentoSalvo(
                        null
                    );

                    setSalvamentoDocumentoSalvo({
                        salvando:
                            false,

                        erro:
                            "",

                        sucesso:
                            "",
                    });
                };

            window.addEventListener(
                "keydown",
                interceptarEscapeRevisao,
                true
            );

            return () => {
                window.removeEventListener(
                    "keydown",
                    interceptarEscapeRevisao,
                    true
                );
            };
        },
        [
            revisaoDocumentoSalvoAberta,
            revisaoDocumentoSalvoSalvando,
        ]
    );
    const salvarRevisaoDocumentoSalvoAtual =
        async () => {
            const revisao =
                revisaoDocumentoSalvo;

            if (
                !revisao ||
                revisao
                    ?.mudancaEstrutural ===
                    true ||
                Number(
                    revisao
                        ?.totalAlteracoes ||
                    0
                ) <= 0 ||
                salvamentoDocumentoSalvo
                    ?.salvando ===
                    true
            ) {
                return;
            }

            const executor =
                uploadMassa
                    ?.salvarAnaliseCorrigidaDocumentoSalvo;

            if (
                typeof executor !==
                    "function"
            ) {
                setSalvamentoDocumentoSalvo({
                    salvando:
                        false,

                    erro:
                        "O executor seguro da revisão não está disponível.",

                    sucesso:
                        "",
                });

                return;
            }

            const versaoId =
                String(
                    revisao
                        ?.versaoId ||
                    ""
                ).trim();

            setSalvamentoDocumentoSalvo({
                salvando:
                    true,

                erro:
                    "",

                sucesso:
                    "",
            });

            try {
                const resultado =
                    await executor({
                        versaoId,
                    });

                setRevisaoDocumentoSalvo(
                    (atual) => {
                        if (
                            !atual ||
                            String(
                                atual
                                    ?.versaoId ||
                                ""
                            ).trim() !==
                                versaoId
                        ) {
                            return atual;
                        }

                        const linhas =
                            Array.isArray(
                                atual?.linhas
                            )
                                ? atual.linhas.map(
                                    (linha) => ({
                                        ...linha,

                                        salvo:
                                            linha
                                                ?.atual,

                                        mudou:
                                            false,
                                    })
                                )
                                : [];

                        return {
                            ...atual,

                            linhas,

                            totalAlteracoes:
                                0,

                            salvoComSucesso:
                                true,
                        };
                    }
                );

                setSalvamentoDocumentoSalvo({
                    salvando:
                        false,

                    erro:
                        "",

                    sucesso:
                        resultado
                            ?.alterado ===
                            false
                            ? "A análise já estava atualizada no banco. A mesma versão foi preservada."
                            : resultado
                                ?.versaoEraAtual ===
                                false
                                ? "Análise corrigida na versão histórica selecionada. A versão atual do item permaneceu inalterada."
                                : "Análise corrigida salva na mesma versão. O PDF, o SHA e o Storage foram preservados.",
                });
            }
            catch (erro) {
                setSalvamentoDocumentoSalvo({
                    salvando:
                        false,

                    erro:
                        String(
                            erro
                                ?.message ||
                            "Não foi possível salvar a análise corrigida."
                        ).trim(),

                    sucesso:
                        "",
                });
            }
        };

    /*
     * ============================================================
     * SAFE_SCAN_F2_DESTINOS_COMPLEMENTARES_READ_ONLY_STATE
     *
     * Estado exclusivamente visual.
     * Não autoriza nem executa persistência.
     * ============================================================
     */
    const [
        observabilidadeDestinosComplementares,
        setObservabilidadeDestinosComplementares,
    ] =
        useState(
            () => ({
                carregando:
                    false,

                retorno:
                    null,
            })
        );

    const consultaDestinosComplementaresSeqRef =
        useRef(
            0
        );

    const processando =
        uploadMassa
            ?.processando ===
        true;

    const progresso =
        uploadMassa
            ?.progresso ||
        null;

    const resultado =
        uploadMassa
            ?.resultado ||
        null;

    const resumo =
        resultado
            ?.resumo ||
        uploadMassa
            ?.resumo ||
        null;

    const itens =
        Array.isArray(
            resultado?.itens
        )
            ? resultado.itens
            : [];

    /*
     * ============================================================
     * SAFE_SCAN_CERTIDAO_PANEL_PERSISTENCIA_LOTE_V1
     *
     * Persistência principal multidocumento.
     *
     * A elegibilidade continua pertencendo ao Plan.
     * O Panel apenas aciona a bridge de lote do Hook.
     * Preflight e auditoria continuam fora da UI.
     *
     * Durante CERT2-INC-27C2 o gate permanece false.
     * ============================================================
     */
    const [
        persistindoLote,
        setPersistindoLote,
    ] =
        useState(
            false
        );

    const [
        lotePersistenciaConsumido,
        setLotePersistenciaConsumido,
    ] =
        useState(
            false
        );

    const lotePersistenciaRef =
        useRef(
            false
        );

    const persistenciaPrincipalHabilitada =
        uploadMassa
            ?.persistenciaPrincipalHabilitada ===
        true;

    const bridgeLoteDisponivel =
        typeof uploadMassa
            ?.executarPersistenciaPrincipalLoteControlado ===
        "function";

    const planoPersistenciaPrincipal =
        criarPlanoPersistenciaPrincipalUploadMassa({
            resultado,
        });

    /*
     * ============================================================
     * SAFE_SCAN_CERTIDAO_PLAN_VISUAL_SHAPE_C1_RUNTIME_FIX_R2
     *
     * A UI não assume mais que o retorno raiz do Plan é Array.
     *
     * SOMENTE a coleção usada para apresentação é normalizada.
     *
     * IMPORTANTE:
     * filaPersistenciaPrincipal continua recebendo planoPersistenciaPrincipal ORIGINAL.
     * Nenhuma decisão de domínio foi movida para a interface.
     * ============================================================
     */
    const itensPlanoVisual =        Array.isArray(
            planoPersistenciaPrincipal?.itens
        )
            ? planoPersistenciaPrincipal.itens
            : [];
    const planoVisualPorIndice =
        new Map(
            itensPlanoVisual
                .filter(
                    (itemPlano) =>
                        Number.isInteger(
                            itemPlano?.indice
                        )
                )
                .map(
                    (itemPlano) => [
                        itemPlano.indice,
                        itemPlano,
                    ]
                )
        );
    /*
     * ============================================================
     * SAFE_SCAN_COMPLEMENTAR_INDIVIDUAL_UI_READ_ONLY_D2_R1T_R3B_R2
     *
     * Estado estrutural derivado pelo Hook.
     *
     * Não executa persistência.
     * Não altera a fila principal de persistência.
     * ============================================================
     */
    const planoComplementarIndividual =
        uploadMassa
            ?.planoComplementarIndividual ||
        null;

    const itensPlanoComplementarVisual =
        Array.isArray(
            planoComplementarIndividual
                ?.itens
        )
            ? planoComplementarIndividual.itens
            : [];

    const planoComplementarVisualPorIndice =
        new Map(
            itensPlanoComplementarVisual
                .filter(
                    (itemPlano) =>
                        Number.isInteger(
                            itemPlano
                                ?.indice
                        )
                )
                .map(
                    (itemPlano) => [
                        itemPlano.indice,
                        itemPlano,
                    ]
                )
        );

    /*
     * ============================================================
     * SAFE_SCAN_AUTORIZACAO_COMPLEMENTAR_UI_D2_R1T_R4C_R2
     *
     * Decisão humana somente em memória.
     *
     * "Incluir" não significa persistir.
     * ============================================================
     */
    const planoAutorizacaoComplementar =
        uploadMassa
            ?.planoAutorizacaoComplementar ||
        null;

    const itensPlanoAutorizacaoComplementar =
        Array.isArray(
            planoAutorizacaoComplementar
                ?.itens
        )
            ? planoAutorizacaoComplementar.itens
            : [];

    const planoAutorizacaoComplementarPorIndice =
        new Map(
            itensPlanoAutorizacaoComplementar
                .filter(
                    (itemPlano) =>
                        Number.isInteger(
                            itemPlano
                                ?.indice
                        )
                )
                .map(
                    (itemPlano) => [
                        itemPlano.indice,
                        itemPlano,
                    ]
                )
        );

    /*
     * ============================================================
     * SAFE_SCAN_F1_DRYRUN_RESUMO_DERIVACAO
     *
     * Observabilidade somente em memória.
     * ============================================================
     */
    const planoExecucaoComplementarDryRun =
        uploadMassa
            ?.planoExecucaoComplementarDryRun ||
        null;

    const resumoExecucaoComplementarDryRun =
        planoExecucaoComplementarDryRun
            ?.resumo ||
        null;

    const totalItensComplementaresDryRun =
        Math.max(
            0,
            Number(
                resumoExecucaoComplementarDryRun
                    ?.totalItens
            ) || 0
        );

    const candidatosComplementaresDryRun =
        Math.max(
            0,
            Number(
                resumoExecucaoComplementarDryRun
                    ?.candidatosEstruturais
            ) || 0
        );

    const naoExecutarComplementaresDryRun =
        Math.max(
            0,
            Number(
                resumoExecucaoComplementarDryRun
                    ?.naoExecutar
            ) || 0
        );

    const dryRunComplementarVisivel =
        planoExecucaoComplementarDryRun
            ?.dryRun ===
        true;

    const consultarDestinosComplementaresReadOnly =
        uploadMassa
            ?.consultarDestinosComplementaresReadOnly;

    /*
     * ============================================================
     * SAFE_SCAN_F2_DESTINOS_COMPLEMENTARES_READ_ONLY_EFFECT
     *
     * SELECT / resolução somente leitura.
     *
     * A sequência monotônica impede que uma resposta antiga
     * substitua uma consulta mais nova.
     *
     * O cleanup impede atualização após desmontagem.
     * ============================================================
     */
    useEffect(
        () => {
            const sequencia =
                consultaDestinosComplementaresSeqRef
                    .current +
                1;

            consultaDestinosComplementaresSeqRef
                .current =
                sequencia;

            let ativo =
                true;

            if (
                !dryRunComplementarVisivel ||
                typeof consultarDestinosComplementaresReadOnly !==
                    "function"
            ) {
                return () => {
                    ativo =
                        false;
                };
            }

            Promise.resolve()
                .then(
                    () => {
                        if (
                            !ativo ||
                            consultaDestinosComplementaresSeqRef
                                .current !==
                                sequencia
                        ) {
                            return null;
                        }

                        setObservabilidadeDestinosComplementares({
                            carregando:
                                true,

                            retorno:
                                null,
                        });

                        return consultarDestinosComplementaresReadOnly({
                            planoDryRun:
                                planoExecucaoComplementarDryRun,

                            resultado,
                        });
                    }
                )
                .then(
                    (retorno) => {
                        if (
                            !ativo ||
                            consultaDestinosComplementaresSeqRef
                                .current !==
                                sequencia
                        ) {
                            return;
                        }

                        setObservabilidadeDestinosComplementares({
                            carregando:
                                false,

                            retorno:
                                retorno ||
                                null,
                        });
                    }
                )
                .catch(
                    (error) => {
                        if (
                            !ativo ||
                            consultaDestinosComplementaresSeqRef
                                .current !==
                                sequencia
                        ) {
                            return;
                        }

                        setObservabilidadeDestinosComplementares({
                            carregando:
                                false,

                            retorno: {
                                somenteLeitura:
                                    true,

                                status:
                                    "FALHA_LEITURA",

                                erro:
                                    String(
                                        error?.message ||
                                        "Não foi possível consultar os destinos complementares."
                                    ),
                            },
                        });
                    }
                );

            return () => {
                ativo =
                    false;
            };
        },
        [
            consultarDestinosComplementaresReadOnly,
            dryRunComplementarVisivel,
            planoExecucaoComplementarDryRun,
            resultado,
        ]
    );
    const consultandoDestinosComplementaresReadOnly =
        observabilidadeDestinosComplementares
            ?.carregando ===
        true;

    const retornoDestinosComplementaresReadOnly =
        observabilidadeDestinosComplementares
            ?.retorno ||
        null;

    const resumoDestinosComplementaresReadOnly =
        retornoDestinosComplementaresReadOnly
            ?.resumo ||
        null;

    const novaEvidenciaComplementarReadOnly =
        Math.max(
            0,
            Number(
                resumoDestinosComplementaresReadOnly
                    ?.novaEvidencia
            ) || 0
        );

    const backfillEvidenciaComplementarReadOnly =
        Math.max(
            0,
            Number(
                resumoDestinosComplementaresReadOnly
                    ?.backfillEvidenciaExistente
            ) || 0
        );

    const jaAssociadaComplementarReadOnly =
        Math.max(
            0,
            Number(
                resumoDestinosComplementaresReadOnly
                    ?.jaAssociada
            ) || 0
        );

    const bloqueadosComplementaresReadOnly =
        Math.max(
            0,
            Number(
                resumoDestinosComplementaresReadOnly
                    ?.bloqueados
            ) || 0
        );

    const filaPersistenciaPrincipal =
        criarFilaAlvosPersistenciaPrincipalUploadMassa({
            plano:
                planoPersistenciaPrincipal,
        });

    const totalPersistiveis =
        filaPersistenciaPrincipal
            .length;

    /*
     * ============================================================
     * SAFE_SCAN_27K_RESUMO_EFETIVO_RUNTIME_R3I
     *
     * Somente apresentação:
     * - PRONTO = efetivamente presente na fila;
     * - REVISAR = status/ação de revisão;
     * - IGNORADO = fora da fila e sem pendência;
     * - BLOQUEADO = restante fail-closed.
     *
     * Não modifica Plan nem domínio.
     * ============================================================
     */
    const resumoKpiEfetivo =
        calcularResumoKpiEfetivoUploadMassa({
            itens,

            itensPlano:
                itensPlanoVisual,

            filaPersistencia:
                filaPersistenciaPrincipal,
        });

    const podeExecutarPersistenciaLote =
        persistenciaPrincipalHabilitada &&
        bridgeLoteDisponivel &&
        processando !==
            true &&
        persistindoLote !==
            true &&
        lotePersistenciaConsumido !==
            true &&
        totalPersistiveis >
            0;

    /*
     * ============================================================
     * SAFE_SCAN_CERTIDAO_LOTE_RESTAURAR_SELETORES_V1
     *
     * Fluxo legítimo de seleção restaurado:
     *
     * - PDFs individuais;
     * - pasta completa;
     * - showDirectoryPicker quando disponível;
     * - webkitdirectory como fallback;
     * - somente PDFs entregues ao motor batch.
     * ============================================================
     */

    const abrirSeletor =
        () => {
            if (
                !disponivel ||
                processando ||
                persistindoLote ===
                    true
            ) {
                return;
            }

            inputRef
                .current
                ?.click();
        };

    const selecionarArquivos =
        async (
            evento
        ) => {
            const currentTarget =
                evento
                    ?.currentTarget ||
                null;

            if (
                !currentTarget ||
                persistindoLote ===
                    true
            ) {
                if (currentTarget) {
                    try {
                        currentTarget.value =
                            "";
                    }
                    catch {
                        // Sem ação.
                    }
                }

                return;
            }

            const arquivosRecebidos =
                Array.from(
                    currentTarget
                        .files ||
                    []
                );

            const lista =
                arquivosRecebidos
                    .filter(
                        (arquivo) => {
                            const nome =
                                String(
                                    arquivo?.name ||
                                    ""
                                )
                                    .trim()
                                    .toLowerCase();

                            const mime =
                                String(
                                    arquivo?.type ||
                                    ""
                                )
                                    .trim()
                                    .toLowerCase();

                            return (
                                nome.endsWith(
                                    ".pdf"
                                ) ||
                                mime ===
                                    "application/pdf"
                            );
                        }
                    );

            const ignorados =
                Math.max(
                    0,
                    arquivosRecebidos.length -
                    lista.length
                );

            const origemPasta =
                arquivosRecebidos.some(
                    (arquivo) =>
                        Boolean(
                            String(
                                arquivo
                                    ?.webkitRelativePath ||
                                ""
                            ).trim()
                        )
                );

            setResumoSelecao({
                origem:
                    origemPasta
                        ? "PASTA"
                        : "ARQUIVOS",

                pdfs:
                    lista.length,

                ignorados,
            });

            try {
                currentTarget.value =
                    "";
            }
            catch {
                // File input/pseudo-input sem setter não quebra a seleção.
            }

            if (!lista.length) {
                return;
            }

            lotePersistenciaRef
                .current =
                    false;

            setLotePersistenciaConsumido(
                false
            );

            setArquivosSelecionados(
                lista
            );

            setAberto(
                true
            );

            try {
                await uploadMassa
                    ?.processarArquivos?.(
                        lista
                    );
            }
            catch {
                /*
                 * O Hook é dono do estado visual de erro.
                 *
                 * Não produzir rejeição não tratada no evento.
                 */
            }
        };

    const abrirSeletorPasta =
        () => {
            if (
                !disponivel ||
                processando ||
                persistindoLote ===
                    true
            ) {
                return;
            }

            setConfirmacaoPastaAberta(
                true
            );
        };

    const cancelarSelecaoPasta =
        () => {
            if (
                persistindoLote ===
                true
            ) {
                return;
            }

            setConfirmacaoPastaAberta(
                false
            );
        };

    const confirmarSelecaoPasta =
        async () => {
            if (
                !disponivel ||
                processando ||
                persistindoLote ===
                    true
            ) {
                setConfirmacaoPastaAberta(
                    false
                );

                return;
            }

            setConfirmacaoPastaAberta(
                false
            );

            const podeUsarDirectoryPicker =
                typeof window !==
                    "undefined" &&
                window.isSecureContext ===
                    true &&
                typeof window
                    .showDirectoryPicker ===
                    "function";

            if (
                !podeUsarDirectoryPicker
            ) {
                pastaInputRef
                    .current
                    ?.click();

                return;
            }

            try {
                const diretorio =
                    await window
                        .showDirectoryPicker({
                            mode:
                                "read",
                        });

                const arquivosDiretorio =
                    await coletarArquivosDiretorioSafeScan(
                        diretorio
                    );

                await selecionarArquivos({
                    currentTarget: {
                        files:
                            arquivosDiretorio,

                        value:
                            "",
                    },
                });
            }
            catch (erro) {
                if (
                    erro?.name ===
                    "AbortError"
                ) {
                    return;
                }

                console.warn(
                    "[SafeScan] Directory Picker indisponível. Usando fallback webkitdirectory.",
                    erro
                );

                pastaInputRef
                    .current
                    ?.click();
            }
        };

    const executarPersistenciaLote =
        async () => {
            if (
                !podeExecutarPersistenciaLote ||
                lotePersistenciaRef
                    .current ===
                    true ||
                typeof uploadMassa
                    ?.executarPersistenciaPrincipalLoteControlado !==
                    "function"
            ) {
                return null;
            }

            /*
             * Barreira síncrona contra clique duplo.
             * Um novo lote rearma esta proteção.
             */
            lotePersistenciaRef
                .current =
                    true;

            setLotePersistenciaConsumido(
                true
            );

            setPersistindoLote(
                true
            );

            try {
                return await uploadMassa
                    .executarPersistenciaPrincipalLoteControlado({
                        interromperNoErro:
                            false,
                    });
            }
            catch (error) {
                console.error(
                    "CERT2_ERRO_PERSISTENCIA_LOTE",
                    error
                );

                return null;
            }
            finally {
                setPersistindoLote(
                    false
                );
            }
        };

    const fechar =
        () => {
            if (
                persistindoLote ===
                true
            ) {
                return;
            }

            if (processando) {
                uploadMassa
                    ?.cancelar?.();
            }

            uploadMassa
                ?.limpar?.();

            setAberto(
                false
            );

            setArquivosSelecionados(
                []
            );
        };

    const selecionarOutroLote =
        () => {
            if (
                processando ||
                persistindoLote ===
                    true
            ) {
                return;
            }

            inputRef
                .current
                ?.click();
        };

    const total =
        Number(
            progresso
                ?.total ||
            arquivosSelecionados
                .length ||
            0
        );

    const processados =
        Number(
            progresso
                ?.processados ||
            0
        );

    const atual =
        total > 0
            ? Math.min(
                total,
                processados +
                    (
                        processando &&
                        uploadMassa
                            ?.status !==
                            "PREPARANDO_EMPRESAS"
                            ? 1
                            : 0
                    )
            )
            : 0;

    const tituloProgresso =
        uploadMassa
            ?.status ===
        "PREPARANDO_EMPRESAS"
            ? "Preparando documentos"
            : (
                total > 0
                    ? `Analisando ${atual} de ${total} documentos`
                    : "Analisando documentos"
            );

    return (
        <>
            <section
                className={
                    `certidao-upload-massa-entry${
                        embutido
                            ? " is-embedded"
                            : ""
                    }`
                }
                aria-label="Upload documental em massa"
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    multiple
                    hidden
                    onChange={
                        selecionarArquivos
                    }
                />

                <input
                    ref={pastaInputRef}
                    type="file"
                    multiple
                    hidden
                    webkitdirectory=""
                    onChange={
                        selecionarArquivos
                    }
                />

                <div className="certidao-upload-massa-entry__icon">
                    <UploadCloud
                        aria-hidden="true"
                    />
                </div>

                <div className="certidao-upload-massa-entry__copy">
                    <strong>
                        Upload em massa
                    </strong>

                    <span>
                        Selecione vários PDFs. O SafeScan identifica empresa, tipo e competência pelo conteúdo de cada documento.
                    </span>

                    {resumoSelecao ? (
                        <small className="certidao-upload-massa-entry__selection">
                            {resumoSelecao.pdfs} PDF{
                                resumoSelecao.pdfs === 1
                                    ? ""
                                    : "s"
                            } {
                                resumoSelecao.origem === "PASTA"
                                    ? "encontrado(s) na pasta"
                                    : "selecionado(s)"
                            }
                            {resumoSelecao.ignorados > 0
                                ? ` · ${resumoSelecao.ignorados} não-PDF ignorado(s)`
                                : ""}
                        </small>
                    ) : null}
                </div>

                <div className="certidao-upload-massa-entry__safety">
                    <CheckCircle2
                        aria-hidden="true"
                    />

                    <span>
                        Revisão antes de salvar
                    </span>
                </div>

                <div className="certidao-upload-massa-entry__choices">
                    <button
                        type="button"
                        className="certidao-upload-massa-choice certidao-upload-massa-choice--pdf"
                        disabled={
                            !disponivel ||
                            processando
                        }
                        onClick={
                            abrirSeletor
                        }
                    >
                        <span className="certidao-upload-massa-choice__icon">
                            <FileSearch
                                aria-hidden="true"
                            />
                        </span>

                        <span className="certidao-upload-massa-choice__copy">
                            <strong>
                                Arquivos PDF
                            </strong>

                            <small>
                                Selecione vários PDFs individuais
                            </small>
                        </span>
                    </button>

                    <button
                        type="button"
                        className="certidao-upload-massa-choice certidao-upload-massa-choice--folder"
                        disabled={
                            !disponivel ||
                            processando
                        }
                        onClick={
                            abrirSeletorPasta
                        }
                    >
                        <span className="certidao-upload-massa-choice__icon">
                            <FolderOpen
                                aria-hidden="true"
                            />
                        </span>

                        <span className="certidao-upload-massa-choice__copy">
                            <strong>
                                Pasta completa
                            </strong>

                            <small>
                                Inclui PDFs das subpastas
                            </small>
                        </span>
                    </button>
                </div>
            </section>

            {confirmacaoPastaAberta &&
                createPortal(
                    <div
                        className="certidao-upload-pasta-confirm-overlay"
                        role="presentation"
                        onMouseDown={
                            (evento) => {
                                if (
                                    evento.target ===
                                    evento.currentTarget
                                ) {
                                    cancelarSelecaoPasta();
                                }
                            }
                        }
                    >
                        <section
                            className="certidao-upload-pasta-confirm"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="certidao-upload-pasta-confirm-title"
                            aria-describedby="certidao-upload-pasta-confirm-description"
                        >
                            <header className="certidao-upload-pasta-confirm__hero">
                                <div className="certidao-upload-pasta-confirm__hero-icon">
                                    <FolderOpen
                                        aria-hidden="true"
                                    />
                                </div>

                                <div className="certidao-upload-pasta-confirm__hero-copy">
                                    <span>
                                        SAFESCAN BRASIL
                                    </span>

                                    <h3
                                        id="certidao-upload-pasta-confirm-title"
                                    >
                                        Importar pasta
                                    </h3>

                                    <p>
                                        Upload documental em massa
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    className="certidao-upload-pasta-confirm__close"
                                    aria-label="Fechar"
                                    onClick={
                                        cancelarSelecaoPasta
                                    }
                                >
                                    <X
                                        aria-hidden="true"
                                    />
                                </button>
                            </header>

                            <div className="certidao-upload-pasta-confirm__body">
                                <p
                                    id="certidao-upload-pasta-confirm-description"
                                    className="certidao-upload-pasta-confirm__lead"
                                >
                                    O SafeScan analisará somente os PDFs da pasta selecionada e das subpastas.
                                </p>

                                <div className="certidao-upload-pasta-confirm__rules">
                                    <div>
                                        <CheckCircle2
                                            aria-hidden="true"
                                        />

                                        <span>
                                            Empresa, tipo e competência serão identificados pelo conteúdo de cada PDF.
                                        </span>
                                    </div>

                                    <div>
                                        <CheckCircle2
                                            aria-hidden="true"
                                        />

                                        <span>
                                            Nenhum documento será salvo antes da revisão final do lote.
                                        </span>
                                    </div>
                                </div>

                                <div className="certidao-upload-pasta-confirm__browser-note">
                                    <AlertTriangle
                                        aria-hidden="true"
                                    />

                                    <span>
                                        O navegador poderá solicitar permissão para ler os arquivos da pasta escolhida.
                                    </span>
                                </div>
                            </div>

                            <footer className="certidao-upload-pasta-confirm__footer">
                                <button
                                    type="button"
                                    className="certidao-upload-pasta-confirm__cancel"
                                    onClick={
                                        cancelarSelecaoPasta
                                    }
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="button"
                                    className="certidao-upload-pasta-confirm__confirm"
                                    onClick={
                                        confirmarSelecaoPasta
                                    }
                                >
                                    <FolderOpen
                                        aria-hidden="true"
                                    />

                                    <span>
                                        Selecionar pasta
                                    </span>
                                </button>
                            </footer>
                        </section>
                    </div>,
                    document.body
                )}

            {aberto &&
                createPortal(
                    <div
                        className="certidao-upload-massa-overlay"
                        role="presentation"
                    >
                        <section
                            className="certidao-upload-massa-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="certidao-upload-massa-titulo"
                            aria-busy={
                                processando
                            }
                            onKeyDown={(evento) => {
                                evento.stopPropagation();

                                if (
                                    evento.key ===
                                    "Escape"
                                ) {
                                    fechar();
                                }
                            }}
                        >
                            <header className="certidao-upload-massa-modal__header">
                                <div className="certidao-upload-massa-modal__identity">
                                    <div className="certidao-upload-massa-modal__badge">
                                        <UploadCloud
                                            aria-hidden="true"
                                        />
                                    </div>

                                    <div>
                                        <span>
                                            SAFESCAN BRASIL
                                        </span>

                                        <h2 id="certidao-upload-massa-titulo">
                                            Revisão do upload em massa
                                        </h2>

                                        <p>
                                            Nenhum arquivo será salvo antes da conferência final.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="certidao-upload-massa-modal__close"
                                    aria-label="Fechar upload em massa"
                                    onClick={
                                        fechar
                                    }
                                >
                                    <X
                                        aria-hidden="true"
                                    />
                                </button>
                            </header>

                            <div className="certidao-upload-massa-modal__body">
                                {processando ? (
                                    <CertidaoDocumentosLoadingVisual
                                        titulo={
                                            tituloProgresso
                                        }
                                        mensagem={
                                            progresso
                                                ?.mensagem ||
                                            "Aguarde enquanto o SafeScan analisa os documentos."
                                        }
                                        percentual={
                                            progresso
                                                ?.percentual ||
                                            0
                                        }
                                        atual={
                                            atual
                                        }
                                        total={
                                            total
                                        }
                                    />
                                ) : null}

                                {!processando &&
                                    uploadMassa
                                        ?.status ===
                                        "CANCELADO" ? (
                                    <div className="certidao-upload-massa-state certidao-upload-massa-state--warning">
                                        <AlertTriangle
                                            aria-hidden="true"
                                        />

                                        <div>
                                            <strong>
                                                Análise cancelada
                                            </strong>

                                            <span>
                                                O lote foi interrompido. Nenhum documento foi salvo.
                                            </span>
                                        </div>
                                    </div>
                                ) : null}

                                {!processando &&
                                    uploadMassa
                                        ?.erro ? (
                                    <div className="certidao-upload-massa-state certidao-upload-massa-state--error">
                                        <XCircle
                                            aria-hidden="true"
                                        />

                                        <div>
                                            <strong>
                                                Não foi possível analisar o lote
                                            </strong>

                                            <span>
                                                {
                                                    uploadMassa
                                                        .erro
                                                }
                                            </span>
                                        </div>
                                    </div>
                                ) : null}

                                {!processando &&
                                    resumo ? (
                                    <div className="certidao-upload-massa-summary">
                                        <article>
                                            <span>
                                                    Documentos
                                                </span>

                                            <strong>
                                                {
                                                    resumoKpiEfetivo.total ||
                                                    0
                                                }
                                            </strong>
                                        </article>

                                        <article className="is-pronto">
                                            <span>
                                                Prontos
                                            </span>

                                            <strong>
                                                {
                                                    resumoKpiEfetivo.prontos ||
                                                    0
                                                }
                                            </strong>
                                        </article>

                                        <article className="is-revisar">
                                            <span>
                                                Revisar
                                            </span>

                                            <strong>
                                                {
                                                    resumoKpiEfetivo.revisar ||
                                                    0
                                                }
                                            </strong>
                                        </article>

                                        <article className="is-bloqueado">
                                            <span>
                                                Bloqueados
                                            </span>

                                            <strong>
                                                {
                                                    resumoKpiEfetivo.bloqueados ||
                                                    0
                                                }
                                            </strong>
                                        </article>

                                            <article className="is-ignorado">
                                                <span>
                                                    Ignorados
                                                </span>

                                                <strong>
                                                    {
                                                        resumoKpiEfetivo.ignorados ||
                                                        0
                                                    }
                                                </strong>
                                            </article>
                                    </div>
                                ) : null}

                                {!processando &&
                                    itens.length > 0 ? (
                                    <div className="certidao-upload-massa-table-wrap">
                                        <table className="certidao-upload-massa-table">
                                            <thead>
                                                <tr>
                                                    <th>
                                                        Arquivo
                                                    </th>

                                                    <th>
                                                        Documento
                                                    </th>

                                                    <th>
                                                        Empresa
                                                    </th>

                                                    <th>
                                                        Competência / origem
                                                    </th>

                                                    <th>
                                                        Confiança
                                                    </th>

                                                    <th>
                                                        Status
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {
                                                    itens.map(
                                                        (
                                                            item,
                                                            indiceLinha
                                                        ) => {
                                                            const resolucao =
                                                                item
                                                                    ?.resolucao ||
                                                                {};

                                                            const indiceItem =
                                                                Number.isInteger(
                                                                    item?.indice
                                                                )
                                                                    ? item.indice
                                                                    : indiceLinha;

                                                            const itemPlanoVisual =
                                                                planoVisualPorIndice
                                                                    .get(
                                                                        indiceItem
                                                                    ) ||
                                                                null;

                                                            const itemPlanoComplementarVisual =
                                                                planoComplementarVisualPorIndice
                                                                    .get(
                                                                        indiceLinha
                                                                    ) ||
                                                                null;

                                                            const estadoPlanoComplementar =
                                                                String(
                                                                    itemPlanoComplementarVisual
                                                                        ?.estado ||
                                                                    ""
                                                                );

                                                            const complementarVisual =
                                                                estadoPlanoComplementar ===
                                                                "ELEGIVEL"
                                                                    ? {
                                                                        classe:
                                                                            "is-estrutura-pronta",

                                                                        titulo:
                                                                            "Estrutura complementar pronta",

                                                                        nota:
                                                                            "Vínculo, natureza financeira e documento principal resolvidos. Nenhum salvamento foi autorizado.",
                                                                    }
                                                                    : estadoPlanoComplementar ===
                                                                        "AGUARDAR_CLASSIFICACAO_FINANCEIRA"
                                                                        ? {
                                                                            classe:
                                                                                "is-classificacao",

                                                                            titulo:
                                                                                "Classificação necessária",

                                                                            nota:
                                                                                "Defina se o comprovante SISPAG corresponde a pagamento salarial ou adiantamento.",
                                                                        }
                                                                        : estadoPlanoComplementar ===
                                                                            "AGUARDAR_ITEM_PRINCIPAL"
                                                                            ? {
                                                                                classe:
                                                                                    "is-item-principal",

                                                                                titulo:
                                                                                    "Aguardando documento principal",

                                                                                nota:
                                                                                    "A evidência individual está preparada, mas depende do item mensal principal antes de qualquer persistência.",
                                                                            }
                                                                            : null;

                                                            const itemPlanoAutorizacaoVisual =
                                                                planoAutorizacaoComplementarPorIndice
                                                                    .get(
                                                                        indiceLinha
                                                                    ) ||
                                                                null;

                                                            const estadoAutorizacaoComplementarVisual =
                                                                String(
                                                                    itemPlanoAutorizacaoVisual
                                                                        ?.estado ||
                                                                    ""
                                                                );

                                                            const autorizacaoComplementarVisivel =
                                                                itemPlanoAutorizacaoVisual
                                                                    ?.autorizavel ===
                                                                    true &&
                                                                (
                                                                    estadoAutorizacaoComplementarVisual ===
                                                                        "AGUARDAR_AUTORIZACAO" ||
                                                                    estadoAutorizacaoComplementarVisual ===
                                                                        "AUTORIZADO_EM_MEMORIA" ||
                                                                    estadoAutorizacaoComplementarVisual ===
                                                                        "NAO_INCLUIR_EM_MEMORIA" ||
                                                                    estadoAutorizacaoComplementarVisual ===
                                                                        "AUTORIZACAO_OBSOLETA"
                                                                );

                                                            const autorizacaoComplementarIncluida =
                                                                estadoAutorizacaoComplementarVisual ===
                                                                "AUTORIZADO_EM_MEMORIA";

                                                            const autorizacaoComplementarNaoIncluir =
                                                                estadoAutorizacaoComplementarVisual ===
                                                                "NAO_INCLUIR_EM_MEMORIA";

                                                            const autorizacaoComplementarObsoleta =
                                                                estadoAutorizacaoComplementarVisual ===
                                                                "AUTORIZACAO_OBSOLETA";

                                                            const notaAutorizacaoComplementar =
                                                                autorizacaoComplementarObsoleta
                                                                    ? "Os dados mudaram. Confirme novamente."
                                                                    : autorizacaoComplementarIncluida
                                                                        ? "Incluído nesta revisão. Ainda sem persistência."
                                                                        : autorizacaoComplementarNaoIncluir
                                                                            ? "Não incluir nesta revisão."
                                                                            : "Defina se este documento deve ser incluído.";

                                                            const avisoSemantico =
                                                                obterAvisoSemanticoUploadMassa({
                                                                    item,

                                                                    itemPlano:
                                                                        itemPlanoVisual,
                                                                });

                                                            const statusVisual =
                                                                avisoSemantico ||
                                                                obterStatusVisual(
                                                                    resolucao
                                                                        .status
                                                                );

                                                            const StatusIcon =
                                                                statusVisual
                                                                    .icone;

                                                            const motivo =
                                                                avisoSemantico
                                                                    ?.mensagem ||
                                                                obterMotivoPrincipal(
                                                                    resolucao
                                                                );

                                                                                                                        const duplicidadeHistorica =
                                                                                                                            String(
                                                                                                                                item
                                                                                                                                    ?.duplicidade
                                                                                                                                    ?.codigo ||
                                                                                                                                ""
                                                                                                                            )
                                                                                                                                .trim()
                                                                                                                                .toUpperCase() ===
                                                                                                                            "DUPLICADO_EXATO_HISTORICO"
                                                                                                                                ? item
                                                                                                                                    ?.duplicidade
                                                                                                                                    ?.historico ||
                                                                                                                                    null
                                                                                                                                : null;

                                                                                                                        const podeRevisarDocumentoSalvo =
                                                                                                                            Boolean(
                                                                                                                                duplicidadeHistorica
                                                                                                                                    ?.versaoId
                                                                                                                            );
                                                                                                                        const colaboradorVisual =
                                                                obterDetalheColaboradorUploadMassa(
                                                                    resolucao
                                                                );

const conflitoLogico =
                                                                item?.conflitoLogico ||
                                                                resolucao
                                                                    ?.conflitoLogico ||
                                                                null;

                                                            const possuiConflitoLogico =
                                                                conflitoLogico
                                                                    ?.codigo ===
                                                                "CONFLITO_LOGICO_VERSAO";

                                                            const decisaoConflitoLogico =
                                                                String(
                                                                    conflitoLogico
                                                                        ?.decisao ||
                                                                    ""
                                                                ).trim();

                                                            const decisoesPermitidasConflito =
                                                                Array.isArray(
                                                                    conflitoLogico
                                                                        ?.decisoesPermitidas
                                                                )
                                                                    ? conflitoLogico
                                                                        .decisoesPermitidas
                                                                    : [];

                                                            /*
                                                             * SAFE_SCAN_SISPAG_CLASSIFICACAO_UI_STATE_D2_R1S4
                                                             */
                                                            const vinculoFolhaFinanceiro =
                                                                item
                                                                    ?.resolucao
                                                                    ?.vinculoFolha ||
                                                                {};

                                                            const identificacaoColaboradorFinanceiro =
                                                                item
                                                                    ?.resolucao
                                                                    ?.identificacaoColaborador ||
                                                                item
                                                                    ?.identificacaoColaborador ||
                                                                {};

                                                            const tipoEvidenciaFinanceira =
                                                                String(
                                                                    vinculoFolhaFinanceiro
                                                                        ?.tipoEvidencia ||
                                                                    ""
                                                                )
                                                                    .trim()
                                                                    .toUpperCase();

                                                            const classificacaoFinanceiraVisivel =
                                                                (
                                                                    vinculoFolhaFinanceiro
                                                                        ?.classificacaoFinanceiraPendente ===
                                                                        true ||
                                                                    vinculoFolhaFinanceiro
                                                                        ?.classificacaoFinanceiraManual ===
                                                                        true ||
                                                                    tipoEvidenciaFinanceira ===
                                                                        "PAGAMENTO_SALARIAL" ||
                                                                    tipoEvidenciaFinanceira ===
                                                                        "ADIANTAMENTO_SALARIAL"
                                                                ) &&
                                                                String(
                                                                    item
                                                                        ?.resolucao
                                                                        ?.status ||
                                                                    ""
                                                                )
                                                                    .trim()
                                                                    .toUpperCase() !==
                                                                    "BLOQUEADO" &&
                                                                String(
                                                                    identificacaoColaboradorFinanceiro
                                                                        ?.status ||
                                                                    ""
                                                                )
                                                                    .trim()
                                                                    .toUpperCase() ===
                                                                    "LOCALIZADO";
                                                            return (
                                                                <tr
                                                                    key={
                                                                        String(
                                                                            item
                                                                                ?.hash
                                                                                ?.sha256 ||
                                                                            item
                                                                                ?.proveniencia
                                                                                ?.nomeOriginal ||
                                                                            "documento"
                                                                        ) +
                                                                        "-" +
                                                                        String(
                                                                            Number.isInteger(
                                                                                item
                                                                                    ?.indice
                                                                            )
                                                                                ? item.indice
                                                                                : indiceLinha
                                                                        ) +
                                                                        "-" +
                                                                        String(
                                                                            indiceLinha
                                                                        )
                                                                    }
                                                                >
                                                                    <td>
                                                                        <strong>
                                                                            {
                                                                                item
                                                                                    ?.proveniencia
                                                                                    ?.nomeOriginal ||
                                                                                "Documento PDF"
                                                                            }
                                                                        </strong>

                                                                        {
                                                                            item
                                                                                ?.proveniencia
                                                                                ?.caminhoRelativo ? (
                                                                                <small>
                                                                                    {
                                                                                        item
                                                                                            .proveniencia
                                                                                            .caminhoRelativo
                                                                                    }
                                                                                </small>
                                                                            ) : null
                                                                        }
                                                                    </td>

                                                                    <td>
                                                                        <strong>
                                                                            {
                                                                                resolucao
                                                                                    .titulo ||
                                                                                "Não identificado"
                                                                            }
                                                                        </strong>

                                                                        <small>
                                                                            {
                                                                                resolucao
                                                                                    .politica ||
                                                                                "Sem política"
                                                                            }
                                                                        </small>
                                                                    </td>

                                                                    <td>
                                                                        <strong>
                                                                            {
                                                                                obterTituloEmpresaUploadMassa(
                                                                                    resolucao
                                                                                )
                                                                            }
                                                                        </strong>

                                                                        <small
                                                                            className="certidao-upload-massa__empresa-detalhe"
                                                                        >
                                                                            {
                                                                                obterDetalheEmpresaUploadMassa(
                                                                                    resolucao
                                                                                )
                                                                            }
                                                                        </small>

                                                                        {
                                                                            colaboradorVisual ? (
                                                                                <div
                                                                                    className={
                                                                                        "certidao-upload-massa__colaborador " +
                                                                                        "is-" +
                                                                                        String(
                                                                                            colaboradorVisual.status ||
                                                                                            "localizado"
                                                                                        )
                                                                                            .toLowerCase()
                                                                                            .replace(
                                                                                                /_/g,
                                                                                                "-"
                                                                                            )
                                                                                    }
                                                                                >
                                                                                    <span
                                                                                        className="certidao-upload-massa__colaborador-nome"
                                                                                    >
                                                                                        {
                                                                                            colaboradorVisual.nome
                                                                                        }
                                                                                    </span>

                                                                                    <span
                                                                                        className="certidao-upload-massa__colaborador-criterio"
                                                                                    >
                                                                                        {
                                                                                            colaboradorVisual.criterio
                                                                                        }
                                                                                    </span>
                                                                                </div>
                                                                            ) : null
                                                                        }
                                                                    </td>

                                                                    <td>
                                                                        <strong>
                                                                            {
                                                                                formatarCompetencia(
                                                                                    resolucao
                                                                                )
                                                                            }
                                                                        </strong>

                                                                        <small>
                                                                            {
                                                                                formatarOrigemResolucaoUploadMassa(
                                                                                    resolucao
                                                                                )
                                                                            }
                                                                        </small>
                                                                    </td>

                                                                    <td>
                                                                        <strong>
                                                                            {
                                                                                Number(
                                                                                    resolucao
                                                                                        .confianca ||
                                                                                    0
                                                                                )
                                                                            }%
                                                                        </strong>
                                                                    </td>

                                                                    <td>
                                                                        <span
                                                                            className={
                                                                                `certidao-upload-massa-status ${statusVisual.classe}`
                                                                            }
                                                                        >
                                                                            <StatusIcon
                                                                                aria-hidden="true"
                                                                            />

                                                                            {
                                                                                statusVisual
                                                                                    .label
                                                                            }
                                                                        </span>

                                                                        {
                                                                            motivo ? (
                                                                                <small className="certidao-upload-massa-motivo">
                                                                                    {
                                                                                        motivo
                                                                                    }
                                                                                </small>
                                                                            ) : null
                                                                        }
                                                                                                                                                {
                                                                                                                                                    podeRevisarDocumentoSalvo ? (
                                                                                                                                                        <button
                                                                                                                                                            type="button"
                                                                                                                                                            className="certidao-upload-massa-button certidao-upload-massa-button--secondary"
                                                                                                                                                            data-safe-scan-review-existing="true"
                                                                                                                                                            aria-label="Revisar documento salvo"
                                                                                                                                                            title="Comparar a análise salva anteriormente com a análise produzida agora."
                                                                                                                                                            onClick={
                                                                                                                                                                () => {
                                                                                                                                                                    abrirRevisaoDocumentoSalvo(item);
                                                                                                                                                                }
                                                                                                                                                            }
                                                                                                                                                            style={{
                                                                                                                                                                minHeight: "30px",
                                                                                                                                                                marginTop: "0.45rem",
                                                                                                                                                                padding: "0 0.6rem",
                                                                                                                                                                fontSize: "0.64rem",
                                                                                                                                                            }}
                                                                                                                                                        >
                                                                                                                                                            <FileSearch
                                                                                                                                                                aria-hidden="true"
                                                                                                                                                            />

                                                                                                                                                            Revisar documento salvo
                                                                                                                                                        </button>
                                                                                                                                                    ) : null
                                                                                                                                                }
                                                                                                                                                {
                                                                                                                                                    complementarVisual ? (
                                                                                                                                                        <div
                                                                                                                                                            className={
                                                                                                                                                                "certidao-upload-massa-complementar " +
                                                                                                                                                                complementarVisual
                                                                                                                                                                    .classe
                                                                                                                                                            }
                                                                                                                                                        >
                                                                                                                                                            <strong>
                                                                                                                                                                {
                                                                                                                                                                    complementarVisual
                                                                                                                                                                        .titulo
                                                                                                                                                                }
                                                                                                                                                            </strong>

                                                                                                                                                            <span>
                                                                                                                                                                {
                                                                                                                                                                    complementarVisual
                                                                                                                                                                        .nota
                                                                                                                                                                }
                                                                                                                                                            </span>
                                                                                                                                                        </div>
                                                                                                                                                    ) : null
                                                                                                                                                }

                                                                                                                                                {/* SAFE_SCAN_AUTORIZACAO_COMPLEMENTAR_UI_D2_R1T_R4C_R2 */}
                                                                                                                                                {
                                                                                                                                                    autorizacaoComplementarVisivel ? (
                                                                                                                                                        <fieldset
                                                                                                                                                            className={
                                                                                                                                                                "certidao-upload-massa-autorizacao" +
                                                                                                                                                                (
                                                                                                                                                                    autorizacaoComplementarObsoleta
                                                                                                                                                                        ? " is-obsoleta"
                                                                                                                                                                        : ""
                                                                                                                                                                )
                                                                                                                                                            }
                                                                                                                                                        >
                                                                                                                                                            <legend>
                                                                                                                                                                Revisão do documento
                                                                                                                                                            </legend>

                                                                                                                                                            <div className="certidao-upload-massa-autorizacao-opcoes">
                                                                                                                                                                <label
                                                                                                                                                                    className={
                                                                                                                                                                        "certidao-upload-massa-autorizacao-opcao" +
                                                                                                                                                                        (
                                                                                                                                                                            autorizacaoComplementarIncluida
                                                                                                                                                                                ? " is-incluir"
                                                                                                                                                                                : ""
                                                                                                                                                                        )
                                                                                                                                                                    }
                                                                                                                                                                >
                                                                                                                                                                    <input
                                                                                                                                                                        type="radio"
                                                                                                                                                                        name={
                                                                                                                                                                            "certidao-autorizacao-complementar-" +
                                                                                                                                                                            indiceLinha
                                                                                                                                                                        }
                                                                                                                                                                        value="AUTORIZAR_INCLUSAO"
                                                                                                                                                                        checked={
                                                                                                                                                                            autorizacaoComplementarIncluida
                                                                                                                                                                        }
                                                                                                                                                                        disabled={
                                                                                                                                                                            uploadMassa
                                                                                                                                                                                ?.processando ===
                                                                                                                                                                            true
                                                                                                                                                                        }
                                                                                                                                                                        onChange={
                                                                                                                                                                            () =>
                                                                                                                                                                                uploadMassa
                                                                                                                                                                                    ?.definirDecisaoAutorizacaoComplementar
                                                                                                                                                                                    ?.(
                                                                                                                                                                                        indiceLinha,
                                                                                                                                                                                        "AUTORIZAR_INCLUSAO"
                                                                                                                                                                                    )
                                                                                                                                                                        }
                                                                                                                                                                    />

                                                                                                                                                                    <span>
                                                                                                                                                                        Incluir
                                                                                                                                                                    </span>
                                                                                                                                                                </label>

                                                                                                                                                                <label
                                                                                                                                                                    className={
                                                                                                                                                                        "certidao-upload-massa-autorizacao-opcao" +
                                                                                                                                                                        (
                                                                                                                                                                            autorizacaoComplementarNaoIncluir
                                                                                                                                                                                ? " is-nao-incluir"
                                                                                                                                                                                : ""
                                                                                                                                                                        )
                                                                                                                                                                    }
                                                                                                                                                                >
                                                                                                                                                                    <input
                                                                                                                                                                        type="radio"
                                                                                                                                                                        name={
                                                                                                                                                                            "certidao-autorizacao-complementar-" +
                                                                                                                                                                            indiceLinha
                                                                                                                                                                        }
                                                                                                                                                                        value="NAO_INCLUIR"
                                                                                                                                                                        checked={
                                                                                                                                                                            autorizacaoComplementarNaoIncluir
                                                                                                                                                                        }
                                                                                                                                                                        disabled={
                                                                                                                                                                            uploadMassa
                                                                                                                                                                                ?.processando ===
                                                                                                                                                                            true
                                                                                                                                                                        }
                                                                                                                                                                        onChange={
                                                                                                                                                                            () =>
                                                                                                                                                                                uploadMassa
                                                                                                                                                                                    ?.definirDecisaoAutorizacaoComplementar
                                                                                                                                                                                    ?.(
                                                                                                                                                                                        indiceLinha,
                                                                                                                                                                                        "NAO_INCLUIR"
                                                                                                                                                                                    )
                                                                                                                                                                        }
                                                                                                                                                                    />

                                                                                                                                                                    <span>
                                                                                                                                                                        Não incluir
                                                                                                                                                                    </span>
                                                                                                                                                                </label>
                                                                                                                                                            </div>

                                                                                                                                                            <p>
                                                                                                                                                                {
                                                                                                                                                                    notaAutorizacaoComplementar
                                                                                                                                                                }
                                                                                                                                                            </p>
                                                                                                                                                        </fieldset>
                                                                                                                                                    ) : null
                                                                                                                                                }

                                                                                                                                                {/* SAFE_SCAN_SISPAG_CLASSIFICACAO_UI_D2_R1S4 */}
                                                                        {
                                                                            classificacaoFinanceiraVisivel ? (
                                                                                <fieldset className="certidao-upload-massa-decisao">
                                                                                    <legend>
                                                                                        Classificação do comprovante
                                                                                    </legend>

                                                                                    <label
                                                                                        className={
                                                                                            (
                                                                                                "certidao-upload-massa-decisao__opcao" +
                                                                                                (
                                                                                                    tipoEvidenciaFinanceira ===
                                                                                                    "PAGAMENTO_SALARIAL"
                                                                                                        ? " is-selected"
                                                                                                        : ""
                                                                                                )
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        <input
                                                                                            type="radio"
                                                                                            name={
                                                                                                "certidao-sispag-classificacao-" +
                                                                                                indiceLinha
                                                                                            }
                                                                                            value="PAGAMENTO_SALARIAL"
                                                                                            checked={
                                                                                                tipoEvidenciaFinanceira ===
                                                                                                "PAGAMENTO_SALARIAL"
                                                                                            }
                                                                                            disabled={
                                                                                                !uploadMassa
                                                                                                    ?.definirClassificacaoFinanceiraSispag
                                                                                            }
                                                                                            onChange={() =>
                                                                                                uploadMassa
                                                                                                    ?.definirClassificacaoFinanceiraSispag
                                                                                                    ?.(
                                                                                                        indiceLinha,
                                                                                                        "PAGAMENTO_SALARIAL"
                                                                                                    )
                                                                                            }
                                                                                        />

                                                                                        <span>
                                                                                            Pagamento salarial
                                                                                        </span>
                                                                                    </label>

                                                                                    <label
                                                                                        className={
                                                                                            (
                                                                                                "certidao-upload-massa-decisao__opcao" +
                                                                                                (
                                                                                                    tipoEvidenciaFinanceira ===
                                                                                                    "ADIANTAMENTO_SALARIAL"
                                                                                                        ? " is-selected"
                                                                                                        : ""
                                                                                                )
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        <input
                                                                                            type="radio"
                                                                                            name={
                                                                                                "certidao-sispag-classificacao-" +
                                                                                                indiceLinha
                                                                                            }
                                                                                            value="ADIANTAMENTO_SALARIAL"
                                                                                            checked={
                                                                                                tipoEvidenciaFinanceira ===
                                                                                                "ADIANTAMENTO_SALARIAL"
                                                                                            }
                                                                                            disabled={
                                                                                                !uploadMassa
                                                                                                    ?.definirClassificacaoFinanceiraSispag
                                                                                            }
                                                                                            onChange={() =>
                                                                                                uploadMassa
                                                                                                    ?.definirClassificacaoFinanceiraSispag
                                                                                                    ?.(
                                                                                                        indiceLinha,
                                                                                                        "ADIANTAMENTO_SALARIAL"
                                                                                                    )
                                                                                            }
                                                                                        />

                                                                                        <span>
                                                                                            Adiantamento salarial
                                                                                        </span>
                                                                                    </label>

                                                                                    <span className="certidao-upload-massa-decisao__nota">
                                                                                        {
                                                                                            tipoEvidenciaFinanceira
                                                                                                ? (
                                                                                                    "Classificação registrada somente nesta revisão. " +
                                                                                                    "O documento continua sem persistência."
                                                                                                )
                                                                                                : (
                                                                                                    "SISPAG identifica o canal bancário. " +
                                                                                                    "Informe se o crédito é pagamento ou adiantamento salarial."
                                                                                                )
                                                                                        }
                                                                                    </span>
                                                                                </fieldset>
                                                                            ) : null
                                                                        }
{/* SAFE_SCAN_CONFLITO_LOGICO_DECISAO_UI_V1 */}
                                                                                                        {
                                                                                                            possuiConflitoLogico ? (
                                                                                                                <fieldset className="certidao-upload-massa-decisao">
                                                                                                                    <legend>
                                                                                                                        Decisão da revisão
                                                                                                                    </legend>

                                                                                                                    <label
                                                                                                                        className={
                                                                                                                            (
                                                                                                                                "certidao-upload-massa-decisao__opcao" +
                                                                                                                                (
                                                                                                                                    decisaoConflitoLogico ===
                                                                                                                                    "MANTER_ATUAL"
                                                                                                                                        ? " is-selected"
                                                                                                                                        : ""
                                                                                                                                )
                                                                                                                            )
                                                                                                                        }
                                                                                                                    >
                                                                                                                        <input
                                                                                                                            type="radio"
                                                                                                                            name={
                                                                                                                                "certidao-conflito-logico-" +
                                                                                                                                indiceLinha
                                                                                                                            }
                                                                                                                            value="MANTER_ATUAL"
                                                                                                                            checked={
                                                                                                                                decisaoConflitoLogico ===
                                                                                                                                "MANTER_ATUAL"
                                                                                                                            }
                                                                                                                            disabled={
                                                                                                                                !uploadMassa
                                                                                                                                    ?.definirDecisaoConflitoLogico ||
                                                                                                                                !decisoesPermitidasConflito
                                                                                                                                    .includes(
                                                                                                                                        "MANTER_ATUAL"
                                                                                                                                    )
                                                                                                                            }
                                                                                                                            onChange={() =>
                                                                                                                                uploadMassa
                                                                                                                                    ?.definirDecisaoConflitoLogico
                                                                                                                                    ?.(
                                                                                                                                        indiceLinha,
                                                                                                                                        "MANTER_ATUAL"
                                                                                                                                    )
                                                                                                                            }
                                                                                                                        />

                                                                                                                        <span>
                                                                                                                            Manter documento atual
                                                                                                                        </span>
                                                                                                                    </label>

                                                                                                                    <label
                                                                                                                        className={
                                                                                                                            (
                                                                                                                                "certidao-upload-massa-decisao__opcao" +
                                                                                                                                (
                                                                                                                                    decisaoConflitoLogico ===
                                                                                                                                    "USAR_NOVO_COMO_NOVA_VERSAO"
                                                                                                                                        ? " is-selected"
                                                                                                                                        : ""
                                                                                                                                )
                                                                                                                            )
                                                                                                                        }
                                                                                                                    >
                                                                                                                        <input
                                                                                                                            type="radio"
                                                                                                                            name={
                                                                                                                                "certidao-conflito-logico-" +
                                                                                                                                indiceLinha
                                                                                                                            }
                                                                                                                            value="USAR_NOVO_COMO_NOVA_VERSAO"
                                                                                                                            checked={
                                                                                                                                decisaoConflitoLogico ===
                                                                                                                                "USAR_NOVO_COMO_NOVA_VERSAO"
                                                                                                                            }
                                                                                                                            disabled={
                                                                                                                                !uploadMassa
                                                                                                                                    ?.definirDecisaoConflitoLogico ||
                                                                                                                                !decisoesPermitidasConflito
                                                                                                                                    .includes(
                                                                                                                                        "USAR_NOVO_COMO_NOVA_VERSAO"
                                                                                                                                    )
                                                                                                                            }
                                                                                                                            onChange={() =>
                                                                                                                                uploadMassa
                                                                                                                                    ?.definirDecisaoConflitoLogico
                                                                                                                                    ?.(
                                                                                                                                        indiceLinha,
                                                                                                                                        "USAR_NOVO_COMO_NOVA_VERSAO"
                                                                                                                                    )
                                                                                                                            }
                                                                                                                        />

                                                                                                                        <span>
                                                                                                                            Usar novo como nova versão
                                                                                                                        </span>
                                                                                                                    </label>

                                                                                                                    <span className="certidao-upload-massa-decisao__nota">
                                                                                                                        {
                                                                                                                            decisaoConflitoLogico
                                                                                                                                ? (
                                                                                                                                    "Decisão registrada nesta revisão. " +
                                                                                                                                    "Nenhum documento foi salvo."
                                                                                                                                )
                                                                                                                                : (
                                                                                                                                    "Escolha obrigatória antes da etapa " +
                                                                                                                                    "de persistência."
                                                                                                                                )
                                                                                                                        }
                                                                                                                    </span>
                                                                                                                </fieldset>
                                                                                                            ) : null
                                                                                                        }

                                                                    </td>
                                                                </tr>
                                                            );
                                                        }
                                                    )
                                                }
                                            </tbody>
                                        </table>
                                    </div>
                                ) : null}


                            </div>

                            {/* ============================================================
                             * SAFE_SCAN_F1_DRYRUN_RESUMO_UI
                             * SAFE_SCAN_F1_R3_DRYRUN_VISUAL
                             *
                             * Painel somente informativo.
                             * Nenhuma ação de persistência.
                             * ============================================================ */}
                            {dryRunComplementarVisivel && !processando ? (
                                <section
                                    className="certidao-upload-massa-dry-run-card"
                                    role="status"
                                    aria-live="polite"
                                    aria-label="Resumo do dry-run complementar"
                                >
                                    <header className="certidao-upload-massa-dry-run-card__header">
                                        <div className="certidao-upload-massa-dry-run-card__intro">
                                            <div className="certidao-upload-massa-dry-run-card__title-row">
                                                <span
                                                    className="certidao-upload-massa-dry-run-card__indicator"
                                                    aria-hidden="true"
                                                />

                                                <div>
                                                    <strong className="certidao-upload-massa-dry-run-card__title">
                                                        Dry-run complementar
                                                    </strong>

                                                    <span className="certidao-upload-massa-dry-run-card__subtitle">
                                                        Conferência somente em memória
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="certidao-upload-massa-dry-run-card__status certidao-upload-massa-dry-run-card__status--persistence">
                                            <span className="certidao-upload-massa-dry-run-card__status-dot" />

                                            <span>
                                                Sem persistência
                                            </span>
                                        </div>
                                    </header>

                                    <div className="certidao-upload-massa-dry-run-card__row">
                                        <span className="certidao-upload-massa-dry-run-card__row-label">
                                            Resumo do lote
                                        </span>

                                        <div className="certidao-upload-massa-dry-run-card__metrics certidao-upload-massa-dry-run-card__metrics--summary">
                                            <div className="certidao-upload-massa-dry-run-card__metric">
                                                <span className="certidao-upload-massa-dry-run-card__metric-label">
                                                    Itens
                                                </span>

                                                <strong className="certidao-upload-massa-dry-run-card__metric-value">
                                                    {totalItensComplementaresDryRun}
                                                </strong>
                                            </div>

                                            <div className="certidao-upload-massa-dry-run-card__metric">
                                                <span className="certidao-upload-massa-dry-run-card__metric-label">
                                                    Candidatos estruturais
                                                </span>

                                                <strong className="certidao-upload-massa-dry-run-card__metric-value">
                                                    {candidatosComplementaresDryRun}
                                                </strong>
                                            </div>

                                            <div className="certidao-upload-massa-dry-run-card__metric">
                                                <span className="certidao-upload-massa-dry-run-card__metric-label">
                                                    Não executáveis
                                                </span>

                                                <strong className="certidao-upload-massa-dry-run-card__metric-value">
                                                    {naoExecutarComplementaresDryRun}
                                                </strong>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ============================================================
                                     * SAFE_SCAN_F2_DESTINOS_COMPLEMENTARES_READ_ONLY_UI
                                     * SAFE_SCAN_F2_DRYRUN_COMPACT_VISUAL_R2
                                     * ============================================================ */}
                                    {consultandoDestinosComplementaresReadOnly ? (
                                        <div className="certidao-upload-massa-dry-run-card__status certidao-upload-massa-dry-run-card__status--query">
                                            <span className="certidao-upload-massa-dry-run-card__status-dot" />

                                            <span>
                                                Consultando destinos das evidências · somente leitura
                                            </span>
                                        </div>
                                    ) : retornoDestinosComplementaresReadOnly
                                        ?.status ===
                                      "FALHA_LEITURA" ? (
                                        <div className="certidao-upload-massa-dry-run-card__status certidao-upload-massa-dry-run-card__status--query">
                                            <AlertTriangle
                                                aria-hidden="true"
                                            />

                                            <span>
                                                {retornoDestinosComplementaresReadOnly
                                                    ?.erro ||
                                                    "Não foi possível consultar os destinos complementares."}
                                            </span>
                                        </div>
                                    ) : retornoDestinosComplementaresReadOnly ? (
                                        <div className="certidao-upload-massa-dry-run-card__row certidao-upload-massa-dry-run-card__row--destinations">
                                            <span className="certidao-upload-massa-dry-run-card__row-label">
                                                Destino previsto
                                            </span>

                                            <div
                                                className="certidao-upload-massa-dry-run-card__metrics certidao-upload-massa-dry-run-card__metrics--destinations"
                                                aria-label="Destinos do dry-run complementar"
                                            >
                                                <div className="certidao-upload-massa-dry-run-card__metric">
                                                    <span className="certidao-upload-massa-dry-run-card__metric-label">
                                                        Nova evidência
                                                    </span>

                                                    <strong className="certidao-upload-massa-dry-run-card__metric-value">
                                                        {novaEvidenciaComplementarReadOnly}
                                                    </strong>
                                                </div>

                                                <div className="certidao-upload-massa-dry-run-card__metric">
                                                    <span className="certidao-upload-massa-dry-run-card__metric-label">
                                                        Vínculo em evidência existente
                                                    </span>

                                                    <strong className="certidao-upload-massa-dry-run-card__metric-value">
                                                        {backfillEvidenciaComplementarReadOnly}
                                                    </strong>
                                                </div>

                                                <div className="certidao-upload-massa-dry-run-card__metric">
                                                    <span className="certidao-upload-massa-dry-run-card__metric-label">
                                                        Já associado
                                                    </span>

                                                    <strong className="certidao-upload-massa-dry-run-card__metric-value">
                                                        {jaAssociadaComplementarReadOnly}
                                                    </strong>
                                                </div>

                                                <div className="certidao-upload-massa-dry-run-card__metric">
                                                    <span className="certidao-upload-massa-dry-run-card__metric-label">
                                                        Bloqueado
                                                    </span>

                                                    <strong className="certidao-upload-massa-dry-run-card__metric-value">
                                                        {bloqueadosComplementaresReadOnly}
                                                    </strong>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </section>
                            ) : null}
                            <footer className="certidao-upload-massa-modal__footer">
                                <div>
                                    <CheckCircle2
                                        aria-hidden="true"
                                    />

                                    <span>
                                        {lotePersistenciaConsumido
                                            ? "Tentativa de persistência do lote concluída · nova execução bloqueada"
                                            : totalPersistiveis > 0
                                                ? (
                                                    persistenciaPrincipalHabilitada &&
                                                    bridgeLoteDisponivel
                                                        ? `${totalPersistiveis} documento${totalPersistiveis === 1 ? "" : "s"} pronto${totalPersistiveis === 1 ? "" : "s"} para salvar`
                                                        : `${totalPersistiveis} documento${totalPersistiveis === 1 ? "" : "s"} pronto${totalPersistiveis === 1 ? "" : "s"} · persistência bloqueada nesta validação`
                                                )
                                                : "Nenhum documento persistível após a revisão"}
                                    </span>
                                </div>

                                <div className="certidao-upload-massa-modal__actions">
                                    {processando ? (
                                        <button
                                            type="button"
                                            className="certidao-upload-massa-button certidao-upload-massa-button--secondary"
                                            onClick={
                                                uploadMassa
                                                    ?.cancelar
                                            }
                                        >
                                            <X
                                                aria-hidden="true"
                                            />

                                            Cancelar análise
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                className="certidao-upload-massa-button certidao-upload-massa-button--secondary"
                                                onClick={
                                                    selecionarOutroLote
                                                }
                                                disabled={
                                                    persistindoLote
                                                }
                                            >
                                                <RotateCcw
                                                    aria-hidden="true"
                                                />

                                                Selecionar outro lote
                                            </button>

                                            <button
                                                type="button"
                                                className="certidao-upload-massa-button certidao-upload-massa-button--primary"
                                                onClick={
                                                    executarPersistenciaLote
                                                }
                                                disabled={
                                                    !podeExecutarPersistenciaLote
                                                }
                                                title={
                                                    !bridgeLoteDisponivel
                                                        ? "Fluxo de persistência em lote indisponível."
                                                        : !persistenciaPrincipalHabilitada
                                                            ? "Persistência em lote ainda bloqueada para validação."
                                                            : totalPersistiveis > 0
                                                                ? `Salvar ${totalPersistiveis} documento${totalPersistiveis === 1 ? "" : "s"} deste lote.`
                                                                : "Nenhum documento persistível neste lote."
                                                }
                                            >
                                                <CheckCircle2
                                                    aria-hidden="true"
                                                />

                                                {persistindoLote
                                                    ? `Salvando ${totalPersistiveis} documento${totalPersistiveis === 1 ? "" : "s"}...`
                                                    : lotePersistenciaConsumido
                                                        ? "Lote já processado"
                                                        : totalPersistiveis > 0
                                                            ? `Salvar ${totalPersistiveis} documento${totalPersistiveis === 1 ? "" : "s"}`
                                                            : "Nenhum documento para salvar"}
                                            </button>

                                            <button
                                                type="button"
                                                className="certidao-upload-massa-button certidao-upload-massa-button--primary"
                                                onClick={
                                                    fechar
                                                }
                                                disabled={
                                                    persistindoLote
                                                }
                                            >
                                                Concluir revisão
                                            </button>
                                        </>
                                    )}
                                </div>
                            </footer>
                        </section>
                    </div>,
                    document.body
                )}
            {revisaoDocumentoSalvo &&
                createPortal(
                    <div
                        className="certidao-upload-massa-overlay certidao-upload-massa-review-overlay"
                        role="presentation"
                        onMouseDown={
                            (evento) => {
                                if (
                                    evento.target ===
                                    evento.currentTarget
                                ) {
                                    fecharRevisaoDocumentoSalvo();
                                }
                            }
                        }
                    >
                        <section
                            className="certidao-upload-massa-modal certidao-upload-massa-review-modal"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="certidao-upload-massa-review-title"
                            onKeyDown={
                                (evento) => {
                                    evento.stopPropagation();

                                    if (
                                        evento.key ===
                                        "Escape"
                                    ) {
                                        fecharRevisaoDocumentoSalvo();
                                    }
                                }
                            }
                        >
                            <header className="certidao-upload-massa-modal__header">
                                <div className="certidao-upload-massa-modal__identity">
                                    <div className="certidao-upload-massa-modal__badge">
                                        <FileSearch
                                            aria-hidden="true"
                                        />
                                    </div>

                                    <div>
                                        <span>
                                            SAFESCAN BRASIL
                                        </span>

                                        <h2 id="certidao-upload-massa-review-title">
                                            Revisar documento salvo
                                        </h2>

                                        <p>
                                            Compare os dados registrados anteriormente com a análise atual do mesmo PDF.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="certidao-upload-massa-modal__close"
                                    aria-label="Fechar revisão do documento salvo"
                                    onClick={
                                        () =>
                                            fecharRevisaoDocumentoSalvo()
                                    }
                                >
                                    <X
                                        aria-hidden="true"
                                    />
                                </button>
                            </header>

                            <div className="certidao-upload-massa-modal__body">
                                <section className="certida-upload-massa-review-summary">
                                    <div>
                                        <span>
                                            Documento analisado
                                        </span>

                                        <strong>
                                            {revisaoDocumentoSalvo
                                                ?.nomeOriginal ||
                                                "Documento histórico"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Versão
                                        </span>

                                        <strong>
                                            {revisaoDocumentoSalvo
                                                ?.numeroVersao
                                                ? (
                                                    "v" +
                                                    revisaoDocumentoSalvo
                                                        .numeroVersao
                                                )
                                                : "Não informada"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Diferenças encontradas
                                        </span>

                                        <strong>
                                            {Number(
                                                revisaoDocumentoSalvo
                                                    ?.totalAlteracoes ||
                                                0
                                            )}
                                        </strong>
                                    </div>
                                </section>

                                {revisaoDocumentoSalvo
                                    ?.mudancaEstrutural ===
                                true ? (
                                    <div className="certida-upload-review-alert">
                                        <AlertTriangle
                                            aria-hidden="true"
                                        />

                                        <div>
                                            <strong>
                                                Revisão estrutural identificada
                                            </strong>

                                            <span>
                                                A análise atual mudou a competência ou o tipo documental. Nenhuma alteração será aplicada nesta etapa.
                                            </span>
                                        </div>
                                    </div>
                                ) : null}

                                <div className="certida-upload-review-comparison">
                                    <div className="certida-upload-review-row certida-upload-review-row--header">
                                        <div>Campo</div>
                                        <div>Documento salvo</div>
                                        <div>Análise atual</div>
                                        <div>Situação</div>
                                    </div>

                                    {Array.isArray(
                                        revisaoDocumentoSalvo
                                            ?.linhas
                                    )
                                        ? revisaoDocumentoSalvo
                                            .linhas
                                            .map(
                                                (linha) => (
                                                    <div
                                                        key={
                                                            linha
                                                                .chave
                                                        }
                                                        className={
                                                            "certida-upload-review-row " +
                                                            (
                                                                linha
                                                                    ?.mudou ===
                                                                true
                                                                    ? "certida-upload-review-row--changed"
                                                                    : ""
                                                            )
                                                        }
                                                    >
                                                        <div className="certida-upload-review-field">
                                                            {linha
                                                                .titulo}
                                                        </div>

                                                        <div>
                                                            {linha
                                                                .salvo}
                                                        </div>

                                                        <div>
                                                            {linha
                                                                .atual}
                                                        </div>

                                                        <div>
                                                            <span
                                                                className={
                                                                    "certida-upload-review-state " +
                                                                    (
                                                                        linha
                                                                            ?.mudou ===
                                                                        true
                                                                            ? "certida-upload-review-state--changed"
                                                                            : "certida-upload-review-state--same"
                                                                    )
                                                                }
                                                            >
                                                                {linha
                                                                    ?.mudou ===
                                                                true
                                                                    ? "Alterado"
                                                                    : "Sem alteração"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )
                                            )
                                        : null}
                                </div>

                                {salvamentoDocumentoSalvo
                                    ?.erro ? (
                                    <div className="certida-upload-review-alert certida-upload-review-alert--warning">
                                        <AlertTriangle
                                            aria-hidden="true"
                                        />

                                        <div>
                                            <strong>
                                                Não foi possível salvar a análise
                                            </strong>

                                            <span>
                                                {salvamentoDocumentoSalvo
                                                    .erro}
                                            </span>
                                        </div>
                                    </div>
                                ) : null}

                                {salvamentoDocumentoSalvo
                                    ?.sucesso ? (
                                    <div className="certida-upload-review-readonly">
                                        <CheckCircle2
                                            aria-hidden="true"
                                        />

                                        <span>
                                            {salvamentoDocumentoSalvo
                                                .sucesso}
                                        </span>
                                    </div>
                                ) : null}
                                <div className="certida-upload-review-readonly">
                                    <CheckCircle2
                                        aria-hidden="true"
                                    />

                                    <span>
                                        Ao salvar, somente os dados analíticos da versão existente serão corrigidos. O PDF, o SHA, a versão e o Storage serão preservados.
                                    </span>
                                </div>
                            </div>

                            <footer className="certidao-upload-massa-modal__footer">
                                <div>
                                    <CheckCircle2
                                        aria-hidden="true"
                                    />

                                    <span>
                                        {salvamentoDocumentoSalvo
                                            ?.salvando ===
                                        true
                                            ? "Salvando análise corrigida..."
                                            : salvamentoDocumentoSalvo
                                                ?.sucesso
                                                ? "Análise corrigida salva"
                                                : revisaoDocumentoSalvo
                                                    ?.mudancaEstrutural ===
                                                    true
                                                    ? "Revisão estrutural — salvamento bloqueado"
                                                    : Number(
                                                        revisaoDocumentoSalvo
                                                            ?.totalAlteracoes ||
                                                        0
                                                    ) > 0
                                                        ? "Correção disponível"
                                                        : "Sem alterações para salvar"}
                                    </span>
                                </div>

                                <div className="certidao-upload-massa-modal__actions">
                                    {revisaoDocumentoSalvo
                                        ?.mudancaEstrutural !==
                                        true &&
                                    Number(
                                        revisaoDocumentoSalvo
                                            ?.totalAlteracoes ||
                                        0
                                    ) > 0 ? (
                                        <button
                                            type="button"
                                            className="certidao-upload-massa-button certidao-upload-massa-button--primary"
                                            data-safe-scan-save-review-existing="true"
                                            onClick={
                                                salvarRevisaoDocumentoSalvoAtual
                                            }
                                            disabled={
                                                salvamentoDocumentoSalvo
                                                    ?.salvando ===
                                                true
                                            }
                                        >
                                            <CheckCircle2
                                                aria-hidden="true"
                                            />

                                            {salvamentoDocumentoSalvo
                                                ?.salvando ===
                                            true
                                                ? "Salvando..."
                                                : "Salvar análise corrigida"}
                                        </button>
                                    ) : null}

                                    <button
                                        type="button"
                                        className="certidao-upload-massa-button certidao-upload-massa-button--secondary"
                                        onClick={
                                            fecharRevisaoDocumentoSalvo
                                        }
                                        disabled={
                                            salvamentoDocumentoSalvo
                                                ?.salvando ===
                                            true
                                        }
                                    >
                                        <X
                                            aria-hidden="true"
                                        />

                                        Fechar comparação
                                    </button>
                                </div>
                            </footer>
                        </section>
                    </div>,
                    document.body
                )}
        </>
    );
}
