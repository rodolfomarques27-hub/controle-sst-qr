/* eslint-disable no-unused-vars */
import React from "react";
import {
    ChevronDown,
    ChevronUp,
    FileText,
    Filter,
    History,
    Upload,
} from "lucide-react";
import { Card, StatusPill } from "../commonComponents";
import {
    obterSituacaoHistoricaTreinamentosColaborador,
    statusDocumento,
    treinamentoSemValidade,
} from "../../services/colaboradorDocumentosService";
import { formatDate, classNames } from "../../utils/sstUtils";
import { VerificacaoCertificadoTreinamento } from "./VerificacaoCertificadoTreinamento";
import { criarUrlAssinadaStorage } from "../../services/supabaseServices";
import { supabase } from "../../lib/supabaseClient";
import {
    listarEvidenciasCertificadosEmLoteService,
} from "../../services/certificadosEvidenciasService";

function obterFotoColaboradorBase(colaborador = {}) {
    return String(
        colaborador?.fotoUrl ||
        colaborador?.foto_url ||
        colaborador?.fotoPerfilUrl ||
        colaborador?.foto_perfil_url ||
        colaborador?.avatarUrl ||
        colaborador?.avatar_url ||
        colaborador?.fotoPublicaUrl ||
        colaborador?.foto_publica_url ||
        colaborador?.fotoAssinadaUrl ||
        colaborador?.foto_assinada_url ||
        colaborador?.fotoPath ||
        colaborador?.foto_path ||
        colaborador?.fotoCaminho ||
        colaborador?.foto_caminho ||
        colaborador?.fotoNome ||
        colaborador?.foto_nome ||
        colaborador?.foto ||
        ""
    ).trim();
}

function fotoColaboradorEhUrlDireta(valor = "") {
    return /^(https?:|data:|blob:)/i.test(String(valor || "").trim());
}

function normalizarCaminhoFotoColaboradorBase(valor = "") {
    const texto = String(valor || "").trim();

    if (!texto || fotoColaboradorEhUrlDireta(texto)) return "";

    try {
        const semQuery = texto.split("?")[0];
        const partesBucket = [
            "/storage/v1/object/public/fotos-colaboradores/",
            "/storage/v1/object/sign/fotos-colaboradores/",
            "fotos-colaboradores/",
        ];

        const encontrado = partesBucket.find((parte) => semQuery.includes(parte));
        const caminho = encontrado ? semQuery.slice(semQuery.indexOf(encontrado) + encontrado.length) : semQuery;

        return decodeURIComponent(caminho).replace(/^\/+/, "");
    } catch {
        return texto.replace(/^\/+/, "");
    }
}

async function gerarUrlFotoColaboradorBase(valor = "") {
    const foto = String(valor || "").trim();

    if (!foto) return "";
    if (fotoColaboradorEhUrlDireta(foto)) return foto;

    const caminhoStorage = normalizarCaminhoFotoColaboradorBase(foto);

    if (!caminhoStorage) return "";

    try {
        return await criarUrlAssinadaStorage(
            "fotos-colaboradores",
            caminhoStorage,
            60 * 60,
        );
    } catch {
        return "";
    }
}

function obterIniciaisColaboradorBase(nome = "") {
    const partes = String(nome || "")
        .trim()
        .split(/\s+/)
        .filter((parte) => parte.length > 0);

    if (!partes.length) return "ST";

    const primeira = partes[0]?.[0] || "";
    const ultima = partes.length > 1 ? partes[partes.length - 1]?.[0] || "" : "";

    return `${primeira}${ultima || ""}`.toUpperCase() || "ST";
}

function FotoColaboradorBase({ colaborador = {} }) {
    const [fotoComErro, setFotoComErro] = React.useState(false);
    const [fotoUrlResolvida, setFotoUrlResolvida] = React.useState("");
    const fotoOrigem = obterFotoColaboradorBase(colaborador);
    const nome = colaborador?.nome || "Colaborador";
    const iniciais = obterIniciaisColaboradorBase(nome);

    React.useEffect(() => {
        let ativo = true;

        setFotoComErro(false);
        setFotoUrlResolvida("");

        gerarUrlFotoColaboradorBase(fotoOrigem).then((url) => {
            if (ativo) setFotoUrlResolvida(url || "");
        });

        return () => {
            ativo = false;
        };
    }, [fotoOrigem]);

    /*
    const obterValorDataRevisaoFormulario = (itemKey, campo, valorIso) => {
        const chave = `${itemKey}:${campo}`;

        if (Object.prototype.hasOwnProperty.call(datasDigitadasRevisao, chave)) {
            return datasDigitadasRevisao[chave];
        }

        return formatarDataBrFormularioCertificado(valorIso);
    };

    const alterarDataRevisaoFormulario = (documento, itemKey, campo, valorDigitado) => {
        const chave = `${itemKey}:${campo}`;
        const valorMascarado = aplicarMascaraDataBrFormularioCertificado(valorDigitado);

        setDatasDigitadasRevisao((atual) => ({
            ...atual,
            [chave]: valorMascarado,
        }));

        if (!valorMascarado) {
            alterarDataRevisao(documento, campo, "");
            return;
        }

        const valorIso = converterDataBrFormularioCertificadoParaIso(valorMascarado);

        if (valorIso) {
            alterarDataRevisao(documento, campo, valorIso);
        }
    };

    const salvarDatasCertificadoFormulario = (documento, itemKey, valoresAtuais = {}) => {
        const chaveRealizado = `${itemKey}:realizado`;
        const chaveVencimento = `${itemKey}:vencimento`;

        const realizadoDigitado = datasDigitadasRevisao[chaveRealizado] || "";
        const vencimentoDigitado = datasDigitadasRevisao[chaveVencimento] || "";

        const realizadoIso = realizadoDigitado
            ? converterDataBrFormularioCertificadoParaIso(realizadoDigitado)
            : valoresAtuais.realizado || "";

        const vencimentoIso = vencimentoDigitado
            ? converterDataBrFormularioCertificadoParaIso(vencimentoDigitado)
            : valoresAtuais.vencimento || "";

        if (realizadoDigitado && !realizadoIso) {
            alert("Data de admissão/registro inválida. Use o formato dd/mm/aaaa.");
            return;
        }

        if (vencimentoDigitado && !vencimentoIso) {
            alert("Data de vencimento inválida. Use o formato dd/mm/aaaa.");
            return;
        }

        const documentoAtualizado = {
            ...documento,
            realizado: realizadoIso,
            dataRealizacao: realizadoIso,
            data_realizacao: realizadoIso,
            vencimento: vencimentoIso || "",
            dataVencimento: vencimentoIso || "",
            data_vencimento: vencimentoIso || "",
        };

        alterarDataRevisao(documento, "realizado", realizadoIso);
        alterarDataRevisao(documento, "vencimento", vencimentoIso || "");

        setDatasCertificadosAtualizadas((atual) => ({
            ...atual,
            [String(documento.id || "")]: {
                realizado: realizadoIso,
                vencimento: vencimentoIso || "",
            },
        }));

        setTimeout(() => {
            salvarDatasCertificado(documentoAtualizado);
        }, 0);
    };

    */
    return (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-sm font-black uppercase text-slate-500 ring-1 ring-slate-200 sm:h-16 sm:w-16">
            {fotoUrlResolvida && !fotoComErro ? (
                <img
                    src={fotoUrlResolvida}
                    alt={`Foto de ${nome}`}
                    className="h-full w-full rounded-full object-cover"
                    loading="lazy"
                    onError={() => setFotoComErro(true)}
                />
            ) : (
                <span>{iniciais}</span>
            )}
        </div>
    );
}

