import assert from "node:assert/strict";
import {
  readFile,
} from "node:fs/promises";

import {
  handleBiometricBrokerRequest,
} from "../supabase/functions/biometric-broker/index.ts";

const TENANT_ID =
  "11111111-1111-4111-8111-111111111111";

const EMPRESA_ID =
  "22222222-2222-4222-8222-222222222222";

const REQUEST_ID =
  "33333333-3333-4333-8333-333333333333";

const COLLABORATOR_A =
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const COLLABORATOR_B =
  "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const SET_A =
  "aaaaaaaa-1111-4111-8111-111111111111";

const SET_B =
  "bbbbbbbb-1111-4111-8111-111111111111";

const CENTROID_A =
  "aaaaaaaa-2222-4222-8222-222222222222";

const CENTROID_B =
  "bbbbbbbb-2222-4222-8222-222222222222";

const PROFILE_ID =
  "sface-2021dec";

const BROKER_TOKEN =
  "synthetic-broker-token-0123456789abcdef";

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
  colaboradorId,
  referenceSetId,
  centroidId,
  token,
}) {
  return {
    colaboradorId,
    referenceSetId,
    centroidId,

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

function reference(
  referenceId,
  token,
) {
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
      "B".repeat(64),
  };
}

const vectors =
  new Map([
    [
      "centroid-a",
      normalizedVector(
        1,
        0,
      ),
    ],

    [
      "centroid-b",
      normalizedVector(
        0.8,
        0.6,
      ),
    ],

    [
      "reference-a1",
      normalizedVector(
        1,
        0,
      ),
    ],

    [
      "reference-a2",
      normalizedVector(
        0.8,
        0.6,
      ),
    ],

    [
      "reference-a3",
      normalizedVector(
        0.6,
        0.8,
      ),
    ],
  ]);

function envReader(
  name,
) {
  const values =
    {
      SUPABASE_URL:
        "https://synthetic.supabase.co",

      SUPABASE_SECRET_KEYS:
        JSON.stringify({
          "biometric-broker":
            "S".repeat(64),
        }),

      SUPABASE_SERVICE_ROLE_KEY:
        "",

      SAFESCAN_BIOMETRIC_BROKER_TOKEN:
        BROKER_TOKEN,
    };

  return values[name] ?? "";
}

function requestFor(
  operation,
  input,
) {
  return new Request(
    "https://synthetic.local/biometric-broker",
    {
      method:
        "POST",

      headers:
        {
          "content-type":
            "application/json",

          "x-safescan-broker-token":
            BROKER_TOKEN,
        },

      body:
        JSON.stringify({
          operation,
          input,
        }),
    },
  );
}

const endpointSource =
  await readFile(
    new URL(
      "../supabase/functions/biometric-broker/index.ts",
      import.meta.url,
    ),
    "utf8",
  );

const allowedBlock =
  endpointSource.match(
    /const ALLOWED_OPERATIONS = new Set\(\[([\s\S]*?)\]\);/,
  );

assert.ok(
  allowedBlock,
);

const allowedOperations =
  Array.from(
    allowedBlock[1]
      .matchAll(
        /"([^"]+)"/g,
      ),
    (
      match,
    ) =>
      match[1],
  );

assert.deepEqual(
  allowedOperations,
  [
    "createReferenceSet",
    "registerReference",
    "changeReferenceStatus",
    "storeCentroid",
    "activateReferenceSet",
    "identify",
  ],
);

assert.equal(
  allowedOperations.includes(
    "listActiveCentroids",
  ),
  false,
);

assert.equal(
  allowedOperations.includes(
    "getActiveBundle",
  ),
  false,
);

const decryptedBuffers =
  [];

