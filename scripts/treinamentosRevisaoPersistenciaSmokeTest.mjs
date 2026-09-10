import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationPath = path.resolve(
    __dirname,
    "../supabase/migrations/20260908233043_20260908160200_treinamentos_revisoes_snapshot_historico.sql"
);

assert.ok(
    fs.existsSync(migrationPath),
    "Migration I1 não localizada."
);

const sql = fs.readFileSync(
    migrationPath,
    "utf8"
);

function countMatches(regex) {
    return [...sql.matchAll(regex)].length;
}

function assertContains(regex, message) {
    assert.match(
        sql,
        regex,
        message
    );
}

function assertNotContains(regex, message) {
    assert.doesNotMatch(
        sql,
        regex,
        message
    );
}

assert.ok(
    sql.length > 10000,
    "Migration parece incompleta."
);

assertContains(
    /^\s*--[\s\S]*?\nbegin;/i,
    "Migration deve iniciar transação explícita."
);

assertContains(
    /commit;\s*$/i,
    "Migration deve finalizar com COMMIT."
);

assert.equal(
    countMatches(
        /create table if not exists public\.treinamentos_revisoes\s*\(/gi
    ),
    1,
    "Deve criar exatamente uma tabela treinamentos_revisoes."
);

assert.equal(
    countMatches(
        /create table if not exists public\.treinamentos_revisao_itens\s*\(/gi
    ),
    1,
    "Deve criar exatamente uma tabela treinamentos_revisao_itens."
);

assert.equal(
    countMatches(
        /create table if not exists public\.treinamentos_revisao_evidencias\s*\(/gi
    ),
    1,
    "Deve criar exatamente uma tabela treinamentos_revisao_evidencias."
);

assertContains(
    /'revisoes-treinamentos'[\s\S]*?false[\s\S]*?'application\/pdf'/i,
    "Bucket de revisões deve ser privado e aceitar somente PDF."
);

assertNotContains(
    /'revisoes-treinamentos'[\s\S]{0,300}\btrue\b/i,
    "Bucket de revisões não pode ser público."
);

for (
    const table of [
        "treinamentos_revisoes",
        "treinamentos_revisao_itens",
        "treinamentos_revisao_evidencias",
    ]
) {
    assertContains(
        new RegExp(
            `alter table\\s+public\\.${table}\\s+enable row level security`,
            "i"
        ),
        `RLS ausente em ${table}.`
    );
}

assertContains(
    /grant\s+select\s+on\s+table[^;]*public\.treinamentos_revisoes[^;]*\bto\s+authenticated\s*;/i,
    "Authenticated deve possuir somente leitura direta do histórico."
);

assertNotContains(
    /grant\s+(?:insert|update|delete)\s+on\s+table[^;]*\bto\s+authenticated\s*;/i,
    "Authenticated não pode receber escrita direta nas tabelas de revisão."
);

assertNotContains(
    /grant\s+all\s+on\s+table[^;]*\bto\s+authenticated\s*;/i,
    "Authenticated não pode receber ALL nas tabelas de revisão."
);

assertContains(
    /private\.treinamentos_revisao_usuario_pode_acao[\s\S]*?security definer[\s\S]*?set search_path = ''/i,
    "Helper de permissão deve ser SECURITY DEFINER com search_path fixo."
);

assertContains(
    /public\.concluir_revisao_treinamentos[\s\S]*?security definer[\s\S]*?set search_path = ''/i,
    "RPC de conclusão deve ser SECURITY DEFINER com search_path fixo."
);

assertContains(
    /public\.consultar_vinculos_sha256_revisao_treinamentos[\s\S]*?security definer[\s\S]*?set search_path = ''/i,
    "RPC SHA deve ser SECURITY DEFINER com search_path fixo."
);

assertContains(
    /public\.registrar_pdf_revisao_treinamentos[\s\S]*?security definer[\s\S]*?set search_path = ''/i,
    "RPC do PDF deve ser SECURITY DEFINER com search_path fixo."
);

assertContains(
    /usuario_permissao_sistema_atual\(\)/i,
    "Permissão deve reutilizar o modelo central de permissões."
);

assertContains(
    /->\s*'modulos'\s*->\s*'treinamentos'/i,
    "Permissão deve consultar especificamente o módulo treinamentos."
);

assertContains(
    /when\s+v_acao\s*=\s*'concluir'\s+then\s+'editar'/i,
    "Conclusão deve exigir permissão EDITAR."
);

assertContains(
    /when\s+v_acao\s*=\s*'exportar'\s+then\s+'exportar'/i,
    "PDF deve exigir permissão EXPORTAR."
);

assertContains(
    /arquivo_sha256/i,
    "Revisão deve persistir SHA-256 das evidências."
);

assertContains(
    /public\.certificados_evidencias/i,
    "RPC SHA deve consultar certificados_evidencias."
);

assertContains(
    /possui_vinculo_fora_escopo/i,
    "RPC SHA deve sinalizar conflito fora do escopo."
);

assertContains(
    /outros_colaboradores_acessiveis/i,
    "RPC SHA deve separar outros colaboradores acessíveis."
);

assertContains(
    /status_temporal_revisado/i,
    "Snapshot deve separar status temporal."
);

assertContains(
    /status_integridade/i,
    "Snapshot deve separar status de integridade."
);

for (
    const estado of [
        "identidade_divergente",
        "possivel_outro_colaborador",
        "documento_incompativel",
        "treinamento_divergente",
        "vinculo_evidencia_suspeito",
        "revisao_manual_necessaria",
        "sem_evidencia_suficiente",
    ]
) {
    assertContains(
        new RegExp(
            estado,
            "i"
        ),
        `Estado de integridade ausente: ${estado}`
    );
}

assertContains(
    /foreign key\s*\(\s*revisao_item_id,\s*revisao_id\s*\)[\s\S]*?references public\.treinamentos_revisao_itens/i,
    "Evidência deve pertencer ao item e à mesma revisão."
);

assertContains(
    /unique\s*\(\s*revisao_id,\s*ordem\s*\)/i,
    "Item lógico deve ter ordem única na revisão."
);

assertContains(
    /jsonb_array_length\(\s*v_evidencias\s*\)/i,
    "Quantidade de evidências deve ser derivada do array físico."
);

assertContains(
    /v_item - 'evidencias'/i,
    "Snapshot do item não deve duplicar o array de evidências."
);

assertContains(
    /for update;/i,
    "Conclusão deve serializar o colaborador para versionamento seguro."
);

assertContains(
    /max\(\s*r\.numero_revisao\s*\)/i,
    "Número da revisão deve ser incremental por colaborador."
);

assertContains(
    /pdf_sha256/i,
    "Cabeçalho deve guardar SHA-256 do PDF emitido."
);

assertContains(
    /PDF histórico registrado e imutável/i,
    "Registro do PDF deve impedir substituição posterior."
);

assertContains(
    /storage\.objects/i,
    "Migration deve proteger o Storage."
);

assert.equal(
    countMatches(
        /create policy\s+revisoes_treinamentos_select_usuarios_autorizados/gi
    ),
    1,
    "Deve existir uma policy SELECT do bucket."
);

assert.equal(
    countMatches(
        /create policy\s+revisoes_treinamentos_insert_usuarios_autorizados/gi
    ),
    1,
    "Deve existir uma policy INSERT do bucket."
);

assertNotContains(
    /create policy\s+revisoes_treinamentos_[^\s]*update/i,
    "Bucket histórico não pode possuir policy UPDATE."
);

assertNotContains(
    /create policy\s+revisoes_treinamentos_[^\s]*delete/i,
    "Bucket histórico não pode possuir policy DELETE."
);

assertContains(
    /owner_id\s*=\s*\(\s*select\s+auth\.uid\(\)::text\s*\)/i,
    "Upload do PDF deve exigir ownership do usuário autenticado."
);

assertContains(
    /v_partes\[1\][\s\S]*?v_revisao\.colaborador_id/i,
    "Storage deve conferir colaborador no caminho."
);

assertContains(
    /v_partes\[2\][\s\S]*?v_revisao_id/i,
    "Storage deve conferir revisão no caminho."
);

assertNotContains(
    /\bdrop\s+table\b/i,
    "I1 não pode remover tabela."
);

assertNotContains(
    /\btruncate\b/i,
    "I1 não pode truncar dados."
);

assertNotContains(
    /\bdelete\s+from\s+public\./i,
    "I1 não pode excluir dados existentes."
);

const dollarFunctionCount =
    countMatches(
        /\$function\$/g
    );

assert.equal(
    dollarFunctionCount % 2,
    0,
    "Delimitadores $function$ devem estar balanceados."
);

console.log(
    "TREINAMENTOS_REVISAO_I1_TABLES_3_OK"
);

console.log(
    "TREINAMENTOS_REVISAO_I1_RLS_READONLY_OK"
);

console.log(
    "TREINAMENTOS_REVISAO_I1_RPC_CONCLUSAO_OK"
);

console.log(
    "TREINAMENTOS_REVISAO_I1_SHA_CROSS_COLABORADOR_OK"
);

console.log(
    "TREINAMENTOS_REVISAO_I1_STORAGE_PRIVATE_IMMUTABLE_OK"
);

console.log(
    "TREINAMENTOS_REVISAO_I1_PDF_SNAPSHOT_OK"
);

console.log(
    "SAFESCAN_TREINAMENTOS_REVISAO_I1_STRUCTURAL_SMOKE_OK"
);