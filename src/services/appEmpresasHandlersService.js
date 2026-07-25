import {
    enviarContratoEmpresaStorage,
    enviarLogoEmpresaStorage,
} from "./arquivosCadastroService";
import {
    excluirDocumentoEmpresaCrud,
    gerarUrlVisualizacaoDocumentoEmpresa,
    salvarDocumentoEmpresaCrud,
} from "./empresaDocumentosCrudService";
import {
    adicionarEmpresaCrud,
    atualizarEmpresaCrud,
    excluirEmpresaCrud,
    obterOuCriarEmpresaCrud,
} from "./empresasCrudService";

function converterStatusVerificacaoParaStatusDocumento(statusVerificacao = "") {
    const status = String(statusVerificacao || "").trim().toLowerCase();

    if (status === "aprovado") return "Aprovado";
    if (status === "atencao") return "Atenção";
    if (status === "revisao_manual") return "Revisão manual";
    if (status === "suspeito") return "Suspeito";
    if (status === "bloqueado") return "Bloqueado";
    if (status === "erro") return "Erro na verificação";

    return "Pendente de verificação";
}


async function obterEmpresaDocumentoParaVerificacao({ supabase, empresaId }) {
    if (!supabase || !empresaId) return { id: empresaId || null };

    try {
        const { data, error } = await supabase
            .from("empresas")
            .select("id, nome, cnpj")
            .eq("id", empresaId)
            .maybeSingle();

        if (error) {
            console.warn("Não foi possível carregar empresa para verificação documental:", error.message);
            return { id: empresaId };
        }

        return data || { id: empresaId };
    } catch (error) {
        console.warn("Falha ao consultar empresa para verificação documental:", error?.message || error);
        return { id: empresaId };
    }
}

function obterLeituraLocalVerificacao(verificacao = {}) {
    return verificacao?.retornoIa?.leitura_documental_local ||
        verificacao?.retorno_ia?.leitura_documental_local ||
        verificacao?.retornoIa?.leituraDocumentalLocal ||
        verificacao?.retorno_ia?.leituraDocumentalLocal ||
        null;
}

function obterCamposExtraidosVerificacao(verificacao = {}) {
    const leitura = obterLeituraLocalVerificacao(verificacao);
    return leitura?.campos_extraidos || leitura?.camposExtraidos || null;
}

function verificacaoPossuiDivergenciaEmpresa(verificacao = {}) {
    const indicios = Array.isArray(verificacao?.indicios) ? verificacao.indicios : [];

    return indicios.some((indicio = {}) => {
        const codigo = String(indicio?.codigo || "").toLowerCase();
        return codigo.includes("documento_diverge_empresa") || codigo.includes("empresa_documento_diverge");
    });
}

