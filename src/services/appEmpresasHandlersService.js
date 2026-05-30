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
        });

        setDocumentosEmpresas((atual) => [
            documentoNormalizado,
            ...atual.filter(
                (item) => !(item.empresa_id === documentoNormalizado.empresa_id && item.tipo_documento === documentoNormalizado.tipo_documento)
            ),
        ]);

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
