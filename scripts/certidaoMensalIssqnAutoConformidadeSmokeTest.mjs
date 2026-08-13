import assert from "node:assert/strict";

import {
    executarPreAvaliacaoDocumental,
} from "../src/features/certidao-mensal-documental/analysis/certidaoDocumentPreAssessment.js";

import {
    resolverStatusInicialDocumentoCertidaoMensal,
} from "../src/features/certidao-mensal-documental/services/certidaoMensalPersistencePayloadService.js";

const textoIssqn = `
PREFEITURA DE SÃO JOSÉ DOS CAMPOS
SECRETARIA DE GESTÃO ADMINISTRATIVA E FINANÇAS
CERTIDÃO DE ISSQN/TAXA DE LICENÇA
CERTIFICA, que não consta(m) até a presente data/hora, débito(s)
relativos a Imposto Sobre Serviços de Qualquer Natureza e Taxas
de Licença, que onerem a Inscrição Municipal nº 302933 em nome
de RIBEIRO AQUINO PAVIMENTADORA E CONSTRUTORA LTDA.
Obs: CERTIDÃO NEGATIVA
Documento emitido via internet em 19/01/2026 10:01:23.
Chave para validação: 8E538 78F2D FAPG7.
Válido até 18/07/2026.
`;

const preAvaliacao =
    executarPreAvaliacaoDocumental({
        textoExtraido: textoIssqn,
        documentoEsperado: {
            id: "iss",
            titulo: "ISSQN",
            competenciaEsperada: "01/2026",
        },
        empresaEsperada: {
            nome: "RIBEIRO AQUINO",
            cnpj: "13.697.181/0001-07",
        },
        dataReferencia:
            new Date("2026-01-31T12:00:00.000Z"),
    });

const avaliacao =
    preAvaliacao?.avaliacao || {};

assert.equal(
    avaliacao.codigo,
    "CERTIDAO_ISSQN_IDENTIFICADA",
    "A certidão ISSQN real deve ser identificada.",
);

assert.equal(
    avaliacao.requerConferenciaHumana,
    false,
    "Certidão ISSQN limpa não deve permanecer bloqueada por conferência humana.",
);

const regraMunicipal =
    Array.isArray(avaliacao.regras)
        ? avaliacao.regras.find(
            (regra) =>
                regra?.codigo ===
                "CONFERENCIA_FISCAL_MUNICIPAL"
        )
        : null;

assert.ok(
    regraMunicipal,
    "Regra municipal deve existir.",
);

assert.equal(
    regraMunicipal.status,
    "APROVADA",
    "Conferência documental municipal deve ser aprovada para certidão limpa.",
);

const statusIssqn =
    resolverStatusInicialDocumentoCertidaoMensal({
        tipoDocumento: "iss",
        avaliacao,
    });

assert.equal(
    statusIssqn,
    "CONFORME",
    "ISSQN limpa deve nascer CONFORME.",
);

assert.equal(
    resolverStatusInicialDocumentoCertidaoMensal({
        tipoDocumento: "cnd-federal",
        avaliacao,
    }),
    "EM_ANALISE",
    "Outros documentos não podem herdar a regra automática do ISSQN.",
);

assert.equal(
    resolverStatusInicialDocumentoCertidaoMensal({
        tipoDocumento: "iss",
        avaliacao: {
            ...avaliacao,
            codigo: "DIVERGENCIA_CNPJ",
            bloqueiaSubstituicao: true,
        },
    }),
    "EM_ANALISE",
    "ISSQN com divergência deve continuar fora da auto-conformidade.",
);

assert.equal(
    resolverStatusInicialDocumentoCertidaoMensal({
        tipoDocumento: "iss",
        avaliacao: {
            ...avaliacao,
            requerConferenciaHumana: true,
        },
    }),
    "EM_ANALISE",
    "ISSQN que realmente exige humano deve continuar EM_ANALISE.",
);

const avaliacaoComRegraReprovada = {
    ...avaliacao,
    regras: [
        ...(avaliacao.regras || []).filter(
            (regra) =>
                regra?.codigo !==
                "VALIDADE_DOCUMENTO"
        ),
        {
            codigo: "VALIDADE_DOCUMENTO",
            status: "REPROVADA",
        },
    ],
};

assert.equal(
    resolverStatusInicialDocumentoCertidaoMensal({
        tipoDocumento: "iss",
        avaliacao: avaliacaoComRegraReprovada,
    }),
    "EM_ANALISE",
    "ISSQN com regra decisiva reprovada não pode nascer CONFORME.",
);

console.log("");
console.log("CERTIDÃO MENSAL — ISSQN AUTO-CONFORMIDADE D10 APROVADA");
console.log("Cenários: certidão real limpa, isolamento para outros documentos, divergência, conferência humana e regra reprovada.");
console.log("Nenhum Supabase, banco, e-mail ou deploy foi utilizado.");