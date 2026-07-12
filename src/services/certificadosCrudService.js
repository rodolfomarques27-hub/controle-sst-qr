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
import { ehUuid, normalizarTextoBusca } from "../utils/sstUtils";


function tokensNomeColaboradorArquivo(nome = "") {
    return normalizarTextoBusca(nome)
        .replace(/[^a-z0-9]+/g, " ")
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !["dos", "das", "de", "da", "do", "com", "para", "nr"].includes(token));
}

function pontuarNomeNoArquivo(nomeArquivo = "", nomeColaborador = "") {
    const base = normalizarTextoBusca(String(nomeArquivo || "").replace(/\.[^.]+$/, ""))
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    const compacto = base.replace(/\s+/g, "");
    const tokens = tokensNomeColaboradorArquivo(nomeColaborador);

    if (!base || !tokens.length) return 0;

    const encontrados = tokens.filter((token) => base.includes(token));
    const primeiro = tokens[0];
    const ultimo = tokens[tokens.length - 1];
    const nomeCompacto = tokens.join("");
    let pontos = 0;

    if (nomeCompacto && compacto.includes(nomeCompacto)) pontos += 140;
    pontos += encontrados.length * 25;
    if (primeiro && base.includes(primeiro)) pontos += 18;
    if (ultimo && base.includes(ultimo)) pontos += 18;
    if (encontrados.length >= Math.min(3, tokens.length)) pontos += 35;
    if (tokens.length >= 2 && base.includes(primeiro) && base.includes(ultimo)) pontos += 35;

    return pontos;
}


function extrairNomePessoaDoNomeArquivo(nomeArquivo = "") {
    const base = normalizarTextoBusca(String(nomeArquivo || "").replace(/\.[^.]+$/, ""))
        .replace(/[_-]+/g, " ")
        .replace(/\b(nr\s*[-º]?\s*\d+|nr\d+|aso|atestado|saude|saúde|ocupacional|ficha|registro|clt|esocial|certificado|treinamento|integracao|integração|mobilizacao|mobilização|ordem|servico|serviço|pdf|documento|assinatura|lista)\b/g, " ")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const tokens = base
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !["dos", "das", "de", "da", "do", "para", "com", "sem", "por", "das", "aos"].includes(token));

    if (tokens.length < 2) return "";

    // Se o nome do arquivo veio no padrão "NOME DO COLABORADOR NR-11.pdf",
    // estes tokens representam um forte indício de pessoa.
    return tokens.slice(0, 7).join(" ").toUpperCase();
}


function nomeArquivoEhDocumentoGeralTreinamento(nomeArquivo = "") {
    const texto = normalizarTextoBusca(nomeArquivo)
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!texto) return false;

    const temNr = /\bnr\s*\d+|\bnr\d+/.test(texto);
    const temIntegracao = /\bintegracao\b/.test(texto);
    const temGeral = /\bgeral\b/.test(texto);
    const temTreinamento = /\btreinamento\b/.test(texto);
    const temEmpresa = /\bempresa\b/.test(texto);

    const temaTreinamento = /\b(ergonomia|seguranca|escavacoes|fundacoes|protecao solar|creme de protecao|meio ambiente|residuos|sinalizacao|transito|transporte|movimentacao|armazenagem|maquinas|equipamentos|uso de creme|descarte de residuos)\b/.test(texto);

    return Boolean(
        (temNr && (temaTreinamento || temGeral || temTreinamento)) ||
        (temIntegracao && /\bseguranca\b/.test(texto)) ||
        (temGeral && temaTreinamento) ||
        (temEmpresa && temaTreinamento)
    );
}


function normalizarNomeColaboradorSeguro(valor = "") {
    return normalizarTextoBusca(valor)
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function tokensNomeColaboradorSeguro(valor = "") {
    return normalizarNomeColaboradorSeguro(valor)
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length >= 3);
}

