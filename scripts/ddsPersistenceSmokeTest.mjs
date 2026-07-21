import assert from "node:assert/strict";

import {
    montarFrequenciasEstruturadasDds,
    montarTemasEstruturadosDds,
    sincronizarConferenciaEstruturadaDds,
} from "../src/services/ddsDocumentosService.js";
import { extrairSugestoesTemaResponsavelDds } from "../src/utils/ddsExtracaoTextoUtils.js";
import { montarSugestoesFrequenciaDds } from "../src/utils/ddsSugestaoFrequenciaUtils.js";

const dias = [
    {
        indice: 0,
        posicaoSemana: 0,
        chaveAssistida: "1-segunda",
        data: "2026-07-20",
        tema: "Tema segunda",
        temaConfirmado: "Tema confirmado segunda",
        responsavelConfirmado: "Responsável segunda",
    },
    {
        indice: 1,
        posicaoSemana: 1,
        chaveAssistida: "2-terca",
        data: "2026-07-21",
        tema: "Sem atividade",
        temaConfirmado: "",
        responsavelConfirmado: "",
        semAtividadeConfirmada: true,
    },
    {
        indice: 2,
        posicaoSemana: 2,
        chaveAssistida: "3-quarta",
        data: "2026-07-22",
        tema: "Tema quarta",
        temaConfirmado: "Tema confirmado quarta",
        responsavelConfirmado: "Responsável quarta",
    },
];

const participantes = [
    {
        numero: 1,
        paginaEsperada: 1,
        nome: "Participante página um",
        codigoSafescan: "COL-001",
    },
    {
        numero: 11,
        paginaEsperada: 2,
        nome: "Participante página dois",
        codigoSafescan: "COL-011",
    },
];

const frequencia = {
    "1-1-segunda": "presente",
    "1-3-quarta": "ausente",
    "11-1-segunda": "presente",
    "11-3-quarta": "presente",
};

const leitura = {
    confianca: 82,
    marcacoesDdsDias: [
        {
            pagina: 1,
            numeroLinha: 1,
            diaIndice: 0,
            tipoMarcacao: "dia",
            assinatura_visual: true,
            assinatura_densidade: 0.12,
        },
        {
            pagina: 1,
            numeroLinha: 1,
            diaIndice: 2,
            tipoMarcacao: "dia",
            x_visual: true,
            x_densidade: 0.18,
        },
        {
            pagina: 2,
            numeroLinha: 1,
            diaIndice: 7,
            tipoMarcacao: "semana_completa",
            assinatura_visual: true,
            assinatura_densidade: 0.15,
        },
    ],
};

const linhas =
    montarFrequenciasEstruturadasDds({
        participantes,
        dias,
        frequencia,
        leitura,
    });

assert.equal(
    linhas.length,
    4,
    "Dois participantes x dois dias ativos."
);

assert.equal(
    linhas.some(
        (linha) =>
            linha.dataReferencia ===
            "2026-07-21"
    ),
    false,
    "Dia sem atividade não pode gerar frequência."
);

const segundaParticipanteUm =
    linhas.find(
        (linha) =>
            linha.participanteNumero === 1 &&
            linha.dataReferencia ===
                "2026-07-20"
    );

assert.ok(
    segundaParticipanteUm,
    "Frequência da segunda-feira não localizada."
);

assert.equal(
    segundaParticipanteUm.sugestaoOcr,
    "presente"
);

assert.equal(
    segundaParticipanteUm.confiancaOcr,
    0.82
);

assert.equal(
    segundaParticipanteUm.paginaImpressa,
    1
);

assert.equal(
    segundaParticipanteUm.linhaImpressa,
    1
);

const quartaParticipanteUm =
    linhas.find(
        (linha) =>
            linha.participanteNumero === 1 &&
            linha.dataReferencia ===
                "2026-07-22"
    );

assert.equal(
    quartaParticipanteUm?.sugestaoOcr,
    "ausente"
);

const segundaParticipanteOnze =
    linhas.find(
        (linha) =>
            linha.participanteNumero === 11 &&
            linha.dataReferencia ===
                "2026-07-20"
    );

assert.equal(
    segundaParticipanteOnze?.paginaImpressa,
    2
);

assert.equal(
    segundaParticipanteOnze?.linhaImpressa,
    1
);

