const SENSITIVE_KEY_PATTERN =
    /password|username|authorization|token|secret|cookie|credential/i;

function isSchemeCharacter(
    code,
) {
    return (
        (
            code >= 65 &&
            code <= 90
        ) ||
        (
            code >= 97 &&
            code <= 122
        ) ||
        (
            code >= 48 &&
            code <= 57
        ) ||
        code === 43 ||
        code === 45 ||
        code === 46
    );
}

function isAsciiLetter(
    code,
) {
    return (
        (
            code >= 65 &&
            code <= 90
        ) ||
        (
            code >= 97 &&
            code <= 122
        )
    );
}

function redactString(
    value,
) {
    let output =
        "";

    let cursor =
        0;

    let searchFrom =
        0;

    while (
        searchFrom <
        value.length
    ) {
        const marker =
            value.indexOf(
                "://",
                searchFrom,
            );

        if (marker < 0) {
            break;
        }

        let schemeStart =
            marker - 1;

        while (
            schemeStart >= 0 &&
            isSchemeCharacter(
                value.charCodeAt(
                    schemeStart,
                ),
            )
        ) {
            schemeStart -=
                1;
        }

        schemeStart +=
            1;

        if (
            schemeStart >= marker ||
            !isAsciiLetter(
                value.charCodeAt(
                    schemeStart,
                ),
            )
        ) {
            searchFrom =
                marker + 3;

            continue;
        }

        const authorityStart =
            marker + 3;

        const atIndex =
            value.indexOf(
                "@",
                authorityStart,
            );

        if (atIndex < 0) {
            searchFrom =
                authorityStart;

            continue;
        }

        const credentials =
            value.slice(
                authorityStart,
                atIndex,
            );

        let validCredentials =
            credentials.length > 0;

        for (
            let index = 0;
            validCredentials &&
            index < credentials.length;
            index += 1
        ) {
            const code =
                credentials.charCodeAt(
                    index,
                );

            if (
                code === 47 ||
                code === 9 ||
                code === 10 ||
                code === 13 ||
                code === 32
            ) {
                validCredentials =
                    false;
            }
        }

        if (!validCredentials) {
            searchFrom =
                authorityStart;

            continue;
        }

        output +=
            value.slice(
                cursor,
                authorityStart,
            );

        output +=
            "***:***@";

        cursor =
            atIndex + 1;

        searchFrom =
            cursor;
    }

    return (
        output +
        value.slice(
            cursor,
        )
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