function normalizarDataIsoFormularioCertificado(valor = "") {
    const texto = String(valor || "").trim();

    if (!texto) return "";

    const iso = texto.match(/^((?:19|20)\d{2})-(\d{2})-(\d{2})$/);
    if (iso) {
        return `${iso[1]}-${iso[2]}-${iso[3]}`;
    }

    const br = texto.match(/^([0-3]?\d)\/([01]?\d)\/((?:19|20)\d{2})$/);
    if (!br) return "";

    const dia = br[1].padStart(2, "0");
    const mes = br[2].padStart(2, "0");
    const ano = br[3];

    const data = new Date(`${ano}-${mes}-${dia}T12:00:00`);

    if (
        Number.isNaN(data.getTime()) ||
        data.getFullYear() !== Number(ano) ||
        data.getMonth() + 1 !== Number(mes) ||
        data.getDate() !== Number(dia)
    ) {
        return "";
    }

    return `${ano}-${mes}-${dia}`;
}

function formatarDataBrFormularioCertificado(valor = "") {
    const iso = normalizarDataIsoFormularioCertificado(valor);

    if (!iso) return "";

    const [ano, mes, dia] = iso.split("-");

    return `${dia}/${mes}/${ano}`;
}

function aplicarMascaraDataBrFormularioCertificado(valor = "") {
    const digitos = String(valor || "").replace(/\D/g, "").slice(0, 8);

    if (digitos.length <= 2) return digitos;
    if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;

    return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

function converterDataBrFormularioCertificadoParaIso(valor = "") {
    const mascarada = aplicarMascaraDataBrFormularioCertificado(valor);

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(mascarada)) {
        return "";
    }

    return normalizarDataIsoFormularioCertificado(mascarada);
}
// empresa_card_direta_v2:
// Exibe somente a empresa efetiva do colaborador.
// O vínculo contratante/subcontratada continua preservado nos dados.
function obterRotuloEmpresaCompactoBaseCertificados(
    colaborador = {}
) {
    const empresaCompleta =
        String(
            colaborador?.empresaExibicao ||
            colaborador?.empresa_exibicao ||
            colaborador?.empresaNome ||
            colaborador?.empresa_nome ||
            colaborador?.empresa ||
            "Empresa não informada"
        )
            .replace(/\s+/g, " ")
            .trim() ||
        "Empresa não informada";

    const partes =
        empresaCompleta.split(
            /\bsubcontratada\s*:/i
        );

    const nomeExtraido =
        String(
            partes.length > 1
                ? partes[partes.length - 1]
                : ""
        )
            .replace(/\s+/g, " ")
            .trim();

    const nomeDireto =
        String(
            nomeExtraido ||
            colaborador?.empresaNome ||
            colaborador?.empresa_nome ||
            colaborador?.empresa ||
            empresaCompleta
        )
            .replace(/\s+/g, " ")
            .trim();

    return (
        nomeDireto ||
        "Empresa não informada"
    );
}

const TIPOS_EVIDENCIA_VISIVEIS_BASE =
    new Set([
        "certificado_individual",
        "lista_presenca",
        "evidencia_complementar",
    ]);

function obterRotuloTipoEvidenciaBase(
    tipo = ""
) {
    if (
        tipo ===
        "certificado_individual"
    ) {
        return "Certificado individual";
    }

    if (
        tipo ===
        "lista_presenca"
    ) {
        return "Lista de presença";
    }

    return "Evidência complementar";
}

function obterClasseTipoEvidenciaBase(
    tipo = ""
) {
    if (
        tipo ===
        "certificado_individual"
    ) {
        return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    }

    if (
        tipo ===
        "lista_presenca"
    ) {
        return "bg-blue-50 text-blue-700 ring-blue-100";
    }

    return "bg-slate-100 text-slate-700 ring-slate-200";
}

function dividirIdsEvidenciasBase(
    ids = [],
    tamanho = 120
) {
    const lotes = [];

    for (
        let indice = 0;
        indice < ids.length;
        indice += tamanho
    ) {
        lotes.push(
            ids.slice(
                indice,
                indice + tamanho
            )
        );
    }

    return lotes;
}

function criarDocumentoVisualizacaoEvidenciaBase(
    documento = {},
    evidencia = {}
) {
    return {
        ...documento,

        arquivoUrl:
            evidencia?.arquivoUrl ||
            documento?.arquivoUrl ||
            "",

        arquivo:
            evidencia?.arquivoNome ||
            documento?.arquivo ||
            "Arquivo não informado",

        arquivoNome:
            evidencia?.arquivoNome ||
            documento?.arquivoNome ||
            documento?.arquivo ||
            "",

        evidenciaId:
            evidencia?.id ||
            "",

        tipoEvidencia:
            evidencia?.tipoEvidencia ||
            "",
    };
}

const FUSO_HORARIO_ALERTA_UPLOAD_BASE =
    "America/Sao_Paulo";

const FORMATADOR_DATA_ALERTA_UPLOAD_BASE =
    new Intl.DateTimeFormat(
        "pt-BR",
        {
            timeZone:
                FUSO_HORARIO_ALERTA_UPLOAD_BASE,

            year:
                "numeric",

            month:
                "2-digit",

            day:
                "2-digit",
        }
    );

function obterChaveDataAlertaUploadBase(
    valor = null
) {
    const data =
        valor instanceof Date
            ? valor
            : new Date(
                valor
            );

    if (
        Number.isNaN(
            data.getTime()
        )
    ) {
        return "";
    }

    const partes =
        FORMATADOR_DATA_ALERTA_UPLOAD_BASE
            .formatToParts(
                data
            );

    const obterParte =
        (tipo) =>
            partes.find(
                (parte) =>
                    parte.type ===
                    tipo
            )?.value ||
            "";

    const ano =
        obterParte(
            "year"
        );

    const mes =
        obterParte(
            "month"
        );

    const dia =
        obterParte(
            "day"
        );

    if (
        !ano ||
        !mes ||
        !dia
    ) {
        return "";
    }

    return `${ano}-${mes}-${dia}`;
}

function obterCaminhoArquivoAlertaUploadBase(
    registro = {}
) {
    return String(
        registro?.arquivoUrl ||
        registro?.arquivo_url ||
        registro?.urlDoArquivo ||
        registro?.url_do_arquivo ||
        ""
    ).trim();
}

function obterDataUploadRegistroBase(
    registro = {}
) {
    const caminho =
        obterCaminhoArquivoAlertaUploadBase(
            registro
        );

    if (caminho) {
        const semQuery =
            caminho.split(
                "?"
            )[0] ||
            "";

        const nomeArquivo =
            semQuery
                .split("/")
                .pop() ||
            "";

        const correspondenciaTimestamp =
            nomeArquivo.match(
                /^(\d{13})-/
            );

        if (
            correspondenciaTimestamp?.[1]
        ) {
            const timestamp =
                Number(
                    correspondenciaTimestamp[1]
                );

            if (
                Number.isFinite(
                    timestamp
                ) &&
                timestamp > 0
            ) {
                const dataStorage =
                    new Date(
                        timestamp
                    );

                if (
                    !Number.isNaN(
                        dataStorage.getTime()
                    )
                ) {
                    return dataStorage;
                }
            }
        }
    }

    const criadoEm =
        String(
            registro?.createdAt ||
            registro?.created_at ||
            ""
        ).trim();

    if (!criadoEm) {
        return null;
    }

    const dataCriacao =
        new Date(
            criadoEm
        );

    return Number.isNaN(
        dataCriacao.getTime()
    )
        ? null
        : dataCriacao;
}