const adminClient =
  {
    async rpc(
      name,
      args,
    ) {
      if (
        name ===
        "backend_biometric_list_active_centroids"
      ) {
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

              candidates:
                [
                  candidate({
                    colaboradorId:
                      COLLABORATOR_A,

                    referenceSetId:
                      SET_A,

                    centroidId:
                      CENTROID_A,

                    token:
                      "centroid-a",
                  }),

                  candidate({
                    colaboradorId:
                      COLLABORATOR_B,

                    referenceSetId:
                      SET_B,

                    centroidId:
                      CENTROID_B,

                    token:
                      "centroid-b",
                  }),
                ],
            },

          error:
            null,
        };
      }

      if (
        name ===
        "backend_biometric_get_active_bundle"
      ) {
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
          COLLABORATOR_A,
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
              requestId:
                REQUEST_ID,

              referenceSetId:
                SET_A,

              tenantId:
                TENANT_ID,

              empresaId:
                EMPRESA_ID,

              colaboradorId:
                COLLABORATOR_A,

              profileId:
                PROFILE_ID,

              qualityProfileId:
                "quality-v1",

              centroid:
                {},

              references:
                [
                  reference(
                    "aaaaaaaa-aaaa-4aaa-8aaa-111111111111",
                    "reference-a1",
                  ),

                  reference(
                    "aaaaaaaa-aaaa-4aaa-8aaa-222222222222",
                    "reference-a2",
                  ),

                  reference(
                    "aaaaaaaa-aaaa-4aaa-8aaa-333333333333",
                    "reference-a3",
                  ),
                ],
            },

          error:
            null,
        };
      }

      throw new Error(
        `Unexpected RPC: ${name}`,
      );
    },
  };

const observed =
  normalizedVector(
    1,
    0,
  );

const response =
  await handleBiometricBrokerRequest(
    requestFor(
      "identify",
      {
        tenantId:
          TENANT_ID,

        empresaId:
          EMPRESA_ID,

        profileId:
          PROFILE_ID,

        requestId:
          REQUEST_ID,

        observedEmbedding:
          Array.from(
            observed,
          ),
      },
    ),
    {
      readEnv:
        envReader,

      async createAdminClient() {
        return adminClient;
      },

      async decryptVector({
        envelope,
      }) {
        const source =
          vectors.get(
            envelope.ciphertextBase64,
          );

        assert.ok(
          source,
        );

        const copy =
          new Float32Array(
            source,
          );

        decryptedBuffers.push(
          copy,
        );

        return copy;
      },
    },
  );

assert.equal(
  response.status,
  200,
);

const body =
  await response.json();

assert.equal(
  body.ok,
  true,
);

assert.equal(
  body.operation,
  "identify",
);

assert.equal(
  body.result.status,
  "RANKED",
);

assert.equal(
  body.result.candidateCount,
  2,
);

assert.equal(
  body.result.top1.colaboradorId,
  COLLABORATOR_A,
);

assert.equal(
  body.result.top1.referenceSetId,
  SET_A,
);

assert.equal(
  body.result.top2.colaboradorId,
  COLLABORATOR_B,
);

assert.ok(
  Math.abs(
    body.result.top1.score -
      1,
  ) <
    1e-6,
);

assert.ok(
  Math.abs(
    body.result.top2.score -
      0.8,
  ) <
    1e-6,
);

assert.ok(
  Math.abs(
    body.result.margin -
      0.2,
  ) <
    1e-6,
);

assert.equal(
  body.result
    .fineVerification
    .referenceCount,
  3,
);

assert.ok(
  Math.abs(
    body.result
      .fineVerification
      .bestScore -
      1,
  ) <
    1e-6,
);

assert.ok(
  Math.abs(
    body.result
      .fineVerification
      .worstScore -
      0.6,
  ) <
    1e-6,
);

assert.ok(
  Math.abs(
    body.result
      .fineVerification
      .meanScore -
      0.8,
  ) <
    1e-6,
);

assert.equal(
  body.result.thresholds,
  null,
);

assert.equal(
  body.result.decision,
  null,
);

