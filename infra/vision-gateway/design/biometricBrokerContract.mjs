export const BIOMETRIC_PERSISTENCE_CONTRACT_VERSION = '03G2C-R1-v1';

export const BIOMETRIC_DATABASE_ROLE = 'service_role';
export const BIOMETRIC_SERVER_KEY_KIND = 'SUPABASE_NAMED_SECRET_KEY';
export const VISION_GATEWAY_SUPABASE_SECRET_ALLOWED = false;

export const BIOMETRIC_REFERENCE_STATUS = Object.freeze([
  'SOURCE_CAPTURED',
  'QUALITY_PENDING',
  'QUALITY_APPROVED',
  'EMBEDDING_READY',
  'ACTIVE',
  'QUARANTINED',
  'REVOKED',
]);

export const BIOMETRIC_REFERENCE_SET_STATUS = Object.freeze([
  'BUILDING',
  'INSUFFICIENT',
  'READY',
  'ACTIVE',
  'SUPERSEDED',
  'REVOKED',
]);

export const ACTIVE_REFERENCE_POLICY = Object.freeze({
  minimumOperational: 3,
  maximumActive: 5,
  meaning: 'REFERENCE_SET_SUFFICIENCY_ONLY',
  isMatchingThreshold: false,
});

export const PROFILE_FIELDS = Object.freeze([
  'profileId',
  'modelId',
  'modelSha256',
  'embeddingDim',
  'alignmentVersion',
  'preprocessVersion',
  'normalizationVersion',
]);

export const QUALITY_PROFILE_FIELDS = Object.freeze([
  'qualityProfileId',
  'profileId',
  'version',
  'minFaceScore',
  'minFaceSizePx',
  'minVisibleAreaRatio',
  'maxAlignmentRms',
  'embeddingL2Tolerance',
]);

export const MEMORY_ONLY_MATERIAL = Object.freeze([
  'liveFrame',
  'liveCrop',
  'alignedBgr112',
  'observedEmbedding',
  'decryptedReferenceEmbedding',
  'decryptedCentroid',
]);

export const PERSISTED_MATERIAL = Object.freeze({
  reference: Object.freeze([
    'tenantId',
    'empresaId',
    'colaboradorId',
    'referenceSetId',
    'referenceId',
    'profileId',
    'qualityProfileId',
    'status',
    'qualityMetadata',
    'sourceRef',
    'embeddingCiphertext',
    'embeddingIv',
    'embeddingKeyVersion',
    'embeddingCipherVersion',
    'embeddingCipherSha256',
    'sourceRetentionMetadata',
    'lifecycleTimestamps',
    'reasonCode',
  ]),

  centroid: Object.freeze([
    'tenantId',
    'empresaId',
    'colaboradorId',
    'referenceSetId',
    'centroidId',
    'profileId',
    'qualityProfileId',
    'centroidVersion',
    'contributingReferenceIds',
    'centroidCiphertext',
    'centroidIv',
    'centroidKeyVersion',
    'centroidCipherVersion',
    'centroidCipherSha256',
  ]),

  audit: Object.freeze([
    'tenantId',
    'empresaId',
    'colaboradorId',
    'eventCode',
    'objectKind',
    'objectId',
    'profileId',
    'qualityProfileId',
    'referenceSetId',
    'referenceId',
    'centroidId',
    'reasonCode',
    'actorKind',
    'actorUserId',
    'requestId',
    'createdAt',
  ]),
});

export const NEVER_PERSIST_PLAINTEXT = Object.freeze([
  'plaintextEmbedding',
  'plaintextCentroid',
  'rawLiveFrame',
  'rawLiveCrop',
  'rawEnrollmentImageWhenRetentionIsNone',
  'supabaseSecretKey',
  'serviceRoleKey',
  'encryptionKey',
]);

export const NEVER_LOG_MATERIAL = Object.freeze([
  ...NEVER_PERSIST_PLAINTEXT,
  'embeddingCiphertext',
  'embeddingIv',
  'centroidCiphertext',
  'centroidIv',
  'encryptedEnrollmentSource',
]);

