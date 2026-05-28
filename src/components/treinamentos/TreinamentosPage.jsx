/* eslint-disable no-unused-vars */
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
    ChevronDown,
    ChevronUp,
    FileText,
    Filter,
    Search,
    Upload,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { Card, Header, StatusPill } from "../commonComponents";
import { FileUploadAviso, validarArquivoAntesUpload, validarListaArquivosAntesUpload } from "../FileUploadAviso";
import { AlertasTstTreinamentos } from "./AlertasTstTreinamentos";
import {
    avaliarTreinamentosColaborador,
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
    classNames,
} from "../../utils/sstUtils";

const hoje = new Date();

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

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header titulo="Treinamentos e certificados" subtitulo="Lançamento de certificados no Supabase, validade e controle automático de status." />

            <Card className="mb-5">
                <div className="grid gap-3 xl:grid-cols-[1fr_220px]">
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
            </Card>

            <div className="grid items-start gap-6 xl:grid-cols-[0.75fr_1.25fr]">
                <Card>
                    <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                        <Upload className="h-4 w-4" />
                        Lançar certificado
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        O arquivo será salvo no Supabase Storage usando o código do funcionário e o registro ficará vinculado ao UUID real do colaborador.
                    </p>

                    <div className="mt-5 space-y-3">
                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Colaborador</label>
                            <select
                                value={colabSelecionadoCodigo}
                                onChange={(e) => {
                                    const novoColaboradorCodigo = e.target.value;
                                    const novoColaborador = colaboradores.find((c) => String(c.codigoFuncionario) === String(novoColaboradorCodigo));
                                    const novaAvaliacao = novoColaborador ? avaliarTreinamentosColaborador(novoColaborador) : null;
                                    const primeiroTreinamento = novaAvaliacao?.itens?.[0]?.treinamento?.id || treinamentosBase[0].id;

                                    setColabId(String(novoColaboradorCodigo));
                                    setTreinamentoId(Number(primeiroTreinamento));
                                }}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                            >
                                {colaboradores.length === 0 && <option value="">Nenhum colaborador cadastrado</option>}
                                {colaboradores.map((c) => (
                                    <option key={c.id} value={c.codigoFuncionario}>
                                        {c.nome} — {c.empresaExibicao || c.empresa} — {c.codigoFuncionario}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Treinamento / documento</label>
                            <select
                                value={treinamentoSelecionadoId}
                                onChange={(e) => setTreinamentoId(Number(e.target.value))}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                            >
                                {treinamentosDisponiveis.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.nome}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {avaliacaoSelecionado && (
                            <div className="rounded-2xl bg-slate-50 p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                            Documentos exigidos para a função: {avaliacaoSelecionado.matriz.rotulo}
                                        </p>
                                        <p className="mt-1 text-[11px] text-slate-400">
                                            {avaliacaoSelecionado.emDia.length} em dia · {avaliacaoSelecionado.pendentes.length} pendente(s) · {avaliacaoSelecionado.vencendo.length} a vencer · {avaliacaoSelecionado.vencidos.length} vencido(s)
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setExigenciasAbertas((valor) => !valor)}
                                        className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                                    >
                                        {exigenciasAbertas ? (
                                            <>
                                                <ChevronUp className="h-4 w-4" />
                                                Recolher exigências
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown className="h-4 w-4" />
                                                Ver exigências
                                            </>
                                        )}
                                    </button>
                                </div>

                                {exigenciasAbertas && (
                                    <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto pr-1 scrollbar-discreta">
                                        {avaliacaoSelecionado.itens.map((item) => (
                                            <div key={item.treinamento.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs">
                                                <span className="font-medium text-slate-700">{item.treinamento.nome}</span>
                                                <span className={classNames("rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1", item.status.classe)}>
                                                    {item.status.texto}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Realização / emissão</label>
                                <input
                                    type="date"
                                    value={dataRealizacao}
                                    onChange={(e) => setDataRealizacao(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Validade / vencimento</label>
                                <input
                                    type="date"
                                    value={vencimento}
                                    readOnly
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                />
                            </div>
                        </div>

                        <textarea
                            value={observacao}
                            onChange={(e) => setObservacao(e.target.value)}
                            placeholder="Observação opcional"
                            rows={3}
                            className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                        />

                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600 hover:bg-slate-100">
                            <Upload className="h-4 w-4" />
                            {arquivoSelecionado ? arquivoSelecionado.name : "Selecionar PDF ou imagem do certificado"}
                            <input
                                type="file"
                                accept="application/pdf,image/*"
                                className="hidden"
                                onChange={(e) => selecionarArquivoCertificado(e.target.files?.[0] || null)}
                            />
                        </label>
                        <FileUploadAviso arquivo={arquivoSelecionado} tipo="documentoSimples" />

                        {sugestaoDataArquivo && (
                            <div className={classNames(
                                "rounded-2xl px-3 py-2 text-xs font-medium ring-1",
                                sugestaoDataArquivo.data
                                    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                    : "bg-orange-50 text-orange-700 ring-orange-100"
                            )}>
                                {sugestaoDataArquivo.mensagem}
                            </div>
                        )}

                        <button
                            onClick={adicionarTreinamento}
                            disabled={salvandoCertificado}
                            className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {salvandoCertificado ? "Salvando no Supabase..." : "Salvar certificado no banco"}
                        </button>

                        <div className="mt-6 border-t border-slate-200 pt-5">
                            <div className="rounded-3xl bg-blue-50 p-4">
                                <h3 className="flex items-center gap-2 text-sm font-bold text-blue-900">
                                    <Upload className="h-4 w-4" />
                                    Envio em lote
                                </h3>
                                <p className="mt-1 text-xs text-blue-800/80">
                                    Selecione vários arquivos. O sistema tenta distribuir pelo nome do arquivo e identificar a data de emissão/realização no nome ou no conteúdo do PDF.
                                    Antes de salvar, confira colaborador, treinamento e data de cada documento.
                                </p>
                            </div>

                            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-300 bg-white px-4 py-4 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                                <Upload className="h-4 w-4" />
                                Selecionar vários certificados
                                <input
                                    type="file"
                                    accept="application/pdf,image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => prepararArquivosLote(e.target.files)}
                                />
                            </label>
                            <FileUploadAviso arquivos={arquivosLote.map((item) => item.arquivo)} tipo="documentoSimples" />

                            <button
                                type="button"
                                onClick={sincronizarArquivosDoStorage}
                                disabled={sincronizandoStorage}
                                className="mt-3 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {sincronizandoStorage ? "Sincronizando arquivos..." : "Sincronizar arquivos já enviados no Storage"}
                            </button>

                            {resultadoLote && arquivosLote.length === 0 && (
                                <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                                    {resultadoLote}
                                </div>
                            )}

                            {arquivosLote.length > 0 && (
                                <div className="mt-4 space-y-3">
                                    <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                                        <strong>Regra do lote:</strong> os arquivos serão vinculados ao colaborador selecionado
                                        {" "}<strong>{colabSelecionado?.nome}</strong>. O treinamento é identificado automaticamente pelo nome de cada arquivo.
                                        Confira qualquer item marcado como atenção antes de salvar.
                                    </div>

                                    <div className="max-h-96 space-y-2 overflow-y-auto pr-1 scrollbar-discreta">
                                        {arquivosLote.map((item) => (
                                            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                                                <div className="mb-2 flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-slate-800">
                                                            <FileText className="mr-1 inline h-4 w-4" />
                                                            {item.arquivo.name}
                                                        </p>
                                                        <p className={classNames(
                                                            "mt-1 text-xs font-medium",
                                                            item.status === "Treinamento identificado" ||
                                                                item.status === "Treinamento e data identificados" ||
                                                                item.status === "Conferido"
                                                                ? "text-emerald-700"
                                                                : "text-orange-700"
                                                        )}>
                                                            {item.status}
                                                        </p>
                                                        {item.sugestaoData?.mensagem && (
                                                            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                                                                {item.sugestaoData.mensagem}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => removerArquivoLote(item.id)}
                                                        className="rounded-xl bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                                                    >
                                                        Remover
                                                    </button>
                                                </div>

                                                <div className="grid gap-2">
                                                    <div>
                                                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Colaborador de destino</label>
                                                        <select
                                                            value={item.colaboradorCodigo}
                                                            onChange={(e) => alterarColaboradorArquivoLote(item.id, e.target.value)}
                                                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                                        >
                                                            <option value="">Selecione o colaborador</option>
                                                            {colaboradores.map((c) => (
                                                                <option key={c.id} value={c.codigoFuncionario}>
                                                                    {c.nome} — {c.empresaExibicao || c.empresa} — {c.codigoFuncionario}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Treinamento identificado</label>
                                                        <select
                                                            value={item.treinamentoId}
                                                            onChange={(e) => alterarTreinamentoArquivoLote(item.id, e.target.value)}
                                                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                                        >
                                                            <option value="">Selecione o treinamento</option>
                                                            {treinamentosBase.map((treinamento) => (
                                                                <option key={treinamento.id} value={treinamento.id}>
                                                                    {treinamento.nome}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="grid gap-2 sm:grid-cols-2">
                                                        <div>
                                                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Realização</label>
                                                            <input
                                                                type="date"
                                                                value={item.dataRealizacao}
                                                                onChange={(e) => alterarDataArquivoLote(item.id, e.target.value)}
                                                                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Vencimento</label>
                                                            <input
                                                                type="date"
                                                                value={item.dataVencimento}
                                                                readOnly
                                                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {resultadoLote && (
                                        <div className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                                            {resultadoLote}
                                        </div>
                                    )}

                                    <button
                                        onClick={salvarCertificadosEmLote}
                                        disabled={salvandoLote}
                                        className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {salvandoLote ? "Salvando lote..." : `Salvar ${arquivosLote.length} certificado(s) distribuído(s)`}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                <div className="space-y-6">
                    <AlertasTstTreinamentos
                        alertasTstPorEmpresa={alertasTstPorEmpresa}
                        enviandoAlertaTst={enviandoAlertaTst}
                        onEnviarEmailAlertaTstAutomatico={enviarEmailAlertaTstAutomatico}
                        onCopiarAvisoAlertaTst={copiarAvisoAlertaTst}
                    />

                    <Card className="self-start">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <h2 className="text-lg font-bold text-slate-950">Base de certificados</h2>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                                {documentosFiltrados.length} certificado(s) · {totalPorStatusCertificados.pendentes} pendente(s)
                            </span>
                        </div>

                        <div className="space-y-3">
                            {documentos.length === 0 && totalPorStatusCertificados.pendentes === 0 && (
                                <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center">
                                    <FileText className="mx-auto h-10 w-10 text-slate-300" />
                                    <h3 className="mt-3 font-bold text-slate-900">Nenhum certificado lançado ainda</h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Os certificados enviados aparecerão nesta base para revisão de validade e consulta.
                                    </p>
                                </div>
                            )}

                            {documentos.length > 0 && documentosPorColaborador.length === 0 && (
                                <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center">
                                    <Filter className="mx-auto h-10 w-10 text-slate-300" />
                                    <h3 className="mt-3 font-bold text-slate-900">Nenhum certificado encontrado</h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Ajuste a busca ou o filtro de status para localizar os certificados.
                                    </p>
                                </div>
                            )}

                            {documentosPorColaborador.map((grupo) => {
                                const colaborador = grupo.colaborador;
                                const certificados = grupo.certificados || [];
                                const pendentes = grupo.pendentes || [];
                                const grupoKey = String(colaborador?.id || colaborador?.codigoFuncionario || "sem-colaborador");
                                const grupoAberto = Boolean(gruposCertificadosAbertos[grupoKey]);

                                const resumoStatus = certificados.reduce(
                                    (acc, certificado) => {
                                        const valores = valoresRevisao(certificado);
                                        const status = statusDocumento(
                                            valores.vencimento || certificado.vencimento,
                                            treinamentoSemValidade(certificado.treinamentoId)
                                        );

                                        if (status.chave === "vencido") acc.vencidos += 1;
                                        else if (status.chave === "vencendo") acc.aVencer += 1;
                                        else acc.emDia += 1;

                                        return acc;
                                    },
                                    { emDia: 0, aVencer: 0, vencidos: 0 }
                                );

                                return (
                                    <div
                                        key={grupoKey}
                                        className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                                    >
                                        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Colaborador</p>
                                                <p className="mt-1 break-words text-lg font-bold leading-snug text-slate-950">
                                                    {colaborador.nome}
                                                </p>
                                                <p className="mt-1 break-words text-sm text-slate-500">
                                                    {colaborador.empresaExibicao || colaborador.empresa}
                                                </p>
                                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                                    Código: {colaborador.codigoFuncionario}
                                                </p>
                                            </div>

                                            <div className="flex flex-col gap-2 lg:items-end">
                                                <div className="flex flex-wrap gap-2 lg:justify-end">
                                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                                        {certificados.length} certificado(s)
                                                    </span>

                                                    {pendentes.length > 0 && (
                                                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                                                            {pendentes.length} faltando
                                                        </span>
                                                    )}

                                                    {resumoStatus.emDia > 0 && (
                                                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                                            {resumoStatus.emDia} em dia
                                                        </span>
                                                    )}

                                                    {resumoStatus.aVencer > 0 && (
                                                        <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-200">
                                                            {resumoStatus.aVencer} a vencer
                                                        </span>
                                                    )}

                                                    {resumoStatus.vencidos > 0 && (
                                                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                                                            {resumoStatus.vencidos} vencido(s)
                                                        </span>
                                                    )}
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setGruposCertificadosAbertos((atual) => ({
                                                            ...atual,
                                                            [grupoKey]: !atual[grupoKey],
                                                        }))
                                                    }
                                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                                                >
                                                    {grupoAberto ? (
                                                        <>
                                                            <ChevronUp className="h-4 w-4" />
                                                            Recolher treinamentos
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ChevronDown className="h-4 w-4" />
                                                            Ver treinamentos
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {grupoAberto && (
                                            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                                                {pendentes.length > 0 && (
                                                    <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-3">
                                                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                                            <div>
                                                                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                                                                    Documentos faltantes para envio
                                                                </p>
                                                                <p className="mt-1 text-[11px] text-blue-700">
                                                                    Clique em enviar para preencher automaticamente o colaborador e o treinamento no lançamento.
                                                                </p>
                                                            </div>

                                                            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-200">
                                                                {pendentes.length} pendente(s)
                                                            </span>
                                                        </div>

                                                        <div className="space-y-2">
                                                            {pendentes.map((item) => (
                                                                <div
                                                                    key={`pendente-${grupoKey}-${item.treinamento.id}`}
                                                                    className="flex flex-col justify-between gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-blue-100 lg:flex-row lg:items-center"
                                                                >
                                                                    <div className="min-w-0">
                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-blue-200">
                                                                                Pendente
                                                                            </span>
                                                                            <p className="break-words text-sm font-semibold text-slate-800">
                                                                                {item.treinamento.nome}
                                                                            </p>
                                                                        </div>
                                                                        <p className="mt-1 text-[11px] text-slate-500">
                                                                            Documento ainda não enviado para este colaborador.
                                                                        </p>
                                                                    </div>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => enviarDocumentoPendente(colaborador, item.treinamento)}
                                                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                                                                    >
                                                                        <Upload className="h-4 w-4" />
                                                                        Enviar documento
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {certificados.length === 0 && pendentes.length === 0 && (
                                                    <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                                                        Nenhum item encontrado para este colaborador com o filtro atual.
                                                    </div>
                                                )}

                                                {certificados.map((d, idx) => {
                                                    const valores = valoresRevisao(d);
                                                    const semValidade = treinamentoSemValidade(d.treinamentoId);
                                                    const statusAtual = statusDocumento(valores.vencimento || d.vencimento, semValidade);
                                                    const itemKey = String(d.id || `${d.colaborador.id}-${d.treinamentoId}-${idx}`);
                                                    const aberto = Boolean(certificadosAbertos[itemKey]);

                                                    return (
                                                        <div
                                                            key={itemKey}
                                                            className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100"
                                                        >
                                                            <div className="grid gap-3 lg:grid-cols-[1fr_150px] lg:items-start">
                                                                <div className="min-w-0">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <StatusPill status={statusAtual} small />
                                                                        <h3 className="break-words text-base font-bold leading-snug text-slate-900">
                                                                            {d.treinamento.nome}
                                                                        </h3>
                                                                    </div>

                                                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                                                        <FileText className="h-4 w-4 text-slate-400" />
                                                                        <span className="break-words">{d.arquivo || "Arquivo não informado"}</span>
                                                                    </div>

                                                                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                                                        <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
                                                                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Realização</p>
                                                                            <p className="text-xs font-semibold text-slate-700">{formatDate(valores.realizado)}</p>
                                                                        </div>

                                                                        <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
                                                                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Vencimento</p>
                                                                            <p className="text-xs font-semibold text-slate-700">
                                                                                {semValidade ? "Sem validade" : formatDate(valores.vencimento)}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex flex-col gap-2 lg:items-stretch">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setCertificadosAbertos((atual) => ({
                                                                                ...atual,
                                                                                [itemKey]: !atual[itemKey],
                                                                            }))
                                                                        }
                                                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                                                                    >
                                                                        {aberto ? (
                                                                            <>
                                                                                <ChevronUp className="h-4 w-4" />
                                                                                Ocultar datas
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <ChevronDown className="h-4 w-4" />
                                                                                Revisar datas
                                                                            </>
                                                                        )}
                                                                    </button>

                                                                    <button
                                                                        onClick={() => onVisualizarCertificado(d)}
                                                                        className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                                                                    >
                                                                        Abrir
                                                                    </button>

                                                                    <button
                                                                        onClick={() => onExcluirCertificado(d)}
                                                                        className="rounded-xl bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                                                                    >
                                                                        Excluir
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {aberto && (
                                                                <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                                                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_auto] xl:items-end">
                                                                        <div>
                                                                            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Realização</p>
                                                                            <input
                                                                                type="date"
                                                                                value={valores.realizado}
                                                                                onChange={(e) => alterarDataRevisao(d, "realizado", e.target.value)}
                                                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                                                                            />
                                                                        </div>

                                                                        <div>
                                                                            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Vencimento</p>
                                                                            {semValidade ? (
                                                                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
                                                                                    Sem validade
                                                                                </div>
                                                                            ) : (
                                                                                <input
                                                                                    type="date"
                                                                                    value={valores.vencimento}
                                                                                    onChange={(e) => alterarDataRevisao(d, "vencimento", e.target.value)}
                                                                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                                                                                />
                                                                            )}
                                                                        </div>

                                                                        <button
                                                                            type="button"
                                                                            onClick={() => salvarDatasCertificado(d)}
                                                                            disabled={salvandoDatasId === d.id}
                                                                            className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 disabled:opacity-60"
                                                                        >
                                                                            {salvandoDatasId === d.id ? "Salvando..." : "Salvar datas"}
                                                                        </button>
                                                                    </div>

                                                                    <p className="mt-3 text-xs leading-relaxed text-slate-400">
                                                                        {semValidade
                                                                            ? "Este documento não possui validade. Ao revisar, somente a data de realização/emissão será atualizada."
                                                                            : "Ao alterar a realização, o vencimento é recalculado automaticamente pela validade do treinamento."}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            </div>
        </motion.div>
    );
}



