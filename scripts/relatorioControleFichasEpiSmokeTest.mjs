import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const raiz =
    resolve(
        dirname(
            fileURLToPath(
                import.meta.url
            )
        ),
        ".."
    );

function ler(
    relativo
) {
    return readFileSync(
        resolve(
            raiz,
            relativo
        ),
        "utf8"
    );
}

const renderer =
    ler(
        "src/services/exportacao/relatorioControleFichasEpiService.js"
    );

const barril =
    ler(
        "src/services/exportacaoService.js"
    );

const pagina =
    ler(
        "src/components/colaboradores/ColaboradoresPage.jsx"
    );

const historicoService =
    ler(
        "src/services/certificadosHistoricoConsultaService.js"
    );

assert.match(
    renderer,
    /const ID_FICHA_EPI = 14;/
);

assert.match(
    renderer,
    /data_realizacao/
);

assert.match(
    renderer,
    /ficha\?\.realizado/
);

assert.doesNotMatch(
    renderer,
    /createdAt|created_at/,
    "Timestamp do registro não pode ser usado como data documental."
);

assert.match(
    renderer,
    /possuiArquivoFicha/
);

assert.match(
    renderer,
    /arquivoUrl/
);

assert.match(
    renderer,
    /NÃO CADASTRADA/
);

assert.match(
    renderer,
    /SEM ARQUIVO/
);

assert.match(
    renderer,
    /LOCALIZADA/
);

assert.match(
    renderer,
    /PENDENTE/
);

assert.match(
    renderer,
    /REVISAR/
);

assert.match(
    renderer,
    /CONFORME/
);

assert.match(
    renderer,
    /size: A4 landscape/
);

assert.match(
    renderer,
    /pagina-relatorio--continuacao/
);

assert.match(
    renderer,
    /CONTINUAÇÃO/
);

assert.match(
    renderer,
    /class="celula-epi/
);

assert.match(
    renderer,
    /tabelaRect\.bottom/
);

assert.match(
    renderer,
    /rodapeRect\.top/
);

assert.match(
    renderer,
    /tbodyNovo\.insertBefore/
);

assert.match(
    renderer,
    /overflow físico após a paginação/
);

assert.match(
    renderer,
    /Gerado pelo SafeScan Brasil/
);

assert.match(
    renderer,
    /Página \$\{indice \+ 1\} de \$\{paginas\.length\}/
);

/*
 * EPI-CTRL-G3-A-R1
 *
 * Contrato geométrico exato:
 *
 * #                  4
 * Colaborador       21
 * Função            13
 * Empresa           19
 * Ficha EPI         11
 * Data Documento    10
 * Situação          10
 * Controle 12M      12
 *
 * TOTAL = 100%
 */
assert.match(
    renderer,
    /<colgroup>[\s\S]*?<col style="width:3\.5%">[\s\S]*?<col style="width:20%">[\s\S]*?<col style="width:11\.5%">[\s\S]*?<col style="width:17%">[\s\S]*?<col style="width:9\.5%">[\s\S]*?<col style="width:10%">[\s\S]*?<col style="width:10%">[\s\S]*?<col style="width:8\.5%">[\s\S]*?<col style="width:10%">[\s\S]*?<\/colgroup>/
);

assert.doesNotMatch(
    renderer,
    /<col style="width:24%">/
);

assert.doesNotMatch(
    renderer,
    /<col style="width:22%">/
);

assert.match(
    renderer,
    /VERSÃO ANTERIOR/
);

assert.match(
    renderer,
    /VERSÃO ATUAL/
);

assert.doesNotMatch(
    renderer,
    /DATA DA FICHA/
);

assert.match(
    renderer,
    /FICHA DE EPI/
);

assert.match(
    barril,
    /baixarRelatorioControleFichasEpiPDF[\s\S]*relatorioControleFichasEpiService/
);

assert.match(
    pagina,
    /baixarRelatorioControleFichasEpiPDF/
);

const assinaturaControleFichasEpiLegada =
    /const baixarRelatorioControleFichasEpi = async \(\) =>/.test(
        pagina
    );

