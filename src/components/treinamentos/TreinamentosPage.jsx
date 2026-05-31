/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, GripVertical, RotateCcw, Search, SlidersHorizontal, Upload } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { Card, Header } from "../commonComponents";
import { validarArquivoAntesUpload, validarListaArquivosAntesUpload } from "../FileUploadAviso";
import { AlertasTstTreinamentos } from "./AlertasTstTreinamentos";
import { BaseCertificadosTreinamentos } from "./BaseCertificadosTreinamentos";
import { FormularioLancamentoCertificado } from "./FormularioLancamentoCertificado";
import {
    avaliarTreinamentosColaborador,
    statusGeral,
    treinamentoSemValidade,
    statusDocumento,
    obterTreinamento,
    calcularVencimentoTreinamento,
    detectarDataEmissaoArquivo,
} from "../../services/colaboradorDocumentosService";
import {
    prepararArquivosTreinamentoLote,
    atualizarColaboradorArquivoLote,
    atualizarTreinamentoArquivoLote,
    atualizarDataArquivoLote,
} from "../../services/treinamentosService";
import { treinamentosBase, FUNCAO_EMAIL_ALERTA_TST } from "../../constants/sstConstants";
import {
    normalizarTextoBusca,
    diasParaVencer,
    formatDate,
    normalizarEmailDestinatario,
} from "../../utils/sstUtils";

const hoje = new Date();

const cardsTreinamentosPadrao = {
    filtros: false,
    lancamento: false,
    alertas: false,
    base: false,
};

const ordemCardsTreinamentosPadrao = ["filtros", "lancamento", "alertas", "base"];

const tamanhosCardsTreinamentosPadrao = {
    filtros: "full",
    lancamento: "medio",
    alertas: "medio",
    base: "full",
};

const opcoesTamanhoCardTreinamento = [
    { valor: "compacto", label: "Padrão", descricao: "1 coluna" },
    { valor: "medio", label: "Médio", descricao: "2 colunas" },
    { valor: "largo", label: "Grande", descricao: "3 colunas" },
    { valor: "full", label: "Destaque", descricao: "linha inteira" },
];

function normalizarLayoutCardsTreinamentos(layout = {}) {
    const ordemInformada = Array.isArray(layout.ordem) ? layout.ordem : ordemCardsTreinamentosPadrao;
    const ordem = [
        ...ordemInformada.filter((chave) => ordemCardsTreinamentosPadrao.includes(chave)),
        ...ordemCardsTreinamentosPadrao.filter((chave) => !ordemInformada.includes(chave)),
    ];

    return {
        ordem,
        tamanhos: {
            ...tamanhosCardsTreinamentosPadrao,
            ...(layout.tamanhos || {}),
        },
    };
}

function carregarCardsTreinamentosLayout() {
    if (typeof window === "undefined") return normalizarLayoutCardsTreinamentos();

    try {
        const salvo = JSON.parse(window.localStorage.getItem("treinamentosCardsLayout") || "null");
        return normalizarLayoutCardsTreinamentos(salvo || {});
    } catch {
        return normalizarLayoutCardsTreinamentos();
    }
}

function carregarCardsTreinamentosRecolhidos() {
    if (typeof window === "undefined") return cardsTreinamentosPadrao;

    try {
        const salvo = JSON.parse(window.localStorage.getItem("treinamentosCardsRecolhidos") || "null");
        return salvo && typeof salvo === "object" ? { ...cardsTreinamentosPadrao, ...salvo } : cardsTreinamentosPadrao;
    } catch {
        return cardsTreinamentosPadrao;
    }
}

function emailTstDaEmpresa(colaborador) {
    return normalizarEmailDestinatario(colaborador?.empresaTstEmail || "");
}

