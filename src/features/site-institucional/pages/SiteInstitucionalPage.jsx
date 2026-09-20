import {
    lazy,
    Suspense,
    useState,
} from "react";

import {
    ArrowRight,
    BadgeCheck,
    Box,
    Building2,
    CheckCircle2,
    ClipboardCheck,
    FileCheck2,
    HardHat,
    History,
    LayoutDashboard,
    MapPinned,
    QrCode,
    ShieldCheck,
    UsersRound,
    X,
} from "lucide-react";

import { QRCodeSVG } from "qrcode.react";


import accessModalHero from "../../../assets/nova-auditoria-hero-bg.webp";



import "../styles/site-institucional.css";

const customSolutionsBanner = "https://koukyzczwttemgmloagt.supabase.co/storage/v1/object/public/site-institucional-assets/site-institucional-solucoes-personalizadas-v2.webp";
const plantaGeralDemoRaster = "https://koukyzczwttemgmloagt.supabase.co/storage/v1/object/public/site-institucional-assets/site-institucional-planta-aerea-demo-q92.webp";
const plantaAreaOperacionalDetalhadaRaster = "https://koukyzczwttemgmloagt.supabase.co/storage/v1/object/public/site-institucional-assets/site-institucional-area-operacional-detalhada-q92.webp";

const PlantaInterativaDemo =
    lazy(
        () =>
            import(
                "../../../components/mapa/PlantaInterativa.jsx"
            ).then(
                (
                    modulo
                ) => ({
                    default:
                        modulo.PlantaInterativa,
                })
            )
    );

const TIPOS_QR_DEMO =
    new Set(
        [
            "colaborador",
            "equipamento",
            "campo",
        ]
    );

function obterDemoQrDaUrl() {
    if (
        typeof window ===
        "undefined"
    ) {
        return null;
    }

    const params =
        new URLSearchParams(
            window.location.search
        );

    const tipo =
        params.get(
            "demo"
        );

    return TIPOS_QR_DEMO.has(
        tipo
    )
        ? tipo
        : null;
}

function criarUrlQrDemo(
    tipo
) {
    if (
        typeof window ===
        "undefined"
    ) {
        return "";
    }

    const url =
        new URL(
            window.location.href
        );

    /*
     * DEV mantém /apresentacao.
     * Produção institucional usa a raiz do domínio.
     */
    url.pathname =
        url.pathname ===
        "/apresentacao"
            ? "/apresentacao"
            : "/";

    url.search =
        "";

    url.searchParams.set(
        "demo",
        tipo
    );

    url.hash =
        tipo === "campo"
            ? "demonstracao-interativa"
            : "demonstracao-interativa";

    return url.toString();
}

const pontosMapaDemo =
    [
        {
            id:
                "area-operacional",

            nome:
                "Área operacional",

            tipo:
                "Área operacional",

            coordenadas:
                {
                    x: 27,
                    y: 31,
                },

            status:
                "Ativa",

            ultimaInspecao:
                "16/09/2026",

            plantaDetalhada:
                {
                    url:
                        plantaAreaOperacionalDetalhadaRaster,
                },

            zoomMinimoFilhos:
                -2,

            pontosFilhos:
                [
                    {
                        id:
                            "eq-014",

                        nome:
                            "Furadeira de impacto — EQ-014",

                        tipo:
                            "Equipamento",

                        coordenadas:
                            {
                                x: 20,
                                y: 37,
                            },

                        status:
                            "Liberado",

                        ultimaInspecao:
                            "15/09/2026",
                    },
                    {
                        id:
                            "ri-eletrico-01",

                        nome:
                            "Ponto de atenção elétrico",

                        tipo:
                            "Risco elétrico",

                        coordenadas:
                            {
                                x: 31,
                                y: 37,
                            },

                        status:
                            "Monitorado",

                        ultimaInspecao:
                            "16/09/2026",
                    },
                    {
                        id:
                            "ex-003",

                        nome:
                            "Extintor ABC — EX-003",

                        tipo:
                            "Equipamento de segurança",

                        coordenadas:
                            {
                                x: 40,
                                y: 29,
                            },

                        status:
                            "Disponível",

                        ultimaInspecao:
                            "12/09/2026",
                    },
                ],
        },
        {
            id:
                "armazenamento",

            nome:
                "Armazenamento",

            tipo:
                "Armazenamento",

            coordenadas:
                {
                    x: 73,
                    y: 30,
                },

            status:
                "Ativo",

            ultimaInspecao:
                "14/09/2026",

            zoomMinimoFilhos:
                -2,

            pontosFilhos:
                [
                    {
                        id:
                            "eq-022",

                        nome:
                            "Serra circular — EQ-022",

                        tipo:
                            "Equipamento",

                        coordenadas:
                            {
                                x: 68,
                                y: 37,
                            },

                        status:
                            "Liberado",

                        ultimaInspecao:
                            "14/09/2026",
                    },
                    {
                        id:
                            "ri-circulacao-01",

                        nome:
                            "Circulação de máquinas",

                        tipo:
                            "Risco de circulação",

                        coordenadas:
                            {
                                x: 82,
                                y: 37,
                            },

                        status:
                            "Sinalizado",

                        ultimaInspecao:
                            "16/09/2026",
                    },
                ],
        },
        {
            id:
                "area-apoio",

            nome:
                "Área de apoio",

            tipo:
                "Área de apoio",

            coordenadas:
                {
                    x: 49,
                    y: 73,
                },

            status:
                "Ativa",

            ultimaInspecao:
                "13/09/2026",

            zoomMinimoFilhos:
                -2,

            pontosFilhos:
                [
                    {
                        id:
                            "ex-011",

                        nome:
                            "Kit de emergência — EX-011",

                        tipo:
                            "Equipamento de segurança",

                        coordenadas:
                            {
                                x: 54,
                                y: 75,
                            },

                        status:
                            "Disponível",

                        ultimaInspecao:
                            "13/09/2026",
                    },
                ],
        },
        {
            id:
                "alerta-borda-01",

            nome:
                "Risco de queda em borda",

            tipo:
                "Risco de queda",

            variante:
                "alerta",

            coordenadas:
                {
                    x: 84,
                    y: 73,
                },

            status:
                "Em acompanhamento",

            ultimaInspecao:
                "16/09/2026",
        },
    ];

const AMBIENTES_RESERVADOS =
    new Set(
        [
            "www",
            "app",
            "admin",
            "api",
            "qr",
            "status",
            "assets",
            "static",
            "auth",
        ]
    );

function normalizarSlugAmbiente(
    valor = ""
) {
    let texto =
        String(
            valor || ""
        )
            .trim()
            .toLowerCase();

    texto =
        texto.replace(
            /^https?:\/\//,
            ""
        );

    texto =
        texto.split(
            "/"
        )[0];

    const sufixo =
        ".safescanbrasil.com.br";

    if (
        texto.endsWith(
            sufixo
        )
    ) {
        texto =
            texto.slice(
                0,
                -sufixo.length
            );
    }

    return texto.replace(
        /[^a-z0-9-]/g,
        ""
    );
}

const problemas =
    [
        "Documentos e evidências espalhados em diferentes locais.",
        "Pendências e vencimentos difíceis de acompanhar no dia a dia.",
        "Múltiplas empresas e equipes dentro da mesma operação.",
        "Comprovação em campo dependente de busca manual ou papel.",
    ];

