import {
    buscarTodosRegistrosSupabase,
    listarTodosArquivosStorage,
} from "./supabaseServices";
import { codigoPastaCertificado } from "./certificadosStorageService";
import {
    calcularVencimentoTreinamento,
    obterTreinamento,
} from "./colaboradorDocumentosService";
import { treinamentosBase } from "../constants/treinamentosConstants";
import { extrairCaminhoStorage } from "../utils/sstUtils";

const ATIVOS_SISTEMA_STORAGE = Object.freeze({
    "logos-empresas:configuracoes/login/fundo-login.jpg": Object.freeze({
        id: "fundo-login-global",
        tipo: "Fundo da tela de login",
        origemRegistro: "Configuração global do sistema",
        origemTipo: "Sistema / Aparência do login",
        tabelaOrigem: "configuracoes_publicas_sistema",
    }),
    "logos-empresas:configuracoes/login/logo-contratante.png": Object.freeze({
        id: "logo-contratante-login-global",
        tipo: "Logo da contratante na tela de login",
        origemRegistro: "Configuração global do sistema",
        origemTipo: "Sistema / Aparência do login",
        tabelaOrigem: "Storage global do login",
    }),
    "logos-empresas:configuracoes/qrcode/logo-qrcode.png": Object.freeze({
        id: "logo-qrcode-global",
        tipo: "Logo global dos QR Codes",
        origemRegistro: "Configuração global do sistema",
        origemTipo: "Sistema / Logo dos QR Codes",
        tabelaOrigem: "configuração global do QR Code",
    }),
});

