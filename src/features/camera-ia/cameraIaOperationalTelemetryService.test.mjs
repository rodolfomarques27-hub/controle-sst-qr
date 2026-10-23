import test from "node:test";
import assert from "node:assert/strict";

import {
    normalizarTelemetriaOperacionalCameraIa,
} from "./cameraIaOperationalTelemetryService.js";

const now =
    Date.parse(
        "2026-10-22T16:00:10.000Z",
    );

function row() {
    return {
        camera_id:
            "portaria-01",

        camera_nome:
            "Portaria 01",

        camera_status:
            "FRAMES_RECENT",

        frames_recent:
            true,

        frame_count:
            42,

        ppe_status:
            "PPE_DETECTED",

        person_count:
            1,

        hardhat_count:
            1,

        no_hardhat_count:
            0,

        vest_count:
            1,

        no_vest_count:
            0,

        person_confidence:
            0.88,

        hardhat_confidence:
            0.94,

        no_hardhat_confidence:
            0,

        vest_confidence:
            0.91,

        no_vest_confidence:
            0,

        observed_at:
            "2026-10-22T16:00:08.000Z",

        received_at:
            "2026-10-22T16:00:09.000Z",
    };
}

test(
    "preserva somente camera e EPI suportados",
    () => {
        const result =
            normalizarTelemetriaOperacionalCameraIa(
                row(),
                now,
            );

        assert.equal(
            result.framesRecent,
            true,
        );

        assert.equal(
            result.cameraStatus,
            "FRAMES_RECENT",
        );

        assert.equal(
            result.ppe.status,
            "PPE_DETECTED",
        );

        assert.equal(
            result.ppe.counts.hardhat,
            1,
        );

        assert.equal(
            result.ppe.counts.vest,
            1,
        );

        assert.equal(
            Object.hasOwn(
                result.ppe,
                "oculos",
            ),
            false,
        );

        assert.equal(
            Object.hasOwn(
                result.ppe,
                "luvas",
            ),
            false,
        );

        assert.equal(
            Object.hasOwn(
                result.ppe,
                "calcado",
            ),
            false,
        );

        assert.equal(
            Object.hasOwn(
                result,
                "identity",
            ),
            false,
        );
    },
);

test(
    "invalida medicao EPI quando telemetria fica antiga",
    () => {
        const result =
            normalizarTelemetriaOperacionalCameraIa(
                row(),
                Date.parse(
                    "2026-10-22T16:01:00.000Z",
                ),
            );

        assert.equal(
            result.framesRecent,
            false,
        );

        assert.equal(
            result.cameraStatus,
            "OFFLINE",
        );

        assert.equal(
            result.ppe.status,
            "STALE",
        );

        assert.equal(
            result.ppe.counts.hardhat,
            0,
        );

        assert.equal(
            result.ppe.counts.vest,
            0,
        );
    },
);

test(
    "aceita telemetria com relogio cliente ate 30 segundos atrasado",
    () => {
        const result =
            normalizarTelemetriaOperacionalCameraIa(
                row(),
                Date.parse(
                    "2026-10-22T15:59:39.000Z",
                ),
            );

        assert.equal(
            result.framesRecent,
            true,
        );

        assert.equal(
            result.cameraStatus,
            "FRAMES_RECENT",
        );

        assert.equal(
            result.ppe.status,
            "PPE_DETECTED",
        );
    },
);

test(
    "aceita janela de frescor com relogio cliente ate 30 segundos adiantado",
    () => {
        const result =
            normalizarTelemetriaOperacionalCameraIa(
                row(),
                Date.parse(
                    "2026-10-22T16:00:54.000Z",
                ),
            );

        assert.equal(
            result.framesRecent,
            true,
        );

        assert.equal(
            result.cameraStatus,
            "FRAMES_RECENT",
        );

        assert.equal(
            result.ppe.status,
            "PPE_DETECTED",
        );
    },
);
