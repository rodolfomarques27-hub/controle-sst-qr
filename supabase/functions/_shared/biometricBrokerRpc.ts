export const BIOMETRIC_RPC_NAMES = Object.freeze({
  createReferenceSet: "backend_biometric_create_reference_set",
  registerReference: "backend_biometric_register_reference_v2",
  changeReferenceStatus: "backend_biometric_change_reference_status",
  storeCentroid: "backend_biometric_store_centroid_v2",
  activateReferenceSet: "backend_biometric_activate_reference_set",
  listActiveCentroids: "backend_biometric_list_active_centroids",
  getActiveBundle: "backend_biometric_get_active_bundle",
  revokeLegalAuthorization: "backend_biometric_revoke_legal_authorization",
});

export const BIOMETRIC_ENROLLMENT_SEQUENCE = Object.freeze([
  "createReferenceSet",
  "registerReference x3-5",
  "changeReferenceStatus(ACTIVE) x3-5",
  "storeCentroid",
  "activateReferenceSet",
  "getActiveBundle",
]);

export type JsonRecord = Record<string, unknown>;

export interface BiometricRpcClient {
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

export interface CreateReferenceSetInput {
  tenantId: string;
  empresaId: string;
  colaboradorId: string;
  profileId: string;
  qualityProfileId: string;
  requestId: string;
  executorId: string | null;
}

export interface RegisterReferenceInput {
  referenceId: string;
  referenceSetId: string;
  boundary: JsonRecord;
  qualityMetadata: JsonRecord;
  encryptedEmbedding: JsonRecord;
  sourceMetadata: JsonRecord;
  requestId: string;
  executorId: string | null;
}

export interface ChangeReferenceStatusInput {
  tenantId: string;
  referenceId: string;
  nextStatus: string;
  reasonCode: string | null;
  requestId: string;
  executorId: string | null;
}

export interface StoreCentroidInput {
  centroidId: string;
  referenceSetId: string;
  boundary: JsonRecord;
  contributingReferenceIds: string[];
  encryptedCentroid: JsonRecord;
  requestId: string;
  executorId: string | null;
}

export interface ActivateReferenceSetInput {
  tenantId: string;
  referenceSetId: string;
  centroidId: string;
  requestId: string;
  executorId: string | null;
}

export interface ListActiveCentroidsInput {
  tenantId: string;
  empresaId: string;
  profileId: string;
  requestId: string;
}

export interface GetActiveBundleInput {
  tenantId: string;
  empresaId: string;
  colaboradorId: string;
  profileId: string;
  requestId: string;
}

export interface RevokeLegalAuthorizationInput {
  authorizationId: string;
  tenantId: string;
  empresaId: string;
  colaboradorId: string;
  purposeCode: string;
  reasonCode: string;
  requestId: string;
  executorId: string | null;
}

export interface EncryptedActiveCentroidCandidate extends JsonRecord {
  referenceSetId?: string;
  colaboradorId?: string;
  qualityProfileId?: string;
  centroidId?: string;
  ciphertextBase64?: string;
  ivBase64?: string;
  keyVersion?: string;
  cipherVersion?: string;
  cipherSha256?: string;
}

export interface EncryptedActiveCentroidsResult extends JsonRecord {
  requestId?: string;
  tenantId?: string;
  empresaId?: string;
  profileId?: string;
  candidates?: EncryptedActiveCentroidCandidate[];
}

export interface ReferenceLifecycleResult extends JsonRecord {
  referenceId?: string;
  nextStatus?: string;
  referenceSetId?: string;
}

export interface ActivationResult extends JsonRecord {
  referenceSetId?: string;
  status?: string;
  supersededReferenceSetId?: string | null;
}

export interface EncryptedActiveBundle extends JsonRecord {
  requestId?: string;
  referenceSetId?: string;
  tenantId?: string;
  empresaId?: string;
  colaboradorId?: string;
  profileId?: string;
  qualityProfileId?: string;
  centroid?: JsonRecord;
  references?: unknown[];
}

export class BiometricRpcError extends Error {
  readonly rpc: string;
  readonly code: string | null;

