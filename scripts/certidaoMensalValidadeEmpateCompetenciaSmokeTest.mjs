import assert from "node:assert/strict";

import {
    resolverDocumentoNaCompetencia,
} from "../src/features/certidao-mensal-documental/domain/certidaoMensalRegraCompetencia.js";

const janeiroV10 = {
    id: "jan-v10",
    tipoDocumento: "iss",
    competencia: "2026-01-01",
    status: "CONFORME",
    numero_versao: 10,
    criado_em: "2026-08-12T22:10:59.313Z",
    dataEmissaoIso: "2026-01-19",
    dataValidadeIso: "2026-07-18",
};

const agostoV1MesmaEmissao = {
    id: "ago-v1",
    tipoDocumento: "iss",
    competencia: "2026-08-01",
    status: "EM_ANALISE",
    numero_versao: 1,
    criado_em: "2026-08-11T19:50:45.442Z",
    dataEmissaoIso: "2026-01-19",
    dataValidadeIso: "2026-07-18",
};

const julhoV6MaisNova = {
    id: "jul-v6",
    tipoDocumento: "iss",
    competencia: "2026-07-01",
    status: "CONFORME",
    numero_versao: 6,
    criado_em: "2026-08-11T23:17:08.130Z",
    dataEmissaoIso: "2026-07-21",
    dataValidadeIso: "2027-01-17",
};

const resolucaoJaneiro =
    resolverDocumentoNaCompetencia({
        tipoDocumento: "iss",
        competencia: "2026-01-01",
        versoes: [
            janeiroV10,
            agostoV1MesmaEmissao,
            julhoV6MaisNova,
        ],
        itemPersistido: {
            status: "CONFORME",
        },
        competenciaFechada: false,
    });

assert.equal(
    resolucaoJaneiro?.versao?.id,
    "jan-v10",
    "Janeiro deve escolher sua própria versão quando houver empate de emissão.",
);

assert.equal(
    resolucaoJaneiro?.versao?.numero_versao,
    10,
    "Janeiro deve exibir V10 e não AGO V1.",
);

assert.equal(
    resolucaoJaneiro?.status,
    "CONFORME",
    "Janeiro deve permanecer CONFORME.",
);

const resolucaoJulho =
    resolverDocumentoNaCompetencia({
        tipoDocumento: "iss",
        competencia: "2026-07-01",
        versoes: [
            janeiroV10,
            julhoV6MaisNova,
        ],
        itemPersistido: {
            status: "CONFORME",
        },
        competenciaFechada: false,
    });

assert.equal(
    resolucaoJulho?.versao?.id,
    "jul-v6",
    "Documento com emissão realmente mais recente deve continuar prevalecendo.",
);

assert.equal(
    resolucaoJulho?.status,
    "CONFORME",
    "Julho deve permanecer CONFORME.",
);

console.log("");
console.log("CERTIDÃO MENSAL — D13.1 DESEMPATE DE VALIDADE APROVADO");
console.log("JAN V10 vence AGO V1 quando ambas possuem emissão em 19/01/2026.");
console.log("Emissão realmente mais recente continua prevalecendo.");
console.log("Nenhum banco, e-mail ou deploy foi utilizado.");