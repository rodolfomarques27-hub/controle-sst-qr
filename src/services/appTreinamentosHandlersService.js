import {
    atualizarDatasCertificadoCrud,
    excluirCertificadoTreinamentoCrud,
    gerarUrlVisualizacaoCertificado,
    salvarCertificadoTreinamentoCrud,
} from "./certificadosCrudService";
import {
    excluirArquivoStorageAuditoriaService,
    listarArquivosCertificadosStorageService,
    sincronizarCertificadosDoStorageService,
} from "./storageAuditoriaService";
import { obterTreinamento, treinamentoSemValidade } from "./colaboradorDocumentosService";


function converterStatusVerificacaoParaStatusCertificado(statusVerificacao = "") {
    const status = String(statusVerificacao || "").trim().toLowerCase();

    if (status === "aprovado") return "Aprovado";
    if (status === "atencao") return "Atenção";
    if (status === "revisao_manual") return "Revisão manual";
    if (status === "suspeito") return "Suspeito";
    if (status === "bloqueado") return "Bloqueado";
    if (status === "erro") return "Erro na verificação";

    return "Pendente de verificação";
}

function localizarColaboradorParaVerificacao({ certificado = {}, certificadoNormalizado = {}, colaboradores = [], colaboradorSelecionado = null } = {}) {
    return (
        colaboradores.find((colaborador) => String(colaborador.id) === String(certificadoNormalizado.colaboradorId || certificado.colaborador_id || certificado.colaboradorId || "")) ||
        colaboradores.find((colaborador) => String(colaborador.codigoFuncionario) === String(certificado.colaboradorCodigo || certificado.colaborador?.codigoFuncionario || "")) ||
        colaboradores.find((colaborador) => String(colaborador.id) === String(certificado.colaborador?.id || "")) ||
        colaboradorSelecionado ||
        certificado.colaborador ||
        {}
    );
}

function atualizarCertificadoNosEstados({ setColaboradores, setColaboradorSelecionado, certificadoAtualizado }) {
    setColaboradores((atual) =>
        atual.map((colaborador) => {
            if (String(colaborador.id) !== String(certificadoAtualizado.colaboradorId)) return colaborador;

            return {
                ...colaborador,
                treinamentos: (colaborador.treinamentos || []).map((item) =>
                    item.id === certificadoAtualizado.id ? { ...item, ...certificadoAtualizado } : item
                ),
            };
        })
    );

    setColaboradorSelecionado((atual) => {
        if (!atual || String(atual.id) !== String(certificadoAtualizado.colaboradorId)) return atual;

        return {
            ...atual,
            treinamentos: (atual.treinamentos || []).map((item) =>
                item.id === certificadoAtualizado.id ? { ...item, ...certificadoAtualizado } : item
            ),
        };
    });
}

