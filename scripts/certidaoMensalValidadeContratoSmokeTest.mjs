import assert from "node:assert/strict";

import {
    resolverDestinoValidadeComVigenciaContratual,
} from "../src/features/certidao-mensal-documental/analysis/certidaoDocumentBatchResolver.js";

import {
    resolverDocumentoNaCompetencia,
} from "../src/features/certidao-mensal-documental/domain/certidaoMensalRegraCompetencia.js";

const empresa = {
    id:
        "11111111-1111-4111-8111-111111111111",

    nome:
        "EMPRESA TESTE",

    tipo_empresa:
        "Terceirizada",

    data_inicio_contrato:
        "2026-09-10",

    data_fim_contrato:
        null,
};

function criarOrigem({
    competencia =
        "2026-08-01",

    data =
        "2026-08-15",
} = {}) {
    return {
        competenciaIso:
            competencia,

        dataFonteIso:
            data,

        fonte:
            "DATA_EMISSAO",
    };
}

function criarCobertura({
    inicio =
        "",

    fim =
        "2026-10-15",
} = {}) {
    return {
        inicioIso:
            inicio,

        fimIso:
            fim,
    };
}

/*
 * 1 — CND anterior ainda válida no início do contrato.
 */
const anteriorValida =
    resolverDestinoValidadeComVigenciaContratual({
        origem:
            criarOrigem(),

        cobertura:
            criarCobertura(),

        empresa,
    });

assert.equal(
    anteriorValida.competenciaIso,
    "2026-09-01"
);

assert.equal(
    anteriorValida.fonte,
    "INICIO_CONTRATO_DOCUMENTO_ANTERIOR_VALIDO"
);

assert.equal(
    anteriorValida.dataFonteIso,
    "2026-08-15"
);

assert.equal(
    anteriorValida.redirecionadoPorVigenciaContratual,
    true
);

assert.equal(
    anteriorValida.bloqueiaPorVigenciaContratual,
    false
);


/*
 * 2 — Vencida antes do início contratual.
 */
const vencidaAntes =
    resolverDestinoValidadeComVigenciaContratual({
        origem:
            criarOrigem(),

        cobertura:
            criarCobertura({
                fim:
                    "2026-08-31",
            }),

        empresa,
    });

assert.equal(
    vencidaAntes.competenciaIso,
    ""
);

assert.equal(
    vencidaAntes.bloqueiaPorVigenciaContratual,
    true
);

assert.equal(
    vencidaAntes.codigoVigenciaContratual,
    "VALIDADE_NAO_ALCANCA_INICIO_CONTRATO"
);


/*
 * 3 — Mesmo mês, validade termina antes do dia real
 *     de início do contrato.
 */
const mesmoMesVencida =
    resolverDestinoValidadeComVigenciaContratual({
        origem:
            criarOrigem({
                competencia:
                    "2026-09-01",

                data:
                    "2026-09-01",
            }),

        cobertura:
            criarCobertura({
                fim:
                    "2026-09-05",
            }),

        empresa,
    });

assert.equal(
    mesmoMesVencida.competenciaIso,
    ""
);

assert.equal(
    mesmoMesVencida.bloqueiaPorVigenciaContratual,
    true
);


/*
 * 4 — Mesmo mês e válida no dia real do contrato.
 */
const mesmoMesValida =
    resolverDestinoValidadeComVigenciaContratual({
        origem:
            criarOrigem({
                competencia:
                    "2026-09-01",

                data:
                    "2026-09-01",
            }),

        cobertura:
            criarCobertura(),

        empresa,
    });

assert.equal(
    mesmoMesValida.competenciaIso,
    "2026-09-01"
);

assert.equal(
    mesmoMesValida.redirecionadoPorVigenciaContratual,
    true
);


/*
 * 5 — Sem validade final comprovada => fail-closed.
 */
const semValidade =
    resolverDestinoValidadeComVigenciaContratual({
        origem:
            criarOrigem(),

        cobertura:
            criarCobertura({
                fim:
                    "",
            }),

        empresa,
    });

assert.equal(
    semValidade.competenciaIso,
    ""
);

assert.equal(
    semValidade.bloqueiaPorVigenciaContratual,
    true
);


/*
 * 6 — Documento emitido depois do início do contrato
 *     mantém a própria origem.
 */
const posterior =
    resolverDestinoValidadeComVigenciaContratual({
        origem:
            criarOrigem({
                competencia:
                    "2026-09-01",

                data:
                    "2026-09-15",
            }),

        cobertura:
            criarCobertura(),

        empresa,
    });

assert.equal(
    posterior.competenciaIso,
    "2026-09-01"
);

assert.equal(
    posterior.fonte,
    "DATA_EMISSAO"
);

assert.equal(
    posterior.redirecionadoPorVigenciaContratual,
    false
);


/*
 * 7 — Documento mensal continua sem herdar
 *     a regra das certidões.
 */
const dctfAgosto = {
    tipoDocumento:
        "inss-dctfweb",

    competencia:
        "2026-08-01",

    status:
        "CONFORME",

    versaoId:
        "dctf-agosto",

    numeroVersao:
        1,

    criadoEm:
        "2026-09-01T12:00:00.000Z",
};

const dctfSetembro =
    resolverDocumentoNaCompetencia({
        tipoDocumento:
            "inss-dctfweb",

        competencia:
            "2026-09-01",

        versoes: [
            dctfAgosto,
        ],
    });

assert.notEqual(
    dctfSetembro.status,
    "CONFORME"
);

assert.equal(
    dctfSetembro.herdado,
    false
);

console.log(
    "CERT_VALIDADE_CONTRATO_SMOKE=PASS"
);

console.log(
    "CND_ANTERIOR_VALIDA_REDIRECIONADA=PASS"
);

console.log(
    "DATA_EMISSAO_ORIGINAL_PRESERVADA=PASS"
);

console.log(
    "VALIDADE_DIA_REAL_CONTRATO=PASS"
);

console.log(
    "MESMO_MES_VENCIDA_FAIL_CLOSED=PASS"
);

console.log(
    "SEM_VALIDADE_FAIL_CLOSED=PASS"
);

console.log(
    "DOCUMENTO_MENSAL_INTACTO=PASS"
);

console.log(
    "CASOS_VALIDADOS=7"
);
