import { CardRecolhivel } from "../commonComponents";
import { classNames, normalizarTextoBusca } from "../../utils/sstUtils";

export function AuditoriaAtividades({
    ultimosAcessosAuditoria = [],
    ultimosEmailsAuditoria = [],
}) {
    return (
        <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <CardRecolhivel
                titulo="Últimos acessos"
                subtitulo="Entradas recentes, consultas públicas e abertura da Auditoria."
                contador={ultimosAcessosAuditoria.length}
                defaultOpen={false}
            >
                <div className="space-y-2">
                    {ultimosAcessosAuditoria.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                            Nenhum acesso registrado ainda.
                        </div>
                    )}

                    {ultimosAcessosAuditoria.map((item) => {
                        const origemAcesso = item.dados?.origemAcesso || {};

                        return (
                            <div key={item.id} className="rounded-2xl bg-slate-50 p-3 text-sm ring-1 ring-slate-100">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-semibold text-slate-950">{item.usuario_email || "Sistema / consulta pública"}</p>
                                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200">
                                        {item.acao || "ACESSO"}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                    {item.created_at ? new Date(item.created_at).toLocaleString("pt-BR") : "-"}
                                    {origemAcesso.navegador ? ` · ${origemAcesso.navegador}` : ""}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </CardRecolhivel>

            <CardRecolhivel
                titulo="Últimos e-mails enviados"
                subtitulo="Eventos de envio registrados pela auditoria do sistema."
                contador={ultimosEmailsAuditoria.length}
                defaultOpen={false}
            >
                <div className="space-y-2">
                    {ultimosEmailsAuditoria.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                            Nenhum envio de e-mail registrado ainda.
                        </div>
                    )}

                    {ultimosEmailsAuditoria.map((item) => (
                        <div key={item.id} className="rounded-2xl bg-slate-50 p-3 text-sm ring-1 ring-slate-100">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-semibold text-slate-950">{item.destinatario || "Destinatário não informado"}</p>
                                <span
                                    className={classNames(
                                        "rounded-full px-2 py-0.5 text-[10px] font-bold ring-1",
                                        normalizarTextoBusca(item.status_envio).includes("erro")
                                            ? "bg-red-50 text-red-700 ring-red-200"
                                            : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                    )}
                                >
                                    {item.status_envio || "E-mail"}
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                                {item.data_envio ? new Date(item.data_envio).toLocaleString("pt-BR") : "-"}
                                {item.enviado_por ? ` · por ${item.enviado_por}` : ""}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                                {item.assunto || "Sem assunto"}
                                {item.documento ? ` · ${item.documento}` : ""}
                            </p>
                            {item.erro && <p className="mt-1 text-xs font-semibold text-red-700">Erro: {item.erro}</p>}
                        </div>
                    ))}
                </div>
            </CardRecolhivel>
        </div>
    );
}
