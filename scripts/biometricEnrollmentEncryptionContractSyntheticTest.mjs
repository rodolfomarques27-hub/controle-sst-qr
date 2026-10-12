import assert from "node:assert/strict";
import {
  Buffer,
} from "node:buffer";
import {
  readFile,
  readdir,
} from "node:fs/promises";

import {
  handleBiometricBrokerRequest,
} from "../supabase/functions/biometric-broker/index.ts";

import {
  BIOMETRIC_KEYRING_ENV,
  decryptBiometricVector128,
  encryptBiometricVector128,
} from "../supabase/functions/_shared/biometricCrypto.ts";

const TENANT_ID =
  "11111111-1111-4111-8111-111111111111";

const EMPRESA_ID =
  "22222222-2222-4222-8222-222222222222";

const COLABORADOR_ID =
  "33333333-3333-4333-8333-333333333333";

const REFERENCE_SET_ID =
  "44444444-4444-4444-8444-444444444444";

const REFERENCE_ID =
  "55555555-5555-4555-8555-555555555555";

const CENTROID_ID =
  "66666666-6666-4666-8666-666666666666";

const REQUEST_REFERENCE_ID =
  "77777777-7777-4777-8777-777777777777";

const REQUEST_CENTROID_ID =
  "88888888-8888-4888-8888-888888888888";

const SOURCE_REF_ID =
  "99999999-9999-4999-8999-999999999999";

const REF_A =
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const REF_B =
  "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const REF_C =
  "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const PROFILE_ID =
  "sface-2021dec";

const QUALITY_PROFILE_ID =
  "sface-2021dec-synthetic-test-v1";

const KEY_VERSION =
  "synthetic-v1";

const BROKER_TOKEN =
  "synthetic-broker-token-0123456789abcdef";

function unitVector(
  index,
) {
  const value =
    new Float32Array(
      128,
    );

  value[index] =
    1;

  return value;
}

function containsNumericVector128(
  value,
) {
  if (
    Array.isArray(
      value,
    )
  ) {
    if (
      value.length ===
        128 &&
      value.every(
        (
          item,
        ) =>
          typeof item ===
            "number",
      )
    ) {
      return true;
    }

    return value.some(
      containsNumericVector128,
    );
  }

  if (
    value &&
    typeof value ===
      "object"
  ) {
    return Object
      .values(
        value,
      )
      .some(
        containsNumericVector128,
      );
  }

  return false;
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
            "S".repeat(
              64,
            ),
        }),

      SUPABASE_SERVICE_ROLE_KEY:
        "",

      SAFESCAN_BIOMETRIC_BROKER_TOKEN:
        BROKER_TOKEN,
    };

  return values[name] ??
    "";
}

const syntheticKey =
  Buffer.alloc(
    32,
    0x2a,
  ).toString(
    "base64",
  );

const hadDeno =
  Object.prototype
    .hasOwnProperty
    .call(
      globalThis,
      "Deno",
    );

const previousDeno =
  globalThis.Deno;

globalThis.Deno =
  {
    env:
      {
        get(
          name,
        ) {
          if (
            name ===
              BIOMETRIC_KEYRING_ENV
          ) {
            return JSON.stringify({
              [KEY_VERSION]:
                syntheticKey,
            });
          }

          return "";
        },
      },
  };

const boundary =
  {
    tenantId:
      TENANT_ID,
    empresaId:
      EMPRESA_ID,
    colaboradorId:
      COLABORADOR_ID,
    profileId:
      PROFILE_ID,
    qualityProfileId:
      QUALITY_PROFILE_ID,
  };

const qualityMetadata =
  {
    approved:
      true,
    faceCount:
      1,
    faceScore:
      0.9,
    faceSizePx:
      120,
    visibleAreaRatio:
      0.9,
    alignmentRms:
      1,
    embeddingL2Norm:
      1,
    reasonCodes:
      [],
  };

const sourceMetadata =
  {
    sourceRef:
      SOURCE_REF_ID,
    retentionMode:
      "NONE",
  };

const referencePlaintext =
  unitVector(
    0,
  );

const centroidPlaintext =
  unitVector(
    1,
  );

const referenceInputSnapshot =
  Array.from(
    referencePlaintext,
  );

const centroidInputSnapshot =
  Array.from(
    centroidPlaintext,
  );

const generatedIds =
  [
    REFERENCE_ID,
    CENTROID_ID,
  ];

const events =
  [];

const mutableVectors =
  [];

let referenceRpcArgs =
  null;

let centroidRpcArgs =
  null;

let referenceEnvelope =
  null;

let centroidEnvelope =
  null;

