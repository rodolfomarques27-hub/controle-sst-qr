import {
    normalizarAuditoriaCampo,
    auditoriaCampoAberta,
} from "./auditoriaCampoService";
import {
    avaliarTreinamentosColaborador,
    mesAniversarioColaborador,
    diaAniversarioColaborador,
    proximoAniversariante,
    deveMostrarAniversarioColaborador,
    obterFuncaoBaseColaborador,
    colaboradorContaComoMobilizado,
    colaboradorForaControleDocumentalOperacional,
    itemDocumentoCriticoColaborador,
    statusGeral,
} from "./colaboradorDocumentosService";
import {
    statusEmpresaDocumento,
    normalizarStatusEmpresa,
} from "./empresaDocumentosService";
import { LIMITE_STORAGE_MB } from "../constants/sistemaConstants";
import {
    normalizarTextoBusca,
    diasParaVencer,
    formatDate,
    formatarBytes,
    calcularPercentualUsoStorage,
} from "../utils/sstUtils";

export function calcularIndicadoresTreinamentosDashboard(colaboradores = []) {
    const colaboradoresOperacionais = colaboradores.filter(
        (colaborador) => !colaboradorForaControleDocumentalOperacional(colaborador)
    );

    const avaliacoes = colaboradoresOperacionais.map((colaborador) => {
        const avaliacao = avaliarTreinamentosColaborador(colaborador);

        return avaliacao.itens.map((item) => ({
            ...item,
            colaborador,
            vencimento: item.realizado?.vencimento || null,
        }));
    });

    const itens = avaliacoes.flat();
    const vencidos = itens.filter((item) => item.status.chave === "vencido").length;
    const vencendo = itens.filter((item) => item.status.chave === "vencendo").length;
    const pendentes = itens.filter((item) => item.status.chave === "pendente").length;
    const emDia = itens.filter((item) => ["emdia", "semvalidade"].includes(item.status.chave)).length;
    const concluidos = itens.filter((item) => ["emdia", "semvalidade", "vencendo"].includes(item.status.chave)).length;
    const empresas = new Set(colaboradoresOperacionais.map((colaborador) => colaborador.empresa).filter(Boolean)).size;

    return { itens, vencidos, vencendo, pendentes, emDia, concluidos, empresas };
}

export function calcularResumoStorageDashboard({ usoStorageDashboard = {}, carregandoStorageDashboard = false } = {}) {
    const storagePercentual = calcularPercentualUsoStorage(usoStorageDashboard.totalBytes);
    const totalStorageLabel = carregandoStorageDashboard ? "Carregando..." : formatarBytes(usoStorageDashboard.totalBytes);
    const storageLimiteBytesDashboard = Math.max(1, LIMITE_STORAGE_MB * 1024 * 1024);
    const storageLimiteLabelDashboard = formatarBytes(storageLimiteBytesDashboard).replace(".00", "");

    const storageStatusDashboard = storagePercentual >= 90
        ? {
            texto: "Crítico",
            detalhe: "Pouco espaço disponível",
            apoio: "Considere liberar espaço para evitar interrupções.",
            classe: "bg-red-50 text-red-700 ring-red-200",
            iconeClasse: "bg-red-50 text-red-600",
            valorClasse: "text-red-600",
            barraClasse: "bg-red-500",
            trilhoClasse: "bg-red-100",
            statusIconKey: "alerta",
        }
        : storagePercentual >= 70
            ? {
                texto: "Atenção",
                detalhe: "Acompanhe o limite do sistema",
                apoio: "O armazenamento está subindo. Avalie arquivos grandes ou sem vínculo.",
                classe: "bg-orange-50 text-orange-700 ring-orange-200",
                iconeClasse: "bg-orange-50 text-orange-600",
                valorClasse: "text-orange-600",
                barraClasse: "bg-orange-500",
                trilhoClasse: "bg-orange-100",
                statusIconKey: "alerta",
            }
            : {
                texto: "Normal",
                detalhe: "Uso saudável do armazenamento",
                apoio: "Capacidade dentro do limite configurado.",
                classe: "bg-emerald-50 text-emerald-700 ring-emerald-200",
                iconeClasse: "bg-emerald-50 text-emerald-600",
                valorClasse: "text-slate-950",
                barraClasse: "bg-emerald-500",
                trilhoClasse: "bg-slate-100",
                statusIconKey: "normal",
            };

    return {
        storagePercentual,
        totalStorageLabel,
        storageLimiteLabelDashboard,
        storageStatusDashboard,
    };
}


