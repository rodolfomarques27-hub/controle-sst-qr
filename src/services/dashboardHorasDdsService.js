import { listarRegistrosDds } from "./ddsRegistrosService";

function dataIsoLocal(valor = "") {
    const correspondencia = String(valor || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!correspondencia) return null;

    const data = new Date(
        Number(correspondencia[1]),
        Number(correspondencia[2]) - 1,
        Number(correspondencia[3])
    );

    return Number.isNaN(data.getTime()) ? null : data;
}

function chaveFrequencia(numero, dia = {}) {
    const chaveDia = dia.chaveAssistida
        || dia.indiceAssistido
        || dia.indice
        || dia.data
        || dia.nome
        || dia.curto;

    return `${numero}-${chaveDia}`;
}

function participantePresenteNoDia(participante = {}, dia = {}, frequencia = {}) {
    const numero = participante.numero || participante.ordem || participante.indice || "";
    const status = String(frequencia[chaveFrequencia(numero, dia)] || "").trim().toLowerCase();

    return status === "presente" || status === "p";
}

function formatarHorasDds(minutos = 0) {
    const horas = Number(minutos || 0) / 60;

    return new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: Number.isInteger(horas) ? 0 : 1,
        maximumFractionDigits: 1,
    }).format(horas);
}

export function calcularHorasTrabalhadasDdsMes(registros = [], dataReferencia = new Date()) {
    const mes = dataReferencia.getMonth();
    const ano = dataReferencia.getFullYear();
    let totalMinutosHomem = 0;
    let totalPresencas = 0;
    let totalDias = 0;
    const itens = [];

    registros.forEach((registro, indiceRegistro) => {
        const conferencia = registro?.dados?.conferenciaAssistida || {};
        if (String(conferencia?.fechamento?.status || "").toLowerCase() !== "concluida") return;

        const temasDias = Array.isArray(conferencia.temasDias) ? conferencia.temasDias : [];
        const participantes = Array.isArray(conferencia.participantes) ? conferencia.participantes : [];
        const frequencia = conferencia.frequencia || {};
        let minutosRegistro = 0;
        let presencasRegistro = 0;
        let diasRegistro = 0;

        temasDias.forEach((dia) => {
            const data = dataIsoLocal(dia?.data);
            const minutosTrabalhados = Number(dia?.minutosTrabalhados || 0);

            if (
                !data
                || data.getMonth() !== mes
                || data.getFullYear() !== ano
                || dia?.jornadaValida !== true
                || dia?.jornadaPendente === true
                || minutosTrabalhados <= 0
            ) return;

            const presentes = participantes.reduce(
                (total, participante) => total + (participantePresenteNoDia(participante, dia, frequencia) ? 1 : 0),
                0
            );

            if (presentes <= 0) return;

            minutosRegistro += minutosTrabalhados * presentes;
            presencasRegistro += presentes;
            diasRegistro += 1;
        });

        if (minutosRegistro <= 0) return;

        totalMinutosHomem += minutosRegistro;
        totalPresencas += presencasRegistro;
        totalDias += diasRegistro;
        itens.push({
            id: registro.id || registro.codigo || `dds-${indiceRegistro}`,
            principal: registro.empresaNome || "Empresa não informada",
            titulo: `${formatarHorasDds(minutosRegistro)} horas trabalhadas`,
            apoio: registro.obraNome || "Obra não informada",
            status: "Concluído",
            detalhe: `${diasRegistro} dia(s) com jornada e ${presencasRegistro} presença(s) contabilizada(s).`,
        });
    });

    return {
        totalMinutos: totalMinutosHomem,
        totalHorasFormatado: formatarHorasDds(totalMinutosHomem),
        totalPresencas,
        totalDias,
        itens,
    };
}

export async function carregarHorasTrabalhadasDdsMes({ supabase, dataReferencia = new Date() } = {}) {
    const primeiroDia = new Date(dataReferencia.getFullYear(), dataReferencia.getMonth(), 1);
    const ultimoDia = new Date(dataReferencia.getFullYear(), dataReferencia.getMonth() + 1, 0);
    const isoLocal = (data) => [
        data.getFullYear(),
        String(data.getMonth() + 1).padStart(2, "0"),
        String(data.getDate()).padStart(2, "0"),
    ].join("-");

    const registros = await listarRegistrosDds({
        supabase,
        periodoInicio: isoLocal(primeiroDia),
        periodoFim: isoLocal(ultimoDia),
        limite: 500,
    });

    return calcularHorasTrabalhadasDdsMes(registros, dataReferencia);
}
