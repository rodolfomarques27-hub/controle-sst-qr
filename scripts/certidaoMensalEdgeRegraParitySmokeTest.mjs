import assert from "node:assert/strict";
import {
    readFile,
} from "node:fs/promises";

import * as RegraApp from "../src/features/certidao-mensal-documental/domain/certidaoMensalRegraCompetencia.js";
import * as RegraEdge from "../supabase/functions/_shared/certidaoMensalRegraCompetencia.js";

const appBytes =
    await readFile(
        new URL(
            "../src/features/certidao-mensal-documental/domain/certidaoMensalRegraCompetencia.js",
            import.meta.url,
        ),
    );

const edgeBytes =
    await readFile(
        new URL(
            "../supabase/functions/_shared/certidaoMensalRegraCompetencia.js",
            import.meta.url,
        ),
    );

assert.equal(
    Buffer.compare(
        appBytes,
        edgeBytes,
    ),
    0,
    "O resolvedor da Edge precisa ser byte a byte idêntico ao D5.3 homologado.",
);

assert.equal(
    RegraEdge
        .CERTIDAO_MENSAL_DOCUMENTOS_EXTERNOS
        .length,
    15,
    "O catálogo compartilhado precisa manter quinze documentos externos.",
);

const tituloFolha =
    RegraEdge
        .CERTIDAO_MENSAL_DOCUMENTOS_EXTERNOS
        .find(
            (documento) =>
                documento.tipoDocumento ===
                "folha-pagamento",
        )
        ?.titulo;

const tituloPonto =
    RegraEdge
        .CERTIDAO_MENSAL_DOCUMENTOS_EXTERNOS
        .find(
            (documento) =>
                documento.tipoDocumento ===
                "folha-ponto",
        )
        ?.titulo;

const tituloIss =
    RegraEdge
        .CERTIDAO_MENSAL_DOCUMENTOS_EXTERNOS
        .find(
            (documento) =>
                documento.tipoDocumento ===
                "iss",
        )
        ?.titulo;

assert.equal(
    tituloFolha,
    "Folha de Pagamento e Comprovantes",
);

assert.equal(
    tituloPonto,
    "Espelho de Ponto",
);

assert.equal(
    tituloIss,
    "ISSQN",
);

const versaoCnd =
    {
        id:
            "11111111-1111-4111-8111-111111111111",

        tipoDocumento:
            "cnd-federal",

        competenciaDocumento:
            "2026-08-01",

        status:
            "CONFORME",

        numeroVersao:
            1,

        criadoEm:
            "2026-08-01T10:00:00.000Z",

        dataEmissaoIso:
            "2025-09-23",

        dataValidadeIso:
            "2026-03-22",

        diagnostico: {
            avaliacao: {
                dadosTemporais: {
                    dataEmissaoIso:
                        "2025-09-23",

                    dataValidadeIso:
                        "2026-03-22",
                },
            },
        },
    };

function resolver(
    modulo,
    competencia,
    versoes,
) {
    return modulo
        .resolverDocumentoNaCompetencia({
            tipoDocumento:
                "cnd-federal",

            competencia,

            versoes,

            itemPersistido: {
                tipo_documento:
                    "cnd-federal",

                status:
                    "PENDENTE",
            },

            competenciaFechada:
                false,
        });
}

for (
    const competencia of
    [
        "2026-02-01",
        "2026-03-01",
        "2026-04-01",
    ]
) {
    const app =
        resolver(
            RegraApp,
            competencia,
            [
                versaoCnd,
            ],
        );

    const edge =
        resolver(
            RegraEdge,
            competencia,
            [
                versaoCnd,
            ],
        );

    assert.deepEqual(
        edge,
        app,
        `Paridade divergente em ${competencia}.`,
    );
}

const fevereiro =
    resolver(
        RegraEdge,
        "2026-02-01",
        [
            versaoCnd,
        ],
    );

const marco =
    resolver(
        RegraEdge,
        "2026-03-01",
        [
            versaoCnd,
        ],
    );

const abril =
    resolver(
        RegraEdge,
        "2026-04-01",
        [
            versaoCnd,
        ],
    );

assert.equal(
    fevereiro.status,
    "CONFORME",
);

assert.equal(
    marco.status,
    "CONFORME",
);

assert.equal(
    abril.status,
    "VENCIDO",
);

const posteriorSemEmissao =
    resolver(
        RegraEdge,
        "2026-02-01",
        [
            {
                ...versaoCnd,

                id:
                    "22222222-2222-4222-8222-222222222222",

                dataEmissaoIso:
                    "",

                dataValidadeIso:
                    "2026-12-31",

                diagnostico: {
                    avaliacao: {
                        dadosTemporais: {
                            dataValidadeIso:
                                "2026-12-31",
                        },
                    },
                },
            },
        ],
    );

assert.equal(
    posteriorSemEmissao.status,
    "PENDENTE",
    "Competência futura sem emissão comprovada não pode retroagir.",
);

const mensalDivergente =
    RegraEdge
        .resolverDocumentoNaCompetencia({
            tipoDocumento:
                "folha-pagamento",

            competencia:
                "2026-08-01",

            versoes: [
                {
                    id:
                        "33333333-3333-4333-8333-333333333333",

                    tipoDocumento:
                        "folha-pagamento",

                    competenciaDocumento:
                        "2026-07-01",

                    status:
                        "CONFORME",

                    numeroVersao:
                        1,

                    criadoEm:
                        "2026-07-31T10:00:00.000Z",
                },
            ],

            itemPersistido: {
                tipo_documento:
                    "folha-pagamento",

                status:
                    "PENDENTE",
            },

            competenciaFechada:
                false,
        });

assert.notEqual(
    mensalDivergente.status,
    "CONFORME",
    "Documento mensal de outra competência não pode ser herdado.",
);

console.log(
    "CERTIDÃO MENSAL — PARIDADE D5.3 / EDGE APROVADA",
);

console.log(
    "Cenários: catálogo 15, títulos canônicos, validade parcial do mês, vencimento posterior, bloqueio retroativo sem emissão e competência mensal.",
);