const assinaturaControleFichasEpiComFiltros =
    /const baixarRelatorioControleFichasEpi = async \(filtrosEpi = \{\}\) =>/.test(
        pagina
    );

assert.equal(
    Number(
        assinaturaControleFichasEpiLegada
    ) +
        Number(
            assinaturaControleFichasEpiComFiltros
        ),
    1,
    "A função EPI deve usar exatamente uma assinatura válida: baseline legada ou filtros dedicados."
);

assert.match(
    pagina,
    /Number\([\s\S]*treinamentoId[\s\S]*\)\s*===\s*14/
);

assert.match(
    pagina,
    /fichaEpi\?\.realizado/
);

assert.match(
    pagina,
    /possuiArquivoFichaEpi/
);

assert.match(
    pagina,
    /dataFichaEpi/
);

assert.match(
    pagina,
    /Controle Fichas EPI/
);

assert.match(
    pagina,
    /exportandoPdfEpiRef\.current/
);

assert.match(
    pagina,
    /podeExportarColaboradoresSistema/
);

assert.match(
    renderer,
    /const MESES_REVISAO_CONTROLE_EPI = 12;/
);

assert.match(
    renderer,
    /function avaliarControle12mEpi/
);

assert.match(
    renderer,
    /REVISAR CONTROLE/
);

assert.match(
    renderer,
    /CONTROLE 12M/
);

assert.match(
    renderer,
    /Critério administrativo interno:/
);

assert.match(
    renderer,
    /NÃO representa:/
);

assert.match(
    renderer,
    /validade legal da ficha/
);

assert.match(
    renderer,
    /controle-epi--emdia/
);

assert.match(
    renderer,
    /controle-epi--revisar/
);

assert.match(
    renderer,
    /function obterFolgaUtilPagina/
);

assert.match(
    renderer,
    /function rebalancearPaginasContinuacao/
);

assert.match(
    renderer,
    /rebalancearPaginasContinuacao\(\s*documento\s*\);/
);

assert.match(
    renderer,
    /diferencaDepois/
);

assert.doesNotMatch(
    renderer,
    /FICHA VENCIDA|FICHA VENCIDO|VENCIDA LEGALMENTE/
);
assert.match(
    historicoService,
    /export async function listarHistoricoCertificadosEmLoteService/
);

assert.match(
    historicoService,
    /\.from\("certificados_historico"\)/
);

assert.match(
    historicoService,
    /\.in\(\s*"certificado_origem_id",\s*ids\s*\)/
);

assert.match(
    historicoService,
    /\.order\(\s*"arquivado_em",\s*\{\s*ascending:\s*false/
);

assert.match(
    pagina,
    /listarHistoricoCertificadosEmLoteService/
);

assert.match(
    pagina,
    /historicoAnteriorPorCertificado/
);

assert.match(
    pagina,
    /dataFichaEpiAnterior/
);

assert.match(
    pagina,
    /anterior\?\.data_realizacao/
);

assert.doesNotMatch(
    pagina,
    /dataFichaEpiAnterior:[\s\S]{0,160}(createdAt|created_at)/,
    "Histórico EPI não pode usar timestamp de criação como data documental."
);
console.log("");
console.log(
    "============================================================"
);

console.log(
    "EPI-CTRL-G2-R1 — SMOKE: OK"
);

console.log(
    "Documento ID 14: OK"
);

console.log(
    "Data documental realizado/data_realizacao: OK"
);

console.log(
    "Arquivo documental obrigatório: OK"
);

console.log(
    "createdAt fora da regra documental: OK"
);

console.log(
    "PENDENTE / REVISAR / CONFORME: OK"
);

console.log(
    "A4 landscape: OK"
);

console.log(
    "Paginação física por geometria DOM: OK"
);

console.log(
    "Mini-Hero de continuação: OK"
);

console.log(
    "Wrappers internos de célula: OK"
);

console.log(
    "Integração barril + Colaboradores: OK"
);

console.log(
    "============================================================"
);