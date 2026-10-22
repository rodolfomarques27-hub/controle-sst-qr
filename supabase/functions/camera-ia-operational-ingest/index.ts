import {
    createClient,
} from "https://esm.sh/@supabase/supabase-js@2.45.4";

import {
    createOperationalTelemetryIngestContract,
} from "./operationalTelemetryIngestContract.mjs";

// CAM-IA-PROD-VISION-GATEWAY-01
// Endpoint service-to-service autenticado por HMAC.
// Quando houver autorizacao de deploy, publicar sem JWT de usuario.
// O dispositivo continua autenticado exclusivamente pelo contrato HMAC.

function createAdminClient() {
    const url =
        Deno.env.get(
            "SUPABASE_URL",
        ) ||
        "";

    const serviceRole =
        Deno.env.get(
            "SUPABASE_SERVICE_ROLE_KEY",
        ) ||
        "";

    if (
        !url ||
        !serviceRole
    ) {
        throw new Error(
            "SUPABASE_ADMIN_ENV_UNAVAILABLE",
        );
    }

    return createClient(
        url,
        serviceRole,
        {
            auth: {
                persistSession:
                    false,

                autoRefreshToken:
                    false,
            },
        },
    );
}

function getKeyRecord({
    deviceId,
    keyId,
}) {
    const raw =
        Deno.env.get(
            "CAMERA_IA_OPERATIONAL_KEYS_JSON",
        ) ||
        "";

    let parsed;

    try {
        parsed =
            JSON.parse(
                raw,
            );
    }
    catch {
        throw new Error(
            "CAMERA_IA_OPERATIONAL_KEYS_JSON_INVALID",
        );
    }

    if (
        !parsed ||
        typeof parsed !==
            "object" ||
        Array.isArray(
            parsed,
        )
    ) {
        throw new Error(
            "CAMERA_IA_OPERATIONAL_KEYS_JSON_INVALID",
        );
    }

    const secretBase64 =
        parsed[
            keyId
        ];

    if (
        typeof secretBase64 !==
            "string" ||
        !secretBase64
    ) {
        return null;
    }

    return Object.freeze({
        deviceId,
        keyId,
        secretBase64,
    });
}

const contract =
    createOperationalTelemetryIngestContract({
        async resolveDevice({
            deviceId,
        }) {
            const admin =
                createAdminClient();

            const {
                data,
                error,
            } =
                await admin.rpc(
                    "camera_ia_ingest_resolver_dispositivo",
                    {
                        p_device_id:
                            deviceId,
                    },
                );

            if (
                error ||
                !Array.isArray(
                    data,
                ) ||
                data.length !==
                    1
            ) {
                return null;
            }

            const row =
                data[0];

            return Object.freeze({
                deviceId:
                    row.device_id,

                cameraId:
                    row.camera_id,

                tenantId:
                    row.tenant_id,

                empresaId:
                    row.empresa_id,

                keyId:
                    row.key_id,

                status:
                    row.status,
            });
        },

        async getSigningKey({
            deviceId,
            keyId,
        }) {
            return getKeyRecord({
                deviceId,
                keyId,
            });
        },

        async commitTelemetry({
            deviceId,
            cameraId,
            tenantId,
            empresaId,
            keyId,
            eventId,
            nonce,
            eventEpochSeconds,
            payload,
        }) {
            const admin =
                createAdminClient();

            const {
                data,
                error,
            } =
                await admin.rpc(
                    "camera_ia_ingest_confirmar_telemetria",
                    {
                        p_device_id:
                            deviceId,

                        p_camera_id:
                            cameraId,

                        p_tenant_id:
                            tenantId,

                        p_empresa_id:
                            empresaId,

                        p_key_id:
                            keyId,

                        p_event_id:
                            eventId,

                        p_nonce:
                            nonce,

                        p_observed_at:
                            payload.observedAt,

                        p_camera_status:
                            payload.camera.status,

                        p_frames_recent:
                            payload.camera.framesRecent,

                        p_frame_count:
                            payload.camera.frameCount,

                        p_ppe_status:
                            payload.ppe.status,

                        p_person_count:
                            payload.ppe.personCount,

                        p_hardhat_count:
                            payload.ppe.counts.hardhat,

                        p_no_hardhat_count:
                            payload.ppe.counts.noHardhat,

                        p_vest_count:
                            payload.ppe.counts.vest,

                        p_no_vest_count:
                            payload.ppe.counts.noVest,

                        p_person_confidence:
                            payload.ppe.maxConfidence.person,

                        p_hardhat_confidence:
                            payload.ppe.maxConfidence.hardhat,

                        p_no_hardhat_confidence:
                            payload.ppe.maxConfidence.noHardhat,

                        p_vest_confidence:
                            payload.ppe.maxConfidence.vest,

                        p_no_vest_confidence:
                            payload.ppe.maxConfidence.noVest,

                        p_event_epoch_seconds:
                            eventEpochSeconds,
                    },
                );

            if (error) {
                throw error;
            }

            return (
                data ===
                true
            );
        },
    });

Deno.serve(
    (
        request,
    ) =>
        contract.handle(
            request,
        ),
);