import React from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Database } from "lucide-react";
import { Card, Header } from "./commonComponents";

export function Requisitos() {
    const requisitos = [
        "Login com Supabase Auth.",
        "Colaboradores cadastrados no banco Supabase.",
        "Empresas criadas automaticamente no banco quando informadas no cadastro.",
        "Exclusão de colaboradores diretamente na tabela colaboradores.",
        "QR Code individual com link real de consulta e token aleatório, sem CPF ou dado sensível.",
        "Visualização dos documentos enviados por link temporário seguro do Supabase Storage.",
        "Próximo passo: salvar certificados dos colaboradores em Supabase Storage e tabela certificados.",
    ];

    const tabelas = [
        { nome: "empresas", campos: "id, nome, cnpj, responsavel, email, telefone, status, created_at" },
        { nome: "colaboradores", campos: "id, empresa_id, nome, funcao, matricula, token_qr, status, created_at" },
        { nome: "treinamentos", campos: "id, nome, categoria, validade_padrao_dias, obrigatorio, created_at" },
        { nome: "certificados", campos: "id, colaborador_id, treinamento_id, arquivo_url, data_realizacao, data_vencimento, status_validacao" },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header titulo="Roteiro técnico do projeto" subtitulo="Etapas para transformar este protótipo em sistema real." />

            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                <Card>
                    <h2 className="text-lg font-bold text-slate-950">Funcionalidades atuais</h2>

                    <div className="mt-4 space-y-3">
                        {requisitos.map((r, idx) => (
                            <div key={idx} className="flex gap-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                                <BadgeCheck className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                                <span>{r}</span>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card>
                    <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                        <Database className="h-5 w-5" />
                        Tabelas utilizadas
                    </h2>

                    <div className="mt-4 space-y-3">
                        {tabelas.map((t) => (
                            <div key={t.nome} className="rounded-3xl border border-slate-200 p-4">
                                <p className="font-bold text-slate-950">{t.nome}</p>
                                <p className="mt-1 text-xs text-slate-500">{t.campos}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </motion.div>
    );
}
