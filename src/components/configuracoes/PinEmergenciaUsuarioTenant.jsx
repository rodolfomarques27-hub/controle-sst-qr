import { useEffect, useState } from "react";
import { KeyRound, ChevronDown } from "lucide-react";
import { PasswordInput } from "../commonComponents";

export function PinEmergenciaUsuarioTenant({
    tenantId,
    supabaseClient,
    habilitado = true,
}) {
    const [usuarioId, setUsuarioId] = useState("");
    const [pin, setPin] = useState("");
    const [confirmacao, setConfirmacao] = useState("");
    const [ativo, setAtivo] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [mensagem, setMensagem] = useState("");
    const [erro, setErro] = useState("");

    const [statusMeuPin, setStatusMeuPin] = useState({
        tenantId: "",
        revisao: -1,
        dados: null,
    });

    const [erroStatusMeuPin, setErroStatusMeuPin] = useState({
        tenantId: "",
        revisao: -1,
        mensagem: "",
    });

    const [revisaoStatusMeuPin, setRevisaoStatusMeuPin] =
        useState(0);

    const [liberacao, setLiberacao] = useState({
        tenantId: "",
        usuarioId: "",
        habilitado: false,
    });

    const habilitadoSeguro =
        habilitado &&
        liberacao.habilitado &&
        liberacao.tenantId === tenantId &&
        liberacao.usuarioId === usuarioId;

    const statusMeuPinAtual =
        statusMeuPin.tenantId === tenantId &&
        statusMeuPin.revisao === revisaoStatusMeuPin
            ? statusMeuPin.dados
            : null;

    const erroStatusMeuPinAtual =
        erroStatusMeuPin.tenantId === tenantId &&
        erroStatusMeuPin.revisao === revisaoStatusMeuPin
            ? erroStatusMeuPin.mensagem
            : "";

    const carregandoStatusMeuPin =
        Boolean(
            tenantId &&
            habilitadoSeguro &&
            (
                statusMeuPin.tenantId !== tenantId ||
                statusMeuPin.revisao !== revisaoStatusMeuPin
            ) &&
            (
                erroStatusMeuPin.tenantId !== tenantId ||
                erroStatusMeuPin.revisao !== revisaoStatusMeuPin
            )
        );

    useEffect(() => {
        let montado = true;

        if (
            !tenantId ||
            !supabaseClient ||
            !habilitadoSeguro
        ) {
            return () => {
                montado = false;
            };
        }

        supabaseClient.rpc(
            "consultar_status_meu_pin_acesso",
            {
                p_tenant_id: tenantId,
            }
        ).then(({ data, error }) => {
            if (!montado) {
                return;
            }

            if (error) {
                throw error;
            }

            const registro =
                Array.isArray(data)
                    ? (data[0] ?? null)
                    : (data ?? null);

            setStatusMeuPin({
                tenantId,
                revisao: revisaoStatusMeuPin,
                dados: registro,
            });

            setErroStatusMeuPin({
                tenantId,
                revisao: revisaoStatusMeuPin,
                mensagem: "",
            });
        }).catch(() => {
            if (!montado) {
                return;
            }

            setErroStatusMeuPin({
                tenantId,
                revisao: revisaoStatusMeuPin,
                mensagem:
                    "Não foi possível consultar o status do Meu PIN.",
            });
        });

        return () => {
            montado = false;
        };
    }, [
        tenantId,
        supabaseClient,
        habilitadoSeguro,
        revisaoStatusMeuPin,
    ]);

    useEffect(() => {
        let montado = true;

        setLiberacao({
            tenantId: "",
            usuarioId: "",
            habilitado: false,
        });

        if (!tenantId || !usuarioId || !supabaseClient) {
            return () => { montado = false; };
        }

        supabaseClient.rpc(
            "consultar_estado_pin_emergencia_usuario",
            { p_tenant_id: tenantId }
        ).then(({ data, error }) => {
            if (!montado) return;

            setLiberacao({
                tenantId,
                usuarioId,
                habilitado:
                    !error &&
                    data?.ok === true &&
                    data?.habilitado === true,
            });
        }).catch(() => {
            if (!montado) return;

            setLiberacao({
                tenantId: "",
                usuarioId: "",
                habilitado: false,
            });
        });

        return () => { montado = false; };
    }, [tenantId, usuarioId, supabaseClient]);

    useEffect(() => {
        let montado = true;

        setUsuarioId("");

        if (!tenantId || !supabaseClient?.auth) {
            return () => { montado = false; };
        }

        supabaseClient.auth.getUser()
            .then(({ data, error }) => {
                if (!montado) return;
                if (error || !data?.user?.id) {
                    setErro("Não foi possível identificar o usuário autenticado.");
                    return;
                }
                setUsuarioId(data.user.id);
            })
            .catch(() => {
                if (montado) setErro("Falha na identificação do usuário.");
            });

        return () => { montado = false; };
    }, [tenantId, supabaseClient]);

    async function salvar(evento) {
        evento.preventDefault();
        setErro("");
        setMensagem("");

        if (!habilitadoSeguro || !usuarioId || !tenantId || salvando) return;

        if (ativo && (!/^[0-9]{6,10}$/.test(pin) || pin !== confirmacao)) {
            setErro("Informe e confirme um PIN numérico de 6 a 10 dígitos.");
            return;
        }

        setSalvando(true);

        try {
            const { data, error } = await supabaseClient.rpc(
                "definir_pin_emergencia_usuario",
                {
                    p_tenant_id: tenantId,
                    p_user_id: usuarioId,
                    p_pin: ativo ? pin : "",
                    p_ativo: ativo,
                }
            );

            if (error || data?.ok !== true) {
                throw new Error(data?.mensagem || error?.message || "Falha ao salvar PIN.");
            }

            setPin("");
            setConfirmacao("");
            setMensagem("PIN de acesso atualizado.");
            setRevisaoStatusMeuPin(
                (revisao) => revisao + 1
            );
        } catch {
            setErro("Não foi possível salvar o PIN individual. Confira a configuração do serviço.");
        } finally {
            setSalvando(false);
        }
    }

    return (
        <details name="configuracoes-tenant" className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <summary className="flex h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 text-left transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                <span className="text-sm font-black text-slate-950 sm:text-base">
                    Meu PIN de acesso
                </span>
                <ChevronDown aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-slate-100 bg-slate-50/40 p-3 sm:p-4">
                <p className="mb-4 text-sm text-slate-600">Configure seu PIN pessoal para liberar auditorias e vistorias protegidas pelo QR Code. O contato de emergência utiliza o PIN da empresa.</p>

                <div
                    aria-live="polite"
                    className="
                        mb-4
                        flex
                        flex-col
                        gap-3
                        rounded-xl
                        border
                        border-slate-200
                        bg-slate-50/70
                        px-4
                        py-3
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                    "
                >
                    <span
                        className="
                            text-xs
                            font-bold
                            uppercase
                            tracking-[0.08em]
                            text-slate-500
                        "
                    >
                        Status do Meu PIN
                    </span>

                    {
                        !habilitadoSeguro ? (
                            <span
                                className="
                                    inline-flex
                                    items-center
                                    rounded-full
                                    bg-amber-50
                                    px-3
                                    py-1.5
                                    text-xs
                                    font-bold
                                    text-amber-700
                                    ring-1
                                    ring-amber-200
                                "
                            >
                                Usuário não habilitado
                            </span>
                        ) : erroStatusMeuPinAtual ? (
                            <p
                                role="alert"
                                className="
                                    text-sm
                                    font-medium
                                    text-red-700
                                "
                            >
                                {erroStatusMeuPinAtual}
                            </p>
                        ) : carregandoStatusMeuPin ? (
                            <span
                                className="
                                    text-xs
                                    text-slate-500
                                "
                            >
                                Consultando status...
                            </span>
                        ) : statusMeuPinAtual ? (
                            <div
                                className="
                                    flex
                                    flex-wrap
                                    items-center
                                    gap-2
                                    sm:justify-end
                                "
                            >
                                <span
                                    className={`
                                        inline-flex
                                        items-center
                                        gap-2
                                        rounded-full
                                        px-3
                                        py-1.5
                                        text-xs
                                        font-bold
                                        ring-1
                                        ${
                                            statusMeuPinAtual.cadastrado
                                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                                : "bg-slate-100 text-slate-600 ring-slate-200"
                                        }
                                    `}
                                >
                                    <span
                                        className={`
                                            h-2
                                            w-2
                                            rounded-full
                                            ${
                                                statusMeuPinAtual.cadastrado
                                                    ? "bg-emerald-500"
                                                    : "bg-slate-400"
                                            }
                                        `}
                                    />

                                    {
                                        statusMeuPinAtual.cadastrado
                                            ? "PIN cadastrado"
                                            : "Sem PIN"
                                    }
                                </span>

                                {
                                    statusMeuPinAtual.cadastrado && (
                                        <span
                                            className={`
                                                inline-flex
                                                items-center
                                                rounded-full
                                                px-3
                                                py-1.5
                                                text-xs
                                                font-bold
                                                ring-1
                                                ${
                                                    statusMeuPinAtual.ativo
                                                        ? "bg-blue-50 text-blue-700 ring-blue-200"
                                                        : "bg-amber-50 text-amber-700 ring-amber-200"
                                                }
                                            `}
                                        >
                                            {
                                                statusMeuPinAtual.ativo
                                                    ? "PIN ativo"
                                                    : "PIN desativado"
                                            }
                                        </span>
                                    )
                                }

                                {
                                    statusMeuPinAtual.atualizado_em && (
                                        <span
                                            className="
                                                text-xs
                                                text-slate-500
                                            "
                                        >
                                            Atualizado{" "}
                                            {
                                                new Date(
                                                    statusMeuPinAtual.atualizado_em
                                                ).toLocaleString(
                                                    "pt-BR",
                                                    {
                                                        dateStyle: "short",
                                                        timeStyle: "short",
                                                    }
                                                )
                                            }
                                        </span>
                                    )
                                }
                            </div>
                        ) : (
                            <span
                                className="
                                    text-xs
                                    text-slate-500
                                "
                            >
                                Status não disponível
                            </span>
                        )
                    }
                </div>

            {!habilitadoSeguro && (
                <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                    Seu usuário ainda não está habilitado para cadastrar o PIN de acesso para auditorias neste ambiente.
                </p>
            )}

            <form onSubmit={salvar} className="mt-4 space-y-4">
                <label className="flex items-center gap-2 text-sm font-semibold">
                    <input
                        type="checkbox"
                        checked={ativo}
                        onChange={(event) => setAtivo(event.target.checked)}
                    />
                    PIN de acesso ativo
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2 text-sm font-semibold">
                        <span>Novo PIN</span>
                        <PasswordInput
                            value={pin}
                            onChange={(event) => setPin(event.target.value)}
                            disabled={!ativo || !habilitadoSeguro}
                            placeholder="6 a 10 dígitos"
                            autoComplete="new-password"
                            visibilityLabel="PIN"
                        />
                    </label>

                    <label className="space-y-2 text-sm font-semibold">
                        <span>Confirmar PIN</span>
                        <PasswordInput
                            value={confirmacao}
                            onChange={(event) => setConfirmacao(event.target.value)}
                            disabled={!ativo || !habilitadoSeguro}
                            placeholder="Repita o PIN"
                            autoComplete="new-password"
                            visibilityLabel="Confirmação do PIN"
                        />
                    </label>
                </div>

                {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
                {mensagem && <p role="status" className="text-sm text-emerald-700">{mensagem}</p>}

                <button
                    type="submit"
                    disabled={!habilitadoSeguro || !usuarioId || salvando}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
                >
                    <KeyRound className="h-4 w-4" />
                    {salvando ? "Salvando..." : "Salvar PIN de acesso"}
                </button>
            </form>
            </div>
        </details>
    );
}