import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    AlertTriangle,
    Building2,
    CheckCircle2,
    Loader2,
    MailCheck,
    RefreshCw,
    Save,
    Send,
    Trash2,
} from "lucide-react";
import { Card } from "../commonComponents";
import { supabase } from "../../lib/supabaseClient";
import { AssinaturaModeloEmailSstConfiguracoes } from "./AssinaturaModeloEmailSstConfiguracoes";
import {
    CONFIGURACAO_EMAIL_CERTIDAO_MENSAL_PADRAO,
    excluirConfiguracaoEmailCertidaoMensal,
    listarConfiguracoesEmailCertidaoMensal,
    resolverConfiguracaoEmailCertidaoMensal,
    salvarConfiguracaoEmailCertidaoMensal,
} from "../../features/certidao-mensal-documental/services/certidaoMensalEmailConfiguracaoService";

const CLASSE_CAMPO =
    "w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

function textoSeguro(valor) {
    return typeof valor === "string"
        ? valor.trim()
        : "";
}

function normalizarEmpresa(empresa) {
    if (!empresa || typeof empresa !== "object") {
        return null;
    }

    const id = textoSeguro(
        empresa.id ||
            empresa.empresa_id ||
            empresa.empresaId,
    );

    if (!id) {
        return null;
    }

    return {
        id,
        nome:
            textoSeguro(
                empresa.razao_social ||
                    empresa.razaoSocial ||
                    empresa.nome_fantasia ||
                    empresa.nomeFantasia ||
                    empresa.nome,
            ) || "Empresa sem nome",

        cnpj: textoSeguro(
            empresa.cnpj ||
                empresa.cnpj_formatado ||
                empresa.cnpjFormatado,
        ),
    };
}

function criarFormulario(
    configuracao = null,
    empresaId = null,
) {
    const base = {
        ...CONFIGURACAO_EMAIL_CERTIDAO_MENSAL_PADRAO,
        ...(configuracao || {}),
    };

    return {
        empresaId: textoSeguro(empresaId) || null,
        ativo: base.ativo === true,

        destinatariosTexto:
            Array.isArray(base.destinatarios)
                ? base.destinatarios.join("\n")
                : "",

        copiasTexto:
            Array.isArray(base.copias)
                ? base.copias.join("\n")
                : "",

        responderPara:
            textoSeguro(base.responderPara),

        nomeRemetente:
            textoSeguro(base.nomeRemetente) ||
            CONFIGURACAO_EMAIL_CERTIDAO_MENSAL_PADRAO
                .nomeRemetente,

        assuntoModelo:
            (
                textoSeguro(base.assuntoModelo) ===
                "Documentação mensal — {{empresa_nome}} — {{competencia}}"
            )
                ? CONFIGURACAO_EMAIL_CERTIDAO_MENSAL_PADRAO
                    .assuntoModelo
                : (
                    textoSeguro(base.assuntoModelo) ||
                    CONFIGURACAO_EMAIL_CERTIDAO_MENSAL_PADRAO
                        .assuntoModelo
                ),

        corpoModelo:
            (
                textoSeguro(base.corpoModelo) ===
                [
                    "{{saudacao}},",
                    "",
                    "Segue a documentação mensal da empresa {{empresa_nome}},",
                    "referente à competência {{competencia}}.",
                    "",
                    "{{resumo}}",
                    "",
                    "{{itens}}",
                ].join("\n")
            )
                ? CONFIGURACAO_EMAIL_CERTIDAO_MENSAL_PADRAO
                    .corpoModelo
                : (
                    textoSeguro(base.corpoModelo) ||
                    CONFIGURACAO_EMAIL_CERTIDAO_MENSAL_PADRAO
                        .corpoModelo
                ),
    };
}

function obterClasseMensagem(tipo) {
    if (tipo === "sucesso") {
        return (
            "border-emerald-200 bg-emerald-50 " +
            "text-emerald-800"
        );
    }

    if (tipo === "erro") {
        return (
            "border-red-200 bg-red-50 " +
            "text-red-800"
        );
    }

    if (tipo === "aviso") {
        return (
            "border-amber-200 bg-amber-50 " +
            "text-amber-800"
        );
    }

    return (
        "border-blue-200 bg-blue-50 " +
        "text-blue-800"
    );
}