function nomeParcialCompativelComColaborador({ nomeParcial = "", nomeCompleto = "" } = {}) {
    const parcial = normalizarNomeColaboradorSeguro(nomeParcial);
    const completo = normalizarNomeColaboradorSeguro(nomeCompleto);

    if (!parcial || !completo) return false;

    const parcialSemEspaco = parcial.replace(/\s+/g, "");
    const completoSemEspaco = completo.replace(/\s+/g, "");

    if (completo.includes(parcial)) return true;
    if (completoSemEspaco.includes(parcialSemEspaco)) return true;

    const tokensParcial = tokensNomeColaboradorSeguro(parcial);
    const tokensCompleto = tokensNomeColaboradorSeguro(completo);

    if (!tokensParcial.length || !tokensCompleto.length) return false;

    const tokensEncontrados = tokensParcial.filter((token) =>
        tokensCompleto.includes(token) ||
        completoSemEspaco.includes(token)
    );

    const proporcao = tokensEncontrados.length / tokensParcial.length;

    return Boolean(proporcao >= 0.8);
}

function nomeArquivoEhTituloGeralDeTreinamento(nomeArquivo = "") {
    const texto = normalizarNomeColaboradorSeguro(nomeArquivo);

    if (!texto) return false;

    const temNr = /\bnr\s*\d+|\bnr\d+/.test(texto);
    const temIntegracao = /\bintegracao\b/.test(texto);
    const temGeral = /\bgeral\b/.test(texto);
    const temTreinamento = /\btreinamento\b/.test(texto);
    const temEmpresa = /\bempresa\b/.test(texto);

    const temaTreinamento = /\b(ergonomia|seguranca|escavacoes|fundacoes|protecao solar|creme de protecao|meio ambiente|residuos|sinalizacao|transito|transporte|movimentacao|armazenagem|maquinas|equipamentos|orientacao postural)\b/.test(texto);

    return Boolean(
        (temNr && (temaTreinamento || temGeral || temTreinamento)) ||
        (temIntegracao && /\bseguranca\b/.test(texto)) ||
        (temGeral && temaTreinamento) ||
        (temEmpresa && temaTreinamento)
    );
}

function validarNomeArquivoContraColaboradorSelecionado({ arquivo, colaboradorSelecionado = null } = {}) {
    const nomeArquivo = arquivo?.name || arquivo?.nome || arquivo?.filename || "";
    const nomeExtraido = extrairNomePessoaDoNomeArquivo(nomeArquivo);

    if (nomeArquivoEhTituloGeralDeTreinamento(nomeArquivo)) {
        return;
    }

    if (nomeParcialCompativelComColaborador({
        nomeParcial: nomeExtraido,
        nomeCompleto: colaboradorSelecionado?.nome || "",
    })) {
        return;
    }


    if (nomeArquivoEhDocumentoGeralTreinamento(nomeArquivo)) {
        return;
    }


    if (!nomeArquivo || !nomeExtraido || !colaboradorSelecionado?.nome) return;

    const tokensArquivo = tokensNomeColaboradorArquivo(nomeExtraido);
    const tokensSelecionado = tokensNomeColaboradorArquivo(colaboradorSelecionado.nome);

    if (tokensArquivo.length < 2 || tokensSelecionado.length < 2) return;

    const baseSelecionado = normalizarTextoBusca(colaboradorSelecionado.nome).replace(/[^a-z0-9]+/g, " ");
    const tokensArquivoNoSelecionado = tokensArquivo.filter((token) => baseSelecionado.includes(token));
    const proporcaoArquivoNoSelecionado = tokensArquivoNoSelecionado.length / tokensArquivo.length;
    const pontosSelecionado = pontuarNomeNoArquivo(nomeArquivo, colaboradorSelecionado.nome);

    // Bloqueio forte: o arquivo contém um nome de pessoa que não bate com o colaborador selecionado.
    // Exemplo: arquivo "LUCAS RIBEIRO CRUZ NR-11.pdf" selecionado para "LUCAS VINICIUS GOMES DOS SANTOS".
    if (proporcaoArquivoNoSelecionado < 0.62 || pontosSelecionado < 95) {
        throw new Error(
            `O nome do arquivo indica "${nomeExtraido}", mas o colaborador selecionado é "${colaboradorSelecionado.nome}". Corrija o colaborador ou envie o documento correto antes de salvar.`
        );
    }
}

