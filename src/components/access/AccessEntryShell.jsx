import accessBackground
    from "../../assets/nova-auditoria-hero-bg.webp";

export function AccessEntryShell({
    titulo,
    descricao,
    children,
    lateralRotulo = "Acesso",
    lateralTexto = "",
    rodape = "",
}) {
    return (
        <div className="relative min-h-screen overflow-hidden bg-slate-950">
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                    backgroundImage: `
                        linear-gradient(
                            135deg,
                            rgba(2, 6, 23, 0.38),
                            rgba(2, 6, 23, 0.22)
                        ),
                        url("${accessBackground}")
                    `,
                }}
            />

            <div className="pointer-events-none absolute inset-0 bg-slate-950/10" />

            <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-5 sm:px-6 lg:px-8">
                <div className="w-full max-w-[720px] overflow-hidden rounded-[1.2rem] border border-white/10 bg-slate-950/72 shadow-xl shadow-black/35 backdrop-blur-[2px]">
                    <div className="grid lg:min-h-[360px] lg:grid-cols-[70%_30%]">
                        <section className="flex items-center bg-slate-950/72 px-4 py-4 sm:px-4 sm:py-5 lg:px-5">
                            <div className="mx-auto w-full max-w-[352px]">
                                <div className="mb-3">
                                    <h1 className="text-[1.45rem] font-semibold leading-tight tracking-tight text-white">
                                        {titulo}
                                    </h1>

                                    <p className="mt-1 max-w-sm text-[12px] font-normal leading-[1.15rem] text-slate-300/70">
                                        {descricao}
                                    </p>
                                </div>

                                {children}

                                {rodape ? (
                                    <div className="mt-3 border-t border-white/[0.07] pt-2.5">
                                        <p className="text-center text-[9px] font-normal leading-4 text-slate-300/45">
                                            {rodape}
                                        </p>
                                    </div>
                                ) : null}
                            </div>
                        </section>

                        <aside className="relative hidden overflow-hidden border-l border-white/10 bg-gradient-to-br from-emerald-950/70 via-emerald-900/62 to-slate-950/68 lg:flex lg:items-center lg:justify-center">
                            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-300/10 blur-3xl" />

                            <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-teal-200/10 blur-3xl" />

                            <div className="relative z-10 flex w-full max-w-[150px] flex-col items-center px-3 text-center">
                                <span className="whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.1em] text-emerald-100/60">
                                    Sistema
                                </span>

                                <div className="flex h-[100px] w-[132px] items-center justify-center">
                                    <img
                                        src="/brand/safescan-brasil-login.png"
                                        alt="SafeScan Brasil"
                                        className="max-h-[96px] max-w-[128px] object-contain"
                                    />
                                </div>

                                <div className="my-3 h-px w-12 bg-white/10" />

                                <span className="whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.1em] text-emerald-100/60">
                                    {lateralRotulo}
                                </span>

                                <p className="mt-2 max-w-[130px] text-[11px] font-semibold leading-4 text-white/85">
                                    {lateralTexto}
                                </p>
                            </div>
                        </aside>
                    </div>
                </div>
            </main>
        </div>
    );
}