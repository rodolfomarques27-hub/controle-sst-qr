import { CameraIaGuidancePreview } from "../components/CameraIaCaptureGuidance.jsx";
import { CameraIaOperationalGuidancePanel } from "../components/CameraIaOperationalGuidancePanel.jsx";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import {
    AlertTriangle,
    Camera,
    CheckCircle2,
    FileCheck2,
    HardHat,
    ShieldCheck,
    UserRound,
    UsersRound,
    XCircle,
} from "lucide-react";
import heroSst from "../../../assets/dashboard-hero-sst.webp";
import {
    carregarResumoDocumentalCameraIa,
} from "../cameraIaDocumentalIntegration.js";
import {
    registrarAuditoriaSistemaService,
} from "../../../services/auditoriaSistemaCrudService";

const CENARIOS = Object.freeze({
    liberado: {
        rotulo: "Liberado",
        decisao: "LIBERADO",
        detalhe:
            "Identidade, documentos, treinamentos e EPIs conformes.",
        classe:
            "border-emerald-200 bg-emerald-50 text-emerald-800",
        Icone:
            CheckCircle2,
        documentos:
            "conforme",
        treinamentos:
            "conforme",
        epi:
            "conforme",
    },

    conferencia: {
        rotulo:
            "Conferência",
        decisao:
            "CONFERÊNCIA MANUAL",
        detalhe:
            "Óculos de proteção com baixa confiança. Conferência humana necessária.",
        classe:
            "border-amber-200 bg-amber-50 text-amber-800",
        Icone:
            AlertTriangle,
        documentos:
            "conforme",
        treinamentos:
            "conforme",
        epi:
            "conferencia",
    },

    bloqueado: {
        rotulo:
            "Bloqueado",
        decisao:
            "BLOQUEADO",
        detalhe:
            "NR-35 vencida. Regularização obrigatória antes do acesso.",
        classe:
            "border-red-200 bg-red-50 text-red-800",
        Icone:
            XCircle,
        documentos:
            "bloqueado",
        treinamentos:
            "bloqueado",
        epi:
            "conferencia",
    },
});

const STATUS = Object.freeze({
    conforme: {
        texto:
            "Conforme",
        classe:
            "bg-emerald-50 text-emerald-700 ring-emerald-200",
        Icone:
            CheckCircle2,
    },

    valido: {
        texto:
            "Válido",
        classe:
            "bg-emerald-50 text-emerald-700 ring-emerald-200",
        Icone:
            CheckCircle2,
    },

    confirmado: {
        texto:
            "Confirmada",
        classe:
            "bg-emerald-50 text-emerald-700 ring-emerald-200",
        Icone:
            CheckCircle2,
    },

    conferencia: {
        texto:
            "Conferência",
        classe:
            "bg-amber-50 text-amber-700 ring-amber-200",
        Icone:
            AlertTriangle,
    },

    bloqueado: {
        texto:
            "Bloqueado",
        classe:
            "bg-red-50 text-red-700 ring-red-200",
        Icone:
            XCircle,
    },

    liberado: {
        texto:
            "Liberado",
        classe:
            "bg-emerald-50 text-emerald-700 ring-emerald-200",
        Icone:
            CheckCircle2,
    },
});

const EVENTOS = Object.freeze([
    {
        hora:
            "20:14",
        nome:
            "João da Silva",
        empresa:
            "ABC Serviços",
        docs:
            "Conforme",
        epi:
            "Conferência",
        tipo:
            "conferencia",
        resultado:
            "Conferência",
    },

    {
        hora:
            "20:12",
        nome:
            "Maria Souza",
        empresa:
            "XPTO Ltda",
        docs:
            "Conforme",
        epi:
            "Conforme",
        tipo:
            "liberado",
        resultado:
            "Liberado",
    },

    {
        hora:
            "20:10",
        nome:
            "Carlos Lima",
        empresa:
            "Construtora ABC",
        docs:
            "Conforme",
        epi:
            "Conforme",
        tipo:
            "liberado",
        resultado:
            "Liberado",
    },

    {
        hora:
            "20:08",
        nome:
            "Não identificado",
        empresa:
            "—",
        docs:
            "—",
        epi:
            "—",
        tipo:
            "bloqueado",
        resultado:
            "Bloqueado",
    },
]);

function Badge({
    status,
    texto = "",
}) {
    const meta =
        STATUS[status]
        || STATUS.conferencia;

    const Icone =
        meta.Icone;

    return (
        <span
            className={
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black ring-1 "
                + meta.classe
            }
        >
            <Icone
                className="h-3.5 w-3.5"
                strokeWidth={2.4}
            />

            {texto || meta.texto}
        </span>
    );
}

function Linha({
    Icone,
    titulo,
    status,
    detalhe = "",
}) {
    return (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-b-0">
            <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600 ring-1 ring-slate-200">
                    <Icone className="h-4 w-4" />
                </span>

                <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-800">
                        {titulo}
                    </p>

                    {detalhe ? (
                        <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
                            {detalhe}
                        </p>
                    ) : null}
                </div>
            </div>

            <Badge status={status} />
        </div>
    );
}

function Metrica({
    titulo,
    valor,
    tipo,
}) {
    const mapa = {
        liberado: {
            Icone:
                CheckCircle2,
            classe:
                "bg-emerald-50 text-emerald-700 ring-emerald-100",
        },

        bloqueado: {
            Icone:
                XCircle,
            classe:
                "bg-red-50 text-red-700 ring-red-100",
        },

        conferencia: {
            Icone:
                AlertTriangle,
            classe:
                "bg-amber-50 text-amber-700 ring-amber-100",
        },

        neutro: {
            Icone:
                UsersRound,
            classe:
                "bg-slate-100 text-slate-600 ring-slate-200",
        },
    };

    const meta =
        mapa[tipo];

    const Icone =
        meta.Icone;

    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
                <span
                    className={
                        "flex h-11 w-11 items-center justify-center rounded-2xl ring-1 "
                        + meta.classe
                    }
                >
                    <Icone className="h-5 w-5" />
                </span>

                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                        {titulo}
                    </p>

                    <p className="mt-1 text-2xl font-black text-slate-950">
                        {valor}
                    </p>

                    <p className="text-[11px] font-semibold text-slate-500">
                        Hoje
                    </p>
                </div>
            </div>
        </article>
    );
}

function FeedSintetico() {
    return (
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-inner">
            <div className="absolute inset-0 bg-gradient-to-br via-slate-900" style={{ "--tw-gradient-from": "var(--color-slate-800)", "--tw-gradient-to": "var(--color-black)" }} />

            <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-xs font-black text-white backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />

                Câmera · Portaria 01
            </div>

            <div className="absolute right-4 top-4 z-10 rounded-full bg-emerald-500 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-white">
                Online · sintético
            </div>

            <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative flex h-[58%] w-[34%] min-w-[132px] max-w-[220px] items-center justify-center rounded-[38%_38%_30%_30%] border border-slate-600/50 bg-slate-700/20">
                    <UserRound
                        className="h-[54%] w-[54%] text-slate-300/75"
                        strokeWidth={1.25}
                    />

                    <span className="absolute -left-4 top-4 h-8 w-8 border-l-4 border-t-4 border-emerald-400" />
                    <span className="absolute -right-4 top-4 h-8 w-8 border-r-4 border-t-4 border-emerald-400" />
                    <span className="absolute -bottom-4 -left-4 h-8 w-8 border-b-4 border-l-4 border-emerald-400" />
                    <span className="absolute -bottom-4 -right-4 h-8 w-8 border-b-4 border-r-4 border-emerald-400" />
                </div>
            </div>

            <div className="absolute bottom-4 left-4 rounded-lg bg-black/55 px-3 py-1.5 text-[11px] font-bold text-white">
                Preview sem biometria real
            </div>
        </div>
    );
}

function FeedCameraLocal({
    iniciarAutomaticamente = false,
    onCameraStateChange,
}) {
    const [visualizando, setVisualizando] =
        useState(
            Boolean(
                iniciarAutomaticamente
            )
        );

    const [estadoCamera, setEstadoCamera] =
        useState(
            iniciarAutomaticamente
                ? "VERIFICANDO"
                : "PARADO"
        );

    const ambienteLocal =
        import.meta.env.DEV
        && typeof window !== "undefined"
        && ["127.0.0.1", "localhost"].includes(window.location.hostname);

    useEffect(() => {
        if (
            typeof onCameraStateChange !==
            "function"
        ) {
            return;
        }

        onCameraStateChange({
            ambienteLocal,
            visualizando,
            status:
                estadoCamera,
        });
    }, [
        ambienteLocal,
        estadoCamera,
        onCameraStateChange,
        visualizando,
    ]);

    useEffect(() => {
        if (!ambienteLocal || !visualizando) {
            return undefined;
        }

        let ativo = true;
        let conexaoAnterior = false;
        let emCurso = false;
        let requisicaoAtual = null;

        const verificar = async () => {
            if (!ativo || emCurso) return;

            emCurso = true;

            const controlador = new globalThis.AbortController();
            requisicaoAtual = controlador;

            const limite = window.setTimeout(
                () => controlador.abort(),
                2500,
            );

            try {
                const resposta = await globalThis.fetch(
                    "/__safescan-dev/camera-status",
                    {
                        cache: "no-store",
                        signal: controlador.signal,
                    },
                );

                if (!ativo) return;

                if (!resposta.ok) {
                    setEstadoCamera(
                        conexaoAnterior
                            ? "RECONECTANDO"
                            : resposta.status >= 500 ? "OFFLINE" : "ERRO",
                    );
                    return;
                }

                const dados = await resposta.json();

                if (!ativo) return;

                const contratoValido =
                    typeof dados?.serviceAvailable === "boolean"
                    && typeof dados?.streamFound === "boolean"
                    && Number.isInteger(dados?.producerCount)
                    && Number.isInteger(dados?.consumerCount)
                    && dados.producerCount >= 0
                    && dados.consumerCount >= 0;

                if (!contratoValido) {
                    setEstadoCamera("ERRO");
                    return;
                }

                if (!dados.serviceAvailable) {
                    setEstadoCamera(
                        conexaoAnterior ? "RECONECTANDO" : "OFFLINE",
                    );
                    return;
                }

                if (!dados.streamFound) {
                    setEstadoCamera(
                        conexaoAnterior ? "RECONECTANDO" : "ERRO",
                    );
                    return;
                }

                if (
                    dados.producerCount > 0
                    && dados.consumerCount > 0
                ) {
                    conexaoAnterior = true;
                    setEstadoCamera("ONLINE");
                    return;
                }

                setEstadoCamera(
                    conexaoAnterior ? "RECONECTANDO" : "AGUARDANDO",
                );
            } catch {
                if (ativo) {
                    setEstadoCamera(
                        conexaoAnterior ? "RECONECTANDO" : "OFFLINE",
                    );
                }
            } finally {
                window.clearTimeout(limite);
                if (requisicaoAtual === controlador) {
                    requisicaoAtual = null;
                }
                emCurso = false;
            }
        };

        void verificar();

        const intervalo = window.setInterval(() => {
            void verificar();
        }, 4000);

        return () => {
            ativo = false;
            window.clearInterval(intervalo);
            requisicaoAtual?.abort();
        };
    }, [ambienteLocal, visualizando]);

    if (!ambienteLocal) {
        return <div className="flex aspect-video items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-6 text-center">
    <div>
        <p className="text-sm font-black text-slate-800">
            Visualização parada
        </p>

        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            Use Iniciar visualização para abrir a imagem real da câmera.
        </p>
    </div>
</div>;
    }

    const descricaoEstado = {
        PARADO: "Visualização fechada pelo usuário.",
        VERIFICANDO: "Consultando o estado da câmera local.",
        AGUARDANDO: "Câmera localizada. Aguardando confirmação da imagem.",
        ONLINE: "Câmera conectada. A confirmação da imagem aparece no teste da IA.",
        OFFLINE: "Serviço local indisponível.",
        ERRO: "Câmera indisponível ou resposta inválida.",
        RECONECTANDO: "Conexão anterior perdida; aguardando recuperação.",
    }[estadoCamera];

    const playerUrl =
        "http://127.0.0.1:1984/stream.html?src=sala_teste&mode=webrtc,mse,mp4";

    return (
        <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-sm font-black text-slate-900">
                        Câmera · operação local
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                        Visualização local da câmera
                    </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700 ring-1 ring-blue-200">
                    Operação local
                </span>
            </div>

            {visualizando ? (
                <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
                    <iframe
                        title="Transmissão local da câmera SafeScan"
                        src={playerUrl}
                        className="h-full w-full border-0"
                        allow="autoplay; fullscreen"
                        referrerPolicy="no-referrer"
                    />
                </div>
            ) : (
                <div className="flex aspect-video items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-6 text-center">
    <div>
        <p className="text-sm font-black text-slate-800">
            Visualização parada
        </p>

        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            Use Iniciar visualização para abrir a imagem real da câmera.
        </p>
    </div>
</div>
            )}

            <div
                role="status"
                aria-live="polite"
                className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            >
                <span
                    className={
                        "rounded-full px-2.5 py-1 text-[10px] font-black tracking-wide "
                        + (estadoCamera === "ONLINE"
                            ? "bg-emerald-100 text-emerald-800"
                            : estadoCamera === "ERRO" || estadoCamera === "OFFLINE"
                                ? "bg-rose-100 text-rose-800"
                                : estadoCamera === "RECONECTANDO"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-slate-200 text-slate-700")
                    }
                >
                    {estadoCamera === "AGUARDANDO" ? "STREAM LISTADO" : estadoCamera}
                </span>
                <p className="min-w-0 flex-1 text-xs font-semibold text-slate-600">
                    {descricaoEstado}
                </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-md text-xs font-semibold leading-5 text-slate-500">
                    {visualizando
                        ? "Imagem real aberta. A interface usa somente as leituras disponíveis; identidade facial e decisão automática permanecem não homologadas."
                        : "Visualização parada. Inicie a visualização para abrir a câmera local."}
                </p>

                <button
                    type="button"
                    onClick={() => {
                        if (visualizando) {
                            setEstadoCamera("PARADO");
                            setVisualizando(false);
                        } else {
                            setEstadoCamera("VERIFICANDO");
                            setVisualizando(true);
                        }
                    }}
                    className={
                        "rounded-xl px-4 py-2.5 text-xs font-black transition-colors "
                        + (visualizando
                            ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                            : "bg-emerald-600 text-white hover:bg-emerald-700")
                    }
                >
                    {visualizando
                        ? "Parar visualização"
                        : "Iniciar visualização"}
                </button>
            </div>
        </div>
    );
}

function confidenceLabel(
    value,
) {
    if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value <= 0
    ) {
        return "";
    }

    return (
        `${Math.round(value * 1000) / 10}%`
    );
}