export const ENCRYPTION_CONTRACT = Object.freeze({
  algorithm: 'AES-256-GCM',
  ivBytes: 12,
  authTagBits: 128,
  ciphertextIncludesAuthTag: true,
  plaintextEmbeddingFormat: 'float32-le-128-v1',
  aadVersion: 'biometric-aad-v1',
  keyVersionRequired: true,
  keyStoredWithCiphertext: false,
  keyLocation: 'BROKER_SECRET_MANAGER_OR_EDGE_FUNCTION_SECRET',
});

export const ENROLLMENT_SOURCE_POLICY = Object.freeze({
  defaultRetention: 'NONE',
  optionalRetention: 'PRIVATE_STORAGE',
  bucket: 'biometrics-enrollment',
  bucketPublic: false,
  authenticatedPolicies: 'NONE',
  sourceObjectMustBeApplicationEncrypted: true,
  pathTemplate:
    '<tenant_id>/<empresa_id>/<colaborador_id>/<reference_set_id>/<reference_id>',
});

export const SOURCE_REFERENCE_CONTRACT = Object.freeze({
  required: true,
  format: 'UUID',
  persistedWhenSourceRetentionIsNone: true,
  purpose: 'OPAQUE_AUDIT_REFERENCE_ONLY',
  mustNotContainRawImage: true,
  mustNotContainPlaintextEmbedding: true,
  mustNotExposeStorageSecret: true,
});

export const BROKER_TRUST_BOUNDARY = Object.freeze({
  visionGatewayMayHoldSupabaseServerSecret: false,
  frontendMayReadBiometricTables: false,
  frontendMayReceivePlaintextEmbeddings: false,
  brokerMayUseServerSecret: true,
  brokerMustAuthorizeTenantEmpresaColaborador: true,
  brokerMustUseTlsWhenNetworked: true,
  brokerMustNotLogSensitivePayloads: true,
  publicRpcSecurityMode: 'SECURITY_INVOKER',
  privilegedHelperSchema: 'private',
  privilegedHelperSecurityMode: 'SECURITY_DEFINER',
  exposedSecurityDefinerAllowed: false,
});

export const RPC_CONTRACTS = Object.freeze({
  createReferenceSet: Object.freeze({
    rpc: 'backend_biometric_create_reference_set',
    databaseExecuteRole: 'service_role',
    purpose: 'CREATE_BUILDING_REFERENCE_SET',
    inputs: Object.freeze([
      'tenantId',
      'empresaId',
      'colaboradorId',
      'profileId',
      'qualityProfileId',
      'requestId',
      'executorId',
    ]),
    returns: 'referenceSetId',
  }),

  registerReference: Object.freeze({
    rpc: 'backend_biometric_register_reference',
    databaseExecuteRole: 'service_role',
    purpose: 'PERSIST_ENCRYPTED_REFERENCE_AND_QUALITY_METADATA',
    inputs: Object.freeze([
      'referenceSetId',
      'boundary',
      'qualityMetadata',
      'encryptedEmbedding',
      'sourceMetadata',
      'requestId',
      'executorId',
    ]),
    returns: 'referenceId',
  }),

  storeCentroid: Object.freeze({
    rpc: 'backend_biometric_store_centroid',
    databaseExecuteRole: 'service_role',
    purpose: 'PERSIST_BROKER_COMPUTED_ENCRYPTED_CENTROID',
    inputs: Object.freeze([
      'referenceSetId',
      'contributingReferenceIds',
      'encryptedCentroid',
      'requestId',
      'executorId',
    ]),
    returns: 'centroidId',
  }),

  activateReferenceSet: Object.freeze({
    rpc: 'backend_biometric_activate_reference_set',
    databaseExecuteRole: 'service_role',
    purpose: 'ATOMIC_ACTIVE_SET_SWAP',
    inputs: Object.freeze([
      'referenceSetId',
      'centroidId',
      'requestId',
      'executorId',
    ]),
    returns: 'activationResult',
  }),

  changeReferenceStatus: Object.freeze({
    rpc: 'backend_biometric_change_reference_status',
    databaseExecuteRole: 'service_role',
    purpose: 'QUARANTINE_OR_REVOKE_WITH_SET_SAFETY',
    inputs: Object.freeze([
      'referenceId',
      'nextStatus',
      'reasonCode',
      'requestId',
      'executorId',
    ]),
    returns: 'referenceLifecycleResult',
  }),

  getActiveBundle: Object.freeze({
    rpc: 'backend_biometric_get_active_bundle',
    databaseExecuteRole: 'service_role',
    purpose: 'LOAD_CIPHERTEXT_ONLY_FOR_TRUSTED_BROKER',
    inputs: Object.freeze([
      'tenantId',
      'empresaId',
      'colaboradorId',
      'profileId',
      'requestId',
    ]),
    returns: 'encryptedActiveBundle',
  }),
});

