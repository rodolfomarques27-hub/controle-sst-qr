import {
    cameraCapturePreviewOptions,
} from "./cameraCaptureGuidance.mjs";

const allowedStatuses = new Set(
    cameraCapturePreviewOptions.map((option) => option.status)
);

export function createCameraIaSyntheticResultChannel() {
    const listeners = new Set();

    return Object.freeze({
        subscribe(listener) {
            if (typeof listener !== "function") {
                throw new TypeError("Listener invalido");
            }

            listeners.add(listener);

            return () => {
                listeners.delete(listener);
            };
        },

        publish(value) {
            if (
                value === null ||
                typeof value !== "object" ||
                Array.isArray(value) ||
                Object.keys(value).length !== 2 ||
                typeof value.accepted !== "boolean" ||
                typeof value.status !== "string" ||
                !allowedStatuses.has(value.status) ||
                value.accepted !== (value.status === "CAPTURED")
            ) {
                return false;
            }

            const safeResult = Object.freeze({
                accepted: value.accepted,
                status: value.status,
            });

            for (const listener of [...listeners]) {
                listener(safeResult);
            }

            return true;
        },
    });
}

export const cameraIaSyntheticResultChannel =
    createCameraIaSyntheticResultChannel();