function resumirPpeVisual(
    ppeVisual,
) {
    const naoAvaliado = (
        detalhe =
            "Não avaliado"
    ) => ({
        badge:
            "conferencia",
        texto:
            detalhe,
    });

    if (
        !ppeVisual ||
        ppeVisual.status !==
            "PPE_DETECTED"
    ) {
        return {
            badge:
                "conferencia",

            resumo:
                ppeVisual?.status ===
                    "NO_PERSON"
                    ? "Nenhuma pessoa detectada"
                    : "Aguardando avaliação visual",

            capacete:
                naoAvaliado(),

            colete:
                naoAvaliado(),

            oculos:
                naoAvaliado(
                    "NÃO AVALIADO",
                ),

            luvas:
                naoAvaliado(
                    "NÃO AVALIADO",
                ),

            calcado:
                naoAvaliado(
                    "NÃO AVALIADO",
                ),
        };
    }

    const counts =
        ppeVisual.counts ||
        {};

    const confidence =
        ppeVisual.maxConfidence ||
        {};

    const capacete =
        Number(
            counts.noHardhat ||
            0
        ) >
        0
            ? {
                badge:
                    "bloqueado",
                texto:
                    (
                        "Ausência de capacete detectada" +
                        (
                            confidenceLabel(
                                confidence.noHardhat,
                            )
                                ? ` · ${confidenceLabel(confidence.noHardhat)}`
                                : ""
                        )
                    ),
            }
            : Number(
                counts.hardhat ||
                0
            ) >
            0
                ? {
                    badge:
                        "conforme",
                    texto:
                        (
                            "Capacete detectado" +
                            (
                                confidenceLabel(
                                    confidence.hardhat,
                                )
                                    ? ` · ${confidenceLabel(confidence.hardhat)}`
                                    : ""
                            )
                        ),
                }
                : naoAvaliado();

    const colete =
        Number(
            counts.noVest ||
            0
        ) >
        0
            ? {
                badge:
                    "bloqueado",
                texto:
                    (
                        "Ausência de colete detectada" +
                        (
                            confidenceLabel(
                                confidence.noVest,
                            )
                                ? ` · ${confidenceLabel(confidence.noVest)}`
                                : ""
                        )
                    ),
            }
            : Number(
                counts.vest ||
                0
            ) >
            0
                ? {
                    badge:
                        "conforme",
                    texto:
                        (
                            "Colete detectado" +
                            (
                                confidenceLabel(
                                    confidence.vest,
                                )
                                    ? ` · ${confidenceLabel(confidence.vest)}`
                                    : ""
                            )
                        ),
                }
                : naoAvaliado();

    const quantidadePessoa =
        Number(
            ppeVisual.personCount ||
            0
        );

    const evidenciaVisualEpi =
        [
            "hardhat",
            "noHardhat",
            "vest",
            "noVest",
        ].some(
            (
                key,
            ) =>
                Number(
                    counts[key] ||
                    0
                ) >
                0,
        );

    const resumoPresenca =
        quantidadePessoa >
        0
            ? (
                `Pessoa(s): ${quantidadePessoa}`
            )
            : evidenciaVisualEpi
                ? "Presença visual inferida por EPI"
                : "Presença visual não conclusiva";

    return {
        badge:
            "conferencia",

        resumo:
            (
                `${resumoPresenca} · ` +
                `${capacete.texto} · ${colete.texto}`
            ),

        capacete,
        colete,

        oculos:
            naoAvaliado(
                "NÃO AVALIADO",
            ),

        luvas:
            naoAvaliado(
                "NÃO AVALIADO",
            ),

        calcado:
            naoAvaliado(
                "NÃO AVALIADO",
            ),
    };
}

function consolidarEvidenciasOperacionais(
    resumoDocumental,
    ppeVisual,
) {
    const dadosReais =
        Boolean(
            resumoDocumental
                ?.colaborador
                ?.id
        );

    const ppeResumo =
        resumirPpeVisual(
            ppeVisual
        );

    const aguardando = (
        texto,
        detalhe,
    ) => ({
        badge:
            "conferencia",
        texto,
        detalhe,
    });

    const colaborador =
        dadosReais
            ? resumoDocumental.colaborador
            : {
                nome:
                    "AGUARDANDO COLABORADOR",
                empresa:
                    "Nenhum colaborador conferido",
                funcao:
                    "—",
                codigo:
                    "—",
            };

    const vinculo =
        dadosReais
            ? resumoDocumental.vinculo
            : aguardando(
                "AGUARDANDO COLABORADOR",
                "Selecione e confira um colaborador para consultar o vínculo real.",
            );

    const documentacao =
        dadosReais
            ? resumoDocumental.documentacao
            : aguardando(
                "AGUARDANDO COLABORADOR",
                "Documentação SST ainda não associada a um colaborador conferido.",
            );

    const aso =
        dadosReais
            ? resumoDocumental.aso
            : aguardando(
                "AGUARDANDO COLABORADOR",
                "ASO ainda não associado a um colaborador conferido.",
            );

    const treinamentos =
        dadosReais
            ? resumoDocumental.treinamentos
            : {
                ...aguardando(
                    "AGUARDANDO COLABORADOR",
                    "Treinamentos ainda não associados a um colaborador conferido.",
                ),
                emDia:
                    0,
                aVencer:
                    0,
                pendentes:
                    0,
                vencidos:
                    0,
            };

    const fichaEpi =
        dadosReais
            ? resumoDocumental.fichaEpi
            : aguardando(
                "AGUARDANDO COLABORADOR",
                "Ficha documental de EPI ainda não associada a um colaborador conferido.",
            );

    const identidade = {
        badge:
            "conferencia",
        texto:
            "NÃO HOMOLOGADA",
        detalhe:
            "Identidade facial não homologada para decisão de acesso.",
    };

    const ppeTemMedicao =
        ppeVisual?.status ===
        "PPE_DETECTED";

    const epiVisual =
        dadosReais
            ? {
                badge:
                    ppeResumo.badge,
                texto:
                    ppeTemMedicao
                        ? "LEITURA RECEBIDA"
                        : "NÃO CONCLUSIVO",
                detalhe:
                    ppeResumo.resumo,
                resumo:
                    ppeResumo,
            }
            : {
                badge:
                    "conferencia",
                texto:
                    "AGUARDANDO COLABORADOR",
                detalhe:
                    ppeTemMedicao
                        ? (
                            "Há leitura visual disponível, mas ela ainda não está " +
                            "associada a um colaborador conferido."
                        )
                        : "EPI visual ainda sem consolidação com um colaborador.",
                resumo:
                    ppeResumo,
            };

    const motivos =
        [];

    if (dadosReais) {
        motivos.push(
            `Vínculo: ${vinculo.texto}.`
        );

        motivos.push(
            `Documentação SST: ${documentacao.texto}.`
        );

        motivos.push(
            `ASO: ${aso.texto}.`
        );

        motivos.push(
            (
                "Treinamentos: " +
                `${treinamentos.emDia} em dia, ` +
                `${treinamentos.aVencer} a vencer, ` +
                `${treinamentos.pendentes} pendente(s) e ` +
                `${treinamentos.vencidos} vencido(s).`
            )
        );

        motivos.push(
            `Ficha de EPI: ${fichaEpi.texto}.`
        );

        motivos.push(
            `EPI visual: ${ppeResumo.resumo}.`
        );
    }
    else {
        motivos.push(
            "Colaborador ainda não conferido."
        );

        motivos.push(
            "As evidências documentais ainda não estão associadas a uma pessoa."
        );

        if (ppeTemMedicao) {
            motivos.push(
                "Existe leitura visual de EPI, mas ela ainda não está vinculada a um colaborador conferido."
            );
        }
    }

    motivos.push(
        "Identidade facial: NÃO HOMOLOGADA."
    );

    motivos.push(
        "Nenhuma liberação ou bloqueio de acesso é realizado automaticamente."
    );

    return {
        dadosReais,
        colaborador,
        vinculo,
        documentacao,
        aso,
        treinamentos,
        fichaEpi,
        identidade,
        epiVisual,

        decisao: {
            codigo:
                "CONFERÊNCIA MANUAL",
            detalhe:
                motivos.join(
                    " "
                ),
        },
    };
}

