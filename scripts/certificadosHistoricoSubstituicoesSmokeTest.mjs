import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const crud = readFileSync(
    new URL(
        "../src/services/certificadosCrudService.js",
        import.meta.url
    ),
    "utf8"
);

const storage = readFileSync(
    new URL(
        "../src/services/certificadosStorageService.js",
        import.meta.url
    ),
    "utf8"
);

const appColaboradores = readFileSync(
    new URL(
        "../src/services/appColaboradoresHandlersService.js",
        import.meta.url
    ),
    "utf8"
);

const storageAuditoria = readFileSync(
    new URL(
        "../src/services/storageAuditoriaService.js",
        import.meta.url
    ),
    "utf8"
);

const migrationEstrutural = readFileSync(
    new URL(
        "../supabase/migrations/20260819161509_certificados_historico_substituicoes.sql",
        import.meta.url
    ),
    "utf8"
);

const migrationSeguranca = readFileSync(
    new URL(
        "../supabase/migrations/20260819161949_certificados_historico_restringir_execucao_trigger.sql",
        import.meta.url
    ),
    "utf8"
);

const migrationGeneralizacao = readFileSync(
    new URL(
        "../supabase/migrations/20260819172836_certificados_historico_generalizar_todos.sql",
        import.meta.url
    ),
    "utf8"
);

const inicioSalvar = crud.indexOf(
    "export async function salvarCertificadoTreinamentoCrud"
);

const inicioExcluir = crud.indexOf(
    "export async function excluirCertificadoTreinamentoCrud"
);

assert.ok(
    inicioSalvar >= 0 &&
    inicioExcluir > inicioSalvar,
    "CRUD salvar/excluir deve ser localizável."
);

const blocoSalvar =
    crud.slice(
        inicioSalvar,
        inicioExcluir
    );

const blocoExcluir =
    crud.slice(
        inicioExcluir
    );

assert.match(
    blocoSalvar,
    /public\.certificados_historico/,
    "CRUD deve documentar histórico."
);

