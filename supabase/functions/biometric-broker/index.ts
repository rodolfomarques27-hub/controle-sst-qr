
import {
  BiometricRpcError,
  createBiometricBrokerRpc,
  type BiometricRpcClient,
  type JsonRecord,
} from "../_shared/biometricBrokerRpc.ts";

import {
  BIOMETRIC_MATCH_RANK_STATUS,
  createBiometricMatchBroker,
  type RankedCentroidCandidate,
} from "../_shared/biometricMatchBroker.ts";

import {
  createBiometricFineVerification,
} from "../_shared/biometricFineVerification.ts";

import {
  decryptBiometricVector128,
  encryptBiometricVector128,
} from "../_shared/biometricCrypto.ts";

const ALLOWED_OPERATIONS = new Set([
  "createReferenceSet",
  "registerReference",
  "changeReferenceStatus",
  "storeCentroid",
  "activateReferenceSet",
  "revokeLegalAuthorization",
  "identify",
]);

const HUMAN_REQUIRED_OPERATIONS = new Set([
  "createReferenceSet",
  "registerReference",
  "changeReferenceStatus",
  "storeCentroid",
  "activateReferenceSet",
  "revokeLegalAuthorization",
]);

const ALLOWED_REFERENCE_STATUS = new Set([
  "ACTIVE",
  "QUARANTINED",
  "REVOKED",
]);

const MAX_BODY_BYTES = 512 * 1024;
const MAX_BROKER_TOKEN_BYTES = 512;

const BIOMETRIC_VECTOR_LENGTH =
  128;

const UNIT_NORM_TOLERANCE =
  1e-5;

const IDENTIFY_INPUT_FIELDS =
  Object.freeze([
    "tenantId",
    "empresaId",
    "profileId",
    "requestId",
    "observedEmbedding",
  ]);

type ReadEnv =
  (
    name: string,
  ) => string;

type DecryptVector =
  typeof decryptBiometricVector128;

type EncryptVector =
  typeof encryptBiometricVector128;

type RandomUuid =
  () => string;

interface AdminClientLike {
  rpc(
    name: string,
    args: JsonRecord,
  ): Promise<{
    data: unknown;
    error: {
      message?: string;
      code?: string;
    } | null;
  }>;
}


interface UserClientLike {
  auth: {
    getUser(): Promise<{
      data: {
        user?: {
          id?: string;
        } | null;
      } | null;
      error: {
        message?: string;
      } | null;
    }>;
  };

  rpc(
    name: string,
    args: JsonRecord,
  ): Promise<{
    data: unknown;
    error: {
      message?: string;
      code?: string;
    } | null;
  }>;
}

interface BrokerEndpointDependencies {
  readEnv?: ReadEnv;

  createAdminClient?: (
    supabaseUrl: string,
    adminKey: string,
  ) => Promise<AdminClientLike>;


  createUserClient?: (
    supabaseUrl: string,
    anonKey: string,
    authorization: string,
  ) => Promise<UserClientLike>;

  decryptVector?: DecryptVector;
  encryptVector?: EncryptVector;
  randomUuid?: RandomUuid;
}

class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    status: number,
    code: string,
  ) {
    super(code);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

function jsonResponse(
  status: number,
  body: JsonRecord,
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}

function record(
  value: unknown,
): JsonRecord {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new HttpError(
      400,
      "INVALID_PAYLOAD",
    );
  }

  return value as JsonRecord;
}

function text(
  value: unknown,
  maxLength = 1000,
) {
  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return "";
  }

  return String(value)
    .replace(/\0/g, "")
    .trim()
    .slice(0, maxLength);
}

function requiredText(
  source: JsonRecord,
  field: string,
  maxLength = 200,
) {
  const value =
    text(
      source[field],
      maxLength,
    );

  if (!value) {
    throw new HttpError(
      400,
      "INVALID_PAYLOAD",
    );
  }

  return value;
}

function validUuid(
  value: string,
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(value);
}

function requiredUuid(
  source: JsonRecord,
  field: string,
) {
  const value =
    requiredText(
      source,
      field,
      80,
    );

  if (!validUuid(value)) {
    throw new HttpError(
      400,
      "INVALID_PAYLOAD",
    );
  }

  return value;
}

