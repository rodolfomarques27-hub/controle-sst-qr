import assert from "node:assert/strict";
import { consolidarAvaliacaoMensalDds, identificarParticipanteMensalDds } from "../src/services/ddsAvaliacaoMensalService.js";
import { calcularHorasTrabalhadasDdsMes } from "../src/services/dashboardHorasDdsService.js";

const participante = (numero, nome, extras = {}) => ({ numero, nome, funcao: "Pedreiro", colaboradorId: `id-${numero}`, ...extras });
const dia = (data, indice) => ({ data, indice, chaveAssistida: String(indice) });
const registro = ({ codigo, inicio = "2026-07-01", fim = "2026-07-05", dias = [dia("2026-07-01", 1)], participantes = [participante(1, "Ana")], frequencia = { "1-1": "presente" }, temas = [], status = "Ativo", fechamento = "concluida", documento = {} }) => ({
    codigo, empresaId: "e1", obraId: "o1", empresaNome: "Empresa", obraNome: "Obra", periodoInicio: inicio, periodoFim: fim, status,
    dados: { conferenciaAssistida: { fechamento: { status: fechamento }, participantes, diasAtivos: dias, frequencia, temasDias: temas, documento } },
});

const filtros = { ano: 2026, mes: 7, empresaId: "e1", obraId: "o1" };

{
    const resultado = consolidarAvaliacaoMensalDds([registro({ codigo: "DDS-1" })], filtros);
    assert.equal(resultado.resumo.possibilidades, 1);
    assert.equal(resultado.resumo.assiduidade, 100);
    assert.equal(resultado.integridade.fechamentoValido, true);
}

{
    const r1 = registro({ codigo: "DDS-1", dias: [dia("2026-07-01", 1), dia("2026-07-02", 2)], frequencia: { "1-1": "presente", "1-2": "ausente" } });
    const r2 = registro({ codigo: "DDS-2", inicio: "2026-07-08", fim: "2026-07-08", dias: [dia("2026-07-08", 8)], frequencia: { "1-8": "presente" } });
    const resultado = consolidarAvaliacaoMensalDds([r1, r2], filtros);
    assert.equal(resultado.resumo.colaboradoresUnicos, 1, "não deve somar a mesma pessoa como duas");
    assert.equal(resultado.resumo.possibilidades, 3);
    assert.equal(resultado.resumo.assiduidade, 66.67);
    assert.equal(resultado.resumo.absenteismo, 33.33);
    assert.equal(resultado.resumo.ausenciaParcial, 1);
    assert.equal(resultado.resumo.ausenciaTotal, 0);
    assert.equal(resultado.resumo.presencaIntegral, 0);
}

{
    const cruzado = registro({ codigo: "DDS-MESES", inicio: "2026-07-29", fim: "2026-08-04", dias: [dia("2026-07-31", 31), dia("2026-08-01", 1)], frequencia: { "1-31": "presente", "1-1": "ausente" } });
    const julho = consolidarAvaliacaoMensalDds([cruzado], filtros);
    assert.equal(julho.resumo.possibilidades, 1);
    assert.deepEqual(julho.comparacaoSemanal[0].diasIncluidos, ["2026-07-31"]);
}

{
    const incompleto = registro({ codigo: "DDS-PENDENTE", fechamento: "em_conferencia" });
    const duplicadoA = registro({ codigo: "DDS-A", documento: { hash: "igual" } });
    const duplicadoB = registro({ codigo: "DDS-B", documento: { hash: "igual" } });
    const resultado = consolidarAvaliacaoMensalDds([incompleto, duplicadoA, duplicadoB], filtros);
    assert.equal(resultado.resumo.ddsIncluidos, 1);
    assert.deepEqual(resultado.integridade.excluidos.map((item) => item.motivo).sort(), ["conferencia_nao_finalizada", "documento_duplicado"]);
}

{
    const complementar = participante(2, "Visitante", { colaboradorId: "", idAdicional: "visit-2", origem: "adicional", tipo: "visitante" });
    const base = registro({ codigo: "DDS-C", participantes: [participante(1, "Ana"), complementar], frequencia: { "1-1": "presente", "2-1": "manual" }, temas: [
        { data: "2026-07-01", temaConfirmado: "EPI", responsavelConfirmado: "Carlos", origemDocumentalTemaConfirmado: "pdf_assinado" },
        { data: "2026-07-02", temaConfirmado: "EPI", responsavelConfirmado: "Carlos", origemDocumentalTemaConfirmado: "sistema_manual", avisoDocumental: "tema confirmado no sistema, mas não localizado na folha assinada" },
    ] });
    const resultado = consolidarAvaliacaoMensalDds([base], filtros);
    assert.equal(resultado.resumo.participantesComplementares, 1);
    assert.equal(resultado.resumo.pendencias, 1);
    assert.equal(resultado.resumo.presencaIntegral, 1);
    assert.equal(resultado.resumo.temasDistintos, 1);
    assert.equal(resultado.resumo.aplicacoesTemas, 2);
    assert.equal(resultado.resumo.temasRepetidos, 1);
    assert.equal(resultado.temas[1].origemDocumental, "sistema_manual");
}

assert.equal(identificarParticipanteMensalDds({ colaboradorId: "7", cpf: "111" }), "id:7");
assert.equal(identificarParticipanteMensalDds({ cpf: "123.456.789-01", nome: "A" }), "cpf:12345678901");
assert.equal(identificarParticipanteMensalDds({ nome: " João  da Silva " }), "nome:joao da silva");

{
    const registroHoras = registro({
        codigo: "DDS-HORAS-BR",
        dias: [{ data: "13/07/2026", indice: 1, chaveAssistida: "2-13-07-2026" }],
        participantes: [participante(1, "Ana")],
        frequencia: { "1-2-13-07-2026": "presente" },
        temas: [{
            data: "13/07/2026",
            chaveAssistida: "2-13-07-2026",
            jornadaValida: true,
            jornadaPendente: false,
            minutosTrabalhados: 600,
        }],
    });
    const horas = calcularHorasTrabalhadasDdsMes([registroHoras], new Date(2026, 6, 29));
    assert.equal(horas.totalHorasFormatado, "10", "o Dashboard deve aceitar datas DDS no formato brasileiro");
    assert.equal(horas.totalDias, 1);
}

console.log("DDS avaliação mensal: testes controlados aprovados.");
