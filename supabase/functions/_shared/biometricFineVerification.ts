import {
  createBiometricBrokerRpc,
  type BiometricRpcClient,
  type EncryptedActiveBundle,
} from "./biometricBrokerRpc.ts";

import {
  BIOMETRIC_VECTOR_LENGTH,
  decryptBiometricVector128,
  type BiometricAadInput,
  type BiometricCipherEnvelope,
} from "./biometricCrypto.ts";

const UNIT_NORM_TOLERANCE =
  1e-5;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface FineVerificationInput {
  tenantId: string;
  empresaId: string;
  profileId: string;
  requestId: string;
  colaboradorId: string;
  referenceSetId: string;
  observedEmbedding: Float32Array;
}

export interface FineReferenceScore {
  referenceId: string;
  score: number;
}

export interface FineVerificationResult {
  tenantId: string;
  empresaId: string;
  profileId: string;
  requestId: string;
  colaboradorId: string;
  referenceSetId: string;
  referenceCount: number;
  referenceScores:
    readonly FineReferenceScore[];
  bestScore: number;
  worstScore: number;
  meanScore: number;
  bestReferenceId: string;
  thresholds: null;
  decision: null;
}

type JsonRecord =
  Record<string, unknown>;

type DecryptVector =
  typeof decryptBiometricVector128;

function requireText(
  value: unknown,
  label: string,
  maxLength = 1024,
) {
  if (
    typeof value !==
      "string"
  ) {
    throw new TypeError(
      `${label} is required.`,
    );
  }

  const normalized =
    value
      .replace(/\0/g, "")
      .trim();

  if (
    !normalized ||
    normalized.length >
      maxLength
  ) {
    throw new TypeError(
      `${label} is invalid.`,
    );
  }

  return normalized;
}

function requireUuid(
  value: unknown,
  label: string,
) {
  const normalized =
    requireText(
      value,
      label,
      64,
    );

  if (
    !UUID_PATTERN.test(
      normalized,
    )
  ) {
    throw new TypeError(
      `${label} must be UUID.`,
    );
  }

  return normalized.toLowerCase();
}

function requireRecord(
  value: unknown,
  label: string,
): JsonRecord {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value,
    )
  ) {
    throw new TypeError(
      `${label} must be object.`,
    );
  }

  return value as
    JsonRecord;
}

function assertNormalizedVector128(
  vector: unknown,
  label: string,
) {
  if (
    !(
      vector instanceof
      Float32Array
    )
  ) {
    throw new TypeError(
      `${label} must be Float32Array.`,
    );
  }

  if (
    vector.length !==
    BIOMETRIC_VECTOR_LENGTH
  ) {
    throw new RangeError(
      `${label} must contain exactly ${BIOMETRIC_VECTOR_LENGTH} values.`,
    );
  }

  let sumSquares =
    0;

  for (
    let index = 0;
    index < vector.length;
    index += 1
  ) {
    const value =
      vector[index];

    if (
      !Number.isFinite(
        value,
      )
    ) {
      throw new RangeError(
        `${label}[${index}] must be finite.`,
      );
    }

    sumSquares +=
      value *
      value;
  }

  const norm =
    Math.sqrt(
      sumSquares,
    );

  if (
    !Number.isFinite(
      norm,
    ) ||
    Math.abs(
      norm - 1,
    ) >
      UNIT_NORM_TOLERANCE
  ) {
    throw new RangeError(
      `${label} must be L2-normalized.`,
    );
  }

  return vector;
}

function cosineSimilarity128(
  left: Float32Array,
  right: Float32Array,
) {
  assertNormalizedVector128(
    left,
    "left",
  );

  assertNormalizedVector128(
    right,
    "right",
  );

  let dot =
    0;

  let leftSquares =
    0;

  let rightSquares =
    0;

  for (
    let index = 0;
    index <
      BIOMETRIC_VECTOR_LENGTH;
    index += 1
  ) {
    const leftValue =
      left[index];

    const rightValue =
      right[index];

    dot +=
      leftValue *
      rightValue;

    leftSquares +=
      leftValue *
      leftValue;

    rightSquares +=
      rightValue *
      rightValue;
  }

  const denominator =
    Math.sqrt(
      leftSquares,
    ) *
    Math.sqrt(
      rightSquares,
    );

  if (
    !Number.isFinite(
      denominator,
    ) ||
    denominator <=
      Number.EPSILON
  ) {
    throw new RangeError(
      "Cosine similarity requires positive finite norms.",
    );
  }

  const similarity =
    dot /
    denominator;

  if (
    !Number.isFinite(
      similarity,
    )
  ) {
    throw new RangeError(
      "Cosine similarity produced non-finite value.",
    );
  }

  return Math.max(
    -1,
    Math.min(
      1,
      similarity,
    ),
  );
}

function assertBundleBoundary({
  bundle,
  tenantId,
  empresaId,
  profileId,
  requestId,
  colaboradorId,
  referenceSetId,
}: {
  bundle:
    EncryptedActiveBundle;
  tenantId: string;
  empresaId: string;
  profileId: string;
  requestId: string;
  colaboradorId: string;
  referenceSetId: string;
}) {
  const checks:
    Array<
      [
        string,
        string,
      ]
    > =
    [
      [
        "tenantId",
        tenantId,
      ],
      [
        "empresaId",
        empresaId,
      ],
      [
        "profileId",
        profileId,
      ],
      [
        "requestId",
        requestId,
      ],
      [
        "colaboradorId",
        colaboradorId,
      ],
      [
        "referenceSetId",
        referenceSetId,
      ],
    ];

  for (
    const [
      key,
      expected,
    ] of checks
  ) {
    const actual =
      bundle[key];

    if (
      actual !==
      expected
    ) {
      throw new Error(
        `FINE_VERIFICATION_BOUNDARY_REJECTED_${key.toUpperCase()}`,
      );
    }
  }
}

