import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    montarHistoricoRelatorio,
} from "../src/features/certidao-mensal-documental/services/certidaoMensalRelatorioService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(__dirname, "..");

function extrairValoresLinha(html, rotulo) {
    const padrao = new RegExp(
        `<tr><th scope="row"><span[^>]*></span>${rotulo}</th>(.*?)</tr>`,
    );
    const correspondencia = padrao.exec(html);

    assert.ok(
        correspondencia,
        `Linha ${rotulo} não localizada no histórico.`,
    );

    return Array.from(
        correspondencia[1].matchAll(/<td[^>]*>(.*?)<\/td>/g),
        (item) => item[1],
    );
}

const html = montarHistoricoRelatorio({
    competencia: "08/2026",
    empresa: {
        dataInicioContrato: "2026-04-01",
        dataFimContrato: "2028-09-19",
    },
    historicoAnual: [
        {
            competencia: "01/2026",
            resumo: {
                totalExigiveis: 10,
                totalConfirmados: 4,
            },
        },
    ],
    resumoAtual: {
        total: 10,
        conformes: 0,
        pendentes: 10,
    },
});

assert.deepEqual(
    extrairValoresLinha(html, "Conformes"),
    ["—", "—", "—", "0", "0", "0", "0", "0", "—", "—", "—", "—"],
    "Meses anteriores ao contrato não podem aparecer como conformes ou pendentes.",
);

assert.deepEqual(
    extrairValoresLinha(html, "Pendentes"),
    ["—", "—", "—", "10", "10", "10", "10", "10", "—", "—", "—", "—"],
    "O histórico deve começar a cobrança no mês inicial do contrato.",
);

assert.match(
    html,
    /Meses fora da vigência contratual e competências futuras são exibidos como —\./,
);

const empresasPage = fs.readFileSync(
    path.join(repo, "src/components/empresas/EmpresasPage.jsx"),
    "utf8",
);

const ocorrenciasClasse =
    empresasPage.match(/empresas-contrato-data-centralizada/g) || [];

assert.equal(
    ocorrenciasClasse.length,
    4,
    "Os quatro campos de data contratual devem usar a centralização dedicada.",
);

assert.match(
    empresasPage,
    /import "\.\.\/\.\.\/styles\/pages\/empresas-contrato-vigencia\.css";/,
);

const css = fs.readFileSync(
    path.join(repo, "src/styles/pages/empresas-contrato-vigencia.css"),
    "utf8",
);

assert.match(css, /::-webkit-datetime-edit-fields-wrapper/);

console.log(
    "SafeScan: histórico contratual e centralização das datas aprovados.",
);
