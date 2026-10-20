import {
  createBiometricBrokerRpc,
  type BiometricRpcClient,
  type EncryptedActiveCentroidCandidate,
} from "./biometricBrokerRpc.ts";

import {
  BIOMETRIC_VECTOR_LENGTH,
  decryptBiometricVector128,
  type BiometricAadInput,
  type BiometricCipherEnvelope,
} from "./biometricCrypto.ts";

export const BIOMETRIC_MATCH_RANK_STATUS =
  Object.freeze({
    RANKED: "RANKED",
    NO_REFERENCE: "NO_REFERENCE",
  } as const);

const UNIT_NORM_TOLERANCE =
  1e-5;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface RankIdentificationInput {
  tenantId: string;
  empresaId: string;
  profileId: string;
  requestId: string;
  observedEmbedding: Float32Array;
}

export interface RankedCentroidCandidate {
  colaboradorId: string;
  referenceSetId: string;
  centroidId: string;
  qualityProfileId: string;
  score: number;
}

export interface BiometricRankingResult {
  status:
    | "RANKED"
    | "NO_REFERENCE";
  tenantId: string;
  empresaId: string;
  profileId: string;
  requestId: string;
  candidateCount: number;
  colaboradorId:
    | string
    | null;
  referenceSetId:
    | string
    | null;
  top1:
    | RankedCentroidCandidate
    | null;
  top2:
    | RankedCentroidCandidate
    | null;
  margin:
    | number
    | null;
  ranking:
    readonly RankedCentroidCandidate[];
  thresholds: null;
  decision: null;
}

type DecryptVector =
  typeof decryptBiometricVector128;

function requireText(
  value: unknown,
  label: string,
  maxLength = 1024,
) {
  if (
    typeof value !== "string"
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

function requireCandidate(
  value: EncryptedActiveCentroidCandidate,
  index: number,
) {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    throw new TypeError(
      `candidates[${index}] is invalid.`,
    );
  }

  return Object.freeze({
    colaboradorId:
      requireUuid(
        value.colaboradorId,
        `candidates[${index}].colaboradorId`,
      ),

    referenceSetId:
      requireUuid(
        value.referenceSetId,
        `candidates[${index}].referenceSetId`,
      ),

    centroidId:
      requireUuid(
        value.centroidId,
        `candidates[${index}].centroidId`,
      ),

    qualityProfileId:
      requireText(
        value.qualityProfileId,
        `candidates[${index}].qualityProfileId`,
      ),

    envelope:
      Object.freeze({
        ciphertextBase64:
          requireText(
            value.ciphertextBase64,
            `candidates[${index}].ciphertextBase64`,
            65536,
          ),

        ivBase64:
          requireText(
            value.ivBase64,
            `candidates[${index}].ivBase64`,
            4096,
          ),

        keyVersion:
          requireText(
            value.keyVersion,
            `candidates[${index}].keyVersion`,
            128,
          ),

        cipherVersion:
          requireText(
            value.cipherVersion,
            `candidates[${index}].cipherVersion`,
            128,
          ),

        cipherSha256:
          requireText(
            value.cipherSha256,
            `candidates[${index}].cipherSha256`,
            64,
          ),
      }) as BiometricCipherEnvelope,
  });
}

function compareRankedCandidates(
  left: RankedCentroidCandidate,
  right: RankedCentroidCandidate,
) {
  if (
    right.score !==
    left.score
  ) {
    return right.score -
      left.score;
  }

  if (
    left.colaboradorId !==
    right.colaboradorId
  ) {
    return left.colaboradorId.localeCompare(
      right.colaboradorId,
    );
  }

  return left.referenceSetId.localeCompare(
    right.referenceSetId,
  );
}

function assertResponseBoundary({
  response,
  tenantId,
  empresaId,
  profileId,
  requestId,
}: {
  response: Record<string, unknown>;
  tenantId: string;
  empresaId: string;
  profileId: string;
  requestId: string;
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
    ];

  for (
    const [
      key,
      expected,
    ] of checks
  ) {
    const actual =
      response[key];

    if (
      actual !==
        undefined &&
      actual !==
        expected
    ) {
      throw new Error(
        `BROKER_BOUNDARY_MISMATCH_${key.toUpperCase()}`,
      );
    }
  }
}

export function createBiometricMatchBroker({
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
    async rankIdentification(
      input: RankIdentificationInput,
    ): Promise<BiometricRankingResult> {
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

      const observedEmbedding =
        assertNormalizedVector128(
          input?.observedEmbedding,
          "observedEmbedding",
        );

      const response =
        await brokerRpc
          .listActiveCentroids({
            tenantId,
            empresaId,
            profileId,
            requestId,
          });

      assertResponseBoundary({
        response,
        tenantId,
        empresaId,
        profileId,
        requestId,
      });

      const rawCandidates =
        response.candidates ??
        [];

      if (
        !Array.isArray(
          rawCandidates,
        )
      ) {
        throw new TypeError(
          "Broker candidate response is invalid.",
        );
      }

      if (
        rawCandidates.length ===
        0
      ) {
        return Object.freeze({
          status:
            BIOMETRIC_MATCH_RANK_STATUS.NO_REFERENCE,
          tenantId,
          empresaId,
          profileId,
          requestId,
          candidateCount:
            0,
          colaboradorId:
            null,
          referenceSetId:
            null,
          top1:
            null,
          top2:
            null,
          margin:
            null,
          ranking:
            Object.freeze([]),
          thresholds:
            null,
          decision:
            null,
        });
      }

      const ranking:
        RankedCentroidCandidate[] =
        [];

      for (
        let index = 0;
        index <
        rawCandidates.length;
        index += 1
      ) {
        const candidate =
          requireCandidate(
            rawCandidates[index],
            index,
          );

        const aad:
          BiometricAadInput =
          {
            tenantId,
            empresaId,
            colaboradorId:
              candidate.colaboradorId,
            profileId,
            referenceSetId:
              candidate.referenceSetId,
            materialKind:
              "CENTROID",
            materialId:
              candidate.centroidId,
          };

        let centroid:
          Float32Array | null =
          null;

        try {
          centroid =
            await decryptVector({
              envelope:
                candidate.envelope,
              aad,
            });

          assertNormalizedVector128(
            centroid,
            `centroid[${index}]`,
          );

          const score =
            cosineSimilarity128(
              observedEmbedding,
              centroid,
            );

          ranking.push(
            Object.freeze({
              colaboradorId:
                candidate.colaboradorId,
              referenceSetId:
                candidate.referenceSetId,
              centroidId:
                candidate.centroidId,
              qualityProfileId:
                candidate.qualityProfileId,
              score,
            }),
          );
        } finally {
          if (centroid) {
            centroid.fill(0);
          }
        }
      }

      ranking.sort(
        compareRankedCandidates,
      );

      const top1 =
        ranking[0] ??
        null;

      const top2 =
        ranking[1] ??
        null;

      const margin =
        top1 &&
        top2
          ? top1.score -
            top2.score
          : null;

      return Object.freeze({
        status:
          BIOMETRIC_MATCH_RANK_STATUS.RANKED,
        tenantId,
        empresaId,
        profileId,
        requestId,
        candidateCount:
          ranking.length,
        colaboradorId:
          top1?.colaboradorId ??
          null,
        referenceSetId:
          top1?.referenceSetId ??
          null,
        top1,
        top2,
        margin,
        ranking:
          Object.freeze(
            [...ranking],
          ),
        thresholds:
          null,
        decision:
          null,
      });
    },
  });
}
