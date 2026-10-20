import test from "node:test";
import assert from "node:assert/strict";

import {
    COLLABORATOR_IDENTITY_TYPE,
    COLLABORATOR_PHOTO_BUCKET,
    createCanonicalIdentity,
    createPhotoIdentityReference,
    normalizeCollaboratorId,
} from "../src/identity/identityReference.mjs";

test(
    "normaliza colaborador.id como identificador canonico opaco",
    () => {
        assert.equal(
            normalizeCollaboratorId(
                12345,
            ),
            "12345",
        );

        assert.equal(
            normalizeCollaboratorId(
                "  abc-123  ",
            ),
            "abc-123",
        );
    },
);

test(
    "rejeita colaborador.id ausente ou vazio",
    () => {
        assert.throws(
            () =>
                normalizeCollaboratorId(
                    "",
                ),
            /colaborador\.id/,
        );

        assert.throws(
            () =>
                createCanonicalIdentity(),
            /colaborador\.id/,
        );
    },
);

test(
    "cria identidade canonica baseada somente em colaborador.id",
    () => {
        const identity =
            createCanonicalIdentity({
                collaboratorId:
                    "colab-001",
            });

        assert.deepEqual(
            identity,
            {
                type:
                    COLLABORATOR_IDENTITY_TYPE,
                collaboratorId:
                    "colab-001",
            },
        );

        assert.equal(
            Object.isFrozen(
                identity,
            ),
            true,
        );
    },
);

test(
    "cria referencia oficial de foto com bucket privado e versao opaca",
    () => {
        const reference =
            createPhotoIdentityReference({
                collaboratorId:
                    "colab-001",
                path:
                    "empresa-10/colaborador-20/foto.jpg",
                version:
                    "2026-10-11T18:00:00Z",
            });

        assert.equal(
            reference.identity
                .collaboratorId,
            "colab-001",
        );

        assert.equal(
            reference.photo.bucket,
            COLLABORATOR_PHOTO_BUCKET,
        );

        assert.equal(
            reference.photo.path,
            "empresa-10/colaborador-20/foto.jpg",
        );

        assert.equal(
            reference.photo.version,
            "2026-10-11T18:00:00Z",
        );

        assert.equal(
            typeof reference.referenceKey,
            "string",
        );

        assert.equal(
            Object.isFrozen(
                reference.photo,
            ),
            true,
        );

        assert.equal(
            Object.isFrozen(
                reference,
            ),
            true,
        );
    },
);

test(
    "referencia de foto rejeita URL, caminho absoluto, prefixo do bucket e traversal",
    () => {
        const common = {
            collaboratorId:
                "colab-001",
            version:
                "v1",
        };

        assert.throws(
            () =>
                createPhotoIdentityReference({
                    ...common,
                    path:
                        "https://example.com/foto.jpg",
                }),
            /nao URL/,
        );

        assert.throws(
            () =>
                createPhotoIdentityReference({
                    ...common,
                    path:
                        "/empresa/foto.jpg",
                }),
            /relativo ao bucket/,
        );

        assert.throws(
            () =>
                createPhotoIdentityReference({
                    ...common,
                    path:
                        "fotos-colaboradores/empresa/foto.jpg",
                }),
            /nao deve repetir/,
        );

        assert.throws(
            () =>
                createPhotoIdentityReference({
                    ...common,
                    path:
                        "empresa/../foto.jpg",
                }),
            /segmento invalido/,
        );
    },
);

test(
    "mudanca da versao da foto altera a chave da referencia",
    () => {
        const v1 =
            createPhotoIdentityReference({
                collaboratorId:
                    "colab-001",
                path:
                    "empresa/foto.jpg",
                version:
                    "v1",
            });

        const v2 =
            createPhotoIdentityReference({
                collaboratorId:
                    "colab-001",
                path:
                    "empresa/foto.jpg",
                version:
                    "v2",
            });

        assert.notEqual(
            v1.referenceKey,
            v2.referenceKey,
        );
    },
);
