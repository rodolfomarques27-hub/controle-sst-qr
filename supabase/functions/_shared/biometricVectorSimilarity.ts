import {
  BIOMETRIC_VECTOR_LENGTH,
} from "./biometricCrypto.ts";

const UNIT_NORM_TOLERANCE =
  1e-5;

export function assertNormalizedVector128(
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

export function cosineSimilarity128(
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