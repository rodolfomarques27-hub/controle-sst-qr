import { XCircle } from "lucide-react";
import { CarregandoTela } from "../CarregandoTela";

export function AppCarregandoSistema() {
    return (
        <CarregandoTela
            mensagem="Carregando sistema..."
            subtitulo="Validando sua sessão e preparando o ambiente."
            telaCheia
        />
    );
}

export function AppConsultaPublicaCarregando() {
    return (
        <CarregandoTela
            mensagem="Carregando consulta pública..."
            subtitulo="Verificando os dados públicos com segurança."
            telaCheia
        />
    );
}

export function AppConsultaPublicaErro({ mensagem }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
            <div className="w-full max-w-lg rounded-[2rem] bg-white p-8 text-center shadow-sm">
                <XCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
                <h1 className="text-xl font-bold text-slate-950">QR Code não encontrado</h1>
                <p className="mt-2 text-sm text-slate-500">
                    {mensagem || "Não foi possível localizar a consulta pública deste colaborador."}
                </p>
            </div>
        </div>
    );
}
