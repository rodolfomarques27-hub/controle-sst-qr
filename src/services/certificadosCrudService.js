import {
    enviarArquivoCertificado,
    gerarUrlAssinadaCertificado,
    removerArquivoCertificadoStorage,
} from "./certificadosStorageService";
import {
    inferirTreinamentoPorNomeArquivo,
    normalizarCertificado,
    obterTreinamento,
    treinamentoSemValidade,
} from "./colaboradorDocumentosService";
import { ehUuid } from "../utils/sstUtils";

function validarCompatibilidadeArquivoTreinamento({ arquivo, treinamentoId }) {
    const treinamentoSelecionadoId = Number(treinamentoId);

    if (!arquivo?.name || !Number.isFinite(treinamentoSelecionadoId)) return;

    const treinamentoInferido = inferirTreinamentoPorNomeArquivo(arquivo.name);
    const treinamentoInferidoId = Number(treinamentoInferido?.id || 0);

    if (!treinamentoInferidoId || !Number.isFinite(treinamentoInferidoId)) return;
    if (treinamentoInferidoId === treinamentoSelecionadoId) return;

    const treinamentoSelecionado = obterTreinamento(treinamentoSelecionadoId);

    throw new Error(
        `O arquivo parece ser "${treinamentoInferido.nome}", mas o tipo selecionado é "${treinamentoSelecionado?.nome || "não identificado"}". Corrija o tipo do documento antes de salvar.`
    );
}

export async function salvarCertificadoTreinamentoCrud({
    supabase,
    certificado,
    colaboradores = [],
    colaboradorSelecionado = null,
} = {}) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado para salvar certificado.");
    }

    if (!certificado?.colaboradorCodigo && !certificado?.colaborador?.codigoFuncionario && !certificado?.colaborador?.id) {
        throw new Error("Selecione o colaborador.");
    }

    if (!certificado?.treinamentoId) {
        throw new Error("Selecione o treinamento/documento.");
    }

    if (!certificado?.dataRealizacao) {
        throw new Error("Informe a data de realização/emissão.");
    }

    const treinamentoSemVencimento = treinamentoSemValidade(certificado.treinamentoId);

    if (!treinamentoSemVencimento && !certificado?.dataVencimento) {
        throw new Error("Informe a validade/revisão do certificado.");
    }

    if (!certificado?.arquivo) {
        throw new Error("Selecione o arquivo PDF ou imagem do certificado.");
    }

    const codigoInformado = String(
        certificado.colaboradorCodigo ||
        certificado.colaborador?.codigoFuncionario ||
        ""
    ).trim();

    const idInformadoSomenteSeUuid = ehUuid(certificado.colaborador?.id)
        ? String(certificado.colaborador.id)
        : "";

    const colaboradorSeguro =
        colaboradores.find((colaborador) => String(colaborador.codigoFuncionario) === codigoInformado) ||
        colaboradores.find((colaborador) => idInformadoSomenteSeUuid && String(colaborador.id) === idInformadoSomenteSeUuid) ||
        colaboradores.find((colaborador) => String(colaborador.codigoFuncionario) === String(colaboradorSelecionado?.codigoFuncionario || "")) ||
        null;

    if (!colaboradorSeguro?.id || !ehUuid(colaboradorSeguro.id)) {
        throw new Error(
            "Colaborador inválido. O sistema não encontrou o UUID do colaborador. Volte na aba Colaboradores, clique em Enviar treinamento e tente novamente."
        );
    }

    const colaboradorIdSeguro = String(colaboradorSeguro.id);
    const treinamentoIdSeguro = Number(certificado.treinamentoId);

    if (!Number.isFinite(treinamentoIdSeguro)) {
        throw new Error("Treinamento/documento inválido. Selecione novamente o documento.");
    }

    const treinamento = obterTreinamento(treinamentoIdSeguro);

    if (!treinamento) {
        throw new Error("Treinamento/documento não encontrado na base do sistema.");
    }

    validarCompatibilidadeArquivoTreinamento({
        arquivo: certificado.arquivo,
        treinamentoId: treinamentoIdSeguro,
    });

    const arquivo = await enviarArquivoCertificado({
        supabase,
        arquivo: certificado.arquivo,
        colaborador: colaboradorSeguro,
        treinamentoId: treinamentoIdSeguro,
    });

    const payload = {
        colaborador_id: colaboradorIdSeguro,
        tipo_treinamento: treinamento.nome,
        treinamento_codigo: treinamentoIdSeguro,
        nome_treinamento: treinamento.nome,
        data_realizacao: certificado.dataRealizacao,
        data_vencimento: treinamentoSemVencimento ? null : certificado.dataVencimento,
        arquivo_url: arquivo.arquivoUrl,
        arquivo_nome: certificado.arquivoNome || arquivo.arquivoNome,
        observacao: certificado.observacao || null,
        status_validacao: "Pendente de verificação",
    };

    const { data: existentes, error: buscaError } = await supabase
        .from("certificados")
        .select("*")
        .eq("colaborador_id", colaboradorIdSeguro)
        .eq("tipo_treinamento", treinamento.nome)
        .order("created_at", { ascending: false })
        .limit(1);

    if (buscaError) {
        throw new Error(`Erro ao verificar certificado existente: ${buscaError.message}`);
    }

    const existente = existentes?.[0] || null;

    const consulta = existente?.id
        ? supabase
            .from("certificados")
            .update(payload)
            .eq("id", existente.id)
        : supabase
            .from("certificados")
            .insert(payload);

    const { data, error } = await consulta
        .select("*")
        .single();

    if (error) {
        throw new Error(`Erro ao salvar certificado na tabela certificados: ${error.message}`);
    }

    const caminhoAnterior = existente?.url_do_arquivo || existente?.arquivo_url;

    if (caminhoAnterior && caminhoAnterior !== arquivo.arquivoUrl) {
        await removerArquivoCertificadoStorage({
            supabase,
            caminho: caminhoAnterior,
        });
    }

    return normalizarCertificado(data);
}

export async function atualizarDatasCertificadoCrud({ supabase, certificado, datas } = {}) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado para atualizar certificado.");
    }

    if (!certificado?.id) {
        throw new Error("Certificado inválido para atualização.");
    }

    const { data, error } = await supabase
        .from("certificados")
        .update({
            data_realizacao: datas?.realizado,
            data_vencimento: datas?.vencimento || null,
        })
        .eq("id", certificado.id)
        .select("*")
        .single();

    if (error) {
        throw new Error(`Erro ao atualizar datas do certificado: ${error.message}`);
    }

    return normalizarCertificado(data);
}

export async function gerarUrlVisualizacaoCertificado({ supabase, certificado, expiracaoSegundos = 60 * 10 } = {}) {
    if (!certificado?.arquivoUrl) {
        throw new Error("Este certificado ainda não possui arquivo anexado.");
    }

    return gerarUrlAssinadaCertificado({
        supabase,
        caminho: certificado.arquivoUrl,
        expiracaoSegundos,
    });
}

export async function excluirCertificadoTreinamentoCrud({ supabase, certificado } = {}) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado para excluir certificado.");
    }

    if (!certificado?.id) {
        throw new Error("Certificado inválido para exclusão.");
    }

    const { error } = await supabase
        .from("certificados")
        .delete()
        .eq("id", certificado.id);

    if (error) {
        throw new Error(`Erro ao excluir certificado: ${error.message}`);
    }

    if (certificado.arquivoUrl) {
        await removerArquivoCertificadoStorage({
            supabase,
            caminho: certificado.arquivoUrl,
        });
    }

    return true;
}
