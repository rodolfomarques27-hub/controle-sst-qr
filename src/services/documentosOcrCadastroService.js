// Comparação dos dados extraídos por OCR com o cadastro selecionado.
import {
    DOCUMENTOS_VERIFICACAO_PESOS,
    DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO,
} from "../constants/documentosVerificacaoConstants";
import {
    criarIndicioVerificacao,
    diferencaDiasVerificacao,
    formatarDataIsoVerificacao,
    normalizarTextoVerificacao,
    obterDataSeguraVerificacao,
} from "../utils/documentosVerificacaoUtils";
import {
    filtrarDatasPorCategoria,
    formatarDataBr,
    limparTextoPossivelDocumento,
    valorPareceSomenteDocumentoFiscal,
} from "./documentosOcrUtils";

const TOLERANCIA_DIAS_COMPARACAO = 2;

function encontrarDataMaisProxima(dataCadastroIso, datas = []) {
    const dataCadastro = obterDataSeguraVerificacao(dataCadastroIso);

    if (!dataCadastro || !datas.length) return null;

    return datas
        .map((data) => {
            const diferenca = Math.abs(diferencaDiasVerificacao(dataCadastro, data.iso) ?? 999999);
            return { ...data, diferencaDias: diferenca };
        })
        .sort((a, b) => a.diferencaDias - b.diferencaDias)[0] || null;
}

function datasContemCadastro(dataCadastroIso, datas = []) {
    const dataCadastro = obterDataSeguraVerificacao(dataCadastroIso);

    if (!dataCadastro) return true;

    return datas.some((data) => {
        const diferenca = Math.abs(diferencaDiasVerificacao(dataCadastro, data.iso) ?? 999999);
        return diferenca <= TOLERANCIA_DIAS_COMPARACAO;
    });
}

function compararCampoDataCadastro({
    leitura,
    dataCadastro,
    labelCampo,
    codigo,
    categoriaPreferencial = "",
    pesoPadrao = DOCUMENTOS_VERIFICACAO_PESOS.DATA_CADASTRO_NAO_LOCALIZADA_DOCUMENTO,
} = {}) {
    const dataCadastroIso = formatarDataIsoVerificacao(dataCadastro);

    if (!dataCadastroIso || !leitura?.comparacaoDatasPermitida) return null;

    const datasConfiaveis = leitura.datasDocumentoConfiaveis || [];
    if (!datasConfiaveis.length) return null;

    const datasPreferenciais = categoriaPreferencial
        ? filtrarDatasPorCategoria(datasConfiaveis, categoriaPreferencial)
        : [];
    const baseComparacao = datasPreferenciais.length ? datasPreferenciais : datasConfiaveis;

    if (datasContemCadastro(dataCadastroIso, baseComparacao)) return null;

    const maisProxima = encontrarDataMaisProxima(dataCadastroIso, baseComparacao);
    const peso = maisProxima?.diferencaDias >= 30
        ? pesoPadrao
        : DOCUMENTOS_VERIFICACAO_PESOS.DATA_CADASTRO_NAO_LOCALIZADA_DOCUMENTO_LEVE;

    return criarIndicioVerificacao({
        codigo,
        tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.OCR,
        titulo: `${labelCampo} cadastrada não localizada na leitura do documento`,
        detalhe: maisProxima
            ? `${labelCampo} cadastrada: ${formatarDataBr(dataCadastroIso)}. Data mais próxima lida no texto do arquivo: ${maisProxima.br} (${maisProxima.diferencaDias} dia(s) de diferença).`
            : `${labelCampo} cadastrada: ${formatarDataBr(dataCadastroIso)}. Datas lidas no texto do arquivo: ${baseComparacao.map((data) => data.br).join(", ")}.`,
        peso,
        recomendacao: "Conferir manualmente se a data cadastrada no sistema corresponde à data real do documento.",
        dados: {
            dataCadastro: dataCadastroIso,
            dataMaisProximaDocumento: maisProxima?.iso || null,
            diferencaDias: maisProxima?.diferencaDias ?? null,
            datasEncontradas: baseComparacao.map((data) => data.iso),
        },
    });
}

