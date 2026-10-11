import {
    normalizeCollaboratorId,
} from "./identityReference.mjs";

export const IDENTITY_STATUS =
    Object.freeze({
        MATCH:
            "MATCH",
        LOW_CONFIDENCE:
            "LOW_CONFIDENCE",
        NO_MATCH:
            "NO_MATCH",
        NO_REFERENCE:
            "NO_REFERENCE",
        AMBIGUOUS:
            "AMBIGUOUS",
    });

export const IDENTITY_METHOD =
    Object.freeze({
        FACE:
            "FACE",
        QR:
            "QR",
        MANUAL:
            "MANUAL",
    });

export const IDENTITY_FALLBACK_METHOD =
    Object.freeze({
        QR:
            IDENTITY_METHOD.QR,
        MANUAL:
            IDENTITY_METHOD.MANUAL,
    });

const VALID_STATUSES =
    new Set(
        Object.values(
            IDENTITY_STATUS,
        ),
    );

function normalizeOpaqueString(
    value,
    name,
) {
    if (
        value === undefined ||
        value === null
    ) {
        throw new TypeError(
            `${name} e obrigatorio.`,
        );
    }

    const normalized =
        String(
            value,
        ).trim();

    if (!normalized) {
        throw new TypeError(
            `${name} deve ser uma string nao vazia.`,
        );
    }

    return normalized;
}

function normalizeConfidence(
    value,
) {
    if (
        typeof value !== "number" ||
        !Number.isFinite(
            value,
        ) ||
        value < 0 ||
        value > 1
    ) {
        throw new TypeError(
            "confidence deve estar entre 0 e 1.",
        );
    }

    return value;
}

function normalizeScore(
    value,
) {
    if (
        value === undefined ||
        value === null
    ) {
        return null;
    }

    if (
        typeof value !== "number" ||
        !Number.isFinite(
            value,
        )
    ) {
        throw new TypeError(
            "score deve ser numero finito ou null.",
        );
    }

    return value;
}

function normalizeReason(
    value,
) {
    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return null;
    }

    return String(
        value,
    ).trim() || null;
}

function normalizeStatus(
    value,
) {
    const normalized =
        normalizeOpaqueString(
            value,
            "status",
        );

    if (
        !VALID_STATUSES.has(
            normalized,
        )
    ) {
        throw new TypeError(
            `status de identidade invalido: ${normalized}`,
        );
    }

    return normalized;
}

export function createRecognitionCandidate({
    collaboratorId,
    confidence,
    score = null,
    referenceVersion,
} = {}) {
    return Object.freeze({
        collaboratorId:
            normalizeCollaboratorId(
                collaboratorId,
            ),
        confidence:
            normalizeConfidence(
                confidence,
            ),
        score:
            normalizeScore(
                score,
            ),
        referenceVersion:
            normalizeOpaqueString(
                referenceVersion,
                "referenceVersion",
            ),
        method:
            IDENTITY_METHOD.FACE,
    });
}

export function createFallbackContract(
    status,
) {
    const normalizedStatus =
        normalizeStatus(
            status,
        );

    const required =
        normalizedStatus !==
        IDENTITY_STATUS.MATCH;

    const methods =
        required
            ? Object.freeze([
                IDENTITY_FALLBACK_METHOD.QR,
                IDENTITY_FALLBACK_METHOD.MANUAL,
            ])
            : Object.freeze([]);

    return Object.freeze({
        required,
        methods,
    });
}

function normalizeCandidates(
    candidates,
) {
    if (
        !Array.isArray(
            candidates,
        )
    ) {
        throw new TypeError(
            "candidates deve ser um array.",
        );
    }

    return candidates.map(
        (
            candidate,
        ) =>
            createRecognitionCandidate(
                candidate,
            ),
    );
}

function validateResultShape(
    status,
    candidates,
) {
    if (
        status ===
            IDENTITY_STATUS.MATCH &&
        candidates.length !== 1
    ) {
        throw new TypeError(
            "MATCH exige exatamente um candidato.",
        );
    }

    if (
        status ===
            IDENTITY_STATUS.LOW_CONFIDENCE &&
        candidates.length !== 1
    ) {
        throw new TypeError(
            "LOW_CONFIDENCE exige exatamente um candidato.",
        );
    }

    if (
        (
            status ===
                IDENTITY_STATUS.NO_MATCH ||
            status ===
                IDENTITY_STATUS.NO_REFERENCE
        ) &&
        candidates.length !== 0
    ) {
        throw new TypeError(
            `${status} nao aceita candidatos.`,
        );
    }

    if (
        status ===
            IDENTITY_STATUS.AMBIGUOUS
    ) {
        if (
            candidates.length <
            2
        ) {
            throw new TypeError(
                "AMBIGUOUS exige pelo menos dois candidatos.",
            );
        }

        const uniqueIds =
            new Set(
                candidates.map(
                    (
                        candidate,
                    ) =>
                        candidate.collaboratorId,
                ),
            );

        if (
            uniqueIds.size !==
            candidates.length
        ) {
            throw new TypeError(
                "AMBIGUOUS exige colaboradores distintos.",
            );
        }
    }
}

export function createIdentityResult({
    status,
    candidates = [],
    reason = null,
} = {}) {
    const normalizedStatus =
        normalizeStatus(
            status,
        );

    const normalizedCandidates =
        normalizeCandidates(
            candidates,
        );

    validateResultShape(
        normalizedStatus,
        normalizedCandidates,
    );

    const primaryCandidate =
        normalizedCandidates.length === 1
            ? normalizedCandidates[0]
            : null;

    const immutableCandidates =
        Object.freeze(
            normalizedCandidates,
        );

    return Object.freeze({
        status:
            normalizedStatus,
        method:
            IDENTITY_METHOD.FACE,
        collaboratorId:
            primaryCandidate
                ?.collaboratorId ??
            null,
        confidence:
            primaryCandidate
                ?.confidence ??
            null,
        score:
            primaryCandidate
                ?.score ??
            null,
        referenceVersion:
            primaryCandidate
                ?.referenceVersion ??
            null,
        candidates:
            immutableCandidates,
        reason:
            normalizeReason(
                reason,
            ),
        fallback:
            createFallbackContract(
                normalizedStatus,
            ),
    });
}
