import React, { useMemo, useState } from "react";
import { CalendarDays, Download, Search, Users } from "lucide-react";
import { Card, FotoColaborador, Header, obterFotoColaboradorSrc } from "../commonComponents";
import { STATUS_CLASSIFICACAO_COLABORADOR } from "../../constants/sstConstants";
import { baixarRelatorioAniversariantesPDF } from "../../services/exportacaoService";
import { classNames, formatarAniversario, normalizarTextoBusca } from "../../utils/sstUtils";
import { obterUrlLogoEmpresa } from "../../services/supabaseServices";
import {
    obterDataAniversarioColaborador,
    mesAniversarioColaborador,
    diaAniversarioColaborador,
    proximoAniversariante,
    deveMostrarAniversarioColaborador,
    statusGeral,
} from "../../services/colaboradorDocumentosService";

const MESES_ANIVERSARIO = Array.from({ length: 12 }).map((_, index) => {
    const numero = index + 1;
    const dataReferencia = new Date(2026, index, 1);

    return {
        numero,
        valor: String(numero).padStart(2, "0"),
        nome: dataReferencia.toLocaleDateString("pt-BR", { month: "long" }),
        curto: dataReferencia.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
    };
});

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

const calcularDiasAteAniversario = (colaborador) => {
    const proximaData = obterDataProximoAniversario(colaborador);

    if (!proximaData) return null;

    const hoje = new Date();
    const hojeLimpo = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const diferenca = proximaData.getTime() - hojeLimpo.getTime();

    return Math.max(0, Math.ceil(diferenca / (1000 * 60 * 60 * 24)));
};

const obterNomeMes = (numeroMes) => {
    const mesEncontrado = MESES_ANIVERSARIO.find((item) => item.numero === Number(numeroMes));
    return mesEncontrado?.nome || "-";
};

const obterIniciais = (nome = "") => {
    const partes = String(nome || "")
        .split(/\s+/)
        .map((item) => item.trim())
        .filter(Boolean);

    if (!partes.length) return "?";

    return partes
        .slice(0, 2)
        .map((item) => item[0])
        .join("")
        .toUpperCase();
};