function avaliarAssinaturaDigitalLeitura({ leitura, dataVencimento } = {}) {
    const indicios = [];
    const hoje = new Date();
    const hojeMeioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 12, 0, 0);
    const vencimento = obterDataSeguraVerificacao(dataVencimento);

    if (!leitura?.comparacaoDatasPermitida) return indicios;

    for (const dataAssinatura of leitura?.datasAssinaturaDigital || []) {
        const assinatura = obterDataSeguraVerificacao(dataAssinatura.iso);

        if (!assinatura) continue;

        if (assinatura > hojeMeioDia) {
            indicios.push(criarIndicioVerificacao({
                codigo: "assinatura_digital_futura",
                tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.OCR,
                titulo: "Data de assinatura digital futura",
                detalhe: `A leitura local identificou possível data de assinatura digital futura: ${dataAssinatura.br}.`,
                peso: DOCUMENTOS_VERIFICACAO_PESOS.DATA_ASSINATURA_DIGITAL_FUTURA,
                recomendacao: "Conferir o certificado digital, carimbo de tempo ou validade da assinatura.",
                dados: { dataAssinatura: dataAssinatura.iso },
            }));
        }

        if (vencimento && assinatura > vencimento) {
            indicios.push(criarIndicioVerificacao({
                codigo: "assinatura_digital_apos_vencimento",
                tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.OCR,
                titulo: "Assinatura digital posterior ao vencimento cadastrado",
                detalhe: `Assinatura provável: ${dataAssinatura.br}. Vencimento cadastrado: ${formatarDataBr(formatarDataIsoVerificacao(vencimento))}.`,
                peso: DOCUMENTOS_VERIFICACAO_PESOS.DATA_ASSINATURA_APOS_VENCIMENTO,
                recomendacao: "Validar manualmente a assinatura digital e a vigência do documento.",
                dados: {
                    dataAssinatura: dataAssinatura.iso,
                    dataVencimento: formatarDataIsoVerificacao(vencimento),
                },
            }));
        }
    }

    return indicios;
}

function normalizarDocumentoTextoComparacao(valor = "") {
    return normalizarTextoVerificacao(valor)
        .replace(/\b(ltda|me|epp|eireli|sa|s\/a|ss|s\/s|construtora|construcoes|construções|pavimentadora|pavimentacao|pavimentação|comercio|comércio|servicos|serviços|empresa|grupo)\b/g, " ")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function obterTokensComparacaoEmpresa(valor = "") {
    return normalizarDocumentoTextoComparacao(valor)
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length >= 3);
}

function calcularSimilaridadeNomeEmpresa(nomeA = "", nomeB = "") {
    const tokensA = Array.from(new Set(obterTokensComparacaoEmpresa(nomeA)));
    const tokensB = Array.from(new Set(obterTokensComparacaoEmpresa(nomeB)));

    if (!tokensA.length || !tokensB.length) return 1;

    const intersecao = tokensA.filter((token) => tokensB.includes(token));
    return intersecao.length / Math.min(tokensA.length, tokensB.length);
}

function apenasDigitosDocumento(valor = "") {
    return String(valor || "").replace(/\D/g, "");
}

