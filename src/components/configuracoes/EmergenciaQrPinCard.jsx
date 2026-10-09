import React, { useMemo, useState } from "react";
import { ChevronDown, Save } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { PasswordInput } from "../commonComponents";

function textoSeguro(valor = "") {
    return String(valor || "").trim();
}

function obterIdEmpresa(item = {}) {
    return textoSeguro(
        item.id ||
        item.empresa_id ||
        item.empresaId
    );
}

function obterNomeEmpresa(item = {}) {
    return textoSeguro(
        item.nome ||
        item.empresa_nome ||
        item.empresa ||
        "Empresa sem nome"
    );
}

function ordenarEmpresasEmergenciaQr(
    empresas = []
) {
    return [...(empresas || [])]
        .filter(
            (item) =>
                obterIdEmpresa(item)
        )
        .sort(
            (a, b) =>
                obterNomeEmpresa(a)
                    .localeCompare(
                        obterNomeEmpresa(b),
                        "pt-BR"
                    )
        );
}

export function EmergenciaQrPinCard({
    empresasBanco = [],
}) {
    const empresas =
        useMemo(
            () =>
                ordenarEmpresasEmergenciaQr(
                    empresasBanco
                ),
            [empresasBanco]
        );

    const [empresaId, setEmpresaId] =
        useState(
            () =>
                obterIdEmpresa(
                    empresas[0] || ""
                )
        );

    const [ativo, setAtivo] =
        useState(true);

    const [pin, setPin] =
        useState("");

    const [confirmarPin, setConfirmarPin] =
        useState("");

    const [salvando, setSalvando] =
        useState(false);

    const [mensagem, setMensagem] =
        useState("");

    const [erro, setErro] =
        useState("");

    React.useEffect(() => {
        if (
            !empresaId &&
            empresas.length > 0
        ) {
            setEmpresaId(
                obterIdEmpresa(
                    empresas[0]
                )
            );
        }
    }, [
        empresaId,
        empresas,
    ]);

    const salvarPinEmergencia =
        async () => {
            setErro("");
            setMensagem("");

            if (!empresaId) {
                setErro(
                    "Selecione a empresa para configurar o PIN."
                );

                return;
            }

            const pinTratado =
                textoSeguro(pin);

            const confirmarTratado =
                textoSeguro(
                    confirmarPin
                );

            if (ativo) {
                if (
                    pinTratado.length < 4
                ) {
                    setErro(
                        "Informe um PIN com pelo menos 4 caracteres."
                    );

                    return;
                }

                if (
                    pinTratado !==
                    confirmarTratado
                ) {
                    setErro(
                        "A confirmação do PIN não confere."
                    );

                    return;
                }
            }

            setSalvando(true);

            try {
                const {
                    data,
                    error: rpcError,
                } =
                    await supabase.rpc(
                        "definir_senha_emergencia_empresa",
                        {
                            p_empresa_id:
                                empresaId,

                            p_senha:
                                ativo
                                    ? pinTratado
                                    : "",

                            p_ativo:
                                ativo,
                        }
                    );

                if (rpcError) {
                    throw new Error(
                        rpcError.message ||
                        "Não foi possível salvar o PIN de emergência."
                    );
                }

                if (
                    data?.ok === false
                ) {
                    throw new Error(
                        data?.mensagem ||
                        "Não foi possível salvar o PIN de emergência."
                    );
                }

                setMensagem(
                    data?.mensagem ||
                    (
                        ativo
                            ? "PIN de emergência configurado/atualizado."
                            : "Contato de emergência desativado."
                    )
                );

                setPin("");
                setConfirmarPin("");
            }
            catch (error) {
                setErro(
                    error?.message ||
                    "Erro ao salvar PIN de emergência."
                );
            }
            finally {
                setSalvando(false);
            }
        };

    return (
        <details
            name="configuracoes-tenant"
            className="
                group
                overflow-hidden
                rounded-2xl
                border
                border-slate-200
                bg-white
                shadow-sm
            "
        >
            <summary
                className="
                    flex
                    h-14
                    cursor-pointer
                    list-none
                    items-center
                    justify-between
                    gap-4
                    px-5
                    text-left
                    transition
                    hover:bg-slate-50
                    [&::-webkit-details-marker]:hidden
                "
            >
                <span
                    className="
                        text-sm
                        font-black
                        text-slate-950
                        sm:text-base
                    "
                >
                    PIN de emergência da empresa
                </span>

                <ChevronDown
                    aria-hidden="true"
                    className="
                        h-5
                        w-5
                        shrink-0
                        text-slate-500
                        transition-transform
                        group-open:rotate-180
                    "
                />
            </summary>

            <div
                className="
                    border-t
                    border-slate-100
                    bg-slate-50/40
                    p-3
                    sm:p-4
                "
            >
                <p
                    className="
                        mb-4
                        text-sm
                        leading-relaxed
                        text-slate-600
                    "
                >
                    Configure um PIN para cada empresa.
                    Esse PIN será usado somente para
                    liberar o contato de emergência dos
                    colaboradores pelo QR Code.
                </p>

                <div
                    className="
                        grid
                        gap-4
                        lg:grid-cols-2
                    "
                >
                    <div
                        className="
                            space-y-4
                            rounded-2xl
                            border
                            border-slate-200
                            bg-white
                            p-4
                        "
                    >
                        <label
                            className="
                                block
                                space-y-2
                                text-sm
                                font-semibold
                            "
                        >
                            <span>
                                Empresa
                            </span>

                            <select
                                value={empresaId}
                                onChange={
                                    (
                                        event
                                    ) =>
                                        setEmpresaId(
                                            event.target.value
                                        )
                                }
                                className="
                                    h-12
                                    w-full
                                    rounded-xl
                                    border
                                    border-slate-200
                                    bg-white
                                    px-4
                                    text-sm
                                    font-semibold
                                    text-slate-900
                                    outline-none
                                    transition
                                    focus:border-slate-400
                                    focus:ring-2
                                    focus:ring-slate-200
                                "
                            >
                                {
                                    empresas.length === 0
                                        ? (
                                            <option
                                                value=""
                                            >
                                                Nenhuma empresa carregada
                                            </option>
                                        )
                                        : empresas.map(
                                            (
                                                empresa
                                            ) => (
                                                <option
                                                    key={
                                                        obterIdEmpresa(
                                                            empresa
                                                        )
                                                    }
                                                    value={
                                                        obterIdEmpresa(
                                                            empresa
                                                        )
                                                    }
                                                >
                                                    {
                                                        obterNomeEmpresa(
                                                            empresa
                                                        )
                                                    }
                                                </option>
                                            )
                                        )
                                }
                            </select>
                        </label>

                        <label
                            className="
                                flex
                                cursor-pointer
                                items-center
                                justify-between
                                gap-4
                                rounded-xl
                                border
                                border-slate-200
                                bg-slate-50
                                px-4
                                py-3
                            "
                        >
                            <span>
                                <span
                                    className="
                                        block
                                        text-sm
                                        font-semibold
                                        text-slate-900
                                    "
                                >
                                    Contato de emergência ativo
                                </span>

                                <span
                                    className="
                                        mt-1
                                        block
                                        text-xs
                                        leading-relaxed
                                        text-slate-500
                                    "
                                >
                                    Quando ativo, o QR solicita
                                    o PIN da empresa antes de
                                    mostrar nome, parentesco e
                                    telefone.
                                </span>
                            </span>

                            <input
                                type="checkbox"
                                checked={ativo}
                                onChange={
                                    (
                                        event
                                    ) =>
                                        setAtivo(
                                            event.target.checked
                                        )
                                }
                                className="
                                    h-5
                                    w-5
                                    shrink-0
                                    rounded
                                    border-slate-300
                                "
                            />
                        </label>
                    </div>

                    <div
                        className="
                            space-y-4
                            rounded-2xl
                            border
                            border-slate-200
                            bg-white
                            p-4
                        "
                    >
                        <div
                            className="
                                grid
                                gap-3
                                sm:grid-cols-2
                            "
                        >
                            <label
                                className="
                                    space-y-2
                                    text-sm
                                    font-semibold
                                "
                            >
                                <span>
                                    Novo PIN
                                </span>

                                <PasswordInput
                                    value={pin}
                                    onChange={
                                        (
                                            event
                                        ) =>
                                            setPin(
                                                event.target.value
                                            )
                                    }
                                    disabled={!ativo}
                                    placeholder="Mínimo 4 caracteres"
                                    autoComplete="new-password"
                                    visibilityLabel="PIN"
                                />
                            </label>

                            <label
                                className="
                                    space-y-2
                                    text-sm
                                    font-semibold
                                "
                            >
                                <span>
                                    Confirmar PIN
                                </span>

                                <PasswordInput
                                    value={
                                        confirmarPin
                                    }
                                    onChange={
                                        (
                                            event
                                        ) =>
                                            setConfirmarPin(
                                                event.target.value
                                            )
                                    }
                                    disabled={!ativo}
                                    placeholder="Repita o PIN"
                                    autoComplete="new-password"
                                    visibilityLabel="Confirmação do PIN"
                                />
                            </label>
                        </div>

                        {
                            erro && (
                                <p
                                    role="alert"
                                    className="
                                        rounded-xl
                                        bg-red-50
                                        p-3
                                        text-sm
                                        text-red-700
                                    "
                                >
                                    {erro}
                                </p>
                            )
                        }

                        {
                            mensagem && (
                                <p
                                    role="status"
                                    className="
                                        rounded-xl
                                        bg-emerald-50
                                        p-3
                                        text-sm
                                        text-emerald-700
                                    "
                                >
                                    {mensagem}
                                </p>
                            )
                        }

                        <button
                            type="button"
                            onClick={
                                salvarPinEmergencia
                            }
                            disabled={
                                salvando ||
                                !empresaId
                            }
                            className="
                                inline-flex
                                min-h-11
                                items-center
                                justify-center
                                gap-2
                                rounded-xl
                                bg-emerald-700
                                px-5
                                py-3
                                text-sm
                                font-bold
                                text-white
                                transition
                                hover:bg-emerald-800
                                disabled:cursor-not-allowed
                                disabled:opacity-40
                            "
                        >
                            <Save
                                className="
                                    h-4
                                    w-4
                                "
                            />

                            {
                                salvando
                                    ? "Salvando..."
                                    : ativo
                                        ? "Salvar PIN de emergência"
                                        : "Desativar contato de emergência"
                            }
                        </button>
                    </div>
                </div>
            </div>
        </details>
    );
}