function dataIsoValidaDocumentoEmpresa(valor = "") {
    const texto = String(valor || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;

    const [ano, mes, dia] = texto.split("-").map(Number);
    const data = new Date(ano, mes - 1, dia, 12, 0, 0);

    return (
        data.getFullYear() === ano &&
        data.getMonth() === mes - 1 &&
        data.getDate() === dia
    );
}

function formatarIsoDocumentoEmpresa(data) {
    if (!(data instanceof Date) || Number.isNaN(data.getTime())) return "";

    return [
        data.getFullYear(),
        String(data.getMonth() + 1).padStart(2, "0"),
        String(data.getDate()).padStart(2, "0"),
    ].join("-");
}

function calcularVencimentoDocumentoPorTipoOcr(tipo = "", dataEmissao = "") {
    const iso = String(dataEmissao || "").slice(0, 10);
    if (!dataIsoValidaDocumentoEmpresa(iso)) return "";

    const tipoNormalizado = String(tipo || "").trim().toUpperCase();
    const [ano, mes, dia] = iso.split("-").map(Number);
    const data = new Date(ano, mes - 1, dia, 12, 0, 0);

    // documentos_empresa_pcmso_validade_12_meses_ocr_v1:
    // A validade explícita encontrada no documento continua prioritária.
    // Sem validade explícita, o PCMSO recebe exatamente 12 meses.
    if (tipoNormalizado === "PCMSO") {
        const anoDestino =
            ano + 1;

        const ultimoDiaMesDestino =
            new Date(
                anoDestino,
                mes,
                0,
                12,
                0,
                0
            ).getDate();

        const dataPcmso =
            new Date(
                anoDestino,
                mes - 1,
                Math.min(
                    dia,
                    ultimoDiaMesDestino
                ),
                12,
                0,
                0
            );

        return formatarIsoDocumentoEmpresa(
            dataPcmso
        );
    }

    // LTCAT e PGR mantêm as regras anteriormente aprovadas.
    const anosValidade =
        tipoNormalizado === "LTCAT"
            ? 3
            : tipoNormalizado === "PGR"
                ? 1
                : 0;

    if (!anosValidade) return "";

    data.setFullYear(
        data.getFullYear() +
            anosValidade
    );

    data.setDate(data.getDate() - 1);
    return formatarIsoDocumentoEmpresa(data);
}

function obterDatasVigenciaOcrVerificacao(verificacao = {}, documento = {}) {
    // documentos_empresa_datas_ocr_parciais_v1:
    // Cada data é preservada separadamente e nenhuma data ausente é calculada.
    const campos = obterCamposExtraidosVerificacao(verificacao);

    const dataEmissaoCampos =
        dataIsoValidaDocumentoEmpresa(campos?.vigencia_inicio)
            ? campos.vigencia_inicio
            : "";

    const dataVencimentoCampos =
        dataIsoValidaDocumentoEmpresa(campos?.vigencia_fim)
            ? campos.vigencia_fim
            : "";

    if (dataEmissaoCampos || dataVencimentoCampos) {
        return {
            dataEmissao: dataEmissaoCampos,
            dataVencimento: dataVencimentoCampos,
            origem:
                dataEmissaoCampos && dataVencimentoCampos
                    ? "vigencia_ocr"
                    : "vigencia_ocr_parcial",
        };
    }

    const leitura = obterLeituraLocalVerificacao(verificacao);
    const classificadas =
        leitura?.datas_classificadas ||
        leitura?.datasClassificadas ||
        {};

    const vigencia =
        Array.isArray(classificadas?.vigencia)
            ? classificadas.vigencia
            : [];

    const inicio =
        vigencia.find(
            (data) =>
                data?.tipo === "inicio_vigencia"
        ) ||
        vigencia[0] ||
        null;

    const fim =
        vigencia.find(
            (data) =>
                data?.tipo === "fim_vigencia"
        ) ||
        vigencia[1] ||
        null;

    const dataEmissaoVigencia =
        dataIsoValidaDocumentoEmpresa(inicio?.iso)
            ? inicio.iso
            : "";

    const dataVencimentoVigencia =
        dataIsoValidaDocumentoEmpresa(fim?.iso)
            ? fim.iso
            : "";

    if (
        dataEmissaoVigencia ||
        dataVencimentoVigencia
    ) {
        return {
            dataEmissao: dataEmissaoVigencia,
            dataVencimento: dataVencimentoVigencia,
            origem:
                dataEmissaoVigencia &&
                dataVencimentoVigencia
                    ? "vigencia_ocr"
                    : "vigencia_ocr_parcial",
        };
    }

    const encerramento =
        campos?.data_encerramento ||
        campos?.assinatura_data ||
        "";

    if (
        dataIsoValidaDocumentoEmpresa(
            encerramento
        )
    ) {
        return {
            dataEmissao: encerramento,
            dataVencimento: "",
            origem: "encerramento_ou_assinatura_ocr_parcial",
        };
    }

    const outrasRelevantes =
        Array.isArray(
            classificadas?.outrasRelevantes
        )
            ? classificadas.outrasRelevantes
            : [];

    const dataEncerramentoClassificada =
        outrasRelevantes.find(
            (data) =>
                String(
                    data?.tipo ||
                    ""
                ) === "encerramento_documento"
        ) ||
        null;

    if (
        dataIsoValidaDocumentoEmpresa(
            dataEncerramentoClassificada?.iso
        )
    ) {
        return {
            dataEmissao:
                dataEncerramentoClassificada.iso,
            dataVencimento: "",
            origem: "encerramento_ou_assinatura_ocr_parcial",
        };
    }

    return {
        dataEmissao: "",
        dataVencimento: "",
        origem: "",
    };
}

async function executarVerificacaoDocumentoEmpresaSemBloquearFluxo({
    supabase,
    novoDoc,
    documentoNormalizado,
    normalizarDocumentoEmpresa,
    setDocumentosEmpresas,
}) {
    try {
        const { verificarDocumentoEmpresa } = await import("./documentosVerificacaoService");

        const empresaParaVerificacao = await obterEmpresaDocumentoParaVerificacao({
            supabase,
            empresaId: documentoNormalizado.empresa_id || novoDoc.empresaId || null,
        });

        // documentos_empresa_reanalise_datas_ocr_v1:
        // A primeira leitura localiza as datas sem persistir uma conclusão prematura.
        const verificacaoInicial = await verificarDocumentoEmpresa({
            supabase,
            documento: documentoNormalizado,
            empresa: empresaParaVerificacao,
            arquivo: novoDoc.arquivo || null,
            registrosExistentes: [],
            usuario: null,
            salvarResultado: false,
        });

        const datasOcr =
            obterDatasVigenciaOcrVerificacao(
                verificacaoInicial,
                documentoNormalizado
            );

        const tipoDocumento =
            documentoNormalizado.tipo_documento ||
            documentoNormalizado.tipoDocumento ||
            novoDoc.tipo ||
            "";

        const dataEmissaoFinal =
            datasOcr.dataEmissao ||
            documentoNormalizado.data_emissao ||
            documentoNormalizado.dataEmissao ||
            "";

        const dataVencimentoPersistida =
            documentoNormalizado.data_vencimento ||
            documentoNormalizado.dataVencimento ||
            "";

        // documentos_empresa_persistencia_validade_calculada_v1:
        // A validade explícita localizada no documento sempre prevalece.
        // Na ausência dela, LTCAT, PGR e PCMSO usam suas regras derivadas.
        const dataVencimentoCalculada =
            !datasOcr.dataVencimento &&
            !dataVencimentoPersistida &&
            dataEmissaoFinal
                ? calcularVencimentoDocumentoPorTipoOcr(
                      tipoDocumento,
                      dataEmissaoFinal
                  )
                : "";

        const dataVencimentoFinal =
            datasOcr.dataVencimento ||
            dataVencimentoPersistida ||
            dataVencimentoCalculada ||
            "";

        const documentoParaVerificacao = {
            ...documentoNormalizado,
            data_emissao:
                dataEmissaoFinal ||
                null,
            dataEmissao:
                dataEmissaoFinal,
            data_vencimento:
                dataVencimentoFinal ||
                null,
            dataVencimento:
                dataVencimentoFinal,
        };

        const verificacao =
            await verificarDocumentoEmpresa({
                supabase,
                documento: documentoParaVerificacao,
                empresa: empresaParaVerificacao,
                arquivo: novoDoc.arquivo || null,
                registrosExistentes: [],
                usuario: null,
                salvarResultado: true,
            });

        // documentos_empresa_datas_parciais_aguardando_confirmacao_v1:
        // Nenhuma data fica pendente; uma única data aguarda confirmação.
        const possuiDataEmissao =
            Boolean(
                dataEmissaoFinal
            );

        const possuiDataVencimento =
            Boolean(
                dataVencimentoFinal
            );

        const possuiDatasDocumentaisCompletas =
            possuiDataEmissao &&
            possuiDataVencimento;

        const possuiAlgumaDataDocumental =
            possuiDataEmissao ||
            possuiDataVencimento;

        const statusValidacaoCalculado =
            converterStatusVerificacaoParaStatusDocumento(
                verificacao?.statusVerificacao
            );

        const statusValidacao =
            possuiDatasDocumentaisCompletas
                ? statusValidacaoCalculado
                : possuiAlgumaDataDocumental
                    ? "Aguardando confirmação"
                    : "Pendente de data";

        const atualizacaoDocumento = {
            status_validacao:
                statusValidacao,
        };

        // Datas explícitas prevalecem. LTCAT, PGR e PCMSO podem receber
        // vencimento derivado conforme a regra específica de cada tipo.
        if (dataEmissaoFinal) {
            atualizacaoDocumento.data_emissao =
                dataEmissaoFinal;
        }

        if (dataVencimentoFinal) {
            atualizacaoDocumento.data_vencimento =
                dataVencimentoFinal;
        }

        const { data, error } = await supabase
            .from("documentos_empresas")
            .update(atualizacaoDocumento)
            .eq("id", documentoNormalizado.id)
            .select("*")
            .single();

        if (error) {
            throw new Error(`Erro ao atualizar status da verificação documental: ${error.message}`);
        }

        const documentoAtualizado = normalizarDocumentoEmpresa(data);

        setDocumentosEmpresas((atual) =>
            atual.map((item) => (item.id === documentoAtualizado.id ? documentoAtualizado : item))
        );

        return documentoAtualizado;
    } catch (error) {
        console.warn("Verificação documental não bloqueou o salvamento do documento:", error?.message || error);

        try {
            const { data } = await supabase
                .from("documentos_empresas")
                .update({ status_validacao: "Erro na verificação" })
                .eq("id", documentoNormalizado.id)
                .select("*")
                .single();

            if (data) {
                const documentoAtualizado = normalizarDocumentoEmpresa(data);

                setDocumentosEmpresas((atual) =>
                    atual.map((item) => (item.id === documentoAtualizado.id ? documentoAtualizado : item))
                );
            }
        } catch (erroAtualizacao) {
            console.warn("Não foi possível marcar erro na verificação documental:", erroAtualizacao?.message || erroAtualizacao);
        }

        return documentoNormalizado;
    }
}

export async function carregarEmpresasAppService({ supabase, setEmpresasBanco }) {
    const { data, error } = await supabase
        .from("empresas")
        .select("id, nome, cnpj, responsavel, email, telefone, responsavel_auditoria, email_auditoria, whatsapp_auditoria, receber_auditoria, status, tipo_empresa, logo_url, logo_nome, contrato_url, contrato_nome, numero_contrato, data_inicio_contrato, data_fim_contrato, responsavel_contratante, tst_responsavel, tst_email, tst_whatsapp, escopo_servico, observacao_status, empresa_pai_id")
        .order("nome", { ascending: true });

    if (error) {
        throw new Error(`Erro ao carregar empresas: ${error.message}`);
    }

    setEmpresasBanco(data || []);
    return data || [];
}

export async function carregarDocumentosEmpresasAppService({
    supabase,
    normalizarDocumentoEmpresa,
    setDocumentosEmpresas,
}) {
    const { data, error } = await supabase
        .from("documentos_empresas")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        throw new Error(`Erro ao carregar documentos das empresas: ${error.message}`);
    }

    const normalizados = (data || []).map(normalizarDocumentoEmpresa);
    setDocumentosEmpresas(normalizados);
    return normalizados;
}

