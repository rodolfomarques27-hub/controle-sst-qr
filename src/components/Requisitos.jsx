import React, { useMemo, useState } from "react";
import {
    AlertTriangle,
    ArrowRight,
    BarChart3,
    BookOpen,
    Building2,
    CheckCircle2,
    ClipboardCheck,
    Copy,
    FileText,
    GraduationCap,
    HelpCircle,
    LifeBuoy,
    ListChecks,
    QrCode,
    Search,
    Settings,
    ShieldCheck,
    UserRound,
} from "lucide-react";
import { Card, Header } from "./commonComponents";

const ASSUNTOS_AJUDA = [
    {
        id: "inicio",
        titulo: "Começar do zero",
        subtitulo: "Entenda a ordem certa para usar o sistema pela primeira vez.",
        etiqueta: "Primeiro acesso",
        icone: BookOpen,
        cor: "bg-slate-950 text-white",
        paraQueServe: "Ajuda você a seguir uma ordem simples para cadastrar as informações sem se perder.",
        quandoUsar: "Use quando estiver começando uma nova obra, uma nova empresa ou organizando o sistema pela primeira vez.",
        passos: [
            "Cadastre a empresa primeiro.",
            "Depois cadastre os colaboradores dessa empresa.",
            "Envie os documentos da empresa, como PGR, PCMSO e LTCAT.",
            "Envie os certificados de treinamento dos colaboradores.",
            "Confira as pendências no Dashboard SST.",
            "Gere os QR Codes quando os cadastros estiverem corretos.",
        ],
        conferir: [
            "Empresa apareceu na lista.",
            "Colaboradores estão vinculados à empresa correta.",
            "Documentos e treinamentos aparecem nos relatórios.",
            "Dashboard mostra os números atualizados.",
        ],
        erros: [
            "Cadastrar colaborador antes de cadastrar a empresa.",
            "Enviar certificado para o colaborador errado.",
            "Não conferir se o documento ficou com status correto.",
        ],
    },
    {
        id: "empresa",
        titulo: "Cadastrar empresa",
        subtitulo: "Passo a passo para colocar uma empresa no sistema.",
        etiqueta: "Empresas",
        icone: Building2,
        cor: "bg-blue-50 text-blue-700",
        paraQueServe: "Serve para registrar uma empresa que terá documentos, colaboradores, treinamentos e auditorias acompanhados no sistema.",
        quandoUsar: "Use sempre que uma nova empresa entrar na obra, contrato ou operação.",
        passos: [
            "Clique na aba Empresas.",
            "Clique em Novo cadastro ou botão equivalente.",
            "Preencha nome da empresa, CNPJ e demais informações disponíveis.",
            "Salve o cadastro.",
            "Confira se a empresa apareceu na lista.",
        ],
        conferir: [
            "Nome da empresa está correto.",
            "CNPJ foi digitado corretamente.",
            "A empresa aparece nos filtros das outras abas.",
        ],
        erros: [
            "Cadastrar a mesma empresa duas vezes com nomes diferentes.",
            "Digitar CNPJ errado.",
            "Esquecer de salvar antes de sair da tela.",
        ],
    },
    {
        id: "colaborador",
        titulo: "Cadastrar colaborador",
        subtitulo: "Como registrar trabalhadores e vincular à empresa certa.",
        etiqueta: "Colaboradores",
        icone: UserRound,
        cor: "bg-emerald-50 text-emerald-700",
        paraQueServe: "Serve para controlar os trabalhadores, suas funções, fotos, documentos e treinamentos.",
        quandoUsar: "Use quando um novo trabalhador entrar na obra ou quando precisar corrigir dados de um colaborador já cadastrado.",
        passos: [
            "Clique na aba Colaboradores.",
            "Clique em Novo colaborador.",
            "Preencha nome, CPF, função, matrícula e empresa.",
            "Envie a foto, se tiver.",
            "Clique em Salvar.",
            "Procure o colaborador na lista para confirmar o cadastro.",
        ],
        conferir: [
            "Nome e CPF estão corretos.",
            "Empresa vinculada está correta.",
            "Função foi preenchida.",
            "Foto apareceu no card, quando enviada.",
        ],
        erros: [
            "Vincular o colaborador à empresa errada.",
            "Cadastrar CPF errado.",
            "Enviar foto de outra pessoa.",
        ],
    },
    {
        id: "documentos",
        titulo: "Enviar documento da empresa",
        subtitulo: "Como anexar PGR, PCMSO, LTCAT e outros documentos.",
        etiqueta: "Documentos",
        icone: FileText,
        cor: "bg-amber-50 text-amber-700",
        paraQueServe: "Serve para guardar e acompanhar os documentos obrigatórios de cada empresa.",
        quandoUsar: "Use quando receber um documento novo, uma revisão atualizada ou precisar regularizar uma pendência.",
        passos: [
            "Clique na aba Empresas ou Documentos.",
            "Escolha a empresa correta.",
            "Selecione o tipo de documento.",
            "Informe a data ou validade quando o sistema pedir.",
            "Anexe o arquivo.",
            "Salve e confira o status.",
        ],
        conferir: [
            "Documento ficou vinculado à empresa correta.",
            "Tipo do documento está correto.",
            "Validade foi reconhecida ou preenchida corretamente.",
            "Status não ficou pendente por erro de cadastro.",
        ],
        erros: [
            "Enviar documento de uma empresa em outra empresa.",
            "Escolher tipo de documento errado.",
            "Não conferir a validade depois do envio.",
        ],
    },
    {
        id: "treinamentos",
        titulo: "Enviar certificado de treinamento",
        subtitulo: "Como controlar certificados, validade e pendências.",
        etiqueta: "Treinamentos",
        icone: GraduationCap,
        cor: "bg-violet-50 text-violet-700",
        paraQueServe: "Serve para registrar treinamentos dos colaboradores e acompanhar vencimentos.",
        quandoUsar: "Use quando receber certificado, lista de presença, integração ou documento de treinamento.",
        passos: [
            "Clique na aba Treinamentos.",
            "Selecione ou procure o colaborador correto.",
            "Envie o certificado ou documento.",
            "Aguarde a análise do sistema.",
            "Confira se nome, empresa, treinamento e validade foram identificados.",
            "Corrija manualmente somente se for necessário.",
        ],
        conferir: [
            "Colaborador identificado é o correto.",
            "Empresa está correta.",
            "Treinamento foi identificado corretamente.",
            "Data e vencimento fazem sentido.",
            "Documento não ficou em análise sem necessidade.",
        ],
        erros: [
            "Enviar certificado no colaborador errado.",
            "Aprovar documento sem conferir nome e empresa.",
            "Ignorar alerta de data suspeita.",
        ],
    },
    {
        id: "qr",
        titulo: "Consultar QR Code",
        subtitulo: "Como usar QR de colaborador, máquina ou auditoria.",
        etiqueta: "QR Code",
        icone: QrCode,
        cor: "bg-cyan-50 text-cyan-700",
        paraQueServe: "Serve para abrir uma consulta rápida pelo celular, sem precisar procurar manualmente dentro do sistema.",
        quandoUsar: "Use em campo, na portaria, em auditorias, em máquinas ou para consultar dados de um colaborador.",
        passos: [
            "Abra a câmera do celular ou leitor de QR Code.",
            "Aponte para o QR impresso ou exibido na tela.",
            "Abra o link encontrado.",
            "Confira as informações exibidas.",
            "Se aparecer erro, peça para o administrador verificar o QR ou o cadastro.",
        ],
        conferir: [
            "O QR abre sem tela de erro.",
            "As informações exibidas são da pessoa, máquina ou local correto.",
            "O status está atualizado.",
        ],
        erros: [
            "Usar QR antigo ou de outro local.",
            "Imprimir QR errado.",
            "Não testar o QR depois de gerar.",
        ],
    },
    {
        id: "auditoria-campo",
        titulo: "Fazer auditoria de campo",
        subtitulo: "Como registrar uma inspeção e seus desvios.",
        etiqueta: "Auditoria",
        icone: ClipboardCheck,
        cor: "bg-orange-50 text-orange-700",
        paraQueServe: "Serve para registrar uma verificação feita em campo, com evidências, desvios e observações.",
        quandoUsar: "Use durante inspeções de área, máquinas, frentes de serviço ou quando encontrar uma situação que precisa ser registrada.",
        passos: [
            "Clique em Auditoria de Campo ou leia o QR da área.",
            "Preencha os dados da auditoria.",
            "Marque os itens verificados.",
            "Registre desvios quando houver problema.",
            "Anexe fotos, se necessário.",
            "Revise tudo antes de salvar.",
            "Clique em Salvar apenas uma vez.",
        ],
        conferir: [
            "Auditoria apareceu no histórico.",
            "Fotos foram anexadas corretamente.",
            "Desvios ficaram vinculados à auditoria correta.",
            "Dashboard de Auditoria foi atualizado.",
        ],
        erros: [
            "Salvar duas vezes a mesma auditoria.",
            "Não anexar foto quando a evidência é importante.",
            "Esquecer de registrar o desvio encontrado.",
        ],
    },
    {
        id: "relatorios",
        titulo: "Gerar relatórios",
        subtitulo: "Como gerar PDFs para reunião, evidência ou acompanhamento.",
        etiqueta: "Relatórios",
        icone: BarChart3,
        cor: "bg-indigo-50 text-indigo-700",
        paraQueServe: "Serve para transformar as informações do sistema em um PDF organizado.",
        quandoUsar: "Use para reunião, prestação de contas, controle mensal, cobrança de pendências ou auditoria.",
        passos: [
            "Abra a aba desejada, como Dashboard SST ou Treinamentos.",
            "Aplique filtros, se necessário.",
            "Clique em Gerar PDF ou Relatório.",
            "Aguarde o arquivo ser criado.",
            "Abra o PDF antes de enviar.",
        ],
        conferir: [
            "Título do relatório está correto.",
            "Tabelas não ficaram cortadas.",
            "Rodapé e paginação aparecem corretamente.",
            "O filtro usado corresponde ao que você queria mostrar.",
        ],
        erros: [
            "Enviar PDF sem abrir para conferir.",
            "Gerar relatório com filtro errado.",
            "Usar relatório antigo como se fosse atualizado.",
        ],
    },
    {
        id: "acessos",
        titulo: "Liberar acesso para usuário",
        subtitulo: "Como cadastrar, bloquear ou ajustar perfil de acesso.",
        etiqueta: "Acessos",
        icone: ShieldCheck,
        cor: "bg-rose-50 text-rose-700",
        paraQueServe: "Serve para controlar quem pode entrar no sistema e o que cada pessoa pode acessar.",
        quandoUsar: "Use quando uma pessoa nova precisar acessar o sistema ou quando alguém mudar de função.",
        passos: [
            "Clique em Acessos do App.",
            "Cadastre o usuário ou procure um usuário existente.",
            "Confira nome, e-mail, empresa e função.",
            "Escolha o perfil correto.",
            "Salve a alteração.",
            "Peça para o usuário testar o acesso.",
        ],
        conferir: [
            "E-mail foi digitado corretamente.",
            "Perfil escolhido é o perfil certo.",
            "Usuário bloqueado não consegue acessar.",
            "Usuário liberado consegue entrar normalmente.",
        ],
        erros: [
            "Dar perfil de administrador para quem não precisa.",
            "Cadastrar e-mail errado.",
            "Esquecer de bloquear usuário que saiu da operação.",
        ],
    },
    {
        id: "configuracoes",
        titulo: "Usar configurações",
        subtitulo: "Quando mexer em ajustes internos do sistema.",
        etiqueta: "Configurações",
        icone: Settings,
        cor: "bg-slate-100 text-slate-700",
        paraQueServe: "Serve para ajustar preferências e comportamentos do sistema.",
        quandoUsar: "Use apenas quando tiver certeza da alteração necessária ou quando o administrador orientar.",
        passos: [
            "Clique em Configurações.",
            "Desbloqueie a área, se o sistema pedir senha.",
            "Altere somente o que for necessário.",
            "Salve a configuração.",
            "Atualize a página para conferir se a alteração continuou aplicada.",
        ],
        conferir: [
            "A configuração foi salva.",
            "A tela continuou no padrão aprovado.",
            "A alteração apareceu na Auditoria do Sistema, quando for uma ação crítica.",
        ],
        erros: [
            "Mexer em configuração sem necessidade.",
            "Alterar vários itens ao mesmo tempo.",
            "Não conferir se a configuração permaneceu após atualizar a página.",
        ],
    },
];

