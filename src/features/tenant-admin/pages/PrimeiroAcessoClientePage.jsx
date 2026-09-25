import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    ArrowRight,
    CheckCircle2,
    Eye,
    EyeOff,
    KeyRound,
    LockKeyhole,
    ShieldCheck,
    TriangleAlert,
} from "lucide-react";

import dashboardHero from "../../../assets/dashboard-hero-sst.webp";
import {
    capturarLinkConfirmacaoPrimeiroAcessoCliente,
    concluirPrimeiroAcessoClienteService,
    limparFragmentoPrimeiroAcessoCliente,
    montarUrlAmbientePrimeiroAcesso,
    obterRotaPrimeiroAcessoCliente,
    supabasePrimeiroAcessoCliente,
    validarSenhaPrimeiroAcessoCliente,
} from "../services/tenantAdminFirstAccessService.js";

const estilos = {
    pagina: {
        minHeight:
            "100vh",
        padding:
            "32px 18px",
        display:
            "grid",
        placeItems:
            "center",
        background:
            "radial-gradient(circle at top left, rgba(16,185,129,0.12), transparent 38%), linear-gradient(145deg, #071a14 0%, #0b2b20 52%, #0c3a2a 100%)",
        color:
            "#102219",
    },

    card: {
        width:
            "min(620px, 100%)",
        overflow:
            "hidden",
        border:
            "1px solid rgba(255,255,255,0.14)",
        borderRadius:
            "24px",
        background:
            "#ffffff",
        boxShadow:
            "0 28px 90px rgba(0,0,0,0.30)",
    },

    topo: {
        padding:
            "30px 32px 26px",
        background:
            "linear-gradient(135deg, #08281d, #0d4532)",
        color:
            "#ffffff",
    },

    marca: {
        marginBottom:
            "16px",
        display:
            "flex",
        alignItems:
            "center",
        gap:
            "10px",
        color:
            "#80efc1",
        fontSize:
            "12px",
        fontWeight:
            900,
        letterSpacing:
            "0.14em",
        textTransform:
            "uppercase",
    },

    titulo: {
        margin:
            0,
        fontSize:
            "clamp(26px, 5vw, 36px)",
        lineHeight:
            1.08,
        letterSpacing:
            "-0.03em",
    },

    subtitulo: {
        margin:
            "12px 0 0",
        color:
            "#d6f7e8",
        fontSize:
            "14px",
        lineHeight:
            1.6,
    },

    corpo: {
        padding:
            "30px 32px 34px",
    },

    selo: {
        display:
            "inline-flex",
        alignItems:
            "center",
        gap:
            "8px",
        padding:
            "8px 11px",
        borderRadius:
            "999px",
        background:
            "#e9fbf3",
        color:
            "#087a51",
        fontSize:
            "12px",
        fontWeight:
            800,
    },

    texto: {
        margin:
            "20px 0",
        color:
            "#53635b",
        fontSize:
            "14px",
        lineHeight:
            1.7,
    },

    campo: {
        display:
            "grid",
        gap:
            "7px",
        marginTop:
            "17px",
    },

    label: {
        color:
            "#283a31",
        fontSize:
            "13px",
        fontWeight:
            800,
    },

    inputWrapper: {
        position:
            "relative",
    },

    input: {
        width:
            "100%",
        boxSizing:
            "border-box",
        padding:
            "13px 48px 13px 14px",
        border:
            "1px solid #cfdbd5",
        borderRadius:
            "11px",
        background:
            "#fbfdfc",
        color:
            "#15251d",
        fontSize:
            "15px",
        outline:
            "none",
    },

    botaoVisibilidade: {
        position:
            "absolute",
        top:
            "50%",
        right:
            "10px",
        width:
            "34px",
        height:
            "34px",
        display:
            "inline-flex",
        alignItems:
            "center",
        justifyContent:
            "center",
        transform:
            "translateY(-50%)",
        border:
            0,
        borderRadius:
            "9px",
        background:
            "transparent",
        color:
            "#64756c",
        cursor:
            "pointer",
    },

    ajuda: {
        margin:
            "8px 0 0",
        color:
            "#708078",
        fontSize:
            "12px",
        lineHeight:
            1.5,
    },

    botao: {
        width:
            "100%",
        marginTop:
            "24px",
        padding:
            "14px 18px",
        display:
            "flex",
        alignItems:
            "center",
        justifyContent:
            "center",
        gap:
            "9px",
        border:
            0,
        borderRadius:
            "12px",
        background:
            "#079669",
        color:
            "#ffffff",
        fontSize:
            "14px",
        fontWeight:
            850,
        cursor:
            "pointer",
    },

    botaoDesabilitado: {
        opacity:
            0.58,
        cursor:
            "not-allowed",
    },

    erro: {
        marginTop:
            "18px",
        padding:
            "13px 14px",
        display:
            "flex",
        gap:
            "10px",
        alignItems:
            "flex-start",
        border:
            "1px solid #fecaca",
        borderRadius:
            "11px",
        background:
            "#fff5f5",
        color:
            "#9f2929",
        fontSize:
            "13px",
        lineHeight:
            1.5,
    },

    sucesso: {
        marginTop:
            "18px",
        padding:
            "13px 14px",
        display:
            "flex",
        gap:
            "10px",
        alignItems:
            "flex-start",
        border:
            "1px solid #b9ead1",
        borderRadius:
            "11px",
        background:
            "#effcf6",
        color:
            "#08744d",
        fontSize:
            "13px",
        lineHeight:
            1.5,
    },

    seguranca: {
        marginTop:
            "24px",
        paddingTop:
            "20px",
        display:
            "flex",
        gap:
            "10px",
        alignItems:
            "flex-start",
        borderTop:
            "1px solid #e7edea",
        color:
            "#738078",
        fontSize:
            "12px",
        lineHeight:
            1.55,
    },
};

