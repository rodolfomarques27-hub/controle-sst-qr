/* eslint-disable no-unused-vars */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    ShieldCheck,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import {
    obterUltimaVerificacaoDocumental,
    verificarCertificadoTreinamento,
} from "../../services/documentosVerificacaoService";
import {
    detectarDataEmissaoArquivo,
    obterTreinamento,
    treinamentoSemValidade,
} from "../../services/colaboradorDocumentosService";
import ResultadoVerificacaoDocumento from "../documentos/ResultadoVerificacaoDocumento";

const ORIGEM_TIPO_CERTIFICADO = "certificado";
const ORIGEM_TABELA_CERTIFICADOS = "certificados";

const BUCKET_PADRAO_CERTIFICADOS = "certificados-treinamentos";

function obterBucketCertificado(certificado = {}) {
    return certificado.bucket ||
        certificado.bucketNome ||
        certificado.bucket_nome ||
        BUCKET_PADRAO_CERTIFICADOS;
}

function removerQueryStringCaminho(caminho = "") {
    return String(caminho || "").split("?")[0].trim();
}

function normalizarCaminhoStorageCertificado(caminhoInformado = "", bucket = BUCKET_PADRAO_CERTIFICADOS) {
    const texto = String(caminhoInformado || "").trim();

    if (!texto) return "";

    if (!/^https?:\/\//i.test(texto)) {
        return removerQueryStringCaminho(texto);
    }

    try {
        const url = new URL(texto);
        const path = decodeURIComponent(url.pathname || "");
        const marcadores = [
            `/storage/v1/object/public/${bucket}/`,
            `/storage/v1/object/sign/${bucket}/`,
            `/object/public/${bucket}/`,
            `/object/sign/${bucket}/`,
            `/${bucket}/`,
        ];

        for (const marcador of marcadores) {
            const indice = path.indexOf(marcador);

            if (indice >= 0) {
                return removerQueryStringCaminho(path.slice(indice + marcador.length));
            }
        }

        return removerQueryStringCaminho(path.split("/").pop() || "");
    } catch {
        return removerQueryStringCaminho(texto);
    }
}

function obterCaminhoStorageCertificado(certificado = {}) {
    const bucket = obterBucketCertificado(certificado);
    const caminho =
        certificado.caminhoStorage ||
        certificado.caminho_storage ||
        certificado.storagePath ||
        certificado.storage_path ||
        certificado.arquivoUrl ||
        certificado.arquivo_url ||
        certificado.urlDoArquivo ||
        certificado.url_do_arquivo ||
        "";

    return normalizarCaminhoStorageCertificado(caminho, bucket);
}

function obterMimeArquivoCertificado(certificado = {}, blob = null) {
    return certificado.mimeType ||
        certificado.mime_type ||
        certificado.tipoArquivo ||
        certificado.tipo_arquivo ||
        blob?.type ||
        "application/pdf";
}

function criarArquivoBrowserParaAnalise({ blob, nomeArquivo = "", mimeType = "" } = {}) {
    if (!blob) return null;

    const nome = nomeArquivo || "certificado.pdf";
    const tipo = mimeType || blob.type || "application/pdf";

    if (typeof File !== "undefined") {
        return new File([blob], nome, { type: tipo });
    }

    return blob;
}

async function baixarArquivoCertificadoParaAnalise({ certificado = {} } = {}) {
    const bucket = obterBucketCertificado(certificado);
    const caminho = obterCaminhoStorageCertificado(certificado);
    const nomeArquivo = obterNomeArquivoCertificado(certificado) || caminho.split("/").pop() || "certificado.pdf";

    if (!caminho) {
        return {
            arquivo: null,
            bucket,
            caminho,
            aviso: "Arquivo salvo sem caminho de Storage para baixar na reanálise.",
        };
    }

    const { data, error } = await supabase.storage
        .from(bucket)
        .download(caminho);

    if (error) {
        return {
            arquivo: null,
            bucket,
            caminho,
            aviso: `Não foi possível baixar o arquivo salvo para reanálise (${error.message}). A análise usará apenas os dados cadastrados.`,
        };
    }

    const arquivo = criarArquivoBrowserParaAnalise({
        blob: data,
        nomeArquivo,
        mimeType: obterMimeArquivoCertificado(certificado, data),
    });

    return {
        arquivo,
        bucket,
        caminho,
        aviso: "",
    };
}