function nullableUuid(
  source: JsonRecord,
  field: string,
) {
  const raw =
    source[field];

  if (
    raw === undefined ||
    raw === null ||
    text(raw, 80) === ""
  ) {
    return null;
  }

  return requiredUuid(
    source,
    field,
  );
}

function requiredRecord(
  source: JsonRecord,
  field: string,
) {
  return record(
    source[field],
  );
}

function requiredUuidArray(
  source: JsonRecord,
  field: string,
) {
  const value =
    source[field];

  if (
    !Array.isArray(value) ||
    value.length < 3 ||
    value.length > 5
  ) {
    throw new HttpError(
      400,
      "INVALID_PAYLOAD",
    );
  }

  const ids =
    value.map(
      (item) =>
        text(
          item,
          80,
        ),
    );

  if (
    ids.some(
      (id) =>
        !validUuid(id),
    )
  ) {
    throw new HttpError(
      400,
      "INVALID_PAYLOAD",
    );
  }

  return ids;
}

function assertExactIdentifyInput(
  input: JsonRecord,
) {
  const keys =
    Object.keys(
      input,
    ).sort();

  const expected =
    [
      ...IDENTIFY_INPUT_FIELDS,
    ].sort();

  if (
    keys.length !==
      expected.length ||
    keys.some(
      (
        key,
        index,
      ) =>
        key !==
        expected[index],
    )
  ) {
    throw new HttpError(
      400,
      "INVALID_IDENTIFY_PAYLOAD",
    );
  }
}

function requiredNormalizedEmbedding(
  source: JsonRecord,
  field: string,
) {
  const raw =
    source[field];

  if (
    !Array.isArray(
      raw,
    ) ||
    raw.length !==
      BIOMETRIC_VECTOR_LENGTH
  ) {
    throw new HttpError(
      400,
      "INVALID_OBSERVED_EMBEDDING",
    );
  }

  const vector =
    new Float32Array(
      BIOMETRIC_VECTOR_LENGTH,
    );

  let sumSquares =
    0;

  try {
    for (
      let index = 0;
      index <
        raw.length;
      index += 1
    ) {
      const value =
        raw[index];

      if (
        typeof value !==
          "number" ||
        !Number.isFinite(
          value,
        )
      ) {
        throw new HttpError(
          400,
          "INVALID_OBSERVED_EMBEDDING",
        );
      }

      vector[index] =
        value;

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
      throw new HttpError(
        400,
        "OBSERVED_EMBEDDING_NOT_NORMALIZED",
      );
    }

    return {
      raw,
      vector,
    };
  } catch (error) {
    vector.fill(0);

    throw error;
  }
}

function wipeNumberArray(
  values: unknown[],
) {
  for (
    let index = 0;
    index <
      values.length;
    index += 1
  ) {
    values[index] =
      0;
  }
}

function publicRankCandidate(
  candidate:
    RankedCentroidCandidate |
    null,
) {
  if (!candidate) {
    return null;
  }

  return Object.freeze({
    colaboradorId:
      candidate.colaboradorId,

    referenceSetId:
      candidate.referenceSetId,

    score:
      candidate.score,
  });
}

function timingSafeEqual(
  received: string,
  expected: string,
) {
  const encoder =
    new TextEncoder();

  const left =
    encoder.encode(
      received,
    );

  const right =
    encoder.encode(
      expected,
    );

  const withinBounds =
    left.length > 0 &&
    right.length >= 32 &&
    left.length <= MAX_BROKER_TOKEN_BYTES &&
    right.length <= MAX_BROKER_TOKEN_BYTES;

  let difference =
    left.length ^
    right.length;

  for (
    let index = 0;
    index < MAX_BROKER_TOKEN_BYTES;
    index += 1
  ) {
    difference |=
      (left[index] ?? 0) ^
      (right[index] ?? 0);
  }

  return (
    withinBounds &&
    difference === 0
  );
}

