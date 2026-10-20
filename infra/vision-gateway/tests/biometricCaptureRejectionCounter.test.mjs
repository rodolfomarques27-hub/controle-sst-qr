import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { URL } from "node:url";

import {
    createBiometricCaptureRejectionCounter,
} from "../src/identity/biometricCaptureRejectionCounter.mjs";

const statuses = [
    "CAPTURED",
    "FRAME_UNAVAILABLE",
    "INVALID_FRAME",
    "DETECTION_FAILED",
    "NO_FACE",
    "MULTIPLE_FACES",
    "ALIGNMENT_FAILED",
    "EMBEDDING_FAILED",
];

test("aggregates synthetic rejection reasons", () => {
    const counter = createBiometricCaptureRejectionCounter(statuses);

    counter.observe(false, "DETECTION_FAILED");
    counter.observe(false, "NO_FACE");
    counter.observe(false, "NO_FACE");
    counter.observe(false, "MULTIPLE_FACES");
    counter.observe(false, "ALIGNMENT_FAILED");
    counter.observe(false, "EMBEDDING_FAILED");
    counter.observe(true, "CAPTURED");

    assert.deepEqual(counter.snapshot(), {
        totalRejected: 6,
        rejectedByStatus: {
            ALIGNMENT_FAILED: 1,
            DETECTION_FAILED: 1,
            EMBEDDING_FAILED: 1,
            MULTIPLE_FACES: 1,
            NO_FACE: 2,
        },
    });
});

test("preserves successful capture exclusion", () => {
    const counter = createBiometricCaptureRejectionCounter(statuses);

    counter.observe(true, "CAPTURED");

    assert.equal(counter.snapshot().totalRejected, 0);
    assert.deepEqual(counter.snapshot().rejectedByStatus, {});
});

test("isolates independent collection counters", () => {
    const first = createBiometricCaptureRejectionCounter(statuses);
    const second = createBiometricCaptureRejectionCounter(statuses);

    first.observe(false, "INVALID_FRAME");

    assert.equal(first.snapshot().totalRejected, 1);
    assert.equal(second.snapshot().totalRejected, 0);
});

test("rejects invalid statuses without recording identifiers", () => {
    const counter = createBiometricCaptureRejectionCounter(statuses);

    assert.throws(
        () => counter.observe(false, "participant-cal-p001")
    );

    assert.throws(
        () => counter.observe("false", "NO_FACE")
    );

    assert.equal(counter.snapshot().totalRejected, 0);
});

test("exposes immutable aggregate-only data", () => {
    const counter = createBiometricCaptureRejectionCounter(statuses);

    counter.observe(false, "ALIGNMENT_FAILED");

    const value = counter.snapshot();

    assert.equal(Object.isFrozen(value), true);
    assert.equal(Object.isFrozen(value.rejectedByStatus), true);

    assert.deepEqual(
        Object.keys(value),
        ["totalRejected", "rejectedByStatus"]
    );

    assert.equal("embedding" in value, false);
    assert.equal("sampleId" in value, false);
    assert.equal("frame" in value, false);
});

test("keeps existing capture gates in the runner source", () => {
    const source = readFileSync(
        new URL(
            "../src/identity/biometricCalibrationCollectionRunner.mjs",
            import.meta.url
        ),
        "utf8"
    );

    const wrapped = source.match(
        /return\s+trackedCaptureResult\s*\(/g
    ) ?? [];

    assert.equal(wrapped.length, 11);

    assert.match(source, /getQualityRejectionSummary\s*:/);
    assert.match(source, /acceptedCaptures\.set\s*\(/);
    assert.match(source, /CALIBRATION_CAPTURE_STATUS\.NO_FACE/);
    assert.match(source, /CALIBRATION_CAPTURE_STATUS\.ALIGNMENT_FAILED/);
    assert.match(source, /CALIBRATION_CAPTURE_STATUS\.EMBEDDING_FAILED/);
});