function identificarColaboradorProvavelNoNomeArquivo({ arquivo, colaboradores = [] } = {}) {
    const nomeArquivo = arquivo?.name || arquivo?.nome || arquivo?.filename || "";

    if (!nomeArquivo) return null;

    const candidatos = (colaboradores || [])
        .map((colaborador) => ({
            colaborador,
            pontos: pontuarNomeNoArquivo(nomeArquivo, colaborador?.nome || ""),
        }))
        .filter((item) => item.pontos >= 78)
        .sort((a, b) => b.pontos - a.pontos);

    return candidatos[0] || null;
}


function validarCompatibilidadeArquivoColaborador({ arquivo, colaboradores = [], colaboradorSelecionado = null } = {}) {
    const nomeArquivoCompatibilidadeDocumentoGeral = arquivo?.name || arquivo?.nome || arquivo?.filename || "";

    if (nomeArquivoEhDocumentoGeralTreinamento(nomeArquivoCompatibilidadeDocumentoGeral)) {
        return;
    }

    validarNomeArquivoContraColaboradorSelecionado({
        arquivo,
        colaboradorSelecionado,
    });

    const provavel = identificarColaboradorProvavelNoNomeArquivo({ arquivo, colaboradores });

    if (!provavel?.colaborador || !colaboradorSelecionado?.id) return;

    if (nomeParcialCompativelComColaborador({
        nomeParcial: provavel.colaborador?.nome || "",
        nomeCompleto: colaboradorSelecionado?.nome || "",
    })) {
        return;
    }


    const mesmoColaborador = String(provavel.colaborador.id) === String(colaboradorSelecionado.id) ||
        String(provavel.colaborador.codigoFuncionario || "") === String(colaboradorSelecionado.codigoFuncionario || "");

    if (mesmoColaborador) return;

    const pontosSelecionado = pontuarNomeNoArquivo(arquivo?.name || "", colaboradorSelecionado?.nome || "");

    if (provavel.pontos >= pontosSelecionado || provavel.pontos >= 88) {
        throw new Error(
            `O arquivo parece pertencer a "${provavel.colaborador.nome}", mas o colaborador selecionado é "${colaboradorSelecionado.nome}". Corrija o colaborador ou envie o documento correto antes de salvar.`
        );
    }
}

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

    if (!certificado?.arquivo) {
        throw new Error("Selecione o arquivo PDF ou imagem do certificado.");
    }

    const colaboradorPreValidacao = certificado?.colaborador || colaboradorSelecionado || colaboradores.find((colaborador) =>
        String(colaborador.codigoFuncionario || "") === String(certificado?.colaboradorCodigo || "")
    ) || null;

    validarNomeArquivoContraColaboradorSelecionado({
        arquivo: certificado.arquivo,
        colaboradorSelecionado: colaboradorPreValidacao,
    });

    if (!certificado?.dataRealizacao) {
        throw new Error("Informe a data de realização/emissão.");
    }

    const treinamentoSemVencimento = treinamentoSemValidade(certificado.treinamentoId);

    if (!treinamentoSemVencimento && !certificado?.dataVencimento) {
        throw new Error("Informe a validade/revisão do certificado.");
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

    validarCompatibilidadeArquivoColaborador({
        arquivo: certificado.arquivo,
        colaboradores,
        colaboradorSelecionado: colaboradorSeguro,
    });

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
