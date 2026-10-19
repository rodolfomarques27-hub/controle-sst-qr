import { useEffect, useState } from "react";

import { CameraIaCaptureGuidance } from "./CameraIaCaptureGuidance.jsx";

import {
    createCameraIaOperationalSseClient,
} from "../cameraIaOperationalSseClient.mjs";

export function CameraIaOperationalGuidancePanel({
    enabled = false,
    cameraId = null,
    getAccessToken = null,
}) {
    const [session, setSession] = useState({
        cameraId: null,
        phase: "idle",
        result: null,
    });

    const configured =
        enabled === true &&
        typeof cameraId === "string" &&
        cameraId.length > 0 &&
        typeof getAccessToken === "function";

    useEffect(() => {
        if (!configured) {
            return undefined;
        }

        let active = true;
        const controller = new AbortController();

        const client = createCameraIaOperationalSseClient({
            getAccessToken,

            onResult(result) {
                if (!active || controller.signal.aborted) {
                    return;
                }

                setSession({
                    cameraId,
                    phase: "received",
                    result,
                });
            },
        });

        client.consume({
            cameraId,
            signal: controller.signal,
        }).then(() => {
            if (!active || controller.signal.aborted) {
                return;
            }

            setSession({
                cameraId,
                phase: "disconnected",
                result: null,
            });
        }).catch(() => {
            if (!active || controller.signal.aborted) {
                return;
            }

            setSession({
                cameraId,
                phase: "unavailable",
                result: null,
            });
        });

        return () => {
            active = false;
            controller.abort();
        };
    }, [configured, cameraId, getAccessToken]);

    const current =
        configured &&
        session.cameraId === cameraId
            ? session
            : null;

    const operationalResult =
        current?.phase === "received"
            ? current.result
            : null;

    let description =
        "Canal operacional desativado. Aguardando rota autenticada e permissao da camera.";

    if (configured && !current) {
        description =
            "Aguardando resultado da conexao operacional.";
    }
    else if (configured && current?.phase === "received") {
        description =
            "Resultado operacional recebido. Nao representa liberacao de acesso.";
    }
    else if (configured && current?.phase === "disconnected") {
        description =
            "A conexao operacional foi encerrada.";
    }
    else if (configured && current?.phase === "unavailable") {
        description =
            "Conexao operacional indisponivel. Nenhuma autorizacao foi concedida.";
    }

    return (
        <section
            aria-label="Canal operacional da Camera IA"
            className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-black text-slate-800">
                    Canal operacional
                </h3>

                <span
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600"
                >
                    {configured ? "Conexao configurada" : "Nao conectado"}
                </span>
            </div>

            <p
                role="status"
                aria-live="polite"
                className="mt-2 text-sm leading-relaxed text-slate-600"
            >
                {description}
            </p>

            {operationalResult && (
                <CameraIaCaptureGuidance result={operationalResult} />
            )}

            <p className="mt-3 text-xs text-slate-500">
                Este painel nao realiza reconhecimento, cadastro
                biometrico ou decisao de acesso.
            </p>
        </section>
    );
}