function montarSnapshotAuditoriaCameraIa({
    resumoDocumental,
    ppeVisual,
} = {}) {
    const consolidado =
        consolidarEvidenciasOperacionais(
            resumoDocumental,
            ppeVisual,
        );

    const counts =
        ppeVisual?.counts &&
        typeof ppeVisual.counts ===
            "object"
            ? ppeVisual.counts
            : {};

    const confidence =
        ppeVisual?.maxConfidence &&
        typeof ppeVisual.maxConfidence ===
            "object"
            ? ppeVisual.maxConfidence
            : {};

    const numeroSeguro = (
        valor,
    ) => {
        const numero =
            Number(valor);

        return Number.isFinite(
            numero
        )
            ? numero
            : 0;
    };

    const confiancaSegura = (
        valor,
    ) => {
        const numero =
            Number(valor);

        return Number.isFinite(
            numero
        ) &&
            numero >= 0
            ? numero
            : null;
    };

    const personCount =
        numeroSeguro(
            ppeVisual?.personCount
        );

    const evidenciaEpi =
        [
            "hardhat",
            "noHardhat",
            "vest",
            "noVest",
        ].some(
            (chave) =>
                numeroSeguro(
                    counts[chave]
                ) > 0
        );

    return {
        colaborador: {
            id:
                consolidado
                    ?.colaborador
                    ?.id ||
                null,
            empresaId:
                consolidado
                    ?.colaborador
                    ?.empresaId ||
                null,
            nome:
                consolidado
                    ?.colaborador
                    ?.nome ||
                "Colaborador",
            empresa:
                consolidado
                    ?.colaborador
                    ?.empresa ||
                "Empresa não informada",
            funcao:
                consolidado
                    ?.colaborador
                    ?.funcao ||
                "-",
            codigo:
                consolidado
                    ?.colaborador
                    ?.codigo ||
                "-",
        },

        vinculo: {
            status:
                consolidado
                    ?.vinculo
                    ?.texto ||
                "Em conferência",
            detalhe:
                consolidado
                    ?.vinculo
                    ?.detalhe ||
                "",
        },

        documentacaoSst: {
            status:
                consolidado
                    ?.documentacao
                    ?.texto ||
                "Em conferência",
            detalhe:
                consolidado
                    ?.documentacao
                    ?.detalhe ||
                "",
        },

        aso: {
            status:
                consolidado
                    ?.aso
                    ?.texto ||
                "Em conferência",
            detalhe:
                consolidado
                    ?.aso
                    ?.detalhe ||
                "",
        },

        treinamentos: {
            total:
                numeroSeguro(
                    consolidado
                        ?.treinamentos
                        ?.total
                ),
            emDia:
                numeroSeguro(
                    consolidado
                        ?.treinamentos
                        ?.emDia
                ),
            aVencer:
                numeroSeguro(
                    consolidado
                        ?.treinamentos
                        ?.aVencer
                ),
            pendentes:
                numeroSeguro(
                    consolidado
                        ?.treinamentos
                        ?.pendentes
                ),
            vencidos:
                numeroSeguro(
                    consolidado
                        ?.treinamentos
                        ?.vencidos
                ),
        },

        fichaDocumentalEpi: {
            status:
                consolidado
                    ?.fichaEpi
                    ?.texto ||
                "Em conferência",
            detalhe:
                consolidado
                    ?.fichaEpi
                    ?.detalhe ||
                "",
        },

        epiVisual: {
            status:
                String(
                    ppeVisual
                        ?.status ||
                    "UNAVAILABLE"
                ),

            pessoa: {
                quantidadeDireta:
                    personCount,
                presencaInferidaPorEpi:
                    personCount <= 0 &&
                    evidenciaEpi,
            },

            capacete: {
                detectado:
                    numeroSeguro(
                        counts.hardhat
                    ),
                ausenciaDetectada:
                    numeroSeguro(
                        counts.noHardhat
                    ),
                confiancaDetectado:
                    confiancaSegura(
                        confidence.hardhat
                    ),
                confiancaAusencia:
                    confiancaSegura(
                        confidence.noHardhat
                    ),
            },

            colete: {
                detectado:
                    numeroSeguro(
                        counts.vest
                    ),
                ausenciaDetectada:
                    numeroSeguro(
                        counts.noVest
                    ),
                confiancaDetectado:
                    confiancaSegura(
                        confidence.vest
                    ),
                confiancaAusencia:
                    confiancaSegura(
                        confidence.noVest
                    ),
            },

            oculos:
                "NÃO AVALIADO",

            luvas:
                "NÃO AVALIADO",

            calcado:
                "NÃO AVALIADO",
        },

        identidadeFacial:
            "NÃO HOMOLOGADA",

        decisao:
            "CONFERÊNCIA MANUAL",
    };
}
function ResumoAcessoDocumental({
    resumoDocumental = null,
    ppeVisual = null,
}) {
    const consolidado =
        consolidarEvidenciasOperacionais(
            resumoDocumental,
            ppeVisual,
        );

    const {
        dadosReais,
        colaborador,
        vinculo,
        documentacao,
        aso,
        treinamentos,
        fichaEpi,
        identidade,
        epiVisual,
        decisao,
    } = consolidado;

    const detalheTreinamentos =
        dadosReais
            ? (
                `${treinamentos.emDia} em dia · ` +
                `${treinamentos.aVencer} a vencer · ` +
                `${treinamentos.pendentes} pendente(s) · ` +
                `${treinamentos.vencidos} vencido(s)`
            )
            : treinamentos.detalhe;

    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                        <UserRound className="h-7 w-7" />
                    </span>

                    <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400">
                            {dadosReais
                                ? "Colaborador conferido"
                                : "Consolidação operacional"}
                        </p>

                        <h2 className="mt-1 truncate text-lg font-black text-slate-950">
                            {colaborador.nome}
                        </h2>

                        <p className="truncate text-xs font-semibold text-slate-500">
                            {dadosReais
                                ? (
                                    <>
                                        {colaborador.empresa}
                                        {" · "}
                                        {colaborador.funcao}
                                        {" · "}
                                        {colaborador.codigo}
                                    </>
                                )
                                : colaborador.empresa}
                        </p>
                    </div>
                </div>

                <span
                    className={
                        "shrink-0 text-[10px] font-black " +
                        (
                            dadosReais
                                ? "text-indigo-600"
                                : "text-amber-600"
                        )
                    }
                >
                    {dadosReais
                        ? "DADOS REAIS"
                        : "AGUARDANDO"}
                </span>
            </div>

            <div className="mt-2">
                <Linha
                    Icone={UserRound}
                    titulo="Vínculo"
                    status={vinculo.badge}
                    detalhe={
                        dadosReais
                            ? (
                                vinculo.detalhe ||
                                vinculo.texto
                            )
                            : vinculo.detalhe
                    }
                />

                <Linha
                    Icone={FileCheck2}
                    titulo="Documentação SST"
                    status={documentacao.badge}
                    detalhe={
                        dadosReais
                            ? (
                                documentacao.detalhe ||
                                documentacao.texto
                            )
                            : documentacao.detalhe
                    }
                />

                <Linha
                    Icone={ShieldCheck}
                    titulo="ASO"
                    status={aso.badge}
                    detalhe={
                        dadosReais
                            ? (
                                aso.detalhe ||
                                aso.texto
                            )
                            : aso.detalhe
                    }
                />

                <Linha
                    Icone={ShieldCheck}
                    titulo="Treinamentos"
                    status={treinamentos.badge}
                    detalhe={detalheTreinamentos}
                />

                <Linha
                    Icone={HardHat}
                    titulo="Ficha de EPI"
                    status={fichaEpi.badge}
                    detalhe={
                        dadosReais
                            ? (
                                fichaEpi.detalhe ||
                                fichaEpi.texto
                            )
                            : fichaEpi.detalhe
                    }
                />

                <Linha
                    Icone={HardHat}
                    titulo="EPI visual"
                    status={epiVisual.badge}
                    detalhe={epiVisual.detalhe}
                />

                <Linha
                    Icone={UserRound}
                    titulo="Identidade facial"
                    status={identidade.badge}
                    detalhe={identidade.detalhe}
                />
            </div>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.08em]">
                            Decisão
                        </p>

                        <p className="mt-1 text-sm font-black">
                            {decisao.codigo}
                        </p>

                        <p className="mt-1 text-xs font-bold leading-5">
                            {decisao.detalhe}
                        </p>
                    </div>
                </div>
            </div>
        </article>
    );
}
function IndicadorTesteIa({
    titulo,
    valor,
    detalhe = "",
    tom = "cinza",
}) {
    const tons = {
        verde:
            "border-emerald-200 bg-emerald-50 text-emerald-800",
        ambar:
            "border-amber-200 bg-amber-50 text-amber-800",
        vermelho:
            "border-red-200 bg-red-50 text-red-800",
        cinza:
            "border-slate-200 bg-slate-50 text-slate-700",
    };

    const classe =
        tons[tom] ||
        tons.cinza;

    return (
        <div
            className={
                "min-w-0 rounded-xl border px-3 py-3 " +
                classe
            }
        >
            <p className="text-[10px] font-black uppercase tracking-[0.08em] opacity-70">
                {titulo}
            </p>

            <p className="mt-1 break-words text-sm font-black">
                {valor}
            </p>

            {detalhe ? (
                <p className="mt-1 text-[11px] font-semibold leading-4 opacity-80">
                    {detalhe}
                </p>
            ) : null}
        </div>
    );
}

