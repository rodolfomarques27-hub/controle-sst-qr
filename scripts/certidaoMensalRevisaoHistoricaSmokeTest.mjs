import assert from "node:assert/strict";
import {
    readFileSync,
} from "node:fs";

import {
    criarDiagnosticoPersistencia,
} from "../src/features/certidao-mensal-documental/services/certidaoMensalUploadMassaPersistencePlanService.js";

import {
    CERTIDAO_MENSAL_REVISAO_HISTORICA_SINGLE_FLIGHT_CODIGO,
    criarCertidaoMensalRevisaoHistoricaSingleFlight,
} from "../src/features/certidao-mensal-documental/services/certidaoMensalRevisaoHistoricaSingleFlightService.js";

const migration =
    readFileSync(
        "supabase/migrations/20260831133205_certidao_mensal_revisao_analitica_versao_historica.sql",
        "utf8",
    );

const hook =
    readFileSync(
        "src/features/certidao-mensal-documental/hooks/useCertidaoMensalUploadMassa.js",
        "utf8",
    );

const panel =
    readFileSync(
        "src/features/certidao-mensal-documental/components/CertidaoUploadMassaPanel.jsx",
        "utf8",
    );

// SAFE_SCAN_CERT2_P15_SMOKE
const avaliacaoTemporalP15 = {
    dadosTemporais: {
        dataEmissaoIso: "2026-04-10",
        dataValidadeIso: "2026-10-07",
    },

    dadosInssDctfweb: {
        competencia: "2026-03",
        dataTransmissao: "2026-04-10",
        vencimento: "2026-04-20",
    },
};

const diagnosticoTemporalP15 =
    criarDiagnosticoPersistencia({
        leitura: {
            metodo: "PDFJS",
            totalPaginas: 2,
            paginasLidas: 2,
            confianca: 0.99,
        },

        resolucao: {
            tipoDocumento:
                "inss-dctfweb",

            tipoClassificador:
                "inss-dctfweb",

            titulo:
                "INSS / DCTFWeb",

            confianca:
                95,

            status:
                "PRONTO",

            politica:
                "COMPETENCIA_MENSAL",

            destino: {
                fonte:
                    "CONTEUDO_DOCUMENTAL",
            },

            motivos:
                [],

            avaliacao:
                avaliacaoTemporalP15,
        },
    });

assert.deepEqual(
    diagnosticoTemporalP15.avaliacao,
    avaliacaoTemporalP15,
    "P15: a avaliação RAW deve integrar o diagnóstico persistível sem nova interpretação.",
);

const p15HookGuardIndex =
    hook.indexOf(
        "SAFE_SCAN_CERT2_P15_NOOP_HOOK_FAIL_CLOSED"
    );

const p15HookSetEstadoIndex =
    hook.indexOf(
        "setEstado(",
        p15HookGuardIndex
    );

assert.ok(
    p15HookGuardIndex >= 0 &&
    p15HookSetEstadoIndex >
        p15HookGuardIndex,
    "P15: o guard alterado===true deve existir antes do setEstado da revisão.",
);

assert.match(
    hook.slice(
        p15HookGuardIndex,
        p15HookSetEstadoIndex
    ),
    /retorno.{0,120}[?][.]alterado.{0,120}!==.{0,80}true.{0,500}throw new Error/s,
    "P15: qualquer retorno diferente de alterado=true deve falhar antes do snapshot local.",
);

const p15PanelGuardIndex =
    panel.indexOf(
        "SAFE_SCAN_CERT2_P15_NOOP_PANEL_FAIL_CLOSED"
    );

const p15PanelStateIndex =
    panel.indexOf(
        "setRevisaoDocumentoSalvo(",
        p15PanelGuardIndex
    );

assert.ok(
    p15PanelGuardIndex >= 0 &&
    p15PanelStateIndex >
        p15PanelGuardIndex,
    "P15: o painel deve bloquear o no-op antes de marcar a revisão como salva.",
);

assert.match(
    panel.slice(
        p15PanelGuardIndex,
        p15PanelStateIndex
    ),
    /resultado.{0,120}[?][.]alterado.{0,120}!==.{0,80}true.{0,900}return;/s,
    "P15: o painel deve encerrar o caminho de sucesso quando alterado não for true.",
);

assert.doesNotMatch(
    panel,
    /A análise já estava atualizada no banco[.] A mesma versão foi preservada[.]/,
    "P15: alterado=false não pode ser comunicado como sucesso.",
);

assert.doesNotMatch(
    migration,
    /if\s+v_item\.versao_atual_id\s+is\s+distinct\s+from\s+p_versao_id/i,
    "A RPC nao pode bloquear genericamente uma versao historica somente por ela nao ser atual.",
);

