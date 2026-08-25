import {
    inferirTreinamentoPorNomeArquivo,
    detectarDataEmissaoArquivo,
    calcularVencimentoTreinamento,
    obterTreinamento,
} from "./colaboradorDocumentosService";
import { normalizarTextoBusca } from "../utils/sstUtils";
import { classificarDocumentoTreinamentoArquivo } from "./classificadorDocumentoTreinamentoService";

export function identificarColaboradorPorArquivo(arquivo, colaboradores = []) {
    const nomeArquivoOriginal = arquivo?.name || "";
    const nomeArquivo = normalizarTextoBusca(nomeArquivoOriginal.replace(/\.[^.]+$/, ""));
    const nomeArquivoCompacto = nomeArquivo.replace(/[^a-z0-9]/g, "");

    let melhor = null;
    let melhorPontuacao = 0;

    colaboradores.forEach((colaborador) => {
        const codigo = normalizarTextoBusca(colaborador.codigoFuncionario || "").replace(/[^a-z0-9]/g, "");
        const nome = normalizarTextoBusca(colaborador.nome || "").replace(/[^a-z0-9\s]/g, " ");
        const nomeCompacto = nome.replace(/\s+/g, "");
        const palavrasNome = nome.split(/\s+/).filter((parte) => parte.length >= 3);

        let pontos = 0;

        if (codigo && nomeArquivoCompacto.includes(codigo)) pontos += 120;
        if (nomeCompacto && nomeArquivoCompacto.includes(nomeCompacto)) pontos += 90;

        const acertosNome = palavrasNome.filter((parte) => nomeArquivo.includes(parte)).length;
        pontos += acertosNome * 15;

        if (palavrasNome.length > 0 && acertosNome >= Math.min(2, palavrasNome.length)) {
            pontos += 25;
        }

        if (pontos > melhorPontuacao) {
            melhorPontuacao = pontos;
            melhor = colaborador;
        }
    });

    return melhorPontuacao >= 25 ? melhor : null;
}


function nomesCompativeisTreinamentoLote(nomeSugerido = "", nomeSelecionado = "") {
    const normalizar = (valor = "") =>
        String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();

    const sugerido = normalizar(nomeSugerido);
    const selecionado = normalizar(nomeSelecionado);

    if (!sugerido || !selecionado) return false;

    const sugeridoSemEspaco = sugerido.replace(/\s+/g, "");
    const selecionadoSemEspaco = selecionado.replace(/\s+/g, "");

    if (selecionado.includes(sugerido)) return true;
    if (selecionadoSemEspaco.includes(sugeridoSemEspaco)) return true;

    const tokensSugerido = sugerido.split(" ").filter((token) => token.length >= 3);
    const tokensSelecionado = selecionado.split(" ").filter((token) => token.length >= 3);

    if (!tokensSugerido.length || !tokensSelecionado.length) return false;

    const encontrados = tokensSugerido.filter((token) => tokensSelecionado.includes(token));

    return encontrados.length / tokensSugerido.length >= 0.8;
}

export async function prepararArquivosTreinamentoLote({
    listaArquivos = [],
    colaboradores = [],
    colabSelecionado = null,
    dataRealizacao = "",
}) {
    const arquivos = Array.from(listaArquivos || []);

    return Promise.all(
        arquivos.map(async (arquivo, index) => {
            const treinamento = inferirTreinamentoPorNomeArquivo(arquivo.name);
            const sugestaoData = await detectarDataEmissaoArquivo(arquivo);
            const classificacaoDocumento = classificarDocumentoTreinamentoArquivo({
                arquivo,
                treinamento,
                sugestaoData,
            });
            const dataIdentificadaDocumento = Boolean(sugestaoData?.data);
            const dataArquivo = sugestaoData.data || dataRealizacao || "";
            const colaboradorSugerido = identificarColaboradorPorArquivo(arquivo, colaboradores);
            const pareceOutroColaborador =
                colaboradorSugerido?.codigoFuncionario &&
                colabSelecionado?.codigoFuncionario &&
                String(colaboradorSugerido.codigoFuncionario) !== String(colabSelecionado.codigoFuncionario);

            return {
                id: `${Date.now()}-${index}-${arquivo.name}`,
                arquivo,
                colaboradorCodigo: colabSelecionado?.codigoFuncionario || "",
                colaboradorSugeridoCodigo: colaboradorSugerido?.codigoFuncionario || "",
                treinamentoId: treinamento?.id || "",
                dataRealizacao: dataArquivo,
                dataVencimento: treinamento ? calcularVencimentoTreinamento(treinamento.id, dataArquivo) : "",
                sugestaoData,
                dataIdentificadaDocumento,
                dataProvisoria: !dataIdentificadaDocumento && Boolean(dataArquivo),
                dataConferidaManualmente: false,
                classificacaoDocumento,
                tipoDocumentoTreinamento: classificacaoDocumento.tipo,
                tipoDocumentoTreinamentoLabel: classificacaoDocumento.label,
                tipoDocumentoTreinamentoConfianca: classificacaoDocumento.confianca,
                tipoDocumentoTreinamentoMotivo: classificacaoDocumento.motivo,
                status: treinamento
                    ? pareceOutroColaborador && !nomesCompativeisTreinamentoLote(colaboradorSugerido?.nome || "", colabSelecionado?.nome || "")
                        ? `Atenção: arquivo parece ser de ${colaboradorSugerido.nome}`
                        : sugestaoData.data
                            ? "Treinamento e data identificados"
                            : "Treinamento identificado"
                    : "Treinamento não identificado",
            };
        })
    );
}

export function atualizarColaboradorArquivoLote(lista = [], arquivoId, colaboradorCodigo) {
    return lista.map((item) =>
        item.id === arquivoId
            ? {
                ...item,
                colaboradorCodigo,
                status: colaboradorCodigo
                    ? item.treinamentoId
                        ? "Conferido"
                        : "Treinamento não identificado"
                    : "Selecione o colaborador",
            }
            : item
    );
}

export function atualizarTreinamentoArquivoLote(lista = [], arquivoId, treinamentoId, dataRealizacao = "") {
    return lista.map((item) => {
        if (item.id !== arquivoId) return item;

        const treinamento = obterTreinamento(Number(treinamentoId));
        const dataBase = item.dataRealizacao || dataRealizacao;

        return {
            ...item,
            treinamentoId: treinamento?.id || "",
            dataVencimento: treinamento ? calcularVencimentoTreinamento(treinamento.id, dataBase) : "",
            status: treinamento && item.colaboradorCodigo ? "Conferido" : "Conferir dados",
        };
    });
}

export function atualizarDataArquivoLote(lista = [], arquivoId, data) {
    return lista.map((item) => {
        if (item.id !== arquivoId) return item;

        return {
            ...item,
            dataRealizacao: data,
            dataVencimento: item.treinamentoId
                ? calcularVencimentoTreinamento(item.treinamentoId, data)
                : "",
            dataProvisoria: false,
            dataConferidaManualmente: Boolean(data),
        };
    });
}
