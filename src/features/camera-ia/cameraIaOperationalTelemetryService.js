const UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STALE_AFTER_MS =
    15000;

function safeCount(
    value,
) {
    const number =
        Number(
            value,
        );

    return (
        Number.isSafeInteger(
            number,
        ) &&
        number >= 0 &&
        number <= 50
    )
        ? number
        : 0;
}

function safeConfidence(
    value,
) {
    const number =
        Number(
            value,
        );

    return (
        Number.isFinite(
            number,
        ) &&
        number >= 0 &&
        number <= 1
    )
        ? number
        : 0;
}

function safeFrameCount(
    value,
) {
    const number =
        Number(
            value,
        );

    return (
        Number.isSafeInteger(
            number,
        ) &&
        number >= 0
    )
        ? number
        : 0;
}

export function normalizarTelemetriaOperacionalCameraIa(
    row,
    now =
        Date.now(),
) {
    if (
        !row ||
        typeof row !==
            "object" ||
        Array.isArray(
            row,
        ) ||
        typeof row.camera_id !==
            "string" ||
        !row.camera_id ||
        typeof row.camera_nome !==
            "string" ||
        !row.camera_nome
    ) {
        return null;
    }

    const receivedAt =
        Date.parse(
            row.received_at ||
            "",
        );

    const observedAt =
        Date.parse(
            row.observed_at ||
            "",
        );

    if (
        !Number.isFinite(
            receivedAt,
        ) ||
        !Number.isFinite(
            observedAt,
        ) ||
        !Number.isSafeInteger(
            now,
        )
    ) {
        return null;
    }

    const age =
        now -
        receivedAt;

    const fresh =
        age >= 0 &&
        age <=
            STALE_AFTER_MS;

    const cameraStatus =
        fresh
            ? String(
                row.camera_status ||
                "NO_ACTIVE_SESSION",
            )
            : "OFFLINE";

    const framesRecent =
        fresh &&
        row.frames_recent ===
            true &&
        cameraStatus ===
            "FRAMES_RECENT";

    const measured =
        fresh &&
        row.ppe_status ===
            "PPE_DETECTED";

    return Object.freeze({
        cameraId:
            row.camera_id,

        cameraNome:
            row.camera_nome,

        cameraStatus,

        framesRecent,

        frameCount:
            safeFrameCount(
                row.frame_count,
            ),

        observedAt:
            new Date(
                observedAt,
            ).toISOString(),

        receivedAt:
            new Date(
                receivedAt,
            ).toISOString(),

        ppe:
            Object.freeze({
                status:
                    measured
                        ? "PPE_DETECTED"
                        : fresh
                            ? String(
                                row.ppe_status ||
                                "STALE",
                            )
                            : "STALE",

                personCount:
                    measured
                        ? safeCount(
                            row.person_count,
                        )
                        : 0,

                counts:
                    Object.freeze({
                        hardhat:
                            measured
                                ? safeCount(
                                    row.hardhat_count,
                                )
                                : 0,

                        noHardhat:
                            measured
                                ? safeCount(
                                    row.no_hardhat_count,
                                )
                                : 0,

                        vest:
                            measured
                                ? safeCount(
                                    row.vest_count,
                                )
                                : 0,

                        noVest:
                            measured
                                ? safeCount(
                                    row.no_vest_count,
                                )
                                : 0,

                        person:
                            measured
                                ? safeCount(
                                    row.person_count,
                                )
                                : 0,
                    }),

                maxConfidence:
                    Object.freeze({
                        hardhat:
                            measured
                                ? safeConfidence(
                                    row.hardhat_confidence,
                                )
                                : 0,

                        noHardhat:
                            measured
                                ? safeConfidence(
                                    row.no_hardhat_confidence,
                                )
                                : 0,

                        vest:
                            measured
                                ? safeConfidence(
                                    row.vest_confidence,
                                )
                                : 0,

                        noVest:
                            measured
                                ? safeConfidence(
                                    row.no_vest_confidence,
                                )
                                : 0,

                        person:
                            measured
                                ? safeConfidence(
                                    row.person_confidence,
                                )
                                : 0,
                    }),

                updatedAt:
                    measured
                        ? new Date(
                            observedAt,
                        ).toISOString()
                        : null,
            }),
    });
}

export async function carregarTelemetriaOperacionalCameraIa({
    supabase,
    empresaId,
} = {}) {
    if (
        !supabase ||
        typeof supabase
            .from !==
            "function" ||
        typeof empresaId !==
            "string" ||
        !UUID.test(
            empresaId,
        )
    ) {
        return null;
    }

    const {
        data,
        error,
    } =
        await supabase
            .from(
                "camera_ia_telemetria_operacional",
            )
            .select(
                [
                    "camera_id",
                    "camera_nome",
                    "camera_status",
                    "frames_recent",
                    "frame_count",
                    "ppe_status",
                    "person_count",
                    "hardhat_count",
                    "no_hardhat_count",
                    "vest_count",
                    "no_vest_count",
                    "person_confidence",
                    "hardhat_confidence",
                    "no_hardhat_confidence",
                    "vest_confidence",
                    "no_vest_confidence",
                    "observed_at",
                    "received_at",
                ].join(
                    ",",
                ),
            )
            .eq(
                "empresa_id",
                empresaId,
            )
            .order(
                "received_at",
                {
                    ascending:
                        false,
                },
            )
            .limit(
                1,
            )
            .maybeSingle();

    if (
        error ||
        !data
    ) {
        return null;
    }

    return normalizarTelemetriaOperacionalCameraIa(
        data,
    );
}