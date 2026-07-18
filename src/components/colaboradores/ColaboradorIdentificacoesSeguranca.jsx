import { Flame, ShieldCheck } from "lucide-react";
import { obterIdentificacoesSegurancaColaborador } from "../../constants/treinamentosConstants";
import { classNames } from "../../utils/sstUtils";

export function ColaboradorIdentificacoesSeguranca({
    colaborador = {},
    avaliacao = {},
    treinamentos = [],
    compacto = false,
    className = "",
}) {
    const identificacoes = obterIdentificacoesSegurancaColaborador({
        colaborador,
        avaliacao,
        treinamentos,
    });

    const itens = [
        identificacoes.membroCipa
            ? {
                chave: "membro-cipa",
                rotulo: "Membro CIPA",
                Icon: ShieldCheck,
                classe: "border-emerald-200 bg-emerald-50 text-emerald-700",
            }
            : null,
        identificacoes.brigadista
            ? {
                chave: "brigadista",
                rotulo: "Brigadista",
                Icon: Flame,
                classe: "border-red-200 bg-red-50 text-red-700",
            }
            : null,
    ].filter(Boolean);

    if (!itens.length) return null;

    return (
        <div
            className={classNames(
                "flex flex-wrap items-center gap-1.5",
                className
            )}
            aria-label="Identificações especiais de segurança"
        >
            {itens.map(({ chave, rotulo, Icon, classe }) => (
                <span
                    key={chave}
                    data-colaborador-identificacao={chave}
                    className={classNames(
                        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border font-black uppercase tracking-wide shadow-sm",
                        compacto
                            ? "px-2 py-0.5 text-[9px]"
                            : "px-2.5 py-1 text-[10px]",
                        classe
                    )}
                >
                    <Icon className={compacto ? "h-3 w-3" : "h-3.5 w-3.5"} />
                    {rotulo}
                </span>
            ))}
        </div>
    );
}