  constructor(
    rpc: string,
    message: string,
    code: string | null = null,
  ) {
    super(message);
    this.name = "BiometricRpcError";
    this.rpc = rpc;
    this.code = code;
  }
}

function requireClient(
  client: BiometricRpcClient,
): BiometricRpcClient {
  if (
    !client ||
    typeof client.rpc !== "function"
  ) {
    throw new TypeError(
      "Biometric RPC client with rpc() is required.",
    );
  }

  return client;
}

async function callRpc<T>(
  client: BiometricRpcClient,
  rpc: string,
  args: JsonRecord,
): Promise<T> {
  const {
    data,
    error,
  } = await client.rpc(
    rpc,
    args,
  );

  if (error) {
    throw new BiometricRpcError(
      rpc,
      error.message || "Biometric RPC failed.",
      error.code || null,
    );
  }

  return data as T;
}

export function createBiometricBrokerRpc(
  injectedClient: BiometricRpcClient,
) {
  const client =
    requireClient(
      injectedClient,
    );

  return Object.freeze({
    async createReferenceSet(
      input: CreateReferenceSetInput,
    ): Promise<string> {
      return await callRpc<string>(
        client,
        BIOMETRIC_RPC_NAMES.createReferenceSet,
        {
          p_tenant_id: input.tenantId,
          p_empresa_id: input.empresaId,
          p_colaborador_id: input.colaboradorId,
          p_profile_id: input.profileId,
          p_quality_profile_id: input.qualityProfileId,
          p_request_id: input.requestId,
          p_executor_id: input.executorId,
        },
      );
    },

    async registerReference(
      input: RegisterReferenceInput,
    ): Promise<string> {
      return await callRpc<string>(
        client,
        BIOMETRIC_RPC_NAMES.registerReference,
        {
          p_reference_id: input.referenceId,
          p_reference_set_id: input.referenceSetId,
          p_boundary: input.boundary,
          p_quality_metadata: input.qualityMetadata,
          p_encrypted_embedding: input.encryptedEmbedding,
          p_source_metadata: input.sourceMetadata,
          p_request_id: input.requestId,
          p_executor_id: input.executorId,
        },
      );
    },

    async changeReferenceStatus(
      input: ChangeReferenceStatusInput,
    ): Promise<ReferenceLifecycleResult> {
      return await callRpc<ReferenceLifecycleResult>(
        client,
        BIOMETRIC_RPC_NAMES.changeReferenceStatus,
        {
          p_tenant_id: input.tenantId,
          p_reference_id: input.referenceId,
          p_next_status: input.nextStatus,
          p_reason_code: input.reasonCode,
          p_request_id: input.requestId,
          p_executor_id: input.executorId,
        },
      );
    },

    async storeCentroid(
      input: StoreCentroidInput,
    ): Promise<string> {
      return await callRpc<string>(
        client,
        BIOMETRIC_RPC_NAMES.storeCentroid,
        {
          p_centroid_id: input.centroidId,
          p_reference_set_id: input.referenceSetId,
          p_boundary: input.boundary,
          p_contributing_reference_ids:
            input.contributingReferenceIds,
          p_encrypted_centroid: input.encryptedCentroid,
          p_request_id: input.requestId,
          p_executor_id: input.executorId,
        },
      );
    },

    async activateReferenceSet(
      input: ActivateReferenceSetInput,
    ): Promise<ActivationResult> {
      return await callRpc<ActivationResult>(
        client,
        BIOMETRIC_RPC_NAMES.activateReferenceSet,
        {
          p_tenant_id: input.tenantId,
          p_reference_set_id: input.referenceSetId,
          p_centroid_id: input.centroidId,
          p_request_id: input.requestId,
          p_executor_id: input.executorId,
        },
      );
    },

    async listActiveCentroids(
      input: ListActiveCentroidsInput,
    ): Promise<EncryptedActiveCentroidsResult> {
      return await callRpc<EncryptedActiveCentroidsResult>(
        client,
        BIOMETRIC_RPC_NAMES.listActiveCentroids,
        {
          p_tenant_id: input.tenantId,
          p_empresa_id: input.empresaId,
          p_profile_id: input.profileId,
          p_request_id: input.requestId,
        },
      );
    },

    async revokeLegalAuthorization(
      input: RevokeLegalAuthorizationInput,
    ): Promise<JsonRecord> {
      return await callRpc<JsonRecord>(
        client,
        BIOMETRIC_RPC_NAMES.revokeLegalAuthorization,
        {
          p_authorization_id: input.authorizationId,
          p_tenant_id: input.tenantId,
          p_empresa_id: input.empresaId,
          p_colaborador_id: input.colaboradorId,
          p_purpose_code: input.purposeCode,
          p_reason_code: input.reasonCode,
          p_request_id: input.requestId,
          p_executor_id: input.executorId,
        },
      );
    },

    async getActiveBundle(
      input: GetActiveBundleInput,
    ): Promise<EncryptedActiveBundle> {
      return await callRpc<EncryptedActiveBundle>(
        client,
        BIOMETRIC_RPC_NAMES.getActiveBundle,
        {
          p_tenant_id: input.tenantId,
          p_empresa_id: input.empresaId,
          p_colaborador_id: input.colaboradorId,
          p_profile_id: input.profileId,
          p_request_id: input.requestId,
        },
      );
    },
  });
}
