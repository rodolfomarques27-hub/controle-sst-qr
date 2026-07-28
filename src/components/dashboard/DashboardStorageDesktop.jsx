function normalizarPercentualStorage(valor) {
    const numero = Number(valor || 0);

    if (!Number.isFinite(numero)) {
        return 0;
    }

    return Math.max(0, Math.min(100, Math.round(numero)));
}

export function DashboardStorageDesktop({
    titulo = "ARMAZENAMENTO",
    detalhe = "",
    percentual = 0,
    classeTamanho = "",
    onClick,
}) {
    const percentualNormalizado = normalizarPercentualStorage(percentual);
    const angulo = Math.round((percentualNormalizado / 100) * 360);

    const fundoAnel = `conic-gradient(
        from 180deg,
        #10b981 0deg,
        #10b981 ${angulo}deg,
        #e2e8f0 ${angulo}deg,
        #e2e8f0 360deg
    )`;

    return (
        <article
            data-safescan-storage="desktop"
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(evento) => {
                if (evento.key === "Enter" || evento.key === " ") {
                    evento.preventDefault();
                    onClick?.();
                }
            }}
            title="Clique para ver o resumo do armazenamento"
            className={`safescan-storage-desktop-card relative hidden h-[5.5rem] min-h-[5.5rem] w-full cursor-pointer overflow-hidden rounded-[22px] border px-3 py-2 outline-none transition duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 lg:flex ${classeTamanho}`}
            style={{
                borderColor: "#99f6e4",
                background: "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(246,249,252,0.97) 100%)",
                boxShadow: "0 10px 26px rgba(26,35,50,0.08)",
            }}
            aria-label={`${titulo}: ${percentualNormalizado}% utilizado, ${detalhe}`}
        >
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-500" />

            <div className="flex min-h-0 flex-1 items-center justify-center gap-2">
                <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                    style={{
                        background: "rgba(248,250,252,0.98)",
                        boxShadow: "0 3px 9px rgba(15,118,110,0.12)",
                    }}
                >
                    <div
                        className="relative flex h-[2.45rem] w-[2.45rem] items-center justify-center rounded-full"
                        style={{ background: fundoAnel }}
                    >
                        <span className="absolute inset-[3px] rounded-full bg-white" />

                        <strong className="relative z-10 text-[11px] font-black leading-none text-slate-950">
                            {percentualNormalizado}%
                        </strong>
                    </div>
                </div>

                <div className="min-w-0 flex-1 text-center">
                    <h3 className="whitespace-nowrap text-[11px] font-black uppercase leading-none tracking-[0.055em] text-slate-900">
                        {titulo}
                    </h3>

                    <p className="mt-1.5 whitespace-nowrap text-[9px] font-semibold leading-none text-slate-500">
                        {detalhe}
                    </p>
                </div>
            </div>
        </article>
    );
}
