export default function criarControladorDadosDds({
    empresaSelecionadaChaveDds,
    obrasEmpresaSelecionadaDds,
    obterFiscalObraEmpresaDds,
    obterIdObraEmpresaDds,
    obterLiderObraEmpresaDds,
    obterNomeObraEmpresaDds,
    salvarFiscalIdealizaDdsPorEmpresa,
    salvarObrasSetorDdsPorEmpresa,
    setDadosDds,
    setFiscalIdealizaPorEmpresaDds,
    setObraSelecionadaIdDds,
    setObrasSetorPorEmpresaDds,
}) {
    function aplicarObraCadastradaDds(idObra) {
        setObraSelecionadaIdDds(idObra);

        const obra = obrasEmpresaSelecionadaDds.find((item, indice) =>
            obterIdObraEmpresaDds(item, indice) === idObra
        );

        if (!obra) return;

        const nomeObra = obterNomeObraEmpresaDds(obra);
        const fiscalObra = obterFiscalObraEmpresaDds(obra);
        const liderObra = obterLiderObraEmpresaDds(obra);

        if (nomeObra) atualizarObraSetorDds(nomeObra);
        if (fiscalObra) atualizarFiscalIdealizaDds(fiscalObra);
        if (liderObra) {
            setDadosDds((dadosAtuais) => ({
                ...dadosAtuais,
                encarregado: liderObra,
            }));
        }
    }

    function atualizarObraSetorDds(valor) {
        setDadosDds((dadosAtuais) => ({
            ...dadosAtuais,
            obraSetor: valor,
        }));

        if (empresaSelecionadaChaveDds) {
            setObrasSetorPorEmpresaDds((dadosAtuais) => {
                const atualizados = {
                    ...(dadosAtuais || {}),
                    [empresaSelecionadaChaveDds]: valor,
                };

                salvarObrasSetorDdsPorEmpresa(atualizados);
                return atualizados;
            });
        }
    }

    function atualizarFiscalIdealizaDds(valor) {
        setDadosDds((dadosAtuais) => ({
            ...dadosAtuais,
            fiscalIdealiza: valor,
        }));

        if (empresaSelecionadaChaveDds) {
            setFiscalIdealizaPorEmpresaDds((dadosAtuais) => {
                const atualizados = {
                    ...(dadosAtuais || {}),
                    [empresaSelecionadaChaveDds]: valor,
                };

                salvarFiscalIdealizaDdsPorEmpresa(atualizados);
                return atualizados;
            });
        }
    }

    function atualizarCampoDadosDds(chave, valor) {
        if (chave === "obraSetor") {
            atualizarObraSetorDds(valor);
            return;
        }

        if (chave === "fiscalIdealiza") {
            atualizarFiscalIdealizaDds(valor);
            return;
        }

        setDadosDds((dadosAtuais) => ({
            ...dadosAtuais,
            [chave]: valor,
        }));
    }

    return {
        aplicarObraCadastradaDds,
        atualizarCampoDadosDds,
    };
}
