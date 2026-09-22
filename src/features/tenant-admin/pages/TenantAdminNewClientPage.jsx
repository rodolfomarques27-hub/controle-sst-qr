import {
    useMemo,
    useState,
} from "react";

import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    BadgeCheck,
    Building2,
    CheckCircle2,
    CreditCard,
    Globe2,
    ImagePlus,
    LoaderCircle,
    Mail,
    Search,
    ShieldCheck,
    Upload,
    UserRound,
    X,
} from "lucide-react";

import {
    consultarCnpjPublicoService,
} from "../services/tenantAdminCnpjConsultaService.js";

import {
    supabase,
} from "../../../lib/supabaseClient.js";

import {
    executarOnboardingOperacionalService,
    gerarSenhaTemporariaProvisionamentoService,
    validarSenhaTemporariaProvisionamentoService,
} from "../services/tenantAdminProvisioningService.js";

import {
    TenantAdminCreateClientConfirmModal,
} from "../components/TenantAdminCreateClientConfirmModal.jsx";

import {
    TenantAdminHero,
} from "../components/TenantAdminHero.jsx";

import {
    montarOnboardingCompletoPreviewService,
    normalizarCnpjOnboarding,
    validarAdministradorInicialOnboardingService,
    validarClienteOnboardingService,
    validarConfiguracaoComercialOnboardingService,
    validarEmpresaOnboardingService,
    validarLogoOnboardingService,
} from "../services/tenantAdminOnboardingService.js";

const PASSOS =
    [
        "Cliente",
        "Empresa",
        "Marca",
        "Responsável",
        "Plano e cobrança",
        "Revisão",
    ];

const INPUT_CLASS =
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100";

