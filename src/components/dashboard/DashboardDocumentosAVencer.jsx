import React, { useEffect, useMemo, useState } from "react";
import {
    Building2,
    Eye,
    Mail,
    Send,
    UserRound,
} from "lucide-react";
import {
    criarUrlAssinadaStorage,
    obterUrlLogoEmpresa,
} from "../../services/supabaseServices";
import { formatDate } from "../../utils/sstUtils";
import { DashboardBlocoRecolhivel } from "./DashboardBlocoRecolhivel";

const FOTO_BUCKET_COLABORADORES = "fotos-colaboradores";
const CACHE_FOTOS_DOCUMENTOS_AVENCER = new Map();
const LIMITE_INICIAL_DOCUMENTOS_AVENCER = 15;

const ESTILOS_DOCUMENTOS_AVENCER = `
@media (min-width: 1024px) {
    .dashboard-documentos-avencer__cabecalho,
    .dashboard-documentos-avencer__linha {
        display: grid;
        grid-template-columns:
            minmax(300px, 1.35fr)
            minmax(330px, 1.45fr)
            minmax(150px, 0.6fr)
            minmax(320px, 1fr);
        column-gap: 24px;
        align-items: center;
    }

    .dashboard-documentos-avencer__cabecalho > span:nth-child(3),
    .dashboard-documentos-avencer__vencimento {
        text-align: center;
        justify-self: center;
    }

    .dashboard-documentos-avencer__cabecalho > span:nth-child(4),
    .dashboard-documentos-avencer__acoes {
        text-align: center;
        justify-self: center;
    }

    .dashboard-documentos-avencer__acoes {
        justify-content: center;
        min-width: 320px;
    }
}

.dashboard-documentos-avencer__linha {
    cursor: pointer;
    outline: none;
    transition:
        background-color 160ms ease,
        box-shadow 160ms ease;
}

.dashboard-documentos-avencer__linha:hover {
    background: #fffaf0;
}

.dashboard-documentos-avencer__linha:focus-visible {
    box-shadow:
        inset 0 0 0 2px #f59e0b;
}

.dashboard-documentos-avencer__rodape {
    display: flex;
    justify-content: center;
    padding: 16px 0 4px;
}

.dashboard-documentos-avencer__mostrar-mais {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    border: 1px solid #fde68a;
    background: #ffffff;
    padding: 10px 16px;
    font-size: 12px;
    font-weight: 800;
    color: #92400e;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.dashboard-documentos-avencer__mostrar-mais:hover {
    background: #fffbeb;
}

.dashboard-documentos-avencer__origem {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.dashboard-documentos-avencer__logo-empresa {
    background: #ffffff;
    object-fit: contain;
    padding: 3px;
}
`;

function obterRotuloPrazo(registro = {}) {
    const dias = registro.dias;

    if (dias === null || dias === undefined) {
        return "";
    }

    if (dias === 0) {
        return "Vence hoje";
    }

    if (dias === 1) {
        return "Falta 1 dia";
    }

    return `Faltam ${dias} dias`;
}

function obterChaveRegistro(registro = {}, indice = 0) {
    return (
        registro.id ||
        `${registro.origem || "documento"}-${registro.principal || "registro"}-${registro.nomeDocumento || "documento"}-${indice}`
    );
}

function normalizarTextoFoto(valor = "") {
    return String(valor || "").trim();
}

function ehUrlFotoPronta(valor = "") {
    const texto = normalizarTextoFoto(valor);

    return (
        /^(https?:|blob:|data:)/i.test(texto) ||
        texto.startsWith("/")
    );
}

