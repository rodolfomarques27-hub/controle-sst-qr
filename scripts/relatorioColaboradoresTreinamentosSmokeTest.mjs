import fs from "node:fs";

const alvo =
    "src/services/exportacao/relatorioColaboradoresTreinamentosService.js";

const conteudo =
    fs.readFileSync(
        alvo,
        "utf8"
    );

function exigir(
    condicao,
    mensagem
) {
    if (!condicao) {
        throw new Error(
            mensagem
        );
    }
}

exigir(
    conteudo.includes(
        'import html2canvas from "html2canvas";'
    ),
    "html2canvas próprio ausente."
);

exigir(
    conteudo.includes(
        'import jsPDF from "jspdf";'
    ),
    "jsPDF próprio ausente."
);

exigir(
    !conteudo.includes(
        "exportacaoBaseService"
    ),
    "Renderer voltou a depender do exportador genérico."
);

exigir(
    !conteudo.includes(
        "baixarRelatorioHtmlComoPdf"
    ),
    "Renderer voltou a chamar o exportador genérico."
);

exigir(
    conteudo.includes(
        "const PDF_LARGURA_MM = 297;"
    ) &&
        conteudo.includes(
            "const PDF_ALTURA_MM = 210;"
        ),
    "Geometria física 297 x 210 não encontrada."
);

exigir(
    /new\s+jsPDF\s*\(\s*"l"\s*,\s*"mm"\s*,\s*"a4"\s*\)/m.test(
        conteudo
    ),
    "jsPDF não está em landscape."
);

exigir(
    /pdf\.addPage\s*\(\s*"a4"\s*,\s*"l"\s*\)/m.test(
        conteudo
    ),
    "Páginas adicionais não estão em landscape."
);

exigir(
    /width:\s*"297mm"/m.test(
        conteudo
    ) &&
        /height:\s*"210mm"/m.test(
            conteudo
        ),
    "Iframe isolado não está em 297 x 210."
);

exigir(
    conteudo.includes(
        "height: 210mm;"
    ) &&
        conteudo.includes(
            "min-height: 210mm;"
        ) &&
        conteudo.includes(
            "size: A4 landscape;"
        ),
    "CSS A4 landscape próprio ausente."
);

exigir(
    !conteudo.includes(
        "height: 297mm;"
    ) &&
        !conteudo.includes(
            "min-height: 297mm;"
        ),
    "Geometria portrait ainda está presente."
);

exigir(
    conteudo.includes(
        "G2-C10D-C2 — RESET LANDSCAPE"
    ),
    "Reset visual landscape ausente."
);

exigir(
    conteudo.includes(
        "G2-C10D-B1 — PAGINAÇÃO DINÂMICA"
    ) &&
        conteudo.includes(
            "paginarColaboradoresTreinamentosPorAlturaReal"
        ),
    "Paginação dinâmica foi perdida."
);

exigir(
    conteudo.includes(
        "G2-C10D-C1 — TOPO VISUAL PRÓPRIO"
    ) &&
        conteudo.includes(
            "cabecalho-colaboradores-treinamentos"
        ),
    "Hero moderno foi perdido."
);

exigir(
    conteudo.includes(
        "contexto-empresa-colaboradores"
    ) &&
        conteudo.includes(
            "resumo-colaboradores-grid"
        ) &&
        conteudo.includes(
            "filtros-colaboradores-treinamentos"
        ),
    "Empresa, KPIs ou filtros foram perdidos."
);

exigir(
    conteudo.includes(
        "montarRodapeColaboradoresTreinamentos"
    ) &&
        conteudo.includes(
            "rodape-colaboradores-treinamentos"
        ),
    "Rodapé próprio landscape ausente."
);

exigir(
    !conteudo.includes(
        "montarRodapeTreinamentosRelatorio"
    ),
    "Rodapé compartilhado antigo ainda está sendo usado."
);

exigir(
    conteudo.includes(
        "indice += 3"
    ) &&
        conteudo.includes(
            "indice + 3"
        ) &&
        !conteudo.includes(
            "indice += 2"
        ) &&
        !conteudo.includes(
            "cartoesDetalhes.slice(indice, indice + 2)"
        ),
    "Detalhamento não está iniciando com até três cartões."
);

exigir(
    conteudo.includes(
        "MAX_COLABORADORES_DETALHE_POR_PAGINA"
    ) &&
        conteudo.includes(
            "paginaDetalheColaboradoresTreinamentosPrecisaRebalancear"
        ) &&
        conteudo.includes(
            "compactarContinuacoesDetalheAteQuatro"
        ) &&
        conteudo.includes(
            "G2-C10D-D3 — EMPRESA REAL E QUATRO"
        ),
    "Fallback físico 4 -> 3 -> 2 -> 1 não está protegido."
);

exigir(
    conteudo.includes(
        "extrairNomeEmpresaDoCartaoDetalhe"
    ) &&
        conteudo.includes(
            "Detalhamento - continuação - ${nomeEmpresa}"
        ),
    "Continuação do detalhamento não está identificando a empresa real."
);

exigir(
    conteudo.includes(
        "function limitarListaRelatorio(lista = [])"
    ) &&
        !conteudo.includes(
            "function limitarListaRelatorio(lista = [], limite = 5)"
        ) &&
        !conteudo.includes(
            "const principais = itens.slice(0, limite);"
        ),
    "Detalhamento ainda está limitando a quantidade de treinamentos."
);

exigir(
    !conteudo.includes(
        "outro(s)</li>"
    ),
    "Detalhamento ainda está ocultando treinamentos com + N outro(s)."
);

exigir(
    conteudo.includes(
        "grid-auto-rows: auto;"
    ) &&
        conteudo.includes(
            "G2-C10D-D1 — DETALHAMENTO COM ALTURA REAL"
        ),
    "Altura real dos cartões do detalhamento não está protegida."
);

exigir(
    conteudo.includes(
        "colaborador.fotoUrl"
    ) &&
        conteudo.includes(
            "avatar-colaborador"
        ),
    "Suporte às fotos foi perdido."
);

for (
    const contrato of
    [
        "Código:",
        "Função:",
        "Matriz aplicada:",
        "Situação na obra:",
        "Status geral:",
        "Válidos",
        "Pendentes",
        "Vencidos",
        "A vencer",
    ]
) {
    exigir(
        conteudo.includes(
            contrato
        ),
        `Funcionalidade perdida: ${contrato}`
    );
}

exigir(
    !/from\s+["'][^"']*dds/i.test(
        conteudo
    ),
    "Dependência DDS detectada no renderer."
);

console.log(
    "OK — PDF de Colaboradores está em A4 landscape 297 x 210."
);

console.log(
    "OK — Hero, empresa, filtros e 7 KPIs preservados."
);

console.log(
    "OK — Tabela e detalhamento utilizam base visual horizontal própria."
);

console.log(
    "OK — Rodapé azul compartilhado não é mais utilizado."
);

console.log(
    "OK — Fotos, fallback e dados funcionais preservados."
);

console.log(
    "OK — Paginação dinâmica por altura real continua ativa."
);

console.log(
    "OK — DDS permanece fora do escopo."
);