const adminClient =
  {
    async rpc(
      name,
      args,
    ) {
      if (
        name ===
          "backend_biometric_register_reference_v2"
      ) {
        events.push(
          `rpc-reference:${args.p_reference_id}`,
        );

        referenceRpcArgs =
          args;

        referenceEnvelope =
          args
            .p_encrypted_embedding;

        assert.equal(
          args.p_reference_id,
          REFERENCE_ID,
        );

        assert.equal(
          args.p_reference_set_id,
          REFERENCE_SET_ID,
        );

        assert.deepEqual(
          args.p_boundary,
          boundary,
        );

        assert.equal(
          "p_embedding" in
            args,
          false,
        );

        assert.equal(
          containsNumericVector128(
            args,
          ),
          false,
        );

        return {
          data:
            REFERENCE_ID,
          error:
            null,
        };
      }

      if (
        name ===
          "backend_biometric_store_centroid_v2"
      ) {
        events.push(
          `rpc-centroid:${args.p_centroid_id}`,
        );

        centroidRpcArgs =
          args;

        centroidEnvelope =
          args
            .p_encrypted_centroid;

        assert.equal(
          args.p_centroid_id,
          CENTROID_ID,
        );

        assert.equal(
          args.p_reference_set_id,
          REFERENCE_SET_ID,
        );

        assert.deepEqual(
          args.p_boundary,
          boundary,
        );

        assert.deepEqual(
          args.p_contributing_reference_ids,
          [
            REF_A,
            REF_B,
            REF_C,
          ],
        );

        assert.equal(
          "p_centroid" in
            args,
          false,
        );

        assert.equal(
          containsNumericVector128(
            args,
          ),
          false,
        );

        return {
          data:
            CENTROID_ID,
          error:
            null,
        };
      }

      throw new Error(
        `Unexpected RPC: ${name}`,
      );
    },
  };

function randomUuid() {
  const value =
    generatedIds.shift();

  assert.ok(
    value,
  );

  events.push(
    `uuid:${value}`,
  );

  return value;
}

async function encryptVector(
  input,
) {
  mutableVectors.push(
    input.vector,
  );

  events.push(
    `encrypt:${input.aad.materialKind}:${input.aad.materialId}`,
  );

  return await encryptBiometricVector128(
    input,
  );
}