export async function enviarLogoEmpresaAppService({
    supabase,
    arquivo,
    empresaId,
    validarArquivoAntesUpload,
}) {
    return enviarLogoEmpresaStorage({
        supabase,
        arquivo,
        empresaId,
        validarArquivoAntesUpload,
    });
}

export async function enviarContratoEmpresaAppService({
    supabase,
    arquivo,
    empresaId,
    validarArquivoAntesUpload,
}) {
    return enviarContratoEmpresaStorage({
        supabase,
        arquivo,
        empresaId,
        validarArquivoAntesUpload,
    });
}

export async function adicionarEmpresaAppService({
    supabase,
    novaEmpresa,
    empresasBanco,
    enviarLogoEmpresa,
    enviarContratoEmpresa,
    setErroBanco,
    setEmpresasBanco,
}) {
    setErroBanco("");

    try {
        const empresaCadastrada = await adicionarEmpresaCrud({
            supabase,
            novaEmpresa,
            empresasBanco,
            enviarLogoEmpresa,
            enviarContratoEmpresa,
        });

        setEmpresasBanco((atual) => [empresaCadastrada, ...atual].sort((a, b) => a.nome.localeCompare(b.nome)));
        return true;
    } catch (error) {
        setErroBanco(error.message || "Erro ao cadastrar empresa.");
        return false;
    }
}