function obterIdCertificado(certificado = {}) {
    return certificado.id ||
        certificado.certificado_id ||
        certificado.certificadoId ||
        certificado.documento_id ||
        certificado.documentoId ||
        "";
}

function obterStatusValidacaoCertificado(certificado = {}) {
    return certificado.statusValidacao ||
        certificado.status_validacao ||
        certificado.statusVerificacao ||
        certificado.status_verificacao ||
        "Pendente de verificação";
}

function converterStatusVerificacaoParaStatusCertificado(statusVerificacao = "") {
    const status = String(statusVerificacao || "").trim().toLowerCase();

    if (status === "aprovado") return "Aprovado";
    if (status === "atencao") return "Atenção";
    if (status === "revisao_manual") return "Revisão manual";
    if (status === "suspeito") return "Suspeito";
    if (status === "bloqueado") return "Bloqueado";
    if (status === "erro") return "Erro na verificação";

    return "Pendente de verificação";
}

function normalizarStatusPainel(status = "") {
    return String(status || "Pendente de verificação").trim();
}

function obterClassesStatus(status = "") {
    const normalizado = normalizarStatusPainel(status).toLowerCase();

    if (normalizado.includes("aprovado")) {
        return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    }

    if (normalizado.includes("atenção") || normalizado.includes("atencao") || normalizado.includes("revisão") || normalizado.includes("revisao")) {
        return "bg-amber-50 text-amber-700 ring-amber-200";
    }

    if (normalizado.includes("suspeito") || normalizado.includes("bloqueado") || normalizado.includes("erro")) {
        return "bg-red-50 text-red-700 ring-red-200";
    }

    return "bg-slate-100 text-slate-600 ring-slate-200";
}

function obterClassesRisco(nivelRisco = "") {
    const normalizado = String(nivelRisco || "").trim().toLowerCase();

    if (normalizado.includes("baixo")) {
        return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    }

    if (normalizado.includes("médio") || normalizado.includes("medio") || normalizado.includes("moderado")) {
        return "bg-amber-50 text-amber-700 ring-amber-200";
    }

    if (normalizado.includes("alto") || normalizado.includes("crítico") || normalizado.includes("critico")) {
        return "bg-red-50 text-red-700 ring-red-200";
    }

    return "bg-slate-100 text-slate-600 ring-slate-200";
}

