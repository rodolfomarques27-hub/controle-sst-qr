export const CERTIDAO_MENSAL_CONFERENCIA_CONTRATO_VERSAO =
    "1.0";

export const CERTIDAO_MENSAL_DECISAO_DOCUMENTO =
    Object.freeze({
        CONFORME:
            "CONFORME",

        NAO_CONFORME:
            "NAO_CONFORME",

        REENVIO_SOLICITADO:
            "REENVIO_SOLICITADO",
    });

export const CERTIDAO_MENSAL_EVENTO_DECISAO_DOCUMENTO =
    Object.freeze({
        DOCUMENTO_CONFIRMADO_CONFORME:
            "DOCUMENTO_CONFIRMADO_CONFORME",

        DOCUMENTO_MARCADO_NAO_CONFORME:
            "DOCUMENTO_MARCADO_NAO_CONFORME",

        DOCUMENTO_REENVIO_SOLICITADO:
            "DOCUMENTO_REENVIO_SOLICITADO",
    });

const PADRAO_UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const LIMITE_MOTIVO =
    500;

const LIMITE_OBSERVACAO =
    2000;

const DECISOES_PERMITIDAS =
    new Set(
        Object.values(
            CERTIDAO_MENSAL_DECISAO_DOCUMENTO
        )
    );

const EVENTO_POR_DECISAO =
    Object.freeze({
        [
            CERTIDAO_MENSAL_DECISAO_DOCUMENTO
                .CONFORME
        ]:
            CERTIDAO_MENSAL_EVENTO_DECISAO_DOCUMENTO
                .DOCUMENTO_CONFIRMADO_CONFORME,

        [
            CERTIDAO_MENSAL_DECISAO_DOCUMENTO
                .NAO_CONFORME
        ]:
            CERTIDAO_MENSAL_EVENTO_DECISAO_DOCUMENTO
                .DOCUMENTO_MARCADO_NAO_CONFORME,

        [
            CERTIDAO_MENSAL_DECISAO_DOCUMENTO
                .REENVIO_SOLICITADO
        ]:
            CERTIDAO_MENSAL_EVENTO_DECISAO_DOCUMENTO
                .DOCUMENTO_REENVIO_SOLICITADO,
    });

function textoSeguro(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

function validarUuid(
    valor,
    campo
) {
    const texto =
        textoSeguro(
            valor
        );

    if (!PADRAO_UUID.test(texto)) {
        throw new Error(
            `${campo} deve possuir um UUID válido.`
        );
    }

    return texto;
}

function normalizarDecisao(
    valor
) {
    const decisao =
        textoSeguro(
            valor
        ).toUpperCase();

    if (
        !DECISOES_PERMITIDAS.has(
            decisao
        )
    ) {
        throw new Error(
            "A decisão documental informada é inválida."
        );
    }

    return decisao;
}

function validarTextoOpcional({
    valor,
    campo,
    limite,
} = {}) {
    const texto =
        textoSeguro(
            valor
        );

    if (texto.length > limite) {
        throw new Error(
            `${campo} excede o limite de ${limite} caracteres.`
        );
    }

    return texto;
}

function normalizarDataIso(
    valor
) {
    const texto =
        textoSeguro(
            valor
        );

    const data =
        new Date(
            texto
        );

    if (
        !texto ||
        Number.isNaN(
            data.getTime()
        )
    ) {
        throw new Error(
            "A data da decisão é inválida."
        );
    }

    return data.toISOString();
}

export function decisaoDocumentoCertidaoMensalExigeMotivo(
    decisao
) {
    const decisaoNormalizada =
        normalizarDecisao(
            decisao
        );

    return (
        decisaoNormalizada ===
            CERTIDAO_MENSAL_DECISAO_DOCUMENTO
                .NAO_CONFORME ||
        decisaoNormalizada ===
            CERTIDAO_MENSAL_DECISAO_DOCUMENTO
                .REENVIO_SOLICITADO
    );
}

export function obterEventoDecisaoDocumentoCertidaoMensal(
    decisao
) {
    const decisaoNormalizada =
        normalizarDecisao(
            decisao
        );

    return EVENTO_POR_DECISAO[
        decisaoNormalizada
    ];
}

export function criarPayloadDecisaoDocumentoCertidaoMensal({
    itemId,
    versaoAtualId,
    decisao,
    motivo = "",
    observacao = "",
    decididoEm =
        new Date().toISOString(),
} = {}) {
    const itemIdNormalizado =
        validarUuid(
            itemId,
            "itemId"
        );

    const versaoAtualIdNormalizado =
        validarUuid(
            versaoAtualId,
            "versaoAtualId"
        );

    const decisaoNormalizada =
        normalizarDecisao(
            decisao
        );

    const motivoNormalizado =
        validarTextoOpcional({
            valor:
                motivo,

            campo:
                "motivo",

            limite:
                LIMITE_MOTIVO,
        });

    const observacaoNormalizada =
        validarTextoOpcional({
            valor:
                observacao,

            campo:
                "observacao",

            limite:
                LIMITE_OBSERVACAO,
        });

    if (
        decisaoDocumentoCertidaoMensalExigeMotivo(
            decisaoNormalizada
        ) &&
        !motivoNormalizado
    ) {
        throw new Error(
            "O motivo é obrigatório para não conformidade ou solicitação de reenvio."
        );
    }

    return {
        contratoVersao:
            CERTIDAO_MENSAL_CONFERENCIA_CONTRATO_VERSAO,

        itemId:
            itemIdNormalizado,

        versaoAtualId:
            versaoAtualIdNormalizado,

        decisao:
            decisaoNormalizada,

        statusDestino:
            decisaoNormalizada,

        tipoEvento:
            obterEventoDecisaoDocumentoCertidaoMensal(
                decisaoNormalizada
            ),

        motivo:
            motivoNormalizado || null,

        observacao:
            observacaoNormalizada || null,

        decididoEm:
            normalizarDataIso(
                decididoEm
            ),
    };
}
