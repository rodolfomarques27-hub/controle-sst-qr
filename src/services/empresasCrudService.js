import { normalizarStatusEmpresa } from "./empresaDocumentosService";
import { normalizarTextoBusca } from "../utils/sstUtils";

const EMPRESA_SELECT = "id, nome, cnpj, responsavel, email, telefone, responsavel_auditoria, email_auditoria, whatsapp_auditoria, receber_auditoria, status, tipo_empresa, logo_url, logo_nome, contrato_url, contrato_nome, numero_contrato, data_inicio_contrato, data_fim_contrato, responsavel_contratante, tst_responsavel, tst_email, tst_whatsapp, escopo_servico, observacao_status, empresa_pai_id";

async function removerArquivoEmpresaSemBloquear({
    supabase,
    bucket,
    caminhoArquivo,
    contexto,
}) {
    if (!caminhoArquivo) return true;

    try {
        const { error } = await supabase.storage
            .from(bucket)
            .remove([caminhoArquivo]);

        if (error) {
            throw error;
        }

        return true;
    } catch (error) {
        console.warn(
            contexto,
            error?.message || error
        );

        return false;
    }
}

async function excluirEmpresaCriadaSemBloquear({
    supabase,
    empresaId,
}) {
    if (!empresaId) return true;

    try {
        const { data, error } = await supabase.rpc(
            "excluir_empresa_segura",
            {
                p_empresa_id: empresaId,
            }
        );

        if (error) {
            throw error;
        }

        if (!data?.ok) {
            throw new Error(
                data?.mensagem ||
                "A empresa criada não pôde ser removida."
            );
        }

        return true;
    } catch (error) {
        console.warn(
            "Não foi possível remover a empresa criada após falha no cadastro:",
            error?.message || error
        );

        return false;
    }
}

export async function adicionarEmpresaCrud({
    supabase,
    novaEmpresa,
    empresasBanco = [],
    enviarLogoEmpresa,
    enviarContratoEmpresa,
}) {
    const existente = empresasBanco.find(
        (empresa) => empresa.nome.toLowerCase() === novaEmpresa.nome.toLowerCase()
    );

    if (existente) {
        throw new Error("Essa empresa já está cadastrada.");
    }

    let empresaCriada = null;
    let caminhoLogoNovoPendente = "";
    let caminhoContratoNovoPendente = "";

    try {
        const {
            data: empresaInserida,
            error: erroInsercao,
        } = await supabase
            .from("empresas")
            .insert({
                nome: novaEmpresa.nome,
                cnpj: novaEmpresa.cnpj || null,
                responsavel: novaEmpresa.responsavel || null,
                email: novaEmpresa.email || null,
                telefone: novaEmpresa.telefone || null,
                responsavel_auditoria: novaEmpresa.responsavelAuditoria || null,
                email_auditoria: novaEmpresa.emailAuditoria || null,
                whatsapp_auditoria: novaEmpresa.whatsappAuditoria || null,
                receber_auditoria: novaEmpresa.receberAuditoria !== false,
                tipo_empresa: novaEmpresa.tipoEmpresa || "Terceirizada",
                empresa_pai_id: novaEmpresa.empresaPaiId || null,
                status: "Empresa ativa",
                numero_contrato: novaEmpresa.numeroContrato || null,
                data_inicio_contrato: novaEmpresa.dataInicioContrato || null,
                data_fim_contrato: novaEmpresa.dataFimContrato || null,
                responsavel_contratante: novaEmpresa.responsavelContratante || null,
                tst_responsavel: novaEmpresa.tstResponsavel || null,
                tst_email: novaEmpresa.tstEmail || null,
                tst_whatsapp: novaEmpresa.tstWhatsapp || null,
                escopo_servico: novaEmpresa.escopoServico || null,
                observacao_status: novaEmpresa.observacaoStatus || null,
            })
            .select(EMPRESA_SELECT)
            .single();

        if (erroInsercao) {
            throw new Error(
                `Erro ao cadastrar empresa: ${erroInsercao.message}`
            );
        }

        empresaCriada = empresaInserida;

        if (
            novaEmpresa.logo ||
            novaEmpresa.contratoArquivo
        ) {
            const atualizacaoArquivos = {};

            if (novaEmpresa.logo) {
                const logo = await enviarLogoEmpresa(
                    novaEmpresa.logo,
                    empresaCriada.id
                );

                caminhoLogoNovoPendente =
                    logo.logoUrl || "";

                atualizacaoArquivos.logo_url =
                    logo.logoUrl;

                atualizacaoArquivos.logo_nome =
                    logo.logoNome;
            }

            if (novaEmpresa.contratoArquivo) {
                const contrato = await enviarContratoEmpresa(
                    novaEmpresa.contratoArquivo,
                    empresaCriada.id
                );

                caminhoContratoNovoPendente =
                    contrato.contratoUrl || "";

                atualizacaoArquivos.contrato_url =
                    contrato.contratoUrl;

                atualizacaoArquivos.contrato_nome =
                    contrato.contratoNome;
            }

            const {
                data: empresaComArquivos,
                error: arquivosError,
            } = await supabase
                .from("empresas")
                .update(atualizacaoArquivos)
                .eq("id", empresaCriada.id)
                .select(EMPRESA_SELECT)
                .single();

            if (arquivosError) {
                throw new Error(
                    `Empresa cadastrada, mas houve erro ao salvar arquivos: ${arquivosError.message}`
                );
            }

            empresaCriada =
                empresaComArquivos;

            caminhoLogoNovoPendente = "";
            caminhoContratoNovoPendente = "";
        }

        return empresaCriada;
    } catch (error) {
        const [
            logoNovoRemovido,
            contratoNovoRemovido,
        ] = await Promise.all([
            removerArquivoEmpresaSemBloquear({
                supabase,
                bucket: "logos-empresas",
                caminhoArquivo: caminhoLogoNovoPendente,
                contexto:
                    "Não foi possível remover o novo logo após falha no cadastro da empresa:",
            }),
            removerArquivoEmpresaSemBloquear({
                supabase,
                bucket: "contratos-empresas",
                caminhoArquivo: caminhoContratoNovoPendente,
                contexto:
                    "Não foi possível remover o novo contrato após falha no cadastro da empresa:",
            }),
        ]);

        const empresaCriadaRemovida =
            await excluirEmpresaCriadaSemBloquear({
                supabase,
                empresaId: empresaCriada?.id,
            });

        const avisos = [];

        if (
            caminhoLogoNovoPendente &&
            !logoNovoRemovido
        ) {
            avisos.push(
                "O novo logo pode ter permanecido no Storage."
            );
        }

        if (
            caminhoContratoNovoPendente &&
            !contratoNovoRemovido
        ) {
            avisos.push(
                "O novo contrato pode ter permanecido no Storage."
            );
        }

        if (
            empresaCriada?.id &&
            !empresaCriadaRemovida
        ) {
            avisos.push(
                "O cadastro incompleto da empresa pode ter permanecido no banco."
            );
        }

        const mensagemOriginal =
            error?.message ||
            "Erro ao cadastrar empresa.";

        if (avisos.length > 0) {
            throw new Error(
                `${mensagemOriginal} ${avisos.join(" ")}`,
                {
                    cause: error,
                }
            );
        }

        throw error;
    }
}