async function executarVerificacaoCertificadoSemBloquearFluxo({
    supabase,
    certificado,
    certificadoNormalizado,
    colaboradores,
    colaboradorSelecionado,
    setColaboradores,
    setColaboradorSelecionado,
}) {
    try {
        const { verificarCertificadoTreinamento } = await import("./documentosVerificacaoService");

        const treinamentoId = Number(certificadoNormalizado.treinamentoId || certificado.treinamentoId || certificado.treinamento_codigo || 0);
        const treinamento = obterTreinamento(treinamentoId) || {
            id: treinamentoId || null,
            nome: certificadoNormalizado.nomeTreinamento || certificado.nome_treinamento || certificado.tipo_treinamento || "",
        };
        const colaborador = localizarColaboradorParaVerificacao({
            certificado,
            certificadoNormalizado,
            colaboradores,
            colaboradorSelecionado,
        });

        const certificadoParaVerificacao = {
            ...certificado,
            id: certificadoNormalizado.id,
            colaborador_id: certificadoNormalizado.colaboradorId || certificado.colaborador_id || certificado.colaboradorId || colaborador.id || null,
            colaboradorId: certificadoNormalizado.colaboradorId || certificado.colaboradorId || colaborador.id || null,
            treinamento_codigo: treinamentoId || certificado.treinamentoId || null,
            treinamentoId: treinamentoId || certificado.treinamentoId || null,
            tipo_treinamento: certificadoNormalizado.nomeTreinamento || certificado.tipo_treinamento || treinamento.nome || "",
            nome_treinamento: certificadoNormalizado.nomeTreinamento || certificado.nome_treinamento || treinamento.nome || "",
            data_realizacao: certificadoNormalizado.realizado || certificadoNormalizado.dataRealizacao || certificado.dataRealizacao || certificado.data_realizacao || "",
            dataRealizacao: certificadoNormalizado.realizado || certificadoNormalizado.dataRealizacao || certificado.dataRealizacao || certificado.data_realizacao || "",
            data_vencimento: certificadoNormalizado.vencimento || certificadoNormalizado.dataVencimento || certificado.dataVencimento || certificado.data_vencimento || "",
            dataVencimento: certificadoNormalizado.vencimento || certificadoNormalizado.dataVencimento || certificado.dataVencimento || certificado.data_vencimento || "",
            arquivo_url: certificadoNormalizado.arquivoUrl || certificado.arquivo_url || certificado.arquivoUrl || "",
            arquivoUrl: certificadoNormalizado.arquivoUrl || certificado.arquivoUrl || certificado.arquivo_url || "",
            arquivo_nome: certificadoNormalizado.arquivoNome || certificado.arquivoNome || certificado.arquivo_nome || certificado.arquivo?.name || "",
            arquivoNome: certificadoNormalizado.arquivoNome || certificado.arquivoNome || certificado.arquivo_nome || certificado.arquivo?.name || "",
            observacao: certificado.observacao || certificadoNormalizado.observacao || null,
        };

        const verificacao = await verificarCertificadoTreinamento({
            supabase,
            certificado: certificadoParaVerificacao,
            colaborador,
            treinamento,
            arquivo: certificado.arquivo || null,
            registrosExistentes: [],
            usuario: null,
            salvarResultado: true,
            exigeVencimento: !treinamentoSemValidade(treinamentoId),
        });

        const statusValidacao = converterStatusVerificacaoParaStatusCertificado(verificacao?.statusVerificacao);

        const { error } = await supabase
            .from("certificados")
            .update({ status_validacao: statusValidacao })
            .eq("id", certificadoNormalizado.id);

        if (error) {
            throw new Error(`Erro ao atualizar status da verificação documental do certificado: ${error.message}`);
        }

        const certificadoAtualizado = {
            ...certificadoNormalizado,
            statusValidacao,
            status_validacao: statusValidacao,
        };

        atualizarCertificadoNosEstados({
            setColaboradores,
            setColaboradorSelecionado,
            certificadoAtualizado,
        });

        return certificadoAtualizado;
    } catch (error) {
        console.warn("Verificação documental não bloqueou o salvamento do certificado:", error?.message || error);

        try {
            await supabase
                .from("certificados")
                .update({ status_validacao: "Erro na verificação" })
                .eq("id", certificadoNormalizado.id);

            atualizarCertificadoNosEstados({
                setColaboradores,
                setColaboradorSelecionado,
                certificadoAtualizado: {
                    ...certificadoNormalizado,
                    statusValidacao: "Erro na verificação",
                    status_validacao: "Erro na verificação",
                },
            });
        } catch (erroAtualizacao) {
            console.warn("Não foi possível marcar erro na verificação documental do certificado:", erroAtualizacao?.message || erroAtualizacao);
        }

        return certificadoNormalizado;
    }
}


export async function sincronizarCertificadosDoStorageAppService({
    supabase,
    colaboradores,
    dataReferencia,
    carregarColaboradores,
    setErroBanco,
    setCarregandoBanco,
}) {
    setErroBanco("");
    setCarregandoBanco(true);

    try {
        const mensagem = await sincronizarCertificadosDoStorageService({
            supabase,
            colaboradores,
            dataReferencia,
        });

        await carregarColaboradores();

        return mensagem;
    } catch (error) {
        setErroBanco(error.message || "Erro ao sincronizar arquivos do Storage.");
        return error.message || "Erro ao sincronizar arquivos do Storage.";
    } finally {
        setCarregandoBanco(false);
    }
}

export async function listarArquivosCertificadosStorageAppService({
    colaboradores,
    empresasBanco,
    setErroBanco,
}) {
    setErroBanco("");

    try {
        return await listarArquivosCertificadosStorageService({
            colaboradores,
            empresasBanco,
        });
    } catch (error) {
        setErroBanco(error.message || "Erro ao listar arquivos do Storage.");
        alert(error.message || "Erro ao listar arquivos do Storage.");
        return [];
    }
}

