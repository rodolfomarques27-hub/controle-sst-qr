import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

const identificarEmpresa = (empresa) =>
    String(empresa?.id || empresa?.empresa_id || "").trim();

const nomeEmpresa = (empresa) =>
    String(empresa?.nome || empresa?.razao_social ||
        empresa?.nome_fantasia || "Empresa sem nome");

export function ModoEmergenciaQrEmpresaTenant({
    empresasBanco = [],
    supabaseClient,
}) {
    const empresas = Array.isArray(empresasBanco)
        ? empresasBanco.filter((empresa) => identificarEmpresa(empresa))
        : [];

    const [empresaId, setEmpresaId] = useState("");
    const [revisao, setRevisao] = useState(0);
    const [alterando, setAlterando] = useState(false);
    const [mensagem, setMensagem] = useState("");
    const [consulta, setConsulta] = useState({
        empresaId: "",
        carregando: false,
        modo: "",
        emergenciaAtiva: false,
        erro: "",
    });

    useEffect(() => {
        if (!empresas.some((empresa) => identificarEmpresa(empresa) === empresaId)) {
            setEmpresaId(identificarEmpresa(empresas[0]));
        }
    }, [empresasBanco, empresaId]);

    useEffect(() => {
        let ativo = true;

        setConsulta({
            empresaId,
            carregando: Boolean(empresaId),
            modo: "",
            emergenciaAtiva: false,
            erro: "",
        });

        if (!empresaId || !supabaseClient) {
            return () => { ativo = false; };
        }

        supabaseClient.rpc(
            "consultar_modo_emergencia_qr_empresa",
            { p_empresa_id: empresaId }
        ).then(({ data, error }) => {
            if (!ativo) return;

            const valido =
                !error &&
                data?.ok === true &&
                ["empresa", "individual"].includes(data?.modo);

            setConsulta({
                empresaId,
                carregando: false,
                modo: valido ? data.modo : "",
                emergenciaAtiva: valido && data.emergenciaAtiva === true,
                erro: valido
                    ? ""
                    : error?.message || data?.mensagem ||
                      "Consulta indisponível ou acesso não autorizado.",
            });
        }).catch(() => {
            if (!ativo) return;

            setConsulta({
                empresaId,
                carregando: false,
                modo: "",
                emergenciaAtiva: false,
                erro: "Não foi possível consultar o modo de emergência.",
            });
        });

        return () => { ativo = false; };
    }, [empresaId, supabaseClient, revisao]);

    const pronto =
        consulta.empresaId === empresaId &&
        !consulta.carregando &&
        !consulta.erro &&
        Boolean(consulta.modo);

    async function alterarModo(destino) {
        if (
            !pronto ||
            !consulta.emergenciaAtiva ||
            alterando ||
            !["empresa", "individual"].includes(destino) ||
            destino === consulta.modo
        ) return;

        const confirmacao = destino === "individual"
            ? "Ativar PIN individual para esta empresa? O PIN empresarial deixará de liberar contatos QR."
            : "Recuperação administrativa: retornar ao PIN empresarial? " +
              "É necessário ter uma senha empresarial configurada. " +
              "Os PINs individuais deixarão de liberar contatos QR desta empresa. " +
              "Para reativar o modo individual, deverá existir um PIN individual ativo e elegível, com nova confirmação administrativa.";

        if (!window.confirm(confirmacao)) return;

        setAlterando(true);
        setMensagem("");

        try {
            const { data, error } = await supabaseClient.rpc(
                "definir_modo_emergencia_qr_empresa",
                {
                    p_empresa_id: empresaId,
                    p_modo: destino,
                }
            );

            if (error || data?.ok !== true) {
                throw new Error(
                    error?.message || data?.mensagem ||
                    "Alteração administrativa não autorizada."
                );
            }

            setMensagem("Modo atualizado. Consultando o estado da empresa...");
            setRevisao((anterior) => anterior + 1);
        } catch (error) {
            setMensagem(error?.message || "Não foi possível alterar o modo.");
        } finally {
            setAlterando(false);
        }
    }

    return (
        <section id="config-modo-pin-emergencia" className="scroll-mt-24">
            <details
                name="configuracoes-tenant"
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
                <summary className="flex h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 text-left transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                    <span className="text-sm font-black text-slate-950 sm:text-base">
                        Modo do PIN de emergência por empresa
                    </span>
                    <ChevronDown
                        aria-hidden="true"
                        className="h-5 w-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
                    />
                </summary>

                <div className="space-y-4 border-t border-slate-100 bg-slate-50/40 p-4">
                    <p className="text-sm text-slate-600">
                        Escolha a empresa para consultar ou alterar a forma de acesso ao contato de emergência do QR Code.
                    </p>

                    <label className="block text-xs font-bold text-slate-700">
                        Empresa
                        <select
                            value={empresaId}
                            onChange={(evento) => {
                                setMensagem("");
                                setEmpresaId(evento.target.value);
                            }}
                            disabled={alterando || empresas.length === 0}
                            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800"
                        >
                            {empresas.length === 0 ? (
                                <option value="">Nenhuma empresa disponível</option>
                            ) : empresas.map((empresa) => (
                                <option key={identificarEmpresa(empresa)} value={identificarEmpresa(empresa)}>
                                    {nomeEmpresa(empresa)}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Modo de emergência atual
                        </p>
                        <p className="mt-2 text-lg font-black text-slate-900">
                            {!pronto
                                ? "Indisponível"
                                : consulta.modo === "individual"
                                  ? "PIN individual"
                                  : "PIN empresarial"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            {consulta.carregando
                                ? "Consultando configurações..."
                                : consulta.emergenciaAtiva
                                  ? "Emergência QR ativa"
                                  : "Emergência QR desativada ou não disponível"}
                        </p>
                    </div>

                    {consulta.erro ? (
                        <p role="alert" className="text-sm text-red-700">
                            {consulta.erro}
                        </p>
                    ) : null}

                    <div className="flex flex-wrap justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => alterarModo("individual")}
                            disabled={!pronto || !consulta.emergenciaAtiva || alterando || consulta.modo === "individual"}
                            className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Ativar PIN individual
                        </button>
                        <button
                            type="button"
                            onClick={() => alterarModo("empresa")}
                            disabled={!pronto || !consulta.emergenciaAtiva || alterando || consulta.modo === "empresa"}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Retornar ao PIN empresarial
                        </button>
                    </div>

                    {mensagem ? (
                        <p role="status" className="text-center text-sm text-slate-700">
                            {mensagem}
                        </p>
                    ) : null}

                    <p className="text-center text-xs leading-5 text-slate-500">
                        A mudança depende de autorização administrativa e das validações de segurança do servidor. Não há retorno automático ao PIN empresarial.
                    </p>
                </div>
            </details>
        </section>
    );
}