export function Treinamentos({
    colaboradores,
    colaboradorInicialId,
    onSalvarCertificado,
    onVisualizarCertificado,
    onExcluirCertificado,
    onAtualizarDatasCertificado,
    onSincronizarStorage,
    onRegistrarEmailEnviado,
}) {
    const [colabId, setColabId] = useState(
        () =>
            (colaboradores.find((c) => String(c.id) === String(colaboradorInicialId)) || colaboradores[0])
                ?.codigoFuncionario || ""
    );
    const [treinamentoId, setTreinamentoId] = useState(treinamentosBase[0].id);
    const [dataRealizacao, setDataRealizacao] = useState(hoje.toISOString().slice(0, 10));
    const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
    const [sugestaoDataArquivo, setSugestaoDataArquivo] = useState(null);
    const [observacao, setObservacao] = useState("");
    const [salvandoCertificado, setSalvandoCertificado] = useState(false);
    const [arquivosLote, setArquivosLote] = useState([]);
    const [salvandoLote, setSalvandoLote] = useState(false);
    const [sincronizandoStorage, setSincronizandoStorage] = useState(false);
    const [resultadoLote, setResultadoLote] = useState("");
    const [datasRevisao, setDatasRevisao] = useState({});
    const [salvandoDatasId, setSalvandoDatasId] = useState("");
    const [certificadosAbertos, setCertificadosAbertos] = useState({});
    const [gruposCertificadosAbertos, setGruposCertificadosAbertos] = useState({});
    const [buscaCertificados, setBuscaCertificados] = useState("");
    const [filtroStatusCertificados, setFiltroStatusCertificados] = useState("Todos");
    const [exigenciasAbertas, setExigenciasAbertas] = useState(false);
    const [enviandoAlertaTst, setEnviandoAlertaTst] = useState(false);
    const [cardsTreinamentosRecolhidos, setCardsTreinamentosRecolhidos] = useState(carregarCardsTreinamentosRecolhidos);
    const [layoutCardsTreinamentos, setLayoutCardsTreinamentos] = useState(carregarCardsTreinamentosLayout);
    const [mostrarPersonalizarTreinamentos, setMostrarPersonalizarTreinamentos] = useState(false);
    const [cardArrastandoTreinamento, setCardArrastandoTreinamento] = useState("");
    const [cardDestinoTreinamento, setCardDestinoTreinamento] = useState("");

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("treinamentosCardsRecolhidos", JSON.stringify(cardsTreinamentosRecolhidos));
    }, [cardsTreinamentosRecolhidos]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("treinamentosCardsLayout", JSON.stringify(layoutCardsTreinamentos));
    }, [layoutCardsTreinamentos]);

    const alternarCardTreinamento = (chave) => {
        setCardsTreinamentosRecolhidos((atual) => ({
            ...atual,
            [chave]: !atual[chave],
        }));
    };

    const moverCardTreinamento = (chave, direcao) => {
        setLayoutCardsTreinamentos((atual) => {
            const normalizado = normalizarLayoutCardsTreinamentos(atual);
            const ordem = [...normalizado.ordem];
            const indice = ordem.indexOf(chave);
            const novoIndice = indice + direcao;

            if (indice < 0 || novoIndice < 0 || novoIndice >= ordem.length) return normalizado;

            [ordem[indice], ordem[novoIndice]] = [ordem[novoIndice], ordem[indice]];
            return { ...normalizado, ordem };
        });
    };

    const reposicionarCardTreinamento = (chaveOrigem, chaveDestino) => {
        if (!chaveOrigem || !chaveDestino || chaveOrigem === chaveDestino) return;

        setLayoutCardsTreinamentos((atual) => {
            const normalizado = normalizarLayoutCardsTreinamentos(atual);
            const ordemSemOrigem = normalizado.ordem.filter((chave) => chave !== chaveOrigem);
            const indiceDestino = ordemSemOrigem.indexOf(chaveDestino);

            if (indiceDestino < 0) return normalizado;

            const novaOrdem = [...ordemSemOrigem];
            novaOrdem.splice(indiceDestino, 0, chaveOrigem);
            return { ...normalizado, ordem: novaOrdem };
        });
    };

    const iniciarArrastoCardTreinamento = (evento, chave) => {
        setCardArrastandoTreinamento(chave);
        setCardDestinoTreinamento("");
        evento.dataTransfer.effectAllowed = "move";
        evento.dataTransfer.setData("text/plain", chave);
    };

    const soltarCardTreinamento = (evento, chaveDestino) => {
        evento.preventDefault();
        const chaveOrigem = evento.dataTransfer.getData("text/plain") || cardArrastandoTreinamento;
        reposicionarCardTreinamento(chaveOrigem, chaveDestino);
        setCardArrastandoTreinamento("");
        setCardDestinoTreinamento("");
    };

    const alterarTamanhoCardTreinamento = (chave, tamanho) => {
        setLayoutCardsTreinamentos((atual) => {
            const normalizado = normalizarLayoutCardsTreinamentos(atual);
            return {
                ...normalizado,
                tamanhos: {
                    ...normalizado.tamanhos,
                    [chave]: tamanho,
                },
            };
        });
    };

    const abrirTodosCardsTreinamentos = () => {
        setCardsTreinamentosRecolhidos({ filtros: false, lancamento: false, alertas: false, base: false });
    };

    const recolherTodosCardsTreinamentos = () => {
        setCardsTreinamentosRecolhidos({ filtros: true, lancamento: true, alertas: true, base: true });
    };

    const restaurarPainelTreinamentos = () => {
        setCardsTreinamentosRecolhidos(cardsTreinamentosPadrao);
        setLayoutCardsTreinamentos(normalizarLayoutCardsTreinamentos());
    };

    const colabSelecionado =
        colaboradores.find((c) => String(c.codigoFuncionario) === String(colabId)) ||
        colaboradores.find((c) => String(c.id) === String(colaboradorInicialId)) ||
        colaboradores[0] ||
        null;

    const colabSelecionadoId = colabSelecionado?.id || "";
    const colabSelecionadoCodigo = colabSelecionado?.codigoFuncionario || "";
    const avaliacaoSelecionado = colabSelecionado ? avaliarTreinamentosColaborador(colabSelecionado) : null;
    const treinamentosDisponiveis = avaliacaoSelecionado?.itens?.length
        ? avaliacaoSelecionado.itens.map((item) => item.treinamento).filter(Boolean)
        : treinamentosBase;

    const treinamentoSelecionadoId = treinamentosDisponiveis.some((item) => Number(item.id) === Number(treinamentoId))
        ? Number(treinamentoId)
        : Number(treinamentosDisponiveis[0]?.id || treinamentoId);

    const vencimento = calcularVencimentoTreinamento(
        treinamentoSelecionadoId || treinamentosBase[0].id,
        dataRealizacao
    );

    const alterarColaboradorCertificado = (novoColaboradorCodigo) => {
        const novoColaborador = colaboradores.find((c) => String(c.codigoFuncionario) === String(novoColaboradorCodigo));
        const novaAvaliacao = novoColaborador ? avaliarTreinamentosColaborador(novoColaborador) : null;
        const primeiroTreinamento = novaAvaliacao?.itens?.[0]?.treinamento?.id || treinamentosBase[0].id;

        setColabId(String(novoColaboradorCodigo));
        setTreinamentoId(Number(primeiroTreinamento));
    };

    const adicionarTreinamento = async () => {
        if (!colabSelecionadoId) {
            alert("Cadastre um colaborador primeiro.");
            return;
        }

        if (!arquivoSelecionado) {
            alert("Selecione o arquivo do certificado antes de salvar.");
            return;
        }

        setSalvandoCertificado(true);

        const ok = await onSalvarCertificado({
            colaboradorCodigo: String(colabSelecionado?.codigoFuncionario || ""),
            colaborador: colabSelecionado,
            treinamentoId: Number(treinamentoSelecionadoId),
            dataRealizacao,
            dataVencimento: vencimento,
            arquivo: arquivoSelecionado,
            arquivoNome: arquivoSelecionado.name,
            observacao: observacao.trim(),
        });

        setSalvandoCertificado(false);

        if (ok) {
            setArquivoSelecionado(null);
            setSugestaoDataArquivo(null);
            setObservacao("");
        }
    };

    const prepararArquivosLote = async (listaArquivos) => {
        const arquivos = Array.from(listaArquivos || []);

        if (!validarListaArquivosAntesUpload(arquivos, "documentoSimples")) {
            setArquivosLote([]);
            return;
        }

        if (!colabSelecionado?.codigoFuncionario) {
            alert("Selecione o colaborador antes de enviar documentos em massa.");
            return;
        }

        const preparados = await prepararArquivosTreinamentoLote({
            listaArquivos: arquivos,
            colaboradores,
            colabSelecionado,
            dataRealizacao,
        });

        setArquivosLote(preparados);
        setResultadoLote("");
    };

    const alterarColaboradorArquivoLote = (arquivoId, colaboradorCodigo) => {
        setArquivosLote((atual) => atualizarColaboradorArquivoLote(atual, arquivoId, colaboradorCodigo));
    };

    const alterarTreinamentoArquivoLote = (arquivoId, treinamentoId) => {
        setArquivosLote((atual) => atualizarTreinamentoArquivoLote(atual, arquivoId, treinamentoId, dataRealizacao));
    };

    const alterarDataArquivoLote = (arquivoId, data) => {
        setArquivosLote((atual) => atualizarDataArquivoLote(atual, arquivoId, data));
    };

    const selecionarArquivoCertificado = async (arquivo) => {
        setArquivoSelecionado(null);
        setSugestaoDataArquivo(null);

        if (!arquivo) return;

        if (!validarArquivoAntesUpload(arquivo, "documentoSimples")) return;

        setArquivoSelecionado(arquivo);

        const sugestao = await detectarDataEmissaoArquivo(arquivo);

        setSugestaoDataArquivo(sugestao);

        if (sugestao.data) {
            setDataRealizacao(sugestao.data);
        }
    };

    const removerArquivoLote = (arquivoId) => {
        setArquivosLote((atual) => atual.filter((item) => item.id !== arquivoId));
    };

    const sincronizarArquivosDoStorage = async () => {
        if (!onSincronizarStorage) return;

        setSincronizandoStorage(true);
        setResultadoLote("");

        const resultado = await onSincronizarStorage();

        setResultadoLote(resultado || "Sincronização concluída.");
        setSincronizandoStorage(false);
    };

    const salvarCertificadosEmLote = async () => {
        if (!arquivosLote.length) {
            alert("Selecione os arquivos do lote.");
            return;
        }

        const incompletos = arquivosLote.filter(
            (item) =>
                !item.colaboradorCodigo ||
                !item.treinamentoId ||
                !item.dataRealizacao ||
                (!treinamentoSemValidade(item.treinamentoId) && !item.dataVencimento)
        );

        if (incompletos.length > 0) {
            alert("Antes de salvar, confira colaborador, treinamento e datas de todos os arquivos do lote.");
            return;
        }

        setSalvandoLote(true);
        setResultadoLote("");

        let salvos = 0;
        let falhas = 0;
        const erros = [];

        for (const item of arquivosLote) {
            const colaboradorDoArquivo = colaboradores.find((c) => String(c.codigoFuncionario) === String(item.colaboradorCodigo));

            const ok = await onSalvarCertificado({
                colaboradorCodigo: String(item.colaboradorCodigo || ""),
                colaborador: colaboradorDoArquivo,
                treinamentoId: Number(item.treinamentoId),
                dataRealizacao: item.dataRealizacao,
                dataVencimento: item.dataVencimento,
                arquivo: item.arquivo,
                arquivoNome: item.arquivo.name,
                observacao: observacao.trim() || "Enviado em lote com distribuição automática por nome do arquivo",
            });

            if (ok) {
                salvos += 1;
            } else {
                falhas += 1;
                erros.push(item.arquivo.name);
            }
        }

        setSalvandoLote(false);
        setResultadoLote(
            `${salvos} certificado(s) salvo(s) e distribuído(s) por treinamento. ${falhas} falha(s).${erros.length ? ` Falhas: ${erros.join(", ")}` : ""
            }`
        );

        if (falhas === 0) {
            setArquivosLote([]);
            setObservacao("");
        }
    };

    const documentos = colaboradores.flatMap((c) =>
        (c.treinamentos || []).map((t) => ({ ...t, colaborador: c, treinamento: obterTreinamento(t.treinamentoId) }))
    );

    const documentosFiltrados = documentos.filter((documento) => {
        const vencimentoFiltro = datasRevisao[documento.id]?.vencimento ?? documento.vencimento ?? "";
        const status = statusDocumento(vencimentoFiltro, treinamentoSemValidade(documento.treinamentoId));
        const termo = normalizarTextoBusca(buscaCertificados);

        const textoBusca = normalizarTextoBusca(
            `${documento.colaborador?.nome || ""} ${documento.colaborador?.empresaExibicao || documento.colaborador?.empresa || ""} ${documento.colaborador?.codigoFuncionario || ""} ${documento.treinamento?.nome || ""} ${documento.arquivo || ""} ${status.texto || ""}`
        );

        const bateBusca = !termo || textoBusca.includes(termo);
        const bateStatus =
            filtroStatusCertificados === "Todos" ||
            (filtroStatusCertificados === "Em dia" && ["emdia", "semvalidade"].includes(status.chave)) ||
            (filtroStatusCertificados === "A vencer" && status.chave === "vencendo") ||
            (filtroStatusCertificados === "Vencido" && status.chave === "vencido");

        return bateBusca && bateStatus;
    });

    const documentosPorColaborador = colaboradores
        .map((colaborador) => {
            const avaliacao = avaliarTreinamentosColaborador(colaborador);
            const termo = normalizarTextoBusca(buscaCertificados);
            const certificadosDoColaborador = documentosFiltrados.filter(
                (documento) => String(documento.colaborador?.id) === String(colaborador.id)
            );

            const pendentesDoColaborador = avaliacao.itens
                .filter((item) => item.status.chave === "pendente")
                .filter((item) => {
                    const textoBusca = normalizarTextoBusca(
                        `${colaborador.nome || ""} ${colaborador.empresaExibicao || colaborador.empresa || ""} ${colaborador.codigoFuncionario || ""} ${item.treinamento?.nome || ""} pendente faltando`
                    );

                    const bateBusca = !termo || textoBusca.includes(termo);
                    const bateStatus = filtroStatusCertificados === "Todos" || filtroStatusCertificados === "Pendentes";

                    return bateBusca && bateStatus;
                });

            return {
                colaborador,
                certificados: certificadosDoColaborador,
                pendentes: pendentesDoColaborador,
                avaliacao,
            };
        })
        .filter((grupo) => {
            if (filtroStatusCertificados === "Pendentes") return grupo.pendentes.length > 0;

            return grupo.certificados.length > 0 || grupo.pendentes.length > 0;
        });

    const enviarDocumentoPendente = (colaborador, treinamento) => {
        setColabId(colaborador.codigoFuncionario);
        setTreinamentoId(Number(treinamento.id));
        setArquivoSelecionado(null);
        setSugestaoDataArquivo(null);
        setObservacao("");

        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const totalPorStatusCertificados = documentos.reduce(
        (acc, documento) => {
            const status = statusDocumento(documento.vencimento, treinamentoSemValidade(documento.treinamentoId));

            if (status.chave === "vencido") acc.vencidos += 1;
            else if (status.chave === "vencendo") acc.aVencer += 1;
            else acc.emDia += 1;

            return acc;
        },
        {
            emDia: 0,
            aVencer: 0,
            vencidos: 0,
            pendentes: colaboradores.reduce(
                (total, colaborador) => total + avaliarTreinamentosColaborador(colaborador).pendentes.length,
                0
            ),
        }
    );


    const alertasTstPorEmpresa = useMemo(() => {
        const grupos = {};

        colaboradores.forEach((colaborador) => {
            (colaborador.treinamentos || []).forEach((certificado) => {
                const dias = diasParaVencer(certificado.vencimento);

                if (dias === null || dias > 30) return;

                const tipoAlerta = dias < 0 ? "vencido" : "a vencer";
                const empresaNome = colaborador.empresaExibicao || colaborador.empresa || "Empresa não informada";
                const chave = colaborador.empresaId || empresaNome;
                const treinamento = obterTreinamento(certificado.treinamentoId);

                if (!grupos[chave]) {
                    grupos[chave] = {
                        empresa: empresaNome,
                        tstResponsavel: colaborador.empresaTstResponsavel || "",
                        tstEmail: emailTstDaEmpresa(colaborador),
                        itens: [],
                    };
                }

                grupos[chave].itens.push({
                    colaborador: colaborador.nome,
                    codigo: colaborador.codigoFuncionario,
                    funcao: colaborador.funcao,
                    situacaoObra: colaborador.statusMobilizacao || obterStatusInicialColaborador(),
                    statusColaborador: statusGeral(colaborador).texto,
                    empresa: empresaNome,
                    treinamento: certificado.nomeTreinamento || treinamento.nome,
                    realizacao: certificado.realizado || "",
                    vencimento: certificado.vencimento,
                    arquivo: certificado.arquivo || certificado.arquivoNome || "",
                    dias,
                    tipoAlerta,
                });
            });
        });

        return Object.values(grupos).sort((a, b) => a.empresa.localeCompare(b.empresa));
    }, [colaboradores]);

    const montarAvisoAlertaTst = (grupo) => {
        const destinatario = normalizarEmailDestinatario(grupo.tstEmail);

        const itensOrdenados = [...(grupo.itens || [])].sort((a, b) => a.dias - b.dias);
        const totalVencidos = itensOrdenados.filter((item) => item.dias < 0).length;
        const totalAVencer = itensOrdenados.filter((item) => item.dias >= 0).length;

        const assunto = `Aviso SST - ${totalVencidos} vencido(s) e ${totalAVencer} a vencer - ${grupo.empresa}`;

        const linhas = itensOrdenados
            .map((item, index) => {
                const statusPrazo =
                    item.dias < 0
                        ? `VENCIDO HÁ ${Math.abs(item.dias)} DIA(S)`
                        : `A VENCER EM ${item.dias} DIA(S)`;

                return [
                    `${index + 1}. COLABORADOR: ${item.colaborador}`,
                    `Código: ${item.codigo || "-"}`,
                    `Função: ${item.funcao || "-"}`,
                    `Situação na obra: ${item.situacaoObra || "-"}`,
                    `Status automático: ${item.statusColaborador || "-"}`,
                    `Empresa: ${item.empresa || grupo.empresa}`,
                    `Documento/Treinamento: ${item.treinamento}`,
                    `Data de elaboração/realização: ${item.realizacao ? formatDate(item.realizacao) : "Não informada"}`,
                    `Data de vencimento: ${formatDate(item.vencimento)}`,
                    `Status: ${statusPrazo}`,
                    `Arquivo: ${item.arquivo || "Não informado"}`,
                ].join("\n");
            })
            .join("\n\n");

        const corpo = [
            `Olá${grupo.tstResponsavel ? `, ${grupo.tstResponsavel}` : ""}.`,
            "",
            "Segue aviso automático de documentos/treinamentos SST vencidos ou com vencimento previsto para os próximos 30 dias.",
            "",
            `Empresa: ${grupo.empresa}`,
            `TST responsável: ${grupo.tstResponsavel || "Não informado"}`,
            `Resumo: ${totalVencidos} vencido(s) e ${totalAVencer} a vencer.`,
            "",
            linhas,
            "",
            "Solicitamos regularizar os documentos vencidos e programar a renovação dos próximos vencimentos para evitar bloqueio de atividade.",
            "",
            "Atenciosamente,",
            "Sistema de Controle SST QR",
        ].join("\n");

        return { destinatario, assunto, corpo };
    };

    const copiarAvisoAlertaTst = async (grupo) => {
        const { assunto, corpo } = montarAvisoAlertaTst(grupo);
        const texto = `${assunto}\n\n${corpo}`;

        try {
            await navigator.clipboard.writeText(texto);
            alert("Aviso copiado. Cole o conteúdo no e-mail ou WhatsApp do TST.");
        } catch {
            window.prompt("Copie o aviso abaixo:", texto);
        }
    };

    const abrirEmailAlertaTst = async (grupo) => {
        const { destinatario, assunto, corpo } = montarAvisoAlertaTst(grupo);

        if (!destinatario) {
            alert("Cadastre o e-mail do Técnico de Segurança responsável na empresa antes de enviar o aviso.");
            return;
        }

        const mailtoUrl = `mailto:${destinatario}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;

        try {
            await navigator.clipboard.writeText(`${assunto}\n\n${corpo}`);
        } catch {
            // Se o navegador bloquear a cópia automática, apenas tenta abrir o e-mail.
        }

        const link = document.createElement("a");

        link.href = mailtoUrl;
        link.target = "_self";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.setTimeout(() => {
            alert("Se o e-mail não abrir, verifique se existe aplicativo de e-mail padrão configurado no computador. O aviso também foi copiado para a área de transferência quando permitido pelo navegador.");
        }, 700);
    };


    const enviarEmailAlertaTstAutomatico = async (grupo) => {
        const { destinatario, assunto } = montarAvisoAlertaTst(grupo);

        if (!destinatario) {
            alert("Cadastre o e-mail do Técnico de Segurança responsável na empresa antes de enviar o aviso.");
            return;
        }

        setEnviandoAlertaTst(true);

        try {
            const itens = [...(grupo.itens || [])].sort((a, b) => a.dias - b.dias).map((item) => ({
                colaborador: item.colaborador,
                codigo: item.codigo || "-",
                funcao: item.funcao || "-",
                situacaoObra: item.situacaoObra || "-",
                treinamento: item.treinamento,
                realizacao: item.realizacao ? formatDate(item.realizacao) : "Não informada",
                vencimento: formatDate(item.vencimento),
                dias: item.dias,
                arquivo: item.arquivo || "Não informado",
            }));

            const { data, error } = await supabase.functions.invoke(FUNCAO_EMAIL_ALERTA_TST, {
                body: {
                    para: destinatario,
                    assunto,
                    empresa: grupo.empresa,
                    tstResponsavel: grupo.tstResponsavel,
                    tstEmail: destinatario,
                    itens,
                },
            });

            if (error || data?.ok === false) {
                await onRegistrarEmailEnviado?.({
                    empresaId: grupo.empresaId || null,
                    colaboradorId: null,
                    documentoId: null,
                    destinatario,
                    assunto,
                    tipoAlerta: "Alerta TST por empresa",
                    documento: itens.map((item) => item.treinamento).filter(Boolean).join(" | ").slice(0, 500),
                    statusEnvio: "Erro",
                    erro: error?.message || data?.erro || `Falha na função ${FUNCAO_EMAIL_ALERTA_TST}.`,
                });
                alert(`Erro ao enviar e-mail pela aba Treinamentos: ${error?.message || data?.erro || `Falha na função ${FUNCAO_EMAIL_ALERTA_TST}.`}\n\nConfirme se a Edge Function está publicada e se as secrets GMAIL_USER e GMAIL_APP_PASSWORD estão configuradas.`);
                return;
            }

            await onRegistrarEmailEnviado?.({
                empresaId: grupo.empresaId || null,
                colaboradorId: null,
                documentoId: null,
                destinatario,
                assunto,
                tipoAlerta: "Alerta TST por empresa",
                documento: itens.map((item) => item.treinamento).filter(Boolean).join(" | ").slice(0, 500),
                statusEnvio: "Sucesso",
                erro: "",
            });

            alert(`Aviso enviado com sucesso para ${destinatario}.`);
        } catch (error) {
            await onRegistrarEmailEnviado?.({
                empresaId: grupo.empresaId || null,
                colaboradorId: null,
                documentoId: null,
                destinatario,
                assunto,
                tipoAlerta: "Alerta TST por empresa",
                documento: (grupo.itens || []).map((item) => item.treinamento).filter(Boolean).join(" | ").slice(0, 500),
                statusEnvio: "Erro",
                erro: error?.message || String(error),
            });
            alert(`Falha inesperada ao enviar e-mail: ${error?.message || String(error)}`);
        } finally {
            setEnviandoAlertaTst(false);
        }
    };

    const valoresRevisao = (doc) => ({
        realizado: datasRevisao[doc.id]?.realizado ?? doc.realizado ?? "",
        vencimento: datasRevisao[doc.id]?.vencimento ?? doc.vencimento ?? "",
    });

    const alterarDataRevisao = (doc, campo, valor) => {
        const docId = doc.id;

        setDatasRevisao((atual) => {
            const dadosAtuais = {
                realizado: atual[docId]?.realizado ?? doc.realizado ?? "",
                vencimento: atual[docId]?.vencimento ?? doc.vencimento ?? "",
                ...atual[docId],
            };

            const proximosDados = {
                ...dadosAtuais,
                [campo]: valor,
            };

            if (campo === "realizado") {
                const vencimentoAutomatico = calcularVencimentoTreinamento(doc.treinamentoId, valor);
                proximosDados.vencimento = vencimentoAutomatico || "";
            }

            return {
                ...atual,
                [docId]: proximosDados,
            };
        });
    };

    const salvarDatasCertificado = async (doc) => {
        if (!onAtualizarDatasCertificado) return;

        const valores = valoresRevisao(doc);

        const exigeVencimento = !treinamentoSemValidade(doc.treinamentoId);

        if (!valores.realizado || (exigeVencimento && !valores.vencimento)) {
            alert(exigeVencimento ? "Informe a data de realização e o vencimento." : "Informe a data de realização/emissão.");
            return;
        }

        setSalvandoDatasId(doc.id);

        const ok = await onAtualizarDatasCertificado(doc, {
            realizado: valores.realizado,
            vencimento: valores.vencimento,
        });

        setSalvandoDatasId("");

        if (ok) {
            setDatasRevisao((atual) => {
                const copia = { ...atual };
                delete copia[doc.id];
                return copia;
            });
        }
    };

    const opcoesPainelTreinamentos = [
        { chave: "filtros", titulo: "Filtros da base", descricao: "Busca e status dos certificados." },
        { chave: "lancamento", titulo: "Lançar certificado", descricao: "Envio individual e em lote." },
        { chave: "alertas", titulo: "Alertas para TST", descricao: "Pendências agrupadas por empresa." },
        { chave: "base", titulo: "Base de certificados", descricao: "Lista e revisão dos documentos." },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header
                titulo="Treinamentos e certificados"
                subtitulo="Lançamento de certificados no Supabase, validade e controle automático de status."
                acao={
                    <div className="top-actions-nowrap">
                        <button
                            type="button"
                            onClick={() => setMostrarPersonalizarTreinamentos((valor) => !valor)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            Personalizar painel
                        </button>
                    </div>
                }
            />

            {mostrarPersonalizarTreinamentos && (
                <Card className="mb-5 border-blue-100 bg-blue-50/40">
                    <div className="treinamentos-personalizacao-dashboard">
                        <div className="min-w-0">
                            <div className="min-w-0">
                                <p className="text-xs font-black uppercase tracking-wide text-blue-700">Personalização</p>
                                <h2 className="mt-1 text-lg font-black text-slate-950">Painel de Treinamentos e certificados</h2>
                                <p className="mt-1 text-sm leading-6 text-slate-600">
                                    Arraste pelo ícone, altere a ordem, visibilidade e tamanho dos blocos principais.
                                </p>
                            </div>
                            <div className="mt-3 flex shrink-0 flex-wrap gap-2 lg:mt-0 lg:justify-end">
                                <button type="button" onClick={abrirTodosCardsTreinamentos} className="rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-blue-100 hover:bg-blue-50">Abrir todos</button>
                                <button type="button" onClick={recolherTodosCardsTreinamentos} className="rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-blue-100 hover:bg-blue-50">Recolher todos</button>
                                <button type="button" onClick={restaurarPainelTreinamentos} className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-blue-100 hover:bg-blue-50">
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Restaurar padrão
                                </button>
                            </div>
                        </div>

                        <div className="treinamentos-personalizacao-lista">
                            {layoutCardsTreinamentos.ordem.map((chave, indice) => {
                                const opcao = opcoesPainelTreinamentos.find((item) => item.chave === chave);
                                if (!opcao) return null;

                                const recolhido = cardsTreinamentosRecolhidos[chave];
                                const tamanhoAtual = layoutCardsTreinamentos.tamanhos[chave] || tamanhosCardsTreinamentosPadrao[chave] || "medio";

                                return (
                                    <div
                                        key={opcao.chave}
                                        draggable
                                        onDragStart={(evento) => iniciarArrastoCardTreinamento(evento, opcao.chave)}
                                        onDragOver={(evento) => {
                                            evento.preventDefault();
                                            setCardDestinoTreinamento(opcao.chave);
                                        }}
                                        onDragLeave={() => setCardDestinoTreinamento("")}
                                        onDrop={(evento) => soltarCardTreinamento(evento, opcao.chave)}
                                        onDragEnd={() => {
                                            setCardArrastandoTreinamento("");
                                            setCardDestinoTreinamento("");
                                        }}
                                        className={`treinamentos-personalizacao-item ${cardArrastandoTreinamento === opcao.chave ? "is-dragging" : ""} ${cardDestinoTreinamento === opcao.chave && cardArrastandoTreinamento !== opcao.chave ? "is-drop-target" : ""}`}
                                    >
                                        <div className="treinamentos-personalizacao-item-topo">
                                            <div className="flex min-w-0 flex-1 items-start gap-3">
                                                <span className="treinamentos-drag-handle rounded-xl bg-white p-2 text-slate-500 ring-1 ring-blue-100" title="Arraste para mudar a posição">
                                                    <GripVertical className="h-4 w-4" />
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => alternarCardTreinamento(opcao.chave)}
                                                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                                                >
                                                    <span className={recolhido ? "rounded-xl bg-slate-50 p-2 text-slate-500 ring-1 ring-slate-100" : "rounded-xl bg-blue-50 p-2 text-blue-700 ring-1 ring-blue-100"}>
                                                        {recolhido ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block text-sm font-black text-blue-950">#{indice + 1}. {opcao.titulo}</span>
                                                        <span className="mt-0.5 block text-xs leading-snug text-slate-500">{opcao.descricao}</span>
                                                    </span>
                                                </button>
                                            </div>

                                            <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => moverCardTreinamento(opcao.chave, -1)}
                                                    disabled={indice === 0}
                                                    className="rounded-xl bg-white px-2 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                    title="Subir card"
                                                >
                                                    ↑
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => moverCardTreinamento(opcao.chave, 1)}
                                                    disabled={indice === layoutCardsTreinamentos.ordem.length - 1}
                                                    className="rounded-xl bg-white px-2 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                    title="Descer card"
                                                >
                                                    ↓
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => alternarCardTreinamento(opcao.chave)}
                                                    className={recolhido ? "rounded-xl bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600 ring-1 ring-slate-200" : "rounded-xl bg-blue-100 px-3 py-1 text-[11px] font-black text-blue-700 ring-1 ring-blue-200"}
                                                >
                                                    {recolhido ? "RECOLHIDO" : "VISÍVEL"}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="treinamentos-size-grid">
                                            {opcoesTamanhoCardTreinamento.map((tamanho) => (
                                                <button
                                                    key={tamanho.valor}
                                                    type="button"
                                                    onClick={() => alterarTamanhoCardTreinamento(opcao.chave, tamanho.valor)}
                                                    className={tamanhoAtual === tamanho.valor ? "treinamentos-size-option is-active" : "treinamentos-size-option"}
                                                >
                                                    {tamanho.label}
                                                    <span>{tamanho.descricao}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Card>
            )}

            <div className="treinamentos-layout-grid">
                {layoutCardsTreinamentos.ordem.map((chave, indice) => {
                    const tamanho = layoutCardsTreinamentos.tamanhos[chave] || tamanhosCardsTreinamentosPadrao[chave] || "medio";
                    const classePainel = `treinamentos-layout-card treinamentos-layout-card--${tamanho}`;
                    const estiloPainel = { order: indice };

                    if (chave === "filtros") {
                        return (
                            <div key={chave} className={classePainel} style={estiloPainel}>
                                <Card className="h-full">
                                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                                        <div>
                                            <h2 className="text-lg font-bold text-slate-950">Filtros da base de certificados</h2>
                                            <p className="mt-1 text-sm text-slate-500">Pesquise e filtre os certificados sem abrir todos os grupos manualmente.</p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => alternarCardTreinamento("filtros")}
                                            className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                                        >
                                            {cardsTreinamentosRecolhidos.filtros ? "Abrir filtros" : "Recolher filtros"}
                                        </button>
                                    </div>

                                    {!cardsTreinamentosRecolhidos.filtros && (
                                        <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_220px]">
                                            <div className="relative">
                                                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    value={buscaCertificados}
                                                    onChange={(e) => setBuscaCertificados(e.target.value)}
                                                    placeholder="Pesquisar certificados por colaborador, empresa, código, treinamento ou arquivo"
                                                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                                />
                                            </div>

                                            <select
                                                value={filtroStatusCertificados}
                                                onChange={(e) => setFiltroStatusCertificados(e.target.value)}
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                            >
                                                <option value="Todos">Todos os status</option>
                                                <option value="Pendentes">Pendentes ({totalPorStatusCertificados.pendentes})</option>
                                                <option value="Em dia">Em dia ({totalPorStatusCertificados.emDia})</option>
                                                <option value="A vencer">A vencer ({totalPorStatusCertificados.aVencer})</option>
                                                <option value="Vencido">Vencidos ({totalPorStatusCertificados.vencidos})</option>
                                            </select>
                                        </div>
                                    )}

                                    {cardsTreinamentosRecolhidos.filtros && (
                                        <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                                            Card recolhido. Clique em Abrir filtros para pesquisar ou alterar o status exibido.
                                        </p>
                                    )}
                                </Card>
                            </div>
                        );
                    }

                    if (chave === "lancamento") {
                        return (
                            <div key={chave} className={classePainel} style={estiloPainel}>
                                <FormularioLancamentoCertificado
                                    colaboradores={colaboradores}
                                    colabSelecionadoCodigo={colabSelecionadoCodigo}
                                    onAlterarColaboradorCertificado={alterarColaboradorCertificado}
                                    treinamentosDisponiveis={treinamentosDisponiveis}
                                    treinamentoSelecionadoId={treinamentoSelecionadoId}
                                    setTreinamentoId={setTreinamentoId}
                                    avaliacaoSelecionado={avaliacaoSelecionado}
                                    exigenciasAbertas={exigenciasAbertas}
                                    setExigenciasAbertas={setExigenciasAbertas}
                                    dataRealizacao={dataRealizacao}
                                    setDataRealizacao={setDataRealizacao}
                                    vencimento={vencimento}
                                    observacao={observacao}
                                    setObservacao={setObservacao}
                                    arquivoSelecionado={arquivoSelecionado}
                                    selecionarArquivoCertificado={selecionarArquivoCertificado}
                                    sugestaoDataArquivo={sugestaoDataArquivo}
                                    salvandoCertificado={salvandoCertificado}
                                    adicionarTreinamento={adicionarTreinamento}
                                    arquivosLote={arquivosLote}
                                    prepararArquivosLote={prepararArquivosLote}
                                    sincronizarArquivosDoStorage={sincronizarArquivosDoStorage}
                                    sincronizandoStorage={sincronizandoStorage}
                                    resultadoLote={resultadoLote}
                                    colabSelecionado={colabSelecionado}
                                    removerArquivoLote={removerArquivoLote}
                                    alterarColaboradorArquivoLote={alterarColaboradorArquivoLote}
                                    alterarTreinamentoArquivoLote={alterarTreinamentoArquivoLote}
                                    alterarDataArquivoLote={alterarDataArquivoLote}
                                    treinamentosBase={treinamentosBase}
                                    salvarCertificadosEmLote={salvarCertificadosEmLote}
                                    salvandoLote={salvandoLote}
                                    recolhido={cardsTreinamentosRecolhidos.lancamento}
                                    onAlternarRecolhido={() => alternarCardTreinamento("lancamento")}
                                />
                            </div>
                        );
                    }

                    if (chave === "alertas") {
                        return (
                            <div key={chave} className={classePainel} style={estiloPainel}>
                                <AlertasTstTreinamentos
                                    alertasTstPorEmpresa={alertasTstPorEmpresa}
                                    enviandoAlertaTst={enviandoAlertaTst}
                                    onEnviarEmailAlertaTstAutomatico={enviarEmailAlertaTstAutomatico}
                                    onCopiarAvisoAlertaTst={copiarAvisoAlertaTst}
                                    recolhido={cardsTreinamentosRecolhidos.alertas}
                                    onAlternarRecolhido={() => alternarCardTreinamento("alertas")}
                                />
                            </div>
                        );
                    }

                    if (chave === "base") {
                        return (
                            <div key={chave} className={classePainel} style={estiloPainel}>
                                <BaseCertificadosTreinamentos
                                    documentos={documentos}
                                    documentosFiltrados={documentosFiltrados}
                                    documentosPorColaborador={documentosPorColaborador}
                                    totalPorStatusCertificados={totalPorStatusCertificados}
                                    gruposCertificadosAbertos={gruposCertificadosAbertos}
                                    setGruposCertificadosAbertos={setGruposCertificadosAbertos}
                                    certificadosAbertos={certificadosAbertos}
                                    setCertificadosAbertos={setCertificadosAbertos}
                                    valoresRevisao={valoresRevisao}
                                    alterarDataRevisao={alterarDataRevisao}
                                    salvarDatasCertificado={salvarDatasCertificado}
                                    salvandoDatasId={salvandoDatasId}
                                    enviarDocumentoPendente={enviarDocumentoPendente}
                                    onVisualizarCertificado={onVisualizarCertificado}
                                    onExcluirCertificado={onExcluirCertificado}
                                    recolhido={cardsTreinamentosRecolhidos.base}
                                    onAlternarRecolhido={() => alternarCardTreinamento("base")}
                                />
                            </div>
                        );
                    }

                    return null;
                })}
            </div>
        </motion.div>
    );
}