export async function atualizarEmpresaAppService({
    supabase,
    empresaAtualizada,
    enviarLogoEmpresa,
    enviarContratoEmpresa,
    setErroBanco,
    setEmpresasBanco,
    setColaboradores,
}) {
    setErroBanco("");

    try {
        const empresaAtualizadaBanco = await atualizarEmpresaCrud({
            supabase,
            empresaAtualizada,
            enviarLogoEmpresa,
            enviarContratoEmpresa,
        });

        setEmpresasBanco((atual) =>
            atual.map((empresa) => (empresa.id === empresaAtualizadaBanco.id ? empresaAtualizadaBanco : empresa)).sort((a, b) => a.nome.localeCompare(b.nome))
        );

        setColaboradores((atual) =>
            atual.map((colaborador) =>
                colaborador.empresaId === empresaAtualizadaBanco.id ? { ...colaborador, empresa: empresaAtualizadaBanco.nome } : colaborador
            )
        );

        return true;
    } catch (error) {
        setErroBanco(error.message || "Erro ao atualizar empresa.");
        return false;
    }
}

export async function excluirEmpresaAppService({
    supabase,
    empresa,
    colaboradores,
    carregarColaboradores,
    setErroBanco,
    setEmpresasBanco,
    setDocumentosEmpresas,
    setColaboradores,
}) {
    setErroBanco("");

    try {
        const resultado = await excluirEmpresaCrud({
            supabase,
            empresa,
            colaboradores,
        });

        const nomeEmpresaNormalizado = resultado.nomeEmpresaNormalizado;

        setEmpresasBanco((atual) => atual.filter((item) => String(item.id) !== String(empresa.id)));
        setDocumentosEmpresas((atual) => atual.filter((doc) => String(doc.empresa_id || doc.empresaId || "") !== String(empresa.id)));
        setColaboradores((atual) => atual.filter((colaborador) => {
            const mesmoId = String(colaborador.empresaId || colaborador.empresa_id || "") === String(empresa.id);
            const mesmoNome = nomeEmpresaNormalizado && resultado.normalizarNomeEmpresa(colaborador.empresa || colaborador.empresaExibicao || "") === nomeEmpresaNormalizado;
            return !(mesmoId || mesmoNome);
        }));

        alert(resultado.mensagem || `Empresa ${empresa.nome || "selecionada"} excluída com sucesso.`);
        await carregarColaboradores();
        return true;
    } catch (error) {
        setErroBanco(error.message || "Erro ao excluir empresa.");
        alert(error.message || "Erro ao excluir empresa.");
        await carregarColaboradores();
        return false;
    }
}

