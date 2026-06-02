import {
    enviarContratoEmpresaStorage,
    enviarLogoEmpresaStorage,
} from "./arquivosCadastroService";
import {
    excluirDocumentoEmpresaCrud,
    gerarUrlVisualizacaoDocumentoEmpresa,
    salvarDocumentoEmpresaCrud,
} from "./empresaDocumentosCrudService";
import {
    adicionarEmpresaCrud,
    atualizarEmpresaCrud,
    excluirEmpresaCrud,
    obterOuCriarEmpresaCrud,
} from "./empresasCrudService";

function converterStatusVerificacaoParaStatusDocumento(statusVerificacao = "") {
    const status = String(statusVerificacao || "").trim().toLowerCase();

    if (status === "aprovado") return "Aprovado";
    if (status === "atencao") return "Atenção";
    if (status === "revisao_manual") return "Revisão manual";
    if (status === "suspeito") return "Suspeito";
    if (status === "bloqueado") return "Bloqueado";
    if (status === "erro") return "Erro na verificação";

    return "Pendente de verificação";
}


async function obterEmpresaDocumentoParaVerificacao({ supabase, empresaId }) {
    if (!supabase || !empresaId) return { id: empresaId || null };

    try {
        const { data, error } = await supabase
            .from("empresas")
            .select("id, nome, cnpj")
            .eq("id", empresaId)
            .maybeSingle();

        if (error) {
            console.warn("Não foi possível carregar empresa para verificação documental:", error.message);
            return { id: empresaId };
        }

        return data || { id: empresaId };
    } catch (error) {
        console.warn("Falha ao consultar empresa para verificação documental:", error?.message || error);
        return { id: empresaId };
    }
}

function obterLeituraLocalVerificacao(verificacao = {}) {
    return verificacao?.retornoIa?.leitura_documental_local ||
        verificacao?.retorno_ia?.leitura_documental_local ||
        verificacao?.retornoIa?.leituraDocumentalLocal ||
        verificacao?.retorno_ia?.leituraDocumentalLocal ||
        null;
}

function obterCamposExtraidosVerificacao(verificacao = {}) {
    const leitura = obterLeituraLocalVerificacao(verificacao);
    return leitura?.campos_extraidos || leitura?.camposExtraidos || null;
}

function verificacaoPossuiDivergenciaEmpresa(verificacao = {}) {
    const indicios = Array.isArray(verificacao?.indicios) ? verificacao.indicios : [];

    return indicios.some((indicio = {}) => {
        const codigo = String(indicio?.codigo || "").toLowerCase();
        return codigo.includes("documento_diverge_empresa") || codigo.includes("empresa_documento_diverge");
    });
}

function obterDatasVigenciaOcrVerificacao(verificacao = {}) {
    const campos = obterCamposExtraidosVerificacao(verificacao);

    if (campos?.vigencia_inicio && campos?.vigencia_fim) {
        return {
            dataEmissao: campos.vigencia_inicio,
            dataVencimento: campos.vigencia_fim,
        };
    }

    const leitura = obterLeituraLocalVerificacao(verificacao);
    const classificadas = leitura?.datas_classificadas || leitura?.datasClassificadas || {};
    const vigencia = Array.isArray(classificadas?.vigencia) ? classificadas.vigencia : [];
    const inicio = vigencia.find((data) => data?.tipo === "inicio_vigencia") || vigencia[0] || null;
    const fim = vigencia.find((data) => data?.tipo === "fim_vigencia") || vigencia[1] || null;

    if (inicio?.iso && fim?.iso) {
        return {
            dataEmissao: inicio.iso,
            dataVencimento: fim.iso,
        };
    }

    return {
        dataEmissao: "",
        dataVencimento: "",
    };
}

