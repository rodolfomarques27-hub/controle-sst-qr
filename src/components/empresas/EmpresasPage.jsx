import React, { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    Building2,
    ChevronDown,
    ChevronUp,
    Download,
    Eye,
    FileText,
    Plus,
    RefreshCw,
    Search,
    ShieldCheck,
    Trash2,
    Upload,
    Users,
} from "lucide-react";

import { Card, Header } from "../commonComponents";
import { FileUploadAviso, validarArquivoAntesUpload } from "../FileUploadAviso";
import ResultadoVerificacaoDocumento from "../documentos/ResultadoVerificacaoDocumento";
import { supabase } from "../../lib/supabaseClient";
import { abrirArquivoStorage, obterUrlLogoEmpresa } from "../../services/supabaseServices";
import {
    calcularVencimentoDocumento,
    statusEmpresaDocumento,
    calcularSituacaoDocumentalEmpresa,
    normalizarStatusEmpresa,
    classeStatusEmpresa,
} from "../../services/empresaDocumentosService";
import { documentosEmpresaBase } from "../../constants/documentosEmpresaConstants";
import {
    baixarRelatorioDocumentosEmpresaPDF,
    baixarRelatorioEmpresasDocumentosPDF,
    baixarRelatorioPendenciasDocumentaisPDF,
} from "../../services/exportacaoService";
import {
    classNames,
    formatDate,
    formatarCnpj,
    formatarTelefone,
    sanitizarNomeArquivo,
} from "../../utils/sstUtils";
import {
    carregarPermissaoSistemaAtualService,
    ACOES_PERMISSAO_SISTEMA,
    MODULOS_PERMISSAO_SISTEMA,
    usuarioPodeExecutarAcaoSistema,
    usuarioPodeExcluirSistema,
} from "../../services/usuariosPermissoesSistemaService";

const hoje = new Date();

const CHAVE_CADASTRO_EMPRESAS_RECOLHIDO = "controleSstEmpresasCadastroRecolhido";
const CHAVE_INFO_EMPRESAS_RECOLHIDA = "controleSstEmpresasInformacoesRecolhidas";
const CHAVE_FILTROS_EMPRESAS_DOCUMENTOS = "controle-sst-qr:empresas-documentos:filtros-salvos:v1";


const STATUS_DOCUMENTO_PILL_CLASSES = {
    em_dia: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    "em dia": "bg-emerald-50 text-emerald-700 ring-emerald-200",
    aprovado: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    regular: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    vencendo: "bg-amber-50 text-amber-700 ring-amber-200",
    a_vencer: "bg-amber-50 text-amber-700 ring-amber-200",
    "a vencer": "bg-amber-50 text-amber-700 ring-amber-200",
    atencao: "bg-amber-50 text-amber-700 ring-amber-200",
    atenção: "bg-amber-50 text-amber-700 ring-amber-200",
    vencido: "bg-red-50 text-red-700 ring-red-200",
    bloqueado: "bg-red-50 text-red-700 ring-red-200",
    pendente: "bg-red-50 text-red-700 ring-red-200",
    sem_documento: "bg-red-50 text-red-700 ring-red-200",
    "sem documento": "bg-red-50 text-red-700 ring-red-200",
};

function normalizarChaveStatusDocumento(valor = "") {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");
}

function StatusPill({ status = null, small = false }) {
    const statusObjeto = status && typeof status === "object" ? status : null;
    const textoStatus = String(statusObjeto?.texto || statusObjeto?.label || status || "Pendente").trim() || "Pendente";
    const chaveStatus = normalizarChaveStatusDocumento(statusObjeto?.chave || statusObjeto?.status || textoStatus);
    const classeStatus = statusObjeto?.classe || statusObjeto?.className || STATUS_DOCUMENTO_PILL_CLASSES[chaveStatus] || STATUS_DOCUMENTO_PILL_CLASSES[textoStatus.toLowerCase()] || "bg-slate-50 text-slate-700 ring-slate-200";

    return (
        <span
            className={classNames(
                "inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-1",
                small ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
                classeStatus
            )}
        >
            {textoStatus}
        </span>
    );
}

function carregarPreferenciaPainelBoolean(chave, padrao = false) {
    try {
        const salvo = window.localStorage.getItem(chave);
        return salvo === null ? padrao : salvo === "true";
    } catch {
        return padrao;
    }
}

function salvarPreferenciaPainelBoolean(chave, valor) {
    const normalizado = Boolean(valor);

    try {
        window.localStorage.setItem(chave, String(normalizado));
    } catch {
        // Ignora navegador sem localStorage disponível.
    }

    return normalizado;
}

function obterFiltrosPadraoEmpresasDocumentos() {
    return {
        buscaEmpresa: "",
        filtroStatusEmpresa: "Todos",
        filtroTipoEmpresa: "Todos",
    };
}

function normalizarFiltroSalvoEmpresasDocumentos(valor, fallback = "") {
    const texto = String(valor ?? "").trim();
    return texto || fallback;
}

function carregarFiltrosSalvosEmpresasDocumentos() {
    if (typeof window === "undefined" || !window.localStorage) return null;

    try {
        const bruto = window.localStorage.getItem(CHAVE_FILTROS_EMPRESAS_DOCUMENTOS);
        if (!bruto) return null;

        const dados = JSON.parse(bruto);
        if (!dados || typeof dados !== "object") return null;

        const padrao = obterFiltrosPadraoEmpresasDocumentos();

        return {
            buscaEmpresa: normalizarFiltroSalvoEmpresasDocumentos(dados.buscaEmpresa, padrao.buscaEmpresa),
            filtroStatusEmpresa: normalizarFiltroSalvoEmpresasDocumentos(dados.filtroStatusEmpresa, padrao.filtroStatusEmpresa),
            filtroTipoEmpresa: normalizarFiltroSalvoEmpresasDocumentos(dados.filtroTipoEmpresa, padrao.filtroTipoEmpresa),
        };
    } catch (error) {
        console.error("Erro ao carregar filtros salvos do relat\u00f3rio de empresas e documentos:", error);
        return null;
    }
}

function obterResumoDocumentoEmpresa(tipo) {
    const resumos = {
        LTCAT: [
            "3 anos, com revisão antes do prazo quando houver mudança.",
            "Revisar por alterações de layout, processo, atividade, equipamentos ou agentes nocivos.",
            "Base legal: previdenciária/eSocial.",
        ],
        PCMSO: [
            "Controle anual recomendado com base nos riscos do PGR.",
            "Revisar por exames ocupacionais, mudança de função ou alteração da exposição ocupacional.",
            "Base normativa: NR-07 e PGR/NR-01.",
        ],
        PGR: [
            "Revisar no mínimo a cada 2 anos.",
            "Antecipar revisão por mudança em processos, layout, equipamentos ou medidas de prevenção.",
            "Base normativa: NR-01/GRO/PGR.",
        ],
    };

    return resumos[tipo] || ["Documento controlado pelo sistema SST.", "Revise conforme regra interna e norma aplicável.", "Base normativa conforme cadastro do documento."];
}

