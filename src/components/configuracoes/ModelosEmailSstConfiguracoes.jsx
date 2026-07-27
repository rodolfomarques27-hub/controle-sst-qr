import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    AlertTriangle,
    Braces,
    CheckCircle2,
    Eye,
    Loader2,
    LockKeyhole,
    Mail,
    RefreshCw,
    RotateCcw,
    Save,
} from "lucide-react";
import { Card } from "../commonComponents";
import {
    DETALHES_VARIAVEIS_MODELO_EMAIL_SST,
    LIMITES_MODELO_EMAIL_SST,
    ORDEM_TIPOS_MODELO_EMAIL_SST,
    VARIAVEIS_MODELO_EMAIL_SST,
    obterMetadadosModeloEmailSst,
} from "../../constants/modelosEmailSstConstants";
import {
    aplicarVariaveisModeloEmailSst,
    criarValoresPrevisualizacaoModeloEmailSst,
    listarModelosEmailSstService,
    restaurarModeloEmailSstService,
    salvarModeloEmailSstService,
} from "../../services/modelosEmailSstService";
import {
    AssinaturaModeloEmailSstConfiguracoes,
} from "./AssinaturaModeloEmailSstConfiguracoes";
import { classNames } from "../../utils/sstUtils";

const FORMULARIO_MODELO_EMAIL_VAZIO = Object.freeze({
    tipo: "",
    assunto: "",
    corpo: "",
    remetenteNome: "",
    ativo: true,
});

function criarFormularioModelo(modelo = null) {
    if (!modelo) {
        return {
            ...FORMULARIO_MODELO_EMAIL_VAZIO,
        };
    }

    return {
        tipo: modelo.tipo || "",
        assunto: modelo.assunto || "",
        corpo: modelo.corpo || "",
        remetenteNome: modelo.remetenteNome || "",
        ativo: modelo.ativo !== false,
    };
}

function modeloFoiAlterado(formulario, modelo) {
    if (!formulario || !modelo) {
        return false;
    }

    return (
        formulario.assunto !== modelo.assunto ||
        formulario.corpo !== modelo.corpo ||
        formulario.remetenteNome !== modelo.remetenteNome ||
        formulario.ativo !== modelo.ativo
    );
}

function formatarDataAtualizacao(valor) {
    if (!valor) {
        return "Ainda não atualizado";
    }

    const data =
        new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return "Data não disponível";
    }

    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(data);
}

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


