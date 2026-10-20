const SENSITIVE_KEY_PATTERN =
    /password|username|authorization|token|secret|cookie|credential/i;

const URL_CREDENTIAL_PATTERN =
    /([a-z][a-z0-9+.-]*:\/\/)([^@\s/]+)@/gi;

function redactString(
    value,
) {
    return value.replace(
        URL_CREDENTIAL_PATTERN,
        "$1***:***@",
    );
}

export function redactSensitive(
    value,
    key = "",
) {
    if (
        key &&
        SENSITIVE_KEY_PATTERN.test(
            key,
        )
    ) {
        return "[REDACTED]";
    }

    if (
        value instanceof Error
    ) {
        return {
            name:
                value.name,
            message:
                redactString(
                    value.message,
                ),
        };
    }

    if (Array.isArray(value)) {
        return value.map(
            (
                item,
            ) =>
                redactSensitive(
                    item,
                ),
        );
    }

    if (
        value &&
        typeof value === "object"
    ) {
        return Object.fromEntries(
            Object.entries(
                value,
            ).map(
                (
                    [
                        childKey,
                        childValue,
                    ],
                ) => [
                    childKey,
                    redactSensitive(
                        childValue,
                        childKey,
                    ),
                ],
            ),
        );
    }

    if (
        typeof value === "string"
    ) {
        return redactString(
            value,
        );
    }

    return value;
}

export function createStructuredLogger({
    sink = (
        line,
    ) => {
        process.stdout.write(
            `${line}\n`,
        );
    },
    now = () => new Date(),
} = {}) {
    if (
        typeof sink !== "function"
    ) {
        throw new TypeError(
            "sink deve ser uma funcao.",
        );
    }

    if (
        typeof now !== "function"
    ) {
        throw new TypeError(
            "now deve ser uma funcao.",
        );
    }

    function emit(
        level,
        event,
        context = {},
    ) {
        if (
            typeof event !== "string" ||
            !event.trim()
        ) {
            throw new TypeError(
                "event deve ser uma string nao vazia.",
            );
        }

        const timestamp =
            now();

        const record =
            redactSensitive({
                timestamp:
                    (
                        timestamp instanceof Date
                            ? timestamp
                            : new Date(timestamp)
                    ).toISOString(),
                level,
                event:
                    event.trim(),
                ...context,
            });

        sink(
            JSON.stringify(
                record,
            ),
        );

        return Object.freeze({
            ...record,
        });
    }

    return Object.freeze({
        info:
            (
                event,
                context,
            ) =>
                emit(
                    "info",
                    event,
                    context,
                ),
        warn:
            (
                event,
                context,
            ) =>
                emit(
                    "warn",
                    event,
                    context,
                ),
        error:
            (
                event,
                context,
            ) =>
                emit(
                    "error",
                    event,
                    context,
                ),
    });
}
