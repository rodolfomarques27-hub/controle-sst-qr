export const BIOMETRIC_PRODUCTIVE_POLICY_STATUS =
    Object.freeze({
        HOMOLOGATED:
            "HOMOLOGATED",
    });

export const BIOMETRIC_PRODUCTIVE_POLICY_ERROR =
    Object.freeze({
        REQUIRED:
            "BIOMETRIC_PRODUCTIVE_POLICY_REQUIRED",
        INVALID:
            "BIOMETRIC_PRODUCTIVE_POLICY_INVALID",
        NOT_HOMOLOGATED:
            "BIOMETRIC_PRODUCTIVE_POLICY_NOT_HOMOLOGATED",
    });

const POLICY_KEYS =
    Object.freeze([
        "status",
        "policyVersion",
        "candidateThreshold",
        "matchThreshold",
        "ambiguityMargin",
    ]);

function createPolicyError(
    code,
    message,
) {
    const error =
        new Error(
            message,
        );

    error.name =
        "BiometricProductivePolicyError";

    error.code =
        code;

    return error;
}

function fail(
    code,
    message,
) {
    throw createPolicyError(
        code,
        message,
    );
}

function requireFiniteNumber(
    value,
    name,
    min,
    max,
) {
    if (
        typeof value !==
            "number" ||
        !Number.isFinite(
            value,
        ) ||
        value < min ||
        value > max
    ) {
        fail(
            BIOMETRIC_PRODUCTIVE_POLICY_ERROR.INVALID,
            `${name} deve ser numero finito entre ${min} e ${max}.`,
        );
    }

    return value;
}

function requirePolicyVersion(
    value,
) {
    if (
        typeof value !==
        "string"
    ) {
        fail(
            BIOMETRIC_PRODUCTIVE_POLICY_ERROR.INVALID,
            "policyVersion deve ser string.",
        );
    }

    const normalized =
        value.trim();

    if (
        !normalized ||
        normalized.length > 160
    ) {
        fail(
            BIOMETRIC_PRODUCTIVE_POLICY_ERROR.INVALID,
            "policyVersion deve possuir entre 1 e 160 caracteres.",
        );
    }

    return normalized;
}

function assertExactKeys(
    source,
) {
    const actual =
        Object.keys(
            source,
        ).sort((left, right) => left.localeCompare(right));

    const expected =
        [...POLICY_KEYS]
            .sort((left, right) => left.localeCompare(right));

    if (
        actual.length !==
        expected.length ||
        actual.some(
            (
                key,
                index,
            ) =>
                key !==
                expected[index],
        )
    ) {
        fail(
            BIOMETRIC_PRODUCTIVE_POLICY_ERROR.INVALID,
            "productivePolicy possui campos ausentes ou nao permitidos.",
        );
    }
}

export function requireHomologatedBiometricProductivePolicy(
    value,
) {
    if (
        !value ||
        typeof value !==
            "object" ||
        Array.isArray(
            value,
        )
    ) {
        fail(
            BIOMETRIC_PRODUCTIVE_POLICY_ERROR.REQUIRED,
            "productivePolicy homologada e obrigatoria.",
        );
    }

    assertExactKeys(
        value,
    );

    if (
        value.status !==
        BIOMETRIC_PRODUCTIVE_POLICY_STATUS.HOMOLOGATED
    ) {
        fail(
            BIOMETRIC_PRODUCTIVE_POLICY_ERROR.NOT_HOMOLOGATED,
            "productivePolicy nao esta homologada.",
        );
    }

    const policyVersion =
        requirePolicyVersion(
            value.policyVersion,
        );

    const candidateThreshold =
        requireFiniteNumber(
            value.candidateThreshold,
            "candidateThreshold",
            -1,
            1,
        );

    const matchThreshold =
        requireFiniteNumber(
            value.matchThreshold,
            "matchThreshold",
            -1,
            1,
        );

    const ambiguityMargin =
        requireFiniteNumber(
            value.ambiguityMargin,
            "ambiguityMargin",
            0,
            2,
        );

    if (
        candidateThreshold >
        matchThreshold
    ) {
        fail(
            BIOMETRIC_PRODUCTIVE_POLICY_ERROR.INVALID,
            "candidateThreshold nao pode superar matchThreshold.",
        );
    }

    return Object.freeze({
        status:
            BIOMETRIC_PRODUCTIVE_POLICY_STATUS.HOMOLOGATED,
        policyVersion,
        candidateThreshold,
        matchThreshold,
        ambiguityMargin,
    });
}