const dominios =
    [
        {
            titulo:
                "Pessoas e vínculos",

            texto:
                "Acompanhe colaboradores desde a mobilização até as movimentações do ciclo profissional.",

            itens:
                [
                    "Colaboradores",
                    "Mobilização e desmobilização",
                    "Férias, afastamentos e retorno",
                    "Histórico profissional",
                ],

            Icone:
                UsersRound,

            classe:
                "pessoas",
        },
        {
            titulo:
                "Documentação e conformidade",

            texto:
                "Centralize documentos, treinamentos, evidências e conferências documentais.",

            itens:
                [
                    "Documentos de empresas e colaboradores",
                    "Treinamentos",
                    "Consolidação documental",
                    "Certidão Mensal Documental",
                ],

            Icone:
                FileCheck2,

            classe:
                "documentos",
        },
        {
            titulo:
                "Campo e consulta",

            texto:
                "Leve a informação da gestão para a operação com recursos de consulta e validação em campo.",

            itens:
                [
                    "QR de colaboradores e itens de campo",
                    "Mapa interativo de riscos",
                    "DDS e auditorias de campo",
                    "Vistorias e equipamentos de segurança",
                ],

            Icone:
                QrCode,

            classe:
                "campo",
        },
        {
            titulo:
                "Gestão e rastreabilidade",

            texto:
                "Mantenha empresas, permissões, históricos e evidências dentro do mesmo ambiente.",

            itens:
                [
                    "Empresas e contratadas",
                    "Dashboard SST",
                    "Permissões",
                    "Histórico e auditoria",
                ],

            Icone:
                LayoutDashboard,

            classe:
                "gestao",
        },
    ];

const fluxo =
    [
        {
            numero:
                "01",
            titulo:
                "Cadastrar",
            texto:
                "Estruture empresas, pessoas e informações essenciais da operação.",
        },
        {
            numero:
                "02",
            titulo:
                "Organizar",
            texto:
                "Concentre documentos, treinamentos e evidências em um único fluxo.",
        },
        {
            numero:
                "03",
            titulo:
                "Validar",
            texto:
                "Confira dados e condições antes que a informação siga para a rotina operacional.",
        },
        {
            numero:
                "04",
            titulo:
                "Acompanhar",
            texto:
                "Visualize situações, pendências e históricos ao longo do tempo.",
        },
        {
            numero:
                "05",
            titulo:
                "Comprovar",
            texto:
                "Disponibilize a informação correta no momento da fiscalização ou consulta em campo.",
        },
    ];

