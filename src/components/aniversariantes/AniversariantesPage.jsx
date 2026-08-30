import "../../styles/pages/aniversariantes-hero.css";
import "../../styles/pages/heroes-aniversariantes-colaboradores-data.css";
import React, { useEffect, useMemo, useState } from "react";
import { CalendarClock, CalendarDays, ChevronDown, Download, Search, Users } from "lucide-react";
import { Card, FotoColaborador, Header, obterFotoColaboradorSrc } from "../commonComponents";
import { STATUS_CLASSIFICACAO_COLABORADOR } from "../../constants/sstConstants";
import { baixarRelatorioAniversariantesPDF } from "../../services/exportacaoService";
import { classNames, formatarAniversario, normalizarTextoBusca } from "../../utils/sstUtils";
import { obterUrlLogoEmpresa } from "../../services/supabaseServices";
import aniversariantesHeroBackground from "../../assets/dashboard-hero-sst.webp";
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

const CHAVE_FILTROS_ANIVERSARIANTES = "controle-sst-qr:aniversariantes:filtros-salvos:v1";
const CHAVE_LAYOUT_ANIVERSARIANTES = "controle-sst-qr:aniversariantes:layout-recolhido:v1";


function carregarLayoutAniversariantes() {
    if (typeof window === "undefined" || !window.localStorage) {
        return {
            filtrosRecolhidos: false,
            listaRecolhida: false,
        };
    }

    try {
        const bruto = window.localStorage.getItem(CHAVE_LAYOUT_ANIVERSARIANTES);
        if (!bruto) {
            return {
                filtrosRecolhidos: false,
                listaRecolhida: false,
            };
        }

        const dados = JSON.parse(bruto);
        if (!dados || typeof dados !== "object") {
            return {
                filtrosRecolhidos: false,
                listaRecolhida: false,
            };
        }

        return {
            filtrosRecolhidos: Boolean(dados.filtrosRecolhidos),
            listaRecolhida: Boolean(dados.listaRecolhida),
        };
    } catch (error) {
        console.error("Erro ao carregar layout de aniversariantes:", error);
        return {
            filtrosRecolhidos: false,
            listaRecolhida: false,
        };
    }
}

function salvarLayoutAniversariantes(proximoLayout) {
    if (typeof window === "undefined" || !window.localStorage) return;

    try {
        window.localStorage.setItem(CHAVE_LAYOUT_ANIVERSARIANTES, JSON.stringify(proximoLayout));
    } catch (error) {
        console.error("Erro ao salvar layout de aniversariantes:", error);
    }
}
function obterFiltrosPadraoAniversariantes() {
    return {
        mes: "Todos",
        empresa: "Todas",
        funcao: "Todas",
        status: "Todos",
        busca: "",
    };
}

function normalizarFiltroSalvoAniversariantes(valor, fallback = "") {
    const texto = String(valor ?? "").trim();
    return texto || fallback;
}

function carregarFiltrosSalvosAniversariantes() {
    if (typeof window === "undefined" || !window.localStorage) return null;

    try {
        const bruto = window.localStorage.getItem(CHAVE_FILTROS_ANIVERSARIANTES);
        if (!bruto) return null;

        const dados = JSON.parse(bruto);
        if (!dados || typeof dados !== "object") return null;

        const padrao = obterFiltrosPadraoAniversariantes();

        return {
            mes: normalizarFiltroSalvoAniversariantes(dados.mes, padrao.mes),
            empresa: normalizarFiltroSalvoAniversariantes(dados.empresa, padrao.empresa),
            funcao: normalizarFiltroSalvoAniversariantes(dados.funcao, padrao.funcao),
            status: normalizarFiltroSalvoAniversariantes(dados.status, padrao.status),
            busca: normalizarFiltroSalvoAniversariantes(dados.busca, padrao.busca),
        };
    } catch (error) {
        console.error("Erro ao carregar filtros salvos de aniversariantes:", error);
        return null;
    }
}