function extrairDataNascimentoColaborador(colaborador = {}) {
    const valor = colaborador.dataNascimento || colaborador.data_nascimento || colaborador.nascimento || colaborador.dataAniversario || colaborador.aniversario;
    if (!valor) return null;

    if (valor instanceof Date && !Number.isNaN(valor.getTime())) return valor;

    const texto = String(valor).trim();
    if (!texto) return null;

    const formatoBr = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (formatoBr) {
        const dia = Number(formatoBr[1]);
        const mes = Number(formatoBr[2]) - 1;
        const ano = Number(formatoBr[3].length === 2 ? `20${formatoBr[3]}` : formatoBr[3]);
        const data = new Date(ano, mes, dia);
        return Number.isNaN(data.getTime()) ? null : data;
    }

    const data = new Date(texto);
    return Number.isNaN(data.getTime()) ? null : data;
}

function formatarDataIsoLocal(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function ajustarProximoAniversarioParaAnoAtual(colaborador, dataReferencia = new Date()) {
    if (!colaborador) return colaborador;

    const dataNascimento = extrairDataNascimentoColaborador(colaborador);
    if (!dataNascimento) return colaborador;

    const hojeComparacao = new Date(dataReferencia.getFullYear(), dataReferencia.getMonth(), dataReferencia.getDate());
    let dataProximoAniversario = new Date(dataReferencia.getFullYear(), dataNascimento.getMonth(), dataNascimento.getDate());

    if (dataProximoAniversario < hojeComparacao) {
        dataProximoAniversario = new Date(dataReferencia.getFullYear() + 1, dataNascimento.getMonth(), dataNascimento.getDate());
    }

    const dataIso = formatarDataIsoLocal(dataProximoAniversario);

    return {
        ...colaborador,
        dataNascimentoOriginal: colaborador.dataNascimento || colaborador.data_nascimento || colaborador.nascimento || colaborador.dataAniversario || colaborador.aniversario || "",
        dataProximoAniversario: dataIso,
        proximoAniversario: dataIso,
        proximoAniversarioFormatado: formatDate(dataIso),
        // Mantém compatibilidade com componentes antigos que exibem diretamente a data de nascimento.
        dataNascimento: dataIso,
        data_nascimento: dataIso,
        nascimento: dataIso,
        dataAniversario: dataIso,
        aniversario: dataIso,
    };
}

function colaboradorElegivelAniversarioDashboard(colaborador = {}) {
    if (!deveMostrarAniversarioColaborador(colaborador)) return false;
    if (!extrairDataNascimentoColaborador(colaborador)) return false;

    const situacaoCadastro = normalizarTextoBusca(
        `${colaborador?.status || ""} ${colaborador?.statusMobilizacao || ""} ${colaborador?.status_mobilizacao || ""}`
    );

    return (
        !situacaoCadastro.includes("inativo") &&
        !situacaoCadastro.includes("desmobilizado")
    );
}

export function calcularResumoDashboardSst({
    colaboradores = [],
    empresasBanco = [],
    documentosEmpresas = [],
    auditoria = [],
    auditoriasCampo = [],
    usoStorageDashboard = {},
    carregandoStorageDashboard = false,
    dataReferencia = new Date(),
} = {}) {
    const indicadores = calcularIndicadoresTreinamentosDashboard(colaboradores);
    const totalItens = indicadores.itens.length;
    const mesAtual = dataReferencia.getMonth();
    const anoAtual = dataReferencia.getFullYear();

    const documentosComStatus = documentosEmpresas.map((documento) => ({
        ...documento,
        status: statusEmpresaDocumento(documento.data_vencimento),
    }));

    const documentosVencidos = documentosComStatus.filter((documento) => documento.status.chave === "vencido");
    const documentosAVencer = documentosComStatus.filter((documento) => documento.status.chave === "vencendo");
    const empresasAtivas = empresasBanco.filter((empresa) => normalizarStatusEmpresa(empresa.status) === "Ativa");
    const colaboradoresMobilizados = colaboradores.filter(colaboradorContaComoMobilizado);
    const colaboradoresBloqueados = colaboradores.filter((colaborador) => statusGeral(colaborador).texto === "Bloqueado").length;
    const colaboradoresEmAnalise = colaboradores.filter((colaborador) => statusGeral(colaborador).texto === "Em análise").length;
    const colaboradoresLiberados = colaboradores.filter((colaborador) => statusGeral(colaborador).texto === "Liberado").length;
    const colaboradoresComPendencia = colaboradores.filter((colaborador) => statusGeral(colaborador).texto === "Com pendência").length;

    const auditoriasMes = auditoria.filter((item) => {
        const data = item.created_at ? new Date(item.created_at) : null;
        return data && data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
    }).length;

    const desviosAbertos = auditoria.filter((item) => {
        const texto = normalizarTextoBusca(`${item.acao || ""} ${item.tabela || ""} ${item.descricao || ""}`);
        return texto.includes("desvio") && !texto.includes("fechado") && !texto.includes("concluido") && !texto.includes("concluído");
    }).length;

    const auditoriasCampoNormalizadas = auditoriasCampo.map(normalizarAuditoriaCampo);
    const auditoriasCampoMes = auditoriasCampoNormalizadas.filter((item) => {
        const data = item.createdAt ? new Date(item.createdAt) : null;
        return data && data.getMonth() === mesAtual && data.getFullYear() === anoAtual;
    });
    const mediaConformidadeCampo = auditoriasCampoMes.length
        ? Math.round(auditoriasCampoMes.reduce((total, item) => total + Number(item.pontuacao || 0), 0) / auditoriasCampoMes.length)
        : 0;
    const desviosCampoAbertos = auditoriasCampoNormalizadas.filter(auditoriaCampoAberta).length;
    const desviosCampoCorrigidos = auditoriasCampoNormalizadas.filter((item) => {
        const status = normalizarTextoBusca(item.statusDesvio || "");
        return (item.totalDesvios || 0) > 0 && status.includes("corrigido");
    }).length;
    const topDesviosCampo = Object.values(
        auditoriasCampoNormalizadas.reduce((acc, item) => {
            const chave = item.categoriaDesvioPrincipal || item.desvios?.[0]?.categoria || "Desvio não classificado";
            if (!acc[chave]) acc[chave] = { categoria: chave, total: 0, abertos: 0, graves: 0 };
            acc[chave].total += Number(item.totalDesvios || 0) || 1;
            if (auditoriaCampoAberta(item)) acc[chave].abertos += 1;
            if (item.temDesvioGrave) acc[chave].graves += 1;
            return acc;
        }, {})
    ).sort((a, b) => b.total - a.total || b.graves - a.graves).slice(0, 5);

    const aniversariantesElegiveis = colaboradores
        .filter(colaboradorElegivelAniversarioDashboard)
        .map((colaborador) => ajustarProximoAniversarioParaAnoAtual(colaborador, dataReferencia));
    const aniversariantesMes = aniversariantesElegiveis
        .filter((colaborador) => mesAniversarioColaborador(colaborador) === mesAtual + 1)
        .sort((a, b) => (diaAniversarioColaborador(a) || 99) - (diaAniversarioColaborador(b) || 99));
    const proximoAniversarioCalculado = proximoAniversariante(aniversariantesElegiveis);
    const proximoAniversarioDashboard = proximoAniversarioCalculado?.colaborador || null;

    const storage = calcularResumoStorageDashboard({ usoStorageDashboard, carregandoStorageDashboard });

    const itensDocumentaisMonitorados = indicadores.itens
        .filter((item) => possuiDocumentoEnviadoPendencia(item))
        .sort(compararPendenciasCriticas);

    const pendencias = itensDocumentaisMonitorados.filter(
        (item) => ["pendente", "vencido"].includes(item.status.chave)
    );

    const documentosFuncionariosVencidos = itensDocumentaisMonitorados.filter(
        (item) => item.status.chave === "vencido"
    );
    const documentosFuncionariosAVencer30Dias = itensDocumentaisMonitorados.filter((item) => {
        if (item.status.chave !== "vencendo") return false;

        const dias = diasParaVencer(item.vencimento);
        return dias !== null && dias >= 0 && dias <= 30;
    });

    const colaboradoresPorFuncao = Object.values(
        colaboradoresMobilizados.reduce((acc, colaborador) => {
            const funcao = obterFuncaoBaseColaborador(colaborador);
            if (!acc[funcao]) acc[funcao] = { funcao, quantidade: 0 };
            acc[funcao].quantidade += 1;
            return acc;
        }, {})
    ).sort((a, b) => b.quantidade - a.quantidade || a.funcao.localeCompare(b.funcao));

    const maiorQuantidadePorFuncao = Math.max(...colaboradoresPorFuncao.map((item) => item.quantidade), 1);

    const rankingPendenciasEmpresa = calcularRankingPendenciasEmpresa({
        colaboradores,
        empresasBanco,
        documentosEmpresas,
        indicadores,
    });

    const documentosPorTipo = Object.values(
        documentosEmpresas.reduce((acc, documento) => {
            const tipo = documento.tipo_documento || "Sem tipo";

            if (!acc[tipo]) {
                acc[tipo] = { tipo, total: 0, vencidos: 0, vencendo: 0, emDia: 0 };
            }

            const status = statusEmpresaDocumento(documento.data_vencimento);

            acc[tipo].total += 1;

            if (status.chave === "vencido") acc[tipo].vencidos += 1;
            else if (status.chave === "vencendo") acc[tipo].vencendo += 1;
            else acc[tipo].emDia += 1;

            return acc;
        }, {})
    ).sort((a, b) => b.total - a.total || a.tipo.localeCompare(b.tipo));

    const certificadosEnviados = indicadores.itens
        .filter((item) => item.realizado)
        .map((item) => ({
            origem: "Treinamento",
            nome: item.realizado?.arquivo || item.treinamento?.nome || "Certificado",
            titulo: item.treinamento?.nome || "Treinamento",
            colaborador: item.colaborador?.nome || "-",
            empresa: item.colaborador?.empresaExibicao || item.colaborador?.empresa || "-",
            data: item.realizado?.created_at || item.realizado?.realizado || item.realizado?.vencimento || "",
            status: item.status.texto,
        }));

    const documentosEmpresariaisEnviados = documentosEmpresas.map((doc) => {
        const empresa = empresasBanco.find((item) => String(item.id) === String(doc.empresa_id));

        return {
            origem: "Empresa",
            nome: doc.arquivo_nome || doc.tipo_documento || "Documento empresarial",
            titulo: doc.tipo_documento || "Documento empresarial",
            colaborador: empresa?.nome || "-",
            empresa: empresa?.nome || "-",
            data: doc.created_at || doc.data_emissao || doc.data_vencimento || "",
            status: statusEmpresaDocumento(doc.data_vencimento).texto,
        };
    });

    const ultimosDocumentosEnviados = [...certificadosEnviados, ...documentosEmpresariaisEnviados]
        .sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0))
        .slice(0, 8);

    const ultimosEmailsEnviados = auditoria
        .filter((item) => normalizarTextoBusca(`${item.acao || ""} ${item.descricao || ""}`).includes("email"))
        .slice(0, 8);

    const ultimosAcessos = auditoria
        .filter((item) => normalizarTextoBusca(`${item.acao || ""} ${item.descricao || ""}`).includes("acesso"))
        .slice(0, 8);

    const alertasImportantes = [
        ...documentosVencidos.slice(0, 4).map((doc) => ({
            tipo: "Documento empresarial vencido",
            texto: doc.tipo_documento || "Documento empresarial",
            data: `Vencimento: ${formatDate(doc.data_vencimento)}`,
            classe: "bg-red-50 text-red-700 ring-red-100",
        })),
        ...documentosFuncionariosVencidos.slice(0, 4).map((item) => ({
            tipo: "Documento de funcionário vencido",
            texto: `${item.colaborador.nome} · ${item.treinamento.nome}`,
            data: `Vencimento: ${formatDate(item.vencimento)}`,
            classe: "bg-red-50 text-red-700 ring-red-100",
        })),
        ...documentosFuncionariosAVencer30Dias.slice(0, 4).map((item) => {
            const dias = diasParaVencer(item.vencimento);

            return {
                tipo: "Documento de funcionário a vencer",
                texto: `${item.colaborador.nome} · ${item.treinamento.nome}`,
                data: `Vencimento: ${formatDate(item.vencimento)} · faltam ${dias} dia(s)`,
                classe: "bg-orange-50 text-orange-700 ring-orange-100",
            };
        }),
        ...(storage.storagePercentual >= 80
            ? [{
                tipo: "Armazenamento",
                texto: `Uso estimado do Storage em ${storage.storagePercentual}%`,
                classe: "bg-orange-50 text-orange-700 ring-orange-100",
            }]
            : []),
    ].slice(0, 8);

    return {
        indicadores,
        totalItens,
        mesAtual,
        anoAtual,
        documentosComStatus,
        documentosVencidos,
        documentosAVencer,
        documentosFuncionariosVencidos,
        documentosFuncionariosAVencer30Dias,
        empresasAtivas,
        colaboradoresMobilizados,
        colaboradoresBloqueados,
        colaboradoresEmAnalise,
        colaboradoresLiberados,
        colaboradoresComPendencia,
        auditoriasMes,
        desviosAbertos,
        auditoriasCampoNormalizadas,
        auditoriasCampoMes,
        mediaConformidadeCampo,
        desviosCampoAbertos,
        desviosCampoCorrigidos,
        topDesviosCampo,
        aniversariantesMes,
        proximoAniversarioDashboard,
        pendencias,
        colaboradoresPorFuncao,
        maiorQuantidadePorFuncao,
        rankingPendenciasEmpresa,
        documentosPorTipo,
        ultimosDocumentosEnviados,
        ultimosEmailsEnviados,
        ultimosAcessos,
        alertasImportantes,
        ...storage,
    };
}