export function Aniversariantes({ colaboradores = [], empresasBanco = [] }) {
    const [mes, setMes] = useState("Todos");
    const [empresa, setEmpresa] = useState("Todas");
    const [funcao, setFuncao] = useState("Todas");
    const [status, setStatus] = useState("Todos");
    const [busca, setBusca] = useState("");
    const [exportandoPDF, setExportandoPDF] = useState(false);

    const colaboradoresElegiveis = useMemo(
        () => colaboradores.filter((colaborador) => deveMostrarAniversarioColaborador(colaborador)),
        [colaboradores]
    );

    const colaboradoresComAniversario = useMemo(
        () => colaboradoresElegiveis.filter((colaborador) => Boolean(obterDataAniversarioColaborador(colaborador))),
        [colaboradoresElegiveis]
    );

    const opcoesEmpresa = useMemo(
        () => ["Todas", ...Array.from(new Set(colaboradoresComAniversario.map((c) => c.empresaExibicao || c.empresa).filter(Boolean))).sort()],
        [colaboradoresComAniversario]
    );

    const opcoesFuncao = useMemo(
        () => ["Todas", ...Array.from(new Set(colaboradoresComAniversario.map((c) => c.funcao).filter(Boolean))).sort()],
        [colaboradoresComAniversario]
    );

    const opcoesStatus = ["Todos", ...STATUS_CLASSIFICACAO_COLABORADOR];

    const aplicarFiltrosBase = (colaborador, considerarMes = true) => {
        const dataAniversario = obterDataAniversarioColaborador(colaborador);
        const mesColaborador = mesAniversarioColaborador(colaborador);
        const statusColaborador = statusGeral(colaborador).texto;
        const empresaColaborador = colaborador.empresaExibicao || colaborador.empresa;
        const textoBusca = normalizarTextoBusca(`${colaborador.nome || ""} ${empresaColaborador || ""} ${colaborador.funcao || ""} ${statusColaborador || ""}`);
        const buscaNormalizada = normalizarTextoBusca(busca);

        return (
            Boolean(dataAniversario) &&
            (!considerarMes || mes === "Todos" || String(mesColaborador).padStart(2, "0") === mes) &&
            (empresa === "Todas" || empresaColaborador === empresa) &&
            (funcao === "Todas" || colaborador.funcao === funcao) &&
            (status === "Todos" || statusColaborador === status) &&
            (!buscaNormalizada || textoBusca.includes(buscaNormalizada))
        );
    };

    const filtrados = useMemo(
        () => colaboradoresComAniversario
            .filter((colaborador) => aplicarFiltrosBase(colaborador, true))
            .sort((a, b) => {
                const mesA = mesAniversarioColaborador(a) || 99;
                const mesB = mesAniversarioColaborador(b) || 99;
                const diaA = diaAniversarioColaborador(a) || 99;
                const diaB = diaAniversarioColaborador(b) || 99;

                if (mes === "Todos" && mesA !== mesB) return mesA - mesB;
                if (diaA !== diaB) return diaA - diaB;
                return String(a.nome || "").localeCompare(String(b.nome || ""));
            }),
        [colaboradoresComAniversario, mes, empresa, funcao, status, busca]
    );

    const baseGrafico = useMemo(
        () => colaboradoresComAniversario.filter((colaborador) => aplicarFiltrosBase(colaborador, false)),
        [colaboradoresComAniversario, empresa, funcao, status, busca]
    );

    const resumoMensal = useMemo(() => {
        const totais = MESES_ANIVERSARIO.map((item) => ({ ...item, total: 0 }));

        baseGrafico.forEach((colaborador) => {
            const mesColaborador = mesAniversarioColaborador(colaborador);
            const indice = Number(mesColaborador) - 1;

            if (indice >= 0 && indice < totais.length) {
                totais[indice].total += 1;
            }
        });

        const maiorTotal = Math.max(0, ...totais.map((item) => item.total));
        const mesComMais = totais.find((item) => item.total === maiorTotal && item.total > 0);

        return {
            totais,
            maiorTotal,
            mesComMais,
            totalAno: baseGrafico.length,
            mesAtual: new Date().getMonth() + 1,
        };
    }, [baseGrafico]);

    const proximo = useMemo(() => proximoAniversariante(colaboradoresComAniversario), [colaboradoresComAniversario]);
    const diasAteProximo = proximo?.colaborador ? calcularDiasAteAniversario(proximo.colaborador) : null;
    const aniversariantesMesAtual = resumoMensal.totais.find((item) => item.numero === resumoMensal.mesAtual)?.total || 0;

    const obterEmpresaRelatorio = (colaborador = {}) => {
        const empresaId = String(colaborador.empresaId || colaborador.empresa_id || "").trim();
        const empresaNome = normalizarTextoBusca(colaborador.empresa || colaborador.empresaNome || colaborador.empresaExibicao || "");

        return (
            empresasBanco.find((item) => String(item.id || "") === empresaId) ||
            empresasBanco.find((item) => normalizarTextoBusca(item.nome || "") === empresaNome) ||
            {}
        );
    };

    const exportarPDFAniversariantes = async () => {
        if (exportandoPDF) return;

        if (!filtrados.length) {
            alert("Nenhum aniversariante encontrado para gerar o relatório.");
            return;
        }

        setExportandoPDF(true);

        try {
            const aniversariantesRelatorio = filtrados.map((colaborador) => {
                const empresaBase = obterEmpresaRelatorio(colaborador);
                const logoRaw = colaborador.empresaLogoUrl || colaborador.empresa_logo_url || empresaBase.logo_url || empresaBase.logoUrl || "";
                const statusColaborador = statusGeral(colaborador);
                const dataProximo = obterDataProximoAniversario(colaborador);
                const mesColaborador = mesAniversarioColaborador(colaborador);

                return {
                    id: colaborador.id,
                    nome: colaborador.nome,
                    empresaId: colaborador.empresaId || empresaBase.id || colaborador.empresa,
                    empresaNome: colaborador.empresa || empresaBase.nome || "Empresa não informada",
                    empresaExibicao: colaborador.empresaExibicao || colaborador.empresa || empresaBase.nome || "",
                    empresaCnpj: colaborador.empresaCnpj || empresaBase.cnpj || "",
                    empresaResponsavel: colaborador.empresaResponsavel || empresaBase.responsavel || empresaBase.responsavel_auditoria || "",
                    empresaLogoUrl: logoRaw ? obterUrlLogoEmpresa(logoRaw) : "",
                    fotoUrl: obterFotoColaboradorSrc(colaborador) || colaborador.fotoUrl || colaborador.foto_url || colaborador.fotoColaboradorUrl || colaborador.foto_colaborador_url || "",
                    funcao: colaborador.funcao,
                    dataNascimento: formatarAniversario(obterDataAniversarioColaborador(colaborador)),
                    dia: diaAniversarioColaborador(colaborador) || "",
                    mes: mesColaborador || "",
                    mesNome: obterNomeMes(mesColaborador),
                    proximoAniversario: dataProximo ? dataProximo.toLocaleDateString("pt-BR") : "-",
                    diasRestantes: calcularDiasAteAniversario(colaborador),
                    statusGeral: statusColaborador.texto,
                    statusMobilizacao: colaborador.statusMobilizacao || "",
                };
            });

            await baixarRelatorioAniversariantesPDF({
                nomeArquivo: "relatorio-aniversariantes.pdf",
                titulo: "Relatório de aniversariantes",
                aniversariantes: aniversariantesRelatorio,
                filtros: {
                    mes: mes === "Todos" ? "Todos os meses" : obterNomeMes(Number(mes)),
                    empresa,
                    funcao,
                    status,
                    busca: busca || "-",
                },
            });
        } catch (error) {
            console.error("Erro ao gerar relatório de aniversariantes:", error);
            alert("Não foi possível gerar o PDF de aniversariantes.");
        } finally {
            setExportandoPDF(false);
        }
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
                        Use os filtros para separar por mês, empresa, função, status e busca por texto.
                    </>
                )}
                acao={(
                    <button
                        type="button"
                        onClick={exportarPDFAniversariantes}
                        disabled={exportandoPDF || filtrados.length === 0}
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Download className="h-4 w-4" />
                        {exportandoPDF ? "Gerando PDF..." : "Exportar PDF"}
                    </button>
                )}
            />

            <div className="mb-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr_1.45fr]">
                <Card>
                    <div className="flex h-full items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-500">Registros filtrados</p>
                            <p className="mt-1 text-3xl font-bold text-slate-950">{filtrados.length}</p>
                            <p className="mt-1 text-xs text-slate-500">{aniversariantesMesAtual} aniversariante(s) no mês atual.</p>
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex h-full items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
                            <CalendarDays className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-500">Próximo aniversário</p>
                            <p className="mt-1 break-words text-lg font-bold leading-snug text-slate-950">{proximo?.colaborador?.nome || "-"}</p>
                            <p className="mt-1 text-sm text-slate-500">
                                {proximo ? formatarProximoAniversario(proximo.colaborador) : "Sem data cadastrada"}
                                {diasAteProximo !== null ? ` • faltam ${diasAteProximo} dia(s)` : ""}
                            </p>
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-slate-500">Aniversariantes por mês</p>
                                <p className="mt-1 text-xs text-slate-500">
                                    Total anual: <strong className="text-slate-900">{resumoMensal.totalAno}</strong>
                                    {resumoMensal.mesComMais ? (
                                        <> • Maior mês: <strong className="capitalize text-slate-900">{resumoMensal.mesComMais.nome}</strong></>
                                    ) : null}
                                </p>
                            </div>
                            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">
                                {resumoMensal.mesComMais?.total || 0} maior mês
                            </span>
                        </div>

                        <div className="grid grid-cols-12 items-end gap-1.5 pt-1">
                            {resumoMensal.totais.map((item) => {
                                const altura = resumoMensal.maiorTotal > 0 ? Math.max(18, Math.round((item.total / resumoMensal.maiorTotal) * 72)) : 18;
                                const ativo = mes !== "Todos" && String(item.numero).padStart(2, "0") === mes;
                                const mesAtual = item.numero === resumoMensal.mesAtual;

                                return (
                                    <div key={item.valor} className="flex min-w-0 flex-col items-center gap-1 text-center">
                                        <span className="text-[10px] font-bold leading-none text-slate-700">{item.total}</span>
                                        <div
                                            className={classNames(
                                                "w-full max-w-[22px] rounded-t-xl border transition",
                                                ativo
                                                    ? "border-slate-950 bg-slate-950"
                                                    : mesAtual
                                                        ? "border-blue-200 bg-blue-500"
                                                        : "border-slate-200 bg-slate-200"
                                            )}
                                            style={{ height: `${altura}px` }}
                                            title={`${item.nome}: ${item.total}`}
                                        />
                                        <span className="truncate text-[10px] font-semibold capitalize text-slate-500">{item.curto}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </Card>
            </div>

            <Card className="mb-5">
                <div className="grid gap-3 lg:grid-cols-[1.2fr_repeat(4,minmax(0,1fr))]">
                    <label className="relative block">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            placeholder="Buscar por nome, empresa ou função"
                            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        />
                    </label>

                    <select value={mes} onChange={(e) => setMes(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100">
                        <option value="Todos">Todos os meses</option>
                        {MESES_ANIVERSARIO.map((item) => <option key={item.valor} value={item.valor}>{item.nome}</option>)}
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
                    <table className="min-w-[980px] w-full border-separate border-spacing-y-2 text-sm">
                        <thead className="text-center text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-3 text-left">Nome</th>
                                <th className="px-4 py-3">Empresa</th>
                                <th className="px-4 py-3">Função</th>
                                <th className="px-4 py-3">Data de aniversário</th>
                                <th className="px-4 py-3">Dia</th>
                                <th className="px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtrados.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="rounded-3xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                                        Nenhum colaborador encontrado para os filtros selecionados.
                                    </td>
                                </tr>
                            )}
                            {filtrados.map((colaborador) => {
                                const statusColaborador = statusGeral(colaborador);
                                const dataAniversario = obterDataAniversarioColaborador(colaborador);

                                return (
                                    <tr key={colaborador.id} className="group">
                                        <td className="rounded-l-3xl border-y border-l border-slate-200 bg-white px-4 py-3 align-middle transition group-hover:border-slate-300 group-hover:bg-slate-50">
                                            <div className="flex min-w-[280px] items-center gap-3">
                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-sm font-black text-slate-600 ring-1 ring-slate-200">
                                                    <FotoColaborador
                                                        src={colaborador}
                                                        colaborador={colaborador}
                                                        colaboradorId={colaborador.id}
                                                        nome={colaborador.nome}
                                                        className="h-full w-full rounded-2xl"
                                                        iconClassName="h-5 w-5"
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="break-words font-bold leading-snug text-slate-950">{colaborador.nome}</p>
                                                    <p className="mt-0.5 text-xs font-medium text-slate-500">
                                                        Aniversário em {obterNomeMes(mesAniversarioColaborador(colaborador))}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="border-y border-slate-200 bg-white px-4 py-3 text-center align-middle font-medium text-slate-600 transition group-hover:border-slate-300 group-hover:bg-slate-50">
                                            {colaborador.empresaExibicao || colaborador.empresa || "-"}
                                        </td>
                                        <td className="border-y border-slate-200 bg-white px-4 py-3 text-center align-middle font-medium text-slate-600 transition group-hover:border-slate-300 group-hover:bg-slate-50">
                                            {colaborador.funcao || "-"}
                                        </td>
                                        <td className="border-y border-slate-200 bg-white px-4 py-3 text-center align-middle font-semibold text-slate-700 transition group-hover:border-slate-300 group-hover:bg-slate-50">
                                            {formatarAniversario(dataAniversario)}
                                        </td>
                                        <td className="border-y border-slate-200 bg-white px-4 py-3 text-center align-middle text-lg font-black text-slate-950 transition group-hover:border-slate-300 group-hover:bg-slate-50">
                                            {diaAniversarioColaborador(colaborador)}
                                        </td>
                                        <td className="rounded-r-3xl border-y border-r border-slate-200 bg-white px-4 py-3 text-center align-middle transition group-hover:border-slate-300 group-hover:bg-slate-50">
                                            <span className={classNames("inline-flex justify-center rounded-full px-3 py-1 text-xs font-bold ring-1", statusColaborador.classe)}>{statusColaborador.texto}</span>
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