function ConfigTesteIaPanel({
    cameraOperacao = null,
    estadoGateway = "VERIFICANDO",
    telemetriaCamera = null,
    resumoDocumental = null,
    ppeVisual = null,
    testeAtivo = false,
    onIniciarTeste,
}) {
    const cameraStatus =
        cameraOperacao?.status ||
        "PARADO";

    const cameraInfo =
        {
            PARADO: {
                valor:
                    "NÃO TESTADA",
                tom:
                    "cinza",
                detalhe:
                    "Clique em INICIAR TESTE para abrir a visualização.",
            },

            VERIFICANDO: {
                valor:
                    "VERIFICANDO",
                tom:
                    "cinza",
                detalhe:
                    "Conferindo a disponibilidade da câmera.",
            },

            AGUARDANDO: {
                valor:
                    "LOCALIZADA",
                tom:
                    "ambar",
                detalhe:
                    "Aguardando confirmação da imagem.",
            },

            ONLINE: {
                valor:
                    "DISPONÍVEL",
                tom:
                    "verde",
                detalhe:
                    "Câmera conectada para o teste.",
            },

            OFFLINE: {
                valor:
                    "INDISPONÍVEL",
                tom:
                    "vermelho",
                detalhe:
                    "Serviço local da câmera não respondeu.",
            },

            ERRO: {
                valor:
                    "NÃO CONFIRMADA",
                tom:
                    "vermelho",
                detalhe:
                    "Não foi possível confirmar a fonte da câmera.",
            },

            RECONECTANDO: {
                valor:
                    "RECONECTANDO",
                tom:
                    "ambar",
                detalhe:
                    "Aguardando recuperação da conexão.",
            },
        }[cameraStatus] || {
            valor:
                "NÃO AVALIADA",
            tom:
                "cinza",
            detalhe:
                "Estado da câmera ainda não disponível.",
        };

    const gatewayInfo =
        !testeAtivo
            ? {
                valor:
                    "NÃO TESTADO",
                tom:
                    "cinza",
                detalhe:
                    "Clique em INICIAR TESTE para verificar o Vision Gateway.",
            }
            : (
                {
                    VERIFICANDO: {
                        valor:
                            "VERIFICANDO",
                        tom:
                            "cinza",
                        detalhe:
                            "Conferindo o Vision Gateway.",
                    },

                    NAO_CONFIGURADO: {
                        valor:
                            "NÃO CONFIGURADO",
                        tom:
                            "vermelho",
                        detalhe:
                            "Configuração operacional não confirmada.",
                    },

                    INDISPONIVEL: {
                        valor:
                            "INDISPONÍVEL",
                        tom:
                            "vermelho",
                        detalhe:
                            "O Vision Gateway não respondeu.",
                    },

                    RESPONDENDO: {
                        valor:
                            "DISPONÍVEL",
                        tom:
                            "verde",
                        detalhe:
                            "Vision Gateway respondendo normalmente.",
                    },
                }[estadoGateway] || {
                    valor:
                        "NÃO AVALIADO",
                    tom:
                        "cinza",
                    detalhe:
                        "Estado ainda não disponível.",
                }
            );

    const streamStatus =
        telemetriaCamera?.status ||
        "INDEFINIDO";

    const streamInfo =
        {
            FRAMES_RECENT: {
                valor:
                    "RECEBENDO",
                tom:
                    "verde",
                detalhe:
                    "Quadros recentes confirmados pelo Vision Gateway.",
            },

            SESSION_NO_RECENT_FRAMES: {
                valor:
                    "SEM IMAGEM RECENTE",
                tom:
                    "ambar",
                detalhe:
                    "Sessão ativa, mas sem quadros recentes.",
            },

            NO_ACTIVE_SESSION: {
                valor:
                    "SESSÃO INATIVA",
                tom:
                    "ambar",
                detalhe:
                    "Não há sessão ativa da câmera.",
            },

            NO_CAMERA_CONFIGURED: {
                valor:
                    "NÃO CONFIGURADA",
                tom:
                    "vermelho",
                detalhe:
                    "Nenhuma câmera foi confirmada pelo gateway.",
            },
        }[streamStatus] || {
            valor:
                "NÃO AVALIADO",
            tom:
                "cinza",
            detalhe:
                "Aguardando telemetria da câmera.",
        };

    const facePresence =
        telemetriaCamera?.faceDetection ||
        null;

    const faceInfo =
        {
            FACE_DETECTED: {
                valor:
                    "ROSTO DETECTADO",
                tom:
                    "verde",
                detalhe:
                    facePresence
                        ? (
                            `${facePresence.faceCount || 0} rosto(s) · ` +
                            `${confidenceLabel(facePresence.maxConfidence) || "confiança não informada"}`
                        )
                        : "",
            },

            NO_FACE: {
                valor:
                    "ROSTO NÃO DETECTADO",
                tom:
                    "ambar",
                detalhe:
                    "YuNet executado sem rosto detectado.",
            },

            INITIALIZING: {
                valor:
                    "INICIALIZANDO",
                tom:
                    "cinza",
                detalhe:
                    "YuNet carregando.",
            },

            WAITING_FOR_FRAMES: {
                valor:
                    "AGUARDANDO IMAGEM",
                tom:
                    "cinza",
                detalhe:
                    "YuNet aguardando quadros da câmera.",
            },

            STALE: {
                valor:
                    "SEM RESULTADO RECENTE",
                tom:
                    "cinza",
                detalhe:
                    "A última leitura não é recente.",
            },

            ERROR: {
                valor:
                    "ERRO TÉCNICO",
                tom:
                    "vermelho",
                detalhe:
                    "Não foi possível concluir a detecção facial.",
            },

            UNAVAILABLE: {
                valor:
                    "INDISPONÍVEL",
                tom:
                    "cinza",
                detalhe:
                    "Detecção facial não disponível.",
            },
        }[facePresence?.status] || {
            valor:
                "NÃO AVALIADO",
            tom:
                "cinza",
            detalhe:
                "YuNet ainda sem leitura disponível.",
        };

    const faceVerification =
        telemetriaCamera?.faceVerification ||
        null;

    const sfaceDetalhe =
        {
            INITIALIZING:
                "SFace carregando modelos.",
            WAITING_FOR_FACE:
                "SFace aguardando rosto único.",
            REFERENCE_READY:
                "Referência técnica disponível para o teste.",
            WAITING_FOR_RETURN:
                "Teste técnico aguardando retorno ao enquadramento.",
            COMPARISON_COMPLETE:
                "Comparação técnica concluída, sem homologação de identidade.",
            EXPIRED:
                "Sessão técnica expirada.",
            ERROR:
                "Falha técnica; conferência manual obrigatória.",
            UNAVAILABLE:
                "SFace indisponível para este teste.",
        }[faceVerification?.status] ||
        "SFace sem resultado técnico disponível.";

    const ppeResumo =
        resumirPpeVisual(
            ppeVisual
        );

    const ppeMedido =
        ppeVisual?.status ===
        "PPE_DETECTED";

    const ppePersonCount =
        Number(
            ppeVisual?.personCount ||
            0
        );

    const ppeCounts =
        ppeVisual?.counts ||
        {};

    const ppePresencaInferidaPorEpi =
        ppeMedido &&
        ppePersonCount ===
            0 &&
        [
            "hardhat",
            "noHardhat",
            "vest",
            "noVest",
        ].some(
            (
                key,
            ) =>
                Number(
                    ppeCounts[key] ||
                    0
                ) >
                0,
        );

    const pessoaInfo =
        ppeVisual?.status ===
        "NO_PERSON"
            ? {
                valor:
                    "NÃO DETECTADA",
                tom:
                    "ambar",
                detalhe:
                    "Detector executado sem evidência visual de pessoa no enquadramento.",
            }
            : (
                ppeMedido &&
                (
                    ppePersonCount >
                        0 ||
                    ppePresencaInferidaPorEpi
                )
                    ? {
                        valor:
                            "DETECTADA",
                        tom:
                            "verde",
                        detalhe:
                            ppePersonCount >
                            0
                                ? `${ppePersonCount} pessoa(s) detectada(s) diretamente.`
                                : "Presença inferida por evidência visual de EPI; a classe direta de pessoa (person) não foi detectada.",
                    }
                    : {
                        valor:
                            "NÃO AVALIADA",
                        tom:
                            "cinza",
                        detalhe:
                            "Detector visual ainda sem medição válida.",
                    }
            );

    const tomPpe = (
        item
    ) => {
        if (
            !ppeMedido ||
            !item ||
            item.texto ===
                "NÃO AVALIADO" ||
            item.texto ===
                "Não avaliado"
        ) {
            return "cinza";
        }

        if (
            item.badge ===
            "conforme"
        ) {
            return "verde";
        }

        if (
            item.badge ===
            "bloqueado"
        ) {
            return "vermelho";
        }

        return "ambar";
    };

    const dadosDocumentais =
        Boolean(
            resumoDocumental
                ?.colaborador
                ?.id
        );

    const documentoBadge =
        resumoDocumental
            ?.documentacao
            ?.badge;

    const documentoTom =
        !dadosDocumentais
            ? "cinza"
            : documentoBadge ===
                "bloqueado"
                ? "vermelho"
                : documentoBadge ===
                    "conferencia"
                    ? "ambar"
                    : "verde";

    const documentoValor =
        dadosDocumentais
            ? "CONSULTADA"
            : "NÃO CONSULTADA";

    const documentoDetalhe =
        dadosDocumentais
            ? (
                resumoDocumental
                    ?.documentacao
                    ?.texto ||
                "Consulta documental concluída."
            )
            : "Selecione e confira o colaborador para consultar os dados reais.";

    const ppeTecnico =
        {
            INITIALIZING:
                "Inicializando detector",
            WAITING_FOR_FRAMES:
                "Aguardando imagem",
            PPE_DETECTED:
                "Medição recebida",
            NO_PERSON:
                "Nenhuma pessoa detectada",
            STALE:
                "Resultado desatualizado",
            ERROR:
                "Erro de inferência",
            UNAVAILABLE:
                "Indisponível",
        }[ppeVisual?.status] ||
        "Não avaliado";

    const modeloPpe =
        [
            "WAITING_FOR_FRAMES",
            "PPE_DETECTED",
            "NO_PERSON",
        ].includes(
            ppeVisual?.status
        )
            ? "Carregado"
            : ppeVisual?.status ===
                "INITIALIZING"
                ? "Inicializando"
                : "Não confirmado";

    return (
        <section
            data-camera-ia-config-teste="dev"
            className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-black text-slate-950">
                            Configuração e teste da IA
                        </h3>

                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-blue-700 ring-1 ring-blue-200">
                            Automático recomendado
                        </span>
                    </div>

                    <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-slate-500">
                        O SafeScan usa automaticamente a infraestrutura já configurada. Não é necessário informar porta, endereço técnico ou serviço no uso normal.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={
                        onIniciarTeste
                    }
                    className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-black text-white transition-colors hover:bg-emerald-700 sm:w-auto"
                >
                    <Camera className="h-4 w-4" />

                    {testeAtivo
                        ? "REINICIAR TESTE"
                        : "INICIAR TESTE"}
                </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <IndicadorTesteIa
                    titulo="Câmera"
                    valor={
                        cameraInfo.valor
                    }
                    detalhe={
                        cameraInfo.detalhe
                    }
                    tom={
                        cameraInfo.tom
                    }
                />

                <IndicadorTesteIa
                    titulo="Stream"
                    valor={
                        streamInfo.valor
                    }
                    detalhe={
                        streamInfo.detalhe
                    }
                    tom={
                        streamInfo.tom
                    }
                />

                <IndicadorTesteIa
                    titulo="Vision Gateway"
                    valor={
                        gatewayInfo.valor
                    }
                    detalhe={
                        gatewayInfo.detalhe
                    }
                    tom={
                        gatewayInfo.tom
                    }
                />

                <IndicadorTesteIa
                    titulo="Pessoa"
                    valor={
                        pessoaInfo.valor
                    }
                    detalhe={
                        pessoaInfo.detalhe
                    }
                    tom={
                        pessoaInfo.tom
                    }
                />

                <IndicadorTesteIa
                    titulo="Capacete"
                    valor={
                        ppeMedido
                            ? ppeResumo
                                .capacete
                                .texto
                            : "NÃO AVALIADO"
                    }
                    detalhe={
                        ppeMedido
                            ? "Resultado da detecção visual."
                            : "Sem medição visual válida."
                    }
                    tom={
                        tomPpe(
                            ppeResumo
                                .capacete
                        )
                    }
                />

                <IndicadorTesteIa
                    titulo="Colete"
                    valor={
                        ppeMedido
                            ? ppeResumo
                                .colete
                                .texto
                            : "NÃO AVALIADO"
                    }
                    detalhe={
                        ppeMedido
                            ? "Resultado da detecção visual."
                            : "Sem medição visual válida."
                    }
                    tom={
                        tomPpe(
                            ppeResumo
                                .colete
                        )
                    }
                />

                <IndicadorTesteIa
                    titulo="Documentação"
                    valor={
                        documentoValor
                    }
                    detalhe={
                        documentoDetalhe
                    }
                    tom={
                        documentoTom
                    }
                />

                <IndicadorTesteIa
                    titulo="Identidade facial"
                    valor="NÃO HOMOLOGADA"
                    detalhe={
                        `${faceInfo.valor}. ${sfaceDetalhe}`
                    }
                    tom="ambar"
                />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <IndicadorTesteIa
                    titulo="Óculos"
                    valor="NÃO AVALIADO"
                    detalhe="Não faz parte do detector homologável nesta versão."
                    tom="cinza"
                />

                <IndicadorTesteIa
                    titulo="Luvas"
                    valor="NÃO AVALIADO"
                    detalhe="Não faz parte do detector homologável nesta versão."
                    tom="cinza"
                />

                <IndicadorTesteIa
                    titulo="Calçado"
                    valor="NÃO AVALIADO"
                    detalhe="Não faz parte do detector homologável nesta versão."
                    tom="cinza"
                />
            </div>


            <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50">
                <summary className="px-4 py-3 text-xs font-black text-slate-700">
                    Avançado · diagnóstico técnico
                </summary>

                <div className="grid grid-cols-1 gap-2 border-t border-slate-200 p-3 text-xs font-semibold text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
                        <strong className="block text-slate-900">
                            Câmera
                        </strong>

                        {cameraInfo.valor}
                    </div>

                    <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
                        <strong className="block text-slate-900">
                            Vision Gateway
                        </strong>

                        {gatewayInfo.valor}
                    </div>

                    <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
                        <strong className="block text-slate-900">
                            Recebimento de imagem
                        </strong>

                        {streamInfo.valor}
                    </div>

                    <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
                        <strong className="block text-slate-900">
                            YuNet
                        </strong>

                        {faceInfo.valor}
                    </div>

                    <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
                        <strong className="block text-slate-900">
                            SFace
                        </strong>

                        Integração técnica · NÃO HOMOLOGADA
                    </div>

                    <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
                        <strong className="block text-slate-900">
                            Detector de EPI
                        </strong>

                        {ppeTecnico}
                        {" · Modelo: "}
                        {modeloPpe}
                    </div>
                </div>

                <p className="border-t border-slate-200 px-4 py-3 text-[11px] font-semibold leading-5 text-slate-500">
                    Área de diagnóstico somente leitura. Nenhum serviço, câmera, modelo ou acesso é iniciado ou alterado por este painel.
                </p>
            </details>
        </section>
    );
}