export function ModelosEmailSstConfiguracoes({
    supabase = null,
    podeAlterar = false,
    mensagemBloqueio =
        "Sem permissão para alterar configurações críticas do sistema.",
    onRegistrarAuditoria = null,
    controleCard = null,
    onRecolherCard = null,
}) {
    const [modelos, setModelos] =
        useState([]);

    const [tipoSelecionado, setTipoSelecionado] =
        useState("");

    const [formulario, setFormulario] =
        useState(() => ({
            ...FORMULARIO_MODELO_EMAIL_VAZIO,
        }));

    const [campoVariavelAtivo, setCampoVariavelAtivo] =
        useState("corpo");

    const [carregando, setCarregando] =
        useState(false);

    const [salvando, setSalvando] =
        useState(false);

    const [restaurando, setRestaurando] =
        useState(false);

    const [mensagemPainel, setMensagemPainel] =
        useState({
            tipo: "informacao",
            texto:
                "Os modelos serão carregados pela persistência privada do Supabase.",
        });

    const componenteAtivoRef =
        useRef(true);

    const tipoSelecionadoRef =
        useRef("");

    const assuntoRef =
        useRef(null);

    const corpoRef =
        useRef(null);

    const valoresPrevisualizacao =
        useMemo(
            () =>
                criarValoresPrevisualizacaoModeloEmailSst(),
            []
        );

    const modeloSelecionado =
        useMemo(
            () =>
                modelos.find(
                    (modelo) =>
                        modelo.tipo === tipoSelecionado
                ) || null,
            [
                modelos,
                tipoSelecionado,
            ]
        );

    const formularioAlterado =
        useMemo(
            () =>
                modeloFoiAlterado(
                    formulario,
                    modeloSelecionado
                ),
            [
                formulario,
                modeloSelecionado,
            ]
        );

    const previsualizacao =
        useMemo(() => {
            try {
                return {
                    assunto:
                        aplicarVariaveisModeloEmailSst(
                            formulario.assunto,
                            valoresPrevisualizacao
                        ),
                    corpo:
                        aplicarVariaveisModeloEmailSst(
                            formulario.corpo,
                            valoresPrevisualizacao
                        ),
                    remetenteNome:
                        formulario.remetenteNome,
                    erro: "",
                };
            } catch (error) {
                return {
                    assunto: formulario.assunto,
                    corpo: formulario.corpo,
                    remetenteNome:
                        formulario.remetenteNome,
                    erro:
                        error?.message ||
                        "Não foi possível montar a pré-visualização.",
                };
            }
        }, [
            formulario.assunto,
            formulario.corpo,
            formulario.remetenteNome,
            valoresPrevisualizacao,
        ]);

    const registrarAuditoriaSegura =
        useCallback(
            async (
                acao,
                descricao,
                modelo
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
                        {
                            modulo: "configuracoes",
                            recurso: "modelos_email_sst",
                            tipoModelo:
                                modelo?.tipo || "",
                            ativo:
                                modelo?.ativo !== false,
                            versao:
                                modelo?.versao || null,
                            conteudoModeloRegistrado:
                                false,
                        },
                        modelo?.tipo || null
                    );
                } catch (error) {
                    console.warn(
                        "Erro ao registrar auditoria do modelo de e-mail SST:",
                        error?.message || error
                    );

                    return false;
                }
            },
            [onRegistrarAuditoria]
        );

    const carregarModelos =
        useCallback(async () => {
            if (!podeAlterar) {
                if (componenteAtivoRef.current) {
                    setModelos([]);

                    tipoSelecionadoRef.current =
                        "";

                    setTipoSelecionado("");

                    setFormulario({
                        ...FORMULARIO_MODELO_EMAIL_VAZIO,
                    });

                    setMensagemPainel({
                        tipo: "aviso",
                        texto: mensagemBloqueio,
                    });
                }

                return;
            }

            if (!supabase) {
                if (componenteAtivoRef.current) {
                    setMensagemPainel({
                        tipo: "aviso",
                        texto:
                            "Cliente Supabase não informado. O componente está isolado e ainda não foi integrado à tela de Configurações.",
                    });
                }

                return;
            }

            setCarregando(true);

            setMensagemPainel({
                tipo: "informacao",
                texto:
                    "Carregando modelos privados de e-mail SST...",
            });

            try {
                const modelosCarregados =
                    await listarModelosEmailSstService({
                        supabase,
                    });

                if (!componenteAtivoRef.current) {
                    return;
                }

                setModelos(modelosCarregados);

                const tipoAtual =
                    tipoSelecionadoRef.current;

                const proximoModelo =
                    modelosCarregados.find(
                        (modelo) =>
                            modelo.tipo === tipoAtual
                    ) ||
                    modelosCarregados[0] ||
                    null;

                const proximoTipo =
                    proximoModelo?.tipo || "";

                tipoSelecionadoRef.current =
                    proximoTipo;

                setTipoSelecionado(
                    proximoTipo
                );

                setFormulario(
                    criarFormularioModelo(
                        proximoModelo
                    )
                );

                if (
                    modelosCarregados.length === 0
                ) {
                    setMensagemPainel({
                        tipo: "aviso",
                        texto:
                            "Nenhum modelo de e-mail SST foi retornado pelo Supabase.",
                    });
                } else {
                    setMensagemPainel({
                        tipo: "sucesso",
                        texto:
                            `${modelosCarregados.length} modelo(s) de e-mail SST carregado(s).`,
                    });
                }
            } catch (error) {
                if (!componenteAtivoRef.current) {
                    return;
                }

                const mensagem =
                    error?.message ||
                    "Não foi possível carregar os modelos de e-mail SST.";

                setMensagemPainel({
                    tipo:
                        mensagem.includes(
                            "ainda não foi aplicada"
                        )
                            ? "aviso"
                            : "erro",
                    texto: mensagem,
                });
            } finally {
                if (componenteAtivoRef.current) {
                    setCarregando(false);
                }
            }
        }, [
            mensagemBloqueio,
            podeAlterar,
            supabase,
        ]);

    useEffect(() => {
        componenteAtivoRef.current = true;

        const temporizadorCarregamento =
            setTimeout(() => {
                void carregarModelos();
            }, 0);

        return () => {
            clearTimeout(
                temporizadorCarregamento
            );

            componenteAtivoRef.current =
                false;
        };
    }, [carregarModelos]);

    const selecionarModelo =
        (tipo) => {
            if (
                salvando ||
                restaurando
            ) {
                return;
            }

            const modelo =
                modelos.find(
                    (item) =>
                        item.tipo === tipo
                );

            if (!modelo) {
                return;
            }

            tipoSelecionadoRef.current =
                tipo;

            setTipoSelecionado(tipo);

            setFormulario(
                criarFormularioModelo(modelo)
            );

            setMensagemPainel({
                tipo: "informacao",
                texto:
                    `Modelo selecionado: ${modelo.nome}.`,
            });
        };

    const atualizarCampo =
        (campo, valor) => {
            setFormulario(
                (atual) => ({
                    ...atual,
                    [campo]: valor,
                })
            );
        };

    const informarBloqueio =
        () => {
            setMensagemPainel({
                tipo: "aviso",
                texto: mensagemBloqueio,
            });
        };

    const inserirVariavel =
        (chave) => {
            if (!podeAlterar) {
                informarBloqueio();
                return;
            }

            const campo =
                campoVariavelAtivo === "assunto"
                    ? "assunto"
                    : "corpo";

            const referencia =
                campo === "assunto"
                    ? assuntoRef
                    : corpoRef;

            const elemento =
                referencia.current;

            const valorAtual =
                formulario[campo] || "";

            const inicio =
                Number.isInteger(
                    elemento?.selectionStart
                )
                    ? elemento.selectionStart
                    : valorAtual.length;

            const fim =
                Number.isInteger(
                    elemento?.selectionEnd
                )
                    ? elemento.selectionEnd
                    : inicio;

            const marcador =
                `{{${chave}}}`;

            const proximoValor =
                valorAtual.slice(0, inicio) +
                marcador +
                valorAtual.slice(fim);

            atualizarCampo(
                campo,
                proximoValor
            );

            const proximaPosicao =
                inicio + marcador.length;

            setTimeout(() => {
                referencia.current?.focus();

                referencia.current?.setSelectionRange?.(
                    proximaPosicao,
                    proximaPosicao
                );
            }, 0);
        };

    const atualizarModeloNaLista =
        (modeloAtualizado) => {
            setModelos(
                (atuais) =>
                    atuais.map(
                        (modelo) =>
                            modelo.tipo ===
                            modeloAtualizado.tipo
                                ? modeloAtualizado
                                : modelo
                    )
            );

            tipoSelecionadoRef.current =
                modeloAtualizado.tipo;

            setTipoSelecionado(
                modeloAtualizado.tipo
            );

            setFormulario(
                criarFormularioModelo(
                    modeloAtualizado
                )
            );
        };

    const salvarModelo =
        async () => {
            if (!podeAlterar) {
                informarBloqueio();
                return;
            }

            if (
                !modeloSelecionado ||
                !supabase
            ) {
                setMensagemPainel({
                    tipo: "erro",
                    texto:
                        "Modelo ou cliente Supabase não disponível para salvamento.",
                });

                return;
            }

            setSalvando(true);

            setMensagemPainel({
                tipo: "informacao",
                texto:
                    "Salvando modelo de e-mail SST...",
            });

            try {
                const modeloSalvo =
                    await salvarModeloEmailSstService({
                        supabase,
                        modelo: {
                            ...modeloSelecionado,
                            ...formulario,
                        },
                    });

                if (!componenteAtivoRef.current) {
                    return;
                }

                atualizarModeloNaLista(
                    modeloSalvo
                );

                setMensagemPainel({
                    tipo: "sucesso",
                    texto:
                        `Modelo “${modeloSalvo.nome}” salvo com sucesso.`,
                });

                await registrarAuditoriaSegura(
                    "MODELO_EMAIL_SST_ALTERADO",
                    "Modelo de e-mail SST alterado nas Configurações.",
                    modeloSalvo
                );
            } catch (error) {
                if (!componenteAtivoRef.current) {
                    return;
                }

                const mensagem =
                    error?.message ||
                    "Não foi possível salvar o modelo de e-mail SST.";

                setMensagemPainel({
                    tipo:
                        mensagem.includes(
                            "ainda não foi aplicada"
                        )
                            ? "aviso"
                            : "erro",
                    texto: mensagem,
                });
            } finally {
                if (componenteAtivoRef.current) {
                    setSalvando(false);
                }
            }
        };

    const restaurarModelo =
        async () => {
            if (!podeAlterar) {
                informarBloqueio();
                return;
            }

            if (
                !modeloSelecionado ||
                !supabase
            ) {
                setMensagemPainel({
                    tipo: "erro",
                    texto:
                        "Modelo ou cliente Supabase não disponível para restauração.",
                });

                return;
            }

            const confirmado =
                typeof window === "undefined" ||
                window.confirm(
                    `Restaurar o modelo “${modeloSelecionado.nome}” para o conteúdo padrão?`
                );

            if (!confirmado) {
                setMensagemPainel({
                    tipo: "informacao",
                    texto:
                        "Restauração cancelada. Nenhuma alteração foi realizada.",
                });

                return;
            }

            setRestaurando(true);

            setMensagemPainel({
                tipo: "informacao",
                texto:
                    "Restaurando modelo padrão...",
            });

            try {
                const modeloRestaurado =
                    await restaurarModeloEmailSstService({
                        supabase,
                        tipo:
                            modeloSelecionado.tipo,
                        modeloAtual:
                            modeloSelecionado,
                    });

                if (!componenteAtivoRef.current) {
                    return;
                }

                atualizarModeloNaLista(
                    modeloRestaurado
                );

                setMensagemPainel({
                    tipo: "sucesso",
                    texto:
                        `Modelo “${modeloRestaurado.nome}” restaurado para o padrão.`,
                });

                await registrarAuditoriaSegura(
                    "MODELO_EMAIL_SST_RESTAURADO",
                    "Modelo de e-mail SST restaurado para o padrão.",
                    modeloRestaurado
                );
            } catch (error) {
                if (!componenteAtivoRef.current) {
                    return;
                }

                const mensagem =
                    error?.message ||
                    "Não foi possível restaurar o modelo padrão.";

                setMensagemPainel({
                    tipo:
                        mensagem.includes(
                            "ainda não foi aplicada"
                        )
                            ? "aviso"
                            : "erro",
                    texto: mensagem,
                });
            } finally {
                if (componenteAtivoRef.current) {
                    setRestaurando(false);
                }
            }
        };


    const operacaoEmAndamento =
        carregando ||
        salvando ||
        restaurando;

    return (
        <Card className="overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                    <button
                        type="button"
                        onClick={onRecolherCard}
                        aria-label="Recolher Modelos de e-mail SST"
                        className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                    >
                        <Mail className="h-5 w-5 text-slate-500" />

                        <span className="text-lg font-black text-slate-950">
                            Modelos de e-mail SST
                        </span>
                    </button>

                    <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">
                        Edite assunto, conteúdo, remetente e estado dos alertas enviados pelo SafeScan.
                        Os modelos são privados e devem ser recuperados pelas RPCs administrativas.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className={classNames(
                            "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ring-1",
                            podeAlterar
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : "bg-orange-50 text-orange-700 ring-orange-200"
                        )}
                    >
                        {podeAlterar ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                            <LockKeyhole className="h-3.5 w-3.5" />
                        )}

                        {podeAlterar
                            ? "Edição autorizada"
                            : "Acesso restrito"}
                    </span>

                    <button
                        type="button"
                        onClick={carregarModelos}
                        disabled={
                            !podeAlterar ||
                            operacaoEmAndamento
                        }
                        className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCw
                            className={classNames(
                                "h-3.5 w-3.5",
                                carregando &&
                                    "animate-spin"
                            )}
                        />

                        Atualizar
                    </button>

                    {controleCard}
                </div>
            </div>

            {!podeAlterar && (
                <div className="mt-4 flex items-start gap-3 rounded-2xl bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-800 ring-1 ring-orange-200">
                    <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />

                    <p>{mensagemBloqueio}</p>
                </div>
            )}

            {mensagemPainel.texto && (
                <div
                    className={classNames(
                        "mt-4 flex items-start gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ring-1",
                        obterClasseMensagem(
                            mensagemPainel.tipo
                        )
                    )}
                >
                    {mensagemPainel.tipo === "sucesso" ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    )}

                    <p>{mensagemPainel.texto}</p>
                </div>
            )}

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(240px,0.72fr)_minmax(0,2.28fr)]">
                <aside className="rounded-[22px] bg-slate-50 p-3 ring-1 ring-slate-200">
                    <div className="px-2 pb-3">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                            Tipos de mensagem
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                            Cada fluxo possui um modelo independente.
                        </p>
                    </div>

                    <div className="space-y-2">
                        {ORDEM_TIPOS_MODELO_EMAIL_SST.map(
                            (tipo) => {
                                const modelo =
                                    modelos.find(
                                        (item) =>
                                            item.tipo === tipo
                                    );

                                const metadados =
                                    obterMetadadosModeloEmailSst(
                                        tipo
                                    );

                                const selecionado =
                                    tipoSelecionado === tipo;

                                return (
                                    <button
                                        key={tipo}
                                        type="button"
                                        onClick={() =>
                                            selecionarModelo(
                                                tipo
                                            )
                                        }
                                        disabled={
                                            !modelo ||
                                            salvando ||
                                            restaurando
                                        }
                                        aria-pressed={
                                            selecionado
                                        }
                                        className={classNames(
                                            "w-full rounded-2xl px-3 py-3 text-left ring-1 transition disabled:cursor-not-allowed disabled:opacity-50",
                                            selecionado
                                                ? "bg-slate-950 text-white ring-slate-950 shadow-sm"
                                                : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-100"
                                        )}
                                    >
                                        <span className="block text-sm font-black">
                                            {modelo?.nome ||
                                                metadados?.nome ||
                                                tipo}
                                        </span>

                                        <span
                                            className={classNames(
                                                "mt-1 block text-[11px] font-semibold leading-relaxed",
                                                selecionado
                                                    ? "text-slate-300"
                                                    : "text-slate-500"
                                            )}
                                        >
                                            {modelo?.grupo ||
                                                metadados?.grupo ||
                                                "Comunicação"}
                                        </span>

                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            <span
                                                className={classNames(
                                                    "rounded-full px-2 py-1 text-[10px] font-black",
                                                    modelo?.ativo !==
                                                        false
                                                        ? selecionado
                                                            ? "bg-emerald-400/20 text-emerald-200"
                                                            : "bg-emerald-50 text-emerald-700"
                                                        : selecionado
                                                            ? "bg-orange-400/20 text-orange-200"
                                                            : "bg-orange-50 text-orange-700"
                                                )}
                                            >
                                                {modelo?.ativo !==
                                                false
                                                    ? "Ativo"
                                                    : "Inativo"}
                                            </span>

                                            {modelo?.personalizado && (
                                                <span
                                                    className={classNames(
                                                        "rounded-full px-2 py-1 text-[10px] font-black",
                                                        selecionado
                                                            ? "bg-blue-400/20 text-blue-200"
                                                            : "bg-blue-50 text-blue-700"
                                                    )}
                                                >
                                                    Personalizado
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                );
                            }
                        )}
                    </div>
                </aside>

                <div className="min-w-0">
                    {carregando && modelos.length === 0 ? (
                        <div className="flex min-h-[300px] items-center justify-center rounded-[22px] bg-slate-50 ring-1 ring-slate-200">
                            <div className="text-center">
                                <Loader2 className="mx-auto h-7 w-7 animate-spin text-slate-500" />

                                <p className="mt-3 text-sm font-black text-slate-700">
                                    Carregando modelos...
                                </p>
                            </div>
                        </div>
                    ) : modeloSelecionado ? (
                        <div className="space-y-5">
                            <div className="rounded-[22px] bg-slate-50 px-4 py-4 ring-1 ring-slate-200">
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                                            Modelo selecionado
                                        </p>

                                        <h3 className="mt-1 text-lg font-black text-slate-950">
                                            {modeloSelecionado.nome}
                                        </h3>

                                        <p className="mt-1 text-sm leading-relaxed text-slate-500">
                                            {modeloSelecionado.descricao}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                                            Versão {modeloSelecionado.versao}
                                        </span>

                                        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                                            {formatarDataAtualizacao(
                                                modeloSelecionado.atualizadoEm
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
                                <div className="space-y-4">
                                    <label className="block">
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <span className="text-sm font-black text-slate-800">
                                                Assunto
                                            </span>

                                            <span className="text-xs font-semibold text-slate-400">
                                                {formulario.assunto.length}/
                                                {LIMITES_MODELO_EMAIL_SST.ASSUNTO}
                                            </span>
                                        </div>

                                        <input
                                            ref={assuntoRef}
                                            type="text"
                                            value={formulario.assunto}
                                            onFocus={() =>
                                                setCampoVariavelAtivo(
                                                    "assunto"
                                                )
                                            }
                                            onChange={(evento) =>
                                                atualizarCampo(
                                                    "assunto",
                                                    evento.target.value
                                                )
                                            }
                                            disabled={
                                                !podeAlterar ||
                                                operacaoEmAndamento
                                            }
                                            maxLength={
                                                LIMITES_MODELO_EMAIL_SST.ASSUNTO
                                            }
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                                        />
                                    </label>

                                    <label className="block">
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <span className="text-sm font-black text-slate-800">
                                                Corpo da mensagem
                                            </span>

                                            <span className="text-xs font-semibold text-slate-400">
                                                {formulario.corpo.length.toLocaleString(
                                                    "pt-BR"
                                                )}
                                                /
                                                {LIMITES_MODELO_EMAIL_SST.CORPO.toLocaleString(
                                                    "pt-BR"
                                                )}
                                            </span>
                                        </div>

                                        <textarea
                                            ref={corpoRef}
                                            value={formulario.corpo}
                                            onFocus={() =>
                                                setCampoVariavelAtivo(
                                                    "corpo"
                                                )
                                            }
                                            onChange={(evento) =>
                                                atualizarCampo(
                                                    "corpo",
                                                    evento.target.value
                                                )
                                            }
                                            disabled={
                                                !podeAlterar ||
                                                operacaoEmAndamento
                                            }
                                            maxLength={
                                                LIMITES_MODELO_EMAIL_SST.CORPO
                                            }
                                            rows={15}
                                            className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm leading-relaxed text-slate-800 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                                        />
                                    </label>

                                    <label className="block">
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <span className="text-sm font-black text-slate-800">
                                                Nome do remetente
                                            </span>

                                            <span className="text-xs font-semibold text-slate-400">
                                                {formulario.remetenteNome.length}/
                                                {LIMITES_MODELO_EMAIL_SST.REMETENTE_NOME}
                                            </span>
                                        </div>

                                        <input
                                            type="text"
                                            value={
                                                formulario.remetenteNome
                                            }
                                            onChange={(evento) =>
                                                atualizarCampo(
                                                    "remetenteNome",
                                                    evento.target.value
                                                )
                                            }
                                            disabled={
                                                !podeAlterar ||
                                                operacaoEmAndamento
                                            }
                                            maxLength={
                                                LIMITES_MODELO_EMAIL_SST.REMETENTE_NOME
                                            }
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                                        />
                                    </label>

                                    <label className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                                        <div>
                                            <p className="text-sm font-black text-slate-800">
                                                Modelo ativo
                                            </p>

                                            <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                                Quando inativo, a Edge Function deverá utilizar o conteúdo de compatibilidade.
                                            </p>
                                        </div>

                                        <input
                                            type="checkbox"
                                            checked={
                                                formulario.ativo
                                            }
                                            onChange={(evento) =>
                                                atualizarCampo(
                                                    "ativo",
                                                    evento.target.checked
                                                )
                                            }
                                            disabled={
                                                !podeAlterar ||
                                                operacaoEmAndamento
                                            }
                                            className="h-5 w-5 rounded border-slate-300 text-slate-950 focus:ring-slate-400 disabled:cursor-not-allowed"
                                        />
                                    </label>

                                    <AssinaturaModeloEmailSstConfiguracoes
                                        supabase={supabase}
                                        tipo={
                                            modeloSelecionado.tipo
                                        }
                                        modelo={
                                            modeloSelecionado
                                        }
                                        podeAlterar={
                                            podeAlterar
                                        }
                                        mensagemBloqueio={
                                            mensagemBloqueio
                                        }
                                        onRegistrarAuditoria={
                                            registrarAuditoriaSegura
                                        }
                                    />

                                    <div className="flex flex-col gap-3 sm:flex-row">
                                        <button
                                            type="button"
                                            onClick={salvarModelo}
                                            disabled={
                                                !podeAlterar ||
                                                operacaoEmAndamento ||
                                                !formularioAlterado
                                            }
                                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                        >
                                            {salvando ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Save className="h-4 w-4" />
                                            )}

                                            {salvando
                                                ? "Salvando..."
                                                : formularioAlterado
                                                    ? "Salvar modelo"
                                                    : "Sem alterações"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={restaurarModelo}
                                            disabled={
                                                !podeAlterar ||
                                                operacaoEmAndamento
                                            }
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                        >
                                            {restaurando ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <RotateCcw className="h-4 w-4" />
                                            )}

                                            {restaurando
                                                ? "Restaurando..."
                                                : "Restaurar padrão"}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    <section className="rounded-[22px] bg-slate-50 p-4 ring-1 ring-slate-200">
                                        <div className="flex items-center gap-2">
                                            <Braces className="h-4 w-4 text-slate-500" />

                                            <h4 className="text-sm font-black text-slate-900">
                                                Variáveis disponíveis
                                            </h4>
                                        </div>

                                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                            Clique para inserir no campo de
                                            {campoVariavelAtivo ===
                                            "assunto"
                                                ? " assunto"
                                                : " corpo"}
                                            .
                                        </p>

                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {VARIAVEIS_MODELO_EMAIL_SST.map(
                                                (chave) => {
                                                    const detalhe =
                                                        DETALHES_VARIAVEIS_MODELO_EMAIL_SST[
                                                            chave
                                                        ];

                                                    return (
                                                        <button
                                                            key={chave}
                                                            type="button"
                                                            onClick={() =>
                                                                inserirVariavel(
                                                                    chave
                                                                )
                                                            }
                                                            disabled={
                                                                !podeAlterar ||
                                                                operacaoEmAndamento
                                                            }
                                                            title={
                                                                detalhe?.descricao ||
                                                                chave
                                                            }
                                                            className="rounded-xl bg-white px-2.5 py-2 font-mono text-[11px] font-black text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            {`{{${chave}}}`}
                                                        </button>
                                                    );
                                                }
                                            )}
                                        </div>

                                        <div className="mt-4 rounded-2xl bg-white px-3 py-3 text-xs leading-relaxed text-slate-500 ring-1 ring-slate-200">
                                            <strong className="text-slate-700">
                                                Obrigatória:
                                            </strong>{" "}
                                            o corpo deve manter a variável{" "}
                                            <code className="font-black text-blue-700">
                                                {"{{itens}}"}
                                            </code>
                                            .
                                        </div>
                                    </section>

                                    <section className="overflow-hidden rounded-[22px] bg-white ring-1 ring-slate-200">
                                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Eye className="h-4 w-4 text-slate-500" />

                                                <h4 className="text-sm font-black text-slate-900">
                                                    Pré-visualização
                                                </h4>
                                            </div>

                                            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
                                                Exemplo
                                            </span>
                                        </div>

                                        <div className="space-y-4 p-4">
                                            {previsualizacao.erro && (
                                                <div className="rounded-2xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 ring-1 ring-red-200">
                                                    {previsualizacao.erro}
                                                </div>
                                            )}

                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                                                    De
                                                </p>

                                                <p className="mt-1 text-sm font-bold text-slate-800">
                                                    {previsualizacao.remetenteNome ||
                                                        "Remetente não informado"}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                                                    Assunto
                                                </p>

                                                <p className="mt-1 break-words text-sm font-black text-slate-950">
                                                    {previsualizacao.assunto ||
                                                        "Assunto não informado"}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                                                    Mensagem
                                                </p>

                                                <div className="mt-2 max-h-[480px] overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-200">
                                                    {previsualizacao.corpo ||
                                                        "Corpo da mensagem não informado."}
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex min-h-[300px] items-center justify-center rounded-[22px] bg-slate-50 px-6 text-center ring-1 ring-slate-200">
                            <div>
                                <Mail className="mx-auto h-8 w-8 text-slate-400" />

                                <h3 className="mt-3 text-base font-black text-slate-800">
                                    {podeAlterar
                                        ? "Nenhum modelo disponível"
                                        : "Acesso restrito"}
                                </h3>

                                <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-500">
                                    {podeAlterar
                                        ? "A migration privada precisa estar aplicada e as RPCs administrativas precisam estar disponíveis antes da integração final."
                                        : mensagemBloqueio}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-5 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-semibold leading-relaxed text-blue-800 ring-1 ring-blue-200">
                Este componente não envia e-mails. O envio de teste e a integração com a Edge Function serão tratados em microetapas separadas.
            </div>
        </Card>
    );
}

export default ModelosEmailSstConfiguracoes;
