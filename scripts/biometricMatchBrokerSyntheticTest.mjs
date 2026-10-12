import assert from "node:assert/strict";

import {
  BIOMETRIC_MATCH_RANK_STATUS,
  createBiometricMatchBroker,
} from "../supabase/functions/_shared/biometricMatchBroker.ts";

const TENANT_ID =
  "11111111-1111-4111-8111-111111111111";

const EMPRESA_ID =
  "22222222-2222-4222-8222-222222222222";

const REQUEST_ID =
  "33333333-3333-4333-8333-333333333333";

const PROFILE_ID =
  "sface-2021dec";

function normalizedVector(
  first,
  second = 0,
) {
  const vector =
    new Float32Array(
      128,
    );

  vector[0] =
    first;

  vector[1] =
    second;

  let sumSquares =
    0;

  for (
    const value of
    vector
  ) {
    sumSquares +=
      value *
      value;
  }

  const norm =
    Math.sqrt(
      sumSquares,
    );

  for (
    let index = 0;
    index <
    vector.length;
    index += 1
  ) {
    vector[index] /=
      norm;
  }

  return vector;
}

function candidate({
  collaborator,
  referenceSet,
  centroid,
  token,
}) {
  return {
    colaboradorId:
      collaborator,
    referenceSetId:
      referenceSet,
    centroidId:
      centroid,
    qualityProfileId:
      "quality-v1",
    ciphertextBase64:
      token,
    ivBase64:
      "AAAAAAAAAAAAAAAA",
    keyVersion:
      "synthetic-v1",
    cipherVersion:
      "AES-256-GCM-v1",
    cipherSha256:
      "A".repeat(64),
  };
}

const vectorsByToken =
  new Map([
    [
      "candidate-a",
      normalizedVector(
        1,
        0,
      ),
    ],
    [
      "candidate-b",
      normalizedVector(
        0.8,
        0.6,
      ),
    ],
    [
      "candidate-c",
      normalizedVector(
        0,
        1,
      ),
    ],
  ]);

const decryptedBuffers =
  [];

const candidates =
  [
    candidate({
      collaborator:
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      referenceSet:
        "aaaaaaaa-1111-4111-8111-111111111111",
      centroid:
        "aaaaaaaa-2222-4222-8222-222222222222",
      token:
        "candidate-a",
    }),

    candidate({
      collaborator:
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      referenceSet:
        "bbbbbbbb-1111-4111-8111-111111111111",
      centroid:
        "bbbbbbbb-2222-4222-8222-222222222222",
      token:
        "candidate-b",
    }),

    candidate({
      collaborator:
        "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      referenceSet:
        "cccccccc-1111-4111-8111-111111111111",
      centroid:
        "cccccccc-2222-4222-8222-222222222222",
      token:
        "candidate-c",
    }),
  ];

const rpcClient =
  {
    async rpc(
      name,
      args,
    ) {
      assert.equal(
        name,
        "backend_biometric_list_active_centroids",
      );

      assert.equal(
        args.p_tenant_id,
        TENANT_ID,
      );

      assert.equal(
        args.p_empresa_id,
        EMPRESA_ID,
      );

      assert.equal(
        args.p_profile_id,
        PROFILE_ID,
      );

      assert.equal(
        args.p_request_id,
        REQUEST_ID,
      );

      return {
        data:
          {
            tenantId:
              TENANT_ID,
            empresaId:
              EMPRESA_ID,
            profileId:
              PROFILE_ID,
            requestId:
              REQUEST_ID,
            candidates,
          },
        error:
          null,
      };
    },
  };

const broker =
  createBiometricMatchBroker({
    rpcClient,

    async decryptVector({
      envelope,
      aad,
    }) {
      assert.equal(
        aad.materialKind,
        "CENTROID",
      );

      assert.equal(
        aad.tenantId,
        TENANT_ID,
      );

      assert.equal(
        aad.empresaId,
        EMPRESA_ID,
      );

      assert.equal(
        aad.profileId,
        PROFILE_ID,
      );

      const source =
        vectorsByToken.get(
          envelope.ciphertextBase64,
        );

      assert.ok(
        source,
      );

      const decrypted =
        new Float32Array(
          source,
        );

      decryptedBuffers.push(
        decrypted,
      );

      return decrypted;
    },
  });

const observed =
  normalizedVector(
    1,
    0,
  );

const observedSnapshot =
  new Float32Array(
    observed,
  );