function formatarCnpjDocumento(valor = "") {
    const digitos = apenasDigitosDocumento(valor);

    if (digitos.length !== 14) return valor || "";

    return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12, 14)}`;
}

function obterCamposExtraidosDaLeitura(leitura = {}) {
    return leitura?.camposExtraidos || leitura?.campos_extraidos || {};
}

// documentos_empresa_cnpj_multiplos_validos_v1:
// Considera todos os CNPJs válidos encontrados na leitura.
// O CNPJ cadastrado só é priorizado quando aparece efetivamente no documento.
function calcularDigitoCnpjDocumento(base = "", pesos = []) {
    const soma =
        String(base || "")
            .split("")
            .reduce(
                (total, digito, indice) =>
                    total +
                    Number(digito) *
                        Number(
                            pesos[indice] ||
                            0
                        ),
                0
            );

    const resto =
        soma % 11;

    return resto < 2
        ? 0
        : 11 - resto;
}

function cnpjValidoDocumento(valor = "") {
    const digitos =
        apenasDigitosDocumento(
            valor
        );

    if (
        !/^\d{14}$/.test(
            digitos
        ) ||
        /^(\d)\1{13}$/.test(
            digitos
        )
    ) {
        return false;
    }

    const primeiroDigito =
        calcularDigitoCnpjDocumento(
            digitos.slice(
                0,
                12
            ),
            [
                5,
                4,
                3,
                2,
                9,
                8,
                7,
                6,
                5,
                4,
                3,
                2,
            ]
        );

    const segundoDigito =
        calcularDigitoCnpjDocumento(
            digitos.slice(
                0,
                12
            ) +
                String(
                    primeiroDigito
                ),
            [
                6,
                5,
                4,
                3,
                2,
                9,
                8,
                7,
                6,
                5,
                4,
                3,
                2,
            ]
        );

    return (
        digitos.slice(
            12
        ) ===
        `${primeiroDigito}${segundoDigito}`
    );
}

function extrairCnpjsValidosLeituraDocumento(leitura = {}) {
    const campos =
        obterCamposExtraidosDaLeitura(
            leitura
        );

    let textoSerializado = "";

    try {
        textoSerializado =
            JSON.stringify(
                leitura ||
                {}
            );
    } catch {
        textoSerializado =
            [
                campos?.cnpj,
                leitura?.textoExtraido,
                leitura?.texto_extraido,
                leitura?.texto,
            ]
                .filter(
                    Boolean
                )
                .join(
                    " "
                );
    }

    const texto =
        String(
            textoSerializado ||
            ""
        );

    const candidatosFormatados =
        Array.from(
            texto.matchAll(
                /\b\d{2}[.\s]?\d{3}[.\s]?\d{3}[\/\s]?\d{4}[-\s]?\d{2}\b/g
            )
        ).map(
            (match) =>
                match?.[0] ||
                ""
        );

    const candidatosSemMascara =
        Array.from(
            texto.matchAll(
                /\b\d{14}\b/g
            )
        ).map(
            (match) =>
                match?.[0] ||
                ""
        );

    const candidatosCampos =
        [
            campos?.cnpj,
            ...(
                Array.isArray(
                    campos?.cnpjs
                )
                    ? campos.cnpjs
                    : []
            ),
        ];

    return Array.from(
        new Set(
            [
                ...candidatosCampos,
                ...candidatosFormatados,
                ...candidatosSemMascara,
            ]
                .map(
                    apenasDigitosDocumento
                )
                .filter(
                    cnpjValidoDocumento
                )
        )
    );
}

function avaliarEmpresaExtraidaDocumento({ leitura, empresa = {} } = {}) {
    const indicios = [];
    const campos = obterCamposExtraidosDaLeitura(leitura);

    const cnpjEmpresa =
        apenasDigitosDocumento(
            empresa?.cnpj ||
            empresa?.cpf_cnpj ||
            empresa?.documento ||
            ""
        );

    const cnpjsDocumento =
        extrairCnpjsValidosLeituraDocumento(
            leitura
        );

    const cnpjDocumentoCampos =
        apenasDigitosDocumento(
            campos?.cnpj
        );

    const cnpjDocumento =
        cnpjEmpresa &&
        cnpjsDocumento.includes(
            cnpjEmpresa
        )
            ? cnpjEmpresa
            : cnpjValidoDocumento(
                  cnpjDocumentoCampos
              )
              ? cnpjDocumentoCampos
              : cnpjsDocumento[0] ||
                "";

    const nomeDocumentoExtraido = limparTextoPossivelDocumento(campos?.empresa_nome || "");
    const nomeDocumento = valorPareceSomenteDocumentoFiscal(nomeDocumentoExtraido) ? "" : nomeDocumentoExtraido;
    const nomeEmpresa = limparTextoPossivelDocumento(empresa?.nome || empresa?.razao_social || empresa?.razaoSocial || "");

    // CNPJ igual é a validação mais forte. Quando o CNPJ extraído bate com o cadastro,
    // não gerar divergência apenas porque o nome foi lido parcialmente ou como número.
    if (cnpjDocumento && cnpjEmpresa && cnpjDocumento === cnpjEmpresa) {
        return indicios;
    }

    if (cnpjDocumento && cnpjEmpresa && cnpjDocumento !== cnpjEmpresa) {
        indicios.push(criarIndicioVerificacao({
            codigo: "cnpj_documento_diverge_empresa_selecionada",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.CADASTRO,
            titulo: "CNPJ do documento diverge da empresa selecionada",
            detalhe: `O documento indica CNPJ ${formatarCnpjDocumento(cnpjDocumento)}${nomeDocumento ? ` para ${nomeDocumento}` : ""}. A empresa selecionada possui CNPJ ${formatarCnpjDocumento(cnpjEmpresa)}${nomeEmpresa ? ` (${nomeEmpresa})` : ""}.`,
            peso: DOCUMENTOS_VERIFICACAO_PESOS.DIVERGENCIA_EMPRESA,
            bloqueia: true,
            recomendacao: "Não aprovar este documento para a empresa selecionada. Conferir se o arquivo foi enviado na empresa correta ou substituir pelo documento correspondente.",
            dados: {
                cnpjDocumento: formatarCnpjDocumento(cnpjDocumento),
                cnpjEmpresaSelecionada: formatarCnpjDocumento(cnpjEmpresa),
                empresaDocumento: nomeDocumento,
                empresaSelecionada: nomeEmpresa,
            },
        }));

        return indicios;
    }

    if (cnpjEmpresa && !cnpjDocumento) {
        indicios.push(criarIndicioVerificacao({
            codigo: "cnpj_empresa_nao_localizado_documento",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.CADASTRO,
            titulo: "CNPJ da empresa não localizado no documento",
            detalhe: `O leitor não encontrou no PDF o CNPJ ${formatarCnpjDocumento(cnpjEmpresa)}${nomeEmpresa ? ` da empresa ${nomeEmpresa}` : ""}.`,
            peso: DOCUMENTOS_VERIFICACAO_PESOS.DIVERGENCIA_EMPRESA,
            bloqueia: true,
            recomendacao: "Não aprovar automaticamente. Conferir o PDF original e confirmar manualmente se o documento pertence à empresa cadastrada.",
            dados: {
                cnpjEmpresaSelecionada: formatarCnpjDocumento(cnpjEmpresa),
                empresaSelecionada: nomeEmpresa,
            },
        }));

        return indicios;
    }

    if (nomeDocumento && nomeEmpresa) {
        const similaridade = calcularSimilaridadeNomeEmpresa(nomeDocumento, nomeEmpresa);

        if (similaridade < 0.35) {
            indicios.push(criarIndicioVerificacao({
                codigo: "nome_empresa_documento_diverge_empresa_selecionada",
                tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.CADASTRO,
                titulo: "Nome da empresa no documento diverge da empresa selecionada",
                detalhe: `O documento indica ${nomeDocumento}. A empresa selecionada é ${nomeEmpresa}.`,
                peso: DOCUMENTOS_VERIFICACAO_PESOS.DIVERGENCIA_EMPRESA,
                bloqueia: false,
                recomendacao: "Conferir manualmente se o documento pertence à empresa correta. Se o CNPJ também divergir, o documento deve ser substituído.",
                dados: {
                    empresaDocumento: nomeDocumento,
                    empresaSelecionada: nomeEmpresa,
                    similaridade,
                },
            }));
        }
    }

    return indicios;
}

export function avaliarLeituraDocumentalComCadastro({
    leitura,
    empresa = {},
} = {}) {
    if (!leitura) return [];

    // Nesta etapa a leitura local/OCR continua sem comparar datas automaticamente,
    // para evitar falsos alertas. A exceção segura é a conferência de empresa/CNPJ,
    // pois evita aprovar documento enviado na empresa errada.
    return [
        ...avaliarEmpresaExtraidaDocumento({ leitura, empresa }),
    ];
}
