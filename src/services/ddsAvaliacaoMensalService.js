const texto = (valor) => String(valor ?? "").trim();

const normalizar = (valor) => texto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const somenteDigitos = (valor) => texto(valor).replace(/\D/g, "");

function dataIso(valor) {
    const base = texto(valor).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(base)) return base;
    const br = base.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return br ? `${br[3]}-${br[2]}-${br[1]}` : "";
}

export function obterPeriodoMensalDds(ano, mes) {
    const anoNumero = Number(ano);
    const mesNumero = Number(mes);
    if (!Number.isInteger(anoNumero) || !Number.isInteger(mesNumero) || mesNumero < 1 || mesNumero > 12) {
        throw new Error("Ano e mês inválidos para a avaliação mensal DDS.");
    }
    const inicio = `${anoNumero}-${String(mesNumero).padStart(2, "0")}-01`;
    const fim = new Date(Date.UTC(anoNumero, mesNumero, 0)).toISOString().slice(0, 10);
    return { ano: anoNumero, mes: mesNumero, inicio, fim };
}

function dentroDoPeriodo(data, periodo) {
    return Boolean(data && data >= periodo.inicio && data <= periodo.fim);
}

export function diaElegivelAssiduidadeMensalDds(dia = {}) {
    const jornadaTipo = normalizar(dia?.jornadaTipo || dia?.jornada_tipo);
    if (jornadaTipo.includes("sabado") || jornadaTipo.includes("domingo") || jornadaTipo.includes("extra integral")) {
        return false;
    }

    const iso = dataIso(dia?.data || dia?.dataDds || dia?.dia);
    if (!iso) return true;
    const [ano, mes, dataDia] = iso.split("-").map(Number);
    const diaSemana = new Date(ano, mes - 1, dataDia, 12).getDay();
    return diaSemana !== 0 && diaSemana !== 6;
}

function chaveDia(dia = {}) {
    return texto(dia.chaveAssistida || dia.indiceAssistido || dia.indice || dia.data || dia.nome || dia.curto);
}

function chaveFrequencia(numero, dia) {
    return `${numero}-${chaveDia(dia)}`;
}

export function identificarParticipanteMensalDds(participante = {}) {
    const idInterno = texto(participante.colaboradorId || participante.colaborador_id);
    if (idInterno) return `id:${idInterno}`;
    const cpf = somenteDigitos(participante.cpf || participante.cpfColaborador);
    if (cpf.length === 11) return `cpf:${cpf}`;
    const matricula = texto(participante.matriculaEsocial || participante.matricula_esocial || participante.matricula);
    if (matricula) return `esocial:${normalizar(matricula)}`;
    const estruturado = texto(participante.colaboradorCadastroChave || participante.codigoSafescan || participante.codigoFuncionario || participante.idAdicional);
    if (estruturado) return `estruturado:${normalizar(estruturado)}`;
    const nome = normalizar(participante.nome);
    return nome ? `nome:${nome}` : "";
}

function statusFrequencia(valor) {
    const status = normalizar(valor);
    if (["presente", "p", "sim"].includes(status)) return "presente";
    if (["ausente", "a", "falta", "faltou", "nao"].includes(status)) return "ausente";
    if (["ferias", "férias", "f"].includes(status)) return "ferias";
    if (["atestado", "atestado medico", "atestado médico"].includes(status)) return "atestado";
    return "pendente";
}

function chaveDocumento(registro = {}) {
    const dados = registro.dados || {};
    const conferencia = dados.conferenciaAssistida || {};
    const documento = conferencia.documento || dados.documentoAssinado || dados.documento || {};
    return texto(documento.hash || documento.sha256 || documento.id || documento.documentoId || documento.path || documento.caminho || documento.url)
        || `codigo:${normalizar(registro.codigo)}`;
}

function motivoInelegibilidade(registro, periodo) {
    const status = normalizar(registro?.status);
    if (["excluido", "excluida", "cancelado", "cancelada"].includes(status)) return "registro_excluido_ou_cancelado";
    const inicio = dataIso(registro?.periodoInicio || registro?.periodo_inicio);
    const fim = dataIso(registro?.periodoFim || registro?.periodo_fim);
    if (!inicio || !fim || fim < periodo.inicio || inicio > periodo.fim) return "sem_dia_no_mes";
    const conferencia = registro?.dados?.conferenciaAssistida;
    if (!conferencia) return "sem_conferencia_assistida";
    if (conferencia?.fechamento?.status !== "concluida") return "conferencia_nao_finalizada";
    if (!Array.isArray(conferencia.participantes) || !conferencia.participantes.length) return "sem_participantes";
    if (!Array.isArray(conferencia.diasAtivos) || !conferencia.diasAtivos.some((dia) => dentroDoPeriodo(dataIso(dia?.data), periodo))) return "sem_dia_ativo_no_mes";
    return "";
}

