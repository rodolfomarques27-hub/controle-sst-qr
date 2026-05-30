import {
    buscarTodosRegistrosSupabase,
    listarTodosArquivosStorage,
} from "./supabaseServices";
import { codigoPastaCertificado } from "./certificadosStorageService";
import {
    calcularVencimentoTreinamento,
    obterTreinamento,
} from "./colaboradorDocumentosService";
import { treinamentosBase } from "../constants/sstConstants";
import { extrairCaminhoStorage } from "../utils/sstUtils";

export async function sincronizarCertificadosDoStorageService({
    supabase,
    colaboradores = [],
    dataReferencia = new Date(),
} = {}) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado para sincronizar certificados.");
    }

    let sincronizados = 0;
    let ignorados = 0;

    for (const colaborador of colaboradores || []) {
        for (const treinamento of treinamentosBase) {
            const pasta = `${codigoPastaCertificado(colaborador)}/${treinamento.id}`;

            const { data: arquivos, error } = await supabase.storage
                .from("certificados-treinamentos")
                .list(pasta, {
                    limit: 100,
                    sortBy: { column: "created_at", order: "desc" },
                });

            if (error) {
                ignorados += 1;
                continue;
            }

            const arquivosValidos = (arquivos || []).filter((arquivo) => arquivo.name && !arquivo.name.endsWith("/"));

            if (arquivosValidos.length === 0) continue;

            const maisRecente = arquivosValidos.sort((a, b) => {
                const dataB = new Date(b.updated_at || b.created_at || 0).getTime();
                const dataA = new Date(a.updated_at || a.created_at || 0).getTime();
                return dataB - dataA;
            })[0];

            const dataRealizacao = (maisRecente.created_at || maisRecente.updated_at || dataReferencia.toISOString()).slice(0, 10);
            const dataVencimento = calcularVencimentoTreinamento(treinamento.id, dataRealizacao);
            const caminho = `${pasta}/${maisRecente.name}`;

            const { error: upsertError } = await supabase
                .from("certificados")
                .upsert(
                    {
                        colaborador_id: colaborador.id,
                        tipo_treinamento: treinamento.nome,
                        treinamento_codigo: Number(treinamento.id),
                        nome_treinamento: treinamento.nome,
                        data_realizacao: dataRealizacao,
                        data_vencimento: dataVencimento,
                        arquivo_url: caminho,
                        arquivo_nome: maisRecente.name,
                        observacao: "Sincronizado automaticamente do Storage",
                        status_validacao: "Validado",
                    },
                    { onConflict: "colaborador_id,tipo_treinamento" }
                );

            if (upsertError) {
                throw new Error(`Erro ao sincronizar ${colaborador.nome} / ${treinamento.nome}: ${upsertError.message}`);
            }

            sincronizados += 1;
        }
    }

    return `${sincronizados} certificado(s) sincronizado(s) do Storage para a tabela certificados. ${ignorados} pasta(s) ignorada(s).`;
}

