import {
    useState,
} from "react";

import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Cloud,
    Globe2,
    LoaderCircle,
    Network,
    RefreshCw,
    Server,
    ShieldCheck,
    Wifi,
} from "lucide-react";

import {
    diagnosticarInfraestruturaGlobalService,
} from "../services/tenantAdminInfrastructureService.js";

function StatusBadge({
    ok,
    pendente = false,
    children,
}) {
    const classes =
        ok
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : pendente
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-slate-200 bg-slate-50 text-slate-600";

    return (
        <span
            className={
                `inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${classes}`
            }
        >
            {children}
        </span>
    );
}

function InfraCard({
    Icone,
    titulo,
    valor,
    detalhe,
    ok,
    pendente,
    statusLabel,
}) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Icone className="h-5 w-5" />
                </div>

                <StatusBadge
                    ok={ok}
                    pendente={pendente}
                >
                    {statusLabel ?? (
                        ok
                            ? "OK"
                            : pendente
                                ? "Pendente"
                                : "Aguardando"
                    )}
                </StatusBadge>
            </div>

            <p className="mt-4 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                {titulo}
            </p>

            <p className="mt-1 text-lg font-bold text-slate-950">
                {valor}
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-500">
                {detalhe}
            </p>
        </article>
    );
}

function HostRow({
    item,
}) {
    return (
        <div className="grid gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 sm:grid-cols-[1.25fr_0.65fr_1.5fr_0.7fr] sm:items-center">
            <div>
                <p className="break-all font-mono text-xs font-semibold text-slate-800">
                    {item.hostname}
                </p>
            </div>

            <div>
                <StatusBadge
                    ok={
                        item.dnsOk
                    }
                >
                    {item.dnsOk
                        ? "DNS OK"
                        : "Sem DNS"}
                </StatusBadge>
            </div>

            <div className="min-w-0">
                <p className="break-all font-mono text-[11px] leading-5 text-slate-500">
                    {item.valores.length
                        ? item.valores.join(
                            ", "
                        )
                        : "Nenhuma resposta"}
                </p>
            </div>

            <div>
                <StatusBadge
                    ok={
                        item.https?.ok ===
                        true
                    }
                    pendente={
                        item.https?.ok !==
                        true
                    }
                >
                    {item.https?.ok
                        ? "HTTPS OK"
                        : "HTTPS pendente"}
                </StatusBadge>
            </div>
        </div>
    );
}