async function executarVerificacaoDocumentoEmpresaSemBloquearFluxo({
    supabase,
    novoDoc,
    documentoNormalizado,
    normalizarDocumentoEmpresa,
    setDocumentosEmpresas,
}) {
    try {
        const { verificarDocumentoEmpresa } = await import("./documentosVerificacaoService");

        const empresaParaVerificacao = await obterEmpresaDocumentoParaVerificacao({
            supabase,
            empresaId: documentoNormalizado.empresa_id || novoDoc.empresaId || null,
        });

        const verificacao = await verificarDocumentoEmpresa({
            supabase,
            documento: documentoNormalizado,
            empresa: empresaParaVerificacao,
            arquivo: novoDoc.arquivo || null,
            registrosExistentes: [],
            usuario: null,
            salvarResultado: true,
        });

        const statusValidacao = converterStatusVerificacaoParaStatusDocumento(verificacao?.statusVerificacao);
        const datasOcr = obterDatasVigenciaOcrVerificacao(verificacao);
        const possuiDivergenciaEmpresa = verificacaoPossuiDivergenciaEmpresa(verificacao);
        const atualizacaoDocumento = {
            status_validacao: statusValidacao,
        };

        if (!possuiDivergenciaEmpresa && datasOcr.dataEmissao && datasOcr.dataVencimento) {
            atualizacaoDocumento.data_emissao = datasOcr.dataEmissao;
            atualizacaoDocumento.data_vencimento = datasOcr.dataVencimento;
        }

        const { data, error } = await supabase
            .from("documentos_empresas")
            .update(atualizacaoDocumento)
            .eq("id", documentoNormalizado.id)
            .select("*")
            .single();

        if (error) {
            throw new Error(`Erro ao atualizar status da verificação documental: ${error.message}`);
        }

        const documentoAtualizado = normalizarDocumentoEmpresa(data);

        setDocumentosEmpresas((atual) =>
            atual.map((item) => (item.id === documentoAtualizado.id ? documentoAtualizado : item))
        );

        return documentoAtualizado;
    } catch (error) {
        console.warn("Verificação documental não bloqueou o salvamento do documento:", error?.message || error);

        try {
            const { data } = await supabase
                .from("documentos_empresas")
                .update({ status_validacao: "Erro na verificação" })
                .eq("id", documentoNormalizado.id)
                .select("*")
                .single();

            if (data) {
                const documentoAtualizado = normalizarDocumentoEmpresa(data);

                setDocumentosEmpresas((atual) =>
                    atual.map((item) => (item.id === documentoAtualizado.id ? documentoAtualizado : item))
                );
            }
        } catch (erroAtualizacao) {
            console.warn("Não foi possível marcar erro na verificação documental:", erroAtualizacao?.message || erroAtualizacao);
        }

        return documentoNormalizado;
    }
}

export async function carregarEmpresasAppService({ supabase, setEmpresasBanco }) {
    const { data, error } = await supabase
        .from("empresas")
        .select("id, nome, cnpj, responsavel, email, telefone, responsavel_auditoria, email_auditoria, whatsapp_auditoria, receber_auditoria, status, tipo_empresa, logo_url, logo_nome, contrato_url, contrato_nome, numero_contrato, data_inicio_contrato, data_fim_contrato, responsavel_contratante, tst_responsavel, tst_email, tst_whatsapp, escopo_servico, observacao_status, empresa_pai_id")
        .order("nome", { ascending: true });

    if (error) {
        throw new Error(`Erro ao carregar empresas: ${error.message}`);
    }

    setEmpresasBanco(data || []);
    return data || [];
}

export async function carregarDocumentosEmpresasAppService({
    supabase,
    normalizarDocumentoEmpresa,
    setDocumentosEmpresas,
}) {
    const { data, error } = await supabase
        .from("documentos_empresas")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        throw new Error(`Erro ao carregar documentos das empresas: ${error.message}`);
    }

    const normalizados = (data || []).map(normalizarDocumentoEmpresa);
    setDocumentosEmpresas(normalizados);
    return normalizados;
}

export async function enviarLogoEmpresaAppService({
    supabase,
    arquivo,
    empresaId,
    validarArquivoAntesUpload,
}) {
    return enviarLogoEmpresaStorage({
        supabase,
        arquivo,
        empresaId,
        validarArquivoAntesUpload,
    });
}

export async function enviarContratoEmpresaAppService({
    supabase,
    arquivo,
    empresaId,
    validarArquivoAntesUpload,
}) {
    return enviarContratoEmpresaStorage({
        supabase,
        arquivo,
        empresaId,
        validarArquivoAntesUpload,
    });
}

export async function adicionarEmpresaAppService({
    supabase,
    novaEmpresa,
    empresasBanco,
    enviarLogoEmpresa,
    enviarContratoEmpresa,
    setErroBanco,
    setEmpresasBanco,
}) {
    setErroBanco("");

    try {
        const empresaCadastrada = await adicionarEmpresaCrud({
            supabase,
            novaEmpresa,
            empresasBanco,
            enviarLogoEmpresa,
            enviarContratoEmpresa,
        });

        setEmpresasBanco((atual) => [empresaCadastrada, ...atual].sort((a, b) => a.nome.localeCompare(b.nome)));
        return true;
    } catch (error) {
        setErroBanco(error.message || "Erro ao cadastrar empresa.");
        return false;
    }
}

