import assert from "node:assert/strict";

import {
    registrarImpressaoQrColaboradores,
} from "../src/services/colaboradoresQrImpressoesService.js";

const chamadas = [];

const supabaseClient = {
    rpc: async (
        nome,
        parametros
    ) => {
        chamadas.push({
            nome,
            parametros,
        });

        return {
            data:
                parametros.p_origem === "LOTE"
                    ? [
                        {
                            colaborador_id: parametros.p_colaborador_ids[0],
                            origem: "LOTE",
                            lote_id: "11111111-1111-1111-1111-111111111111",
                        },
                        {
                            colaborador_id: parametros.p_colaborador_ids[1],
                            origem: "LOTE",
                            lote_id: "11111111-1111-1111-1111-111111111111",
                        },
                    ]
                    : [
                        {
                            colaborador_id: parametros.p_colaborador_ids[0],
                            origem: "INDIVIDUAL",
                            lote_id: null,
                        },
                    ],
            error: null,
        };
    },
};

const individual =
    await registrarImpressaoQrColaboradores({
        supabaseClient,
        colaboradorIds: [
            "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        ],
        origem: "individual",
    });

assert.equal(
    chamadas[0].nome,
    "registrar_impressao_qr_colaboradores"
);

assert.deepEqual(
    chamadas[0].parametros,
    {
        p_colaborador_ids: [
            "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        ],
        p_origem: "INDIVIDUAL",
        p_lote_id: null,
    }
);

assert.equal(
    individual.length,
    1
);

const lote =
    await registrarImpressaoQrColaboradores({
        supabaseClient,
        colaboradorIds: [
            "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            "cccccccc-cccc-cccc-cccc-cccccccccccc",
            "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        ],
        origem: " lote ",
    });

assert.equal(
    chamadas[1].parametros.p_origem,
    "LOTE"
);

assert.equal(
    chamadas[1].parametros.p_colaborador_ids.length,
    2
);

assert.equal(
    chamadas[1].parametros.p_lote_id,
    null
);

assert.equal(
    lote.length,
    2
);

await assert.rejects(
    () =>
        registrarImpressaoQrColaboradores({
            supabaseClient,
            colaboradorIds: [],
            origem: "INDIVIDUAL",
        }),
    /Nenhum colaborador/
);

await assert.rejects(
    () =>
        registrarImpressaoQrColaboradores({
            supabaseClient,
            colaboradorIds: [
                "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            ],
            origem: "INDIVIDUAL",
        }),
    /exatamente um colaborador/
);

await assert.rejects(
    () =>
        registrarImpressaoQrColaboradores({
            supabaseClient,
            colaboradorIds: [
                "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            ],
            origem: "OUTRA",
        }),
    /Origem de impressão inválida/
);

console.log(
    "colaboradoresQrImpressoesServiceSmokeTest: OK"
);