function obterAtivoSistemaStorage(bucket = "", caminho = "") {
    return ATIVOS_SISTEMA_STORAGE[`${String(bucket || "").trim()}:${String(caminho || "").trim()}`] || null;
}

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
    onProgress = null,
} = {}) {
    const informarProgresso = (dados) => {
        if (typeof onProgress === "function") onProgress(dados);
    };
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
            origemTipo: "Colaborador ou usuário do App / Foto",
            tabelaOrigem: "colaboradores.foto_url ou usuarios_permissoes_sistema.foto_url",
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

        const subpastas = [];
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
                subpastas.push(() => listarNivel(bucketInfo, caminho));
            }
        }

        for (let inicio = 0; inicio < subpastas.length; inicio += 8) {
            await Promise.all(subpastas.slice(inicio, inicio + 8).map((listarSubpasta) => listarSubpasta()));
        }
    };

    const totalEtapasProgresso = bucketsAuditados.length + 6;
    informarProgresso({ etapa: "storage", atual: 0, total: totalEtapasProgresso, mensagem: "Consultando áreas do Storage..." });
    let bucketsConcluidos = 0;
    await Promise.all(bucketsAuditados.map(async (bucketInfo) => {
        await listarNivel(bucketInfo, "");
        bucketsConcluidos += 1;
        informarProgresso({
            etapa: "storage",
            atual: bucketsConcluidos,
            total: totalEtapasProgresso,
            mensagem: `${bucketInfo.bucket}: concluído (${coletados.length} arquivo(s) localizado(s))`,
        });
    }));

    let certificados = [];
    let documentosEmpresaBanco = [];
    let usuariosPermissoesBanco = [];
    let auditoriasCampoBanco = [];
    let desviosAuditoriaBanco = [];

    informarProgresso({ etapa: "vinculos", atual: bucketsAuditados.length, total: totalEtapasProgresso, mensagem: "Cruzando arquivos com os registros do sistema..." });
    let consultasConcluidas = 0;
    const consultarVinculo = async (consulta, rotulo, obrigatoria = false) => {
        try {
            return await consulta();
        } catch (error) {
            if (obrigatoria) throw error;
            console.warn(`Erro ao consultar ${rotulo} para vínculos do Storage:`, error.message);
            return [];
        } finally {
            consultasConcluidas += 1;
            informarProgresso({ etapa: "vinculos", atual: bucketsAuditados.length + consultasConcluidas, total: totalEtapasProgresso, mensagem: `${rotulo}: conferido` });
        }
    };

    [certificados, documentosEmpresaBanco, usuariosPermissoesBanco, auditoriasCampoBanco, desviosAuditoriaBanco] = await Promise.all([
        consultarVinculo(() => buscarTodosRegistrosSupabase("certificados", "*"), "Certificados", true),
        consultarVinculo(() => buscarTodosRegistrosSupabase("documentos_empresas", "*"), "Documentos de empresas", true),
        consultarVinculo(() => buscarTodosRegistrosSupabase("usuarios_permissoes_sistema", "*"), "Usuários do App", true),
        consultarVinculo(() => buscarTodosRegistrosSupabase("auditorias_campo", "id, empresa_id, numero_auditoria, titulo, empresa_nome, foto_antes_url, foto_depois_url"), "Auditorias"),
        consultarVinculo(() => buscarTodosRegistrosSupabase("auditoria_campo_desvios", "id, auditoria_id, empresa_id, categoria, descricao, foto_antes_url, foto_depois_url"), "Desvios"),
    ]);

    informarProgresso({ etapa: "finalizando", atual: totalEtapasProgresso, total: totalEtapasProgresso, mensagem: `Organizando ${coletados.length} arquivo(s)...` });

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
        const caminhoArquivo = extrairCaminhoStorage(
            "certificados-treinamentos",
            item.url_do_arquivo || item.arquivo_url
        );

        if (caminhoArquivo) {
            acc[`certificados-treinamentos:${caminhoArquivo}`] = item;
        }

        return acc;
    }, {});

    const documentosEmpresaPorCaminho = (documentosEmpresaBanco || []).reduce((acc, item) => {
        const caminhoArquivo = extrairCaminhoStorage(
            "documentos-empresas",
            item.url_do_arquivo || item.arquivo_url
        );

        if (caminhoArquivo) {
            acc[`documentos-empresas:${caminhoArquivo}`] = item;
        }

        return acc;
    }, {});

    const contratosPorCaminho = (empresasBanco || []).reduce((acc, empresa) => {
        const caminhoContrato = extrairCaminhoStorage(
            "contratos-empresas",
            empresa.contrato_url
        );

        if (caminhoContrato) {
            acc[`contratos-empresas:${caminhoContrato}`] = empresa;
        }

        return acc;
    }, {});

    const logosPorCaminho = (empresasBanco || []).reduce((acc, empresa) => {
        const caminhoLogo = extrairCaminhoStorage(
            "logos-empresas",
            empresa.logo_url
        );

        if (caminhoLogo) {
            acc[`logos-empresas:${caminhoLogo}`] = empresa;
        }

        return acc;
    }, {});

    const fotosPorCaminho = (colaboradores || []).reduce((acc, colaborador) => {
        const caminhoFoto = extrairCaminhoStorage(
            "fotos-colaboradores",
            colaborador.fotoUrl || colaborador.foto_url
        );

        if (caminhoFoto) {
            acc[`fotos-colaboradores:${caminhoFoto}`] = colaborador;
        }

        return acc;
    }, {});

    const fotosUsuariosAcessoPorCaminho =
        (usuariosPermissoesBanco || []).reduce(
            (acc, usuarioAcesso) => {
                const caminhoFoto = extrairCaminhoStorage(
                    "fotos-colaboradores",
                    usuarioAcesso.foto_url
                );

                if (caminhoFoto) {
                    acc[`fotos-colaboradores:${caminhoFoto}`] =
                        usuarioAcesso;
                }

                return acc;
            },
            {}
        );

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
            const ativoSistemaStorage = obterAtivoSistemaStorage(
                arquivo.bucket,
                arquivo.caminho
            );
            const ativoSistema = Boolean(ativoSistemaStorage);

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
                if (ativoSistemaStorage) {
                    emUso = true;
                    origemRegistro = ativoSistemaStorage.origemRegistro;
                    registroId = ativoSistemaStorage.id;
                    empresaNome = "SafeScan Brasil";
                    empresaCnpj = "";
                    tipoDocumentoEmpresa = ativoSistemaStorage.tipo;
                    origemIdentificacao = origemRegistro;
                } else {
                    const empresaLogo = logosPorCaminho[chave] || empresasPorId[primeiraPasta];

                    emUso = Boolean(logosPorCaminho[chave]);
                    origemRegistro = logosPorCaminho[chave] ? "Cadastro da empresa" : empresaLogo ? "Pasta do Storage" : "";
                    registroId = empresaLogo?.id || "";
                    empresaNome = empresaLogo?.nome || "";
                    empresaCnpj = empresaLogo?.cnpj || "";
                    tipoDocumentoEmpresa = "Logo da empresa";
                    origemIdentificacao = origemRegistro;
                }
            }

            if (arquivo.bucket === "fotos-colaboradores") {
                const colaboradorVinculado =
                    fotosPorCaminho[chave] || null;

                const usuarioAcessoVinculado =
                    fotosUsuariosAcessoPorCaminho[chave] || null;

                const colaboradorPelaPasta =
                    colaboradoresPorId[primeiraPasta] || null;

                const registroFotoVinculado =
                    usuarioAcessoVinculado ||
                    colaboradorVinculado ||
                    null;

                const colaboradorFoto =
                    colaboradorVinculado ||
                    colaboradorPelaPasta ||
                    null;

                emUso = Boolean(registroFotoVinculado);

                origemRegistro = usuarioAcessoVinculado
                    ? "Cadastro do usuário do App"
                    : colaboradorVinculado
                        ? "Cadastro do colaborador"
                        : colaboradorPelaPasta
                            ? "Pasta do Storage"
                            : "";

                registroId =
                    registroFotoVinculado?.id ||
                    registroFotoVinculado?.user_id ||
                    colaboradorFoto?.id ||
                    "";

                colaboradorNome =
                    usuarioAcessoVinculado?.nome ||
                    usuarioAcessoVinculado?.email ||
                    colaboradorFoto?.nome ||
                    "";

                colaboradorCodigo =
                    colaboradorFoto?.codigoFuncionario ||
                    "";

                colaboradorEmpresa =
                    usuarioAcessoVinculado?.empresa ||
                    colaboradorFoto?.empresaExibicao ||
                    colaboradorFoto?.empresa ||
                    "";

                tipoDocumentoEmpresa = usuarioAcessoVinculado
                    ? "Foto de usuário do App"
                    : "Foto de colaborador";

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
                origemTipo: ativoSistemaStorage?.origemTipo || arquivo.origemTipo,
                tabelaOrigem: ativoSistemaStorage?.tabelaOrigem || arquivo.tabelaOrigem,
                ativoSistema,
                protegidoSistema: ativoSistema,
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

    const ativoSistemaStorage = obterAtivoSistemaStorage(
        arquivo.bucket,
        arquivo.caminho
    );

    if (ativoSistemaStorage) {
        throw new Error(`Exclusão bloqueada: ${ativoSistemaStorage.tipo} é um ativo global protegido do sistema.`);
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