function gerarSlug(
    valor
) {
    return String(
        valor || ""
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .replace(
            /[^a-z0-9]+/g,
            "-"
        )
        .replace(
            /^-+|-+$/g,
            ""
        )
        .slice(
            0,
            63
        );
}

function formatarCnpj(
    valor
) {
    const digitos =
        String(
            valor || ""
        )
            .replace(
                /\D/g,
                ""
            )
            .slice(
                0,
                14
            );

    return digitos
        .replace(
            /^(\d{2})(\d)/,
            "$1.$2"
        )
        .replace(
            /^(\d{2})\.(\d{3})(\d)/,
            "$1.$2.$3"
        )
        .replace(
            /\.(\d{3})(\d)/,
            ".$1/$2"
        )
        .replace(
            /(\d{4})(\d)/,
            "$1-$2"
        );
}

function formatarTelefone(
    valor
) {
    const digitos =
        String(
            valor || ""
        )
            .replace(
                /\D/g,
                ""
            )
            .slice(
                0,
                11
            );

    if (
        digitos.length <=
        10
    ) {
        return digitos
            .replace(
                /^(\d{2})(\d)/,
                "($1) $2"
            )
            .replace(
                /(\d{4})(\d)/,
                "$1-$2"
            );
    }

    return digitos
        .replace(
            /^(\d{2})(\d)/,
            "($1) $2"
        )
        .replace(
            /(\d{5})(\d)/,
            "$1-$2"
        );
}

function formatarCep(
    valor
) {
    const digitos =
        String(
            valor || ""
        )
            .replace(
                /\D/g,
                ""
            )
            .slice(
                0,
                8
            );

    return digitos.replace(
        /(\d{5})(\d)/,
        "$1-$2"
    );
}

function formatarMoedaCentavos(
    centavos
) {
    return new Intl.NumberFormat(
        "pt-BR",
        {
            style:
                "currency",
            currency:
                "BRL",
        }
    ).format(
        Number(
            centavos || 0
        ) /
        100
    );
}

function Campo({
    label,
    ajuda,
    children,
}) {
    return (
        <label className="block">
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">
                    {label}
                </span>

                {ajuda ? (
                    <span className="text-[10px] text-slate-400">
                        {ajuda}
                    </span>
                ) : null}
            </div>

            <div className="mt-2">
                {children}
            </div>
        </label>
    );
}

function CabecalhoEtapa({
    Icone,
    titulo,
    descricao,
}) {
    return (
        <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <Icone className="h-5 w-5" />
            </div>

            <div>
                <h2 className="text-base font-bold text-slate-900">
                    {titulo}
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                    {descricao}
                </p>
            </div>
        </div>
    );
}

export function TenantAdminNewClientPage({
    onVoltar,
}) {
    const [
        passo,
        setPasso,
    ] =
        useState(1);

    const [
        slugEditado,
        setSlugEditado,
    ] =
        useState(false);

    const [
        erro,
        setErro,
    ] =
        useState("");

    const [
        arquivoLogo,
        setArquivoLogo,
    ] =
        useState(null);

    const [
        logoPreview,
        setLogoPreview,
    ] =
        useState("");

    const [
        previewCompleto,
        setPreviewCompleto,
    ] =
        useState(null);

    const [
        criandoCliente,
        setCriandoCliente,
    ] =
        useState(false);

    const [
        etapaCriacao,
        setEtapaCriacao,
    ] =
        useState("");

    const [
        resultadoCriacao,
        setResultadoCriacao,
    ] =
        useState(null);

    const [
        confirmacaoCriacaoAberta,
        setConfirmacaoCriacaoAberta,
    ] =
        useState(false);

    const [
        consultandoCnpj,
        setConsultandoCnpj,
    ] =
        useState(false);

    const [
        consultaCnpj,
        setConsultaCnpj,
    ] =
        useState(null);

    const [
        erroConsultaCnpj,
        setErroConsultaCnpj,
    ] =
        useState("");

    const [
        formulario,
        setFormulario,
    ] =
        useState({
            nomeTenant:
                "",
            slug:
                "",

            empresaNome:
                "",
            razaoSocial:
                "",
            cnpj:
                "",
            responsavel:
                "",
            email:
                "",
            telefone:
                "",
            empresaTipo:
                "Contratante",

            cep:
                "",
            logradouro:
                "",
            numeroEndereco:
                "",
            complemento:
                "",
            bairro:
                "",
            cidade:
                "",
            uf:
                "",

            adminNome:
                "",
            adminEmail:
                "",
            adminFuncao:
                "Responsável pelo SafeScan",

            adminSenhaTemporaria:
                "",

            modeloCobranca:
                "base_mais_colaborador",
            valorBase:
                "",
            valorColaborador:
                "",
            colaboradoresIncluidos:
                "0",
            armazenamentoIncluidoGb:
                "",
            valorGbExcedente:
                "0",
            diaFechamento:
                "25",
            diaVencimento:
                "10",
            inicioVigencia:
                "",

            financeiroNome:
                "",
            financeiroEmail:
                "",
            financeiroTelefone:
                "",
        });

    const hostname =
        useMemo(
            () => {
                if (
                    !formulario.slug
                ) {
                    return "cliente.safescanbrasil.com.br";
                }

                return (
                    formulario.slug +
                    ".safescanbrasil.com.br"
                );
            },
            [
                formulario.slug,
            ]
        );

    const usaValorBase =
        formulario.modeloCobranca !==
        "por_colaborador";

    const usaValorColaborador =
        formulario.modeloCobranca !==
        "mensalidade_fixa";

    function atualizarCampo(
        campo,
        valor
    ) {
        setErro("");
        setPreviewCompleto(null);

        setFormulario(
            (atual) => ({
                ...atual,
                [campo]:
                    valor,
            })
        );
    }

    function atualizarNomeTenant(
        valor
    ) {
        setErro("");
        setPreviewCompleto(null);

        setFormulario(
            (atual) => ({
                ...atual,
                nomeTenant:
                    valor,

                slug:
                    slugEditado
                        ? atual.slug
                        : gerarSlug(
                            valor
                        ),
            })
        );
    }

    function atualizarCnpj(
        valor
    ) {
        setErro("");
        setErroConsultaCnpj("");
        setConsultaCnpj(null);
        setPreviewCompleto(null);

        setFormulario(
            (atual) => ({
                ...atual,

                cnpj:
                    formatarCnpj(
                        valor
                    ),
            })
        );
    }

    async function consultarCnpj() {
        setConsultandoCnpj(
            true
        );

        setErroConsultaCnpj(
            ""
        );

        setConsultaCnpj(
            null
        );

        setErro("");

        try {
            const resultado =
                await consultarCnpjPublicoService({
                    cnpj:
                        formulario.cnpj,
                });

            setConsultaCnpj(
                resultado
            );

            setFormulario(
                (atual) => ({
                    ...atual,

                    empresaNome:
                        resultado.nomeFantasia ||
                        resultado.razaoSocial ||
                        atual.empresaNome,

                    razaoSocial:
                        resultado.razaoSocial ||
                        atual.razaoSocial,

                    cep:
                        resultado.cep
                            ? formatarCep(
                                resultado.cep
                            )
                            : atual.cep,

                    logradouro:
                        resultado.logradouro ||
                        atual.logradouro,

                    numeroEndereco:
                        resultado.numero ||
                        atual.numeroEndereco,

                    complemento:
                        resultado.complemento ||
                        atual.complemento,

                    bairro:
                        resultado.bairro ||
                        atual.bairro,

                    cidade:
                        resultado.cidade ||
                        atual.cidade,

                    uf:
                        resultado.uf ||
                        atual.uf,

                    email:
                        resultado.email ||
                        atual.email,

                    telefone:
                        resultado.telefone
                            ? formatarTelefone(
                                resultado.telefone
                            )
                            : atual.telefone,
                })
            );
        }
        catch (error) {
            setErroConsultaCnpj(
                error?.message ||
                "Não foi possível consultar o CNPJ."
            );
        }
        finally {
            setConsultandoCnpj(
                false
            );
        }
    }

    function selecionarLogo(
        event
    ) {
        const arquivo =
            event.target.files?.[0] ||
            null;

        try {
            validarLogoOnboardingService(
                arquivo
            );

            setArquivoLogo(
                arquivo
            );

            setPreviewCompleto(
                null
            );

            setErro("");

            const reader =
                new FileReader();

            reader.onload =
                () => {
                    setLogoPreview(
                        String(
                            reader.result ||
                            ""
                        )
                    );
                };

            reader.readAsDataURL(
                arquivo
            );
        }
        catch (error) {
            setArquivoLogo(
                null
            );

            setLogoPreview(
                ""
            );

            setErro(
                error?.message ||
                "Não foi possível carregar o logo."
            );

            event.target.value =
                "";
        }
    }

    function removerLogo() {
        setArquivoLogo(
            null
        );

        setLogoPreview(
            ""
        );

        setPreviewCompleto(
            null
        );

        setErro("");
    }

    function gerarNovaSenhaTemporaria() {
        try {
            const senha =
                gerarSenhaTemporariaProvisionamentoService();

            atualizarCampo(
                "adminSenhaTemporaria",
                senha
            );
        }
        catch (error) {
            setErro(
                error?.message ||
                "Não foi possível gerar a senha temporária."
            );
        }
    }

    function abrirConfirmacaoCriacaoReal() {
        if (
            !previewCompleto ||
            criandoCliente ||
            resultadoCriacao?.ok ||
            resultadoCriacao?.parcial
        ) {
            return;
        }

        setErro("");

        setConfirmacaoCriacaoAberta(
            true
        );
    }

    function fecharConfirmacaoCriacaoReal() {
        if (
            criandoCliente
        ) {
            return;
        }

        setConfirmacaoCriacaoAberta(
            false
        );
    }

    async function confirmarCriacaoClienteReal() {
        if (
            !previewCompleto ||
            criandoCliente ||
            resultadoCriacao?.ok ||
            resultadoCriacao?.parcial
        ) {
            return;
        }

        setConfirmacaoCriacaoAberta(
            false
        );

        setCriandoCliente(
            true
        );

        setEtapaCriacao(
            "Iniciando..."
        );

        setErro("");

        setResultadoCriacao(
            null
        );

        try {
            const resultado =
                await executarOnboardingOperacionalService({
                    supabase,
                    formulario,
                    arquivoLogo,
                    consultaCnpj,
                    senhaTemporaria:
                        formulario.adminSenhaTemporaria,

                    onEtapa:
                        setEtapaCriacao,
                });

            setResultadoCriacao(
                resultado
            );

            setEtapaCriacao(
                "Cliente criado com sucesso."
            );
        }
        catch (error) {
            const parcial =
                error?.parcial ===
                true;

            if (parcial) {
                setResultadoCriacao({
                    ok:
                        false,

                    parcial:
                        true,

                    etapa:
                        error?.etapa ||
                        "desconhecida",

                    ...(
                        error?.resultadoParcial ||
                        {}
                    ),
                });
            }

            setErro(
                error?.message ||
                "Não foi possível concluir a criação do cliente."
            );

            setEtapaCriacao(
                parcial
                    ? "Criação parcial — não repetir o provisionamento."
                    : "Criação não concluída."
            );
        }
        finally {
            setCriandoCliente(
                false
            );
        }
    }

    function validarPassoAtual() {
        if (
            passo ===
            1
        ) {
            validarClienteOnboardingService(
                formulario
            );

            return;
        }

        if (
            passo ===
            2
        ) {
            validarEmpresaOnboardingService(
                formulario
            );

            const cnpjAtual =
                normalizarCnpjOnboarding(
                    formulario.cnpj
                );

            if (
                !consultaCnpj ||
                consultaCnpj.cnpj !==
                    cnpjAtual
            ) {
                throw new Error(
                    "Clique em Consultar CNPJ para confirmar os dados da empresa antes de continuar."
                );
            }

            if (
                !consultaCnpj.ativa
            ) {
                throw new Error(
                    `O CNPJ está com situação cadastral ${consultaCnpj.situacaoCadastral || "não ativa"}.`
                );
            }

            return;
        }

        if (
            passo ===
            3
        ) {
            validarLogoOnboardingService(
                arquivoLogo
            );

            return;
        }

        if (
            passo ===
            4
        ) {
            validarAdministradorInicialOnboardingService(
                formulario
            );

            validarSenhaTemporariaProvisionamentoService(
                formulario.adminSenhaTemporaria
            );

            return;
        }

        if (
            passo ===
            5
        ) {
            validarConfiguracaoComercialOnboardingService(
                formulario
            );
        }
    }

    function avancar() {
        try {
            validarPassoAtual();

            setErro("");

            if (
                passo ===
                4
            ) {
                setFormulario(
                    (atual) => ({
                        ...atual,

                        financeiroNome:
                            atual.financeiroNome ||
                            atual.responsavel,

                        financeiroEmail:
                            atual.financeiroEmail ||
                            atual.email,

                        financeiroTelefone:
                            atual.financeiroTelefone ||
                            atual.telefone,
                    })
                );
            }

            setPasso(
                (atual) =>
                    Math.min(
                        atual + 1,
                        6
                    )
            );
        }
        catch (error) {
            setErro(
                error?.message ||
                "Revise os dados informados."
            );
        }
    }

    function voltarPasso() {
        setErro("");
        setPreviewCompleto(null);

        setPasso(
            (atual) =>
                Math.max(
                    atual - 1,
                    1
                )
        );
    }

    function validarOnboardingCompleto() {
        try {
            validarSenhaTemporariaProvisionamentoService(
                formulario.adminSenhaTemporaria
            );

            const cnpjAtual =
                normalizarCnpjOnboarding(
                    formulario.cnpj
                );

            if (
                !consultaCnpj ||
                consultaCnpj.cnpj !==
                    cnpjAtual ||
                !consultaCnpj.ativa
            ) {
                throw new Error(
                    "A validação cadastral do CNPJ precisa estar confirmada antes do onboarding final."
                );
            }

            const preview =
                montarOnboardingCompletoPreviewService({
                    formulario,
                    arquivoLogo,
                });

            setPreviewCompleto(
                preview
            );

            setErro("");
        }
        catch (error) {
            setPreviewCompleto(
                null
            );

            setErro(
                error?.message ||
                "Não foi possível validar o onboarding completo."
            );
        }
    }

    return (
        <div className="mx-auto w-full max-w-[1500px]">

            <TenantAdminHero
                titulo="Novo cliente"
                subtitulo="Cadastre a empresa, valide o CNPJ e configure o novo ambiente SafeScan."
            />

            <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
                    {PASSOS.map(
                        (
                            titulo,
                            index
                        ) => {
                            const numero =
                                index + 1;

                            const ativo =
                                passo ===
                                numero;

                            const concluido =
                                passo >
                                numero;

                            return (
                                <div
                                    key={
                                        titulo
                                    }
                                    className={
                                        ativo
                                            ? "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3"
                                            : "rounded-xl border border-slate-200 bg-white px-3 py-3"
                                    }
                                >
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={
                                                concluido
                                                    ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"
                                                    : ativo
                                                        ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-[11px] font-bold text-white"
                                                        : "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-500"
                                            }
                                        >
                                            {concluido ? (
                                                <CheckCircle2 className="h-4 w-4" />
                                            ) : (
                                                numero
                                            )}
                                        </span>

                                        <span className="text-[11px] font-semibold text-slate-700">
                                            {titulo}
                                        </span>
                                    </div>
                                </div>
                            );
                        }
                    )}
                </div>
            </section>

            <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                {passo ===
                1 ? (
                    <div>
                        <CabecalhoEtapa
                            Icone={
                                Building2
                            }
                            titulo="Dados do cliente"
                            descricao="Identifique o ambiente SafeScan que será criado para a empresa."
                        />

                        <div className="mt-6 grid gap-5 lg:grid-cols-2">
                            <Campo label="Nome do cliente">
                                <input
                                    type="text"
                                    value={
                                        formulario.nomeTenant
                                    }
                                    onChange={
                                        (event) =>
                                            atualizarNomeTenant(
                                                event.target.value
                                            )
                                    }
                                    placeholder="Ex.: Empresa Modelo"
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>

                            <Campo
                                label="Slug"
                                ajuda="Usado no endereço de acesso."
                            >
                                <input
                                    type="text"
                                    value={
                                        formulario.slug
                                    }
                                    onChange={
                                        (event) => {
                                            setSlugEditado(
                                                true
                                            );

                                            atualizarCampo(
                                                "slug",
                                                gerarSlug(
                                                    event.target.value
                                                )
                                            );
                                        }
                                    }
                                    placeholder="empresa-modelo"
                                    className={
                                        INPUT_CLASS +
                                        " font-mono"
                                    }
                                />
                            </Campo>
                        </div>

                        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-start gap-3">
                                <Globe2 className="mt-0.5 h-4 w-4 text-emerald-700" />

                                <div>
                                    <p className="text-xs font-bold text-slate-700">
                                        Endereço previsto
                                    </p>

                                    <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
                                        {hostname}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                {passo ===
                2 ? (
                    <div>
                        <CabecalhoEtapa
                            Icone={
                                Building2
                            }
                            titulo="Empresa e dados cadastrais"
                            descricao="Consulte o CNPJ para confirmar a empresa e preencher os dados públicos disponíveis."
                        />

                        <div className="mt-6 grid gap-5 lg:grid-cols-2">
                            <div className="lg:col-span-2">
                                <Campo
                                    label="CNPJ"
                                    ajuda="Consulte antes de continuar."
                                >
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <input
                                            type="text"
                                            value={
                                                formulario.cnpj
                                            }
                                            onChange={
                                                (event) =>
                                                    atualizarCnpj(
                                                        event.target.value
                                                    )
                                            }
                                            placeholder="00.000.000/0000-00"
                                            className={
                                                INPUT_CLASS
                                            }
                                        />

                                        <button
                                            type="button"
                                            disabled={
                                                consultandoCnpj
                                            }
                                            onClick={
                                                consultarCnpj
                                            }
                                            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-60"
                                        >
                                            {consultandoCnpj ? (
                                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Search className="h-4 w-4" />
                                            )}

                                            {consultandoCnpj
                                                ? "Consultando..."
                                                : "Consultar CNPJ"}
                                        </button>
                                    </div>
                                </Campo>

                                {erroConsultaCnpj ? (
                                    <div className="mt-3 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />

                                        <div>
                                            <p className="text-xs font-bold text-red-800">
                                                Consulta não concluída
                                            </p>

                                            <p className="mt-1 text-xs leading-5 text-red-700">
                                                {erroConsultaCnpj}
                                            </p>
                                        </div>
                                    </div>
                                ) : null}

                                {consultaCnpj ? (
                                    <div
                                        className={
                                            consultaCnpj.ativa
                                                ? "mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
                                                : "mt-3 rounded-xl border border-red-200 bg-red-50 p-4"
                                        }
                                    >
                                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                            <div className="flex items-start gap-3">
                                                {consultaCnpj.ativa ? (
                                                    <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                                                ) : (
                                                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                                                )}

                                                <div>
                                                    <p
                                                        className={
                                                            consultaCnpj.ativa
                                                                ? "text-sm font-bold text-emerald-900"
                                                                : "text-sm font-bold text-red-900"
                                                        }
                                                    >
                                                        {consultaCnpj.ativa
                                                            ? "CNPJ localizado e situação ATIVA"
                                                            : `CNPJ localizado — situação ${consultaCnpj.situacaoCadastral || "não informada"}`}
                                                    </p>

                                                    <p className="mt-2 text-xs font-semibold text-slate-800">
                                                        {consultaCnpj.razaoSocial ||
                                                            "Razão social não informada"}
                                                    </p>

                                                    {consultaCnpj.nomeFantasia ? (
                                                        <p className="mt-1 text-xs text-slate-600">
                                                            Nome fantasia:{" "}
                                                            {consultaCnpj.nomeFantasia}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>

                                            <div className="rounded-lg bg-white/70 px-3 py-2 text-[10px] font-semibold text-slate-500">
                                                Dados públicos do CNPJ
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            <Campo label="Nome fantasia">
                                <input
                                    type="text"
                                    value={
                                        formulario.empresaNome
                                    }
                                    onChange={
                                        (event) =>
                                            atualizarCampo(
                                                "empresaNome",
                                                event.target.value
                                            )
                                    }
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>

                            <Campo label="Razão social">
                                <input
                                    type="text"
                                    value={
                                        formulario.razaoSocial
                                    }
                                    onChange={
                                        (event) =>
                                            atualizarCampo(
                                                "razaoSocial",
                                                event.target.value
                                            )
                                    }
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>

                            <Campo label="Tipo da empresa">
                                <select
                                    value={
                                        formulario.empresaTipo
                                    }
                                    onChange={
                                        (event) =>
                                            atualizarCampo(
                                                "empresaTipo",
                                                event.target.value
                                            )
                                    }
                                    className={
                                        INPUT_CLASS
                                    }
                                >
                                    <option value="Contratante">
                                        Contratante
                                    </option>

                                    <option value="Terceirizada">
                                        Terceirizada
                                    </option>

                                    <option value="Subcontratada">
                                        Subcontratada
                                    </option>
                                </select>
                            </Campo>

                            <Campo label="Responsável pela empresa">
                                <input
                                    type="text"
                                    value={
                                        formulario.responsavel
                                    }
                                    onChange={
                                        (event) =>
                                            atualizarCampo(
                                                "responsavel",
                                                event.target.value
                                            )
                                    }
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>

                            <Campo label="E-mail da empresa">
                                <input
                                    type="email"
                                    value={
                                        formulario.email
                                    }
                                    onChange={
                                        (event) =>
                                            atualizarCampo(
                                                "email",
                                                event.target.value
                                            )
                                    }
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>

                            <Campo label="Telefone">
                                <input
                                    type="text"
                                    value={
                                        formulario.telefone
                                    }
                                    onChange={
                                        (event) =>
                                            atualizarCampo(
                                                "telefone",
                                                formatarTelefone(
                                                    event.target.value
                                                )
                                            )
                                    }
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>

                            <Campo label="CEP">
                                <input
                                    type="text"
                                    value={
                                        formulario.cep
                                    }
                                    onChange={
                                        (event) =>
                                            atualizarCampo(
                                                "cep",
                                                formatarCep(
                                                    event.target.value
                                                )
                                            )
                                    }
                                    placeholder="00000-000"
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>

                            <Campo label="Logradouro">
                                <input
                                    type="text"
                                    value={
                                        formulario.logradouro
                                    }
                                    onChange={
                                        (event) =>
                                            atualizarCampo(
                                                "logradouro",
                                                event.target.value
                                            )
                                    }
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>

                            <Campo label="Número">
                                <input
                                    type="text"
                                    value={
                                        formulario.numeroEndereco
                                    }
                                    onChange={
                                        (event) =>
                                            atualizarCampo(
                                                "numeroEndereco",
                                                event.target.value
                                            )
                                    }
                                    placeholder="123 ou S/N"
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>

                            <Campo label="Complemento">
                                <input
                                    type="text"
                                    value={
                                        formulario.complemento
                                    }
                                    onChange={
                                        (event) =>
                                            atualizarCampo(
                                                "complemento",
                                                event.target.value
                                            )
                                    }
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>

                            <Campo label="Bairro">
                                <input
                                    type="text"
                                    value={
                                        formulario.bairro
                                    }
                                    onChange={
                                        (event) =>
                                            atualizarCampo(
                                                "bairro",
                                                event.target.value
                                            )
                                    }
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>

                            <Campo label="Cidade">
                                <input
                                    type="text"
                                    value={
                                        formulario.cidade
                                    }
                                    onChange={
                                        (event) =>
                                            atualizarCampo(
                                                "cidade",
                                                event.target.value
                                            )
                                    }
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>

                            <Campo label="UF">
                                <input
                                    type="text"
                                    value={
                                        formulario.uf
                                    }
                                    maxLength={
                                        2
                                    }
                                    onChange={
                                        (event) =>
                                            atualizarCampo(
                                                "uf",
                                                event.target.value.toUpperCase()
                                            )
                                    }
                                    placeholder="SP"
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>
                        </div>
                    </div>
                ) : null}

                {passo ===
                3 ? (
                    <div>
                        <CabecalhoEtapa
                            Icone={
                                ImagePlus
                            }
                            titulo="Marca do cliente"
                            descricao="Escolha o logo que identificará a empresa dentro do SafeScan."
                        />

                        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                                <p className="text-sm font-bold text-slate-900">
                                    Logo da empresa
                                </p>

                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    Use uma imagem nítida, preferencialmente
                                    com fundo transparente.
                                </p>

                                <div className="mt-5 flex min-h-[210px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-6">
                                    {logoPreview ? (
                                        <img
                                            src={
                                                logoPreview
                                            }
                                            alt="Logo da empresa"
                                            className="max-h-[150px] max-w-[280px] object-contain"
                                        />
                                    ) : (
                                        <div className="text-center">
                                            <ImagePlus className="mx-auto h-10 w-10 text-slate-300" />

                                            <p className="mt-3 text-xs font-semibold text-slate-500">
                                                Nenhum logo selecionado
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 flex flex-wrap gap-3">
                                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500">
                                        <Upload className="h-4 w-4" />

                                        {logoPreview
                                            ? "Trocar logo"
                                            : "Escolher logo"}

                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            onChange={
                                                selecionarLogo
                                            }
                                            className="hidden"
                                        />
                                    </label>

                                    {logoPreview ? (
                                        <button
                                            type="button"
                                            onClick={
                                                removerLogo
                                            }
                                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100"
                                        >
                                            <X className="h-4 w-4" />
                                            Remover
                                        </button>
                                    ) : null}
                                </div>

                                <p className="mt-3 text-[11px] text-slate-400">
                                    PNG, JPG ou WEBP · máximo 5 MB.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                    Prévia do acesso
                                </p>

                                <div className="mt-4 overflow-hidden rounded-2xl bg-[#07140f] p-6 text-white">
                                    <div className="flex min-h-[190px] flex-col justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
                                                SafeScan Brasil
                                            </p>

                                            <p className="mt-1 text-sm font-semibold text-white">
                                                Ambiente da empresa
                                            </p>
                                        </div>

                                        <div className="mt-8 flex items-center gap-5">
                                            <div className="flex h-20 w-28 items-center justify-center rounded-xl bg-white p-3">
                                                {logoPreview ? (
                                                    <img
                                                        src={
                                                            logoPreview
                                                        }
                                                        alt="Prévia do logo"
                                                        className="max-h-full max-w-full object-contain"
                                                    />
                                                ) : (
                                                    <span className="text-center text-[10px] font-bold text-slate-400">
                                                        LOGO
                                                        <br />
                                                        DA EMPRESA
                                                    </span>
                                                )}
                                            </div>

                                            <div className="h-14 w-px bg-white/15" />

                                            <div>
                                                <p className="text-xs text-slate-400">
                                                    Cliente
                                                </p>

                                                <p className="mt-1 text-sm font-bold text-white">
                                                    {formulario.empresaNome ||
                                                        formulario.nomeTenant ||
                                                        "Nome da empresa"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 rounded-xl bg-emerald-50 p-4">
                                    <p className="text-xs font-bold text-emerald-800">
                                        Identidade personalizada
                                    </p>

                                    <p className="mt-1 text-xs leading-5 text-emerald-700">
                                        O logo do cliente será exibido junto
                                        da identidade SafeScan no ambiente personalizado.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                {passo ===
                4 ? (
                    <div>
                        <CabecalhoEtapa
                            Icone={
                                UserRound
                            }
                            titulo="Responsável pelo sistema"
                            descricao="Informe quem administrará o SafeScan dentro da empresa."
                        />

                        <div className="mt-6 grid gap-5 lg:grid-cols-2">
                            <Campo label="Nome do responsável">
                                <input
                                    type="text"
                                    value={
                                        formulario.adminNome
                                    }
                                    onChange={
                                        (event) =>
                                            atualizarCampo(
                                                "adminNome",
                                                event.target.value
                                            )
                                    }
                                    placeholder="Nome completo"
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>

                            <Campo label="E-mail de acesso">
                                <input
                                    type="email"
                                    value={
                                        formulario.adminEmail
                                    }
                                    onChange={
                                        (event) =>
                                            atualizarCampo(
                                                "adminEmail",
                                                event.target.value
                                            )
                                    }
                                    placeholder="responsavel@empresa.com.br"
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>

                            <Campo
                                label="Cargo / função"
                                ajuda="Como essa pessoa será identificada no cadastro."
                            >
                                <input
                                    type="text"
                                    value={
                                        formulario.adminFuncao
                                    }
                                    onChange={
                                        (event) =>
                                            atualizarCampo(
                                                "adminFuncao",
                                                event.target.value
                                            )
                                    }
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>

                            <Campo
                                label="Senha temporária"
                                ajuda="Será exigida a troca no primeiro acesso quando um novo login for criado."
                            >
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <input
                                        type="text"
                                        value={
                                            formulario.adminSenhaTemporaria
                                        }
                                        onChange={
                                            (event) =>
                                                atualizarCampo(
                                                    "adminSenhaTemporaria",
                                                    event.target.value
                                                )
                                        }
                                        placeholder="Gere uma senha segura"
                                        autoComplete="new-password"
                                        className={
                                            INPUT_CLASS +
                                            " font-mono"
                                        }
                                    />

                                    <button
                                        type="button"
                                        onClick={
                                            gerarNovaSenhaTemporaria
                                        }
                                        className="h-11 shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                                    >
                                        Gerar senha
                                    </button>
                                </div>

                                <p className="mt-2 text-[11px] leading-5 text-slate-500">
                                    A senha temporária fica somente nesta tela
                                    durante o onboarding e não será salva em texto
                                    no cadastro SafeScan.
                                </p>
                            </Campo>
                        </div>

                        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
                            <p className="text-xs font-bold text-blue-900">
                                Acesso ao SafeScan
                            </p>

                            <p className="mt-1 text-xs leading-5 text-blue-700">
                                Esta será a pessoa responsável por administrar
                                usuários, empresas e configurações do ambiente
                                depois da ativação.
                            </p>
                        </div>
                    </div>
                ) : null}

                {passo ===
                5 ? (
                    <div>
                        <CabecalhoEtapa
                            Icone={
                                CreditCard
                            }
                            titulo="Plano e cobrança"
                            descricao="Defina a configuração comercial inicial do cliente."
                        />

                        <div className="mt-6 grid gap-5 lg:grid-cols-2">
                            <Campo label="Modelo de cobrança">
                                <select
                                    value={
                                        formulario.modeloCobranca
                                    }
                                    onChange={
                                        (event) =>
                                            atualizarCampo(
                                                "modeloCobranca",
                                                event.target.value
                                            )
                                    }
                                    className={
                                        INPUT_CLASS
                                    }
                                >
                                    <option value="base_mais_colaborador">
                                        Mensalidade base + colaborador
                                    </option>

                                    <option value="por_colaborador">
                                        Somente por colaborador
                                    </option>

                                    <option value="mensalidade_fixa">
                                        Mensalidade fixa
                                    </option>
                                </select>
                            </Campo>

                            <Campo label="Valor base mensal (R$)">
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    disabled={
                                        !usaValorBase
                                    }
                                    value={
                                        formulario.valorBase
                                    }
                                    onChange={
                                        (event) =>
                                            atualizarCampo(
                                                "valorBase",
                                                event.target.value
                                            )
                                    }
                                    className={
                                        INPUT_CLASS +
                                        (
                                            !usaValorBase
                                                ? " cursor-not-allowed bg-slate-100 text-slate-400"
                                                : ""
                                        )
                                    }
                                />
                            </Campo>

                            <Campo label="Valor por colaborador (R$)">
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    disabled={
                                        !usaValorColaborador
                                    }
                                    value={
                                        formulario.valorColaborador
                                    }
                                    onChange={
                                        (event) =>
                                            atualizarCampo(
                                                "valorColaborador",
                                                event.target.value
                                            )
                                    }
                                    className={
                                        INPUT_CLASS +
                                        (
                                            !usaValorColaborador
                                                ? " cursor-not-allowed bg-slate-100 text-slate-400"
                                                : ""
                                        )
                                    }
                                />
                            </Campo>

                            <Campo label="Colaboradores incluídos na base">
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    disabled={
                                        !usaValorColaborador
                                    }
                                    value={
                                        formulario.colaboradoresIncluidos
                                    }
                                    onChange={
                                        (event) =>
                                            atualizarCampo(
                                                "colaboradoresIncluidos",
                                                event.target.value
                                            )
                                    }
                                    className={
                                        INPUT_CLASS +
                                        (
                                            !usaValorColaborador
                                                ? " cursor-not-allowed bg-slate-100 text-slate-400"
                                                : ""
                                        )
                                    }
                                />
                            </Campo>

                            <Campo label="Armazenamento incluído (GB)">
                                <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={
                                        formulario.armazenamentoIncluidoGb
                                    }
                                    onChange={
                                        (event) =>
                                            atualizarCampo(
                                                "armazenamentoIncluidoGb",
                                                event.target.value
                                            )
                                    }
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>

                            <Campo label="Excedente por GB (R$)">
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={
                                        formulario.valorGbExcedente
                                    }
                                    onChange={
                                        (event) =>
                                            atualizarCampo(
                                                "valorGbExcedente",
                                                event.target.value
                                            )
                                    }
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>

                            <Campo label="Dia de fechamento">
                                <input
                                    type="number"
                                    min="1"
                                    max="28"
                                    value={
                                        formulario.diaFechamento
                                    }
                                    onChange={
                                        (event) =>
                                            atualizarCampo(
                                                "diaFechamento",
                                                event.target.value
                                            )
                                    }
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>

                            <Campo label="Dia de vencimento">
                                <input
                                    type="number"
                                    min="1"
                                    max="28"
                                    value={
                                        formulario.diaVencimento
                                    }
                                    onChange={
                                        (event) =>
                                            atualizarCampo(
                                                "diaVencimento",
                                                event.target.value
                                            )
                                    }
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>

                            <Campo label="Início da vigência">
                                <input
                                    type="date"
                                    value={
                                        formulario.inicioVigencia
                                    }
                                    onChange={
                                        (event) =>
                                            atualizarCampo(
                                                "inicioVigencia",
                                                event.target.value
                                            )
                                    }
                                    className={
                                        INPUT_CLASS
                                    }
                                />
                            </Campo>
                        </div>

                        <div className="mt-7 border-t border-slate-100 pt-6">
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-emerald-700" />

                                <h3 className="text-sm font-bold text-slate-900">
                                    Contato financeiro
                                </h3>
                            </div>

                            <div className="mt-4 grid gap-5 lg:grid-cols-3">
                                <Campo label="Nome">
                                    <input
                                        type="text"
                                        value={
                                            formulario.financeiroNome
                                        }
                                        onChange={
                                            (event) =>
                                                atualizarCampo(
                                                    "financeiroNome",
                                                    event.target.value
                                                )
                                        }
                                        className={
                                            INPUT_CLASS
                                        }
                                    />
                                </Campo>

                                <Campo label="E-mail">
                                    <input
                                        type="email"
                                        value={
                                            formulario.financeiroEmail
                                        }
                                        onChange={
                                            (event) =>
                                                atualizarCampo(
                                                    "financeiroEmail",
                                                    event.target.value
                                                )
                                        }
                                        className={
                                            INPUT_CLASS
                                        }
                                    />
                                </Campo>

                                <Campo label="Telefone">
                                    <input
                                        type="text"
                                        value={
                                            formulario.financeiroTelefone
                                        }
                                        onChange={
                                            (event) =>
                                                atualizarCampo(
                                                    "financeiroTelefone",
                                                    formatarTelefone(
                                                        event.target.value
                                                    )
                                                )
                                        }
                                        className={
                                            INPUT_CLASS
                                        }
                                    />
                                </Campo>
                            </div>
                        </div>

                        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-bold text-slate-800">
                                Regra de cobrança
                            </p>

                            <p className="mt-1 text-xs leading-5 text-slate-600">
                                O fechamento mensal preservará a quantidade
                                faturável de colaboradores de cada competência,
                                garantindo histórico e conferência.
                            </p>
                        </div>
                    </div>
                ) : null}

                {passo ===
                6 ? (
                    <div>
                        <CabecalhoEtapa
                            Icone={
                                CheckCircle2
                            }
                            titulo="Revisão completa"
                            descricao="Confira os dados antes da futura criação do cliente."
                        />

                        <div className="mt-6 grid gap-4 lg:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                                    Cliente
                                </p>

                                <p className="mt-2 text-sm font-bold text-slate-900">
                                    {formulario.nomeTenant}
                                </p>

                                <p className="mt-1 font-mono text-xs text-slate-500">
                                    {hostname}
                                </p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                                        Empresa
                                    </p>

                                    {consultaCnpj?.ativa ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">
                                            <BadgeCheck className="h-3 w-3" />
                                            CNPJ ATIVO
                                        </span>
                                    ) : null}
                                </div>

                                <p className="mt-2 text-sm font-bold text-slate-900">
                                    {formulario.empresaNome}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    {formulario.razaoSocial}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    {formulario.cnpj}
                                </p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                                    Responsável pelo sistema
                                </p>

                                <p className="mt-2 text-sm font-bold text-slate-900">
                                    {formulario.adminNome}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    {formulario.adminEmail}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    {formulario.adminFuncao}
                                </p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                                    Marca do cliente
                                </p>

                                <div className="mt-3 flex items-center gap-4">
                                    {logoPreview ? (
                                        <img
                                            src={
                                                logoPreview
                                            }
                                            alt="Logo"
                                            className="h-16 w-24 rounded-lg bg-white object-contain p-2 ring-1 ring-slate-200"
                                        />
                                    ) : null}

                                    <p className="text-xs font-semibold text-slate-600">
                                        {arquivoLogo?.name ||
                                            "Logo não informado"}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
                                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                                    Plano comercial
                                </p>

                                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                    <div>
                                        <p className="text-[10px] text-slate-400">
                                            Modelo
                                        </p>

                                        <p className="mt-1 text-sm font-bold text-slate-900">
                                            {formulario.modeloCobranca}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-[10px] text-slate-400">
                                            Base
                                        </p>

                                        <p className="mt-1 text-sm font-bold text-slate-900">
                                            {usaValorBase
                                                ? (
                                                    formulario.valorBase
                                                        ? `R$ ${formulario.valorBase}`
                                                        : "R$ 0"
                                                )
                                                : "Não se aplica"}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-[10px] text-slate-400">
                                            Por colaborador
                                        </p>

                                        <p className="mt-1 text-sm font-bold text-slate-900">
                                            {usaValorColaborador
                                                ? (
                                                    formulario.valorColaborador
                                                        ? `R$ ${formulario.valorColaborador}`
                                                        : "R$ 0"
                                                )
                                                : "Não se aplica"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <p className="text-xs font-bold text-amber-900">
                                Confirmação antes da criação
                            </p>

                            <p className="mt-1 text-xs leading-5 text-amber-700">
                                Primeiro valide todo o onboarding. Depois será
                                habilitado o botão Criar cliente. A criação real
                                exige uma segunda confirmação antes de gravar
                                qualquer informação.
                            </p>
                        </div>

                        {previewCompleto ? (
                            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                <p className="text-xs font-bold text-emerald-800">
                                    Onboarding completo validado.
                                </p>

                                <div className="mt-2 grid gap-2 text-xs text-emerald-700 sm:grid-cols-3">
                                    <span>
                                        Base:{" "}
                                        {formatarMoedaCentavos(
                                            previewCompleto.comercial.valorBaseCentavos
                                        )}
                                    </span>

                                    <span>
                                        Colaborador:{" "}
                                        {formatarMoedaCentavos(
                                            previewCompleto.comercial.valorColaboradorCentavos
                                        )}
                                    </span>

                                    <span>
                                        Armazenamento:{" "}
                                        {previewCompleto.comercial.armazenamentoIncluidoGb} GB
                                    </span>
                                </div>

                                <p className="mt-2 text-xs text-emerald-700">
                                    Nenhuma alteração foi gravada no banco.
                                </p>
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {criandoCliente ? (
                    <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                        <div className="flex items-center gap-3">
                            <LoaderCircle className="h-4 w-4 animate-spin text-blue-700" />

                            <div>
                                <p className="text-xs font-bold text-blue-900">
                                    Criando cliente
                                </p>

                                <p className="mt-1 text-xs text-blue-700">
                                    {etapaCriacao}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}

                {resultadoCriacao?.ok ? (
                    <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                            <div className="min-w-0">
                                <p className="text-sm font-bold text-emerald-900">
                                    Cliente criado com sucesso
                                </p>

                                <div className="mt-3 grid gap-2 text-xs text-emerald-800">
                                    <p>
                                        Tenant:{" "}
                                        <span className="font-mono">
                                            {resultadoCriacao.provisionamento?.tenant?.id}
                                        </span>
                                    </p>

                                    <p>
                                        Ambiente:{" "}
                                        <span className="font-semibold">
                                            {resultadoCriacao.provisionamento?.dominio?.hostname}
                                        </span>
                                    </p>

                                    <p>
                                        Responsável:{" "}
                                        <span className="font-semibold">
                                            {resultadoCriacao.acesso?.usuario?.email}
                                        </span>
                                    </p>

                                    <p>
                                        Membership:{" "}
                                        <span className="font-semibold">
                                            {resultadoCriacao.acesso?.usuario?.papel}
                                            {" / "}
                                            {resultadoCriacao.acesso?.usuario?.membershipStatus}
                                        </span>
                                    </p>

                                    <p>
                                        Logo:{" "}
                                        <span className="font-semibold">
                                            concluído
                                        </span>
                                    </p>
                                </div>

                                {resultadoCriacao.acesso?.senhaTemporariaDefinida ? (
                                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                                        <p className="text-xs font-bold text-amber-900">
                                            Senha temporária
                                        </p>

                                        <p className="mt-1 break-all font-mono text-sm font-bold text-amber-900">
                                            {formulario.adminSenhaTemporaria}
                                        </p>

                                        <p className="mt-2 text-[11px] leading-5 text-amber-700">
                                            O envio automático ainda não será realizado
                                            porque a comunicação atual não é tenant-aware.
                                            Comunique esta senha por canal seguro.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                                        <p className="text-xs font-bold text-blue-900">
                                            Usuário já possuía login
                                        </p>

                                        <p className="mt-1 text-[11px] leading-5 text-blue-700">
                                            Nenhuma nova senha temporária foi aplicada.
                                            O usuário continua utilizando seu login existente.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : null}

                {resultadoCriacao?.parcial ? (
                    <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

                            <div>
                                <p className="text-sm font-bold text-amber-900">
                                    Criação parcialmente concluída
                                </p>

                                <p className="mt-1 text-xs leading-5 text-amber-800">
                                    O tenant já foi criado. Não pressione Criar cliente novamente.
                                    A etapa que falhou foi:{" "}
                                    <strong>
                                        {resultadoCriacao.etapa}
                                    </strong>.
                                </p>

                                {resultadoCriacao.provisionamento?.tenant?.id ? (
                                    <p className="mt-2 font-mono text-xs text-amber-800">
                                        Tenant:{" "}
                                        {resultadoCriacao.provisionamento.tenant.id}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    </div>
                ) : null}

                {erro ? (
                    <div
                        role="alert"
                        className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
                    >
                        {erro}
                    </div>
                ) : null}

                <div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <button
                        type="button"
                        onClick={
                            passo ===
                            1
                                ? onVoltar
                                : voltarPasso
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                    >
                        <ArrowLeft className="h-4 w-4" />

                        {passo ===
                        1
                            ? "Cancelar"
                            : "Voltar"}
                    </button>

                    {passo <
                    6 ? (
                        <button
                            type="button"
                            onClick={
                                avancar
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500"
                        >
                            Continuar
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    ) : resultadoCriacao?.ok ? (
                        <button
                            type="button"
                            onClick={
                                onVoltar
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500"
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            Voltar para clientes
                        </button>
                    ) : resultadoCriacao?.parcial ? (
                        <button
                            type="button"
                            disabled
                            className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-amber-100 px-5 py-2.5 text-xs font-bold text-amber-700"
                        >
                            <AlertTriangle className="h-4 w-4" />
                            Criação parcial — revisar
                        </button>
                    ) : previewCompleto ? (
                        <button
                            type="button"
                            disabled={
                                criandoCliente
                            }
                            onClick={
                                abrirConfirmacaoCriacaoReal
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-60"
                        >
                            {criandoCliente ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                                <ShieldCheck className="h-4 w-4" />
                            )}

                            {criandoCliente
                                ? "Criando cliente..."
                                : "Criar cliente"}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={
                                validarOnboardingCompleto
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500"
                        >
                            <ShieldCheck className="h-4 w-4" />
                            Validar onboarding completo
                        </button>
                    )}
                </div>
            </section>

            <TenantAdminCreateClientConfirmModal
                open={
                    confirmacaoCriacaoAberta
                }
                loading={
                    criandoCliente
                }
                formulario={
                    formulario
                }
                consultaCnpj={
                    consultaCnpj
                }
                logoPreview={
                    logoPreview
                }
                onCancel={
                    fecharConfirmacaoCriacaoReal
                }
                onConfirm={
                    confirmarCriacaoClienteReal
                }
            />
        </div>
    );
}