export const ATOMIC_ACTIVATION_RULES = Object.freeze([
  'TARGET_SET_STATUS_MUST_BE_READY',
  'ACTIVE_REFERENCES_MUST_BE_BETWEEN_3_AND_5',
  'ALL_REFERENCES_MUST_MATCH_EXACT_PROFILE_AND_BOUNDARY',
  'CENTROID_MUST_LIST_EXACT_CURRENT_ACTIVE_REFERENCE_IDS',
  'CENTROID_MUST_MATCH_TARGET_SET_AND_PROFILE',
  'OLD_ACTIVE_SET_REMAINS_ACTIVE_UNTIL_NEW_SET_IS_VALIDATED',
  'NEW_SET_ACTIVATION_AND_OLD_SET_SUPERSESSION_USE_ONE_TRANSACTION',
]);

export const RETENTION_CONTRACT = Object.freeze({
  liveMaterial: 'MEMORY_ONLY',
  enrollmentSourceDefault: 'DO_NOT_PERSIST',
  supersededMaterialRetentionDays: null,
  revokedMaterialRetentionDays: null,
  retentionPeriodDecisionStatus: 'NOT_DEFINED_IN_03G2C',
  deletionMustKeepMetadataOnlyAudit: true,
});

export const MATCHING_POLICY_CONTRACT = Object.freeze({
  productionCosineThreshold: null,
  productionYuNetThreshold: null,
  productionAlignmentRmsThreshold: null,
  productionFarTarget: null,
  productionFrrTarget: null,
  padThreshold: null,
  status: 'OUT_OF_SCOPE_REQUIRES_SEPARATE_CALIBRATION',
});

function requireId(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${label} is required.`);
  }

  return value.trim().toLowerCase();
}

export function buildBiometricAadContext({
  tenantId,
  empresaId,
  colaboradorId,
  profileId,
  referenceSetId,
  materialId,
  materialKind,
}) {
  const kind = requireId(materialKind, 'materialKind').toUpperCase();

  if (!['REFERENCE', 'CENTROID', 'SOURCE'].includes(kind)) {
    throw new RangeError('materialKind is invalid.');
  }

  return [
    ENCRYPTION_CONTRACT.aadVersion,
    requireId(tenantId, 'tenantId'),
    requireId(empresaId, 'empresaId'),
    requireId(colaboradorId, 'colaboradorId'),
    requireId(profileId, 'profileId'),
    requireId(referenceSetId, 'referenceSetId'),
    kind,
    requireId(materialId, 'materialId'),
  ].join('|');
}

export function assertBrokerBoundary({
  tenantId,
  empresaId,
  colaboradorId,
  profileId,
}) {
  return Object.freeze({
    tenantId: requireId(tenantId, 'tenantId'),
    empresaId: requireId(empresaId, 'empresaId'),
    colaboradorId: requireId(colaboradorId, 'colaboradorId'),
    profileId: requireId(profileId, 'profileId'),
  });
}