function possuiDocumentoEnviadoPendencia(item = {}) {
    const statusChave = item.status?.chave || "";
    const realizado = item.realizado || null;

    if (!realizado) return false;
    if (!["vencido", "vencendo"].includes(statusChave)) return false;

    return Boolean(
        realizado.id ||
        realizado.arquivo ||
        realizado.arquivoUrl ||
        realizado.arquivo_url ||
        realizado.nomeArquivo ||
        realizado.nome_arquivo ||
        realizado.nome_do_arquivo ||
        realizado.tipoTreinamento ||
        realizado.tipo_treinamento ||
        realizado.nomeTreinamento ||
        realizado.nome_treinamento ||
        realizado.createdAt ||
        realizado.created_at ||
        realizado.realizado ||
        realizado.data_realizacao ||
        realizado.vencimento ||
        realizado.data_vencimento
    );
}

function obterTimestampPendencia(item = {}) {
    const realizado = item.realizado || {};
    const candidatos = [
        realizado.updatedAt,
        realizado.updated_at,
        realizado.createdAt,
        realizado.created_at,
        realizado.dataAtualizacao,
        realizado.data_atualizacao,
        realizado.dataUpload,
        realizado.data_upload,
        realizado.realizado,
        realizado.data_realizacao,
        item.createdAt,
        item.created_at,
        item.vencimento,
        realizado.vencimento,
        realizado.data_vencimento,
    ];

    for (const candidato of candidatos) {
        if (!candidato) continue;
        const data = new Date(candidato);
        if (!Number.isNaN(data.getTime())) return data.getTime();
    }

    return 0;
}