function requireReference(
  value: unknown,
  index: number,
) {
  const record =
    requireRecord(
      value,
      `references[${index}]`,
    );

  return Object.freeze({
    referenceId:
      requireUuid(
        record.referenceId,
        `references[${index}].referenceId`,
      ),

    envelope:
      Object.freeze({
        ciphertextBase64:
          requireText(
            record.ciphertextBase64,
            `references[${index}].ciphertextBase64`,
            65536,
          ),

        ivBase64:
          requireText(
            record.ivBase64,
            `references[${index}].ivBase64`,
            4096,
          ),

        keyVersion:
          requireText(
            record.keyVersion,
            `references[${index}].keyVersion`,
            128,
          ),

        cipherVersion:
          requireText(
            record.cipherVersion,
            `references[${index}].cipherVersion`,
            128,
          ),

        cipherSha256:
          requireText(
            record.cipherSha256,
            `references[${index}].cipherSha256`,
            64,
          ),
      }) as BiometricCipherEnvelope,
  });
}

function compareReferenceScores(
  left: FineReferenceScore,
  right: FineReferenceScore,
) {
  if (
    right.score !==
    left.score
  ) {
    return right.score -
      left.score;
  }

  return left.referenceId.localeCompare(
    right.referenceId,
  );
}

export function createBiometricFineVerification({
  rpcClient,
  decryptVector =
    decryptBiometricVector128,
}: {
  rpcClient: BiometricRpcClient;
  decryptVector?: DecryptVector;
}) {
  if (
    typeof decryptVector !==
    "function"
  ) {
    throw new TypeError(
      "decryptVector is required.",
    );
  }

  const brokerRpc =
    createBiometricBrokerRpc(
      rpcClient,
    );

  return Object.freeze({
    async verifyCandidate(
      input: FineVerificationInput,
    ): Promise<FineVerificationResult> {
      const tenantId =
        requireUuid(
          input?.tenantId,
          "tenantId",
        );

      const empresaId =
        requireUuid(
          input?.empresaId,
          "empresaId",
        );

      const profileId =
        requireText(
          input?.profileId,
          "profileId",
        );

      const requestId =
        requireUuid(
          input?.requestId,
          "requestId",
        );

      const colaboradorId =
        requireUuid(
          input?.colaboradorId,
          "colaboradorId",
        );

      const referenceSetId =
        requireUuid(
          input?.referenceSetId,
          "referenceSetId",
        );

      const observedEmbedding =
        assertNormalizedVector128(
          input?.observedEmbedding,
          "observedEmbedding",
        );

      const bundle =
        await brokerRpc
          .getActiveBundle({
            tenantId,
            empresaId,
            colaboradorId,
            profileId,
            requestId,
          });

      assertBundleBoundary({
        bundle,
        tenantId,
        empresaId,
        profileId,
        requestId,
        colaboradorId,
        referenceSetId,
      });

      const references =
        bundle.references;

      if (
        !Array.isArray(
          references,
        ) ||
        references.length <
          3 ||
        references.length >
          5
      ) {
        throw new Error(
          "FINE_VERIFICATION_REFERENCE_COUNT_INVALID",
        );
      }

      const referenceScores:
        FineReferenceScore[] =
        [];

      for (
        let index = 0;
        index <
          references.length;
        index += 1
      ) {
        const reference =
          requireReference(
            references[index],
            index,
          );

        const aad:
          BiometricAadInput =
          {
            tenantId,
            empresaId,
            colaboradorId,
            profileId,
            referenceSetId,
            materialKind:
              "REFERENCE",
            materialId:
              reference.referenceId,
          };

        let referenceEmbedding:
          Float32Array | null =
          null;

        try {
          referenceEmbedding =
            await decryptVector({
              envelope:
                reference.envelope,
              aad,
            });

          assertNormalizedVector128(
            referenceEmbedding,
            `referenceEmbedding[${index}]`,
          );

          const score =
            cosineSimilarity128(
              observedEmbedding,
              referenceEmbedding,
            );

          referenceScores.push(
            Object.freeze({
              referenceId:
                reference.referenceId,
              score,
            }),
          );
        } finally {
          if (
            referenceEmbedding
          ) {
            referenceEmbedding.fill(
              0,
            );
          }
        }
      }

      referenceScores.sort(
        compareReferenceScores,
      );

      const best =
        referenceScores[0];

      const worst =
        referenceScores[
          referenceScores.length -
          1
        ];

      let scoreTotal =
        0;

      for (
        const item of
        referenceScores
      ) {
        scoreTotal +=
          item.score;
      }

      const meanScore =
        scoreTotal /
        referenceScores.length;

      if (
        !Number.isFinite(
          meanScore,
        )
      ) {
        throw new Error(
          "FINE_VERIFICATION_MEAN_INVALID",
        );
      }

      return Object.freeze({
        tenantId,
        empresaId,
        profileId,
        requestId,
        colaboradorId,
        referenceSetId,
        referenceCount:
          referenceScores.length,
        referenceScores:
          Object.freeze(
            [
              ...referenceScores,
            ],
          ),
        bestScore:
          best.score,
        worstScore:
          worst.score,
        meanScore,
        bestReferenceId:
          best.referenceId,
        thresholds:
          null,
        decision:
          null,
      });
    },
  });
}
