import { useEffect, useMemo, useState } from "react";
import {
    ChevronRight,
    Building2,
    Search,
    SlidersHorizontal,
} from "lucide-react";

const OPCOES_FILTRO = [
    { valor: "todas", rotulo: "Todas as empresas" },
    { valor: "az", rotulo: "Ordenar de A a Z" },
    { valor: "za", rotulo: "Ordenar de Z a A" },
    { valor: "principais", rotulo: "Somente contratadas" },
    { valor: "subcontratadas", rotulo: "Somente subcontratadas" },
];

function obterIniciaisEmpresa(nome = "") {
    return String(nome)
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => parte[0])
        .join("")
        .toUpperCase() || "EM";
}

function LogoEmpresa({ empresa }) {
    const [imagemComErro, setImagemComErro] = useState(false);

    useEffect(() => setImagemComErro(false), [empresa.logoUrl]);

    if (empresa.logoUrl && !imagemComErro) {
        return (
            <span className="certidao-mensal-empresa-row__logo">
                <img
                    src={empresa.logoUrl}
                    alt={`Logo ${empresa.nome}`}
                    onError={() => setImagemComErro(true)}
                />
            </span>
        );
    }

    return (
        <span className="certidao-mensal-empresa-row__logo is-fallback" aria-hidden="true">
            <Building2 />
            <small>{obterIniciaisEmpresa(empresa.nome)}</small>
        </span>
    );
}