function normalizarDataIso(valor = "") {
    if (!valor) return "";

    const texto = String(valor || "").trim();
    const matchIso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (matchIso) {
        return `${matchIso[1]}-${matchIso[2]}-${matchIso[3]}`;
    }

    const data = new Date(texto);

    if (Number.isNaN(data.getTime())) return "";

    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

function formatarDataPainel(valor = "", fallback = "Não informada") {
    const dataIso = normalizarDataIso(valor);

    if (!dataIso) return fallback;

    const [ano, mes, dia] = dataIso.split("-");

    return `${dia}/${mes}/${ano}`;
}

function formatarDataHoraPainel(valor = "") {
    if (!valor) return "Não informada";

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
        return formatarDataPainel(valor);
    }

    return data.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function obterDataRealizacaoCertificado(certificado = {}) {
    return certificado.realizado ||
        certificado.dataRealizacao ||
        certificado.data_realizacao ||
        certificado.data_emissao ||
        certificado.dataEmissao ||
        "";
}

function obterDataVencimentoCertificado(certificado = {}) {
    return certificado.vencimento ||
        certificado.dataVencimento ||
        certificado.data_vencimento ||
        "";
}

function obterNomeArquivoCertificado(certificado = {}) {
    return certificado.arquivoNome ||
        certificado.arquivo_nome ||
        certificado.nomeArquivo ||
        certificado.nome_do_arquivo ||
        certificado.arquivo?.name ||
        certificado.arquivo ||
        "";
}

function obterUrlArquivoCertificado(certificado = {}) {
    return certificado.arquivoUrl ||
        certificado.arquivo_url ||
        certificado.urlArquivo ||
        certificado.url_do_arquivo ||
        certificado.url ||
        "";
}

function montarCertificadoParaReanalise(certificado = {}, certificadoId = "") {
    const treinamentoId = Number(certificado.treinamentoId || certificado.treinamento_codigo || certificado.treinamento?.id || 0);
    const treinamento = certificado.treinamento || obterTreinamento(treinamentoId) || {
        id: treinamentoId || null,
        nome: certificado.nomeTreinamento || certificado.nome_treinamento || certificado.tipo_treinamento || "",
    };
    const colaborador = certificado.colaborador || {};
    const dataRealizacao = obterDataRealizacaoCertificado(certificado);
    const dataVencimento = obterDataVencimentoCertificado(certificado);
    const arquivoNome = obterNomeArquivoCertificado(certificado);
    const arquivoUrl = obterUrlArquivoCertificado(certificado);

    return {
        treinamentoId,
        treinamento,
        colaborador,
        certificadoParaVerificacao: {
            ...certificado,
            id: certificadoId,
            colaborador_id: certificado.colaborador_id || certificado.colaboradorId || colaborador.id || null,
            colaboradorId: certificado.colaboradorId || certificado.colaborador_id || colaborador.id || null,
            treinamento_codigo: treinamentoId || certificado.treinamento_codigo || null,
            treinamentoId: treinamentoId || certificado.treinamentoId || null,
            tipo_treinamento: certificado.tipo_treinamento || certificado.nomeTreinamento || certificado.nome_treinamento || treinamento.nome || "",
            nome_treinamento: certificado.nome_treinamento || certificado.nomeTreinamento || certificado.tipo_treinamento || treinamento.nome || "",
            data_realizacao: dataRealizacao,
            dataRealizacao,
            data_vencimento: dataVencimento,
            dataVencimento,
            arquivo_url: arquivoUrl,
            arquivoUrl,
            url_do_arquivo: arquivoUrl,
            caminho_storage: certificado.caminho_storage || certificado.caminhoStorage || arquivoUrl,
            caminhoStorage: certificado.caminhoStorage || certificado.caminho_storage || arquivoUrl,
            bucket: obterBucketCertificado(certificado),
            arquivo_nome: arquivoNome,
            arquivoNome,
            nome_do_arquivo: arquivoNome,
            mime_type: certificado.mime_type || certificado.mimeType || certificado.tipo_arquivo || certificado.tipoArquivo || "",
            mimeType: certificado.mimeType || certificado.mime_type || certificado.tipoArquivo || certificado.tipo_arquivo || "",
            tamanho_bytes: certificado.tamanho_bytes ?? certificado.tamanhoBytes ?? certificado.arquivo_tamanho ?? certificado.arquivoTamanho ?? null,
            tamanhoBytes: certificado.tamanhoBytes ?? certificado.tamanho_bytes ?? certificado.arquivoTamanho ?? certificado.arquivo_tamanho ?? null,
            observacao: certificado.observacao || null,
        },
    };
}

function verificarDivergenciaDatas({ certificado = {}, verificacao = null } = {}) {
    if (!verificacao) return false;

    const realizadoAtual = normalizarDataIso(obterDataRealizacaoCertificado(certificado));
    const vencimentoAtual = normalizarDataIso(obterDataVencimentoCertificado(certificado));
    const realizadoAnalise = normalizarDataIso(verificacao.dataRealizacao || verificacao.data_realizacao);
    const vencimentoAnalise = normalizarDataIso(verificacao.dataVencimento || verificacao.data_vencimento);

    return Boolean(
        (realizadoAtual && realizadoAnalise && realizadoAtual !== realizadoAnalise) ||
        (vencimentoAtual && vencimentoAnalise && vencimentoAtual !== vencimentoAnalise)
    );
}

function ResumoVerificacaoCertificado({ verificacao = null, statusCertificado = "" }) {
    const statusExibicao = verificacao?.statusVerificacao || statusCertificado;
    const nivelRisco = verificacao?.nivelRisco || "Aguardando análise";
    const scoreRisco = verificacao?.scoreRisco ?? null;
    const totalIndicios = Array.isArray(verificacao?.indicios) ? verificacao.indicios.length : 0;

    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ring-1 ${obterClassesStatus(statusExibicao)}`}>
                {normalizarStatusPainel(statusExibicao)}
            </span>

            {verificacao && (
                <>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ring-1 ${obterClassesRisco(nivelRisco)}`}>
                        Risco: {nivelRisco || "Não informado"}
                    </span>

                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
                        Score: {scoreRisco ?? 0}
                    </span>

                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
                        {totalIndicios} indício(s)
                    </span>
                </>
            )}
        </div>
    );
}

