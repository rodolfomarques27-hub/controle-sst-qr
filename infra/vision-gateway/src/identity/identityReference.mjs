export const COLLABORATOR_IDENTITY_TYPE =
    "COLABORADOR";

export const COLLABORATOR_PHOTO_BUCKET =
    "fotos-colaboradores";

function normalizeOpaqueString(
    value,
    name,
) {
    if (
        value === undefined ||
        value === null
    ) {
        throw new TypeError(
            `${name} e obrigatorio.`,
        );
    }

    const normalized =
        String(
            value,
        ).trim();

    if (!normalized) {
        throw new TypeError(
            `${name} deve ser uma string nao vazia.`,
        );
    }

    if (
        normalized.includes(
            "\0",
        )
    ) {
        throw new TypeError(
            `${name} contem caractere invalido.`,
        );
    }

    return normalized;
}

export function normalizeCollaboratorId(
    collaboratorId,
) {
    return normalizeOpaqueString(
        collaboratorId,
        "colaborador.id",
    );
}

function normalizePhotoPath(
    value,
) {
    const normalized =
        normalizeOpaqueString(
            value,
            "photo.path",
        )
            .replace(
                /\\/g,
                "/",
            )
            .replace(
                /^\.\/+/,
                "",
            );

    if (
        /^[a-z][a-z0-9+.-]*:\/\//i.test(
            normalized,
        ) ||
        normalized.startsWith(
            "//",
        )
    ) {
        throw new TypeError(
            "photo.path deve ser caminho interno do bucket, nao URL.",
        );
    }

    if (
        normalized.startsWith(
            "/",
        )
    ) {
        throw new TypeError(
            "photo.path deve ser relativo ao bucket.",
        );
    }

    if (
        /^fotos-colaboradores\//i.test(
            normalized,
        )
    ) {
        throw new TypeError(
            "photo.path nao deve repetir o nome do bucket.",
        );
    }

    const segments =
        normalized.split(
            "/",
        );

    if (
        segments.some(
            (
                segment,
            ) =>
                segment === "." ||
                segment === ".." ||
                !segment,
        )
    ) {
        throw new TypeError(
            "photo.path contem segmento invalido.",
        );
    }

    return normalized;
}

function createReferenceKey({
    collaboratorId,
    bucket,
    path,
    version,
}) {
    return [
        collaboratorId,
        bucket,
        path,
        version,
    ]
        .map(
            (
                value,
            ) =>
                encodeURIComponent(
                    value,
                ),
        )
        .join(
            ":",
        );
}

export function createCanonicalIdentity({
    collaboratorId,
} = {}) {
    const normalizedId =
        normalizeCollaboratorId(
            collaboratorId,
        );

    return Object.freeze({
        type:
            COLLABORATOR_IDENTITY_TYPE,
        collaboratorId:
            normalizedId,
    });
}

export function createPhotoIdentityReference({
    collaboratorId,
    bucket =
        COLLABORATOR_PHOTO_BUCKET,
    path,
    version,
} = {}) {
    const identity =
        createCanonicalIdentity({
            collaboratorId,
        });

    const normalizedBucket =
        normalizeOpaqueString(
            bucket,
            "photo.bucket",
        );

    if (
        normalizedBucket !==
        COLLABORATOR_PHOTO_BUCKET
    ) {
        throw new TypeError(
            `photo.bucket deve ser ${COLLABORATOR_PHOTO_BUCKET}.`,
        );
    }

    const normalizedPath =
        normalizePhotoPath(
            path,
        );

    const normalizedVersion =
        normalizeOpaqueString(
            version,
            "photo.version",
        );

    const photo =
        Object.freeze({
            bucket:
                normalizedBucket,
            path:
                normalizedPath,
            version:
                normalizedVersion,
        });

    return Object.freeze({
        identity,
        photo,
        referenceKey:
            createReferenceKey({
                collaboratorId:
                    identity.collaboratorId,
                bucket:
                    photo.bucket,
                path:
                    photo.path,
                version:
                    photo.version,
            }),
    });
}