export function selecionarDdsMensais(registros = [], { ano, mes, empresaId = "", obraId = "" } = {}) {
    const periodo = obterPeriodoMensalDds(ano, mes);
    const vistos = new Map();
    const incluidos = [];
    const excluidos = [];

    for (const registro of Array.isArray(registros) ? registros : []) {
        const codigo = texto(registro?.codigo) || "DDS sem código";
        if (empresaId && texto(registro?.empresaId || registro?.empresa_id) !== texto(empresaId)) {
            excluidos.push({ codigo, motivo: "empresa_divergente" });
            continue;
        }
        if (obraId && texto(registro?.obraId || registro?.obra_id) !== texto(obraId)) {
            excluidos.push({ codigo, motivo: "obra_divergente" });
            continue;
        }
        const motivo = motivoInelegibilidade(registro, periodo);
        if (motivo) {
            excluidos.push({ codigo, motivo });
            continue;
        }
        const documento = chaveDocumento(registro);
        if (vistos.has(documento)) {
            excluidos.push({ codigo, motivo: "documento_duplicado", duplicadoDe: vistos.get(documento) });
            continue;
        }
        vistos.set(documento, codigo);
        incluidos.push(registro);
    }
    return { periodo, encontrados: Array.isArray(registros) ? registros.length : 0, incluidos, excluidos };
}

function consolidarRegistro(registro, periodo) {
    const conferencia = registro.dados.conferenciaAssistida;
    const dias = conferencia.diasAtivos
        .filter((dia) => dentroDoPeriodo(dataIso(dia?.data), periodo) && diaElegivelAssiduidadeMensalDds(dia))
        .map((dia) => ({ ...dia, data: dataIso(dia.data) }));
    const participantes = conferencia.participantes;
    const frequencia = conferencia.frequencia || {};
    const linhas = [];

    for (const participante of participantes) {
        const identidade = identificarParticipanteMensalDds(participante);
        for (const dia of dias) {
            const numero = participante.numero || participante.ordem || participante.indice || "";
            const chave = chaveFrequencia(numero, dia);
            linhas.push({
                ddsCodigo: texto(registro.codigo),
                data: dia.data,
                chaveFrequencia: chave,
                participanteId: identidade,
                participante: texto(participante.nome),
                funcao: texto(participante.funcao || participante.cargo) || "Sem função",
                empresa: texto(participante.empresa || participante.empresaNome || registro.empresaNome),
                complementar: participante.origem === "adicional" || participante.tipo === "visitante",
                status: statusFrequencia(frequencia[chave]),
            });
        }
    }

    const temas = (Array.isArray(conferencia.temasDias) ? conferencia.temasDias : [])
        .filter((dia) => dentroDoPeriodo(dataIso(dia?.data), periodo) && !dia?.semAtividadeConfirmada)
        .map((dia) => ({
            ddsCodigo: texto(registro.codigo),
            data: dataIso(dia.data),
            tema: texto(dia.temaConfirmado || dia.tema),
            responsavel: texto(dia.responsavelConfirmado || dia.responsavelPlanejado || registro.responsavelNome),
            origemDocumental: texto(dia.origemDocumentalTemaConfirmado || dia.origemTemaConfirmado) || "nao_classificada",
            avisoDocumental: texto(dia.avisoDocumental || dia.alertaDocumental),
        }));

    return { registro, dias, linhas, temas };
}

const porcentagem = (parte, total) => total > 0 ? Number(((parte / total) * 100).toFixed(2)) : null;

