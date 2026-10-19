import {
    createGatewayRuntime,
} from "../src/index.mjs";

import {
    createBiometricRealCameraAdmissionHarness,
} from "../src/identity/biometricRealCameraAdmission.mjs";

import {
    createBiometricCalibrationFreshFrameAdmissionController,
} from "../src/identity/biometricRealCalibrationCollectionPreparation.mjs";

import {
    createBiometricCalibrationCollectionRunner,
} from "../src/identity/biometricCalibrationCollectionRunner.mjs";

import {
    createBiometricRealCalibrationCollectionOrchestrator,
} from "../src/identity/biometricRealCalibrationCollectionOrchestrator.mjs";

export const LOCAL_CALIBRATION_AUTHORIZATION =
    Object.freeze({
        CAMERA:
            "CAMERA",
        RTSP:
            "RTSP",
        PARTICIPANTS:
            "PARTICIPANTS",
    });

export const LOCAL_CALIBRATION_EXECUTION_MODE =
    "EXPLICIT_MANUAL_ONLY";

export const LOCAL_CALIBRATION_BIOMETRIC_PERSISTENCE =
    false;

const REQUIRED_AUTHORIZATIONS =
    Object.freeze(
        Object.values(
            LOCAL_CALIBRATION_AUTHORIZATION,
        ),
    );

function requirePlainObject(
    value,
    name,
) {
    if (
        !value ||
        typeof value !==
            "object" ||
        Array.isArray(
            value,
        )
    ) {
        throw new TypeError(
            `${name} deve ser objeto.`,
        );
    }

    return value;
}

function requireFunction(
    value,
    name,
) {
    if (
        typeof value !==
        "function"
    ) {
        throw new TypeError(
            `${name} deve ser funcao.`,
        );
    }

    return value;
}

function requireExplicitAuthorizations(
    value,
) {
    const source =
        requirePlainObject(
            value,
            "authorizations",
        );

    const missing =
        REQUIRED_AUTHORIZATIONS
            .filter(
                (
                    authorization,
                ) =>
                    source[
                        authorization
                    ] !==
                    true,
            );

    if (
        missing.length >
        0
    ) {
        const error =
            new Error(
                (
                    "calibracao local bloqueada; " +
                    "autorizacoes explicitas ausentes: " +
                    missing.join(",")
                ),
            );

        error.code =
            "LOCAL_CALIBRATION_AUTHORIZATION_REQUIRED";

        error.missing =
            Object.freeze(
                [
                    ...missing,
                ],
            );

        throw error;
    }

    return Object.freeze({
        CAMERA:
            true,
        RTSP:
            true,
        PARTICIPANTS:
            true,
    });
}

function resolveFactories(
    value,
) {
    const source =
        value ===
        undefined
            ? {}
            : requirePlainObject(
                value,
                "factoryOverrides",
            );

    return Object.freeze({
        createGatewayRuntime:
            requireFunction(
                source.createGatewayRuntime ??
                    createGatewayRuntime,
                "createGatewayRuntime",
            ),

        createAdmission:
            requireFunction(
                source.createAdmission ??
                    createBiometricRealCameraAdmissionHarness,
                "createAdmission",
            ),

        createFreshFrameAdmission:
            requireFunction(
                source.createFreshFrameAdmission ??
                    createBiometricCalibrationFreshFrameAdmissionController,
                "createFreshFrameAdmission",
            ),

        createRunner:
            requireFunction(
                source.createRunner ??
                    createBiometricCalibrationCollectionRunner,
                "createRunner",
            ),

        createOrchestrator:
            requireFunction(
                source.createOrchestrator ??
                    createBiometricRealCalibrationCollectionOrchestrator,
                "createOrchestrator",
            ),
    });
}

function requireRuntime(
    value,
) {
    const runtime =
        requirePlainObject(
            value,
            "runtime",
        );

    if (
        !runtime.rtspSessions ||
        typeof runtime
            .rtspSessions
            .get !==
            "function"
    ) {
        throw new TypeError(
            "runtime.rtspSessions deve expor get().",
        );
    }

    return runtime;
}

export function createLocalBiometricCalibrationPilotEntrypoint({
    authorizations,
    env =
        process.env,
    runtimeOptions = {},
    controlledStudyContract,
    collectionPlan,
    scoringProtocol,
    detector,
    alignFace,
    embeddingExtractor,
    admissionAlignmentConfig,
    collectionAlignmentPolicy,
    admissionOptions = {},
    orchestratorOptions = {},
    factoryOverrides,
} = {}) {
    const normalizedAuthorizations =
        requireExplicitAuthorizations(
            authorizations,
        );

    const factories =
        resolveFactories(
            factoryOverrides,
        );

    const normalizedEnv =
        requirePlainObject(
            env,
            "env",
        );

    const normalizedRuntimeOptions =
        requirePlainObject(
            runtimeOptions,
            "runtimeOptions",
        );

    const normalizedAdmissionOptions =
        requirePlainObject(
            admissionOptions,
            "admissionOptions",
        );

    const normalizedOrchestratorOptions =
        requirePlainObject(
            orchestratorOptions,
            "orchestratorOptions",
        );

    const runtime =
        requireRuntime(
            factories
                .createGatewayRuntime({
                    ...normalizedRuntimeOptions,
                    env:
                        normalizedEnv,
                }),
        );

    async function resolveCaptureSource(
        deviceId,
    ) {
        if (
            typeof deviceId !==
                "string" ||
            !deviceId.trim()
        ) {
            throw new TypeError(
                "deviceId e obrigatorio.",
            );
        }

        const normalizedDeviceId =
            deviceId.trim();

        const source =
            runtime
                .rtspSessions
                .get(
                    normalizedDeviceId,
                );

        if (!source) {
            const error =
                new Error(
                    (
                        "capture source local nao disponivel: " +
                        normalizedDeviceId
                    ),
                );

            error.code =
                "LOCAL_CALIBRATION_CAPTURE_SOURCE_NOT_FOUND";

            throw error;
        }

        return source;
    }

    const admission =
        factories
            .createAdmission({
                ...normalizedAdmissionOptions,

                createRuntime:
                    () =>
                        runtime,

                env:
                    normalizedEnv,

                detector,

                alignFace,

                embeddingExtractor,

                alignmentConfig:
                    admissionAlignmentConfig,
            });

    const freshFrameAdmission =
        factories
            .createFreshFrameAdmission({
                resolveCaptureSource,
            });

    const runner =
        factories
            .createRunner({
                controlledStudyContract,
                collectionPlan,
                scoringProtocol,
                resolveCaptureSource,
                detector,
                alignFace,
                embeddingExtractor,

                alignmentPolicy:
                    collectionAlignmentPolicy,
            });

    const orchestrator =
        factories
            .createOrchestrator({
                ...normalizedOrchestratorOptions,

                collectionPlan,
                runner,

                freshFrameAdmission,
            });

    return Object.freeze({
        mode:
            LOCAL_CALIBRATION_EXECUTION_MODE,

        authorizations:
            normalizedAuthorizations,

        biometricPersistence:
            LOCAL_CALIBRATION_BIOMETRIC_PERSISTENCE,

        runtime,
        admission,
        freshFrameAdmission,
        runner,
        orchestrator,
        resolveCaptureSource,
    });
}
