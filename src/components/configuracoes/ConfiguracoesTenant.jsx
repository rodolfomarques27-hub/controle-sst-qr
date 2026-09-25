import {
    BadgeCheck,
    Blocks,
    Building2,
    Globe2,
    LockKeyhole,
    ShieldCheck,
    UserRound,
} from "lucide-react";

import dashboardHeroBackground from "../../assets/dashboard-hero-sst.webp";
import {
    useTenantRuntimeContext,
} from "../layout/TenantRuntimeContext.js";

function textoSeguro(valor = "") {
    return String(valor ?? "").trim();
}

function nomePerfilAcesso(valor = "") {
    const perfil =
        textoSeguro(valor)
            .toLowerCase();

    const rotulos = {
        administrador: "Administrador",
        tecnico_sst: "Técnico SST",
        auditor: "Auditor",
        consulta: "Consulta",
    };

    return (
        rotulos[perfil]
        || textoSeguro(valor)
        || "Não informado"
    );
}

function nomeEmpresa(empresa = null) {
    return (
        textoSeguro(empresa?.nome)
        || textoSeguro(empresa?.razao_social)
        || textoSeguro(empresa?.nome_fantasia)
        || "Empresa sem nome"
    );
}

function descricaoModulo(modulo = null) {
    if (
        modulo?.obrigatorio === true
        || textoSeguro(modulo?.status).toLowerCase() === "core"
    ) {
        return "Núcleo SafeScan";
    }

    return "Contratado";
}

function CartaoResumo({
    icone: Icone,
    titulo,
    valor,
    descricao,
}) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <Icone className="h-5 w-5" />
                </span>

                <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                        {titulo}
                    </p>

                    <p className="mt-1 break-words text-lg font-bold text-slate-950">
                        {valor}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                        {descricao}
                    </p>
                </div>
            </div>
        </article>
    );
}

