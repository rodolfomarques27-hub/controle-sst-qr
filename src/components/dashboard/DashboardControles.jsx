import React from "react";
import { Card } from "../commonComponents";
import { classNames } from "../../utils/sstUtils";
import {
    painelPadraoDashboard,
    cartasPadraoDashboard,
    tamanhosPadraoCartasDashboard,
    tamanhosPadraoBlocosDashboard,
    ordemPadraoBlocosDashboard,
    ordemPadraoCartasDashboard,
    opcoesPainelDashboard,
    opcoesTamanhoCartaDashboard,
    opcoesTamanhoBlocoDashboard,
    blocosRecolhidosPadraoDashboard,
} from "../../services/dashboardService";

export function DashboardControles({
    mostrarFiltroPainel,
    abaPersonalizacaoPainel,
    setAbaPersonalizacaoPainel,
    blocosPainelDashboard,
    setBlocosPainelDashboard,
    cartasVisiveisDashboard,
    setCartasVisiveisDashboard,
    tamanhosCartasDashboard,
    setTamanhosCartasDashboard,
    tamanhosBlocosDashboard,
    setTamanhosBlocosDashboard,
    setBlocosRecolhidosDashboard,
    setOrdemBlocosDashboard,
    setOrdemCartasDashboard,
    opcoesCartasOrdenadasDashboard,
    opcoesBlocosOrdenadasDashboard,
    cartaArrastandoDashboard,
    setCartaArrastandoDashboard,
    blocoArrastandoDashboard,
    setBlocoArrastandoDashboard,
    alternarBlocoPainel,
    alternarCartaPainel,
    alterarTamanhoCartaPainel,
    alterarTamanhoBlocoPainel,
    moverBlocoPainel,
    moverCartaPainel,
    soltarCartaPainel,
    soltarBlocoPainel,
    prepararArrastePainel,
}) {
    if (!mostrarFiltroPainel) {
        return null;
    }

    return (
        <Card className="mb-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h2 className="text-base font-bold text-slate-950">Personalizar painel SST</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Marque apenas as informações que devem aparecer no dashboard principal. E-mails, acessos e armazenamento por bucket ficam no painel Auditoria.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setBlocosPainelDashboard(painelPadraoDashboard);
                            setCartasVisiveisDashboard(cartasPadraoDashboard);
                            setTamanhosCartasDashboard(tamanhosPadraoCartasDashboard);
                            setTamanhosBlocosDashboard(tamanhosPadraoBlocosDashboard);
                            setBlocosRecolhidosDashboard(blocosRecolhidosPadraoDashboard);
                            setOrdemBlocosDashboard(ordemPadraoBlocosDashboard);
                            setOrdemCartasDashboard(ordemPadraoCartasDashboard);
                        }}
                        className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                        Mostrar padrão
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setBlocosPainelDashboard({
                                cards: true,
                                pendencias: true,
                                conformidade: true,
                                colaboradoresFuncao: true,
                                rankingEmpresas: true,
                                documentosTipo: false,
                                ultimosDocumentos: false,
                                alertas: true,
                            });
                            setCartasVisiveisDashboard({
                                ...cartasPadraoDashboard,
                                armazenamentoUtilizado: false,
                                aniversariantesMes: false,
                                desviosAbertos: false,
                            });
                            setTamanhosCartasDashboard({
                                ...tamanhosPadraoCartasDashboard,
                                colaboradoresMobilizados: "medio",
                                colaboradoresLiberados: "medio",
                                comPendencia: "medio",
                                colaboradoresBloqueados: "medio",
                            });
                            setTamanhosBlocosDashboard({
                                ...tamanhosPadraoBlocosDashboard,
                                cards: "destaque",
                                pendencias: "destaque",
                                conformidade: "medio",
                                rankingEmpresas: "destaque",
                                colaboradoresFuncao: "medio",
                                alertas: "medio",
                            });
                            setOrdemBlocosDashboard([
                                "cards",
                                "pendencias",
                                "rankingEmpresas",
                                "conformidade",
                                "colaboradoresFuncao",
                                "alertas",
                                "documentosTipo",
                                "ultimosDocumentos",
                            ]);
                            setOrdemCartasDashboard(ordemPadraoCartasDashboard);
                            setBlocosRecolhidosDashboard(blocosRecolhidosPadraoDashboard);
                        }}
                        className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200"
                    >
                        Painel compacto
                    </button>
                </div>
            </div>

            <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
                <div className="grid gap-2 md:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => setAbaPersonalizacaoPainel("cartas")}
                        className={classNames(
                            "rounded-2xl px-4 py-3 text-left ring-1 transition",
                            abaPersonalizacaoPainel === "cartas"
                                ? "bg-blue-600 text-white ring-blue-600 shadow-sm"
                                : "bg-blue-50 text-blue-800 ring-blue-200 hover:bg-blue-100"
                        )}
                    >
                        <span className="block text-xs font-black uppercase tracking-wide">Filtro 1</span>
                        <span className="mt-1 block text-sm font-bold">Cartas principais do Dashboard SST</span>
                        <span className={classNames("mt-0.5 block text-xs", abaPersonalizacaoPainel === "cartas" ? "text-blue-100" : "text-blue-600")}>
                            Edite somente os cards pequenos do topo.
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setAbaPersonalizacaoPainel("quadros")}
                        className={classNames(
                            "rounded-2xl px-4 py-3 text-left ring-1 transition",
                            abaPersonalizacaoPainel === "quadros"
                                ? "bg-emerald-600 text-white ring-emerald-600 shadow-sm"
                                : "bg-emerald-50 text-emerald-800 ring-emerald-200 hover:bg-emerald-100"
                        )}
                    >
                        <span className="block text-xs font-black uppercase tracking-wide">Filtro 2</span>
                        <span className="mt-1 block text-sm font-bold">Organização dos quadros do Dashboard SST</span>
                        <span className={classNames("mt-0.5 block text-xs", abaPersonalizacaoPainel === "quadros" ? "text-emerald-100" : "text-emerald-600")}>
                            Edite somente os quadros grandes do painel.
                        </span>
                    </button>
                </div>
            </div>

            {abaPersonalizacaoPainel === "quadros" && (
                <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-bold text-slate-950">Visibilidade geral do Dashboard SST</h3>
                            <p className="mt-0.5 text-xs text-slate-500">Ative ou oculte os grupos principais do painel antes de organizar os detalhes abaixo.</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">Geral</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {opcoesPainelDashboard.filter((opcao) => opcao.chave !== "cards").map((opcao) => {
                            const ativo = Boolean(blocosPainelDashboard[opcao.chave]);

                            return (
                                <button
                                    key={opcao.chave}
                                    type="button"
                                    onClick={() => alternarBlocoPainel(opcao.chave)}
                                    className={classNames(
                                        "flex items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left text-sm font-semibold ring-1 transition",
                                        ativo
                                            ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                                            : "bg-slate-50 text-slate-500 ring-slate-200"
                                    )}
                                >
                                    <span>{opcao.label}</span>
                                    <span className={classNames(
                                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                        ativo ? "bg-emerald-100 text-emerald-800" : "bg-white text-slate-500 ring-1 ring-slate-200"
                                    )}>
                                        {ativo ? "Visível" : "Oculto"}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {abaPersonalizacaoPainel === "cartas" && (
                <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50/60 p-4 shadow-sm">
                    <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">Seção 1</span>
                                <h3 className="text-sm font-bold text-slate-950">Cartas principais do Dashboard SST</h3>
                            </div>
                            <p className="mt-1 text-xs text-slate-600">Altera somente os cards pequenos do topo: visibilidade, tamanho e ordem das cartas principais.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setBlocosPainelDashboard((atual) => ({ ...atual, cards: !atual.cards }))}
                                className={classNames(
                                    "self-start rounded-xl px-3 py-2 text-xs font-semibold ring-1 sm:self-auto",
                                    blocosPainelDashboard.cards
                                        ? "bg-blue-600 text-white ring-blue-600 hover:bg-blue-700"
                                        : "bg-white text-blue-700 ring-blue-200 hover:bg-blue-50"
                                )}
                            >
                                {blocosPainelDashboard.cards ? "Cartas visíveis" : "Mostrar cartas"}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setCartasVisiveisDashboard(cartasPadraoDashboard);
                                    setTamanhosCartasDashboard(tamanhosPadraoCartasDashboard);
                                    setOrdemCartasDashboard(ordemPadraoCartasDashboard);
                                }}
                                className="self-start rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 sm:self-auto"
                            >
                                Restaurar cartas e tamanhos
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                        {cardsOrdenados.map((opcao, index) => {
                            const ativo = cartasVisiveisDashboard[opcao.chave] !== false;
                            const tamanhoAtual = tamanhosCartasDashboard[opcao.chave] || "padrao";

                            return (
                                <div
                                    key={opcao.chave}
                                    onDragOver={(evento) => evento.preventDefault()}
                                    onDrop={() => soltarCartaPainel(opcao.chave)}
                                    className={classNames(
                                        "rounded-2xl p-3 ring-1 transition",
                                        ativo ? "bg-blue-50/60 ring-blue-200" : "bg-slate-50 ring-slate-200",
                                        cartaArrastandoDashboard === opcao.chave ? "opacity-60 ring-2 ring-blue-300" : ""
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex min-w-0 items-start gap-2">
                                            <span
                                                draggable
                                                onDragStart={(evento) => {
                                                    prepararArrastePainel(evento);
                                                    setCartaArrastandoDashboard(opcao.chave);
                                                }}
                                                onDragEnd={() => setCartaArrastandoDashboard(null)}
                                                className="mt-0.5 inline-flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-500 ring-1 ring-slate-200 active:cursor-grabbing"
                                                title="Segure e arraste para mudar a ordem"
                                            >
                                                ☰
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => alternarCartaPainel(opcao.chave)}
                                                className="min-w-0 text-left"
                                            >
                                                <span className={classNames("block truncate text-sm font-bold", ativo ? "text-blue-900" : "text-slate-500")}>
                                                    #{index + 1}. {opcao.label}
                                                </span>
                                                <span className="mt-0.5 block text-xs text-slate-500">
                                                    {ativo ? "Aparece no painel" : "Oculto no painel"} · arraste pelo ícone ☰
                                                </span>
                                            </button>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => moverCartaPainel(opcao.chave, -1)}
                                                disabled={index === 0}
                                                className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                title="Mover para a esquerda / para cima"
                                            >
                                                ↑
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => moverCartaPainel(opcao.chave, 1)}
                                                disabled={index === cardsOrdenados.length - 1}
                                                className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                title="Mover para a direita / para baixo"
                                            >
                                                ↓
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => alternarCartaPainel(opcao.chave)}
                                                className={classNames(
                                                    "rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ring-1",
                                                    ativo ? "bg-blue-100 text-blue-800 ring-blue-200" : "bg-white text-slate-500 ring-slate-200"
                                                )}
                                            >
                                                {ativo ? "Visível" : "Oculto"}
                                            </button>
                                        </div>
                                    </div>

                                    {ativo && (
                                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                            {opcoesTamanhoCartaDashboard.map((tamanho) => {
                                                const selecionado = tamanhoAtual === tamanho.chave;

                                                return (
                                                    <button
                                                        key={tamanho.chave}
                                                        type="button"
                                                        onClick={() => alterarTamanhoCartaPainel(opcao.chave, tamanho.chave)}
                                                        className={classNames(
                                                            "rounded-xl px-2 py-2 text-center ring-1 transition",
                                                            selecionado
                                                                ? "bg-slate-950 text-white ring-slate-950"
                                                                : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                                                        )}
                                                    >
                                                        <span className="block text-xs font-bold">{tamanho.label}</span>
                                                        <span className={classNames("mt-0.5 block text-[10px]", selecionado ? "text-slate-200" : "text-slate-400")}>
                                                            {tamanho.descricao}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {abaPersonalizacaoPainel === "quadros" && (
                <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
                    <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">Seção 2</span>
                                <h3 className="text-sm font-bold text-slate-950">Organização dos quadros do Dashboard SST</h3>
                            </div>
                            <p className="mt-1 text-xs text-slate-600">
                                Altera somente os quadros grandes do dashboard: posição, tamanho, recolhimento e visibilidade. A ordem abaixo é a mesma ordem exibida no painel.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setTamanhosBlocosDashboard(tamanhosPadraoBlocosDashboard);
                                setBlocosRecolhidosDashboard(blocosRecolhidosPadraoDashboard);
                                setOrdemBlocosDashboard(ordemPadraoBlocosDashboard);
                            }}
                            className="self-start rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 sm:self-auto"
                        >
                            Restaurar ordem e tamanhos
                        </button>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                        {opcoesBlocosOrdenadasDashboard.map((opcao, index) => {
                            const ativo = Boolean(blocosPainelDashboard[opcao.chave]);
                            const tamanhoAtual = tamanhosBlocosDashboard[opcao.chave] || "padrao";

                            return (
                                <div
                                    key={opcao.chave}
                                    onDragOver={(evento) => evento.preventDefault()}
                                    onDrop={() => soltarBlocoPainel(opcao.chave)}
                                    className={classNames(
                                        "rounded-2xl p-3 ring-1 transition",
                                        ativo ? "bg-emerald-50/60 ring-emerald-200" : "bg-slate-50 ring-slate-200",
                                        blocoArrastandoDashboard === opcao.chave ? "opacity-60 ring-2 ring-emerald-300" : ""
                                    )}
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="flex min-w-0 items-start gap-2">
                                            <span
                                                draggable
                                                onDragStart={(evento) => {
                                                    prepararArrastePainel(evento);
                                                    setBlocoArrastandoDashboard(opcao.chave);
                                                }}
                                                onDragEnd={() => setBlocoArrastandoDashboard(null)}
                                                className="mt-0.5 inline-flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-500 ring-1 ring-slate-200 active:cursor-grabbing"
                                                title="Segure e arraste para mudar a posição do quadro"
                                            >
                                                ☰
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => alternarBlocoPainel(opcao.chave)}
                                                className="min-w-0 text-left"
                                            >
                                                <span className={classNames("block text-sm font-bold", ativo ? "text-emerald-900" : "text-slate-500")}>
                                                    {index + 1}. {opcao.label}
                                                </span>
                                                <span className="mt-0.5 block text-xs text-slate-500">
                                                    {ativo ? "Aparece no painel" : "Oculto no painel"} · arraste pelo ícone ☰
                                                </span>
                                            </button>
                                        </div>

                                        <div className="flex shrink-0 flex-wrap items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => moverBlocoPainel(opcao.chave, -1)}
                                                disabled={index === 0}
                                                className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                title="Mover para cima"
                                            >
                                                ↑
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => moverBlocoPainel(opcao.chave, 1)}
                                                disabled={index === opcoesBlocosOrdenadasDashboard.length - 1}
                                                className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                title="Mover para baixo"
                                            >
                                                ↓
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => alternarBlocoPainel(opcao.chave)}
                                                className={classNames(
                                                    "rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ring-1",
                                                    ativo ? "bg-emerald-100 text-emerald-800 ring-emerald-200" : "bg-white text-slate-500 ring-slate-200"
                                                )}
                                            >
                                                {ativo ? "Visível" : "Oculto"}
                                            </button>
                                        </div>
                                    </div>

                                    {ativo && (
                                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                            {opcoesTamanhoBlocoDashboard.map((tamanho) => {
                                                const selecionado = tamanhoAtual === tamanho.chave;

                                                return (
                                                    <button
                                                        key={tamanho.chave}
                                                        type="button"
                                                        onClick={() => alterarTamanhoBlocoPainel(opcao.chave, tamanho.chave)}
                                                        className={classNames(
                                                            "rounded-xl px-2 py-2 text-center ring-1 transition",
                                                            selecionado
                                                                ? "bg-slate-950 text-white ring-slate-950"
                                                                : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                                                        )}
                                                    >
                                                        <span className="block text-xs font-bold">{tamanho.label}</span>
                                                        <span className={classNames("mt-0.5 block text-[10px]", selecionado ? "text-slate-200" : "text-slate-400")}>
                                                            {tamanho.descricao}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </Card>
    );
}