function extrairCaminhoFotoStorage(valor = "") {
    const texto = normalizarTextoFoto(valor);

    if (!texto) {
        return "";
    }

    if (texto.includes("/storage/v1/object/")) {
        const marcadorPublico =
            `/object/public/${FOTO_BUCKET_COLABORADORES}/`;

        const marcadorAutenticado =
            `/object/authenticated/${FOTO_BUCKET_COLABORADORES}/`;

        const marcadorAssinado =
            `/object/sign/${FOTO_BUCKET_COLABORADORES}/`;

        const indicePublico =
            texto.indexOf(marcadorPublico);

        if (indicePublico >= 0) {
            return decodeURIComponent(
                texto
                    .slice(
                        indicePublico +
                        marcadorPublico.length
                    )
                    .split("?")[0]
            );
        }

        const indiceAutenticado =
            texto.indexOf(marcadorAutenticado);

        if (indiceAutenticado >= 0) {
            return decodeURIComponent(
                texto
                    .slice(
                        indiceAutenticado +
                        marcadorAutenticado.length
                    )
                    .split("?")[0]
            );
        }

        const indiceAssinado =
            texto.indexOf(marcadorAssinado);

        if (indiceAssinado >= 0) {
            return decodeURIComponent(
                texto
                    .slice(
                        indiceAssinado +
                        marcadorAssinado.length
                    )
                    .split("?")[0]
            );
        }
    }

    const marcadorBucket =
        `${FOTO_BUCKET_COLABORADORES}/`;

    const indiceBucket =
        texto.indexOf(marcadorBucket);

    if (indiceBucket >= 0) {
        return texto
            .slice(
                indiceBucket +
                marcadorBucket.length
            )
            .replace(/^\/+/, "");
    }

    if (!ehUrlFotoPronta(texto)) {
        return texto.replace(/^\/+/, "");
    }

    return "";
}

function obterCandidatosFotoDocumento(registro = {}) {
    const item =
        registro.item || {};

    const colaborador =
        registro.colaborador || {};

    const empresa =
        colaborador.empresa ||
        item.empresa ||
        {};

    return [
        item.fotoUrl,
        item.foto_url,
        item.fotoColaboradorUrl,
        item.foto_colaborador_url,
        item.colaboradorFotoUrl,
        item.colaborador_foto_url,
        item.avatarUrl,
        item.avatar_url,
        colaborador.fotoUrl,
        colaborador.foto_url,
        colaborador.fotoPublicaUrl,
        colaborador.foto_publica_url,
        colaborador.fotoAssinadaUrl,
        colaborador.foto_assinada_url,
        colaborador.fotoColaboradorUrl,
        colaborador.foto_colaborador_url,
        colaborador.avatarUrl,
        colaborador.avatar_url,
        colaborador.imagemUrl,
        colaborador.imagem_url,
        colaborador.urlFoto,
        colaborador.url_foto,
        colaborador.fotoPerfil,
        colaborador.foto_perfil,
        colaborador.foto_path,
        colaborador.fotoPath,
        colaborador.caminhoFoto,
        colaborador.caminho_foto,
        colaborador.foto,
        empresa.logo_url,
        empresa.logoUrl,
        item.logoEmpresaUrl,
        item.logo_empresa_url,
    ].filter(
        (valor) =>
            valor !== null &&
            valor !== undefined &&
            String(valor).trim() !== ""
    );
}

function obterLogoEmpresaDocumento(registro = {}) {
    const empresa =
        registro.empresa || {};

    const documento =
        registro.documento || {};

    const candidatos = [
        empresa.logo_url,
        empresa.logoUrl,
        empresa.logo,
        registro.empresaLogoUrl,
        registro.empresa_logo_url,
        documento.empresaLogoUrl,
        documento.empresa_logo_url,
        documento.logoEmpresaUrl,
        documento.logo_empresa_url,
    ];

    const logoRaw =
        candidatos.find(
            (valor) =>
                valor !== null &&
                valor !== undefined &&
                String(valor).trim() !== ""
        ) || "";

    if (!logoRaw) {
        return "";
    }

    try {
        return (
            obterUrlLogoEmpresa(
                String(logoRaw).trim()
            ) || ""
        );
    } catch (erro) {
        console.warn(
            "Não foi possível resolver o logo da empresa:",
            erro
        );

        return "";
    }
}

