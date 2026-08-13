import assert from "node:assert/strict";

import {
    CERTIDAO_MENSAL_VIGENCIA_CONTRATUAL_STATUS,
    classificarCompetenciaVigenciaContratual,
    competenciaCertidaoMensalEhExigivel,
    normalizarVigenciaContratualEmpresa,
} from "../src/features/certidao-mensal-documental/domain/certidaoMensalVigenciaContratual.js";

const STATUS =
    CERTIDAO_MENSAL_VIGENCIA_CONTRATUAL_STATUS;

function classificar(
    empresa,
    competencia,
) {
    return classificarCompetenciaVigenciaContratual({
        empresa,
        competencia,
    });
}

{
    const resultado =
        classificar(
            {},
            "08/2026",
        );

    assert.equal(
        resultado.status,
        STATUS.SEM_INICIO_CONTRATO,
    );

    assert.equal(
        resultado.exigivel,
        false,
    );

    assert.equal(
        resultado.bloqueado,
        true,
    );
}

{
    const empresa = {
        data_inicio_contrato:
            "2026-03-15",
    };

    assert.equal(
        classificar(
            empresa,
            "2026-02",
        ).status,
        STATUS.ANTES_DO_CONTRATO,
    );

    assert.equal(
        classificar(
            empresa,
            "03/2026",
        ).status,
        STATUS.DURANTE_DO_CONTRATO,
    );

    assert.equal(
        competenciaCertidaoMensalEhExigivel({
            empresa,
            competencia:
                "2026-12-01",
        }),
        true,
    );
}

{
    const empresa = {
        dataInicioContrato:
            "2026-03-15",
        dataFimContrato:
            "2026-07-20",
    };

    assert.equal(
        classificar(
            empresa,
            "2026-03-01",
        ).exigivel,
        true,
    );

    assert.equal(
        classificar(
            empresa,
            "07/2026",
        ).exigivel,
        true,
    );

    assert.equal(
        classificar(
            empresa,
            "08/2026",
        ).status,
        STATUS.APOS_DO_CONTRATO,
    );
}

{
    const vigencia =
        normalizarVigenciaContratualEmpresa({
            data_inicio_contrato:
                "2026-08-10",
            data_fim_contrato:
                "2026-07-31",
        });

    assert.equal(
        vigencia.valida,
        false,
    );

    const resultado =
        classificar(
            {
                data_inicio_contrato:
                    "2026-08-10",
                data_fim_contrato:
                    "2026-07-31",
            },
            "08/2026",
        );

    assert.equal(
        resultado.status,
        STATUS.VIGENCIA_INVALIDA,
    );

    assert.equal(
        resultado.bloqueado,
        true,
    );
}

{
    const resultado =
        classificar(
            {
                data_inicio_contrato:
                    "2026-02-31",
            },
            "02/2026",
        );

    assert.equal(
        resultado.status,
        STATUS.VIGENCIA_INVALIDA,
    );
}

console.log(
    "SafeScan: regra central de vigência contratual aprovada.",
);