function compararPendenciasCriticas(a = {}, b = {}) {
    const dataB = obterTimestampPendencia(b);
    const dataA = obterTimestampPendencia(a);

    if (dataB !== dataA) return dataB - dataA;

    const ordem = { vencido: 1, vencendo: 2 };
    const ordemStatus = (ordem[a.status?.chave] || 99) - (ordem[b.status?.chave] || 99);

    if (ordemStatus !== 0) return ordemStatus;

    if (!a.vencimento && !b.vencimento) {
        return (a.colaborador?.nome || "").localeCompare(b.colaborador?.nome || "");
    }

    if (!a.vencimento) return 1;
    if (!b.vencimento) return -1;

    return diasParaVencer(a.vencimento) - diasParaVencer(b.vencimento);
}

function calcularRankingPendenciasEmpresa({ colaboradores = [], empresasBanco = [], documentosEmpresas = [], indicadores = { itens: [] } }) {
    const empresasPorId = new Map();
    const chavePorNome = new Map();
    const grupos = {};
    const nomeNormalizado = (nome) => normalizarTextoBusca(nome || "Empresa não informada").trim() || "empresa-nao-informada";

    empresasBanco.forEach((empresa) => {
        const chave = empresa.id ? `id:${empresa.id}` : `nome:${nomeNormalizado(empresa.nome)}`;
        const nome = empresa.nome || "Empresa não informada";

        if (empresa.id) empresasPorId.set(String(empresa.id), empresa);
        chavePorNome.set(nomeNormalizado(nome), chave);

        if (!grupos[chave]) {
            grupos[chave] = {
                empresa: nome,
                totalColaboradores: 0,
                documentosVencidos: 0,
                documentosAVencer: 0,
                treinamentosVencidos: 0,
                treinamentosAVencer: 0,
                pendenciasLeves: 0,
                colaboradoresBloqueadosSet: new Set(),
            };
        }
    });

    const obterChaveGrupo = (empresaId, nomeEmpresa) => {
        if (empresaId) return `id:${empresaId}`;
        const nome = nomeNormalizado(nomeEmpresa);
        return chavePorNome.get(nome) || `nome:${nome}`;
    };

    const obterNomeEmpresa = (empresaId, nomeEmpresa) => {
        if (empresaId && empresasPorId.has(String(empresaId))) {
            return empresasPorId.get(String(empresaId))?.nome || nomeEmpresa || "Empresa não informada";
        }
        return nomeEmpresa || "Empresa não informada";
    };

    const obterOuCriarGrupo = (empresaId, nomeEmpresa) => {
        const chave = obterChaveGrupo(empresaId, nomeEmpresa);
        if (!grupos[chave]) {
            grupos[chave] = {
                empresa: obterNomeEmpresa(empresaId, nomeEmpresa),
                totalColaboradores: 0,
                documentosVencidos: 0,
                documentosAVencer: 0,
                treinamentosVencidos: 0,
                treinamentosAVencer: 0,
                pendenciasLeves: 0,
                colaboradoresBloqueadosSet: new Set(),
            };
        }
        return grupos[chave];
    };

    colaboradores.forEach((colaborador) => {
        const empresaId = colaborador.empresaId || colaborador.empresa_id || null;
        const nomeEmpresa = colaborador.empresaExibicao || colaborador.empresa || "Empresa não informada";
        const grupo = obterOuCriarGrupo(empresaId, nomeEmpresa);
        const chaveColaborador = colaborador.id || colaborador.codigoFuncionario || colaborador.nome;
        const classificacao = statusGeral(colaborador);

        grupo.totalColaboradores += 1;

        if (classificacao.texto === "Bloqueado" && chaveColaborador) {
            grupo.colaboradoresBloqueadosSet.add(chaveColaborador);
        } else if (["Com pendência", "Em análise"].includes(classificacao.texto)) {
            grupo.pendenciasLeves += 1;
        }
    });

    documentosEmpresas.forEach((documento) => {
        const empresaId = documento.empresa_id || documento.empresaId || null;
        const empresaBanco = empresaId ? empresasPorId.get(String(empresaId)) : null;
        const nomeEmpresa = empresaBanco?.nome || documento.empresa || documento.empresaNome || documento.nome_empresa || "Empresa não informada";
        const grupo = obterOuCriarGrupo(empresaId, nomeEmpresa);
        const status = statusEmpresaDocumento(documento.data_vencimento);

        if (status.chave === "vencido") grupo.documentosVencidos += 1;
        else if (status.chave === "vencendo") grupo.documentosAVencer += 1;
        else if (["semvencimento", "semdata"].includes(status.chave)) grupo.pendenciasLeves += 1;
    });

    indicadores.itens.forEach((item) => {
        const colaborador = item.colaborador || {};
        const empresaId = colaborador.empresaId || colaborador.empresa_id || null;
        const nomeEmpresa = colaborador.empresaExibicao || colaborador.empresa || "Empresa não informada";
        const grupo = obterOuCriarGrupo(empresaId, nomeEmpresa);
        const chaveColaborador = colaborador.id || colaborador.codigoFuncionario || colaborador.nome;

        if (item.status.chave === "vencido") {
            grupo.treinamentosVencidos += 1;
            if (chaveColaborador) grupo.colaboradoresBloqueadosSet.add(chaveColaborador);
        } else if (item.status.chave === "vencendo") {
            grupo.treinamentosAVencer += 1;
            grupo.pendenciasLeves += 1;
        } else if (item.status.chave === "pendente") {
            if (itemDocumentoCriticoColaborador(item)) {
                if (chaveColaborador) grupo.colaboradoresBloqueadosSet.add(chaveColaborador);
            } else {
                grupo.pendenciasLeves += 1;
            }
        }
    });

    return Object.values(grupos)
        .map((grupo) => {
            const colaboradoresBloqueados = grupo.colaboradoresBloqueadosSet.size;
            const critico = grupo.documentosVencidos > 0 || grupo.treinamentosVencidos > 0 || colaboradoresBloqueados > 0;
            const atencao = !critico && (grupo.documentosAVencer > 0 || grupo.treinamentosAVencer > 0 || grupo.pendenciasLeves > 0);
            const statusEmpresa = critico ? "Crítico" : atencao ? "Atenção" : "Regular";
            const statusEmpresaClasse = critico
                ? "bg-red-50 text-red-700 ring-red-200"
                : atencao
                    ? "bg-orange-50 text-orange-700 ring-orange-200"
                    : "bg-emerald-50 text-emerald-700 ring-emerald-200";
            const criticidade = critico ? 3 : atencao ? 2 : 1;
            const totalPendencias =
                grupo.documentosVencidos +
                grupo.documentosAVencer +
                grupo.treinamentosVencidos +
                grupo.treinamentosAVencer +
                grupo.pendenciasLeves +
                colaboradoresBloqueados;

            return {
                empresa: grupo.empresa,
                totalColaboradores: grupo.totalColaboradores,
                documentosVencidos: grupo.documentosVencidos,
                documentosAVencer: grupo.documentosAVencer,
                treinamentosVencidos: grupo.treinamentosVencidos,
                colaboradoresBloqueados,
                pendenciasLeves: grupo.pendenciasLeves,
                statusEmpresa,
                statusEmpresaClasse,
                criticidade,
                totalPendencias,
            };
        })
        .filter((grupo) => grupo.totalColaboradores > 0 || grupo.totalPendencias > 0)
        .sort((a, b) =>
            b.criticidade - a.criticidade ||
            b.totalPendencias - a.totalPendencias ||
            b.documentosVencidos - a.documentosVencidos ||
            b.treinamentosVencidos - a.treinamentosVencidos ||
            b.colaboradoresBloqueados - a.colaboradoresBloqueados ||
            b.totalColaboradores - a.totalColaboradores ||
            a.empresa.localeCompare(b.empresa)
        );
}