export async function excluirArquivoCertificadoStorageAppService({
    supabase,
    arquivo,
    registrarAuditoria,
    setErroBanco,
}) {
    setErroBanco("");

    if (!arquivo?.caminho) {
        alert("Arquivo inválido para exclusão.");
        return false;
    }

    if (arquivo.emUso) {
        alert(`Este arquivo está em uso em: ${arquivo.origemTipo || arquivo.tabelaOrigem || "base do sistema"}. Para evitar quebrar o histórico, exclua primeiro o registro vinculado.`);
        return false;
    }

    const confirmado = window.confirm(
        `Excluir definitivamente este arquivo do Storage?\n\nBucket: ${arquivo.bucket || "certificados-treinamentos"}\nArquivo: ${arquivo.nome}\nPasta: ${arquivo.pasta || "raiz"}`
    );

    if (!confirmado) return false;

    try {
        await excluirArquivoStorageAuditoriaService({
            supabase,
            arquivo,
        });

        await registrarAuditoria("DELETE_STORAGE", arquivo.bucket || "storage", `Excluiu arquivo sem registro do Storage: ${arquivo.nome}`, arquivo.caminho, {
            bucket: arquivo.bucket || "",
            caminho: arquivo.caminho,
            pasta: arquivo.pasta || "",
            nome: arquivo.nome,
            origemTipo: arquivo.origemTipo || "",
            tabelaOrigem: arquivo.tabelaOrigem || "",
            colaboradorNome: arquivo.colaboradorNome || "",
            colaboradorCodigo: arquivo.colaboradorCodigo || "",
            colaboradorEmpresa: arquivo.colaboradorEmpresa || "",
            empresaNome: arquivo.empresaNome || "",
            empresaCnpj: arquivo.empresaCnpj || "",
            tipoDocumentoEmpresa: arquivo.tipoDocumentoEmpresa || "",
        });

        return true;
    } catch (error) {
        setErroBanco(error.message || "Erro ao excluir arquivo do Storage.");
        alert(error.message || "Erro ao excluir arquivo do Storage.");
        return false;
    }
}

export async function salvarCertificadoTreinamentoAppService({
    supabase,
    certificado,
    colaboradores,
    colaboradorSelecionado,
    carregarColaboradores,
    setErroBanco,
    setColaboradores,
    setColaboradorSelecionado,
}) {
    setErroBanco("");

    try {
        const certificadoNormalizado = await salvarCertificadoTreinamentoCrud({
            supabase,
            certificado,
            colaboradores,
            colaboradorSelecionado,
        });

        setColaboradores((atual) =>
            atual.map((colaborador) => {
                if (String(colaborador.id) !== String(certificadoNormalizado.colaboradorId)) return colaborador;

                const demais = (colaborador.treinamentos || []).filter(
                    (item) => Number(item.treinamentoId) !== Number(certificadoNormalizado.treinamentoId)
                );

                return {
                    ...colaborador,
                    treinamentos: [certificadoNormalizado, ...demais],
                };
            })
        );

        setColaboradorSelecionado((atual) => {
            if (!atual || String(atual.id) !== String(certificadoNormalizado.colaboradorId)) return atual;

            const demais = (atual.treinamentos || []).filter(
                (item) => Number(item.treinamentoId) !== Number(certificadoNormalizado.treinamentoId)
            );

            return {
                ...atual,
                treinamentos: [certificadoNormalizado, ...demais],
            };
        });

        executarVerificacaoCertificadoSemBloquearFluxo({
            supabase,
            certificado,
            certificadoNormalizado,
            colaboradores,
            colaboradorSelecionado,
            setColaboradores,
            setColaboradorSelecionado,
        });

        await carregarColaboradores();

        return true;
    } catch (error) {
        setErroBanco(error.message || "Erro ao salvar certificado.");
        alert(error.message || "Erro ao salvar certificado.");
        return false;
    }
}

