import {
    ArrowRight,
    Building2,
} from "lucide-react";

import {
    useState,
} from "react";

import {
    AccessEntryShell,
} from "../../components/access/AccessEntryShell.jsx";

const SLUGS_RESERVADOS =
    new Set([
        "www",
        "app",
        "admin",
        "api",
        "qr",
        "status",
        "assets",
        "static",
        "auth",
    ]);

function normalizarIdentificadorEmpresa(
    valor = ""
) {
    return String(
        valor || ""
    )
        .trim()
        .toLowerCase();
}

function identificadorEmpresaValido(
    valor = ""
) {
    const slug =
        normalizarIdentificadorEmpresa(
            valor
        );

    if (
        !slug ||
        SLUGS_RESERVADOS.has(
            slug
        )
    ) {
        return false;
    }

    return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(
        slug
    );
}

function criarUrlTenant(
    slug
) {
    return (
        "https://" +
        slug +
        ".safescanbrasil.com.br/"
    );
}

export function AccessPortalPage() {
    const [
        identificador,
        setIdentificador,
    ] =
        useState("");

    const [
        erro,
        setErro,
    ] =
        useState("");

    function acessarAmbiente(
        event
    ) {
        event.preventDefault();

        const slug =
            normalizarIdentificadorEmpresa(
                identificador
            );

        if (
            !identificadorEmpresaValido(
                slug
            )
        ) {
            setErro(
                "Informe o identificador válido fornecido pela sua empresa."
            );

            return;
        }

        setErro("");

        window.location.assign(
            criarUrlTenant(
                slug
            )
        );
    }

    function voltarAoSite() {
        window.location.assign(
            "/"
        );
    }

    return (
        <AccessEntryShell
            titulo="Acesse o ambiente da sua empresa"
            descricao="Informe o identificador recebido da sua empresa para acessar o ambiente correto."
            lateralRotulo="Portal"
            lateralTexto="Acesso de clientes"
            rodape="Cada empresa possui ambiente, identidade e dados isolados no SafeScan."
        >
            <form
                className="space-y-2.5"
                onSubmit={acessarAmbiente}
            >
                <div className="space-y-2">
                    <label
                        htmlFor="tenant-slug"
                        className="block text-xs font-medium text-slate-200/85"
                    >
                        Identificador da empresa
                    </label>

                    <div className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.035] px-3.5 py-2.5 transition focus-within:border-emerald-400/40 focus-within:bg-white/[0.05] focus-within:ring-2 focus-within:ring-emerald-400/10">
                        <Building2 className="h-4 w-4 shrink-0 text-slate-500" />

                        <input
                            id="tenant-slug"
                            type="text"
                            autoComplete="organization"
                            spellCheck="false"
                            value={identificador}
                            onChange={
                                (event) => {
                                    setIdentificador(
                                        event.target.value
                                    );

                                    if (erro) {
                                        setErro("");
                                    }
                                }
                            }
                            placeholder="identificador-da-empresa"
                            className="w-full bg-transparent text-[13px] font-medium text-slate-100 outline-none placeholder:text-slate-500/80"
                        />
                    </div>
                </div>

                {erro ? (
                    <div
                        role="alert"
                        className="rounded-lg border border-red-400/15 bg-red-400/[0.07] px-3 py-2.5 text-[11px] font-medium leading-[1rem] text-red-100/85"
                    >
                        {erro}
                    </div>
                ) : null}

                <button
                    type="submit"
                    disabled={
                        !String(
                            identificador || ""
                        ).trim()
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-950/20 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 disabled:cursor-not-allowed disabled:bg-white/[0.07] disabled:text-white/30 disabled:shadow-none"
                >
                    Continuar para meu ambiente

                    <ArrowRight className="h-4 w-4" />
                </button>

                <button
                    type="button"
                    onClick={voltarAoSite}
                    className="flex w-full items-center justify-center rounded-lg border border-white/10 bg-white/[0.025] px-4 py-2.5 text-xs font-semibold text-slate-300/75 transition hover:bg-white/[0.055] hover:text-white"
                >
                    Voltar ao site SafeScan
                </button>
            </form>
        </AccessEntryShell>
    );
}