export function ConfiguracoesTenant({
    empresasBanco = [],
    usuario = null,
    permissaoSistemaUsuario = null,
    modulosTenantRuntime = [],
}) {
    const {
        tenant,
        hostname,
        dominioCanonico,
    } =
        useTenantRuntimeContext();

    const empresas =
        Array.isArray(empresasBanco)
            ? empresasBanco
            : [];

    const modulosDisponiveis =
        (
            Array.isArray(modulosTenantRuntime)
                ? modulosTenantRuntime
                : []
        )
            .filter(
                (modulo) =>
                    modulo?.disponivel === true
            )
            .sort(
                (a, b) =>
                    textoSeguro(
                        a?.nome || a?.chave
                    ).localeCompare(
                        textoSeguro(
                            b?.nome || b?.chave
                        ),
                        "pt-BR"
                    )
            );

    const tenantNome =
        textoSeguro(tenant?.nome)
        || "Conta SafeScan";

    const tenantSlug =
        textoSeguro(tenant?.slug)
        || "não informado";

    const hostnameAtual =
        textoSeguro(hostname)
        || "não informado";

    const dominioPrincipal =
        textoSeguro(
            dominioCanonico?.hostname
        )
        || hostnameAtual;

    const nomeUsuario =
        textoSeguro(usuario?.nome)
        || textoSeguro(
            permissaoSistemaUsuario?.nome
        )
        || "Usuário do cliente";

    const emailUsuario =
        textoSeguro(usuario?.email)
        || textoSeguro(
            permissaoSistemaUsuario?.email
        )
        || "E-mail não informado";

    const perfilUsuario =
        nomePerfilAcesso(
            permissaoSistemaUsuario?.perfil
        );

    return (
        <div className="mx-auto w-full max-w-[1480px] space-y-5 px-4 pb-8 pt-1 sm:px-6">
            <section className="relative overflow-hidden rounded-[28px] border border-slate-800/10 bg-slate-950 shadow-sm">
                <img
                    src={dashboardHeroBackground}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-45"
                />

                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/30" />

                <div className="relative px-6 py-7 sm:px-8">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
                                SafeScan Brasil
                            </p>

                            <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">
                                Configurações da conta
                            </h1>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
                                Consulte as informações do seu ambiente, empresas vinculadas e recursos disponíveis no contrato.
                            </p>
                        </div>

                        <div className="inline-flex max-w-full items-center gap-2 self-start rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm lg:self-auto">
                            <Globe2 className="h-4 w-4 shrink-0 text-emerald-300" />

                            <span className="truncate">
                                {hostnameAtual}
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />

                    <div>
                        <h2 className="text-sm font-bold text-emerald-950">
                            Ambiente protegido por tenant
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-emerald-900/75">
                            Esta tela exibe somente informações do seu ambiente. Configurações técnicas globais da plataforma permanecem restritas à administração SafeScan.
                        </p>
                    </div>
                </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <CartaoResumo
                    icone={Building2}
                    titulo="Conta"
                    valor={tenantNome}
                    descricao={`Identificador: ${tenantSlug}`}
                />

                <CartaoResumo
                    icone={UserRound}
                    titulo="Perfil de acesso"
                    valor={perfilUsuario}
                    descricao={`${nomeUsuario} • ${emailUsuario}`}
                />

                <CartaoResumo
                    icone={Building2}
                    titulo="Empresas"
                    valor={String(empresas.length)}
                    descricao="Empresas disponíveis neste ambiente"
                />

                <CartaoResumo
                    icone={Blocks}
                    titulo="Módulos disponíveis"
                    valor={String(modulosDisponiveis.length)}
                    descricao="Núcleo e recursos contratados"
                />
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.05fr_1fr]">
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                            <Globe2 className="h-5 w-5" />
                        </span>

                        <div>
                            <h2 className="text-base font-bold text-slate-950">
                                Ambiente
                            </h2>

                            <p className="text-xs text-slate-500">
                                Identificação do ambiente contratado.
                            </p>
                        </div>
                    </div>

                    <dl className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-100">
                        <div className="grid gap-1 px-4 py-3 sm:grid-cols-[150px_1fr] sm:items-center">
                            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                Cliente
                            </dt>

                            <dd className="text-sm font-semibold text-slate-900">
                                {tenantNome}
                            </dd>
                        </div>

                        <div className="grid gap-1 px-4 py-3 sm:grid-cols-[150px_1fr] sm:items-center">
                            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                Host atual
                            </dt>

                            <dd className="break-all text-sm text-slate-700">
                                {hostnameAtual}
                            </dd>
                        </div>

                        <div className="grid gap-1 px-4 py-3 sm:grid-cols-[150px_1fr] sm:items-center">
                            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                Domínio principal
                            </dt>

                            <dd className="break-all text-sm text-slate-700">
                                {dominioPrincipal}
                            </dd>
                        </div>
                    </dl>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                            <UserRound className="h-5 w-5" />
                        </span>

                        <div>
                            <h2 className="text-base font-bold text-slate-950">
                                Acesso atual
                            </h2>

                            <p className="text-xs text-slate-500">
                                Identidade e perfil reconhecidos neste tenant.
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <div className="flex items-start gap-3">
                            <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" />

                            <div className="min-w-0">
                                <p className="font-bold text-slate-950">
                                    {nomeUsuario}
                                </p>

                                <p className="mt-1 break-all text-sm text-slate-600">
                                    {emailUsuario}
                                </p>

                                <span className="mt-3 inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800">
                                    {perfilUsuario}
                                </span>
                            </div>
                        </div>
                    </div>
                </article>
            </section>

            <section className="grid gap-5 xl:grid-cols-2">
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-bold text-slate-950">
                                Empresas vinculadas
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                Empresas já disponíveis para este ambiente.
                            </p>
                        </div>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                            {empresas.length}
                        </span>
                    </div>

                    <div className="mt-4 space-y-2">
                        {empresas.length > 0 ? (
                            empresas.map(
                                (empresa, indice) => (
                                    <div
                                        key={
                                            textoSeguro(
                                                empresa?.id
                                            )
                                            || `${nomeEmpresa(empresa)}-${indice}`
                                        }
                                        className="flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-3"
                                    >
                                        <Building2 className="h-4 w-4 shrink-0 text-slate-500" />

                                        <span className="min-w-0 truncate text-sm font-semibold text-slate-800">
                                            {nomeEmpresa(empresa)}
                                        </span>
                                    </div>
                                )
                            )
                        ) : (
                            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                                Nenhuma empresa vinculada foi disponibilizada neste ambiente.
                            </div>
                        )}
                    </div>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-bold text-slate-950">
                                Recursos disponíveis
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                Núcleo SafeScan e módulos contratados para esta conta.
                            </p>
                        </div>

                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                            {modulosDisponiveis.length}
                        </span>
                    </div>

                    <div className="mt-4 space-y-2">
                        {modulosDisponiveis.length > 0 ? (
                            modulosDisponiveis.map(
                                (modulo) => (
                                    <div
                                        key={textoSeguro(modulo?.chave)}
                                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <Blocks className="h-4 w-4 shrink-0 text-emerald-700" />

                                            <span className="truncate text-sm font-semibold text-slate-800">
                                                {
                                                    textoSeguro(modulo?.nome)
                                                    || textoSeguro(modulo?.chave)
                                                }
                                            </span>
                                        </div>

                                        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                                            {descricaoModulo(modulo)}
                                        </span>
                                    </div>
                                )
                            )
                        ) : (
                            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                                Nenhum módulo disponível foi informado pelo runtime.
                            </div>
                        )}
                    </div>
                </article>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex items-start gap-3">
                    <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" />

                    <div>
                        <h2 className="text-sm font-bold text-slate-900">
                            Configurações técnicas protegidas
                        </h2>

                        <p className="mt-1 text-sm leading-6 text-slate-600">
                            Limites globais, tokens, auditoria de sistema, Storage administrativo, provedores de e-mail, aparência global e manutenção da infraestrutura são administrados exclusivamente pela Conta Mestre SafeScan.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}