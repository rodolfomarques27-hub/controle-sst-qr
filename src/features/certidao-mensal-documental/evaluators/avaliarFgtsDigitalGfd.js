import {
    cnpjsSaoIguais,
    extrairCnpjsDocumento,
    extrairRazaoSocialDocumento,
    formatarCnpj,
    somenteDigitos,
} from "../analysis/certidaoDocumentTextUtils.js";
import {
    avaliarDataEmissaoDocumental,
    avaliarValidadeDocumental,
    converterDataBrParaIso,
} from "../analysis/certidaoDocumentDateUtils.js";

function textoSeguro(
    valor = ""
) {
    return String(
        valor || ""
    )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

function extrairPagina(
    texto = "",
    numero = 1
) {
    const conteudo =
        String(
            texto || ""
        );

    const padrao =
        new RegExp(
            (
                `P[aá]gina\\s+${numero}:\\s*` +
                "([\\s\\S]*?)" +
                "(?=\\s+P[aá]gina\\s+\\d+:|$)"
            ),
            "i"
        );

    const correspondencia =
        conteudo.match(
            padrao
        );

    if (correspondencia?.[1]) {
        return textoSeguro(
            correspondencia[1]
        );
    }

    return numero === 1
        ? textoSeguro(conteudo)
        : "";
}

function extrairPrimeiroValor(
    texto = "",
    padroes = []
) {
    const conteudo =
        String(
            texto || ""
        );

    for (const padrao of padroes) {
        const correspondencia =
            conteudo.match(
                padrao
            );

        const valor =
            textoSeguro(
                correspondencia?.[1] ||
                ""
            );

        if (valor) {
            return valor;
        }
    }

    return "";
}

function normalizarCompetencia(
    valor = ""
) {
    const correspondencia =
        String(
            valor || ""
        ).match(
            /(\d{2})\/(\d{4})/
        );

    if (!correspondencia) {
        return "";
    }

    const mes =
        Number(
            correspondencia[1]
        );

    const ano =
        Number(
            correspondencia[2]
        );

    if (
        mes < 1 ||
        mes > 12 ||
        ano < 2000 ||
        ano > 2099
    ) {
        return "";
    }

    return (
        String(mes)
            .padStart(
                2,
                "0"
            ) +
        "/" +
        String(ano)
    );
}

function normalizarValorMonetario(
    valor = ""
) {
    const correspondencia =
        String(
            valor || ""
        ).match(
            /(\d{1,3}(?:\.\d{3})*,\d{2})/
        );

    if (!correspondencia?.[1]) {
        return "";
    }

    return (
        "R$ " +
        correspondencia[1]
    );
}

function valorMonetarioParaCentavos(
    valor = ""
) {
    const normalizado =
        normalizarValorMonetario(
            valor
        )
            .replace(
                "R$",
                ""
            )
            .trim();

    if (!normalizado) {
        return null;
    }

    const partes =
        normalizado.split(
            ","
        );

    const inteiro =
        Number(
            String(
                partes[0] || ""
            ).replace(
                /\./g,
                ""
            )
        );

    const centavos =
        Number(
            String(
                partes[1] || ""
            )
                .padEnd(
                    2,
                    "0"
                )
                .slice(
                    0,
                    2
                )
        );

    if (
        !Number.isFinite(inteiro) ||
        !Number.isFinite(centavos)
    ) {
        return null;
    }

    return (
        inteiro * 100 +
        centavos
    );
}

function normalizarSeparadoresEstruturaisGfd(
    texto = ""
) {
    return String(
        texto || ""
    )
        .replace(
            /[\u0000-\u001f]+/g,
            " "
        )
        .replace(
            /%+/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

function extrairRazaoSocialGfd(
    texto = ""
) {
    const conteudo =
        normalizarSeparadoresEstruturaisGfd(
            texto
        );

    const valorEspecifico =
        extrairPrimeiroValor(
            conteudo,
            [
                /NOME\s*\/\s*RAZ[AÃ]O\s+SOCIAL\s+DO\s+EMPREGADOR\s*:?\s*(.{3,180}?)(?=\s+N[ÚU]M\.?\s+DE\s+P[ÁA]G\.?|\s+IDENTIFICADOR|\s+TAG|\s+PAGAR\s+ESTE\s+DOCUMENTO)/i,
                /RAZ[AÃ]O\s+SOCIAL(?:\s+DO\s+EMPREGADOR)?\s*:?\s*(.{3,180}?)(?=\s+CNPJ|\s+COMPET[ÊE]NCIA|\s+ENDERE[CÇ]O|\s+VENCIMENTO|\s+IDENTIFICADOR|$)/i,
                /NOME\s+DO\s+EMPREGADOR\s*:?\s*(.{3,180}?)(?=\s+CNPJ|\s+COMPET[ÊE]NCIA|\s+ENDERE[CÇ]O|\s+IDENTIFICADOR|$)/i,
            ]
        );

    if (valorEspecifico) {
        return valorEspecifico;
    }

    return extrairRazaoSocialDocumento(
        conteudo
    );
}

function extrairDadosGuia(
    texto = ""
) {
    const paginaGuia =
        normalizarSeparadoresEstruturaisGfd(
            extrairPagina(
                texto,
                1
            )
        );

    const composicao =
        paginaGuia.match(
            /COMPOSI[CÇ][AÃ]O\s+DO\s+DOCUMENTO[\s\S]*?INDENIZA[CÇ][AÃ]O\s+COMPENSAT[ÓO]RIA\s+ENCARGOS\s+FGTS\s+TOTAL\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{2}\/\d{4})\s+(\d{1,7})\b/i
        );

    const recolhimentoConsignado =
        paginaGuia.match(
            /COMPET[ÊE]NCIA\s+CONSIGNADO\s+TOTAL\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{1,3}(?:\.\d{3})*,\d{2})\s+(\d{2}\/\d{4})/i
        );

    const competencia =
        normalizarCompetencia(
            (
                extrairPrimeiroValor(
                    paginaGuia,
                    [
                        /TAG\s+\d{8}\s+(\d{2}\/\d{4})\s+MENSAL/i,
                        /COMPET[ÊE]NCIA\s*:?\s*(\d{2}\/\d{4})/i,
                    ]
                ) ||
                composicao?.[6] ||
                recolhimentoConsignado?.[3] ||
                ""
            )
        );

    const dataGeracao =
        extrairPrimeiroValor(
            paginaGuia,
            [
                /DATA\s+DE\s+GERA(?:Ç|C)[AÃ]O(?:\s+DA\s+GUIA)?\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
                /GERADO\s+EM\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
            ]
        );

    const horaGeracao =
        extrairPrimeiroValor(
            paginaGuia,
            [
                /DATA\s+DE\s+GERA(?:Ç|C)[AÃ]O(?:\s+DA\s+GUIA)?\s*:?\s*\d{2}\/\d{2}\/\d{4}\s*(?:ÀS|AS)?\s*(\d{2}:\d{2}(?::\d{2})?)/i,
                /GERADO\s+EM\s*:?\s*\d{2}\/\d{2}\/\d{4}\s*(?:ÀS|AS)?\s*(\d{2}:\d{2}(?::\d{2})?)/i,
            ]
        );

    const vencimento =
        extrairPrimeiroValor(
            paginaGuia,
            [
                /PAGAR\s+ESTE\s+DOCUMENTO\s+AT(?:[ÉE])?\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
                /VENCIMENTO\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
            ]
        );

    const quantidadeTrabalhadores =
        Number(
            (
                composicao?.[7] ||
                extrairPrimeiroValor(
                    paginaGuia,
                    [
                        /QUANTIDADE\s+DE\s+TRABALHADORES\s*:?\s*(\d{1,7})/i,
                        /TRABALHADORES\s*:?\s*(\d{1,7})/i,
                    ]
                ) ||
                0
            )
        );

    const fgtsMensal =
        normalizarValorMonetario(
            (
                composicao?.[1] ||
                extrairPrimeiroValor(
                    paginaGuia,
                    [
                        /FGTS\s+MENSAL\s*:?\s*(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/i,
                        /TOTAL\s+FGTS\s*:?\s*(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/i,
                    ]
                )
            )
        );

    const consignado =
        normalizarValorMonetario(
            (
                recolhimentoConsignado?.[1] ||
                extrairPrimeiroValor(
                    paginaGuia,
                    [
                        /TOTAL\s+CONSIGNADO\s*:?\s*(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/i,
                        /CONSIGNADO(?:\s+DO\s+TRABALHADOR)?\s*:?\s*(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/i,
                    ]
                )
            )
        );

    const totalGuia =
        normalizarValorMonetario(
            extrairPrimeiroValor(
                paginaGuia,
                [
                    /TOTAL\s+DA\s+GUIA\s*:?\s*(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/i,
                    /VALOR\s+A\s+RECOLHER\s*:?\s*(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/i,
                    /TOTAL\s+A\s+RECOLHER\s*:?\s*(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/i,
                ]
            )
        );

    const identificador =
        extrairPrimeiroValor(
            paginaGuia,
            [
                /IDENTIFICADOR(?:\s+DA\s+GUIA)?\s*:?\s*([0-9][0-9.\-]{7,50})/i,
                /N[ÚU]MERO\s+DA\s+GUIA\s*:?\s*([0-9][0-9.\-]{7,50})/i,
            ]
        );

    const cnpjs =
        extrairCnpjsDocumento(
            paginaGuia
        );

    return {
        paginaGuia,
        competencia,
        dataGeracao,
        horaGeracao,
        vencimento,
        quantidadeTrabalhadores,
        fgtsMensal,
        consignado,
        totalGuia,
        identificador,
        cnpj:
            cnpjs[0] || "",
        razaoSocial:
            extrairRazaoSocialGfd(
                paginaGuia
            ),
    };
}

function extrairDadosPagamento(
    texto = ""
) {
    const paginaPagamento =
        normalizarSeparadoresEstruturaisGfd(
            extrairPagina(
                texto,
                2
            )
        );

    const comprovantePresente =
        Boolean(
            paginaPagamento &&
            (
                /COMPROVANTE\s+DE\s+PAGAMENTO/i.test(
                    paginaPagamento
                ) ||
                /PAGAMENTO\s+EFETUADO\s+EM/i.test(
                    paginaPagamento
                ) ||
                /PIX\s+QR\s+CODE/i.test(
                    paginaPagamento
                ) ||
                (
                    /INTERNET\s+BANKING\s+EMPRESARIAL/i.test(
                        paginaPagamento
                    ) &&
                    /DADOS\s+DO\s+PAGADOR/i.test(
                        paginaPagamento
                    )
                )
            )
        );

    const cnpjs =
        extrairCnpjsDocumento(
            paginaPagamento
        );

    const cnpjPagador =
        extrairPrimeiroValor(
            paginaPagamento,
            [
                /DADOS\s+DO\s+PAGADOR[\s\S]*?CPF\/CNPJ\s*:?\s*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/i,
            ]
        ) ||
        cnpjs[1] ||
        cnpjs[0] ||
        "";

    const valorPago =
        normalizarValorMonetario(
            extrairPrimeiroValor(
                paginaPagamento,
                [
                    /VALOR\s+DA\s+TRANSA[CÇ][AÃ]O\s*:?\s*(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/i,
                    /VALOR\s+FINAL\s*:?\s*(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/i,
                    /VALOR\s+DO\s+DOCUMENTO\s*:?\s*(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/i,
                    /VALOR(?:\s+PAGO)?\s*:?\s*(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2})/i,
                    /\bR\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i,
                ]
            )
        );

    const dataPagamento =
        extrairPrimeiroValor(
            paginaPagamento,
            [
                /PAGAMENTO\s+EFETUADO\s+EM\s+(\d{2}\/\d{2}\/\d{4})/i,
                /PAGAMENTO\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
                /DATA\s+DO\s+PAGAMENTO\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
                /DATA\/HORA\s+DA\s+TRANSA[CÇ][AÃ]O\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
                /(\d{2}\/\d{2}\/\d{4})\s*-\s*\d{2}:\d{2}(?::\d{2})?/i,
            ]
        );

    const horaPagamento =
        extrairPrimeiroValor(
            paginaPagamento,
            [
                /PAGAMENTO\s+EFETUADO\s+EM\s+\d{2}\/\d{2}\/\d{4}\s*(?:ÀS|AS)?\s*(\d{2}:\d{2}(?::\d{2})?)/i,
                /PAGAMENTO\s*:?\s*\d{2}\/\d{2}\/\d{4}\s*(?:ÀS|AS)?\s*(\d{2}:\d{2}(?::\d{2})?)/i,
                /DATA\s+DO\s+PAGAMENTO\s*:?\s*\d{2}\/\d{2}\/\d{4}\s*(?:ÀS|AS)?\s*(\d{2}:\d{2}(?::\d{2})?)/i,
                /DATA\/HORA\s+DA\s+TRANSA[CÇ][AÃ]O\s*:?\s*\d{2}\/\d{2}\/\d{4}\s*(?:-\s*)?(\d{2}:\d{2}(?::\d{2})?)/i,
                /\d{2}\/\d{2}\/\d{4}\s*-\s*(\d{2}:\d{2}(?::\d{2})?)/i,
            ]
        );

    const meioPagamento =
        extrairPrimeiroValor(
            paginaPagamento,
            [
                /TIPO\s+DA\s+TRANSA[CÇ][AÃ]O\s*:?\s*(PIX\s+QR\s+CODE|PIX|BOLETO|D[ÉE]BITO|TRANSFER[ÊE]NCIA)/i,
                /TIPO\s*:?\s*(PIX\s+QR\s+CODE|PIX|BOLETO|D[ÉE]BITO|TRANSFER[ÊE]NCIA)/i,
                /(PIX\s+QR\s+CODE)/i,
                /(INTERNET\s+BANKING\s+EMPRESARIAL)/i,
            ]
        );

    return {
        paginaPagamento,
        comprovantePresente,
        cnpjPagador,
        valorPago,
        dataPagamento,
        horaPagamento,
        meioPagamento,
    };
}

function criarRegra({
    codigo,
    titulo,
    status,
    mensagem,
}) {
    return {
        codigo,
        titulo,
        status,
        mensagem,
    };
}

export function avaliarFgtsDigitalGfd({
    textoExtraido,
    classificacao,
    documentoEsperado,
    empresaEsperada,
    dataReferencia = new Date(),
}) {
    const guia =
        extrairDadosGuia(
            textoExtraido
        );

    const pagamento =
        extrairDadosPagamento(
            textoExtraido
        );

    const tipoCorreto =
        classificacao?.id ===
        "fgts-digital-gfd";

    const cnpjEsperado =
        somenteDigitos(
            empresaEsperada?.cnpj
        );

    const cnpjDocumento =
        somenteDigitos(
            guia.cnpj ||
            pagamento.cnpjPagador
        );

    const possuiCnpjDocumento =
        cnpjDocumento.length === 14;

    const cnpjConfere =
        cnpjsSaoIguais(
            cnpjDocumento,
            cnpjEsperado
        );

    const competenciaEsperada =
        normalizarCompetencia(
            documentoEsperado
                ?.competenciaEsperada ||
            documentoEsperado
                ?.competencia ||
            ""
        );

    const competenciaConfere =
        Boolean(
            competenciaEsperada &&
            guia.competencia &&
            competenciaEsperada ===
                guia.competencia
        );

    const totalGuiaCentavos =
        valorMonetarioParaCentavos(
            guia.totalGuia
        );

    const valorPagoCentavos =
        valorMonetarioParaCentavos(
            pagamento.valorPago
        );

    const valorPagamentoConfere =
        Boolean(
            totalGuiaCentavos !== null &&
            valorPagoCentavos !== null &&
            totalGuiaCentavos ===
                valorPagoCentavos
        );

    const cnpjPagamentoConfere =
        Boolean(
            pagamento.cnpjPagador &&
            cnpjDocumento &&
            cnpjsSaoIguais(
                pagamento.cnpjPagador,
                cnpjDocumento
            )
        );

    const vencimentoIso =
        converterDataBrParaIso(
            guia.vencimento
        );

    const pagamentoIso =
        converterDataBrParaIso(
            pagamento.dataPagamento
        );

    const pagamentoNoPrazo =
        Boolean(
            vencimentoIso &&
            pagamentoIso &&
            pagamentoIso <=
                vencimentoIso
        );

    const situacaoGeracao =
        avaliarDataEmissaoDocumental(
            converterDataBrParaIso(
                guia.dataGeracao
            ),
            dataReferencia
        );

    const situacaoVencimento =
        avaliarValidadeDocumental(
            vencimentoIso,
            dataReferencia
        );

    const guiaPossuiCamposMinimos =
        Boolean(
            guia.competencia &&
            guia.vencimento &&
            guia.totalGuia &&
            guia.identificador
        );

    const comprovanteCompleto =
        Boolean(
            pagamento.comprovantePresente &&
            pagamento.cnpjPagador &&
            pagamento.valorPago &&
            pagamento.dataPagamento
        );

    const possuiDivergenciaCritica =
        Boolean(
            !tipoCorreto ||
            (
                possuiCnpjDocumento &&
                !cnpjConfere
            ) ||

            (
                pagamento.comprovantePresente &&
                pagamento.cnpjPagador &&
                !cnpjPagamentoConfere
            ) ||
            (
                pagamento.comprovantePresente &&
                pagamento.valorPago &&
                guia.totalGuia &&
                !valorPagamentoConfere
            ) ||
            (
                pagamento.comprovantePresente &&
                pagamento.dataPagamento &&
                guia.vencimento &&
                !pagamentoNoPrazo
            )
        );

    const regras = [
        criarRegra({
            codigo:
                "TIPO_DOCUMENTAL",
            titulo:
                "Tipo documental",
            status:
                tipoCorreto
                    ? "APROVADA"
                    : "REPROVADA",
            mensagem:
                tipoCorreto
                    ? "O conteúdo é compatível com uma Guia do FGTS Digital."
                    : "O conteúdo não corresponde a uma GFD.",
        }),

        criarRegra({
            codigo:
                "CAMPOS_MINIMOS_GUIA",
            titulo:
                "Dados essenciais da guia",
            status:
                guiaPossuiCamposMinimos
                    ? "APROVADA"
                    : "INCONCLUSIVA",
            mensagem:
                guiaPossuiCamposMinimos
                    ? "Competência, vencimento, valor total e identificador foram localizados."
                    : "A guia não apresentou todos os campos mínimos com segurança.",
        }),

        criarRegra({
            codigo:
                "CNPJ_EMPREGADOR",
            titulo:
                "Conferência de CNPJ",
            status:
                !possuiCnpjDocumento
                    ? "INCONCLUSIVA"
                    : cnpjConfere
                        ? "APROVADA"
                        : "REPROVADA",
            mensagem:
                !possuiCnpjDocumento
                    ? "Nenhum CNPJ confiável foi localizado na guia ou no comprovante."
                    : cnpjConfere
                        ? "O CNPJ do documento corresponde à empresa selecionada."
                        : "O CNPJ do documento pertence a outra empresa.",
        }),

        criarRegra({
            codigo:
                "COMPETENCIA_GUIA",
            titulo:
                "Competência da GFD",
            status:
                !guia.competencia
                    ? "INCONCLUSIVA"
                    : !competenciaEsperada
                        ? "ALERTA"
                        : competenciaConfere
                            ? "APROVADA"
                            : "ALERTA",
            mensagem:
                !guia.competencia
                    ? "A competência não foi identificada."
                    : !competenciaEsperada
                        ? (
                            "A competência " +
                            guia.competencia +
                            " foi localizada e será usada como referência mensal do documento."
                        )
                        : competenciaConfere
                            ? "A competência corresponde ao período esperado."
                            : (
                                "A GFD pertence à competência " +
                                guia.competencia +
                                ", diferente da competência " +
                                competenciaEsperada +
                                " aberta na tela. Ao salvar, o SafeScan vinculará o documento automaticamente à competência " +
                                guia.competencia +
                                "."
                            ),
        }),

        criarRegra({
            codigo:
                "COMPROVANTE_PAGAMENTO",
            titulo:
                "Evidência de pagamento",
            status:
                pagamento.comprovantePresente
                    ? "APROVADA"
                    : "ALERTA",
            mensagem:
                pagamento.comprovantePresente
                    ? "Uma página com evidência de pagamento foi localizada."
                    : "A guia foi localizada, mas não existe comprovante de pagamento no arquivo.",
        }),

        criarRegra({
            codigo:
                "CNPJ_PAGAMENTO",
            titulo:
                "CNPJ do comprovante",
            status:
                !pagamento.comprovantePresente
                    ? "INCONCLUSIVA"
                    : !pagamento.cnpjPagador
                        ? "INCONCLUSIVA"
                        : cnpjPagamentoConfere
                            ? "APROVADA"
                            : "REPROVADA",
            mensagem:
                !pagamento.comprovantePresente
                    ? "Regra não aplicável porque o comprovante não foi localizado."
                    : !pagamento.cnpjPagador
                        ? "O CNPJ do pagador não foi identificado."
                        : cnpjPagamentoConfere
                            ? "O CNPJ do comprovante corresponde ao CNPJ da guia."
                            : "O comprovante pertence a CNPJ diferente do documento principal.",
        }),

        criarRegra({
            codigo:
                "VALOR_PAGAMENTO",
            titulo:
                "Valor pago",
            status:
                !pagamento.comprovantePresente
                    ? "INCONCLUSIVA"
                    : !pagamento.valorPago ||
                        !guia.totalGuia
                        ? "INCONCLUSIVA"
                        : valorPagamentoConfere
                            ? "APROVADA"
                            : "REPROVADA",
            mensagem:
                !pagamento.comprovantePresente
                    ? "Regra não aplicável porque o comprovante não foi localizado."
                    : !pagamento.valorPago ||
                        !guia.totalGuia
                        ? "Não foi possível comparar o valor da guia com o valor pago."
                        : valorPagamentoConfere
                            ? "O valor pago corresponde ao valor total da guia."
                            : (
                                "O total da guia é " +
                                guia.totalGuia +
                                " e o comprovante registra " +
                                pagamento.valorPago +
                                "."
                            ),
        }),

        criarRegra({
            codigo:
                "DATA_PAGAMENTO",
            titulo:
                "Data do pagamento",
            status:
                !pagamento.comprovantePresente
                    ? "INCONCLUSIVA"
                    : !pagamento.dataPagamento ||
                        !guia.vencimento
                        ? "INCONCLUSIVA"
                        : pagamentoNoPrazo
                            ? "APROVADA"
                            : "REPROVADA",
            mensagem:
                !pagamento.comprovantePresente
                    ? "Regra não aplicável porque o comprovante não foi localizado."
                    : !pagamento.dataPagamento ||
                        !guia.vencimento
                        ? "Não foi possível comparar pagamento e vencimento."
                        : pagamentoNoPrazo
                            ? "O pagamento ocorreu até a data de vencimento."
                            : (
                                "O pagamento ocorreu em " +
                                pagamento.dataPagamento +
                                ", depois do vencimento em " +
                                guia.vencimento +
                                "."
                            ),
        }),

        criarRegra({
            codigo:
                "QUITACAO_HUMANA",
            titulo:
                "Confirmação da quitação",
            status:
                comprovanteCompleto &&
                !possuiDivergenciaCritica
                    ? "ALERTA"
                    : "INCONCLUSIVA",
            mensagem:
                comprovanteCompleto &&
                !possuiDivergenciaCritica
                    ? "As evidências são compatíveis, mas a quitação final ainda exige conferência humana."
                    : "O SafeScan não declarará o FGTS quitado sem evidências completas e confirmação humana.",
        }),
    ];

    let codigo =
        "EVIDENCIAS_COMPATIVEIS_CONFERENCIA_HUMANA";

    let nivel =
        "APROVADA";

    let rotulo =
        "Guia e comprovante compatíveis";

    let mensagem =
        "As evidências são tecnicamente compatíveis, mas a quitação final continua pendente de conferência humana.";

    if (possuiDivergenciaCritica) {
        codigo =
            "DIVERGENCIA_DOCUMENTAL_FGTS";

        nivel =
            "REPROVADA";

        rotulo =
            "Divergência nas evidências do FGTS";

        mensagem =
            "A guia ou o comprovante apresenta divergência crítica de empresa, valor ou data.";
    }
    else if (!guiaPossuiCamposMinimos) {
        codigo =
            "GUIA_GFD_INCOMPLETA";

        nivel =
            "INCONCLUSIVA";

        rotulo =
            "Dados insuficientes na GFD";

        mensagem =
            "A GFD foi identificada, mas não possui todos os campos essenciais para avaliação.";
    }
    else if (!pagamento.comprovantePresente) {
        codigo =
            "GUIA_LOCALIZADA_PAGAMENTO_PENDENTE";

        nivel =
            "ALERTA";

        rotulo =
            "Guia localizada; pagamento não comprovado";

        mensagem =
            "A existência da GFD confirma apenas a emissão da guia e não comprova sua quitação.";
    }
    else if (!comprovanteCompleto) {
        codigo =
            "COMPROVANTE_PAGAMENTO_INCOMPLETO";

        nivel =
            "INCONCLUSIVA";

        rotulo =
            "Comprovante exige conferência";

        mensagem =
            "A evidência de pagamento está presente, mas faltam CNPJ, valor ou data confiáveis.";
    }

    return {
        aplicavel: true,
        documentoIncompativel: false,
        bloqueiaSubstituicao: false,
        codigo,
        nivel,
        rotulo,
        mensagem,
        requerConferenciaHumana: true,
        requerConsultaOficial: false,

        documentoEsperado:
            documentoEsperado?.titulo ||
            "FGTS",

        documentoIdentificado:
            classificacao?.titulo ||
            "Guia do FGTS Digital (GFD)",

        empresaEsperada:
            empresaEsperada?.nome ||
            "",

        cnpjEsperado:
            formatarCnpj(
                cnpjEsperado
            ),

        razaoSocialDocumento:
            guia.razaoSocial,

        cnpjDocumento:
            formatarCnpj(
                cnpjDocumento
            ),

        natureza: {
            codigo:
                "GUIA_FGTS_DIGITAL",
            rotulo:
                "Guia mensal do FGTS Digital",
        },

        codigoControle:
            guia.identificador,

        numeroCertidao:
            guia.identificador,

        dadosTemporais: {
            dataEmissao:
                guia.dataGeracao,
            dataEmissaoIso:
                converterDataBrParaIso(
                    guia.dataGeracao
                ),
            horaEmissao:
                guia.horaGeracao,
            dataValidade:
                guia.vencimento,
            dataValidadeIso:
                vencimentoIso,
            situacaoEmissao:
                situacaoGeracao,
            situacaoValidade:
                situacaoVencimento,
        },

        dadosFgts: {
            competencia:
                guia.competencia,

            competenciaEsperada,

            dataGeracao:
                guia.dataGeracao,

            horaGeracao:
                guia.horaGeracao,

            vencimento:
                guia.vencimento,

            quantidadeTrabalhadores:
                guia.quantidadeTrabalhadores,

            fgtsMensal:
                guia.fgtsMensal,

            consignado:
                guia.consignado,

            totalGuia:
                guia.totalGuia,

            identificador:
                guia.identificador,

            pagamento: {
                comprovantePresente:
                    pagamento.comprovantePresente,

                cnpjPagador:
                    formatarCnpj(
                        pagamento.cnpjPagador
                    ),

                valorPago:
                    pagamento.valorPago,

                dataPagamento:
                    pagamento.dataPagamento,

                horaPagamento:
                    pagamento.horaPagamento,

                meioPagamento:
                    pagamento.meioPagamento,

                cnpjConfere:
                    cnpjPagamentoConfere,

                valorConfere:
                    valorPagamentoConfere,

                pagamentoNoPrazo,
            },
        },

        camposAdicionais: [
            {
                codigo:
                    "COMPETENCIA",
                rotulo:
                    "Competência",
                valor:
                    guia.competencia,
            },
            {
                codigo:
                    "TRABALHADORES",
                rotulo:
                    "Trabalhadores",
                valor:
                    guia.quantidadeTrabalhadores
                        ? String(
                            guia.quantidadeTrabalhadores
                        )
                        : "",
            },
            {
                codigo:
                    "FGTS_MENSAL",
                rotulo:
                    "FGTS mensal",
                valor:
                    guia.fgtsMensal,
            },
            {
                codigo:
                    "CONSIGNADO",
                rotulo:
                    "Consignado",
                valor:
                    guia.consignado,
            },
            {
                codigo:
                    "TOTAL_GUIA",
                rotulo:
                    "Total da guia",
                valor:
                    guia.totalGuia,
            },
            {
                codigo:
                    "VALOR_PAGO",
                rotulo:
                    "Valor pago",
                valor:
                    pagamento.valorPago,
            },
            {
                codigo:
                    "DATA_PAGAMENTO",
                rotulo:
                    "Data do pagamento",
                valor:
                    pagamento.dataPagamento,
            },
            {
                codigo:
                    "MEIO_PAGAMENTO",
                rotulo:
                    "Meio de pagamento",
                valor:
                    pagamento.meioPagamento,
            },
        ].filter(
            (campo) =>
                Boolean(
                    campo.valor
                )
        ),

        obrigacaoComposta: {
            obrigacaoId:
                "fgts",

            documentoTipoId:
                "fgts-digital-gfd",

            guiaEmitida:
                true,

            comprovantePagamentoPresente:
                pagamento.comprovantePresente,

            relatorioDetalhadoPresente:
                /RELAT[ÓO]RIO\s+DETALHADO|RELA[CÇ][AÃ]O\s+DE\s+TRABALHADORES/i
                    .test(
                        String(
                            textoExtraido ||
                            ""
                        )
                    ),

            evidenciasTecnicamenteCompativeis:
                Boolean(
                    comprovanteCompleto &&
                    !possuiDivergenciaCritica
                ),

            quitacaoConfirmada:
                false,

            motivoQuitacaoNaoConfirmada:
                "A confirmação final exige conferência humana e, quando aplicável, consulta em ambiente autenticado.",
        },

        regras,
    };
}