function registroEnviadoNaDataBase(
    registro = {},
    chaveData = ""
) {
    if (!chaveData) {
        return false;
    }

    const dataUpload =
        obterDataUploadRegistroBase(
            registro
        );

    if (!dataUpload) {
        return false;
    }

    return (
        obterChaveDataAlertaUploadBase(
            dataUpload
        ) ===
        chaveData
    );
}

function obterIdsTreinamentosGradeIndividualBase(
    colaborador = {}
) {
    const entradas = [
        colaborador?.treinamentosAdicionais,
        colaborador?.treinamentos_adicionais,
    ];

    return new Set(
        entradas
            .flatMap(
                (lista) =>
                    Array.isArray(lista)
                        ? lista
                        : []
            )
            .map((item) =>
                Number(
                    typeof item === "object"
                        ? item?.id ??
                            item?.treinamentoId ??
                            item?.treinamento_id
                        : item
                )
            )
            .filter(
                (id) =>
                    Number.isFinite(id) &&
                    id > 0
            )
    );
}

const STORAGE_EVIDENCIAS_TREINAMENTOS_RECOLHIDAS =
    "safescan:treinamentos:evidencias-recolhidas:v1";

export function BaseCertificadosTreinamentos({
    documentos = [],
    documentosFiltrados = [],
    documentosPorColaborador = [],
    totalPorStatusCertificados = { pendentes: 0 },
    ordemColaboradoresBase = "atual",
    gruposCertificadosAbertos = {},
    setGruposCertificadosAbertos,
    certificadosAbertos = {},
    setCertificadosAbertos,
    valoresRevisao,
    alterarDataRevisao,
    salvarDatasCertificado,
    salvandoDatasId = "",
    enviarDocumentoPendente,
    enviarDocumentosPendentesEmLote,
    onVisualizarCertificado,
    onAbrirHistoricoCertificado,
    onExcluirCertificado,
    recolhido = false,
    onAlternarRecolhido,
}) {
    const [datasCertificadosAtualizadas, setDatasCertificadosAtualizadas] = React.useState({});
    const [datasDigitadasRevisao, setDatasDigitadasRevisao] = React.useState({});

    const [
        evidenciasPorCertificado,
        setEvidenciasPorCertificado,
    ] =
        React.useState({});

    const [
        erroEvidenciasCertificados,
        setErroEvidenciasCertificados,
    ] =
        React.useState("");

    /*
     * E3-UI-COLLAPSE-PERSIST-GLOBAL
     *
     * Cada certificado lógico possui estado próprio.
     *
     * true  = evidências recolhidas
     * false = evidências abertas
     *
     * O estado é restaurado do navegador para manter a última
     * escolha após F5, navegação entre telas ou novo acesso no
     * mesmo navegador.
     */
    const [
        evidenciasTreinamentosRecolhidas,
        setEvidenciasTreinamentosRecolhidas,
    ] =
        React.useState(() => {
            if (
                typeof window ===
                "undefined"
            ) {
                return {};
            }

            try {
                const salvo =
                    window.localStorage.getItem(
                        STORAGE_EVIDENCIAS_TREINAMENTOS_RECOLHIDAS
                    );

                if (!salvo) {
                    return {};
                }

                const interpretado =
                    JSON.parse(
                        salvo
                    );

                if (
                    !interpretado ||
                    typeof interpretado !==
                        "object" ||
                    Array.isArray(
                        interpretado
                    )
                ) {
                    return {};
                }

                return Object.fromEntries(
                    Object.entries(
                        interpretado
                    ).filter(
                        ([chave, valor]) =>
                            typeof chave ===
                                "string" &&
                            typeof valor ===
                                "boolean"
                    )
                );
            }
            catch (erro) {
                void erro;

                return {};
            }
        });

    React.useEffect(
        () => {
            if (
                typeof window ===
                "undefined"
            ) {
                return;
            }

            try {
                window.localStorage.setItem(
                    STORAGE_EVIDENCIAS_TREINAMENTOS_RECOLHIDAS,
                    JSON.stringify(
                        evidenciasTreinamentosRecolhidas
                    )
                );
            }
            catch (erro) {
                void erro;
            }
        },
        [
            evidenciasTreinamentosRecolhidas,
        ]
    );

    /*
     * E3-UI
     *
     * A Base continua trabalhando com UM certificado lógico por
     * colaborador + treinamento.
     *
     * As evidências físicas são carregadas em lote por
     * certificado_origem_id.
     *
     * Não existe consulta individual por card.
     */
    const idsCertificadosEvidencias =
        React.useMemo(
            () => {
                const ids =
                    documentosPorColaborador
                        .flatMap(
                            (grupo) =>
                                Array.isArray(
                                    grupo?.certificados
                                )
                                    ? grupo.certificados
                                    : []
                        )
                        .map((certificado) =>
                            String(
                                certificado?.id ||
                                ""
                            ).trim()
                        )
                        .filter(Boolean);

                return [
                    ...new Set(ids),
                ].sort();
            },
            [
                documentosPorColaborador,
            ]
        );

    const chaveCertificadosEvidencias =
        idsCertificadosEvidencias.join(
            "|"
        );

    React.useEffect(
        () => {
            let ativo =
                true;

            async function carregarEvidenciasCertificadosBase() {
                const ids =
                    chaveCertificadosEvidencias
                        ? chaveCertificadosEvidencias.split(
                            "|"
                        )
                        : [];

                if (!ids.length) {
                    if (ativo) {
                        setEvidenciasPorCertificado(
                            {}
                        );

                        setErroEvidenciasCertificados(
                            ""
                        );
                    }

                    return;
                }

                try {
                    const evidencias =
                        [];

                    /*
                     * Evita N+1 e também evita um IN gigantesco.
                     * Cada lote consulta no máximo 120 IDs.
                     */
                    for (
                        const lote
                        of dividirIdsEvidenciasBase(
                            ids,
                            120
                        )
                    ) {
                        const resultado =
                            await listarEvidenciasCertificadosEmLoteService({
                                supabase,

                                certificadoIds:
                                    lote,
                            });

                        if (!ativo) {
                            return;
                        }

                        evidencias.push(
                            ...resultado
                        );
                    }

                    const agrupadas =
                        {};

                    evidencias.forEach(
                        (evidencia) => {
                            const tipo =
                                String(
                                    evidencia?.tipoEvidencia ||
                                    ""
                                )
                                    .trim()
                                    .toLowerCase();

                            /*
                             * O backfill legado continua preservado
                             * no banco, mas não é desenhado aqui.
                             *
                             * Isso impede duplicar visualmente todos
                             * os certificados antigos.
                             */
                            if (
                                evidencia?.historica === true ||
                                !TIPOS_EVIDENCIA_VISIVEIS_BASE.has(
                                    tipo
                                )
                            ) {
                                return;
                            }

                            const certificadoId =
                                String(
                                    evidencia?.certificadoOrigemId ||
                                    ""
                                ).trim();

                            if (!certificadoId) {
                                return;
                            }

                            if (
                                !agrupadas[
                                    certificadoId
                                ]
                            ) {
                                agrupadas[
                                    certificadoId
                                ] = [];
                            }

                            agrupadas[
                                certificadoId
                            ].push({
                                ...evidencia,

                                tipoEvidencia:
                                    tipo,
                            });
                        }
                    );

                    if (!ativo) {
                        return;
                    }

                    setEvidenciasPorCertificado(
                        agrupadas
                    );

                    setErroEvidenciasCertificados(
                        ""
                    );
                }
                catch (erro) {
                    console.error(
                        "Erro ao carregar evidências dos certificados:",
                        erro
                    );

                    if (!ativo) {
                        return;
                    }

                    setEvidenciasPorCertificado(
                        {}
                    );

                    setErroEvidenciasCertificados(
                        erro?.message ||
                        "Não foi possível carregar as evidências dos treinamentos."
                    );
                }
            }

            void carregarEvidenciasCertificadosBase();

            return () => {
                ativo =
                    false;
            };
        },
        [
            chaveCertificadosEvidencias,

            /*
             * Mantemos também a referência da lista como gatilho.
             *
             * Isso faz a UI recarregar depois de um salvamento de
             * lista em que o ID lógico do certificado permaneceu
             * exatamente o mesmo.
             */
            documentosPorColaborador,
        ]
    );

    const documentosPorColaboradorOrdenados = React.useMemo(() => {
        if (ordemColaboradoresBase === "atual") {
            return documentosPorColaborador;
        }

        const gruposOrdenados = [...documentosPorColaborador].sort(
            (grupoA, grupoB) =>
                String(grupoA?.colaborador?.nome || "").localeCompare(
                    String(grupoB?.colaborador?.nome || ""),
                    "pt-BR",
                    { sensitivity: "base" }
                )
        );

        return ordemColaboradoresBase === "za"
            ? gruposOrdenados.reverse()
            : gruposOrdenados;
    }, [documentosPorColaborador, ordemColaboradoresBase]);

    const totalPendentesFiltradosBase = React.useMemo(
        () =>
            documentosPorColaboradorOrdenados.reduce(
                (total, grupo) =>
                    total +
                    Number(grupo?.pendentes?.length || 0),
                0
            ),
        [documentosPorColaboradorOrdenados]
    );

    React.useEffect(() => {
        if (typeof window === "undefined") return undefined;

        const aoAtualizarDataCertificado = (event) => {
            const detalhe = event?.detail || {};
            const id = detalhe.id || detalhe.certificadoId || detalhe.certificado_id;

            if (!id) return;

            setDatasCertificadosAtualizadas((atual) => ({
                ...atual,
                [String(id)]: {
                    realizado: detalhe.dataRealizacao || detalhe.data_realizacao || "",
                    vencimento: detalhe.dataVencimento ?? detalhe.data_vencimento ?? "",
                },
            }));
        };

        window.addEventListener("certificado-data-atualizada", aoAtualizarDataCertificado);

        return () => {
            window.removeEventListener("certificado-data-atualizada", aoAtualizarDataCertificado);
        };
    }, []);
    const obterValorDataRevisaoFormulario = (itemKey, campo, valorIso) => {
        const chave = `${itemKey}:${campo}`;

        if (Object.prototype.hasOwnProperty.call(datasDigitadasRevisao, chave)) {
            return datasDigitadasRevisao[chave];
        }

        return formatarDataBrFormularioCertificado(valorIso);
    };

    const alterarDataRevisaoFormulario = (documento, itemKey, campo, valorDigitado) => {
        const chave = `${itemKey}:${campo}`;
        const valorMascarado = aplicarMascaraDataBrFormularioCertificado(valorDigitado);

        setDatasDigitadasRevisao((atual) => ({
            ...atual,
            [chave]: valorMascarado,
        }));

        if (!valorMascarado) {
            alterarDataRevisao(documento, campo, "");
            return;
        }

        const valorIso = converterDataBrFormularioCertificadoParaIso(valorMascarado);

        if (valorIso) {
            alterarDataRevisao(documento, campo, valorIso);
        }
    };

    return (
        <Card className={classNames("self-start treinamentos-base-certificados-card", recolhido && "treinamentos-base-certificados-card--recolhido")}>
            <div
                className={classNames(
                    "treinamentos-base-certificados-card__cabecalho flex flex-col justify-between gap-3 md:flex-row md:items-start",
                    !recolhido && "mb-4"
                )}
            >
                <div>
                    <h2 className="text-lg font-bold text-slate-950">Base de certificados</h2>
                    <p className="mt-1 text-sm text-slate-500">Consulta, revisão de datas e abertura dos certificados enviados.</p>
                </div>

                <div className="flex flex-wrap gap-2 md:justify-end">
                    {!recolhido && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            {documentosFiltrados.length} certificado(s) · {totalPendentesFiltradosBase} pendente(s)
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={onAlternarRecolhido}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                        {recolhido ? (
                            <>
                                <ChevronDown className="h-3.5 w-3.5" />
                                Abrir
                            </>
                        ) : (
                            <>
                                <ChevronUp className="h-3.5 w-3.5" />
                                Recolher
                            </>
                        )}
                    </button>
                </div>
            </div>

            {recolhido ? null : (
            <div className="treinamentos-base-certificados-card__lista space-y-3">
                {documentos.length === 0 && totalPorStatusCertificados.pendentes === 0 && (
                    <div className="treinamentos-base-certificados-card__vazio rounded-3xl border border-dashed border-slate-300 p-8 text-center">
                        <FileText className="mx-auto h-10 w-10 text-slate-300" />
                        <h3 className="mt-3 font-bold text-slate-900">Nenhum certificado lançado ainda</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Os certificados enviados aparecerão nesta base para revisão de validade e consulta.
                        </p>
                    </div>
                )}

                {documentos.length > 0 && documentosPorColaboradorOrdenados.length === 0 && (
                    <div className="treinamentos-base-certificados-card__vazio rounded-3xl border border-dashed border-slate-300 p-8 text-center">
                        <Filter className="mx-auto h-10 w-10 text-slate-300" />
                        <h3 className="mt-3 font-bold text-slate-900">Nenhum certificado encontrado</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Ajuste a busca, a empresa ou o filtro de status para localizar os certificados.
                        </p>
                    </div>
                )}

                {documentosPorColaboradorOrdenados.map((grupo, indiceGrupo) => {
                    const colaborador = grupo.colaborador;

                    const idsTreinamentosGradeIndividual =
                        obterIdsTreinamentosGradeIndividualBase(
                            colaborador
                        );

                    const certificados = grupo.certificados || [];
                    const pendentes = grupo.pendentes || [];
                    const situacaoHistorica =
                        grupo.avaliacao?.situacaoHistorica ||
                        obterSituacaoHistoricaTreinamentosColaborador(colaborador);
                    const foraControleOperacional = Boolean(situacaoHistorica);
                    const grupoKey = String(colaborador?.id || colaborador?.codigoFuncionario || "sem-colaborador");
                    const grupoAberto = Boolean(gruposCertificadosAbertos[grupoKey]);
                    const indiceParGrupo = indiceGrupo % 2 === 0 ? indiceGrupo + 1 : indiceGrupo - 1;
                    const grupoPar = documentosPorColaboradorOrdenados[indiceParGrupo];
                    const colaboradorPar = grupoPar?.colaborador || {};
                    const grupoParKey = grupoPar
                        ? String(colaboradorPar?.id || colaboradorPar?.codigoFuncionario || "sem-colaborador")
                        : "";

                    const alternarGrupoTreinamentosComPar = () => {
                        setGruposCertificadosAbertos((atual) => {
                            const proximoAberto = !atual[grupoKey];

                            return {
                                ...atual,
                                [grupoKey]: proximoAberto,
                                ...(grupoParKey ? { [grupoParKey]: proximoAberto } : {}),
                            };
                        });
                    };

                    const idsTreinamentosAdicionaisEnviados =
                        new Set(
                            Array.isArray(
                                grupo.avaliacao?.itensAdicionaisEnviados
                            )
                                ? grupo.avaliacao.itensAdicionaisEnviados
                                    .map((item) =>
                                        Number(
                                            item?.treinamento?.id ||
                                            item?.realizado?.treinamentoId ||
                                            0
                                        )
                                    )
                                    .filter(
                                        (id) =>
                                            Number.isFinite(id) &&
                                            id > 0
                                    )
                                : []
                        );

                    const totalAdicionaisEnviados =
                        idsTreinamentosAdicionaisEnviados.size;

                    const resumoStatus = foraControleOperacional
                        ? { emDia: 0, aVencer: 0, vencidos: 0 }
                        : {
                            emDia:
                                Array.isArray(
                                    grupo.avaliacao?.emDia
                                )
                                    ? grupo.avaliacao.emDia.length
                                    : 0,

                            aVencer:
                                Array.isArray(
                                    grupo.avaliacao?.vencendo
                                )
                                    ? grupo.avaliacao.vencendo.length
                                    : 0,

                            vencidos:
                                Array.isArray(
                                    grupo.avaliacao?.vencidos
                                )
                                    ? grupo.avaliacao.vencidos.length
                                    : 0,
                        };

                    const obterValorDataRevisaoFormulario = (itemKey, campo, valorIso) => {
        const chave = `${itemKey}:${campo}`;

        if (Object.prototype.hasOwnProperty.call(datasDigitadasRevisao, chave)) {
            return datasDigitadasRevisao[chave];
        }

        return formatarDataBrFormularioCertificado(valorIso);
    };

    const alterarDataRevisaoFormulario = (documento, itemKey, campo, valorDigitado) => {
        const chave = `${itemKey}:${campo}`;
        const valorMascarado = aplicarMascaraDataBrFormularioCertificado(valorDigitado);

        setDatasDigitadasRevisao((atual) => ({
            ...atual,
            [chave]: valorMascarado,
        }));

        if (!valorMascarado) {
            alterarDataRevisao(documento, campo, "");
            return;
        }

        const valorIso = converterDataBrFormularioCertificadoParaIso(valorMascarado);

        if (valorIso) {
            alterarDataRevisao(documento, campo, valorIso);
        }
    };

    return (
                        <div
                            key={grupoKey}
                            className="treinamentos-base-certificados-card__colaborador rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                        >
                                                        <div
                                role={!grupoAberto ? "button" : undefined}
                                tabIndex={!grupoAberto ? 0 : undefined}
                                onClick={(evento) => {

                                    const alvoInterativo = evento.target.closest?.(
                                        "button, a, input, select, textarea, label, [data-base-certificados-acao]"
                                    );

                                    if (alvoInterativo) return;

                                    alternarGrupoTreinamentosComPar();
                                }}
                                onKeyDown={(evento) => {
                                        if (evento.key !== "Enter" && evento.key !== " ") return;

                                    evento.preventDefault();
                                    alternarGrupoTreinamentosComPar();
                                }}
                                className={classNames(
                                    "treinamentos-base-certificados-card__cabecalho-colaborador flex flex-col justify-between gap-4 lg:flex-row lg:items-start",
                                    !grupoAberto && "treinamentos-base-certificados-card__cabecalho-colaborador--clicavel"
                                )}
                            >
                                <div className="flex min-w-0 items-start gap-3">
                                    <FotoColaboradorBase colaborador={colaborador} />

                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Colaborador</p>
                                        <p className="mt-1 break-words text-lg font-bold leading-snug text-slate-950">
                                            {colaborador.nome}
                                        </p>
                                        <p
                                            className="mt-1 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-medium leading-5 text-slate-500 sm:text-[13px]"
                                            title={obterRotuloEmpresaCompactoBaseCertificados(
                                                colaborador
                                            )}
                                        >
                                            {obterRotuloEmpresaCompactoBaseCertificados(
                                                colaborador
                                            )}
                                        </p>
                                        <p className="mt-1 break-words text-xs font-semibold text-slate-600">
                                            Função: {colaborador.funcao || colaborador.cargo || "Não informada"}
                                        </p>
                                        <p className="mt-1 text-xs font-semibold text-slate-500">
                                            Código: {colaborador.codigoFuncionario}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 lg:min-w-[360px] lg:items-end">
                                    <div className="flex flex-wrap gap-2 lg:flex-nowrap lg:justify-end">
                                        <span className="whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                            {certificados.length} certificado(s)
                                        </span>

                                        {totalAdicionaisEnviados > 0 && (
                                            <span className="whitespace-nowrap rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-200">
                                                {totalAdicionaisEnviados} adicional(is)
                                            </span>
                                        )}

                                        {foraControleOperacional && (
                                            <span
                                                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-300"
                                                title="Certificados mantidos para consulta histórica, fora de pendências, vencimentos e alertas operacionais."
                                            >
                                                Histórico · {situacaoHistorica}
                                            </span>
                                        )}

                                        {pendentes.length > 0 && (
                                            <span className="whitespace-nowrap rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                                                {pendentes.length} faltando
                                            </span>
                                        )}

                                        {resumoStatus.emDia > 0 && (
                                            <span className="whitespace-nowrap rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                                {resumoStatus.emDia} em dia
                                            </span>
                                        )}

                                        {resumoStatus.aVencer > 0 && (
                                            <span className="whitespace-nowrap rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-200">
                                                {resumoStatus.aVencer} a vencer
                                            </span>
                                        )}

                                        {resumoStatus.vencidos > 0 && (
                                            <span className="whitespace-nowrap rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                                                {resumoStatus.vencidos} vencido(s)
                                            </span>
                                        )}
                                    </div>
                                    <div className="treinamentos-base-certificados-card__acoes-colaborador flex flex-wrap justify-end gap-2">
                                        {grupoAberto && pendentes.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => enviarDocumentosPendentesEmLote?.(colaborador)}
                                                className="treinamentos-base-certificados-card__acao-lote inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                                            >
                                                <Upload className="h-4 w-4" />
                                                Enviar documentos em massa
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={alternarGrupoTreinamentosComPar}
                                            className="treinamentos-base-certificados-card__acao-treinamentos inline-flex min-w-[220px] items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
                                        >
                                            {grupoAberto ? (
                                                <>
                                                    <ChevronUp className="h-4 w-4" />
                                                    Recolher treinamentos
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown className="h-4 w-4" />
                                                    Ver treinamentos
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {grupoAberto && (
                                <div className="treinamentos-base-certificados-card__detalhes mt-4 space-y-3 border-t border-slate-100 pt-4">
                                    {pendentes.length > 0 && (
                                        <div className="treinamentos-base-certificados-card__pendentes rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-3">
                                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                                                        Documentos faltantes para envio
                                                    </p>
                                                    <p className="mt-1 text-[11px] text-blue-700">
                                                        Clique em enviar para preencher automaticamente o colaborador e o treinamento no lançamento.
                                                    </p>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2">
<span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-200">


                                                        {pendentes.length} pendente(s)


                                                    </span>


                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                {pendentes.map((item) => (
                                                    <div
                                                        key={`pendente-${grupoKey}-${item.treinamento.id}`}
                                                        className="treinamentos-base-certificados-card__pendente-item flex flex-col justify-between gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-blue-100 lg:flex-row lg:items-center"
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-blue-200">
                                                                    Pendente
                                                                </span>

                                                                {idsTreinamentosGradeIndividual.has(
                                                                    Number(
                                                                        item?.treinamento?.id ||
                                                                        0
                                                                    )
                                                                ) ? (
                                                                    <span
                                                                        className="whitespace-nowrap rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] text-violet-700 ring-1 ring-violet-200"
                                                                        title="Treinamento incluído somente na grade individual deste colaborador."
                                                                    >
                                                                        Grade individual
                                                                    </span>
                                                                ) : null}

                                                                <p className="break-words text-sm font-semibold text-slate-800">
                                                                    {item.treinamento.nome}
                                                                </p>
                                                            </div>
                                                            <p className="mt-1 text-[11px] text-slate-500">
                                                                Documento ainda não enviado para este colaborador.
                                                            </p>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => enviarDocumentoPendente(colaborador, item.treinamento)}
                                                            className="treinamentos-base-certificados-card__acao-documento inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                                                        >
                                                            <Upload className="h-4 w-4" />
                                                            Enviar documento
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {certificados.length === 0 && pendentes.length === 0 && (
                                        <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                                            Nenhum item encontrado para este colaborador com o filtro atual.
                                        </div>
                                    )}

                                    {certificados.map((d, idx) => {
                                        const valoresBase = valoresRevisao(d);

                                        const datasAtualizadas = datasCertificadosAtualizadas[String(d.id || "")] || {};

                                        const valores = {

                                            ...valoresBase,

                                            realizado: Object.prototype.hasOwnProperty.call(datasAtualizadas, "realizado") ? datasAtualizadas.realizado : valoresBase.realizado,

                                            vencimento: Object.prototype.hasOwnProperty.call(datasAtualizadas, "vencimento") ? datasAtualizadas.vencimento : valoresBase.vencimento,

                                        };
                                        const semValidade = treinamentoSemValidade(d.treinamentoId);
                                        const nomeTreinamentoAtual = String(d?.treinamento?.nome || "");
                                        const ehFichaRegistro = /ficha\s+(de\s+)?registro|registro\s+clt|\bclt\b|e\s*social|\besocial\b/i.test(nomeTreinamentoAtual);
                                        const ehFichaEpi = /nr\s*-?\s*0?6|ficha\s+(de\s+)?epi|epis\s+atualizada|controle\s+de\s+entrega\s+de\s+epi|entrega\s+de\s+epi|equipamento\s+de\s+prote[cç][aã]o\s+individual/i.test(nomeTreinamentoAtual);

                                        /*
                                         * E3-UI-EVID-ONLY-TRAINING
                                         *
                                         * O bloco de múltiplas evidências representa o
                                         * par documental:
                                         *
                                         *   certificado individual
                                         *   lista de presença
                                         *
                                         * Portanto ele não deve ser exibido em documentos
                                         * individuais/administrativos que estão no mesmo
                                         * catálogo operacional de SST.
                                         */
                                        const normalizarClassificacaoEvidencias =
                                            (valor = "") =>
                                                String(
                                                    valor ||
                                                    ""
                                                )
                                                    .normalize(
                                                        "NFD"
                                                    )
                                                    .replace(
                                                        /[\u0300-\u036f]/g,
                                                        ""
                                                    )
                                                    .toLowerCase()
                                                    .replace(
                                                        /[^a-z0-9]+/g,
                                                        " "
                                                    )
                                                    .replace(
                                                        /\s+/g,
                                                        " "
                                                    )
                                                    .trim();

                                        const categoriaTreinamentoAtual =
                                            normalizarClassificacaoEvidencias(
                                                d?.treinamento?.categoria ||
                                                ""
                                            );

                                        const nomeTreinamentoEvidencias =
                                            normalizarClassificacaoEvidencias(
                                                nomeTreinamentoAtual ||
                                                d?.nomeTreinamento ||
                                                d?.tipoTreinamento ||
                                                ""
                                            );

                                        const categoriaEhDocumentoIndividual =
                                            /^documento(?:\s|$)/.test(
                                                categoriaTreinamentoAtual
                                            );

                                        const nomeEhDocumentoIndividualSemPar =
                                            /\b(ficha de registro|ficha registro|registro clt|clt|esocial|e social|ficha de epi|ficha epi|epis atualizada|controle de entrega de epi|entrega de epi|atestado de saude ocupacional|aso|integracao|mobilizacao|ordem de servico|procedimento operacional)\b/.test(
                                                nomeTreinamentoEvidencias
                                            );

                                        const mostrarEvidenciasTreinamento =
                                            !categoriaEhDocumentoIndividual &&
                                            !nomeEhDocumentoIndividualSemPar;

                                        const rotuloDataPrincipal = ehFichaRegistro
                                            ? "Admiss\u00e3o / Registro"
                                            : ehFichaEpi
                                                ? "Entrega / Atualiza\u00e7\u00e3o"
                                                : "Realiza\u00e7\u00e3o";
                                        const statusAtual = statusDocumento(valores.vencimento || d.vencimento, semValidade);
                                        const itemKey = String(d.id || `${d.colaborador.id}-${d.treinamentoId}-${idx}`);
                                        const aberto = Boolean(certificadosAbertos[itemKey]);

                                        const treinamentoIdAtual =
                                            Number(
                                                d?.treinamentoId ||
                                                d?.treinamento?.id ||
                                                0
                                            );

                                        const gradeIndividual =
                                            idsTreinamentosGradeIndividual.has(
                                                treinamentoIdAtual
                                            );

                                        const adicionalEnviado =
                                            idsTreinamentosAdicionaisEnviados.has(
                                                treinamentoIdAtual
                                            );

                                        const certificadoEvidenciaId =
                                            String(
                                                d?.id ||
                                                ""
                                            ).trim();

                                        const evidenciasTreinamentoPersistidas =
                                            certificadoEvidenciaId
                                                ? evidenciasPorCertificado[
                                                    certificadoEvidenciaId
                                                ] ||
                                                []
                                                : [];

                                        /*
                                         * Certificados anteriores à arquitetura E3 podem
                                         * possuir somente o snapshot lógico atual.
                                         *
                                         * Quando não houver evidência typed persistida,
                                         * mostramos o snapshot apenas como fallback
                                         * VISUAL de certificado individual.
                                         *
                                         * Nenhum registro é criado por este fallback.
                                         */
                                        const arquivoLegadoUrl =
                                            String(
                                                d?.arquivoUrl ||
                                                d?.arquivo_url ||
                                                ""
                                            ).trim();

                                        const arquivoLegadoNome =
                                            String(
                                                d?.arquivoNome ||
                                                d?.arquivo_nome ||
                                                ""
                                            ).trim();

                                        const evidenciasTreinamento =
                                            evidenciasTreinamentoPersistidas.length > 0
                                                ? evidenciasTreinamentoPersistidas
                                                : arquivoLegadoUrl
                                                    ? [
                                                        {
                                                            id:
                                                                `fallback-certificado-${certificadoEvidenciaId || idx}`,

                                                            certificadoOrigemId:
                                                                certificadoEvidenciaId ||
                                                                null,

                                                            tipoEvidencia:
                                                                "certificado_individual",

                                                            arquivoUrl:
                                                                arquivoLegadoUrl,

                                                            arquivoNome:
                                                                arquivoLegadoNome ||
                                                                "Certificado",

                                                            principal:
                                                                true,

                                                            historica:
                                                                false,

                                                            origem:
                                                                "fallback_snapshot",
                                                        },
                                                    ]
                                                    : [];

                                        const chaveHojeAlertaUpload =
                                            obterChaveDataAlertaUploadBase(
                                                new Date()
                                            );

                                        const documentoEnviadoHoje =
                                            registroEnviadoNaDataBase(
                                                d,
                                                chaveHojeAlertaUpload
                                            ) ||
                                            evidenciasTreinamento.some(
                                                (evidencia) =>
                                                    registroEnviadoNaDataBase(
                                                        evidencia,
                                                        chaveHojeAlertaUpload
                                                    )
                                            );

                                        const evidenciasTreinamentoRecolhido =
                                            Boolean(
                                                certificadoEvidenciaId &&
                                                evidenciasTreinamentosRecolhidas[
                                                    certificadoEvidenciaId
                                                ]
                                            );

                                        const alternarEvidenciasTreinamento =
                                            (evento = null) => {
                                                evento?.stopPropagation?.();

                                                if (
                                                    !certificadoEvidenciaId
                                                ) {
                                                    return;
                                                }

                                                setEvidenciasTreinamentosRecolhidas(
                                                    (atual) => ({
                                                        ...atual,

                                                        [certificadoEvidenciaId]:
                                                            !atual[
                                                                certificadoEvidenciaId
                                                            ],
                                                    })
                                                );
                                            };

                                        const mostrarFalhaEvidencias =
                                            Boolean(
                                                erroEvidenciasCertificados &&
                                                indiceGrupo === 0 &&
                                                idx === 0
                                            );

                                        const obterValorDataRevisaoFormulario = (itemKey, campo, valorIso) => {
        const chave = `${itemKey}:${campo}`;

        if (Object.prototype.hasOwnProperty.call(datasDigitadasRevisao, chave)) {
            return datasDigitadasRevisao[chave];
        }

        return formatarDataBrFormularioCertificado(valorIso);
    };

    const alterarDataRevisaoFormulario = (documento, itemKey, campo, valorDigitado) => {
        const chave = `${itemKey}:${campo}`;
        const valorMascarado = aplicarMascaraDataBrFormularioCertificado(valorDigitado);

        setDatasDigitadasRevisao((atual) => ({
            ...atual,
            [chave]: valorMascarado,
        }));

        if (!valorMascarado) {
            alterarDataRevisao(documento, campo, "");
            return;
        }

        const valorIso = converterDataBrFormularioCertificadoParaIso(valorMascarado);

        if (valorIso) {
            alterarDataRevisao(documento, campo, valorIso);
        }
    };

    return (
                                            <div
                                                key={itemKey}
                                                className="treinamentos-base-certificados-card__certificado rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100"
                                            >
                                                <div className="grid gap-3 lg:grid-cols-[1fr_240px] lg:items-start">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <StatusPill status={statusAtual} small />

                                                            {adicionalEnviado ? (
                                                                <span
                                                                    className="whitespace-nowrap rounded-full bg-indigo-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.07em] text-indigo-700 ring-1 ring-indigo-200"
                                                                    title="Treinamento enviado fora da matriz obrigatória deste colaborador. Não altera o percentual de conformidade."
                                                                >
                                                                    Adicional
                                                                </span>
                                                            ) : null}

                                                            {documentoEnviadoHoje ? (
                                                                <span
                                                                    data-alerta-upload-hoje
                                                                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.07em] text-amber-900 ring-1 ring-amber-300 shadow-sm"
                                                                    title="Documento enviado hoje ao SafeScan."
                                                                >
                                                                    <span
                                                                        aria-hidden="true"
                                                                        className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-500"
                                                                    />

                                                                    Enviado hoje
                                                                </span>
                                                            ) : null}

                                                            <h3 className="break-words text-base font-bold leading-snug text-slate-900">
                                                                {d.treinamento.nome}
                                                            </h3>

                                                            {gradeIndividual ? (
                                                                <span
                                                                    className="whitespace-nowrap rounded-full bg-violet-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.06em] text-violet-700 ring-1 ring-violet-200"
                                                                    title="Treinamento incluído somente na grade individual deste colaborador."
                                                                >
                                                                    Grade individual
                                                                </span>
                                                            ) : null}
                                                        </div>

                                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                                            <FileText className="h-4 w-4 text-slate-400" />
                                                            <span className="break-words">{d.arquivo || "Arquivo não informado"}</span>
                                                        </div>

                                                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                                            <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
                                                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{rotuloDataPrincipal}</p>
                                                                <p className="text-xs font-semibold text-slate-700">{formatDate(valores.realizado)}</p>
                                                            </div>

                                                            <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
                                                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Vencimento</p>
                                                                <p className="text-xs font-semibold text-slate-700">
                                                                    {semValidade ? "Sem validade" : formatDate(valores.vencimento)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="treinamentos-certificados-acoes-documento">
                                                    <div className="treinamentos-certificados-acoes-documento__linha-superior">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setCertificadosAbertos((atual) => ({
                                                                    ...atual,
                                                                    [itemKey]: !atual[itemKey],
                                                                }))
                                                            }
                                                            className="treinamentos-certificados-acao treinamentos-certificados-acao--rever bg-white text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                                                        >
                                                            {aberto ? (
                                                                <>
                                                                    <ChevronUp className="h-4 w-4" />
                                                                    Ocultar data
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <ChevronDown className="h-4 w-4" />
                                                                    Alterar data
                                                                </>
                                                            )}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={(evento) => {
                                                                evento.stopPropagation();
                                                                onAbrirHistoricoCertificado?.(d);
                                                            }}
                                                            className="treinamentos-certificados-acao treinamentos-certificados-acao--historico bg-white text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                                                            aria-label={`Histórico de versões de ${d?.treinamento?.nome || "documento"}`}
                                                            title="Histórico de versões"
                                                        >
                                                            <History className="h-4 w-4" />
                                                            <span>Histórico</span>
                                                        </button>
                                                    </div>

                                                    <button
                                                        onClick={() => onVisualizarCertificado(d)}
                                                        className="treinamentos-certificados-acao treinamentos-certificados-acao--abrir bg-slate-950 text-white hover:bg-slate-800"
                                                    >
                                                        Abrir documento
                                                    </button>

                                                    <button
                                                        onClick={() => onExcluirCertificado(d)}
                                                        className="treinamentos-certificados-acao treinamentos-certificados-acao--excluir bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                                                    >
                                                        Excluir
                                                    </button>
                                                </div>
                                                </div>

                                                <div className="mt-3">
                                                    <VerificacaoCertificadoTreinamento certificado={d} />
                                                </div>

                                                {mostrarEvidenciasTreinamento &&
                                                    (evidenciasTreinamento.length > 0 ||
                                                        mostrarFalhaEvidencias) && (
                                                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                                                        <div
                                                            role="button"
                                                            tabIndex={0}
                                                            aria-expanded={
                                                                !evidenciasTreinamentoRecolhido
                                                            }
                                                            onClick={
                                                                alternarEvidenciasTreinamento
                                                            }
                                                            onKeyDown={(evento) => {
                                                                if (
                                                                    evento.key !==
                                                                        "Enter" &&
                                                                    evento.key !==
                                                                        " "
                                                                ) {
                                                                    return;
                                                                }

                                                                evento.preventDefault();

                                                                alternarEvidenciasTreinamento(
                                                                    evento
                                                                );
                                                            }}
                                                            className="-m-1 flex cursor-pointer select-none flex-wrap items-start justify-between gap-2 rounded-xl p-1 transition hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                                        >
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                                                                    Evidências do treinamento
                                                                </p>

                                                                {evidenciasTreinamento.length > 0 && (
                                                                    <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                                                                        {evidenciasTreinamento.length}{" "}
                                                                        {evidenciasTreinamento.length === 1
                                                                            ? "documento vinculado"
                                                                            : "documentos vinculados"}{" "}
                                                                        à mesma realização.
                                                                    </p>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                {evidenciasTreinamento.length > 0 && (
                                                                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-2 text-[10px] font-black text-slate-600 ring-1 ring-slate-200">
                                                                        {evidenciasTreinamento.length}
                                                                    </span>
                                                                )}

                                                                <span className="inline-flex h-7 items-center justify-center rounded-full bg-white px-3 text-[10px] font-black text-slate-700 shadow-sm ring-1 ring-slate-200">
                                                                    {evidenciasTreinamentoRecolhido
                                                                        ? "Abrir"
                                                                        : "Fechar"}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {!evidenciasTreinamentoRecolhido &&
                                                            mostrarFalhaEvidencias && (
                                                            <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-100">
                                                                Evidências complementares temporariamente indisponíveis.
                                                            </p>
                                                        )}

                                                        {!evidenciasTreinamentoRecolhido &&
                                                            evidenciasTreinamento.length > 0 && (
                                                            <div className="mt-2 grid gap-2">
                                                                {evidenciasTreinamento.map((evidencia) => {
                                                                    const tipo =
                                                                        evidencia?.tipoEvidencia ||
                                                                        "evidencia_complementar";

                                                                    const arquivoNome =
                                                                        evidencia?.arquivoNome ||
                                                                        "Arquivo sem nome";

                                                                    return (
                                                                        <div
                                                                            key={
                                                                                evidencia?.id ||
                                                                                `${certificadoEvidenciaId}-${tipo}-${evidencia?.arquivoUrl || arquivoNome}`
                                                                            }
                                                                            className="flex flex-col gap-2 rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-100 sm:flex-row sm:items-center"
                                                                        >
                                                                            <div className="min-w-0 flex-1">
                                                                                <div className="flex flex-wrap items-center gap-2">
                                                                                    <span
                                                                                        className={classNames(
                                                                                            "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ring-1",
                                                                                            obterClasseTipoEvidenciaBase(
                                                                                                tipo
                                                                                            )
                                                                                        )}
                                                                                    >
                                                                                        <FileText className="h-3 w-3" />

                                                                                        {obterRotuloTipoEvidenciaBase(
                                                                                            tipo
                                                                                        )}
                                                                                    </span>

                                                                                    <span
                                                                                        className={classNames(
                                                                                            "inline-flex rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide ring-1",
                                                                                            evidencia?.principal
                                                                                                ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                                                                                : "bg-slate-50 text-slate-500 ring-slate-200"
                                                                                        )}
                                                                                    >
                                                                                        {evidencia?.principal
                                                                                            ? "Principal"
                                                                                            : "Complementar"}
                                                                                    </span>
                                                                                </div>

                                                                                <p
                                                                                    className="mt-1.5 truncate text-[11px] font-semibold text-slate-600"
                                                                                    title={arquivoNome}
                                                                                >
                                                                                    {arquivoNome}
                                                                                </p>
                                                                            </div>

                                                                            <button
                                                                                type="button"
                                                                                data-base-certificados-acao
                                                                                disabled={
                                                                                    !evidencia?.arquivoUrl ||
                                                                                    typeof onVisualizarCertificado !==
                                                                                        "function"
                                                                                }
                                                                                onClick={() =>
                                                                                    onVisualizarCertificado?.(
                                                                                        criarDocumentoVisualizacaoEvidenciaBase(
                                                                                            d,
                                                                                            evidencia
                                                                                        )
                                                                                    )
                                                                                }
                                                                                className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-wide text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                                            >
                                                                                Abrir
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {aberto && (
                                                    <div className="treinamentos-base-certificados-card__revisao mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                                                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_auto] xl:items-end">
                                                            <div>
                                                                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{rotuloDataPrincipal}</p>
                                                                <input
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    maxLength={10}
                                                                    placeholder="dd/mm/aaaa"
                                                                    value={obterValorDataRevisaoFormulario(itemKey, "realizado", valores.realizado)}
                                                                    onChange={(e) => alterarDataRevisaoFormulario(d, itemKey, "realizado", e.target.value)}
                                                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                                                                />
                                                            </div>

                                                            <div>
                                                                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Vencimento</p>
                                                                {semValidade ? (
                                                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
                                                                        Sem validade
                                                                    </div>
                                                                ) : (
                                                                    <input
                                                                        type="text"
                                                                        inputMode="numeric"
                                                                        maxLength={10}
                                                                        placeholder="dd/mm/aaaa"
                                                                        value={obterValorDataRevisaoFormulario(itemKey, "vencimento", valores.vencimento)}
                                                                        onChange={(e) => alterarDataRevisaoFormulario(d, itemKey, "vencimento", e.target.value)}
                                                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                                                                    />
                                                                )}
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const chaveRealizado = `${itemKey}:realizado`;
                                                                    const chaveVencimento = `${itemKey}:vencimento`;
                                                                    const realizadoDigitado = datasDigitadasRevisao[chaveRealizado] || "";
                                                                    const vencimentoDigitado = datasDigitadasRevisao[chaveVencimento] || "";

                                                                    const realizadoIso = realizadoDigitado
                                                                        ? converterDataBrFormularioCertificadoParaIso(realizadoDigitado)
                                                                        : valores.realizado || "";

                                                                    const vencimentoIso = semValidade
                                                                        ? ""
                                                                        : (vencimentoDigitado
                                                                            ? converterDataBrFormularioCertificadoParaIso(vencimentoDigitado)
                                                                            : valores.vencimento || "");

                                                                    if (realizadoDigitado && !realizadoIso) {
                                                                        alert("Data de admissão/registro inválida. Use o formato dd/mm/aaaa.");
                                                                        return;
                                                                    }

                                                                    if (!semValidade && vencimentoDigitado && !vencimentoIso) {
                                                                        alert("Data de vencimento inválida. Use o formato dd/mm/aaaa.");
                                                                        return;
                                                                    }

                                                                    const documentoAtualizado = {
                                                                        ...d,
                                                                        realizado: realizadoIso,
                                                                        dataRealizacao: realizadoIso,
                                                                        data_realizacao: realizadoIso,
                                                                        vencimento: vencimentoIso || "",
                                                                        dataVencimento: vencimentoIso || "",
                                                                        data_vencimento: vencimentoIso || "",
                                                                    };

                                                                    alterarDataRevisao(d, "realizado", realizadoIso);
                                                                    alterarDataRevisao(d, "vencimento", vencimentoIso || "");

                                                                    setDatasCertificadosAtualizadas((atual) => ({
                                                                        ...atual,
                                                                        [String(d.id || "")]: {
                                                                            realizado: realizadoIso,
                                                                            vencimento: vencimentoIso || "",
                                                                        },
                                                                    }));

                                                                    setTimeout(() => {
                                                                        salvarDatasCertificado(documentoAtualizado);
                                                                    }, 0);
                                                                }}
                                                                disabled={salvandoDatasId === d.id}
                                                                className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 disabled:opacity-60"
                                                            >
                                                                {salvandoDatasId === d.id ? "Salvando..." : "Salvar datas"}
                                                            </button>
                                                        </div>

                                                        <p className="mt-3 text-xs leading-relaxed text-slate-400">
                                                            {semValidade
                                                                ? "Este documento não possui validade. Ao revisar, somente a data de realização/emissão será atualizada."
                                                                : "Ao alterar a realização, o vencimento é recalculado automaticamente pela validade do treinamento."}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            )}
        </Card>
    );
}
