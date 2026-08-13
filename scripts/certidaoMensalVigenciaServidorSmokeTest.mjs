import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    classificarVigenciaContratual,
} from "../supabase/functions/enviar-certidao-mensal-documental/vigencia.js";

const __dirname =
    path.dirname(
        fileURLToPath(
            import.meta.url,
        ),
    );

const repo =
    path.resolve(
        __dirname,
        "..",
    );

function classificar(
    dados,
) {
    return classificarVigenciaContratual(
        dados,
    ).classificacao;
}

assert.equal(
    classificar({
        tipoEmpresa:
            "Contratante - Idealiza Cidades",
        dataInicioContrato:
            null,
        dataFimContrato:
            null,
        competencia:
            "2026-08-01",
    }),
    "EMPRESA_NAO_FISCALIZAVEL",
);

assert.equal(
    classificar({
        tipoEmpresa:
            "Terceirizada",
        dataInicioContrato:
            null,
        dataFimContrato:
            null,
        competencia:
            "2026-08-01",
    }),
    "SEM_INICIO_CONTRATO",
);

assert.equal(
    classificar({
        tipoEmpresa:
            "Subcontratada",
        dataInicioContrato:
            "2026-05-01",
        dataFimContrato:
            "2026-04-30",
        competencia:
            "2026-05-01",
    }),
    "VIGENCIA_INVALIDA",
);

assert.equal(
    classificar({
        tipoEmpresa:
            "Subcontratada",
        dataInicioContrato:
            "2026-04-15",
        dataFimContrato:
            "2028-09-19",
        competencia:
            "2026-03-01",
    }),
    "ANTES_DO_CONTRATO",
);

assert.equal(
    classificar({
        tipoEmpresa:
            "Subcontratada",
        dataInicioContrato:
            "2026-04-15",
        dataFimContrato:
            "2028-09-19",
        competencia:
            "2026-04-01",
    }),
    "DURANTE_DO_CONTRATO",
);

assert.equal(
    classificar({
        tipoEmpresa:
            "Subcontratada",
        dataInicioContrato:
            "2026-04-15",
        dataFimContrato:
            "2028-09-19",
        competencia:
            "2028-09-01",
    }),
    "DURANTE_DO_CONTRATO",
);

assert.equal(
    classificar({
        tipoEmpresa:
            "Subcontratada",
        dataInicioContrato:
            "2026-04-15",
        dataFimContrato:
            "2028-09-19",
        competencia:
            "2028-10-01",
    }),
    "APOS_DO_CONTRATO",
);

assert.equal(
    classificarVigenciaContratual({
        tipoEmpresa:
            "Terceirizada",
        dataInicioContrato:
            "2026-01-01",
        dataFimContrato:
            null,
        competencia:
            "2030-12-01",
    }).permitida,
    true,
);

const migrationPath =
    path.join(
        repo,
        "supabase/migrations/20260806113409_certidao_mensal_vigencia_contratual_servidor.sql",
    );

const dadosPath =
    path.join(
        repo,
        "supabase/functions/enviar-certidao-mensal-documental/dados.ts",
    );

const migration =
    fs.readFileSync(
        migrationPath,
        "utf8",
    );

const dados =
    fs.readFileSync(
        dadosPath,
        "utf8",
    );

const marcadoresMigration = [
    "certidao_mensal_classificar_vigencia_contratual_valores",
    "certidao_mensal_validar_vigencia_contratual",
    "certidao_mensal_competencias_vigencia_guard",
    "certidao_mensal_itens_vigencia_guard",
    "certidao_mensal_versoes_vigencia_guard",
    "certidao_mensal_envios_vigencia_guard",
    "obter_ou_criar_competencia_certidao_mensal",
    "empresas_contrato_datas_ordem_check",
    "competencia.status <>",
    "'FECHADA'",
];

for (const marcador of marcadoresMigration) {
    assert.ok(
        migration.includes(
            marcador,
        ),
        `Marcador ausente na migration: ${marcador}`,
    );
}

assert.match(
    dados,
    /id, nome, cnpj, tipo_empresa, data_inicio_contrato, data_fim_contrato/,
);

assert.match(
    dados,
    /classificarVigenciaContratual/,
);

assert.match(
    dados,
    /new ErroHttp\(\s*409,\s*vigencia\.mensagem/,
);

const hotfixPath =
    path.join(
        repo,
        "supabase/migrations/20260806114830_certidao_mensal_restringir_execucao_vigencia.sql",
    );

const hotfix =
    fs.readFileSync(
        hotfixPath,
        "utf8",
    );

const marcadoresHotfix = [
    "from public, anon;",
    "to authenticated, service_role;",
    "from public, anon, authenticated;",
    "to service_role;",
];

for (const marcador of marcadoresHotfix) {
    assert.ok(
        hotfix.includes(
            marcador,
        ),
        `Marcador ausente na migration de segurança: ${marcador}`,
    );
}
console.log(
    "SafeScan: proteção local da vigência contratual no servidor aprovada.",
);