function PainelDatasVerificacao({ certificado = {}, verificacao = null }) {
    const semValidade = treinamentoSemValidade(certificado.treinamentoId || certificado.treinamento_codigo || certificado.treinamento?.id);
    const datasDivergentes = verificarDivergenciaDatas({ certificado, verificacao });

    return (
        <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex flex-col justify-between gap-2 lg:flex-row lg:items-start">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Conferência de datas</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        A verificação local compara as datas cadastradas com as informações extraídas por leitura textual e OCR local quando o arquivo permite análise.
                    </p>
                </div>

                {datasDivergentes && (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
                        Datas alteradas após a análise
                    </span>
                )}
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2">
                <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Cadastro atual</p>
                    <p className="mt-1 text-xs font-semibold text-slate-700">
                        Realização: {formatarDataPainel(obterDataRealizacaoCertificado(certificado))}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-700">
                        Vencimento: {semValidade ? "Sem validade" : formatarDataPainel(obterDataVencimentoCertificado(certificado))}
                    </p>
                </div>

                <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Última análise salva</p>
                    <p className="mt-1 text-xs font-semibold text-slate-700">
                        Realização: {formatarDataPainel(verificacao?.dataRealizacao || verificacao?.data_realizacao)}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-700">
                        Vencimento: {semValidade ? "Sem validade" : formatarDataPainel(verificacao?.dataVencimento || verificacao?.data_vencimento)}
                    </p>
                </div>
            </div>
        </div>
    );
}

function obterConferenciaDocumentalVerificacao(verificacao = null) {
    return verificacao?.retornoIa?.conferencia_documental ||
        verificacao?.retorno_ia?.conferencia_documental ||
        verificacao?.retornoIa?.conferenciaDocumental ||
        verificacao?.retorno_ia?.conferenciaDocumental ||
        null;
}

function normalizarBooleanoConferencia(valor) {
    if (valor === true) return "sim";
    if (valor === false) return "nao";
    return "na";
}

function obterClasseConferencia(valor) {
    const normalizado = normalizarBooleanoConferencia(valor);

    if (normalizado === "sim") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    if (normalizado === "nao") return "bg-red-50 text-red-700 ring-red-200";

    return "bg-slate-100 text-slate-600 ring-slate-200";
}

function obterTextoConferencia(valor, textoSim = "Localizado", textoNao = "Não localizado", textoNa = "Não avaliado") {
    const normalizado = normalizarBooleanoConferencia(valor);

    if (normalizado === "sim") return textoSim;
    if (normalizado === "nao") return textoNao;

    return textoNa;
}

