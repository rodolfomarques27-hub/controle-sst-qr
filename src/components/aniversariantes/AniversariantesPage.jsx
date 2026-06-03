import React, { useState } from "react";
import { Download } from "lucide-react";
import { Card, Header } from "../commonComponents";
import { STATUS_CLASSIFICACAO_COLABORADOR } from "../../constants/sstConstants";
import { baixarCSV } from "../../services/exportacaoService";
import { classNames, formatarAniversario } from "../../utils/sstUtils";
import {
    obterDataAniversarioColaborador,
    mesAniversarioColaborador,
    diaAniversarioColaborador,
    proximoAniversariante,
    deveMostrarAniversarioColaborador,
    statusGeral,
} from "../../services/colaboradorDocumentosService";

const obterDataProximoAniversario = (colaborador, dataBase = new Date()) => {
    const mes = mesAniversarioColaborador(colaborador);
    const dia = diaAniversarioColaborador(colaborador);

    if (!mes || !dia) return null;

    const hoje = new Date(dataBase.getFullYear(), dataBase.getMonth(), dataBase.getDate());
    let anoReferencia = hoje.getFullYear();
    let proximaData = new Date(anoReferencia, mes - 1, dia);

    if (proximaData < hoje) {
        anoReferencia += 1;
        proximaData = new Date(anoReferencia, mes - 1, dia);
    }

    return proximaData;
};

const formatarProximoAniversario = (colaborador) => {
    const data = obterDataProximoAniversario(colaborador);

    return data ? data.toLocaleDateString("pt-BR") : "Sem data cadastrada";
};