const FLUXO_RAPIDO = [
    "Cadastre a empresa",
    "Cadastre os colaboradores",
    "Envie documentos e certificados",
    "Confira pendências no Dashboard",
    "Use QR Code, auditoria e relatórios",
];

function normalizar(texto = "") {
    return String(texto)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function ListaSimples({ itens, tipo = "check" }) {
    const Icone = tipo === "alerta" ? AlertTriangle : CheckCircle2;
    const classeIcone = tipo === "alerta" ? "text-amber-600" : "text-emerald-600";

    return (
        <div className="space-y-2">
            {itens.map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-700 shadow-sm">
                    <Icone className={`mt-0.5 h-5 w-5 flex-none ${classeIcone}`} />
                    <span>{item}</span>
                </div>
            ))}
        </div>
    );
}

function SecaoAjuda({ titulo, descricao, children, icone: Icone = ListChecks }) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-start gap-3">
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200">
                    <Icone className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-sm font-black text-slate-950">{titulo}</h3>
                    {descricao && <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{descricao}</p>}
                </div>
            </div>
            {children}
        </div>
    );
}

function copiarTextoComFallback(texto) {
    const areaTexto = document.createElement("textarea");
    areaTexto.value = texto;
    areaTexto.setAttribute("readonly", "");
    areaTexto.style.position = "fixed";
    areaTexto.style.top = "-9999px";
    areaTexto.style.left = "-9999px";
    document.body.appendChild(areaTexto);
    areaTexto.select();
    document.execCommand("copy");
    document.body.removeChild(areaTexto);
}

