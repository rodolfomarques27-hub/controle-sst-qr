import { useEffect, useRef, useState } from "react";
import {
    cameraCapturePreviewOptions,
    getCameraCaptureGuidance,
    getCameraCaptureGuidanceFromResult,
} from "../cameraCaptureGuidance.mjs";
import { cameraIaSyntheticResultChannel } from "../cameraIaSyntheticResultChannel.mjs";

export function CameraIaCaptureGuidance({ status, result }) {
    if (result === undefined && status == null) return null;

    const guidance =
        result === undefined
            ? getCameraCaptureGuidance(status)
            : getCameraCaptureGuidanceFromResult(result);

    const appearance = guidance.success
        ? "border-emerald-200 bg-emerald-50 text-emerald-950"
        : "border-amber-200 bg-amber-50 text-amber-950";

    return (
        <div role="status" aria-live="polite" className={`mt-4 rounded-xl border p-4 ${appearance}`}>
            <div className="flex items-start gap-3">
                <span aria-hidden="true" className="text-xl">
                    {guidance.success ? "✓" : "!"}
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{guidance.title}</p>
                    <p className="mt-1 text-sm leading-relaxed">{guidance.instruction}</p>
                </div>
            </div>
        </div>
    );
}

export function CameraIaGuidancePreview() {
    const [status, setStatus] = useState("NO_FACE");

    const [receivedResult, setReceivedResult] = useState(null);
    const [receivedSequence, setReceivedSequence] = useState(0);

    const sequenceTimerRef = useRef(null);
    const [sequenceRunning, setSequenceRunning] = useState(false);

    useEffect(() => {
        const unsubscribe = cameraIaSyntheticResultChannel.subscribe(
            (result) => {
                setReceivedResult(result);
                setReceivedSequence((current) => current + 1);
            }
        );

        return () => {
            unsubscribe();

            if (sequenceTimerRef.current !== null) {
                globalThis.clearInterval(sequenceTimerRef.current);
                sequenceTimerRef.current = null;
            }
        };
    }, []);

    function emitSyntheticStatus(nextStatus) {
        return cameraIaSyntheticResultChannel.publish({
            accepted: nextStatus === "CAPTURED",
            status: nextStatus,
        });
    }

    function sendSyntheticResult() {
        emitSyntheticStatus(status);
    }

    function stopSyntheticSequence() {
        if (sequenceTimerRef.current !== null) {
            globalThis.clearInterval(sequenceTimerRef.current);
            sequenceTimerRef.current = null;
        }

        setSequenceRunning(false);
    }

    function startSyntheticSequence() {
        if (sequenceTimerRef.current !== null) return;

        const steps = [
            "NO_FACE",
            "MULTIPLE_FACES",
            "ALIGNMENT_FAILED",
            "EMBEDDING_FAILED",
            "CAPTURED",
        ];

        let nextIndex = 0;

        const publishNext = () => {
            emitSyntheticStatus(steps[nextIndex]);
            nextIndex += 1;

            if (nextIndex >= steps.length) {
                stopSyntheticSequence();
            }
        };

        setSequenceRunning(true);
        publishNext();

        if (nextIndex < steps.length) {
            sequenceTimerRef.current = globalThis.setInterval(
                publishNext,
                1400
            );
        }
    }

    const activeButtonClass =
        status === "CAPTURED"
            ? activeButtonClass
            : "rounded-lg border border-amber-700 bg-amber-700 px-3 py-2 text-xs font-semibold text-white";

    return (
        <section aria-label="Prévia das orientações de captura facial" className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="text-base font-bold text-slate-900">
                        Orientações de captura facial
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                        Visualize como o operador receberá as orientações.
                    </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    Simulação · sem câmera real
                </span>
            </div>

            <div aria-label="Cenários de captura" className="mt-4 flex flex-wrap gap-2">
                {cameraCapturePreviewOptions.map((option) => (
                    <button
                        key={option.status}
                        type="button"
                        aria-pressed={status === option.status}
                        onClick={() => setStatus(option.status)}
                        className={
                            status === option.status
                                ? activeButtonClass
                                : "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        }
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            <CameraIaCaptureGuidance status={status} />

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">
                            Resultado recebido pelo adaptador
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">
                            Envie manualmente ou execute uma sequência automática pelo canal local. Sem câmera ou conexão ao Gateway.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={sendSyntheticResult}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                    >
                        Enviar resultado sintético
                    </button>
                    <button
                        type="button"
                        onClick={
                            sequenceRunning
                                ? stopSyntheticSequence
                                : startSyntheticSequence
                        }
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                    >
                        {sequenceRunning
                            ? "Interromper sequência"
                            : "Executar sequência automática"}
                    </button>
                </div>

                {receivedResult === null ? (
                    <p role="status" className="mt-3 text-xs text-slate-500">
                        Aguardando resultado sintético.
                    </p>
                ) : (
                    <div>
                        <p className="mt-3 text-xs font-semibold text-slate-600">
                            Resultado sintético {receivedSequence} recebido — status: {receivedResult.status}
                        </p>
                        <CameraIaCaptureGuidance result={receivedResult} />
                    </div>
                )}
            </div>
            <p className="mt-3 text-xs text-slate-500">
                Os exemplos não acionam reconhecimento facial nem liberam acesso.
            </p>
        </section>
    );
}
