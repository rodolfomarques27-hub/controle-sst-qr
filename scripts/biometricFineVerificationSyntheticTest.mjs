import assert from "node:assert/strict";

import {
  createBiometricFineVerification,
} from "../supabase/functions/_shared/biometricFineVerification.ts";

const TENANT_ID =
  "11111111-1111-4111-8111-111111111111";

const EMPRESA_ID =
  "22222222-2222-4222-8222-222222222222";

const REQUEST_ID =
  "33333333-3333-4333-8333-333333333333";

const COLABORADOR_ID =
  "44444444-4444-4444-8444-444444444444";

const REFERENCE_SET_ID =
  "55555555-5555-4555-8555-555555555555";

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

function encryptedReference({
  referenceId,
  token,
}) {
  return {
    referenceId,
    sourceRef:
      null,
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

const references =
  [
    encryptedReference({
      referenceId:
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      token:
        "reference-a",
    }),

    encryptedReference({
      referenceId:
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      token:
        "reference-b",
    }),

    encryptedReference({
      referenceId:
        "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      token:
        "reference-c",
    }),
  ];

const vectorsByToken =
  new Map([
    [
      "reference-a",
      normalizedVector(
        1,
        0,
      ),
    ],
    [
      "reference-b",
      normalizedVector(
        0.8,
        0.6,
      ),
    ],
    [
      "reference-c",
      normalizedVector(
        0,
        1,
      ),
    ],
  ]);

function bundle({
  refs =
    references,
  overrides =
    {},
} = {}) {
  return {
    requestId:
      REQUEST_ID,
    referenceSetId:
      REFERENCE_SET_ID,
    tenantId:
      TENANT_ID,
    empresaId:
      EMPRESA_ID,
    colaboradorId:
      COLABORADOR_ID,
    profileId:
      PROFILE_ID,
    qualityProfileId:
      "quality-v1",
    centroid:
      {},
    references:
      refs,
    ...overrides,
  };
}

function rpcClientFor(
  responseBundle,
) {
  return {
    async rpc(
      name,
      args,
    ) {
      assert.equal(
        name,
        "backend_biometric_get_active_bundle",
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
        args.p_colaborador_id,
        COLABORADOR_ID,
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
          responseBundle,
        error:
          null,
      };
    },
  };
}

const decryptedBuffers =
  [];

const verifier =
  createBiometricFineVerification({
    rpcClient:
      rpcClientFor(
        bundle(),
      ),

    async decryptVector({
      envelope,
      aad,
    }) {
      assert.equal(
        aad.materialKind,
        "REFERENCE",
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
        aad.colaboradorId,
        COLABORADOR_ID,
      );

      assert.equal(
        aad.profileId,
        PROFILE_ID,
      );

      assert.equal(
        aad.referenceSetId,
        REFERENCE_SET_ID,
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
  await verifier
    .verifyCandidate({
      tenantId:
        TENANT_ID,
      empresaId:
        EMPRESA_ID,
      profileId:
        PROFILE_ID,
      requestId:
        REQUEST_ID,
      colaboradorId:
        COLABORADOR_ID,
      referenceSetId:
        REFERENCE_SET_ID,
      observedEmbedding:
        observed,
    });

assert.equal(
  result.referenceCount,
  3,
);

assert.equal(
  result.bestReferenceId,
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
);

assert.equal(
  result.referenceScores[0].referenceId,
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
);

assert.equal(
  result.referenceScores[1].referenceId,
  "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
);

assert.equal(
  result.referenceScores[2].referenceId,
  "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
);

assert.ok(
  Math.abs(
    result.bestScore -
    1,
  ) <
    1e-6,
);

assert.ok(
  Math.abs(
    result.worstScore -
    0,
  ) <
    1e-6,
);

assert.ok(
  Math.abs(
    result.meanScore -
    0.6,
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

let boundaryDecryptCalled =
  false;

const boundaryVerifier =
  createBiometricFineVerification({
    rpcClient:
      rpcClientFor(
        bundle({
          overrides:
            {
              referenceSetId:
                "66666666-6666-4666-8666-666666666666",
            },
        }),
      ),

    async decryptVector() {
      boundaryDecryptCalled =
        true;

      throw new Error(
        "decryptVector must not run on boundary mismatch.",
      );
    },
  });

await assert.rejects(
  async () => {
    await boundaryVerifier
      .verifyCandidate({
        tenantId:
          TENANT_ID,
        empresaId:
          EMPRESA_ID,
        profileId:
          PROFILE_ID,
        requestId:
          REQUEST_ID,
        colaboradorId:
          COLABORADOR_ID,
        referenceSetId:
          REFERENCE_SET_ID,
        observedEmbedding:
          observed,
      });
  },
  /FINE_VERIFICATION_BOUNDARY_REJECTED_REFERENCESETID/,
);

assert.equal(
  boundaryDecryptCalled,
  false,
);

let countDecryptCalled =
  false;

const countVerifier =
  createBiometricFineVerification({
    rpcClient:
      rpcClientFor(
        bundle({
          refs:
            references.slice(
              0,
              2,
            ),
        }),
      ),

    async decryptVector() {
      countDecryptCalled =
        true;

      throw new Error(
        "decryptVector must not run on invalid reference count.",
      );
    },
  });

await assert.rejects(
  async () => {
    await countVerifier
      .verifyCandidate({
        tenantId:
          TENANT_ID,
        empresaId:
          EMPRESA_ID,
        profileId:
          PROFILE_ID,
        requestId:
          REQUEST_ID,
        colaboradorId:
          COLABORADOR_ID,
        referenceSetId:
          REFERENCE_SET_ID,
        observedEmbedding:
          observed,
      });
  },
  /FINE_VERIFICATION_REFERENCE_COUNT_INVALID/,
);

assert.equal(
  countDecryptCalled,
  false,
);

process.stdout.write(
  "SYNTHETIC_FINE_VERIFICATION_TEST=GREEN\n",
);