export async function adicionarDocumentoEmpresaAppService({
    supabase,
    novoDoc,
    validarArquivoAntesUpload,
    sanitizarNomeArquivo,
    normalizarDocumentoEmpresa,
    setErroBanco,
    setDocumentosEmpresas,
}) {
    setErroBanco("");

    try {
        const documentoNormalizado = await salvarDocumentoEmpresaCrud({
            supabase,
            novoDoc,
            validarArquivoAntesUpload,
            sanitizarNomeArquivo,
            normalizarDocumentoEmpresa,
            statusValidacaoInicial: "Pendente de verificação",
        });

        setDocumentosEmpresas((atual) => [
            documentoNormalizado,
            ...atual.filter(
                (item) => !(item.empresa_id === documentoNormalizado.empresa_id && item.tipo_documento === documentoNormalizado.tipo_documento)
            ),
        ]);

        executarVerificacaoDocumentoEmpresaSemBloquearFluxo({
            supabase,
            novoDoc,
            documentoNormalizado,
            normalizarDocumentoEmpresa,
            setDocumentosEmpresas,
        });

        return true;
    } catch (error) {
        setErroBanco(error.message || "Erro ao salvar documento da empresa.");
        return false;
    }
}

export async function atualizarDatasDocumentoEmpresaAppService({
    supabase,
    documento,
    dataEmissao,
    dataVencimento,
    observacao,
    normalizarDocumentoEmpresa,
    setErroBanco,
    setDocumentosEmpresas,
}) {
    // documentos_empresa_atualizacao_datas_v1:
    // Persiste somente datas confirmadas e atualiza imediatamente o estado local.
    setErroBanco("");

    try {
        if (!documento?.id) {
            throw new Error(
                "Documento da empresa não localizado para atualização das datas."
            );
        }

        const dataEmissaoFinal =
            String(
                dataEmissao ||
                ""
            ).trim();

        const dataVencimentoFinal =
            String(
                dataVencimento ||
                ""
            ).trim();

        // documentos_empresa_atualizacao_datas_observacao_v1:
        // A observação só é alterada quando enviada explicitamente pela interface.
        const observacaoFoiInformada =
            observacao !==
            undefined;

        const observacaoFinal =
            observacaoFoiInformada
                ? String(
                      observacao ||
                      ""
                  ).trim()
                : String(
                      documento.observacao ||
                      ""
                  ).trim();

        if (
            !dataIsoValidaDocumentoEmpresa(
                dataEmissaoFinal
            ) ||
            !dataIsoValidaDocumentoEmpresa(
                dataVencimentoFinal
            )
        ) {
            throw new Error(
                "Informe uma data de emissão e uma data de vencimento/revisão válidas."
            );
        }

        if (
            dataVencimentoFinal <
            dataEmissaoFinal
        ) {
            throw new Error(
                "A data de vencimento/revisão não pode ser anterior à data de emissão."
            );
        }

        const statusAtual =
            String(
                documento.status_validacao ||
                documento.statusValidacao ||
                ""
            ).trim();

        const statusNormalizado =
            statusAtual.toLowerCase();

        const statusValidacao =
            !statusAtual ||
            [
                "pendente de data",
                "aguardando confirmação",
            ].includes(
                statusNormalizado
            )
                ? "Pendente de verificação"
                : statusAtual;

        const {
            data,
            error,
        } = await supabase
            .from(
                "documentos_empresas"
            )
            .update({
                data_emissao:
                    dataEmissaoFinal,
                data_vencimento:
                    dataVencimentoFinal,
                observacao:
                    observacaoFinal,
                status_validacao:
                    statusValidacao,
            })
            .eq(
                "id",
                documento.id
            )
            .select(
                "*"
            )
            .single();

        if (error) {
            throw new Error(
                `Erro ao atualizar as datas do documento: ${error.message}`
            );
        }

        const documentoAtualizado =
            normalizarDocumentoEmpresa(
                data
            );

        setDocumentosEmpresas(
            (atual) =>
                atual.map(
                    (item) =>
                        item.id ===
                        documentoAtualizado.id
                            ? documentoAtualizado
                            : item
                )
        );

        return documentoAtualizado;
    } catch (error) {
        setErroBanco(
            error.message ||
            "Erro ao atualizar as datas do documento."
        );

        return false;
    }
}