async function registrarAuditoriaSegura(
    callback,
    dados,
) {
    if (typeof callback !== "function") {
        return;
    }

    try {
        await Promise.resolve(callback(dados));
    } catch (erro) {
        console.warn(
            "Falha ao registrar auditoria da configuração de e-mail das Certidões Mensais.",
            erro,
        );
    }
}

export function CertidaoMensalEmailConfiguracoes({
    empresasBanco = [],
    podeAlterar = false,
    mensagemBloqueio =
        "Sem permissão para alterar configurações críticas do sistema.",
    onRegistrarAuditoria = null,
    controleCard = null,
    onRecolherCard = null,
}) {
    const [configuracoes, setConfiguracoes] =
        useState([]);

    const [escopoSelecionado, setEscopoSelecionado] =
        useState("GLOBAL");

    const [formulario, setFormulario] =
        useState(() =>
            criarFormulario(
                CONFIGURACAO_EMAIL_CERTIDAO_MENSAL_PADRAO,
            ),
        );

    const [carregando, setCarregando] =
        useState(true);

    const [salvando, setSalvando] =
        useState(false);

    const [excluindo, setExcluindo] =
        useState(false);

    const [mensagem, setMensagem] =
        useState({
            tipo: "informacao",
            texto:
                "Carregando a configuração de envio.",
        });

    const empresas = useMemo(
        () =>
            (Array.isArray(empresasBanco)
                ? empresasBanco
                : []
            )
                .map(normalizarEmpresa)
                .filter(Boolean)
                .sort((empresaA, empresaB) =>
                    empresaA.nome.localeCompare(
                        empresaB.nome,
                        "pt-BR",
                    ),
                ),
        [empresasBanco],
    );

    const empresaSelecionada = useMemo(
        () =>
            empresas.find(
                (empresa) =>
                    empresa.id ===
                    escopoSelecionado,
            ) || null,
        [
            empresas,
            escopoSelecionado,
        ],
    );

    const configuracaoEspecifica = useMemo(
        () => {
            if (escopoSelecionado === "GLOBAL") {
                return (
                    configuracoes.find(
                        (configuracao) =>
                            configuracao.escopo ===
                                "GLOBAL" &&
                            !configuracao.empresaId,
                    ) || null
                );
            }

            return (
                configuracoes.find(
                    (configuracao) =>
                        configuracao.escopo ===
                            "EMPRESA" &&
                        configuracao.empresaId ===
                            escopoSelecionado,
                ) || null
            );
        },
        [
            configuracoes,
            escopoSelecionado,
        ],
    );

    useEffect(() => {
        let componenteAtivo = true;

        listarConfiguracoesEmailCertidaoMensal()
            .then((registros) => {
                if (!componenteAtivo) {
                    return;
                }

                const configuracaoGeral =
                    resolverConfiguracaoEmailCertidaoMensal(
                        registros,
                        null,
                    );

                setConfiguracoes(registros);
                setFormulario(
                    criarFormulario(
                        configuracaoGeral,
                        null,
                    ),
                );
                setMensagem({
                    tipo: "sucesso",
                    texto:
                        "Configurações de envio carregadas.",
                });
                setCarregando(false);
            })
            .catch((erro) => {
                if (!componenteAtivo) {
                    return;
                }

                setConfiguracoes([]);
                setMensagem({
                    tipo: "erro",
                    texto:
                        erro?.message ||
                        "Não foi possível carregar as configurações de envio.",
                });
                setCarregando(false);
            });

        return () => {
            componenteAtivo = false;
        };
    }, []);

    const atualizarCampo = useCallback(
        (campo, valor) => {
            setFormulario(
                (estadoAtual) => ({
                    ...estadoAtual,
                    [campo]: valor,
                }),
            );
        },
        [],
    );

    const selecionarEscopo = useCallback(
        (novoEscopo) => {
            const empresaId =
                novoEscopo === "GLOBAL"
                    ? null
                    : novoEscopo;

            const configuracaoResolvida =
                resolverConfiguracaoEmailCertidaoMensal(
                    configuracoes,
                    empresaId,
                );

            setEscopoSelecionado(novoEscopo);
            setFormulario(
                criarFormulario(
                    configuracaoResolvida,
                    empresaId,
                ),
            );
        },
        [configuracoes],
    );

    const carregarConfiguracoes =
        useCallback(async () => {
            setCarregando(true);
            setMensagem({
                tipo: "informacao",
                texto:
                    "Atualizando as configurações de envio.",
            });

            try {
                const registros =
                    await listarConfiguracoesEmailCertidaoMensal();

                const empresaId =
                    escopoSelecionado === "GLOBAL"
                        ? null
                        : escopoSelecionado;

                const configuracaoResolvida =
                    resolverConfiguracaoEmailCertidaoMensal(
                        registros,
                        empresaId,
                    );

                setConfiguracoes(registros);
                setFormulario(
                    criarFormulario(
                        configuracaoResolvida,
                        empresaId,
                    ),
                );
                setMensagem({
                    tipo: "sucesso",
                    texto:
                        "Configurações de envio atualizadas.",
                });
            } catch (erro) {
                setMensagem({
                    tipo: "erro",
                    texto:
                        erro?.message ||
                        "Não foi possível atualizar as configurações.",
                });
            } finally {
                setCarregando(false);
            }
        }, [escopoSelecionado]);

    const salvarConfiguracao =
        async () => {
            if (!podeAlterar) {
                setMensagem({
                    tipo: "aviso",
                    texto: mensagemBloqueio,
                });
                return;
            }

            setSalvando(true);
            setMensagem({
                tipo: "informacao",
                texto:
                    "Salvando a configuração de envio.",
            });

            try {
                const configuracaoSalva =
                    await salvarConfiguracaoEmailCertidaoMensal({
                        empresaId:
                            formulario.empresaId,

                        ativo:
                            formulario.ativo,


                        destinatarios:
                            formulario.destinatariosTexto,

                        copias:
                            formulario.copiasTexto,

                        responderPara:
                            formulario.responderPara,

                        nomeRemetente:
                            formulario.nomeRemetente,

                        assuntoModelo:
                            formulario.assuntoModelo,

                        corpoModelo:
                            formulario.corpoModelo,


                    });

                setConfiguracoes(
                    (estadoAtual) => [
                        ...estadoAtual.filter(
                            (configuracao) =>
                                configuracaoSalva.empresaId
                                    ? configuracao.empresaId !==
                                      configuracaoSalva.empresaId
                                    : !(
                                          configuracao.escopo ===
                                              "GLOBAL" &&
                                          !configuracao.empresaId
                                      ),
                        ),
                        configuracaoSalva,
                    ],
                );

                setFormulario(
                    criarFormulario(
                        configuracaoSalva,
                        formulario.empresaId,
                    ),
                );

                setMensagem({
                    tipo: "sucesso",
                    texto:
                        formulario.empresaId
                            ? "Configuração específica da empresa salva."
                            : "Configuração geral salva.",
                });

                await registrarAuditoriaSegura(
                    onRegistrarAuditoria,
                    {
                        modulo: "configuracoes",
                        recurso:
                            "certidao_mensal_email",
                        acao:
                            "salvar_configuracao",
                        empresaId:
                            formulario.empresaId,
                        ativo:
                            formulario.ativo,

                    },
                );
            } catch (erro) {
                setMensagem({
                    tipo: "erro",
                    texto:
                        erro?.message ||
                        "Não foi possível salvar a configuração.",
                });
            } finally {
                setSalvando(false);
            }
        };

    const excluirConfiguracaoEspecifica =
        async () => {
            const empresaId =
                textoSeguro(formulario.empresaId);

            if (!empresaId) {
                return;
            }

            if (!podeAlterar) {
                setMensagem({
                    tipo: "aviso",
                    texto: mensagemBloqueio,
                });
                return;
            }

            setExcluindo(true);

            try {
                await excluirConfiguracaoEmailCertidaoMensal(
                    empresaId,
                );

                const listaAtualizada =
                    configuracoes.filter(
                        (configuracao) =>
                            configuracao.empresaId !==
                            empresaId,
                    );

                const configuracaoGeral =
                    resolverConfiguracaoEmailCertidaoMensal(
                        listaAtualizada,
                        null,
                    );

                setConfiguracoes(listaAtualizada);
                setFormulario(
                    criarFormulario(
                        configuracaoGeral,
                        empresaId,
                    ),
                );
                setMensagem({
                    tipo: "sucesso",
                    texto:
                        "Configuração específica removida. A empresa voltou a usar a configuração geral.",
                });

                await registrarAuditoriaSegura(
                    onRegistrarAuditoria,
                    {
                        modulo: "configuracoes",
                        recurso:
                            "certidao_mensal_email",
                        acao:
                            "excluir_configuracao_empresa",
                        empresaId,
                    },
                );
            } catch (erro) {
                setMensagem({
                    tipo: "erro",
                    texto:
                        erro?.message ||
                        "Não foi possível remover a configuração específica.",
                });
            } finally {
                setExcluindo(false);
            }
        };

    const bloqueado =
        !podeAlterar ||
        carregando ||
        salvando ||
        excluindo;

    const usandoConfiguracaoGeral =
        escopoSelecionado !== "GLOBAL" &&
        !configuracaoEspecifica;

    return (
        <Card className="h-full overflow-hidden p-0">
            <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 via-white to-cyan-50 px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                            <MailCheck className="h-6 w-6" />
                        </span>

                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-lg font-black text-slate-950">
                                    Notificação de pendências documentais
                                </h2>

                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
                                    Gmail existente
                                </span>
                            </div>

                            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">
                                Configure os destinatários e o conteúdo da cobrança consolidada de pendências.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                void carregarConfiguracoes();
                            }}
                            disabled={carregando}
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
                                onClick={onRecolherCard}
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
                    {mensagem.tipo === "erro" ? (
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                    ) : mensagem.tipo === "sucesso" ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                    ) : (
                        <Send className="mt-0.5 h-5 w-5 shrink-0" />
                    )}

                    <p className="leading-relaxed">
                        {mensagem.texto}
                    </p>
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(260px,0.7fr)_minmax(0,1.3fr)]">
                    <div className="space-y-4">
                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                            <label
                                htmlFor="certidao-email-escopo"
                                className="text-[11px] font-black uppercase tracking-wide text-slate-500"
                            >
                                Configuração aplicada
                            </label>

                            <select
                                id="certidao-email-escopo"
                                value={escopoSelecionado}
                                onChange={(evento) =>
                                    selecionarEscopo(
                                        evento.target.value,
                                    )
                                }
                                className={
                                    CLASSE_CAMPO +
                                    " mt-2"
                                }
                            >
                                <option value="GLOBAL">
                                    Configuração geral
                                </option>

                                {empresas.map(
                                    (empresa) => (
                                        <option
                                            key={empresa.id}
                                            value={empresa.id}
                                        >
                                            {empresa.nome}
                                            {empresa.cnpj
                                                ? ` — ${empresa.cnpj}`
                                                : ""}
                                        </option>
                                    ),
                                )}
                            </select>

                            <div className="mt-4 flex items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                                <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                                <div className="min-w-0">
                                    <p className="text-sm font-black text-slate-900">
                                        {escopoSelecionado ===
                                        "GLOBAL"
                                            ? "Todas as empresas"
                                            : empresaSelecionada?.nome ||
                                              "Empresa selecionada"}
                                    </p>

                                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                        {escopoSelecionado ===
                                        "GLOBAL"
                                            ? "Padrão utilizado quando não houver configuração específica."
                                            : usandoConfiguracaoGeral
                                              ? "Esta empresa está herdando a configuração geral."
                                              : "Esta empresa possui uma configuração específica."}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 rounded-3xl border border-blue-100 bg-blue-50/70 p-4">
                            {[
                                {
                                    campo: "ativo",
                                    titulo:
                                        "Ativar notificações de pendências",
                                    descricao:
                                        "Habilita o envio consolidado das pendências da competência.",
                                },

                            ].map((opcao) => (
                                <label
                                    key={opcao.campo}
                                    className="flex cursor-pointer items-start gap-3"
                                >
                                    <input
                                        type="checkbox"
                                        checked={
                                            formulario[
                                                opcao.campo
                                            ]
                                        }
                                        onChange={(
                                            evento,
                                        ) =>
                                            atualizarCampo(
                                                opcao.campo,
                                                evento.target
                                                    .checked,
                                            )
                                        }
                                        disabled={bloqueado}
                                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                                    />

                                    <span>
                                        <span className="block text-sm font-black text-slate-900">
                                            {opcao.titulo}
                                        </span>

                                        <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                                            {opcao.descricao}
                                        </span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label
                                htmlFor="certidao-email-destinatarios"
                                className="text-[11px] font-black uppercase tracking-wide text-slate-500"
                            >
                                Destinatários das Certidões Mensais
                            </label>

                            <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                Informe um endereço por linha. Esta lista é
                                exclusiva das Certidões Mensais e não utiliza
                                os e-mails gerais cadastrados na empresa.
                            </p>

                            <textarea
                                id="certidao-email-destinatarios"
                                rows={5}
                                value={
                                    formulario.destinatariosTexto
                                }
                                onChange={(evento) =>
                                    atualizarCampo(
                                        "destinatariosTexto",
                                        evento.target.value,
                                    )
                                }
                                disabled={bloqueado}
                                placeholder={
                                    "fiscal@empresa.com.br\ncontratos@empresa.com.br"
                                }
                                className={
                                    CLASSE_CAMPO +
                                    " mt-2 resize-y"
                                }
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="certidao-email-copias"
                                className="text-[11px] font-black uppercase tracking-wide text-slate-500"
                            >
                                Cópia (CC) — opcional
                            </label>

                            <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                Informe um endereço por linha. Não repita
                                endereços informados em Destinatários da
                                Certidões Mensais.
                            </p>

                            <textarea
                                id="certidao-email-copias"
                                rows={5}
                                value={
                                    formulario.copiasTexto
                                }
                                onChange={(evento) =>
                                    atualizarCampo(
                                        "copiasTexto",
                                        evento.target.value,
                                    )
                                }
                                disabled={bloqueado}
                                placeholder={
                                    "sst@empresa.com.br\nadministrativo@empresa.com.br"
                                }
                                className={
                                    CLASSE_CAMPO +
                                    " mt-2 resize-y"
                                }
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="certidao-email-remetente"
                                className="text-[11px] font-black uppercase tracking-wide text-slate-500"
                            >
                                Nome do remetente
                            </label>

                            <input
                                id="certidao-email-remetente"
                                type="text"
                                value={
                                    formulario.nomeRemetente
                                }
                                onChange={(evento) =>
                                    atualizarCampo(
                                        "nomeRemetente",
                                        evento.target.value,
                                    )
                                }
                                disabled={bloqueado}
                                className={
                                    CLASSE_CAMPO +
                                    " mt-2"
                                }
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="certidao-email-resposta"
                                className="text-[11px] font-black uppercase tracking-wide text-slate-500"
                            >
                                Responder para
                            </label>

                            <input
                                id="certidao-email-resposta"
                                type="email"
                                value={
                                    formulario.responderPara
                                }
                                onChange={(evento) =>
                                    atualizarCampo(
                                        "responderPara",
                                        evento.target.value,
                                    )
                                }
                                disabled={bloqueado}
                                placeholder="sst@empresa.com.br"
                                className={
                                    CLASSE_CAMPO +
                                    " mt-2"
                                }
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label
                                htmlFor="certidao-email-assunto"
                                className="text-[11px] font-black uppercase tracking-wide text-slate-500"
                            >
                                Assunto do e-mail
                            </label>

                            <input
                                id="certidao-email-assunto"
                                type="text"
                                value={
                                    formulario.assuntoModelo
                                }
                                onChange={(evento) =>
                                    atualizarCampo(
                                        "assuntoModelo",
                                        evento.target.value,
                                    )
                                }
                                disabled={bloqueado}
                                className={
                                    CLASSE_CAMPO +
                                    " mt-2"
                                }
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label
                                htmlFor="certidao-email-corpo"
                                className="text-[11px] font-black uppercase tracking-wide text-slate-500"
                            >
                                Corpo do e-mail
                            </label>

                            <textarea
                                id="certidao-email-corpo"
                                rows={10}
                                value={
                                    formulario.corpoModelo
                                }
                                onChange={(evento) =>
                                    atualizarCampo(
                                        "corpoModelo",
                                        evento.target.value,
                                    )
                                }
                                disabled={bloqueado}
                                className={
                                    CLASSE_CAMPO +
                                    " mt-2 resize-y font-mono text-xs leading-relaxed"
                                }
                            />

                            <p className="mt-2 text-xs leading-relaxed text-slate-500">
                                Variáveis: {"{{saudacao}}"},{" "}
                                {"{{empresa_nome}}"},{" "}
                                {"{{empresa_cnpj}}"},{" "}
                                {"{{competencia}}"},{" "}
                                {"{{resumo}}"},{" "}
                                {"{{itens}}"},{" "}
                                {"{{total_documentos}}"} e{" "}
                                {"{{total_pendencias}}"}.
                            </p>
                        </div>

                        <div className="md:col-span-2">
                            <div className="mb-3">
                                <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                                    Assinatura padrão das Certidões Mensais
                                </p>

                                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                    Imagem única utilizada nos envios da
                                    Certidões Mensais de todas as empresas.
                                </p>
                            </div>

                            <AssinaturaModeloEmailSstConfiguracoes
                                supabase={supabase}
                                tipo="certidao_mensal_documental"
                                modelo={{
                                    tipo:
                                        "certidao_mensal_documental",
                                    nome:
                                        "Certidões Mensais",
                                }}
                                podeAlterar={podeAlterar}
                                mensagemBloqueio={
                                    mensagemBloqueio
                                }
                                onRegistrarAuditoria={(
                                    acao,
                                    descricao,
                                    modeloAuditoria,
                                ) =>
                                    registrarAuditoriaSegura(
                                        onRegistrarAuditoria,
                                        {
                                            acao,
                                            descricao,
                                            empresaId:
                                                formulario.empresaId ||
                                                null,
                                            escopo:
                                                escopoSelecionado ===
                                                "GLOBAL"
                                                    ? "GLOBAL"
                                                    : "EMPRESA",
                                            tipo:
                                                "certidao_mensal_documental",
                                            modelo:
                                                modeloAuditoria ||
                                                null,
                                        },
                                    )
                                }
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="max-w-2xl text-xs leading-relaxed text-slate-500">
                        O envio continuará utilizando o Gmail existente. Os PDFs serão processados pelo backend.
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                        {escopoSelecionado !==
                            "GLOBAL" &&
                        configuracaoEspecifica ? (
                            <button
                                type="button"
                                onClick={() => {
                                    void excluirConfiguracaoEspecifica();
                                }}
                                disabled={bloqueado}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-2 text-sm font-black text-red-700 ring-1 ring-red-200 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {excluindo ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="h-4 w-4" />
                                )}
                                Usar configuração geral
                            </button>
                        ) : null}

                        <button
                            type="button"
                            onClick={() => {
                                void salvarConfiguracao();
                            }}
                            disabled={bloqueado}
                            title={
                                podeAlterar
                                    ? "Salvar configuração"
                                    : mensagemBloqueio
                            }
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-2 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {salvando ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            Salvar configuração
                        </button>
                    </div>
                </div>
            </div>
        </Card>
    );
}
