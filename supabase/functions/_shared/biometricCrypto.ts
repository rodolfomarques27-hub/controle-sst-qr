export const BIOMETRIC_KEYRING_ENV =
  "SAFESCAN_BIOMETRIC_KEYRING_JSON";

export const BIOMETRIC_CIPHER_VERSION =
  "AES-256-GCM-v1";

export const BIOMETRIC_AAD_VERSION =
  "biometric-aad-v1";

export const BIOMETRIC_EMBEDDING_FORMAT =
  "float32-le-128-v1";

export const BIOMETRIC_VECTOR_LENGTH =
  128;

export const BIOMETRIC_VECTOR_BYTES =
  BIOMETRIC_VECTOR_LENGTH * 4;

export const BIOMETRIC_IV_BYTES =
  12;

export const BIOMETRIC_AUTH_TAG_BITS =
  128;

type JsonRecord =
  Record<string, unknown>;

export interface BiometricCipherEnvelope {
  ciphertextBase64: string;
  ivBase64: string;
  keyVersion: string;
  cipherVersion: string;
  cipherSha256: string;
}

export interface BiometricAadInput {
  tenantId: string;
  empresaId: string;
  colaboradorId: string;
  profileId: string;
  referenceSetId: string;
  materialKind:
    | "REFERENCE"
    | "CENTROID"
    | "SOURCE";
  materialId: string;
}

function requiredText(
  value: unknown,
  label: string,
  maxLength = 4096,
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

function normalizeAadPart(
  value: unknown,
  label: string,
) {
  return requiredText(
    value,
    label,
    1024,
  ).toLowerCase();
}

export function buildBiometricAad(
  input: BiometricAadInput,
) {
  const kind =
    requiredText(
      input.materialKind,
      "materialKind",
      32,
    ).toUpperCase();

  if (
    kind !== "REFERENCE" &&
    kind !== "CENTROID" &&
    kind !== "SOURCE"
  ) {
    throw new TypeError(
      "materialKind is invalid.",
    );
  }

  return [
    BIOMETRIC_AAD_VERSION,
    normalizeAadPart(
      input.tenantId,
      "tenantId",
    ),
    normalizeAadPart(
      input.empresaId,
      "empresaId",
    ),
    normalizeAadPart(
      input.colaboradorId,
      "colaboradorId",
    ),
    normalizeAadPart(
      input.profileId,
      "profileId",
    ),
    normalizeAadPart(
      input.referenceSetId,
      "referenceSetId",
    ),
    kind,
    normalizeAadPart(
      input.materialId,
      "materialId",
    ),
  ].join("|");
}

function base64ToBytes(
  value: unknown,
  label: string,
) {
  const normalized =
    requiredText(
      value,
      label,
      65536,
    ).replace(
      /\s+/g,
      "",
    );

  let binary:
    string;

  try {
    binary =
      atob(
        normalized,
      );
  } catch {
    throw new TypeError(
      `${label} is not valid base64.`,
    );
  }

  const bytes =
    new Uint8Array(
      binary.length,
    );

  for (
    let index = 0;
    index < binary.length;
    index += 1
  ) {
    bytes[index] =
      binary.charCodeAt(
        index,
      );
  }

  return bytes;
}

function bytesToBase64(
  bytes: Uint8Array,
) {
  let binary =
    "";

  for (
    let index = 0;
    index < bytes.length;
    index += 1
  ) {
    binary +=
      String.fromCharCode(
        bytes[index],
      );
  }

  return btoa(
    binary,
  );
}

function bytesToHex(
  bytes: Uint8Array,
) {
  return Array
    .from(
      bytes,
      (value) =>
        value
          .toString(16)
          .padStart(
            2,
            "0",
          ),
    )
    .join("")
    .toUpperCase();
}

async function sha256Hex(
  bytes: Uint8Array,
) {
  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      bytes,
    );

  return bytesToHex(
    new Uint8Array(
      digest,
    ),
  );
}