assert.equal(
    segundaParticipanteOnze?.sugestaoOcr,
    "presente",
    "Marcação de semana completa deve sugerir presença."
);

const temas =
    montarTemasEstruturadosDds({
        dias,
        temasDias: [
            {
                temaConfirmado:
                    "Tema confirmado segunda",
                responsavelConfirmado:
                    "Responsável segunda",
            },
            {
                semAtividadeConfirmada:
                    true,
            },
            {
                temaConfirmado:
                    "Tema confirmado quarta",
                responsavelConfirmado:
                    "Responsável quarta",
            },
        ],
    });

assert.equal(
    temas.length,
    3,
    "Os sete dias conceituais devem manter suas posições, inclusive dias sem atividade."
);

assert.equal(
    temas[1].semAtividade,
    true
);

assert.equal(
    temas[2].temaConfirmado,
    "Tema confirmado quarta",
    "Quarta-feira não pode receber o tema de terça-feira."
);

let chamadaRpc = null;
const supabaseMock = {
    rpc: async (nome, parametros) => {
        chamadaRpc = { nome, parametros };
        return {
            data: {
                ok: true,
                conferencia_id:
                    "11111111-1111-4111-8111-111111111111",
            },
            error: null,
        };
    },
};

const sincronizacao =
    await sincronizarConferenciaEstruturadaDds({
        supabase: supabaseMock,
        registroId:
            "22222222-2222-4222-8222-222222222222",
        status: "em_conferencia",
        participantes,
        dias,
        frequencia,
        temasDias: temas,
        leitura,
        acao: "salvar_conferencia",
    });

assert.equal(
    chamadaRpc?.nome,
    "sincronizar_conferencia_dds"
);
assert.equal(
    chamadaRpc?.parametros?.p_registro_id,
    "22222222-2222-4222-8222-222222222222"
);
assert.ok(
    Object.hasOwn(
        chamadaRpc?.parametros || {},
        "p_leitura_ocr"
    ),
    "A RPC deve receber p_leitura_ocr."
);
assert.equal(
    Object.hasOwn(
        chamadaRpc?.parametros || {},
        "p_dds_registro_id"
    ),
    false,
    "O contrato antigo da RPC não pode reaparecer."
);
assert.equal(
    sincronizacao.conferenciaId,
    "11111111-1111-4111-8111-111111111111"
);

const sugestoesTexto = extrairSugestoesTemaResponsavelDds({
    linhasOcr: [
        { texto: "SEGUNDA-FEIRA Tema: Uso correto de EPI Responsável: João Silva" },
        { texto: "TER Assunto - Trabalho em altura Aplicador - Maria Souza" },
    ],
    dias: [
        { nome: "Segunda-feira", curto: "SEG" },
        { nome: "Terça-feira", curto: "TER" },
    ],
});

assert.equal(sugestoesTexto[0]?.temaSugerido, "Uso correto de EPI");
assert.equal(sugestoesTexto[0]?.responsavelSugerido, "João Silva");
assert.equal(sugestoesTexto[1]?.temaSugerido, "Trabalho em altura");
assert.equal(sugestoesTexto[1]?.responsavelSugerido, "Maria Souza");

const sugestoesHibridas = montarSugestoesFrequenciaDds({
    participantes: [{ numero: 1, paginaEsperada: 1 }],
    dias: [{ indice: 0, chaveAssistida: "1-segunda" }],
    marcacoes: [
        {
            pagina: 1,
            numeroLinha: 1,
            diaIndice: 0,
            x_visual: true,
            x_densidade: 0.1,
            x_proporcao_diagonal_principal: 0.5,
            x_proporcao_diagonal_secundaria: 0.5,
        },
        {
            pagina: 1,
            numeroLinha: 1,
            diaIndice: 7,
            tipoMarcacao: "semana_completa",
            assinatura_visual: true,
        },
    ],
});

assert.equal(sugestoesHibridas["1-1-segunda"]?.sugestao, "ausente");
assert.equal(sugestoesHibridas["1-1-segunda"]?.prioridade, "alta");
assert.equal(sugestoesHibridas["1-1-segunda"]?.requerConferenciaManual, true);

console.log(
    "Smoke DDS aprovado: OCR, temas e contrato remoto da RPC alinhados."
);