export async function atualizarEmpresaCrud({
    supabase,
    empresaAtualizada,
    enviarLogoEmpresa,
    enviarContratoEmpresa,
}) {
    const caminhoLogoAnterior =
        empresaAtualizada.logoAtual || "";

    const caminhoContratoAnterior =
        empresaAtualizada.contratoUrlAtual || "";

    let logoAtualizada = {
        logo_url:
            caminhoLogoAnterior || null,
        logo_nome:
            empresaAtualizada.logoNomeAtual || null,
    };

    let contratoAtualizado = {
        contrato_url:
            caminhoContratoAnterior || null,
        contrato_nome:
            empresaAtualizada.contratoNomeAtual || null,
    };

    let caminhoLogoNovoPendente = "";
    let caminhoContratoNovoPendente = "";

    try {
        if (empresaAtualizada.logo) {
            const logo =
                await enviarLogoEmpresa(
                    empresaAtualizada.logo,
                    empresaAtualizada.id
                );

            caminhoLogoNovoPendente =
                logo.logoUrl || "";

            logoAtualizada = {
                logo_url: logo.logoUrl,
                logo_nome: logo.logoNome,
            };
        }

        if (empresaAtualizada.contratoArquivo) {
            const contrato =
                await enviarContratoEmpresa(
                    empresaAtualizada.contratoArquivo,
                    empresaAtualizada.id
                );

            caminhoContratoNovoPendente =
                contrato.contratoUrl || "";

            contratoAtualizado = {
                contrato_url: contrato.contratoUrl,
                contrato_nome: contrato.contratoNome,
            };
        }

        let resultadoAtualizacao;

        try {
            resultadoAtualizacao = await supabase
                .from("empresas")
                .update({
                    nome:
                        empresaAtualizada.nome,
                    cnpj:
                        empresaAtualizada.cnpj || null,
                    responsavel:
                        empresaAtualizada.responsavel || null,
                    email:
                        empresaAtualizada.email || null,
                    telefone:
                        empresaAtualizada.telefone || null,
                    responsavel_auditoria:
                        empresaAtualizada.responsavelAuditoria || null,
                    email_auditoria:
                        empresaAtualizada.emailAuditoria || null,
                    whatsapp_auditoria:
                        empresaAtualizada.whatsappAuditoria || null,
                    receber_auditoria:
                        empresaAtualizada.receberAuditoria !== false,
                    status:
                        normalizarStatusEmpresa(
                            empresaAtualizada.status
                        ),
                    tipo_empresa:
                        empresaAtualizada.tipoEmpresa ||
                        "Terceirizada",
                    empresa_pai_id:
                        empresaAtualizada.tipoEmpresa ===
                        "Subcontratada"
                            ? empresaAtualizada.empresaPaiId
                            : null,
                    logo_url:
                        logoAtualizada.logo_url,
                    logo_nome:
                        logoAtualizada.logo_nome,
                    contrato_url:
                        contratoAtualizado.contrato_url,
                    contrato_nome:
                        contratoAtualizado.contrato_nome,
                    numero_contrato:
                        empresaAtualizada.numeroContrato || null,
                    data_inicio_contrato:
                        empresaAtualizada.dataInicioContrato || null,
                    data_fim_contrato:
                        empresaAtualizada.dataFimContrato || null,
                    responsavel_contratante:
                        empresaAtualizada.responsavelContratante || null,
                    tst_responsavel:
                        empresaAtualizada.tstResponsavel || null,
                    tst_email:
                        empresaAtualizada.tstEmail || null,
                    tst_whatsapp:
                        empresaAtualizada.tstWhatsapp || null,
                    escopo_servico:
                        empresaAtualizada.escopoServico || null,
                    observacao_status:
                        empresaAtualizada.observacaoStatus || null,
                })
                .eq("id", empresaAtualizada.id)
                .select(EMPRESA_SELECT)
                .single();
        } catch (erroAtualizacao) {
            throw new Error(
                `Erro ao atualizar empresa: ${
                    erroAtualizacao?.message ||
                    erroAtualizacao
                }`,
                {
                    cause: erroAtualizacao,
                }
            );
        }

        const {
            data,
            error,
        } = resultadoAtualizacao;

        if (error) {
            throw new Error(
                `Erro ao atualizar empresa: ${error.message}`
            );
        }

        const caminhoLogoNovoPersistido =
            caminhoLogoNovoPendente;

        const caminhoContratoNovoPersistido =
            caminhoContratoNovoPendente;

        caminhoLogoNovoPendente = "";
        caminhoContratoNovoPendente = "";

        if (
            caminhoLogoNovoPersistido &&
            caminhoLogoAnterior &&
            caminhoLogoAnterior !==
                caminhoLogoNovoPersistido
        ) {
            await removerArquivoEmpresaSemBloquear({
                supabase,
                bucket: "logos-empresas",
                caminhoArquivo:
                    caminhoLogoAnterior,
                contexto:
                    "Empresa atualizada, mas o logo anterior não pôde ser removido do Storage:",
            });
        }

        if (
            caminhoContratoNovoPersistido &&
            caminhoContratoAnterior &&
            caminhoContratoAnterior !==
                caminhoContratoNovoPersistido
        ) {
            await removerArquivoEmpresaSemBloquear({
                supabase,
                bucket: "contratos-empresas",
                caminhoArquivo:
                    caminhoContratoAnterior,
                contexto:
                    "Empresa atualizada, mas o contrato anterior não pôde ser removido do Storage:",
            });
        }

        return data;
    } catch (error) {
        const [
            logoNovoRemovido,
            contratoNovoRemovido,
        ] = await Promise.all([
            removerArquivoEmpresaSemBloquear({
                supabase,
                bucket: "logos-empresas",
                caminhoArquivo:
                    caminhoLogoNovoPendente,
                contexto:
                    "Não foi possível remover o novo logo após falha na atualização da empresa:",
            }),
            removerArquivoEmpresaSemBloquear({
                supabase,
                bucket: "contratos-empresas",
                caminhoArquivo:
                    caminhoContratoNovoPendente,
                contexto:
                    "Não foi possível remover o novo contrato após falha na atualização da empresa:",
            }),
        ]);

        const avisos = [];

        if (
            caminhoLogoNovoPendente &&
            !logoNovoRemovido
        ) {
            avisos.push(
                "O novo logo pode ter permanecido no Storage."
            );
        }

        if (
            caminhoContratoNovoPendente &&
            !contratoNovoRemovido
        ) {
            avisos.push(
                "O novo contrato pode ter permanecido no Storage."
            );
        }

        const mensagemOriginal =
            error?.message ||
            "Erro ao atualizar empresa.";

        if (avisos.length > 0) {
            throw new Error(
                `${mensagemOriginal} ${avisos.join(" ")}`,
                {
                    cause: error,
                }
            );
        }

        throw error;
    }
}

