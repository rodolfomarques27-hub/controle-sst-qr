import React from "react";
import { ChevronUp, Mail, QrCode } from "lucide-react";
import { formatDate } from "../../utils/sstUtils";

function textoSeguro(valor, fallback = "-") {
    if (valor === null || valor === undefined || valor === "") return fallback;
    return String(valor);
}

function obterFotoColaborador(colaborador = {}) {
    return (
        colaborador.fotoUrl ||
        colaborador.foto_url ||
        colaborador.fotoPublicaUrl ||
        colaborador.foto_publica_url ||
        colaborador.avatarUrl ||
        colaborador.avatar_url ||
        colaborador.foto ||
        ""
    );
}

function obterNomeColaborador(colaborador = {}) {
    return textoSeguro(colaborador.nome || colaborador.nomeCompleto || colaborador.nome_completo, "Colaborador");
}

function obterEmpresaColaborador(colaborador = {}) {
    return textoSeguro(colaborador.empresaExibicao || colaborador.empresa || colaborador.empresaNome || colaborador.empresa_nome, "Empresa não informada");
}

function obterSituacaoColaborador(colaborador = {}) {
    return textoSeguro(colaborador.statusMobilizacao || colaborador.situacaoObra || colaborador.situacao_obra || colaborador.status || "", "");
}

function obterStatusClasse(item = {}) {
    const chave = item.status?.chave || item.statusChave || "";
    const texto = (item.status?.texto || item.status || "").toString().toLowerCase();

    if (chave === "vencido" || texto.includes("venc")) {
        return "dashboard-pendencias-final__status dashboard-pendencias-final__status--vencido";
    }

    if (chave === "vencendo" || texto.includes("vencer")) {
        return "dashboard-pendencias-final__status dashboard-pendencias-final__status--vencendo";
    }

    if (chave === "pendente" || texto.includes("pend")) {
        return "dashboard-pendencias-final__status dashboard-pendencias-final__status--pendente";
    }

    return "dashboard-pendencias-final__status dashboard-pendencias-final__status--neutro";
}

function obterStatusTexto(item = {}) {
    return textoSeguro(item.status?.texto || item.statusLabel || item.status, "Pendente");
}

function obterTreinamentoTexto(item = {}) {
    return textoSeguro(item.treinamento?.nome || item.treinamentoNome || item.documento || item.nomeTreinamento, "Documento não informado");
}

function obterVencimentoTexto(item = {}) {
    const vencimento = item.vencimento || item.realizado?.vencimento || item.dataVencimento || item.vencimentoDocumento;
    return vencimento ? formatDate(vencimento) : "Sem data";
}

function AvatarColaborador({ colaborador }) {
    const foto = obterFotoColaborador(colaborador);
    const nome = obterNomeColaborador(colaborador);
    const iniciais = nome
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => parte[0])
        .join("")
        .toUpperCase();

    if (foto) {
        return <img src={foto} alt={nome} className="dashboard-pendencias-final__foto" loading="lazy" />;
    }

    return <span className="dashboard-pendencias-final__foto dashboard-pendencias-final__foto--fallback">{iniciais || "ST"}</span>;
}

export function DashboardPendencias({
    pendencias = [],
    blocosRecolhidosDashboard = {},
    alternarBlocoRecolhidoDashboard,
    enviarAlertaEmailPendencia,
    enviandoEmail = false,
    onSelectColab,
}) {
    const recolhido = Boolean(blocosRecolhidosDashboard?.pendencias);
    const totalPendencias = pendencias.length;

    return (
        <section className="dashboard-pendencias-final rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="dashboard-pendencias-final__topo">
                <div className="min-w-0">
                    <h2 className="dashboard-pendencias-final__titulo">Pendências críticas</h2>
                    <p className="dashboard-pendencias-final__subtitulo">Treinamentos pendentes, vencidos ou a vencer em até 30 dias.</p>
                </div>

                <div className="dashboard-pendencias-final__controles">
                    <span className="dashboard-pendencias-final__contador">{totalPendencias} itens</span>
                    <button
                        type="button"
                        onClick={() => alternarBlocoRecolhidoDashboard?.("pendencias")}
                        className="dashboard-pendencias-final__recolher"
                    >
                        <ChevronUp className={recolhido ? "rotate-180" : ""} />
                        {recolhido ? "Abrir" : "Recolher"}
                    </button>
                </div>
            </div>

            {!recolhido && (
                <div className="dashboard-pendencias-final__quadro" data-dashboard-pendencias-final="true">
                    <div className="dashboard-pendencias-final__cabecalho" aria-hidden="true">
                        <span>Colaborador</span>
                        <span>Treinamento</span>
                        <span>Vencimento</span>
                        <span>Status / Ações</span>
                    </div>

                    {totalPendencias === 0 ? (
                        <div className="dashboard-pendencias-final__vazio">Nenhuma pendência crítica encontrada.</div>
                    ) : (
                        <div className="dashboard-pendencias-final__lista">
                            {pendencias.map((item, indice) => {
                                const colaborador = item.colaborador || {};
                                const nome = obterNomeColaborador(colaborador);
                                const empresa = obterEmpresaColaborador(colaborador);
                                const situacao = obterSituacaoColaborador(colaborador);
                                const treinamento = obterTreinamentoTexto(item);
                                const vencimento = obterVencimentoTexto(item);
                                const statusTexto = obterStatusTexto(item);

                                return (
                                    <div key={`${colaborador.id || colaborador.codigoFuncionario || nome}-${item.treinamento?.id || treinamento}-${indice}`} className="dashboard-pendencias-final__linha">
                                        <div className="dashboard-pendencias-final__colaborador">
                                            <AvatarColaborador colaborador={colaborador} />
                                            <div className="dashboard-pendencias-final__colaborador-texto">
                                                <strong title={nome}>{nome}</strong>
                                                <span title={`${empresa}${situacao ? ` · ${situacao}` : ""}`}>
                                                    {empresa}{situacao ? ` · ${situacao}` : ""}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="dashboard-pendencias-final__treinamento" title={treinamento}>
                                            {treinamento}
                                        </div>

                                        <div className="dashboard-pendencias-final__vencimento" title={vencimento}>
                                            {vencimento}
                                        </div>

                                        <div className="dashboard-pendencias-final__acoes">
                                            <span className={obterStatusClasse(item)} title={statusTexto}>{statusTexto}</span>
                                            <button
                                                type="button"
                                                onClick={() => enviarAlertaEmailPendencia?.(item)}
                                                disabled={enviandoEmail}
                                                className="dashboard-pendencias-final__botao dashboard-pendencias-final__botao--email"
                                                title="Enviar alerta por e-mail"
                                            >
                                                <Mail />
                                                <span>E-mail</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onSelectColab?.(colaborador)}
                                                className="dashboard-pendencias-final__botao dashboard-pendencias-final__botao--qr"
                                                title="Abrir QR do colaborador"
                                            >
                                                <QrCode />
                                                <span>QR</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