function Detalhes({
    resumoDocumental = null,
    ppeVisual = null,
}) {
    const consolidado =
        consolidarEvidenciasOperacionais(
            resumoDocumental,
            ppeVisual,
        );

    const {
        dadosReais,
        vinculo,
        documentacao,
        aso,
        treinamentos,
        fichaEpi,
        identidade,
        epiVisual,
    } = consolidado;

    const pontos =
        [];

    if (!dadosReais) {
        pontos.push({
            titulo:
                "Colaborador",
            status:
                "conferencia",
            texto:
                "AGUARDANDO COLABORADOR",
            detalhe:
                "Selecione e confira um colaborador para associar as evidências documentais.",
            Icone:
                UserRound,
        });
    }

    if (
        dadosReais &&
        vinculo.badge !==
            "conforme"
    ) {
        pontos.push({
            titulo:
                "Vínculo",
            status:
                vinculo.badge,
            texto:
                vinculo.texto,
            detalhe:
                vinculo.detalhe ||
                vinculo.texto,
            Icone:
                UserRound,
        });
    }

    if (
        dadosReais &&
        documentacao.badge !==
            "conforme"
    ) {
        pontos.push({
            titulo:
                "Documentação SST",
            status:
                documentacao.badge,
            texto:
                documentacao.texto,
            detalhe:
                documentacao.detalhe ||
                documentacao.texto,
            Icone:
                FileCheck2,
        });
    }

    if (
        dadosReais &&
        aso.badge !==
            "conforme" &&
        aso.badge !==
            "valido"
    ) {
        pontos.push({
            titulo:
                "ASO",
            status:
                aso.badge,
            texto:
                aso.texto,
            detalhe:
                aso.detalhe ||
                aso.texto,
            Icone:
                ShieldCheck,
        });
    }

    if (
        dadosReais &&
        treinamentos.badge !==
            "conforme"
    ) {
        pontos.push({
            titulo:
                "Treinamentos",
            status:
                treinamentos.badge,
            texto:
                treinamentos.texto,
            detalhe:
                (
                    `${treinamentos.emDia} em dia · ` +
                    `${treinamentos.aVencer} a vencer · ` +
                    `${treinamentos.pendentes} pendente(s) · ` +
                    `${treinamentos.vencidos} vencido(s)`
                ),
            Icone:
                ShieldCheck,
        });
    }

    if (
        dadosReais &&
        fichaEpi.badge !==
            "conforme"
    ) {
        pontos.push({
            titulo:
                "Ficha documental de EPI",
            status:
                fichaEpi.badge,
            texto:
                fichaEpi.texto,
            detalhe:
                fichaEpi.detalhe ||
                fichaEpi.texto,
            Icone:
                HardHat,
        });
    }

    if (
        dadosReais &&
        epiVisual.badge !==
            "conforme"
    ) {
        pontos.push({
            titulo:
                "EPI visual",
            status:
                epiVisual.badge,
            texto:
                epiVisual.texto,
            detalhe:
                epiVisual.detalhe,
            Icone:
                HardHat,
        });
    }

    pontos.push({
        titulo:
            "Identidade facial",
        status:
            identidade.badge,
        texto:
            identidade.texto,
        detalhe:
            identidade.detalhe,
        Icone:
            UserRound,
    });

    return (
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-4 xl:self-start">
            <div className="border-b border-slate-100 pb-4">
                <p className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400">
                    Conferência operacional
                </p>

                <h3 className="mt-1 text-lg font-black text-slate-950">
                    Pontos que exigem conferência
                </h3>

                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    Somente pendências, itens não homologados e resultados não conclusivos são exibidos aqui.
                </p>
            </div>

            <div className="mt-4 space-y-3">
                {pontos.map(
                    ({
                        titulo,
                        status,
                        texto,
                        detalhe,
                        Icone,
                    }) => (
                        <section
                            key={titulo}
                            className="rounded-2xl border border-slate-200 p-4"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500 ring-1 ring-slate-200">
                                        <Icone className="h-4 w-4" />
                                    </span>

                                    <h4 className="text-sm font-black text-slate-900">
                                        {titulo}
                                    </h4>
                                </div>

                                <Badge
                                    status={status}
                                    texto={texto}
                                />
                            </div>

                            <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">
                                {detalhe}
                            </p>
                        </section>
                    )
                )}
            </div>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs font-semibold leading-5 text-amber-800">
                A decisão final permanece no resumo operacional central e exige conferência manual.
            </div>
        </aside>
    );
}
function GatewayHealthIndicator({
  onPpeDetectionChange,
  cameraOperacao,
  resumoDocumental,
  testeAtivo,
  onIniciarTeste,
}) {
  const [estadoGateway, setEstadoGateway] = useState("VERIFICANDO");
  const [telemetriaCamera, setTelemetriaCamera] = useState(null);
  const facePresence = telemetriaCamera?.faceDetection ?? null;
  const faceVerification = telemetriaCamera?.faceVerification ?? null;
  const ppeDetection = telemetriaCamera?.ppeDetection ?? null;

  useEffect(() => {
    let mounted = true;
    let inFlight = null;

    async function pollGateway() {
      if (!mounted || inFlight) {
        return;
      }

      const controller = new globalThis.AbortController();
      inFlight = controller;

      const timeout = window.setTimeout(() => {
        controller.abort();
      }, 1800);

      try {
        const response = await globalThis.fetch(
          "/__safescan-dev/gateway-health",
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const payload = await response.json();

        const validPayload =
          payload !== null &&
          typeof payload === "object" &&
          !Array.isArray(payload) &&
          ["configured,reachable", "configured,operational,reachable"].includes(
             Object.keys(payload).sort((left, right) => left.localeCompare(right)).join(",")
           ) &&
           (payload.operational === undefined || (
             payload.operational !== null &&
             typeof payload.operational === "object" &&
             !Array.isArray(payload.operational) &&
             typeof payload.operational.status === "string" &&
             Array.isArray(payload.operational.cameras)
           )) &&
          typeof payload.configured === "boolean" &&
          typeof payload.reachable === "boolean";

        if (!validPayload) {
          throw new Error("invalid-gateway-status");
        }

        let proximoEstado = "INDISPONIVEL";

        if (
          response.status === 200 &&
          payload.configured === true &&
          payload.reachable === true
        ) {
          proximoEstado = "RESPONDENDO";
        } else if (
          response.status === 503 &&
          payload.configured === false &&
          payload.reachable === false
        ) {
          proximoEstado = "NAO_CONFIGURADO";
        }

        if (mounted) {
          const operational =
            payload.operational ?? null;

          setEstadoGateway(proximoEstado);
          setTelemetriaCamera(operational);

          if (
            typeof onPpeDetectionChange ===
            "function"
          ) {
            onPpeDetectionChange(
              operational?.ppeDetection ?? null
            );
          }
        }
      } catch {
        if (mounted) {
          setEstadoGateway("INDISPONIVEL");
          setTelemetriaCamera(null);

          if (
            typeof onPpeDetectionChange ===
            "function"
          ) {
            onPpeDetectionChange(null);
          }
        }
      } finally {
        window.clearTimeout(timeout);

        if (inFlight === controller) {
          inFlight = null;
        }
      }
    }

    void pollGateway();

    const intervalo = window.setInterval(() => {
      void pollGateway();
    }, 6000);

    return () => {
      mounted = false;
      window.clearInterval(intervalo);

      if (inFlight) {
        inFlight.abort();
      }
    };
  }, []);

  const estados = {
    VERIFICANDO: {
      label: "Verificando",
      classes: "border-slate-200 bg-white text-slate-600",
    },
    NAO_CONFIGURADO: {
      label: "Não configurado",
      classes: "border-slate-200 bg-slate-100 text-slate-700",
    },
    INDISPONIVEL: {
      label: "Indisponível",
      classes: "border-amber-200 bg-amber-50 text-amber-800",
    },
    RESPONDENDO: {
      label: "Respondendo",
      classes: "border-emerald-200 bg-emerald-50 text-emerald-800",
    },
  };

  const exibicao = estados[estadoGateway];

  return (
    <>
      <div
        data-gateway-health="dev"
        role="status"
        aria-live="polite"
        className="hidden"
      >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs font-bold text-slate-800">
          Vision Gateway
        </span>
        <span className="text-[11px] text-slate-500">
          Saúde do serviço. Não comprova reconhecimento facial ativo.
        </span>
        {telemetriaCamera && (
          <span
            data-camera-telemetry="dev"
            className={
              "mt-1 text-[11px] font-semibold " +
              (telemetriaCamera.status === "FRAMES_RECENT"
                ? "text-emerald-700"
                : "text-slate-600")
            }
          >
            {telemetriaCamera.status === "FRAMES_RECENT"
              ? `Câmera recebendo frames · ${telemetriaCamera.cameras[0]?.lastFrameCount ?? 0} frames`
              : telemetriaCamera.cameras[0]?.reconnectScheduled
                ? "Câmera em reconexão"
                : telemetriaCamera.status === "SESSION_NO_RECENT_FRAMES"
                  ? "Câmera sem frames recentes"
                  : telemetriaCamera.status === "NO_ACTIVE_SESSION"
                    ? "Câmera com sessão inativa"
                    : telemetriaCamera.status === "NO_CAMERA_CONFIGURED"
                      ? "Câmera não configurada"
                      : "Telemetria indisponível"}
          </span>
        )}
        <span
          data-face-presence-real="dev"
          className="mt-1 text-[11px] font-semibold text-slate-700"
        >
          {facePresence?.status === "FACE_DETECTED"
            ? `YuNet real · ${facePresence.faceCount} rosto(s) · ${Math.round(facePresence.maxConfidence * 1000) / 10}% de confiança`
            : facePresence?.status === "NO_FACE"
              ? "YuNet real · nenhum rosto detectado"
              : facePresence?.status === "INITIALIZING"
                ? "YuNet real · inicializando IA"
                : facePresence?.status === "WAITING_FOR_FRAMES"
                  ? "YuNet real · aguardando frames"
                  : "YuNet real · IA indisponível ou sem resultado recente"}
        </span>
        <span
          data-ppe-detection-real="dev"
          className="mt-1 text-[11px] font-semibold text-amber-800"
        >
          {ppeDetection?.status === "PPE_DETECTED"
            ? (
                `EPI visual real · pessoa(s) ${ppeDetection.personCount} · ` +
                `capacete ${ppeDetection.counts?.hardhat ?? 0}/${ppeDetection.counts?.noHardhat ?? 0} · ` +
                `colete ${ppeDetection.counts?.vest ?? 0}/${ppeDetection.counts?.noVest ?? 0}`
              )
            : ppeDetection?.status === "NO_PERSON"
              ? "EPI visual real · nenhuma pessoa detectada"
              : ppeDetection?.status === "INITIALIZING"
                ? "EPI visual real · inicializando modelo"
                : ppeDetection?.status === "WAITING_FOR_FRAMES"
                  ? "EPI visual real · aguardando frames"
                  : ppeDetection?.status === "ERROR"
                    ? "EPI visual real · erro de inferência"
                    : "EPI visual real · indisponível ou sem resultado recente"}
        </span>

        {faceVerification && (
          <span data-sface-verification="dev" className="mt-1 text-[11px] font-semibold text-indigo-800">
            {faceVerification.status === 'COMPARISON_COMPLETE'
              ? 'SFace real · TESTE-01 · duas capturas separadas comparadas · identidade não verificada'
              : faceVerification.status === 'REFERENCE_READY'
                ? 'SFace real · TESTE-01 em memória · saia do enquadramento por 5 s'
                : faceVerification.status === 'WAITING_FOR_RETURN'
                    ? 'SFace real · TESTE-01 · retorne ao enquadramento'
                    : faceVerification.status === 'WAITING_FOR_FACE'
                  ? 'SFace real · aguardando rosto único'
                  : faceVerification.status === 'INITIALIZING'
                    ? 'SFace real · carregando modelos'
                    : faceVerification.status === 'EXPIRED'
                      ? 'SFace real · sessão expirada'
                      : faceVerification.status === 'ERROR'
                        ? 'SFace real · falha técnica · conferência manual'
                        : 'SFace real · indisponível'}
            {' · DEV, sem liberação de acesso'}
          </span>
        )}
      </div>

      <span
        className={
          "inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-bold " +
          exibicao.classes
        }
      >
        {exibicao.label}
      </span>
      </div>

      <ConfigTesteIaPanel
        cameraOperacao={
          cameraOperacao
        }
        estadoGateway={
          estadoGateway
        }
        telemetriaCamera={
          telemetriaCamera
        }
        resumoDocumental={
          resumoDocumental
        }
        ppeVisual={
          ppeDetection
        }
        testeAtivo={
          testeAtivo
        }
        onIniciarTeste={
          onIniciarTeste
        }
      />
    </>
  );
}

function CameraIaCadastroDevSelector({
  usuario = null,
  ppeVisual = null,
  onResumoDocumentalChange,
}) {
  const [empresas, setEmpresas] = useState([]);
  const [empresaId, setEmpresaId] = useState("");
  const [colaboradores, setColaboradores] = useState([]);
  const [colaboradorId, setColaboradorId] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [consultado, setConsultado] = useState(false);
  const [vinculoConferido, setVinculoConferido] = useState(null);
  const revisaoSelecao = useRef(0);
  const [solicitacaoDev, setSolicitacaoDev] = useState(null);
  const [agora, setAgora] = useState(() => Date.now());
  const [mensagemStatusDev, setMensagemStatusDev] = useState("");

  const escolhido = colaboradores.find(
    (item) => item.id === colaboradorId
  );

  async function exigirSessao() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user?.id) {
      throw new Error("AUTH_REQUIRED");
    }
  }

  function invalidarConferencia() {
    revisaoSelecao.current += 1;
    setVinculoConferido(null);
    setSolicitacaoDev(null);
    setMensagemStatusDev("");

    if (
      typeof onResumoDocumentalChange ===
      "function"
    ) {
      onResumoDocumentalChange(null);
    }
  }

  async function carregarEmpresasAutorizadas() {
    invalidarConferencia();
    setOcupado(true);
    setErro("");
    setEmpresas([]);
    setEmpresaId("");
    setColaboradores([]);
    setColaboradorId("");
    setConsultado(false);

    try {
      await exigirSessao();

      const { data, error } = await supabase
        .from("empresas")
        .select("id,nome")
        .order("nome", { ascending: true })
        .limit(100);

      if (error || !Array.isArray(data)) {
        throw new Error("COMPANIES_UNAVAILABLE");
      }

      setEmpresas(
        data.filter(
          (item) =>
            typeof item?.id === "string" &&
            typeof item?.nome === "string"
        )
      );

      setConsultado(true);
    } catch {
      setErro(
        "Consulta indisponível ou não autorizada para este usuário."
      );
    } finally {
      setOcupado(false);
    }
  }

  async function escolherEmpresa(id) {
    invalidarConferencia();
    setEmpresaId(id);
    setColaboradorId("");
    setColaboradores([]);
    setErro("");

    if (
      !id ||
      !empresas.some((item) => item.id === id)
    ) {
      return;
    }

    setOcupado(true);

    try {
      await exigirSessao();

      const { data, error } = await supabase
        .from("colaboradores")
        .select("id,nome,empresa_id,status")
        .eq("empresa_id", id)
        .order("nome", { ascending: true })
        .limit(100);

      if (error || !Array.isArray(data)) {
        throw new Error("COLLABORATORS_UNAVAILABLE");
      }

      setColaboradores(
        data.filter(
          (item) =>
            typeof item?.id === "string" &&
            typeof item?.nome === "string" &&
            item?.empresa_id === id
        )
      );
    } catch {
      setErro(
        "Colaboradores indisponíveis ou sem permissão de consulta."
      );
    } finally {
      setOcupado(false);
    }
  }

  async function conferirVinculoCadastral() {
    const empresaAtual = empresaId;
    const colaboradorAtual = colaboradorId;
    const revisao = ++revisaoSelecao.current;

    setVinculoConferido(null);
    setSolicitacaoDev(null);
    setErro("");
    setOcupado(true);

    if (
      typeof onResumoDocumentalChange ===
      "function"
    ) {
      onResumoDocumentalChange(null);
    }

    try {
      const empresaValida = empresas.some(
        (item) => item.id === empresaAtual
      );

      const colaboradorValido = colaboradores.some(
        (item) =>
          item.id === colaboradorAtual &&
          item.empresa_id === empresaAtual
      );

      if (!empresaValida || !colaboradorValido) {
        throw new Error("INVALID_SELECTION");
      }

      await exigirSessao();

      // Conferencia somente leitura, sujeita a RLS.
      // Nao envia dados ao Vision Gateway.
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id,nome,empresa_id,status")
        .eq("id", colaboradorAtual)
        .eq("empresa_id", empresaAtual)
        .maybeSingle();

      if (
        error ||
        !data ||
        data.id !== colaboradorAtual ||
        data.empresa_id !== empresaAtual ||
        typeof data.nome !== "string"
      ) {
        throw new Error("CADASTRAL_LINK_UNAVAILABLE");
      }

      if (revisao !== revisaoSelecao.current) return;

      const resumoDocumental =
        await carregarResumoDocumentalCameraIa({
          supabase,
          empresaId:
            empresaAtual,
          colaboradorId:
            colaboradorAtual,
        });

      if (
        revisao !==
        revisaoSelecao.current
      ) {
        return;
      }

      setVinculoConferido({
        empresaId: empresaAtual,
        colaboradorId: colaboradorAtual,
        nome: data.nome,
      });

      if (
        typeof onResumoDocumentalChange ===
        "function"
      ) {
        onResumoDocumentalChange(
          resumoDocumental
        );
      }

      try {
        const snapshot =
          montarSnapshotAuditoriaCameraIa({
            resumoDocumental,
            ppeVisual,
          });

        const auditoriaRegistrada =
          await registrarAuditoriaSistemaService({
            supabase,
            usuario,
            acao:
              "CAMERA_IA_CONFERENCIA_REGISTRADA",
            tabela:
              "colaboradores",
            descricao:
              (
                `Conferência operacional da Camera IA registrada para ` +
                `${resumoDocumental.colaborador.nome}. ` +
                `Decisão: CONFERÊNCIA MANUAL.`
              ),
            registroId:
              resumoDocumental
                .colaborador
                .id,
            dados:
              snapshot,
          });

        if (
          !auditoriaRegistrada
        ) {
          console.warn(
            "A conferência foi concluída, mas o evento de auditoria da Camera IA não foi persistido."
          );
        }
      } catch (auditError) {
        console.warn(
          "Falha não bloqueante ao registrar auditoria da Camera IA:",
          auditError
        );
      }
    } catch {
      if (revisao === revisaoSelecao.current) {
        setVinculoConferido(null);

        if (
          typeof onResumoDocumentalChange ===
          "function"
        ) {
          onResumoDocumentalChange(null);
        }

        setErro(
          "Não foi possível conferir o vínculo cadastral ou a documentação nesta sessão."
        );
      }
    } finally {
      if (revisao === revisaoSelecao.current) {
        setOcupado(false);
      }
    }
  }
  useEffect(() => {
    if (!solicitacaoDev) return undefined;

    const timer = setInterval(() => {
      const instante = Date.now();
      setAgora(instante);

      if (instante >= solicitacaoDev.expiresAt) {
        setSolicitacaoDev(null);
        setMensagemStatusDev(
          "Prazo encerrado. Nenhuma verificação facial executada."
        );
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [solicitacaoDev]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_OUT" || evento === "USER_DELETED") {
        revisaoSelecao.current += 1;
        setVinculoConferido(null);
        setSolicitacaoDev(null);
      }
    });

    return () => data?.subscription?.unsubscribe();
  }, []);

  async function prepararSolicitacaoDev() {
    const empresaAtual = empresaId;
    const colaboradorAtual = colaboradorId;
    const versao = ++revisaoSelecao.current;

    setSolicitacaoDev(null);
    setMensagemStatusDev("");
    setErro("");
    setOcupado(true);

    try {
      if (
        !vinculoConferido ||
        vinculoConferido.empresaId !== empresaAtual ||
        vinculoConferido.colaboradorId !== colaboradorAtual
      ) {
        throw new Error("VINCULO_NAO_CONFERIDO");
      }

      const { data: auth, error: authError } =
        await supabase.auth.getUser();

      if (authError || !auth?.user?.id) {
        throw new Error("AUTH_REQUIRED");
      }

      const { data: registro, error: registroError } =
        await supabase
          .from("colaboradores")
          .select("id,empresa_id")
          .eq("id", colaboradorAtual)
          .eq("empresa_id", empresaAtual)
          .maybeSingle();

      if (
        registroError ||
        registro?.id !== colaboradorAtual ||
        registro?.empresa_id !== empresaAtual
      ) {
        throw new Error("VINCULO_INDISPONIVEL");
      }

      if (versao !== revisaoSelecao.current) return;

      const { data: sessao, error: erroSessao } =
        await supabase.auth.getSession();

      const token = sessao?.session?.access_token;

      if (
        erroSessao ||
        !token ||
        sessao.session.user?.id !== auth.user.id
      ) {
        throw new Error("AUTH_SESSION_UNAVAILABLE");
      }

      const resposta = await fetch(
        "/__safescan-dev/identity-request",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            empresaId: empresaAtual,
            colaboradorId: colaboradorAtual,
          }),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (resposta.status !== 201) {
        throw new Error("BACKEND_REQUEST_DENIED");
      }

      const recibo = await resposta.json();

      if (
        recibo?.verification !== "NOT_PERFORMED" ||
        recibo?.expiresInSeconds !== 60
      ) {
        throw new Error("BACKEND_RECEIPT_INVALID");
      }

      const identificador = recibo.requestId;

      if (versao !== revisaoSelecao.current) return;

      if (!identificador) {
        throw new Error("REQUEST_ID_UNAVAILABLE");
      }

      const instante = Date.now();
      setAgora(instante);

      setSolicitacaoDev({
        requestId: identificador,
        empresaId: empresaAtual,
        colaboradorId: colaboradorAtual,
        userId: auth.user.id,
        expiresAt: instante + 60000,
      });
    } catch {
      if (versao === revisaoSelecao.current) {
        setErro(
          "Não foi possível preparar a solicitação nesta sessão."
        );
      }
    } finally {
      if (versao === revisaoSelecao.current) {
        setOcupado(false);
      }
    }
  }
  async function administrarSolicitacaoDev(acao) {
    const atual = solicitacaoDev;
    const revisao = revisaoSelecao.current;

    if (
      !atual ||
      ocupado ||
      Date.now() >= atual.expiresAt ||
      (acao !== "GET" && acao !== "DELETE" && acao !== "VERIFY")
    ) {
      return;
    }

    setOcupado(true);
    setErro("");

    try {
      const { data, error } = await supabase.auth.getSession();
      const sessao = data?.session;

      if (
        error ||
        !sessao?.access_token ||
        sessao.user?.id !== atual.userId
      ) {
        throw new Error("SESSION_UNAVAILABLE");
      }

      const url =
        (acao === "VERIFY"
          ? "/__safescan-dev/identity-request/verify?requestId="
          : "/__safescan-dev/identity-request/status?requestId=") +
        encodeURIComponent(atual.requestId);

      const response = await fetch(url, {
        method: acao === "VERIFY" ? "POST" : acao,
        credentials: "same-origin",
        headers: {
          Authorization: `Bearer ${sessao.access_token}`,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (acao === "VERIFY") {
        if (response.status !== 409) {
          throw new Error("BIOMETRIC_GUARD_INVALID");
        }

        const bloqueio = await response.json();

        if (
          bloqueio?.code !== "BIOMETRIC_EXECUTION_DISABLED" ||
          bloqueio?.verification !== "NOT_PERFORMED" ||
          bloqueio?.accessRelease !== "DENIED" ||
          !Array.isArray(bloqueio?.blockers) ||
          bloqueio.blockers.length !== 4
        ) {
          throw new Error("BIOMETRIC_GUARD_INVALID");
        }

        if (revisao !== revisaoSelecao.current) return;

        setMensagemStatusDev(
          "O backend DEV bloqueou a verificação facial. " +
          "Autorização, referência, PAD e critério de decisão " +
          "ainda não estão homologados. Nenhuma biometria executada."
        );
        return;
      }

      if (!response.ok) {
        throw new Error("BACKEND_STATUS_UNAVAILABLE");
      }

      const recibo = await response.json();

      if (revisao !== revisaoSelecao.current) return;

      if (acao === "DELETE") {
        if (
          recibo?.cancelled !== true ||
          recibo?.verification !== "NOT_PERFORMED"
        ) {
          throw new Error("INVALID_CANCEL_RECEIPT");
        }

        setSolicitacaoDev(null);
        setMensagemStatusDev(
          "Cancelamento confirmado pelo backend DEV."
        );
      } else {
        if (
          recibo?.requestId !== atual.requestId ||
          recibo?.status !== "PENDING_NO_BIOMETRIC_REFERENCE" ||
          recibo?.verification !== "NOT_PERFORMED" ||
          !Number.isInteger(recibo?.expiresInSeconds) ||
          recibo.expiresInSeconds < 1 ||
          recibo.expiresInSeconds > 60
        ) {
          throw new Error("INVALID_STATUS_RECEIPT");
        }

        if (Date.now() >= atual.expiresAt) {
          setSolicitacaoDev(null);
          setMensagemStatusDev("Prazo encerrado.");
        } else {
          setMensagemStatusDev(
            "Backend DEV confirmou a solicitação pendente. " +
            "Identidade facial não verificada."
          );
        }
      }
    } catch {
      if (revisao === revisaoSelecao.current) {
        setMensagemStatusDev("");
        setErro(
          "O backend não confirmou a consulta ou o cancelamento. " +
          "A solicitação permanece sujeita ao prazo de 60 segundos."
        );
      }
    } finally {
      if (revisao === revisaoSelecao.current) {
        setOcupado(false);
      }
    }
  }
  return (
    <section
      aria-label="Vínculo cadastral experimental"
      className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-3"
    >
      <p className="text-xs font-black text-slate-900">
        DEMO-01D2 · Seleção cadastral (DEV)
      </p>

      <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-600">
        Consulta autenticada e somente leitura. A pessoa escolhida é
        uma identidade alegada, não identificada pela câmera.
        Sem cadastro biométrico ou liberação de acesso.
      </p>

      <button
        type="button"
        disabled={ocupado}
        onClick={carregarEmpresasAutorizadas}
        className="mt-3 rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-bold text-indigo-800 disabled:opacity-50"
      >
        {ocupado
          ? "Consultando..."
          : "Consultar empresas autorizadas"}
      </button>

      {consultado && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-700">
            Empresa
            <select
              value={empresaId}
              disabled={ocupado}
              onChange={(event) => {
                void escolherEmpresa(event.target.value);
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
            >
              <option value="">
                Selecione uma empresa
              </option>

              {empresas.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-bold text-slate-700">
            Colaborador
            <select
              value={colaboradorId}
              disabled={ocupado || !empresaId}
              onChange={(event) => {
                invalidarConferencia();
                setColaboradorId(event.target.value);
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"
            >
              <option value="">
                Selecione um colaborador
              </option>

              {colaboradores.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {escolhido && (
        <p
          role="status"
          className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs font-bold text-amber-900"
        >
          Identidade alegada: {escolhido.nome}.
          Cadastro selecionado para demonstração;
          nenhuma correspondência SFace com esse colaborador foi realizada.
        </p>
      )}

      {escolhido && (
        <button
          type="button"
          disabled={ocupado}
          onClick={() => {
            void conferirVinculoCadastral();
          }}
          className="mt-3 rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-bold text-indigo-800 disabled:opacity-50"
        >
          {ocupado
            ? "Conferindo cadastro..."
            : "Conferir vínculo cadastral"}
        </button>
      )}

      {vinculoConferido &&
        vinculoConferido.empresaId === empresaId &&
        vinculoConferido.colaboradorId === colaboradorId && (
          <p
            role="status"
            className="mt-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs font-semibold text-sky-900"
          >
            Cadastro encontrado: {vinculoConferido.nome}.
            O registro pertence à empresa selecionada e está
            acessível nesta sessão autenticada.
            Isso não confirma que a pessoa diante da câmera
            é esse colaborador.
            Verificação biométrica vinculada: pendente.
          </p>
        )}

      {vinculoConferido &&
        vinculoConferido.empresaId === empresaId &&
        vinculoConferido.colaboradorId === colaboradorId && (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => {
              void prepararSolicitacaoDev();
            }}
            className="mt-3 rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-bold text-indigo-800 disabled:opacity-50"
          >
            {ocupado
              ? "Preparando..."
              : "Preparar solicitação 1:1 (DEV)"}
          </button>
        )}

      {solicitacaoDev &&
        solicitacaoDev.empresaId === empresaId &&
        solicitacaoDev.colaboradorId === colaboradorId &&
        agora < solicitacaoDev.expiresAt && (
          <div
            role="status"
            className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900"
          >
            <p className="font-bold">
              Pré-solicitação autenticada no backend DEV · expira em{" "}
              {Math.ceil((solicitacaoDev.expiresAt - agora) / 1000)} s
            </p>
            <p className="mt-1">
              Cadastro conferido nesta sessão. Identidade facial: inconclusiva.
            </p>
            <p>
              Solicitação registrada no backend DEV. Nenhuma imagem ou embedding enviado. Verificação facial não executada.
            </p>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => {
                void administrarSolicitacaoDev("GET");
              }}
              className="mr-2 mt-2 rounded-lg border border-indigo-300 bg-white px-2 py-1 font-semibold text-indigo-800 disabled:opacity-50"
            >
              Consultar status no backend
            </button>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => {
                void administrarSolicitacaoDev("VERIFY");
              }}
              className="mr-2 mt-2 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 font-semibold text-amber-900 disabled:opacity-50"
            >
              Conferir bloqueio biométrico
            </button>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => {
                void administrarSolicitacaoDev("DELETE");
              }}
              className="mt-2 rounded-lg border border-slate-300 bg-white px-2 py-1 font-semibold"
            >
              Cancelar solicitação
            </button>
          </div>
        )}

      {mensagemStatusDev && (
        <p
          role="status"
          className="mt-2 rounded-lg border border-sky-200 bg-sky-50 p-2 text-xs font-semibold text-sky-900"
        >
          {mensagemStatusDev}
        </p>
      )}

      {erro && (
        <p
          role="alert"
          className="mt-2 text-xs font-bold text-rose-700"
        >
          {erro}
        </p>
      )}

      <p className="mt-2 text-[10px] font-semibold text-slate-500">
        Sujeito às permissões RLS existentes.
        Sem CPF, foto ou embeddings.
        Após a conferência cadastral, os documentos usam leitura real.
        O EPI visual utiliza leitura real independente da identidade alegada.
        Biometria facial e decisão automática permanecem NÃO HOMOLOGADAS.
      </p>
    </section>
  );
}
function DecisaoOperadorCameraIa({
    usuario = null,
    resumoDocumental = null,
    ppeVisual = null,
}) {
    const [resultado, setResultado] =
        useState("");

    const [
        justificativa,
        setJustificativa,
    ] = useState("");

    const [registrando, setRegistrando] =
        useState(false);

    const [feedback, setFeedback] =
        useState(null);

    const [
        ultimoRegistro,
        setUltimoRegistro,
    ] = useState(null);

    const colaborador =
        resumoDocumental?.colaborador ||
        null;

    if (!colaborador?.id) {
        return null;
    }

    const opcoes = [
        {
            valor:
                "AUTORIZAR_ACESSO",
            rotulo:
                "Autorizar acesso",
            classe:
                "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
            classeAtiva:
                "border-emerald-600 bg-emerald-600 text-white",
        },
        {
            valor:
                "NEGAR_ACESSO",
            rotulo:
                "Negar acesso",
            classe:
                "border-red-300 bg-red-50 text-red-800 hover:bg-red-100",
            classeAtiva:
                "border-red-600 bg-red-600 text-white",
        },
        {
            valor:
                "MANTER_EM_CONFERENCIA",
            rotulo:
                "Manter em conferência",
            classe:
                "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100",
            classeAtiva:
                "border-amber-500 bg-amber-500 text-white",
        },
    ];

    async function registrarDecisao() {
        const justificativaFinal =
            String(
                justificativa ||
                ""
            ).trim();

        if (!resultado) {
            setFeedback({
                tipo:
                    "erro",
                mensagem:
                    "Selecione a decisão do operador antes de registrar.",
            });

            return;
        }

        if (!justificativaFinal) {
            setFeedback({
                tipo:
                    "erro",
                mensagem:
                    "Informe a observação ou justificativa da decisão.",
            });

            return;
        }

        if (!usuario?.email) {
            setFeedback({
                tipo:
                    "erro",
                mensagem:
                    "Não foi possível identificar o operador autenticado para registrar a decisão.",
            });

            return;
        }

        const opcaoSelecionada =
            opcoes.find(
                (opcao) =>
                    opcao.valor ===
                    resultado
            );

        const rotuloResultado =
            opcaoSelecionada?.rotulo ||
            resultado;

        setRegistrando(true);
        setFeedback(null);

        try {
            const timestamp =
                new Date().toISOString();

            const snapshot =
                montarSnapshotAuditoriaCameraIa({
                    resumoDocumental,
                    ppeVisual,
                });

            const auditoriaRegistrada =
                await registrarAuditoriaSistemaService({
                    supabase,
                    usuario,
                    acao:
                        "CAMERA_IA_DECISAO_HUMANA_REGISTRADA",
                    tabela:
                        "colaboradores",
                    descricao:
                        (
                            `Decisão humana administrativa registrada para ` +
                            `${colaborador.nome || "colaborador"}. ` +
                            `Resultado: ${rotuloResultado}.`
                        ),
                    registroId:
                        colaborador.id,
                    dados: {
                        ...snapshot,
                        decisaoHumana: {
                            resultado,
                            justificativa:
                                justificativaFinal,
                            timestamp,
                            origem:
                                "OPERADOR",
                            acionamentoFisico:
                                false,
                            decisaoAutomatica:
                                false,
                        },
                    },
                });

            if (!auditoriaRegistrada) {
                setFeedback({
                    tipo:
                        "erro",
                    mensagem:
                        "A decisão não foi considerada registrada porque a auditoria não pôde ser persistida.",
                });

                return;
            }

            setUltimoRegistro({
                resultado:
                    rotuloResultado,
                timestamp,
            });

            setResultado("");
            setJustificativa("");

            setFeedback({
                tipo:
                    "sucesso",
                mensagem:
                    `Decisão "${rotuloResultado}" registrada administrativamente com rastreabilidade.`,
            });
        } catch (error) {
            console.warn(
                "Falha não bloqueante ao registrar decisão humana da Camera IA:",
                error
            );

            setFeedback({
                tipo:
                    "erro",
                mensagem:
                    "Não foi possível registrar a decisão administrativa nesta sessão.",
            });
        } finally {
            setRegistrando(false);
        }
    }

    return (
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                        Registro administrativo
                    </p>

                    <h2 className="mt-1 text-base font-black text-slate-900">
                        Decisão do operador
                    </h2>

                    <p className="mt-1 max-w-3xl text-xs font-semibold leading-5 text-slate-600">
                        Esta decisão é humana e independente da análise automática exibida no resumo operacional.
                        O registro não aciona catraca, porta, relé ou qualquer dispositivo físico.
                    </p>
                </div>

                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600">
                    Sem acionamento físico
                </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-black text-slate-800">
                    {colaborador.nome || "Colaborador"}
                </p>

                <p className="mt-1 text-[11px] font-semibold text-slate-500">
                    {[
                        colaborador.empresa,
                        colaborador.funcao,
                        colaborador.codigo,
                    ]
                        .filter(Boolean)
                        .join(" · ")}
                </p>
            </div>

            <div className="mt-4">
                <p className="text-xs font-black text-slate-800">
                    Resultado da decisão
                </p>

                <div className="mt-2 grid gap-2 md:grid-cols-3">
                    {opcoes.map(
                        (opcao) => {
                            const ativo =
                                resultado ===
                                opcao.valor;

                            return (
                                <button
                                    key={
                                        opcao.valor
                                    }
                                    type="button"
                                    aria-pressed={
                                        ativo
                                    }
                                    disabled={
                                        registrando
                                    }
                                    onClick={() => {
                                        setResultado(
                                            opcao.valor
                                        );
                                        setFeedback(
                                            null
                                        );
                                    }}
                                    className={
                                        `rounded-xl border px-4 py-3 text-xs font-black transition ${
                                            ativo
                                                ? opcao.classeAtiva
                                                : opcao.classe
                                        } disabled:cursor-not-allowed disabled:opacity-60`
                                    }
                                >
                                    {
                                        opcao.rotulo
                                    }
                                </button>
                            );
                        }
                    )}
                </div>
            </div>

            <div className="mt-4">
                <label className="block text-xs font-black text-slate-800">
                    Observação / justificativa
                </label>

                <textarea
                    value={
                        justificativa
                    }
                    disabled={
                        registrando
                    }
                    rows={3}
                    placeholder="Descreva o motivo da decisão registrada pelo operador."
                    onChange={(event) => {
                        setJustificativa(
                            event.target.value
                        );
                        setFeedback(
                            null
                        );
                    }}
                    className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
            </div>

            {feedback ? (
                <div
                    role="status"
                    className={
                        `mt-3 rounded-xl border px-3 py-2 text-xs font-bold ${
                            feedback.tipo ===
                            "sucesso"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-red-200 bg-red-50 text-red-800"
                        }`
                    }
                >
                    {
                        feedback.mensagem
                    }
                </div>
            ) : null}

            {ultimoRegistro ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                    Último registro desta sessão:{" "}
                    <strong className="text-slate-900">
                        {
                            ultimoRegistro.resultado
                        }
                    </strong>
                    {" · "}
                    {new Date(
                        ultimoRegistro.timestamp
                    ).toLocaleString(
                        "pt-BR"
                    )}
                </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-2xl text-[11px] font-semibold leading-5 text-slate-500">
                    O registro somente será confirmado após persistência da auditoria.
                    Nenhuma ação física ou decisão automática é executada.
                </p>

                <button
                    type="button"
                    disabled={
                        registrando ||
                        !resultado ||
                        !String(
                            justificativa ||
                            ""
                        ).trim()
                    }
                    onClick={
                        registrarDecisao
                    }
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {registrando
                        ? "Registrando..."
                        : "Registrar decisão"}
                </button>
            </div>
        </section>
    );
}

export function CameraIaPreviewPage({
    usuario = null,
}) {
    const [permissaoSimulada, setPermissaoSimulada] = useState("revogada");
    const [
        resumoDocumentalReal,
        setResumoDocumentalReal,
    ] = useState(null);

    const [
        ppeVisualReal,
        setPpeVisualReal,
    ] = useState(null);

    const [
        cameraOperacao,
        setCameraOperacao,
    ] = useState(null);

    const [
        testeIaExecucao,
        setTesteIaExecucao,
    ] = useState(0);

    const [
        cenarioAtual,
        setCenarioAtual,
    ] = useState(
        "conferencia"
    );

    const cenario =
        CENARIOS[
            cenarioAtual
        ];


    return (
        <section className="min-h-full bg-[#F4F6F9] p-3 sm:p-4 lg:p-5">
            <div className="mx-auto min-w-0 max-w-[1680px]">
                <header
                    className="relative mb-4 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 p-5 text-white shadow-sm"
                    style={{
                        backgroundImage:
                            "linear-gradient(90deg, rgba(2,6,23,.93), rgba(15,38,48,.72), rgba(15,23,42,.50)), url("
                            + heroSst
                            + ")",
                        backgroundPosition:
                            "center",
                        backgroundSize:
                            "cover",
                    }}
                >
                    <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex items-start gap-3">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">
                                <Camera className="h-6 w-6" />
                            </span>

                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.15em] text-emerald-300">
                                    SafeScan Vision
                                </p>

                                <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                                    Controle de Acesso IA
                                </h1>

                                <p className="mt-1 max-w-3xl text-sm font-semibold text-slate-300">
                                    Prévia operacional para identificação,
                                    documentos SST, EPIs e decisão assistida.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 backdrop-blur-sm">
                                <span className="h-3 w-3 rounded-full bg-emerald-400" />

                                <div>
                                    <p className="text-sm font-black">
                                        Portaria 01
                                    </p>

                                    <p className="text-[11px] font-semibold text-slate-300">
                                        Entrada principal
                                    </p>
                                </div>

                                <span className="ml-auto rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em]">
                                    Online
                                </span>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-xs font-black text-slate-200 backdrop-blur-sm">
                                Operacional · leitura assistida
                            </div>
                        </div>
                    </div>
                </header>

                <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
                    <main className="min-w-0 space-y-4">
                        <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.75fr)]">
                            <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                                <FeedCameraLocal
                                    key={
                                        `camera-teste-${testeIaExecucao}`
                                    }
                                    iniciarAutomaticamente={
                                        testeIaExecucao > 0
                                    }
                                    onCameraStateChange={
                                        setCameraOperacao
                                    }
                                />

                                {import.meta.env.DEV ? (
                                    <>
                                        <GatewayHealthIndicator
                                            onPpeDetectionChange={
                                                setPpeVisualReal
                                            }
                                            cameraOperacao={
                                                cameraOperacao
                                            }
                                            resumoDocumental={
                                                resumoDocumentalReal
                                            }
                                            testeAtivo={
                                                testeIaExecucao > 0
                                            }
                                            onIniciarTeste={
                                                () =>
                                                    setTesteIaExecucao(
                                                        (valor) =>
                                                            valor + 1
                                                    )
                                            }
                                        />
                                    </>
                                ) : null}
                            </article>

                            <ResumoAcessoDocumental
                                cenario={cenario}
                                resumoDocumental={
                                    resumoDocumentalReal
                                }
                                ppeVisual={
                                    ppeVisualReal
                                }
                            />
                        </div>
                    </main>

                    <Detalhes
                        cenario={cenario}
                        resumoDocumental={
                            resumoDocumentalReal
                        }
                        ppeVisual={
                            ppeVisualReal
                        }
                    />
                </div>

                <DecisaoOperadorCameraIa
                    key={
                        resumoDocumentalReal
                            ?.colaborador
                            ?.id ||
                        "sem-colaborador"
                    }
                    usuario={
                        usuario
                    }
                    resumoDocumental={
                        resumoDocumentalReal
                    }
                    ppeVisual={
                        ppeVisualReal
                    }
                />
                <details className="mt-4 rounded-2xl border border-indigo-200 bg-white shadow-sm">
                    <summary className="cursor-pointer px-4 py-4 text-sm font-black text-indigo-900 sm:px-5">
                        Laboratório DEV · simulações e homologação visual
                    </summary>

                    <div className="space-y-4 border-t border-indigo-100 bg-indigo-50/30 p-4 sm:p-5">
                        <div className="rounded-2xl border border-indigo-200 bg-white px-4 py-3">
                            <p className="text-xs font-black uppercase tracking-[0.08em] text-indigo-800">
                                Área isolada de desenvolvimento
                            </p>

                            <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                                Os recursos abaixo são exclusivamente demonstrativos ou de homologação visual e não representam decisão operacional, reconhecimento biométrico homologado ou acionamento físico de acesso.
                            </p>
                        </div>

<section
                    aria-label="Permissão demonstrativa"
                    className="mb-4 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 shadow-sm"
                >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-black uppercase tracking-wide text-indigo-800">
                                Demonstração · Dados simulados
                            </p>
                            <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                                Após a conferência cadastral, documentos, ASO, treinamentos e ficha de EPI usam dados reais por leitura. O EPI visual real avalia somente pessoa, capacete e colete quando o monitor está habilitado; óculos, luvas e calçado permanecem NÃO AVALIADOS. Identidade biométrica e decisão automática não estão homologadas.
                            </p>
                        </div>

                        <span
                            role="status"
                            className={
                                "rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide "
                                + (permissaoSimulada === "autorizada"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-rose-100 text-rose-800")
                            }
                        >
                            Permissão demonstrativa: {permissaoSimulada === "autorizada" ? "AUTORIZADA" : "REVOGADA"}
                        </span>
                    </div>

                    <div
                        role="group"
                        aria-label="Controles de permissão simulada"
                        className="mt-3 flex flex-wrap gap-2"
                    >
                        <button
                            type="button"
                            aria-pressed={permissaoSimulada === "autorizada"}
                            onClick={() => setPermissaoSimulada("autorizada")}
                            className={
                                "rounded-xl border px-4 py-2 text-xs font-black transition-colors "
                                + (permissaoSimulada === "autorizada"
                                    ? "border-emerald-500 bg-emerald-600 text-white"
                                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")
                            }
                        >
                            Autorizar (simulação)
                        </button>

                        <button
                            type="button"
                            aria-pressed={permissaoSimulada === "revogada"}
                            onClick={() => setPermissaoSimulada("revogada")}
                            className={
                                "rounded-xl border px-4 py-2 text-xs font-black transition-colors "
                                + (permissaoSimulada === "revogada"
                                    ? "border-rose-500 bg-rose-600 text-white"
                                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")
                            }
                        >
                            Revogar (simulação)
                        </button>
                    </div>

                    <p className="mt-2 text-[11px] font-medium leading-5 text-slate-500">
                        Controle exclusivamente visual. Não altera a câmera, os cenários SST, permissões reais, registros ou dispositivos físicos.
                    </p>
                </section>

                <div className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    {
                        Object.entries(
                            CENARIOS
                        ).map(
                            ([
                                chave,
                                item,
                            ]) => (
                                <button
                                    key={chave}
                                    type="button"
                                    onClick={() =>
                                        setCenarioAtual(
                                            chave
                                        )
                                    }
                                    className={
                                        cenarioAtual === chave
                                            ? "rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white"
                                            : "rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
                                    }
                                >
                                    {item.rotulo}
                                </button>
                            )
                        )
                    }
                </div>

<details className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50/40">
                                            <summary className="cursor-pointer px-4 py-3 text-xs font-black text-indigo-800">
                                                Desenvolvimento · seleção cadastral e biometria DEV
                                            </summary>

                                            <div className="border-t border-indigo-200 p-3">
                                                <CameraIaCadastroDevSelector
                                                    usuario={
                                                        usuario
                                                    }
                                                    ppeVisual={
                                                        ppeVisualReal
                                                    }
                                                    onResumoDocumentalChange={
                                                        setResumoDocumentalReal
                                                    }
                                                />
                                            </div>
                                        </details>

                        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="mb-3">
                                <h3 className="text-sm font-black text-slate-900">
                                    Prévia sintética da câmera
                                </h3>

                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                    Recurso exclusivamente visual de laboratório.
                                </p>
                            </div>

                            <FeedSintetico />
                        </section>

<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                            <Metrica
                                titulo="Liberados"
                                valor="128"
                                tipo="liberado"
                            />

                            <Metrica
                                titulo="Bloqueados"
                                valor="7"
                                tipo="bloqueado"
                            />

                            <Metrica
                                titulo="Conferência"
                                valor="4"
                                tipo="conferencia"
                            />

                            <Metrica
                                titulo="Não identificados"
                                valor="2"
                                tipo="neutro"
                            />
                        </div>

                        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
                                <h2 className="text-base font-black text-slate-950">
                                    Últimos eventos
                                </h2>

                                <p className="text-xs font-semibold text-slate-500">
                                    Histórico sintético para homologação visual.
                                </p>
                            </div>

                            <div className="hidden overflow-x-auto lg:block">
                                <table className="w-full min-w-[760px] text-left">
                                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                                        <tr>
                                            <th className="px-5 py-3">
                                                Hora
                                            </th>

                                            <th className="px-4 py-3">
                                                Colaborador
                                            </th>

                                            <th className="px-4 py-3">
                                                Empresa
                                            </th>

                                            <th className="px-4 py-3">
                                                Identidade
                                            </th>

                                            <th className="px-4 py-3">
                                                Docs
                                            </th>

                                            <th className="px-4 py-3">
                                                EPI
                                            </th>

                                            <th className="px-4 py-3">
                                                Resultado
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                                        {
                                            EVENTOS.map(
                                                (evento) => (
                                                    <tr
                                                        key={
                                                            evento.hora
                                                            + evento.nome
                                                        }
                                                        className="hover:bg-slate-50/80"
                                                    >
                                                        <td className="px-5 py-3 font-black text-slate-900">
                                                            {evento.hora}
                                                        </td>

                                                        <td className="px-4 py-3">
                                                            {evento.nome}
                                                        </td>

                                                        <td className="px-4 py-3 text-slate-500">
                                                            {evento.empresa}
                                                        </td>

                                                        <td className="px-4 py-3">
                                                            {
                                                                evento.nome === "Não identificado"
                                                                    ? "Não identificada"
                                                                    : "Confirmada"
                                                            }
                                                        </td>

                                                        <td className="px-4 py-3">
                                                            {evento.docs}
                                                        </td>

                                                        <td className="px-4 py-3">
                                                            {evento.epi}
                                                        </td>

                                                        <td className="px-4 py-3">
                                                            <Badge
                                                                status={evento.tipo}
                                                                texto={evento.resultado}
                                                            />
                                                        </td>
                                                    </tr>
                                                )
                                            )
                                        }
                                    </tbody>
                                </table>
                            </div>

                            <div className="divide-y divide-slate-100 lg:hidden">
                                {
                                    EVENTOS.map(
                                        (evento) => (
                                            <div
                                                key={
                                                    evento.hora
                                                    + evento.nome
                                                    + "mobile"
                                                }
                                                className="p-4"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900">
                                                            {evento.nome}
                                                        </p>

                                                        <p className="mt-0.5 text-xs font-semibold text-slate-500">
                                                            {evento.empresa} · {evento.hora}
                                                        </p>
                                                    </div>

                                                    <Badge
                                                        status={evento.tipo}
                                                        texto={evento.resultado}
                                                    />
                                                </div>

                                                <div className="mt-3 grid grid-cols-1 gap-2 text-xs font-bold text-slate-600 sm:grid-cols-2">
                                                    <div className="rounded-xl bg-slate-50 p-2">
                                                        Docs: {evento.docs}
                                                    </div>

                                                    <div className="rounded-xl bg-slate-50 p-2">
                                                        EPI: {evento.epi}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    )
                                }
                            </div>
                        </article>

<>
                    <CameraIaGuidancePreview />
                    <CameraIaOperationalGuidancePanel enabled={false} />
                </>
                    </div>
                </details>

                <footer className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-3 text-xs font-semibold text-slate-500">
                    CAM-IA-CONFIG-TESTE-01-A · configuração e teste pela interface · documentação e EPI visual em leitura · identidade e decisão automática não homologadas.
                </footer>
            </div>
        </section>
    );
}

export default CameraIaPreviewPage;