export async function excluirEmpresaCrud({
    supabase,
    empresa,
    colaboradores = [],
}) {
    if (!empresa?.id) {
        throw new Error(
            "Empresa inválida para exclusão."
        );
    }

    const nomeEmpresaNormalizado =
        normalizarTextoBusca(
            empresa.nome || ""
        );

    const colaboradoresVinculadosEstado =
        colaboradores.filter((colaborador) => {
            const mesmoId =
                String(
                    colaborador.empresaId ||
                    colaborador.empresa_id ||
                    ""
                ) === String(empresa.id);

            const mesmoNome =
                nomeEmpresaNormalizado &&
                normalizarTextoBusca(
                    colaborador.empresa ||
                    colaborador.empresaExibicao ||
                    ""
                ) === nomeEmpresaNormalizado;

            return mesmoId || mesmoNome;
        });

    if (
        colaboradoresVinculadosEstado.length > 0
    ) {
        throw new Error(
            `Não foi possível excluir ${
                empresa.nome ||
                "esta empresa"
            }: existem ${
                colaboradoresVinculadosEstado.length
            } colaborador(es) vinculado(s). Desmobilize, transfira ou exclua os colaboradores antes de remover a empresa para preservar o histórico.`
        );
    }

    const caminhoLogoEmpresa =
        empresa.logo_url ||
        empresa.logoAtual ||
        "";

    const caminhoContratoEmpresa =
        empresa.contrato_url ||
        empresa.contratoUrlAtual ||
        "";

    const { data, error } =
        await supabase.rpc(
            "excluir_empresa_segura",
            {
                p_empresa_id:
                    empresa.id,
            }
        );

    if (error) {
        throw new Error(
            error.message ||
            "Erro ao excluir empresa no Supabase."
        );
    }

    if (!data?.ok) {
        throw new Error(
            data?.mensagem ||
            "A empresa não foi excluída. Atualize a página e tente novamente."
        );
    }

    const [
        logoRemovido,
        contratoRemovido,
    ] = await Promise.all([
        removerArquivoEmpresaSemBloquear({
            supabase,
            bucket: "logos-empresas",
            caminhoArquivo:
                caminhoLogoEmpresa,
            contexto:
                "A empresa foi excluída, mas o logo não pôde ser removido do Storage:",
        }),
        removerArquivoEmpresaSemBloquear({
            supabase,
            bucket: "contratos-empresas",
            caminhoArquivo:
                caminhoContratoEmpresa,
            contexto:
                "A empresa foi excluída, mas o contrato não pôde ser removido do Storage:",
        }),
    ]);

    const avisos = [];

    if (
        caminhoLogoEmpresa &&
        !logoRemovido
    ) {
        avisos.push(
            "O arquivo do logo pode ter permanecido no Storage."
        );
    }

    if (
        caminhoContratoEmpresa &&
        !contratoRemovido
    ) {
        avisos.push(
            "O arquivo do contrato pode ter permanecido no Storage."
        );
    }

    const mensagemBase =
        data.mensagem ||
        `Empresa ${
            empresa.nome ||
            "selecionada"
        } excluída com sucesso.`;

    return {
        data,
        mensagem:
            avisos.length > 0
                ? `${mensagemBase} ${avisos.join(" ")}`
                : mensagemBase,
        nomeEmpresaNormalizado,
        normalizarNomeEmpresa:
            normalizarTextoBusca,
    };
}

export async function obterOuCriarEmpresaCrud({ supabase, nomeEmpresa, empresasBanco = [] }) {
    const nomeTratado = nomeEmpresa.trim();

    const existente = empresasBanco.find(
        (empresa) => empresa.nome.toLowerCase() === nomeTratado.toLowerCase()
    );

    if (existente) {
        return {
            empresa: existente,
            criada: false,
        };
    }

    const { data: existenteBanco, error: erroConsultaBanco } = await supabase
        .from("empresas")
        .select(EMPRESA_SELECT)
        .ilike("nome", nomeTratado)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

    if (erroConsultaBanco) {
        throw new Error(`Erro ao consultar empresa existente: ${erroConsultaBanco.message}`);
    }

    if (existenteBanco) {
        return {
            empresa: existenteBanco,
            criada: false,
        };
    }

    const { data, error } = await supabase
        .from("empresas")
        .insert({
            nome: nomeTratado,
            status: "Empresa ativa",
        })
        .select(EMPRESA_SELECT)
        .single();

    if (error) {
        throw new Error(`Erro ao criar empresa: ${error.message}`);
    }

    return {
        empresa: data,
        criada: true,
    };
}
