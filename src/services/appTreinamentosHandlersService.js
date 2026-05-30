import {
    atualizarDatasCertificadoCrud,
    excluirCertificadoTreinamentoCrud,
    gerarUrlVisualizacaoCertificado,
    salvarCertificadoTreinamentoCrud,
} from "./certificadosCrudService";
import {
    excluirArquivoStorageAuditoriaService,
    listarArquivosCertificadosStorageService,
    sincronizarCertificadosDoStorageService,
} from "./storageAuditoriaService";
import { obterTreinamento } from "./colaboradorDocumentosService";

export async function sincronizarCertificadosDoStorageAppService({
    supabase,
    colaboradores,
    dataReferencia,
    carregarColaboradores,
    setErroBanco,
    setCarregandoBanco,
}) {
    setErroBanco("");
    setCarregandoBanco(true);

    try {
        const mensagem = await sincronizarCertificadosDoStorageService({
            supabase,
            colaboradores,
            dataReferencia,
        });

        await carregarColaboradores();

        return mensagem;
    } catch (error) {
        setErroBanco(error.message || "Erro ao sincronizar arquivos do Storage.");
        return error.message || "Erro ao sincronizar arquivos do Storage.";
    } finally {
        setCarregandoBanco(false);
    }
}

export async function listarArquivosCertificadosStorageAppService({
    colaboradores,
    empresasBanco,
    setErroBanco,
}) {
    setErroBanco("");

    try {
        return await listarArquivosCertificadosStorageService({
            colaboradores,
            empresasBanco,
        });
    } catch (error) {
        setErroBanco(error.message || "Erro ao listar arquivos do Storage.");
        alert(error.message || "Erro ao listar arquivos do Storage.");
        return [];
    }
}

export async function excluirArquivoCertificadoStorageAppService({
    supabase,
    arquivo,
    registrarAuditoria,
    setErroBanco,
}) {
    setErroBanco("");

    if (!arquivo?.caminho) {
        alert("Arquivo inválido para exclusão.");
        return false;
    }

    if (arquivo.emUso) {
        alert(`Este arquivo está em uso em: ${arquivo.origemTipo || arquivo.tabelaOrigem || "base do sistema"}. Para evitar quebrar o histórico, exclua primeiro o registro vinculado.`);
        return false;
    }

    const confirmado = window.confirm(
        `Excluir definitivamente este arquivo do Storage?\n\nBucket: ${arquivo.bucket || "certificados-treinamentos"}\nArquivo: ${arquivo.nome}\nPasta: ${arquivo.pasta || "raiz"}`
    );

    if (!confirmado) return false;

    try {
        await excluirArquivoStorageAuditoriaService({
            supabase,
            arquivo,
        });

        await registrarAuditoria("DELETE_STORAGE", arquivo.bucket || "storage", `Excluiu arquivo sem registro do Storage: ${arquivo.nome}`, arquivo.caminho, {
            bucket: arquivo.bucket || "",
            caminho: arquivo.caminho,
            pasta: arquivo.pasta || "",
            nome: arquivo.nome,
            origemTipo: arquivo.origemTipo || "",
            tabelaOrigem: arquivo.tabelaOrigem || "",
            colaboradorNome: arquivo.colaboradorNome || "",
            colaboradorCodigo: arquivo.colaboradorCodigo || "",
            colaboradorEmpresa: arquivo.colaboradorEmpresa || "",
            empresaNome: arquivo.empresaNome || "",
            empresaCnpj: arquivo.empresaCnpj || "",
            tipoDocumentoEmpresa: arquivo.tipoDocumentoEmpresa || "",
        });

        return true;
    } catch (error) {
        setErroBanco(error.message || "Erro ao excluir arquivo do Storage.");
        alert(error.message || "Erro ao excluir arquivo do Storage.");
        return false;
    }
}

