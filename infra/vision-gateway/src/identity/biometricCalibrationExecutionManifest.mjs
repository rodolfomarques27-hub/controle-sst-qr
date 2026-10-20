export const CALIBRATION_EXECUTION_PHASE =
    Object.freeze({
        CALIBRATION:
            "CALIBRATION",
    });

const ROOT_KEYS =
    new Set([
        "protocolVersion",
        "profileId",
        "datasetVersion",
        "phase",
        "environmentId",
        "participants",
    ]);

const PARTICIPANT_KEYS =
    new Set([
        "participantId",
        "sessions",
    ]);

const SESSION_KEYS =
    new Set([
        "sessionId",
        "startedAt",
        "completedAt",
        "samples",
    ]);

const SAMPLE_KEYS =
    new Set([
        "sampleId",
        "capturedAt",
        "captureConditionId",
        "deviceId",
    ]);

const RESULT_KEYS =
    Object.freeze([
        "manifestValid",
        "readyForCalibrationExecutionValidation",
        "warnings",
        "blockers",
    ]);

const OPAQUE_ID_PATTERN =
    /^[A-Za-z0-9._:|%+-]{1,256}$/;

const ISO_TIMESTAMP_PATTERN =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/;

const FORBIDDEN_KEY_PATTERN =
    /(name|nome|cpf|matricula|email|phone|telefone|image|imagem|photo|foto|frame|embedding|vector|score|threshold|token|secret|password|credential|biometric|template|cipher|face)/i;

class ManifestContractError extends Error {
    constructor(
        code,
    ) {
        super(
            code,
        );

        this.name =
            "ManifestContractError";

        this.code =
            code;
    }
}

function fail(
    code,
) {
    throw new ManifestContractError(
        code,
    );
}

function assertPlainObject(
    value,
) {
    if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(
            value,
        )
    ) {
        fail(
            "MANIFEST_INVALID",
        );
    }

    return value;
}

function assertExactKeys(
    value,
    allowed,
) {
    for (
        const key of
        Object.keys(
            value,
        )
    ) {
        if (
            FORBIDDEN_KEY_PATTERN.test(
                key,
            )
        ) {
            fail(
                "FORBIDDEN_FIELD",
            );
        }

        if (
            !allowed.has(
                key,
            )
        ) {
            fail(
                "EXTRA_FIELD",
            );
        }
    }

    for (
        const key of
        allowed
    ) {
        if (
            !Object.hasOwn(
                value,
                key,
            )
        ) {
            fail(
                "MISSING_FIELD",
            );
        }
    }
}

function normalizeOpaqueId(
    value,
) {
    if (
        typeof value !== "string"
    ) {
        fail(
            "OPAQUE_ID_INVALID",
        );
    }

    const normalized =
        value.trim();

    if (
        !OPAQUE_ID_PATTERN.test(
            normalized,
        )
    ) {
        fail(
            "OPAQUE_ID_INVALID",
        );
    }

    return normalized;
}

function parseIsoTimestamp(
    value,
) {
    if (
        typeof value !== "string"
    ) {
        fail(
            "TIMESTAMP_INVALID",
        );
    }

    const match =
        ISO_TIMESTAMP_PATTERN.exec(
            value,
        );

    if (!match) {
        fail(
            "TIMESTAMP_INVALID",
        );
    }

    const year =
        Number(
            match[1],
        );

    const month =
        Number(
            match[2],
        );

    const day =
        Number(
            match[3],
        );

    const hour =
        Number(
            match[4],
        );

    const minute =
        Number(
            match[5],
        );

    const second =
        Number(
            match[6],
        );

    const millisecond =
        Number(
            (
                match[7] ??
                ""
            ).padEnd(
                3,
                "0",
            ) ||
            "0",
        );

    if (
        month < 1 ||
        month > 12 ||
        hour > 23 ||
        minute > 59 ||
        second > 59
    ) {
        fail(
            "TIMESTAMP_INVALID",
        );
    }

    const maxDay =
        new Date(
            Date.UTC(
                year,
                month,
                0,
            ),
        ).getUTCDate();

    if (
        day < 1 ||
        day > maxDay
    ) {
        fail(
            "TIMESTAMP_INVALID",
        );
    }

    let offsetMinutes =
        0;

    if (
        match[8] !==
        "Z"
    ) {
        const sign =
            match[9] === "+"
                ? 1
                : -1;

        const offsetHours =
            Number(
                match[10],
            );

        const offsetMinutePart =
            Number(
                match[11],
            );

        if (
            offsetHours > 14 ||
            offsetMinutePart > 59 ||
            (
                offsetHours === 14 &&
                offsetMinutePart !== 0
            )
        ) {
            fail(
                "TIMESTAMP_INVALID",
            );
        }

        offsetMinutes =
            sign *
            (
                (
                    offsetHours *
                    60
                ) +
                offsetMinutePart
            );
    }

    const epochMs =
        Date.UTC(
            year,
            month - 1,
            day,
            hour,
            minute,
            second,
            millisecond,
        ) -
        (
            offsetMinutes *
            60_000
        );

    if (
        !Number.isFinite(
            epochMs,
        )
    ) {
        fail(
            "TIMESTAMP_INVALID",
        );
    }

    return Object.freeze({
        value,
        epochMs,
    });
}