assert.match(
    migration,
    /v_versao_era_atual\s*:=\s*v_item\.versao_atual_id\s+is\s+not\s+distinct\s+from\s+p_versao_id/i,
    "A RPC deve registrar se a versao corrigida era a atual.",
);

assert.match(
    migration,
    /lower\(v_item\.tipo_documento\)\s*=\s*'seguro-vida'[\s\S]{0,180}and\s+not\s+v_versao_era_atual/i,
    "Seguro de Vida deve preservar a regra anterior e permanecer fora da liberacao historica.",
);

assert.match(
    migration,
    /where\s+v\.id\s*=\s*p_versao_id\s+and\s+v\.item_id\s*=\s*p_item_id\s+for\s+update/i,
    "A versao exata deve ser bloqueada por ID e item antes da correcao.",
);

assert.match(
    migration,
    /v_versao\.diagnostico\s+is\s+distinct\s+from\s+p_diagnostico_esperado/i,
    "O diagnostico principal deve permanecer protegido por optimistic guard.",
);

assert.match(
    migration,
    /v_versao\.payload\s*\?\s*'diagnostico'[\s\S]{0,180}v_diagnostico_payload_anterior\s+is\s+distinct\s+from\s+p_diagnostico_esperado/i,
    "O diagnostico existente no payload tambem deve permanecer protegido contra concorrencia.",
);

assert.match(
    migration,
    /if\s+v_versao\.diagnostico\s*=\s*p_diagnostico_novo[\s\S]{0,220}'alterado',\s*false/i,
    "A RPC deve retornar sem escrita quando a analise ja estiver atualizada.",
);

assert.match(
    migration,
    /update\s+public\.certidao_mensal_versoes[\s\S]{0,220}where\s+id\s*=\s*v_versao\.id\s+and\s+item_id\s*=\s*v_item\.id/i,
    "Somente a versao exata pode receber a correcao analitica.",
);

assert.doesNotMatch(
    migration,
    /update\s+public\.certidao_mensal_itens/i,
    "A revisao analitica jamais pode atualizar versao_atual_id ou outro campo do item.",
);

assert.match(
    migration,
    /'versaoEraAtual',\s*v_versao_era_atual/i,
    "A auditoria e o retorno devem informar se a versao era atual.",
);

assert.match(
    migration,
    /'versaoAtualIdPreservada',\s*v_item\.versao_atual_id/i,
    "A auditoria deve registrar a versao atual preservada.",
);

assert.match(
    migration,
    /from\s+public,\s*anon,\s*authenticated,\s*service_role/i,
    "A sobrecarga-base SECURITY DEFINER deve permanecer sem acesso direto.",
);

assert.doesNotMatch(
    hook,
    /conflitoVersaoAtual/,
    "A reconciliacao de timeout nao pode recriar o bloqueio generico de versao historica.",
);

assert.doesNotMatch(
    hook,
    /A vers[aã]o deixou de ser a vers[aã]o atual durante o salvamento/i,
    "A mensagem do bloqueio removido nao pode permanecer no consumidor.",
);

assert.match(
    hook,
    /SAFE_SCAN_REVISAO_ANALITICA_HISTORICA_A4/,
    "O caminho de reconciliacao historica deve permanecer rastreavel.",
);

const chamadasRpc =
    hook.match(
        /revisar_certidao_mensal_versao_existente/g,
    ) || [];

assert.equal(
    chamadasRpc.length,
    1,
    "A revisao deve manter uma unica chamada da RPC, sem retry automatico de escrita.",
);

/*
 * ============================================================
 * M2-A3 — PROVA ESTÁTICA DE POSICIONAMENTO
 * ============================================================
 */

assert.match(
    hook,
    /SAFE_SCAN_CERT2_M2_A3_REVISAO_SINGLE_FLIGHT/,
    "O hook deve manter marcador rastreavel do single-flight da revisao historica.",
);

const inicioRevisao =
    hook.indexOf(
        "const salvarAnaliseCorrigidaDocumentoSalvo"
    );

const fimRevisao =
    hook.indexOf(
        "SAFE_SCAN_DUPLICADO_HISTORICO_OPEN_READ_ONLY_R6",
        inicioRevisao
    );

assert.ok(
    inicioRevisao >= 0 &&
    fimRevisao >
        inicioRevisao,
    "O bloco da revisao historica deve ser localizavel.",
);

const blocoRevisao =
    hook.slice(
        inicioRevisao,
        fimRevisao
    );

const indiceSingleFlight =
    blocoRevisao.indexOf(
        "revisaoHistoricaSingleFlightRef"
    );

const indiceRpc =
    blocoRevisao.indexOf(
        "supabase.rpc("
    );

assert.ok(
    indiceSingleFlight >= 0,
    "O executor de revisao deve passar pelo single-flight.",
);

assert.ok(
    indiceRpc >
        indiceSingleFlight,
    "O single-flight deve ser adquirido antes da RPC de escrita.",
);