export function consolidarAvaliacaoMensalDds(registros = [], filtros = {}) {
    const selecao = selecionarDdsMensais(registros, filtros);
    const recortes = selecao.incluidos.map((registro) => consolidarRegistro(registro, selecao.periodo));
    const participanteDia = recortes.flatMap((item) => item.linhas);
    const temas = recortes.flatMap((item) => item.temas);
    const justificados = participanteDia.filter((item) => item.status === "ferias" || item.status === "atestado").length;
    const possibilidades = participanteDia.length - justificados;
    const presencas = participanteDia.filter((item) => item.status === "presente").length;
    const ausencias = participanteDia.filter((item) => item.status === "ausente").length;
    const pendencias = participanteDia.filter((item) => item.status === "pendente").length;
    const localizado = presencas + ausencias + pendencias;
    const fechamentoValido = localizado === possibilidades;
    const participantesMap = new Map();
    participanteDia.forEach((linha) => {
        if (!linha.participanteId) return;
        if (!participantesMap.has(linha.participanteId)) participantesMap.set(linha.participanteId, { ...linha, presencas: 0, ausencias: 0, pendencias: 0, justificados: 0 });
        const participante = participantesMap.get(linha.participanteId);
        if (linha.status === "presente") participante.presencas += 1;
        else if (linha.status === "ausente") participante.ausencias += 1;
        else if (linha.status === "ferias" || linha.status === "atestado") participante.justificados += 1;
        else participante.pendencias += 1;
    });
    const participantes = [...participantesMap.values()];
    const temasValidos = temas.filter((item) => item.tema);
    const temasDistintos = new Set(temasValidos.map((item) => normalizar(item.tema))).size;
    const responsaveis = new Map();
    temasValidos.forEach((item) => {
        const chave = normalizar(item.responsavel) || "nao informado";
        if (!responsaveis.has(chave)) responsaveis.set(chave, { responsavel: item.responsavel || "Não informado", aplicacoes: 0, datas: [], temas: [], dds: [] });
        const alvo = responsaveis.get(chave);
        alvo.aplicacoes += 1;
        alvo.datas.push(item.data);
        alvo.temas.push(item.tema);
        alvo.dds.push(item.ddsCodigo);
    });
    const semanas = recortes.map(({ registro, dias, linhas, temas: temasRecorte }) => {
        const justificadosSemana = linhas.filter((item) => item.status === "ferias" || item.status === "atestado").length;
        const total = linhas.length - justificadosSemana;
        const presentes = linhas.filter((item) => item.status === "presente").length;
        const ausentes = linhas.filter((item) => item.status === "ausente").length;
        const pendentes = linhas.filter((item) => item.status === "pendente").length;
        return { codigo: registro.codigo, periodoInicio: registro.periodoInicio, periodoFim: registro.periodoFim, diasIncluidos: dias.map((dia) => dia.data), participantesUnicos: new Set(linhas.map((item) => item.participanteId).filter(Boolean)).size, possibilidades: total, presencas: presentes, ausencias: ausentes, pendencias: pendentes, justificados: justificadosSemana, assiduidade: porcentagem(presentes, total), absenteismo: porcentagem(ausentes, total), temas: temasRecorte };
    }).sort((a, b) => texto(a.periodoInicio).localeCompare(texto(b.periodoInicio)));

    return {
        filtros: { ...filtros, periodo: selecao.periodo },
        integridade: { encontrados: selecao.encontrados, incluidos: selecao.incluidos.length, excluidos: selecao.excluidos, fechamentoValido, esperado: possibilidades, localizado, divergencia: possibilidades - localizado },
        resumo: {
            ddsLocalizados: selecao.encontrados,
            ddsIncluidos: selecao.incluidos.length,
            ddsExcluidos: selecao.excluidos.length,
            diasAtivos: new Set(recortes.flatMap((item) => item.dias.map((dia) => dia.data))).size,
            colaboradoresUnicos: participantes.length,
            participantesComplementares: new Set(participanteDia.filter((item) => item.complementar).map((item) => item.participanteId)).size,
            possibilidades, presencas, ausencias, pendencias, justificados,
            assiduidade: fechamentoValido ? porcentagem(presencas, possibilidades) : null,
            absenteismo: fechamentoValido ? porcentagem(ausencias, possibilidades) : null,
            pendenciasPercentual: fechamentoValido ? porcentagem(pendencias, possibilidades) : null,
            ausenciaTotal: participantes.filter((item) => item.ausencias > 0 && item.presencas === 0).length,
            ausenciaParcial: participantes.filter((item) => item.ausencias > 0 && item.presencas > 0).length,
            presencaIntegral: participantes.filter((item) => item.presencas > 0 && item.ausencias === 0 && item.pendencias === 0).length,
            temasDistintos,
            aplicacoesTemas: temasValidos.length,
            temasRepetidos: Math.max(temasValidos.length - temasDistintos, 0),
        },
        participanteDia,
        participantes,
        temas,
        responsaveis: [...responsaveis.values()],
        comparacaoSemanal: semanas,
        rastreabilidade: participanteDia.map((item) => ({ ddsCodigo: item.ddsCodigo, data: item.data, participanteId: item.participanteId, status: item.status, chaveFrequencia: item.chaveFrequencia })),
    };
}