try {
  const referenceResponse =
    await handleBiometricBrokerRequest(
      requestFor(
        "registerReference",
        {
          referenceSetId:
            REFERENCE_SET_ID,

          boundary,

          qualityMetadata,

          embedding:
            referenceInputSnapshot,

          keyVersion:
            KEY_VERSION,

          sourceMetadata,

          requestId:
            REQUEST_REFERENCE_ID,

          executorId:
            null,
        },
      ),
      {
        readEnv:
          envReader,

        async createAdminClient() {
          return adminClient;
        },

        encryptVector,

        randomUuid,
      },
    );

  assert.equal(
    referenceResponse.status,
    200,
  );

  const referenceBody =
    await referenceResponse
      .json();

  assert.deepEqual(
    referenceBody,
    {
      ok:
        true,
      operation:
        "registerReference",
      result:
        REFERENCE_ID,
    },
  );

  const centroidResponse =
    await handleBiometricBrokerRequest(
      requestFor(
        "storeCentroid",
        {
          referenceSetId:
            REFERENCE_SET_ID,

          boundary,

          contributingReferenceIds:
            [
              REF_A,
              REF_B,
              REF_C,
            ],

          centroid:
            centroidInputSnapshot,

          keyVersion:
            KEY_VERSION,

          requestId:
            REQUEST_CENTROID_ID,

          executorId:
            null,
        },
      ),
      {
        readEnv:
          envReader,

        async createAdminClient() {
          return adminClient;
        },

        encryptVector,

        randomUuid,
      },
    );

  assert.equal(
    centroidResponse.status,
    200,
  );

  const centroidBody =
    await centroidResponse
      .json();

  assert.deepEqual(
    centroidBody,
    {
      ok:
        true,
      operation:
        "storeCentroid",
      result:
        CENTROID_ID,
    },
  );

  assert.deepEqual(
    events,
    [
      `uuid:${REFERENCE_ID}`,
      `encrypt:REFERENCE:${REFERENCE_ID}`,
      `rpc-reference:${REFERENCE_ID}`,
      `uuid:${CENTROID_ID}`,
      `encrypt:CENTROID:${CENTROID_ID}`,
      `rpc-centroid:${CENTROID_ID}`,
    ],
  );

  assert.equal(
    mutableVectors.length,
    2,
  );

  for (
    const vector of
    mutableVectors
  ) {
    assert.equal(
      vector.every(
        (
          item,
        ) =>
          item === 0,
      ),
      true,
    );
  }

  assert.ok(
    referenceRpcArgs,
  );

  assert.ok(
    centroidRpcArgs,
  );

  assert.ok(
    referenceEnvelope,
  );

  assert.ok(
    centroidEnvelope,
  );

  const referenceAad =
    {
      tenantId:
        TENANT_ID,
      empresaId:
        EMPRESA_ID,
      colaboradorId:
        COLABORADOR_ID,
      profileId:
        PROFILE_ID,
      referenceSetId:
        REFERENCE_SET_ID,
      materialKind:
        "REFERENCE",
      materialId:
        REFERENCE_ID,
    };

  const decryptedReference =
    await decryptBiometricVector128({
      envelope:
        referenceEnvelope,
      aad:
        referenceAad,
    });

  assert.deepEqual(
    Array.from(
      decryptedReference,
    ),
    referenceInputSnapshot,
  );

  decryptedReference.fill(
    0,
  );

  await assert.rejects(
    async () => {
      await decryptBiometricVector128({
        envelope:
          referenceEnvelope,

        aad:
          {
            ...referenceAad,

            materialId:
              "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          },
      });
    },
    /BIOMETRIC_DECRYPT_FAILED/,
  );

  const centroidAad =
    {
      tenantId:
        TENANT_ID,
      empresaId:
        EMPRESA_ID,
      colaboradorId:
        COLABORADOR_ID,
      profileId:
        PROFILE_ID,
      referenceSetId:
        REFERENCE_SET_ID,
      materialKind:
        "CENTROID",
      materialId:
        CENTROID_ID,
    };

  const decryptedCentroid =
    await decryptBiometricVector128({
      envelope:
        centroidEnvelope,
      aad:
        centroidAad,
    });

  assert.deepEqual(
    Array.from(
      decryptedCentroid,
    ),
    centroidInputSnapshot,
  );

  decryptedCentroid.fill(
    0,
  );

  await assert.rejects(
    async () => {
      await decryptBiometricVector128({
        envelope:
          centroidEnvelope,

        aad:
          {
            ...centroidAad,

            materialId:
              "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          },
      });
    },
    /BIOMETRIC_DECRYPT_FAILED/,
  );

  const persistedSerialized =
    JSON.stringify({
      referenceRpcArgs,
      centroidRpcArgs,
    });

  assert.equal(
    persistedSerialized.includes(
      syntheticKey,
    ),
    false,
  );

  assert.equal(
    containsNumericVector128({
      referenceRpcArgs,
      centroidRpcArgs,
    }),
    false,
  );

  const responseSerialized =
    JSON.stringify({
      referenceBody,
      centroidBody,
    });

  for (
    const forbidden of
    [
      "ciphertextBase64",
      "ivBase64",
      "keyVersion",
      "thresholds",
      "decision",
    ]
  ) {
    assert.equal(
      responseSerialized.includes(
        forbidden,
      ),
      false,
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

  const registerStart =
    endpointSource.indexOf(
      'case "registerReference"',
    );

  const registerEnd =
    endpointSource.indexOf(
      'case "changeReferenceStatus"',
      registerStart,
    );

  const centroidStart =
    endpointSource.indexOf(
      'case "storeCentroid"',
    );

  const centroidEnd =
    endpointSource.indexOf(
      'case "activateReferenceSet"',
      centroidStart,
    );

  assert.ok(
    registerStart >= 0 &&
    registerEnd >
      registerStart,
  );

  assert.ok(
    centroidStart >= 0 &&
    centroidEnd >
      centroidStart,
  );

  assert.equal(
    /threshold|decision/i.test(
      endpointSource.slice(
        registerStart,
        registerEnd,
      ),
    ),
    false,
  );

  assert.equal(
    /threshold|decision/i.test(
      endpointSource.slice(
        centroidStart,
        centroidEnd,
      ),
    ),
    false,
  );

  const migrationNames =
    (
      await readdir(
        new URL(
          "../supabase/migrations/",
          import.meta.url,
        ),
      )
    ).filter(
      (
        name,
      ) =>
        name.endsWith(
          "_cam_ia_biometric_enrollment_id_contract.sql",
        ),
    );

  assert.equal(
    migrationNames.length,
    1,
  );

  const migrationSource =
    await readFile(
      new URL(
        `../supabase/migrations/${migrationNames[0]}`,
        import.meta.url,
      ),
      "utf8",
    );

  assert.match(
    migrationSource,
    /private\.biometric_backend_register_reference_v2_impl\(\s*p_reference_id uuid,/,
  );

  assert.match(
    migrationSource,
    /private\.biometric_backend_store_centroid_v2_impl\(\s*p_centroid_id uuid,/,
  );

  assert.match(
    migrationSource,
    /public\.backend_biometric_register_reference_v2\(/,
  );

  assert.match(
    migrationSource,
    /public\.backend_biometric_store_centroid_v2\(/,
  );

  assert.match(
    migrationSource,
    /insert into private\.biometric_references \(\s*id,/,
  );

  assert.match(
    migrationSource,
    /insert into private\.biometric_centroids \(\s*id,/,
  );

  assert.match(
    migrationSource,
    /security invoker/,
  );

  assert.match(
    migrationSource,
    /grant execute on function public\.backend_biometric_register_reference_v2[\s\S]*to service_role;/,
  );

  assert.match(
    migrationSource,
    /grant execute on function public\.backend_biometric_store_centroid_v2[\s\S]*to service_role;/,
  );

  assert.equal(
    /\bdrop\s+function\b/i.test(
      migrationSource,
    ),
    false,
  );

  assert.equal(
    /\b(?:create|alter|drop)\s+table\b/i.test(
      migrationSource,
    ),
    false,
  );

  process.stdout.write(
    "SYNTHETIC_BIOMETRIC_ENROLLMENT_ENCRYPTION_CONTRACT_TEST=GREEN\n",
  );
}
finally {
  if (hadDeno) {
    globalThis.Deno =
      previousDeno;
  }
  else {
    delete globalThis.Deno;
  }
}