/*
 * ============================================================
 * M2-A3 — PROVA DINÂMICA DE DUAS CHAMADAS SIMULTÂNEAS
 * ============================================================
 */

{
    const singleFlight =
        criarCertidaoMensalRevisaoHistoricaSingleFlight();

    let chamadasExecutor =
        0;

    let liberarPrimeira =
        null;

    let marcarPrimeiraIniciada =
        null;

    const primeiraIniciada =
        new Promise(
            (
                resolve
            ) => {
                marcarPrimeiraIniciada =
                    resolve;
            }
        );

    const primeira =
        singleFlight.executar(
            async () => {
                chamadasExecutor +=
                    1;

                marcarPrimeiraIniciada();

                await new Promise(
                    (
                        resolve
                    ) => {
                        liberarPrimeira =
                            resolve;
                    }
                );

                return "PRIMEIRA_OK";
            }
        );

    await primeiraIniciada;

    assert.equal(
        singleFlight.estaEmAndamento(),
        true,
        "A trava deve estar ativa enquanto a primeira chamada permanece pendente.",
    );

    let erroSegunda =
        null;

    try {
        await singleFlight.executar(
            async () => {
                chamadasExecutor +=
                    1;

                return "SEGUNDA_NAO_DEVERIA_EXECUTAR";
            }
        );
    }
    catch (error) {
        erroSegunda =
            error;
    }

    assert.ok(
        erroSegunda,
        "A segunda chamada simultanea deve ser rejeitada.",
    );

    assert.equal(
        erroSegunda?.codigo,
        CERTIDAO_MENSAL_REVISAO_HISTORICA_SINGLE_FLIGHT_CODIGO,
        "A segunda chamada deve usar o codigo fail-closed esperado.",
    );

    assert.equal(
        chamadasExecutor,
        1,
        "Duas invocacoes simultaneas devem produzir somente um executor efetivo.",
    );

    liberarPrimeira();

    assert.equal(
        await primeira,
        "PRIMEIRA_OK",
    );

    assert.equal(
        singleFlight.estaEmAndamento(),
        false,
        "A trava deve ser liberada depois do sucesso.",
    );

    const terceira =
        await singleFlight.executar(
            async () => {
                chamadasExecutor +=
                    1;

                return "TERCEIRA_OK";
            }
        );

    assert.equal(
        terceira,
        "TERCEIRA_OK",
        "Uma nova chamada deve ser aceita depois da liberacao da trava.",
    );

    assert.equal(
        chamadasExecutor,
        2,
        "A trava nao pode permanecer presa depois do sucesso.",
    );

    await assert.rejects(
        singleFlight.executar(
            async () => {
                throw new Error(
                    "ERRO_FIXTURE_SINGLE_FLIGHT"
                );
            }
        ),
        /ERRO_FIXTURE_SINGLE_FLIGHT/,
    );

    assert.equal(
        singleFlight.estaEmAndamento(),
        false,
        "A trava deve ser liberada pelo finally mesmo quando o executor falha.",
    );
}

/*
 * ============================================================
 * SAFE_SCAN_CERT2_M2_A4_SMOKE
 *
 * Prova estrutural + derivação dinâmica do teto de carga:
 * 6 ciclos x 2 leituras = 12 SELECTs máximos.
 * ============================================================
 */

