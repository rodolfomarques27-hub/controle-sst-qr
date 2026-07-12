function normalizarPercentualStorage(valor) {
    const numero = Number(valor || 0);

    if (!Number.isFinite(numero)) {
        return 0;
    }

    return Math.max(0, Math.min(100, Math.round(numero)));
}

export function DashboardStorageMobile({
    titulo = "ARMAZENAMENTO",
    detalhe = "",
    percentual = 0,
    classeTamanho = "",
}) {
    const percentualNormalizado = normalizarPercentualStorage(percentual);
    const percentualDisponivel = Math.max(0, 100 - percentualNormalizado);
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
            data-safescan-storage="mobile"
            className={`safescan-storage-mobile-card relative flex h-[4.45rem] min-h-[4.45rem] w-full overflow-hidden rounded-[22px] border px-[0.55rem] py-[0.42rem] transition duration-200 lg:hidden ${classeTamanho}`}
            style={{
                borderColor: "#99f6e4",
                background: "linear-gradient(135deg, #f0fdfa 0%, #ffffff 78%)",
                boxShadow: "0 8px 18px rgba(13,148,136,0.11)",
            }}
            aria-label={`${titulo}: ${percentualNormalizado}% utilizado, ${percentualDisponivel}% disponível`}
        >
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-teal-400 to-blue-500" />

            <div className="flex min-h-0 flex-1 items-center justify-start gap-2">
                <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center"
                    style={{ transform: "translateY(3px)" }}
                >
                    <div
                        className="relative flex h-[2.55rem] w-[2.55rem] flex-col items-center justify-center rounded-full"
                        style={{ background: fundoAnel }}
                    >
                        <span className="absolute inset-[3px] rounded-full bg-white" />

                        <strong className="relative z-10 text-[0.78rem] font-black leading-[0.9] text-slate-950">
                            {percentualNormalizado}%
                        </strong>

                        <span className="relative z-10 mt-[0.08rem] text-[0.38rem] font-bold lowercase leading-none text-slate-500">
                            utilizado
                        </span>
                    </div>
                </div>

                <div className="min-w-0 flex-1 border-l border-slate-300/50 pl-[0.45rem] text-left">
                    <h3 className="whitespace-nowrap text-[0.55rem] font-black uppercase leading-none tracking-[0.02em] text-slate-900">
                        {titulo}
                    </h3>

                    <p className="mt-[0.18rem] whitespace-nowrap text-[0.51rem] font-extrabold leading-none text-teal-700">
                        {detalhe}
                    </p>

                    <p className="mt-[0.12rem] whitespace-nowrap text-[0.46rem] font-black leading-none text-teal-700">
                        {percentualDisponivel}% disponível
                    </p>
                </div>
            </div>
        </article>
    );
}
