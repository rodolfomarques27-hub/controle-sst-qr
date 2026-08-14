const TIPOS_FISCALIZAVEIS =
    new Set([
        "terceirizada",
        "subcontratada",
    ]);

function textoSeguro(valor) {
    return String(
        valor ?? "",
    ).trim();
}

function normalizarDataIso(valor) {
    const texto =
        textoSeguro(valor);

    if (!texto) {
        return null;
    }

    const correspondencia =
        /^(\d{4})-(\d{2})-(\d{2})/.exec(
            texto,
        );

    if (!correspondencia) {
        return null;
    }

    const ano =
        Number(correspondencia[1]);

    const mes =
        Number(correspondencia[2]);

    const dia =
        Number(correspondencia[3]);

    const data =
        new Date(
            Date.UTC(
                ano,
                mes - 1,
                dia,
            ),
        );

    if (
        data.getUTCFullYear() !== ano ||
        data.getUTCMonth() !==
            mes - 1 ||
        data.getUTCDate() !== dia
    ) {
        return null;
    }

    return {
        iso:
            `${correspondencia[1]}-${correspondencia[2]}-${correspondencia[3]}`,

        mes:
            `${correspondencia[1]}-${correspondencia[2]}`,
    };
}

function resultado(
    classificacao,
    permitida,
    mensagem,
) {
    return {
        classificacao,
        permitida,
        mensagem,
    };
}

export function classificarVigenciaContratual({
    tipoEmpresa,
    dataInicioContrato,
    dataFimContrato,
    competencia,
}) {
    const tipo =
        textoSeguro(
            tipoEmpresa,
        ).toLowerCase();

    if (!TIPOS_FISCALIZAVEIS.has(tipo)) {
        return resultado(
            "EMPRESA_NAO_FISCALIZAVEL",
            false,
            "O módulo Certidões Mensais é exclusivo para empresas terceirizadas ou subcontratadas.",
        );
    }

    const inicio =
        normalizarDataIso(
            dataInicioContrato,
        );

    if (!inicio) {
        return resultado(
            "SEM_INICIO_CONTRATO",
            false,
            "Início do contrato não informado.",
        );
    }

    const fimInformado =
        textoSeguro(
            dataFimContrato,
        );

    const fim =
        fimInformado
            ? normalizarDataIso(
                fimInformado,
            )
            : null;

    if (
        fimInformado &&
        !fim
    ) {
        return resultado(
            "VIGENCIA_INVALIDA",
            false,
            "A vigência contratual informada é inválida.",
        );
    }

    if (
        fim &&
        fim.iso < inicio.iso
    ) {
        return resultado(
            "VIGENCIA_INVALIDA",
            false,
            "A vigência contratual informada é inválida.",
        );
    }

    const competenciaNormalizada =
        normalizarDataIso(
            competencia,
        );

    if (!competenciaNormalizada) {
        return resultado(
            "VIGENCIA_INVALIDA",
            false,
            "A competência informada é inválida.",
        );
    }

    if (
        competenciaNormalizada.mes <
        inicio.mes
    ) {
        return resultado(
            "ANTES_DO_CONTRATO",
            false,
            "A competência é anterior ao início do contrato.",
        );
    }

    if (
        fim &&
        competenciaNormalizada.mes >
            fim.mes
    ) {
        return resultado(
            "APOS_DO_CONTRATO",
            false,
            "A competência é posterior ao fim do contrato.",
        );
    }

    return resultado(
        "DURANTE_DO_CONTRATO",
        true,
        "",
    );
}