export function Requisitos() {
    const [assuntoSelecionadoId, setAssuntoSelecionadoId] = useState("inicio");
    const [termoBusca, setTermoBusca] = useState("");
    const [copiado, setCopiado] = useState(false);

    const assuntosFiltrados = useMemo(() => {
        const termo = normalizar(termoBusca.trim());

        if (!termo) return ASSUNTOS_AJUDA;

        return ASSUNTOS_AJUDA.filter((assunto) => {
            const base = normalizar([
                assunto.titulo,
                assunto.subtitulo,
                assunto.etiqueta,
                assunto.paraQueServe,
                assunto.quandoUsar,
                ...assunto.passos,
                ...assunto.conferir,
                ...assunto.erros,
            ].join(" "));

            return base.includes(termo);
        });
    }, [termoBusca]);

    const assuntoSelecionado =
        ASSUNTOS_AJUDA.find((assunto) => assunto.id === assuntoSelecionadoId) || ASSUNTOS_AJUDA[0];

    const IconeSelecionado = assuntoSelecionado.icone;

    async function copiarPassoAPasso() {
        const texto = [
            `Controle SST QR - ${assuntoSelecionado.titulo}`,
            `Para que serve: ${assuntoSelecionado.paraQueServe}`,
            `Quando usar: ${assuntoSelecionado.quandoUsar}`,
            "",
            "Passo a passo:",
            ...assuntoSelecionado.passos.map((passo, index) => `${index + 1}. ${passo}`),
            "",
            "Confira no final:",
            ...assuntoSelecionado.conferir.map((item) => `- ${item}`),
            "",
            "Erros comuns:",
            ...assuntoSelecionado.erros.map((item) => `- ${item}`),
        ].join("\n");

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(texto);
            } else {
                copiarTextoComFallback(texto);
            }

            setCopiado(true);
            window.setTimeout(() => setCopiado(false), 2200);
        } catch (erro) {
            console.error("Erro ao copiar passo a passo:", erro);
            alert("Não foi possível copiar agora. Tente novamente pelo navegador.");
        }
    }

    return (
        <div>
            <Header
                titulo="Manuais"
                subtitulo="Central de ajuda simples para usar o Controle SST QR no dia a dia. Escolha o que precisa fazer e siga o passo a passo."
            />

            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-6">
                    <Card>
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                            <div className="flex h-14 w-14 flex-none items-center justify-center rounded-3xl bg-slate-950 text-white shadow-sm">
                                <LifeBuoy className="h-7 w-7" />
                            </div>
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                                    <HelpCircle className="h-4 w-4" />
                                    Ajuda rápida
                                </div>
                                <h2 className="mt-3 text-xl font-black text-slate-950">O que você quer fazer?</h2>
                                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                                    Esta tela foi feita para consulta rápida. Ela mostra o caminho simples, o que conferir no final e os erros mais comuns.
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                            Buscar ajuda
                        </label>
                        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-slate-300">
                            <Search className="h-5 w-5 text-slate-400" />
                            <input
                                value={termoBusca}
                                onChange={(evento) => setTermoBusca(evento.target.value)}
                                placeholder="Ex.: empresa, colaborador, QR, relatório, treinamento..."
                                className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400"
                            />
                        </div>
                    </Card>

                    <Card>
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                                <ArrowRight className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-950">Ordem mais segura para usar</h3>
                                <p className="text-xs font-semibold text-slate-500">Siga esta sequência quando estiver começando.</p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {FLUXO_RAPIDO.map((item, index) => (
                                <div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-100">
                                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-slate-950 text-[11px] font-black text-white">
                                        {index + 1}
                                    </span>
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                        {assuntosFiltrados.map((assunto) => {
                            const Icone = assunto.icone;
                            const ativo = assunto.id === assuntoSelecionado.id;

                            return (
                                <button
                                    key={assunto.id}
                                    type="button"
                                    onClick={() => setAssuntoSelecionadoId(assunto.id)}
                                    className={`rounded-3xl border p-4 text-left shadow-sm transition ${
                                        ativo
                                            ? "border-slate-950 bg-slate-950 text-white"
                                            : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`flex h-12 w-12 flex-none items-center justify-center rounded-2xl ${ativo ? "bg-white/10 text-white" : assunto.cor}`}>
                                            <Icone className="h-6 w-6" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className={`mb-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${ativo ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600"}`}>
                                                {assunto.etiqueta}
                                            </div>
                                            <p className="text-sm font-black">{assunto.titulo}</p>
                                            <p className={`mt-1 text-xs font-semibold leading-5 ${ativo ? "text-slate-200" : "text-slate-500"}`}>
                                                {assunto.subtitulo}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {assuntosFiltrados.length === 0 && (
                        <Card>
                            <p className="text-sm font-bold text-slate-600">Nenhuma ajuda encontrada para a busca informada.</p>
                        </Card>
                    )}
                </div>

                <Card className="xl:sticky xl:top-4 xl:self-start">
                    <div className="mb-5 border-b border-slate-200 pb-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex items-start gap-4">
                                <div className={`flex h-16 w-16 flex-none items-center justify-center rounded-3xl ${assuntoSelecionado.cor} shadow-sm`}>
                                    <IconeSelecionado className="h-8 w-8" />
                                </div>
                                <div>
                                    <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-slate-600">
                                        {assuntoSelecionado.etiqueta}
                                    </div>
                                    <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{assuntoSelecionado.titulo}</h2>
                                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{assuntoSelecionado.subtitulo}</p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={copiarPassoAPasso}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 lg:w-auto"
                            >
                                <Copy className="h-4 w-4" />
                                <span>{copiado ? "Copiado" : "Copiar passo a passo"}</span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <SecaoAjuda titulo="Para que serve" icone={HelpCircle}>
                            <p className="text-sm font-semibold leading-7 text-slate-700">{assuntoSelecionado.paraQueServe}</p>
                        </SecaoAjuda>

                        <SecaoAjuda titulo="Quando usar" icone={BookOpen}>
                            <p className="text-sm font-semibold leading-7 text-slate-700">{assuntoSelecionado.quandoUsar}</p>
                        </SecaoAjuda>

                        <SecaoAjuda titulo="Passo a passo" descricao="Siga nesta ordem." icone={ListChecks}>
                            <div className="space-y-2">
                                {assuntoSelecionado.passos.map((passo, index) => (
                                    <div key={passo} className="flex gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-700 shadow-sm">
                                        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-slate-950 text-[11px] font-black text-white">
                                            {index + 1}
                                        </span>
                                        <span>{passo}</span>
                                    </div>
                                ))}
                            </div>
                        </SecaoAjuda>

                        <SecaoAjuda titulo="Confira no final" descricao="Antes de sair da tela, veja estes pontos." icone={CheckCircle2}>
                            <ListaSimples itens={assuntoSelecionado.conferir} />
                        </SecaoAjuda>

                        <SecaoAjuda titulo="Erros comuns" descricao="Evite estes problemas." icone={AlertTriangle}>
                            <ListaSimples itens={assuntoSelecionado.erros} tipo="alerta" />
                        </SecaoAjuda>
                    </div>

                    <div className="mt-6 rounded-3xl bg-emerald-50 p-4 text-xs font-bold leading-6 text-emerald-800 ring-1 ring-emerald-200">
                        <div className="mb-2 flex items-center gap-2 text-sm font-black text-emerald-900">
                            <CheckCircle2 className="h-4 w-4" />
                            Dica simples
                        </div>
                        Quando tiver dúvida, comece pelo card mais parecido com o que você quer fazer. O sistema não altera dados nesta tela; ela é apenas uma central de orientação.
                    </div>
                </Card>
            </div>
        </div>
    );
}