async function resolverFotoDocumentoAvencer(
    candidatos = []
) {
    for (const candidato of candidatos) {
        const valor =
            normalizarTextoFoto(candidato);

        if (!valor) {
            continue;
        }

        if (ehUrlFotoPronta(valor)) {
            return valor;
        }

        const caminhoStorage =
            extrairCaminhoFotoStorage(valor);

        if (!caminhoStorage) {
            continue;
        }

        const chaveCache =
            `${FOTO_BUCKET_COLABORADORES}/${caminhoStorage}`;

        if (
            CACHE_FOTOS_DOCUMENTOS_AVENCER.has(
                chaveCache
            )
        ) {
            return CACHE_FOTOS_DOCUMENTOS_AVENCER.get(
                chaveCache
            );
        }

        const urlAssinada =
            await criarUrlAssinadaStorage(
                FOTO_BUCKET_COLABORADORES,
                caminhoStorage,
                60 * 60
            );

        if (urlAssinada) {
            CACHE_FOTOS_DOCUMENTOS_AVENCER.set(
                chaveCache,
                urlAssinada
            );

            return urlAssinada;
        }
    }

    return "";
}

function FotoDocumentoAVencer({
    registro,
    IconeFallback,
}) {
    const logoEmpresa =
        useMemo(
            () =>
                registro?.origem === "empresa"
                    ? obterLogoEmpresaDocumento(
                        registro
                    )
                    : "",
            [
                registro?.origem,
                registro?.empresa,
                registro?.documento,
            ]
        );

    const candidatosFoto =
        useMemo(
            () =>
                registro?.origem === "colaborador"
                    ? obterCandidatosFotoDocumento(
                        registro
                    )
                    : [],
            [
                registro?.origem,
                registro?.item,
                registro?.colaborador,
            ]
        );

    const [
        fotoResolvida,
        setFotoResolvida,
    ] = useState("");

    const [
        fotoComErro,
        setFotoComErro,
    ] = useState(false);

    useEffect(() => {
        let ativo = true;

        setFotoResolvida("");
        setFotoComErro(false);

        if (
            registro?.origem === "empresa"
        ) {
            setFotoResolvida(
                logoEmpresa || ""
            );

            return () => {
                ativo = false;
            };
        }

        if (
            registro?.origem !== "colaborador" ||
            candidatosFoto.length === 0
        ) {
            return () => {
                ativo = false;
            };
        }

        resolverFotoDocumentoAvencer(
            candidatosFoto
        ).then((url) => {
            if (ativo) {
                setFotoResolvida(url || "");
            }
        });

        return () => {
            ativo = false;
        };
    }, [
        candidatosFoto,
        logoEmpresa,
        registro?.origem,
    ]);

    if (
        fotoResolvida &&
        !fotoComErro
    ) {
        return (
            <img
                src={fotoResolvida}
                alt={
                    registro?.origem === "empresa"
                        ? `Logo de ${registro?.principal || "empresa"}`
                        : `Foto de ${registro?.principal || "colaborador"}`
                }
                className={
                    registro?.origem === "empresa"
                        ? "dashboard-pendencias-final__foto dashboard-documentos-avencer__logo-empresa"
                        : "dashboard-pendencias-final__foto"
                }
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() =>
                    setFotoComErro(true)
                }
            />
        );
    }

    return (
        <span className="dashboard-pendencias-final__foto dashboard-pendencias-final__foto--fallback">
            <IconeFallback className="h-4 w-4" />
        </span>
    );
}