function normalizeManifest(
    input,
) {
    const root =
        assertPlainObject(
            input,
        );

    assertExactKeys(
        root,
        ROOT_KEYS,
    );

    normalizeOpaqueId(
        root.protocolVersion,
    );

    normalizeOpaqueId(
        root.profileId,
    );

    normalizeOpaqueId(
        root.datasetVersion,
    );

    normalizeOpaqueId(
        root.environmentId,
    );

    if (
        root.phase !==
        CALIBRATION_EXECUTION_PHASE.CALIBRATION
    ) {
        fail(
            "PHASE_INVALID",
        );
    }

    if (
        !Array.isArray(
            root.participants,
        ) ||
        root.participants.length ===
            0
    ) {
        fail(
            "EMPTY_COLLECTION",
        );
    }

    const participantIds =
        new Set();

    const sessionIds =
        new Set();

    const sampleIds =
        new Set();

    for (
        const participant of
        root.participants
    ) {
        const participantSource =
            assertPlainObject(
                participant,
            );

        assertExactKeys(
            participantSource,
            PARTICIPANT_KEYS,
        );

        const participantId =
            normalizeOpaqueId(
                participantSource.participantId,
            );

        if (
            participantIds.has(
                participantId,
            )
        ) {
            fail(
                "DUPLICATE_PARTICIPANT_ID",
            );
        }

        participantIds.add(
            participantId,
        );

        if (
            !Array.isArray(
                participantSource.sessions,
            ) ||
            participantSource.sessions.length ===
                0
        ) {
            fail(
                "EMPTY_COLLECTION",
            );
        }

        for (
            const session of
            participantSource.sessions
        ) {
            const sessionSource =
                assertPlainObject(
                    session,
                );

            assertExactKeys(
                sessionSource,
                SESSION_KEYS,
            );

            const sessionId =
                normalizeOpaqueId(
                    sessionSource.sessionId,
                );

            if (
                sessionIds.has(
                    sessionId,
                )
            ) {
                fail(
                    "DUPLICATE_SESSION_ID",
                );
            }

            sessionIds.add(
                sessionId,
            );

            const startedAt =
                parseIsoTimestamp(
                    sessionSource.startedAt,
                );

            const completedAt =
                parseIsoTimestamp(
                    sessionSource.completedAt,
                );

            if (
                startedAt.epochMs >
                completedAt.epochMs
            ) {
                fail(
                    "SESSION_TIME_ORDER_INVALID",
                );
            }

            if (
                !Array.isArray(
                    sessionSource.samples,
                ) ||
                sessionSource.samples.length ===
                    0
            ) {
                fail(
                    "EMPTY_COLLECTION",
                );
            }

            for (
                const sample of
                sessionSource.samples
            ) {
                const sampleSource =
                    assertPlainObject(
                        sample,
                    );

                assertExactKeys(
                    sampleSource,
                    SAMPLE_KEYS,
                );

                const sampleId =
                    normalizeOpaqueId(
                        sampleSource.sampleId,
                    );

                if (
                    sampleIds.has(
                        sampleId,
                    )
                ) {
                    fail(
                        "DUPLICATE_SAMPLE_ID",
                    );
                }

                sampleIds.add(
                    sampleId,
                );

                normalizeOpaqueId(
                    sampleSource.captureConditionId,
                );

                normalizeOpaqueId(
                    sampleSource.deviceId,
                );

                const capturedAt =
                    parseIsoTimestamp(
                        sampleSource.capturedAt,
                    );

                if (
                    capturedAt.epochMs <
                        startedAt.epochMs ||
                    capturedAt.epochMs >
                        completedAt.epochMs
                ) {
                    fail(
                        "SAMPLE_TIME_OUTSIDE_SESSION",
                    );
                }
            }
        }
    }

    return true;
}

function frozenResult({
    manifestValid,
    readyForCalibrationExecutionValidation,
    warnings,
    blockers,
}) {
    const result =
        {
            manifestValid,
            readyForCalibrationExecutionValidation,
            warnings:
                Object.freeze([
                    ...warnings,
                ]),
            blockers:
                Object.freeze([
                    ...blockers,
                ]),
        };

    if (
        Object.keys(
            result,
        ).length !==
        RESULT_KEYS.length
    ) {
        throw new Error(
            "resultado de manifest invalido.",
        );
    }

    return Object.freeze(
        result,
    );
}

export function evaluateBiometricCalibrationExecutionManifest(
    input,
) {
    try {
        normalizeManifest(
            input,
        );

        return frozenResult({
            manifestValid:
                true,

            readyForCalibrationExecutionValidation:
                true,

            warnings:
                [],

            blockers:
                [],
        });
    }
    catch (error) {
        const code =
            error instanceof
                ManifestContractError
                ? error.code
                : "MANIFEST_INVALID";

        return frozenResult({
            manifestValid:
                false,

            readyForCalibrationExecutionValidation:
                false,

            warnings:
                [],

            blockers:
                [
                    code,
                ],
        });
    }
}
