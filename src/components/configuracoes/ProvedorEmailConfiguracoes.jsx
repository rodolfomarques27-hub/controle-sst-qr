import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    AlertTriangle,
    BookOpen,
    CheckCircle2,
    ChevronDown,
    Loader2,
    LockKeyhole,
    Mail,
    Power,
    PowerOff,
    RefreshCw,
    Save,
    ServerCog,
    ShieldCheck,
} from "lucide-react";
import { Card } from "../commonComponents";
import {
    obterConfiguracaoProvedorEmailService,
} from "../../services/emailProvedorConfiguracaoService";

const OPERACOES_MUTACAO_LIBERADAS =
    false;

const CLASSE_CAMPO =
    "w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

const ROTULOS_PROVEDORES = {
    GMAIL_SMTP:
        "Gmail SMTP",

    MICROSOFT_365_SMTP:
        "Microsoft 365 SMTP",

    SMTP_PERSONALIZADO:
        "SMTP personalizado",
};

const ROTULOS_SEGURANCA = {
    TLS_IMPLICITO:
        "TLS implícito",

    STARTTLS:
        "STARTTLS",
};

function textoOuTraco(valor) {
    const texto =
        String(valor ?? "").trim();

    return texto || "—";
}

function formatarData(valor) {
    if (!valor) {
        return "Ainda não registrado";
    }

    const data =
        new Date(valor);

    if (
        Number.isNaN(
            data.getTime(),
        )
    ) {
        return "Data não disponível";
    }

    return new Intl.DateTimeFormat(
        "pt-BR",
        {
            dateStyle:
                "short",

            timeStyle:
                "short",
        },
    ).format(data);
}

function obterClasseMensagem(tipo) {
    if (tipo === "sucesso") {
        return "border-emerald-200 bg-emerald-50 text-emerald-800";
    }

    if (tipo === "erro") {
        return "border-red-200 bg-red-50 text-red-800";
    }

    if (tipo === "aviso") {
        return "border-amber-200 bg-amber-50 text-amber-800";
    }

    return "border-blue-200 bg-blue-50 text-blue-800";
}

function obterRotuloTeste(status) {
    if (status === "APROVADO") {
        return "Aprovado";
    }

    if (status === "REPROVADO") {
        return "Reprovado";
    }

    return "Não testado";
}

function criarFormularioProvedorEmail(
    configuracao = null,
) {
    return {
        provedor:
            configuracao?.provedor ||
            "",

        modoSeguranca:
            configuracao?.modoSeguranca ||
            "",

        host:
            configuracao?.host ||
            "",

        porta:
            configuracao?.porta === null ||
            configuracao?.porta === undefined
                ? ""
                : String(
                    configuracao.porta,
                ),

        usuarioSmtp:
            configuracao?.usuarioSmtp ||
            "",

        remetenteEmail:
            configuracao?.remetenteEmail ||
            "",

        remetenteNomePadrao:
            configuracao?.remetenteNomePadrao ||
            "",

        responderParaPadrao:
            configuracao?.responderParaPadrao ||
            "",
    };
}

function CampoTextoProvedor({
    label,
    value,
    onChange,
    placeholder,
    disabled,
    type = "text",
    inputMode,
    min,
    max,
}) {
    return (
        <div>
            <label className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                {label}
            </label>

            <input
                type={type}
                inputMode={inputMode}
                min={min}
                max={max}
                value={value}
                placeholder={placeholder}
                disabled={disabled}
                onChange={(event) => {
                    onChange(
                        event.target.value,
                    );
                }}
                className={
                    CLASSE_CAMPO +
                    " mt-2"
                }
            />
        </div>
    );
}

