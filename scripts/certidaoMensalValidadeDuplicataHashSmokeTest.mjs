import assert from "node:assert/strict";

import {
    resolverDocumentoNaCompetencia,
} from "../src/features/certidao-mensal-documental/domain/certidaoMensalRegraCompetencia.js";

const HASH_CERTIDAO_JANEIRO =
    "eba2899190bdd27e9d4b6dcbcb97a2f694c1dda85e18af4f8c693a24c961dfa0";

const HASH_CERTIDAO_JULHO =
    "c832cc13a3fdc7e90139895e7e03f3bf5dc11181a25108041c59a10c33bc24c4";

const janeiroV10 = {
    id: "jan-v10",
    tipoDocumento: "iss",
    competencia: "2026-01-01",
    status: "CONFORME",
    numero_versao: 10,
    criado_em: "2026-08-12T22:10:59.313Z",
    hash_sha256: HASH_CERTIDAO_JANEIRO,
    dataEmissaoIso: "2026-01-19",
    dataValidadeIso: "2026-07-18",
};

const agostoV1DuplicataExata = {
    id: "ago-v1",
    tipoDocumento: "iss",
    competencia: "2026-08-01",
    status: "EM_ANALISE",
    numero_versao: 1,
    criado_em: "2026-08-11T19:50:45.442Z",
    hash_sha256: HASH_CERTIDAO_JANEIRO,
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
    hash_sha256: HASH_CERTIDAO_JULHO,
    dataEmissaoIso: "2026-07-21",
    dataValidadeIso: "2027-01-17",
};

function resolver(competencia) {
    return resolverDocumentoNaCompetencia({
        tipoDocumento: "iss",
        competencia,
        versoes: [
            janeiroV10,
            agostoV1DuplicataExata,
            julhoV6MaisNova,
        ],
        itemPersistido: {
            status: "PENDENTE",
        },
        competenciaFechada: false,
    });
}

const janeiro =
    resolver("2026-01-01");

assert.equal(
    janeiro?.versao?.id,
    "jan-v10",
    "Janeiro deve continuar usando sua V10.",
);

assert.equal(
    janeiro?.status,
    "CONFORME",
    "Janeiro deve permanecer CONFORME.",
);

const fevereiro =
    resolver("2026-02-01");

assert.equal(
    fevereiro?.versao?.id,
    "jan-v10",
    "Fevereiro deve herdar JAN V10 e nunca AGO V1 da mesma cópia.",
);

assert.equal(
    fevereiro?.status,
    "CONFORME",
    "Fevereiro deve ficar CONFORME pela validade da JAN V10.",
);

assert.equal(
    fevereiro?.herdado,
    true,
    "Fevereiro deve identificar a evidência como herdada.",
);

const abril =
    resolver("2026-04-01");

assert.equal(
    abril?.versao?.id,
    "jan-v10",
    "Abril deve herdar JAN V10 e nunca AGO V1 da mesma cópia.",
);

assert.equal(
    abril?.status,
    "CONFORME",
    "Abril deve ficar CONFORME pela validade da JAN V10.",
);

assert.equal(
    abril?.herdado,
    true,
    "Abril deve identificar a evidência como herdada.",
);

const julho =
    resolver("2026-07-01");

assert.equal(
    julho?.versao?.id,
    "jul-v6",
    "A certidão realmente nova de julho deve continuar prevalecendo.",
);

assert.equal(
    julho?.status,
    "CONFORME",
    "Julho deve permanecer CONFORME.",
);

console.log("");
console.log("CERTIDÃO MENSAL — D14 DUPLICATA SHA256 APROVADA");
console.log("JAN V10 e AGO V1 possuem o mesmo hash.");
console.log("FEV e ABR agora herdam JAN V10.");
console.log("Certidão realmente nova de JUL continua prevalecendo.");
console.log("Nenhum banco, e-mail ou deploy foi utilizado.");