import assert from "node:assert/strict";
import {
    readFileSync,
} from "node:fs";

const migration =
    readFileSync(
        "supabase/migrations/20260831095934_certidao_mensal_revisao_analitica_versao_historica.sql",
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
console.log("CERT2 — REVISAO ANALITICA DE VERSAO HISTORICA A4 APROVADA");
console.log("Cenarios protegidos: diferenca real, zero diferenca, mudanca estrutural, concorrencia, versao historica e Seguro de Vida fora do escopo.");
console.log("Nenhum Supabase remoto, Storage, Git ou deploy foi utilizado.");
