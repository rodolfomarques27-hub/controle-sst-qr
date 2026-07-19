import React, { useEffect, useMemo, useState } from "react";
import { Mail, QrCode } from "lucide-react";
import { criarUrlAssinadaStorage } from "../../services/supabaseServices";
import { formatDate } from "../../utils/sstUtils";
import { DashboardBlocoRecolhivel } from "./DashboardBlocoRecolhivel";

const FOTO_BUCKET_COLABORADORES = "fotos-colaboradores";
const CACHE_FOTOS_ASSINADAS = new Map();
const LIMITE_INICIAL_PENDENCIAS = 15;

const ESTILOS_PENDENCIAS_DESKTOP = `
@media (min-width: 1024px) {
    .dashboard-pendencias-final__cabecalho,
    .dashboard-pendencias-final__linha {
        display: grid;
        grid-template-columns: minmax(300px, 1.45fr) minmax(330px, 1.45fr) minmax(150px, 0.6fr) minmax(300px, 1fr);
        column-gap: 24px;
        align-items: center;
    }

    .dashboard-pendencias-final__cabecalho > span:nth-child(3),
    .dashboard-pendencias-final__vencimento {
        text-align: center;
        justify-self: center;
    }

    .dashboard-pendencias-final__cabecalho > span:nth-child(4) {
        text-align: center;
        justify-self: center;
    }

    .dashboard-pendencias-final__acoes {
        justify-content: center;
        justify-self: center;
        min-width: 300px;
    }

    .dashboard-pendencias-final__treinamento {
        min-width: 0;
    }
}

.dashboard-pendencias-final__rodape-lista {
    display: flex;
    justify-content: center;
    padding: 16px 0 4px;
}

.dashboard-pendencias-final__mostrar-mais {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 999px;
    border: 1px solid #dbeafe;
    background: #ffffff;
    padding: 10px 16px;
    font-size: 12px;
    font-weight: 800;
    color: #1e3a8a;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.dashboard-pendencias-final__mostrar-mais:hover {
    background: #eff6ff;
}
`;

function textoSeguro(valor, fallback = "-") {
    if (valor === null || valor === undefined || valor === "") return fallback;
    return String(valor);
}

function primeiroValorValido(...valores) {
    return valores.find((valor) => valor !== null && valor !== undefined && String(valor).trim() !== "") || "";
}

function normalizarTexto(valor = "") {
    return String(valor || "").trim();
}

function ehUrlPronta(valor = "") {
    const texto = normalizarTexto(valor);
    return /^(https?:|blob:|data:)/i.test(texto) || texto.startsWith("/");
}

function extrairCaminhoFotoStorage(valor = "") {
    const texto = normalizarTexto(valor);
    if (!texto) return "";

    if (texto.includes("/storage/v1/object/")) {
        const marcadorPublico = `/object/public/${FOTO_BUCKET_COLABORADORES}/`;
        const marcadorAutenticado = `/object/authenticated/${FOTO_BUCKET_COLABORADORES}/`;
        const marcadorAssinado = `/object/sign/${FOTO_BUCKET_COLABORADORES}/`;

        const indicePublico = texto.indexOf(marcadorPublico);
        if (indicePublico >= 0) {
            return decodeURIComponent(texto.slice(indicePublico + marcadorPublico.length).split("?")[0]);
        }

        const indiceAutenticado = texto.indexOf(marcadorAutenticado);
        if (indiceAutenticado >= 0) {
            return decodeURIComponent(texto.slice(indiceAutenticado + marcadorAutenticado.length).split("?")[0]);
        }

        const indiceAssinado = texto.indexOf(marcadorAssinado);
        if (indiceAssinado >= 0) {
            return decodeURIComponent(texto.slice(indiceAssinado + marcadorAssinado.length).split("?")[0]);
        }
    }

    const marcadorBucket = `${FOTO_BUCKET_COLABORADORES}/`;
    const indiceBucket = texto.indexOf(marcadorBucket);
    if (indiceBucket >= 0) {
        return texto.slice(indiceBucket + marcadorBucket.length).replace(/^\/+/, "");
    }

    if (!ehUrlPronta(texto)) {
        return texto.replace(/^\/+/, "");
    }

    return "";
}

function obterCandidatosFoto(item = {}, colaborador = {}) {
    const empresa = colaborador.empresa || item.empresa || {};

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
    ].filter((valor) => valor !== null && valor !== undefined && String(valor).trim() !== "");
}

function obterNomeColaborador(colaborador = {}, item = {}) {
    return textoSeguro(
        primeiroValorValido(
            colaborador.nome,
            colaborador.nomeCompleto,
            colaborador.nome_completo,
            item.colaboradorNome,
            item.colaborador_nome,
            item.nomeColaborador,
            item.nome_colaborador
        ),
        "Colaborador"
    );
}

function obterEmpresaColaborador(colaborador = {}, item = {}) {
    const empresa = colaborador.empresa || item.empresa || {};

    return textoSeguro(
        primeiroValorValido(
            colaborador.empresaExibicao,
            colaborador.empresa,
            colaborador.empresaNome,
            colaborador.empresa_nome,
            colaborador.nomeEmpresa,
            colaborador.nome_empresa,
            empresa.nome,
            empresa.razao_social,
            item.empresaNome,
            item.empresa_nome,
            item.nomeEmpresa,
            item.nome_empresa
        ),
        "Empresa não informada"
    );
}

