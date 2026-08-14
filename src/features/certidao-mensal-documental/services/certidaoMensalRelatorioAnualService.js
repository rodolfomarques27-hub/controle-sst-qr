import {
    carregarDadosRelatorioAnualCertidaoMensal,
} from "./certidaoMensalRelatorioAnualDataService.js";
import {
    gerarHtmlRelatorioAnualCertidaoMensal,
} from "./certidaoMensalRelatorioAnualHtmlService.js";
import {
    agruparRelatorioAnualPorObras,
    resolverContratanteCabecalhoRelatorioAnual,
} from "./certidaoMensalRelatorioAnualObrasService.js";

function escreverDocumentoJanela(janela, html) {
    janela.document.open();
    janela.document.write(html);
    janela.document.close();
}

async function aguardarImagensJanela(janela, limiteMs = 2500) {
    const imagens = Array.from(janela.document.images || []);

    if (imagens.length === 0) {
        return;
    }

    await Promise.race([
        Promise.all(
            imagens.map((imagem) => {
                if (imagem.complete) {
                    return Promise.resolve();
                }

                return new Promise((resolver) => {
                    imagem.addEventListener("load", resolver, { once: true });
                    imagem.addEventListener("error", resolver, { once: true });
                });
            }),
        ),
        new Promise((resolver) => {
            janela.setTimeout(resolver, limiteMs);
        }),
    ]);
}

export async function imprimirRelatorioAnualCertidaoMensal({
    janela = null,
    ano,
    empresas,
    colaboradores = [],
    empresasBanco = [],
    obrasEmpresasBanco = [],
    clienteSupabase = null,
    agora = new Date(),
    imprimirAutomaticamente = true,
} = {}) {
    const janelaRelatorio = janela || (
        typeof window !== "undefined"
            ? window.open("", "_blank")
            : null
    );

    if (!janelaRelatorio) {
        throw new Error(
            "Libere os pop-ups para gerar o relatório anual.",
        );
    }

    const dados = await carregarDadosRelatorioAnualCertidaoMensal({
        ano,
        empresas,
        colaboradores,
        empresasBanco,
        obrasEmpresasBanco,
        clienteSupabase,
        agora,
    });

    const obras =
        agruparRelatorioAnualPorObras({
            relatorio:
                dados,

            empresasBanco,

            obrasEmpresasBanco,
        });

    const contratanteCabecalho =
        resolverContratanteCabecalhoRelatorioAnual({
            empresasBanco,
        });

    const dadosComObras = {
        ...dados,
        obras,
        contratanteCabecalho,
    };

    escreverDocumentoJanela(
        janelaRelatorio,
        gerarHtmlRelatorioAnualCertidaoMensal(dadosComObras),
    );

    await aguardarImagensJanela(janelaRelatorio);

    if (imprimirAutomaticamente) {
        janelaRelatorio.focus();
        janelaRelatorio.print();
    }

    return dadosComObras;
}

export {
    gerarHtmlRelatorioAnualCertidaoMensal,
};