function LinhaConferenciaDocumental({ titulo, valor, detalhe = "", textoSim = "Localizado", textoNao = "Não localizado", textoNa = "Não avaliado" , classeNao = "" }) {
    const classeConferencia = normalizarBooleanoConferencia(valor) === "nao" && classeNao
        ? classeNao
        : obterClasseConferencia(valor);

    return (
        <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{titulo}</p>
                <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1 ${classeConferencia}`}>
                    {obterTextoConferencia(valor, textoSim, textoNao, textoNa)}
                </span>
            </div>
            {detalhe && <p className="mt-1 text-xs font-semibold text-slate-700">{detalhe}</p>}
        </div>
    );
}

function PainelConferenciaDocumentalRobusta({ verificacao = null }) {
    const conferencia = obterConferenciaDocumentalVerificacao(verificacao);

    if (!conferencia) return null;

    const colaborador = conferencia.colaborador || {};
    const assinatura = conferencia.assinatura || {};
    const empresa = conferencia.empresa || {};
    const cnpj = conferencia.cnpj || {};
    const cpf = conferencia.cpf || {};
    const treinamento = conferencia.treinamento || {};

    return (
        <div className="mb-3 rounded-2xl border border-blue-100 bg-white p-3">
            <div className="flex flex-col justify-between gap-2 lg:flex-row lg:items-start">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-wide text-blue-700">Conferência documental avançada</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        Validação por OCR local para conferir colaborador, empresa, treinamento e assinatura visual em listas ou documentos individuais escaneados.
                    </p>
                </div>
                {conferencia.listaPresenca && (
                    <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-blue-700 ring-1 ring-blue-200">
                        Lista de presença detectada
                    </span>
                )}
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                <LinhaConferenciaDocumental
                    titulo="Colaborador"
                    valor={colaborador.encontrado}
                    textoNao={conferencia?.listaPresenca ? "Confer?ncia manual" : "N?o localizado"}
                    classeNao={conferencia?.listaPresenca ? "bg-amber-50 text-amber-700 ring-amber-200" : ""}
                    detalhe={colaborador.encontrado ? `${colaborador.nomeCadastro || "Nome encontrado"}${colaborador.linhaOcr ? ` · Linha OCR: ${colaborador.linhaOcr}` : ""}` : colaborador.nomeCadastro || "Nome não informado no cadastro"}
                />

                <LinhaConferenciaDocumental
                    titulo="Assinatura"
                    valor={assinatura.aplicavel ? assinatura.visualLocalizada === true : null}
                    textoSim="Assinatura visual localizada"
                    textoNao="Não confirmada"
                    textoNa="Não aplicável"
                    detalhe={assinatura.observacao || "Conferência visual automática da área de assinatura."}
                />

                <LinhaConferenciaDocumental
                    titulo="Treinamento"
                    valor={treinamento.encontrado}
                    detalhe={treinamento.nomeCadastro || "Treinamento não informado"}
                />

                <LinhaConferenciaDocumental
                    titulo="Empresa"
                    valor={empresa.encontrada}
                    detalhe={empresa.origem === "vinculo_colaborador_cpf_documento"
                        ? `${empresa.nomeCadastro || "Empresa do colaborador"} · confirmada pelo vínculo do colaborador e CPF no documento`
                        : (empresa.nomeCadastro || empresa.nomeExtraido || "Empresa não informada")}
                />

                <LinhaConferenciaDocumental
                    titulo="CNPJ"
                    valor={cnpj.informadoCadastro ? cnpj.encontrado : null}
                    detalhe={cnpj.informadoCadastro ? (cnpj.cnpjExtraido ? `CNPJ extraído: ${cnpj.cnpjExtraido}` : "CNPJ do cadastro conferido no texto quando disponível.") : "CNPJ não informado no cadastro ou não presente no documento."}
                    textoNa="Não informado"
                />

                <LinhaConferenciaDocumental
                    titulo="CPF"
                    valor={cpf.informadoCadastro ? cpf.encontrado : (cpf.encontradoNoDocumento ? true : null)}
                    detalhe={cpf.informadoCadastro
                        ? "CPF do cadastro procurado no documento."
                        : (cpf.encontradoNoDocumento
                            ? `CPF localizado no documento${Array.isArray(cpf.cpfsExtraidos) && cpf.cpfsExtraidos.length ? `: ${cpf.cpfsExtraidos[0]}` : ""}.`
                            : "CPF não informado no cadastro ou não localizado no documento.")}
                    textoNa="Não informado"
                />
            </div>
        </div>
    );
}

export function VerificacaoCertificadoTreinamento({ certificado = {} }) {
    const [aberto, setAberto] = useState(false);
    const [carregando, setCarregando] = useState(false);
    const [reanalisando, setReanalisando] = useState(false);
    const [erro, setErro] = useState("");
    const [avisoArquivoAnalise, setAvisoArquivoAnalise] = useState("");
    const [dataDetectadaArquivo, setDataDetectadaArquivo] = useState("");
    const [verificacao, setVerificacao] = useState(null);
    const [statusAtualValidacao, setStatusAtualValidacao] = useState(() => obterStatusValidacaoCertificado(certificado));

    const certificadoId = useMemo(() => obterIdCertificado(certificado), [certificado]);

    useEffect(() => {
        setStatusAtualValidacao(obterStatusValidacaoCertificado(certificado));
    }, [certificado]);

    const carregarVerificacao = useCallback(async () => {
        if (!certificadoId) {
            setVerificacao(null);
            setErro("Certificado sem ID para consultar a verificação documental.");
            return;
        }

        setCarregando(true);
        setErro("");

        try {
            const resultado = await obterUltimaVerificacaoDocumental({
                supabase,
                origemTipo: ORIGEM_TIPO_CERTIFICADO,
                origemTabela: ORIGEM_TABELA_CERTIFICADOS,
                documentoId: certificadoId,
            });

            setVerificacao(resultado);

            if (resultado?.statusVerificacao) {
                setStatusAtualValidacao(converterStatusVerificacaoParaStatusCertificado(resultado.statusVerificacao));
            }
        } catch (error) {
            setVerificacao(null);
            setErro(error?.message || "Erro ao carregar a verificação documental do certificado.");
        } finally {
            setCarregando(false);
        }
    }, [certificadoId]);

    const reanalisarCertificado = useCallback(async () => {
        if (!certificadoId) {
            setErro("Certificado sem ID para reanalisar.");
            return;
        }

        setAberto(true);
        setReanalisando(true);
        setErro("");
        setAvisoArquivoAnalise("");
        setDataDetectadaArquivo("");

        try {
            const arquivoAnalise = await baixarArquivoCertificadoParaAnalise({ certificado });

            if (arquivoAnalise.aviso) {
                setAvisoArquivoAnalise(arquivoAnalise.aviso);
            }

            let dataDetectada = "";

            if (arquivoAnalise.arquivo) {
                try {
                    const sugestao = await detectarDataEmissaoArquivo(arquivoAnalise.arquivo);
                    dataDetectada = sugestao?.data || "";

                    if (dataDetectada) {
                        setDataDetectadaArquivo(dataDetectada);
                    }
                } catch (erroDeteccaoData) {
                    console.warn("Não foi possível detectar data no arquivo salvo:", erroDeteccaoData?.message || erroDeteccaoData);
                }
            }

            const {
                treinamentoId,
                treinamento,
                colaborador,
                certificadoParaVerificacao,
            } = montarCertificadoParaReanalise(certificado, certificadoId);

            if (dataDetectada) {
                certificadoParaVerificacao.data_detectada_documento = dataDetectada;
                certificadoParaVerificacao.dataDetectadaDocumento = dataDetectada;
            }

            const resultado = await verificarCertificadoTreinamento({
                supabase,
                certificado: certificadoParaVerificacao,
                colaborador,
                treinamento,
                arquivo: arquivoAnalise.arquivo || null,
                registrosExistentes: [],
                usuario: null,
                salvarResultado: true,
                exigeVencimento: !treinamentoSemValidade(treinamentoId),
            });

            const statusValidacao = converterStatusVerificacaoParaStatusCertificado(resultado?.statusVerificacao);

            const { error } = await supabase
                .from("certificados")
                .update({ status_validacao: statusValidacao })
                .eq("id", certificadoId);

            if (error) {
                throw new Error(`Erro ao atualizar status do certificado após reanálise: ${error.message}`);
            }

            setVerificacao(resultado);
            setStatusAtualValidacao(statusValidacao);
        } catch (error) {
            setErro(error?.message || "Erro ao reanalisar o certificado.");
        } finally {
            setReanalisando(false);
        }
    }, [certificado, certificadoId]);

    useEffect(() => {
        if (!aberto) return;
        carregarVerificacao();
    }, [aberto, carregarVerificacao]);

    const alternarPainel = () => {
        setAberto((atual) => !atual);
    };

    return (
        <div className="rounded-2xl border border-blue-100 bg-white p-3 shadow-sm">
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-blue-600" />
                        <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                            Verificação documental
                        </p>
                    </div>

                    <div className="mt-2">
                        <ResumoVerificacaoCertificado
                            verificacao={verificacao}
                            statusCertificado={statusAtualValidacao}
                        />
                    </div>

                    {verificacao?.createdAt && (
                        <p className="mt-2 text-[11px] font-semibold text-slate-400">
                            Última análise: {formatarDataHoraPainel(verificacao.createdAt)}
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                    {aberto && (
                        <>
                            <button
                                type="button"
                                onClick={reanalisarCertificado}
                                disabled={reanalisando || carregando}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 disabled:opacity-60"
                            >
                                <RefreshCw className={`h-4 w-4 ${reanalisando ? "animate-spin" : ""}`} />
                                {reanalisando ? "Reanalisando..." : "Reanalisar certificado"}
                            </button>

                            <button
                                type="button"
                                onClick={carregarVerificacao}
                                disabled={carregando || reanalisando}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 disabled:opacity-60"
                            >
                                <RefreshCw className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`} />
                                Atualizar
                            </button>
                        </>
                    )}

                    <button
                        type="button"
                        onClick={alternarPainel}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                    >
                        {aberto ? (
                            <>
                                <ChevronUp className="h-4 w-4" />
                                Recolher verificação
                            </>
                        ) : (
                            <>
                                <ChevronDown className="h-4 w-4" />
                                Abrir verificação
                            </>
                        )}
                    </button>
                </div>
            </div>

            {aberto && (
                <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    {(carregando || reanalisando) && (
                        <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                            {reanalisando ? "Reanalisando certificado com as datas atuais do sistema..." : "Carregando resultado da verificação documental..."}
                        </div>
                    )}

                    {!carregando && !reanalisando && erro && (
                        <div className="flex gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{erro}</span>
                        </div>
                    )}

                    {!carregando && !reanalisando && !erro && !verificacao && (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600">
                            Nenhum resultado de verificação documental foi localizado para este certificado.
                            Clique em Reanalisar certificado para gerar uma nova análise local usando as datas cadastradas no sistema.
                        </div>
                    )}

                    {!carregando && !reanalisando && !erro && verificacao && (
                        <>
                            <PainelDatasVerificacao
                                certificado={certificado}
                                verificacao={verificacao}
                            />

                            <PainelConferenciaDocumentalRobusta verificacao={verificacao} />

                            {(dataDetectadaArquivo || avisoArquivoAnalise) && (
                                <div className="mb-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
                                    <p className="font-black uppercase tracking-wide">Arquivo salvo na reanálise</p>

                                    {dataDetectadaArquivo ? (
                                        <p className="mt-1 font-semibold">
                                            Data detectada no arquivo: {formatarDataPainel(dataDetectadaArquivo)}
                                        </p>
                                    ) : (
                                        <p className="mt-1 font-semibold">
                                            Data detectada no arquivo: não localizada automaticamente.
                                        </p>
                                    )}

                                    {avisoArquivoAnalise && (
                                        <p className="mt-1 text-blue-700">{avisoArquivoAnalise}</p>
                                    )}

                                    <p className="mt-1 text-blue-700">
                                        A data detectada serve como apoio para conferência. A aprovação continua usando as datas cadastradas até que o TST revise e salve o cadastro.
                                    </p>
                                </div>
                            )}

                            {ResultadoVerificacaoDocumento ? (
                                <ResultadoVerificacaoDocumento
                                    resultado={verificacao}
                                    verificacao={verificacao}
                                    documento={certificado}
                                    origemTipo={ORIGEM_TIPO_CERTIFICADO}
                                    origemTabela={ORIGEM_TABELA_CERTIFICADOS}
                                    compacto={false}
                                    modoCompacto={false}
                                />
                            ) : (
                                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                                    <p className="font-bold text-slate-900">{verificacao.resumo || "Verificação documental carregada."}</p>

                                    {Array.isArray(verificacao.indicios) && verificacao.indicios.length > 0 && (
                                        <ul className="mt-3 list-disc space-y-1 pl-5">
                                            {verificacao.indicios.map((indicio, indice) => (
                                                <li key={`${indicio.codigo || indicio.titulo || "indicio"}-${indice}`}>
                                                    {indicio.titulo || indicio.detalhe || "Indício identificado"}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