export function Aniversariantes({ colaboradores = [], empresasBanco = [] }) {
    const [mes, setMes] = useState("Todos");
    const [empresa, setEmpresa] = useState("Todas");
    const [funcao, setFuncao] = useState("Todas");
    const [status, setStatus] = useState("Todos");
    const [busca, setBusca] = useState("");
    const [exportandoPDF, setExportandoPDF] = useState(false);
    const [versaoFiltroSalvo, setVersaoFiltroSalvo] = useState(0);
    const [layoutAniversariantes, setLayoutAniversariantes] = useState(() => carregarLayoutAniversariantes());
    const [agoraHeroAniversariantes, setAgoraHeroAniversariantes] = useState(() => new Date());

    useEffect(() => {
        const atualizarRelogioHeroAniversariantes = () => {
            setAgoraHeroAniversariantes(new Date());
        };

        atualizarRelogioHeroAniversariantes();

        const intervaloRelogioHeroAniversariantes = window.setInterval(
            atualizarRelogioHeroAniversariantes,
            30000
        );

        return () => {
            window.clearInterval(intervaloRelogioHeroAniversariantes);
        };
    }, []);
    const filtrosAniversariantesRecolhidos = layoutAniversariantes.filtrosRecolhidos;
    const listaAniversariantesRecolhida = layoutAniversariantes.listaRecolhida;

    const atualizarLayoutAniversariantes = (atualizador) => {
        setLayoutAniversariantes((layoutAtual) => {
            const proximoLayout = typeof atualizador === "function" ? atualizador(layoutAtual) : atualizador;
            salvarLayoutAniversariantes(proximoLayout);
            return proximoLayout;
        });
    };

    const filtrosSalvosDisponiveis = useMemo(
        () => Boolean(carregarFiltrosSalvosAniversariantes()),
        [versaoFiltroSalvo]
    );

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

    const dataHoraHeroAniversariantes = useMemo(() => {
        const formatarDiaSemana = (valor = "") =>
            String(valor)
                .split("-")
                .map((trecho) =>
                    trecho
                        ? trecho.charAt(0).toLocaleUpperCase("pt-BR") +
                          trecho.slice(1).toLocaleLowerCase("pt-BR")
                        : trecho
                )
                .join("-");

        return {
            data: new Intl.DateTimeFormat("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
            }).format(agoraHeroAniversariantes),

            diaSemana: formatarDiaSemana(
                new Intl.DateTimeFormat("pt-BR", {
                    weekday: "long",
                }).format(agoraHeroAniversariantes)
            ),

            hora: new Intl.DateTimeFormat("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23",
            }).format(agoraHeroAniversariantes),
        };
    }, [agoraHeroAniversariantes]);

    const proximo = useMemo(() => proximoAniversariante(colaboradoresComAniversario), [colaboradoresComAniversario]);
    const diasAteProximo = proximo?.colaborador ? calcularDiasAteAniversario(proximo.colaborador) : null;
    const filtrosAtivos = mes !== "Todos" || empresa !== "Todas" || funcao !== "Todas" || status !== "Todos" || Boolean(normalizarTextoBusca(busca));
    const tituloResumoRegistros = filtrosAtivos ? "Registros encontrados" : "Total de aniversariantes";
    const textoQuantidadeRegistros = filtrados.length === 1 ? "colaborador encontrado" : "colaboradores encontrados";
    const textoApoioRegistros = filtrosAtivos
        ? "Resultado conforme os filtros aplicados."
        : "Colaboradores com data de nascimento cadastrada.";

    const filtrosAtuaisAniversariantes = useMemo(
        () => ({ mes, empresa, funcao, status, busca }),
        [mes, empresa, funcao, status, busca]
    );

    const salvarFiltrosAniversariantes = () => {
        if (typeof window === "undefined" || !window.localStorage) return;

        try {
            window.localStorage.setItem(CHAVE_FILTROS_ANIVERSARIANTES, JSON.stringify(filtrosAtuaisAniversariantes));
            setVersaoFiltroSalvo((valor) => valor + 1);
            alert("Filtros de aniversariantes salvos.");
        } catch (error) {
            console.error("Erro ao salvar filtros de aniversariantes:", error);
            alert("N\u00e3o foi poss\u00edvel salvar os filtros de aniversariantes.");
        }
    };

    const aplicarFiltrosSalvosAniversariantes = () => {
        const filtrosSalvos = carregarFiltrosSalvosAniversariantes();

        if (!filtrosSalvos) {
            alert("Nenhum filtro salvo encontrado para aniversariantes.");
            return;
        }

        setMes(filtrosSalvos.mes || "Todos");
        setEmpresa(filtrosSalvos.empresa || "Todas");
        setFuncao(filtrosSalvos.funcao || "Todas");
        setStatus(filtrosSalvos.status || "Todos");
        setBusca(filtrosSalvos.busca || "");
    };

    const limparFiltrosSalvosAniversariantes = () => {
        if (typeof window === "undefined" || !window.localStorage) return;

        window.localStorage.removeItem(CHAVE_FILTROS_ANIVERSARIANTES);
        setVersaoFiltroSalvo((valor) => valor + 1);
        alert("Filtros salvos de aniversariantes removidos.");
    };

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
                nomeArquivo: "relatório-aniversariantes.pdf",
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
                className="header-aniversariantes hero-integrated-page-header hero-header--aniversariantes"
                subtitulo={null}
            />

            <section className="aniversariantes-hero-banner">
                <div
                    className="aniversariantes-hero-banner__bg"
                    style={{
                        backgroundImage: `url(${aniversariantesHeroBackground})`,
                    }}
                />
                <div className="aniversariantes-hero-banner__overlay" />

                <div className="aniversariantes-hero-banner__content">
                    <div className="min-w-0">
                        <p className="aniversariantes-hero-banner__eyebrow">
                            SAFESCAN BRASIL
                        </p>

                        <h2 className="aniversariantes-hero-banner__title">
                            Gestão de aniversariantes
                        </h2>

                        <p className="aniversariantes-hero-banner__text">
                            Acompanhe aniversários por mês e empresa em uma visão única.
                        </p>

                        <div className="aniversariantes-hero-banner__line" />
                    </div>

                    <div
                        className="aniversariantes-hero-banner__date"
                        aria-label={`Data e hora atuais: ${dataHoraHeroAniversariantes.data}, ${dataHoraHeroAniversariantes.diaSemana}, ${dataHoraHeroAniversariantes.hora}`}
                    >
                        <CalendarClock className="h-4 w-4" />
                        <span>{dataHoraHeroAniversariantes.data}</span>
                        <span aria-hidden="true">•</span>
                        <span>{dataHoraHeroAniversariantes.diaSemana}</span>
                        <span aria-hidden="true">•</span>
                        <span>{dataHoraHeroAniversariantes.hora}</span>
                    </div>

                    <div className="aniversariantes-hero-banner__stats">
                        <div className="aniversariantes-hero-banner__stat aniversariantes-hero-banner__stat--exibidos">
                            <Search className="h-4 w-4" />
                            <span>{filtrados.length} exibidos</span>
                        </div>

                        <div className="aniversariantes-hero-banner__stat aniversariantes-hero-banner__stat--ano">
                            <Users className="h-4 w-4" />
                            <span>{resumoMensal.totalAno} no ano</span>
                        </div>

                        <div className="aniversariantes-hero-banner__stat aniversariantes-hero-banner__stat--proximo">
                            <CalendarDays className="h-4 w-4" />
                            <span>
                                {diasAteProximo === null
                                    ? "Sem próximo aniversário"
                                    : `Próximo em ${diasAteProximo} dia(s)`}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={exportarPDFAniversariantes}
                            disabled={exportandoPDF || filtrados.length === 0}
                            className="aniversariantes-hero-banner__exportar"
                        >
                            <Download className="h-4 w-4" />
                            {exportandoPDF ? "Gerando PDF..." : "Exportar PDF"}
                        </button>
                    </div>
                </div>
            </section>

            <Card className="aniversariantes-resumo-unificado mb-5">
                <div className="aniversariantes-resumo-unificado__grid">
                    <section className="aniversariantes-resumo-unificado__item aniversariantes-resumo-unificado__item--total">
                        <div className="aniversariantes-resumo-unificado__icone aniversariantes-resumo-unificado__icone--total">
                            <Users className="h-6 w-6" />
                        </div>
                        <div className="aniversariantes-resumo-unificado__texto">
                            <p className="aniversariantes-resumo-unificado__rotulo">{tituloResumoRegistros}</p>
                            <div className="aniversariantes-resumo-unificado__numero-linha">
                                <strong>{filtrados.length}</strong>
                                <span>{textoQuantidadeRegistros}</span>
                            </div>
                            <p className="aniversariantes-resumo-unificado__apoio">{textoApoioRegistros}</p>
                        </div>
                    </section>

                    <section className="aniversariantes-resumo-unificado__item aniversariantes-resumo-unificado__item--proximo">
                        <div className="aniversariantes-resumo-unificado__icone aniversariantes-resumo-unificado__icone--proximo">
                            <CalendarDays className="h-6 w-6" />
                        </div>
                        <div className="aniversariantes-resumo-unificado__texto">
                            <p className="aniversariantes-resumo-unificado__rotulo">Próximo aniversário</p>
                            <p className="aniversariantes-resumo-unificado__nome">{proximo?.colaborador?.nome || "-"}</p>
                            <p className="aniversariantes-resumo-unificado__apoio">
                                {proximo ? formatarProximoAniversario(proximo.colaborador) : "Sem data cadastrada"}
                                {diasAteProximo !== null ? ` • faltam ${diasAteProximo} dia(s)` : ""}
                            </p>
                        </div>
                    </section>

                    <section className="aniversariantes-resumo-unificado__grafico">
                        <div className="aniversariantes-resumo-unificado__grafico-topo">
                            <div>
                                <p className="aniversariantes-resumo-unificado__grafico-titulo">Distribuição mensal</p>
                                <div className="aniversariantes-resumo-unificado__grafico-subtitulo">


                                </div>
                            </div>


                        </div>

                        <div className="aniversariantes-resumo-unificado__barras">
                            {resumoMensal.totais.map((item) => {
                                const altura = resumoMensal.maiorTotal > 0 ? Math.max(18, Math.round((item.total / resumoMensal.maiorTotal) * 72)) : 18;
                                const ativo = mes !== "Todos" && String(item.numero).padStart(2, "0") === mes;
                                const mesAtual = item.numero === resumoMensal.mesAtual;

                                return (
                                    <div key={item.valor} className="aniversariantes-resumo-unificado__mes">
                                        <span className="aniversariantes-resumo-unificado__valor">{item.total}</span>
                                        <div
                                            className={classNames(
                                                "aniversariantes-resumo-unificado__barra",
                                                ativo && "aniversariantes-resumo-unificado__barra--ativa",
                                                !ativo && mesAtual && "aniversariantes-resumo-unificado__barra--atual"
                                            )}
                                            style={{ height: `${altura}px` }}
                                            title={`${item.nome}: ${item.total}`}
                                        />
                                        <span className="aniversariantes-resumo-unificado__mes-label">{item.curto}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>
            </Card>
            <div onClick={(evento) => {
                const alvoInterativo = evento.target.closest?.(
                    "button, a, input, select, textarea, label, table, [role='button'], [data-aniversariantes-nao-alternar]"
                );

                if (alvoInterativo) return;

                if (!filtrosAniversariantesRecolhidos) {
                    const cabecalho = evento.currentTarget.querySelector("[data-aniversariantes-card-cabecalho='filtros']");
                    if (cabecalho && !cabecalho.contains(evento.target)) return;
                }

                atualizarLayoutAniversariantes((layoutAtual) => ({
                    ...layoutAtual,
                    filtrosRecolhidos: !layoutAtual.filtrosRecolhidos,
                }));
            }}>
            <Card
                className={classNames(
                    "aniversariantes-filtros-card mb-5",
                    filtrosAniversariantesRecolhidos && "aniversariantes-filtros-card--recolhido"
                )}
            >
                <div data-aniversariantes-card-cabecalho="filtros" className="aniversariantes-filtros-card__cabecalho">
                    <div className="aniversariantes-filtros-card__titulo">
                        <p>Filtros salvos</p>
                        <span>
                            {filtrosAniversariantesRecolhidos
                                ? "Filtros recolhidos para deixar a tela mais compacta."
                                : "Salve uma combinação de filtros para reutilizar neste relatório."}
                        </span>
                    </div>

                    <div className="aniversariantes-filtros-card__acoes">
                        {!filtrosAniversariantesRecolhidos && (
                            <>
                                <button
                                    type="button"
                                    onClick={salvarFiltrosAniversariantes}
                                    className="aniversariantes-filtros-card__botao aniversariantes-filtros-card__botao--principal"
                                >
                                    Salvar filtro
                                </button>
                                <button
                                    type="button"
                                    onClick={aplicarFiltrosSalvosAniversariantes}
                                    disabled={!filtrosSalvosDisponiveis}
                                    className={classNames(
                                        "aniversariantes-filtros-card__botao",
                                        filtrosSalvosDisponiveis
                                            ? "aniversariantes-filtros-card__botao--escuro"
                                            : "aniversariantes-filtros-card__botao--desabilitado"
                                    )}
                                >
                                    Aplicar filtro salvo
                                </button>
                                <button
                                    type="button"
                                    onClick={limparFiltrosSalvosAniversariantes}
                                    disabled={!filtrosSalvosDisponiveis}
                                    className={classNames(
                                        "aniversariantes-filtros-card__botao",
                                        filtrosSalvosDisponiveis
                                            ? "aniversariantes-filtros-card__botao--limpar"
                                            : "aniversariantes-filtros-card__botao--desabilitado"
                                    )}
                                >
                                    Limpar filtro salvo
                                </button>
                            </>
                        )}

                        <button
                            type="button"
                            onClick={() => atualizarLayoutAniversariantes((layoutAtual) => ({
                                ...layoutAtual,
                                filtrosRecolhidos: !layoutAtual.filtrosRecolhidos,
                            }))}
                            className="aniversariantes-filtros-card__toggle"
                        >
                            <ChevronDown
                                className={classNames(
                                    "h-3.5 w-3.5 transition",
                                    !filtrosAniversariantesRecolhidos && "rotate-180"
                                )}
                            />
                            {filtrosAniversariantesRecolhidos ? "Abrir" : "Recolher"}
                        </button>
                    </div>
                </div>

                {!filtrosAniversariantesRecolhidos && (
                    <div className="aniversariantes-filtros-card__grid">
                        <label className="relative block">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                id="aniversariantes-busca"
                                name="buscaAniversariante"
                                aria-label="Buscar aniversariantes"
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                placeholder="Buscar por nome, empresa ou função"
                                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />
                        </label>

                        <select id="aniversariantes-filtro-mes" name="filtroMes" aria-label="Filtrar aniversariantes por mês" value={mes} onChange={(e) => setMes(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100">
                            <option value="Todos">Todos os meses</option>
                            {MESES_ANIVERSARIO.map((item) => <option key={item.valor} value={item.valor}>{item.nome}</option>)}
                        </select>

                        <select id="aniversariantes-filtro-empresa" name="filtroEmpresa" aria-label="Filtrar aniversariantes por empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100">
                            {opcoesEmpresa.map((item) => <option key={item}>{item}</option>)}
                        </select>

                        <select id="aniversariantes-filtro-funcao" name="filtroFuncao" aria-label="Filtrar aniversariantes por função" value={funcao} onChange={(e) => setFuncao(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100">
                            {opcoesFuncao.map((item) => <option key={item}>{item}</option>)}
                        </select>

                        <select id="aniversariantes-filtro-status" name="filtroStatus" aria-label="Filtrar aniversariantes por status" value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100">
                            {opcoesStatus.map((item) => <option key={item}>{item}</option>)}
                        </select>
                    </div>
                )}
            </Card>
            </div>
            <div onClick={(evento) => {
                const alvoInterativo = evento.target.closest?.(
                    "button, a, input, select, textarea, label, table, [role='button'], [data-aniversariantes-nao-alternar]"
                );

                if (alvoInterativo) return;

                if (!listaAniversariantesRecolhida) {
                    const cabecalho = evento.currentTarget.querySelector("[data-aniversariantes-card-cabecalho='lista']");
                    if (cabecalho && !cabecalho.contains(evento.target)) return;
                }

                atualizarLayoutAniversariantes((layoutAtual) => ({
                    ...layoutAtual,
                    listaRecolhida: !layoutAtual.listaRecolhida,
                }));
            }}>
            <Card
                className={classNames(
                    "aniversariantes-lista-card",
                    listaAniversariantesRecolhida && "aniversariantes-lista-card--recolhido"
                )}
            >
                <div data-aniversariantes-card-cabecalho="lista" className="aniversariantes-lista-card__cabecalho">
                    <div className="aniversariantes-lista-card__titulo">
                        <p>Lista de aniversariantes</p>
                        <span>
                            {listaAniversariantesRecolhida
                                ? `${filtrados.length} ${filtrados.length === 1 ? "colaborador encontrado" : "colaboradores encontrados"}. Clique em abrir para visualizar a lista.`
                                : "Consulte colaboradores, empresas, datas de aniversario e status em uma lista unica."}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={() => atualizarLayoutAniversariantes((layoutAtual) => ({
                            ...layoutAtual,
                            listaRecolhida: !layoutAtual.listaRecolhida,
                        }))}
                        className="aniversariantes-lista-card__toggle"
                    >
                        <ChevronDown
                            className={classNames(
                                "h-3.5 w-3.5 transition",
                                !listaAniversariantesRecolhida && "rotate-180"
                            )}
                        />
                        {listaAniversariantesRecolhida ? "Abrir" : "Recolher"}
                    </button>
                </div>

                {!listaAniversariantesRecolhida && (
                    <>
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
                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-sm font-black text-slate-600 ring-1 ring-slate-200">
                                                    <FotoColaborador
                                                        src={colaborador}
                                                        colaborador={colaborador}
                                                        colaboradorId={colaborador.id}
                                                        nome={colaborador.nome}
                                                        className="h-full w-full rounded-full object-cover"
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
                    </>
                )}
            </Card>
            </div>
        </div>
    );
}