function vectorToLittleEndianBytes(
  vector: Float32Array,
) {
  if (
    !(vector instanceof Float32Array) ||
    vector.length !==
      BIOMETRIC_VECTOR_LENGTH
  ) {
    throw new TypeError(
      "Biometric vector must be Float32Array(128).",
    );
  }

  const bytes =
    new Uint8Array(
      BIOMETRIC_VECTOR_BYTES,
    );

  const view =
    new DataView(
      bytes.buffer,
    );

  for (
    let index = 0;
    index < vector.length;
    index += 1
  ) {
    if (
      !Number.isFinite(
        vector[index],
      )
    ) {
      throw new RangeError(
        "Biometric vector contains non-finite value.",
      );
    }

    view.setFloat32(
      index * 4,
      vector[index],
      true,
    );
  }

  return bytes;
}

function littleEndianBytesToVector(
  bytes: Uint8Array,
) {
  if (
    bytes.byteLength !==
    BIOMETRIC_VECTOR_BYTES
  ) {
    throw new RangeError(
      "Decrypted biometric material has invalid size.",
    );
  }

  const view =
    new DataView(
      bytes.buffer,
      bytes.byteOffset,
      bytes.byteLength,
    );

  const vector =
    new Float32Array(
      BIOMETRIC_VECTOR_LENGTH,
    );

  for (
    let index = 0;
    index < BIOMETRIC_VECTOR_LENGTH;
    index += 1
  ) {
    const value =
      view.getFloat32(
        index * 4,
        true,
      );

    if (!Number.isFinite(value)) {
      throw new RangeError(
        "Decrypted biometric material contains non-finite value.",
      );
    }

    vector[index] =
      value;
  }

  return vector;
}

function readKeyring():
  JsonRecord {
  const raw =
    (
      Deno.env.get(
        BIOMETRIC_KEYRING_ENV,
      ) || ""
    ).trim();

  if (!raw) {
    throw new Error(
      "BIOMETRIC_KEYRING_NOT_CONFIGURED",
    );
  }

  let parsed:
    unknown;

  try {
    parsed =
      JSON.parse(
        raw,
      );
  } catch {
    throw new Error(
      "BIOMETRIC_KEYRING_INVALID",
    );
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    throw new Error(
      "BIOMETRIC_KEYRING_INVALID",
    );
  }

  return parsed as JsonRecord;
}

async function importBiometricKey(
  keyVersionValue: unknown,
) {
  const keyVersion =
    requiredText(
      keyVersionValue,
      "keyVersion",
      128,
    );

  const keyring =
    readKeyring();

  const encodedKey =
    requiredText(
      keyring[keyVersion],
      "keyring key",
      4096,
    );

  const rawKey =
    base64ToBytes(
      encodedKey,
      "keyring key",
    );

  if (
    rawKey.byteLength !== 32
  ) {
    rawKey.fill(0);

    throw new Error(
      "BIOMETRIC_KEY_LENGTH_INVALID",
    );
  }

  try {
    return await crypto.subtle.importKey(
      "raw",
      rawKey,
      {
        name:
          "AES-GCM",
      },
      false,
      [
        "encrypt",
        "decrypt",
      ],
    );
  } finally {
    rawKey.fill(0);
  }
}

function normalizeEnvelope(
  envelope: BiometricCipherEnvelope,
) {
  const keyVersion =
    requiredText(
      envelope.keyVersion,
      "keyVersion",
      128,
    );

  const cipherVersion =
    requiredText(
      envelope.cipherVersion,
      "cipherVersion",
      128,
    );

  if (
    cipherVersion !==
    BIOMETRIC_CIPHER_VERSION
  ) {
    throw new Error(
      "BIOMETRIC_CIPHER_VERSION_UNSUPPORTED",
    );
  }

  const cipherSha256 =
    requiredText(
      envelope.cipherSha256,
      "cipherSha256",
      64,
    ).toUpperCase();

  if (
    !/^[0-9A-F]{64}$/.test(
      cipherSha256,
    )
  ) {
    throw new Error(
      "BIOMETRIC_CIPHER_SHA256_INVALID",
    );
  }

  const ciphertext =
    base64ToBytes(
      envelope.ciphertextBase64,
      "ciphertextBase64",
    );

  const iv =
    base64ToBytes(
      envelope.ivBase64,
      "ivBase64",
    );

  if (
    iv.byteLength !==
    BIOMETRIC_IV_BYTES
  ) {
    throw new Error(
      "BIOMETRIC_IV_LENGTH_INVALID",
    );
  }

  if (
    ciphertext.byteLength <=
    BIOMETRIC_AUTH_TAG_BITS / 8
  ) {
    throw new Error(
      "BIOMETRIC_CIPHERTEXT_INVALID",
    );
  }

  return {
    keyVersion,
    cipherSha256,
    ciphertext,
    iv,
  };
}