function obterSituacaoColaborador(colaborador = {}, item = {}) {
    return textoSeguro(
        primeiroValorValido(
            colaborador.statusMobilizacao,
            colaborador.status_mobilizacao,
            colaborador.situacaoObra,
            colaborador.situacao_obra,
            colaborador.situacao,
            colaborador.status,
            item.situacaoObra,
            item.situacao_obra,
            item.statusColaborador
        ),
        ""
    );
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
    return textoSeguro(
        primeiroValorValido(
            item.treinamento?.nome,
            item.treinamentoNome,
            item.treinamento_nome,
            item.documento,
            item.nomeTreinamento,
            item.nome_treinamento,
            item.tipoDocumento,
            item.tipo_documento
        ),
        "Documento não informado"
    );
}

function obterVencimentoTexto(item = {}) {
    const vencimento = primeiroValorValido(
        item.vencimento,
        item.realizado?.vencimento,
        item.dataVencimento,
        item.data_vencimento,
        item.vencimentoDocumento,
        item.vencimento_documento
    );

    return vencimento ? formatDate(vencimento) : "Sem data";
}

async function resolverFotoColaborador(candidatos = []) {
    for (const candidato of candidatos) {
        const valor = normalizarTexto(candidato);
        if (!valor) continue;

        if (ehUrlPronta(valor)) {
            return valor;
        }

        const caminhoStorage = extrairCaminhoFotoStorage(valor);
        if (!caminhoStorage) continue;

        const chaveCache = `${FOTO_BUCKET_COLABORADORES}/${caminhoStorage}`;
        if (CACHE_FOTOS_ASSINADAS.has(chaveCache)) {
            return CACHE_FOTOS_ASSINADAS.get(chaveCache);
        }

        const urlAssinada = await criarUrlAssinadaStorage(
            FOTO_BUCKET_COLABORADORES,
            caminhoStorage,
            60 * 60,
        );

        if (urlAssinada) {
            CACHE_FOTOS_ASSINADAS.set(chaveCache, urlAssinada);
            return urlAssinada;
        }
    }

    return "";
}

function AvatarColaborador({ item, colaborador }) {
    const nome = obterNomeColaborador(colaborador, item);
    const candidatosFoto = useMemo(() => obterCandidatosFoto(item, colaborador), [item, colaborador]);
    const [fotoResolvida, setFotoResolvida] = useState("");
    const [fotoComErro, setFotoComErro] = useState(false);

    const iniciais = nome
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => parte[0])
        .join("")
        .toUpperCase();

    useEffect(() => {
        let ativo = true;
        setFotoComErro(false);
        setFotoResolvida("");

        resolverFotoColaborador(candidatosFoto).then((url) => {
            if (ativo) setFotoResolvida(url || "");
        });

        return () => {
            ativo = false;
        };
    }, [candidatosFoto]);

    if (fotoResolvida && !fotoComErro) {
        return (
            <img
                src={fotoResolvida}
                alt={nome}
                className="dashboard-pendencias-final__foto"
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setFotoComErro(true)}
            />
        );
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
    const totalPendencias = pendencias.length;
    const [mostrarTodasPendencias, setMostrarTodasPendencias] = useState(false);
    const possuiMaisPendencias = totalPendencias > LIMITE_INICIAL_PENDENCIAS;
    const pendenciasVisiveis = mostrarTodasPendencias
        ? pendencias
        : pendencias.slice(0, LIMITE_INICIAL_PENDENCIAS);

    useEffect(() => {
        setMostrarTodasPendencias(false);
    }, [totalPendencias]);

    return (
        <DashboardBlocoRecolhivel
            chaveBloco="pendencias"
            titulo="Pendências críticas"
            subtitulo="Certificados enviados, vencidos ou a vencer em até 30 dias."
            badge={<span className="dashboard-pendencias-final__contador rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">{possuiMaisPendencias && !mostrarTodasPendencias ? `${pendenciasVisiveis.length} de ${totalPendencias}` : `${totalPendencias} itens`}</span>}
            blocosRecolhidosDashboard={blocosRecolhidosDashboard}
            alternarBlocoRecolhidoDashboard={alternarBlocoRecolhidoDashboard}
        >
            <style>{ESTILOS_PENDENCIAS_DESKTOP}</style>
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
                        {pendenciasVisiveis.map((item, indice) => {
                            const colaborador = item.colaborador || item.colaboradorDados || item.colaborador_dados || {};
                            const nome = obterNomeColaborador(colaborador, item);
                            const empresa = obterEmpresaColaborador(colaborador, item);
                            const situacao = obterSituacaoColaborador(colaborador, item);
                            const treinamento = obterTreinamentoTexto(item);
                            const vencimento = obterVencimentoTexto(item);
                            const statusTexto = obterStatusTexto(item);

                            return (
                                <div key={`${colaborador.id || colaborador.codigoFuncionario || colaborador.codigo_funcionario || nome}-${item.treinamento?.id || treinamento}-${indice}`} className="dashboard-pendencias-final__linha">
                                    <div className="dashboard-pendencias-final__colaborador">
                                        <AvatarColaborador item={item} colaborador={colaborador} />
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

                        {possuiMaisPendencias && (
                            <div className="dashboard-pendencias-final__rodape-lista">
                                <button
                                    type="button"
                                    onClick={() => setMostrarTodasPendencias((valorAtual) => !valorAtual)}
                                    className="dashboard-pendencias-final__mostrar-mais"
                                >
                                    {mostrarTodasPendencias
                                        ? "Mostrar menos"
                                        : `Mostrar mais ${totalPendencias - LIMITE_INICIAL_PENDENCIAS} item(ns)`}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </DashboardBlocoRecolhivel>
    );
}

export default DashboardPendencias;
