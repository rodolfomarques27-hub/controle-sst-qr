import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import {
    ImagePlus,
    Loader2,
    Trash2,
    Upload,
} from "lucide-react";
import {
    baixarAssinaturaModeloEmailSstService,
    removerAssinaturaModeloEmailSstService,
    salvarAssinaturaModeloEmailSstService,
} from "../../services/modelosEmailSstAssinaturaService";
import { classNames } from "../../utils/sstUtils";

function obterClasseMensagem(tipo = "informacao") {
    if (tipo === "sucesso") {
        return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    }

    if (tipo === "erro") {
        return "bg-red-50 text-red-800 ring-red-200";
    }

    if (tipo === "aviso") {
        return "bg-orange-50 text-orange-800 ring-orange-200";
    }

    return "bg-blue-50 text-blue-800 ring-blue-200";
}

function formatarTamanhoArquivo(tamanhoBytes) {
    const tamanho =
        Number(tamanhoBytes);

    if (
        !Number.isFinite(tamanho) ||
        tamanho < 1
    ) {
        return "";
    }

    return `${(
        tamanho /
        1024
    ).toLocaleString("pt-BR", {
        maximumFractionDigits: 1,
    })} KB`;
}

export function AssinaturaModeloEmailSstConfiguracoes({
    supabase = null,
    tipo = "",
    modelo = null,
    podeAlterar = false,
    mensagemBloqueio =
        "Sem permissão para alterar configurações críticas do sistema.",
    onRegistrarAuditoria = null,
}) {
    const [assinaturaAtual, setAssinaturaAtual] =
        useState(null);

    const [assinaturaUrl, setAssinaturaUrl] =
        useState("");

    const [
        carregandoAssinatura,
        setCarregandoAssinatura,
    ] =
        useState(false);

    const [
        salvandoAssinatura,
        setSalvandoAssinatura,
    ] =
        useState(false);

    const [
        removendoAssinatura,
        setRemovendoAssinatura,
    ] =
        useState(false);

    const [mensagem, setMensagem] =
        useState({
            tipo: "informacao",
            texto:
                "A assinatura em imagem é independente do conteúdo textual do modelo.",
        });

    const componenteAtivoRef =
        useRef(true);

    const tipoAtualRef =
        useRef(tipo);

    const idCarregamentoRef =
        useRef(0);

    const assinaturaUrlRef =
        useRef("");

    const inputArquivoRef =
        useRef(null);

    const substituirAssinaturaLocal =
        useCallback(
            (resultado = null) => {
                const urlAnterior =
                    assinaturaUrlRef.current;

                let proximaUrl =
                    "";

                if (
                    resultado?.blob &&
                    typeof URL !== "undefined" &&
                    typeof URL.createObjectURL ===
                        "function"
                ) {
                    proximaUrl =
                        URL.createObjectURL(
                            resultado.blob
                        );
                }

                assinaturaUrlRef.current =
                    proximaUrl;

                if (
                    urlAnterior &&
                    urlAnterior !== proximaUrl &&
                    typeof URL !== "undefined" &&
                    typeof URL.revokeObjectURL ===
                        "function"
                ) {
                    URL.revokeObjectURL(
                        urlAnterior
                    );
                }

                setAssinaturaAtual(
                    resultado
                        ? {
                            caminho:
                                resultado.caminho,
                            tipoMime:
                                resultado.tipoMime,
                            tamanhoBytes:
                                resultado.tamanhoBytes,
                        }
                        : null
                );

                setAssinaturaUrl(
                    proximaUrl
                );
            },
            []
        );

    const registrarAuditoriaSegura =
        useCallback(
            async (
                acao,
                descricao,
                modeloAuditoria
            ) => {
                if (
                    typeof onRegistrarAuditoria !==
                    "function"
                ) {
                    return false;
                }

                try {
                    return await onRegistrarAuditoria(
                        acao,
                        descricao,
                        modeloAuditoria
                    );
                } catch (error) {
                    console.warn(
                        "Erro ao registrar auditoria da assinatura de e-mail SST:",
                        error?.message ||
                            error
                    );

                    return false;
                }
            },
            [
                onRegistrarAuditoria,
            ]
        );

    const carregarAssinatura =
        useCallback(
            async (
                tipoAlvo,
                {
                    exibirMensagem = true,
                    propagarErro = false,
                } = {}
            ) => {
                const tipoNormalizado =
                    String(
                        tipoAlvo ||
                        ""
                    ).trim();

                const idCarregamento =
                    idCarregamentoRef.current +
                    1;

                idCarregamentoRef.current =
                    idCarregamento;

                if (
                    !tipoNormalizado ||
                    !podeAlterar ||
                    !supabase
                ) {
                    substituirAssinaturaLocal(
                        null
                    );

                    if (
                        exibirMensagem &&
                        componenteAtivoRef.current
                    ) {
                        setMensagem({
                            tipo:
                                podeAlterar
                                    ? "aviso"
                                    : "informacao",
                            texto:
                                podeAlterar
                                    ? "Cliente Supabase ou modelo não disponível para carregar a assinatura."
                                    : mensagemBloqueio,
                        });
                    }

                    setCarregandoAssinatura(
                        false
                    );

                    return null;
                }

                setCarregandoAssinatura(
                    true
                );

                if (exibirMensagem) {
                    setMensagem({
                        tipo: "informacao",
                        texto:
                            "Carregando assinatura privada deste modelo...",
                    });
                }

                try {
                    const resultado =
                        await baixarAssinaturaModeloEmailSstService({
                            supabase,
                            tipo:
                                tipoNormalizado,
                        });

                    const carregamentoAtual =
                        componenteAtivoRef.current &&
                        idCarregamentoRef.current ===
                            idCarregamento &&
                        tipoAtualRef.current ===
                            tipoNormalizado;

                    if (!carregamentoAtual) {
                        return null;
                    }

                    substituirAssinaturaLocal(
                        resultado
                    );

                    if (exibirMensagem) {
                        setMensagem(
                            resultado
                                ? {
                                    tipo:
                                        "sucesso",
                                    texto:
                                        "Assinatura privada carregada para este modelo.",
                                }
                                : {
                                    tipo:
                                        "informacao",
                                    texto:
                                        "Este modelo ainda não possui assinatura em imagem.",
                                }
                        );
                    }

                    return resultado;
                } catch (error) {
                    const carregamentoAtual =
                        componenteAtivoRef.current &&
                        idCarregamentoRef.current ===
                            idCarregamento &&
                        tipoAtualRef.current ===
                            tipoNormalizado;

                    if (
                        carregamentoAtual
                    ) {
                        substituirAssinaturaLocal(
                            null
                        );

                        if (exibirMensagem) {
                            setMensagem({
                                tipo: "erro",
                                texto:
                                    error?.message ||
                                    "Não foi possível carregar a assinatura privada.",
                            });
                        }
                    }

                    if (
                        propagarErro &&
                        carregamentoAtual
                    ) {
                        throw error;
                    }

                    return null;
                } finally {
                    if (
                        componenteAtivoRef.current &&
                        idCarregamentoRef.current ===
                            idCarregamento
                    ) {
                        setCarregandoAssinatura(
                            false
                        );
                    }
                }
            },
            [
                mensagemBloqueio,
                podeAlterar,
                substituirAssinaturaLocal,
                supabase,
            ]
        );

    useEffect(() => {
        componenteAtivoRef.current =
            true;

        tipoAtualRef.current =
            String(
                tipo ||
                ""
            ).trim();

        void carregarAssinatura(
            tipoAtualRef.current
        );
    }, [
        carregarAssinatura,
        tipo,
    ]);

    useEffect(() => {
        return () => {
            componenteAtivoRef.current =
                false;

            idCarregamentoRef.current +=
                1;

            const urlAtual =
                assinaturaUrlRef.current;

            assinaturaUrlRef.current =
                "";

            if (
                urlAtual &&
                typeof URL !== "undefined" &&
                typeof URL.revokeObjectURL ===
                    "function"
            ) {
                URL.revokeObjectURL(
                    urlAtual
                );
            }
        };
    }, []);

    const informarBloqueio =
        () => {
            setMensagem({
                tipo: "aviso",
                texto:
                    mensagemBloqueio,
            });
        };

    const abrirSeletorArquivo =
        () => {
            if (!podeAlterar) {
                informarBloqueio();
                return;
            }

            if (
                carregandoAssinatura ||
                salvandoAssinatura ||
                removendoAssinatura
            ) {
                return;
            }

            inputArquivoRef.current?.click();
        };

    const salvarAssinatura =
        async (evento) => {
            const arquivo =
                evento.target.files?.[0] ||
                null;

            evento.target.value =
                "";

            if (!arquivo) {
                return;
            }

            if (!podeAlterar) {
                informarBloqueio();
                return;
            }

            if (
                !supabase ||
                !tipo
            ) {
                setMensagem({
                    tipo: "erro",
                    texto:
                        "Modelo ou cliente Supabase não disponível para salvar a assinatura.",
                });

                return;
            }

            const tipoOperacao =
                String(tipo).trim();

            const modeloOperacao =
                modelo;

            setSalvandoAssinatura(
                true
            );

            setMensagem({
                tipo: "informacao",
                texto:
                    "Salvando assinatura privada deste modelo...",
            });

            try {
                await salvarAssinaturaModeloEmailSstService({
                    supabase,
                    tipo:
                        tipoOperacao,
                    arquivo,
                });

                const assinaturaCarregada =
                    await carregarAssinatura(
                        tipoOperacao,
                        {
                            exibirMensagem:
                                false,
                            propagarErro:
                                true,
                        }
                    );

                if (
                    !componenteAtivoRef.current
                ) {
                    return;
                }

                if (
                    tipoAtualRef.current !==
                    tipoOperacao
                ) {
                    return;
                }

                if (!assinaturaCarregada) {
                    throw new Error(
                        "A imagem foi enviada, mas não pôde ser confirmada no Storage privado."
                    );
                }

                setMensagem({
                    tipo: "sucesso",
                    texto:
                        "Assinatura em imagem salva com sucesso para este modelo.",
                });

                await registrarAuditoriaSegura(
                    "ASSINATURA_MODELO_EMAIL_SST_ALTERADA",
                    "Assinatura em imagem do modelo de e-mail SST alterada.",
                    modeloOperacao
                );
            } catch (error) {
                if (
                    componenteAtivoRef.current &&
                    tipoAtualRef.current ===
                        tipoOperacao
                ) {
                    setMensagem({
                        tipo: "erro",
                        texto:
                            error?.message ||
                            "Não foi possível salvar a assinatura em imagem.",
                    });
                }
            } finally {
                if (
                    componenteAtivoRef.current
                ) {
                    setSalvandoAssinatura(
                        false
                    );
                }
            }
        };

    const removerAssinatura =
        async () => {
            if (!podeAlterar) {
                informarBloqueio();
                return;
            }

            if (
                !assinaturaAtual ||
                !supabase ||
                !tipo
            ) {
                return;
            }

            const confirmado =
                typeof window ===
                    "undefined" ||
                window.confirm(
                    "Remover a assinatura em imagem deste modelo? O conteúdo textual não será alterado."
                );

            if (!confirmado) {
                setMensagem({
                    tipo: "informacao",
                    texto:
                        "Remoção cancelada. Nenhuma alteração foi realizada.",
                });

                return;
            }

            const tipoOperacao =
                String(tipo).trim();

            const modeloOperacao =
                modelo;

            setRemovendoAssinatura(
                true
            );

            setMensagem({
                tipo: "informacao",
                texto:
                    "Removendo assinatura privada deste modelo...",
            });

            try {
                await removerAssinaturaModeloEmailSstService({
                    supabase,
                    tipo:
                        tipoOperacao,
                });

                if (
                    !componenteAtivoRef.current
                ) {
                    return;
                }

                if (
                    tipoAtualRef.current ===
                    tipoOperacao
                ) {
                    idCarregamentoRef.current +=
                        1;

                    substituirAssinaturaLocal(
                        null
                    );

                    setMensagem({
                        tipo: "sucesso",
                        texto:
                            "Assinatura em imagem removida. O conteúdo textual do modelo foi preservado.",
                    });
                }

                await registrarAuditoriaSegura(
                    "ASSINATURA_MODELO_EMAIL_SST_REMOVIDA",
                    "Assinatura em imagem do modelo de e-mail SST removida.",
                    modeloOperacao
                );
            } catch (error) {
                if (
                    componenteAtivoRef.current &&
                    tipoAtualRef.current ===
                        tipoOperacao
                ) {
                    setMensagem({
                        tipo: "erro",
                        texto:
                            error?.message ||
                            "Não foi possível remover a assinatura em imagem.",
                    });
                }
            } finally {
                if (
                    componenteAtivoRef.current
                ) {
                    setRemovendoAssinatura(
                        false
                    );
                }
            }
        };

    const operacaoEmAndamento =
        carregandoAssinatura ||
        salvandoAssinatura ||
        removendoAssinatura;

    return (
        <section className="rounded-[22px] bg-slate-50 p-4 ring-1 ring-slate-200">
            <input
                ref={inputArquivoRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={salvarAssinatura}
                className="hidden"
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <ImagePlus className="h-4 w-4 text-slate-500" />

                        <h4 className="text-sm font-black text-slate-900">
                            Assinatura em imagem
                        </h4>
                    </div>

                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        Imagem privada aplicada somente aos e-mails deste modelo.
                        Restaurar o texto padrão não altera nem remove esta assinatura.
                    </p>
                </div>

                <span
                    className={classNames(
                        "inline-flex shrink-0 items-center gap-2 self-start rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide ring-1",
                        carregandoAssinatura
                            ? "bg-blue-50 text-blue-700 ring-blue-200"
                            : assinaturaAtual
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : "bg-white text-slate-500 ring-slate-200"
                    )}
                >
                    {carregandoAssinatura
                        ? "Carregando"
                        : assinaturaAtual
                            ? "Configurada"
                            : "Não configurada"}
                </span>
            </div>

            {mensagem.texto && (
                <div
                    className={classNames(
                        "mt-4 rounded-2xl px-3 py-2 text-xs font-semibold leading-relaxed ring-1",
                        obterClasseMensagem(
                            mensagem.tipo
                        )
                    )}
                >
                    {mensagem.texto}
                </div>
            )}

            <div className="mt-4 flex min-h-[150px] items-center justify-center overflow-hidden rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                {carregandoAssinatura ? (
                    <div className="text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-500" />

                        <p className="mt-2 text-xs font-bold text-slate-500">
                            Carregando imagem privada...
                        </p>
                    </div>
                ) : assinaturaUrl ? (
                    <img
                        src={assinaturaUrl}
                        alt={`Assinatura do modelo ${modelo?.nome || tipo}`}
                        className="max-h-[180px] max-w-full object-contain"
                    />
                ) : (
                    <div className="text-center">
                        <ImagePlus className="mx-auto h-7 w-7 text-slate-300" />

                        <p className="mt-2 text-xs font-bold text-slate-500">
                            Nenhuma assinatura cadastrada
                        </p>

                        <p className="mt-1 text-[11px] text-slate-400">
                            Formatos permitidos: PNG ou JPEG, até 2 MB.
                        </p>
                    </div>
                )}
            </div>

            {assinaturaAtual && (
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-slate-500">
                    <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">
                        {assinaturaAtual.tipoMime ===
                        "image/png"
                            ? "PNG"
                            : "JPEG"}
                    </span>

                    <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">
                        {formatarTamanhoArquivo(
                            assinaturaAtual.tamanhoBytes
                        )}
                    </span>

                    <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-slate-200">
                        Armazenamento privado
                    </span>
                </div>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                    type="button"
                    onClick={abrirSeletorArquivo}
                    disabled={
                        !podeAlterar ||
                        operacaoEmAndamento
                    }
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                >
                    {salvandoAssinatura ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Upload className="h-4 w-4" />
                    )}

                    {salvandoAssinatura
                        ? "Salvando..."
                        : assinaturaAtual
                            ? "Substituir imagem"
                            : "Enviar imagem"}
                </button>

                <button
                    type="button"
                    onClick={removerAssinatura}
                    disabled={
                        !podeAlterar ||
                        operacaoEmAndamento ||
                        !assinaturaAtual
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-red-700 ring-1 ring-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:ring-slate-200"
                >
                    {removendoAssinatura ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Trash2 className="h-4 w-4" />
                    )}

                    {removendoAssinatura
                        ? "Removendo..."
                        : "Remover imagem"}
                </button>
            </div>
        </section>
    );
}

export default AssinaturaModeloEmailSstConfiguracoes;