function dataIsoValidaPainelDocumento(valor = "") {
    const texto = String(valor || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;

    const [ano, mes, dia] = texto.split("-").map(Number);
    const data = new Date(ano, mes - 1, dia, 12, 0, 0);

    return (
        data.getFullYear() === ano &&
        data.getMonth() === mes - 1 &&
        data.getDate() === dia
    );
}

function obterLeituraVerificacaoPainel(verificacao = {}) {
    return verificacao?.retornoIa?.leitura_documental_local ||
        verificacao?.retorno_ia?.leitura_documental_local ||
        verificacao?.retornoIa?.leituraDocumentalLocal ||
        verificacao?.retorno_ia?.leituraDocumentalLocal ||
        null;
}

function obterCamposExtraidosVerificacaoPainel(verificacao = {}) {
    const leitura = obterLeituraVerificacaoPainel(verificacao);
    return leitura?.campos_extraidos || leitura?.camposExtraidos || null;
}

function obterDatasOcrParaDocumentoPainel({ verificacao = {}, documento = {} } = {}) {
    const campos = obterCamposExtraidosVerificacaoPainel(verificacao);
    const tipoDocumento = documento?.tipo_documento || documento?.tipo || "";

    if (dataIsoValidaPainelDocumento(campos?.vigencia_inicio) && dataIsoValidaPainelDocumento(campos?.vigencia_fim)) {
        return {
            dataEmissao: campos.vigencia_inicio,
            dataVencimento: campos.vigencia_fim,
        };
    }

    const leitura = obterLeituraVerificacaoPainel(verificacao);
    const classificadas = leitura?.datas_classificadas || leitura?.datasClassificadas || {};
    const vigencia = Array.isArray(classificadas?.vigencia) ? classificadas.vigencia : [];
    const inicio = vigencia.find((data) => data?.tipo === "inicio_vigencia") || vigencia[0] || null;
    const fim = vigencia.find((data) => data?.tipo === "fim_vigencia") || vigencia[1] || null;

    if (dataIsoValidaPainelDocumento(inicio?.iso) && dataIsoValidaPainelDocumento(fim?.iso)) {
        return {
            dataEmissao: inicio.iso,
            dataVencimento: fim.iso,
        };
    }

    const encerramento = campos?.data_encerramento || campos?.assinatura_data || "";

    if (dataIsoValidaPainelDocumento(encerramento)) {
        return {
            dataEmissao: encerramento,
            dataVencimento: calcularVencimentoDocumento(tipoDocumento, encerramento),
        };
    }

    const outrasRelevantes = Array.isArray(classificadas?.outrasRelevantes) ? classificadas.outrasRelevantes : [];
    const dataEncerramentoClassificada = outrasRelevantes.find((data) => String(data?.tipo || "") === "encerramento_documento") || null;

    if (dataIsoValidaPainelDocumento(dataEncerramentoClassificada?.iso)) {
        return {
            dataEmissao: dataEncerramentoClassificada.iso,
            dataVencimento: calcularVencimentoDocumento(tipoDocumento, dataEncerramentoClassificada.iso),
        };
    }

    return {
        dataEmissao: "",
        dataVencimento: "",
    };
}

function ResumoDocumentoInline({ documento = null }) {
    return (
        <div className="flex min-w-0 flex-nowrap items-center gap-8 overflow-x-auto rounded-2xl bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
            <p className="inline-flex shrink-0 items-baseline gap-1 whitespace-nowrap">
                <strong className="text-slate-700">Emissão:</strong>
                <span>{documento?.data_emissao ? formatDate(documento.data_emissao) : "Documento não enviado"}</span>
            </p>
            <p className="inline-flex shrink-0 items-baseline gap-1 whitespace-nowrap">
                <strong className="text-slate-700">Revisão:</strong>
                <span>{documento?.data_vencimento ? formatDate(documento.data_vencimento) : "Sem revisão definida"}</span>
            </p>
            <p className="inline-flex min-w-0 items-baseline gap-1 whitespace-nowrap">
                <strong className="shrink-0 text-slate-700">Arquivo:</strong>
                <span className="min-w-0 truncate">{documento?.arquivo_nome || "Arquivo ainda não anexado"}</span>
            </p>
        </div>
    );
}

export function Empresas({
    empresasBanco,
    documentosEmpresas,
    colaboradores,
    carregandoBanco,
    erroBanco,
    onAtualizarBanco,
    onAdicionarEmpresa,
    onAtualizarEmpresa,
    onExcluirEmpresa,
    onAdicionarDocumentoEmpresa,
    onExcluirDocumentoEmpresa,
    onVisualizarDocumentoEmpresa,
}) {
    const [novaEmpresa, setNovaEmpresa] = useState({
        nome: "",
        cnpj: "",
        responsavel: "",
        email: "",
        telefone: "",
        responsavelAuditoria: "",
        emailAuditoria: "",
        whatsappAuditoria: "",
        receberAuditoria: true,
        tstResponsavel: "",
        tstEmail: "",
        tstWhatsapp: "",
        tipoEmpresa: "Terceirizada",
        empresaPaiId: "",
        logo: null,
        contratoArquivo: null,
        numeroContrato: "",
        dataInicioContrato: "",
        dataFimContrato: "",
        responsavelContratante: "",
        escopoServico: "",
        observacaoStatus: "",
    });

    const [novoDoc, setNovoDoc] = useState({
        empresaId: "",
        tipo: "PGR",
        dataEmissao: hoje.toISOString().slice(0, 10),
        dataVencimento: calcularVencimentoDocumento("PGR", hoje.toISOString().slice(0, 10)),
        arquivo: null,
        observacao: "",
    });

    const [salvandoEmpresa, setSalvandoEmpresa] = useState(false);
    const [salvandoDocumento, setSalvandoDocumento] = useState(false);
    const [empresaRevisao, setEmpresaRevisao] = useState(null);
    const [empresaEdicao, setEmpresaEdicao] = useState(null);
    const [permissaoSistemaAtual, setPermissaoSistemaAtual] = useState(null);
    const [mensagemPermissaoSistema, setMensagemPermissaoSistema] = useState("Carregando permissões do sistema...");
    const [salvandoEdicaoEmpresa, setSalvandoEdicaoEmpresa] = useState(false);
    const [buscaEmpresa, setBuscaEmpresa] = useState("");
    const [filtroStatusEmpresa, setFiltroStatusEmpresa] = useState("Todos");
    const [filtroTipoEmpresa, setFiltroTipoEmpresa] = useState("Todos");
    const [versaoFiltroSalvoEmpresasDocumentos, setVersaoFiltroSalvoEmpresasDocumentos] = useState(0);

    const filtrosSalvosEmpresasDocumentosDisponiveis = useMemo(
        () => Boolean(carregarFiltrosSalvosEmpresasDocumentos()),
        [versaoFiltroSalvoEmpresasDocumentos]
    );
    const [uploadRevisao, setUploadRevisao] = useState({});
    const [salvandoUploadRevisao, setSalvandoUploadRevisao] = useState("");
    const [escoposAbertos, setEscoposAbertos] = useState({});
    const [empresasAbertas, setEmpresasAbertas] = useState({});
    const [cadastroEmpresasRecolhido, setCadastroEmpresasRecolhido] = useState(() => carregarPreferenciaPainelBoolean(CHAVE_CADASTRO_EMPRESAS_RECOLHIDO, false));
    const [informacoesEmpresasRecolhidas, setInformacoesEmpresasRecolhidas] = useState(() => carregarPreferenciaPainelBoolean(CHAVE_INFO_EMPRESAS_RECOLHIDA, false));
    const [verificacoesDocumentais, setVerificacoesDocumentais] = useState({});
    const [carregandoVerificacoes, setCarregandoVerificacoes] = useState(false);
    const [erroVerificacoes, setErroVerificacoes] = useState("");

    const alternarEmpresaAberta = (empresaId) => {
        setEmpresasAbertas((atual) => ({
            ...atual,
            [empresaId]: !atual[empresaId],
        }));
    };

    const documentosPorEmpresa = useMemo(() => {
        return documentosEmpresas.reduce((acc, doc) => {
            const empresaId = doc.empresa_id || doc.empresaId;
            if (!acc[empresaId]) acc[empresaId] = [];
            acc[empresaId].push(doc);
            return acc;
        }, {});
    }, [documentosEmpresas]);

    const idsDocumentosEmpresas = useMemo(() => {
        return Array.from(
            new Set(
                (documentosEmpresas || [])
                    .map((doc) => String(doc?.id || "").trim())
                    .filter(Boolean)
            )
        );
    }, [documentosEmpresas]);

    useEffect(() => {
        let cancelado = false;

        async function carregarVerificacoesDocumentaisEmpresas() {
            if (!idsDocumentosEmpresas.length) {
                setVerificacoesDocumentais({});
                setErroVerificacoes("");
                return;
            }

            setCarregandoVerificacoes(true);
            setErroVerificacoes("");

            try {
                const { data, error } = await supabase
                    .from("verificacoes_documentais")
                    .select("*")
                    .eq("origem_tipo", "documento_empresa")
                    .eq("origem_tabela", "documentos_empresas")
                    .in("documento_id", idsDocumentosEmpresas)
                    .order("created_at", { ascending: false });

                if (error) {
                    throw error;
                }

                if (cancelado) return;

                const ultimasPorDocumento = (data || []).reduce((acc, verificacao) => {
                    const documentoId = String(verificacao.documento_id || "").trim();

                    if (documentoId && !acc[documentoId]) {
                        acc[documentoId] = verificacao;
                    }

                    return acc;
                }, {});

                setVerificacoesDocumentais(ultimasPorDocumento);
            } catch (error) {
                if (!cancelado) {
                    setErroVerificacoes(error.message || "Erro ao carregar verificações documentais das empresas.");
                }
            } finally {
                if (!cancelado) {
                    setCarregandoVerificacoes(false);
                }
            }
        }

        carregarVerificacoesDocumentaisEmpresas();

        return () => {
            cancelado = true;
        };
    }, [idsDocumentosEmpresas]);

    const obterVerificacaoDocumentoEmpresa = (doc) => {
        const documentoId = String(doc?.id || "").trim();
        return documentoId ? verificacoesDocumentais[documentoId] || null : null;
    };

    const aprovarVerificacaoDocumentoManual = async ({ verificacao, documento, observacaoManual = "" } = {}) => {
        if (!verificacao?.id) {
            throw new Error("Verificação documental não localizada para aprovação manual.");
        }

        if (!documento?.id) {
            throw new Error("Documento da empresa não localizado para aprovação manual.");
        }

        const observacao = String(observacaoManual || "").trim();
        const confirmar = window.confirm(
            "Confirmar aprovação manual definitiva deste documento?\n\n" +
            "Use esta ação somente depois de abrir o PDF original e conferir empresa, CNPJ, datas, assinatura e autenticidade."
        );

        if (!confirmar) return;

        const resumoManual = observacao
            ? `Aprovado manualmente após conferência humana. Observação: ${observacao}`
            : "Aprovado manualmente após conferência humana. Conformidade 100/100 e risco técnico 0/100.";

        const recomendacoesManuais = [
            {
                tipo: "aprovacao_manual",
                texto: "Documento aprovado manualmente pelo responsável após conferência do arquivo original, empresa, CNPJ, datas e assinatura/autenticidade.",
            },
        ];

        const { data, error } = await supabase
            .from("verificacoes_documentais")
            .update({
                status_verificacao: "aprovado",
                nivel_risco: "baixo",
                score_risco: 0,
                indicios: [],
                recomendacoes: recomendacoesManuais,
                resumo: resumoManual,
                observacao_manual: observacao || "Aprovação manual registrada no painel de revisão documental.",
            })
            .eq("id", verificacao.id)
            .select("*")
            .single();

        if (error) {
            throw new Error(`Erro ao aprovar manualmente a verificação documental: ${error.message}`);
        }

        const datasOcr = obterDatasOcrParaDocumentoPainel({ verificacao, documento });
        const atualizacaoDocumento = {
            status_validacao: "Aprovado",
        };

        if (datasOcr.dataEmissao) {
            atualizacaoDocumento.data_emissao = datasOcr.dataEmissao;
        }

        if (datasOcr.dataVencimento) {
            atualizacaoDocumento.data_vencimento = datasOcr.dataVencimento;
        }

        const { error: erroDocumento } = await supabase
            .from("documentos_empresas")
            .update(atualizacaoDocumento)
            .eq("id", documento.id);

        if (erroDocumento) {
            throw new Error(`A verificação foi aprovada, mas o status/datas do documento não foram atualizados: ${erroDocumento.message}`);
        }

        if (typeof onAtualizarBanco === "function") {
            await onAtualizarBanco();
        }

        setVerificacoesDocumentais((atual) => ({
            ...atual,
            [String(documento.id)]: data || {
                ...verificacao,
                status_verificacao: "aprovado",
                nivel_risco: "baixo",
                score_risco: 0,
                indicios: [],
                recomendacoes: recomendacoesManuais,
                resumo: resumoManual,
                observacao_manual: observacao,
            },
        }));

        alert("Documento aprovado manualmente e marcado como válido.");
    };

    const colaboradoresPorEmpresa = useMemo(() => {
        return (colaboradores || []).reduce((acc, colaborador) => {
            const empresaId = colaborador.empresaId || colaborador.empresa_id;
            if (!empresaId) return acc;
            if (!acc[empresaId]) acc[empresaId] = [];
            acc[empresaId].push(colaborador);
            return acc;
        }, {});
    }, [colaboradores]);

    const nomeEmpresaPai = (empresaPaiId) => {
        if (!empresaPaiId) return "";
        return empresasBanco.find((empresa) => empresa.id === empresaPaiId)?.nome || "";
    };

    const adicionarEmpresa = async () => {
        if (!podeCadastrarEmpresasSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioCadastroEmpresas);
            return;
        }

        if (!novaEmpresa.nome.trim()) {
            alert("Informe o nome da empresa.");
            return;
        }

        setSalvandoEmpresa(true);

        const ok = await onAdicionarEmpresa({
            nome: novaEmpresa.nome.trim(),
            cnpj: novaEmpresa.cnpj.trim(),
            responsavel: novaEmpresa.responsavel.trim(),
            email: novaEmpresa.email.trim(),
            telefone: novaEmpresa.telefone.trim(),
            responsavelAuditoria: novaEmpresa.responsavelAuditoria.trim(),
            emailAuditoria: novaEmpresa.emailAuditoria.trim(),
            whatsappAuditoria: novaEmpresa.whatsappAuditoria.trim(),
            receberAuditoria: novaEmpresa.receberAuditoria !== false,
            tstResponsavel: novaEmpresa.tstResponsavel.trim(),
            tstEmail: novaEmpresa.tstEmail.trim(),
            tstWhatsapp: novaEmpresa.tstWhatsapp.trim(),
            tipoEmpresa: novaEmpresa.tipoEmpresa,
            empresaPaiId: novaEmpresa.empresaPaiId || null,
            logo: novaEmpresa.logo,
            contratoArquivo: novaEmpresa.contratoArquivo,
            numeroContrato: novaEmpresa.numeroContrato.trim(),
            dataInicioContrato: novaEmpresa.dataInicioContrato || null,
            dataFimContrato: novaEmpresa.dataFimContrato || null,
            responsavelContratante: novaEmpresa.responsavelContratante.trim(),
            escopoServico: novaEmpresa.escopoServico.trim(),
            observacaoStatus: novaEmpresa.observacaoStatus.trim(),
        });

        setSalvandoEmpresa(false);

        if (ok) {
            setNovaEmpresa({
                nome: "",
                cnpj: "",
                responsavel: "",
                email: "",
                telefone: "",
                responsavelAuditoria: "",
                emailAuditoria: "",
                whatsappAuditoria: "",
                receberAuditoria: true,
                tstResponsavel: "",
                tstEmail: "",
                tstWhatsapp: "",
                tipoEmpresa: "Terceirizada",
                empresaPaiId: "",
                logo: null,
                contratoArquivo: null,
                numeroContrato: "",
                dataInicioContrato: "",
                dataFimContrato: "",
                responsavelContratante: "",
                escopoServico: "",
                observacaoStatus: "",
            });
        }
    };

    const alterarTipoDocumento = (tipo) => {
        setNovoDoc((atual) => ({
            ...atual,
            tipo,
            dataVencimento: calcularVencimentoDocumento(tipo, atual.dataEmissao),
        }));
    };

    const alterarEmissaoDocumento = (dataEmissao) => {
        setNovoDoc((atual) => ({
            ...atual,
            dataEmissao,
            dataVencimento: calcularVencimentoDocumento(atual.tipo, dataEmissao),
        }));
    };

    const abrirEdicaoEmpresa = (empresa) => {
        setEmpresaEdicao({
            id: empresa.id,
            nome: empresa.nome || "",
            cnpj: empresa.cnpj || "",
            responsavel: empresa.responsavel || "",
            email: empresa.email || "",
            telefone: empresa.telefone || "",
            responsavelAuditoria: empresa.responsavel_auditoria || "",
            emailAuditoria: empresa.email_auditoria || "",
            whatsappAuditoria: empresa.whatsapp_auditoria || "",
            receberAuditoria: empresa.receber_auditoria !== false,
            tstResponsavel: empresa.tst_responsavel || "",
            tstEmail: empresa.tst_email || "",
            tstWhatsapp: empresa.tst_whatsapp || "",
            status: normalizarStatusEmpresa(empresa.status),
            tipoEmpresa: empresa.tipo_empresa || "Terceirizada",
            empresaPaiId: empresa.empresa_pai_id || "",
            logoAtual: empresa.logo_url || "",
            logoNomeAtual: empresa.logo_nome || "",
            logo: null,
            contratoUrlAtual: empresa.contrato_url || "",
            contratoNomeAtual: empresa.contrato_nome || "",
            contratoArquivo: null,
            numeroContrato: empresa.numero_contrato || "",
            dataInicioContrato: empresa.data_inicio_contrato || "",
            dataFimContrato: empresa.data_fim_contrato || "",
            responsavelContratante: empresa.responsavel_contratante || "",
            escopoServico: empresa.escopo_servico || "",
            observacaoStatus: empresa.observacao_status || "",
        });
    };

    const salvarEdicaoEmpresa = async () => {
        if (!podeEditarEmpresasSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioEdicaoEmpresas);
            return;
        }

        if (!empresaEdicao?.nome?.trim()) {
            alert("Informe o nome da empresa.");
            return;
        }

        setSalvandoEdicaoEmpresa(true);

        const ok = await onAtualizarEmpresa({
            id: empresaEdicao.id,
            nome: empresaEdicao.nome.trim(),
            cnpj: empresaEdicao.cnpj.trim(),
            responsavel: empresaEdicao.responsavel.trim(),
            email: empresaEdicao.email.trim(),
            telefone: empresaEdicao.telefone.trim(),
            responsavelAuditoria: empresaEdicao.responsavelAuditoria.trim(),
            emailAuditoria: empresaEdicao.emailAuditoria.trim(),
            whatsappAuditoria: empresaEdicao.whatsappAuditoria.trim(),
            receberAuditoria: empresaEdicao.receberAuditoria !== false,
            tstResponsavel: empresaEdicao.tstResponsavel.trim(),
            tstEmail: empresaEdicao.tstEmail.trim(),
            tstWhatsapp: empresaEdicao.tstWhatsapp.trim(),
            status: empresaEdicao.status || "Ativa",
            tipoEmpresa: empresaEdicao.tipoEmpresa,
            empresaPaiId: empresaEdicao.empresaPaiId || null,
            logo: empresaEdicao.logo,
            logoAtual: empresaEdicao.logoAtual,
            logoNomeAtual: empresaEdicao.logoNomeAtual,
            contratoUrlAtual: empresaEdicao.contratoUrlAtual,
            contratoNomeAtual: empresaEdicao.contratoNomeAtual,
            contratoArquivo: empresaEdicao.contratoArquivo,
            numeroContrato: empresaEdicao.numeroContrato.trim(),
            dataInicioContrato: empresaEdicao.dataInicioContrato || null,
            dataFimContrato: empresaEdicao.dataFimContrato || null,
            responsavelContratante: empresaEdicao.responsavelContratante.trim(),
            escopoServico: empresaEdicao.escopoServico.trim(),
            observacaoStatus: empresaEdicao.observacaoStatus.trim(),
        });

        setSalvandoEdicaoEmpresa(false);

        if (ok) {
            setEmpresaEdicao(null);
        }
    };

    useEffect(() => {
        let montado = true;

        async function carregarPermissaoSistemaEmpresas() {
            try {
                const permissao = await carregarPermissaoSistemaAtualService({ supabase });
                if (!montado) return;
                setPermissaoSistemaAtual(permissao);
                setMensagemPermissaoSistema(
                    permissao
                        ? "Permissões do sistema carregadas para ações críticas."
                        : "Nenhuma permissão do sistema cadastrada para o usuário atual."
                );
            } catch (erro) {
                if (!montado) return;
                setPermissaoSistemaAtual(null);
                setMensagemPermissaoSistema(
                    `Não foi possível carregar permissões do sistema: ${erro?.message || "erro não identificado"}`
                );
            }
        }

        carregarPermissaoSistemaEmpresas();

        return () => {
            montado = false;
        };
    }, []);

    const podeExcluirEmpresasSistema = useMemo(
        () => usuarioPodeExcluirSistema(permissaoSistemaAtual, MODULOS_PERMISSAO_SISTEMA.EMPRESAS),
        [permissaoSistemaAtual]
    );

    const podeCadastrarEmpresasSistema = useMemo(
        () => usuarioPodeExecutarAcaoSistema(permissaoSistemaAtual, MODULOS_PERMISSAO_SISTEMA.EMPRESAS, ACOES_PERMISSAO_SISTEMA.CADASTRAR),
        [permissaoSistemaAtual]
    );

    const podeEditarEmpresasSistema = useMemo(
        () => usuarioPodeExecutarAcaoSistema(permissaoSistemaAtual, MODULOS_PERMISSAO_SISTEMA.EMPRESAS, ACOES_PERMISSAO_SISTEMA.EDITAR),
        [permissaoSistemaAtual]
    );

    const podeUploadEmpresasSistema = useMemo(
        () => usuarioPodeExecutarAcaoSistema(permissaoSistemaAtual, MODULOS_PERMISSAO_SISTEMA.EMPRESAS, ACOES_PERMISSAO_SISTEMA.UPLOAD),
        [permissaoSistemaAtual]
    );

    const podeExportarEmpresasSistema = useMemo(
        () => usuarioPodeExecutarAcaoSistema(permissaoSistemaAtual, MODULOS_PERMISSAO_SISTEMA.EMPRESAS, ACOES_PERMISSAO_SISTEMA.EXPORTAR),
        [permissaoSistemaAtual]
    );

    const mensagemBloqueioCadastroEmpresas = "Sem permissão para cadastrar empresas.";
    const mensagemBloqueioEdicaoEmpresas = "Sem permissão para editar empresas.";
    const mensagemBloqueioUploadEmpresas = "Sem permissão para enviar ou substituir documentos empresariais.";
    const mensagemBloqueioExportacaoEmpresas = "Sem permissão para exportar relatórios de empresas.";
    const mensagemBloqueioExclusaoEmpresas = "Sem permissão para excluir empresas ou documentos empresariais.";

    const excluirDocumentoEmpresaSeguro = (doc) => {
        if (!onExcluirDocumentoEmpresa) return;

        if (!podeExcluirEmpresasSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioExclusaoEmpresas);
            return;
        }

        onExcluirDocumentoEmpresa(doc);
    };

    const excluirEmpresaEdicao = async () => {
        if (!empresaEdicao?.id || !onExcluirEmpresa) return;

        if (!podeExcluirEmpresasSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioExclusaoEmpresas);
            return;
        }

        const documentosVinculados = documentosPorEmpresa[empresaEdicao.id] || [];
        const colaboradoresVinculados = colaboradoresPorEmpresa[empresaEdicao.id] || [];

        const resumoVinculos = [
            `${colaboradoresVinculados.length} colaborador(es) vinculado(s)`,
            `${documentosVinculados.length} documento(s) vinculado(s)`,
        ].join(" e ");

        const confirmou = window.confirm(
            `Deseja excluir a empresa ${empresaEdicao.nome}?\n\nAtenção: esta ação tenta remover o cadastro da empresa. ${resumoVinculos}. Se houver vínculo protegido no Supabase, a exclusão será bloqueada para preservar o histórico.`
        );

        if (!confirmou) return;

        const confirmacaoTexto = window.prompt('Para confirmar a exclusão definitiva, digite EXCLUIR.');

        if (confirmacaoTexto !== 'EXCLUIR') {
            alert('Exclusão cancelada.');
            return;
        }

        setSalvandoEdicaoEmpresa(true);
        const ok = await onExcluirEmpresa({
            id: empresaEdicao.id,
            nome: empresaEdicao.nome,
        });
        setSalvandoEdicaoEmpresa(false);

        if (ok) {
            setEmpresaEdicao(null);
        }
    };

    const obterUploadRevisao = (tipo) => {
        const dataEmissao = hoje.toISOString().slice(0, 10);

        return {
            dataEmissao,
            dataVencimento: calcularVencimentoDocumento(tipo, dataEmissao),
            observacao: "",
            ...(uploadRevisao[tipo] || {}),
        };
    };

    const atualizarUploadRevisao = (tipo, campo, valor) => {
        setUploadRevisao((atual) => {
            const dadosAtuais = obterUploadRevisao(tipo);
            const atualizados = {
                ...dadosAtuais,
                [campo]: valor,
            };

            if (campo === "dataEmissao") {
                atualizados.dataVencimento = calcularVencimentoDocumento(tipo, valor);
            }

            return {
                ...atual,
                [tipo]: atualizados,
            };
        });
    };

    const enviarDocumentoPelaRevisao = async (empresa, tipo, arquivo) => {
        if (!arquivo) return;

        if (!podeUploadEmpresasSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioUploadEmpresas);
            return;
        }

        if (!validarArquivoAntesUpload(arquivo, "documentoExtenso")) return;

        const dados = obterUploadRevisao(tipo);
        const chave = `${empresa.id}-${tipo}`;

        setSalvandoUploadRevisao(chave);

        const ok = await onAdicionarDocumentoEmpresa({
            empresaId: empresa.id,
            tipo,
            dataEmissao: dados.dataEmissao,
            dataVencimento: dados.dataVencimento || null,
            arquivo,
            observacao: dados.observacao || "",
        });

        setSalvandoUploadRevisao("");

        if (ok) {
            setUploadRevisao((atual) => ({
                ...atual,
                [tipo]: {
                    dataEmissao: hoje.toISOString().slice(0, 10),
                    dataVencimento: calcularVencimentoDocumento(tipo, hoje.toISOString().slice(0, 10)),
                    observacao: "",
                },
            }));
        }
    };

    const adicionarDocumento = async () => {
        if (!podeUploadEmpresasSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioUploadEmpresas);
            return;
        }

        if (!novoDoc.empresaId) {
            alert("Selecione a empresa.");
            return;
        }

        if (!novoDoc.tipo) {
            alert("Selecione o tipo do documento.");
            return;
        }

        if (!novoDoc.dataEmissao) {
            alert("Informe a data de emissão.");
            return;
        }

        setSalvandoDocumento(true);

        const ok = await onAdicionarDocumentoEmpresa({
            empresaId: novoDoc.empresaId,
            tipo: novoDoc.tipo,
            dataEmissao: novoDoc.dataEmissao,
            dataVencimento: novoDoc.dataVencimento || null,
            arquivo: novoDoc.arquivo,
            observacao: novoDoc.observacao.trim(),
        });

        setSalvandoDocumento(false);

        if (ok) {
            setNovoDoc({
                empresaId: novoDoc.empresaId,
                tipo: "PGR",
                dataEmissao: hoje.toISOString().slice(0, 10),
                dataVencimento: calcularVencimentoDocumento("PGR", hoje.toISOString().slice(0, 10)),
                arquivo: null,
                observacao: "",
            });
        }
    };

    const renderEmpresaCard = (empresa, docs, destaqueContratante = false) => {
        const logoUrl = obterUrlLogoEmpresa(empresa.logo_url);
        const contratoUrl = empresa.contrato_url || "";
        const funcionarios = colaboradoresPorEmpresa[empresa.id] || [];
        const situacaoDocumental = calcularSituacaoDocumentalEmpresa(docs);
        const escopoAberto = Boolean(escoposAbertos[empresa.id]);
        const empresaAberta = Boolean(empresasAbertas[empresa.id]);

        return (
            <div key={empresa.id} className={classNames("empresa-base-card", destaqueContratante ? "empresa-base-card--contratante" : "")}> 
                <div className="empresa-base-card__conteudo">
                    <div className="empresa-base-card__dados">
                        <div className="empresa-base-card__logo">
                            {logoUrl ? (
                                <img src={logoUrl} alt={`Logo ${empresa.nome}`} className="h-full w-full object-contain p-1" />
                            ) : (
                                <Building2 className="h-6 w-6 text-slate-400" />
                            )}
                        </div>
                        <div className="empresa-base-card__texto">
                            <p className="empresa-base-card__tipo">{(empresa.tipo_empresa || "Terceirizada").replace(" - Idealiza Cidades", "")}</p>
                            <h3 className="empresa-base-card__nome">{empresa.nome}</h3>
                            <p className="text-sm text-slate-500">{formatarCnpj(empresa.cnpj) || "CNPJ não informado"}</p>
                            <p className="text-xs text-slate-400">
                                Responsável: {empresa.responsavel || "-"} · {empresa.email || "-"}
                            </p>
                            <p className="text-xs text-slate-400">
                                Telefone: {formatarTelefone(empresa.telefone) || "(00) 00000-0000"}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-600">
                                Tipo: {empresa.tipo_empresa || "Terceirizada"}
                            </p>
                            {empresa.empresa_pai_id && (
                                <p className="mt-1 text-xs font-semibold text-slate-600">
                                    Contratada por: {nomeEmpresaPai(empresa.empresa_pai_id) || "Empresa não identificada"}
                                </p>
                            )}
                            <p className="mt-1 text-xs text-slate-500">
                                Funcionários vinculados: <strong>{funcionarios.length}</strong>
                            </p>
                            {empresa.numero_contrato && (
                                <p className="mt-1 text-xs text-slate-500">
                                    Contrato: <strong>{empresa.numero_contrato}</strong>
                                </p>
                            )}

                        </div>
                    </div>

                    <div className="empresa-base-card__acoes">
                        <span className={classNames("whitespace-nowrap rounded-full px-3 py-1 text-center text-xs font-semibold ring-1", classeStatusEmpresa(empresa.status))}>
                            {normalizarStatusEmpresa(empresa.status)}
                        </span>
                        <span
                            title={situacaoDocumental.detalhe}
                            className={classNames("whitespace-nowrap rounded-full px-3 py-1 text-center text-xs font-semibold ring-1", situacaoDocumental.classe)}
                        >
                            {situacaoDocumental.texto}
                        </span>

                        {contratoUrl && (
                            <button
                                type="button"
                                onClick={() => abrirArquivoStorage("contratos-empresas", contratoUrl)}
                                className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100"
                            >
                                <FileText className="h-3.5 w-3.5" />
                                Ver contrato
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => alternarEmpresaAberta(empresa.id)}
                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-slate-800"
                        >
                            {empresaAberta ? (
                                <>
                                    <ChevronUp className="h-4 w-4" />
                                    Recolher empresa
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="h-4 w-4" />
                                    Abrir empresa
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => abrirEdicaoEmpresa(empresa)}
                            className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            <FileText className="h-3.5 w-3.5" />
                            Editar dados
                        </button>
                        <button
                            onClick={() => setEmpresaRevisao({ empresa, docs })}
                            className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                        >
                            <Eye className="h-3.5 w-3.5" />
                            Revisar documentos
                        </button>

                        {empresa.escopo_servico && (
                            <button
                                type="button"
                                onClick={() =>
                                    setEscoposAbertos((atual) => ({
                                        ...atual,
                                        [empresa.id]: !atual[empresa.id],
                                    }))
                                }
                                className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                            >
                                {escopoAberto ? (
                                    <>
                                        <ChevronUp className="h-3.5 w-3.5" />
                                        Recolher escopo
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="h-3.5 w-3.5" />
                                        Abrir escopo
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {empresaAberta ? (
                    <>
                        <div className="mt-4 grid gap-3">
                            {documentosEmpresaBase.map((tipoDoc) => {
                                const doc = docs.find((item) => item.tipo_documento === tipoDoc.tipo);
                                const st = statusEmpresaDocumento(doc?.data_vencimento);
                                const verificacao = obterVerificacaoDocumentoEmpresa(doc);

                                return (
                                    <div key={tipoDoc.tipo} className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
                                        <div className="flex items-start justify-between gap-3 bg-blue-950 px-4 py-3 text-white">
                                            <div className="min-w-0">
                                                <p className="font-bold text-white">{tipoDoc.nome}</p>
                                                <p className="mt-1 text-xs text-blue-100">
                                                    {doc ? "Documento cadastrado" : "Documento ainda não cadastrado"}
                                                </p>
                                            </div>
                                            {doc && <StatusPill status={st} small />}
                                        </div>

                                        {doc ? (
                                            <div className="space-y-3 p-4">
                                                <ResumoDocumentoInline documento={doc} />
                                                {doc.observacao && (
                                                    <p className="line-clamp-2 text-xs text-slate-500">{doc.observacao}</p>
                                                )}

                                                <ResultadoVerificacaoDocumento
                                                    verificacao={verificacao}
                                                    titulo="Verificação documental"
                                                    compacto
                                                    className="mt-3"
                                                    onAprovarManual={({ observacaoManual }) =>
                                                        aprovarVerificacaoDocumentoManual({ verificacao, documento: doc, observacaoManual })
                                                    }
                                                />

                                                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                    <button
                                                        onClick={() => onVisualizarDocumentoEmpresa(doc)}
                                                        disabled={!doc.arquivo_url}
                                                        title="Abrir o documento enviado"
                                                        className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                        Visualizar documento
                                                    </button>

                                                    <button
                                                        onClick={() => excluirDocumentoEmpresaSeguro(doc)}
                                                        disabled={!podeExcluirEmpresasSistema || !onExcluirDocumentoEmpresa}
                                                        title={podeExcluirEmpresasSistema ? "Excluir este documento do cadastro da empresa" : mensagemBloqueioExclusaoEmpresas}
                                                        className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:ring-slate-200"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        {podeExcluirEmpresasSistema ? "Excluir documento" : "Bloqueado"}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-4">
                                                <p className="text-xs text-slate-500">Documento ainda não cadastrado para esta empresa.</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {carregandoVerificacoes && (
                            <p className="mt-3 text-center text-xs font-semibold text-slate-400">
                                Atualizando verificações documentais...
                            </p>
                        )}

                        <div className="mt-4 flex justify-center border-t border-slate-200 pt-4">
                            <button
                                onClick={() => baixarRelatorioDocumentos(empresa, docs)}
                                disabled={!podeExportarEmpresasSistema}
                                title={podeExportarEmpresasSistema ? "Baixar documentos desta empresa" : mensagemBloqueioExportacaoEmpresas}
                                className="inline-flex items-center gap-2 whitespace-nowrap rounded-2xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <FileText className="h-4 w-4" />
                                Baixar PDF documentos desta empresa
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="empresa-base-card__resumo-recolhido">
                        Documentos e detalhes recolhidos. Clique em <span className="text-slate-800">Abrir</span> para visualizar PGR, PCMSO, contrato, relatórios e ações da empresa.
                    </div>
                )}

                {empresa.escopo_servico && escopoAberto && (
                    <div className="empresa-base-card__escopo-area">
                        <p className="empresa-base-card__escopo-titulo">Observações</p>
                        <p className="empresa-base-card__escopo-texto">{empresa.escopo_servico}</p>
                    </div>
                )}
            </div>
        );
    };


    const atualizarCadastroEmpresasRecolhido = (valorOuFuncao) => {
        setCadastroEmpresasRecolhido((atual) => {
            const novoValor = typeof valorOuFuncao === "function" ? valorOuFuncao(atual) : valorOuFuncao;
            return salvarPreferenciaPainelBoolean(CHAVE_CADASTRO_EMPRESAS_RECOLHIDO, novoValor);
        });
    };

    const atualizarInformacoesEmpresasRecolhidas = (valorOuFuncao) => {
        setInformacoesEmpresasRecolhidas((atual) => {
            const novoValor = typeof valorOuFuncao === "function" ? valorOuFuncao(atual) : valorOuFuncao;
            return salvarPreferenciaPainelBoolean(CHAVE_INFO_EMPRESAS_RECOLHIDA, novoValor);
        });
    };


    const filtrosAtuaisEmpresasDocumentos = useMemo(
        () => ({
            buscaEmpresa: buscaEmpresa.trim(),
            filtroStatusEmpresa,
            filtroTipoEmpresa,
        }),
        [buscaEmpresa, filtroStatusEmpresa, filtroTipoEmpresa]
    );

    const salvarFiltrosEmpresasDocumentos = () => {
        if (typeof window === "undefined" || !window.localStorage) return;

        try {
            window.localStorage.setItem(CHAVE_FILTROS_EMPRESAS_DOCUMENTOS, JSON.stringify(filtrosAtuaisEmpresasDocumentos));
            setVersaoFiltroSalvoEmpresasDocumentos((valor) => valor + 1);
            alert("Filtros do relat\u00f3rio de empresas e documentos salvos.");
        } catch (error) {
            console.error("Erro ao salvar filtros do relat\u00f3rio de empresas e documentos:", error);
            alert("N\u00e3o foi poss\u00edvel salvar os filtros do relat\u00f3rio de empresas e documentos.");
        }
    };

    const aplicarFiltrosSalvosEmpresasDocumentos = () => {
        const filtrosSalvos = carregarFiltrosSalvosEmpresasDocumentos();

        if (!filtrosSalvos) {
            alert("Nenhum filtro salvo encontrado para o relat\u00f3rio de empresas e documentos.");
            return;
        }

        setBuscaEmpresa(filtrosSalvos.buscaEmpresa || "");
        setFiltroStatusEmpresa(filtrosSalvos.filtroStatusEmpresa || "Todos");
        setFiltroTipoEmpresa(filtrosSalvos.filtroTipoEmpresa || "Todos");
        alert("Filtros salvos aplicados no relat\u00f3rio de empresas e documentos.");
    };

    const limparFiltrosSalvosEmpresasDocumentos = () => {
        if (typeof window === "undefined" || !window.localStorage) return;

        window.localStorage.removeItem(CHAVE_FILTROS_EMPRESAS_DOCUMENTOS);
        setVersaoFiltroSalvoEmpresasDocumentos((valor) => valor + 1);
        alert("Filtros salvos do relat\u00f3rio de empresas e documentos removidos.");
    };
    const empresasFiltradas = empresasBanco.filter((empresa) => {
        const texto = [
            empresa.nome,
            empresa.cnpj,
            empresa.responsavel,
            empresa.email,
            empresa.telefone,
            empresa.tipo_empresa,
            nomeEmpresaPai(empresa.empresa_pai_id),
            normalizarStatusEmpresa(empresa.status),
        ]
            .join(" ")
            .toLowerCase();

        const atendeBusca = texto.includes(buscaEmpresa.toLowerCase());
        const atendeStatus = filtroStatusEmpresa === "Todos" || normalizarStatusEmpresa(empresa.status) === filtroStatusEmpresa;
        const atendeTipo = filtroTipoEmpresa === "Todos" || (empresa.tipo_empresa || "Terceirizada") === filtroTipoEmpresa;

        return atendeBusca && atendeStatus && atendeTipo;
    });

    const empresasContratantes = empresasFiltradas.filter(
        (empresa) => (empresa.tipo_empresa || "Terceirizada") === "Contratante - Idealiza Cidades"
    );

    const empresasTerceirizadas = empresasFiltradas.filter(
        (empresa) => (empresa.tipo_empresa || "Terceirizada") === "Terceirizada"
    );

    const empresasSubcontratadas = empresasFiltradas.filter(
        (empresa) => (empresa.tipo_empresa || "Terceirizada") === "Subcontratada"
    );

    const subcontratadasPorContratante = empresasSubcontratadas.reduce((acc, empresa) => {
        const chave = empresa.empresa_pai_id || "sem-vinculo";

        if (!acc[chave]) {
            acc[chave] = {
                contratante: empresasBanco.find((item) => item.id === empresa.empresa_pai_id) || null,
                empresas: [],
            };
        }

        acc[chave].empresas.push(empresa);
        return acc;
    }, {});

    const gruposSubcontratadas = Object.values(subcontratadasPorContratante);

    const documentosFiltrados = documentosEmpresas.filter((doc) =>
        empresasFiltradas.some((empresa) => empresa.id === doc.empresa_id)
    );

    const montarEmpresaRelatorioDocumental = (empresa) => {
        const docs = documentosPorEmpresa[empresa.id] || [];
        const situacaoDocumental = calcularSituacaoDocumentalEmpresa(docs);
        const qtdFuncionarios = (colaboradoresPorEmpresa[empresa.id] || []).length;

        const documentos = documentosEmpresaBase.map((tipoDoc) => {
            const doc = docs.find((item) => item.tipo_documento === tipoDoc.tipo);
            const status = doc
                ? statusEmpresaDocumento(doc.data_vencimento)
                : { texto: "Pendente", chave: "pendente" };

            return {
                tipo: tipoDoc.tipo,
                status: status.texto,
                chave: status.chave || "pendente",
                emissao: doc?.data_emissao ? formatDate(doc.data_emissao) : "-",
                revisao: doc?.data_vencimento ? formatDate(doc.data_vencimento) : doc ? "Sem revisão definida" : "-",
                arquivo: doc?.arquivo_nome || "-",
                observacao: doc?.observacao || "",
            };
        });

        return {
            id: empresa.id,
            nome: empresa.nome || "Empresa sem nome",
            tipo: empresa.tipo_empresa || "Terceirizada",
            contratadaPor: nomeEmpresaPai(empresa.empresa_pai_id),
            statusEmpresa: normalizarStatusEmpresa(empresa.status),
            situacaoDocumental: situacaoDocumental.texto,
            situacaoChave: situacaoDocumental.chave || "pendente",
            funcionarios: qtdFuncionarios,
            cnpj: empresa.cnpj || "-",
            responsavel: empresa.responsavel || "-",
            email: empresa.email || "-",
            telefone: empresa.telefone || "-",
            numeroContrato: empresa.numero_contrato || "-",
            inicioContrato: empresa.data_inicio_contrato ? formatDate(empresa.data_inicio_contrato) : "-",
            fimContrato: empresa.data_fim_contrato ? formatDate(empresa.data_fim_contrato) : "-",
            escopoServico: empresa.escopo_servico || "-",
            observacaoStatus: empresa.observacao_status || "-",
            documentos,
        };
    };

    const montarPendenciasRelatorioDocumental = () => {
        const pendencias = [];

        empresasFiltradas.forEach((empresa) => {
            const empresaRelatorio = montarEmpresaRelatorioDocumental(empresa);

            empresaRelatorio.documentos.forEach((doc) => {
                if (!["vencido", "vencendo", "pendente"].includes(doc.chave)) return;

                pendencias.push({
                    empresa: empresaRelatorio.nome,
                    tipoEmpresa: empresaRelatorio.tipo,
                    contratadaPor: empresaRelatorio.contratadaPor,
                    statusEmpresa: empresaRelatorio.statusEmpresa,
                    situacaoDocumental: empresaRelatorio.situacaoDocumental,
                    funcionarios: empresaRelatorio.funcionarios,
                    documento: doc.tipo,
                    situacao: doc.status,
                    chave: doc.chave,
                    emissao: doc.emissao,
                    revisao: doc.revisao,
                    arquivo: doc.arquivo,
                });
            });
        });

        return pendencias;
    };

    const baixarRelatorioEmpresas = async () => {
        if (!podeExportarEmpresasSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioExportacaoEmpresas);
            return;
        }

        const empresasRelatorio = empresasFiltradas.map(montarEmpresaRelatorioDocumental);

        const relatorioEmpresasDocumentosFiltrosAplicados = {
            busca: buscaEmpresa.trim() || "-",
            tipo: filtroTipoEmpresa,
            status: filtroStatusEmpresa,
            empresasFiltradas: `${empresasFiltradas.length} empresa(s)`,
            documentosFiltrados: `${documentosFiltrados.length} documento(s)`,
        };

        await baixarRelatorioEmpresasDocumentosPDF({
            empresas: empresasRelatorio,
            nomeArquivo: "relatorio-empresas-documentos.pdf",
            filtros: relatorioEmpresasDocumentosFiltrosAplicados,
        });
    };

    const baixarRelatorioPendencias = async () => {
        if (!podeExportarEmpresasSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioExportacaoEmpresas);
            return;
        }

        const pendenciasRelatorio = montarPendenciasRelatorioDocumental();

        const relatorioPendenciasDocumentaisFiltrosAplicados = {
            busca: buscaEmpresa.trim() || "-",
            tipo: filtroTipoEmpresa,
            status: filtroStatusEmpresa,
            empresasFiltradas: `${empresasFiltradas.length} empresa(s)`,
            documentosFiltrados: `${documentosFiltrados.length} documento(s)`,
            pendenciasFiltradas: `${pendenciasRelatorio.length} pendência(s)`,
        };

        await baixarRelatorioPendenciasDocumentaisPDF({
            pendencias: pendenciasRelatorio,
            nomeArquivo: "relatorio-pendencias-documentais.pdf",
            filtros: relatorioPendenciasDocumentaisFiltrosAplicados,
        });
    };

    const baixarRelatorioDocumentos = async (empresa, docsEmpresa = []) => {
        if (!podeExportarEmpresasSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioExportacaoEmpresas);
            return;
        }

        const empresaRelatorio = montarEmpresaRelatorioDocumental(empresa);
        const documentos = docsEmpresa.length
            ? docsEmpresa.map((doc) => {
                const status = statusEmpresaDocumento(doc.data_vencimento);
                return {
                    tipo: doc.tipo_documento,
                    status: status.texto,
                    chave: status.chave,
                    emissao: doc.data_emissao ? formatDate(doc.data_emissao) : "-",
                    revisao: doc.data_vencimento ? formatDate(doc.data_vencimento) : "Sem revisão definida",
                    arquivo: doc.arquivo_nome || "-",
                    observacao: doc.observacao || "-",
                };
            })
            : [{
                tipo: "Sem documentos enviados",
                status: "Pendente",
                chave: "pendente",
                emissao: "-",
                revisao: "-",
                arquivo: "-",
                observacao: "Nenhum documento enviado para esta empresa.",
            }];

        const nomeSeguro = sanitizarNomeArquivo(empresa.nome || "empresa").replace(/\.pdf$/i, "");

        await baixarRelatorioDocumentosEmpresaPDF({
            empresa: { ...empresaRelatorio, documentos },
            nomeArquivo: `documentos-enviados-${nomeSeguro}.pdf`,
        });
    };


    return (
        <div>
            <Header
                titulo="Empresas e documentos"
                subtitulo="Cadastro de empresas terceirizadas e controle de LTCAT, PCMSO e PGR."
                acao={
                    <button
                        onClick={onAtualizarBanco}
                        className="empresas-cadastro-header__acao"
                    >
                        <RefreshCw className={classNames("h-4 w-4", carregandoBanco && "animate-spin")} />
                        Atualizar banco
                    </button>
                }
            />

            {erroBanco && (
                <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700 ring-1 ring-red-200">
                    {erroBanco}
                </div>
            )}

            {erroVerificacoes && (
                <div className="mb-5 rounded-2xl bg-amber-50 p-4 text-sm font-medium text-amber-700 ring-1 ring-amber-200">
                    {erroVerificacoes}
                </div>
            )}

            {permissaoSistemaAtual && (!podeCadastrarEmpresasSistema || !podeEditarEmpresasSistema || !podeUploadEmpresasSistema || !podeExportarEmpresasSistema) && (
                <div className="mb-5 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
                    Perfil atual: {permissaoSistemaAtual.perfil}. Algumas ações de Empresas estão bloqueadas visualmente conforme o perfil cadastrado.
                </div>
            )}

            <div className="space-y-6">
                <section className="empresas-section-destaque">
                    <Card className="empresas-cadastro-unificado border-blue-100 bg-blue-50/40">
                        <div className="empresas-cadastro-header">
                            <div className="empresas-cadastro-header__info">
                                <div className="empresas-cadastro-header__icone">
                                    <Building2 className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="empresas-cadastro-header__etiqueta">Cadastro</p>
                                    <h2 className="empresas-cadastro-header__titulo">Empresas e documentos</h2>
                                    <p className="empresas-cadastro-header__subtitulo">
                                        Cadastro de empresas e lançamento de documentos em um único local, com campos organizados.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => atualizarCadastroEmpresasRecolhido((valor) => !valor)}
                                className="empresas-cadastro-header__acao"
                            >
                                {cadastroEmpresasRecolhido ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                                {cadastroEmpresasRecolhido ? "Abrir cadastro" : "Recolher cadastro"}
                            </button>
                        </div>

                    {cadastroEmpresasRecolhido ? null : (
                        <div className="empresas-cadastro-grid">
                    <Card className="empresas-form-panel empresas-form-panel--empresa overflow-hidden">
                        <div className="empresas-form-panel__titulo-escuro">
                            <div className="flex items-center gap-3">
                                <div className="rounded-2xl bg-white/10 p-3">
                                    <Building2 className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2>Adicionar empresa</h2>
                                    <p>Cadastro de empresas contratantes, terceirizadas ou subcontratadas</p>
                                </div>
                            </div>
                        </div>

                        <div className="empresa-form-grid empresa-form-grid--empresa empresa-form-grid--empresa-definitivo">
                            <div className="empresa-form-linha empresa-form-linha--2">
                                <input
                                    value={novaEmpresa.nome}
                                    onChange={(e) => setNovaEmpresa({ ...novaEmpresa, nome: e.target.value })}
                                    placeholder="Nome da empresa"
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />
                                <input
                                    value={novaEmpresa.cnpj}
                                    onChange={(e) => setNovaEmpresa({ ...novaEmpresa, cnpj: formatarCnpj(e.target.value) })}
                                    placeholder="CNPJ"
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />
                            </div>

                            <div className="empresa-form-linha empresa-form-linha--3">
                                <input
                                    value={novaEmpresa.responsavel}
                                    onChange={(e) => setNovaEmpresa({ ...novaEmpresa, responsavel: e.target.value })}
                                    placeholder="Responsável"
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />
                                <input
                                    value={novaEmpresa.email}
                                    onChange={(e) => setNovaEmpresa({ ...novaEmpresa, email: e.target.value })}
                                    placeholder="E-mail"
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />
                                <input
                                    value={novaEmpresa.telefone}
                                    onChange={(e) => setNovaEmpresa({ ...novaEmpresa, telefone: formatarTelefone(e.target.value) })}
                                    placeholder="Telefone"
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />
                            </div>

                            <div className="empresa-form-bloco-auditoria">
                                <p>Contato para receber auditorias</p>
                                <div className="empresa-form-bloco-auditoria__grid">
                                    <input
                                        value={novaEmpresa.responsavelAuditoria}
                                        onChange={(e) => setNovaEmpresa({ ...novaEmpresa, responsavelAuditoria: e.target.value })}
                                        placeholder="Responsável"
                                        className="w-full rounded-2xl border border-emerald-100 px-4 py-3 text-center text-[13px] outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                                    />
                                    <input
                                        type="email"
                                        value={novaEmpresa.emailAuditoria}
                                        onChange={(e) => setNovaEmpresa({ ...novaEmpresa, emailAuditoria: e.target.value })}
                                        placeholder="E-mail"
                                        className="w-full rounded-2xl border border-emerald-100 px-4 py-3 text-center text-[13px] outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                                    />
                                    <input
                                        value={novaEmpresa.whatsappAuditoria}
                                        onChange={(e) => setNovaEmpresa({ ...novaEmpresa, whatsappAuditoria: formatarTelefone(e.target.value) })}
                                        placeholder="WhatsApp"
                                        className="w-full rounded-2xl border border-emerald-100 px-4 py-3 text-center text-[13px] outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                                    />
                                </div>
                            </div>

                            <div className="empresa-form-linha empresa-form-linha--3">
                                <input
                                    value={novaEmpresa.tstResponsavel}
                                    onChange={(e) => setNovaEmpresa({ ...novaEmpresa, tstResponsavel: e.target.value })}
                                    placeholder="TST responsável"
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-[13px] outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />
                                <input
                                    type="email"
                                    value={novaEmpresa.tstEmail}
                                    onChange={(e) => setNovaEmpresa({ ...novaEmpresa, tstEmail: e.target.value })}
                                    placeholder="E-mail TST"
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-[13px] outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />
                                <input
                                    value={novaEmpresa.tstWhatsapp}
                                    onChange={(e) => setNovaEmpresa({ ...novaEmpresa, tstWhatsapp: formatarTelefone(e.target.value) })}
                                    placeholder="WhatsApp TST"
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-[13px] outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />
                            </div>

                            <div className="empresa-form-linha empresa-form-linha--3 empresa-form-linha--uploads">
                                <select
                                    value={novaEmpresa.tipoEmpresa}
                                    onChange={(e) => setNovaEmpresa({ ...novaEmpresa, tipoEmpresa: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                >
                                    <option>Terceirizada</option>
                                    <option>Subcontratada</option>
                                    <option>Contratante - Idealiza Cidades</option>
                                </select>

                                <div className="empresa-upload-wrapper">
                                    <label className="empresa-upload-card h-[52px] min-h-[52px]">
                                        <Upload className="h-4 w-4" />
                                        <span className="block min-w-0 truncate text-center text-[13px] leading-tight">{novaEmpresa.logo ? novaEmpresa.logo.name : "Adicionar logo"}</span>
                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                            className="hidden"
                                            onChange={(e) => {
                                                const arquivo = e.target.files?.[0] || null;
                                                if (arquivo && !validarArquivoAntesUpload(arquivo, "fotoAuditoria")) {
                                                    e.target.value = "";
                                                    return;
                                                }
                                                setNovaEmpresa({ ...novaEmpresa, logo: arquivo });
                                            }}
                                        />
                                    </label>
                                    <div className="w-full min-w-0 [&>*]:w-full [&>*]:max-w-none">
                                        <FileUploadAviso arquivo={novaEmpresa.logo} tipo="fotoAuditoria" />
                                    </div>
                                </div>

                                <div className="empresa-upload-wrapper">
                                    <label className="empresa-upload-card empresa-upload-card--contrato h-[52px] min-h-[52px]">
                                        <Upload className="h-4 w-4" />
                                        <span className="block min-w-0 truncate text-center text-[13px] leading-tight">{novaEmpresa.contratoArquivo ? novaEmpresa.contratoArquivo.name : "add. contrato"}</span>
                                        <input
                                            type="file"
                                            accept="application/pdf,image/png,image/jpeg,image/webp"
                                            className="hidden"
                                            onChange={(e) => {
                                                const arquivo = e.target.files?.[0] || null;
                                                if (arquivo && !validarArquivoAntesUpload(arquivo, "documentoExtenso")) {
                                                    e.target.value = "";
                                                    return;
                                                }
                                                setNovaEmpresa({ ...novaEmpresa, contratoArquivo: arquivo });
                                            }}
                                        />
                                    </label>
                                    <div className="w-full min-w-0 [&>*]:w-full [&>*]:max-w-none">
                                        <FileUploadAviso arquivo={novaEmpresa.contratoArquivo} tipo="documentoExtenso" />
                                    </div>
                                </div>
                            </div>

                            {novaEmpresa.tipoEmpresa === "Subcontratada" && (
                                <select
                                    value={novaEmpresa.empresaPaiId}
                                    onChange={(e) => setNovaEmpresa({ ...novaEmpresa, empresaPaiId: e.target.value })}
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                >
                                    <option value="">Selecione a empresa terceirizada contratante direta</option>
                                    {empresasBanco
                                        .filter((empresa) => (empresa.tipo_empresa || "Terceirizada") !== "Subcontratada")
                                        .map((empresa) => (
                                            <option key={empresa.id} value={empresa.id}>
                                                {empresa.nome}
                                            </option>
                                        ))}
                                </select>
                            )}

                            <div className="empresa-form-linha empresa-form-linha--2">
                                <input
                                    value={novaEmpresa.numeroContrato}
                                    onChange={(e) => setNovaEmpresa({ ...novaEmpresa, numeroContrato: e.target.value })}
                                    placeholder="Nº do contrato"
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />
                                <input
                                    value={novaEmpresa.responsavelContratante}
                                    onChange={(e) => setNovaEmpresa({ ...novaEmpresa, responsavelContratante: e.target.value })}
                                    placeholder="Responsável da contratante"
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />
                            </div>

                            <div className="empresa-form-linha empresa-form-linha--3 empresa-form-linha--contrato">
                                <div className="empresa-campo-contrato">
                                    <label className="block text-center text-xs font-bold uppercase tracking-wide text-slate-500">Início do contrato</label>
                                    <input
                                        type="date"
                                        value={novaEmpresa.dataInicioContrato}
                                        onChange={(e) => setNovaEmpresa({ ...novaEmpresa, dataInicioContrato: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>
                                <div className="empresa-campo-contrato">
                                    <label className="block text-center text-xs font-bold uppercase tracking-wide text-slate-500">Fim do contrato</label>
                                    <input
                                        type="date"
                                        value={novaEmpresa.dataFimContrato}
                                        onChange={(e) => setNovaEmpresa({ ...novaEmpresa, dataFimContrato: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>
                                <textarea
                                    value={novaEmpresa.observacaoStatus}
                                    onChange={(e) => setNovaEmpresa({ ...novaEmpresa, observacaoStatus: e.target.value })}
                                    placeholder="Observações"
                                    rows={1}
                                    className="empresa-campo-textarea w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                />
                            </div>

                            <textarea
                                value={novaEmpresa.escopoServico}
                                onChange={(e) => setNovaEmpresa({ ...novaEmpresa, escopoServico: e.target.value })}
                                placeholder="Escopo do trabalho"
                                rows={2}
                                className="empresa-campo-textarea empresa-campo-textarea--observacao w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />

                            <button
                                onClick={adicionarEmpresa}
                                disabled={salvandoEmpresa || !podeCadastrarEmpresasSistema}
                                title={podeCadastrarEmpresasSistema ? "Cadastrar empresa" : mensagemBloqueioCadastroEmpresas}
                                className="empresa-botao-cadastrar-final disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Plus className="h-4 w-4" />
                                {salvandoEmpresa ? "Salvando empresa..." : "Cadastrar empresa"}
                            </button>
                        </div>
                    </Card>

                    <Card className="empresas-form-panel empresas-form-panel--documento overflow-hidden">
                        <div className="empresas-form-panel__titulo-escuro">
                            <div className="flex items-center gap-3">
                                <div className="rounded-2xl bg-white/10 p-3">
                                    <FileText className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2>Adicionar documento da empresa</h2>
                                    <p>Controle de validade/revisão de LTCAT, PCMSO e PGR.</p>
                                </div>
                            </div>
                        </div>

                        <div className="empresa-form-grid empresa-form-grid--documento mt-5">
                            <select
                                value={novoDoc.empresaId}
                                onChange={(e) => setNovoDoc({ ...novoDoc, empresaId: e.target.value })}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            >
                                <option value="">Selecione a empresa</option>
                                {empresasBanco.map((empresa) => (
                                    <option key={empresa.id} value={empresa.id}>
                                        {empresa.nome}
                                    </option>
                                ))}
                            </select>

                            <div className="empresa-doc-campos-datas">
                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Emissão</label>
                                    <input
                                        type="date"
                                        value={novoDoc.dataEmissao}
                                        onChange={(e) => alterarEmissaoDocumento(e.target.value)}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Vencimento / revisão</label>
                                    <input
                                        type="date"
                                        value={novoDoc.dataVencimento || ""}
                                        onChange={(e) => setNovoDoc({ ...novoDoc, dataVencimento: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>
                            </div>

                            <div className="empresa-doc-tipos-grid empresa-doc-tipos-grid--vertical">
                                {documentosEmpresaBase.map((doc, indice) => (
                                    <button
                                        key={doc.tipo}
                                        type="button"
                                        onClick={() => alterarTipoDocumento(doc.tipo)}
                                        className={classNames(
                                            "empresa-doc-tipo-card empresa-doc-tipo-card--grande",
                                            novoDoc.tipo === doc.tipo && "empresa-doc-tipo-card--ativo"
                                        )}
                                    >
                                        <div className="empresa-doc-tipo-card__header">
                                            <div className="empresa-doc-tipo-card__indice">{indice + 1}</div>
                                            <div className="empresa-doc-tipo-card__titulo-area">
                                                <strong>{doc.nome}</strong>
                                                <span>{doc.tipo}</span>
                                            </div>
                                        </div>
                                        <div className="empresa-doc-tipo-card__conteudo">
                                            {obterResumoDocumentoEmpresa(doc.tipo).map((linha) => (
                                                <p key={linha}>{linha}</p>
                                            ))}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <label className="empresa-doc-upload-grande flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-600 hover:bg-slate-100">
                                <Upload className="h-4 w-4" />
                                <span className="empresa-doc-upload-grande__texto">{novoDoc.arquivo ? novoDoc.arquivo.name : "Selecionar PDF do documento"}</span>
                                <input
                                    type="file"
                                    accept="application/pdf,image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const arquivo = e.target.files?.[0] || null;
                                        if (arquivo && !validarArquivoAntesUpload(arquivo, "documentoExtenso")) {
                                            e.target.value = "";
                                            return;
                                        }
                                        setNovoDoc({ ...novoDoc, arquivo });
                                    }}
                                />
                            </label>
                            <div className="w-full min-w-0 [&>*]:w-full [&>*]:max-w-none">
                                <FileUploadAviso arquivo={novoDoc.arquivo} tipo="documentoExtenso" />
                            </div>

                            <button
                                onClick={adicionarDocumento}
                                disabled={salvandoDocumento || !podeUploadEmpresasSistema}
                                title={podeUploadEmpresasSistema ? "Salvar documento da empresa" : mensagemBloqueioUploadEmpresas}
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <FileText className="h-4 w-4" />
                                <span className="empresa-doc-botao-salvar__texto">{salvandoDocumento ? "Salvando documento..." : "Salvar documento da empresa"}</span>
                            </button>
                        </div>
                    </Card>
                        </div>
                    )}
                    </Card>
                </section>

                <Card className="empresas-info-card">
                    <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 flex items-start gap-3">
                            <div className="rounded-2xl bg-slate-950 p-3 text-white">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Base de empresas</p>
                                <h2 className="mt-1 text-xl font-black text-slate-950">Informações das empresas</h2>
                                <p className="mt-1 text-sm leading-6 text-slate-500">Separação entre contratante, terceirizadas, subcontratadas e documentos vinculados.</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                {empresasFiltradas.length} de {empresasBanco.length} empresa(s)
                            </span>
                            <button
                                type="button"
                                onClick={() => atualizarInformacoesEmpresasRecolhidas((valor) => !valor)}
                                className="empresas-cadastro-header__acao"
                            >
                                {informacoesEmpresasRecolhidas ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                                {informacoesEmpresasRecolhidas ? "Abrir informações" : "Recolher informações"}
                            </button>
                        </div>
                    </div>

                    {informacoesEmpresasRecolhidas ? null : (
                        <>
                    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-wide text-slate-500">{"Filtros salvos do relat\u00f3rio de empresas e documentos"}</p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">{"Salve busca, tipo e status para reutilizar no PDF geral de empresas e documentos."}</p>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={salvarFiltrosEmpresasDocumentos}
                                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100"
                                >
                                    Salvar filtro
                                </button>
                                <button
                                    type="button"
                                    onClick={aplicarFiltrosSalvosEmpresasDocumentos}
                                    disabled={!filtrosSalvosEmpresasDocumentosDisponiveis}
                                    className={classNames(
                                        "rounded-2xl border px-4 py-2 text-xs font-black uppercase tracking-wide shadow-sm transition",
                                        filtrosSalvosEmpresasDocumentosDisponiveis
                                            ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
                                            : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                    )}
                                >
                                    Aplicar filtro salvo
                                </button>
                                <button
                                    type="button"
                                    onClick={limparFiltrosSalvosEmpresasDocumentos}
                                    disabled={!filtrosSalvosEmpresasDocumentosDisponiveis}
                                    className={classNames(
                                        "rounded-2xl border px-4 py-2 text-xs font-black uppercase tracking-wide shadow-sm transition",
                                        filtrosSalvosEmpresasDocumentosDisponiveis
                                            ? "border-red-100 bg-white text-red-600 hover:bg-red-50"
                                            : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                    )}
                                >
                                    Limpar filtro salvo
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="empresas-filtros-grid mb-5 grid gap-3 lg:grid-cols-[1fr_220px_220px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={buscaEmpresa}
                                onChange={(e) => setBuscaEmpresa(e.target.value)}
                                placeholder="Pesquisar por empresa, CNPJ, responsável, e-mail ou status"
                                className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />
                        </div>

                        <select
                            value={filtroTipoEmpresa}
                            onChange={(e) => setFiltroTipoEmpresa(e.target.value)}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option>Todos</option>
                            <option>Contratante - Idealiza Cidades</option>
                            <option>Terceirizada</option>
                            <option>Subcontratada</option>
                        </select>

                        <select
                            value={filtroStatusEmpresa}
                            onChange={(e) => setFiltroStatusEmpresa(e.target.value)}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option>Todos</option>
                            <option>Empresa ativa</option>
                            <option>Empresa inativa</option>
                            <option>Empresa inapta</option>
                            <option>Empresa suspensa</option>
                        </select>
                    </div>

                    {carregandoBanco && (
                        <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                            Carregando empresas e documentos...
                        </div>
                    )}

                    {!carregandoBanco && empresasBanco.length === 0 && (
                        <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center">
                            <Building2 className="mx-auto h-10 w-10 text-slate-300" />
                            <h3 className="mt-3 font-bold text-slate-900">Nenhuma empresa cadastrada</h3>
                            <p className="mt-1 text-sm text-slate-500">Cadastre a contratante e as terceirizadas no formulário ao lado.</p>
                        </div>
                    )}

                    {!carregandoBanco && empresasBanco.length > 0 && empresasFiltradas.length === 0 && (
                        <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center">
                            <Search className="mx-auto h-10 w-10 text-slate-300" />
                            <h3 className="mt-3 font-bold text-slate-900">Nenhuma empresa encontrada</h3>
                            <p className="mt-1 text-sm text-slate-500">Altere a pesquisa ou os filtros para visualizar empresas.</p>
                        </div>
                    )}

                    {!carregandoBanco && empresasFiltradas.length > 0 && (
                        <div className="empresas-base-grid-3">
                            {empresasFiltradas.map((empresa) => {
                                const docs = documentosPorEmpresa[empresa.id] || [];
                                const destaqueContratante = (empresa.tipo_empresa || "Terceirizada") === "Contratante - Idealiza Cidades";
                                return renderEmpresaCard(empresa, docs, destaqueContratante);
                            })}
                        </div>
                    )}

                    {empresasBanco.length > 0 && (
                        <div className="mt-8 border-t border-slate-200 pt-5">
                            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Relatórios gerais em PDF
                            </p>

                            <div className="flex flex-wrap justify-center gap-3">
                                <button
                                    onClick={baixarRelatorioEmpresas}
                                    disabled={!podeExportarEmpresasSistema}
                                    title={podeExportarEmpresasSistema ? "Baixar relatório geral" : mensagemBloqueioExportacaoEmpresas}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Download className="h-4 w-4" />
                                    Baixar PDF geral
                                </button>

                                <button
                                    onClick={baixarRelatorioPendencias}
                                    disabled={!podeExportarEmpresasSistema}
                                    title={podeExportarEmpresasSistema ? "Baixar relatório de pendências" : mensagemBloqueioExportacaoEmpresas}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-orange-50 px-5 py-3 text-xs font-semibold text-orange-700 ring-1 ring-orange-200 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <AlertTriangle className="h-4 w-4" />
                                    Baixar PDF pendências
                                </button>

                            </div>
                        </div>
                    )}
                        </>
                    )}

                </Card>
            </div>

            {empresaEdicao && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-slate-950/70 p-4 md:items-center">
                    <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-[2rem] bg-white shadow-2xl">
                        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white p-6 pb-4">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Editar empresa</p>
                                <h2 className="mt-1 text-2xl font-bold text-slate-950">{empresaEdicao.nome}</h2>
                                <p className="mt-1 text-sm text-slate-500">Atualize os dados cadastrais da empresa terceirizada.</p>
                            </div>
                            <button
                                onClick={() => setEmpresaEdicao(null)}
                                className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                            >
                                Fechar
                            </button>
                        </div>

                        <div className="scrollbar-discreta flex-1 overflow-y-auto px-6 py-5">
                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="md:col-span-2">
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Nome da empresa</label>
                                    <input
                                        value={empresaEdicao.nome}
                                        onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, nome: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">CNPJ</label>
                                    <input
                                        value={empresaEdicao.cnpj}
                                        onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, cnpj: formatarCnpj(e.target.value) })}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Status</label>
                                    <select
                                        value={normalizarStatusEmpresa(empresaEdicao.status)}
                                        onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, status: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    >
                                        <option>Empresa ativa</option>
                                        <option>Empresa inativa</option>
                                        <option>Empresa inapta</option>
                                        <option>Empresa suspensa</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Tipo da empresa</label>
                                    <select
                                        value={empresaEdicao.tipoEmpresa}
                                        onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, tipoEmpresa: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    >
                                        <option>Terceirizada</option>
                                        <option>Subcontratada</option>
                                        <option>Contratante - Idealiza Cidades</option>
                                    </select>
                                </div>

                                {empresaEdicao.tipoEmpresa === "Subcontratada" && (
                                    <div className="md:col-span-2">
                                        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                            Empresa terceirizada contratante direta
                                        </label>
                                        <select
                                            value={empresaEdicao.empresaPaiId}
                                            onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, empresaPaiId: e.target.value })}
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                        >
                                            <option value="">Selecione a empresa contratante direta</option>
                                            {empresasBanco
                                                .filter((empresa) => empresa.id !== empresaEdicao.id && (empresa.tipo_empresa || "Terceirizada") !== "Subcontratada")
                                                .map((empresa) => (
                                                    <option key={empresa.id} value={empresa.id}>
                                                        {empresa.nome}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="mb-1 block text-center text-xs font-bold uppercase tracking-wide text-slate-500">Responsável</label>
                                    <input
                                        value={empresaEdicao.responsavel}
                                        onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, responsavel: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-[13px] outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-center text-xs font-bold uppercase tracking-wide text-slate-500">E-mail</label>
                                    <input
                                        value={empresaEdicao.email}
                                        onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, email: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-[13px] outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Telefone</label>
                                    <input
                                        value={empresaEdicao.telefone}
                                        onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, telefone: formatarTelefone(e.target.value) })}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>

                                <div className="md:col-span-2 rounded-3xl bg-emerald-50/60 p-3 ring-1 ring-emerald-100">
                                    <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Contato para receber auditorias</p>
                                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                                        <input
                                            value={empresaEdicao.responsavelAuditoria}
                                            onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, responsavelAuditoria: e.target.value })}
                                            placeholder="Responsável"
                                            className="w-full rounded-2xl border border-emerald-100 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                                        />
                                        <input
                                            type="email"
                                            value={empresaEdicao.emailAuditoria}
                                            onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, emailAuditoria: e.target.value })}
                                            placeholder="E-mail"
                                            className="w-full rounded-2xl border border-emerald-100 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                                        />
                                        <input
                                            value={empresaEdicao.whatsappAuditoria}
                                            onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, whatsappAuditoria: formatarTelefone(e.target.value) })}
                                            placeholder="WhatsApp"
                                            className="w-full rounded-2xl border border-emerald-100 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1 block text-center text-xs font-bold uppercase tracking-wide text-slate-500">TST responsável</label>
                                    <input
                                        value={empresaEdicao.tstResponsavel}
                                        onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, tstResponsavel: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-[13px] outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-center text-xs font-bold uppercase tracking-wide text-slate-500">E-mail TST</label>
                                    <input
                                        type="email"
                                        value={empresaEdicao.tstEmail}
                                        onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, tstEmail: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-[13px] outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-center text-xs font-bold uppercase tracking-wide text-slate-500">WhatsApp TST</label>
                                    <input
                                        value={empresaEdicao.tstWhatsapp}
                                        onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, tstWhatsapp: formatarTelefone(e.target.value) })}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-[13px] outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Logo da empresa</label>
                                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600 hover:bg-slate-100">
                                        <Upload className="h-4 w-4" />
                                        {empresaEdicao.logo ? empresaEdicao.logo.name : empresaEdicao.logoNomeAtual || "Alterar logo da empresa"}
                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                            className="hidden"
                                            onChange={(e) => {
                                                const arquivo = e.target.files?.[0] || null;
                                                if (arquivo && !validarArquivoAntesUpload(arquivo, "fotoAuditoria")) {
                                                    e.target.value = "";
                                                    return;
                                                }
                                                setEmpresaEdicao({ ...empresaEdicao, logo: arquivo });
                                            }}
                                        />
                                    </label>
                                    <div className="w-full min-w-0 [&>*]:w-full [&>*]:max-w-none">
                                        <FileUploadAviso arquivo={empresaEdicao.logo} tipo="fotoAuditoria" />
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Contrato da empresa</label>
                                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-200 bg-blue-50 px-4 py-4 text-sm font-semibold text-blue-700 hover:bg-blue-100">
                                        <Upload className="h-4 w-4" />
                                        {empresaEdicao.contratoArquivo ? empresaEdicao.contratoArquivo.name : empresaEdicao.contratoNomeAtual || "Anexar contrato da empresa"}
                                        <input
                                            type="file"
                                            accept="application/pdf,image/png,image/jpeg,image/webp"
                                            className="hidden"
                                            onChange={(e) => {
                                                const arquivo = e.target.files?.[0] || null;
                                                if (arquivo && !validarArquivoAntesUpload(arquivo, "documentoExtenso")) {
                                                    e.target.value = "";
                                                    return;
                                                }
                                                setEmpresaEdicao({ ...empresaEdicao, contratoArquivo: arquivo });
                                            }}
                                        />
                                    </label>
                                    <div className="w-full min-w-0 [&>*]:w-full [&>*]:max-w-none">
                                        <FileUploadAviso arquivo={empresaEdicao.contratoArquivo} tipo="documentoExtenso" />
                                    </div>
                                    {empresaEdicao.contratoUrlAtual && (
                                        <button
                                            type="button"
                                            onClick={() => abrirArquivoStorage("contratos-empresas", empresaEdicao.contratoUrlAtual)}
                                            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                                        >
                                            <Eye className="h-4 w-4" />
                                            Visualizar contrato atual
                                        </button>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block text-center text-xs font-bold uppercase tracking-wide text-slate-500">Nº do contrato</label>
                                    <input
                                        value={empresaEdicao.numeroContrato}
                                        onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, numeroContrato: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-[13px] outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-center text-xs font-bold uppercase tracking-wide text-slate-500">Responsável da contratante</label>
                                    <input
                                        value={empresaEdicao.responsavelContratante}
                                        onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, responsavelContratante: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-[13px] outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-center text-xs font-bold uppercase tracking-wide text-slate-500">Início do contrato</label>
                                    <input
                                        type="date"
                                        value={empresaEdicao.dataInicioContrato}
                                        onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, dataInicioContrato: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-center text-xs font-bold uppercase tracking-wide text-slate-500">Fim do contrato</label>
                                    <input
                                        type="date"
                                        value={empresaEdicao.dataFimContrato}
                                        onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, dataFimContrato: e.target.value })}
                                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Observações</label>
                                    <textarea
                                        value={empresaEdicao.observacaoStatus}
                                        onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, observacaoStatus: e.target.value })}
                                        rows={2}
                                        className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Escopo do trabalho</label>
                                    <textarea
                                        value={empresaEdicao.escopoServico}
                                        onChange={(e) => setEmpresaEdicao({ ...empresaEdicao, escopoServico: e.target.value })}
                                        rows={3}
                                        className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="sticky bottom-0 z-10 grid gap-3 border-t border-slate-200 bg-white p-6 sm:grid-cols-[1fr_1fr_1fr]">
                            <button
                                type="button"
                                onClick={excluirEmpresaEdicao}
                                disabled={salvandoEdicaoEmpresa || !onExcluirEmpresa || !podeExcluirEmpresasSistema}
                                title={podeExcluirEmpresasSistema ? "Excluir empresa" : mensagemBloqueioExclusaoEmpresas}
                                className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:ring-slate-200"
                            >
                                {podeExcluirEmpresasSistema ? "Excluir empresa" : "Exclusão bloqueada"}
                            </button>

                            <button
                                type="button"
                                onClick={() => setEmpresaEdicao(null)}
                                className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                onClick={salvarEdicaoEmpresa}
                                disabled={salvandoEdicaoEmpresa || !podeEditarEmpresasSistema}
                                title={podeEditarEmpresasSistema ? "Salvar alterações" : mensagemBloqueioEdicaoEmpresas}
                                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {salvandoEdicaoEmpresa ? "Salvando alterações..." : "Salvar alterações"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {empresaRevisao && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/70 p-4">
                    <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                        <div className="shrink-0 border-b border-slate-200 bg-white p-6 pb-4">
                            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Revisão documental da empresa</p>
                                    <h2 className="mt-1 text-2xl font-bold text-slate-950">{empresaRevisao.empresa.nome}</h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        CNPJ: {empresaRevisao.empresa.cnpj || "Não informado"} · Responsável: {empresaRevisao.empresa.responsavel || "-"}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        E-mail: {empresaRevisao.empresa.email || "-"} · Telefone: {empresaRevisao.empresa.telefone || "-"}
                                    </p>
                                </div>

                                <button
                                    onClick={() => setEmpresaRevisao(null)}
                                    className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                                >
                                    Fechar revisão
                                </button>
                            </div>
                        </div>

                        <div className="scrollbar-discreta flex-1 overflow-y-auto px-6 py-5">
                            <div className="grid gap-4">
                                {documentosEmpresaBase.map((tipoDoc) => {
                                    const docsAtualizadosRevisao = documentosPorEmpresa[empresaRevisao.empresa.id] || [];
                                    const doc = docsAtualizadosRevisao.find((item) => item.tipo_documento === tipoDoc.tipo);
                                    const st = statusEmpresaDocumento(doc?.data_vencimento);
                                    const verificacao = obterVerificacaoDocumentoEmpresa(doc);
                                    const dadosUpload = obterUploadRevisao(tipoDoc.tipo);
                                    const chaveUpload = `${empresaRevisao.empresa.id}-${tipoDoc.tipo}`;

                                    return (
                                        <div key={tipoDoc.tipo} className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                                            <div className="flex items-start justify-between gap-3 bg-blue-950 px-5 py-4 text-white">
                                                <div className="min-w-0 pr-2">
                                                    <h3 className="text-lg font-bold text-white">{tipoDoc.nome}</h3>
                                                    <p className="mt-1 text-xs leading-relaxed text-blue-100">{tipoDoc.fundamento}</p>
                                                </div>
                                                <div className="shrink-0">
                                                    {doc ? <StatusPill status={st} small /> : <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">Pendente</span>}
                                                </div>
                                            </div>

                                            <div className="px-5 py-4 text-sm text-slate-600">
                                                <div className="space-y-3">
                                                    <p className="leading-relaxed"><strong>Regra:</strong> {tipoDoc.regra}</p>
                                                    <ResumoDocumentoInline documento={doc} />
                                                </div>

                                                {doc?.observacao && (
                                                    <p className="mt-2 text-xs leading-relaxed text-slate-500">
                                                        <strong>Observação:</strong> {doc.observacao}
                                                    </p>
                                                )}
                                            </div>

                                            {doc && (
                                                <ResultadoVerificacaoDocumento
                                                    verificacao={verificacao}
                                                    titulo={`Verificação documental ${tipoDoc.tipo}`}
                                                    mostrarDetalhesInicial={false}
                                                    className="mx-5 mt-1"
                                                    onAprovarManual={({ observacaoManual }) =>
                                                        aprovarVerificacaoDocumentoManual({ verificacao, documento: doc, observacaoManual })
                                                    }
                                                />
                                            )}

                                            <div className="mx-5 mt-4 rounded-2xl bg-slate-50 p-3">
                                                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                                                    {doc ? "Substituir documento" : "Enviar documento"}
                                                </p>

                                                <div className="grid gap-2">
                                                    <div className="grid gap-2 sm:grid-cols-2">
                                                        <div>
                                                            <label className="mb-1 block text-[11px] font-semibold text-slate-500">Emissão</label>
                                                            <input
                                                                type="date"
                                                                value={dadosUpload.dataEmissao}
                                                                onChange={(e) => atualizarUploadRevisao(tipoDoc.tipo, "dataEmissao", e.target.value)}
                                                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="mb-1 block text-[11px] font-semibold text-slate-500">Próxima revisão</label>
                                                            <input
                                                                type="date"
                                                                value={dadosUpload.dataVencimento || ""}
                                                                onChange={(e) => atualizarUploadRevisao(tipoDoc.tipo, "dataVencimento", e.target.value)}
                                                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                                            />
                                                        </div>
                                                    </div>

                                                    <textarea
                                                        value={dadosUpload.observacao}
                                                        onChange={(e) => atualizarUploadRevisao(tipoDoc.tipo, "observacao", e.target.value)}
                                                        placeholder="Observação opcional"
                                                        rows={2}
                                                        className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                                    />

                                                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                                                        <Upload className="h-3.5 w-3.5" />
                                                        {salvandoUploadRevisao === chaveUpload
                                                            ? "Enviando..."
                                                            : doc
                                                                ? "Selecionar PDF para substituir"
                                                                : "Selecionar PDF para enviar"}
                                                        <input
                                                            type="file"
                                                            accept="application/pdf,image/*"
                                                            className="hidden"
                                                            disabled={salvandoUploadRevisao === chaveUpload || !podeUploadEmpresasSistema}
                                                            onChange={(e) => enviarDocumentoPelaRevisao(empresaRevisao.empresa, tipoDoc.tipo, e.target.files?.[0])}
                                                        />
                                                    </label>
                                                </div>
                                            </div>

                                            {doc && (
                                                <div className="mx-5 mb-5 mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                    <button
                                                        onClick={() => onVisualizarDocumentoEmpresa(doc)}
                                                        disabled={!doc.arquivo_url}
                                                        className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                        Visualizar documento
                                                    </button>

                                                    <button
                                                        onClick={() => excluirDocumentoEmpresaSeguro(doc)}
                                                        disabled={!podeExcluirEmpresasSistema}
                                                        title={podeExcluirEmpresasSistema ? "Excluir documento" : mensagemBloqueioExclusaoEmpresas}
                                                        className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:ring-slate-200"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        {podeExcluirEmpresasSistema ? "Excluir documento" : "Bloqueado"}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {carregandoVerificacoes && (
                                <p className="mt-3 text-center text-xs font-semibold text-slate-400">
                                    Atualizando verificações documentais...
                                </p>
                            )}

                            <div className="mt-5 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                                <strong>Observação técnica:</strong> este painel serve para conferência documental. A validade automática é um controle interno e deve ser confirmada pelo responsável de SST conforme o documento emitido, escopo da empresa, alterações de risco e exigências contratuais do cliente.
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