export async function excluirDocumentoEmpresaAppService({
    supabase,
    documento,
    setErroBanco,
    setDocumentosEmpresas,
}) {
    const confirmar = window.confirm(`Deseja excluir definitivamente o documento ${documento.tipo_documento} desta empresa?`);

    if (!confirmar) return;

    setErroBanco("");

    try {
        await excluirDocumentoEmpresaCrud({ supabase, documento });
        setDocumentosEmpresas((atual) => atual.filter((item) => item.id !== documento.id));
    } catch (error) {
        setErroBanco(error.message || "Erro ao remover documento.");
    }
}

export async function visualizarDocumentoEmpresaAppService({
    supabase,
    documento,
    setErroBanco,
}) {
    setErroBanco("");

    try {
        const signedUrl = await gerarUrlVisualizacaoDocumentoEmpresa({
            supabase,
            documento,
            expiracaoSegundos: 60 * 10,
        });

        window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
        setErroBanco(error.message || "Erro ao gerar link de visualização.");
    }
}

export async function obterOuCriarEmpresaAppService({
    supabase,
    nomeEmpresa,
    empresasBanco,
    setEmpresasBanco,
}) {
    const resultado = await obterOuCriarEmpresaCrud({
        supabase,
        nomeEmpresa,
        empresasBanco,
    });

    if (resultado.criada) {
        setEmpresasBanco((atual) => [...atual, resultado.empresa].sort((a, b) => a.nome.localeCompare(b.nome)));
    }

    return resultado.empresa;
}