function readSupabaseAdminKey(readEnv: ReadEnv) {
  const secretKeysRaw =
    (
      readEnv(
        "SUPABASE_SECRET_KEYS",
      ) || ""
    ).trim();

  if (secretKeysRaw) {
    try {
      const parsed =
        JSON.parse(
          secretKeysRaw,
        );

      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        const keys =
          parsed as JsonRecord;

        const namedKey =
          text(
            keys["biometric-broker"],
            4096,
          );

        if (namedKey) {
          return namedKey;
        }

        const defaultKey =
          text(
            keys.default,
            4096,
          );

        if (defaultKey) {
          return defaultKey;
        }
      }
    } catch {
      // Fallback legado controlado abaixo.
    }
  }

  return (
    readEnv(
      "SUPABASE_SERVICE_ROLE_KEY",
    ) || ""
  ).trim();
}

function defaultReadEnv(
  name: string,
) {
  if (
    typeof Deno ===
      "undefined"
  ) {
    return "";
  }

  return (
    Deno.env.get(
      name,
    ) || ""
  );
}

async function createDefaultAdminClient(
  supabaseUrl: string,
  adminKey: string,
): Promise<AdminClientLike> {
  const {
    createClient,
  } =
    await import(
      "https://esm.sh/@supabase/supabase-js@2.106.0"
    );

  return createClient(
    supabaseUrl,
    adminKey,
    {
      auth: {
        persistSession:
          false,

        autoRefreshToken:
          false,

        detectSessionInUrl:
          false,
      },
    },
  ) as unknown as
    AdminClientLike;
}

async function createDefaultUserClient(
  supabaseUrl: string,
  anonKey: string,
  authorization: string,
): Promise<UserClientLike> {
  const {
    createClient,
  } =
    await import(
      "https://esm.sh/@supabase/supabase-js@2.106.0"
    );

  return createClient(
    supabaseUrl,
    anonKey,
    {
      global: {
        headers: {
          Authorization:
            authorization,
        },
      },

      auth: {
        persistSession:
          false,

        autoRefreshToken:
          false,

        detectSessionInUrl:
          false,
      },
    },
  ) as unknown as
    UserClientLike;
}

export async function runBiometricIdentificationPipeline({
  rpcClient,
  tenantId,
  empresaId,
  profileId,
  requestId,
  observedEmbedding,
  decryptVector =
    decryptBiometricVector128,
}: {
  rpcClient: BiometricRpcClient;
  tenantId: string;
  empresaId: string;
  profileId: string;
  requestId: string;
  observedEmbedding: Float32Array;
  decryptVector?: DecryptVector;
}) {
  const matchBroker =
    createBiometricMatchBroker({
      rpcClient,
      decryptVector,
    });

  const ranking =
    await matchBroker
      .rankIdentification({
        tenantId,
        empresaId,
        profileId,
        requestId,
        observedEmbedding,
      });

  if (
    ranking.status ===
      BIOMETRIC_MATCH_RANK_STATUS
        .NO_REFERENCE
  ) {
    return Object.freeze({
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
    });
  }

  if (
    !ranking.top1 ||
    !ranking.top1.colaboradorId ||
    !ranking.top1.referenceSetId
  ) {
    throw new Error(
      "IDENTIFICATION_RANKING_INVALID",
    );
  }

  const fineVerifier =
    createBiometricFineVerification({
      rpcClient,
      decryptVector,
    });

  const fine =
    await fineVerifier
      .verifyCandidate({
        tenantId,
        empresaId,
        profileId,
        requestId,

        colaboradorId:
          ranking.top1
            .colaboradorId,

        referenceSetId:
          ranking.top1
            .referenceSetId,

        observedEmbedding,
      });

  return Object.freeze({
    status:
      "RANKED",

    tenantId,
    empresaId,
    profileId,
    requestId,

    candidateCount:
      ranking.candidateCount,

    top1:
      publicRankCandidate(
        ranking.top1,
      ),

    top2:
      publicRankCandidate(
        ranking.top2,
      ),

    margin:
      ranking.margin,

    fineVerification:
      Object.freeze({
        referenceCount:
          fine.referenceCount,

        referenceScores:
          fine.referenceScores,

        bestScore:
          fine.bestScore,

        worstScore:
          fine.worstScore,

        meanScore:
          fine.meanScore,

        bestReferenceId:
          fine.bestReferenceId,
      }),

    thresholds:
      null,

    decision:
      null,
  });
}

