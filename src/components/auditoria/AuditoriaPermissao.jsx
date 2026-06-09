import React from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { Card, Header } from "../commonComponents";

export function AuditoriaAcessoNegado() {
    return (
        <div>
            <Header
                titulo="Acesso não autorizado"
                subtitulo="Seu usuário não possui permissão cadastrada no Supabase para acessar a Auditoria do Sistema."
            />

            <div className="mx-auto max-w-xl">
                <Card>
                    <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-700 ring-1 ring-red-100">
                            <Lock className="h-6 w-6" />
                        </div>

                        <div>
                            <h2 className="text-lg font-bold text-slate-950">Auditoria do Sistema restrita</h2>
                            <p className="mt-1 text-sm leading-relaxed text-slate-500">
                                Para liberar o acesso, o administrador deve habilitar este usuário em <strong>Permissões da Auditoria do Sistema</strong>.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}

export function AuditoriaBloqueada({ onLiberar }) {
    return (
        <div>
            <Header
                titulo="Auditoria do Sistema protegida"
                subtitulo="Área restrita para rastreabilidade, exclusões, uploads, alterações e eventos administrativos."
            />

            <div className="mx-auto max-w-xl">
                <Card>
                    <div className="mb-5 flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                            <Lock className="h-6 w-6" />
                        </div>

                        <div>
                            <h2 className="text-lg font-bold text-slate-950">Liberação obrigatória</h2>
                            <p className="mt-1 text-sm leading-relaxed text-slate-500">
                                Mesmo com usuário autorizado, confirme a liberação antes de visualizar os registros internos da Auditoria do Sistema.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onLiberar}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
                    >
                        <ShieldCheck className="h-4 w-4" />
                        Liberar Auditoria do Sistema
                    </button>
                </Card>
            </div>
        </div>
    );
}