export function Aniversariantes({ colaboradores = [], empresasBanco = [] }) {
    const [mes, setMes] = useState("Todos");
    const [empresa, setEmpresa] = useState("Todas");
    const [funcao, setFuncao] = useState("Todas");
    const [status, setStatus] = useState("Todos");

    const colaboradoresElegiveis = colaboradores.filter((colaborador) =>
        deveMostrarAniversarioColaborador(colaborador)
    );

    const colaboradoresComAniversario = colaboradoresElegiveis.filter((colaborador) =>
        Boolean(obterDataAniversarioColaborador(colaborador))
    );

    const opcoesEmpresa = ["Todas", ...Array.from(new Set(colaboradoresElegiveis.map((c) => c.empresaExibicao || c.empresa).filter(Boolean))).sort()];
    const opcoesFuncao = ["Todas", ...Array.from(new Set(colaboradoresElegiveis.map((c) => c.funcao).filter(Boolean))).sort()];
    const opcoesStatus = ["Todos", ...STATUS_CLASSIFICACAO_COLABORADOR];

    const filtrados = colaboradoresElegiveis
        .filter((colaborador) => {
            const dataAniversario = obterDataAniversarioColaborador(colaborador);
            const mesColaborador = mesAniversarioColaborador(colaborador);
            const statusColaborador = statusGeral(colaborador).texto;
            const empresaColaborador = colaborador.empresaExibicao || colaborador.empresa;

            return (
                (mes === "Todos" || (dataAniversario && String(mesColaborador).padStart(2, "0") === mes)) &&
                (empresa === "Todas" || empresaColaborador === empresa) &&
                (funcao === "Todas" || colaborador.funcao === funcao) &&
                (status === "Todos" || statusColaborador === status)
            );
        })
        .sort((a, b) => {
            const dataA = obterDataAniversarioColaborador(a);
            const dataB = obterDataAniversarioColaborador(b);
            const mesA = mesAniversarioColaborador(a) || 99;
            const mesB = mesAniversarioColaborador(b) || 99;
            const diaA = diaAniversarioColaborador(a) || 99;
            const diaB = diaAniversarioColaborador(b) || 99;

            if (mes === "Todos" && Boolean(dataA) !== Boolean(dataB)) return dataA ? -1 : 1;
            if (mes === "Todos" && mesA !== mesB) return mesA - mesB;
            if (diaA !== diaB) return diaA - diaB;
            return a.nome.localeCompare(b.nome);
        });

    const proximo = proximoAniversariante(colaboradoresComAniversario);

    const exportarCSVAniversariantes = () => {
        const linhas = [
            ["Nome", "Empresa", "Função", "Data de aniversário", "Dia", "Status"],
            ...filtrados.map((colaborador) => [
                colaborador.nome,
                colaborador.empresaExibicao || colaborador.empresa,
                colaborador.funcao,
                formatarAniversario(obterDataAniversarioColaborador(colaborador)),
                diaAniversarioColaborador(colaborador) || "",
                statusGeral(colaborador).texto,
            ]),
        ];

        baixarCSV("aniversariantes.csv", linhas);
    };

    return (
        <div>
            <Header
                titulo="Aniversariantes"
                className="header-aniversariantes"
                subtitulo={(
                    <>
                        Consulta de aniversariantes de todos os meses, com todos os colaboradores autorizados para aparecer no painel.
                        <br className="hidden sm:block" />
                        Use os filtros para separar por mês, empresa, função e status.
                    </>
                )}
                acao={(
                    <button
                        type="button"
                        onClick={exportarCSVAniversariantes}
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                    >
                        <Download className="h-4 w-4" />
                        Exportar CSV
                    </button>
                )}
            />

            <div className="mb-5 grid gap-4 md:grid-cols-3">
                <Card>
                    <p className="text-sm font-semibold text-slate-500">Registros filtrados</p>
                    <p className="mt-2 text-3xl font-bold text-slate-950">{filtrados.length}</p>
                </Card>
                <Card>
                    <p className="text-sm font-semibold text-slate-500">Próximo aniversário</p>
                    <p className="mt-2 text-lg font-bold text-slate-950">{proximo?.colaborador?.nome || "-"}</p>
                    <p className="mt-1 text-sm text-slate-500">{proximo ? formatarProximoAniversario(proximo.colaborador) : "Sem data cadastrada"}</p>
                </Card>
                <Card>
                    <p className="text-sm font-semibold text-slate-500">Exportação</p>
                    <p className="mt-2 text-sm text-slate-600">PDF e Excel nativo ficam como evolução futura. Nesta etapa, o CSV já pode ser aberto no Excel.</p>
                </Card>
            </div>

            <Card className="mb-5">
                <div className="grid gap-3 md:grid-cols-4">
                    <select value={mes} onChange={(e) => setMes(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100">
                        <option value="Todos">Todos os meses</option>
                        {Array.from({ length: 12 }).map((_, index) => {
                            const valor = String(index + 1).padStart(2, "0");
                            const nomeMes = new Date(2026, index, 1).toLocaleDateString("pt-BR", { month: "long" });
                            return <option key={valor} value={valor}>{nomeMes}</option>;
                        })}
                    </select>

                    <select value={empresa} onChange={(e) => setEmpresa(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100">
                        {opcoesEmpresa.map((item) => <option key={item}>{item}</option>)}
                    </select>

                    <select value={funcao} onChange={(e) => setFuncao(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100">
                        {opcoesFuncao.map((item) => <option key={item}>{item}</option>)}
                    </select>

                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100">
                        {opcoesStatus.map((item) => <option key={item}>{item}</option>)}
                    </select>
                </div>
            </Card>

            <Card>
                <div className="overflow-x-auto scrollbar-discreta">
                    <table className="min-w-[860px] w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-3">Nome</th>
                                <th className="px-4 py-3">Empresa</th>
                                <th className="px-4 py-3">Função</th>
                                <th className="px-4 py-3">Data de aniversário</th>
                                <th className="px-4 py-3">Dia</th>
                                <th className="px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filtrados.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">Nenhum colaborador encontrado para os filtros selecionados.</td>
                                </tr>
                            )}
                            {filtrados.map((colaborador) => {
                                const statusColaborador = statusGeral(colaborador);
                                return (
                                    <tr key={colaborador.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-semibold text-slate-950">{colaborador.nome}</td>
                                        <td className="px-4 py-3 text-slate-600">{colaborador.empresaExibicao || colaborador.empresa}</td>
                                        <td className="px-4 py-3 text-slate-600">{colaborador.funcao}</td>
                                        <td className="px-4 py-3 text-slate-600">{formatarAniversario(obterDataAniversarioColaborador(colaborador))}</td>
                                        <td className="px-4 py-3 text-slate-600">{diaAniversarioColaborador(colaborador)}</td>
                                        <td className="px-4 py-3">
                                            <span className={classNames("rounded-full px-3 py-1 text-xs font-bold ring-1", statusColaborador.classe)}>{statusColaborador.texto}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
