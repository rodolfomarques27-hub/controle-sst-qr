import {
    existsSync,
    realpathSync,
} from 'node:fs';

import {
    isAbsolute,
    normalize,
} from 'node:path';

const OVERRIDE_ENV =
    'SAFESCAN_TEST_DOCKER_CLI';

const WINDOWS_CANDIDATES =
    Object.freeze([
        'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe',
        'C:\\ProgramData\\DockerDesktop\\version-bin\\docker.exe',
    ]);

const POSIX_CANDIDATES =
    Object.freeze([
        '/usr/bin/docker',
        '/usr/local/bin/docker',
        '/opt/homebrew/bin/docker',
    ]);

function comparablePath(
    value,
    platform,
) {
    const normalized =
        normalize(
            value,
        );

    return platform === 'win32'
        ? normalized.toLowerCase()
        : normalized;
}

export function resolveTrustedDockerCli(
    env = process.env,
) {
    const platform =
        process.platform;

    const candidates =
        platform === 'win32'
            ? WINDOWS_CANDIDATES
            : POSIX_CANDIDATES;

    const override =
        String(
            env[OVERRIDE_ENV] ?? '',
        ).trim();

    if (override) {
        if (!isAbsolute(override)) {
            throw new Error(
                'SAFESCAN_TEST_DOCKER_CLI_MUST_BE_ABSOLUTE',
            );
        }

        const overrideComparable =
            comparablePath(
                override,
                platform,
            );

        const allowed =
            candidates.find(
                (
                    candidate,
                ) =>
                    comparablePath(
                        candidate,
                        platform,
                    ) ===
                    overrideComparable,
            );

        if (!allowed) {
            throw new Error(
                'SAFESCAN_TEST_DOCKER_CLI_NOT_ALLOWLISTED',
            );
        }

        if (!existsSync(allowed)) {
            throw new Error(
                'SAFESCAN_TEST_DOCKER_CLI_NOT_FOUND',
            );
        }

        return realpathSync.native(
            allowed,
        );
    }

    for (
        const candidate of
        candidates
    ) {
        if (existsSync(candidate)) {
            return realpathSync.native(
                candidate,
            );
        }
    }

    throw new Error(
        'TRUSTED_DOCKER_CLI_NOT_FOUND',
    );
}