const result =
  await broker
    .rankIdentification({
      tenantId:
        TENANT_ID,
      empresaId:
        EMPRESA_ID,
      profileId:
        PROFILE_ID,
      requestId:
        REQUEST_ID,
      observedEmbedding:
        observed,
    });

assert.equal(
  result.status,
  BIOMETRIC_MATCH_RANK_STATUS.RANKED,
);

assert.equal(
  result.candidateCount,
  3,
);

assert.equal(
  result.top1?.colaboradorId,
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
);

assert.equal(
  result.top2?.colaboradorId,
  "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
);

assert.equal(
  result.colaboradorId,
  result.top1?.colaboradorId,
);

assert.equal(
  result.referenceSetId,
  result.top1?.referenceSetId,
);

assert.ok(
  Math.abs(
    result.top1.score -
    1,
  ) <
    1e-6,
);

assert.ok(
  Math.abs(
    result.top2.score -
    0.8,
  ) <
    1e-6,
);

assert.ok(
  Math.abs(
    result.margin -
    0.2,
  ) <
    1e-6,
);

assert.equal(
  result.thresholds,
  null,
);

assert.equal(
  result.decision,
  null,
);

assert.deepEqual(
  observed,
  observedSnapshot,
);

assert.equal(
  decryptedBuffers.length,
  3,
);

for (
  const buffer of
  decryptedBuffers
) {
  assert.ok(
    buffer.every(
      (
        value,
      ) =>
        value === 0,
    ),
  );
}

const emptyBroker =
  createBiometricMatchBroker({
    rpcClient:
      {
        async rpc() {
          return {
            data:
              {
                tenantId:
                  TENANT_ID,
                empresaId:
                  EMPRESA_ID,
                profileId:
                  PROFILE_ID,
                requestId:
                  REQUEST_ID,
                candidates:
                  [],
              },
            error:
              null,
          };
        },
      },

    async decryptVector() {
      throw new Error(
        "decryptVector must not run for empty candidates.",
      );
    },
  });

const emptyResult =
  await emptyBroker
    .rankIdentification({
      tenantId:
        TENANT_ID,
      empresaId:
        EMPRESA_ID,
      profileId:
        PROFILE_ID,
      requestId:
        REQUEST_ID,
      observedEmbedding:
        observed,
    });

assert.equal(
  emptyResult.status,
  BIOMETRIC_MATCH_RANK_STATUS.NO_REFERENCE,
);

assert.equal(
  emptyResult.candidateCount,
  0,
);

assert.equal(
  emptyResult.top1,
  null,
);

assert.equal(
  emptyResult.top2,
  null,
);

assert.equal(
  emptyResult.margin,
  null,
);

const tieCandidates =
  [
    candidate({
      collaborator:
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      referenceSet:
        "bbbbbbbb-3333-4333-8333-333333333333",
      centroid:
        "bbbbbbbb-4444-4444-8444-444444444444",
      token:
        "candidate-a",
    }),

    candidate({
      collaborator:
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      referenceSet:
        "aaaaaaaa-3333-4333-8333-333333333333",
      centroid:
        "aaaaaaaa-4444-4444-8444-444444444444",
      token:
        "candidate-a",
    }),
  ];

const tieBroker =
  createBiometricMatchBroker({
    rpcClient:
      {
        async rpc() {
          return {
            data:
              {
                tenantId:
                  TENANT_ID,
                empresaId:
                  EMPRESA_ID,
                profileId:
                  PROFILE_ID,
                requestId:
                  REQUEST_ID,
                candidates:
                  tieCandidates,
              },
            error:
              null,
          };
        },
      },

    async decryptVector({
      envelope,
    }) {
      const source =
        vectorsByToken.get(
          envelope.ciphertextBase64,
        );

      assert.ok(
        source,
      );

      return new Float32Array(
        source,
      );
    },
  });

const tieResult =
  await tieBroker
    .rankIdentification({
      tenantId:
        TENANT_ID,
      empresaId:
        EMPRESA_ID,
      profileId:
        PROFILE_ID,
      requestId:
        REQUEST_ID,
      observedEmbedding:
        observed,
    });

assert.equal(
  tieResult.top1?.colaboradorId,
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
);

assert.equal(
  tieResult.top2?.colaboradorId,
  "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
);

assert.equal(
  tieResult.margin,
  0,
);

process.stdout.write(
  "SYNTHETIC_MATCH_BROKER_TEST=GREEN\n",
);