async function readPayload(
  req: Request,
) {
  const raw =
    await req.text();

  const byteLength =
    new TextEncoder()
      .encode(raw)
      .byteLength;

  if (
    byteLength === 0 ||
    byteLength > MAX_BODY_BYTES
  ) {
    throw new HttpError(
      byteLength > MAX_BODY_BYTES
        ? 413
        : 400,
      byteLength > MAX_BODY_BYTES
        ? "PAYLOAD_TOO_LARGE"
        : "INVALID_PAYLOAD",
    );
  }

  try {
    return record(
      JSON.parse(raw),
    );
  } catch {
    throw new HttpError(
      400,
      "INVALID_JSON",
    );
  }
}


function humanOperationTenantId(
  operation: string,
  input: JsonRecord,
) {
  switch (operation) {
    case "createReferenceSet":
    case "changeReferenceStatus":
    case "activateReferenceSet":
    case "revokeLegalAuthorization":
      return requiredUuid(
        input,
        "tenantId",
      );

    case "registerReference":
    case "storeCentroid": {
      const boundary =
        requiredRecord(
          input,
          "boundary",
        );

      return requiredUuid(
        boundary,
        "tenantId",
      );
    }

    default:
      throw new HttpError(
        400,
        "INVALID_OPERATION",
      );
  }
}

async function requireHumanIdentity(
  req: Request,
  operation: string,
  input: JsonRecord,
  supabaseUrl: string,
  readEnv: ReadEnv,
  createUserClient: (
    supabaseUrl: string,
    anonKey: string,
    authorization: string,
  ) => Promise<UserClientLike>,
) {
  if (
    !HUMAN_REQUIRED_OPERATIONS
      .has(operation)
  ) {
    return null;
  }

  const authorization =
    (
      req.headers.get(
        "Authorization",
      ) || ""
    ).trim();

  if (
    !/^Bearer\s+\S+$/i
      .test(authorization)
  ) {
    throw new HttpError(
      401,
      "BROKER_USER_UNAUTHENTICATED",
    );
  }

  const anonKey =
    (
      readEnv(
        "SUPABASE_ANON_KEY",
      ) || ""
    ).trim();

  if (!anonKey) {
    throw new HttpError(
      503,
      "BROKER_USER_AUTH_CONFIG_UNAVAILABLE",
    );
  }

  const userClient =
    await createUserClient(
      supabaseUrl,
      anonKey,
      authorization,
    );

  const {
    data: authData,
    error: authError,
  } =
    await userClient.auth
      .getUser();

  const executorId =
    authData?.user?.id || "";

  if (
    authError ||
    !validUuid(executorId)
  ) {
    throw new HttpError(
      401,
      "BROKER_USER_UNAUTHENTICATED",
    );
  }

  const tenantId =
    humanOperationTenantId(
      operation,
      input,
    );

  const {
    data: canManageTenant,
    error: tenantError,
  } =
    await userClient.rpc(
      "usuario_pode_gerenciar_tenant",
      {
        p_tenant_id:
          tenantId,
      },
    );

  if (
    tenantError ||
    canManageTenant !== true
  ) {
    throw new HttpError(
      403,
      "BROKER_TENANT_FORBIDDEN",
    );
  }

  const claimedExecutor =
    input["executorId"];

  if (
    claimedExecutor !==
      undefined &&
    claimedExecutor !==
      null
  ) {
    if (
      typeof claimedExecutor !==
        "string" ||
      !validUuid(
        claimedExecutor,
      )
    ) {
      throw new HttpError(
        400,
        "INVALID_PAYLOAD",
      );
    }

    if (
      claimedExecutor
        .toLowerCase() !==
      executorId
        .toLowerCase()
    ) {
      throw new HttpError(
        403,
        "BIOMETRIC_EXECUTOR_MISMATCH",
      );
    }
  }

  return {
    tenantId,
    executorId:
      executorId.toLowerCase(),
  };
}