assert.doesNotMatch(
    blocoSalvar,
    /removerArquivoCertificadoStorage\s*\(/,
    "Substituição não pode apagar PDF anterior."
);

assert.match(
    blocoExcluir,
    /removerArquivoCertificadoStorage\s*\(/,
    "Exclusão explícita deve permanecer."
);

assert.match(
    storage,
    /globalThis\.crypto\?\.randomUUID\?\.\(\)/,
    "Todo certificado novo deve receber UUID."
);

assert.ok(
    storage.includes(
        "`${codigoPasta}/${treinamentoIdSeguro}/${Date.now()}-${identificadorVersao}-${nomeSeguro}`"
    ),
    "Caminho deve usar timestamp + UUID."
);

assert.match(
    storage,
    /upsert:\s*false/,
    "Storage deve usar upsert:false."
);

assert.doesNotMatch(
    storage,
    /ehFichaEpi|identificadorVersaoFichaEpi|upsert:\s*!ehFichaEpi/,
    "Versionamento não pode continuar exclusivo da Ficha EPI."
);

const inicioMassa =
    appColaboradores.indexOf(
        "export async function salvarCertificadosEmMassaColaboradorAppService"
    );

const fimMassa =
    appColaboradores.indexOf(
        "export async function adicionarColaboradorAppService"
    );

assert.ok(
    inicioMassa >= 0 &&
    fimMassa > inicioMassa,
    "Fluxo em massa deve existir."
);

const blocoMassa =
    appColaboradores.slice(
        inicioMassa,
        fimMassa
    );

assert.match(
    blocoMassa,
    /enviarArquivoCertificado\s*\(/,
    "Massa deve usar Storage central."
);

assert.match(
    blocoMassa,
    /\.from\("certificados"\)[\s\S]*\.update\(payload\)/,
    "Massa deve continuar atualizando snapshot."
);

assert.match(
    blocoMassa,
    /\.from\("certificados"\)[\s\S]*\.insert\(payload\)/,
    "Massa deve continuar inserindo primeiro documento."
);

assert.doesNotMatch(
    blocoMassa,
    /removerArquivoCertificadoStorage\s*\(/,
    "Massa não pode remover versão anterior."
);

assert.match(
    storageAuditoria,
    /buscarTodosRegistrosSupabase\("certificados_historico",\s*"\*"\)/,
    "Auditoria deve consultar histórico."
);

assert.match(
    storageAuditoria,
    /const certificadosHistoricoPorCaminho/,
    "Auditoria deve mapear histórico por caminho."
);

assert.match(
    storageAuditoria,
    /const certificadoHistoricoVinculado/,
    "Auditoria deve detectar certificado histórico."
);

assert.match(
    storageAuditoria,
    /emUso\s*=\s*Boolean\(\s*certificadoReferencia\s*\)/,
    "Histórico deve ser protegido como emUso."
);

assert.match(
    migrationEstrutural,
    /create table if not exists\s+public\.certificados_historico/i,
    "Tabela histórica deve permanecer."
);

assert.match(
    migrationEstrutural,
    /enable row level security/i,
    "RLS deve permanecer."
);

/*
 * ACL REAL HOMOLOGADA NO R3-F1:
 *
 * public ............. sem EXECUTE
 * anon ............... sem EXECUTE
 * authenticated ...... sem EXECUTE
 * service_role ....... com EXECUTE
 */

assert.match(
    migrationSeguranca,
    /revoke\s+execute[\s\S]*from\s+authenticated/i,
    "Migration F1 deve revogar authenticated."
);

assert.match(
    migrationSeguranca,
    /revoke\s+execute[\s\S]*from\s+anon/i,
    "Migration F1 deve revogar anon."
);

assert.match(
    migrationSeguranca,
    /revoke\s+execute[\s\S]*from\s+public/i,
    "Migration F1 deve revogar PUBLIC."
);

assert.match(
    migrationSeguranca,
    /grant\s+execute[\s\S]*to\s+service_role/i,
    "Migration F1 deve conceder somente service_role."
);

assert.match(
    migrationGeneralizacao,
    /create or replace function[\s\S]*public\.arquivar_certificado_antes_substituicao\(\)/i,
    "Generalização deve substituir a função."
);

assert.match(
    migrationGeneralizacao,
    /security definer/i,
    "Função deve continuar SECURITY DEFINER."
);

assert.match(
    migrationGeneralizacao,
    /set search_path\s*=\s*pg_catalog,\s*public/i,
    "search_path homologado deve permanecer neste gate."
);

assert.match(
    migrationGeneralizacao,
    /insert into[\s\S]*public\.certificados_historico/i,
    "Trigger deve arquivar OLD."
);

assert.match(
    migrationGeneralizacao,
    /old\.treinamento_codigo/,
    "Histórico deve preservar código antigo."
);

assert.doesNotMatch(
    migrationGeneralizacao,
    /\b14\b/,
    "Generalização não pode restringir ao código 14."
);

assert.match(
    migrationGeneralizacao,
    /before update of[\s\S]*arquivo_url,[\s\S]*url_do_arquivo/i,
    "Trigger deve observar campos físicos."
);

assert.match(
    migrationGeneralizacao,
    /old\.arquivo_url[\s\S]*is distinct from[\s\S]*new\.arquivo_url/i,
    "Troca arquivo_url deve gerar histórico."
);

assert.match(
    migrationGeneralizacao,
    /old\.url_do_arquivo[\s\S]*is distinct from[\s\S]*new\.url_do_arquivo/i,
    "Troca url_do_arquivo deve gerar histórico."
);

assert.match(
    migrationGeneralizacao,
    /revoke\s+execute[\s\S]*from\s+public/i,
    "Migration geral deve bloquear PUBLIC."
);

assert.match(
    migrationGeneralizacao,
    /revoke\s+execute[\s\S]*from\s+anon/i,
    "Migration geral deve bloquear anon."
);

assert.match(
    migrationGeneralizacao,
    /revoke\s+execute[\s\S]*from\s+authenticated/i,
    "Migration geral deve bloquear authenticated."
);

assert.match(
    migrationGeneralizacao,
    /grant\s+execute[\s\S]*to\s+service_role/i,
    "Migration geral deve preservar service_role."
);

assert.doesNotMatch(
    migrationGeneralizacao,
    /grant\s+execute[\s\S]*to\s+(anon|authenticated|public)/i,
    "Migration não pode abrir EXECUTE para clientes."
);

assert.doesNotMatch(
    migrationGeneralizacao,
    /update\s+public\.certificados\b/i,
    "Migration não pode alterar snapshots atuais."
);

assert.doesNotMatch(
    migrationGeneralizacao,
    /delete\s+from\s+public\.certificados\b/i,
    "Migration não pode excluir certificados."
);

assert.doesNotMatch(
    migrationGeneralizacao,
    /truncate\s+(table\s+)?public\.certificados\b/i,
    "Migration não pode truncar certificados."
);

console.log("");
console.log(
    "certificadosHistoricoSubstituicoesSmokeTest: OK"
);

console.log(
    "Histórico físico: TODOS os certificados."
);

console.log(
    "Storage: timestamp + randomUUID + upsert:false."
);

console.log(
    "Fluxo em massa: versão anterior preservada."
);

console.log(
    "Auditoria: atual + histórico protegidos como emUso."
);

console.log(
    "ACL: public/anon/authenticated bloqueados; service_role preservado."
);