export async function atualizarEmpresaAppService({
    supabase,
    empresaAtualizada,
    enviarLogoEmpresa,
    enviarContratoEmpresa,
    setErroBanco,
    setEmpresasBanco,
    setColaboradores,
}) {
    setErroBanco("");

    try {
        const empresaAtualizadaBanco = await atualizarEmpresaCrud({
            supabase,
            empresaAtualizada,
            enviarLogoEmpresa,
            enviarContratoEmpresa,
        });

        setEmpresasBanco((atual) =>
            atual.map((empresa) => (empresa.id === empresaAtualizadaBanco.id ? empresaAtualizadaBanco : empresa)).sort((a, b) => a.nome.localeCompare(b.nome))
        );

        setColaboradores((atual) =>
            atual.map((colaborador) =>
                colaborador.empresaId === empresaAtualizadaBanco.id ? { ...colaborador, empresa: empresaAtualizadaBanco.nome } : colaborador
            )
        );

        return true;
    } catch (error) {
        setErroBanco(error.message || "Erro ao atualizar empresa.");
        return false;
    }
}

export async function excluirEmpresaAppService({
    supabase,
    empresa,
    colaboradores,
    carregarColaboradores,
    setErroBanco,
    setEmpresasBanco,
    setDocumentosEmpresas,
    setColaboradores,
}) {
    setErroBanco("");

    try {
        const resultado = await excluirEmpresaCrud({
            supabase,
            empresa,
            colaboradores,
        });

        const nomeEmpresaNormalizado = resultado.nomeEmpresaNormalizado;

        setEmpresasBanco((atual) => atual.filter((item) => String(item.id) !== String(empresa.id)));
        setDocumentosEmpresas((atual) => atual.filter((doc) => String(doc.empresa_id || doc.empresaId || "") !== String(empresa.id)));
        setColaboradores((atual) => atual.filter((colaborador) => {
            const mesmoId = String(colaborador.empresaId || colaborador.empresa_id || "") === String(empresa.id);
            const mesmoNome = nomeEmpresaNormalizado && resultado.normalizarNomeEmpresa(colaborador.empresa || colaborador.empresaExibicao || "") === nomeEmpresaNormalizado;
            return !(mesmoId || mesmoNome);
        }));

        alert(resultado.mensagem || `Empresa ${empresa.nome || "selecionada"} excluída com sucesso.`);
        await carregarColaboradores();
        return true;
    } catch (error) {
        setErroBanco(error.message || "Erro ao excluir empresa.");
        alert(error.message || "Erro ao excluir empresa.");
        await carregarColaboradores();
        return false;
    }
}

export async function adicionarDocumentoEmpresaAppService({
    supabase,
    novoDoc,
    validarArquivoAntesUpload,
    sanitizarNomeArquivo,
    normalizarDocumentoEmpresa,
    setErroBanco,
    setDocumentosEmpresas,
}) {
    setErroBanco("");

    try {
        const documentoNormalizado = await salvarDocumentoEmpresaCrud({
            supabase,
            novoDoc,
            validarArquivoAntesUpload,
            sanitizarNomeArquivo,
            normalizarDocumentoEmpresa,
            statusValidacaoInicial: "Pendente de verificação",
        });

        setDocumentosEmpresas((atual) => [
            documentoNormalizado,
            ...atual.filter(
                (item) => !(item.empresa_id === documentoNormalizado.empresa_id && item.tipo_documento === documentoNormalizado.tipo_documento)
            ),
        ]);

        executarVerificacaoDocumentoEmpresaSemBloquearFluxo({
            supabase,
            novoDoc,
            documentoNormalizado,
            normalizarDocumentoEmpresa,
            setDocumentosEmpresas,
        });

        return true;
    } catch (error) {
        setErroBanco(error.message || "Erro ao salvar documento da empresa.");
        return false;
    }
}

export async function excluirDocumentoEmpresaAppService({
    supabase,
    documento,
    setErroBanco,
    setDocumentosEmpresas,
}) {
    const confirmar = window.confirm(`Deseja excluir definitivamente o documento ${documento.tipo_documento} desta empresa?`);

    if (!confirmar) return;

    setErroBanco("");

    try {
        await excluirDocumentoEmpresaCrud({ supabase, documento });
        setDocumentosEmpresas((atual) => atual.filter((item) => item.id !== documento.id));
    } catch (error) {
        setErroBanco(error.message || "Erro ao remover documento.");
    }
}

export async function visualizarDocumentoEmpresaAppService({
    supabase,
    documento,
    setErroBanco,
}) {
    setErroBanco("");

    try {
        const signedUrl = await gerarUrlVisualizacaoDocumentoEmpresa({
            supabase,
            documento,
            expiracaoSegundos: 60 * 10,
        });

        window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
        setErroBanco(error.message || "Erro ao gerar link de visualização.");
    }
}

export async function obterOuCriarEmpresaAppService({
    supabase,
    nomeEmpresa,
    empresasBanco,
    setEmpresasBanco,
}) {
    const resultado = await obterOuCriarEmpresaCrud({
        supabase,
        nomeEmpresa,
        empresasBanco,
    });

    if (resultado.criada) {
        setEmpresasBanco((atual) => [...atual, resultado.empresa].sort((a, b) => a.nome.localeCompare(b.nome)));
    }

    return resultado.empresa;
}