{
    const inicioReconciliacao =
        hook.indexOf(
            "SAFE_SCAN_REVISAR_DOCUMENTO_SALVO_RECONCILIACAO_R14_B1"
        );

    const fimReconciliacao =
        hook.indexOf(
            "if (conflitoAnalise)",
            inicioReconciliacao
        );

    assert.ok(
        inicioReconciliacao >= 0 &&
        fimReconciliacao >
            inicioReconciliacao,
        "O bloco read-only de reconciliacao deve permanecer localizavel.",
    );

    const reconciliacao =
        hook.slice(
            inicioReconciliacao,
            fimReconciliacao
        );

    assert.match(
        reconciliacao,
        /SAFE_SCAN_CERT2_M2_A4_RECONCILIACAO_LIMITADA/,
        "A reconciliacao limitada M2-A4 deve permanecer rastreavel.",
    );

    const maxMatch =
        /const\s+maxTentativasConfirmacao\s*=\s*(\d+)/.exec(
            reconciliacao
        );

    const intervaloMatch =
        /const\s+intervaloTentativasConfirmacaoMs\s*=\s*(\d+)/.exec(
            reconciliacao
        );

    assert.ok(
        maxMatch,
        "O teto explicito de tentativas deve existir.",
    );

    assert.ok(
        intervaloMatch,
        "O intervalo explicito entre tentativas deve existir.",
    );

    const maxTentativas =
        Number(
            maxMatch[1]
        );

    const intervaloMs =
        Number(
            intervaloMatch[1]
        );

    assert.equal(
        maxTentativas,
        6,
        "A reconciliacao deve permitir no maximo 6 ciclos.",
    );

    assert.equal(
        intervaloMs,
        2500,
        "O polling deve usar intervalo de 2500 ms.",
    );

    const guardsTentativa =
        reconciliacao.match(
            /tentativasConfirmacao\s*<\s*maxTentativasConfirmacao/g
        ) || [];

    assert.equal(
        guardsTentativa.length,
        3,
        "O limite deve proteger o while e as duas esperas de repeticao.",
    );

    assert.match(
        reconciliacao,
        /tentativasConfirmacao\s*\+=\s*1/,
        "Cada ciclo deve consumir exatamente uma tentativa.",
    );

    assert.doesNotMatch(
        reconciliacao,
        /setTimeout\([\s\S]{0,120}resolver,[\s\S]{0,40}500/,
        "O polling antigo de 500 ms nao pode permanecer na reconciliacao.",
    );

    const consultasVersao =
        reconciliacao.match(
            /\.from\(\s*"certidao_mensal_versoes"\s*\)/g
        ) || [];

    const consultasItem =
        reconciliacao.match(
            /\.from\(\s*"certidao_mensal_itens"\s*\)/g
        ) || [];

    assert.equal(
        consultasVersao.length,
        1,
        "Cada ciclo deve construir uma unica leitura da versao.",
    );

    assert.equal(
        consultasItem.length,
        1,
        "Cada ciclo deve construir uma unica leitura do item.",
    );

    const leiturasPorCiclo =
        consultasVersao.length +
        consultasItem.length;

    assert.equal(
        leiturasPorCiclo,
        2,
        "Cada ciclo deve possuir exatamente duas leituras read-only.",
    );

    const maxLeituras =
        maxTentativas *
        leiturasPorCiclo;

    assert.equal(
        maxLeituras,
        12,
        "O teto estrutural deve ser de 12 leituras por reconciliacao.",
    );

    /*
     * Derivação dinâmica do pior caso.
     */
    let ciclosPiorCaso =
        0;

    let leiturasPiorCaso =
        0;

    while (
        ciclosPiorCaso <
        maxTentativas
    ) {
        ciclosPiorCaso +=
            1;

        leiturasPiorCaso +=
            leiturasPorCiclo;
    }

    assert.equal(
        ciclosPiorCaso,
        6,
    );

    assert.equal(
        leiturasPiorCaso,
        12,
    );

    /*
     * Cenário positivo:
     * confirmação aparece na quarta tentativa.
     * A reconciliação deve poder encerrar antes do teto.
     */
    let ciclosConfirmacao =
        0;

    let confirmado =
        false;

    while (
        ciclosConfirmacao <
            maxTentativas &&
        !confirmado
    ) {
        ciclosConfirmacao +=
            1;

        if (
            ciclosConfirmacao ===
            4
        ) {
            confirmado =
                true;
        }
    }

    assert.equal(
        confirmado,
        true,
        "Uma confirmacao posterior deve continuar podendo encerrar a reconciliacao.",
    );

    assert.equal(
        ciclosConfirmacao,
        4,
        "A reconciliacao positiva deve encerrar antes do teto quando confirmada.",
    );

    assert.match(
        reconciliacao,
        /while\s*\([\s\S]{0,220}!retorno[\s\S]{0,220}tentativasConfirmacao\s*<\s*maxTentativasConfirmacao/,
        "O loop deve continuar condicionado a ausencia de retorno e ao teto de tentativas.",
    );
}

assert.match(
    panel,
    /totalAlteracoes[\s\S]{0,160}>\s*0/,
    "A UI deve oferecer escrita somente quando houver diferenca real.",
);

assert.match(
    panel,
    /mudancaEstrutural[\s\S]{0,500}!==[\s\S]{0,80}true/,
    "A UI deve continuar bloqueando mudanca estrutural.",
);

assert.match(
    panel,
    /Análise corrigida na versão histórica selecionada\. A versão atual do item permaneceu inalterada\./,
    "A UI deve confirmar claramente a preservacao da versao atual.",
);

console.log("");
console.log("CERT2 — REVISAO ANALITICA HISTORICA A4 + M2-A3 + M2-A4 APROVADA");
console.log("M2-A3: duas chamadas simultaneas => um executor; segunda bloqueada antes da RPC; trava liberada em finally.");
console.log("M2-A4: reconciliacao pos-timeout limitada a 6 ciclos / 12 leituras; polling 2500 ms; zero retry de escrita.");
console.log("Cenarios protegidos: diferenca real, zero diferenca, mudanca estrutural, concorrencia, versao historica e Seguro de Vida fora do escopo.");
console.log("Nenhum Supabase remoto, Storage, Git ou deploy foi utilizado.");