export function EmpresasFiscalizadasPanel({
    empresas,
    empresaSelecionadaId,
    onSelecionarEmpresa,
    totalEmpresasSistema,
}) {
    const [busca, setBusca] =
        useState("");
    const [filtro, setFiltro] = useState("todas");
    const [filtrosAbertos, setFiltrosAbertos] = useState(false);

    const empresasFiltradas = useMemo(() => {
        const termo =
            busca.trim().toLowerCase();

        const resultado = empresas.filter((empresa) => {
            const correspondeBusca = !termo
                || empresa.nome.toLowerCase().includes(termo)
                || empresa.cnpj.toLowerCase().includes(termo);
            const correspondeFiltro = ["todas", "az", "za"].includes(filtro)
                || (filtro === "principais" && !empresa.nivel)
                || (filtro === "subcontratadas" && Boolean(empresa.nivel));

            return correspondeBusca && correspondeFiltro;
        });

        if (!["az", "za"].includes(filtro)) return resultado;

        const direcao = filtro === "za" ? -1 : 1;
        return [...resultado].sort((a, b) => {
            const grupoA = a.nivel ? a.empresaPaiNome : a.nome;
            const grupoB = b.nivel ? b.empresaPaiNome : b.nome;
            const comparacaoGrupo = grupoA.localeCompare(grupoB, "pt-BR", { sensitivity: "base" });
            if (comparacaoGrupo !== 0) return comparacaoGrupo * direcao;
            if (a.nivel !== b.nivel) return a.nivel - b.nivel;
            return a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }) * direcao;
        });
    }, [busca, empresas, filtro]);

    return (
        <section className="certidao-mensal-panel certidao-mensal-empresas">
            <header className="certidao-mensal-panel__header">
                <div className="certidao-mensal-unified-header__main">
                    <span className="certidao-mensal-unified-header__icon">
                        <Building2 aria-hidden="true" />
                    </span>
                    <div>
                        <h3>Empresas</h3>
                        <p>Fiscalização documental</p>
                        <small>{totalEmpresasSistema} empresa(s) na competência</small>
                    </div>
                </div>
            </header>

            <div className="certidao-mensal-empresas__toolbar">
                <label className="certidao-mensal-empresas__search">
                    <Search aria-hidden="true" />
                    <input
                        id="certidao-mensal-busca-empresa"
                        name="certidao-mensal-busca-empresa"
                        type="text"
                        value={busca}
                        onChange={(evento) => setBusca(evento.target.value)}
                        placeholder="Buscar empresa..."
                    />
                </label>

                <div className="certidao-mensal-empresas__filter-wrap">
                <button
                    type="button"
                    className={`certidao-mensal-empresas__filter${filtro !== "todas" ? " is-active" : ""}`}
                    aria-label="Filtrar empresas"
                    aria-expanded={filtrosAbertos}
                    onClick={() => setFiltrosAbertos((aberto) => !aberto)}
                    title="Filtrar empresas"
                >
                    <SlidersHorizontal aria-hidden="true" />
                </button>

                {filtrosAbertos && (
                    <div className="certidao-mensal-empresas__filter-menu" role="menu">
                        <strong>Exibir</strong>
                        {OPCOES_FILTRO.map((opcao) => (
                            <button
                                key={opcao.valor}
                                type="button"
                                className={filtro === opcao.valor ? "is-selected" : ""}
                                onClick={() => {
                                    setFiltro(opcao.valor);
                                    setFiltrosAbertos(false);
                                }}
                            >
                                <span>{opcao.rotulo}</span>
                                {filtro === opcao.valor && <i aria-hidden="true" />}
                            </button>
                        ))}
                    </div>
                )}
                </div>
            </div>

            <div className="certidao-mensal-empresas__lista">
                {empresasFiltradas.map((empresa) => {
                    const ativa = empresa.id === empresaSelecionadaId;

                    const competenciaExigivel =
                        empresa.vigenciaContratual
                            ?.exigivel !== false;

                    return (
                        <button
                            key={empresa.id}
                            type="button"
                            className={`certidao-mensal-empresa-row${ativa ? " is-active" : ""}${empresa.nivel ? " is-subcontratada" : ""}${competenciaExigivel ? "" : " is-nao-aplicavel"}`}
                            style={{ "--empresa-nivel": Math.min(Number(empresa.nivel) || 0, 3) }}
                            onClick={() => onSelecionarEmpresa(empresa.id)}
                        >
                            <div className="certidao-mensal-empresa-row__main">
                                <LogoEmpresa empresa={empresa} />
                                <div className="certidao-mensal-empresa-row__identity">
                                    <strong title={empresa.nome}>
                                        {empresa.nome}
                                    </strong>

                                    {empresa.empresaPaiNome && (
                                        <small
                                            className="certidao-mensal-empresa-row__subcontratada"
                                            title={`Subcontratada de ${empresa.empresaPaiNome}`}
                                            aria-label={`Subcontratada de ${empresa.empresaPaiNome}`}
                                        >
                                            Sub.: {empresa.empresaPaiNome}
                                        </small>
                                    )}
                                </div>
                            </div>

                            <div
                                className="certidao-mensal-empresa-row__meta"
                                aria-label={
                                    competenciaExigivel
                                        ? `${empresa.pendencias} pendência(s)`
                                        : (
                                            empresa.vigenciaContratual
                                                ?.rotulo ||
                                            "Competência não aplicável"
                                        )
                                }
                                title={
                                    competenciaExigivel
                                        ? `${empresa.pendencias} pendência(s)`
                                        : empresa.vigenciaContratual
                                            ?.mensagem
                                }
                            >
                                <strong>
                                    {competenciaExigivel
                                        ? empresa.pendencias
                                        : "—"}
                                </strong>
                                {!competenciaExigivel && (
                                    <small>Não aplicável</small>
                                )}
                                <ChevronRight aria-hidden="true" />
                            </div>
                        </button>
                    );
                })}

                {empresasFiltradas.length === 0 && (
                    <div className="certidao-mensal-empresas__empty">
                        Nenhuma empresa localizada para o filtro informado.
                    </div>
                )}
            </div>

            <footer className="certidao-mensal-empresas__footer">
                <span>
                    {empresasFiltradas.length} de {totalEmpresasSistema} empresa(s)
                </span>
                <small>Role para visualizar todas</small>
            </footer>
        </section>
    );
}