export async function listarArquivosCertificadosStorageService({
    colaboradores = [],
    empresasBanco = [],
} = {}) {
    const coletados = [];
    const bucketsAuditados = [
        {
            bucket: "certificados-treinamentos",
            origemTipo: "Colaborador / Certificado de treinamento",
            tabelaOrigem: "certificados",
        },
        {
            bucket: "documentos-empresas",
            origemTipo: "Empresa / Documento empresarial",
            tabelaOrigem: "documentos_empresas",
        },
        {
            bucket: "contratos-empresas",
            origemTipo: "Empresa / Contrato",
            tabelaOrigem: "empresas.contrato_url",
        },
        {
            bucket: "logos-empresas",
            origemTipo: "Empresa / Logo",
            tabelaOrigem: "empresas.logo_url",
        },
        {
            bucket: "fotos-colaboradores",
            origemTipo: "Colaborador / Foto",
            tabelaOrigem: "colaboradores.foto_url",
        },
        {
            bucket: "auditorias-campo",
            origemTipo: "Auditoria de campo / Evidência fotográfica",
            tabelaOrigem: "auditorias_campo.fotos",
        },
    ];

    const listarNivel = async (bucketInfo, prefixo = "") => {
        let data;

        try {
            data = await listarTodosArquivosStorage(bucketInfo.bucket, prefixo);
        } catch (error) {
            console.warn(`Erro ao listar bucket ${bucketInfo.bucket}:`, error.message);
            return;
        }

        for (const item of data || []) {
            const caminho = prefixo ? `${prefixo}/${item.name}` : item.name;
            const pareceArquivo = item.name && /\.[a-z0-9]{2,5}$/i.test(item.name);

            if (pareceArquivo) {
                coletados.push({
                    bucket: bucketInfo.bucket,
                    origemTipo: bucketInfo.origemTipo,
                    tabelaOrigem: bucketInfo.tabelaOrigem,
                    nome: item.name,
                    caminho,
                    tamanho: item.metadata?.size || null,
                    atualizadoEm: item.updated_at || item.created_at || null,
                });
            } else {
                await listarNivel(bucketInfo, caminho);
            }
        }
    };

    for (const bucketInfo of bucketsAuditados) {
        await listarNivel(bucketInfo, "");
    }

    let certificados = [];
    let documentosEmpresaBanco = [];
    let auditoriasCampoBanco = [];
    let desviosAuditoriaBanco = [];

    try {
        certificados = await buscarTodosRegistrosSupabase("certificados", "*");
    } catch (certificadosError) {
        throw new Error(`Erro ao consultar certificados: ${certificadosError.message}`, { cause: certificadosError });
    }

    try {
        documentosEmpresaBanco = await buscarTodosRegistrosSupabase("documentos_empresas", "*");
    } catch (documentosEmpresaError) {
        throw new Error(`Erro ao consultar documentos de empresas: ${documentosEmpresaError.message}`, { cause: documentosEmpresaError });
    }

    try {
        auditoriasCampoBanco = await buscarTodosRegistrosSupabase(
            "auditorias_campo",
            "id, empresa_id, numero_auditoria, titulo, empresa_nome, foto_antes_url, foto_depois_url"
        );
    } catch (auditoriasCampoStorageError) {
        console.warn("Erro ao consultar auditorias para vínculo de fotos:", auditoriasCampoStorageError.message);
    }

    try {
        desviosAuditoriaBanco = await buscarTodosRegistrosSupabase(
            "auditoria_campo_desvios",
            "id, auditoria_id, empresa_id, categoria, descricao, foto_antes_url, foto_depois_url"
        );
    } catch (desviosAuditoriaStorageError) {
        console.warn("Erro ao consultar desvios para vínculo de fotos:", desviosAuditoriaStorageError.message);
    }

    const colaboradoresPorId = (colaboradores || []).reduce((acc, colaborador) => {
        acc[colaborador.id] = colaborador;
        return acc;
    }, {});

    const colaboradoresPorPasta = (colaboradores || []).reduce((acc, colaborador) => {
        try {
            const pasta = codigoPastaCertificado(colaborador);

            if (pasta) acc[pasta] = colaborador;
        } catch {
            // Ignora colaborador sem código válido para pasta.
        }

        return acc;
    }, {});

    const empresasPorId = (empresasBanco || []).reduce((acc, empresa) => {
        acc[empresa.id] = empresa;
        return acc;
    }, {});

    const certificadosPorCaminho = (certificados || []).reduce((acc, item) => {
        const caminhoArquivo = item.url_do_arquivo || item.arquivo_url;
        if (caminhoArquivo) acc[`certificados-treinamentos:${caminhoArquivo}`] = item;
        return acc;
    }, {});

    const documentosEmpresaPorCaminho = (documentosEmpresaBanco || []).reduce((acc, item) => {
        const caminhoArquivo = item.url_do_arquivo || item.arquivo_url;
        if (caminhoArquivo) acc[`documentos-empresas:${caminhoArquivo}`] = item;
        return acc;
    }, {});

    const contratosPorCaminho = (empresasBanco || []).reduce((acc, empresa) => {
        if (empresa.contrato_url) acc[`contratos-empresas:${empresa.contrato_url}`] = empresa;
        return acc;
    }, {});

    const logosPorCaminho = (empresasBanco || []).reduce((acc, empresa) => {
        if (empresa.logo_url) acc[`logos-empresas:${empresa.logo_url}`] = empresa;
        return acc;
    }, {});

    const fotosPorCaminho = (colaboradores || []).reduce((acc, colaborador) => {
        if (colaborador.fotoUrl) acc[`fotos-colaboradores:${colaborador.fotoUrl}`] = colaborador;
        return acc;
    }, {});

    const registrarCaminhoAuditoria = (acc, valor, registro, origem) => {
        const caminho = extrairCaminhoStorage("auditorias-campo", valor);
        if (caminho) {
            acc[`auditorias-campo:${caminho}`] = { ...registro, origemAuditoriaStorage: origem };
        }
        return acc;
    };

    const auditoriasCampoPorCaminho = (auditoriasCampoBanco || []).reduce((acc, auditoria) => {
        registrarCaminhoAuditoria(acc, auditoria.foto_antes_url, auditoria, "Auditoria de campo");
        registrarCaminhoAuditoria(acc, auditoria.foto_depois_url, auditoria, "Auditoria de campo");
        return acc;
    }, {});

    const desviosAuditoriaPorCaminho = (desviosAuditoriaBanco || []).reduce((acc, desvio) => {
        registrarCaminhoAuditoria(acc, desvio.foto_antes_url, desvio, "Desvio de auditoria");
        registrarCaminhoAuditoria(acc, desvio.foto_depois_url, desvio, "Desvio de auditoria");
        return acc;
    }, {});

    return coletados
        .map((arquivo) => {
            const partes = arquivo.caminho.split("/");
            const pasta = partes.length > 1 ? partes.slice(0, -1).join("/") : "";
            const primeiraPasta = partes[0] || "";
            const segundaPasta = partes[1] || "";
            const chave = `${arquivo.bucket}:${arquivo.caminho}`;

            let emUso = false;
            let origemRegistro = "";
            let registroId = "";
            let colaboradorNome = "";
            let colaboradorCodigo = "";
            let colaboradorEmpresa = "";
            let empresaNome = "";
            let empresaCnpj = "";
            let tipoDocumentoEmpresa = "";
            let treinamentoNome = "";
            let origemIdentificacao = "";

            if (arquivo.bucket === "certificados-treinamentos") {
                const certificadoVinculado = certificadosPorCaminho[chave] || null;
                const colaboradorVinculado = certificadoVinculado
                    ? colaboradoresPorId[certificadoVinculado.colaborador_id]
                    : null;
                const colaboradorPelaPasta = colaboradoresPorPasta[primeiraPasta] || null;
                const colaboradorArquivo = colaboradorVinculado || colaboradorPelaPasta || null;
                const treinamento = obterTreinamento(Number(segundaPasta));

                emUso = Boolean(certificadoVinculado);
                origemRegistro = certificadoVinculado ? "Base de certificados" : colaboradorPelaPasta ? "Pasta do Storage" : "";
                registroId = certificadoVinculado?.id || "";
                colaboradorNome = colaboradorArquivo?.nome || "";
                colaboradorCodigo = colaboradorArquivo?.codigoFuncionario || "";
                colaboradorEmpresa = colaboradorArquivo?.empresaExibicao || colaboradorArquivo?.empresa || "";
                treinamentoNome = certificadoVinculado?.nome_treinamento || treinamento?.nome || "";
                origemIdentificacao = origemRegistro;
            }

            if (arquivo.bucket === "documentos-empresas") {
                const documentoVinculado = documentosEmpresaPorCaminho[chave] || null;
                const empresaVinculada = documentoVinculado
                    ? empresasPorId[documentoVinculado.empresa_id]
                    : empresasPorId[primeiraPasta];

                emUso = Boolean(documentoVinculado);
                origemRegistro = documentoVinculado ? "Base de documentos empresariais" : empresaVinculada ? "Pasta do Storage" : "";
                registroId = documentoVinculado?.id || "";
                empresaNome = empresaVinculada?.nome || "";
                empresaCnpj = empresaVinculada?.cnpj || "";
                tipoDocumentoEmpresa = documentoVinculado?.tipo_documento || segundaPasta || "";
                origemIdentificacao = origemRegistro;
            }

            if (arquivo.bucket === "contratos-empresas") {
                const empresaContrato = contratosPorCaminho[chave] || empresasPorId[primeiraPasta];

                emUso = Boolean(contratosPorCaminho[chave]);
                origemRegistro = contratosPorCaminho[chave] ? "Cadastro da empresa" : empresaContrato ? "Pasta do Storage" : "";
                registroId = empresaContrato?.id || "";
                empresaNome = empresaContrato?.nome || "";
                empresaCnpj = empresaContrato?.cnpj || "";
                tipoDocumentoEmpresa = "Contrato da empresa";
                origemIdentificacao = origemRegistro;
            }

            if (arquivo.bucket === "logos-empresas") {
                const empresaLogo = logosPorCaminho[chave] || empresasPorId[primeiraPasta];

                emUso = Boolean(logosPorCaminho[chave]);
                origemRegistro = logosPorCaminho[chave] ? "Cadastro da empresa" : empresaLogo ? "Pasta do Storage" : "";
                registroId = empresaLogo?.id || "";
                empresaNome = empresaLogo?.nome || "";
                empresaCnpj = empresaLogo?.cnpj || "";
                tipoDocumentoEmpresa = "Logo da empresa";
                origemIdentificacao = origemRegistro;
            }

            if (arquivo.bucket === "fotos-colaboradores") {
                const colaboradorFoto = fotosPorCaminho[chave] || colaboradoresPorId[primeiraPasta];

                emUso = Boolean(fotosPorCaminho[chave]);
                origemRegistro = fotosPorCaminho[chave] ? "Cadastro do colaborador" : colaboradorFoto ? "Pasta do Storage" : "";
                registroId = colaboradorFoto?.id || "";
                colaboradorNome = colaboradorFoto?.nome || "";
                colaboradorCodigo = colaboradorFoto?.codigoFuncionario || "";
                colaboradorEmpresa = colaboradorFoto?.empresaExibicao || colaboradorFoto?.empresa || "";
                origemIdentificacao = origemRegistro;
            }

            if (arquivo.bucket === "auditorias-campo") {
                const auditoriaVinculada = auditoriasCampoPorCaminho[chave] || null;
                const desvioVinculado = desviosAuditoriaPorCaminho[chave] || null;
                const registroAuditoria = auditoriaVinculada || desvioVinculado || null;
                const empresaAuditoria = registroAuditoria?.empresa_id ? empresasPorId[registroAuditoria.empresa_id] : null;

                emUso = Boolean(registroAuditoria);
                origemRegistro = registroAuditoria?.origemAuditoriaStorage || (primeiraPasta ? "Pasta do Storage" : "");
                registroId = registroAuditoria?.id || "";
                empresaNome = empresaAuditoria?.nome || registroAuditoria?.empresa_nome || "";
                empresaCnpj = empresaAuditoria?.cnpj || "";
                tipoDocumentoEmpresa = registroAuditoria?.numero_auditoria || registroAuditoria?.categoria || "Foto de auditoria de campo";
                origemIdentificacao = origemRegistro;
            }

            return {
                ...arquivo,
                pasta,
                pastaColaborador: primeiraPasta,
                pastaTreinamento: segundaPasta,
                treinamentoNome,
                colaboradorNome,
                colaboradorCodigo,
                colaboradorEmpresa,
                empresaNome,
                empresaCnpj,
                tipoDocumentoEmpresa,
                origemColaborador: origemIdentificacao,
                origemRegistro,
                registroId,
                emUso,
            };
        })
        .sort((a, b) =>
            a.bucket.localeCompare(b.bucket) ||
            Number(a.emUso) - Number(b.emUso) ||
            a.caminho.localeCompare(b.caminho)
        );
}

export async function excluirArquivoStorageAuditoriaService({ supabase, arquivo } = {}) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado para excluir arquivo do Storage.");
    }

    if (!arquivo?.caminho) {
        throw new Error("Arquivo inválido para exclusão.");
    }

    if (arquivo.emUso) {
        throw new Error(`Este arquivo está em uso em: ${arquivo.origemTipo || arquivo.tabelaOrigem || "base do sistema"}. Para evitar quebrar o histórico, exclua primeiro o registro vinculado.`);
    }

    const { error } = await supabase.storage
        .from(arquivo.bucket || "certificados-treinamentos")
        .remove([arquivo.caminho]);

    if (error) {
        throw new Error(`Erro ao excluir arquivo do Storage: ${error.message}`);
    }

    return true;
}