export async function handleBiometricBrokerRequest(
  req: Request,
  dependencies:
    BrokerEndpointDependencies = {},
) {
  const readEnv =
    dependencies.readEnv ??
    defaultReadEnv;

  const createAdminClient =
    dependencies.createAdminClient ??
    createDefaultAdminClient;


  const createUserClient =
    dependencies.createUserClient ??
    createDefaultUserClient;

  const decryptVector =
    dependencies.decryptVector ??
    decryptBiometricVector128;

  const encryptVector =
    dependencies.encryptVector ??
    encryptBiometricVector128;

  const randomUuid =
    dependencies.randomUuid ??
    (() =>
      crypto.randomUUID());

  try {
      if (
        req.method !==
        "POST"
      ) {
        throw new HttpError(
          405,
          "METHOD_NOT_ALLOWED",
        );
      }

      const contentType =
        (
          req.headers.get(
            "content-type",
          ) || ""
        ).toLowerCase();

      if (
        !contentType.includes(
          "application/json",
        )
      ) {
        throw new HttpError(
          415,
          "JSON_REQUIRED",
        );
      }

      const expectedBrokerToken =
        (
          readEnv(
            "SAFESCAN_BIOMETRIC_BROKER_TOKEN",
          ) || ""
        ).trim();

      const suppliedBrokerToken =
        (
          req.headers.get(
            "x-safescan-broker-token",
          ) || ""
        ).trim();

      const supabaseUrl =
        (
          readEnv(
            "SUPABASE_URL",
          ) || ""
        ).trim();

      const adminKey =
        readSupabaseAdminKey(readEnv);

      if (
        !supabaseUrl ||
        !adminKey ||
        new TextEncoder()
          .encode(
            expectedBrokerToken,
          )
          .byteLength < 32
      ) {
        throw new HttpError(
          503,
          "BROKER_NOT_CONFIGURED",
        );
      }

      if (
        !timingSafeEqual(
          suppliedBrokerToken,
          expectedBrokerToken,
        )
      ) {
        throw new HttpError(
          401,
          "BROKER_UNAUTHORIZED",
        );
      }

      const body =
        await readPayload(
          req,
        );

      const operation =
        requiredText(
          body,
          "operation",
          80,
        );

      if (
        !ALLOWED_OPERATIONS.has(
          operation,
        )
      ) {
        throw new HttpError(
          400,
          "INVALID_OPERATION",
        );
      }

      const input =
        requiredRecord(
          body,
          "input",
        );


      const humanIdentity =
        await requireHumanIdentity(
          req,
          operation,
          input,
          supabaseUrl,
          readEnv,
          createUserClient,
        );

      const adminClient =
        await createAdminClient(
          supabaseUrl,
          adminKey,
        );

      const rpcClient:
        BiometricRpcClient =
        {
          rpc:
            async (
              rpcName,
              args,
            ) => {
              const {
                data,
                error,
              } =
                await adminClient.rpc(
                  rpcName,
                  args,
                );

              return {
                data,

                error:
                  error
                    ? {
                        message:
                          error.message,

                        code:
                          error.code,
                      }
                    : null,
              };
            },
        };

      const broker =
        createBiometricBrokerRpc(
          rpcClient,
        );

      let result:
        unknown = null;

      switch (operation) {
        case "createReferenceSet":
          result =
            await broker
              .createReferenceSet({
                tenantId:
                  requiredUuid(
                    input,
                    "tenantId",
                  ),
                empresaId:
                  requiredUuid(
                    input,
                    "empresaId",
                  ),
                colaboradorId:
                  requiredUuid(
                    input,
                    "colaboradorId",
                  ),
                profileId:
                  requiredText(
                    input,
                    "profileId",
                    160,
                  ),
                qualityProfileId:
                  requiredText(
                    input,
                    "qualityProfileId",
                    160,
                  ),
                requestId:
                  requiredUuid(
                    input,
                    "requestId",
                  ),
                executorId:
                  humanIdentity?.executorId ?? null,
              });
          break;

        case "registerReference": {
          const referenceSetId =
            requiredUuid(
              input,
              "referenceSetId",
            );

          const boundary =
            requiredRecord(
              input,
              "boundary",
            );

          const tenantId =
            requiredUuid(
              boundary,
              "tenantId",
            );

          const empresaId =
            requiredUuid(
              boundary,
              "empresaId",
            );

          const colaboradorId =
            requiredUuid(
              boundary,
              "colaboradorId",
            );

          const profileId =
            requiredText(
              boundary,
              "profileId",
              160,
            );

          requiredText(
            boundary,
            "qualityProfileId",
            160,
          );

          const qualityMetadata =
            requiredRecord(
              input,
              "qualityMetadata",
            );

          const sourceMetadata =
            requiredRecord(
              input,
              "sourceMetadata",
            );

          const requestId =
            requiredUuid(
              input,
              "requestId",
            );

          const executorId =
            humanIdentity?.executorId ?? null;

          const keyVersion =
            requiredText(
              input,
              "keyVersion",
              128,
            );

          const parsedEmbedding =
            requiredNormalizedEmbedding(
              input,
              "embedding",
            );

          try {
            const referenceId =
              randomUuid();

            if (
              !validUuid(
                referenceId,
              )
            ) {
              throw new HttpError(
                500,
                "BROKER_UUID_GENERATION_FAILED",
              );
            }

            const encryptedEmbedding =
              await encryptVector({
                vector:
                  parsedEmbedding.vector,

                keyVersion,

                aad: {
                  tenantId,
                  empresaId,
                  colaboradorId,
                  profileId,
                  referenceSetId,
                  materialKind:
                    "REFERENCE",
                  materialId:
                    referenceId,
                },
              });

            const persistedReferenceId =
              await broker
                .registerReference({
                  referenceId,
                  referenceSetId,
                  boundary,
                  qualityMetadata,
                  encryptedEmbedding: {
                    ...encryptedEmbedding,
                  },
                  sourceMetadata,
                  requestId,
                  executorId,
                });

            if (
              persistedReferenceId !==
                referenceId
            ) {
              throw new HttpError(
                502,
                "REFERENCE_ID_MISMATCH",
              );
            }

            result =
              persistedReferenceId;
          } finally {
            parsedEmbedding
              .vector
              .fill(0);

            wipeNumberArray(
              parsedEmbedding.raw,
            );
          }

          break;
        }

        case "changeReferenceStatus": {
          const nextStatus =
            requiredText(
              input,
              "nextStatus",
              40,
            )
              .toUpperCase();

          if (
            !ALLOWED_REFERENCE_STATUS
              .has(
                nextStatus,
              )
          ) {
            throw new HttpError(
              400,
              "INVALID_REFERENCE_STATUS",
            );
          }

          result =
            await broker
              .changeReferenceStatus({
                tenantId:
                  requiredUuid(
                    input,
                    "tenantId",
                  ),
                referenceId:
                  requiredUuid(
                    input,
                    "referenceId",
                  ),
                nextStatus,
                reasonCode:
                  text(
                    input.reasonCode,
                    160,
                  ) || null,
                requestId:
                  requiredUuid(
                    input,
                    "requestId",
                  ),
                executorId:
                  humanIdentity?.executorId ?? null,
              });
          break;
        }

        case "storeCentroid": {
          const referenceSetId =
            requiredUuid(
              input,
              "referenceSetId",
            );

          const boundary =
            requiredRecord(
              input,
              "boundary",
            );

          const tenantId =
            requiredUuid(
              boundary,
              "tenantId",
            );

          const empresaId =
            requiredUuid(
              boundary,
              "empresaId",
            );

          const colaboradorId =
            requiredUuid(
              boundary,
              "colaboradorId",
            );

          const profileId =
            requiredText(
              boundary,
              "profileId",
              160,
            );

          requiredText(
            boundary,
            "qualityProfileId",
            160,
          );

          const contributingReferenceIds =
            requiredUuidArray(
              input,
              "contributingReferenceIds",
            );

          const requestId =
            requiredUuid(
              input,
              "requestId",
            );

          const executorId =
            humanIdentity?.executorId ?? null;

          const keyVersion =
            requiredText(
              input,
              "keyVersion",
              128,
            );

          const parsedCentroid =
            requiredNormalizedEmbedding(
              input,
              "centroid",
            );

          try {
            const centroidId =
              randomUuid();

            if (
              !validUuid(
                centroidId,
              )
            ) {
              throw new HttpError(
                500,
                "BROKER_UUID_GENERATION_FAILED",
              );
            }

            const encryptedCentroid =
              await encryptVector({
                vector:
                  parsedCentroid.vector,

                keyVersion,

                aad: {
                  tenantId,
                  empresaId,
                  colaboradorId,
                  profileId,
                  referenceSetId,
                  materialKind:
                    "CENTROID",
                  materialId:
                    centroidId,
                },
              });

            const persistedCentroidId =
              await broker
                .storeCentroid({
                  centroidId,
                  referenceSetId,
                  boundary,
                  contributingReferenceIds,
                  encryptedCentroid: {
                    ...encryptedCentroid,
                  },
                  requestId,
                  executorId,
                });

            if (
              persistedCentroidId !==
                centroidId
            ) {
              throw new HttpError(
                502,
                "CENTROID_ID_MISMATCH",
              );
            }

            result =
              persistedCentroidId;
          } finally {
            parsedCentroid
              .vector
              .fill(0);

            wipeNumberArray(
              parsedCentroid.raw,
            );
          }

          break;
        }

        case "activateReferenceSet":
          result =
            await broker
              .activateReferenceSet({
                tenantId:
                  requiredUuid(
                    input,
                    "tenantId",
                  ),
                referenceSetId:
                  requiredUuid(
                    input,
                    "referenceSetId",
                  ),
                centroidId:
                  requiredUuid(
                    input,
                    "centroidId",
                  ),
                requestId:
                  requiredUuid(
                    input,
                    "requestId",
                  ),
                executorId:
                  humanIdentity?.executorId ?? null,
              });
          break;

        case "revokeLegalAuthorization": {
          const purposeCode =
            requiredText(
              input,
              "purposeCode",
            );

          if (
            purposeCode !==
              "ACCESS_VERIFICATION_1_TO_1"
          ) {
            throw new HttpError(
              400,
              "INVALID_PAYLOAD",
            );
          }

          result =
            await broker
              .revokeLegalAuthorization({
                authorizationId:
                  requiredUuid(
                    input,
                    "authorizationId",
                  ),
                tenantId:
                  requiredUuid(
                    input,
                    "tenantId",
                  ),
                empresaId:
                  requiredUuid(
                    input,
                    "empresaId",
                  ),
                colaboradorId:
                  requiredUuid(
                    input,
                    "colaboradorId",
                  ),
                purposeCode,
                reasonCode:
                  requiredText(
                    input,
                    "reasonCode",
                  ),
                requestId:
                  requiredUuid(
                    input,
                    "requestId",
                  ),
                executorId:
                  humanIdentity?.executorId ?? null,
              });

          break;
        }

        case "identify": {
          const biometricExecutionDisabled = true;
          if (biometricExecutionDisabled) {
            throw new HttpError(409, "BIOMETRIC_EXECUTION_DISABLED");
          }
          assertExactIdentifyInput(
            input,
          );

          const tenantId =
            requiredUuid(
              input,
              "tenantId",
            );

          const empresaId =
            requiredUuid(
              input,
              "empresaId",
            );

          const profileId =
            requiredText(
              input,
              "profileId",
              160,
            );

          const requestId =
            requiredUuid(
              input,
              "requestId",
            );

          const parsedEmbedding =
            requiredNormalizedEmbedding(
              input,
              "observedEmbedding",
            );

          try {
            result =
              await runBiometricIdentificationPipeline({
                rpcClient,
                tenantId,
                empresaId,
                profileId,
                requestId,

                observedEmbedding:
                  parsedEmbedding.vector,

                decryptVector,
              });
          } finally {
            parsedEmbedding
              .vector
              .fill(0);

            wipeNumberArray(
              parsedEmbedding.raw,
            );
          }

          break;
        }


        default:
          throw new HttpError(
            400,
            "INVALID_OPERATION",
          );
      }


      return jsonResponse(
        200,
        {
          ok: true,
          operation,
          result,
        },
      );
    } catch (error) {
      if (
        error instanceof
          HttpError
      ) {
        return jsonResponse(
          error.status,
          {
            ok: false,
            code:
              error.code,
          },
        );
      }

      if (
        error instanceof
          BiometricRpcError
      ) {
        return jsonResponse(
          502,
          {
            ok: false,
            code:
              "BROKER_RPC_FAILED",
          },
        );
      }

      return jsonResponse(
        500,
        {
          ok: false,
          code:
            "BROKER_INTERNAL_ERROR",
        },
      );    }
}

if (
  typeof Deno !== "undefined"
) {
  Deno.serve(
    handleBiometricBrokerRequest,
  );
}