export function ProvedorEmailConfiguracoes({
    supabase = null,
    podeAlterar = false,
    mensagemBloqueio =
        "Sem permissão para alterar configurações críticas do sistema.",
    controleCard = null,
    onRecolherCard = null,
}) {
    const [
        configuracao,
        setConfiguracao,
    ] =
        useState(null);

    const [
        formulario,
        setFormulario,
    ] =
        useState(
            criarFormularioProvedorEmail(),
        );

    const [
        carregando,
        setCarregando,
    ] =
        useState(false);

    const [
        mensagem,
        setMensagem,
    ] =
        useState({
            tipo:
                "informacao",

            texto:
                "A central será consultada antes da preparação do rascunho local.",
        });

    const alterarCampoFormulario =
        useCallback(
            (
                campo,
                valor,
            ) => {
                setFormulario(
                    (atual) => ({
                        ...atual,
                        [campo]:
                            valor,
                    }),
                );
            },
            [],
        );

    const carregarConfiguracao =
        useCallback(
            async () => {
                if (!podeAlterar) {
                    setConfiguracao(
                        null,
                    );

                    setFormulario(
                        criarFormularioProvedorEmail(),
                    );

                    setMensagem({
                        tipo:
                            "aviso",

                        texto:
                            mensagemBloqueio,
                    });

                    return;
                }

                setCarregando(
                    true,
                );

                setMensagem({
                    tipo:
                        "informacao",

                    texto:
                        "Consultando a configuração segura do provedor...",
                });

                try {
                    const resultado =
                        await obterConfiguracaoProvedorEmailService({
                            supabase,
                        });

                    setConfiguracao(
                        resultado,
                    );

                    setFormulario(
                        criarFormularioProvedorEmail(
                            resultado,
                        ),
                    );

                    setMensagem({
                        tipo:
                            resultado
                                ? "sucesso"
                                : "aviso",

                        texto:
                            resultado
                                ? "Configuração segura carregada. Alterações nos campos permanecem somente na memória desta tela."
                                : "Nenhum provedor central está configurado. Você pode preparar um rascunho local sem gravar nenhuma informação.",
                    });
                } catch (erro) {
                    setConfiguracao(
                        null,
                    );

                    setFormulario(
                        criarFormularioProvedorEmail(),
                    );

                    setMensagem({
                        tipo:
                            "erro",

                        texto:
                            erro?.message ||
                            "Não foi possível consultar o provedor de e-mail.",
                    });
                } finally {
                    setCarregando(
                        false,
                    );
                }
            },
            [
                mensagemBloqueio,
                podeAlterar,
                supabase,
            ],
        );

    useEffect(
        () => {
            void carregarConfiguracao();
        },
        [
            carregarConfiguracao,
        ],
    );

    const formularioBase =
        useMemo(
            () =>
                criarFormularioProvedorEmail(
                    configuracao,
                ),
            [
                configuracao,
            ],
        );

    const rascunhoAlterado =
        useMemo(
            () =>
                JSON.stringify(
                    formulario,
                ) !==
                JSON.stringify(
                    formularioBase,
                ),
            [
                formulario,
                formularioBase,
            ],
        );

    const statusPrincipal =
        useMemo(
            () => {
                if (!configuracao) {
                    return {
                        titulo:
                            "Não configurado",

                        detalhe:
                            "Nenhum provedor central está cadastrado.",

                        classe:
                            "bg-amber-50 text-amber-700 ring-amber-200",
                    };
                }

                if (configuracao.ativo) {
                    return {
                        titulo:
                            "Ativo",

                        detalhe:
                            "O provedor central está habilitado.",

                        classe:
                            "bg-emerald-50 text-emerald-700 ring-emerald-200",
                    };
                }

                return {
                    titulo:
                        "Configurado / inativo",

                    detalhe:
                        "Existe configuração, mas ela não está ativa.",

                    classe:
                        "bg-slate-100 text-slate-700 ring-slate-200",
                };
            },
            [
                configuracao,
            ],
        );

    const mutacoesBloqueadas =
        !OPERACOES_MUTACAO_LIBERADAS ||
        !podeAlterar ||
        carregando;

    const camposDesabilitados =
        !podeAlterar ||
        carregando;

    return (
        <Card className="h-full overflow-hidden p-0">
            <div className="border-b border-slate-200 bg-gradient-to-r from-violet-50 via-white to-blue-50 px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-200">
                            <ServerCog className="h-6 w-6" />
                        </span>

                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-lg font-black text-slate-950">
                                    Provedor de envio
                                </h2>

                                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700 ring-1 ring-blue-200">
                                    {rascunhoAlterado
                                        ? "Rascunho alterado"
                                        : "Rascunho local"}
                                </span>

                                <span
                                    className={
                                        "rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1 " +
                                        statusPrincipal.classe
                                    }
                                >
                                    {statusPrincipal.titulo}
                                </span>
                            </div>

                            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">
                                Prepare os dados não sensíveis da conta SMTP sem gravar credencial ou alterar o provedor ativo.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                void carregarConfiguracao();
                            }}
                            disabled={
                                carregando ||
                                !podeAlterar
                            }
                            title="Recarrega os dados salvos e descarta o rascunho local"
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-white px-3.5 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {carregando ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4" />
                            )}

                            Atualizar
                        </button>

                        {controleCard}

                        {typeof onRecolherCard ===
                            "function" &&
                        !controleCard ? (
                            <button
                                type="button"
                                onClick={
                                    onRecolherCard
                                }
                                className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-slate-950 px-3.5 py-2 text-xs font-black text-white"
                            >
                                Recolher
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
                <div
                    className={
                        "flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold " +
                        obterClasseMensagem(
                            mensagem.tipo,
                        )
                    }
                >
                    {mensagem.tipo ===
                    "erro" ? (
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                    ) : mensagem.tipo ===
                      "sucesso" ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                    ) : (
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                    )}

                    <p className="leading-relaxed">
                        {mensagem.texto}
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                            Estado do provedor
                        </p>

                        <p className="mt-2 text-base font-black text-slate-950">
                            {statusPrincipal.titulo}
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                            {statusPrincipal.detalhe}
                        </p>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                            Credencial SMTP
                        </p>

                        <p className="mt-2 text-base font-black text-slate-950">
                            {configuracao?.credencialConfigurada
                                ? "Configurada"
                                : "Não configurada"}
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                            A credencial nunca é retornada em texto claro.
                        </p>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                            Último teste
                        </p>

                        <p className="mt-2 text-base font-black text-slate-950">
                            {obterRotuloTeste(
                                configuracao?.ultimoTesteStatus,
                            )}
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                            {formatarData(
                                configuracao?.ultimoTesteEm,
                            )}
                        </p>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                            Versão
                        </p>

                        <p className="mt-2 text-base font-black text-slate-950">
                            {configuracao?.versao
                                ? `v${configuracao.versao}`
                                : "—"}
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                            Atualizado:{" "}
                            {formatarData(
                                configuracao?.atualizadoEm,
                            )}
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
                        <div className="mb-4 flex items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                                <Mail className="h-5 w-5" />
                            </span>

                            <div>
                                <h3 className="text-sm font-black text-slate-950">
                                    Configuração SMTP
                                </h3>

                                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                    Edite apenas o rascunho local. Nenhum destes campos é gravado nesta etapa.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <div>
                                <label className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                                    Provedor
                                </label>

                                <select
                                    value={
                                        formulario.provedor
                                    }
                                    disabled={
                                        camposDesabilitados
                                    }
                                    onChange={(event) => {
                                        alterarCampoFormulario(
                                            "provedor",
                                            event.target.value,
                                        );
                                    }}
                                    className={
                                        CLASSE_CAMPO +
                                        " mt-2"
                                    }
                                >
                                    <option value="">
                                        Selecione o provedor
                                    </option>

                                    {Object.entries(
                                        ROTULOS_PROVEDORES,
                                    ).map(
                                        ([
                                            valor,
                                            rotulo,
                                        ]) => (
                                            <option
                                                key={
                                                    valor
                                                }
                                                value={
                                                    valor
                                                }
                                            >
                                                {
                                                    rotulo
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                                    Segurança
                                </label>

                                <select
                                    value={
                                        formulario.modoSeguranca
                                    }
                                    disabled={
                                        camposDesabilitados
                                    }
                                    onChange={(event) => {
                                        alterarCampoFormulario(
                                            "modoSeguranca",
                                            event.target.value,
                                        );
                                    }}
                                    className={
                                        CLASSE_CAMPO +
                                        " mt-2"
                                    }
                                >
                                    <option value="">
                                        Selecione a segurança
                                    </option>

                                    {Object.entries(
                                        ROTULOS_SEGURANCA,
                                    ).map(
                                        ([
                                            valor,
                                            rotulo,
                                        ]) => (
                                            <option
                                                key={
                                                    valor
                                                }
                                                value={
                                                    valor
                                                }
                                            >
                                                {
                                                    rotulo
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>
                            </div>

                            <CampoTextoProvedor
                                label="Host SMTP"
                                value={
                                    formulario.host
                                }
                                placeholder="Ex.: smtp.provedor.com"
                                disabled={
                                    camposDesabilitados
                                }
                                onChange={(valor) => {
                                    alterarCampoFormulario(
                                        "host",
                                        valor,
                                    );
                                }}
                            />

                            <CampoTextoProvedor
                                label="Porta"
                                type="number"
                                inputMode="numeric"
                                min="1"
                                max="65535"
                                value={
                                    formulario.porta
                                }
                                placeholder="Ex.: 465"
                                disabled={
                                    camposDesabilitados
                                }
                                onChange={(valor) => {
                                    alterarCampoFormulario(
                                        "porta",
                                        valor,
                                    );
                                }}
                            />

                            <CampoTextoProvedor
                                label="Usuário SMTP"
                                value={
                                    formulario.usuarioSmtp
                                }
                                placeholder="Usuário de autenticação"
                                disabled={
                                    camposDesabilitados
                                }
                                onChange={(valor) => {
                                    alterarCampoFormulario(
                                        "usuarioSmtp",
                                        valor,
                                    );
                                }}
                            />

                            <CampoTextoProvedor
                                label="E-mail remetente"
                                type="email"
                                value={
                                    formulario.remetenteEmail
                                }
                                placeholder="remetente@empresa.com"
                                disabled={
                                    camposDesabilitados
                                }
                                onChange={(valor) => {
                                    alterarCampoFormulario(
                                        "remetenteEmail",
                                        valor,
                                    );
                                }}
                            />

                            <CampoTextoProvedor
                                label="Nome do remetente"
                                value={
                                    formulario.remetenteNomePadrao
                                }
                                placeholder="SafeScan Brasil"
                                disabled={
                                    camposDesabilitados
                                }
                                onChange={(valor) => {
                                    alterarCampoFormulario(
                                        "remetenteNomePadrao",
                                        valor,
                                    );
                                }}
                            />

                            <CampoTextoProvedor
                                label="Responder para"
                                type="email"
                                value={
                                    formulario.responderParaPadrao
                                }
                                placeholder="Opcional"
                                disabled={
                                    camposDesabilitados
                                }
                                onChange={(valor) => {
                                    alterarCampoFormulario(
                                        "responderParaPadrao",
                                        valor,
                                    );
                                }}
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-3xl border border-violet-200 bg-violet-50/70 p-4">
                            <div className="flex items-start gap-3">
                                <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" />

                                <div>
                                    <h3 className="text-sm font-black text-violet-950">
                                        Credencial protegida
                                    </h3>

                                    <p className="mt-1 text-xs leading-relaxed text-violet-800">
                                        Senha, app password ou token SMTP continuam fora deste formulário. A credencial só será liberada em uma etapa write-only específica.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                                Identificação operacional
                            </p>

                            <dl className="mt-3 space-y-3 text-xs">
                                <div>
                                    <dt className="font-bold text-slate-500">
                                        Último código de teste
                                    </dt>

                                    <dd className="mt-1 font-black text-slate-900">
                                        {textoOuTraco(
                                            configuracao?.ultimoTesteCodigo,
                                        )}
                                    </dd>
                                </div>

                                <div>
                                    <dt className="font-bold text-slate-500">
                                        Configuração
                                    </dt>

                                    <dd className="mt-1 break-all font-black text-slate-900">
                                        {textoOuTraco(
                                            configuracao?.id,
                                        )}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </div>

                <details className="group overflow-hidden rounded-3xl border border-blue-200 bg-white">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 bg-gradient-to-r from-blue-50 via-white to-violet-50 px-4 py-4 transition hover:bg-blue-50 sm:px-5">
                        <div className="flex min-w-0 items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
                                <BookOpen className="h-5 w-5" />
                            </span>

                            <div className="min-w-0">
                                <h3 className="text-sm font-black text-slate-950">
                                    Como configurar o e-mail
                                </h3>

                                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                    Abra este guia para consultar o passo a passo e os parâmetros dos provedores suportados.
                                </p>
                            </div>
                        </div>

                        <span className="flex shrink-0 items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-black text-blue-700 ring-1 ring-blue-200">
                            <span className="group-open:hidden">
                                Abrir guia
                            </span>

                            <span className="hidden group-open:inline">
                                Fechar guia
                            </span>

                            <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
                        </span>
                    </summary>

                    <div className="space-y-5 border-t border-blue-100 p-4 sm:p-5">
                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-start gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                                    1
                                </span>

                                <div>
                                    <h4 className="text-sm font-black text-slate-950">
                                        Prepare a conta de envio
                                    </h4>

                                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                                        Use uma conta dedicada ao SafeScan sempre que possível. Ative os recursos de segurança exigidos pelo provedor e gere uma credencial exclusiva para o sistema.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 xl:grid-cols-3">
                            <div className="rounded-3xl border border-red-200 bg-red-50/60 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wide text-red-600">
                                            Gmail SMTP
                                        </p>

                                        <h4 className="mt-1 text-sm font-black text-slate-950">
                                            Google / Google Workspace
                                        </h4>
                                    </div>

                                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-red-700 ring-1 ring-red-200">
                                        Gmail
                                    </span>
                                </div>

                                <ol className="mt-4 space-y-3 text-xs leading-relaxed text-slate-700">
                                    <li>
                                        <strong>1.</strong> Ative a verificação em duas etapas na Conta Google.
                                    </li>

                                    <li>
                                        <strong>2.</strong> Quando disponível, crie uma senha de app exclusiva para o SafeScan.
                                    </li>

                                    <li>
                                        <strong>3.</strong> Em Provedor, selecione <strong>Gmail SMTP</strong>.
                                    </li>

                                    <li>
                                        <strong>4.</strong> Host: <code className="rounded bg-white px-1.5 py-0.5 font-bold">smtp.gmail.com</code>.
                                    </li>

                                    <li>
                                        <strong>5.</strong> Use <strong>465 + TLS implícito</strong> ou <strong>587 + STARTTLS</strong>.
                                    </li>

                                    <li>
                                        <strong>6.</strong> Usuário SMTP: endereço de e-mail completo.
                                    </li>

                                    <li>
                                        <strong>7.</strong> A futura credencial deverá receber a senha de app, nunca a senha principal da conta.
                                    </li>
                                </ol>

                                <p className="mt-4 rounded-2xl border border-red-200 bg-white px-3 py-2 text-[11px] font-semibold leading-relaxed text-red-800">
                                    Se “Senhas de app” não estiver disponível, verifique as políticas da Conta Google ou do Google Workspace.
                                </p>
                            </div>

                            <div className="rounded-3xl border border-blue-200 bg-blue-50/60 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wide text-blue-600">
                                            Microsoft 365 SMTP
                                        </p>

                                        <h4 className="mt-1 text-sm font-black text-slate-950">
                                            Exchange Online
                                        </h4>
                                    </div>

                                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-blue-700 ring-1 ring-blue-200">
                                        M365
                                    </span>
                                </div>

                                <ol className="mt-4 space-y-3 text-xs leading-relaxed text-slate-700">
                                    <li>
                                        <strong>1.</strong> Confirme que a caixa de correio possui SMTP AUTH autorizado pelas políticas da organização.
                                    </li>

                                    <li>
                                        <strong>2.</strong> Em Provedor, selecione <strong>Microsoft 365 SMTP</strong>.
                                    </li>

                                    <li>
                                        <strong>3.</strong> Host: <code className="rounded bg-white px-1.5 py-0.5 font-bold">smtp.office365.com</code>.
                                    </li>

                                    <li>
                                        <strong>4.</strong> Porta: <strong>587</strong>.
                                    </li>

                                    <li>
                                        <strong>5.</strong> Segurança: <strong>STARTTLS</strong>.
                                    </li>

                                    <li>
                                        <strong>6.</strong> Usuário SMTP: endereço completo da caixa postal autorizada.
                                    </li>

                                    <li>
                                        <strong>7.</strong> Se o tenant exigir autenticação moderna/OAuth, não force uma credencial básica.
                                    </li>
                                </ol>

                                <p className="mt-4 rounded-2xl border border-blue-200 bg-white px-3 py-2 text-[11px] font-semibold leading-relaxed text-blue-800">
                                    As políticas do Microsoft 365 podem bloquear SMTP AUTH mesmo com host, porta e usuário corretos.
                                </p>
                            </div>

                            <div className="rounded-3xl border border-violet-200 bg-violet-50/60 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wide text-violet-600">
                                            SMTP personalizado
                                        </p>

                                        <h4 className="mt-1 text-sm font-black text-slate-950">
                                            Outro provedor
                                        </h4>
                                    </div>

                                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-violet-700 ring-1 ring-violet-200">
                                        Custom
                                    </span>
                                </div>

                                <ol className="mt-4 space-y-3 text-xs leading-relaxed text-slate-700">
                                    <li>
                                        <strong>1.</strong> Solicite ao provedor o host SMTP oficial.
                                    </li>

                                    <li>
                                        <strong>2.</strong> Confirme porta e modo de segurança exigidos.
                                    </li>

                                    <li>
                                        <strong>3.</strong> Informe o usuário SMTP autorizado para autenticação.
                                    </li>

                                    <li>
                                        <strong>4.</strong> Confirme se o endereço remetente pode ser usado por essa conta.
                                    </li>

                                    <li>
                                        <strong>5.</strong> Use uma senha, token ou credencial dedicada ao SafeScan quando o provedor oferecer essa opção.
                                    </li>

                                    <li>
                                        <strong>6.</strong> Nunca reutilize credencial administrativa geral do domínio.
                                    </li>
                                </ol>

                                <p className="mt-4 rounded-2xl border border-violet-200 bg-white px-3 py-2 text-[11px] font-semibold leading-relaxed text-violet-800">
                                    Em caso de dúvida, use exatamente os parâmetros SMTP documentados pelo provedor contratado.
                                </p>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
                            <div className="flex items-start gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-sm font-black text-white">
                                    2
                                </span>

                                <div>
                                    <h4 className="text-sm font-black text-emerald-950">
                                        Preencha e valide na ordem correta
                                    </h4>

                                    <ol className="mt-2 grid gap-2 text-xs leading-relaxed text-emerald-900 lg:grid-cols-2">
                                        <li>
                                            <strong>1.</strong> Escolha Provedor e Segurança.
                                        </li>

                                        <li>
                                            <strong>2.</strong> Informe Host, Porta e Usuário SMTP.
                                        </li>

                                        <li>
                                            <strong>3.</strong> Informe E-mail e Nome do remetente.
                                        </li>

                                        <li>
                                            <strong>4.</strong> Defina “Responder para” somente se necessário.
                                        </li>

                                        <li>
                                            <strong>5.</strong> Quando liberado, grave a credencial pela área protegida.
                                        </li>

                                        <li>
                                            <strong>6.</strong> Salve a configuração.
                                        </li>

                                        <li>
                                            <strong>7.</strong> Execute “Testar conexão”.
                                        </li>

                                        <li>
                                            <strong>8.</strong> Ative somente depois de um teste aprovado.
                                        </li>
                                    </ol>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-relaxed text-amber-900">
                            Segurança: o SafeScan nunca deve exibir novamente a senha, app password ou token já gravado. Se for necessário trocar a credencial, uma nova deverá substituir a anterior por fluxo write-only.
                        </div>
                    </div>
                </details>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <h3 className="text-sm font-black text-slate-950">
                                Operações administrativas
                            </h3>

                            <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                Os contratos já estão preparados, porém continuam desconectados desta tela.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                disabled={
                                    mutacoesBloqueadas
                                }
                                title="Operação ainda não liberada"
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-3.5 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
                            >
                                <Save className="h-4 w-4" />
                                Salvar configuração
                            </button>

                            <button
                                type="button"
                                disabled={
                                    mutacoesBloqueadas
                                }
                                title="Operação ainda não liberada"
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-white px-3.5 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 disabled:cursor-not-allowed disabled:opacity-45"
                            >
                                <ShieldCheck className="h-4 w-4" />
                                Testar conexão
                            </button>

                            <button
                                type="button"
                                disabled={
                                    mutacoesBloqueadas
                                }
                                title="Operação ainda não liberada"
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-3.5 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
                            >
                                <Power className="h-4 w-4" />
                                Ativar provedor
                            </button>

                            <button
                                type="button"
                                disabled={
                                    mutacoesBloqueadas
                                }
                                title="Operação ainda não liberada"
                                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-white px-3.5 py-2 text-xs font-black text-red-700 ring-1 ring-red-200 disabled:cursor-not-allowed disabled:opacity-45"
                            >
                                <PowerOff className="h-4 w-4" />
                                Desativar
                            </button>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold leading-relaxed text-blue-800">
                    {rascunhoAlterado
                        ? "Há alterações somente na memória desta tela. Nada foi salvo no provedor, no banco ou no Vault."
                        : "Os campos estão disponíveis apenas para preparar um rascunho local. Nada é gravado no provedor, no banco ou no Vault."}
                </div>
            </div>
        </Card>
    );
}