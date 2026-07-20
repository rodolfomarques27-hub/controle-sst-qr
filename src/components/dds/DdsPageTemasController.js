export default function criarControladorTemasDds({
    criarTemasEditaveisDds,
    dadosDds,
    normalizarTemasDdsEditaveis,
    normalizarTextoTemaDds,
    setTemasDdsEditaveis,
}) {
    function atualizarTemaDiaDds(indiceDia, campo, valor) {
        setTemasDdsEditaveis((temasAtuais) => {
            const atualizados = criarTemasEditaveisDds().map((temaPadrao, indice) => ({
                ...temaPadrao,
                ...(temasAtuais[indice] || {}),
            }));

            atualizados[indiceDia] = {
                ...(atualizados[indiceDia] || {}),
                [campo]: valor,
            };

            return atualizados;
        });
    }

    function alternarDiaSemAtividadeDds(indiceDia) {
        setTemasDdsEditaveis((temasAtuais) => {
            const atualizados = normalizarTemasDdsEditaveis(temasAtuais);
            const atual = atualizados[indiceDia] || {
                tema: "",
                responsavel: "",
            };
            const semAtividadeAtual =
                normalizarTextoTemaDds(atual.tema) ===
                "NAO HOUVE ATIVIDADES";

            atualizados[indiceDia] = semAtividadeAtual
                ? {
                    tema: "",
                    responsavel: "",
                }
                : {
                    tema: "NÃO HOUVE ATIVIDADES",
                    responsavel: "",
                };

            return atualizados;
        });
    }

    function aplicarResponsavelGeralTemasDds() {
        const responsavelGeral = String(
            dadosDds.responsavel || ""
        ).trim();

        if (!responsavelGeral) {
            window.alert(
                "O responsável geral do DDS não está preenchido."
            );
            return;
        }

        setTemasDdsEditaveis((temasAtuais) =>
            normalizarTemasDdsEditaveis(temasAtuais).map((item) => {
                const semAtividade =
                    normalizarTextoTemaDds(item.tema) ===
                    "NAO HOUVE ATIVIDADES";

                return semAtividade
                    ? item
                    : {
                        ...item,
                        responsavel: responsavelGeral,
                    };
            })
        );
    }

    function limparResponsaveisTemasDds() {
        setTemasDdsEditaveis((temasAtuais) =>
            normalizarTemasDdsEditaveis(temasAtuais).map((item) => ({
                ...item,
                responsavel: "",
            }))
        );
    }

    return {
        alternarDiaSemAtividadeDds,
        aplicarResponsavelGeralTemasDds,
        atualizarTemaDiaDds,
        limparResponsaveisTemasDds,
    };
}
