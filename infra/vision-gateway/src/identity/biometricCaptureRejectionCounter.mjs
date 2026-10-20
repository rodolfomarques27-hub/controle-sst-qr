export function createBiometricCaptureRejectionCounter(allowedStatuses) {
    if (!Array.isArray(allowedStatuses) || allowedStatuses.length === 0) {
        throw new TypeError("allowedStatuses must be a nonempty array");
    }

    const allowed = new Set(allowedStatuses);

    if (
        allowed.size !== allowedStatuses.length ||
        [...allowed].some(
            (status) => typeof status !== "string" || status.length === 0
        )
    ) {
        throw new TypeError("Invalid status catalog");
    }

    const counts = new Map();
    let totalRejected = 0;

    return Object.freeze({
        observe(accepted, status) {
            if (typeof accepted !== "boolean" || !allowed.has(status)) {
                throw new TypeError("Invalid capture outcome");
            }

            if (!accepted) {
                counts.set(status, (counts.get(status) ?? 0) + 1);
                totalRejected++;
            }
        },

        snapshot() {
            const rejectedByStatus = Object.fromEntries(
                [...counts.entries()].sort(
                    ([left], [right]) => left.localeCompare(right)
                )
            );

            return Object.freeze({
                totalRejected,
                rejectedByStatus: Object.freeze(rejectedByStatus),
            });
        },
    });
}
