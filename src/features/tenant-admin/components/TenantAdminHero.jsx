import dashboardHero from "../../../assets/dashboard-hero-sst.webp";

export function TenantAdminHero({
    titulo,
    subtitulo,
    eyebrow = "SAFESCAN BRASIL",
    acoes = null,
}) {
    return (
        <section
            className="relative isolate min-h-[clamp(154px,9.8vw,178px)] overflow-hidden rounded-[1.75rem] bg-[#071b14] text-white shadow-sm"
            style={{
                backgroundImage:
                    `linear-gradient(90deg, rgba(4, 22, 16, 0.96) 0%, rgba(4, 28, 19, 0.88) 40%, rgba(4, 27, 18, 0.36) 72%, rgba(4, 20, 15, 0.16) 100%), url(${dashboardHero})`,
                backgroundSize:
                    "cover",
                backgroundPosition:
                    "center 48%",
            }}
        >
            <div className="relative z-10 flex min-h-[clamp(154px,9.8vw,178px)] flex-col justify-center gap-5 px-7 py-6 sm:px-10 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-[760px]">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                        {eyebrow}
                    </p>

                    <h1 className="mt-2 text-[clamp(1.85rem,2.5vw,2.55rem)] font-black leading-[1.05] tracking-tight text-white drop-shadow-sm">
                        {titulo}
                    </h1>

                    <p className="mt-2 max-w-[720px] text-[clamp(0.78rem,0.9vw,0.92rem)] font-medium leading-6 text-slate-100/95">
                        {subtitulo}
                    </p>

                    <span
                        aria-hidden="true"
                        className="mt-4 block h-[3px] w-16 rounded-full bg-emerald-400"
                    />
                </div>

                {acoes ? (
                    <div className="flex shrink-0 items-center self-end lg:self-center">
                        {acoes}
                    </div>
                ) : null}
            </div>
        </section>
    );
}