assert.equal(
  decryptedBuffers.length,
  5,
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

const serialized =
  JSON.stringify(
    body,
  );

for (
  const forbidden of
  [
    "ciphertextBase64",
    "ivBase64",
    "keyVersion",
    "cipherSha256",
    "centroid-a",
    "reference-a1",
    "synthetic-v1",
  ]
) {
  assert.equal(
    serialized.includes(
      forbidden,
    ),
    false,
  );
}

const noReferenceResponse =
  await handleBiometricBrokerRequest(
    requestFor(
      "identify",
      {
        tenantId:
          TENANT_ID,

        empresaId:
          EMPRESA_ID,

        profileId:
          PROFILE_ID,

        requestId:
          REQUEST_ID,

        observedEmbedding:
          Array.from(
            observed,
          ),
      },
    ),
    {
      readEnv:
        envReader,

      async createAdminClient() {
        return {
          async rpc(
            name,
          ) {
            assert.equal(
              name,
              "backend_biometric_list_active_centroids",
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

                  candidates:
                    [],
                },

              error:
                null,
            };
          },
        };
      },

      async decryptVector() {
        throw new Error(
          "decryptVector must not run for NO_REFERENCE.",
        );
      },
    },
  );

assert.equal(
  noReferenceResponse.status,
  200,
);

const noReferenceBody =
  await noReferenceResponse.json();

assert.deepEqual(
  noReferenceBody.result,
  {
    status:
      "NO_REFERENCE",

    candidateCount:
      0,

    top1:
      null,

    top2:
      null,

    margin:
      null,

    fineVerification:
      null,

    thresholds:
      null,

    decision:
      null,
  },
);

for (
  const internalOperation of
  [
    "listActiveCentroids",
    "getActiveBundle",
  ]
) {
  const internalResponse =
    await handleBiometricBrokerRequest(
      requestFor(
        internalOperation,
        {},
      ),
      {
        readEnv:
          envReader,

        async createAdminClient() {
          throw new Error(
            "Internal operation must be rejected before client creation.",
          );
        },
      },
    );

  assert.equal(
    internalResponse.status,
    400,
  );

  const internalBody =
    await internalResponse.json();

  assert.equal(
    internalBody.code,
    "INVALID_OPERATION",
  );
}

const extraFieldResponse =
  await handleBiometricBrokerRequest(
    requestFor(
      "identify",
      {
        tenantId:
          TENANT_ID,

        empresaId:
          EMPRESA_ID,

        profileId:
          PROFILE_ID,

        requestId:
          REQUEST_ID,

        observedEmbedding:
          Array.from(
            observed,
          ),

        forbiddenExtraField:
          true,
      },
    ),
    {
      readEnv:
        envReader,

      async createAdminClient() {
        return adminClient;
      },
    },
  );

assert.equal(
  extraFieldResponse.status,
  400,
);

const extraFieldBody =
  await extraFieldResponse.json();

assert.equal(
  extraFieldBody.code,
  "INVALID_IDENTIFY_PAYLOAD",
);

const invalidEmbeddingResponse =
  await handleBiometricBrokerRequest(
    requestFor(
      "identify",
      {
        tenantId:
          TENANT_ID,

        empresaId:
          EMPRESA_ID,

        profileId:
          PROFILE_ID,

        requestId:
          REQUEST_ID,

        observedEmbedding:
          Array(
            128,
          ).fill(
            0,
          ),
      },
    ),
    {
      readEnv:
        envReader,

      async createAdminClient() {
        return adminClient;
      },
    },
  );

assert.equal(
  invalidEmbeddingResponse.status,
  400,
);

const invalidEmbeddingBody =
  await invalidEmbeddingResponse.json();

assert.equal(
  invalidEmbeddingBody.code,
  "OBSERVED_EMBEDDING_NOT_NORMALIZED",
);

process.stdout.write(
  "SYNTHETIC_BIOMETRIC_IDENTIFICATION_HTTP_TEST=GREEN\n",
);