export function SiteInstitucionalPage() {
    function abrirContato(event) {
        if (window.matchMedia("(min-width: 1081px)").matches) {
            return;
        }

        event.preventDefault();

        const destino =
            document.getElementById("contato");

        if (!destino) {
            return;
        }

        const header =
            document.querySelector(".ss-site__header");

        const alturaHeader =
            header?.getBoundingClientRect().height ?? 0;

        const margemSuperior = 8;

        const destinoTop =
            window.scrollY +
            destino.getBoundingClientRect().top -
            alturaHeader -
            margemSuperior;

        window.history.replaceState(
            null,
            "",
            "#contato"
        );

        window.scrollTo(
            0,
            Math.max(
                0,
                destinoTop
            )
        );
    }

    const ano =
        new Date().getFullYear();

    const demoQrInicial =
        obterDemoQrDaUrl();

    const [
        demoAtivo,
        setDemoAtivo,
    ] =
        useState(
            demoQrInicial === "colaborador" ||
            demoQrInicial === "equipamento"
                ? demoQrInicial
                : "mapa"
        );


    const [
        plantaDetalhadaAberta,
        setPlantaDetalhadaAberta,
    ] =
        useState(
            () =>
                demoQrInicial === "campo"
                    ? (
                        pontosMapaDemo.find(
                            (
                                ponto
                            ) =>
                                ponto.id ===
                                "area-operacional"
                        ) ??
                        null
                    )
                    : null
        );

    const [
        acessoAberto,
        setAcessoAberto,
    ] =
        useState(
            false
        );

    const [
        ambiente,
        setAmbiente,
    ] =
        useState(
            ""
        );

    const [
        erroAcesso,
        setErroAcesso,
    ] =
        useState(
            ""
        );

    function abrirAcesso() {
        setErroAcesso(
            ""
        );

        setAcessoAberto(
            true
        );
    }

    function fecharAcesso() {
        setAcessoAberto(
            false
        );

        setErroAcesso(
            ""
        );
    }

    function acessarAmbiente(
        event
    ) {
        event.preventDefault();

        const slug =
            normalizarSlugAmbiente(
                ambiente
            );

        const slugValido =
            /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(
                slug
            );

        if (
            !slug ||
            !slugValido ||
            AMBIENTES_RESERVADOS.has(
                slug
            )
        ) {
            setErroAcesso(
                "Informe o nome do ambiente da sua empresa. Exemplo: idealiza."
            );

            return;
        }

        const destino =
            `https://${slug}.safescanbrasil.com.br`;

        window.location.assign(
            destino
        );
    }

    return (
        <div className="ss-site">
            <header className="ss-site__header">
                <div className="ss-site__container ss-site__header-inner">
                    <a
                        className="ss-site__brand"
                        href="#inicio"
                        aria-label="SafeScan Brasil — início"
                    >
                        <img
                            src="/brand/safescan-brasil-login.png"
                            alt=""
                            className="ss-site__brand-image"
                        />

                        <span className="ss-site__brand-copy">
                            <strong>
                                SafeScan Brasil
                            </strong>

                            <small>
                                Gestão SST conectada
                            </small>
                        </span>
                    </a>

                    <nav
                        className="ss-site__nav"
                        aria-label="Navegação principal"
                    >
                        <a href="#recursos">
                            Recursos
                        </a>

                        <a href="#demonstracao-interativa">
                            Demonstração
                        </a>

                        <a href="#como-funciona">
                            Como funciona
                        </a>

                        <a href="#campo-qr">
                            Campo + QR
                        </a>

                        <a href="#seguranca">
                            Multiempresa
                        </a>

                        <a href="#solucoes-personalizadas">
                            Soluções
                        </a>
                    </nav>

                    <div className="ss-site__header-actions">
                        <button
                            type="button"
                            onClick={abrirAcesso}
                            className="ss-site__button ss-site__button--ghost"
                        >
                            Acessar plataforma
                        </button>

                        <a
                            href="#contato" onClick={abrirContato}
                            className="ss-site__button ss-site__button--primary ss-site__button--compact"
                        >
                            Solicitar demonstração
                        </a>
                    </div>
                </div>
            </header>

            <main>
                <section
                    id="inicio"
                    className="ss-site__hero"
                >
                    <div className="ss-site__hero-glow ss-site__hero-glow--one" />
                    <div className="ss-site__hero-glow ss-site__hero-glow--two" />

                    <div className="ss-site__container ss-site__hero-grid">
                        <div className="ss-site__hero-copy">
                            <span className="ss-site__eyebrow">
                                <ShieldCheck size={16} />
                                GESTÃO SST CONECTADA
                            </span>

                            <h1>
                                <span className="ss-site__hero-title-line ss-site__hero-title-line--base">
                                    Segurança do
                                </span>{" "}
                                <span className="ss-site__hero-title-line ss-site__hero-title-line--base">
                                    Trabalho organizada
                                </span>{" "}
                                <span className="ss-site__hero-title-line ss-site__hero-title-line--accent">
                                    da gestão ao campo.
                                </span>
                            </h1>

                            <p className="ss-site__hero-description">
                                Centralize empresas, colaboradores, documentos,
                                treinamentos, fiscalizações e evidências em uma
                                plataforma criada para dar rastreabilidade à
                                rotina de SST.
                            </p>

                            <div className="ss-site__hero-actions">
                                <a
                                    href="#recursos"
                                    className="ss-site__button ss-site__button--primary"
                                >
                                    Conhecer a plataforma
                                    <ArrowRight size={18} />
                                </a>

                                <a
                                    href="#contato" onClick={abrirContato}
                                    className="ss-site__button ss-site__button--secondary"
                                >
                                    Solicitar demonstração
                                </a>
                            </div>

                            <div className="ss-site__hero-proof">
                                <div>
                                    <CheckCircle2 size={18} />
                                    <span>
                                        Gestão multiempresa
                                    </span>
                                </div>

                                <div>
                                    <CheckCircle2 size={18} />
                                    <span>
                                        Consulta em campo
                                    </span>
                                </div>

                                <div>
                                    <CheckCircle2 size={18} />
                                    <span>
                                        Histórico e rastreabilidade
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="ss-site__hero-visual">
                            <div className="ss-site__product-window">
                                <div className="ss-site__product-topbar">
                                    <div className="ss-site__product-dots">
                                        <span />
                                        <span />
                                        <span />
                                    </div>

                                    <span>
                                        SafeScan Brasil
                                    </span>

                                    <div className="ss-site__product-status">
                                        <span />
                                        Ambiente SST
                                    </div>
                                </div>

                                <div className="ss-site__product-image-wrap">
                                    <img
                                        src={accessModalHero}
                                        alt="Profissional de segurança em ambiente operacional SafeScan"
                                        className="ss-site__product-image"
                                    />

                                    <div className="ss-site__product-image-overlay">
                                        <span>
                                            OPERAÇÃO SST
                                        </span>

                                        <strong>Informação centralizada para acompanhar a rotina.</strong>
                                    </div>
                                </div>

                                <div className="ss-site__product-bottom">
                                    <div>
                                        <UsersRound size={19} />
                                        <span>
                                            Pessoas
                                        </span>
                                    </div>

                                    <div>
                                        <FileCheck2 size={19} />
                                        <span>
                                            Documentos
                                        </span>
                                    </div>

                                    <div>
                                        <QrCode size={19} />
                                        <span>
                                            Campo e QR
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="ss-site__float-card ss-site__float-card--documentos">
                                <FileCheck2 size={20} />

                                <div>
                                    <strong>
                                        Documentação
                                    </strong>

                                    <span>
                                        Conferência e histórico
                                    </span>
                                </div>
                            </div>

                            <div className="ss-site__float-card ss-site__float-card--campo">
                                <QrCode size={20} />

                                <div>
                                    <strong>
                                        Consulta em campo
                                    </strong>

                                    <span>
                                        Informação acessível por QR
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="ss-site__section ss-site__section--problem">
                    <div className="ss-site__container">
                        <div className="ss-site__section-heading ss-site__section-heading--center">
                            <span className="ss-site__kicker">
                                ROTINA MAIS ORGANIZADA
                            </span>

                            <h2>
                                Menos informação espalhada.
                                <br />
                                Mais controle sobre a operação.
                            </h2>

                            <p>
                                O SafeScan organiza pontos que normalmente ficam
                                distribuídos entre arquivos, planilhas, mensagens
                                e processos manuais.
                            </p>
                        </div>

                        <div className="ss-site__problem-grid">
                            {problemas.map(
                                (
                                    problema,
                                    index
                                ) => (
                                    <article
                                        key={problema}
                                        className="ss-site__problem-item"
                                    >
                                        <span className="ss-site__problem-number">
                                            {String(
                                                index + 1
                                            ).padStart(
                                                2,
                                                "0"
                                            )}
                                        </span>

                                        <p>
                                            {problema}
                                        </p>
                                    </article>
                                )
                            )}
                        </div>

                        <div className="ss-site__problem-result">
                            <BadgeCheck size={23} />

                            <p>
                                O SafeScan reúne essas informações em um fluxo
                                único de gestão, acompanhamento e comprovação.
                            </p>
                        </div>
                    </div>
                </section>

                <section
                    id="recursos"
                    className="ss-site__section ss-site__section--resources"
                >
                    <div className="ss-site__container">
                        <div className="ss-site__section-heading">
                            <span className="ss-site__kicker">
                                ECOSSISTEMA SAFESCAN
                            </span>

                            <h2>
                                Uma plataforma para acompanhar o ciclo completo
                                de SST.
                            </h2>

                            <p>
                                Recursos organizados por contexto operacional,
                                sem transformar a rotina em uma coleção de telas
                                desconectadas.
                            </p>
                        </div>

                        <div className="ss-site__resource-layout">
                            {dominios.map(
                                (
                                    dominio
                                ) => {
                                    const Icone =
                                        dominio.Icone;

                                    return (
                                        <article
                                            key={dominio.titulo}
                                            className={`ss-site__resource-block ss-site__resource-block--${dominio.classe}`}
                                        >
                                            <div className="ss-site__resource-icon">
                                                <Icone size={24} />
                                            </div>

                                            <div className="ss-site__resource-content">
                                                <h3>
                                                    {dominio.titulo}
                                                </h3>

                                                <p>
                                                    {dominio.texto}
                                                </p>

                                                <div className="ss-site__resource-items">
                                                    {dominio.itens.map(
                                                        (
                                                            item
                                                        ) => (
                                                            <span key={item}>
                                                                <CheckCircle2 size={16} />
                                                                {item}
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        </article>
                                    );
                                }
                            )}
                        </div>
                    </div>
                </section>                <section
                    id="demonstracao-interativa"
                    className="ss-site__section ss-site__section--product"
                >
                    <div className="ss-site__container">
                        <div className="ss-site__section-heading ss-site__section-heading--center">
                            <span className="ss-site__kicker">
                                DEMONSTRAÇÃO INTERATIVA
                            </span>

                            <h2>
                                Veja recursos que conectam gestão,
                                pessoas e campo.
                            </h2>

                            <p>
                                Esta demonstração utiliza componentes reais do
                                SafeScan com dados fictícios, sem expor
                                informações de clientes.
                            </p>
                        </div>

                        <div
                            className="ss-site__demo-tabs"
                            role="tablist"
                            aria-label="Demonstrações do SafeScan"
                        >
                            <button
                                type="button"
                                role="tab"
                                aria-selected={demoAtivo === "mapa"}
                                className={
                                    demoAtivo === "mapa"
                                        ? "is-active"
                                        : ""
                                }
                                onClick={
                                    () =>
                                        setDemoAtivo(
                                            "mapa"
                                        )
                                }
                            >
                                <MapPinned size={18} />
                                Mapa de riscos
                            </button>

                            <button
                                type="button"
                                role="tab"
                                aria-selected={demoAtivo === "colaborador"}
                                className={
                                    demoAtivo === "colaborador"
                                        ? "is-active"
                                        : ""
                                }
                                onClick={
                                    () =>
                                        setDemoAtivo(
                                            "colaborador"
                                        )
                                }
                            >
                                <UsersRound size={18} />
                                Colaborador + QR
                            </button>

                            <button
                                type="button"
                                role="tab"
                                aria-selected={demoAtivo === "equipamento"}
                                className={
                                    demoAtivo === "equipamento"
                                        ? "is-active"
                                        : ""
                                }
                                onClick={
                                    () =>
                                        setDemoAtivo(
                                            "equipamento"
                                        )
                                }
                            >
                                <Box size={18} />
                                Equipamento + QR
                            </button>
                        </div>

                        <div className="ss-site__demo-stage">
                            <div className="ss-site__demo-copy">
                                {demoAtivo === "mapa" ? (
                                    <>
                                        <span className="ss-site__demo-tag">
                                            MAPA E GERENCIAMENTO DE RISCOS
                                        </span>

                                        <h3>
                                            Transforme a planta da operação em
                                            uma camada visual de segurança.
                                        </h3>

                                        <p>
                                            Áreas, riscos, equipamentos e
                                            recursos de segurança podem ser
                                            organizados diretamente sobre a
                                            planta para facilitar leitura,
                                            inspeção e acompanhamento.
                                        </p>

                                        <div className="ss-site__demo-benefits">
                                            <span>
                                                <CheckCircle2 size={17} />
                                                Áreas da operação identificadas
                                            </span>

                                            <span>
                                                <CheckCircle2 size={17} />
                                                Equipamentos visíveis no mapa
                                            </span>

                                            <span>
                                                <CheckCircle2 size={17} />
                                                Riscos e alertas destacados
                                            </span>

                                            <span>
                                                <CheckCircle2 size={17} />
                                                Consulta visual em campo
                                            </span>
                                        </div>
                                    </>
                                ) : null}

                                {demoAtivo === "colaborador" ? (
                                    <>
                                        <span className="ss-site__demo-tag">
                                            GESTÃO DE COLABORADORES
                                        </span>

                                        <h3>
                                            A situação do colaborador acompanha
                                            a rotina da obra.
                                        </h3>

                                        <p>
                                            Cadastro, vínculo, documentos,
                                            treinamentos e consulta por QR
                                            ajudam a manter a informação
                                            disponível quando ela é necessária.
                                        </p>

                                        <div className="ss-site__demo-benefits">
                                            <span>
                                                <CheckCircle2 size={17} />
                                                Cadastro e ciclo profissional
                                            </span>

                                            <span>
                                                <CheckCircle2 size={17} />
                                                Documentação e treinamentos
                                            </span>

                                            <span>
                                                <CheckCircle2 size={17} />
                                                Situação operacional
                                            </span>

                                            <span>
                                                <CheckCircle2 size={17} />
                                                QR individual
                                            </span>
                                        </div>
                                    </>
                                ) : null}

                                {demoAtivo === "equipamento" ? (
                                    <>
                                        <span className="ss-site__demo-tag">
                                            EQUIPAMENTOS E ITENS DE CAMPO
                                        </span>

                                        <h3>
                                            Identifique o item e encontre seu
                                            contexto sem procurar planilhas.
                                        </h3>

                                        <p>
                                            Equipamentos e itens de campo podem
                                            ser identificados individualmente,
                                            vinculados às áreas da operação e
                                            consultados por QR.
                                        </p>

                                        <div className="ss-site__demo-benefits">
                                            <span>
                                                <CheckCircle2 size={17} />
                                                Identificação individual
                                            </span>

                                            <span>
                                                <CheckCircle2 size={17} />
                                                QR por item
                                            </span>

                                            <span>
                                                <CheckCircle2 size={17} />
                                                Localização no mapa
                                            </span>

                                            <span>
                                                <CheckCircle2 size={17} />
                                                Situação e verificação
                                            </span>
                                        </div>
                                    </>
                                ) : null}

                                <small className="ss-site__demo-disclaimer">
                                    Dados exclusivamente demonstrativos.
                                </small>
                            </div>

                            <div className="ss-site__demo-visual">
                                {demoAtivo === "mapa" ? (
                                    <div className="ss-site__map-demo">
                                        <div
                                            className="ss-site__map-demo-top ss-site__map-demo-top--hero"
                                            style={{
                                                backgroundImage: `
                                                    linear-gradient(
                                                        90deg,
                                                        rgba(6, 18, 37, 0.96) 0%,
                                                        rgba(8, 30, 29, 0.88) 48%,
                                                        rgba(8, 35, 31, 0.62) 100%
                                                    ),
                                                    url(${accessModalHero})
                                                `,
                                            }}
                                        >
                                            <div>
                                                <span>
                                                    Planta demonstrativa
                                                </span>

                                                <strong>
                                                    Operação SafeScan
                                                </strong>
                                            </div>

                                            <span className="ss-site__demo-live">
                                                INTERATIVO
                                            </span>
                                        </div>

                                        <div className="ss-site__map-legend">
                                            <span className="ss-site__map-legend-item ss-site__map-legend-item--area">     <b>A</b>     Área </span>

                                            <span className="ss-site__map-legend-item ss-site__map-legend-item--equipment">     <b>EQ</b>     Equipamento </span>

                                            <span className="ss-site__map-legend-item ss-site__map-legend-item--risk">     <b>RI</b>     Risco </span>

                                            <span className="ss-site__map-legend-item ss-site__map-legend-item--safety">     <b>EX</b>     Segurança </span>

                                            <span className="ss-site__map-legend-item ss-site__map-legend-item--alert">     <b>!</b>     Alerta </span>
                                        </div>

                                        <Suspense
                                            fallback={
                                                <div className="ss-site__demo-loading">
                                                    Preparando mapa...
                                                </div>
                                            }
                                        >
                                            <PlantaInterativaDemo
                                                imagemUrl={plantaGeralDemoRaster}
                                                pontos={pontosMapaDemo}
                                                pontoSelecionado="area-operacional"
                                                className="ss-site__map-interactive"
                                                onAbrirPlantaDetalhada={
                                                    (
                                                        detalhe
                                                    ) =>
                                                        setPlantaDetalhadaAberta(
                                                            detalhe
                                                        )
                                                }
                                            />
                                        </Suspense>

                                        <p className="ss-site__map-instruction">
                                            Clique nas áreas, use o zoom e
                                            selecione os itens para abrir os
                                            detalhes.
                                        </p>
                                        {plantaDetalhadaAberta ? (
                                            <div
                                                className="ss-site__detail-map-layer"
                                                onMouseDown={
                                                    (
                                                        event
                                                    ) => {
                                                        if (
                                                            event.target ===
                                                            event.currentTarget
                                                        ) {
                                                            setPlantaDetalhadaAberta(
                                                                null
                                                            );
                                                        }
                                                    }
                                                }
                                            >
                                                <section
                                                    className="ss-site__detail-map-dialog"
                                                    role="dialog"
                                                    aria-modal="true"
                                                    aria-labelledby="ss-site-detail-map-title"
                                                >
                                                    <header className="ss-site__detail-map-header">
                                                        <div>
                                                            <span>
                                                                <MapPinned size={18} />
                                                                CONSULTA DO PONTO
                                                            </span>

                                                            <h3 id="ss-site-detail-map-title">
                                                                Área operacional demonstrativa
                                                            </h3>

                                                            <p>
                                                                Planta detalhada e itens vinculados
                                                            </p>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={
                                                                () =>
                                                                    setPlantaDetalhadaAberta(
                                                                        null
                                                                    )
                                                            }
                                                            aria-label="Fechar planta detalhada"
                                                        >
                                                            <X size={22} />
                                                        </button>
                                                    </header>

                                                    <div className="ss-site__detail-map-layout">
                                                        <div className="ss-site__detail-map-main">
                                                            <div className="ss-site__detail-map-picture">
                                                                <img
                                                                    src={plantaAreaOperacionalDetalhadaRaster}
                                                                    alt="Planta detalhada demonstrativa"
                                                                />

                                                                {[
                                                                    ["01", "22%", "27%"],
                                                                    ["02", "46%", "19%"],
                                                                    ["03", "57%", "42%"],
                                                                    ["04", "70%", "72%"],
                                                                ].map(
                                                                    (
                                                                        ponto
                                                                    ) => (
                                                                        <span
                                                                            key={ponto[0]}
                                                                            className="ss-site__detail-marker"
                                                                            style={{
                                                                                left:
                                                                                    ponto[1],
                                                                                top:
                                                                                    ponto[2],
                                                                            }}
                                                                        >
                                                                            {ponto[0]}
                                                                        </span>
                                                                    )
                                                                )}
                                                            </div>

                                                            <div className="ss-site__detail-map-legend">
                                                                <strong>
                                                                    Legenda
                                                                </strong>

                                                                <span>
                                                                    <i />
                                                                    Item posicionado
                                                                </span>

                                                                <span>
                                                                    <ShieldCheck size={15} />
                                                                    Demonstração
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <aside className="ss-site__detail-map-sidebar">
                                                            <div className="ss-site__detail-summary">
                                                                <span>
                                                                    RESUMO DO LOCAL
                                                                </span>

                                                                <div>
                                                                    <small>
                                                                        Tipo
                                                                    </small>

                                                                    <strong>
                                                                        Área operacional
                                                                    </strong>
                                                                </div>

                                                                <div>
                                                                    <small>
                                                                        Pontos vinculados
                                                                    </small>

                                                                    <strong>
                                                                        4
                                                                    </strong>
                                                                </div>
                                                            </div>

                                                            <div className="ss-site__detail-equipment">
                                                                <span>
                                                                    ITENS DEMONSTRATIVOS
                                                                </span>

                                                                {[
                                                                    [
                                                                        "01",
                                                                        "Item demonstrativo 01",
                                                                    ],
                                                                    [
                                                                        "02",
                                                                        "Item demonstrativo 02",
                                                                    ],
                                                                    [
                                                                        "03",
                                                                        "Item demonstrativo 03",
                                                                    ],
                                                                    [
                                                                        "04",
                                                                        "Item demonstrativo 04",
                                                                    ],
                                                                ].map(
                                                                    (
                                                                        item
                                                                    ) => (
                                                                        <div
                                                                            key={item[0]}
                                                                        >
                                                                            <strong>
                                                                                {item[0]}
                                                                            </strong>

                                                                            <span>
                                                                                {item[1]}
                                                                            </span>

                                                                            <em>
                                                                                NA PLANTA
                                                                            </em>
                                                                        </div>
                                                                    )
                                                                )}
                                                            </div>
                                                                                                                    <div className="ss-site__detail-note">
                                                                <strong>EXEMPLOS DE USO</strong>

                                                                <p>
                                                                    Os pontos desta demonstração representam itens posicionáveis na planta. No uso real, podem indicar extintores, ferramentas, máquinas, riscos, avisos de obra, buracos, áreas isoladas ou outras condições de campo.
                                                                </p>
                                                            </div>

</aside>
                                                    </div>

                                                    <footer className="ss-site__detail-map-footer">
                                                        <MapPinned size={16} />

                                                        <span>
                                                            Mapa geral → Área →
                                                            Planta detalhada.
                                                        </span>
                                                    </footer>
                                                </section>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}

                                {demoAtivo === "colaborador" ? (
                                    <article className="ss-site__qr-showcase">
                                        <div
                                            className="ss-site__qr-showcase-head ss-site__qr-showcase-head--hero"
                                            style={{
                                                backgroundImage: `
                                                    linear-gradient(
                                                        90deg,
                                                        rgba(6, 18, 37, 0.96) 0%,
                                                        rgba(8, 30, 29, 0.88) 48%,
                                                        rgba(8, 35, 31, 0.62) 100%
                                                    ),
                                                    url(${accessModalHero})
                                                `,
                                            }}
                                        >
                                            <span className="ss-site__qr-showcase-icon">
                                                <UsersRound size={24} />
                                            </span>

                                            <div>
                                                <small>
                                                    COLABORADOR DEMONSTRATIVO
                                                </small>

                                                <strong>
                                                    Marcos Silva
                                                </strong>

                                                <span>
                                                    Eletricista • Liberado
                                                </span>
                                            </div>
                                        </div>

                                        <div className="ss-site__qr-showcase-body">
                                            <div className="ss-site__qr-code-box">
                                                <QRCodeSVG
                                                    value={criarUrlQrDemo("colaborador")}
                                                    size={184}
                                                    level="H"
                                                    bgColor="#ffffff"
                                                    fgColor="#0f172a"
                                                />

                                                <span>
                                                    QR demonstrativo
                                                </span>
                                            </div>

                                            <div className="ss-site__qr-data-grid">
                                                <div>
                                                    <span>
                                                        Situação
                                                    </span>

                                                    <strong className="is-ok">
                                                        Liberado
                                                    </strong>
                                                </div>

                                                <div>
                                                    <span>
                                                        Vínculo
                                                    </span>

                                                    <strong>
                                                        Ativo
                                                    </strong>
                                                </div>

                                                <div>
                                                    <span>
                                                        Documentos
                                                    </span>

                                                    <strong>
                                                        Conferidos
                                                    </strong>
                                                </div>

                                                <div>
                                                    <span>
                                                        Treinamentos
                                                    </span>

                                                    <strong>
                                                        Em dia
                                                    </strong>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="ss-site__qr-proof-grid">
                                            <div>
                                                <span>
                                                    Consulta
                                                </span>

                                                <strong>
                                                    Informações permitidas
                                                </strong>
                                            </div>

                                            <div>
                                                <span>
                                                    Rastreabilidade
                                                </span>

                                                <strong>
                                                    Contexto identificado
                                                </strong>
                                            </div>

                                            <div>
                                                <span>
                                                    Campo
                                                </span>

                                                <strong>
                                                    Apoio à conferência
                                                </strong>
                                            </div>
                                        </div>

                                        <div className="ss-site__qr-showcase-foot">
                                            <QrCode size={17} />

                                            <span>
                                                Exemplo visual de consulta
                                                individual em campo.
                                            </span>
                                        </div>
                                    </article>
                                ) : null}

                                {demoAtivo === "equipamento" ? (
                                    <article className="ss-site__qr-showcase">
                                        <div
                                            className="ss-site__qr-showcase-head ss-site__qr-showcase-head--hero"
                                            style={{
                                                backgroundImage: `
                                                    linear-gradient(
                                                        90deg,
                                                        rgba(6, 18, 37, 0.96) 0%,
                                                        rgba(8, 30, 29, 0.88) 48%,
                                                        rgba(8, 35, 31, 0.62) 100%
                                                    ),
                                                    url(${accessModalHero})
                                                `,
                                            }}
                                        >
                                            <span className="ss-site__qr-showcase-icon ss-site__qr-showcase-icon--equipment">
                                                <Box size={24} />
                                            </span>

                                            <div>
                                                <small>
                                                    EQUIPAMENTO DEMONSTRATIVO
                                                </small>

                                                <strong>
                                                    Furadeira de impacto
                                                </strong>

                                                <span>
                                                    Identificação EQ-014
                                                </span>
                                            </div>
                                        </div>

                                        <div className="ss-site__qr-showcase-body">
                                            <div className="ss-site__qr-code-box">
                                                <QRCodeSVG
                                                    value={criarUrlQrDemo("equipamento")}
                                                    size={184}
                                                    level="H"
                                                    bgColor="#ffffff"
                                                    fgColor="#0f172a"
                                                />

                                                <span>
                                                    QR demonstrativo
                                                </span>
                                            </div>

                                            <div className="ss-site__qr-data-grid">
                                                <div>
                                                    <span>
                                                        Situação
                                                    </span>

                                                    <strong className="is-ok">
                                                        Liberado
                                                    </strong>
                                                </div>

                                                <div>
                                                    <span>
                                                        Código
                                                    </span>

                                                    <strong>
                                                        EQ-014
                                                    </strong>
                                                </div>

                                                <div>
                                                    <span>
                                                        Local
                                                    </span>

                                                    <strong>
                                                        Área operacional
                                                    </strong>
                                                </div>

                                                <div>
                                                    <span>
                                                        Verificação
                                                    </span>

                                                    <strong>
                                                        15/09/2026
                                                    </strong>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="ss-site__qr-proof-grid">
                                            <div>
                                                <span>
                                                    Consulta
                                                </span>

                                                <strong>
                                                    Informações permitidas
                                                </strong>
                                            </div>

                                            <div>
                                                <span>
                                                    Rastreabilidade
                                                </span>

                                                <strong>
                                                    Contexto identificado
                                                </strong>
                                            </div>

                                            <div>
                                                <span>
                                                    Campo
                                                </span>

                                                <strong>
                                                    Apoio à conferência
                                                </strong>
                                            </div>
                                        </div>

                                        <div className="ss-site__qr-showcase-foot">
                                            <MapPinned size={17} />

                                            <span>
                                                O mesmo item também pode ser
                                                localizado na planta.
                                            </span>
                                        </div>
                                    </article>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </section>
<section
                    id="como-funciona"
                    className="ss-site__section ss-site__section--flow"
                >
                    <div className="ss-site__container">
                        <div className="ss-site__section-heading ss-site__section-heading--center">
                            <span className="ss-site__kicker">
                                FLUXO OPERACIONAL
                            </span>

                            <h2>
                                Da entrada da informação à comprovação em campo.
                            </h2>
                        </div>

                        <div className="ss-site__flow">
                            {fluxo.map(
                                (
                                    etapa,
                                    index
                                ) => (
                                    <article
                                        key={etapa.numero}
                                        className="ss-site__flow-step"
                                    >
                                        <div className="ss-site__flow-number">
                                            {etapa.numero}
                                        </div>

                                        <h3>
                                            {etapa.titulo}
                                        </h3>

                                        <p>
                                            {etapa.texto}
                                        </p>

                                        {index <
                                        fluxo.length -
                                            1 ? (
                                            <ArrowRight
                                                className="ss-site__flow-arrow"
                                                size={19}
                                            />
                                        ) : null}
                                    </article>
                                )
                            )}
                        </div>
                    </div>
                </section>                <section
                    id="campo-qr"
                    className="ss-site__section ss-site__section--field"
                >
                    <div className="ss-site__container ss-site__field-grid">
                        <div className="ss-site__field-visual">
                            <div className="ss-site__field-qr-grid">
                                <article className="ss-site__field-qr-card">
                                    <span className="ss-site__field-qr-type">
                                        <UsersRound size={16} />
                                        COLABORADOR
                                    </span>

                                    <div className="ss-site__field-qr-code">
                                        <QRCodeSVG
                                            value={criarUrlQrDemo("colaborador")}
                                            size={128}
                                            level="H"
                                            bgColor="#ffffff"
                                            fgColor="#0f172a"
                                        />
                                    </div>

                                    <strong>
                                        Pessoa identificada
                                    </strong>

                                    <small>
                                        Cadastro, situação, documentos e
                                        treinamentos.
                                    </small>
                                </article>

                                <article className="ss-site__field-qr-card ss-site__field-qr-card--equipment">
                                    <span className="ss-site__field-qr-type">
                                        <Box size={16} />
                                        EQUIPAMENTO
                                    </span>

                                    <div className="ss-site__field-qr-code">
                                        <QRCodeSVG
                                            value={criarUrlQrDemo("equipamento")}
                                            size={128}
                                            level="H"
                                            bgColor="#ffffff"
                                            fgColor="#0f172a"
                                        />
                                    </div>

                                    <strong>
                                        Item identificado
                                    </strong>

                                    <small>
                                        Código, área, situação e contexto de
                                        campo.
                                    </small>
                                </article>

                                <article className="ss-site__field-qr-card ss-site__field-qr-card--field">
                                    <span className="ss-site__field-qr-type">
                                        <MapPinned size={16} />
                                        PONTO DE CAMPO
                                    </span>

                                    <div className="ss-site__field-qr-code">
                                        <QRCodeSVG
                                            value={criarUrlQrDemo("campo")}
                                            size={128}
                                            level="H"
                                            bgColor="#ffffff"
                                            fgColor="#0f172a"
                                        />
                                    </div>

                                    <strong>
                                        Ponto identificado
                                    </strong>

                                    <small>
                                        Área, condição, aviso e contexto de
                                        campo.
                                    </small>
                                </article>
                            </div>

                            <div className="ss-site__field-tag">
                                <QrCode size={20} />
                                Pessoas + equipamentos + campo
                            </div>
                        </div>

                        <div className="ss-site__field-copy">
                            <span className="ss-site__kicker">
                                CAMPO E QR
                            </span>

                            <h2>
                                Do colaborador ao equipamento:
                                informação identificada no ponto de uso.
                            </h2>

                            <p>
                                O SafeScan conecta cadastro, contexto
                                operacional e consulta em campo. O QR passa a
                                fazer parte da rastreabilidade da operação,
                                tanto para pessoas quanto para itens.
                            </p>

                            <div className="ss-site__field-points">
                                <div>
                                    <CheckCircle2 size={18} />
                                    Consulta rápida de informações permitidas
                                </div>

                                <div>
                                    <CheckCircle2 size={18} />
                                    Pessoas e itens identificados
                                    individualmente
                                </div>

                                <div>
                                    <CheckCircle2 size={18} />
                                    Integração com mapa e rotina de SST
                                </div>

                                <div>
                                    <CheckCircle2 size={18} />
                                    Evidências conectadas ao contexto da
                                    operação
                                </div>
                            </div>

                            <small className="ss-site__field-demo-note">
                                Os QR Codes desta apresentação contêm somente
                                identificadores demonstrativos.
                            </small>
                        </div>
                    </div>
                </section>
<div id="seguranca" className="ss-site__security-demo-group">
<section

                    className="ss-site__section ss-site__section--security"
                >
                    <div className="ss-site__container ss-site__security-grid">
                        <div>
                            <span className="ss-site__kicker ss-site__kicker--light">
                                MULTIEMPRESA
                            </span>

                            <h2>
                                Um ambiente próprio para cada operação.
                            </h2>

                            <p>
                                Cada cliente pode operar em seu próprio endereço
                                SafeScan, com identidade da contratante e acesso
                                vinculado ao ambiente correto.
                            </p>

                            <div className="ss-site__domain-example">
                                <Building2 size={20} />

                                <span>
                                    empresa.safescanbrasil.com.br
                                </span>
                            </div>
                        </div>

                        <div className="ss-site__security-panel">
                            <div>
                                <ShieldCheck size={25} />

                                <span>
                                    <strong>
                                        Ambiente identificado
                                    </strong>

                                    <small>
                                        Cada operação acessa seu contexto correto.
                                    </small>
                                </span>
                            </div>

                            <div>
                                <History size={25} />

                                <span>
                                    <strong>
                                        Rastreabilidade
                                    </strong>

                                    <small>
                                        Histórico para apoiar conferências e
                                        auditorias.
                                    </small>
                                </span>
                            </div>

                            <div>
                                <BadgeCheck size={25} />

                                <span>
                                    <strong>
                                        Gestão estruturada
                                    </strong>

                                    <small>
                                        Pessoas, empresas e evidências dentro da
                                        mesma plataforma.
                                    </small>
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                <section
                    id="demonstracao"
                    className="ss-site__section ss-site__section--cta"
                >
                    <div className="ss-site__container">
                        <div className="ss-site__cta-card">
                            <div>
                                <span className="ss-site__kicker ss-site__kicker--light">
                                    DEMONSTRAÇÃO
                                </span>

                                <h2>
                                    Veja como o SafeScan pode organizar sua
                                    operação de SST.
                                </h2>

                                <p>
                                    Conheça os recursos da plataforma aplicados
                                    à gestão documental, pessoas, fiscalização e
                                    rotina de campo.
                                </p>
                            </div>

                            <div className="ss-site__cta-actions">
                                <a
                                    href="#contato" onClick={abrirContato}
                                    className="ss-site__button ss-site__button--light"
                                >
                                    Solicitar demonstração
                                    <ArrowRight size={18} />
                                </a>

                                <button
                                    type="button"
                                    onClick={abrirAcesso}
                                    className="ss-site__button ss-site__button--dark-outline"
                                >
                                    Já sou cliente — Acessar plataforma
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
                </div>
            </main>

                        <section
                id="solucoes-personalizadas"
                className="ss-site__custom-solutions"
                aria-label="Soluções personalizadas SafeScan"
            >
                <div className="ss-site__container">
                    <div className="ss-site__custom-solutions-card">
                        <img
                            src={customSolutionsBanner}
                            alt="Sua operação é única. Nossa solução também. Soluções SafeScan personalizadas para necessidades, integrações e fluxos específicos."
                            width="2149"
                            height="732"
                            loading="lazy"
                            decoding="async"
                            className="ss-site__custom-solutions-image ss-site__custom-solutions-image--desktop"
                        />

                        <a
                            href="#contato"
                            onClick={abrirContato}
                            className="ss-site__custom-solutions-hit ss-site__custom-solutions-hit--primary"
                            aria-label="Converse com a nossa equipe"
                        />

                        <a
                            href="#contato"
                            onClick={abrirContato}
                            className="ss-site__custom-solutions-hit ss-site__custom-solutions-hit--secondary"
                            aria-label="Agendar uma conversa com a SafeScan"
                        />

                        <div className="ss-site__custom-solutions-mobile">


                            <div className="ss-site__custom-solutions-mobile-content">
                                <span className="ss-site__custom-solutions-mobile-kicker">
                                    SOLUÇÕES PERSONALIZADAS
                                </span>

                                <h2>
                                    Sua operação é única.
                                    <strong>
                                        Nossa solução também.
                                    </strong>
                                </h2>

                                <p>
                                    Se sua empresa tem uma necessidade especial,
                                    um fluxo diferente ou algo que o SafeScan ainda
                                    não contempla, podemos desenvolver juntos a
                                    solução ideal para sua realidade.
                                </p>

                                <div className="ss-site__custom-solutions-mobile-grid">
                                    <span>
                                        <strong>Diagnóstico</strong>
                                        Entendemos sua necessidade
                                    </span>

                                    <span>
                                        <strong>Desenvolvimento</strong>
                                        Soluções sob medida
                                    </span>

                                    <span>
                                        <strong>Integração</strong>
                                        Conectada aos seus sistemas
                                    </span>

                                    <span>
                                        <strong>Evolução</strong>
                                        Cresce com sua operação
                                    </span>
                                </div>

                                <div className="ss-site__custom-solutions-mobile-actions">
                                    <a
                                        href="#contato"
                                        onClick={abrirContato}
                                        className="ss-site__custom-solutions-mobile-button ss-site__custom-solutions-mobile-button--primary"
                                    >
                                        Converse com a nossa equipe
                                    </a>

                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
<section
                id="contato"
                className="ss-site__contact-section"
            >
                <div className="ss-site__container">
                    <div className="ss-site__contact-frame">
                        <div className="ss-site__contact-copy">
                            <span className="ss-site__contact-kicker">
                                <span aria-hidden="true" />
                                FALE CONOSCO
                            </span>

                            <h2>
                                Centralize sua gestão de SST.
                                <strong>
                                    Fale com a SafeScan.
                                </strong>
                            </h2>

                            <p className="ss-site__contact-description">
                                Digitalize sua gestão documental, conecte seus
                                colaboradores em campo, utilize QR Code e tenha
                                rastreabilidade completa das informações de SST,
                                da administração ao campo.
                            </p>

                            <div className="ss-site__contact-points">
                                <div className="ss-site__contact-point">
                                    <span>
                                        <HardHat size={22} />
                                    </span>

                                    <div>
                                        <strong>
                                            Atendimento comercial
                                        </strong>

                                        <small>
                                            Tire suas dúvidas e receba uma proposta
                                        </small>
                                    </div>
                                </div>

                                <div className="ss-site__contact-point">
                                    <span>
                                        <MapPinned size={22} />
                                    </span>

                                    <div>
                                        <strong>
                                            Implantação e suporte em todo o Brasil
                                        </strong>

                                        <small>
                                            Do planejamento ao pós-implantação
                                        </small>
                                    </div>
                                </div>

                                <div className="ss-site__contact-point">
                                    <span>
                                        <Building2 size={22} />
                                    </span>

                                    <div>
                                        <strong>
                                            www.safescanbrasil.com.br
                                        </strong>

                                        <small>
                                            Conheça mais sobre a SafeScan
                                        </small>
                                    </div>
                                </div>
                            </div>

                            <div className="ss-site__contact-signature">
                                <span aria-hidden="true" />
                                SST MAIS SIMPLES. MAIS CONECTADA. MAIS SEGURA.
                            </div>
                        </div>

                        <div className="ss-site__contact-form-card">
                            <div className="ss-site__contact-form-head">
                                <h3>
                                    Solicite uma demonstração
                                </h3>

                                <p>
                                    Preencha os dados abaixo e nossa equipe
                                    entrará em contato.
                                </p>
                            </div>

                            <form
                                className="ss-site__contact-form"
                                onSubmit={
                                    (
                                        event
                                    ) => {
                                        event.preventDefault();

                                        window.alert(
                                            "Formulário comercial em homologação DEV. " +
                                            "O canal de envio será conectado antes da publicação."
                                        );
                                    }
                                }
                            >
                                <div className="ss-site__contact-form-row">
                                    <input
                                        type="text"
                                        name="primeiroNome"
                                        placeholder="Primeiro nome"
                                        aria-label="Primeiro nome"
                                        autoComplete="given-name"
                                        required
                                    />

                                    <input
                                        type="text"
                                        name="sobrenome"
                                        placeholder="Sobrenome"
                                        aria-label="Sobrenome"
                                        autoComplete="family-name"
                                        required
                                    />
                                </div>

                                <input
                                    type="tel"
                                    name="whatsapp"
                                    placeholder="WhatsApp"
                                    aria-label="WhatsApp"
                                    autoComplete="tel"
                                    required
                                />

                                <div className="ss-site__contact-form-row">
                                    <input
                                        type="text"
                                        name="empresa"
                                        placeholder="Empresa"
                                        aria-label="Empresa"
                                        autoComplete="organization"
                                        required
                                    />

                                    <input
                                        type="text"
                                        name="cargo"
                                        placeholder="Cargo"
                                        aria-label="Cargo"
                                        autoComplete="organization-title"
                                        required
                                    />
                                </div>

                                <input
                                    type="email"
                                    name="email"
                                    placeholder="E-mail corporativo"
                                    aria-label="E-mail corporativo"
                                    autoComplete="email"
                                    required
                                />

                                <select
                                    name="solucao"
                                    aria-label="Solução de interesse"
                                    defaultValue=""
                                    required
                                >
                                    <option
                                        value=""
                                        disabled
                                    >
                                        Solução de interesse
                                    </option>

                                    <option value="gestao-sst">
                                        Gestão de SST
                                    </option>

                                    <option value="gestao-documental">
                                        Gestão documental
                                    </option>

                                    <option value="colaboradores-qr">
                                        Colaboradores + QR
                                    </option>

                                    <option value="mapa-campo">
                                        Mapa, riscos e campo
                                    </option>

                                    <option value="multiempresa">
                                        Gestão multiempresa
                                    </option>

                                    <option value="implantacao-completa">
                                        Implantação completa
                                    </option>
                                </select>

                                <select
                                    name="origem"
                                    aria-label="Como conheceu a SafeScan"
                                    defaultValue=""
                                    required
                                >
                                    <option
                                        value=""
                                        disabled
                                    >
                                        Como conheceu a SafeScan
                                    </option>

                                    <option value="google">
                                        Google
                                    </option>

                                    <option value="indicacao">
                                        Indicação
                                    </option>

                                    <option value="redes-sociais">
                                        Redes sociais
                                    </option>

                                    <option value="evento">
                                        Evento ou apresentação
                                    </option>

                                    <option value="cliente-parceiro">
                                        Cliente ou parceiro
                                    </option>

                                    <option value="outro">
                                        Outro
                                    </option>
                                </select>

                                <button
                                    type="submit"
                                    className="ss-site__contact-submit"
                                >
                                    Solicitar demonstração
                                    <ArrowRight size={19} />
                                </button>

                                <div className="ss-site__contact-form-note">
                                    <ShieldCheck size={15} />

                                    <span>
                                        Dados solicitados apenas para contato comercial.
                                    </span>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </section>
            <footer className="ss-site__footer">
                <div className="ss-site__container ss-site__footer-inner">
                    <div className="ss-site__footer-brand">
                        <img
                            src="/brand/safescan-brasil-login.png"
                            alt=""
                        />

                        <div>
                            <strong>
                                SafeScan Brasil
                            </strong>

                            <span>
                                Gestão de Segurança do Trabalho conectada da
                                administração ao campo.
                            </span>
                        </div>
                    </div>

                    <div className="ss-site__footer-links">
                        <a href="#recursos">
                            Recursos
                        </a>

                        <a href="#como-funciona">
                            Como funciona
                        </a>

                        <a href="#seguranca">
                            Segurança
                        </a>

                        <button
                            type="button"
                            onClick={abrirAcesso}
                            className="ss-site__footer-access"
                        >
                            Acessar plataforma
                        </button>
                    </div>

                    <div className="ss-site__footer-bottom">
                        <span>
                            © {ano} SafeScan Brasil
                        </span>

                        <span>
                            Site institucional em homologação DEV
                        </span>
                    </div>
                </div>
            </footer>

            {acessoAberto ? (
                <div
                    className="ss-site__access-layer"
                    onMouseDown={
                        (
                            event
                        ) => {
                            if (
                                event.target ===
                                event.currentTarget
                            ) {
                                fecharAcesso();
                            }
                        }
                    }
                >
                    <div
                        className="ss-site__access-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="ss-site-access-title"
                    >
                        <button
                            type="button"
                            className="ss-site__access-close"
                            onClick={fecharAcesso}
                            aria-label="Fechar acesso"
                        >
                            <X size={20} />
                        </button>

                        <div
                            className="ss-site__access-hero"
                            style={{
                                backgroundImage: `
                                    linear-gradient(
                                        90deg,
                                        rgba(6, 18, 37, 0.96) 0%,
                                        rgba(8, 18, 35, 0.91) 38%,
                                        rgba(9, 24, 39, 0.72) 68%,
                                        rgba(10, 29, 46, 0.52) 100%
                                    ),
                                    url(${accessModalHero})
                                `,
                            }}
                        >
                            <span className="ss-site__kicker">
                                ACESSO DE CLIENTES
                            </span>
                        </div>

                        <div className="ss-site__access-intro">
                            <h2 id="ss-site-access-title">
                                Acesse o ambiente da sua empresa
                            </h2>

                            <p className="ss-site__access-description">
                                <span>
                                    Cada operação utiliza seu próprio endereço SafeScan.
                                </span>

                                <span>
                                    Informe somente o nome do ambiente recebido pela sua empresa.
                                </span>
                            </p>
                        </div>

                        <form
                            className="ss-site__access-form"
                            onSubmit={acessarAmbiente}
                        >
                            <label htmlFor="ss-site-access-environment">
                                Empresa / ambiente
                            </label>

                            <div className="ss-site__access-input-wrap">
                                <span>
                                    https://
                                </span>

                                <input
                                    id="ss-site-access-environment"
                                    type="text"
                                    value={ambiente}
                                    onChange={
                                        (
                                            event
                                        ) => {
                                            setAmbiente(
                                                event.target.value
                                            );

                                            setErroAcesso(
                                                ""
                                            );
                                        }
                                    }
                                    placeholder="empresa"
                                    autoComplete="organization"
                                />

                                <span>
                                    .safescanbrasil.com.br
                                </span>
                            </div>

                            {erroAcesso ? (
                                <p className="ss-site__access-error">
                                    {erroAcesso}
                                </p>
                            ) : null}

                            <button
                                type="submit"
                                className="ss-site__button ss-site__button--primary ss-site__access-submit"
                            >
                                Acessar meu ambiente
                                <ArrowRight size={18} />
                            </button>
                        </form>

                        <div className="ss-site__access-example">
                            <ShieldCheck size={17} />

                            <span>
                                Exemplo:
                                <strong>
                                    {" "}
                                    empresa.safescanbrasil.com.br
                                </strong>
                            </span>
                        </div>


                    </div>
                </div>
            ) : null}
        </div>
    );
}