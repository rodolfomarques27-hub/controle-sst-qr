/* eslint-disable no-unused-vars */
import React, { useMemo, useState } from "react";
import { ClipboardCheck, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { FileUploadAviso } from "../FileUploadAviso";
import {
    notificacaoPadraoAuditoriaCampo,
    montarPreviewNotificacaoAuditoriaCampo,
    rotuloPontuacaoAuditoriaCampo,
    calcularResultadoAuditoriaCampo,
    normalizarAuditoriaCampo,
} from "../../services/auditoriaCampoService";
import { statusGeral } from "../../services/colaboradorDocumentosService";
import { reduzirFotoParaAuditoria } from "../../services/imagemService";
import {
    respostasAuditoriaCampo,
    categoriasAuditoriaCampo,
    statusDesvioAuditoriaCampo,
    gravidadesAuditoriaCampo,
} from "../../constants/sstConstants";
import {
    obterTokenAuditoriaQrColaboradorConfigurado,
    validarSenhaAuditoriaQr,
    gerarNumeroAuditoriaQr,
    salvarAuditoriaQrColaborador,
} from "../../services/auditoriaQrColaboradorService";
import { classNames } from "../../utils/sstUtils";

export function statusGeralConsultaPublica(colaborador = {}, treinamentos = []) {
    return statusGeral({
        ...colaborador,
        statusMobilizacao: colaborador.statusMobilizacao || colaborador.status_mobilizacao || "",
        treinamentos,
    });
}

export function AuditoriaCampoQRCode({ colaborador = {}, treinamentos = [], onAuditoriaSalva }) {
    const [aberta, setAberta] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [mensagem, setMensagem] = useState("");
    const [senhaAuditoriaQr, setSenhaAuditoriaQr] = useState("");
    const [acessoAuditoriaLiberado, setAcessoAuditoriaLiberado] = useState(false);
    const [validandoAcessoAuditoria, setValidandoAcessoAuditoria] = useState(false);
    const [mensagemAcessoAuditoria, setMensagemAcessoAuditoria] = useState("");
    const [tokenAuditoriaQrValidado, setTokenAuditoriaQrValidado] = useState("");
    const [respostas, setRespostas] = useState({
        epi: "conforme",
        frente_trabalho: "conforme",
        comportamento_seguro: "conforme",
    });
    const [auditorNome, setAuditorNome] = useState("");
    const [observacaoAuditoria, setObservacaoAuditoria] = useState("");
    const [boasPraticas, setBoasPraticas] = useState("");
    const [notificacao, setNotificacao] = useState(() => notificacaoPadraoAuditoriaCampo(colaborador, {}));
    const [complementoNotificacao, setComplementoNotificacao] = useState("");
    const [notificacaoEdicaoAberta, setNotificacaoEdicaoAberta] = useState(false);
    const [desvio, setDesvio] = useState({
        descricao: "",
        gravidade: "Leve",
        acaoImediata: "",
        responsavel: "",
        prazo: "",
        status: "Aberto",
        observacao: "",
        observacaoAberto: "",
        observacaoTratativa: "",
        observacaoCorrigido: "",
        fotoAntes: null,
        fotoDepois: null,
    });

    const tokenAuditoriaQr = useMemo(() => {
        const tokenConfigurado = obterTokenAuditoriaQrColaboradorConfigurado();

        if (typeof window === "undefined") {
            return tokenConfigurado;
        }

        const parametrosNormais = new URLSearchParams(window.location.search || "");
        const hash = window.location.hash || "";
        const queryHash = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
        const parametrosHash = new URLSearchParams(queryHash);

        return (
            parametrosNormais.get("token") ||
            parametrosNormais.get("chave") ||
            parametrosHash.get("token") ||
            parametrosHash.get("chave") ||
            colaborador.tokenAuditoriaPublica ||
            colaborador.token_auditoria_publica ||
            tokenConfigurado ||
            ""
        );
    }, [colaborador.tokenAuditoriaPublica, colaborador.token_auditoria_publica]);

    const resultado = useMemo(() => calcularResultadoAuditoriaCampo(respostas), [respostas]);
    const precisaDesvio = resultado.temDesvioGrave || resultado.itens.some((item) => ["nao_conforme", "observacao_leve"].includes(item.resposta.chave));
    const notificacaoBase = useMemo(
        () => notificacaoPadraoAuditoriaCampo(colaborador, resultado),
        [colaborador, resultado]
    );

    const notificacaoCompleta = useMemo(
        () => ({
            ...notificacao,
            titulo: notificacao.titulo || notificacaoBase.titulo,
            mensagem: notificacao.mensagem || notificacaoBase.mensagem,
            complementos: Array.isArray(notificacao.complementos) ? notificacao.complementos : [],
            visualizarPreview: Boolean(notificacao.visualizarPreview),
            auditor: auditorNome.trim() || notificacao.auditor || "Auditor via QR Code",
        }),
        [notificacao, notificacaoBase.titulo, notificacaoBase.mensagem, auditorNome]
    );

    const previewNotificacao = useMemo(
        () => montarPreviewNotificacaoAuditoriaCampo(notificacaoCompleta, notificacaoCompleta.complementos),
        [notificacaoCompleta]
    );

    const adicionarComplementoNotificacao = () => {
        const texto = complementoNotificacao.trim();
        if (!texto) return;

        setNotificacao((atual) => ({
            ...atual,
            complementos: [...(Array.isArray(atual.complementos) ? atual.complementos : []), texto],
        }));
        setComplementoNotificacao("");
    };

    const removerComplementoNotificacao = (index) => {
        setNotificacao((atual) => ({
            ...atual,
            complementos: (Array.isArray(atual.complementos) ? atual.complementos : []).filter((_, itemIndex) => itemIndex !== index),
        }));
    };

    const alterarResposta = (categoria, resposta) => {
        setRespostas((atual) => ({ ...atual, [categoria]: resposta }));
    };

    const validarAcessoAuditoriaQRCode = async () => {
        setMensagemAcessoAuditoria("");

        if (!senhaAuditoriaQr.trim()) {
            setMensagemAcessoAuditoria("Informe a senha de acesso da auditoria.");
            return;
        }

        setValidandoAcessoAuditoria(true);

        try {
            const resposta = await validarSenhaAuditoriaQr({
                tokenAuditoria: tokenAuditoriaQrValidado || tokenAuditoriaQr,
                senha: senhaAuditoriaQr,
            });

            if (resposta?.autorizado !== true) {
                setTokenAuditoriaQrValidado("");
                setMensagemAcessoAuditoria(resposta?.mensagem || "Senha inválida para abrir a auditoria.");
                setAcessoAuditoriaLiberado(false);
                return;
            }

            setTokenAuditoriaQrValidado(resposta?.tokenValidado || tokenAuditoriaQrValidado || tokenAuditoriaQr || "");
            setAcessoAuditoriaLiberado(true);
            setMensagemAcessoAuditoria("Acesso liberado. Preencha a auditoria abaixo.");
        } catch (error) {
            setTokenAuditoriaQrValidado("");
            setMensagemAcessoAuditoria(error?.message || "Não foi possível validar a senha da auditoria.");
            setAcessoAuditoriaLiberado(false);
        } finally {
            setValidandoAcessoAuditoria(false);
        }
    };

    const gerarNumeroAuditoriaQRCode = gerarNumeroAuditoriaQr;

    const salvarAuditoria = async () => {
        setMensagem("");

        if (!acessoAuditoriaLiberado) {
            setMensagem("Informe e valide a senha da auditoria antes de salvar.");
            return;
        }

        if (precisaDesvio && !desvio.descricao.trim()) {
            setMensagem("Preencha a descrição do desvio antes de salvar a auditoria.");
            return;
        }

        setSalvando(true);

        try {
            const numeroAuditoria = await gerarNumeroAuditoriaQRCode();
            const statusDocumental = statusGeralConsultaPublica(colaborador, treinamentos).texto;
            const auditorResponsavel = auditorNome.trim() || "Auditor via QR Code";
            const tituloNotificacao = String(notificacaoCompleta.titulo || "").trim();
            const mensagemNotificacao = String(notificacaoCompleta.mensagem || "").trim();
            const notificacaoPayload = {
                titulo: tituloNotificacao.includes(numeroAuditoria) ? tituloNotificacao : `${numeroAuditoria} - ${tituloNotificacao || "Auditoria de campo"}`,
                mensagem: mensagemNotificacao.includes(numeroAuditoria)
                    ? mensagemNotificacao
                    : `Auditoria ${numeroAuditoria}. ${mensagemNotificacao}`.trim(),
                numero_auditoria: numeroAuditoria,
                complementos: Array.isArray(notificacaoCompleta.complementos) ? notificacaoCompleta.complementos : [],
                observacao: observacaoAuditoria.trim(),
                preview: previewNotificacao,
                auditor: auditorResponsavel,
            };
            const checklist = resultado.itens.map((item) => ({
                categoria: item.categoria.texto,
                chave_categoria: item.categoria.chave,
                resposta: item.resposta.texto,
                chave_resposta: item.resposta.chave,
                pontos: item.resposta.pontos,
                regra_pontuacao: rotuloPontuacaoAuditoriaCampo(item.resposta),
            }));

            const desvioPayloadBase = precisaDesvio
                ? {
                    categoria: resultado.temDesvioGrave ? "Desvio grave" : "Pendência de auditoria",
                    descricao: desvio.descricao.trim(),
                    gravidade: resultado.temDesvioGrave ? "Crítica" : desvio.gravidade,
                    acao_imediata: desvio.acaoImediata.trim(),
                    responsavel: desvio.responsavel.trim(),
                    prazo: desvio.prazo || null,
                    status: desvio.status,
                    observacao: desvio.observacao.trim(),
                    observacao_aberto: desvio.observacaoAberto.trim(),
                    observacao_tratativa: desvio.observacaoTratativa.trim(),
                    observacao_corrigido: desvio.observacaoCorrigido.trim(),
                    notificacao: notificacaoPayload,
                }
                : null;

            const auditoriaPayload = {
                numero_auditoria: numeroAuditoria,
                tipo_auditoria: "Colaborador",
                titulo: `Auditoria de campo - ${colaborador.nome || "Colaborador"}`,
                colaborador_id: colaborador.id || null,
                empresa_id: colaborador.empresaId || colaborador.empresa_id || null,
                token_qr: colaborador.token || colaborador.token_qr || "",
                colaborador_nome: colaborador.nome || "",
                empresa_nome: colaborador.empresaExibicao || colaborador.empresa || "",
                funcao: colaborador.funcao || "",
                status_documental: statusDocumental,
                observacao: observacaoAuditoria.trim(),
                boas_praticas: boasPraticas.trim(),
                notificacao: notificacaoPayload,
                checklist,
                pontuacao: resultado.percentual,
                classificacao: resultado.classificacao,
                tem_desvio_grave: resultado.temDesvioGrave,
                categoria_desvio_principal: desvioPayloadBase?.categoria || "",
                total_desvios: desvioPayloadBase ? 1 : 0,
                status_desvio: desvioPayloadBase?.status || "Sem desvio",
                auditor_nome: auditorResponsavel,
                origem: "QR Code do colaborador",
            };

            const resultadoSalvamento = await salvarAuditoriaQrColaborador({
                tokenAuditoria: tokenAuditoriaQrValidado || tokenAuditoriaQr,
                senha: senhaAuditoriaQr,
                tokenQr: auditoriaPayload.token_qr,
                auditoria: auditoriaPayload,
                desvio: desvioPayloadBase,
                fotos: {
                    antes: desvio.fotoAntes,
                    depois: desvio.fotoDepois,
                },
            });

            const normalizada = normalizarAuditoriaCampo({
                ...(resultadoSalvamento?.auditoria || auditoriaPayload),
                desvios: resultadoSalvamento?.desvio ? [resultadoSalvamento.desvio] : [],
            });

            onAuditoriaSalva?.(normalizada);
            setMensagem("Auditoria registrada com sucesso.");
            setAberta(false);
            setRespostas({ epi: "conforme", frente_trabalho: "conforme", comportamento_seguro: "conforme" });
            setObservacaoAuditoria("");
            setBoasPraticas("");
            setNotificacao(notificacaoPadraoAuditoriaCampo(colaborador, calcularResultadoAuditoriaCampo({ epi: "conforme", frente_trabalho: "conforme", comportamento_seguro: "conforme" })));
            setComplementoNotificacao("");
            setNotificacaoEdicaoAberta(false);
            setAcessoAuditoriaLiberado(false);
            setTokenAuditoriaQrValidado("");
            setSenhaAuditoriaQr("");
            setMensagemAcessoAuditoria("");
            setDesvio({
                descricao: "",
                gravidade: "Leve",
                acaoImediata: "",
                responsavel: "",
                prazo: "",
                status: "Aberto",
                observacao: "",
                observacaoAberto: "",
                observacaoTratativa: "",
                observacaoCorrigido: "",
                fotoAntes: null,
                fotoDepois: null,
            });
        } catch (erro) {
            setMensagem(`Erro ao registrar auditoria: ${erro.message}`);
        } finally {
            setSalvando(false);
        }
    };

    return (
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-950">Auditoria de campo</h3>
                    <p className="mt-1 text-sm text-slate-500">Checklist rápido por QR Code para EPI, frente de trabalho e comportamento seguro.</p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setAberta((valor) => {
                            const proximo = !valor;
                            if (proximo) {
                                setAcessoAuditoriaLiberado(false);
                                setTokenAuditoriaQrValidado("");
                                setSenhaAuditoriaQr("");
                                setMensagemAcessoAuditoria("");
                                setMensagem("");
                            }
                            return proximo;
                        });
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
                >
                    <ClipboardCheck className="h-4 w-4" />
                    {aberta ? "Fechar auditoria" : "Realizar Auditoria"}
                </button>
            </div>

            {mensagem && (
                <div className={classNames("mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ring-1", mensagem.includes("Erro") ? "bg-red-50 text-red-700 ring-red-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200")}>
                    {mensagem}
                </div>
            )}

            {aberta && (
                <div className="mt-5 space-y-5">
                    {!acessoAuditoriaLiberado ? (
                        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-4">
                            <h4 className="font-bold text-blue-950">Acesso à auditoria</h4>
                            <p className="mt-1 text-sm text-blue-700">Informe a senha de auditoria para registrar checklist, desvios e evidências pelo QR Code do colaborador.</p>
                            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                                <input
                                    type="password"
                                    value={senhaAuditoriaQr}
                                    onChange={(e) => setSenhaAuditoriaQr(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            validarAcessoAuditoriaQRCode();
                                        }
                                    }}
                                    placeholder="Senha da auditoria"
                                    className="w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                                />
                                <button
                                    type="button"
                                    onClick={validarAcessoAuditoriaQRCode}
                                    disabled={validandoAcessoAuditoria}
                                    className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {validandoAcessoAuditoria ? "Validando..." : "Entrar"}
                                </button>
                            </div>
                            {mensagemAcessoAuditoria && (
                                <div className={classNames("mt-3 rounded-2xl px-4 py-3 text-sm font-semibold ring-1", acessoAuditoriaLiberado ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-red-50 text-red-700 ring-red-200")}>
                                    {mensagemAcessoAuditoria}
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                    <div className="grid gap-3 md:grid-cols-3">
                        {categoriasAuditoriaCampo.map((categoria) => (
                            <div key={categoria.chave} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                                <label className="block text-sm font-bold text-slate-800">{categoria.texto}</label>
                                <select
                                    value={respostas[categoria.chave] || "conforme"}
                                    onChange={(e) => alterarResposta(categoria.chave, e.target.value)}
                                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                >
                                    {respostasAuditoriaCampo.map((resposta) => (
                                        <option key={resposta.chave} value={resposta.chave}>
                                            {resposta.texto} — {rotuloPontuacaoAuditoriaCampo(resposta)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-2xl bg-slate-950 p-4 text-white">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-300">Resultado parcial</p>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <p className="text-3xl font-black">{resultado.percentual}%</p>
                                <p className="text-sm text-slate-300">{resultado.classificacao}</p>
                            </div>
                            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">Pontos: {resultado.pontos}/{resultado.pontosPossiveis}</span>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-bold text-slate-700">Assunto / título da auditoria</label>
                            <input
                                value={notificacaoCompleta.titulo}
                                onChange={(e) => setNotificacao((atual) => ({ ...atual, titulo: e.target.value }))}
                                placeholder="Ex.: Auditoria de campo - Nome do colaborador"
                                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700">Nome de quem fez a auditoria</label>
                            <input
                                value={auditorNome}
                                onChange={(e) => setAuditorNome(e.target.value)}
                                placeholder="Quem realizou a auditoria"
                                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700">Status do desvio</label>
                            <select
                                value={desvio.status}
                                onChange={(e) => setDesvio({ ...desvio, status: e.target.value })}
                                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                            >
                                {statusDesvioAuditoriaCampo.map((status) => <option key={status}>{status}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700">Observação da auditoria</label>
                            <textarea
                                value={observacaoAuditoria}
                                onChange={(e) => setObservacaoAuditoria(e.target.value)}
                                rows={2}
                                placeholder="Observação geral da auditoria realizada pelo QR Code"
                                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                            />
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-blue-200 bg-blue-50 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                                <h4 className="font-bold text-blue-950">Notificação da auditoria</h4>
                                <p className="mt-1 text-sm text-blue-700">Visualize ou edite a notificação, complementos e observações antes de salvar.</p>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <button
                                    type="button"
                                    onClick={() => setNotificacao((atual) => ({ ...atual, visualizarPreview: !atual.visualizarPreview }))}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100"
                                >
                                    <Eye className="h-4 w-4" />
                                    {notificacaoCompleta.visualizarPreview ? "Ocultar visualização" : "Visualizar"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNotificacaoEdicaoAberta((valor) => !valor)}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                                >
                                    {notificacaoEdicaoAberta ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    {notificacaoEdicaoAberta ? "Fechar edição" : "Editar"}
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
                            {notificacaoEdicaoAberta && (
                                <>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700">Assunto / título</label>
                                        <input
                                            value={notificacao.titulo}
                                            onChange={(e) => setNotificacao((atual) => ({ ...atual, titulo: e.target.value }))}
                                            className="mt-2 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700">Adicionar complemento</label>
                                        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                                            <input
                                                value={complementoNotificacao}
                                                onChange={(e) => setComplementoNotificacao(e.target.value)}
                                                placeholder="Ex.: Enviar evidência fotográfica até o prazo definido"
                                                className="min-w-0 flex-1 rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                                            />
                                            <button
                                                type="button"
                                                onClick={adicionarComplementoNotificacao}
                                                className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 sm:w-auto"
                                            >
                                                <Plus className="h-4 w-4" />
                                                Adicionar
                                            </button>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-slate-700">Mensagem</label>
                                        <textarea
                                            value={notificacao.mensagem}
                                            onChange={(e) => setNotificacao((atual) => ({ ...atual, mensagem: e.target.value }))}
                                            rows={3}
                                            className="mt-2 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </div>

                                    {(notificacao.complementos || []).length > 0 && (
                                        <div className="md:col-span-2 space-y-2">
                                            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Complementos adicionados</p>
                                            {(notificacao.complementos || []).map((item, index) => (
                                                <div key={`${item}-${index}`} className="flex flex-col items-start justify-between gap-3 rounded-2xl bg-white p-3 text-sm ring-1 ring-blue-100 sm:flex-row">
                                                    <span className="break-words text-slate-700">{index + 1}. {item}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removerComplementoNotificacao(index)}
                                                        className="inline-flex shrink-0 items-center gap-1 rounded-xl px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        Excluir
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                </>
                            )}

                            {notificacaoCompleta.visualizarPreview && (
                                <div className="min-w-0 rounded-2xl bg-slate-950 p-4 text-sm text-slate-100 lg:col-span-2">
                                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Prévia da notificação</p>
                                    <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words font-sans leading-relaxed scrollbar-discreta">{previewNotificacao || "Preencha assunto e mensagem para visualizar."}</pre>
                                </div>
                            )}
                        </div>
                    </div>

                    {precisaDesvio && (
                        <div className="rounded-3xl border border-orange-200 bg-orange-50 p-4">
                            <h4 className="font-bold text-orange-900">Registro de desvio</h4>
                            <p className="mt-1 text-sm text-orange-700">Obrigatório quando houver observação, não conformidade ou desvio grave.</p>

                            <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700">Descrição</label>
                                    <textarea
                                        value={desvio.descricao}
                                        onChange={(e) => setDesvio({ ...desvio, descricao: e.target.value })}
                                        rows={3}
                                        placeholder="Descreva o desvio identificado"
                                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700">Gravidade</label>
                                    <select
                                        value={desvio.gravidade}
                                        onChange={(e) => setDesvio({ ...desvio, gravidade: e.target.value })}
                                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                    >
                                        {gravidadesAuditoriaCampo.map((gravidade) => <option key={gravidade}>{gravidade}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700">Responsável</label>
                                    <input
                                        value={desvio.responsavel}
                                        onChange={(e) => setDesvio({ ...desvio, responsavel: e.target.value })}
                                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700">Ação imediata</label>
                                    <input
                                        value={desvio.acaoImediata}
                                        onChange={(e) => setDesvio({ ...desvio, acaoImediata: e.target.value })}
                                        placeholder="Ex.: paralisar atividade e corrigir EPI"
                                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700">Prazo</label>
                                    <input
                                        type="date"
                                        value={desvio.prazo}
                                        onChange={(e) => setDesvio({ ...desvio, prazo: e.target.value })}
                                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700">Foto antes</label>
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        onChange={async (e) => {
                                            const arquivo = e.target.files?.[0] || null;
                                            const otimizado = arquivo ? await reduzirFotoParaAuditoria(arquivo) : null;
                                            setDesvio((atual) => ({ ...atual, fotoAntes: otimizado }));
                                        }}
                                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                                    />
                                    <FileUploadAviso arquivo={desvio.fotoAntes} tipo="fotoAuditoria" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700">Foto depois</label>
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        onChange={async (e) => {
                                            const arquivo = e.target.files?.[0] || null;
                                            const otimizado = arquivo ? await reduzirFotoParaAuditoria(arquivo) : null;
                                            setDesvio((atual) => ({ ...atual, fotoDepois: otimizado }));
                                        }}
                                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                                    />
                                    <FileUploadAviso arquivo={desvio.fotoDepois} tipo="fotoAuditoria" />
                                </div>
                                {(desvio.fotoAntes || desvio.fotoDepois) && (
                                    <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
                                        <p className="text-sm font-bold text-slate-800">Fotos anexadas para a auditoria</p>
                                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                            {desvio.fotoAntes && (
                                                <div className="overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-200">
                                                    <img src={URL.createObjectURL(desvio.fotoAntes)} alt="Prévia da foto antes" className="h-36 w-full object-cover" />
                                                    <p className="px-3 py-2 text-xs font-bold text-slate-600">Foto antes: {desvio.fotoAntes.name}</p>
                                                </div>
                                            )}
                                            {desvio.fotoDepois && (
                                                <div className="overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-200">
                                                    <img src={URL.createObjectURL(desvio.fotoDepois)} alt="Prévia da foto depois" className="h-36 w-full object-cover" />
                                                    <p className="px-3 py-2 text-xs font-bold text-slate-600">Foto depois: {desvio.fotoDepois.name}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-4">
                                    <h5 className="text-sm font-bold text-slate-800">Observações por status do desvio</h5>
                                    <p className="mt-1 text-xs text-slate-500">Use esses campos para acompanhar a evolução: abertura, tratativa e correção.</p>
                                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wide text-red-600">Aberto</label>
                                            <textarea
                                                value={desvio.observacaoAberto}
                                                onChange={(e) => setDesvio({ ...desvio, observacaoAberto: e.target.value })}
                                                rows={3}
                                                placeholder="Observação inicial do desvio aberto"
                                                className="mt-2 w-full rounded-2xl border border-red-100 bg-red-50/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wide text-orange-600">Em tratativa</label>
                                            <textarea
                                                value={desvio.observacaoTratativa}
                                                onChange={(e) => setDesvio({ ...desvio, observacaoTratativa: e.target.value })}
                                                rows={3}
                                                placeholder="O que está sendo feito para corrigir"
                                                className="mt-2 w-full rounded-2xl border border-orange-100 bg-orange-50/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-100"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wide text-emerald-600">Corrigido</label>
                                            <textarea
                                                value={desvio.observacaoCorrigido}
                                                onChange={(e) => setDesvio({ ...desvio, observacaoCorrigido: e.target.value })}
                                                rows={3}
                                                placeholder="Evidência ou comentário da correção"
                                                className="mt-2 w-full rounded-2xl border border-emerald-100 bg-emerald-50/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-100"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700">Observação geral</label>
                                    <textarea
                                        value={desvio.observacao}
                                        onChange={(e) => setDesvio({ ...desvio, observacao: e.target.value })}
                                        rows={2}
                                        placeholder="Observação complementar geral"
                                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                    />
                                </div>
                            </div>
                        </div>
                    )}


                    <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4">
                        <label className="block text-sm font-bold text-emerald-900">Boas práticas observadas</label>
                        <textarea
                            value={boasPraticas}
                            onChange={(e) => setBoasPraticas(e.target.value)}
                            rows={3}
                            placeholder="Registre atitudes positivas, organização, uso correto de EPI ou exemplo que possa virar DDS futuramente."
                            className="mt-2 w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        />
                        <p className="mt-1 text-xs text-emerald-700">Opcional. Este campo fica por último para registrar boas práticas após concluir a análise da auditoria.</p>
                    </div>

                    <button
                        type="button"
                        disabled={salvando}
                        onClick={salvarAuditoria}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                        {salvando ? "Salvando auditoria..." : "Salvar auditoria de campo"}
                    </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