export async function encryptBiometricVector128({
  vector,
  keyVersion,
  aad,
}: {
  vector: Float32Array;
  keyVersion: string;
  aad: BiometricAadInput;
}): Promise<BiometricCipherEnvelope> {
  const normalizedKeyVersion =
    requiredText(
      keyVersion,
      "keyVersion",
      128,
    );

  const key =
    await importBiometricKey(
      normalizedKeyVersion,
    );

  const iv =
    crypto.getRandomValues(
      new Uint8Array(
        BIOMETRIC_IV_BYTES,
      ),
    );

  const plaintext =
    vectorToLittleEndianBytes(
      vector,
    );

  const aadBytes =
    new TextEncoder()
      .encode(
        buildBiometricAad(
          aad,
        ),
      );

  try {
    const encrypted =
      await crypto.subtle.encrypt(
        {
          name:
            "AES-GCM",
          iv,
          additionalData:
            aadBytes,
          tagLength:
            BIOMETRIC_AUTH_TAG_BITS,
        },
        key,
        plaintext,
      );

    const ciphertext =
      new Uint8Array(
        encrypted,
      );

    return {
      ciphertextBase64:
        bytesToBase64(
          ciphertext,
        ),
      ivBase64:
        bytesToBase64(
          iv,
        ),
      keyVersion:
        normalizedKeyVersion,
      cipherVersion:
        BIOMETRIC_CIPHER_VERSION,
      cipherSha256:
        await sha256Hex(
          ciphertext,
        ),
    };
  } finally {
    plaintext.fill(0);
    aadBytes.fill(0);
  }
}

export async function decryptBiometricVector128({
  envelope,
  aad,
}: {
  envelope: BiometricCipherEnvelope;
  aad: BiometricAadInput;
}): Promise<Float32Array> {
  const normalized =
    normalizeEnvelope(
      envelope,
    );

  const actualSha =
    await sha256Hex(
      normalized.ciphertext,
    );

  if (
    actualSha !==
    normalized.cipherSha256
  ) {
    normalized.ciphertext.fill(0);
    normalized.iv.fill(0);

    throw new Error(
      "BIOMETRIC_CIPHERTEXT_INTEGRITY_FAILED",
    );
  }

  const key =
    await importBiometricKey(
      normalized.keyVersion,
    );

  const aadBytes =
    new TextEncoder()
      .encode(
        buildBiometricAad(
          aad,
        ),
      );

  let plaintext:
    Uint8Array | null =
      null;

  try {
    const decrypted =
      await crypto.subtle.decrypt(
        {
          name:
            "AES-GCM",
          iv:
            normalized.iv,
          additionalData:
            aadBytes,
          tagLength:
            BIOMETRIC_AUTH_TAG_BITS,
        },
        key,
        normalized.ciphertext,
      );

    plaintext =
      new Uint8Array(
        decrypted,
      );

    return littleEndianBytesToVector(
      plaintext,
    );
  } catch {
    throw new Error(
      "BIOMETRIC_DECRYPT_FAILED",
    );
  } finally {
    normalized.ciphertext.fill(0);
    normalized.iv.fill(0);
    aadBytes.fill(0);

    if (plaintext) {
      plaintext.fill(0);
    }
  }
}