export async function atualizarDatasCertificadoAppService({
    supabase,
    certificado,
    datas,
    carregarColaboradores,
    setErroBanco,
    setColaboradores,
    setColaboradorSelecionado,
}) {
    setErroBanco("");

    try {
        const atualizado = await atualizarDatasCertificadoCrud({
            supabase,
            certificado,
            datas,
        });

        setColaboradores((atual) =>
            atual.map((colaborador) => {
                if (String(colaborador.id) !== String(atualizado.colaboradorId)) return colaborador;

                return {
                    ...colaborador,
                    treinamentos: (colaborador.treinamentos || []).map((item) =>
                        item.id === atualizado.id ? atualizado : item
                    ),
                };
            })
        );

        setColaboradorSelecionado((atual) => {
            if (!atual || String(atual.id) !== String(atualizado.colaboradorId)) return atual;

            return {
                ...atual,
                treinamentos: (atual.treinamentos || []).map((item) =>
                    item.id === atualizado.id ? atualizado : item
                ),
            };
        });

        const dataRealizacaoAtualizada = atualizado.realizado || atualizado.dataRealizacao || atualizado.data_realizacao || datas.realizado || certificado.realizado || certificado.dataRealizacao || certificado.data_realizacao || "";
        const dataVencimentoAtualizada = atualizado.vencimento || atualizado.dataVencimento || atualizado.data_vencimento || datas.vencimento || certificado.vencimento || certificado.dataVencimento || certificado.data_vencimento || "";
        const treinamentoIdAtualizado = Number(atualizado.treinamentoId || certificado.treinamentoId || certificado.treinamento_codigo || 0);
        const treinamentoAtualizado = certificado.treinamento || obterTreinamento(treinamentoIdAtualizado) || {
            id: treinamentoIdAtualizado || null,
            nome: atualizado.nomeTreinamento || certificado.nomeTreinamento || certificado.nome_treinamento || certificado.tipo_treinamento || "",
        };
        const colaboradorAtualizado = certificado.colaborador || certificado.colaborador_dados || null;

        await executarVerificacaoCertificadoSemBloquearFluxo({
            supabase,
            certificado: {
                ...certificado,
                ...atualizado,
                colaborador: colaboradorAtualizado || certificado.colaborador || {},
                treinamento: treinamentoAtualizado,
                treinamentoId: treinamentoIdAtualizado || atualizado.treinamentoId || certificado.treinamentoId || null,
                treinamento_codigo: treinamentoIdAtualizado || certificado.treinamento_codigo || null,
                tipo_treinamento: atualizado.nomeTreinamento || certificado.nomeTreinamento || certificado.nome_treinamento || certificado.tipo_treinamento || treinamentoAtualizado.nome || "",
                nome_treinamento: atualizado.nomeTreinamento || certificado.nomeTreinamento || certificado.nome_treinamento || certificado.tipo_treinamento || treinamentoAtualizado.nome || "",
                dataRealizacao: dataRealizacaoAtualizada,
                data_realizacao: dataRealizacaoAtualizada,
                dataVencimento: dataVencimentoAtualizada,
                data_vencimento: dataVencimentoAtualizada,
                realizado: dataRealizacaoAtualizada,
                vencimento: dataVencimentoAtualizada,
            },
            certificadoNormalizado: {
                ...atualizado,
                treinamentoId: treinamentoIdAtualizado || atualizado.treinamentoId || certificado.treinamentoId || null,
                nomeTreinamento: atualizado.nomeTreinamento || certificado.nomeTreinamento || certificado.nome_treinamento || certificado.tipo_treinamento || treinamentoAtualizado.nome || "",
                dataRealizacao: dataRealizacaoAtualizada,
                data_realizacao: dataRealizacaoAtualizada,
                dataVencimento: dataVencimentoAtualizada,
                data_vencimento: dataVencimentoAtualizada,
                realizado: dataRealizacaoAtualizada,
                vencimento: dataVencimentoAtualizada,
            },
            colaboradores: colaboradorAtualizado ? [colaboradorAtualizado] : [],
            colaboradorSelecionado: colaboradorAtualizado || null,
            setColaboradores,
            setColaboradorSelecionado,
        });

        await carregarColaboradores();

        return true;
    } catch (error) {
        setErroBanco(error.message || "Erro ao atualizar datas do certificado.");
        alert(error.message || "Erro ao atualizar datas do certificado.");
        return false;
    }
}

export async function visualizarCertificadoTreinamentoAppService({
    supabase,
    certificado,
    setErroBanco,
}) {
    setErroBanco("");

    try {
        const signedUrl = await gerarUrlVisualizacaoCertificado({
            supabase,
            certificado,
            expiracaoSegundos: 60 * 10,
        });

        window.open(signedUrl, "_blank", "noopener,noreferrer");
        return true;
    } catch (error) {
        setErroBanco(error.message || "Erro ao gerar link do certificado.");
        return false;
    }
}

export async function excluirCertificadoTreinamentoAppService({
    supabase,
    certificado,
    setErroBanco,
    setColaboradores,
}) {
    const treinamento = obterTreinamento(certificado.treinamentoId);
    const confirmar = window.confirm(`Deseja excluir o certificado ${treinamento.nome}?`);

    if (!confirmar) return false;

    setErroBanco("");

    try {
        await excluirCertificadoTreinamentoCrud({
            supabase,
            certificado,
        });

        setColaboradores((atual) =>
            atual.map((colaborador) => {
                if (String(colaborador.id) !== String(certificado.colaboradorId)) return colaborador;

                return {
                    ...colaborador,
                    treinamentos: (colaborador.treinamentos || []).filter((item) => item.id !== certificado.id),
                };
            })
        );

        return true;
    } catch (error) {
        setErroBanco(error.message || "Erro ao excluir certificado.");
        alert(error.message || "Erro ao excluir certificado.");
        return false;
    }
}