export async function salvarCertificadoTreinamentoAppService({
    supabase,
    certificado,
    colaboradores,
    colaboradorSelecionado,
    carregarColaboradores,
    setErroBanco,
    setColaboradores,
    setColaboradorSelecionado,
}) {
    setErroBanco("");

    try {
        const certificadoNormalizado = await salvarCertificadoTreinamentoCrud({
            supabase,
            certificado,
            colaboradores,
            colaboradorSelecionado,
        });

        setColaboradores((atual) =>
            atual.map((colaborador) => {
                if (String(colaborador.id) !== String(certificadoNormalizado.colaboradorId)) return colaborador;

                const demais = (colaborador.treinamentos || []).filter(
                    (item) => Number(item.treinamentoId) !== Number(certificadoNormalizado.treinamentoId)
                );

                return {
                    ...colaborador,
                    treinamentos: [certificadoNormalizado, ...demais],
                };
            })
        );

        setColaboradorSelecionado((atual) => {
            if (!atual || String(atual.id) !== String(certificadoNormalizado.colaboradorId)) return atual;

            const demais = (atual.treinamentos || []).filter(
                (item) => Number(item.treinamentoId) !== Number(certificadoNormalizado.treinamentoId)
            );

            return {
                ...atual,
                treinamentos: [certificadoNormalizado, ...demais],
            };
        });

        await carregarColaboradores();

        return true;
    } catch (error) {
        setErroBanco(error.message || "Erro ao salvar certificado.");
        alert(error.message || "Erro ao salvar certificado.");
        return false;
    }
}

export async function atualizarDatasCertificadoAppService({
    supabase,
    certificado,
    datas,
    carregarColaboradores,
    setErroBanco,
    setColaboradores,
    setColaboradorSelecionado,
}) {
    setErroBanco("");

    try {
        const atualizado = await atualizarDatasCertificadoCrud({
            supabase,
            certificado,
            datas,
        });

        setColaboradores((atual) =>
            atual.map((colaborador) => {
                if (String(colaborador.id) !== String(atualizado.colaboradorId)) return colaborador;

                return {
                    ...colaborador,
                    treinamentos: (colaborador.treinamentos || []).map((item) =>
                        item.id === atualizado.id ? atualizado : item
                    ),
                };
            })
        );

        setColaboradorSelecionado((atual) => {
            if (!atual || String(atual.id) !== String(atualizado.colaboradorId)) return atual;

            return {
                ...atual,
                treinamentos: (atual.treinamentos || []).map((item) =>
                    item.id === atualizado.id ? atualizado : item
                ),
            };
        });

        await carregarColaboradores();

        return true;
    } catch (error) {
        setErroBanco(error.message || "Erro ao atualizar datas do certificado.");
        alert(error.message || "Erro ao atualizar datas do certificado.");
        return false;
    }
}

export async function visualizarCertificadoTreinamentoAppService({
    supabase,
    certificado,
    setErroBanco,
}) {
    setErroBanco("");

    try {
        const signedUrl = await gerarUrlVisualizacaoCertificado({
            supabase,
            certificado,
            expiracaoSegundos: 60 * 10,
        });

        window.open(signedUrl, "_blank", "noopener,noreferrer");
        return true;
    } catch (error) {
        setErroBanco(error.message || "Erro ao gerar link do certificado.");
        return false;
    }
}

export async function excluirCertificadoTreinamentoAppService({
    supabase,
    certificado,
    setErroBanco,
    setColaboradores,
}) {
    const treinamento = obterTreinamento(certificado.treinamentoId);
    const confirmar = window.confirm(`Deseja excluir o certificado ${treinamento.nome}?`);

    if (!confirmar) return false;

    setErroBanco("");

    try {
        await excluirCertificadoTreinamentoCrud({
            supabase,
            certificado,
        });

        setColaboradores((atual) =>
            atual.map((colaborador) => {
                if (String(colaborador.id) !== String(certificado.colaboradorId)) return colaborador;

                return {
                    ...colaborador,
                    treinamentos: (colaborador.treinamentos || []).filter((item) => item.id !== certificado.id),
                };
            })
        );

        return true;
    } catch (error) {
        setErroBanco(error.message || "Erro ao excluir certificado.");
        alert(error.message || "Erro ao excluir certificado.");
        return false;
    }
}