export function DashboardDocumentosAVencer({
    documentos = [],
    blocosRecolhidosDashboard = {},
    alternarBlocoRecolhidoDashboard,
    enviarAlertaEmailPendencia,
    enviarAlertaEmailDocumentoEmpresa,
    enviarAlertasDocumentosAVencer30Dias,
    enviandoEmail = false,
    onSelectColab,
    onVisualizarDocumentoEmpresa,
    onVisualizarCertificado,
}) {
    const totalDocumentos = documentos.length;

    const [
        mostrarTodosDocumentos,
        setMostrarTodosDocumentos,
    ] = useState(false);

    const possuiMaisDocumentos =
        totalDocumentos >
        LIMITE_INICIAL_DOCUMENTOS_AVENCER;

    const documentosVisiveis =
        mostrarTodosDocumentos
            ? documentos
            : documentos.slice(
                0,
                LIMITE_INICIAL_DOCUMENTOS_AVENCER
            );

    useEffect(() => {
        setMostrarTodosDocumentos(false);
    }, [totalDocumentos]);

    const abrirRegistro = (registro) => {
        if (registro.origem === "empresa") {
            onVisualizarDocumentoEmpresa?.(
                registro.documento
            );
            return;
        }

        if (
            registro.documento &&
            onVisualizarCertificado
        ) {
            onVisualizarCertificado(
                registro.documento
            );
            return;
        }

        onSelectColab?.(
            registro.colaborador
        );
    };

    const enviarRegistro = (registro) => {
        if (registro.origem === "empresa") {
            enviarAlertaEmailDocumentoEmpresa?.(
                registro.documento
            );
            return;
        }

        enviarAlertaEmailPendencia?.(
            registro.item
        );
    };

    return (
        <DashboardBlocoRecolhivel
            chaveBloco="documentosAVencer30Dias"
            titulo="Documentos a vencer em 30 dias"
            subtitulo="Documentos empresariais, certificados, treinamentos e documentos de colaboradores próximos do vencimento."
            badge={(
                <div className="flex flex-wrap items-center gap-2">
                    <span className="dashboard-pendencias-final__contador rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-200">
                        {possuiMaisDocumentos && !mostrarTodosDocumentos
                            ? `${documentosVisiveis.length} de ${totalDocumentos}`
                            : `${totalDocumentos} itens`}
                    </span>

                    <button
                        type="button"
                        onClick={(evento) => {
                            evento.stopPropagation();
                            enviarAlertasDocumentosAVencer30Dias?.();
                        }}
                        disabled={
                            enviandoEmail ||
                            totalDocumentos === 0
                        }
                        className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-black text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Enviar todos os alertas de vencimento por e-mail"
                    >
                        <Send className="h-3.5 w-3.5" />
                        {enviandoEmail
                            ? "Enviando..."
                            : "Enviar todos"}
                    </button>
                </div>
            )}
            blocosRecolhidosDashboard={
                blocosRecolhidosDashboard
            }
            alternarBlocoRecolhidoDashboard={
                alternarBlocoRecolhidoDashboard
            }
        >
            <style>
                {ESTILOS_DOCUMENTOS_AVENCER}
            </style>

            <div
                className="dashboard-pendencias-final__quadro"
                data-dashboard-documentos-avencer="true"
            >
                <div
                    className="dashboard-pendencias-final__cabecalho dashboard-documentos-avencer__cabecalho"
                    aria-hidden="true"
                >
                    <span>Empresa / Colaborador</span>
                    <span>Documento</span>
                    <span>Vencimento</span>
                    <span>Status / Ações</span>
                </div>

                {totalDocumentos === 0 ? (
                    <div className="dashboard-pendencias-final__vazio">
                        Nenhum documento vence nos próximos 30 dias.
                    </div>
                ) : (
                    <div className="dashboard-pendencias-final__lista">
                        {documentosVisiveis.map(
                            (registro, indice) => {
                                const empresarial =
                                    registro.origem ===
                                    "empresa";

                                const IconeOrigem =
                                    empresarial
                                        ? Building2
                                        : UserRound;

                                const prazo =
                                    obterRotuloPrazo(
                                        registro
                                    );

                                const vencimento =
                                    registro.vencimento
                                        ? formatDate(
                                            registro.vencimento
                                        )
                                        : "Sem data";

                                return (
                                    <div
                                        key={obterChaveRegistro(
                                            registro,
                                            indice
                                        )}
                                        className="dashboard-pendencias-final__linha dashboard-documentos-avencer__linha"
                                        role="button"
                                        tabIndex={0}
                                        title="Clique para abrir o documento"
                                        onClick={() =>
                                            abrirRegistro(
                                                registro
                                            )
                                        }
                                        onKeyDown={(
                                            evento
                                        ) => {
                                            if (
                                                evento.key ===
                                                    "Enter" ||
                                                evento.key ===
                                                    " "
                                            ) {
                                                evento.preventDefault();
                                                abrirRegistro(
                                                    registro
                                                );
                                            }
                                        }}
                                    >
                                        <div className="dashboard-pendencias-final__colaborador">
                                            <FotoDocumentoAVencer
                                                registro={registro}
                                                IconeFallback={IconeOrigem}
                                            />

                                            <div className="dashboard-pendencias-final__colaborador-texto">
                                                <strong
                                                    title={
                                                        registro.principal
                                                    }
                                                >
                                                    {
                                                        registro.principal
                                                    }
                                                </strong>

                                                <span
                                                    className="dashboard-documentos-avencer__origem"
                                                    title={
                                                        registro.apoio
                                                    }
                                                >
                                                    {empresarial
                                                        ? "Documento empresarial"
                                                        : registro.apoio}
                                                </span>
                                            </div>
                                        </div>

                                        <div
                                            className="dashboard-pendencias-final__treinamento"
                                            title={
                                                registro.nomeDocumento
                                            }
                                        >
                                            {
                                                registro.nomeDocumento
                                            }
                                        </div>

                                        <div
                                            className="dashboard-pendencias-final__vencimento dashboard-documentos-avencer__vencimento"
                                            title={`${vencimento}${prazo ? ` · ${prazo}` : ""}`}
                                        >
                                            {vencimento}
                                        </div>

                                        <div className="dashboard-pendencias-final__acoes dashboard-documentos-avencer__acoes">
                                            <span
                                                className="dashboard-pendencias-final__status dashboard-pendencias-final__status--vencendo"
                                                title={
                                                    prazo ||
                                                    "A vencer"
                                                }
                                            >
                                                {prazo ||
                                                    "A vencer"}
                                            </span>

                                            <button
                                                type="button"
                                                onClick={(
                                                    evento
                                                ) => {
                                                    evento.stopPropagation();
                                                    enviarRegistro(
                                                        registro
                                                    );
                                                }}
                                                disabled={
                                                    enviandoEmail
                                                }
                                                className="dashboard-pendencias-final__botao dashboard-pendencias-final__botao--email"
                                                title="Enviar alerta por e-mail"
                                            >
                                                <Mail />
                                                <span>
                                                    E-mail
                                                </span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={(
                                                    evento
                                                ) => {
                                                    evento.stopPropagation();
                                                    abrirRegistro(
                                                        registro
                                                    );
                                                }}
                                                className="dashboard-pendencias-final__botao dashboard-pendencias-final__botao--qr"
                                                title="Abrir o documento"
                                            >
                                                <Eye />
                                                <span>
                                                    Abrir
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            }
                        )}

                        {possuiMaisDocumentos && (
                            <div className="dashboard-documentos-avencer__rodape">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setMostrarTodosDocumentos(
                                            (
                                                valorAtual
                                            ) =>
                                                !valorAtual
                                        )
                                    }
                                    className="dashboard-documentos-avencer__mostrar-mais"
                                >
                                    {mostrarTodosDocumentos
                                        ? "Mostrar menos"
                                        : `Mostrar mais ${totalDocumentos - LIMITE_INICIAL_DOCUMENTOS_AVENCER} item(ns)`}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </DashboardBlocoRecolhivel>
    );
}

export default DashboardDocumentosAVencer;