function EstadoErro({
    mensagem,
}) {
    return (
        <div
            style={
                estilos.erro
            }
            role="alert"
        >
            <TriangleAlert
                size={18}
                aria-hidden="true"
            />

            <span>
                {mensagem}
            </span>
        </div>
    );
}

export function PrimeiroAcessoClientePage() {
    const rota =
        useMemo(
            () =>
                obterRotaPrimeiroAcessoCliente(),
            []
        );

    const confirmacao =
        useMemo(
            () =>
                rota.etapa ===
                "confirmar"
                    ? capturarLinkConfirmacaoPrimeiroAcessoCliente()
                    : {
                        valido:
                            false,
                        url:
                            "",
                        erro:
                            "",
                    },
            [
                rota.etapa,
            ]
        );

    const [
        senha,
        setSenha,
    ] =
        useState(
            ""
        );

    const [
        mostrarSenha,
        setMostrarSenha,
    ] =
        useState(
            false
        );

    const [
        mostrarConfirmacaoSenha,
        setMostrarConfirmacaoSenha,
    ] =
        useState(
            false
        );

    const [
        confirmarSenha,
        setConfirmarSenha,
    ] =
        useState(
            ""
        );

    const [
        processando,
        setProcessando,
    ] =
        useState(
            false
        );

    const [
        erro,
        setErro,
    ] =
        useState(
            ""
        );

    const [
        concluido,
        setConcluido,
    ] =
        useState(
            false
        );

    useEffect(
        () => {
            if (
                rota.etapa ===
                "confirmar"
            ) {
                limparFragmentoPrimeiroAcessoCliente();
            }
        },
        [
            rota.etapa,
        ]
    );

    function continuarConfirmacao() {
        setErro(
            ""
        );

        if (
            !confirmacao.valido
            || !confirmacao.url
        ) {
            setErro(
                confirmacao.erro ||
                "O link seguro não está disponível."
            );

            return;
        }

        window.location.assign(
            confirmacao.url
        );
    }

    async function concluirPrimeiroAcesso(
        evento
    ) {
        evento.preventDefault();

        if (
            processando
        ) {
            return;
        }

        setErro(
            ""
        );

        const erroSenha =
            validarSenhaPrimeiroAcessoCliente(
                senha
            );

        if (
            erroSenha
        ) {
            setErro(
                erroSenha
            );

            return;
        }

        if (
            senha !==
            confirmarSenha
        ) {
            setErro(
                "As duas senhas informadas não são iguais."
            );

            return;
        }

        setProcessando(
            true
        );

        try {
            const {
                error:
                    senhaError,
            } =
                await supabasePrimeiroAcessoCliente
                    .auth
                    .updateUser({
                        password:
                            senha,
                    });

            if (
                senhaError
            ) {
                throw new Error(
                    senhaError.message ||
                    "Não foi possível definir a nova senha."
                );
            }

            const resultado =
                await concluirPrimeiroAcessoClienteService({
                    tenantSlug:
                        rota.tenantSlug,
                });

            const destino =
                montarUrlAmbientePrimeiroAcesso(
                    resultado.hostname
                );

            setConcluido(
                true
            );

            window.setTimeout(
                () => {
                    window.location.replace(
                        destino
                    );
                },
                700
            );
        } catch (
            falha
        ) {
            setErro(
                falha instanceof Error
                    ? falha.message
                    : "Não foi possível concluir o primeiro acesso."
            );
        } finally {
            setProcessando(
                false
            );
        }
    }

    const etapaConfirmacao =
        rota.etapa ===
        "confirmar";

    const etapaSenha =
        rota.etapa ===
        "senha";

    return (
        <main
            style={
                estilos.pagina
            }
        >
            <section
                style={
                    estilos.card
                }
                aria-labelledby="primeiro-acesso-titulo"
            >
                <header
                    className="relative overflow-hidden bg-[#08281d] px-6 py-7 text-white sm:px-8"
                    style={{
                        backgroundImage:
                            `linear-gradient(90deg, rgba(3,24,16,.97), rgba(3,31,20,.82), rgba(3,24,16,.42)), url(${dashboardHero})`,
                        backgroundSize:
                            "cover",
                        backgroundPosition:
                            "center",
                    }}
                >
                    <div className="relative z-10 flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10">
                            <ShieldCheck
                                size={20}
                                className="text-emerald-300"
                                aria-hidden="true"
                            />
                        </div>

                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                                SAFESCAN BRASIL
                            </p>

                            <h1
                                id="primeiro-acesso-titulo"
                                className="mt-1 text-2xl font-black tracking-tight sm:text-3xl"
                            >
                                Primeiro acesso
                            </h1>

                            <p className="mt-3 text-sm leading-6 text-emerald-50/85">
                                Configure com segurança o acesso administrativo
                                da sua empresa.
                            </p>

                            <span className="mt-4 block h-[3px] w-16 rounded-full bg-emerald-400" />
                        </div>
                    </div>
                </header>

                <div
                    style={
                        estilos.corpo
                    }
                >
                    <span
                        style={
                            estilos.selo
                        }
                    >
                        <LockKeyhole
                            size={16}
                            aria-hidden="true"
                        />

                        Conta do Cliente
                    </span>

                    {rota.etapa ===
                    "invalida" ? (
                        <>
                            <p
                                style={
                                    estilos.texto
                                }
                            >
                                Não foi possível identificar o ambiente
                                do cliente neste link.
                            </p>

                            <EstadoErro
                                mensagem="Solicite um novo convite ao responsável pelo SafeScan."
                            />
                        </>
                    ) : null}

                    {etapaConfirmacao ? (
                        <>
                            <p
                                style={
                                    estilos.texto
                                }
                            >
                                Para proteger links de autenticação de uso único
                                contra verificadores automáticos de e-mail,
                                o acesso somente será consumido depois da sua
                                confirmação abaixo.
                            </p>

                            {!confirmacao.valido ? (
                                <EstadoErro
                                    mensagem={
                                        confirmacao.erro ||
                                        "Link de primeiro acesso inválido."
                                    }
                                />
                            ) : null}

                            <button
                                type="button"
                                style={{
                                    ...estilos.botao,
                                    ...(
                                        !confirmacao.valido
                                            ? estilos.botaoDesabilitado
                                            : {}
                                    ),
                                }}
                                disabled={
                                    !confirmacao.valido
                                }
                                onClick={
                                    continuarConfirmacao
                                }
                            >
                                Continuar com segurança

                                <ArrowRight
                                    size={18}
                                    aria-hidden="true"
                                />
                            </button>
                        </>
                    ) : null}

                    {etapaSenha ? (
                        <form
                            onSubmit={
                                concluirPrimeiroAcesso
                            }
                        >
                            <p
                                style={
                                    estilos.texto
                                }
                            >
                                Crie uma senha segura para acessar o ambiente SafeScan da sua empresa.
                                Este é o primeiro passo para uma gestão de SST mais eficiente,
                                organizada e rastreável.
                            </p>

                            <div
                                style={
                                    estilos.campo
                                }
                            >
                                <label
                                    htmlFor="primeiro-acesso-senha"
                                    style={
                                        estilos.label
                                    }
                                >
                                    Nova senha
                                </label>

                                <div
                                    style={
                                        estilos.inputWrapper
                                    }
                                >
                                    <input
                                        id="primeiro-acesso-senha"
                                        type={
                                            mostrarSenha
                                                ? "text"
                                                : "password"
                                        }
                                        autoComplete="new-password"
                                        value={
                                            senha
                                        }
                                        onChange={
                                            (
                                                evento
                                            ) =>
                                                setSenha(
                                                    evento
                                                        .target
                                                        .value
                                                )
                                        }
                                        disabled={
                                            processando ||
                                            concluido
                                        }
                                        style={
                                            estilos.input
                                        }
                                    />

                                    <button
                                        type="button"
                                        onClick={
                                            () =>
                                                setMostrarSenha(
                                                    (
                                                        atual
                                                    ) =>
                                                        !atual
                                                )
                                        }
                                        disabled={
                                            processando ||
                                            concluido
                                        }
                                        aria-label={
                                            mostrarSenha
                                                ? "Ocultar nova senha"
                                                : "Visualizar nova senha"
                                        }
                                        title={
                                            mostrarSenha
                                                ? "Ocultar nova senha"
                                                : "Visualizar nova senha"
                                        }
                                        style={
                                            estilos.botaoVisibilidade
                                        }
                                    >
                                        {mostrarSenha ? (
                                            <EyeOff
                                                size={18}
                                                aria-hidden="true"
                                            />
                                        ) : (
                                            <Eye
                                                size={18}
                                                aria-hidden="true"
                                            />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div
                                style={
                                    estilos.campo
                                }
                            >
                                <label
                                    htmlFor="primeiro-acesso-confirmar-senha"
                                    style={
                                        estilos.label
                                    }
                                >
                                    Confirmar nova senha
                                </label>

                                <div
                                    style={
                                        estilos.inputWrapper
                                    }
                                >
                                    <input
                                        id="primeiro-acesso-confirmar-senha"
                                        type={
                                            mostrarConfirmacaoSenha
                                                ? "text"
                                                : "password"
                                        }
                                        autoComplete="new-password"
                                        value={
                                            confirmarSenha
                                        }
                                        onChange={
                                            (
                                                evento
                                            ) =>
                                                setConfirmarSenha(
                                                    evento
                                                        .target
                                                        .value
                                                )
                                        }
                                        disabled={
                                            processando ||
                                            concluido
                                        }
                                        style={
                                            estilos.input
                                        }
                                    />

                                    <button
                                        type="button"
                                        onClick={
                                            () =>
                                                setMostrarConfirmacaoSenha(
                                                    (
                                                        atual
                                                    ) =>
                                                        !atual
                                                )
                                        }
                                        disabled={
                                            processando ||
                                            concluido
                                        }
                                        aria-label={
                                            mostrarConfirmacaoSenha
                                                ? "Ocultar confirmação da senha"
                                                : "Visualizar confirmação da senha"
                                        }
                                        title={
                                            mostrarConfirmacaoSenha
                                                ? "Ocultar confirmação da senha"
                                                : "Visualizar confirmação da senha"
                                        }
                                        style={
                                            estilos.botaoVisibilidade
                                        }
                                    >
                                        {mostrarConfirmacaoSenha ? (
                                            <EyeOff
                                                size={18}
                                                aria-hidden="true"
                                            />
                                        ) : (
                                            <Eye
                                                size={18}
                                                aria-hidden="true"
                                            />
                                        )}
                                    </button>
                                </div>

                                <p
                                    style={
                                        estilos.ajuda
                                    }
                                >
                                    Use pelo menos 12 caracteres, com letra
                                    maiúscula, minúscula, número e caractere
                                    especial.
                                </p>
                            </div>

                            {erro ? (
                                <EstadoErro
                                    mensagem={
                                        erro
                                    }
                                />
                            ) : null}

                            {concluido ? (
                                <div
                                    style={
                                        estilos.sucesso
                                    }
                                >
                                    <CheckCircle2
                                        size={18}
                                        aria-hidden="true"
                                    />

                                    <span>
                                        Primeiro acesso concluído.
                                        Abrindo o ambiente da sua empresa...
                                    </span>
                                </div>
                            ) : null}

                            <button
                                type="submit"
                                style={{
                                    ...estilos.botao,
                                    ...(
                                        processando ||
                                        concluido
                                            ? estilos.botaoDesabilitado
                                            : {}
                                    ),
                                }}
                                disabled={
                                    processando ||
                                    concluido
                                }
                            >
                                <KeyRound
                                    size={18}
                                    aria-hidden="true"
                                />

                                {processando
                                    ? "Configurando acesso..."
                                    : "Criar meu acesso"}
                            </button>
                        </form>
                    ) : null}

                    {!etapaSenha &&
                    erro ? (
                        <EstadoErro
                            mensagem={
                                erro
                            }
                        />
                    ) : null}

                    <div
                        style={
                            estilos.seguranca
                        }
                    >
                        <ShieldCheck
                            size={17}
                            aria-hidden="true"
                        />

                        <span>
                            Seu acesso é individual e protegido. Mantenha suas credenciais
                            em segurança e utilize-as somente para acessar o ambiente
                            SafeScan da sua empresa.
                        </span>
                    </div>
                </div>
            </section>
        </main>
    );
}

export default PrimeiroAcessoClientePage;