export function TenantAdminInfrastructurePage() {
    const [
        carregando,
        setCarregando,
    ] =
        useState(false);

    const [
        diagnostico,
        setDiagnostico,
    ] =
        useState(null);

    const [
        erro,
        setErro,
    ] =
        useState("");

    async function diagnosticar() {
        if (carregando) {
            return;
        }

        setCarregando(
            true
        );

        setErro("");

        try {
            const resultado =
                await diagnosticarInfraestruturaGlobalService();

            setDiagnostico(
                resultado
            );
        }
        catch (error) {
            setDiagnostico(
                null
            );

            setErro(
                error?.message ||
                "Não foi possível diagnosticar a infraestrutura."
            );
        }
        finally {
            setCarregando(
                false
            );
        }
    }

    const dnsCloudflare =
        diagnostico
            ?.dns
            ?.autoritativo ===
        "Cloudflare";

    const dnssecAtivo =
        diagnostico
            ?.dns
            ?.dnssecAtivo ===
        true;

    const wildcardAtivo =
        diagnostico
            ?.dns
            ?.wildcardAtivo ===
        true;

    const ativacaoPronta =
        diagnostico
            ?.ativacaoAutomatica
            ?.pronta ===
        true;

    const hosts =
        diagnostico
            ? Object.values(
                diagnostico.hosts
            )
            : [];

    return (
        <div>
            <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#071d15] via-[#083223] to-[#075c3c] text-white shadow-sm">
                <div className="flex flex-col gap-6 px-6 py-7 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Cloud className="h-5 w-5 text-emerald-300" />

                            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">
                                Infraestrutura global
                            </span>
                        </div>

                        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                            Domínios e ativação automática
                        </h1>

                        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                            Visão central da infraestrutura usada para publicar,
                            validar e ativar novos clientes SafeScan sem configuração
                            manual por empresa.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            diagnosticar
                        }
                        disabled={
                            carregando
                        }
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-400 disabled:cursor-wait disabled:bg-slate-500"
                    >
                        {carregando ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}

                        {carregando
                            ? "Diagnosticando..."
                            : "Diagnosticar infraestrutura"}
                    </button>
                </div>
            </section>

            <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <InfraCard
                    Icone={
                        Network
                    }
                    titulo="DNS autoritativo"
                    valor={
                        diagnostico
                            ?.dns
                            ?.autoritativo ||
                        "Não diagnosticado"
                    }
                    detalhe={
                        diagnostico
                            ? (
                                diagnostico
                                    .dns
                                    .nameservers
                                    .length
                                    ? diagnostico
                                        .dns
                                        .nameservers
                                        .join(
                                            " • "
                                        )
                                    : "Nenhum nameserver localizado."
                            )
                            : "Execute o diagnóstico para identificar quem responde pela zona."
                    }
                    ok={
                        dnsCloudflare
                    }
                    pendente={
                        Boolean(
                            diagnostico
                        ) &&
                        !dnsCloudflare
                    }
                />

                <InfraCard
                    Icone={
                        ShieldCheck
                    }
                    titulo="DNSSEC"
                    valor={
                        diagnostico
                            ? (
                                dnssecAtivo
                                    ? "Ativo"
                                    : "Não configurado"
                            )
                            : "Não diagnosticado"
                    }
                    detalhe={
                        diagnostico
                            ? (
                                dnssecAtivo
                                    ? "Registro DS publicado e detectado no domínio."
                                    : "Nenhum DS foi localizado. DNSSEC é opcional e não bloqueia wildcard DNS, HTTPS nem ativação automática."
                            )
                            : "A integridade DNSSEC será verificada sem alterar a zona."
                    }
                    ok={
                        dnssecAtivo
                    }
                    statusLabel={
                        diagnostico &&
                        !dnssecAtivo
                            ? "Opcional"
                            : undefined
                    }
                />

                <InfraCard
                    Icone={
                        Globe2
                    }
                    titulo="Wildcard de tenants"
                    valor={
                        diagnostico
                            ? (
                                wildcardAtivo
                                    ? "Ativo"
                                    : "Pendente"
                            )
                            : "Não diagnosticado"
                    }
                    detalhe={
                        diagnostico
                            ? (
                                wildcardAtivo
                                    ? `Hostname de prova: ${diagnostico.dns.wildcardHost}`
                                    : "Um hostname aleatório de tenant ainda não possui resposta DNS."
                            )
                            : "*.safescanbrasil.com.br será validado com hostname aleatório."
                    }
                    ok={
                        wildcardAtivo
                    }
                    pendente={
                        Boolean(
                            diagnostico
                        ) &&
                        !wildcardAtivo
                    }
                />

                <InfraCard
                    Icone={
                        Activity
                    }
                    titulo="Ativação automática"
                    valor={
                        diagnostico
                            ? (
                                ativacaoPronta
                                    ? "Pronta"
                                    : "Bloqueada"
                            )
                            : "Não diagnosticada"
                    }
                    detalhe={
                        diagnostico
                            ?.ativacaoAutomatica
                            ?.motivo ||
                        "Depende de wildcard e HTTPS disponíveis para os tenants."
                    }
                    ok={
                        ativacaoPronta
                    }
                    pendente={
                        Boolean(
                            diagnostico
                        ) &&
                        !ativacaoPronta
                    }
                />
            </section>

            {erro ? (
                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                    <div>
                        <p className="text-sm font-bold text-red-900">
                            Falha no diagnóstico
                        </p>

                        <p className="mt-1 text-xs leading-5 text-red-700">
                            {erro}
                        </p>
                    </div>
                </div>
            ) : null}

            <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">
                            Endereços públicos atuais
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                            Leitura pública dos registros que mantêm o SafeScan disponível.
                        </p>
                    </div>

                    {diagnostico ? (
                        <span className="text-[10px] font-semibold text-slate-400">
                            Última verificação:{" "}
                            {new globalThis.Date(
                                diagnostico.consultadoEm
                            ).toLocaleString(
                                "pt-BR"
                            )}
                        </span>
                    ) : null}
                </div>

                {diagnostico ? (
                    <div>
                        {hosts.map(
                            (item) => (
                                <HostRow
                                    key={
                                        item.hostname
                                    }
                                    item={
                                        item
                                    }
                                />
                            )
                        )}
                    </div>
                ) : (
                    <div className="flex min-h-[190px] items-center justify-center px-6">
                        <div className="text-center">
                            <Server className="mx-auto h-8 w-8 text-slate-300" />

                            <p className="mt-3 text-sm font-semibold text-slate-700">
                                Diagnóstico ainda não executado
                            </p>

                            <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">
                                Clique em “Diagnosticar infraestrutura” para consultar
                                DNS, DNSSEC e alcance HTTPS sem alterar nenhum serviço.
                            </p>
                        </div>
                    </div>
                )}
            </section>

            <section className="mt-5 grid gap-4 lg:grid-cols-2">
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Wifi className="h-5 w-5 text-emerald-700" />

                        <h2 className="text-sm font-bold text-slate-900">
                            Proxy de tenants
                        </h2>
                    </div>

                    <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-3.5">
                            <span className="text-xs font-semibold text-slate-600">
                                Worker SafeScan
                            </span>

                            <StatusBadge
                                ok={
                                    diagnostico
                                        ?.worker
                                        ?.validado ===
                                    true
                                }
                                pendente
                            >
                                {diagnostico
                                    ?.worker
                                    ?.validado
                                    ? "Validado"
                                    : "Validação pendente"}
                            </StatusBadge>
                        </div>

                        <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-3.5">
                            <span className="text-xs font-semibold text-slate-600">
                                HTTPS wildcard
                            </span>

                            <StatusBadge
                                ok={
                                    diagnostico
                                        ?.wildcard
                                        ?.httpsOk ===
                                    true
                                }
                                pendente
                            >
                                {diagnostico
                                    ?.wildcard
                                    ?.httpsOk
                                    ? "Disponível"
                                    : "Pendente"}
                            </StatusBadge>
                        </div>

                        <p className="text-xs leading-5 text-slate-500">
                            {diagnostico?.worker?.validado
                                ? "O Worker SafeScan e a rota wildcard estão operacionais. A disponibilidade continua sendo conferida pelo diagnóstico de DNS e HTTPS."
                                : diagnostico?.worker?.status ||
                                  "Execute o diagnóstico para validar o Worker e a rota wildcard."}
                        </p>
                    </div>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-700" />

                        <h2 className="text-sm font-bold text-slate-900">
                            Bootstrap global
                        </h2>
                    </div>

                    <div className="mt-4 space-y-3 text-xs">
                        <div className="flex gap-3 rounded-xl bg-emerald-50 p-3.5 text-emerald-800">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />

                            <span>
                                Motor de diagnóstico do Painel Mestre preparado.
                            </span>
                        </div>

                        <div className="flex gap-3 rounded-xl bg-emerald-50 p-3.5 text-emerald-800">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />

                            <span>
                                Proxy wildcard SafeScan publicado e operacional na Cloudflare.
                            </span>
                        </div>

                        <div className="flex gap-3 rounded-xl bg-emerald-50 p-3.5 text-emerald-800">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />

                            <span>
                                Migração autoritativa, wildcard DNS e rota do Worker concluídos.
                            </span>
                        </div>

                        <div className="flex gap-3 rounded-xl bg-amber-50 p-3.5 text-amber-800">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />

                            <span>
                                Ativação real de tenants permanece bloqueada.
                            </span>
                        </div>
                    </div>
                </article>
            </section>

            <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />

                    <div>
                        <p className="text-sm font-bold text-blue-900">
                            Diagnóstico somente leitura
                        </p>

                        <p className="mt-1 text-xs leading-5 text-blue-700">
                            Esta tela não possui credenciais de Cloudflare, Registro.br
                            ou Vercel e não executa alterações externas. O gerenciamento
                            real será feito posteriormente pelo backend SafeScan.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}